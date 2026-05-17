import { ScanResult } from '../types/scan';

// Mock data for React/Node.js repository
export const mockReactResult: ScanResult = {
  scanId: 'mock_scan_react_1234567890',
  status: 'completed',
  timestamp: new Date().toISOString(),
  repoMetadata: {
    name: 'react-dashboard-demo',
    languages: ['TypeScript', 'JavaScript'],
    frameworks: ['React', 'Vite', 'Tailwind CSS'],
    hasDocker: true,
    hasTests: true,
    fileCount: 87,
    totalLines: 5432,
    packageManager: 'npm',
  },
  readme: {
    title: 'React Dashboard Demo',
    content: `# React Dashboard Demo

## Overview
A modern React dashboard application built with TypeScript, Vite, and Tailwind CSS.

## Features
- Real-time data visualization
- Responsive design
- Dark mode support
- RESTful API integration

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
\`\`\`bash
npm run dev
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
    score: 82,
    strengths: [
      'Clear project overview and purpose',
      'Installation instructions provided',
      'Modern tech stack documented',
      'Testing commands included',
    ],
    improvements: [
      'Add screenshots or demo GIF',
      'Include API documentation',
      'Add contributing guidelines',
      'Include deployment instructions',
      'Add badges for build status and coverage',
    ],
  },
  vulnerabilities: [
    {
      severity: 'Critical',
      tool: 'npm audit',
      file: 'package.json',
      issue: 'Critical vulnerability in vite < 4.5.2 - Arbitrary file read via crafted URL',
      recommendation: 'Update vite to version 4.5.2 or higher immediately',
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
      file: 'src/api/auth.ts',
      issue: 'Hardcoded API key detected in source code',
      recommendation: 'Move API keys to environment variables using .env files',
    },
    {
      severity: 'Low',
      tool: 'npm audit',
      file: 'package.json',
      issue: 'Regular Expression Denial of Service in trim < 1.0.1',
      recommendation: 'Update trim package to latest version',
    },
  ],
  bugs: [
    {
      severity: 'High',
      tool: 'eslint',
      file: 'src/components/Dashboard.tsx',
      issue: 'Async function without error handling - unhandled promise rejection',
      recommendation: 'Add try-catch block or .catch() handler to prevent crashes',
    },
    {
      severity: 'Medium',
      tool: 'eslint',
      file: 'src/hooks/useData.ts',
      issue: 'React Hook useEffect has missing dependencies: "fetchData"',
      recommendation: 'Add missing dependency to useEffect dependency array or wrap in useCallback',
    },
    {
      severity: 'Medium',
      tool: 'eslint',
      file: 'src/utils/format.ts',
      issue: 'Unused variable "tempResult" declared but never used',
      recommendation: 'Remove unused variable to improve code maintainability',
    },
    {
      severity: 'Low',
      tool: 'eslint',
      file: 'src/components/Chart.tsx',
      issue: 'Prefer using optional chaining over && operator',
      recommendation: 'Use data?.values instead of data && data.values',
    },
  ],
  suggestedFixes: [
    {
      title: 'Update Critical Dependencies',
      description: 'Update vite and lodash to their latest secure versions to address critical vulnerabilities',
      file: 'package.json',
    },
    {
      title: 'Move Secrets to Environment Variables',
      description: 'Extract all hardcoded API keys and secrets to .env files and add .env to .gitignore',
      file: 'src/api/auth.ts',
    },
    {
      title: 'Add Comprehensive Error Handling',
      description: 'Implement try-catch blocks for all async operations to prevent unhandled promise rejections',
      file: 'src/components/Dashboard.tsx',
    },
    {
      title: 'Fix React Hook Dependencies',
      description: 'Add missing dependencies to useEffect hooks or wrap functions in useCallback',
      file: 'src/hooks/useData.ts',
    },
    {
      title: 'Code Cleanup',
      description: 'Remove unused variables and imports to improve code maintainability and reduce bundle size',
    },
  ],
  warnings: [
    'Some npm dependencies are outdated and may have security vulnerabilities',
    'Consider adding TypeScript strict mode for better type safety',
  ],
  fullReport: `# RepoPilot Security & Code Quality Report

**Repository:** react-dashboard-demo
**Scan ID:** mock_scan_react_1234567890
**Scan Date:** ${new Date().toISOString()}
**Status:** ✅ Completed

---

## Executive Summary

This report provides a comprehensive analysis of the React dashboard repository including security vulnerabilities, code quality issues, and recommendations for improvement.

### Key Findings
- **Vulnerabilities:** 4 (1 Critical, 1 High, 1 Medium, 1 Low)
- **Bugs:** 4 (1 High, 2 Medium, 1 Low)
- **Suggested Fixes:** 5
- **README Score:** 82/100

---

## Repository Overview

- **Languages:** TypeScript, JavaScript
- **Frameworks:** React, Vite, Tailwind CSS
- **Files:** 87
- **Lines of Code:** 5,432
- **Package Manager:** npm
- **Docker Support:** ✅ Yes
- **Test Coverage:** ✅ Yes

---

## Security Vulnerabilities

### Critical
1. **vite < 4.5.2 - Arbitrary file read via crafted URL**
   - File: package.json
   - Tool: npm audit
   - Recommendation: Update vite to version 4.5.2 or higher immediately

### High
2. **Prototype Pollution in lodash < 4.17.21**
   - File: package.json
   - Tool: npm audit
   - Recommendation: Update lodash to version 4.17.21 or higher

### Medium
3. **Hardcoded API key detected**
   - File: src/api/auth.ts
   - Tool: semgrep
   - Recommendation: Move API keys to environment variables

### Low
4. **Regular Expression Denial of Service in trim < 1.0.1**
   - File: package.json
   - Tool: npm audit
   - Recommendation: Update trim package to latest version

---

## Code Quality Issues

### High Priority
1. **Async function without error handling**
   - File: src/components/Dashboard.tsx
   - Tool: eslint
   - Recommendation: Add try-catch block or .catch() handler

### Medium Priority
2. **React Hook useEffect has missing dependencies**
   - File: src/hooks/useData.ts
   - Tool: eslint
   - Recommendation: Add missing dependency to dependency array

3. **Unused variable "tempResult"**
   - File: src/utils/format.ts
   - Tool: eslint
   - Recommendation: Remove unused variable

### Low Priority
4. **Prefer using optional chaining**
   - File: src/components/Chart.tsx
   - Tool: eslint
   - Recommendation: Use optional chaining operator

---

## Suggested Fixes

1. **Update Critical Dependencies** - Update vite and lodash to latest secure versions
2. **Move Secrets to Environment Variables** - Extract hardcoded secrets to .env files
3. **Add Comprehensive Error Handling** - Implement try-catch for async operations
4. **Fix React Hook Dependencies** - Add missing dependencies to useEffect hooks
5. **Code Cleanup** - Remove unused variables and imports

---

## README Analysis

**Score:** 82/100

### Strengths
- Clear project overview and purpose
- Installation instructions provided
- Modern tech stack documented
- Testing commands included

### Improvements
- Add screenshots or demo GIF
- Include API documentation
- Add contributing guidelines
- Include deployment instructions
- Add badges for build status and coverage

---

## Recommendations

1. **Immediate Action Required:** Update vite to fix critical vulnerability
2. **High Priority:** Implement proper error handling for async operations
3. **Medium Priority:** Move hardcoded secrets to environment variables
4. **Low Priority:** Clean up unused code and improve documentation

---

*Report generated by RepoPilot - AI-Powered Repository Analysis*
`,
  reportMarkdown: `# RepoPilot Security & Code Quality Report

**Repository:** react-dashboard-demo
**Scan ID:** mock_scan_react_1234567890
**Status:** ✅ Completed

## Summary
- Vulnerabilities: 4 (1 Critical, 1 High, 1 Medium, 1 Low)
- Bugs: 4 (1 High, 2 Medium, 1 Low)
- README Score: 82/100

## Critical Issues
1. Update vite to version 4.5.2 or higher immediately
2. Implement error handling for async operations

*Full report available in dashboard*
`,
};

// Mock data for Python/Flask repository
export const mockFlaskResult: ScanResult = {
  scanId: 'mock_scan_flask_1234567890',
  status: 'completed',
  timestamp: new Date().toISOString(),
  repoMetadata: {
    name: 'flask-api-demo',
    languages: ['Python'],
    frameworks: ['Flask'],
    hasDocker: true,
    hasTests: true,
    fileCount: 42,
    totalLines: 3218,
    packageManager: 'pip',
  },
  readme: {
    title: 'Flask API Demo',
    content: `# Flask API Demo

## Overview
A RESTful API built with Flask and Python for demonstration purposes.

## Features
- JWT authentication
- PostgreSQL database
- RESTful endpoints
- Swagger documentation

## Installation
\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Usage
\`\`\`bash
python app.py
\`\`\`

## Testing
\`\`\`bash
pytest
\`\`\`

## License
MIT License
`,
  },
  readmeFeedback: {
    score: 78,
    strengths: [
      'Clear installation steps',
      'Basic usage instructions provided',
      'Testing command included',
      'License specified',
    ],
    improvements: [
      'Add API endpoint documentation',
      'Include environment setup instructions',
      'Add database schema information',
      'Include deployment guide',
      'Add contribution guidelines',
    ],
  },
  vulnerabilities: [
    {
      severity: 'Critical',
      tool: 'bandit',
      file: 'app/auth.py',
      issue: 'Use of hardcoded password detected - security risk',
      recommendation: 'Store passwords securely using environment variables and hashing',
    },
    {
      severity: 'High',
      tool: 'safety',
      file: 'requirements.txt',
      issue: 'Flask < 2.3.2 has security vulnerability CVE-2023-30861',
      recommendation: 'Update Flask to version 2.3.2 or higher',
    },
    {
      severity: 'High',
      tool: 'bandit',
      file: 'app/database.py',
      issue: 'SQL injection vulnerability - unsanitized user input in query',
      recommendation: 'Use parameterized queries or ORM to prevent SQL injection',
    },
    {
      severity: 'Medium',
      tool: 'bandit',
      file: 'app/utils.py',
      issue: 'Use of insecure random number generator',
      recommendation: 'Use secrets module instead of random for security-sensitive operations',
    },
    {
      severity: 'Low',
      tool: 'safety',
      file: 'requirements.txt',
      issue: 'requests < 2.31.0 has minor security issue',
      recommendation: 'Update requests library to latest version',
    },
  ],
  bugs: [
    {
      severity: 'High',
      tool: 'ruff',
      file: 'app/routes.py',
      issue: 'Exception handler catches all exceptions - may hide critical errors',
      recommendation: 'Catch specific exceptions instead of bare except clause',
    },
    {
      severity: 'Medium',
      tool: 'ruff',
      file: 'app/models.py',
      issue: 'Undefined variable "user_id" referenced before assignment',
      recommendation: 'Initialize variable before use or add proper error handling',
    },
    {
      severity: 'Medium',
      tool: 'pylint',
      file: 'app/services.py',
      issue: 'Function has too many arguments (8/5)',
      recommendation: 'Refactor function to use fewer arguments or create a data class',
    },
    {
      severity: 'Low',
      tool: 'ruff',
      file: 'app/helpers.py',
      issue: 'Unused import "datetime"',
      recommendation: 'Remove unused import to improve code clarity',
    },
  ],
  suggestedFixes: [
    {
      title: 'Fix Critical Security Issues',
      description: 'Remove hardcoded passwords and update Flask to secure version immediately',
      file: 'app/auth.py',
    },
    {
      title: 'Prevent SQL Injection',
      description: 'Replace raw SQL queries with parameterized queries or use SQLAlchemy ORM',
      file: 'app/database.py',
    },
    {
      title: 'Improve Exception Handling',
      description: 'Replace bare except clauses with specific exception types',
      file: 'app/routes.py',
    },
    {
      title: 'Update Dependencies',
      description: 'Update all packages in requirements.txt to their latest secure versions',
      file: 'requirements.txt',
    },
    {
      title: 'Code Refactoring',
      description: 'Refactor functions with too many arguments and remove unused imports',
    },
  ],
  warnings: [
    'Critical security vulnerabilities detected - immediate action required',
    'SQL injection vulnerability found - database may be at risk',
    'Some Python packages are outdated',
  ],
  fullReport: `# RepoPilot Security & Code Quality Report

**Repository:** flask-api-demo
**Scan ID:** mock_scan_flask_1234567890
**Scan Date:** ${new Date().toISOString()}
**Status:** ✅ Completed

---

## Executive Summary

This report provides a comprehensive analysis of the Flask API repository including security vulnerabilities, code quality issues, and recommendations for improvement.

### Key Findings
- **Vulnerabilities:** 5 (1 Critical, 2 High, 1 Medium, 1 Low)
- **Bugs:** 4 (1 High, 2 Medium, 1 Low)
- **Suggested Fixes:** 5
- **README Score:** 78/100

---

## Repository Overview

- **Language:** Python
- **Framework:** Flask
- **Files:** 42
- **Lines of Code:** 3,218
- **Package Manager:** pip
- **Docker Support:** ✅ Yes
- **Test Coverage:** ✅ Yes

---

## Security Vulnerabilities

### Critical
1. **Hardcoded password detected**
   - File: app/auth.py
   - Tool: bandit
   - Recommendation: Store passwords securely using environment variables and hashing

### High
2. **Flask < 2.3.2 has security vulnerability CVE-2023-30861**
   - File: requirements.txt
   - Tool: safety
   - Recommendation: Update Flask to version 2.3.2 or higher

3. **SQL injection vulnerability**
   - File: app/database.py
   - Tool: bandit
   - Recommendation: Use parameterized queries or ORM

### Medium
4. **Use of insecure random number generator**
   - File: app/utils.py
   - Tool: bandit
   - Recommendation: Use secrets module instead of random

### Low
5. **requests < 2.31.0 has minor security issue**
   - File: requirements.txt
   - Tool: safety
   - Recommendation: Update requests library to latest version

---

## Code Quality Issues

### High Priority
1. **Exception handler catches all exceptions**
   - File: app/routes.py
   - Tool: ruff
   - Recommendation: Catch specific exceptions instead of bare except

### Medium Priority
2. **Undefined variable referenced before assignment**
   - File: app/models.py
   - Tool: ruff
   - Recommendation: Initialize variable before use

3. **Function has too many arguments (8/5)**
   - File: app/services.py
   - Tool: pylint
   - Recommendation: Refactor function or create a data class

### Low Priority
4. **Unused import "datetime"**
   - File: app/helpers.py
   - Tool: ruff
   - Recommendation: Remove unused import

---

## Suggested Fixes

1. **Fix Critical Security Issues** - Remove hardcoded passwords and update Flask
2. **Prevent SQL Injection** - Use parameterized queries or SQLAlchemy ORM
3. **Improve Exception Handling** - Replace bare except clauses
4. **Update Dependencies** - Update all packages to latest secure versions
5. **Code Refactoring** - Refactor functions and remove unused imports

---

## README Analysis

**Score:** 78/100

### Strengths
- Clear installation steps
- Basic usage instructions provided
- Testing command included
- License specified

### Improvements
- Add API endpoint documentation
- Include environment setup instructions
- Add database schema information
- Include deployment guide
- Add contribution guidelines

---

## Recommendations

1. **Immediate Action Required:** Remove hardcoded passwords and fix SQL injection
2. **High Priority:** Update Flask to fix security vulnerability
3. **Medium Priority:** Improve exception handling
4. **Low Priority:** Clean up unused code and improve documentation

---

*Report generated by RepoPilot - AI-Powered Repository Analysis*
`,
  reportMarkdown: `# RepoPilot Security & Code Quality Report

**Repository:** flask-api-demo
**Scan ID:** mock_scan_flask_1234567890
**Status:** ✅ Completed

## Summary
- Vulnerabilities: 5 (1 Critical, 2 High, 1 Medium, 1 Low)
- Bugs: 4 (1 High, 2 Medium, 1 Low)
- README Score: 78/100

## Critical Issues
1. Remove hardcoded passwords immediately
2. Fix SQL injection vulnerability
3. Update Flask to version 2.3.2 or higher

*Full report available in dashboard*
`,
};

// Legacy mock for backward compatibility
export const mockScanResult = mockReactResult;

// Made with Bob
