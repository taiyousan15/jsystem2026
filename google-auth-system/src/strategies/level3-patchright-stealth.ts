import * as fs from 'fs';
import type { AuthConfig, AuthResult } from '../types';
import { logSuccess, logError, logInfo, logWarn } from '../utils/logger';

export async function tryPatchrightStealth(config: AuthConfig): Promise<AuthResult> {
  const start = Date.now();
  const level = 3 as const;

  logInfo('Launching Patchright stealth browser (channel=chrome, no custom UA)...', level);

  // Share the same profile as Level 2 - Patchright adds stealth (Runtime.enable fix)
  // while reusing the existing Google session from Level 2's profile
  fs.mkdirSync(config.profileDir, { recursive: true });

  try {
    const patchright = await import('patchright');

    // Key settings from deep research:
    // 1. channel='chrome' - Use real Chrome, not bundled Chromium (critical for Google)
    // 2. viewport=null (no_viewport) - Avoid default viewport detection
    // 3. NO custom userAgent - Causes Client Hints inconsistency that Google detects
    // 4. NO fingerprint-injector - Real Chrome has legitimate fingerprint already
    // 5. Same profile dir as Level 2 - reuse existing session
    const context = await patchright.chromium.launchPersistentContext(
      config.profileDir,
      {
        channel: 'chrome',
        headless: false,
        viewport: null,
        locale: config.locale,
        timezoneId: config.timezoneId,
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-infobars',
        ],
      }
    );

    const page = context.pages()[0] || await context.newPage();

    await page.goto('https://myaccount.google.com', {
      waitUntil: 'domcontentloaded',
      timeout: config.timeout,
    });

    const webdriverCheck = await page.evaluate(() => {
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        webdriver: (navigator as any).webdriver,
        plugins: navigator.plugins.length,
        languages: [...navigator.languages],
      };
    });

    logInfo(`Stealth check - webdriver: ${webdriverCheck.webdriver}, plugins: ${webdriverCheck.plugins}`, level);

    const currentUrl = page.url();
    const isLoggedIn = !currentUrl.includes('accounts.google.com/ServiceLogin') &&
                       !currentUrl.includes('accounts.google.com/v3/signin') &&
                       !currentUrl.includes('accounts.google.com/signin') &&
                       currentUrl.includes('myaccount.google.com');

    if (isLoggedIn) {
      logSuccess('Logged in via Patchright stealth browser (Real Chrome)', level);

      try {
        const playwrightModule = await import('playwright');
        const tempBrowser = await playwrightModule.chromium.launch({ headless: true });
        const tempContext = await tempBrowser.newContext();
        const cookies = await context.cookies();
        await tempContext.addCookies(cookies);
        await tempContext.storageState({ path: config.storageStatePath });
        await tempContext.close();
        await tempBrowser.close();
        logInfo('StorageState saved for Level 1 cache', level);
      } catch {
        logWarn('Could not save storageState from Patchright context', level);
      }

      return {
        success: true,
        level,
        levelName: 'Patchright+Stealth',
        context: context as never,
        page: page as never,
        duration: Date.now() - start,
      };
    }

    logWarn('Patchright browser launched but not logged in', level);
    return {
      success: false,
      level,
      levelName: 'Patchright+Stealth',
      context: context as never,
      page: page as never,
      error: 'Not logged in via Patchright',
      duration: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(`Patchright stealth failed: ${message}`, level);
    return {
      success: false,
      level,
      levelName: 'Patchright+Stealth',
      context: null,
      page: null,
      error: message,
      duration: Date.now() - start,
    };
  }
}
