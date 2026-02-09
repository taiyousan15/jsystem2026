import { chromium } from 'playwright';
import type { BrowserContext } from 'playwright';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { AuthConfig, AuthResult } from '../types';
import { logSuccess, logError, logInfo, logWarn } from '../utils/logger';

const DEFAULT_CDP_PROFILE_DIR = path.join(os.homedir(), 'chrome-playwright-profile');

async function isCDPAvailable(endpoint: string): Promise<boolean> {
  try {
    const response = await fetch(`${endpoint}/json/version`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function getChromePath(): string {
  const paths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Google Chrome not found');
}

async function launchChromeWithCDP(profileDir: string, port: number): Promise<void> {
  const chromePath = getChromePath();
  const absoluteProfileDir = path.resolve(profileDir);
  fs.mkdirSync(absoluteProfileDir, { recursive: true });

  const chromeProcess = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${absoluteProfileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-infobars',
    // Match Playwright's cookie encryption settings so profile cookies are readable
    '--use-mock-keychain',
    '--password-store=basic',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=LockProfileCookieDatabase',
  ], {
    detached: true,
    stdio: 'ignore',
  });
  chromeProcess.unref();

  logInfo(`Chrome launched with CDP on port ${port} (PID: ${chromeProcess.pid})`, 4);

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const ready = await isCDPAvailable(`http://localhost:${port}`);
    if (ready) return;
  }
  throw new Error('Chrome CDP did not become ready within 10 seconds');
}

function isLoggedInUrl(url: string): boolean {
  const loginPatterns = [
    'accounts.google.com/ServiceLogin',
    'accounts.google.com/v3/signin',
    'accounts.google.com/signin',
    'accounts.google.com/o/oauth2',
    'accounts.google.com/AccountChooser',
    'accounts.google.com/InteractiveLogin',
  ];
  if (loginPatterns.some((pattern) => url.includes(pattern))) return false;
  return url.includes('myaccount.google.com');
}

async function tryInjectStorageState(
  context: BrowserContext,
  storageStatePath: string
): Promise<boolean> {
  try {
    if (!fs.existsSync(storageStatePath)) return false;

    const raw = fs.readFileSync(storageStatePath, 'utf-8');
    const state = JSON.parse(raw);
    const cookies = state.cookies || [];

    // Check if storageState has auth cookies (not just tracking cookies)
    const authCookieNames = ['SID', 'HSID', 'SSID', 'APISID', 'SAPISID', '__Secure-1PSID', '__Secure-3PSID', 'LSID'];
    const hasAuthCookies = cookies.some((c: { name: string }) =>
      authCookieNames.includes(c.name)
    );

    if (!hasAuthCookies) {
      logWarn('StorageState has no auth cookies, skipping injection', 4);
      return false;
    }

    logInfo(`Injecting ${cookies.length} cookies from storageState...`, 4);
    await context.addCookies(cookies);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logWarn(`StorageState injection failed: ${msg}`, 4);
    return false;
  }
}

export async function tryCDPConnection(config: AuthConfig): Promise<AuthResult> {
  const start = Date.now();
  const level = 4 as const;

  const cdpUrl = new URL(config.cdpEndpoint);
  const port = parseInt(cdpUrl.port || '9222', 10);

  logInfo(`Checking CDP endpoint at ${config.cdpEndpoint}...`, level);

  let available = await isCDPAvailable(config.cdpEndpoint);
  let wasAutoLaunched = false;

  if (!available) {
    logWarn('CDP endpoint not available. Auto-launching Chrome...', level);
    try {
      const profileDir = config.profileDir || DEFAULT_CDP_PROFILE_DIR;
      await launchChromeWithCDP(profileDir, port);
      available = true;
      wasAutoLaunched = true;
      logSuccess(`Chrome auto-launched with CDP (profile: ${path.resolve(profileDir)})`, level);
    } catch (launchErr) {
      const msg = launchErr instanceof Error ? launchErr.message : String(launchErr);
      logError(`Chrome auto-launch failed: ${msg}`, level);
      const profileDir = config.profileDir || DEFAULT_CDP_PROFILE_DIR;
      logInfo('Manual launch command:', level);
      logInfo(`  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \\`, level);
      logInfo(`    --remote-debugging-port=${port} \\`, level);
      logInfo(`    --user-data-dir="${path.resolve(profileDir)}"`, level);
      return {
        success: false,
        level,
        levelName: 'CDP Connection',
        context: null,
        page: null,
        error: 'CDP endpoint not reachable and auto-launch failed',
        duration: Date.now() - start,
      };
    }
  }

  try {
    const browser = await chromium.connectOverCDP(config.cdpEndpoint);

    const contexts = browser.contexts();
    if (contexts.length === 0) {
      logError('No browser contexts found via CDP', level);
      return {
        success: false,
        level,
        levelName: 'CDP Connection',
        context: null,
        page: null,
        error: 'No contexts available',
        duration: Date.now() - start,
      };
    }

    const context = contexts[0];
    let page = context.pages()[0];
    if (!page) {
      page = await context.newPage();
    }

    // Try injecting cookies from storageState if auto-launched (profile may lack session cookies)
    if (wasAutoLaunched) {
      await tryInjectStorageState(context, config.storageStatePath);
    }

    await page.goto('https://myaccount.google.com', {
      waitUntil: 'domcontentloaded',
      timeout: config.timeout,
    });

    // Wait for potential redirects to complete
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const loggedIn = isLoggedInUrl(currentUrl);

    if (loggedIn) {
      logSuccess('Connected to existing Chrome session via CDP', level);

      try {
        await context.storageState({ path: config.storageStatePath });
        logInfo('StorageState saved for Level 1 cache', level);
      } catch {
        logWarn('Could not save storageState from CDP context', level);
      }

      return {
        success: true,
        level,
        levelName: 'CDP Connection',
        context,
        page,
        duration: Date.now() - start,
      };
    }

    logWarn(`Connected via CDP but not logged in (URL: ${currentUrl.slice(0, 80)})`, level);
    return {
      success: false,
      level,
      levelName: 'CDP Connection',
      context,
      page,
      error: 'Chrome is not logged into Google',
      duration: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(`CDP connection failed: ${message}`, level);
    return {
      success: false,
      level,
      levelName: 'CDP Connection',
      context: null,
      page: null,
      error: message,
      duration: Date.now() - start,
    };
  }
}
