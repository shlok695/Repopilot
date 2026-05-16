export interface RepoMetadata {
  name: string;
  languages: string[];
  frameworks: string[];
  hasDocker: boolean;
  hasTests: boolean;
  fileCount: number;
  totalLines: number;
}

export interface Vulnerability {
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  tool: string;
  file: string;
  issue: string;
  recommendation: string;
}

export interface Bug {
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  tool: string;
  file: string;
  issue: string;
  recommendation: string;
}

export interface Readme {
  title: string;
  content: string;
}

export interface ScanResult {
  scanId: string;
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  repoMetadata: RepoMetadata;
  readme: Readme;
  vulnerabilities: Vulnerability[];
  bugs: Bug[];
  suggestedFixes: string[];
  warnings: string[];
  timestamp: string;
  error?: string;
}

export interface ScanPayload {
  type: 'github' | 'zip';
  repoUrl?: string;
  file?: File;
}

export interface ScanSummary {
  scanId: string;
  repoName: string;
  timestamp: string;
  status: string;
  vulnerabilityCount: number;
  bugCount: number;
}

// Made with Bob
