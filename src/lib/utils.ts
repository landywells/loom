import type { ArtPattern, CoverArt, MediaItem, MediaType, Status } from '../types';

export const SHORTCUT_MOD =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl';

export const TYPE_META: Record<
  MediaType,
  { label: string; plural: string; short: string; unit: string; defaultTotal: number }
> = {
  movie: { label: 'Film', plural: 'Films', short: 'Film', unit: 'min', defaultTotal: 120 },
  show: { label: 'Series', plural: 'Series', short: 'TV', unit: 'episodes', defaultTotal: 10 },
  anime: { label: 'Anime', plural: 'Anime', short: 'Anime', unit: 'episodes', defaultTotal: 12 },
  book: { label: 'Book', plural: 'Books', short: 'Book', unit: 'pages', defaultTotal: 320 },
  comic: { label: 'Comic', plural: 'Comics', short: 'Comic', unit: 'issues', defaultTotal: 6 },
  manga: { label: 'Manga', plural: 'Manga', short: 'Manga', unit: 'chapters', defaultTotal: 10 },
  music: { label: 'Music', plural: 'Music', short: 'Music', unit: 'tracks', defaultTotal: 12 },
  video: { label: 'Video', plural: 'YouTube', short: 'Video', unit: 'min', defaultTotal: 20 },
  game: { label: 'Game', plural: 'Games', short: 'Game', unit: 'hours', defaultTotal: 40 },
  podcast: { label: 'Podcast', plural: 'Podcasts', short: 'Podcast', unit: 'episodes', defaultTotal: 12 },
};

export const ALL_TYPES: MediaType[] = [
  'movie',
  'show',
  'anime',
  'book',
  'comic',
  'manga',
  'music',
  'video',
  'game',
  'podcast',
];

export const STATUS_META: Record<Status, { label: string }> = {
  active: { label: 'In progress' },
  backlog: { label: 'Up next' },
  paused: { label: 'Paused' },
  done: { label: 'Finished' },
  dropped: { label: 'Dropped' },
};

const ACTIVE_VERB: Partial<Record<MediaType, string>> = {
  movie: 'Watching',
  show: 'Watching',
  anime: 'Watching',
  video: 'Watching',
  book: 'Reading',
  comic: 'Reading',
  manga: 'Reading',
  music: 'Listening',
  game: 'Playing',
  podcast: 'Listening',
};

const DONE_VERB: Partial<Record<MediaType, string>> = {
  book: 'Read',
  comic: 'Read',
  manga: 'Read',
  music: 'Listened',
  game: 'Played',
};

export function statusLabel(type: MediaType, status: Status): string {
  if (status === 'active') return ACTIVE_VERB[type] ?? 'In progress';
  if (status === 'backlog') return 'Up next';
  if (status === 'paused') return 'Paused';
  if (status === 'dropped') return 'Dropped';
  return DONE_VERB[type] ?? 'Finished';
}

export function progressPercent(item: MediaItem): number {
  if (item.status === 'done') return 100;
  if (!item.progress.total) return 0;
  return Math.min(100, Math.max(0, Math.round((item.progress.current / item.progress.total) * 100)));
}

/** Episodic formats read better as "S3 · E4 of 10" than as a flat 4/34. */
export function isSeasonal(item: MediaItem): boolean {
  return (item.type === 'show' || item.type === 'anime') && Boolean(item.progress.season);
}

export function seasonSuffix(item: MediaItem): string {
  if (!isSeasonal(item)) return '';
  return `S${item.progress.season} · `;
}

export function progressText(item: MediaItem): string {
  const { current, total, unit } = item.progress;
  if (isSeasonal(item)) return `S${item.progress.season} · E${current} of ${total}`;
  if (unit === 'pages') return `${current} / ${total} pages`;
  if (unit === 'episodes') return `${current} / ${total} episodes`;
  if (unit === 'chapters') return `${current} / ${total} chapters`;
  if (unit === 'issues') return `${current} / ${total} issues`;
  if (unit === 'tracks') return `${current} / ${total} tracks`;
  if (unit === 'minutes' || unit === 'min') return `${current} / ${total} min`;
  if (unit === 'hours') return `${current} / ${total} hours`;
  return `${current} / ${total} ${unit}`;
}

export function compactProgress(item: MediaItem): string {
  const { current, total, unit } = item.progress;
  if (isSeasonal(item)) return `S${item.progress.season} · E${current} of ${total}`;
  if (unit === 'pages') return `${current} of ${total} pp.`;
  if (unit === 'episodes') return `Ep. ${current} of ${total}`;
  if (unit === 'chapters') return `Ch. ${current} of ${total}`;
  if (unit === 'issues') return `#${current} of ${total}`;
  if (unit === 'tracks') return `${current} of ${total} tracks`;
  if (unit === 'hours') return `${current} of ${total} hrs`;
  if (unit === 'minutes' || unit === 'min') return `${current} of ${total} min`;
  if (unit === 'percent') return `${current}% complete`;
  return `${current} of ${total}`;
}

/** Whether the series has more instalments left after the current one. */
export function hasMoreSeasons(item: MediaItem): boolean {
  return (
    isSeasonal(item) &&
    Boolean(item.progress.seasonsTotal) &&
    (item.progress.season ?? 1) < (item.progress.seasonsTotal ?? 1)
  );
}

export function remainingLabel(item: MediaItem): string {
  const { current, total, unit } = item.progress;
  const left = Math.max(0, total - current);
  if (isSeasonal(item)) {
    return left === 0
      ? hasMoreSeasons(item)
        ? `Season ${item.progress.season} finished`
        : 'Series complete'
      : `${left} episode${left === 1 ? '' : 's'} left in season ${item.progress.season}`;
  }
  if (unit === 'minutes' || unit === 'min') {
    if (left >= 60) {
      const h = Math.floor(left / 60);
      const m = left % 60;
      return `${h}h ${m ? `${m}m ` : ''}left`;
    }
    return `${left} min left`;
  }
  if (unit === 'episodes') return `${left} episode${left === 1 ? '' : 's'} left`;
  if (unit === 'pages') return `${left} pages left`;
  if (unit === 'chapters') return `${left} chapter${left === 1 ? '' : 's'} left`;
  if (unit === 'tracks') return `${left} track${left === 1 ? '' : 's'} left`;
  if (unit === 'hours') return `${left} hrs left`;
  return `${left} ${unit} left`;
}

export function progressStep(item: MediaItem): number {
  if (item.progress.unit === 'pages') return 10;
  if (item.progress.unit === 'min' || item.progress.unit === 'minutes') return 10;
  if (item.progress.unit === 'hours') return 1;
  return 1;
}

export function formatMinutes(minutes: number | undefined): string {
  if (!minutes) return '0m';
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

export function formatHours(minutes: number): string {
  const hours = minutes / 60;
  if (hours >= 100) return `${Math.round(hours).toLocaleString()}h`;
  return `${hours.toFixed(1).replace('.0', '')}h`;
}

export function formatCompactNumber(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace('.0', '')}k`;
  return value.toLocaleString();
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function dateKey(input: string | Date = new Date()): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function todayKey(date = new Date()): string {
  return dateKey(date);
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function longDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const PALETTES: CoverArt[] = [
  { pattern: 'sun', a: '#bb6a41', b: '#f2d49b', c: '#27170f' },
  { pattern: 'wave', a: '#243f61', b: '#a8c4d4', c: '#f2e9d8' },
  { pattern: 'stripe', a: '#191a17', b: '#d9ee70', c: '#f3eddc' },
  { pattern: 'slash', a: '#c84c37', b: '#efd9bd', c: '#2a1610' },
  { pattern: 'rings', a: '#584472', b: '#dcb8cb', c: '#f7edf2' },
  { pattern: 'bloom', a: '#304d40', b: '#c4d0a5', c: '#f0ead8' },
  { pattern: 'grid', a: '#e2d7bf', b: '#b84b34', c: '#241f19' },
  { pattern: 'arch', a: '#18272a', b: '#79b2b6', c: '#e7eddf' },
  { pattern: 'orbit', a: '#2d3048', b: '#cf92aa', c: '#f0e9dc' },
  { pattern: 'type', a: '#c6d6d2', b: '#203a3d', c: '#162827' },
];

export const PATTERN_META: { pattern: ArtPattern; label: string }[] = [
  { pattern: 'sun', label: 'Sun' },
  { pattern: 'wave', label: 'Tide' },
  { pattern: 'stripe', label: 'Lines' },
  { pattern: 'slash', label: 'Cut' },
  { pattern: 'rings', label: 'Rings' },
  { pattern: 'bloom', label: 'Bloom' },
  { pattern: 'grid', label: 'Grid' },
  { pattern: 'arch', label: 'Arch' },
  { pattern: 'orbit', label: 'Orbit' },
  { pattern: 'type', label: 'Type' },
  { pattern: 'eclipse', label: 'Eclipse' },
  { pattern: 'monolith', label: 'Monolith' },
  { pattern: 'prism', label: 'Prism' },
  { pattern: 'ripple', label: 'Ripple' },
  { pattern: 'columns', label: 'Columns' },
  { pattern: 'cassette', label: 'Cassette' },
  { pattern: 'halftone', label: 'Halftone' },
  { pattern: 'burst', label: 'Burst' },
];

/** Rough wall-clock cost of moving one unit of progress, used for time logging. */
const MINUTES_PER_UNIT: Record<MediaType, number> = {
  movie: 1, // progress unit is already minutes
  show: 45,
  anime: 24,
  book: 1.5,
  comic: 5,
  manga: 4,
  music: 3.5,
  video: 1, // progress unit is already minutes
  game: 60, // progress unit is already hours
  podcast: 40,
};

export function minutesForProgress(type: MediaType, delta: number): number {
  if (!delta) return 0;
  const perUnit = MINUTES_PER_UNIT[type] ?? 1;
  return Math.max(0, Math.round(Math.abs(delta) * perUnit));
}

export function totalMinutes(timeLog: Record<string, number>): number {
  return Object.values(timeLog ?? {}).reduce((sum, minutes) => sum + minutes, 0);
}

/** Consecutive days with logged time, counting back from today (or yesterday). */
export function currentStreak(timeLog: Record<string, number>): number {
  const has = (key: string) => (timeLog?.[key] ?? 0) > 0;
  const cursor = new Date();
  if (!has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** The last `count` days ending today, oldest first, with their logged minutes. */
export function recentDays(timeLog: Record<string, number>, count: number) {
  const out: { key: string; date: Date; minutes: number }[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    out.push({ key: dateKey(date), date, minutes: timeLog?.[dateKey(date)] ?? 0 });
  }
  return out;
}

export function addMinutes(timeLog: Record<string, number>, key: string, minutes: number) {
  if (!minutes) return timeLog;
  return { ...timeLog, [key]: (timeLog?.[key] ?? 0) + minutes };
}

/* ---------------- Shareable library URLs ---------------- */

export interface LibraryQuery {
  q: string;
  status: string;
  type: string;
  sort: string;
  view: string;
  creator: string;
}

export const EMPTY_LIBRARY_QUERY: LibraryQuery = {
  q: '',
  status: 'all',
  type: 'all',
  sort: 'recent',
  view: 'grid',
  creator: '',
};

/** Read `#/library?q=…&status=…` back into filter state. */
export function parseLibraryQuery(hash: string): LibraryQuery {
  const [, queryString = ''] = hash.split('?');
  const params = new URLSearchParams(queryString);
  return {
    q: params.get('q') ?? '',
    status: params.get('status') ?? 'all',
    type: params.get('type') ?? 'all',
    sort: params.get('sort') ?? 'recent',
    view: params.get('view') ?? 'grid',
    creator: params.get('creator') ?? '',
  };
}

export function buildLibraryHash(query: LibraryQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.status && query.status !== 'all') params.set('status', query.status);
  if (query.type && query.type !== 'all') params.set('type', query.type);
  if (query.sort && query.sort !== 'recent') params.set('sort', query.sort);
  if (query.view && query.view !== 'grid') params.set('view', query.view);
  if (query.creator) params.set('creator', query.creator);
  const encoded = params.toString();
  return encoded ? `#/library?${encoded}` : '#/library';
}

export function avgRating(items: MediaItem[]): number {
  const rated = items.filter((item) => item.rating !== null);
  if (!rated.length) return 0;
  return rated.reduce((sum, item) => sum + (item.rating ?? 0), 0) / rated.length;
}

export function isThisYear(iso: string | undefined): boolean {
  if (!iso) return false;
  return new Date(iso).getFullYear() === new Date().getFullYear();
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
