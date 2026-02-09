import type { BrowserContext, Page } from 'playwright';
import type { AuthLevel, AuthResult, TestResult, TestSiteConfig } from '../types';
import { GoogleAuthManager } from '../auth-manager';
import { logBanner, logDivider, logInfo, logSuccess, logError, logWarn, getLevelName } from '../utils/logger';

const ATTEMPTS_PER_CASE = 5;

async function verifyLogin(
  page: Page,
  site: TestSiteConfig
): Promise<boolean> {
  try {
    await page.goto(site.loginUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    await page.waitForTimeout(2000);

    const currentUrl = page.url();

    switch (site.successIndicator.type) {
      case 'url-contains':
        return currentUrl.includes(site.successIndicator.value);
      case 'selector-exists':
        try {
          await page.waitForSelector(site.successIndicator.value, { timeout: 5000 });
          return true;
        } catch {
          return false;
        }
      case 'text-contains':
        const bodyText = await page.evaluate(() => document.body.innerText);
        return bodyText.includes(site.successIndicator.value);
      default:
        return false;
    }
  } catch {
    return false;
  }
}

async function runSingleTest(
  context: BrowserContext,
  site: TestSiteConfig,
  level: AuthLevel,
  attempt: number,
  reusePage?: Page
): Promise<TestResult> {
  const start = Date.now();

  let page: Page | null = null;
  const isReuseMode = !!reusePage;
  try {
    // Level 3 (Patchright): reuse existing page via page.goto() to avoid
    // session isolation bug with context.newPage()
    page = isReuseMode ? reusePage : await context.newPage();
    const loginVerified = await verifyLogin(page, site);

    return {
      site: site.name,
      url: site.loginUrl,
      level,
      levelName: getLevelName(level),
      attempt,
      success: loginVerified,
      duration: Date.now() - start,
      loginVerified,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      site: site.name,
      url: site.loginUrl,
      level,
      levelName: getLevelName(level),
      attempt,
      success: false,
      duration: Date.now() - start,
      error: message,
      loginVerified: false,
      timestamp: new Date().toISOString(),
    };
  } finally {
    // Only close page if we created it (not in reuse mode)
    if (page && !isReuseMode) {
      try { await page.close(); } catch { /* ignore */ }
    }
  }
}

interface TestSuiteResult {
  site: string;
  category: string;
  level: AuthLevel;
  levelName: string;
  attempts: number;
  successes: number;
  failures: number;
  successRate: string;
  avgDuration: string;
  results: TestResult[];
}

export async function runTestSuite(
  sites: TestSiteConfig[],
  levels: AuthLevel[] = [2],
  attemptsPerCase: number = ATTEMPTS_PER_CASE
): Promise<TestSuiteResult[]> {
  const allSuiteResults: TestSuiteResult[] = [];

  logBanner('Google Auth System - Test Suite');
  logInfo(`Sites: ${sites.length}`);
  logInfo(`Levels: ${levels.join(', ')}`);
  logInfo(`Attempts per case: ${attemptsPerCase}`);
  logInfo(`Total test runs: ${sites.length * levels.length * attemptsPerCase}`);

  for (const level of levels) {
    logDivider();
    logBanner(`Testing Level ${level}: ${getLevelName(level)}`);

    const manager = new GoogleAuthManager({
      headless: false,
      enableLevels: [level],
    });

    const authResult: AuthResult = await manager.authenticateAtLevel(level);

    if (!authResult.success || !authResult.context) {
      logError(`Level ${level} authentication failed. Skipping tests for this level.`, level);

      for (const site of sites) {
        allSuiteResults.push({
          site: site.name,
          category: site.category,
          level,
          levelName: getLevelName(level),
          attempts: attemptsPerCase,
          successes: 0,
          failures: attemptsPerCase,
          successRate: '0%',
          avgDuration: 'N/A',
          results: [],
        });
      }

      await manager.cleanup();
      continue;
    }

    logSuccess(`Level ${level} authenticated. Starting site tests...`, level);

    // Level 3 (Patchright): reuse the auth page to avoid session isolation bug
    const usePageReuse = level === 3;
    const reusablePage = usePageReuse ? (authResult.page ?? undefined) : undefined;
    if (usePageReuse) {
      logInfo('Using page.goto() reuse mode (Level 3 session isolation fix)', level);
    }

    for (const site of sites) {
      logDivider();
      logInfo(`Testing: ${site.name} (${site.category}) - Difficulty: ${site.difficulty}`, level);

      const results: TestResult[] = [];

      for (let attempt = 1; attempt <= attemptsPerCase; attempt++) {
        logInfo(`  Attempt ${attempt}/${attemptsPerCase}...`, level);

        const result = await runSingleTest(authResult.context, site, level, attempt, reusablePage);
        results.push(result);

        if (result.success) {
          logSuccess(`  ✓ Attempt ${attempt}: Login verified (${result.duration}ms)`, level);
        } else {
          logError(`  ✗ Attempt ${attempt}: ${result.error || 'Login not verified'} (${result.duration}ms)`, level);
        }

        if (attempt < attemptsPerCase) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      const successes = results.filter((r) => r.success).length;
      const failures = results.filter((r) => !r.success).length;
      const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
      const avgDuration = results.length > 0 ? Math.round(totalDuration / results.length) : 0;
      const successRate = `${Math.round((successes / attemptsPerCase) * 100)}%`;

      const suiteResult: TestSuiteResult = {
        site: site.name,
        category: site.category,
        level,
        levelName: getLevelName(level),
        attempts: attemptsPerCase,
        successes,
        failures,
        successRate,
        avgDuration: `${avgDuration}ms`,
        results,
      };

      allSuiteResults.push(suiteResult);

      if (successes === attemptsPerCase) {
        logSuccess(`  ${site.name}: ${successRate} success rate (${avgDuration}ms avg)`, level);
      } else if (successes > 0) {
        logWarn(`  ${site.name}: ${successRate} success rate (${avgDuration}ms avg)`, level);
      } else {
        logError(`  ${site.name}: ${successRate} success rate`, level);
      }
    }

    await manager.cleanup();
  }

  return allSuiteResults;
}

export function printTestReport(results: TestSuiteResult[]): void {
  logBanner('TEST REPORT');

  process.stderr.write('\n');
  process.stderr.write('┌────────────────────────┬──────────┬────────────────────────┬──────┬──────┬──────────┬──────────┐\n');
  process.stderr.write('│ Site                   │ Category │ Level                  │ Pass │ Fail │ Rate     │ Avg Time │\n');
  process.stderr.write('├────────────────────────┼──────────┼────────────────────────┼──────┼──────┼──────────┼──────────┤\n');

  for (const r of results) {
    const site = r.site.padEnd(22);
    const cat = r.category.slice(0, 8).padEnd(8);
    const lvl = `L${r.level}:${r.levelName}`.slice(0, 22).padEnd(22);
    const pass = String(r.successes).padStart(4);
    const fail = String(r.failures).padStart(4);
    const rate = r.successRate.padStart(8);
    const time = r.avgDuration.padStart(8);
    process.stderr.write(`│ ${site} │ ${cat} │ ${lvl} │ ${pass} │ ${fail} │ ${rate} │ ${time} │\n`);
  }

  process.stderr.write('└────────────────────────┴──────────┴────────────────────────┴──────┴──────┴──────────┴──────────┘\n');

  const totalTests = results.reduce((sum, r) => sum + r.attempts, 0);
  const totalPass = results.reduce((sum, r) => sum + r.successes, 0);
  const totalFail = results.reduce((sum, r) => sum + r.failures, 0);
  const overallRate = totalTests > 0 ? Math.round((totalPass / totalTests) * 100) : 0;

  process.stderr.write(`\nOverall: ${totalPass}/${totalTests} passed (${overallRate}%)\n`);
}
