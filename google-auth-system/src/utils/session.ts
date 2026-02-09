import * as fs from 'fs';
import * as path from 'path';
import type { SessionHealth, AuthLevel } from '../types';

const SESSION_META_FILE = '.session-meta.json';

interface SessionMeta {
  level: AuthLevel;
  createdAt: string;
  lastVerified: string;
  storageStatePath?: string;
  profileDir?: string;
}

export function getSessionMetaPath(baseDir: string): string {
  return path.join(baseDir, SESSION_META_FILE);
}

export function saveSessionMeta(baseDir: string, meta: SessionMeta): void {
  const metaPath = getSessionMetaPath(baseDir);
  fs.mkdirSync(path.dirname(metaPath), { recursive: true });
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
}

export function loadSessionMeta(baseDir: string): SessionMeta | null {
  const metaPath = getSessionMetaPath(baseDir);
  if (!fs.existsSync(metaPath)) return null;
  try {
    const content = fs.readFileSync(metaPath, 'utf-8');
    return JSON.parse(content) as SessionMeta;
  } catch {
    return null;
  }
}

export function isStorageStateValid(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const state = JSON.parse(content);
    if (!state.cookies || !Array.isArray(state.cookies)) return false;

    const googleCookies = state.cookies.filter(
      (c: { domain: string }) => c.domain.includes('google.com')
    );
    if (googleCookies.length === 0) return false;

    const now = Date.now() / 1000;
    const hasValidCookie = googleCookies.some(
      (c: { expires: number }) => c.expires === -1 || c.expires > now
    );
    return hasValidCookie;
  } catch {
    return false;
  }
}

export function isProfileValid(profileDir: string): boolean {
  if (!fs.existsSync(profileDir)) return false;
  const cookiesPath = path.join(profileDir, 'Default', 'Cookies');
  const localStatePath = path.join(profileDir, 'Local State');
  return fs.existsSync(cookiesPath) || fs.existsSync(localStatePath);
}

export function checkSessionHealth(
  storageStatePath: string,
  profileDir: string,
  level: AuthLevel
): SessionHealth {
  const storageValid = isStorageStateValid(storageStatePath);
  const profileValid = isProfileValid(profileDir);

  return {
    valid: storageValid || profileValid,
    lastChecked: new Date(),
    level,
  };
}

export interface ClearSessionOptions {
  storageState?: boolean;
  profile?: boolean;
  sessionMeta?: boolean;
}

export interface ClearSessionResult {
  storageStateCleared: boolean;
  profileCleared: boolean;
  sessionMetaCleared: boolean;
  errors: string[];
}

export function clearSession(
  storageStatePath: string,
  profileDir: string,
  baseDir: string,
  options: ClearSessionOptions = {}
): ClearSessionResult {
  const clearAll = !options.storageState && !options.profile && !options.sessionMeta;
  const shouldClearStorage = clearAll || options.storageState === true;
  const shouldClearProfile = clearAll || options.profile === true;
  const shouldClearMeta = clearAll || options.sessionMeta === true;

  const result: ClearSessionResult = {
    storageStateCleared: false,
    profileCleared: false,
    sessionMetaCleared: false,
    errors: [],
  };

  if (shouldClearStorage) {
    try {
      if (fs.existsSync(storageStatePath)) {
        fs.unlinkSync(storageStatePath);
        result.storageStateCleared = true;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`StorageState削除失敗: ${msg}`);
    }
  }

  if (shouldClearProfile) {
    try {
      if (fs.existsSync(profileDir)) {
        fs.rmSync(profileDir, { recursive: true, force: true });
        result.profileCleared = true;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`プロファイル削除失敗: ${msg}`);
    }
  }

  if (shouldClearMeta) {
    try {
      const metaPath = getSessionMetaPath(baseDir);
      if (fs.existsSync(metaPath)) {
        fs.unlinkSync(metaPath);
        result.sessionMetaCleared = true;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`セッションメタ削除失敗: ${msg}`);
    }
  }

  return result;
}
