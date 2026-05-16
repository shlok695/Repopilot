export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  SCAN_TIMEOUT_MS: parseInt(process.env.SCAN_TIMEOUT_MS || '90000', 10),
  AGENT_TIMEOUT_MS: parseInt(process.env.AGENT_TIMEOUT_MS || '30000', 10),
  TMP_DIR: process.env.TMP_DIR || '/tmp/repopilot',
};

export const validateConfig = () => {
  console.log('\n=== Middleware Configuration ===');
  console.log(`NODE_ENV: ${config.NODE_ENV}`);
  console.log(`SCAN_TIMEOUT_MS: ${config.SCAN_TIMEOUT_MS}`);
  console.log(`AGENT_TIMEOUT_MS: ${config.AGENT_TIMEOUT_MS}`);
  console.log(`TMP_DIR: ${config.TMP_DIR}`);
  console.log('================================\n');
};

// Made with Bob
