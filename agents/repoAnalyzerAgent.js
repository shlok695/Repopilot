import { readdir, readFile, stat } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '__pycache__',
  'venv',
  '.next',
  '.venv',
  'env',
  'target',
  'out',
  '.cache',
  'coverage',
]);

const IMPORTANT_FILES = [
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'Dockerfile',
  'docker-compose.yml',
  '.env.example',
  'README.md',
  'Cargo.toml',
  'go.mod',
  'pom.xml',
  'build.gradle',
];

/**
 * Recursively walk directory and collect file information
 */
const walkDirectory = async (dirPath, basePath = dirPath) => {
  const files = [];
  const extensions = new Set();
  const topLevelFolders = new Set();
  const importantFiles = [];
  const linesOfCode = { js: 0, ts: 0, py: 0, jsx: 0, tsx: 0 };

  const walk = async (currentPath, depth = 0) => {
    try {
      const entries = await readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name);
        const relativePath = fullPath.replace(basePath, '').replace(/^[/\\]/, '');

        // Track top-level folders
        if (depth === 0 && entry.isDirectory()) {
          topLevelFolders.add(entry.name);
        }

        // Skip ignored directories
        if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          await walk(fullPath, depth + 1);
        } else {
          files.push(relativePath);
          
          // Track extensions
          const ext = entry.name.includes('.') 
            ? entry.name.substring(entry.name.lastIndexOf('.'))
            : '';
          if (ext) extensions.add(ext);

          // Track important files
          if (IMPORTANT_FILES.includes(entry.name)) {
            importantFiles.push(relativePath);
          }

          // Estimate lines of code by file size (bytes / 40)
          try {
            const stats = await stat(fullPath);
            const estimatedLines = Math.ceil(stats.size / 40);
            
            if (ext === '.js') linesOfCode.js += estimatedLines;
            else if (ext === '.ts') linesOfCode.ts += estimatedLines;
            else if (ext === '.py') linesOfCode.py += estimatedLines;
            else if (ext === '.jsx') linesOfCode.jsx += estimatedLines;
            else if (ext === '.tsx') linesOfCode.tsx += estimatedLines;
          } catch {
            // Ignore stat errors
          }
        }
      }
    } catch (error) {
      // Silently ignore permission errors
    }
  };

  await walk(dirPath);
  return { files, extensions, topLevelFolders, importantFiles, linesOfCode };
};

/**
 * Parse package.json and extract metadata
 */
const parsePackageJson = async (repoPath) => {
  const packageJsonPath = join(repoPath, 'package.json');
  if (!existsSync(packageJsonPath)) return null;

  try {
    const content = await readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);
    
    // Get top 5 dependencies by name
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const topDeps = Object.keys(allDeps)
      .sort()
      .slice(0, 5);

    return {
      name: pkg.name || '',
      version: pkg.version || 'unknown',
      description: pkg.description || '',
      scripts: Object.keys(pkg.scripts || {}),
      topDependencies: topDeps,
      allDependencies: allDeps,
    };
  } catch {
    return null;
  }
};

/**
 * Parse requirements.txt and extract top 10 packages
 */
const parseRequirementsTxt = async (repoPath) => {
  const requirementsPath = join(repoPath, 'requirements.txt');
  if (!existsSync(requirementsPath)) return [];

  try {
    const content = await readFile(requirementsPath, 'utf-8');
    const packages = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => {
        // Extract package name (before ==, >=, etc.)
        const match = line.match(/^([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
      })
      .filter(Boolean)
      .slice(0, 10);
    
    return packages;
  } catch {
    return [];
  }
};

/**
 * Detect test frameworks
 */
const detectTestFrameworks = async (repoPath, packageJsonData) => {
  const testFrameworks = new Set();

  // Node.js test frameworks
  if (packageJsonData?.allDependencies) {
    const deps = packageJsonData.allDependencies;
    if (deps.jest || deps['@types/jest']) testFrameworks.add('Jest');
    if (deps.vitest) testFrameworks.add('Vitest');
    if (deps.mocha) testFrameworks.add('Mocha');
    if (deps.jasmine) testFrameworks.add('Jasmine');
    if (deps.ava) testFrameworks.add('AVA');
    if (deps.cypress) testFrameworks.add('Cypress');
    if (deps.playwright) testFrameworks.add('Playwright');
  }

  // Python test frameworks
  const requirementsPath = join(repoPath, 'requirements.txt');
  if (existsSync(requirementsPath)) {
    try {
      const content = await readFile(requirementsPath, 'utf-8');
      const lower = content.toLowerCase();
      
      if (lower.includes('pytest')) testFrameworks.add('pytest');
      if (lower.includes('unittest')) testFrameworks.add('unittest');
      if (lower.includes('nose')) testFrameworks.add('nose');
    } catch {
      // Ignore
    }
  }

  return Array.from(testFrameworks);
};

/**
 * Detect CI/CD configuration
 */
const detectCI = async (repoPath) => {
  const ciTools = new Set();

  // GitHub Actions
  const githubWorkflowsPath = join(repoPath, '.github', 'workflows');
  if (existsSync(githubWorkflowsPath)) {
    try {
      const files = await readdir(githubWorkflowsPath);
      if (files.some(f => f.endsWith('.yml') || f.endsWith('.yaml'))) {
        ciTools.add('GitHub Actions');
      }
    } catch {
      // Ignore
    }
  }

  // GitLab CI
  if (existsSync(join(repoPath, '.gitlab-ci.yml'))) {
    ciTools.add('GitLab CI');
  }

  // Jenkins
  if (existsSync(join(repoPath, 'Jenkinsfile'))) {
    ciTools.add('Jenkins');
  }

  // Travis CI
  if (existsSync(join(repoPath, '.travis.yml'))) {
    ciTools.add('Travis CI');
  }

  // Circle CI
  if (existsSync(join(repoPath, '.circleci', 'config.yml'))) {
    ciTools.add('CircleCI');
  }

  return Array.from(ciTools);
};

/**
 * Detect tech stack from extensions and files
 */
const detectTechStack = (extensions, importantFiles, testFrameworks, ciTools) => {
  const techStack = new Set();

  // Language detection
  if (extensions.has('.js') || extensions.has('.jsx') || extensions.has('.mjs')) {
    techStack.add('JavaScript');
  }
  if (extensions.has('.ts') || extensions.has('.tsx')) {
    techStack.add('TypeScript');
  }
  if (extensions.has('.py')) {
    techStack.add('Python');
  }
  if (extensions.has('.java')) {
    techStack.add('Java');
  }
  if (extensions.has('.go')) {
    techStack.add('Go');
  }
  if (extensions.has('.rs')) {
    techStack.add('Rust');
  }
  if (extensions.has('.rb')) {
    techStack.add('Ruby');
  }
  if (extensions.has('.php')) {
    techStack.add('PHP');
  }

  // Framework/tool detection from files
  if (importantFiles.some(f => f.includes('package.json'))) {
    techStack.add('Node.js');
  }
  if (importantFiles.some(f => f.includes('requirements.txt') || f.includes('pyproject.toml'))) {
    techStack.add('Python');
  }
  if (importantFiles.some(f => f.includes('Dockerfile'))) {
    techStack.add('Docker');
  }
  if (importantFiles.some(f => f.includes('Cargo.toml'))) {
    techStack.add('Rust');
  }
  if (importantFiles.some(f => f.includes('go.mod'))) {
    techStack.add('Go');
  }

  // Add test frameworks
  testFrameworks.forEach(tf => techStack.add(tf));

  // Add CI tools
  ciTools.forEach(ci => techStack.add(ci));

  return Array.from(techStack);
};

/**
 * Detect package manager
 */
const detectPackageManager = async (repoPath, importantFiles) => {
  // Check for lock files
  if (existsSync(join(repoPath, 'package-lock.json'))) return 'npm';
  if (existsSync(join(repoPath, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(repoPath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(repoPath, 'bun.lockb'))) return 'bun';
  
  // Python package managers
  if (importantFiles.some(f => f.includes('poetry.lock'))) return 'poetry';
  if (importantFiles.some(f => f.includes('Pipfile'))) return 'pipenv';
  if (importantFiles.some(f => f.includes('requirements.txt'))) return 'pip';
  
  // Check package.json for packageManager field
  const packageJsonPath = join(repoPath, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const content = await readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);
      if (pkg.packageManager) {
        if (pkg.packageManager.startsWith('yarn')) return 'yarn';
        if (pkg.packageManager.startsWith('pnpm')) return 'pnpm';
        if (pkg.packageManager.startsWith('npm')) return 'npm';
      }
      return 'npm'; // Default for Node.js projects
    } catch {
      // Ignore
    }
  }

  return 'unknown';
};

/**
 * Detect frameworks from package.json and requirements.txt
 */
const detectFrameworks = async (repoPath) => {
  const frameworks = new Set();

  // Node.js frameworks
  const packageJsonPath = join(repoPath, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const content = await readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps.react) frameworks.add('React');
      if (deps.next) frameworks.add('Next.js');
      if (deps.vue) frameworks.add('Vue');
      if (deps['@angular/core']) frameworks.add('Angular');
      if (deps.svelte) frameworks.add('Svelte');
      if (deps.express) frameworks.add('Express');
      if (deps.fastify) frameworks.add('Fastify');
      if (deps['@nestjs/core']) frameworks.add('NestJS');
      if (deps.koa) frameworks.add('Koa');
      if (deps.gatsby) frameworks.add('Gatsby');
      if (deps.nuxt) frameworks.add('Nuxt');
    } catch {
      // Ignore parse errors
    }
  }

  // Python frameworks
  const requirementsPath = join(repoPath, 'requirements.txt');
  if (existsSync(requirementsPath)) {
    try {
      const content = await readFile(requirementsPath, 'utf-8');
      const lower = content.toLowerCase();
      
      if (lower.includes('flask')) frameworks.add('Flask');
      if (lower.includes('django')) frameworks.add('Django');
      if (lower.includes('fastapi')) frameworks.add('FastAPI');
      if (lower.includes('tornado')) frameworks.add('Tornado');
      if (lower.includes('pyramid')) frameworks.add('Pyramid');
    } catch {
      // Ignore
    }
  }

  // Check pyproject.toml
  const pyprojectPath = join(repoPath, 'pyproject.toml');
  if (existsSync(pyprojectPath)) {
    try {
      const content = await readFile(pyprojectPath, 'utf-8');
      const lower = content.toLowerCase();
      
      if (lower.includes('flask')) frameworks.add('Flask');
      if (lower.includes('django')) frameworks.add('Django');
      if (lower.includes('fastapi')) frameworks.add('FastAPI');
    } catch {
      // Ignore
    }
  }

  return Array.from(frameworks);
};

/**
 * Generate human-readable summary
 */
const generateSummary = (name, techStack, frameworks, totalFiles, packageJsonData) => {
  const parts = [];
  
  if (frameworks.length > 0) {
    parts.push(`${frameworks.join(', ')} application`);
  } else if (techStack.length > 0) {
    const mainTech = techStack.filter(t => 
      ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust'].includes(t)
    );
    if (mainTech.length > 0) {
      parts.push(`${mainTech.join('/')} project`);
    } else {
      parts.push('software project');
    }
  } else {
    parts.push('software project');
  }

  if (packageJsonData?.description) {
    return `${packageJsonData.description} Built with ${parts[0]}.`;
  }

  parts.push(`with ${totalFiles} files`);
  return `A ${parts.join(' ')}.`;
};

/**
 * Main analyzer function
 */
export async function analyzeRepo(repoPath) {
  const name = basename(repoPath);
  
  // Walk directory and collect information
  const { files, extensions, topLevelFolders, importantFiles, linesOfCode } = await walkDirectory(repoPath);
  const totalLines = Object.values(linesOfCode).reduce((sum, count) => sum + count, 0);
  
  // Parse package.json
  const packageJsonData = await parsePackageJson(repoPath);
  
  // Parse requirements.txt
  const pythonPackages = await parseRequirementsTxt(repoPath);
  
  // Detect test frameworks
  const testFrameworks = await detectTestFrameworks(repoPath, packageJsonData);
  
  // Detect CI/CD
  const ciTools = await detectCI(repoPath);
  
  // Detect various aspects
  const techStack = detectTechStack(extensions, importantFiles, testFrameworks, ciTools);
  const packageManager = await detectPackageManager(repoPath, importantFiles);
  const detectedFrameworks = await detectFrameworks(repoPath);
  
  // Generate summary
  const summary = generateSummary(name, techStack, detectedFrameworks, files.length, packageJsonData);

  return {
    name,
    techStack,
    languages: techStack.filter(item => [
      'JavaScript',
      'TypeScript',
      'Python',
      'Java',
      'Go',
      'Rust',
      'Ruby',
      'PHP',
    ].includes(item)),
    packageManager,
    totalFiles: files.length,
    fileCount: files.length,
    mainFolders: Array.from(topLevelFolders),
    importantFiles,
    detectedFrameworks,
    frameworks: detectedFrameworks,
    hasDocker: techStack.includes('Docker'),
    hasTests: testFrameworks.length > 0 || topLevelFolders.has('test') || topLevelFolders.has('tests') || topLevelFolders.has('__tests__'),
    summary,
    linesOfCode,
    totalLines,
    packageJson: packageJsonData ? {
      name: packageJsonData.name || name,
      version: packageJsonData.version,
      description: packageJsonData.description,
      scripts: packageJsonData.scripts,
      topDependencies: packageJsonData.topDependencies,
    } : null,
    pythonPackages,
    testFrameworks,
    ciTools,
  };
}

// Made with Bob
