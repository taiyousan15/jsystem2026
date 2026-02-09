import { chromium } from 'playwright';
import * as fs from 'fs';
import type { AuthConfig, AuthResult } from '../types';
import { logSuccess, logError, logInfo, logWarn } from '../utils/logger';

export async function tryManualLogin(config: AuthConfig): Promise<AuthResult> {
  const start = Date.now();
  const level = 5 as const;

  logInfo('=== MANUAL LOGIN REQUIRED ===', level);
  logInfo('Opening Chrome for manual Google login...', level);
  logInfo('Please log in manually within 120 seconds', level);

  if (config.onManualLoginRequired) {
    config.onManualLoginRequired();
  }

  try {
    fs.mkdirSync(config.profileDir, { recursive: true });

    const context = await chromium.launchPersistentContext(config.profileDir, {
      headless: false,
      channel: 'chrome',
      ignoreDefaultArgs: ['--enable-automation'],
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-infobars',
      ],
      viewport: config.viewport,
      locale: config.locale,
      timezoneId: config.timezoneId,
    });

    const page = context.pages()[0] || await context.newPage();

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await page.goto('https://accounts.google.com/signin', {
      waitUntil: 'domcontentloaded',
      timeout: config.timeout,
    });

    logInfo('Waiting for manual login (checking every 3 seconds)...', level);

    const maxWait = 120000;
    const checkInterval = 3000;
    let elapsed = 0;
    let loggedIn = false;

    while (elapsed < maxWait) {
      await page.waitForTimeout(checkInterval);
      elapsed += checkInterval;

      const currentUrl = page.url();
      const isOnAccountPage = currentUrl.includes('myaccount.google.com') ||
                               currentUrl.includes('accounts.google.com/b/') ||
                               currentUrl.includes('mail.google.com') ||
                               currentUrl.includes('drive.google.com');
      const isNotOnLogin = !currentUrl.includes('ServiceLogin') &&
                           !currentUrl.includes('/v3/signin') &&
                           !currentUrl.includes('/o/oauth2');

      if (isOnAccountPage || (isNotOnLogin && currentUrl.includes('google.com'))) {
        const hasProfile = await page.evaluate(() => {
          const profileImg = document.querySelector('img[data-profile-identifier]') ||
                             document.querySelector('a[aria-label*="Google Account"]') ||
                             document.querySelector('img.gb_q');
          return !!profileImg;
        });

        if (hasProfile || isOnAccountPage) {
          loggedIn = true;
          break;
        }
      }

      const remaining = Math.round((maxWait - elapsed) / 1000);
      if (elapsed % 15000 === 0) {
        logInfo(`Still waiting... ${remaining}s remaining`, level);
      }
    }

    if (!loggedIn) {
      logError('Manual login timeout (120s). Please try again.', level);
      await context.close();
      return {
        success: false,
        level,
        levelName: 'Manual Login',
        context: null,
        page: null,
        error: 'Manual login timeout',
        duration: Date.now() - start,
      };
    }

    logSuccess('Manual login detected!', level);

    try {
      fs.mkdirSync(fs.realpathSync(config.storageStatePath + '/..'), { recursive: true });
    } catch {
      const dir = config.storageStatePath.replace(/\/[^/]+$/, '');
      fs.mkdirSync(dir, { recursive: true });
    }

    await context.storageState({ path: config.storageStatePath });
    logInfo('StorageState saved for future sessions', level);

    return {
      success: true,
      level,
      levelName: 'Manual Login',
      context,
      page,
      duration: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(`Manual login failed: ${message}`, level);
    return {
      success: false,
      level,
      levelName: 'Manual Login',
      context: null,
      page: null,
      error: message,
      duration: Date.now() - start,
    };
  }
}
