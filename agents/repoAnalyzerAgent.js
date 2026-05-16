import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const countLines = async (filePath) => {
  try {
    const content = await readFile(filePath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
};

const detectLanguages = async (repoPath) => {
  const languages = new Set();
  const extensions = {
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.py': 'Python',
    '.java': 'Java',
    '.go': 'Go',
    '.rs': 'Rust',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.c': 'C',
    '.cpp': 'C++',
    '.cs': 'C#',
  };

  const scanDir = async (dir) => {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else {
          const ext = entry.name.substring(entry.name.lastIndexOf('.'));
          if (extensions[ext]) {
            languages.add(extensions[ext]);
          }
        }
      }
    } catch (error) {
      // Ignore errors
    }
  };

  await scanDir(repoPath);
  return Array.from(languages);
};

const detectFrameworks = async (repoPath) => {
  const frameworks = new Set();

  // Check package.json for Node frameworks
  const packageJsonPath = join(repoPath, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const content = await readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      if (deps.react) frameworks.add('React');
      if (deps.next) frameworks.add('Next.js');
      if (deps.vue) frameworks.add('Vue');
      if (deps.angular) frameworks.add('Angular');
      if (deps.express) frameworks.add('Express');
      if (deps.fastify) frameworks.add('Fastify');
      if (deps.nestjs) frameworks.add('NestJS');
    } catch {
      // Ignore errors
    }
  }

  // Check requirements.txt for Python frameworks
  const requirementsPath = join(repoPath, 'requirements.txt');
  if (existsSync(requirementsPath)) {
    try {
      const content = await readFile(requirementsPath, 'utf-8');
      if (content.includes('flask')) frameworks.add('Flask');
      if (content.includes('django')) frameworks.add('Django');
      if (content.includes('fastapi')) frameworks.add('FastAPI');
    } catch {
      // Ignore errors
    }
  }

  return Array.from(frameworks);
};

const countFilesAndLines = async (repoPath) => {
  let fileCount = 0;
  let totalLines = 0;

  const scanDir = async (dir) => {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else {
          fileCount++;
          totalLines += await countLines(fullPath);
        }
      }
    } catch (error) {
      // Ignore errors
    }
  };

  await scanDir(repoPath);
  return { fileCount, totalLines };
};

export const analyzeRepo = async (repoPath) => {
  const name = repoPath.split('/').pop() || 'unknown-repo';
  
  const languages = await detectLanguages(repoPath);
  const frameworks = await detectFrameworks(repoPath);
  const { fileCount, totalLines } = await countFilesAndLines(repoPath);
  
  const hasDocker = existsSync(join(repoPath, 'Dockerfile')) || 
                     existsSync(join(repoPath, 'docker-compose.yml'));
  
  const hasTests = existsSync(join(repoPath, 'test')) ||
                   existsSync(join(repoPath, 'tests')) ||
                   existsSync(join(repoPath, '__tests__')) ||
                   existsSync(join(repoPath, 'spec'));

  return {
    name,
    languages: languages.length > 0 ? languages : ['Unknown'],
    frameworks: frameworks.length > 0 ? frameworks : [],
    hasDocker,
    hasTests,
    fileCount,
    totalLines,
  };
};

// Made with Bob
