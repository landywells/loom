export interface LastFmPrefs {
  key: string;
  user: string;
}

export interface Prefs {
  lastfm: LastFmPrefs | null;
}

const PREFS_KEY = 'loom.prefs.v1';

const EMPTY: Prefs = { lastfm: null };

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
    return {
      lastfm:
        lastfm && typeof lastfm.key === 'string' && typeof lastfm.user === 'string'
          ? { key: lastfm.key.trim(), user: lastfm.user.trim() }
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
