import type { LastFmPrefs } from './prefs';

const API = 'https://ws.audioscrobbler.com/2.0/';

interface RawScrobble {
  name?: string;
  artist?: { '#text'?: string };
  album?: { '#text'?: string };
  date?: { uts?: string };
}

interface RawResponse<T> {
  error?: number;
  message?: string;
  [key: string]: unknown;
  data?: T;
}

async function call<T>(
  method: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<RawResponse<T>> {
  const query = new URLSearchParams({ method, format: 'json', ...params });
  const res = await fetch(`${API}?${query}`, { signal });
  const body = (await res.json()) as RawResponse<T>;
  if (body.error) {
    throw new Error(
      body.error === 17 ? 'Nothing scrobbled there yet.' : `${body.message} (${body.error})`,
    );
  }
  return body;
}

/** A key that cannot even read a profile is worse than no key at all. */
export async function verifyLastfm(
  prefs: LastFmPrefs,
  signal?: AbortSignal,
): Promise<{ playcount: number }> {
  const body = await call<{ user?: { playcount?: string } }>(
    'user.getinfo',
    { user: prefs.user, api_key: prefs.key },
    signal,
  );
  const data = (body.data ?? body) as { user?: { playcount?: string } };
  return { playcount: Number(data.user?.playcount ?? 0) };
}

export interface AlbumPlays {
  artist: string;
  album: string;
  tracks: string[];
  lastAt: number;
}

/**
 * Scrobbles arrive per track, but Loom tracks music per album, so the useful
 * question is "how many distinct tracks of this record did you actually hear".
 */
export async function fetchAlbumPlays(
  prefs: LastFmPrefs,
  options: { days?: number; pages?: number; signal?: AbortSignal } = {},
): Promise<AlbumPlays[]> {
  const { days = 30, pages = 3, signal } = options;
  const from = Math.floor(Date.now() / 1000) - days * 86_400;
  const grouped = new Map<string, AlbumPlays>();

  for (let page = 1; page <= pages; page += 1) {
    const body = await call<{ recenttracks?: { track?: RawScrobble[] } }>(
      'user.getrecentlyplayed',
      {
        user: prefs.user,
        api_key: prefs.key,
        from: String(from),
        limit: '200',
        page: String(page),
      },
      signal,
    );
    const data = (body.data ?? body) as { recenttracks?: { track?: RawScrobble[] } };
    const scrobbles = data.recenttracks?.track ?? [];
    if (!scrobbles.length) break;

    for (const scrobble of scrobbles) {
      const album = scrobble.album?.['#text']?.trim();
      const artist = scrobble.artist?.['#text']?.trim();
      const track = scrobble.name?.trim();
      if (!album || !artist || !track) continue;

      const id = `${artist.toLowerCase()}::${album.toLowerCase()}`;
      const entry = grouped.get(id) ?? { artist, album, tracks: [], lastAt: 0 };
      if (!entry.tracks.includes(track)) entry.tracks.push(track);
      entry.lastAt = Math.max(entry.lastAt, Number(scrobble.date?.uts ?? 0));
      grouped.set(id, entry);
    }

    if (scrobbles.length < 200) break;
  }

  return [...grouped.values()].sort((a, b) => b.lastAt - a.lastAt);
}
