// TypeScript interfaces for RepoPilot scan operations

export interface ScanRequest {
  type: 'github' | 'zip';
  repoUrl?: string;
  file?: Express.Multer.File;
}

export interface RepoMetadata {
  name: string;
  languages: string[];
  frameworks: string[];
  hasDocker: boolean;
  hasTests: boolean;
  fileCount: number;
  totalLines: number;
}

export interface ReadmeContent {
  title: string;
  content: string;
}

export interface Vulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  file?: string;
  line?: number;
  cwe?: string;
  recommendation?: string;
}

export interface Bug {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  file: string;
  line: number;
  category: string;
  recommendation?: string;
}

export interface SuggestedFix {
  id: string;
  type: 'vulnerability' | 'bug' | 'improvement';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  relatedIssues: string[];
}

export interface ScanResult {
  scanId: string;
  status: 'processing' | 'completed' | 'failed';
  timestamp: string;
  repoMetadata: RepoMetadata;
  readme: ReadmeContent;
  vulnerabilities: Vulnerability[];
  bugs: Bug[];
  suggestedFixes: SuggestedFix[];
  warnings: string[];
  reportMarkdown?: string;
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