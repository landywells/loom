import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownUp,
  ArrowLeft,
  Heart,
  LayoutGrid,
  List,
  Plus,
  Search,
  X,
} from 'lucide-react';
import type { MediaItem, MediaType, Status } from '../types';
import {
  ALL_TYPES,
  EMPTY_LIBRARY_QUERY,
  STATUS_META,
  avgRating,
  TYPE_META,
  buildLibraryHash,
  compactProgress,
  parseLibraryQuery,
  progressPercent,
  statusLabel,
  type LibraryQuery,
} from '../lib/utils';
import { MediaCard } from './MediaCard';
import { MediaGlyph, TYPE_ICON } from './MediaGlyph';
import { RatingStars } from './RatingStars';
import { Cover } from './Cover';
import { CreatorLink } from './CreatorLink';

type StatusFilter = 'all' | Status | 'favorites';
type SortOption = 'recent' | 'title' | 'rating' | 'year' | 'progress';

interface LibraryProps {
  items: MediaItem[];
  onOpenItem: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onAdd: () => void;
}

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'In progress' },
  { value: 'backlog', label: 'Up next' },
  { value: 'paused', label: 'Paused' },
  { value: 'done', label: 'Finished' },
  { value: 'dropped', label: 'Dropped' },
  { value: 'favorites', label: 'Favorites' },
];

export function Library({ items, onOpenItem, onToggleFavorite, onAdd }: LibraryProps) {
  const [filters, setFilters] = useState<LibraryQuery>(() =>
    parseLibraryQuery(window.location.hash),
  );

  /** Keep the address bar in step, so any slice of the library is linkable. */
  const update = (patch: Partial<LibraryQuery>, replace = false) => {
    setFilters((current) => {
      const next = { ...current, ...patch };
      const hash = buildLibraryHash(next);
      if (window.location.hash !== hash) {
        window.history[replace ? 'replaceState' : 'pushState'](null, '', hash);
      }
      return next;
    });
  };

  // Back and forward should restore filters, not merely the page.
  useEffect(() => {
    const sync = () => setFilters(parseLibraryQuery(window.location.hash));
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const query = filters.q;
  const status = filters.status as StatusFilter;
  const type = filters.type as MediaType | 'all';
  const sort = filters.sort as SortOption;
  const view = filters.view === 'list' ? 'list' : 'grid';
  const creator = filters.creator;

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {
      all: items.length,
      favorites: items.filter((item) => item.favorite).length,
    };
    for (const item of items) {
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    }
    return byStatus;
  }, [items]);

  const typeCounts = useMemo(() => {
    const result: Partial<Record<MediaType, number>> = {};
    for (const item of items) result[item.type] = (result[item.type] ?? 0) + 1;
    return result;
  }, [items]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const result = items.filter((item) => {
      const matchesQuery =
        !normalized ||
        item.title.toLowerCase().includes(normalized) ||
        item.creator.toLowerCase().includes(normalized) ||
        item.tags.some((tag) => tag.toLowerCase().includes(normalized)) ||
        item.genres.some((genre) => genre.toLowerCase().includes(normalized));
      const matchesStatus =
        status === 'all' ||
        (status === 'favorites' ? item.favorite : item.status === status);
      const matchesType = type === 'all' || item.type === type;
      const matchesCreator =
        !creator || item.creator.toLowerCase() === creator.toLowerCase();
      return matchesQuery && matchesStatus && matchesType && matchesCreator;
    });

    return result.sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'rating') return (b.rating ?? -1) - (a.rating ?? -1);
      if (sort === 'year') return b.year - a.year;
      if (sort === 'progress') return progressPercent(b) - progressPercent(a);
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });
  }, [items, query, status, type, sort, creator]);

  const activeFilter =
    query.trim() || status !== 'all' || type !== 'all' || Boolean(creator);
  const resetFilters = () => {
    setFilters((current) => {
      const next = { ...EMPTY_LIBRARY_QUERY, view: current.view };
      window.history.replaceState(null, '', buildLibraryHash(next));
      return next;
    });
  };

  const creatorFormats = new Set(filtered.map((item) => item.type)).size;
  const creatorAverage = avgRating(filtered);

  return (
    <div className="page library-page">
      {creator ? (
        <section className="page-intro person-intro">
          <div className="page-intro-copy">
            <span className="eyebrow">
              A person in your library · {filtered.length}{' '}
              {filtered.length === 1 ? 'entry' : 'entries'} across {creatorFormats}{' '}
              {creatorFormats === 1 ? 'format' : 'formats'}
            </span>
            <h1>
              Works by <em>{creator}.</em>
            </h1>
            <p>
              {creatorAverage > 0
                ? `You rate their work ${creatorAverage.toFixed(1)} out of five.`
                : 'Nothing rated here yet.'}
            </p>
          </div>
          <div className="intro-actions">
            <button className="button-secondary" onClick={resetFilters}>
              <ArrowLeft size={15} />
              Back to the library
            </button>
          </div>
        </section>
      ) : (
      <section className="page-intro library-intro">
        <div className="page-intro-copy">
          <span className="eyebrow">Your collection · {items.length} entries</span>
          <h1>
            The <em>library.</em>
          </h1>
          <p>A shelf for every mood, medium, and unfinished thought.</p>
        </div>
        <div className="intro-actions">
          <div className="library-tally">
            <span>
              <strong>{items.filter((item) => item.status === 'active').length}</strong> in progress
            </span>
            <i />
            <span>
              <strong>{items.filter((item) => item.status === 'done').length}</strong> finished
            </span>
          </div>
          <button className="button-primary" onClick={onAdd}>
            <Plus size={16} />
            Add to library
          </button>
        </div>
      </section>
      )}

      <section className="library-controls" aria-label="Library filters">
        <div className="library-search-row">
          <label className="library-search">
            <Search size={17} strokeWidth={1.8} />
            <input
              value={query}
              onChange={(event) => update({ q: event.target.value }, true)}
              placeholder="Search titles, creators, tags…"
              aria-label="Search library"
            />
            {query && (
              <button onClick={() => update({ q: '' }, true)} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </label>
          <div className="library-view-controls">
            <label className="sort-control">
              <ArrowDownUp size={14} />
              <select
                value={sort}
                onChange={(event) => update({ sort: event.target.value })}
                aria-label="Sort library"
              >
                <option value="recent">Recently added</option>
                <option value="title">Title, A–Z</option>
                <option value="rating">Highest rated</option>
                <option value="year">Newest release</option>
                <option value="progress">Closest to done</option>
              </select>
            </label>
            <div className="view-toggle" role="group" aria-label="View style">
              <button
                className={view === 'grid' ? 'active' : ''}
                onClick={() => update({ view: 'grid' }, true)}
                aria-label="Grid view"
                aria-pressed={view === 'grid'}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                className={view === 'list' ? 'active' : ''}
                onClick={() => update({ view: 'list' }, true)}
                aria-label="List view"
                aria-pressed={view === 'list'}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        <div className="status-tabs" role="tablist" aria-label="Filter by status">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              className={status === filter.value ? 'active' : ''}
              onClick={() => update({ status: filter.value }, true)}
              role="tab"
              aria-selected={status === filter.value}
            >
              {filter.value === 'favorites' && <Heart size={12} />}
              {filter.label}
              <span>{counts[filter.value] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="type-filter-row">
          <div className="type-chips">
            <button
              className={`type-chip ${type === 'all' ? 'active' : ''}`}
              onClick={() => update({ type: 'all' }, true)}
            >
              All forms <span>{items.length}</span>
            </button>
            {ALL_TYPES.map((mediaType) => {
              const Icon = TYPE_ICON[mediaType];
              const count = typeCounts[mediaType] ?? 0;
              return (
                <button
                  key={mediaType}
                  className={`type-chip ${type === mediaType ? 'active' : ''}`}
                  onClick={() => update({ type: mediaType }, true)}
                  disabled={!count && type !== mediaType}
                >
                  <Icon size={13} />
                  {TYPE_META[mediaType].plural}
                  <span>{count}</span>
                </button>
              );
            })}
          </div>
          {activeFilter && (
            <button className="clear-filters" onClick={resetFilters}>
              Clear filters <X size={12} />
            </button>
          )}
        </div>
      </section>

      <div className="library-results-bar">
        <span>
          {creator ? (
            <>
              Everything by <strong>{creator}</strong>
            </>
          ) : (
            <>
              Showing <strong>{filtered.length}</strong> of {items.length} entries
            </>
          )}
          {type !== 'all' && <em> · {TYPE_META[type].plural}</em>}
          {status !== 'all' && (
            <em>
              {' '}
              ·{' '}
              {status === 'favorites'
                ? 'Favorites'
                : status === 'done'
                  ? 'Finished'
                  : STATUS_META[status].label}
            </em>
          )}
        </span>
        <span className="results-note">A whole life, in small pieces.</span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-mark">✳</span>
          <h2>Nothing on this shelf yet.</h2>
          <p>Try a different corner of the library, or add something new.</p>
          <div className="empty-actions">
            <button className="button-secondary" onClick={resetFilters}>
              Clear filters
            </button>
            <button className="button-primary" onClick={onAdd}>
              <Plus size={15} /> Add media
            </button>
          </div>
        </div>
      ) : view === 'grid' ? (
        <div className="library-grid">
          {filtered.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onOpen={onOpenItem}
              onFavorite={onToggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="library-list">
          <div className="list-head">
            <span>Title</span>
            <span>Format</span>
            <span>Progress</span>
            <span>Status</span>
            <span>Rating</span>
            <span />
          </div>
          {filtered.map((item) => {
            const percent = progressPercent(item);
            return (
              <div
                className="list-row"
                key={item.id}
                onClick={() => onOpenItem(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onOpenItem(item.id);
                }}
              >
                <div className="list-title-cell">
                  <Cover
                    className="list-cover"
                    title={item.title}
                    creator={item.creator}
                    type={item.type}
                    year={item.year}
                    art={item.art}
                    image={item.image}
                    hideTitle
                    hideMeta
                  />
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      <CreatorLink name={item.creator} /> · {item.year}
                    </span>
                  </div>
                </div>
                <span className="list-format">
                  <MediaGlyph type={item.type} size={14} />
                  {TYPE_META[item.type].short}
                </span>
                <div className="list-progress">
                  <div className="list-progress-top">
                    <span>
                      {item.status === 'backlog'
                        ? 'Not started'
                        : compactProgress(item)}
                    </span>
                    <span>{percent}%</span>
                  </div>
                  <div className="thin-progress">
                    <span style={{ width: `${percent}%` }} />
                  </div>
                </div>
                <span className={`list-status status-${item.status}`}>
                  <i /> {statusLabel(item.type, item.status)}
                </span>
                <span className="list-rating">
                  {item.rating !== null ? (
                    <RatingStars value={item.rating} size={11} showValue />
                  ) : (
                    <span className="unrated">—</span>
                  )}
                </span>
                <button
                  className={`favorite-button list-favorite ${item.favorite ? 'is-favorite' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleFavorite(item.id);
                  }}
                  aria-label={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart
                    size={15}
                    fill={item.favorite ? 'currentColor' : 'none'}
                    strokeWidth={1.7}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
