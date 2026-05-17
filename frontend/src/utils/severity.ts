/**
 * Severity normalization utility
 * Supports both uppercase ('HIGH', 'MEDIUM', 'LOW', 'INFO') 
 * and capitalized ('Critical', 'High', 'Medium', 'Low') formats
 */

export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
export type SeverityLevelUppercase = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type AnySeverity = SeverityLevel | SeverityLevelUppercase;

/**
 * Normalize severity to capitalized format
 */
export function normalizeSeverity(severity: AnySeverity): SeverityLevel {
  const upperSeverity = severity.toUpperCase();
  
  switch (upperSeverity) {
    case 'CRITICAL':
      return 'Critical';
    case 'HIGH':
      return 'High';
    case 'MEDIUM':
      return 'Medium';
    case 'LOW':
      return 'Low';
    case 'INFO':
      return 'Info';
    default:
      return 'Low'; // Default fallback
  }
}

/**
 * Get Tailwind CSS classes for severity badges
 */
export function getSeverityColor(severity: AnySeverity): string {
  const normalized = normalizeSeverity(severity);
  
  switch (normalized) {
    case 'Critical':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'High':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'Medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'Low':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'Info':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

/**
 * Get severity order for sorting (lower number = higher priority)
 */
export function getSeverityOrder(severity: AnySeverity): number {
  const normalized = normalizeSeverity(severity);
  
  switch (normalized) {
    case 'Critical':
      return 0;
    case 'High':
      return 1;
    case 'Medium':
      return 2;
    case 'Low':
      return 3;
    case 'Info':
      return 4;
    default:
      return 5;
  }
}

// Made with Bob