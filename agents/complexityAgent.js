import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';

const analyzeFileComplexity = async (filePath) => {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const lineCount = lines.length;
    
    // Count conditionals (if, else, for, while, switch, case, ?, &&, ||)
    const conditionals = (content.match(/\b(if|else|for|while|switch|case)\b|\?|&&|\|\|/g) || []).length;
    
    // Count functions
    const functions = (content.match(/function\s+\w+|=>\s*{|def\s+\w+/g) || []).length;
    
    return {
      file: filePath,
      lines: lineCount,
      conditionals,
      functions,
      complexity: conditionals + functions,
    };
  } catch {
    return null;
  }
};

export const analyzeComplexity = async (repoPath, repoMetadata) => {
  const complexFiles = [];
  let totalLines = 0;
  let fileCount = 0;
  let largestFile = { file: '', lines: 0 };

  const scanDir = async (dir) => {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (
          entry.name.endsWith('.js') ||
          entry.name.endsWith('.ts') ||
          entry.name.endsWith('.jsx') ||
          entry.name.endsWith('.tsx') ||
          entry.name.endsWith('.py')
        ) {
          const analysis = await analyzeFileComplexity(fullPath);
          if (analysis) {
            fileCount++;
            totalLines += analysis.lines;
            
            if (analysis.lines > largestFile.lines) {
              largestFile = { file: analysis.file.replace(repoPath, ''), lines: analysis.lines };
            }
            
            // Flag files with high complexity
            if (analysis.lines > 300 || analysis.conditionals > 15) {
              complexFiles.push({
                file: analysis.file.replace(repoPath, ''),
                lines: analysis.lines,
                conditionals: analysis.conditionals,
                reason: analysis.lines > 300 ? 'Large file (>300 lines)' : 'High conditional complexity (>15)',
              });
            }
          }
        }
      }
    } catch {
      // Ignore directory errors
    }
  };

  await scanDir(repoPath);

  return {
    complexFiles: complexFiles.slice(0, 20), // Limit to 20
    averageFileSize: fileCount > 0 ? Math.round(totalLines / fileCount) : 0,
    largestFile,
  };
};

// Made with Bob
