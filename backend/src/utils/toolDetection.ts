import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ToolInfo {
  available: boolean;
  version: string | null;
  lastChecked: number;
}

// In-memory cache for tool detection
const toolCache: Map<string, ToolInfo> = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds

/**
 * Check if a tool is available and get its version
 * Results are cached for 60 seconds
 */
export const checkTool = async (toolName: string): Promise<ToolInfo> => {
  const now = Date.now();
  
  // Check cache
  const cached = toolCache.get(toolName);
  if (cached && (now - cached.lastChecked) < CACHE_TTL) {
    return cached;
  }
  
  // Check tool availability
  try {
    await execAsync(`which ${toolName}`);
    
    // Tool is available, try to get version
    const version = await getToolVersion(toolName);
    
    const toolInfo: ToolInfo = {
      available: true,
      version,
      lastChecked: now,
    };
    
    toolCache.set(toolName, toolInfo);
    return toolInfo;
  } catch (error) {
    // Tool not available
    const toolInfo: ToolInfo = {
      available: false,
      version: null,
      lastChecked: now,
    };
    
    toolCache.set(toolName, toolInfo);
    return toolInfo;
  }
};

/**
 * Get version string for a tool
 */
const getToolVersion = async (toolName: string): Promise<string | null> => {
  try {
    let versionCommand = `${toolName} --version`;
    
    // Special cases for different tools
    if (toolName === 'pip-audit') {
      versionCommand = 'pip-audit --version';
    }
    
    const { stdout } = await execAsync(versionCommand);
    return parseVersion(toolName, stdout);
  } catch (error) {
    return null;
  }
};

/**
 * Parse version string from tool output
 */
const parseVersion = (_toolName: string, output: string): string | null => {
  try {
    const lines = output.trim().split('\n');
    const firstLine = lines[0];
    
    // Common patterns for version strings
    const patterns = [
      /version\s+(\d+\.\d+\.\d+)/i,           // "version 2.43.0"
      /v?(\d+\.\d+\.\d+)/,                     // "2.43.0" or "v2.43.0"
      /(\d+\.\d+\.\d+)/,                       // Just the version number
    ];
    
    for (const pattern of patterns) {
      const match = firstLine.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // If no pattern matches, return the first line (truncated)
    return firstLine.substring(0, 50);
  } catch (error) {
    return null;
  }
};

/**
 * Check multiple tools at once
 */
export const checkTools = async (toolNames: string[]): Promise<Record<string, ToolInfo>> => {
  const results = await Promise.all(
    toolNames.map(async (name) => ({
      name,
      info: await checkTool(name),
    }))
  );
  
  return results.reduce((acc, { name, info }) => {
    acc[name] = info;
    return acc;
  }, {} as Record<string, ToolInfo>);
};

/**
 * Clear the tool cache (useful for testing)
 */
export const clearToolCache = (): void => {
  toolCache.clear();
};

/**
 * Get disk space information for a path
 */
export const getDiskSpace = async (path: string = '/tmp'): Promise<number | null> => {
  try {
    const { stdout } = await execAsync(`df -BG ${path} | tail -1 | awk '{print $4}'`);
    const match = stdout.trim().match(/(\d+)G/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return null;
  } catch (error) {
    console.error('Failed to get disk space:', error);
    return null;
  }
};

/**
 * Count active scans (subdirectories in repos folder)
 */
export const countActiveScans = async (reposDir: string): Promise<number> => {
  try {
    const { stdout } = await execAsync(`find ${reposDir} -mindepth 1 -maxdepth 1 -type d | wc -l`);
    return parseInt(stdout.trim(), 10) || 0;
  } catch (error) {
    // Directory might not exist or be empty
    return 0;
  }
};

// Made with Bob