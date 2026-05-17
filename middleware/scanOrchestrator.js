import { logger } from './logger.js';
import { withTimeout } from './timeoutManager.js';
import { sanitizeScanResult } from './sanitizeOutput.js';
import { generateSuggestedFixes } from './suggestFixes.js';
import { config } from './config.js';

import { analyzeRepo } from '../agents/repoAnalyzerAgent.js';
import { generateReadme } from '../agents/readmeGeneratorAgent.js';
import { scanVulnerabilities } from '../agents/vulnerabilityScannerAgent.js';
import { scanBugs } from '../agents/bugScannerAgent.js';
import { generateFinalReport } from '../agents/reportGeneratorAgent.js';

const LANGUAGE_NAMES = new Set([
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'Go',
  'Rust',
  'Ruby',
  'PHP',
]);

function normalizeRepoMetadata(metadata = {}) {
  const techStack = Array.isArray(metadata.techStack) ? metadata.techStack : [];
  const detectedFrameworks = Array.isArray(metadata.detectedFrameworks) ? metadata.detectedFrameworks : [];
  const languages = Array.isArray(metadata.languages) && metadata.languages.length > 0
    ? metadata.languages
    : techStack.filter(item => LANGUAGE_NAMES.has(item));
  const frameworks = Array.isArray(metadata.frameworks) && metadata.frameworks.length > 0
    ? metadata.frameworks
    : detectedFrameworks;
  const linesOfCode = metadata.linesOfCode && typeof metadata.linesOfCode === 'object'
    ? Object.values(metadata.linesOfCode).reduce((sum, value) => sum + (Number(value) || 0), 0)
    : 0;

  return {
    ...metadata,
    name: metadata.name || 'unknown-repo',
    languages: languages.length > 0 ? languages : ['Unknown'],
    frameworks,
    hasDocker: typeof metadata.hasDocker === 'boolean'
      ? metadata.hasDocker
      : techStack.includes('Docker') || Boolean(metadata.importantFiles?.some(file => /(^|[/\\])Dockerfile$/.test(file))),
    hasTests: typeof metadata.hasTests === 'boolean'
      ? metadata.hasTests
      : Boolean(metadata.testFrameworks?.length),
    fileCount: metadata.fileCount ?? metadata.totalFiles ?? 0,
    totalLines: metadata.totalLines ?? linesOfCode,
    packageManager: metadata.packageManager || 'unknown',
  };
}

function normalizeFindingsResult(result) {
  return {
    findings: Array.isArray(result) ? result : result?.findings || [],
    warnings: Array.isArray(result?.warnings) ? result.warnings : [],
  };
}

function deduplicateWarnings(warnings) {
  return [...new Set(warnings.filter(Boolean))];
}

async function executeAgent(name, agentFn, scanId, warnings) {
  const start = Date.now();
  logger.info('ScanOrchestrator', `[${scanId}] ${name} started`);

  try {
    const result = await withTimeout(agentFn(), config.agentTimeoutMs, name);
    logger.info('ScanOrchestrator', `[${scanId}] ${name} completed in ${Date.now() - start}ms`);
    return { result, isTimeout: false };
  } catch (error) {
    const isTimeout = error instanceof Error && error.message.includes('timed out');
    const reason = isTimeout
      ? `${name} timed out after ${config.agentTimeoutMs}ms`
      : `${name} failed - ${error.message}`;
    logger.error('ScanOrchestrator', `[${scanId}] ${reason}`, error);
    warnings.push(reason);
    return { result: null, isTimeout };
  }
}

export async function runFullScan(repoPath, scanId) {
  const scanStart = Date.now();
  logger.info('ScanOrchestrator', `Starting full scan`, { scanId, repoPath });

  const warnings = [];
  let agentsSucceeded = 0;
  let agentsTimedOut = 0;
  let repoMetadata = null;
  let readme = null;
  let vulnerabilities = [];
  let bugs = [];

  try {
    const metadataRun = await executeAgent('Repository Analysis', () => analyzeRepo(repoPath), scanId, warnings);
    if (metadataRun.isTimeout) agentsTimedOut++;
    if (metadataRun.result) {
      repoMetadata = normalizeRepoMetadata(metadataRun.result);
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
        packageManager: 'unknown',
      };
    }

    const readmeRun = await executeAgent('README Generation', () => generateReadme(repoPath, repoMetadata), scanId, warnings);
    if (readmeRun.isTimeout) agentsTimedOut++;
    if (readmeRun.result) {
      readme = readmeRun.result;
      agentsSucceeded++;
    } else {
      readme = {
        title: repoMetadata.name,
        content: `# ${repoMetadata.name}\n\nREADME generation failed. Please review the repository manually.`,
      };
    }

    const vulnRun = await executeAgent('Vulnerability Scanning', () => scanVulnerabilities(repoPath, repoMetadata), scanId, warnings);
    if (vulnRun.isTimeout) agentsTimedOut++;
    if (vulnRun.result) {
      const vulnResult = normalizeFindingsResult(vulnRun.result);
      vulnerabilities = vulnResult.findings;
      warnings.push(...vulnResult.warnings);
      agentsSucceeded++;
    }

    const bugRun = await executeAgent('Bug Scanning', () => scanBugs(repoPath, repoMetadata), scanId, warnings);
    if (bugRun.isTimeout) agentsTimedOut++;
    if (bugRun.result) {
      const bugResult = normalizeFindingsResult(bugRun.result);
      bugs = bugResult.findings;
      warnings.push(...bugResult.warnings);
      agentsSucceeded++;
    }

    const suggestedFixes = generateSuggestedFixes(vulnerabilities, bugs);
    const baseResult = {
      scanId,
      status: 'completed',
      timestamp: new Date().toISOString(),
      scanDuration: Date.now() - scanStart,
      repoMetadata,
      readme,
      vulnerabilities,
      bugs,
      suggestedFixes,
      warnings: deduplicateWarnings(warnings),
    };

    let reportMarkdown = '';
    const reportRun = await executeAgent(
      'Report Generation',
      () => generateFinalReport(baseResult),
      scanId,
      warnings
    );
    if (reportRun.isTimeout) agentsTimedOut++;
    if (reportRun.result) {
      reportMarkdown = typeof reportRun.result === 'string' ? reportRun.result : reportRun.result.markdown || '';
      agentsSucceeded++;
    } else {
      reportMarkdown = `# Scan Report\n\nReport generation failed for scan ${scanId}.\n`;
    }

    if (agentsSucceeded === 0) {
      return {
        scanId,
        status: 'failed',
        timestamp: new Date().toISOString(),
        error: 'All analysis agents failed. Please check logs and try again.',
        warnings: deduplicateWarnings(warnings),
      };
    }

    const scanResult = {
      ...baseResult,
      warnings: deduplicateWarnings(warnings),
      reportMarkdown,
    };
    const sanitizedResult = sanitizeScanResult(scanResult);

    logger.info(
      'ScanOrchestrator',
      `Scan completed - ${agentsSucceeded}/5 agents succeeded, ${agentsTimedOut} timed out, ${vulnerabilities.length} vulns, ${bugs.length} bugs`,
      { scanId, durationMs: Date.now() - scanStart }
    );

    return sanitizedResult;
  } catch (error) {
    logger.error('ScanOrchestrator', `Fatal error: ${error.message}`, { scanId, error });
    return {
      scanId,
      status: 'failed',
      timestamp: new Date().toISOString(),
      error: `Scan failed: ${error.message}`,
      warnings: deduplicateWarnings(warnings),
    };
  }
}

// Made with Bob
