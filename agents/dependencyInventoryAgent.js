import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export const inventoryDependencies = async (repoPath, repoMetadata) => {
  const inventory = {
    production: [],
    development: [],
    python: [],
    totalCount: 0,
    unpinnedCount: 0,
  };

  // Node.js dependencies
  const packageJsonPath = join(repoPath, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const content = await readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);
      
      if (pkg.dependencies) {
        inventory.production = Object.entries(pkg.dependencies).map(([name, version]) => ({
          name,
          version,
          pinned: !version.startsWith('^') && !version.startsWith('~'),
        }));
      }
      
      if (pkg.devDependencies) {
        inventory.development = Object.entries(pkg.devDependencies).map(([name, version]) => ({
          name,
          version,
          pinned: !version.startsWith('^') && !version.startsWith('~'),
        }));
      }
    } catch {
      // Ignore errors
    }
  }

  // Python dependencies
  const requirementsPath = join(repoPath, 'requirements.txt');
  if (existsSync(requirementsPath)) {
    try {
      const content = await readFile(requirementsPath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      
      inventory.python = lines.map(line => {
        const match = line.match(/^([a-zA-Z0-9-_]+)(==|>=|<=|~=)?(.+)?$/);
        if (match) {
          return {
            name: match[1],
            version: match[3] || 'latest',
            pinned: match[2] === '==',
          };
        }
        return { name: line, version: 'unknown', pinned: false };
      });
    } catch {
      // Ignore errors
    }
  }

  inventory.totalCount = inventory.production.length + inventory.development.length + inventory.python.length;
  inventory.unpinnedCount = [
    ...inventory.production,
    ...inventory.development,
    ...inventory.python,
  ].filter(d => !d.pinned).length;

  return inventory;
};

// Made with Bob
