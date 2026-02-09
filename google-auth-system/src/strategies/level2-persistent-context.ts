import { chromium } from 'playwright';
import * as fs from 'fs';
import type { AuthConfig, AuthResult } from '../types';
import { isProfileValid } from '../utils/session';
import { logSuccess, logError, logInfo, logWarn } from '../utils/logger';

export async function tryPersistentContext(config: AuthConfig): Promise<AuthResult> {
  const start = Date.now();
  const level = 2 as const;

  logInfo('Launching Persistent Context with Real Chrome...', level);

  fs.mkdirSync(config.profileDir, { recursive: true });

  const hasExistingProfile = isProfileValid(config.profileDir);
  if (hasExistingProfile) {
    logInfo('Existing profile found, attempting session reuse', level);
  } else {
    logWarn('No existing profile, fresh launch', level);
  }

  try {
    const context = await chromium.launchPersistentContext(config.profileDir, {
      headless: false,
      channel: 'chrome',
      ignoreDefaultArgs: ['--enable-automation'],
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-infobars',
        '--disable-extensions',
        '--disable-popup-blocking',
      ],
      viewport: config.viewport,
      locale: config.locale,
      timezoneId: config.timezoneId,
      userAgent: config.userAgent,
      bypassCSP: true,
    });

    const page = context.pages()[0] || await context.newPage();

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['ja-JP', 'ja', 'en-US', 'en'],
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).chrome = { runtime: {} };
    });

    await page.goto('https://myaccount.google.com', {
      waitUntil: 'domcontentloaded',
      timeout: config.timeout,
    });

    // Wait for potential redirects to complete
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const loginPatterns = [
      'accounts.google.com/ServiceLogin',
      'accounts.google.com/v3/signin',
      'accounts.google.com/signin',
      'accounts.google.com/o/oauth2',
      'accounts.google.com/AccountChooser',
      'accounts.google.com/InteractiveLogin',
    ];
    const isOnLoginPage = loginPatterns.some((p) => currentUrl.includes(p));
    const isOnMyAccount = currentUrl.includes('myaccount.google.com');
    const isLoggedIn = !isOnLoginPage && isOnMyAccount;

    if (isLoggedIn) {
      logSuccess('Already logged in via persistent profile', level);

      await context.storageState({ path: config.storageStatePath });
      logInfo('StorageState saved for Level 1 cache', level);

      return {
        success: true,
        level,
        levelName: 'PersistentContext',
        context,
        page,
        duration: Date.now() - start,
      };
    }

    logWarn('Not logged in - profile exists but session expired', level);
    logInfo('Persistent Context is ready for manual or automated login', level);

    return {
      success: false,
      level,
      levelName: 'PersistentContext',
      context,
      page,
      error: 'Not logged in - session expired or first run',
      duration: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(`Persistent Context failed: ${message}`, level);
    return {
      success: false,
      level,
      levelName: 'PersistentContext',
      context: null,
      page: null,
      error: message,
      duration: Date.now() - start,
    };
  }
}
