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

const normalizeRepoMetadata = (metadata = {}) => {
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
};

const normalizeFindingsResult = (result) => ({
  findings: Array.isArray(result) ? result : result?.findings || [],
  warnings: Array.isArray(result?.warnings) ? result.warnings : [],
});

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
      repoMetadata = normalizeRepoMetadata(repoMetadata);
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
      const vulnResult = normalizeFindingsResult(await withTimeout(
        scanVulnerabilities(repoPath, repoMetadata),
        config.AGENT_TIMEOUT_MS,
        'Vulnerability scanning'
      ));
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
      const bugResult = normalizeFindingsResult(await withTimeout(
        scanBugs(repoPath, repoMetadata),
        config.AGENT_TIMEOUT_MS,
        'Bug scanning'
      ));
      bugs = bugResult.findings || [];
      if (bugResult.warnings) {
        warnings.push(...bugResult.warnings);
      }
    } catch (error) {
      logger.error('ScanOrchestrator', `Bug scanning failed: ${error.message}`);
      warnings.push('Bug scanning failed - results may be incomplete');
    }

    // Step 5: Generate Suggested Fixes and final report
    logger.info('ScanOrchestrator', `[${scanId}] Step 5/5: Generating suggested fixes and report`);
    const suggestedFixes = generateSuggestedFixes(vulnerabilities, bugs);

    const baseResult = {
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

    let reportMarkdown = '';
    try {
      const reportResult = await withTimeout(
        generateFinalReport(baseResult),
        config.AGENT_TIMEOUT_MS,
        'Report generation'
      );
      reportMarkdown = typeof reportResult === 'string' ? reportResult : reportResult.markdown || '';
    } catch (error) {
      logger.error('ScanOrchestrator', `Report generation failed: ${error.message}`);
      warnings.push('Report generation failed - markdown report unavailable');
    }

    const scanResult = {
      ...baseResult,
      warnings,
      reportMarkdown,
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
