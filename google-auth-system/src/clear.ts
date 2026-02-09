import { GoogleAuthManager } from './auth-manager';
import { logBanner, logInfo } from './utils/logger';

async function clear(): Promise<void> {
  logBanner('Google Auth System - Session Clear');

  const args = process.argv.slice(2);
  const options: { storageState?: boolean; profile?: boolean; sessionMeta?: boolean } = {};

  if (args.includes('--storage-state')) options.storageState = true;
  if (args.includes('--profile')) options.profile = true;
  if (args.includes('--meta')) options.sessionMeta = true;

  const hasSpecific = options.storageState || options.profile || options.sessionMeta;

  if (!hasSpecific) {
    logInfo('Clearing ALL session data...');
  }

  const manager = new GoogleAuthManager();
  const result = await manager.clearSession(hasSpecific ? options : {});

  if (result.errors.length > 0) {
    process.exit(1);
  }
}

clear().catch((err) => {
  process.stderr.write(`Clear error: ${err}\n`);
  process.exit(1);
});
