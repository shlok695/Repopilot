import { logger } from './logger.js';
import { withTimeout } from './timeoutManager.js';
import { sanitizeScanResult } from './sanitizeOutput.js';
import { generateSuggestedFixes } from './suggestFixes.js';
import { config } from './config.js';

// Import agents (these will be created next)
import { analyzeRepo } from '../agents/repoAnalyzerAgent.js';
import { generateReadme } from '../agents/readmeGeneratorAgent.js';
import { scanVulnerabilities } from '../agents/vulnerabilityScannerAgent.js';
import { scanBugs } from '../agents/bugScannerAgent.js';
import { generateFinalReport } from '../agents/reportGeneratorAgent.js';

export const runFullScan = async (repoPath, scanId) => {
  logger.info('ScanOrchestrator', `Starting full scan for ${scanId}`);
  
  const warnings = [];
  let repoMetadata = null;
  let readme = null;
  let vulnerabilities = [];
  let bugs = [];

  try {
    // Step 1: Analyze Repository
    logger.info('ScanOrchestrator', `[${scanId}] Step 1/5: Analyzing repository`);
    try {
      repoMetadata = await withTimeout(
        analyzeRepo(repoPath),
        config.AGENT_TIMEOUT_MS,
        'Repository analysis'
      );
    } catch (error) {
      logger.error('ScanOrchestrator', `Repository analysis failed: ${error.message}`);
      warnings.push('Repository analysis failed - using default metadata');
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

    // Step 2: Generate README
    logger.info('ScanOrchestrator', `[${scanId}] Step 2/5: Generating README`);
    try {
      readme = await withTimeout(
        generateReadme(repoPath, repoMetadata),
        config.AGENT_TIMEOUT_MS,
        'README generation'
      );
    } catch (error) {
      logger.error('ScanOrchestrator', `README generation failed: ${error.message}`);
      warnings.push('README generation failed - using placeholder');
      readme = {
        title: repoMetadata.name,
        content: `# ${repoMetadata.name}\n\nREADME generation failed. Please review the repository manually.`,
      };
    }

    // Step 3: Scan Vulnerabilities
    logger.info('ScanOrchestrator', `[${scanId}] Step 3/5: Scanning for vulnerabilities`);
    try {
      const vulnResult = await withTimeout(
        scanVulnerabilities(repoPath, repoMetadata),
        config.AGENT_TIMEOUT_MS,
        'Vulnerability scanning'
      );
      vulnerabilities = vulnResult.findings || [];
      if (vulnResult.warnings) {
        warnings.push(...vulnResult.warnings);
      }
    } catch (error) {
      logger.error('ScanOrchestrator', `Vulnerability scanning failed: ${error.message}`);
      warnings.push('Vulnerability scanning failed - results may be incomplete');
    }

    // Step 4: Scan Bugs
    logger.info('ScanOrchestrator', `[${scanId}] Step 4/5: Detecting bugs and code quality issues`);
    try {
      const bugResult = await withTimeout(
        scanBugs(repoPath, repoMetadata),
        config.AGENT_TIMEOUT_MS,
        'Bug scanning'
      );
      bugs = bugResult.findings || [];
      if (bugResult.warnings) {
        warnings.push(...bugResult.warnings);
      }
    } catch (error) {
      logger.error('ScanOrchestrator', `Bug scanning failed: ${error.message}`);
      warnings.push('Bug scanning failed - results may be incomplete');
    }

    // Step 5: Generate Suggested Fixes
    logger.info('ScanOrchestrator', `[${scanId}] Step 5/5: Generating suggested fixes`);
    const suggestedFixes = generateSuggestedFixes(vulnerabilities, bugs);

    // Build final result
    const scanResult = {
      scanId,
      status: 'completed',
      timestamp: new Date().toISOString(),
      repoMetadata,
      readme,
      vulnerabilities,
      bugs,
      suggestedFixes,
      warnings,
    };

    // Sanitize output to remove sensitive data
    const sanitizedResult = sanitizeScanResult(scanResult);

    logger.info('ScanOrchestrator', `[${scanId}] Scan completed successfully`);
    return sanitizedResult;

  } catch (error) {
    logger.error('ScanOrchestrator', `Fatal error during scan: ${error.message}`, error);
    throw new Error(`Scan failed: ${error.message}`);
  }
};

// Made with Bob
