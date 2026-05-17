import { spawnWithTimeout } from '../middleware/timeoutManager.js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * License compatibility matrix
 */
const LICENSE_COMPATIBILITY = {
  'MIT': {
    commercial: 'safe',
    description: 'Permissive license - safe for commercial use',
    risk: 'low',
  },
  'Apache-2.0': {
    commercial: 'safe',
    description: 'Permissive license with patent grant - safe for commercial use',
    risk: 'low',
  },
  'BSD': {
    commercial: 'safe',
    description: 'Permissive license - safe for commercial use',
    risk: 'low',
  },
  'ISC': {
    commercial: 'safe',
    description: 'Permissive license similar to MIT - safe for commercial use',
    risk: 'low',
  },
  'Unlicense': {
    commercial: 'safe',
    description: 'Public domain - safe for commercial use',
    risk: 'low',
  },
  'CC0-1.0': {
    commercial: 'safe',
    description: 'Public domain dedication - safe for commercial use',
    risk: 'low',
  },
  'GPL': {
    commercial: 'caution',
    description: 'Copyleft license - requires derivative works to be GPL. Use with caution in commercial projects.',
    risk: 'high',
  },
  'GPL-2.0': {
    commercial: 'caution',
    description: 'Copyleft license - requires derivative works to be GPL. Use with caution in commercial projects.',
    risk: 'high',
  },
  'GPL-3.0': {
    commercial: 'caution',
    description: 'Copyleft license - requires derivative works to be GPL. Use with caution in commercial projects.',
    risk: 'high',
  },
  'AGPL': {
    commercial: 'caution',
    description: 'Strong copyleft license - requires source disclosure even for network use. Avoid in commercial SaaS.',
    risk: 'critical',
  },
  'AGPL-3.0': {
    commercial: 'caution',
    description: 'Strong copyleft license - requires source disclosure even for network use. Avoid in commercial SaaS.',
    risk: 'critical',
  },
  'LGPL': {
    commercial: 'review',
    description: 'Lesser GPL - allows linking but modifications must be LGPL. Review usage carefully.',
    risk: 'medium',
  },
  'MPL-2.0': {
    commercial: 'review',
    description: 'Weak copyleft - file-level copyleft. Review usage carefully.',
    risk: 'medium',
  },
  'UNKNOWN': {
    commercial: 'review',
    description: 'License not identified - review manually before use',
    risk: 'high',
  },
  'UNLICENSED': {
    commercial: 'avoid',
    description: 'No license - all rights reserved. Cannot be used without permission.',
    risk: 'critical',
  },
};

const PROBLEMATIC_LICENSES = ['GPL', 'AGPL', 'UNKNOWN', 'UNLICENSED'];

/**
 * Get license compatibility info
 */
const getLicenseInfo = (licenseName) => {
  // Normalize license name
  const normalized = licenseName.toUpperCase().trim();
  
  // Check exact matches first
  for (const [key, info] of Object.entries(LICENSE_COMPATIBILITY)) {
    if (normalized === key.toUpperCase()) {
      return { name: key, ...info };
    }
  }

  // Then check broader matches, longest names first so AGPL does not get
  // classified as GPL just because it contains the substring.
  const sortedLicenses = Object.entries(LICENSE_COMPATIBILITY)
    .sort(([a], [b]) => b.length - a.length);
  for (const [key, info] of sortedLicenses) {
    if (normalized.includes(key.toUpperCase())) {
      return { name: key, ...info };
    }
  }
  
  // Default for unknown licenses
  return {
    name: licenseName,
    commercial: 'review',
    description: 'Unknown license - review manually',
    risk: 'medium',
  };
};

/**
 * Run license-checker for Node.js dependencies
 */
const runLicenseChecker = async (repoPath) => {
  const packageJsonPath = join(repoPath, 'package.json');
  if (!existsSync(packageJsonPath)) return { licenses: [], warnings: [] };

  try {
    const { stdout } = await spawnWithTimeout('npx', ['license-checker', '--json'], repoPath, 15000);
    const result = JSON.parse(stdout);
    
    const licenses = Object.entries(result).map(([pkg, data]) => {
      const licenseName = data.licenses || 'UNKNOWN';
      const licenseInfo = getLicenseInfo(licenseName);
      
      return {
        package: pkg,
        license: licenseName,
        problematic: PROBLEMATIC_LICENSES.some(l => licenseName.includes(l)),
        commercial: licenseInfo.commercial,
        risk: licenseInfo.risk,
      };
    });
    
    return { licenses, warnings: [] };
  } catch (error) {
    return { licenses: [], warnings: ['license-checker not available'] };
  }
};

/**
 * Run pip-licenses for Python dependencies
 */
const runPipLicenses = async (repoPath) => {
  const requirementsPath = join(repoPath, 'requirements.txt');
  if (!existsSync(requirementsPath)) return { licenses: [], warnings: [] };

  try {
    const { stdout } = await spawnWithTimeout('pip-licenses', ['--format=json'], repoPath, 15000);
    const result = JSON.parse(stdout);
    
    const licenses = result.map(pkg => {
      const licenseName = pkg.License || 'UNKNOWN';
      const licenseInfo = getLicenseInfo(licenseName);
      
      return {
        package: pkg.Name,
        license: licenseName,
        problematic: PROBLEMATIC_LICENSES.some(l => licenseName.includes(l)),
        commercial: licenseInfo.commercial,
        risk: licenseInfo.risk,
      };
    });
    
    return { licenses, warnings: [] };
  } catch (error) {
    return { licenses: [], warnings: ['pip-licenses not available'] };
  }
};

/**
 * Check repository's own license
 */
const checkRepoLicense = async (repoPath) => {
  const possiblePaths = [
    'LICENSE',
    'LICENSE.md',
    'LICENSE.txt',
    'LICENCE',
    'LICENCE.md',
    'COPYING',
  ];
  
  for (const filename of possiblePaths) {
    const licensePath = join(repoPath, filename);
    if (existsSync(licensePath)) {
      try {
        const content = await readFile(licensePath, 'utf-8');
        const lowerContent = content.toLowerCase();
        
        // Check for common licenses
        if (lowerContent.includes('mit license')) return { type: 'MIT', file: filename, content: content.substring(0, 500) };
        if (lowerContent.includes('apache license')) return { type: 'Apache-2.0', file: filename, content: content.substring(0, 500) };
        if (lowerContent.includes('gnu general public license')) {
          if (lowerContent.includes('version 3')) return { type: 'GPL-3.0', file: filename, content: content.substring(0, 500) };
          if (lowerContent.includes('version 2')) return { type: 'GPL-2.0', file: filename, content: content.substring(0, 500) };
          return { type: 'GPL', file: filename, content: content.substring(0, 500) };
        }
        if (lowerContent.includes('gnu affero general public license')) return { type: 'AGPL-3.0', file: filename, content: content.substring(0, 500) };
        if (lowerContent.includes('bsd license')) return { type: 'BSD', file: filename, content: content.substring(0, 500) };
        if (lowerContent.includes('isc license')) return { type: 'ISC', file: filename, content: content.substring(0, 500) };
        if (lowerContent.includes('mozilla public license')) return { type: 'MPL-2.0', file: filename, content: content.substring(0, 500) };
        
        return { type: 'Custom', file: filename, content: content.substring(0, 500) };
      } catch {
        return { type: 'UNKNOWN', file: filename, content: null };
      }
    }
  }
  
  return { type: 'No LICENSE file', file: null, content: null };
};

/**
 * Scan licenses in repository
 */
export const scanLicenses = async (repoPath, repoMetadata) => {
  const allLicenses = [];
  const warnings = [];

  // Check repository's own license
  const repoLicense = await checkRepoLicense(repoPath);
  const repoLicenseInfo = getLicenseInfo(repoLicense.type);

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

  // Count by risk level
  const criticalCount = allLicenses.filter(l => l.risk === 'critical').length;
  const highCount = allLicenses.filter(l => l.risk === 'high').length;
  const mediumCount = allLicenses.filter(l => l.risk === 'medium').length;
  const lowCount = allLicenses.filter(l => l.risk === 'low').length;

  // Group licenses by type
  const licenseGroups = {};
  allLicenses.forEach(l => {
    if (!licenseGroups[l.license]) {
      licenseGroups[l.license] = [];
    }
    licenseGroups[l.license].push(l.package);
  });

  // Add warnings for problematic licenses
  if (criticalCount > 0) {
    warnings.push(`Found ${criticalCount} dependencies with CRITICAL risk licenses (AGPL, UNLICENSED)`);
  }
  if (highCount > 0) {
    warnings.push(`Found ${highCount} dependencies with HIGH risk licenses (GPL, UNKNOWN)`);
  }

  return {
    licenses: allLicenses.slice(0, 100), // Limit to 100
    repoLicense: {
      type: repoLicense.type,
      file: repoLicense.file,
      content: repoLicense.content,
      commercial: repoLicenseInfo.commercial,
      description: repoLicenseInfo.description,
      risk: repoLicenseInfo.risk,
    },
    summary: {
      totalDependencies: allLicenses.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      licenseGroups,
    },
    compatibilityMatrix: LICENSE_COMPATIBILITY,
    warnings: warnings.filter(w => w),
  };
};

// Made with Bob
