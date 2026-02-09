export { GoogleAuthManager } from './auth-manager';
export type {
  AuthConfig,
  AuthResult,
  AuthLevel,
  SessionHealth,
  TestResult,
  TestSiteConfig,
} from './types';
export { DEFAULT_CONFIG } from './types';
export { tryStorageState } from './strategies/level1-storage-state';
export { tryPersistentContext } from './strategies/level2-persistent-context';
export { tryPatchrightStealth } from './strategies/level3-patchright-stealth';
export { tryCDPConnection } from './strategies/level4-cdp-connection';
export { tryManualLogin } from './strategies/level5-manual-login';
export { clearSession } from './utils/session';
export type { ClearSessionOptions, ClearSessionResult } from './utils/session';
