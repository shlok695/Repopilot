import { AnySeverity } from '../utils/severity';

export interface RepoMetadata {
  name: string;
  languages: string[];
  frameworks: string[];
  hasDocker: boolean;
  hasTests: boolean;
  fileCount: number;
  totalLines: number;
  packageManager?: string;
}

export interface Vulnerability {
  severity: AnySeverity;
  tool: string;
  file: string;
  issue: string;
  recommendation: string;
}

export interface Bug {
  severity: AnySeverity;
  tool: string;
  file: string;
  issue: string;
  recommendation: string;
}

export interface ReadmeFeedback {
  score: number;
  strengths: string[];
  improvements: string[];
}

export interface Readme {
  title: string;
  content: string;
}

export interface SuggestedFix {
  title: string;
  description: string;
  file?: string;
  id?: string;
  type?: 'vulnerability' | 'bug' | 'improvement';
  priority?: 'high' | 'medium' | 'low';
  effort?: 'low' | 'medium' | 'high';
  relatedIssues?: string[];
}

export interface ScanResult {
  scanId: string;
  status: 'pending' | 'processing' | 'scanning' | 'completed' | 'failed';
  repoMetadata: RepoMetadata;
  readme: Readme;
  readmeFeedback?: ReadmeFeedback;
  vulnerabilities: Vulnerability[];
  bugs: Bug[];
  suggestedFixes: SuggestedFix[];
  warnings: string[];
  fullReport?: string;
  reportMarkdown?: string;
  timestamp: string;
  createdAt?: string;
  completedAt?: string;
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
