export const generateScanId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `scan_${timestamp}_${random}`;
};

// Made with Bob
