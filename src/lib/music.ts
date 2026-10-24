import type { MediaItem } from '../types';

/**
 * Playback is deliberately not Loom's job. Every target here is a search or
 * profile URL on a service the user already has, so the app stays useful when
 * a service changes and the ad-free player they chose keeps doing that work.
 */
export interface PlayTarget {
  id: string;
  label: string;
  url: string;
}

const enc = encodeURIComponent;

export function playTargets(item: MediaItem): PlayTarget[] {
  const artist = item.creator.trim();
  const title = item.title.trim();
  const both = enc([artist, title].filter(Boolean).join(' '));

  if (item.type === 'podcast') {
    return [
      { id: 'spotify', label: 'Spotify', url: `https://open.spotify.com/search/${both}` },
      { id: 'apple', label: 'Apple Podcasts', url: `https://podcasts.apple.com/us/search?term=${both}` },
      { id: 'youtube', label: 'YouTube', url: `https://www.youtube.com/results?search_query=${both}` },
    ];
  }

  return [
    { id: 'ytmusic', label: 'YouTube Music', url: `https://music.youtube.com/search?q=${both}` },
    {
      id: 'youtube',
      label: 'Video',
      url: `https://www.youtube.com/results?search_query=${enc(`${artist} ${title} official video`.trim())}`,
    },
    { id: 'spotify', label: 'Spotify', url: `https://open.spotify.com/search/${both}` },
    { id: 'apple', label: 'Apple Music', url: `https://music.apple.com/us/search?term=${both}` },
    { id: 'bandcamp', label: 'Bandcamp', url: `https://bandcamp.com/search?q=${both}` },
    artist
      ? { id: 'lastfm', label: 'Last.fm', url: `https://www.last.fm/music/${enc(artist)}/_/${enc(title)}` }
      : { id: 'discogs', label: 'Discogs', url: `https://www.discogs.com/search/?q=${both}&type=release` },
  ];
}

export interface SongPreview {
  url: string;
  track: string;
  artist: string;
}

const flatten = (text: string) =>
  text
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]|feat\.?.*$/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

interface ItunesTrack {
  previewUrl?: string;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
}

/**
 * Apple's search API hands out 30 second clips with no key, no account and
 * `Access-Control-Allow-Origin: *`, which makes it the one preview source that
 * works identically in the browser and inside the desktop shell.
 */
export async function fetchSongPreview(
  title: string,
  creator: string,
  signal?: AbortSignal,
): Promise<SongPreview | null> {
  const want = flatten(title);
  if (!want) return null;

  const url =
    'https://itunes.apple.com/search?term=' +
    enc([creator, title].filter(Boolean).join(' ')) +
    '&media=music&entity=song&limit=10';

  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const body = (await res.json()) as { results?: ItunesTrack[] };

  const ranked = (body.results ?? [])
    .filter((track): track is ItunesTrack & { previewUrl: string } => Boolean(track.previewUrl))
    .map((track) => {
      const got = flatten(track.trackName ?? '');
      const similar =
        got === want || got.includes(want) || want.includes(got) ? 0 : 2;
      const artist = flatten(creator);
      const by = flatten(track.artistName ?? '');
      const credit = !artist ? 0 : by.includes(artist) || artist.includes(by) ? 0 : 1;
      return { track, similar, score: similar + credit };
    })
    .sort((a, b) => a.score - b.score);

  // A clip of the wrong song is worse than no clip, so the title has to match.
  const best = ranked.find((candidate) => candidate.similar === 0);
  if (!best) return null;
  return {
    url: best.track.previewUrl,
    track: best.track.trackName ?? title,
    artist: best.track.artistName ?? creator,
  };
}
