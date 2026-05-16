import fs from 'fs';
import path from 'path';

/**
 * End-of-life packages and versions
 */
const EOL_PACKAGES = {
  // Node.js versions
  'node': ['10', '12', '14', '16'],
  
  // Python versions
  'python': ['2.7', '3.6', '3.7', '3.8'],
  
  // Popular packages with known EOL versions
  'angular': ['1.x', '2', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'],
  'react': ['15', '16.8'],
  'vue': ['1', '2'],
  'express': ['3'],
  'webpack': ['1', '2', '3'],
  'typescript': ['2', '3'],
  'eslint': ['6', '7'],
  'jest': ['26', '27'],
  'django': ['1', '2', '3.0', '3.1'],
  'flask': ['0'],
  'requests': ['1'],
  'numpy': ['1.19'],
  'pandas': ['0'],
  'tensorflow': ['1'],
  'pytorch': ['1.0', '1.1', '1.2', '1.3', '1.4', '1.5'],
};

/**
 * Common package aliases and duplicates
 */
const PACKAGE_ALIASES = {
  // Node.js
  'lodash': ['lodash-es', 'lodash.debounce', 'lodash.throttle'],
  'moment': ['moment-timezone'],
  'axios': ['node-fetch', 'got', 'request'],
  'uuid': ['nanoid', 'shortid'],
  
  // Python
  'pillow': ['pil'],
  'beautifulsoup4': ['beautifulsoup'],
  'python-dateutil': ['dateutil'],
  'pyyaml': ['yaml'],
};

/**
 * Check if a version string is unpinned (uses ^ or ~ or >= or *)
 */
const isUnpinned = (version) => {
  if (!version) return true;
  return version.includes('^') || 
         version.includes('~') || 
         version.includes('>=') || 
         version.includes('*') ||
         version.includes('>') ||
         version.includes('<');
};

/**
 * Check if a package version is end-of-life
 */
const isEndOfLife = (name, version) => {
  const cleanName = name.toLowerCase();
  const cleanVersion = version.replace(/[^0-9.]/g, '');
  
  if (!EOL_PACKAGES[cleanName]) return false;
  
  const eolVersions = EOL_PACKAGES[cleanName];
  
  // Check if version starts with any EOL version
  return eolVersions.some(eolVer => {
    if (eolVer.includes('x')) {
      // Handle 1.x format
      const prefix = eolVer.replace('.x', '');
      return cleanVersion.startsWith(prefix + '.');
    }
    return cleanVersion.startsWith(eolVer);
  });
};

/**
 * Detect duplicate packages
 */
const detectDuplicates = (allDeps) => {
  const duplicates = [];
  const packageNames = allDeps.map(d => d.name.toLowerCase());
  
  // Check for exact duplicates (same package listed multiple times)
  const nameCounts = {};
  packageNames.forEach(name => {
    nameCounts[name] = (nameCounts[name] || 0) + 1;
  });
  
  Object.entries(nameCounts).forEach(([name, count]) => {
    if (count > 1) {
      duplicates.push({
        type: 'exact',
        package: name,
        count,
        message: `Package "${name}" appears ${count} times`,
      });
    }
  });
  
  // Check for alias duplicates
  Object.entries(PACKAGE_ALIASES).forEach(([mainPkg, aliases]) => {
    const hasMain = packageNames.includes(mainPkg.toLowerCase());
    const foundAliases = aliases.filter(alias => 
      packageNames.includes(alias.toLowerCase())
    );
    
    if (hasMain && foundAliases.length > 0) {
      duplicates.push({
        type: 'alias',
        package: mainPkg,
        aliases: foundAliases,
        message: `Found "${mainPkg}" and similar packages: ${foundAliases.join(', ')}`,
      });
    } else if (foundAliases.length > 1) {
      duplicates.push({
        type: 'alias',
        package: aliases[0],
        aliases: foundAliases.slice(1),
        message: `Found multiple similar packages: ${foundAliases.join(', ')}`,
      });
    }
  });
  
  return duplicates;
};

/**
 * Parse Node.js dependencies from package.json
 */
const parseNodeDependencies = (repoPath) => {
  const production = [];
  const development = [];
  const warnings = [];

  try {
    const packageJsonPath = path.join(repoPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      warnings.push('No package.json found');
      return { production, development, warnings };
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    // Check Node.js version
    if (packageJson.engines && packageJson.engines.node) {
      const nodeVersion = packageJson.engines.node.replace(/[^0-9.]/g, '');
      if (isEndOfLife('node', nodeVersion)) {
        warnings.push(`Node.js version ${nodeVersion} is end-of-life`);
      }
    }

    // Parse production dependencies
    if (packageJson.dependencies) {
      Object.entries(packageJson.dependencies).forEach(([name, version]) => {
        const unpinned = isUnpinned(version);
        const eol = isEndOfLife(name, version);
        
        production.push({
          name,
          version,
          unpinned,
          eol,
          type: 'production',
        });
        
        if (eol) {
          warnings.push(`${name}@${version} is end-of-life`);
        }
      });
    }

    // Parse development dependencies
    if (packageJson.devDependencies) {
      Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
        const unpinned = isUnpinned(version);
        const eol = isEndOfLife(name, version);
        
        development.push({
          name,
          version,
          unpinned,
          eol,
          type: 'development',
        });
        
        if (eol) {
          warnings.push(`${name}@${version} (dev) is end-of-life`);
        }
      });
    }

    // Check for peer dependencies (informational)
    if (packageJson.peerDependencies) {
      const peerCount = Object.keys(packageJson.peerDependencies).length;
      warnings.push(`Found ${peerCount} peer dependencies`);
    }

  } catch (error) {
    warnings.push(`Failed to parse package.json: ${error.message}`);
  }

  return { production, development, warnings };
};

/**
 * Parse Python dependencies from requirements.txt
 */
const parsePythonDependencies = (repoPath) => {
  const python = [];
  const warnings = [];

  try {
    const requirementsPath = path.join(repoPath, 'requirements.txt');
    
    if (!fs.existsSync(requirementsPath)) {
      // Try alternative locations
      const altPaths = [
        path.join(repoPath, 'requirements', 'base.txt'),
        path.join(repoPath, 'requirements', 'production.txt'),
        path.join(repoPath, 'requirements', 'requirements.txt'),
      ];
      
      let found = false;
      for (const altPath of altPaths) {
        if (fs.existsSync(altPath)) {
          warnings.push(`Using requirements file: ${path.relative(repoPath, altPath)}`);
          return parsePythonRequirementsFile(altPath, warnings);
        }
      }
      
      if (!found) {
        warnings.push('No requirements.txt found');
        return { python, warnings };
      }
    }

    return parsePythonRequirementsFile(requirementsPath, warnings);

  } catch (error) {
    warnings.push(`Failed to parse requirements.txt: ${error.message}`);
  }

  return { python, warnings };
};

/**
 * Parse a Python requirements file
 */
const parsePythonRequirementsFile = (filePath, warnings) => {
  const python = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Skip comments and empty lines
      line = line.trim();
      if (!line || line.startsWith('#')) return;

      // Skip -r or -e directives
      if (line.startsWith('-r') || line.startsWith('-e') || line.startsWith('--')) {
        return;
      }

      // Parse package name and version
      let name = '';
      let version = '';
      let unpinned = true;

      // Handle different formats: package==1.0.0, package>=1.0.0, package~=1.0.0, package
      if (line.includes('==')) {
        [name, version] = line.split('==').map(s => s.trim());
        unpinned = false; // Exact version is pinned
      } else if (line.includes('>=')) {
        [name, version] = line.split('>=').map(s => s.trim());
        unpinned = true;
      } else if (line.includes('~=')) {
        [name, version] = line.split('~=').map(s => s.trim());
        unpinned = true;
      } else if (line.includes('<=')) {
        [name, version] = line.split('<=').map(s => s.trim());
        unpinned = true;
      } else if (line.includes('>')) {
        [name, version] = line.split('>').map(s => s.trim());
        unpinned = true;
      } else if (line.includes('<')) {
        [name, version] = line.split('<').map(s => s.trim());
        unpinned = true;
      } else {
        // No version specified
        name = line;
        version = 'not specified';
        unpinned = true;
      }

      // Remove any extras like [dev] or comments
      name = name.split('[')[0].split('#')[0].trim();
      version = version.split('#')[0].trim();

      if (name) {
        const eol = isEndOfLife(name, version);
        
        python.push({
          name,
          version: version || 'not specified',
          unpinned,
          eol,
          type: 'python',
        });
        
        if (eol) {
          warnings.push(`${name}==${version} is end-of-life`);
        }
      }
    });

  } catch (error) {
    warnings.push(`Failed to read requirements file: ${error.message}`);
  }

  return { python, warnings };
};

/**
 * Inventory all dependencies in the repository
 */
export async function inventoryDependencies(repoPath, repoMetadata) {
  const warnings = [];

  // Parse Node.js dependencies
  const nodeResult = parseNodeDependencies(repoPath);
  const production = nodeResult.production;
  const development = nodeResult.development;
  warnings.push(...nodeResult.warnings);

  // Parse Python dependencies
  const pythonResult = parsePythonDependencies(repoPath);
  const python = pythonResult.python;
  warnings.push(...pythonResult.warnings);

  // Combine all dependencies
  const allDeps = [...production, ...development, ...python];

  // Calculate totals
  const totalCount = allDeps.length;
  const unpinnedCount = allDeps.filter(d => d.unpinned).length;
  const eolCount = allDeps.filter(d => d.eol).length;

  // Detect duplicates
  const duplicates = detectDuplicates(allDeps);
  
  if (duplicates.length > 0) {
    duplicates.forEach(dup => {
      warnings.push(dup.message);
    });
  }

  // Add summary warnings
  if (unpinnedCount > 0) {
    warnings.push(`Found ${unpinnedCount} unpinned dependencies (using ^, ~, >=, or no version)`);
  }

  if (eolCount > 0) {
    warnings.push(`Found ${eolCount} end-of-life dependencies`);
  }

  if (totalCount === 0) {
    warnings.push('No dependencies found in package.json or requirements.txt');
  }

  // Check for security concerns
  const hasOldDeps = production.some(d => {
    const version = d.version.replace(/[^0-9.]/g, '');
    const major = parseInt(version.split('.')[0]);
    return !isNaN(major) && major === 0; // 0.x.x versions
  });

  if (hasOldDeps) {
    warnings.push('Some dependencies are using 0.x.x versions (pre-release)');
  }

  return {
    production,
    development,
    python,
    totalCount,
    unpinnedCount,
    eolCount,
    duplicates,
    warnings,
  };
}

// Made with Bob
