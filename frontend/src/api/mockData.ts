import { ScanResult } from '../types/scan';

export const mockScanResult: ScanResult = {
  scanId: 'scan_1234567890_abcd',
  status: 'completed',
  timestamp: new Date().toISOString(),
  repoMetadata: {
    name: 'example-repo',
    languages: ['TypeScript', 'JavaScript', 'Python'],
    frameworks: ['React', 'Express', 'Flask'],
    hasDocker: true,
    hasTests: true,
    fileCount: 127,
    totalLines: 8543,
  },
  readme: {
    title: 'Example Repository',
    content: `# Example Repository

## Overview
This is an example repository demonstrating RepoPilot's analysis capabilities.

## Features
- Modern web application
- RESTful API
- Comprehensive test coverage
- Docker support

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
\`\`\`bash
npm start
\`\`\`

## Testing
\`\`\`bash
npm test
\`\`\`

## License
MIT License
`,
  },
  readmeFeedback: {
    score: 85,
    strengths: [
      'Clear project structure and organization',
      'Comprehensive installation and usage instructions',
      'Good documentation of features and capabilities',
      'Includes testing information',
      'License information is present',
    ],
    improvements: [
      'Add badges for build status, coverage, and version',
      'Include contributing guidelines',
      'Add more detailed API documentation',
      'Include troubleshooting section',
      'Add screenshots or demo links',
    ],
  },
  vulnerabilities: [
    {
      severity: 'Critical',
      tool: 'npm audit',
      file: 'package.json',
      issue: 'Critical vulnerability in express < 4.18.0 - Denial of Service',
      recommendation: 'Update express to version 4.18.0 or higher immediately',
    },
    {
      severity: 'High',
      tool: 'npm audit',
      file: 'package.json',
      issue: 'Prototype Pollution in lodash < 4.17.21',
      recommendation: 'Update lodash to version 4.17.21 or higher',
    },
    {
      severity: 'Medium',
      tool: 'semgrep',
      file: 'src/auth/login.ts',
      issue: 'Hardcoded JWT secret detected',
      recommendation: 'Move JWT secret to environment variables',
    },
    {
      severity: 'Low',
      tool: 'gitleaks',
      file: '.env.example',
      issue: 'Potential API key pattern detected',
      recommendation: 'Verify this is only an example and not a real key',
    },
  ],
  bugs: [
    {
      severity: 'High',
      tool: 'eslint',
      file: 'src/api/client.ts',
      issue: 'Async function without error handling',
      recommendation: 'Add try-catch block or .catch() handler to prevent unhandled promise rejections',
    },
    {
      severity: 'Medium',
      tool: 'eslint',
      file: 'src/utils/helpers.ts',
      issue: 'Unused variable "tempData" declared but never used',
      recommendation: 'Remove unused variable or implement its usage',
    },
    {
      severity: 'Low',
      tool: 'eslint',
      file: 'src/components/Dashboard.tsx',
      issue: 'Missing dependency in useEffect hook',
      recommendation: 'Add missing dependency to useEffect dependency array',
    },
  ],
  suggestedFixes: [
    {
      title: 'Update Dependencies',
      description: 'Update all dependencies to their latest secure versions to address known vulnerabilities',
      file: 'package.json',
    },
    {
      title: 'Environment Variables',
      description: 'Move all secrets and API keys to environment variables instead of hardcoding them',
      file: 'src/auth/login.ts',
    },
    {
      title: 'Input Validation',
      description: 'Add input validation for all user-facing endpoints to prevent injection attacks',
    },
    {
      title: 'Error Handling',
      description: 'Implement comprehensive error handling for all async operations',
      file: 'src/api/client.ts',
    },
    {
      title: 'Code Cleanup',
      description: 'Remove unused variables and imports to improve code maintainability',
    },
  ],
  warnings: [
    'Large repository detected - scan may take longer than usual',
    'Some dependencies are outdated and may have security vulnerabilities',
  ],
  fullReport: `# RepoPilot Security & Code Quality Report

**Repository:** example-repo
**Scan ID:** scan_1234567890_abcd
**Scan Date:** ${new Date().toISOString()}
**Status:** ✅ Completed

---

## Executive Summary

This report provides a comprehensive analysis of the repository including security vulnerabilities, code quality issues, and recommendations for improvement.

### Key Findings
- **Vulnerabilities:** 4 (1 Critical, 1 High, 1 Medium, 1 Low)
- **Bugs:** 3 (1 High, 1 Medium, 1 Low)
- **Suggested Fixes:** 5
- **README Score:** 85/100

---

## Repository Overview

- **Languages:** TypeScript, JavaScript, Python
- **Frameworks:** React, Express, Flask
- **Files:** 127
- **Lines of Code:** 8,543
- **Docker Support:** ✅ Yes
- **Test Coverage:** ✅ Yes

---

## Security Vulnerabilities

### Critical
1. **express < 4.18.0 - Denial of Service**
   - File: package.json
   - Tool: npm audit
   - Recommendation: Update express to version 4.18.0 or higher immediately

### High
2. **Prototype Pollution in lodash < 4.17.21**
   - File: package.json
   - Tool: npm audit
   - Recommendation: Update lodash to version 4.17.21 or higher

### Medium
3. **Hardcoded JWT secret detected**
   - File: src/auth/login.ts
   - Tool: semgrep
   - Recommendation: Move JWT secret to environment variables

### Low
4. **Potential API key pattern detected**
   - File: .env.example
   - Tool: gitleaks
   - Recommendation: Verify this is only an example and not a real key

---

## Code Quality Issues

### High Priority
1. **Async function without error handling**
   - File: src/api/client.ts
   - Tool: eslint
   - Recommendation: Add try-catch block or .catch() handler

### Medium Priority
2. **Unused variable "tempData"**
   - File: src/utils/helpers.ts
   - Tool: eslint
   - Recommendation: Remove unused variable

### Low Priority
3. **Missing dependency in useEffect hook**
   - File: src/components/Dashboard.tsx
   - Tool: eslint
   - Recommendation: Add missing dependency to dependency array

---

## Suggested Fixes

1. **Update Dependencies** - Update all dependencies to their latest secure versions
2. **Environment Variables** - Move all secrets to environment variables
3. **Input Validation** - Add validation for all user-facing endpoints
4. **Error Handling** - Implement comprehensive error handling
5. **Code Cleanup** - Remove unused variables and imports

---

## README Analysis

**Score:** 85/100

### Strengths
- Clear project structure and organization
- Comprehensive installation and usage instructions
- Good documentation of features and capabilities
- Includes testing information
- License information is present

### Improvements
- Add badges for build status, coverage, and version
- Include contributing guidelines
- Add more detailed API documentation
- Include troubleshooting section
- Add screenshots or demo links

---

## Recommendations

1. **Immediate Action Required:** Update express to fix critical vulnerability
2. **High Priority:** Implement proper error handling for async operations
3. **Medium Priority:** Move hardcoded secrets to environment variables
4. **Low Priority:** Clean up unused code and improve documentation

---

*Report generated by RepoPilot - AI-Powered Repository Analysis*
`,
};

// Made with Bob
