import { formatFinalReport } from '../middleware/reportFormatter.js';

/**
 * Determine overall recommendation based on findings
 */
const determineOverallRecommendation = (totalVulns, criticalVulns, totalBugs) => {
  // Critical vulnerabilities = HIGH or CRITICAL severity
  if (criticalVulns > 5) {
    return 'Immediate action required - Critical security issues detected';
  }
  
  if (criticalVulns > 0 || totalVulns > 10) {
    return 'Review before production - Security vulnerabilities found';
  }
  
  if (totalBugs > 20) {
    return 'Review recommended - Multiple code quality issues detected';
  }
  
  if (totalVulns > 0 || totalBugs > 0) {
    return 'Minor issues detected - Address when convenient';
  }
  
  return 'Good shape - No critical issues found';
};

/**
 * Generate final report with markdown and summary
 */
export async function generateFinalReport(scanResult) {
  const { 
    scanId, 
    repoMetadata, 
    readme, 
    vulnerabilities = [], 
    bugs = [], 
    suggestedFixes = [], 
    warnings = [] 
  } = scanResult;

  // Call middleware formatter to generate full markdown report
  const markdown = formatFinalReport(scanResult);
  
  // Calculate summary statistics
  const totalVulns = vulnerabilities.length;
  const criticalVulns = vulnerabilities.filter(v => 
    v.severity === 'HIGH' || v.severity === 'CRITICAL'
  ).length;
  const totalBugs = bugs.length;
  
  // Determine overall recommendation
  const overallRecommendation = determineOverallRecommendation(
    totalVulns, 
    criticalVulns, 
    totalBugs
  );

  // Build comprehensive summary
  const summary = {
    totalVulns,
    criticalVulns,
    totalBugs,
    overallRecommendation,
    // Additional useful metrics
    mediumVulns: vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
    lowVulns: vulnerabilities.filter(v => v.severity === 'LOW').length,
    highBugs: bugs.filter(b => b.severity === 'HIGH' || b.severity === 'MEDIUM').length,
    totalFixes: suggestedFixes.length,
    totalWarnings: warnings.length,
    // Severity breakdown
    severityBreakdown: {
      critical: vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
      high: vulnerabilities.filter(v => v.severity === 'HIGH').length + 
            bugs.filter(b => b.severity === 'HIGH').length,
      medium: vulnerabilities.filter(v => v.severity === 'MEDIUM').length + 
              bugs.filter(b => b.severity === 'MEDIUM').length,
      low: vulnerabilities.filter(v => v.severity === 'LOW').length + 
           bugs.filter(b => b.severity === 'LOW').length,
      info: bugs.filter(b => b.severity === 'INFO').length,
    },
    // Tool breakdown
    toolsUsed: {
      vulnerability: [...new Set(vulnerabilities.map(v => v.tool))],
      codeQuality: [...new Set(bugs.map(b => b.tool))],
    },
    // Repository info
    repository: {
      name: repoMetadata?.name || 'Unknown',
      fileCount: repoMetadata?.fileCount || 0,
      totalLines: repoMetadata?.totalLines || 0,
      languages: repoMetadata?.languages || [],
      frameworks: repoMetadata?.frameworks || [],
    },
  };

  return {
    markdown,
    summary,
  };
}

// Made with Bob
