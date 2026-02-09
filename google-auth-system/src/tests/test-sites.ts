import { TEST_SITES, getSitesByCategory } from './test-sites-config';
import { runTestSuite, printTestReport } from './test-runner';
import { logBanner, logInfo, logDivider } from '../utils/logger';
import * as fs from 'fs';
import type { AuthLevel } from '../types';

async function main(): Promise<void> {
  logBanner('Google Auth System - Multi-Site Multi-Level Test');

  const levels: AuthLevel[] = [2, 3];
  const attempts = 5;

  const categories = ['direct-google', 'oauth-button', 'workspace'] as const;

  const allResults = [];

  for (const cat of categories) {
    const sites = getSitesByCategory(cat);
    if (sites.length === 0) continue;

    logDivider();
    logInfo(`Category: ${cat} (${sites.length} sites)`);

    const results = await runTestSuite(sites, levels, attempts);
    allResults.push(...results);
  }

  printTestReport(allResults);

  const reportPath = './auth-state/full-test-report.json';
  fs.mkdirSync('./auth-state', { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    config: {
      levels,
      attempts,
      categories: [...categories],
      totalSites: TEST_SITES.length,
    },
    results: allResults,
    summary: {
      totalCases: allResults.length,
      totalTests: allResults.reduce((s, r) => s + r.attempts, 0),
      totalPass: allResults.reduce((s, r) => s + r.successes, 0),
      totalFail: allResults.reduce((s, r) => s + r.failures, 0),
      overallRate: (() => {
        const total = allResults.reduce((s, r) => s + r.attempts, 0);
        const pass = allResults.reduce((s, r) => s + r.successes, 0);
        return total > 0 ? `${Math.round((pass / total) * 100)}%` : '0%';
      })(),
    },
  }, null, 2));

  logInfo(`Full report saved to: ${reportPath}`);
}

main().catch((err) => {
  process.stderr.write(`Test error: ${err}\n`);
  process.exit(1);
});
