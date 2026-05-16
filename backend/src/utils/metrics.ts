/**
 * Metrics tracking for the application
 * Tracks total scans, active scans, and uptime
 */

const startTime = Date.now();
let totalScans = 0;
let activeScans = 0;

/**
 * Increment total scans counter
 */
export const incrementTotalScans = (): void => {
  totalScans++;
};

/**
 * Increment active scans counter
 */
export const incrementActiveScans = (): void => {
  activeScans++;
};

/**
 * Decrement active scans counter
 */
export const decrementActiveScans = (): void => {
  if (activeScans > 0) {
    activeScans--;
  }
};

/**
 * Get current metrics
 */
export const getMetrics = () => {
  return {
    totalScans,
    activeScans,
    uptime: Math.floor((Date.now() - startTime) / 1000), // uptime in seconds
  };
};

/**
 * Reset metrics (for testing)
 */
export const resetMetrics = (): void => {
  totalScans = 0;
  activeScans = 0;
};

// Made with Bob