import type { TestSiteConfig } from '../types';

export const TEST_SITES: TestSiteConfig[] = [
  // === Category 1: Direct Google Login ===
  {
    name: 'Google MyAccount',
    category: 'direct-google',
    loginUrl: 'https://myaccount.google.com',
    successIndicator: {
      type: 'url-contains',
      value: 'myaccount.google.com',
    },
    difficulty: 'high',
  },
  {
    name: 'Gmail',
    category: 'direct-google',
    loginUrl: 'https://mail.google.com',
    successIndicator: {
      type: 'url-contains',
      value: 'mail.google.com/mail',
    },
    difficulty: 'high',
  },
  {
    name: 'Google Drive',
    category: 'direct-google',
    loginUrl: 'https://drive.google.com',
    successIndicator: {
      type: 'url-contains',
      value: 'drive.google.com/drive',
    },
    difficulty: 'high',
  },

  // === Category 2: OAuth "Sign in with Google" Button ===
  {
    name: 'Stack Overflow',
    category: 'oauth-button',
    loginUrl: 'https://stackoverflow.com',
    successIndicator: {
      type: 'selector-exists',
      value: 'a.s-topbar--item[href*="/users/"]',
    },
    difficulty: 'medium',
  },
  {
    name: 'Medium',
    category: 'oauth-button',
    loginUrl: 'https://medium.com',
    successIndicator: {
      type: 'selector-exists',
      value: 'button[aria-label="Write"], img[alt*="avatar" i]',
    },
    difficulty: 'medium',
  },
  {
    name: 'Notion',
    category: 'oauth-button',
    loginUrl: 'https://www.notion.so',
    successIndicator: {
      type: 'selector-exists',
      value: '.notion-sidebar, [class*="sidebar"], div[data-testid="app-sidebar"]',
    },
    difficulty: 'medium',
  },

  // === Category 3: Google Workspace ===
  {
    name: 'Google Docs',
    category: 'workspace',
    loginUrl: 'https://docs.google.com',
    successIndicator: {
      type: 'url-contains',
      value: 'docs.google.com/document',
    },
    difficulty: 'high',
  },
  {
    name: 'Google Sheets',
    category: 'workspace',
    loginUrl: 'https://sheets.google.com',
    successIndicator: {
      type: 'url-contains',
      value: 'docs.google.com/spreadsheets',
    },
    difficulty: 'high',
  },
  {
    name: 'YouTube Studio',
    category: 'workspace',
    loginUrl: 'https://studio.youtube.com',
    successIndicator: {
      type: 'url-contains',
      value: 'studio.youtube.com',
    },
    difficulty: 'high',
  },
  {
    name: 'Google Calendar',
    category: 'workspace',
    loginUrl: 'https://calendar.google.com',
    successIndicator: {
      type: 'url-contains',
      value: 'calendar.google.com/calendar',
    },
    difficulty: 'high',
  },
];

export function getSitesByCategory(category: TestSiteConfig['category']): TestSiteConfig[] {
  return TEST_SITES.filter((s) => s.category === category);
}

export function getSitesByDifficulty(difficulty: TestSiteConfig['difficulty']): TestSiteConfig[] {
  return TEST_SITES.filter((s) => s.difficulty === difficulty);
}
