import { cpSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const distDir = join(process.cwd(), 'dist');
const assetsDir = join(distDir, 'assets');
const repopilotDir = join(distDir, 'repopilot');
const repopilotAssetsDir = join(repopilotDir, 'assets');

if (existsSync(assetsDir)) {
  mkdirSync(repopilotDir, { recursive: true });
  cpSync(assetsDir, repopilotAssetsDir, { recursive: true });
}
