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
  vulnerabilities: [
    {
      severity: 'HIGH',
      tool: 'npm audit',
      file: 'package.json',
      issue: 'Prototype Pollution in lodash < 4.17.21',
      recommendation: 'Update lodash to version 4.17.21 or higher',
    },
    {
      severity: 'MEDIUM',
      tool: 'semgrep',
      file: 'src/auth/login.ts',
      issue: 'Hardcoded JWT secret detected',
      recommendation: 'Move JWT secret to environment variables',
    },
  ],
  bugs: [
    {
      severity: 'MEDIUM',
      tool: 'eslint',
      file: 'src/utils/helpers.ts',
      issue: 'Unused variable "tempData" declared but never used',
      recommendation: 'Remove unused variable or implement its usage',
    },
    {
      severity: 'LOW',
      tool: 'eslint',
      file: 'src/components/Dashboard.tsx',
      issue: 'Missing dependency in useEffect hook',
      recommendation: 'Add missing dependency to useEffect dependency array',
    },
  ],
  suggestedFixes: [
    'Update all dependencies to their latest secure versions',
    'Move all secrets and API keys to environment variables',
    'Add input validation for all user-facing endpoints',
  ],
  warnings: [
    'Large repository detected - scan may take longer than usual',
  ],
};

// Made with Bob
