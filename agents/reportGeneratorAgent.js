import { formatFinalReport } from '../middleware/reportFormatter.js';

export const generateFinalReport = async (scanResult) => {
  const markdown = formatFinalReport(scanResult);
  
  const summary = {
    totalVulnerabilities: scanResult.vulnerabilities.length,
    totalBugs: scanResult.bugs.length,
    totalFixes: scanResult.suggestedFixes.length,
    highSeverityCount: scanResult.vulnerabilities.filter(v => v.severity === 'HIGH').length +
                       scanResult.bugs.filter(b => b.severity === 'HIGH').length,
  };

  return {
    markdown,
    summary,
  };
};

// Made with Bob
