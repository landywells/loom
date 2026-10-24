import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import type {
  Activity,
  ActivityKind,
  AppData,
  Collection,
  DiscoveryItem,
  MediaItem,
  MediaType,
  Page,
  Status,
  Theme,
} from './types';
import { buildTimeLog, createSeedData, discovery } from './lib/data';
import {
  TYPE_META,
  addMinutes,
  currentStreak,
  hasMoreSeasons,
  minutesForProgress,
  progressStep,
  SHORTCUT_MOD,
  statusLabel,
  todayKey,
  uid,
} from './lib/utils';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Dashboard } from './components/Dashboard';
import { Library } from './components/Library';
import { Discover } from './components/Discover';
import { Collections } from './components/Collections';
import { Insights } from './components/Insights';
import { ItemDrawer } from './components/ItemDrawer';
import { ItemForm } from './components/ItemForm';
import { CollectionForm } from './components/CollectionForm';
import { CommandPalette } from './components/CommandPalette';
import { TitleBar } from './components/TitleBar';
import { hasWindowChrome, isDesktop, notify, onMenuCommand, setWindowTheme, type MenuCommand } from './lib/desktop';
import { ShortcutSheet } from './components/ShortcutSheet';
import { backfillStamps, mergeLibrary, stampRevisions, type Revisions } from './lib/sync';

const DATA_KEY = 'loom.library.v1';
const THEME_KEY = 'loom.theme.v1';
const VALID_PAGES: Page[] = ['overview', 'library', 'discover', 'collections', 'insights'];

const PAGE_TITLES: Record<Page, string> = {
  overview: 'Overview',
  library: 'The library',
  discover: 'Discover',
  collections: 'Collections',
  insights: 'Insights',
};

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (Array.isArray(parsed.items) && Array.isArray(parsed.collections)) {
        // Libraries saved before time tracking existed get a history derived
        // from the titles already in them, so nothing shows up as zero.
        if (!parsed.timeLog) parsed.timeLog = buildTimeLog(parsed.items);
        return backfillStamps(parsed);
      }
    }
  } catch {
    // A corrupted local file should never block the library from opening.
  }
  return backfillStamps(createSeedData());
}

function loadTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'dark' ? 'dark' : 'light';
}

function pageFromHash(): Page {
  // Strip any filter query: `#/library?status=active` is still the library page.
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  return VALID_PAGES.includes(raw as Page) ? (raw as Page) : 'overview';
}

interface Toast {
  id: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface FormState {
  item?: MediaItem;
  initialType?: MediaType;
}

function makeActivity(item: MediaItem, kind: ActivityKind, label: string): Activity {
  return {
    id: uid('event'),
    itemId: item.id,
    itemTitle: item.title,
    type: item.type,
    kind,
    label,
    at: new Date().toISOString(),
  };
}

function App() {
  const [data, setData] = useState<AppData>(loadData);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [page, setPage] = useState<Page>(pageFromHash);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [collectionForm, setCollectionForm] = useState<Collection | 'new' | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimers = useRef<number[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [revisions] = useState<Revisions>(() => new Map());
  const snapshot = useRef<AppData>(data);

  const drawerItem = data.items.find((item) => item.id === drawerId) ?? null;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#11120f' : '#f2ede3');
    setWindowTheme(theme);
  }, [theme]);

  useEffect(() => {
    const stamped: AppData = {
      ...data,
      items: stampRevisions(revisions, data.items),
      collections: stampRevisions(revisions, data.collections),
    };
    snapshot.current = stamped;
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(stamped));
    } catch {
      // Storage can be unavailable in private browsing. The app still works in memory.
    }
  }, [data, revisions]);

  useEffect(() => {
    const handleHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', handleHash);
    window.addEventListener('popstate', handleHash);
    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('popstate', handleHash);
    };
  }, []);

  const navigate = useCallback((next: Page) => {
    setPage(next);
    window.history.pushState(null, '', `#/${next}`);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

      if ((event.metaKey || event.ctrlKey) && key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((open) => !open);
        return;
      }

      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (formState || drawerId || collectionForm || commandOpen) return;

      if (key === '/') {
        event.preventDefault();
        setCommandOpen(true);
      } else if (key === '?') {
        event.preventDefault();
        setShortcutsOpen((open) => !open);
      } else if (key.toLowerCase() === 'n') {
        event.preventDefault();
        setFormState({});
      } else if (/^[1-5]$/.test(key)) {
        event.preventDefault();
        navigate(VALID_PAGES[Number(key) - 1]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [formState, drawerId, collectionForm, commandOpen, navigate]);

  // The native menu bar and its accelerators drive the same actions as the UI.
  useEffect(() => {
    if (!isDesktop) return;
    let unlisten: (() => void) | undefined;
    onMenuCommand((command: MenuCommand) => {
      if (command === 'new') setFormState({});
      else if (command === 'search') setCommandOpen(true);
      else if (command === 'theme') setTheme((current) => (current === 'light' ? 'dark' : 'light'));
      else if (command === 'shortcuts') setShortcutsOpen(true);
      else if (command === 'about') setAboutOpen(true);
      else if (command === 'export') exportData();
      else if (command === 'import') fileInput.current?.click();
      else if (command.startsWith('goto:')) navigate(command.slice(5) as Page);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  useEffect(() => {
    return () => {
      toastTimers.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('is-desktop', hasWindowChrome);
  }, []);

  useEffect(() => {
    document.title = `${PAGE_TITLES[page]} · Loom`;
  }, [page]);

  const pushToast = useCallback((message: string, action?: Toast['action']) => {
    const id = uid('toast');
    setToasts((current) => [...current.slice(-2), { id, message, action }]);
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      toastTimers.current = toastTimers.current.filter((entry) => entry !== timer);
    }, action ? 6500 : 3600);
    toastTimers.current.push(timer);
  }, []);

  const announce = (message: string) => {
    pushToast(message);
    void notify('Loom', message);
  };

  const dismissToast = (id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const openItem = (id: string) => {
    if (data.items.some((item) => item.id === id)) {
      setDrawerId(id);
    } else {
      pushToast('That entry has left the loom.');
    }
  };

  const openAdd = (initialType?: MediaType) => {
    setFormState({ initialType });
  };

  const editItem = (item: MediaItem) => {
    setDrawerId(null);
    setFormState({ item });
  };

  const closeForm = () => {
    const item = formState?.item;
    setFormState(null);
    if (item) setDrawerId(item.id);
  };

  const saveItem = (item: MediaItem) => {
    const existing = data.items.find((entry) => entry.id === item.id);
    const isNew = !existing;
    const justFinished = item.status === 'done' && existing?.status !== 'done';
    const now = new Date().toISOString();
    const nextItem: MediaItem = {
      ...item,
      finishedAt:
        item.status === 'done' ? existing?.finishedAt ?? item.finishedAt ?? now : undefined,
    };
    const activity = makeActivity(
      nextItem,
      isNew ? 'added' : justFinished ? 'finished' : 'note',
      isNew ? 'Added to your loom' : justFinished ? 'Marked it finished' : 'Updated the entry',
    );
    setData((current) => ({
      ...current,
      items: existing
        ? current.items.map((entry) => (entry.id === item.id ? nextItem : entry))
        : [nextItem, ...current.items],
      activities: [activity, ...current.activities].slice(0, 150),
    }));
    setFormState(null);
    if (!isNew) setDrawerId(item.id);
    announce(isNew ? `${item.title} is now in your loom.` : 'Changes saved.');
  };

  const toggleFavorite = (id: string) => {
    const existing = data.items.find((item) => item.id === id);
    if (!existing) return;
    const isFavorite = !existing.favorite;
    setData((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? { ...item, favorite: isFavorite } : item,
      ),
      activities: [
        makeActivity(
          existing,
          'favorited',
          isFavorite ? 'Moved to favorites' : 'Removed from favorites',
        ),
        ...current.activities,
      ].slice(0, 150),
    }));
    pushToast(isFavorite ? `${existing.title} feels like a favorite.` : 'Removed from favorites.');
  };

  const rateItem = (id: string, rating: number | null) => {
    const existing = data.items.find((item) => item.id === id);
    if (!existing) return;
    setData((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, rating } : item)),
      activities: [
        makeActivity(
          existing,
          'rated',
          rating !== null ? `Rated it ${rating.toFixed(1)} stars` : 'Cleared the rating',
        ),
        ...current.activities,
      ].slice(0, 150),
    }));
    if (rating !== null) pushToast(`Rated ${rating.toFixed(1)} out of 5.`);
  };

  const changeStatus = (id: string, status: Status) => {
    const existing = data.items.find((item) => item.id === id);
    if (!existing || existing.status === status) return;
    setData((current) => ({
      ...current,
      items: current.items.map((item) => {
        if (item.id !== id) return item;
        if (status === 'done') {
          return {
            ...item,
            status,
            progress: { ...item.progress, current: item.progress.total },
            finishedAt: item.finishedAt ?? new Date().toISOString(),
          };
        }
        return {
          ...item,
          status,
          finishedAt: undefined,
          progress:
            item.status === 'done'
              ? {
                  ...item.progress,
                  current: Math.min(item.progress.current, Math.max(0, item.progress.total - 1)),
                }
              : item.progress,
        };
      }),
      activities: [
        makeActivity(
          existing,
          status === 'done' ? 'finished' : 'progress',
          status === 'done'
            ? `Marked it finished`
            : `Moved to ${statusLabel(existing.type, status).toLowerCase()}`,
        ),
        ...current.activities,
      ].slice(0, 150),
    }));
    announce(
      status === 'done'
        ? `${existing.title} is finished. A lovely thing.`
        : `Moved to ${statusLabel(existing.type, status).toLowerCase()}.`,
    );
  };

  const changeProgress = (id: string, current: number) => {
    const existing = data.items.find((item) => item.id === id);
    if (!existing) return;
    const step = progressStep(existing);
    const target = Math.min(existing.progress.total, Math.max(0, Math.round(current)));
    if (target === existing.progress.current) return;

    const reachesSeasonEnd = target >= existing.progress.total && existing.progress.total > 0;
    // Reaching the last episode of season two of four is not finishing the show.
    const seriesComplete = reachesSeasonEnd && !hasMoreSeasons(existing);
    const justFinished = reachesSeasonEnd && existing.status !== 'done' && seriesComplete;
    const seasonWrapped = reachesSeasonEnd && hasMoreSeasons(existing);
    const delta = target - existing.progress.current;
    // Forward progress costs time; moving a marker backwards does not refund it.
    const minutes = delta > 0 ? minutesForProgress(existing.type, delta) : 0;

    setData((state) => {
      const now = new Date().toISOString();
      let reading = state.reading;
      if (existing.type === 'book' && delta > 0) {
        const key = todayKey();
        reading =
          state.reading.date === key
            ? { date: key, pages: state.reading.pages + delta }
            : { date: key, pages: delta };
      }

      const nextItems = state.items.map((item) => {
        if (item.id !== id) return item;
        let nextStatus: Status = item.status;
        let finishedAt = item.finishedAt;
        if (justFinished) {
          nextStatus = 'done';
          finishedAt = finishedAt ?? now;
        } else if (item.status === 'backlog' && target > 0) {
          nextStatus = 'active';
        } else if (item.status === 'done' && target < item.progress.total) {
          nextStatus = 'active';
          finishedAt = undefined;
        }
        // Mid-series season endings keep the title in progress.
        if (seasonWrapped) {
          nextStatus = 'active';
          finishedAt = undefined;
        }
        return {
          ...item,
          status: nextStatus,
          finishedAt,
          minutesSpent: (item.minutesSpent ?? 0) + minutes,
          progress: { ...item.progress, current: target },
        };
      });

      const label = justFinished
        ? 'Finished it'
        : seasonWrapped
          ? `Finished season ${existing.progress.season}`
          : existing.type === 'book' && delta > 0
            ? `Read ${delta} more page${delta === 1 ? '' : 's'}`
            : `Logged progress · ${target} of ${existing.progress.total} ${existing.progress.unit}`;

      return {
        ...state,
        reading,
        timeLog: addMinutes(state.timeLog, todayKey(), minutes),
        items: nextItems,
        activities: [
          makeActivity(
            nextItems.find((item) => item.id === id) ?? existing,
            justFinished ? 'finished' : 'progress',
            label,
          ),
          ...state.activities,
        ].slice(0, 150),
      };
    });

    if (justFinished) announce(`${existing.title} is finished. A lovely thing.`);
    else if (seasonWrapped) {
      pushToast(`Season ${existing.progress.season} of ${existing.title} done. Next one is waiting.`);
    } else if (target > 0 && existing.status === 'backlog') {
      pushToast(`${existing.title} is underway.`);
    } else if (existing.type === 'book' && delta > step) {
      pushToast(`+${delta} pages logged.`);
    }
  };

  const changeSeason = (id: string, direction: 1 | -1) => {
    const existing = data.items.find((item) => item.id === id);
    if (!existing?.progress.season) return;
    const seasonsTotal = existing.progress.seasonsTotal ?? existing.progress.season;
    const next = Math.min(seasonsTotal, Math.max(1, existing.progress.season + direction));
    if (next === existing.progress.season) return;
    const goingBackwards = direction < 0;
    setData((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id
          ? {
              ...item,
              status: goingBackwards && item.status === 'done' ? 'active' : item.status,
              finishedAt: goingBackwards ? undefined : item.finishedAt,
              progress: {
                ...item.progress,
                season: next,
                // Landing on a fresh season starts it unread.
                current: goingBackwards ? item.progress.total : 0,
              },
            }
          : item,
      ),
      activities: [
        makeActivity(
          existing,
          'progress',
          goingBackwards ? `Back to season ${next}` : `Starting season ${next}`,
        ),
        ...current.activities,
      ].slice(0, 150),
    }));
    pushToast(goingBackwards ? `Season ${next}.` : `On to season ${next}.`);
  };

  const saveNotes = (id: string, notes: string) => {
    const existing = data.items.find((item) => item.id === id);
    if (!existing || existing.notes === notes) return;
    setData((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, notes } : item)),
      activities: [
        makeActivity(existing, 'note', 'Left a note beside it'),
        ...current.activities,
      ].slice(0, 150),
    }));
    pushToast('Note tucked away.');
  };

  const deleteItem = (id: string) => {
    const existing = data.items.find((item) => item.id === id);
    if (!existing) return;
    const homes = data.collections
      .filter((collection) => collection.itemIds.includes(id))
      .map((collection) => collection.id);
    // Keep the title's own log rows so Undo can put the whole thread back.
    const itsActivities = data.activities.filter((activity) => activity.itemId === id);

    setData((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== id),
      activities: current.activities.filter((activity) => activity.itemId !== id),
      collections: current.collections.map((collection) => ({
        ...collection,
        itemIds: collection.itemIds.filter((itemId) => itemId !== id),
      })),
    }));
    setDrawerId(null);
    pushToast(`${existing.title} left the loom.`, {
      label: 'Undo',
      onClick: () => {
        setData((current) =>
          current.items.some((item) => item.id === id)
            ? current
            : {
                ...current,
                items: [existing, ...current.items],
                activities: [...itsActivities, ...current.activities].slice(0, 150),
                collections: current.collections.map((collection) =>
                  homes.includes(collection.id)
                    ? { ...collection, itemIds: [...collection.itemIds, id] }
                    : collection,
                ),
              },
        );
        pushToast(`${existing.title} is back where it belongs.`);
      },
    });
  };

  const addDiscovery = (entry: DiscoveryItem) => {
    if (data.items.some((item) => item.discoveryId === entry.id)) return;
    const now = new Date().toISOString();
    const item: MediaItem = {
      id: uid('item'),
      title: entry.title,
      creator: entry.creator,
      type: entry.type,
      year: entry.year,
      status: 'backlog',
      rating: null,
      favorite: false,
      progress: {
        current: 0,
        total: TYPE_META[entry.type].defaultTotal,
        unit: TYPE_META[entry.type].unit,
      },
      genres: [],
      tags: entry.tags.map((tag) => tag.toLowerCase()),
      notes: '',
      blurb: entry.blurb,
      art: entry.art,
      addedAt: now,
      discoveryId: entry.id,
    };
    setData((current) => ({
      ...current,
      items: [item, ...current.items],
      activities: [makeActivity(item, 'added', 'Saved from Discover'), ...current.activities].slice(
        0,
        150,
      ),
    }));
    pushToast(`${entry.title} joined the queue.`);
  };

  const logReading = (pages: number) => {
    if (pages <= 0) return;
    setData((current) => {
      const key = todayKey();
      const reading =
        current.reading.date === key
          ? { date: key, pages: current.reading.pages + pages }
          : { date: key, pages };
      const minutes = minutesForProgress('book', pages);
      const readingItem =
        current.items.find(
          (item) => item.type === 'book' && item.status === 'active',
        ) ?? current.items.find((item) => item.type === 'book');

      if (!readingItem) {
        return { ...current, reading, timeLog: addMinutes(current.timeLog, key, minutes) };
      }

      const nextCurrent = Math.min(readingItem.progress.total, readingItem.progress.current + pages);
      const justFinished =
        readingItem.progress.total > 0 && nextCurrent >= readingItem.progress.total;
      const nextItem = {
        ...readingItem,
        status: justFinished ? ('done' as Status) : readingItem.status,
        finishedAt: justFinished
          ? readingItem.finishedAt ?? new Date().toISOString()
          : readingItem.finishedAt,
        progress: { ...readingItem.progress, current: nextCurrent },
        minutesSpent: (readingItem.minutesSpent ?? 0) + minutes,
      };
      return {
        ...current,
        reading,
        timeLog: addMinutes(current.timeLog, key, minutes),
        items: current.items.map((item) =>
          item.id === readingItem.id ? nextItem : item,
        ),
        activities: [
          makeActivity(nextItem, 'progress', `Read ${pages} pages`),
          ...current.activities,
        ].slice(0, 150),
      };
    });
    pushToast(`+${pages} pages.`);
  };

  const saveCollection = (draft: Collection | (Omit<Collection, 'id'> & { id?: string })) => {
    if (draft.id && data.collections.some((entry) => entry.id === draft.id)) {
      const id = draft.id;
      setData((current) => ({
        ...current,
        collections: current.collections.map((collection) =>
          collection.id === id ? ({ ...draft, id } as Collection) : collection,
        ),
      }));
      pushToast('Collection updated.');
    } else {
      const collection: Collection = { ...draft, id: draft.id ?? uid('collection') };
      setData((current) => ({ ...current, collections: [...current.collections, collection] }));
      pushToast(`“${collection.name}” is ready.`);
    }
    setCollectionForm(null);
  };

  const toggleCollectionItem = (collectionId: string, itemId: string) => {
    const collection = data.collections.find((entry) => entry.id === collectionId);
    const item = data.items.find((entry) => entry.id === itemId);
    if (!collection || !item) return;
    const inside = collection.itemIds.includes(itemId);
    setData((current) => ({
      ...current,
      collections: current.collections.map((entry) =>
        entry.id === collectionId
          ? {
              ...entry,
              itemIds: inside
                ? entry.itemIds.filter((id) => id !== itemId)
                : [...entry.itemIds, itemId],
            }
          : entry,
      ),
    }));
    pushToast(inside ? `Out of “${collection.name}”.` : `Into “${collection.name}”.`);
  };

  const deleteCollection = (id: string) => {
    const index = data.collections.findIndex((collection) => collection.id === id);
    if (index === -1) return;
    const existing = data.collections[index];
    setData((current) => ({
      ...current,
      collections: current.collections.filter((collection) => collection.id !== id),
    }));
    pushToast(`“${existing.name}” was untied.`, {
      label: 'Undo',
      onClick: () => {
        setData((current) => {
          if (current.collections.some((collection) => collection.id === id)) return current;
          const next = [...current.collections];
          next.splice(Math.min(index, next.length), 0, existing);
          return { ...current, collections: next };
        });
        pushToast(`“${existing.name}” is back.`);
      },
    });
  };

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'Loom',
      ...snapshot.current,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `loom-export-${todayKey()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    pushToast('Your library is packed up and ready.');
  };

  const importFile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Partial<AppData>;
      if (!Array.isArray(parsed.items)) throw new Error('No items in that file.');

      // The file comes from another device, so treat every field as untrusted.
      const incoming: Partial<AppData> = {
        ...parsed,
        items: parsed.items.filter(
          (item): item is MediaItem =>
            !!item && typeof item.id === 'string' && typeof item.title === 'string',
        ),
        collections: (Array.isArray(parsed.collections) ? parsed.collections : []).filter(
          (collection): collection is Collection =>
            !!collection && typeof collection.id === 'string' && typeof collection.name === 'string',
        ),
        activities: Array.isArray(parsed.activities) ? parsed.activities : [],
        timeLog: parsed.timeLog && typeof parsed.timeLog === 'object' ? parsed.timeLog : {},
      };

      const { data: merged, report } = mergeLibrary(snapshot.current, incoming, revisions);
      if (!report.added && !report.updated) {
        pushToast('Nothing newer in that file — this library is already up to date.');
        return;
      }

      setData(merged);
      pushToast(
        `Merged ${report.added} new ${report.added === 1 ? 'title' : 'titles'}` +
          (report.updated
            ? ` and ${report.updated} newer ${report.updated === 1 ? 'edit' : 'edits'}`
            : '') +
          '.',
      );
    } catch (error) {
      pushToast(`Could not read that file. ${(error as Error).message}`);
    }
  };

  const streak = currentStreak(data.timeLog);

  const renderPage = () => {
    if (page === 'library') {
      return (
        <Library
          items={data.items}
          onOpenItem={openItem}
          onToggleFavorite={toggleFavorite}
          onAdd={() => openAdd()}
        />
      );
    }
    if (page === 'discover') {
      return (
        <Discover discovery={discovery} items={data.items} onAddDiscovery={addDiscovery} />
      );
    }
    if (page === 'collections') {
      return (
        <Collections
          collections={data.collections}
          items={data.items}
          onOpenItem={openItem}
          onToggleFavorite={toggleFavorite}
          onNewCollection={() => setCollectionForm('new')}
          onEditCollection={(collection) => setCollectionForm(collection)}
          onToggleCollectionItem={toggleCollectionItem}
          onDeleteCollection={deleteCollection}
        />
      );
    }
    if (page === 'insights') {
      return (
        <Insights
          items={data.items}
          activities={data.activities}
          timeLog={data.timeLog}
          onOpenItem={openItem}
          onExport={exportData}
          onImport={() => fileInput.current?.click()}
        />
      );
    }
    return (
      <Dashboard
        items={data.items}
        reading={data.reading}
        timeLog={data.timeLog}
        onOpenItem={openItem}
        onNavigate={navigate}
        onAdd={() => openAdd()}
        onToggleFavorite={toggleFavorite}
        onLogReading={logReading}
      />
    );
  };

  return (
    <div className="app-shell">
      <TitleBar caption={`${PAGE_TITLES[page]} · ${data.items.length} titles`} />
      <Sidebar
        page={page}
        onNavigate={navigate}
        onAdd={() => openAdd()}
        itemCount={data.items.length}
        streak={streak}
      />

      <div className="main-shell">
        <Topbar
          page={page}
          onSearch={() => setCommandOpen(true)}
          onAdd={() => openAdd()}
          theme={theme}
          onToggleTheme={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
          activities={data.activities}
          onOpenItem={openItem}
          onNavigate={navigate}
          itemCount={data.items.length}
          formatCount={new Set(data.items.map((item) => item.type)).size}
          streak={streak}
        />

        <main className="main-content">
          <div className="page-transition" key={page}>
            {renderPage()}
          </div>
        </main>

        <footer className="site-footer">
          <span className="footer-brand">
            <i>✳</i> loom
          </span>
          <p>Made for paying attention. Your data stays in this browser.</p>
          <div className="footer-actions">
            <button className="footer-shortcut" onClick={() => setCommandOpen(true)}>
              Quick find <kbd>{SHORTCUT_MOD} K</kbd>
            </button>
            <button className="footer-shortcut" onClick={() => setShortcutsOpen(true)}>
              Shortcuts <kbd>?</kbd>
            </button>
          </div>
        </footer>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void importFile(file);
        }}
      />

      {shortcutsOpen && <ShortcutSheet onClose={() => setShortcutsOpen(false)} />}

      {drawerItem && (
        <ItemDrawer
          item={drawerItem}
          activities={data.activities}
          collections={data.collections}
          onClose={() => setDrawerId(null)}
          onToggleFavorite={toggleFavorite}
          onRate={rateItem}
          onStatusChange={changeStatus}
          onProgressChange={changeProgress}
          onSaveNotes={saveNotes}
          onToggleCollection={toggleCollectionItem}
          onChangeSeason={changeSeason}
          onEdit={editItem}
          onDelete={deleteItem}
        />
      )}

      {formState && (
        <ItemForm
          key={formState.item?.id ?? 'new-entry'}
          item={formState.item}
          initialType={formState.initialType}
          onClose={closeForm}
          onSubmit={saveItem}
        />
      )}

      {collectionForm && (
        <CollectionForm
          key={collectionForm === 'new' ? 'new-collection' : collectionForm.id}
          items={data.items}
          collection={collectionForm === 'new' ? null : collectionForm}
          onClose={() => setCollectionForm(null)}
          onSave={saveCollection}
        />
      )}

      {commandOpen && (
        <CommandPalette
          items={data.items}
          theme={theme}
          onClose={() => setCommandOpen(false)}
          onOpenItem={openItem}
          onNavigate={navigate}
          onAdd={() => openAdd()}
          onToggleTheme={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
        />
      )}

      {aboutOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAboutOpen(false);
          }}
        >
          <div className="modal-panel about-card" role="dialog" aria-modal="true" aria-label="About Loom">
            <div className="about-mark" aria-hidden="true">
              ✳
            </div>
            <h2>Loom</h2>
            <p className="about-tagline">Everything you love, in one thread.</p>
            <p className="about-copy">
              A quiet archive for films, series, anime, books, comics, manga, music, videos,
              games and podcasts. No accounts, no feed, no algorithm — just the record of what
              you paid attention to.
            </p>
            <dl className="about-facts">
              <div>
                <dt>Version</dt>
                <dd>1.0.0</dd>
              </div>
              <div>
                <dt>Library</dt>
                <dd>
                  {data.items.length} {data.items.length === 1 ? 'title' : 'titles'}
                </dd>
              </div>
              <div>
                <dt>Runs</dt>
                <dd>{isDesktop ? 'Desktop' : 'In the browser'}</dd>
              </div>
              <div>
                <dt>Storage</dt>
                <dd>This device only</dd>
              </div>
            </dl>
            <div className="modal-foot">
              <button
                className="button-ghost"
                onClick={() => {
                  setAboutOpen(false);
                  setShortcutsOpen(true);
                }}
              >
                Keyboard shortcuts
              </button>
              <button className="button-primary" onClick={() => setAboutOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div className={`toast ${toast.action ? 'has-action' : ''}`} key={toast.id}>
            <span className="toast-icon">
              <Check size={13} strokeWidth={2.4} />
            </span>
            <span>{toast.message}</span>
            {toast.action && (
              <button
                className="toast-action"
                onClick={() => {
                  toast.action?.onClick();
                  dismissToast(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button onClick={() => dismissToast(toast.id)} aria-label="Dismiss">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
