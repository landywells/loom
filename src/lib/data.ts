import type { Activity, AppData, Collection, DiscoveryItem, MediaItem } from '../types';
import { dateKey, todayKey } from './utils';

const DAY = 86_400_000;
const isoDaysAgo = (days: number, hours = 0) =>
  new Date(Date.now() - days * DAY - hours * 3_600_000).toISOString();

const items: MediaItem[] = [
  {
    id: 'dune-two',
    title: 'Dune: Part Two',
    creator: 'Denis Villeneuve',
    type: 'movie',
    year: 2024,
    status: 'active',
    rating: 4.5,
    favorite: true,
    progress: { current: 112, total: 166, unit: 'min' },
    genres: ['Sci-fi', 'Epic'],
    tags: ['desert', 'rewatch', 'big screen'],
    notes: 'That worm-riding sequence is still unmatched. Rewatching in two sittings.',
    blurb: 'Paul Atreides unites with the Fremen while seeking revenge against the conspirators who destroyed his family.',
    art: { pattern: 'sun', a: '#bb6a41', b: '#f2d49b', c: '#f7ead6' },
    addedAt: isoDaysAgo(21),
    minutesSpent: 112,
  },
  {
    id: 'tomorrow-x3',
    title: 'Tomorrow, and Tomorrow, and Tomorrow',
    creator: 'Gabrielle Zevin',
    type: 'book',
    year: 2022,
    status: 'active',
    rating: 4.5,
    favorite: true,
    progress: { current: 212, total: 416, unit: 'pages' },
    genres: ['Literary fiction', 'Drama'],
    tags: ['friendship', 'games', 'book club'],
    notes: 'The kind of book that makes the train ride feel too short.',
    blurb: 'Two friends find their partnership and creative spark through the art of making video games.',
    art: { pattern: 'wave', a: '#2650a8', b: '#f59a77', c: '#f8f1e0' },
    addedAt: isoDaysAgo(18),
    minutesSpent: 340,
  },
  {
    id: 'the-bear',
    title: 'The Bear',
    creator: 'Christopher Storer',
    type: 'show',
    year: 2024,
    status: 'active',
    rating: 4.5,
    favorite: false,
    progress: { current: 4, total: 10, unit: 'episodes', season: 3, seasonsTotal: 4 },
    genres: ['Drama', 'Comedy'],
    tags: ['kitchen', 'pressure', 'season three'],
    notes: '',
    blurb: 'A young chef returns home to run his family sandwich shop, finding chaos, grief, and grace.',
    art: { pattern: 'stripe', a: '#b93f27', b: '#f2e0c2', c: '#f8eddc' },
    addedAt: isoDaysAgo(30),
    minutesSpent: 200,
  },
  {
    id: 'chainsaw-man',
    title: 'Chainsaw Man',
    creator: 'Tatsuki Fujimoto',
    type: 'manga',
    year: 2018,
    status: 'active',
    rating: 4,
    favorite: false,
    progress: { current: 64, total: 97, unit: 'chapters' },
    genres: ['Action', 'Horror'],
    tags: ['dark comedy', 'devils'],
    notes: '',
    blurb: 'A broke young man merges with a chainsaw devil and is recruited into a world of devil hunters.',
    art: { pattern: 'slash', a: '#191919', b: '#d93f2d', c: '#f4ead9' },
    addedAt: isoDaysAgo(45),
    minutesSpent: 240,
  },
  {
    id: 'past-lives',
    title: 'Past Lives',
    creator: 'Celine Song',
    type: 'movie',
    year: 2023,
    status: 'done',
    rating: 5,
    favorite: true,
    progress: { current: 105, total: 105, unit: 'min' },
    genres: ['Romance', 'Drama'],
    tags: ['quiet', 'bittersweet', 'rewatch'],
    notes: 'The final sidewalk shot demolished me. Again.',
    blurb: 'Two childhood friends reunite in New York two decades after their lives diverged.',
    art: { pattern: 'rings', a: '#273e57', b: '#d7aa83', c: '#f3e7d7' },
    addedAt: isoDaysAgo(90),
    finishedAt: isoDaysAgo(1, 3),
    minutesSpent: 105,
  },
  {
    id: 'blonde-album',
    title: 'Blonde',
    creator: 'Frank Ocean',
    type: 'music',
    year: 2016,
    status: 'active',
    rating: 5,
    favorite: true,
    progress: { current: 9, total: 17, unit: 'tracks' },
    genres: ['R&B', 'Alternative'],
    tags: ['late night', 'headphones', 'rain'],
    notes: '',
    blurb: 'A patient, impressionistic album about memory, longing, and reinvention.',
    art: { pattern: 'bloom', a: '#dec75a', b: '#e58254', c: '#2f230e' },
    addedAt: isoDaysAgo(200),
    minutesSpent: 26,
  },
  {
    id: 'interstellar',
    title: 'Interstellar',
    creator: 'Christopher Nolan',
    type: 'movie',
    year: 2014,
    status: 'done',
    rating: 5,
    favorite: true,
    progress: { current: 169, total: 169, unit: 'min' },
    genres: ['Sci-fi', 'Drama'],
    tags: ['space', 'rewatch', 'IMAX'],
    notes: 'Still the best docking scene in cinema, sorry.',
    blurb: 'A team of explorers travel through a wormhole in search of a new home for humanity.',
    art: { pattern: 'orbit', a: '#0f161b', b: '#d3dfe1', c: '#f3eee2' },
    addedAt: isoDaysAgo(365),
    finishedAt: isoDaysAgo(45),
    minutesSpent: 169,
  },
  {
    id: 'three-body',
    title: 'The Three-Body Problem',
    creator: 'Cixin Liu',
    type: 'book',
    year: 2008,
    status: 'done',
    rating: 4.5,
    favorite: false,
    progress: { current: 336, total: 336, unit: 'pages' },
    genres: ['Sci-fi', 'Epic'],
    tags: ['hard sci-fi', 'translated'],
    notes: '',
    blurb: 'A secret military project sends signals into space, setting humanity on a collision course with another world.',
    art: { pattern: 'grid', a: '#861e16', b: '#e5cba8', c: '#f6efdf' },
    addedAt: isoDaysAgo(112),
    finishedAt: isoDaysAgo(28),
    minutesSpent: 480,
  },
  {
    id: 'saga-one',
    title: 'Saga, Vol. 1',
    creator: 'Brian K. Vaughan',
    type: 'comic',
    year: 2012,
    status: 'backlog',
    rating: null,
    favorite: false,
    progress: { current: 0, total: 6, unit: 'issues' },
    genres: ['Sci-fi', 'Adventure'],
    tags: ['space opera', 'borrowed'],
    notes: 'Maya said to read this immediately.',
    blurb: 'A star-crossed couple from warring races flee across the galaxy with their newborn daughter.',
    art: { pattern: 'arch', a: '#d95b3f', b: '#f0c949', c: '#20201b' },
    addedAt: isoDaysAgo(6),
    minutesSpent: 0,
  },
  {
    id: 'last-of-us',
    title: 'The Last of Us',
    creator: 'Craig Mazin',
    type: 'show',
    year: 2023,
    status: 'paused',
    rating: 4,
    favorite: false,
    progress: { current: 5, total: 9, unit: 'episodes', season: 1, seasonsTotal: 2 },
    genres: ['Drama', 'Thriller'],
    tags: ['post-apocalyptic', 'story mode'],
    notes: '',
    blurb: 'A hardened survivor escorts a teenage girl across a post-apocalyptic America.',
    art: { pattern: 'bloom', a: '#3d4b39', b: '#b3c29c', c: '#ece3ce' },
    addedAt: isoDaysAgo(75),
    minutesSpent: 240,
  },
  {
    id: 'veritasium-video',
    title: 'The Strange Physics of Nothing',
    creator: 'Veritasium',
    type: 'video',
    year: 2025,
    status: 'done',
    rating: 5,
    favorite: false,
    progress: { current: 24, total: 24, unit: 'min' },
    genres: ['Science', 'Education'],
    tags: ['physics', 'rabbit hole'],
    notes: '',
    blurb: 'Empty space might be the most complicated thing in the universe.',
    art: { pattern: 'grid', a: '#0d2943', b: '#5b99ba', c: '#e9f1e7' },
    addedAt: isoDaysAgo(9),
    finishedAt: isoDaysAgo(7),
    minutesSpent: 24,
  },
  {
    id: 'elden-ring',
    title: 'Elden Ring',
    creator: 'FromSoftware',
    type: 'game',
    year: 2022,
    status: 'active',
    rating: 4.5,
    favorite: false,
    progress: { current: 42, total: 80, unit: 'hours' },
    genres: ['RPG', 'Open world'],
    tags: ['soulslike', 'co-op', 'exploration'],
    notes: 'Heading north. Absolutely terrified of everything.',
    blurb: 'A Tarnished travels the Lands Between to mend the shattered Elden Ring and become Elden Lord.',
    art: { pattern: 'rings', a: '#1a1815', b: '#b3955f', c: '#eee2ca' },
    addedAt: isoDaysAgo(67),
    minutesSpent: 2520,
  },
  {
    id: 'nineteen-eighty-nine',
    title: '1989 (Taylor’s Version)',
    creator: 'Taylor Swift',
    type: 'music',
    year: 2023,
    status: 'active',
    rating: 4.5,
    favorite: true,
    progress: { current: 13, total: 22, unit: 'tracks' },
    genres: ['Pop', 'Synth-pop'],
    tags: ['windows down', 'singalong'],
    notes: '',
    blurb: 'The pop reinvention, rebuilt with vault tracks and maximalist synth shine.',
    art: { pattern: 'type', a: '#b9d4de', b: '#eef1e7', c: '#263136' },
    addedAt: isoDaysAgo(54),
    minutesSpent: 42,
  },
  {
    id: 'perfume',
    title: 'Perfume',
    creator: 'Patrick Süskind',
    type: 'book',
    year: 1985,
    status: 'done',
    rating: 4.5,
    favorite: false,
    progress: { current: 272, total: 272, unit: 'pages' },
    genres: ['Historical', 'Thriller'],
    tags: ['translated', 'dark'],
    notes: '',
    blurb: 'In eighteenth-century France, a scent-obsessed outsider becomes the world’s finest perfumer.',
    art: { pattern: 'bloom', a: '#46283b', b: '#cba5b4', c: '#f6eade' },
    addedAt: isoDaysAgo(180),
    finishedAt: isoDaysAgo(91),
    minutesSpent: 360,
  },
  {
    id: 'spider-verse',
    title: 'Across the Spider-Verse',
    creator: 'Joaquim Dos Santos',
    type: 'movie',
    year: 2023,
    status: 'done',
    rating: 5,
    favorite: true,
    progress: { current: 140, total: 140, unit: 'min' },
    genres: ['Animation', 'Action'],
    tags: ['kinetic', 'rewatch', 'visual feast'],
    notes: '',
    blurb: 'Miles Morales is catapulted across the multiverse and must redefine what it means to be a hero.',
    art: { pattern: 'stripe', a: '#d53a5c', b: '#5b9bd0', c: '#fff3dd' },
    addedAt: isoDaysAgo(160),
    finishedAt: isoDaysAgo(12),
    minutesSpent: 140,
  },
  {
    id: 'severance',
    title: 'Severance',
    creator: 'Dan Erickson',
    type: 'show',
    year: 2022,
    status: 'backlog',
    rating: null,
    favorite: false,
    progress: { current: 0, total: 9, unit: 'episodes', season: 1, seasonsTotal: 2 },
    genres: ['Sci-fi', 'Mystery'],
    tags: ['office', 'mystery box'],
    notes: '',
    blurb: 'Office workers undergo a procedure that severs their work memories from their personal lives.',
    art: { pattern: 'grid', a: '#1a3737', b: '#e25742', c: '#f0e9da' },
    addedAt: isoDaysAgo(14),
    minutesSpent: 0,
  },
  {
    id: 'berserk',
    title: 'Berserk, Vol. 1',
    creator: 'Kentaro Miura',
    type: 'manga',
    year: 1990,
    status: 'done',
    rating: 5,
    favorite: true,
    progress: { current: 224, total: 224, unit: 'chapters' },
    genres: ['Dark fantasy', 'Action'],
    tags: ['classic', 'ink'],
    notes: 'Miura’s linework is absurd. In the best way.',
    blurb: 'A lone mercenary wanders a brutal world of demons, kingdoms, and impossible choices.',
    art: { pattern: 'slash', a: '#2c2721', b: '#b39465', c: '#eedfc3' },
    addedAt: isoDaysAgo(300),
    finishedAt: isoDaysAgo(61),
    minutesSpent: 200,
  },
  {
    id: 'boy-heron',
    title: 'The Boy and the Heron',
    creator: 'Hayao Miyazaki',
    type: 'movie',
    year: 2023,
    status: 'backlog',
    rating: null,
    favorite: false,
    progress: { current: 0, total: 124, unit: 'min' },
    genres: ['Animation', 'Fantasy'],
    tags: ['Ghibli', 'sunday'],
    notes: '',
    blurb: 'A young boy discovers a hidden world after his mother’s death and his family’s move to the countryside.',
    art: { pattern: 'arch', a: '#283a4d', b: '#d6b889', c: '#f0e5cf' },
    addedAt: isoDaysAgo(2, 4),
    minutesSpent: 0,
  },
  {
    id: 'anthropocene',
    title: 'The Anthropocene Reviewed',
    creator: 'John Green',
    type: 'book',
    year: 2021,
    status: 'paused',
    rating: 4,
    favorite: false,
    progress: { current: 88, total: 304, unit: 'pages' },
    genres: ['Essays', 'Non-fiction'],
    tags: ['gentle', 'bedside'],
    notes: '',
    blurb: 'The author reviews facets of the human-centered planet on a five-star scale.',
    art: { pattern: 'sun', a: '#7e4438', b: '#e3b38f', c: '#f8ede1' },
    addedAt: isoDaysAgo(120),
    minutesSpent: 90,
  },
  {
    id: 'nerdwriter-video',
    title: 'The Art of the Opening Shot',
    creator: 'Nerdwriter1',
    type: 'video',
    year: 2024,
    status: 'done',
    rating: 4.5,
    favorite: false,
    progress: { current: 8, total: 8, unit: 'min' },
    genres: ['Film', 'Video essay'],
    tags: ['craft', 'short'],
    notes: '',
    blurb: 'How a single frame can tell you everything you need to know about the next two hours.',
    art: { pattern: 'slash', a: '#202a35', b: '#d7a764', c: '#f1eadf' },
    addedAt: isoDaysAgo(5),
    finishedAt: isoDaysAgo(4),
    minutesSpent: 8,
  },
  {
    id: 'search-engine',
    title: 'Search Engine',
    creator: 'PJ Vogt',
    type: 'podcast',
    year: 2024,
    status: 'active',
    rating: 4.5,
    favorite: false,
    progress: { current: 5, total: 8, unit: 'episodes' },
    genres: ['Technology', 'Society'],
    tags: ['curiosity', 'commute'],
    notes: '',
    blurb: 'A podcast about big questions, weird corners of the internet, and satisfying answers.',
    art: { pattern: 'type', a: '#d4ded8', b: '#33475f', c: '#1d2b33' },
    addedAt: isoDaysAgo(26),
    minutesSpent: 190,
  },
  {
    id: 'cowboy-bebop',
    title: 'Cowboy Bebop',
    creator: 'Shinichirō Watanabe',
    type: 'anime',
    year: 1998,
    status: 'done',
    rating: 5,
    favorite: true,
    progress: { current: 26, total: 26, unit: 'episodes', season: 1, seasonsTotal: 1 },
    genres: ['Sci-fi', 'Action'],
    tags: ['jazz', 'classic', 'space western'],
    notes: 'See you, space cowboy.',
    blurb: 'A ragtag crew of bounty hunters chase criminals across the solar system, and their own pasts.',
    art: { pattern: 'orbit', a: '#1a2340', b: '#d2623f', c: '#f1e3c3' },
    addedAt: isoDaysAgo(400),
    finishedAt: '2025-11-18T20:30:00.000Z',
    minutesSpent: 600,
  },
  {
    id: 'bewitched',
    title: 'Bewitched',
    creator: 'Laufey',
    type: 'music',
    year: 2023,
    status: 'active',
    rating: 4,
    favorite: false,
    progress: { current: 4, total: 14, unit: 'tracks' },
    genres: ['Jazz', 'Pop'],
    tags: ['rainy day', 'strings'],
    notes: '',
    blurb: 'Velvet-voiced jazz-pop for candlelight, rain, and staring out of windows.',
    art: { pattern: 'wave', a: '#b1c5c2', b: '#f1d3b4', c: '#26342f' },
    addedAt: isoDaysAgo(44),
    minutesSpent: 35,
  },
  {
    id: 'vinland-saga',
    title: 'Vinland Saga',
    creator: 'Makoto Yukimura',
    type: 'manga',
    year: 2005,
    status: 'backlog',
    rating: null,
    favorite: false,
    progress: { current: 0, total: 200, unit: 'chapters' },
    genres: ['Historical', 'Action'],
    tags: ['vikings', 'long read'],
    notes: '',
    blurb: 'A young Viking pursues revenge, then something far harder to find: peace.',
    art: { pattern: 'slash', a: '#2b3b31', b: '#b9986c', c: '#eee4d2' },
    addedAt: isoDaysAgo(33),
    minutesSpent: 0,
  },
  {
    id: 'white-lotus',
    title: 'The White Lotus',
    creator: 'Mike White',
    type: 'show',
    year: 2025,
    status: 'paused',
    rating: 4,
    favorite: false,
    progress: { current: 2, total: 8, unit: 'episodes', season: 3, seasonsTotal: 3 },
    genres: ['Satire', 'Drama'],
    tags: ['resort', 'ensemble'],
    notes: '',
    blurb: 'Guests and staff at an exclusive resort reveal their subtly catastrophic inner lives.',
    art: { pattern: 'grid', a: '#d9c7a8', b: '#d76545', c: '#2d2118' },
    addedAt: isoDaysAgo(80),
    minutesSpent: 120,
  },
  {
    id: 'aftersun',
    title: 'Aftersun',
    creator: 'Charlotte Wells',
    type: 'movie',
    year: 2022,
    status: 'done',
    rating: 4.5,
    favorite: false,
    progress: { current: 102, total: 102, unit: 'min' },
    genres: ['Drama'],
    tags: ['memory', 'devastating', 'quiet'],
    notes: '',
    blurb: 'Twenty years later, Sophie reflects on a summer holiday with her young father.',
    art: { pattern: 'rings', a: '#325f6f', b: '#e7b4a0', c: '#f5e9dd' },
    addedAt: isoDaysAgo(70),
    finishedAt: isoDaysAgo(5),
    minutesSpent: 102,
  },
  {
    id: 'creative-act',
    title: 'The Creative Act',
    creator: 'Rick Rubin',
    type: 'book',
    year: 2023,
    status: 'backlog',
    rating: null,
    favorite: false,
    progress: { current: 0, total: 432, unit: 'pages' },
    genres: ['Creativity', 'Non-fiction'],
    tags: ['studio', 'slow read'],
    notes: '',
    blurb: 'A meditative field guide to the daily practice of making things, from an unlikely studio legend.',
    art: { pattern: 'type', a: '#ece4d4', b: '#1f1d1a', c: '#1c1a17' },
    addedAt: isoDaysAgo(17),
    minutesSpent: 0,
  },
  {
    id: 'argylle',
    title: 'Argylle',
    creator: 'Matthew Vaughn',
    type: 'movie',
    year: 2024,
    status: 'dropped',
    rating: 1.5,
    favorite: false,
    progress: { current: 40, total: 139, unit: 'min' },
    genres: ['Action', 'Comedy'],
    tags: ['not for me'],
    notes: 'Not every night needs a finishing credit.',
    blurb: 'A reclusive spy novelist is drawn into the real world of espionage.',
    art: { pattern: 'stripe', a: '#db6e7c', b: '#f1d8c4', c: '#32161b' },
    addedAt: isoDaysAgo(100),
    minutesSpent: 40,
  },
];

const collections: Collection[] = [
  {
    id: 'sunday-slowly',
    name: 'Sunday, slowly',
    description: 'Stories with long shadows, soft edges, and nowhere else to be.',
    itemIds: ['past-lives', 'tomorrow-x3', 'perfume', 'aftersun', 'boy-heron'],
    accent: '#d9c7a8',
  },
  {
    id: 'big-ideas',
    name: 'Big ideas, bigger feelings',
    description: 'The ones that rearranged a room in my head.',
    itemIds: ['interstellar', 'three-body', 'elden-ring', 'cowboy-bebop', 'berserk'],
    accent: '#283a4d',
  },
  {
    id: 'no-skip',
    name: 'Start to finish, no skip',
    description: 'Records and films that get the whole thing, every time.',
    itemIds: ['nineteen-eighty-nine', 'blonde-album', 'spider-verse', 'dune-two', 'bewitched'],
    accent: '#c4a66c',
  },
];


const activities: Activity[] = [
  {
    id: 'a-1',
    itemId: 'the-bear',
    itemTitle: 'The Bear',
    type: 'show',
    kind: 'progress',
    label: 'Watched episode 4',
    at: isoDaysAgo(0, 2),
  },
  {
    id: 'a-2',
    itemId: 'tomorrow-x3',
    itemTitle: 'Tomorrow, and Tomorrow, and Tomorrow',
    type: 'book',
    kind: 'progress',
    label: 'Read 24 pages',
    at: isoDaysAgo(0, 5),
  },
  {
    id: 'a-3',
    itemId: 'past-lives',
    itemTitle: 'Past Lives',
    type: 'movie',
    kind: 'finished',
    label: 'Finished the film · ★ 5.0',
    at: isoDaysAgo(1, 3),
  },
  {
    id: 'a-4',
    itemId: 'boy-heron',
    itemTitle: 'The Boy and the Heron',
    type: 'movie',
    kind: 'added',
    label: 'Added to the watchlist',
    at: isoDaysAgo(2, 4),
  },
  {
    id: 'a-5',
    itemId: 'dune-two',
    itemTitle: 'Dune: Part Two',
    type: 'movie',
    kind: 'rated',
    label: 'Rated it 4.5 stars',
    at: isoDaysAgo(2, 8),
  },
  {
    id: 'a-6',
    itemId: 'nineteen-eighty-nine',
    itemTitle: '1989 (Taylor’s Version)',
    type: 'music',
    kind: 'favorited',
    label: 'Moved to favorites',
    at: isoDaysAgo(3, 1),
  },
  {
    id: 'a-7',
    itemId: 'nerdwriter-video',
    itemTitle: 'The Art of the Opening Shot',
    type: 'video',
    kind: 'finished',
    label: 'Finished watching',
    at: isoDaysAgo(3, 6),
  },
  {
    id: 'a-8',
    itemId: 'elden-ring',
    itemTitle: 'Elden Ring',
    type: 'game',
    kind: 'progress',
    label: 'Played for 2 hours',
    at: isoDaysAgo(4, 2),
  },
  {
    id: 'a-9',
    itemId: 'aftersun',
    itemTitle: 'Aftersun',
    type: 'movie',
    kind: 'finished',
    label: 'Finished the film · ★ 4.5',
    at: isoDaysAgo(5, 4),
  },
  {
    id: 'a-10',
    itemId: 'saga-one',
    itemTitle: 'Saga, Vol. 1',
    type: 'comic',
    kind: 'added',
    label: 'Added to the reading stack',
    at: isoDaysAgo(6, 3),
  },
  {
    id: 'a-11',
    itemId: 'search-engine',
    itemTitle: 'Search Engine',
    type: 'podcast',
    kind: 'progress',
    label: 'Listened to an episode',
    at: isoDaysAgo(6, 7),
  },
  {
    id: 'a-12',
    itemId: 'perfume',
    itemTitle: 'Perfume',
    type: 'book',
    kind: 'finished',
    label: 'Turned the final page',
    at: isoDaysAgo(8, 2),
  },
];

export const discovery: DiscoveryItem[] = [
  {
    id: 'disc-poor-things',
    title: 'Poor Things',
    creator: 'Yorgos Lanthimos',
    type: 'movie',
    year: 2023,
    rating: 4.7,
    art: { pattern: 'bloom', a: '#7c3e35', b: '#e8c387', c: '#f8eedf' },
    blurb: 'A fantastical tale of self-discovery, stitched together with wild production design and a fearless lead performance.',
    tags: ['Surreal', 'Dark comedy'],
  },
  {
    id: 'disc-shogun',
    title: 'Shōgun',
    creator: 'Rachel Kondo',
    type: 'show',
    year: 2024,
    rating: 4.8,
    art: { pattern: 'sun', a: '#1b2926', b: '#c4a66c', c: '#e9dfc7' },
    blurb: 'A striking, patient epic of power and translation in feudal Japan. Every frame looks carved by hand.',
    tags: ['Historical', 'Epic'],
  },
  {
    id: 'disc-piranesi',
    title: 'Piranesi',
    creator: 'Susanna Clarke',
    type: 'book',
    year: 2020,
    rating: 4.6,
    art: { pattern: 'arch', a: '#52665f', b: '#d7c7a5', c: '#f5ecdc' },
    blurb: 'A strange, luminous novel about a man who lives in an infinite house filled with tides and statues.',
    tags: ['Literary fantasy', 'Under 300 pages'],
  },
  {
    id: 'disc-blue-eye',
    title: 'Blue Eye Samurai',
    creator: 'Amber Noizumi',
    type: 'anime',
    year: 2023,
    rating: 4.8,
    art: { pattern: 'slash', a: '#1b2534', b: '#d45f3d', c: '#ede2cf' },
    blurb: 'A masterful, blood-soaked revenge story with some of the most confident animation in recent memory.',
    tags: ['Revenge', 'Gorgeous'],
  },
  {
    id: 'disc-silksong',
    title: 'Hollow Knight: Silksong',
    creator: 'Team Cherry',
    type: 'game',
    year: 2026,
    rating: 4.9,
    art: { pattern: 'orbit', a: '#16333b', b: '#cde1d8', c: '#e6efe6' },
    blurb: 'A hand-drawn metroidvania about a deadly pilgrim in a kingdom woven from silk and song.',
    tags: ['Metroidvania', 'Soon'],
  },
  {
    id: 'disc-tv-glow',
    title: 'I Saw the TV Glow',
    creator: 'Jane Schoenbrun',
    type: 'movie',
    year: 2024,
    rating: 4.3,
    art: { pattern: 'rings', a: '#5b3d84', b: '#e27a8e', c: '#f1e9f5' },
    blurb: 'A woozy, neon-soaked story about the television we use to find ourselves, and what happens when it ends.',
    tags: ['A24', 'Dreamlike'],
  },
  {
    id: 'disc-substance',
    title: 'The Substance',
    creator: 'Coralie Fargeat',
    type: 'movie',
    year: 2024,
    rating: 4.2,
    art: { pattern: 'stripe', a: '#d2e84f', b: '#1a1b16', c: '#1a1b16' },
    blurb: 'A savagely funny body-horror spectacle about the impossible standards we ask of ourselves.',
    tags: ['Body horror', 'Bold'],
  },
  {
    id: 'disc-invisible-cities',
    title: 'Invisible Cities',
    creator: 'Italo Calvino',
    type: 'book',
    year: 1974,
    rating: 4.8,
    art: { pattern: 'grid', a: '#b7a584', b: '#3d4247', c: '#25231f' },
    blurb: 'A travelogue of impossible cities, each one a small mirror held up to memory, desire, and time.',
    tags: ['Classic', 'Prose poetry'],
  },
  {
    id: 'disc-gnx',
    title: 'GNX',
    creator: 'Kendrick Lamar',
    type: 'music',
    year: 2024,
    rating: 4.5,
    art: { pattern: 'type', a: '#d9d2c2', b: '#b63e2f', c: '#201d18' },
    blurb: 'A lean, restless record full of sharp turns, stacked voices, and no wasted bars.',
    tags: ['Hip-hop', 'Front to back'],
  },
  {
    id: 'disc-wild-robot',
    title: 'The Wild Robot',
    creator: 'Chris Sanders',
    type: 'movie',
    year: 2024,
    rating: 4.4,
    art: { pattern: 'wave', a: '#d59c6c', b: '#3d6d67', c: '#25332e' },
    blurb: 'An exquisitely painted story about tenderness learning to survive in a very wild world.',
    tags: ['Animation', 'Family'],
  },
  {
    id: 'disc-slow-horses',
    title: 'Slow Horses',
    creator: 'Will Smith',
    type: 'show',
    year: 2022,
    rating: 4.7,
    art: { pattern: 'grid', a: '#343d3b', b: '#c09a56', c: '#eee6d7' },
    blurb: 'The best spy show on television, powered by sharp dialogue and Gary Oldman at his most gloriously unkempt.',
    tags: ['Spy thriller', 'British'],
  },
  {
    id: 'disc-daily',
    title: 'The Daily',
    creator: 'The New York Times',
    type: 'podcast',
    year: 2017,
    rating: 4.4,
    art: { pattern: 'type', a: '#e9e2d3', b: '#1e3654', c: '#1e3654' },
    blurb: 'Twenty minutes of context on the day’s biggest story, delivered by people who know how to explain things.',
    tags: ['News', 'Daily listen'],
  },
];

/** Typical sitting length per format, so history looks like a person not a metronome. */
const SESSION_MINUTES: Record<string, number> = {
  movie: 110,
  show: 95,
  anime: 70,
  book: 35,
  comic: 15,
  manga: 20,
  music: 45,
  video: 25,
  game: 120,
  podcast: 40,
};

const MAX_MINUTES_PER_DAY = 300;

/** Stable 0-1 value for a date, so the seeded history is identical every load. */
function dayNoise(date: Date, salt: number) {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate() + salt * 7919;
  let h = (seed * 2654435761) % 4294967296;
  h = (h ^ (h >> 13)) * 1274126177;
  h = (h ^ (h >> 16)) >>> 0;
  return h / 4294967295;
}

/**
 * Spread each title's logged minutes over a believable set of sittings inside the
 * window it was active, weighted towards weekends. Filling consecutive days to a
 * cap produced a flat, obviously synthetic history, so days are skipped and
 * session lengths vary. The sum always equals the library's own minutesSpent,
 * which keeps the dashboard, heatmap and totals telling one story.
 */
export function buildTimeLog(list: MediaItem[]): Record<string, number> {
  const log: Record<string, number> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const [salt, item] of list.entries()) {
    let budget = item.minutesSpent ?? 0;
    if (budget <= 0) continue;

    const end = new Date(
      Math.min(item.finishedAt ? Date.parse(item.finishedAt) : today.getTime(), today.getTime()),
    );
    end.setHours(0, 0, 0, 0);
    const start = new Date(Date.parse(item.addedAt));
    start.setHours(0, 0, 0, 0);
    if (start > end) start.setTime(end.getTime());

    const windowDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY) + 1);
    const sitting = SESSION_MINUTES[item.type] ?? 45;
    const wanted = Math.max(1, Math.round(budget / sitting));
    // Use the title's whole life in the library rather than a compressed band
    // near its end date; compressing piled every item onto the same recent days.
    const from = windowDays > wanted * 3
      ? new Date(Math.max(start.getTime(), end.getTime() - wanted * 3 * DAY))
      : start;

    // Collect candidate days, keeping the ones the noise function lets through.
    const candidates: Date[] = [];
    for (const cursor = new Date(from); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const date = new Date(cursor);
      const weekend = date.getDay() === 0 || date.getDay() === 6;
      const roll = dayNoise(date, salt);
      if (roll < (weekend ? 0.5 : 0.26)) candidates.push(date);
    }
    if (!candidates.length) candidates.push(end);

    const share = budget / candidates.length;
    let remaining = budget;

    // Oldest first. Privileging the newest day is what pinned the whole recent
    // week to the cap; back-filling leaves recent days light unless they are
    // genuinely earned by an item still in progress.
    candidates.forEach((date, index) => {
      if (remaining <= 0) return;
      const key = dateKey(date);
      const room = MAX_MINUTES_PER_DAY - (log[key] ?? 0);
      if (room <= 0) return;
      const want =
        index === candidates.length - 1 ? remaining : Math.round(share * (0.6 + dayNoise(date, salt + index) * 0.8));
      const take = Math.max(0, Math.min(want, room, remaining));
      if (take > 0) {
        log[key] = (log[key] ?? 0) + take;
        remaining -= take;
      }
    });

    // Anything still unplaced goes to the oldest day that has room, anywhere in
    // the past year, rather than piling onto today.
    if (remaining > 0) {
      for (const cursor = new Date(from); cursor <= end && remaining > 0; cursor.setDate(cursor.getDate() + 1)) {
        const date = new Date(cursor);
        const key = dateKey(date);
        const room = MAX_MINUTES_PER_DAY - (log[key] ?? 0);
        if (room <= 0) continue;
        const take = Math.min(room, remaining);
        log[key] = (log[key] ?? 0) + take;
        remaining -= take;
      }
      if (remaining > 0) {
        const key = dateKey(end);
        log[key] = (log[key] ?? 0) + remaining;
      }
    }
  }

  return evenOutDays(log);
}

/**
 * No sane person spends a whole day on one format. Anything over the daily cap
 * is walked backwards into the nearest earlier day that still has room, so the
 * grand total is preserved without producing impossible days.
 */
function evenOutDays(log: Record<string, number>): Record<string, number> {
  const out = { ...log };
  for (const [key, minutes] of Object.entries(out)) {
    let excess = minutes - MAX_MINUTES_PER_DAY;
    if (excess <= 0) continue;
    out[key] = MAX_MINUTES_PER_DAY;
    const day = new Date(`${key}T12:00:00`);
    for (let back = 1; excess > 0 && back <= 21; back += 1) {
      const neighbour = new Date(day);
      neighbour.setDate(neighbour.getDate() - back);
      const nKey = dateKey(neighbour);
      const room = MAX_MINUTES_PER_DAY - (out[nKey] ?? 0);
      if (room <= 0) continue;
      const move = Math.min(room, excess);
      out[nKey] = (out[nKey] ?? 0) + move;
      excess -= move;
    }
    if (excess > 0) out[key] += excess;
  }
  return out;
}

export function createSeedData(): AppData {
  const seededItems = structuredClone(items);
  return {
    items: seededItems,
    collections: structuredClone(collections),
    activities: structuredClone(activities),
    reading: {
      date: todayKey(),
      pages: 18,
    },
    timeLog: buildTimeLog(seededItems),
  };
}

export const CURRENT_USER = {
  name: 'Alex',
  fullName: 'Alex Rivera',
  initials: 'AR',
};
