import { logger } from './logger.js';
import { withTimeout } from './timeoutManager.js';
import { sanitizeScanResult } from './sanitizeOutput.js';
import { generateSuggestedFixes } from './suggestFixes.js';
import { config } from './config.js';

// Agent imports
import { analyzeRepo } from '../agents/repoAnalyzerAgent.js';
import { generateReadme } from '../agents/readmeGeneratorAgent.js';
import { scanVulnerabilities } from '../agents/vulnerabilityScannerAgent.js';
import { scanBugs } from '../agents/bugScannerAgent.js';
import { generateFinalReport } from '../agents/reportGeneratorAgent.js';

// Agent timeout now comes from config

/**
 * Executes a single agent with a 30-second timeout, progress logging,
 * and error isolation. Returns the agent result or null on failure.
 *
 * @param {string}   name      – human-readable agent name for logs
 * @param {Function} agentFn   – async function to execute
 * @param {string}   scanId    – scan identifier for log correlation
 * @param {string[]} warnings  – mutable warnings array
 * @returns {any|null} agent result, or null if the agent failed/timed out
 */
async function executeAgent(name, agentFn, scanId, warnings) {
  const start = Date.now();
  logger.info('ScanOrchestrator', `▶ ${name} started`, { scanId });

  try {
    const result = await withTimeout(agentFn(), config.agentTimeoutMs, name);
    const elapsed = Date.now() - start;
    logger.info('ScanOrchestrator', `✔ ${name} completed`, { scanId, durationMs: elapsed });
    return { result, isTimeout: false };
  } catch (error) {
    const elapsed = Date.now() - start;
    const isTimeout = error.message.includes('timed out');
    const reason = isTimeout
      ? `${name} timed out after ${config.agentTimeoutMs}ms`
      : `${name} failed – ${error.message}`;

    logger.error('ScanOrchestrator', `✖ ${reason}`, { scanId, durationMs: elapsed, error });
    warnings.push(reason);
    return { result: null, isTimeout };
  }
}

/**
 * Deduplicate warnings – same tool/message should not appear twice.
 * @param {string[]} warnings
 * @returns {string[]}
 */
function deduplicateWarnings(warnings) {
  return [...new Set(warnings)];
}

/**
 * Runs the full scan pipeline across all agents in sequence.
 *
 * Guarantees:
 *  - Each agent gets a hard 30-second timeout
 *  - Each agent start/end time is logged
 *  - A single agent failure does NOT crash the scan
 *  - If ALL agents fail, returns { status: "failed", error: ... }
 *  - Warnings are deduplicated before returning
 *
 * @param {string} repoPath  – absolute path to the cloned/extracted repo
 * @param {string} scanId    – unique identifier for this scan run
 * @returns {object} ScanResult
 */
export async function runFullScan(repoPath, scanId) {
  const scanStart = Date.now();
  logger.info('ScanOrchestrator', `Starting full scan`, { scanId, repoPath });

  const warnings = [];
  let repoMetadata = null;
  let readme = null;
  let vulnerabilities = [];
  let bugs = [];
  let suggestedFixes = [];
  let reportMarkdown = '';

  // Track how many agents succeeded (to detect total failure)
  let agentsSucceeded = 0;
  let agentsTimedOut = 0;

  const checkShortCircuit = () => {
    if (agentsTimedOut > 3) {
      logger.warn('ScanOrchestrator', `>3 agents timed out. Short-circuiting scan.`, { scanId });
      warnings.push('Scan short-circuited due to multiple agent timeouts.');
      return true;
    }
    return false;
  };

  try {
    // ── Step 1/5: Analyze Repository ──────────────────────────────
    const { result: metadataResult, isTimeout: metaTimeout } = await executeAgent(
      'Repository Analysis',
      () => analyzeRepo(repoPath),
      scanId,
      warnings
    );
    if (metaTimeout) agentsTimedOut++;

    if (metadataResult) {
      repoMetadata = metadataResult;
      agentsSucceeded++;
    } else {
      repoMetadata = {
        name: 'unknown-repo',
        languages: ['Unknown'],
        frameworks: [],
        hasDocker: false,
        hasTests: false,
        fileCount: 0,
        totalLines: 0,
      };
    }

    if (checkShortCircuit()) {
      readme = { title: repoMetadata.name, content: 'Skipped due to timeouts.' };
    } else {
      // ── Step 2/5: Generate README ─────────────────────────────────
      const { result: readmeResult, isTimeout: readmeTimeout } = await executeAgent(
        'README Generation',
        () => generateReadme(repoPath, repoMetadata),
        scanId,
        warnings
      );
      if (readmeTimeout) agentsTimedOut++;

      if (readmeResult) {
        readme = readmeResult;
        agentsSucceeded++;
      } else {
        readme = {
          title: repoMetadata.name,
          content: `# ${repoMetadata.name}\n\nREADME generation failed. Please review the repository manually.`,
        };
      }
    }

    if (!checkShortCircuit()) {
      // ── Step 3/5: Scan Vulnerabilities ────────────────────────────
      const { result: vulnResult, isTimeout: vulnTimeout } = await executeAgent(
        'Vulnerability Scanning',
        () => scanVulnerabilities(repoPath, repoMetadata),
        scanId,
        warnings
      );
      if (vulnTimeout) agentsTimedOut++;

      if (vulnResult) {
        vulnerabilities = vulnResult.findings || [];
        if (vulnResult.warnings) {
          warnings.push(...vulnResult.warnings);
        }
        agentsSucceeded++;
      }
    }

    if (!checkShortCircuit()) {
      // ── Step 4/5: Scan Bugs & Code Quality ────────────────────────
      const { result: bugResult, isTimeout: bugTimeout } = await executeAgent(
        'Bug Scanning',
        () => scanBugs(repoPath, repoMetadata),
        scanId,
        warnings
      );
      if (bugTimeout) agentsTimedOut++;

      if (bugResult) {
        bugs = bugResult.findings || [];
        if (bugResult.warnings) {
          warnings.push(...bugResult.warnings);
        }
        agentsSucceeded++;
      }
    }

    // ── Generate Suggested Fixes (sync, runs after all agents) ────
    logger.info('ScanOrchestrator', `Generating suggested fixes from ${vulnerabilities.length} vulns and ${bugs.length} bugs`, { scanId });
    suggestedFixes = generateSuggestedFixes(vulnerabilities, bugs);

    if (!checkShortCircuit()) {
      // ── Step 5/5: Generate Final Report ───────────────────────────
      const { result: reportResult, isTimeout: reportTimeout } = await executeAgent(
        'Report Generation',
        () => generateFinalReport({
          scanId,
          repoMetadata,
          readme,
          vulnerabilities,
          bugs,
          suggestedFixes,
          warnings,
        }),
        scanId,
        warnings
      );
      if (reportTimeout) agentsTimedOut++;

      if (reportResult) {
        reportMarkdown = reportResult;
        agentsSucceeded++;
      } else {
        reportMarkdown = `# Scan Report\n\nReport generation failed for scan ${scanId}.\n`;
      }
    } else {
      reportMarkdown = `# Scan Report\n\nReport generation skipped due to previous agent timeouts.\n`;
    }

    // ── Check for total failure ───────────────────────────────────
    if (agentsSucceeded === 0) {
      const elapsed = Date.now() - scanStart;
      logger.error('ScanOrchestrator', `All agents failed`, { scanId, durationMs: elapsed });
      return {
        scanId,
        status: 'failed',
        timestamp: new Date().toISOString(),
        error: 'All analysis agents failed. Please check logs and try again.',
        warnings: deduplicateWarnings(warnings),
      };
    }

    // ── Build & sanitize the final result ─────────────────────────
    const scanResult = {
      scanId,
      status: 'completed',
      timestamp: new Date().toISOString(),
      repoMetadata,
      readme,
      vulnerabilities,
      bugs,
      suggestedFixes,
      reportMarkdown,
      warnings: deduplicateWarnings(warnings),
    };

    const sanitizedResult = sanitizeScanResult(scanResult);
    const elapsed = Date.now() - scanStart;

    logger.info(
      'ScanOrchestrator',
      `Scan completed — ${agentsSucceeded}/5 agents succeeded, ${vulnerabilities.length} vulns, ${bugs.length} bugs, ${sanitizedResult.warnings.length} warnings`,
      { scanId, durationMs: elapsed }
    );

    return sanitizedResult;

  } catch (error) {
    // Orchestrator-level catch-all for truly unexpected failures
    const elapsed = Date.now() - scanStart;
    logger.error('ScanOrchestrator', `Fatal error: ${error.message}`, { scanId, durationMs: elapsed, error });
    return {
      scanId,
      status: 'failed',
      timestamp: new Date().toISOString(),
      error: `Scan failed: ${error.message}`,
      warnings: deduplicateWarnings(warnings),
    };
  }
}
