export type MediaType =
  | 'movie'
  | 'show'
  | 'anime'
  | 'book'
  | 'comic'
  | 'manga'
  | 'music'
  | 'video'
  | 'game'
  | 'podcast';

export type Status = 'active' | 'backlog' | 'paused' | 'done' | 'dropped';

export type ArtPattern =
  | 'sun'
  | 'wave'
  | 'stripe'
  | 'slash'
  | 'rings'
  | 'bloom'
  | 'grid'
  | 'arch'
  | 'orbit'
  | 'type';

export interface CoverArt {
  pattern: ArtPattern;
  a: string;
  b: string;
  c: string;
}

export interface MediaItem {
  id: string;
  title: string;
  creator: string;
  type: MediaType;
  year: number;
  status: Status;
  rating: number | null;
  favorite: boolean;
  progress: {
    current: number;
    total: number;
    unit: string;
    /** Only meaningful for episodic formats: which instalment you are on. */
    season?: number;
    /** How many instalments exist, so finishing a middle season is not "done". */
    seasonsTotal?: number;
  };
  genres: string[];
  tags: string[];
  notes: string;
  blurb: string;
  art: CoverArt;
  image?: string | null;
  addedAt: string;
  finishedAt?: string;
  minutesSpent?: number;
  discoveryId?: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  itemIds: string[];
  accent: string;
}

export type ActivityKind = 'added' | 'progress' | 'finished' | 'rated' | 'favorited' | 'note';

export interface Activity {
  id: string;
  itemId: string;
  itemTitle: string;
  type: MediaType;
  kind: ActivityKind;
  label: string;
  at: string;
}

export interface ReadingLog {
  date: string;
  pages: number;
}

export interface AppData {
  items: MediaItem[];
  collections: Collection[];
  activities: Activity[];
  reading: ReadingLog;
  /** Minutes actually spent, keyed by local date (YYYY-MM-DD). */
  timeLog: Record<string, number>;
}

export interface DiscoveryItem {
  id: string;
  title: string;
  creator: string;
  type: MediaType;
  year: number;
  rating: number;
  art: CoverArt;
  blurb: string;
  tags: string[];
}

export type Page = 'overview' | 'library' | 'discover' | 'collections' | 'insights';

export type Theme = 'light' | 'dark';
