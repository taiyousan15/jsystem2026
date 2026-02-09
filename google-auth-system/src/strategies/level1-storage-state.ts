import { chromium } from 'playwright';
import type { BrowserContext } from 'playwright';
import type { AuthConfig, AuthResult } from '../types';
import { isStorageStateValid } from '../utils/session';
import { logSuccess, logError, logInfo } from '../utils/logger';

export async function tryStorageState(config: AuthConfig): Promise<AuthResult> {
  const start = Date.now();
  const level = 1 as const;

  logInfo('Checking saved storageState...', level);

  if (!isStorageStateValid(config.storageStatePath)) {
    logError('StorageState file is missing or expired', level);
    return {
      success: false,
      level,
      levelName: 'StorageState',
      context: null,
      page: null,
      error: 'StorageState not found or expired',
      duration: Date.now() - start,
    };
  }

  let context: BrowserContext | null = null;
  try {
    const browser = await chromium.launch({
      headless: config.headless,
      channel: 'chrome',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

    context = await browser.newContext({
      storageState: config.storageStatePath,
      viewport: config.viewport,
      locale: config.locale,
      timezoneId: config.timezoneId,
      userAgent: config.userAgent,
    });

    const page = await context.newPage();
    await page.goto('https://myaccount.google.com', {
      waitUntil: 'domcontentloaded',
      timeout: config.timeout,
    });

    const isLoggedIn = await page.evaluate(() => {
      return !document.querySelector('a[href*="accounts.google.com/ServiceLogin"]');
    });

    if (!isLoggedIn) {
      logError('StorageState session has expired', level);
      await context.close();
      await browser.close();
      return {
        success: false,
        level,
        levelName: 'StorageState',
        context: null,
        page: null,
        error: 'Session expired - login required',
        duration: Date.now() - start,
      };
    }

    logSuccess('Successfully restored session from storageState', level);
    return {
      success: true,
      level,
      levelName: 'StorageState',
      context,
      page,
      duration: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(`StorageState failed: ${message}`, level);
    if (context) {
      try { await context.close(); } catch { /* ignore */ }
    }
    return {
      success: false,
      level,
      levelName: 'StorageState',
      context: null,
      page: null,
      error: message,
      duration: Date.now() - start,
    };
  }
}
