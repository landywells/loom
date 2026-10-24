import type { SyncTarget } from './remotes';

export interface LastFmPrefs {
  key: string;
  user: string;
}

export interface SyncPrefs {
  target: SyncTarget;
  /** Derived AES key, cached so a device only needs the passphrase once. */
  key?: string;
  /** Kept alongside the key: a new salt would silently invalidate it. */
  salt?: string;
  lastSyncedAt?: number;
}

export interface Prefs {
  lastfm: LastFmPrefs | null;
  sync: SyncPrefs | null;
}

const PREFS_KEY = 'loom.prefs.v1';

const EMPTY: Prefs = { lastfm: null, sync: null };

function readTarget(value: unknown): SyncTarget | null {
  if (!value || typeof value !== 'object') return null;
  const target = value as Record<string, unknown>;
  if (target.kind === 'off') return { kind: 'off' };
  if (target.kind === 'gist' && typeof target.token === 'string') {
    return {
      kind: 'gist',
      token: target.token,
      gistId: typeof target.gistId === 'string' ? target.gistId : undefined,
    };
  }
  if (
    target.kind === 'webdav' &&
    typeof target.url === 'string' &&
    typeof target.user === 'string' &&
    typeof target.password === 'string'
  ) {
    return { kind: 'webdav', url: target.url, user: target.user, password: target.password };
  }
  return null;
}

/**
 * Credentials live in their own key, deliberately outside the library, so an
 * export — which is a file people email and sync — can never carry a token.
 */
export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    const lastfm = parsed.lastfm;
    const sync = parsed.sync;
    const target = sync ? readTarget(sync.target) : null;
    return {
      lastfm:
        lastfm && typeof lastfm.key === 'string' && typeof lastfm.user === 'string'
          ? { key: lastfm.key.trim(), user: lastfm.user.trim() }
          : null,
      sync:
        target && target.kind !== 'off'
          ? {
              target,
              key: typeof sync?.key === 'string' ? sync.key : undefined,
              salt: typeof sync?.salt === 'string' ? sync.salt : undefined,
              lastSyncedAt: typeof sync?.lastSyncedAt === 'number' ? sync.lastSyncedAt : undefined,
            }
          : null,
    };
  } catch {
    return EMPTY;
  }
}

export function savePrefs(prefs: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // A device that will not store a key simply asks for it again next time.
  }
}
