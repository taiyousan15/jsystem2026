import type { AuthConfig, AuthResult, AuthLevel } from './types';
import { DEFAULT_CONFIG } from './types';
import { tryStorageState } from './strategies/level1-storage-state';
import { tryPersistentContext } from './strategies/level2-persistent-context';
import { tryPatchrightStealth } from './strategies/level3-patchright-stealth';
import { tryCDPConnection } from './strategies/level4-cdp-connection';
import { tryManualLogin } from './strategies/level5-manual-login';
import { saveSessionMeta, clearSession as clearSessionUtil } from './utils/session';
import type { ClearSessionOptions, ClearSessionResult } from './utils/session';
import { logBanner, logDivider, logInfo, logSuccess, logError, logWarn, getLevelName } from './utils/logger';

type StrategyFn = (config: AuthConfig) => Promise<AuthResult>;

const STRATEGIES: Record<AuthLevel, StrategyFn> = {
  1: tryStorageState,
  2: tryPersistentContext,
  3: tryPatchrightStealth,
  4: tryCDPConnection,
  5: tryManualLogin,
};

export class GoogleAuthManager {
  private config: AuthConfig;
  private lastResult: AuthResult | null = null;

  constructor(config: Partial<AuthConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async authenticate(): Promise<AuthResult> {
    logBanner('Google Auth Manager - 5-Layer Fallback System');

    const enabledLevels = this.config.enableLevels.sort((a, b) => a - b);

    for (const level of enabledLevels) {
      logDivider();
      logInfo(`Trying Level ${level}: ${getLevelName(level)}`, level);

      const strategy = STRATEGIES[level];
      const result = await strategy(this.config);

      if (result.success) {
        logDivider();
        logSuccess(`Authentication successful at Level ${level}: ${result.levelName}`, level);
        logInfo(`Total duration: ${result.duration}ms`, level);

        saveSessionMeta('./auth-state', {
          level,
          createdAt: new Date().toISOString(),
          lastVerified: new Date().toISOString(),
          storageStatePath: this.config.storageStatePath,
          profileDir: this.config.profileDir,
        });

        this.lastResult = result;
        return result;
      }

      logError(`Level ${level} failed: ${result.error}`, level);
    }

    logDivider();
    logError('All authentication levels exhausted', 5);

    const failResult: AuthResult = {
      success: false,
      level: 5,
      levelName: 'All Levels Failed',
      context: null,
      page: null,
      error: 'All authentication strategies failed',
      duration: 0,
    };
    this.lastResult = failResult;
    return failResult;
  }

  async authenticateAtLevel(level: AuthLevel): Promise<AuthResult> {
    logBanner(`Google Auth - Direct Level ${level}: ${getLevelName(level)}`);

    const strategy = STRATEGIES[level];
    const result = await strategy(this.config);

    if (result.success) {
      saveSessionMeta('./auth-state', {
        level,
        createdAt: new Date().toISOString(),
        lastVerified: new Date().toISOString(),
        storageStatePath: this.config.storageStatePath,
        profileDir: this.config.profileDir,
      });
    }

    this.lastResult = result;
    return result;
  }

  async verifySession(result: AuthResult): Promise<boolean> {
    if (!result.success || !result.page) return false;

    try {
      await result.page.goto('https://myaccount.google.com', {
        waitUntil: 'domcontentloaded',
        timeout: this.config.timeout,
      });

      const url = result.page.url();
      return !url.includes('ServiceLogin') && !url.includes('/v3/signin');
    } catch {
      return false;
    }
  }

  async navigateAuthenticated(result: AuthResult, targetUrl: string): Promise<boolean> {
    if (!result.success || !result.page) return false;

    try {
      await result.page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: this.config.timeout,
      });
      return true;
    } catch {
      return false;
    }
  }

  async cleanup(): Promise<void> {
    if (this.lastResult?.context) {
      try {
        await this.lastResult.context.close();
      } catch {
        /* ignore cleanup errors */
      }
    }
  }

  getLastResult(): AuthResult | null {
    return this.lastResult;
  }

  async clearSession(options: ClearSessionOptions = {}): Promise<ClearSessionResult> {
    logBanner('Google Auth - Session Clear');

    // ブラウザコンテキストが開いていれば先に閉じる
    await this.cleanup();

    const result = clearSessionUtil(
      this.config.storageStatePath,
      this.config.profileDir,
      './auth-state',
      options
    );

    if (result.storageStateCleared) {
      logSuccess('StorageState (Cookie JSON) を削除しました', 1);
    }
    if (result.profileCleared) {
      logSuccess('Chrome プロファイルを削除しました', 2);
    }
    if (result.sessionMetaCleared) {
      logSuccess('セッションメタデータを削除しました', 1);
    }
    for (const err of result.errors) {
      logWarn(err, 1);
    }

    if (result.errors.length === 0) {
      logSuccess('セッションクリア完了 - 次回認証時にゼロから開始します', 1);
    }

    return result;
  }

  getConfig(): AuthConfig {
    return { ...this.config };
  }
}
