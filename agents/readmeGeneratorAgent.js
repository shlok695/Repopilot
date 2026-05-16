import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Read and parse package.json
 */
const readPackageJson = async (repoPath) => {
  const packageJsonPath = join(repoPath, 'package.json');
  if (!existsSync(packageJsonPath)) return null;

  try {
    const content = await readFile(packageJsonPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
};

/**
 * Read existing README if present and extract description
 */
const readExistingReadme = async (repoPath) => {
  const readmePath = join(repoPath, 'README.md');
  if (!existsSync(readmePath)) return null;

  try {
    const content = await readFile(readmePath, 'utf-8');
    
    // Extract description section (text between ## Description and next ##)
    const descMatch = content.match(/##\s*Description\s*\n\n([\s\S]*?)(?=\n##|$)/i);
    if (descMatch) {
      return {
        fullContent: content,
        description: descMatch[1].trim(),
      };
    }
    
    // If no Description section, try to get first paragraph after title
    const lines = content.split('\n');
    let description = '';
    let foundTitle = false;
    
    for (const line of lines) {
      if (line.startsWith('#') && !foundTitle) {
        foundTitle = true;
        continue;
      }
      if (foundTitle && line.trim() && !line.startsWith('#')) {
        description += line + '\n';
      }
      if (foundTitle && line.trim() === '' && description) {
        break;
      }
    }
    
    return {
      fullContent: content,
      description: description.trim() || null,
    };
  } catch {
    return null;
  }
};

/**
 * Read .env.example and extract variable names with descriptions
 */
const readEnvExample = async (repoPath) => {
  const envPath = join(repoPath, '.env.example');
  if (!existsSync(envPath)) return [];

  try {
    const content = await readFile(envPath, 'utf-8');
    const variables = [];
    const lines = content.split('\n');
    let lastComment = '';

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Capture comments as descriptions
      if (trimmed.startsWith('#')) {
        lastComment = trimmed.substring(1).trim();
        continue;
      }
      
      // Extract variable name and value
      const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match) {
        const [, name, value] = match;
        variables.push({
          name,
          value: value || '',
          description: lastComment || `Configuration for ${name.toLowerCase().replace(/_/g, ' ')}`,
        });
        lastComment = '';
      }
    }
    
    return variables;
  } catch {
    return [];
  }
};

/**
 * Detect API routes from common patterns
 */
const detectApiRoutes = async (repoPath) => {
  const routes = [];
  
  // Check common route directories
  const routeDirs = ['routes', 'src/routes', 'api', 'src/api', 'controllers', 'src/controllers'];
  
  for (const dir of routeDirs) {
    const fullPath = join(repoPath, dir);
    if (!existsSync(fullPath)) continue;

    try {
      const files = await readdir(fullPath);
      for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.ts')) {
          const filePath = join(fullPath, file);
          try {
            const content = await readFile(filePath, 'utf-8');
            
            // Look for Express route patterns
            const routePatterns = [
              /router\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g,
              /app\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g,
            ];

            for (const pattern of routePatterns) {
              let match;
              while ((match = pattern.exec(content)) !== null) {
                routes.push({
                  method: match[1].toUpperCase(),
                  path: match[2],
                  file: file,
                });
              }
            }
          } catch {
            // Ignore file read errors
          }
        }
      }
    } catch {
      // Ignore directory read errors
    }
  }

  return routes;
};

/**
 * Infer features from folder names and frameworks
 */
const inferFeatures = (repoMetadata) => {
  const features = [];
  const { mainFolders = [], detectedFrameworks = [], techStack = [] } = repoMetadata;

  // Framework-based features
  if (detectedFrameworks.includes('React') || detectedFrameworks.includes('Next.js')) {
    features.push('Modern React-based user interface');
  }
  if (detectedFrameworks.includes('Express') || detectedFrameworks.includes('Fastify')) {
    features.push('RESTful API backend');
  }
  if (detectedFrameworks.includes('Flask') || detectedFrameworks.includes('Django') || detectedFrameworks.includes('FastAPI')) {
    features.push('Python web application');
  }

  // Folder-based features
  if (mainFolders.includes('auth') || mainFolders.includes('authentication')) {
    features.push('User authentication system');
  }
  if (mainFolders.includes('api') || mainFolders.includes('routes')) {
    features.push('API endpoints');
  }
  if (mainFolders.includes('database') || mainFolders.includes('db') || mainFolders.includes('models')) {
    features.push('Database integration');
  }
  if (mainFolders.includes('tests') || mainFolders.includes('test') || mainFolders.includes('__tests__')) {
    features.push('Comprehensive test suite');
  }
  if (mainFolders.includes('docs') || mainFolders.includes('documentation')) {
    features.push('Detailed documentation');
  }

  // Tech stack features
  if (techStack.includes('Docker')) {
    features.push('Docker containerization');
  }
  if (techStack.includes('TypeScript')) {
    features.push('Type-safe TypeScript codebase');
  }
  if (repoMetadata.ciTools && repoMetadata.ciTools.length > 0) {
    features.push(`CI/CD pipeline with ${repoMetadata.ciTools[0]}`);
  }

  return features.length > 0 ? features : ['Full-stack application', 'Modern development practices'];
};

/**
 * Generate project structure section
 */
const generateProjectStructure = (repoMetadata) => {
  const { mainFolders = [], importantFiles = [] } = repoMetadata;
  
  let structure = '```\n';
  structure += `${repoMetadata.name}/\n`;
  
  // Add main folders
  mainFolders.slice(0, 8).forEach(folder => {
    structure += `├── ${folder}/\n`;
  });
  
  // Add important files
  importantFiles.slice(0, 5).forEach(file => {
    structure += `├── ${file}\n`;
  });
  
  structure += '```\n';
  return structure;
};

/**
 * Generate installation instructions
 */
const generateInstallation = (repoMetadata, packageJson) => {
  let content = '';
  const { packageManager = 'npm', techStack = [] } = repoMetadata;

  // Node.js installation
  if (packageJson) {
    content += '### Node.js Setup\n\n';
    content += '```bash\n';
    
    if (packageManager === 'yarn') {
      content += 'yarn install\n';
    } else if (packageManager === 'pnpm') {
      content += 'pnpm install\n';
    } else if (packageManager === 'bun') {
      content += 'bun install\n';
    } else {
      content += 'npm install\n';
    }
    
    content += '```\n\n';
  }

  // Python installation
  if (techStack.includes('Python')) {
    content += '### Python Setup\n\n';
    content += '```bash\n';
    
    if (repoMetadata.packageManager === 'poetry') {
      content += 'poetry install\n';
    } else if (repoMetadata.packageManager === 'pipenv') {
      content += 'pipenv install\n';
    } else {
      content += 'pip install -r requirements.txt\n';
    }
    
    content += '```\n\n';
  }

  return content;
};

/**
 * Generate running locally section with accurate script commands
 */
const generateRunningLocally = (packageJson, repoMetadata) => {
  let content = '';
  const { detectedFrameworks = [], techStack = [], packageManager = 'npm' } = repoMetadata;

  if (packageJson?.scripts) {
    const scripts = packageJson.scripts;
    const runCmd = packageManager === 'yarn' ? 'yarn' : packageManager === 'pnpm' ? 'pnpm' : 'npm run';
    const startCmd = packageManager === 'yarn' ? 'yarn start' : packageManager === 'pnpm' ? 'pnpm start' : 'npm start';

    // Development server
    if (scripts.dev || scripts.start || scripts.serve) {
      content += '### Development Server\n\n';
      content += '```bash\n';
      
      if (scripts.dev) {
        content += `${runCmd} dev\n`;
      } else if (scripts.start) {
        content += `${startCmd}\n`;
      } else if (scripts.serve) {
        content += `${runCmd} serve\n`;
      }
      
      content += '```\n\n';
    }

    // Build instructions
    if (scripts.build) {
      content += '### Production Build\n\n';
      content += '```bash\n';
      content += `${runCmd} build\n`;
      
      // Add start command for production if available
      if (scripts['start:prod'] || scripts['serve:prod']) {
        content += `${runCmd} ${scripts['start:prod'] ? 'start:prod' : 'serve:prod'}\n`;
      }
      
      content += '```\n\n';
    }

    // Preview (for Vite projects)
    if (scripts.preview) {
      content += '### Preview Production Build\n\n';
      content += '```bash\n';
      content += `${runCmd} preview\n`;
      content += '```\n\n';
    }
  } else if (techStack.includes('Python')) {
    content += '### Development Server\n\n';
    content += '```bash\n';
    
    if (detectedFrameworks.includes('Flask')) {
      content += '# Set Flask app\n';
      content += 'export FLASK_APP=app.py\n';
      content += 'export FLASK_ENV=development\n';
      content += 'flask run\n';
    } else if (detectedFrameworks.includes('Django')) {
      content += 'python manage.py runserver\n';
    } else if (detectedFrameworks.includes('FastAPI')) {
      content += 'uvicorn main:app --reload\n';
    } else {
      content += 'python app.py\n';
    }
    
    content += '```\n\n';
  }

  return content;
};

/**
 * Generate environment variables section
 */
const generateEnvVariables = (envVars) => {
  if (envVars.length === 0) {
    return '### Common Variables\n\n' +
           '- `PORT` - Server port (default: 3000)\n' +
           '- `NODE_ENV` - Environment (development/production)\n' +
           '- `DATABASE_URL` - Database connection string\n\n';
  }

  let content = '### Required Variables\n\n';
  content += 'Copy `.env.example` to `.env` and configure:\n\n';
  content += '```bash\n';
  content += 'cp .env.example .env\n';
  content += '```\n\n';
  
  content += 'Configure the following variables:\n\n';
  envVars.forEach(envVar => {
    if (typeof envVar === 'string') {
      content += `- \`${envVar}\`\n`;
    } else {
      content += `- \`${envVar.name}\` - ${envVar.description}\n`;
      if (envVar.value) {
        content += `  - Example: \`${envVar.value}\`\n`;
      }
    }
  });
  content += '\n';

  return content;
};

/**
 * Generate testing section with accurate script commands
 */
const generateTesting = (packageJson, repoMetadata) => {
  const { testFrameworks = [], packageManager = 'npm' } = repoMetadata;
  
  if (testFrameworks.length === 0 && !packageJson?.scripts?.test) return '';

  const runCmd = packageManager === 'yarn' ? 'yarn' : packageManager === 'pnpm' ? 'pnpm' : 'npm run';
  const testCmd = packageManager === 'yarn' ? 'yarn test' : packageManager === 'pnpm' ? 'pnpm test' : 'npm test';

  let content = '```bash\n';
  
  if (packageJson?.scripts?.test) {
    content += `${testCmd}\n`;
  } else if (testFrameworks.includes('pytest')) {
    content += '# Run all tests\n';
    content += 'pytest\n\n';
    content += '# Run with verbose output\n';
    content += 'pytest -v\n';
  } else if (testFrameworks.includes('Jest') || testFrameworks.includes('Vitest')) {
    content += `${testCmd}\n`;
  } else {
    content += `${testCmd}\n`;
  }
  
  content += '```\n\n';

  // Add coverage if available
  if (packageJson?.scripts?.['test:coverage'] || packageJson?.scripts?.coverage) {
    content += '### Test Coverage\n\n';
    content += '```bash\n';
    const coverageScript = packageJson.scripts['test:coverage'] ? 'test:coverage' : 'coverage';
    content += `${runCmd} ${coverageScript}\n`;
    content += '```\n\n';
  } else if (testFrameworks.includes('pytest')) {
    content += '### Test Coverage\n\n';
    content += '```bash\n';
    content += 'pytest --cov\n';
    content += '```\n\n';
  }

  // Add watch mode if available
  if (packageJson?.scripts?.['test:watch']) {
    content += '### Watch Mode\n\n';
    content += '```bash\n';
    content += `${runCmd} test:watch\n`;
    content += '```\n\n';
  }

  return content;
};

/**
 * Generate deployment section
 */
const generateDeployment = (repoMetadata) => {
  const { techStack = [] } = repoMetadata;
  
  if (!techStack.includes('Docker')) return '';

  let content = '### Using Docker\n\n';
  content += '```bash\n';
  
  if (repoMetadata.importantFiles?.some(f => f.includes('docker-compose'))) {
    content += '# Start all services\n';
    content += 'docker compose up -d\n\n';
    content += '# View logs\n';
    content += 'docker compose logs -f\n\n';
    content += '# Stop services\n';
    content += 'docker compose down\n';
  } else {
    content += '# Build image\n';
    content += `docker build -t ${repoMetadata.name} .\n\n`;
    content += '# Run container\n';
    content += `docker run -p 3000:3000 ${repoMetadata.name}\n`;
  }
  
  content += '```\n\n';

  return content;
};

/**
 * Generate API routes section
 */
const generateApiRoutes = (routes) => {
  if (routes.length === 0) return '';

  let content = '| Method | Endpoint | Description |\n';
  content += '|--------|----------|-------------|\n';

  // Group by file and show unique routes
  const uniqueRoutes = [...new Map(routes.map(r => [`${r.method}:${r.path}`, r])).values()];
  
  uniqueRoutes.slice(0, 10).forEach(route => {
    const description = route.path.split('/').filter(Boolean).join(' ');
    content += `| ${route.method} | \`${route.path}\` | ${description || 'API endpoint'} |\n`;
  });

  content += '\n';
  return content;
};

/**
 * Generate badges for README header
 */
const generateBadges = (repoMetadata, packageJson) => {
  const badges = [];
  const { techStack = [] } = repoMetadata;

  // Node.js version badge
  if (packageJson?.engines?.node) {
    const nodeVersion = packageJson.engines.node.replace(/[^0-9.]/g, '');
    badges.push(`![Node.js](https://img.shields.io/badge/node-${nodeVersion}-green)`);
  } else if (techStack.includes('Node.js') || techStack.includes('JavaScript') || techStack.includes('TypeScript')) {
    badges.push('![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green)');
  }

  // Python version badge
  if (techStack.includes('Python')) {
    badges.push('![Python](https://img.shields.io/badge/python-3.8%2B-blue)');
  }

  // Docker badge
  if (techStack.includes('Docker')) {
    badges.push('![Docker](https://img.shields.io/badge/docker-enabled-2496ED?logo=docker&logoColor=white)');
  }

  // TypeScript badge
  if (techStack.includes('TypeScript')) {
    badges.push('![TypeScript](https://img.shields.io/badge/typescript-5.0%2B-3178C6?logo=typescript&logoColor=white)');
  }

  // Test framework badges
  if (repoMetadata.testFrameworks?.includes('Jest')) {
    badges.push('![Jest](https://img.shields.io/badge/tested%20with-jest-C21325?logo=jest&logoColor=white)');
  } else if (repoMetadata.testFrameworks?.includes('pytest')) {
    badges.push('![pytest](https://img.shields.io/badge/tested%20with-pytest-0A9EDC?logo=pytest&logoColor=white)');
  }

  // CI badge
  if (repoMetadata.ciTools?.includes('GitHub Actions')) {
    badges.push('![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?logo=github-actions&logoColor=white)');
  }

  return badges.length > 0 ? badges.join(' ') + '\n\n' : '';
};

/**
 * Main README generator function
 */
export async function generateReadme(repoPath, repoMetadata) {
  const { name, techStack = [], detectedFrameworks = [], summary = '' } = repoMetadata;
  
  // Read available files
  const packageJson = await readPackageJson(repoPath);
  const existingReadme = await readExistingReadme(repoPath);
  const envVars = await readEnvExample(repoPath);
  const apiRoutes = await detectApiRoutes(repoPath);
  
  // Infer features
  const features = inferFeatures(repoMetadata);

  // Build README content
  let content = `# ${name}\n\n`;

  // Add badges
  content += generateBadges(repoMetadata, packageJson);

  // Description - use existing README description if available
  content += `## Description\n\n`;
  if (existingReadme?.description) {
    content += `${existingReadme.description}\n\n`;
  } else if (packageJson?.description) {
    content += `${packageJson.description}\n\n`;
  } else if (summary) {
    content += `${summary}\n\n`;
  } else {
    content += `A ${detectedFrameworks.join(', ') || techStack.join('/')} application.\n\n`;
  }

  // Features
  content += `## Features\n\n`;
  features.forEach(feature => {
    content += `- ${feature}\n`;
  });
  content += '\n';

  // Tech Stack
  content += `## Tech Stack\n\n`;
  if (techStack.length > 0) {
    techStack.forEach(tech => {
      content += `- ${tech}\n`;
    });
  } else {
    content += '- Modern web technologies\n';
  }
  content += '\n';

  // Project Structure
  content += `## Project Structure\n\n`;
  content += generateProjectStructure(repoMetadata);
  content += '\n';

  // Installation
  content += `## Installation\n\n`;
  content += generateInstallation(repoMetadata, packageJson);

  // Environment Variables
  content += `## Environment Variables\n\n`;
  content += generateEnvVariables(envVars);

  // Running Locally
  content += `## Running Locally\n\n`;
  content += generateRunningLocally(packageJson, repoMetadata);

  // Running Tests
  if (repoMetadata.testFrameworks && repoMetadata.testFrameworks.length > 0) {
    content += `## Running Tests\n\n`;
    content += generateTesting(packageJson, repoMetadata);
  }

  // Deployment
  if (techStack.includes('Docker')) {
    content += `## Deployment\n\n`;
    content += generateDeployment(repoMetadata);
  }

  // API Routes
  if (apiRoutes.length > 0) {
    content += `## API Routes\n\n`;
    content += generateApiRoutes(apiRoutes);
  }

  // Security Notes
  content += `## Security Notes\n\n`;
  content += '- Never commit `.env` files with sensitive data\n';
  content += '- Keep dependencies up to date\n';
  content += '- Use environment variables for secrets\n';
  if (techStack.includes('Docker')) {
    content += '- Review Docker image security best practices\n';
  }
  content += '\n';

  // Known Issues / Limitations
  content += `## Known Issues / Limitations\n\n`;
  content += '- This README was auto-generated and may need manual updates\n';
  content += '- Please refer to inline code comments for detailed implementation notes\n';
  if (!repoMetadata.testFrameworks || repoMetadata.testFrameworks.length === 0) {
    content += '- No automated tests detected - consider adding test coverage\n';
  }
  content += '\n';

  // Contributing
  content += `## Contributing\n\n`;
  content += 'Contributions are welcome! Please follow these steps:\n\n';
  content += '1. Fork the repository\n';
  content += '2. Create a feature branch (`git checkout -b feature/amazing-feature`)\n';
  content += '3. Commit your changes (`git commit -m \'Add amazing feature\'`)\n';
  content += '4. Push to the branch (`git push origin feature/amazing-feature`)\n';
  content += '5. Open a Pull Request\n\n';

  // License
  content += `## License\n\n`;
  const licensePath = join(repoPath, 'LICENSE');
  if (existsSync(licensePath)) {
    content += 'This project is licensed under the terms specified in the LICENSE file.\n\n';
  } else {
    content += 'Please check with the repository owner for licensing information.\n\n';
  }

  // Footer
  content += '---\n\n';
  content += '*This README was auto-generated by [RepoPilot](https://github.com/repopilot)*\n';

  return {
    title: name,
    content,
  };
}

// Made with Bob
