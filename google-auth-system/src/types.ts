import type { BrowserContext, Page } from 'playwright';

export type AuthLevel = 1 | 2 | 3 | 4 | 5;

export interface AuthResult {
  success: boolean;
  level: AuthLevel;
  levelName: string;
  context: BrowserContext | null;
  page: Page | null;
  error?: string;
  duration: number;
}

export interface AuthConfig {
  profileDir: string;
  storageStatePath: string;
  cdpEndpoint: string;
  headless: boolean;
  timeout: number;
  locale: string;
  timezoneId: string;
  viewport: { width: number; height: number };
  userAgent?: string;
  enableLevels: AuthLevel[];
  onManualLoginRequired?: () => void;
  verbose: boolean;
}

export interface SessionHealth {
  valid: boolean;
  expiresAt?: Date;
  lastChecked: Date;
  level: AuthLevel;
}

export interface TestResult {
  site: string;
  url: string;
  level: AuthLevel;
  levelName: string;
  attempt: number;
  success: boolean;
  duration: number;
  error?: string;
  loginVerified: boolean;
  timestamp: string;
}

export interface TestSiteConfig {
  name: string;
  category: 'direct-google' | 'oauth-button' | 'firebase' | 'workspace';
  loginUrl: string;
  successIndicator: {
    type: 'url-contains' | 'selector-exists' | 'text-contains';
    value: string;
  };
  difficulty: 'low' | 'medium' | 'high';
}

export const DEFAULT_CONFIG: AuthConfig = {
  profileDir: './profiles/google-auth-profile',
  storageStatePath: './auth-state/google.json',
  cdpEndpoint: 'http://localhost:9222',
  headless: false,
  timeout: 30000,
  locale: 'ja-JP',
  timezoneId: 'Asia/Tokyo',
  viewport: { width: 1280, height: 720 },
  enableLevels: [1, 2, 3, 4, 5],
  verbose: true,
};
