import type { AuthLevel } from '../types';

const LEVEL_NAMES: Record<AuthLevel, string> = {
  1: 'StorageState',
  2: 'PersistentContext',
  3: 'Patchright+Fingerprint',
  4: 'CDP Connection',
  5: 'Manual Login',
};

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

export function getLevelName(level: AuthLevel): string {
  return LEVEL_NAMES[level];
}

export function log(message: string, level?: AuthLevel): void {
  const timestamp = new Date().toISOString().slice(11, 23);
  const prefix = level
    ? `${COLORS.cyan}[${timestamp}]${COLORS.reset} ${COLORS.magenta}[L${level}:${LEVEL_NAMES[level]}]${COLORS.reset}`
    : `${COLORS.cyan}[${timestamp}]${COLORS.reset}`;
  process.stderr.write(`${prefix} ${message}\n`);
}

export function logSuccess(message: string, level: AuthLevel): void {
  log(`${COLORS.green}✓ ${message}${COLORS.reset}`, level);
}

export function logError(message: string, level: AuthLevel): void {
  log(`${COLORS.red}✗ ${message}${COLORS.reset}`, level);
}

export function logWarn(message: string, level?: AuthLevel): void {
  log(`${COLORS.yellow}⚠ ${message}${COLORS.reset}`, level);
}

export function logInfo(message: string, level?: AuthLevel): void {
  log(`${COLORS.blue}ℹ ${message}${COLORS.reset}`, level);
}

export function logDivider(): void {
  process.stderr.write(`${COLORS.gray}${'─'.repeat(60)}${COLORS.reset}\n`);
}

export function logBanner(title: string): void {
  process.stderr.write('\n');
  process.stderr.write(`${COLORS.cyan}┌${'─'.repeat(58)}┐${COLORS.reset}\n`);
  process.stderr.write(`${COLORS.cyan}│${COLORS.reset} ${title.padEnd(57)}${COLORS.cyan}│${COLORS.reset}\n`);
  process.stderr.write(`${COLORS.cyan}└${'─'.repeat(58)}┘${COLORS.reset}\n`);
  process.stderr.write('\n');
}
