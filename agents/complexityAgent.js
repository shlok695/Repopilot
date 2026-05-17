import fs from 'fs';
import path from 'path';
import { spawnWithTimeout } from '../middleware/timeoutManager.js';

/**
 * Check if plato is available
 */
const isPlatoAvailable = async () => {
  try {
    const result = await spawnWithTimeout('npx', ['plato', '--version'], process.cwd(), 2000);
    return result.code === 0;
  } catch (error) {
    return false;
  }
};

/**
 * Run plato complexity analysis
 */
const runPlatoAnalysis = async (repoPath) => {
  const complexFiles = [];
  const warnings = [];

  try {
    const outputDir = path.join('/tmp', 'plato_report_' + Date.now());
    
    // Find source directories
    const srcDirs = [];
    if (fs.existsSync(path.join(repoPath, 'src'))) srcDirs.push('src');
    if (fs.existsSync(path.join(repoPath, 'lib'))) srcDirs.push('lib');
    if (fs.existsSync(path.join(repoPath, 'app'))) srcDirs.push('app');
    
    if (srcDirs.length === 0) {
      warnings.push('No src/lib/app directories found for plato analysis');
      return { complexFiles, warnings };
    }

    const result = await spawnWithTimeout(
      'npx',
      ['plato', '-r', '-d', outputDir, ...srcDirs],
      repoPath,
      30000
    );

    if (result.code === 0) {
      // Try to read plato's report.json
      const reportPath = path.join(outputDir, 'report.json');
      if (fs.existsSync(reportPath)) {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
        
        // Extract complexity metrics
        if (report.reports) {
          report.reports.forEach(fileReport => {
            const complexity = fileReport.complexity || {};
            const maintainability = fileReport.maintainability || 0;
            
            if (complexity.cyclomatic > 15 || maintainability < 65) {
              complexFiles.push({
                file: path.relative(repoPath, fileReport.path),
                lines: fileReport.sloc || 0,
                conditionals: complexity.cyclomatic || 0,
                maintainability: Math.round(maintainability),
                flag: complexity.cyclomatic > 15 ? 'High cyclomatic complexity' : 'Low maintainability',
              });
            }
          });
        }
        
        warnings.push(`Plato analyzed ${report.reports?.length || 0} files`);
      }

      // Cleanup
      try {
        fs.rmSync(outputDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    } else {
      warnings.push('Plato analysis failed, using fallback');
    }
  } catch (error) {
    warnings.push(`Plato analysis error: ${error.message}`);
  }

  return { complexFiles, warnings };
};

/**
 * Count conditionals in code
 */
const countConditionals = (content) => {
  // Count if, else, for, while, switch, case, catch, ternary
  const patterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\belse\b/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bswitch\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /\?\s*[^:]+\s*:/g, // ternary operator
  ];

  let count = 0;
  patterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      count += matches.length;
    }
  });

  return count;
};

/**
 * Fallback complexity analysis
 */
const runFallbackAnalysis = async (repoPath) => {
  const complexFiles = [];
  const warnings = [];
  const fileSizes = [];

  // File extensions to analyze
  const extensions = ['.js', '.ts', '.jsx', '.tsx', '.py'];

  // Walk directory
  const walkDir = (dir, fileList = []) => {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      // Skip node_modules, .git, dist, build directories
      if (stat.isDirectory()) {
        if (!['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__', 'venv', '.venv'].includes(file)) {
          walkDir(filePath, fileList);
        }
      } else {
        const ext = path.extname(file);
        if (extensions.includes(ext)) {
          fileList.push(filePath);
        }
      }
    });

    return fileList;
  };

  try {
    const files = walkDir(repoPath);
    let analyzedCount = 0;

    files.forEach(filePath => {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').length;
        const conditionals = countConditionals(content);
        const relativePath = path.relative(repoPath, filePath);

        fileSizes.push(lines);
        analyzedCount++;

        // Flag large files or high complexity
        const flags = [];
        if (lines > 300) {
          flags.push('Large file — consider splitting');
        }
        if (conditionals > 15) {
          flags.push('High cyclomatic complexity');
        }

        if (flags.length > 0) {
          complexFiles.push({
            file: relativePath,
            lines,
            conditionals,
            flag: flags.join(', '),
          });
        }
      } catch (error) {
        // Skip files that can't be read
      }
    });

    warnings.push(`Fallback analysis: ${analyzedCount} files analyzed`);

  } catch (error) {
    warnings.push(`Fallback analysis error: ${error.message}`);
  }

  return { complexFiles, fileSizes, warnings };
};

/**
 * Analyze code complexity
 */
export async function analyzeComplexity(repoPath, repoMetadata) {
  let complexFiles = [];
  const warnings = [];
  let fileSizes = [];
  const languages = repoMetadata.languages || repoMetadata.techStack || [];

  // Check if plato is available
  const hasPlato = await isPlatoAvailable();

  if (hasPlato && (languages.includes('JavaScript') || languages.includes('TypeScript'))) {
    warnings.push('Running plato complexity analysis...');
    const platoResult = await runPlatoAnalysis(repoPath);
    complexFiles.push(...platoResult.complexFiles);
    warnings.push(...platoResult.warnings);
  } else {
    if (!hasPlato) {
      warnings.push('Plato not available, using fallback analysis');
    }
  }

  // Always run fallback analysis for comprehensive coverage
  warnings.push('Running fallback complexity analysis...');
  const fallbackResult = await runFallbackAnalysis(repoPath);
  
  // Merge results, avoiding duplicates
  const existingFiles = new Set(complexFiles.map(f => f.file));
  fallbackResult.complexFiles.forEach(file => {
    if (!existingFiles.has(file.file)) {
      complexFiles.push(file);
    }
  });
  
  fileSizes = fallbackResult.fileSizes;
  warnings.push(...fallbackResult.warnings);

  // Sort by conditionals descending (complexity first), then by lines
  complexFiles.sort((a, b) => {
    if (b.conditionals !== a.conditionals) {
      return b.conditionals - a.conditionals;
    }
    return b.lines - a.lines;
  });

  // Calculate statistics
  const averageFileSize = fileSizes.length > 0
    ? Math.round(fileSizes.reduce((sum, size) => sum + size, 0) / fileSizes.length)
    : 0;

  const largestFile = complexFiles.length > 0
    ? complexFiles.reduce((max, file) => file.lines > max.lines ? file : max, complexFiles[0])
    : { file: 'N/A', lines: 0 };

  // Generate recommendations for large files
  const recommendations = [];
  complexFiles.forEach(file => {
    if (file.lines > 300) {
      recommendations.push(`Consider breaking ${file.file} (${file.lines} lines) into smaller modules`);
    }
  });

  // Add summary warnings
  if (complexFiles.length > 10) {
    warnings.push(`Found ${complexFiles.length} files with complexity issues`);
  }

  const veryLargeFiles = complexFiles.filter(f => f.lines > 500).length;
  if (veryLargeFiles > 0) {
    warnings.push(`${veryLargeFiles} files exceed 500 lines`);
  }

  const highComplexity = complexFiles.filter(f => f.conditionals > 25).length;
  if (highComplexity > 0) {
    warnings.push(`${highComplexity} files have very high cyclomatic complexity (>25)`);
  }

  return {
    complexFiles: complexFiles.slice(0, 50), // Limit to top 50
    averageFileSize,
    largestFile: { file: largestFile.file, lines: largestFile.lines },
    totalFilesAnalyzed: fileSizes.length,
    recommendations: recommendations.slice(0, 10), // Top 10 recommendations
    warnings,
  };
}

// Made with Bob
