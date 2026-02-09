import { GoogleAuthManager } from './auth-manager';
import { logBanner, logInfo, logSuccess } from './utils/logger';

async function setup(): Promise<void> {
  logBanner('Google Auth System - Initial Setup');
  logInfo('This will open Chrome for you to log in manually.');
  logInfo('After login, the session will be saved for future automated use.');
  logInfo('');

  const manager = new GoogleAuthManager({
    headless: false,
    enableLevels: [5],
  });

  const result = await manager.authenticateAtLevel(5);

  if (result.success) {
    logSuccess('Setup complete! Session saved.', 5);
    logInfo('You can now use the auth system in automated mode.', 5);
    logInfo('Run: npm test to verify all levels', 5);
  } else {
    process.stderr.write('Setup failed. Please try again.\n');
  }

  await manager.cleanup();
  process.exit(result.success ? 0 : 1);
}

setup().catch((err) => {
  process.stderr.write(`Setup error: ${err}\n`);
  process.exit(1);
});
