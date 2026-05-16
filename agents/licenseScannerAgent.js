import { spawnWithTimeout } from '../middleware/timeoutManager.js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const PROBLEMATIC_LICENSES = ['GPL', 'AGPL', 'UNKNOWN', 'UNLICENSED'];

const runLicenseChecker = async (repoPath) => {
  const packageJsonPath = join(repoPath, 'package.json');
  if (!existsSync(packageJsonPath)) return { licenses: [], warnings: [] };

  try {
    const { stdout } = await spawnWithTimeout('npx', ['license-checker', '--json'], repoPath, 15000);
    const result = JSON.parse(stdout);
    
    const licenses = Object.entries(result).map(([pkg, data]) => ({
      package: pkg,
      license: data.licenses || 'UNKNOWN',
      problematic: PROBLEMATIC_LICENSES.some(l => (data.licenses || '').includes(l)),
    }));
    
    return { licenses, warnings: [] };
  } catch (error) {
    return { licenses: [], warnings: ['license-checker not available'] };
  }
};

const runPipLicenses = async (repoPath) => {
  const requirementsPath = join(repoPath, 'requirements.txt');
  if (!existsSync(requirementsPath)) return { licenses: [], warnings: [] };

  try {
    const { stdout } = await spawnWithTimeout('pip-licenses', ['--format=json'], repoPath, 15000);
    const result = JSON.parse(stdout);
    
    const licenses = result.map(pkg => ({
      package: pkg.Name,
      license: pkg.License || 'UNKNOWN',
      problematic: PROBLEMATIC_LICENSES.some(l => (pkg.License || '').includes(l)),
    }));
    
    return { licenses, warnings: [] };
  } catch (error) {
    return { licenses: [], warnings: ['pip-licenses not available'] };
  }
};

const checkRepoLicense = async (repoPath) => {
  const licensePath = join(repoPath, 'LICENSE');
  if (existsSync(licensePath)) {
    try {
      const content = await readFile(licensePath, 'utf-8');
      const firstLine = content.split('\n')[0].toLowerCase();
      
      if (firstLine.includes('mit')) return 'MIT';
      if (firstLine.includes('apache')) return 'Apache-2.0';
      if (firstLine.includes('gpl')) return 'GPL';
      if (firstLine.includes('bsd')) return 'BSD';
      
      return 'Custom';
    } catch {
      return 'UNKNOWN';
    }
  }
  return 'No LICENSE file';
};

export const scanLicenses = async (repoPath, repoMetadata) => {
  const allLicenses = [];
  const warnings = [];

  // Check repository license
  const repoLicense = await checkRepoLicense(repoPath);

  // Node.js licenses
  if (repoMetadata.languages.includes('JavaScript') || repoMetadata.languages.includes('TypeScript')) {
    const { licenses, warnings: w } = await runLicenseChecker(repoPath);
    allLicenses.push(...licenses);
    warnings.push(...w);
  }

  // Python licenses
  if (repoMetadata.languages.includes('Python')) {
    const { licenses, warnings: w } = await runPipLicenses(repoPath);
    allLicenses.push(...licenses);
    warnings.push(...w);
  }

  const problematicCount = allLicenses.filter(l => l.problematic).length;

  return {
    licenses: allLicenses.slice(0, 50), // Limit to 50
    summary: {
      repoLicense,
      totalDependencies: allLicenses.length,
      problematicCount,
    },
    warnings: warnings.filter(w => w),
  };
};

// Made with Bob
