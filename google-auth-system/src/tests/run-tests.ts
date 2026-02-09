import { TEST_SITES } from './test-sites-config';
import { runTestSuite, printTestReport } from './test-runner';
import { logBanner, logInfo } from '../utils/logger';
import * as fs from 'fs';
import type { AuthLevel } from '../types';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const levelArg = args.find((a) => a.startsWith('--level='));
  const levels: AuthLevel[] = levelArg
    ? (levelArg.split('=')[1].split(',').map(Number) as AuthLevel[])
    : [2];

  const attemptsArg = args.find((a) => a.startsWith('--attempts='));
  const attempts = attemptsArg ? parseInt(attemptsArg.split('=')[1], 10) : 5;

  const categoryArg = args.find((a) => a.startsWith('--category='));
  const category = categoryArg ? categoryArg.split('=')[1] : undefined;

  const siteArg = args.find((a) => a.startsWith('--site='));
  const siteName = siteArg ? siteArg.split('=')[1] : undefined;

  let sites = TEST_SITES;

  if (category) {
    sites = sites.filter((s) => s.category === category);
  }

  if (siteName) {
    sites = sites.filter((s) =>
      s.name.toLowerCase().includes(siteName.toLowerCase())
    );
  }

  if (sites.length === 0) {
    process.stderr.write('No matching test sites found.\n');
    process.stderr.write(`Available sites: ${TEST_SITES.map((s) => s.name).join(', ')}\n`);
    process.exit(1);
  }

  logBanner('Google Auth System - Full Test Run');
  logInfo(`Levels: ${levels.join(', ')}`);
  logInfo(`Sites: ${sites.map((s) => s.name).join(', ')}`);
  logInfo(`Attempts per case: ${attempts}`);
  logInfo(`Total cases: ${sites.length * levels.length}`);
  logInfo(`Total test runs: ${sites.length * levels.length * attempts}`);

  const results = await runTestSuite(sites, levels, attempts);

  printTestReport(results);

  const reportPath = './auth-state/test-report.json';
  fs.mkdirSync('./auth-state', { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    config: { levels, attempts, sites: sites.map((s) => s.name) },
    results,
  }, null, 2));

  logInfo(`Full report saved to: ${reportPath}`);

  const totalPass = results.reduce((sum, r) => sum + r.successes, 0);
  const totalTests = results.reduce((sum, r) => sum + r.attempts, 0);
  const overallRate = totalTests > 0 ? Math.round((totalPass / totalTests) * 100) : 0;

  process.exit(overallRate >= 50 ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(`Test error: ${err}\n`);
  process.exit(1);
});
