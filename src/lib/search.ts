import type { MediaType } from '../types';

export type SearchSource = 'wikipedia' | 'openlibrary' | 'itunes' | 'youtube' | 'anilist';

export interface SearchResult {
  key: string;
  title: string;
  creator: string;
  year: number | null;
  image: string | null;
  blurb: string;
  meta: string;
  source: SearchSource;
  tags?: string[];
  total?: number;
  unit?: string;
}

const SOURCE_FOR_TYPE: Record<MediaType, SearchSource> = {
  movie: 'wikipedia',
  show: 'wikipedia',
  anime: 'anilist',
  game: 'wikipedia',
  book: 'openlibrary',
  comic: 'openlibrary',
  manga: 'anilist',
  music: 'itunes',
  podcast: 'itunes',
  video: 'youtube',
};

export function sourceForType(type: MediaType): SearchSource {
  return SOURCE_FOR_TYPE[type];
}

async function getJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Lookup failed (${response.status})`);
  return (await response.json()) as T;
}

function yearFrom(text: string): number | null {
  const match = text.match(/\b(1[89]\d{2}|20\d{2})\b/);
  if (!match) return null;
  const year = Number(match[1]);
  return year > 1700 && year <= new Date().getFullYear() + 3 ? year : null;
}

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/«.*?»/g, '').trim();
}

/**
 * Rank results by how well the title matches what was typed.
 * Some catalogs (iTunes especially) return whatever they feel like first,
 * so "Blonde" could otherwise land behind a decade-old single.
 */
const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/ *\([^)]*\) */g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Rank by how well a result matches what was typed.
 *
 * Token coverage alone misleads: "Taylor Swift 1989 Karaoke Hits" contains every
 * word of "1989 taylor swift" and would beat the real album. So the words the
 * creator field already explains are removed, and whatever is left — the actual
 * name of the work — has to appear in the title.
 */
function byRelevance(query: string) {
  const needle = normalize(query);
  const tokens = needle.split(' ').filter(Boolean);

  const coverage = (haystack: string, set: string[]) =>
    set.length ? set.filter((token) => haystack.includes(token)).length / set.length : 0;

  const score = (item: SearchResult) => {
    const title = normalize(item.title);
    const artist = normalize(item.creator);
    if (!title) return -1;

    const residual = tokens.filter((token) => !artist.includes(token));
    let value = coverage(title, residual) * 80;

    if (title === needle) value += 100;
    else if (title.length > 1 && needle.includes(title)) {
      value += 45 * (title.length / needle.length);
    } else if (needle && title.includes(needle)) {
      // A longer title that merely contains the query is a weaker signal,
      // proportional to how much of it the query actually explains.
      value += 40 * Math.min(1, needle.length / title.length);
    }

    value += coverage(title, tokens) * 20;
    value += coverage(artist, tokens) * 12;

    const extra = title
      .split(' ')
      .filter(
        (word) => word.length > 1 && !tokens.some((token) => token.includes(word) || word.includes(token)),
      ).length;
    value -= extra * 12;

    const anchor = [...residual].sort((a, b) => b.length - a.length)[0];
    if (anchor && !title.includes(anchor)) value *= 0.4;
    return value;
  };

  return (a: SearchResult, b: SearchResult) => score(b) - score(a);
}

/* ---------------- Wikipedia: films, series, anime, games ---------------- */

interface WikiPage {
  title: string;
  thumbnail?: { source?: string };
  extract?: string;
}

interface WikiResponse {
  query?: { pages?: Record<string, WikiPage> };
}

const WIKI_HINT: Partial<Record<MediaType, string>> = {
  movie: 'film',
  show: 'TV series',
  anime: 'anime',
  game: 'video game',
};

function creditFrom(extract: string): string {
  const patterns = [
    /directed by ([^,.;]+?)(?:,|\.|;|\s+from|\s+and|\s+who)/i,
    /developed by ([^,.;]+?)(?:,|\.|;|\s+for|\s+and)/i,
    /created by ([^,.;]+?)(?:,|\.|;|\s+for|\s+and)/i,
    /written by ([^,.;]+?)(?:,|\.|;|\s+and|\s+with)/i,
    /developed and published by ([^,.;]+?)(?:,|\.|;)/i,
    /published by ([^,.;]+?)(?:,|\.|;)/i,
    /by ([A-Z][^,.;]{2,60}?)(?:,|\.|;)/i,
  ];
  for (const pattern of patterns) {
    const match = extract.match(pattern);
    if (match?.[1]) return clean(match[1]);
  }
  return '';
}

async function searchWikipedia(query: string, type: MediaType, signal?: AbortSignal) {
  const hint = WIKI_HINT[type] ?? '';
  const term = `${query} ${hint}`.trim();
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=' +
    encodeURIComponent(term) +
    '&gsrlimit=12&gsrnamespace=0&prop=pageimages|extracts&piprop=thumbnail&pithumbsize=440' +
    '&pilicense=any&exintro&explaintext&exchars=260&origin=*&format=json';
  const data = await getJSON<WikiResponse>(url, signal);
  const pages = Object.values(data.query?.pages ?? {});

  const needle = query.trim().toLowerCase();
  const generic = new Set(['film', 'films', 'movie', 'movies', 'series', 'tv', 'game', 'games', 'anime', 'manga', 'the', 'a', 'of', 'and']);
  const needleTokens = needle.split(/[^a-z0-9]+/).filter(Boolean);
  const essential = needleTokens
    .filter((token) => !generic.has(token) && !/^\d+$/.test(token))
    .sort((a, b) => b.length - a.length)[0];

  const scoreOf = (pageTitle: string) => {
    const bracket = pageTitle.match(/\(([^)]+)\)/i)?.[1]?.toLowerCase() ?? '';
    const plain = pageTitle.replace(/ *\([^)]*\) */g, ' ').toLowerCase().trim();

    let score = 0;
    if (plain === needle) score = 120;
    else if (plain.startsWith(needle)) score = 90;
    else if (plain.includes(needle)) score = 70;
    else if (needleTokens.length) {
      const covered = needleTokens.filter((token) => plain.includes(token)).length;
      score = (covered / needleTokens.length) * 55;
    }

    // The most distinctive word should be present at all.
    if (essential && !plain.includes(essential)) score *= 0.2;

    // Nudge toward the right medium, away from a same-titled something else.
    if (hint) {
      if (bracket && bracket.includes(hint.toLowerCase())) score += 25;
      else if (pageTitle.toLowerCase().includes(hint.toLowerCase())) score += 8;
      if (bracket && !bracket.includes(hint.toLowerCase())) score -= 18;
    }
    return score;
  };

  const scored = pages
    .map((page) => ({ page, score: scoreOf(page.title) }))
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 10).map<SearchResult>(({ page }) => {
    const extract = clean(page.extract ?? '');
    return {
      key: `wiki-${page.title}`,
      title: clean(page.title),
      creator: creditFrom(extract),
      year: yearFrom(extract),
      image: page.thumbnail?.source ?? null,
      blurb: extract.length > 150 ? `${extract.slice(0, 150).trimEnd()}…` : extract,
      meta: hint ? hint.replace('TV series', 'Series') : 'Article',
      source: 'wikipedia',
    };
  });
}

/* ---------------- OpenLibrary: books, comics, manga ---------------- */

interface OLDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  first_sentence?: string | string[];
  subject?: string[];
  edition_count?: number;
}

interface OLResponse {
  docs?: OLDoc[];
}

async function searchOpenLibrary(query: string, signal?: AbortSignal) {
  const url =
    'https://openlibrary.org/search.json?q=' +
    encodeURIComponent(query) +
    '&limit=12&fields=key,title,author_name,first_publish_year,cover_i,first_sentence,subject,edition_count';
  const data = await getJSON<OLResponse>(url, signal);
  return (data.docs ?? [])
    .map<SearchResult>((doc) => {
      const sentence = Array.isArray(doc.first_sentence)
        ? doc.first_sentence[0]
        : doc.first_sentence;
      const genres = (doc.subject ?? []).slice(0, 2).join(' · ');
      return {
        key: doc.key,
        title: clean(doc.title),
        creator: doc.author_name?.[0] ?? '',
        year: doc.first_publish_year ?? null,
        image: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
        blurb: clean(sentence ?? genres ?? ''),
        meta: doc.edition_count ? `${doc.edition_count} editions` : 'Book',
        source: 'openlibrary',
      };
    })
    .sort(byRelevance(query))
    .slice(0, 10);
}

/* ---------------- iTunes: music, podcasts ---------------- */

interface ITunesResult {
  wrapperType?: string;
  kind?: string;
  collectionName?: string;
  trackName?: string;
  artistName?: string;
  releaseDate?: string;
  artworkUrl100?: string;
  primaryGenreName?: string;
  trackCount?: number;
  collectionId?: number;
  trackId?: number;
}

async function searchITunes(query: string, type: MediaType, signal?: AbortSignal) {
  const isMusic = type === 'music';
  const url =
    'https://itunes.apple.com/search?term=' +
    encodeURIComponent(query) +
    `&media=${isMusic ? 'music' : 'podcast'}&entity=${isMusic ? 'album' : 'podcast'}&limit=12`;
  const data = await getJSON<{ results?: ITunesResult[] }>(url, signal);
  return (data.results ?? [])
    .map<SearchResult>((item) => {
      const title = clean(item.collectionName ?? item.trackName ?? '');
      const artwork = item.artworkUrl100?.replace('100x100bb', '400x400bb') ?? null;
      return {
        key: `it-${isMusic ? item.collectionId : item.trackId}-${title}`,
        title,
        creator: clean(item.artistName ?? ''),
        year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : null,
        image: artwork,
        blurb: item.primaryGenreName ?? '',
        meta: isMusic
          ? item.trackCount
            ? `${item.trackCount} tracks`
            : 'Album'
          : item.trackCount
            ? `${item.trackCount} episodes`
            : 'Podcast',
        source: 'itunes',
        total: item.trackCount,
        unit: isMusic ? 'tracks' : 'episodes',
      };
    })
    .sort(byRelevance(query))
    .slice(0, 10);
}

/* ---------------- AniList: anime & manga ---------------- */

interface AniListStaff {
  edges?: { role?: string; node?: { name?: { full?: string } } }[];
}

interface AniListMedia {
  id: number;
  title?: { romaji?: string; english?: string; native?: string };
  coverImage?: { large?: string; extraLarge?: string };
  episodes?: number | null;
  chapters?: number | null;
  startDate?: { year?: number | null };
  description?: string | null;
  genres?: string[];
  studios?: { nodes?: { name?: string }[] };
  staff?: AniListStaff;
}

const ANILIST_QUERY = `
query ($search: String, $type: MediaType) {
  Page(perPage: 10) {
    media(search: $search, type: $type) {
      id
      title { romaji english }
      coverImage { large }
      episodes
      chapters
      startDate { year }
      genres
      description(asHtml: false)
      studios { nodes { name } }
      staff { edges { role node { name { full } } } }
    }
  }
}`;

/** AniList returns HTML-ish prose with numeric entities; strip it to plain text. */
function toPlainText(input: string): string {
  return clean(
    input
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/?(i|b|em|strong|u|a)[^>]*>/gi, '')
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&rsquo;|&lsquo;/g, '’')
      .replace(/&rdquo;|&ldquo;/g, '”')
      .replace(/&ndash;|&mdash;/g, '–')
      .replace(/&hellip;/g, '…')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&'),
  );
}

function authorFrom(staff: AniListStaff | undefined): string {
  const edges = staff?.edges ?? [];
  const preferred =
    edges.find((edge) => /story & art|art|writer|story/i.test(edge.role ?? '')) ?? edges[0];
  return clean(preferred?.node?.name?.full ?? '');
}

async function searchAniList(query: string, type: MediaType, signal?: AbortSignal) {
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      query: ANILIST_QUERY,
      variables: { search: query, type: type === 'manga' ? 'MANGA' : 'ANIME' },
    }),
  });
  if (!response.ok) throw new Error(`AniList is unavailable (${response.status})`);
  const payload = (await response.json()) as {
    data?: { Page?: { media?: AniListMedia[] } };
  };

  const isManga = type === 'manga';
  return (payload.data?.Page?.media ?? []).map<SearchResult>((media) => {
    const title = clean(media.title?.english || media.title?.romaji || 'Untitled');
    const count = isManga ? media.chapters : media.episodes;
    const description = toPlainText(media.description ?? '');
    return {
      key: `anilist-${media.id}`,
      title,
      creator: isManga ? authorFrom(media.staff) : clean(media.studios?.nodes?.[0]?.name ?? ''),
      year: media.startDate?.year ?? null,
      image: media.coverImage?.large ?? null,
      blurb: description.length > 150 ? `${description.slice(0, 150).trimEnd()}…` : description,
      meta: count
        ? `${count} ${isManga ? 'chapter' : 'episode'}${count === 1 ? '' : 's'}`
        : isManga
          ? 'Manga'
          : 'Anime',
      source: 'anilist',
      tags: (media.genres ?? []).slice(0, 3).map((genre) => genre.toLowerCase()),
      total: count ?? undefined,
      unit: isManga ? 'chapters' : 'episodes',
    };
  })
    .sort(byRelevance(query))
    .slice(0, 10);
}

/* ---------------- YouTube: resolve a pasted URL ---------------- */

export function youTubeId(input: string): string | null {
  const value = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  const match = value.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return match?.[1] ?? null;
}

interface OEmbed {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
}

export async function resolveYouTube(input: string, signal?: AbortSignal): Promise<SearchResult> {
  const id = youTubeId(input);
  if (!id) throw new Error('That does not look like a YouTube link yet.');
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${id}`,
  )}&format=json`;
  const data = await getJSON<OEmbed>(url, signal);
  return {
    key: `yt-${id}`,
    title: clean(data.title ?? 'Untitled video'),
    creator: clean(data.author_name ?? ''),
    year: null,
    image:
      data.thumbnail_url?.replace(/sqdefault|mqdefault|hqdefault/, 'maxresdefault') ??
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    blurb: 'Pulled straight from YouTube.',
    meta: 'Video',
    source: 'youtube',
  };
}

/* ---------------- Dispatch, with a small cache ---------------- */

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<string, { at: number; value: SearchResult[] }>();
const inflight = new Map<string, Promise<SearchResult[]>>();

async function runQuery(query: string, type: MediaType, signal?: AbortSignal) {
  const trimmed = query.trim();
  switch (sourceForType(type)) {
    case 'wikipedia':
      return searchWikipedia(trimmed, type, signal);
    case 'openlibrary':
      return searchOpenLibrary(trimmed, signal);
    case 'itunes':
      return searchITunes(trimmed, type, signal);
    case 'anilist':
      return searchAniList(trimmed, type, signal);
    default:
      return [];
  }
}

export async function searchCatalog(
  query: string,
  type: MediaType,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2 || type === 'video') return [];

  const key = `${type}:${trimmed.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.value;

  // Reuse an identical request already in flight rather than asking twice.
  let pending = inflight.get(key);
  if (!pending) {
    pending = runQuery(trimmed, type, signal)
      .then((results) => {
        cache.set(key, { at: Date.now(), value: results });
        if (cache.size > 60) cache.delete(cache.keys().next().value as string);
        return results;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  return pending;
}

export const SOURCE_LABEL: Record<SearchSource, string> = {
  wikipedia: 'Wikipedia',
  openlibrary: 'Open Library',
  itunes: 'Apple Music',
  youtube: 'YouTube',
  anilist: 'AniList',
};
