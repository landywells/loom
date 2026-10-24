import { useEffect, useMemo, useState } from 'react';
import { Check, Heart, ImageOff, Link2, Loader2, Plus, Search, Sparkles, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { ArtPattern, CoverArt, MediaItem, MediaType, Status } from '../types';
import {
  ALL_TYPES,
  PALETTES,
  PATTERN_META,
  STATUS_META,
  TYPE_META,
  uid,
} from '../lib/utils';
import {
  SOURCE_LABEL,
  resolveYouTube,
  searchCatalog,
  sourceForType,
  type SearchResult,
} from '../lib/search';
import { useFocusTrap } from '../lib/useFocusTrap';
import { Cover } from './Cover';
import { MediaGlyph, TYPE_ICON } from './MediaGlyph';
import { RatingStars } from './RatingStars';

interface ItemFormProps {
  item?: MediaItem | null;
  initialType?: MediaType;
  onClose: () => void;
  onSubmit: (item: MediaItem) => void;
}

const editableStatuses: Status[] = ['active', 'backlog', 'paused', 'done', 'dropped'];

function paletteForType(type: MediaType): CoverArt {
  return PALETTES[ALL_TYPES.indexOf(type) % PALETTES.length];
}

export function ItemForm({ item, initialType, onClose, onSubmit }: ItemFormProps) {
  const panelRef = useFocusTrap<HTMLDivElement>();
  const defaultType = item?.type ?? initialType ?? 'movie';
  const defaultPalette = item?.art ?? paletteForType(defaultType);

  const [type, setType] = useState<MediaType>(defaultType);
  const [title, setTitle] = useState(item?.title ?? '');
  const [creator, setCreator] = useState(item?.creator ?? '');
  const [year, setYear] = useState(String(item?.year ?? new Date().getFullYear()));
  const [status, setStatus] = useState<Status>(item?.status ?? 'backlog');
  const [current, setCurrent] = useState(String(item?.progress.current ?? 0));
  const [total, setTotal] = useState(
    String(item?.progress.total ?? TYPE_META[defaultType].defaultTotal),
  );
  const [season, setSeason] = useState(String(item?.progress.season ?? 1));
  const [seasonsTotal, setSeasonsTotal] = useState(String(item?.progress.seasonsTotal ?? ''));
  const [rating, setRating] = useState<number | null>(item?.rating ?? null);
  const [favorite, setFavorite] = useState(item?.favorite ?? false);
  const [tags, setTags] = useState(item?.tags.join(', ') ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [blurb, setBlurb] = useState(item?.blurb ?? '');
  const [pattern, setPattern] = useState<ArtPattern>(defaultPalette.pattern);
  const [palette, setPalette] = useState({
    a: defaultPalette.a,
    b: defaultPalette.b,
    c: defaultPalette.c,
  });
  const [image, setImage] = useState<string | null>(item?.image ?? null);
  const [useArtwork, setUseArtwork] = useState(Boolean(item?.image));
  const [titleTouched, setTitleTouched] = useState(false);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [lookupOpen, setLookupOpen] = useState(!item);
  const [link, setLink] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const isVideo = type === 'video';
  const seasonal = type === 'show' || type === 'anime';
  const source = sourceForType(type);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    if (isVideo) {
      setResults([]);
      setSearching(false);
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    setSearchError(null);
    // Drop the previous query's hits at once — leaving them on screen means a
    // stale row can be clicked while the new search is still in flight.
    setResults([]);

    const timer = window.setTimeout(() => {
      searchCatalog(trimmed, type, controller.signal)
        .then((found) => {
          if (controller.signal.aborted) return;
          setResults(found);
          setSearchError(
            found.length ? null : 'Nothing came back for that. Try another spelling.',
          );
        })
        .catch((error: Error) => {
          if (error.name === 'AbortError') return;
          setResults([]);
          setSearchError('The catalog is not answering. You can still add it by hand below.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, type, isVideo]);

  const changeType = (nextType: MediaType) => {
    const previousMeta = TYPE_META[type];
    if (!item) {
      const nextPalette = paletteForType(nextType);
      setPalette({ a: nextPalette.a, b: nextPalette.b, c: nextPalette.c });
      setPattern(nextPalette.pattern);
    }
    if (!total.trim() || Number(total) === previousMeta.defaultTotal) {
      setTotal(String(TYPE_META[nextType].defaultTotal));
    }
    setCurrent('0');
    setType(nextType);
    setResults([]);
    setQuery('');
    setSearchError(null);
    setLinkError(null);
  };

  const handleStatus = (nextStatus: Status) => {
    setStatus(nextStatus);
    if (nextStatus === 'done') setCurrent(total || String(TYPE_META[type].defaultTotal));
  };

  const applyResult = (result: SearchResult) => {
    setTitle(result.title);
    if (result.creator) setCreator(result.creator);
    if (result.year) setYear(String(result.year));
    if (result.blurb) setBlurb(result.blurb);
    if (result.image) {
      setImage(result.image);
      setUseArtwork(true);
    }
    if (result.total && result.unit) {
      setTotal(String(result.total));
      setCurrent('0');
    }
    if (result.tags?.length) setTags(result.tags.join(', '));
    setLookupOpen(false);
  };

  const fetchLink = async () => {
    setLinkBusy(true);
    setLinkError(null);
    try {
      applyResult(await resolveYouTube(link));
    } catch (error) {
      setLinkError((error as Error).message || 'Could not read that link.');
    } finally {
      setLinkBusy(false);
    }
  };

  const previewYear = Number(year) || new Date().getFullYear();
  const showPhoto = useArtwork && Boolean(image);
  const studioArt: CoverArt = { pattern, ...palette };

  const lookupHint = useMemo(
    () =>
      isVideo
        ? 'Paste a YouTube link and Loom pulls the title, channel, and thumbnail.'
        : `Search ${SOURCE_LABEL[source]} to fill this in for you.`,
    [isVideo, source],
  );

  const submit = () => {
    setTitleTouched(true);
    if (!title.trim()) return;
    const parsedTotal = Math.max(1, Number(total) || TYPE_META[type].defaultTotal);
    const parsedCurrent = Math.min(
      parsedTotal,
      Math.max(0, status === 'done' ? parsedTotal : Number(current) || 0),
    );
    const result: MediaItem = {
      id: item?.id ?? uid('item'),
      title: title.trim(),
      creator: creator.trim() || 'Unknown',
      type,
      year: Math.min(2100, Math.max(1500, Number(year) || new Date().getFullYear())),
      status,
      rating,
      favorite,
      progress: {
        current: parsedCurrent,
        total: parsedTotal,
        unit: TYPE_META[type].unit,
        ...(seasonal
          ? {
              season: Math.max(1, Number(season) || 1),
              seasonsTotal: seasonsTotal.trim()
                ? Math.max(1, Number(seasonsTotal))
                : undefined,
            }
          : {}),
      },
      genres: item?.genres ?? [],
      tags: tags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 8),
      notes: notes.trim(),
      blurb: blurb.trim() || notes.trim() || 'A new thread in your loom.',
      art: studioArt,
      image: showPhoto ? image : null,
      addedAt: item?.addedAt ?? new Date().toISOString(),
      finishedAt: status === 'done' ? item?.finishedAt ?? new Date().toISOString() : undefined,
      minutesSpent: item?.minutesSpent,
      discoveryId: item?.discoveryId,
    };
    onSubmit(result);
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="modal-panel item-form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-form-title"
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">{item ? 'Refine the record' : 'A new thread'}</span>
            <h2 id="item-form-title">{item ? 'Edit entry' : 'Add to your loom'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <form
          className="item-form-body"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="form-main">
            <div className="type-picker">
              <span className="field-label">What kind of story?</span>
              <div className="type-picker-grid">
                {ALL_TYPES.map((mediaType) => {
                  const Icon = TYPE_ICON[mediaType];
                  return (
                    <button
                      type="button"
                      key={mediaType}
                      className={type === mediaType ? 'active' : ''}
                      onClick={() => changeType(mediaType)}
                    >
                      <Icon size={16} strokeWidth={1.8} />
                      <span>{TYPE_META[mediaType].label}</span>
                      {type === mediaType && <Check size={11} className="type-check" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <section className="lookup">
              <button
                type="button"
                className="lookup-toggle"
                onClick={() => setLookupOpen((open) => !open)}
                aria-expanded={lookupOpen}
              >
                <span className="lookup-toggle-icon">
                  <Sparkles size={14} />
                </span>
                <span className="lookup-toggle-copy">
                  <strong>{lookupOpen ? 'Find it in the catalog' : 'Search to fill it in'}</strong>
                  <small>{lookupHint}</small>
                </span>
                <span className={`lookup-caret ${lookupOpen ? 'up' : ''}`}>⌄</span>
              </button>

              {lookupOpen && (
                <div className="lookup-panel">
                  {isVideo ? (
                    <div className="lookup-link">
                      <div className="lookup-link-row">
                        <input
                          value={link}
                          onChange={(event) => setLink(event.target.value)}
                          placeholder="https://www.youtube.com/watch?v=…"
                          inputMode="url"
                          aria-label="YouTube link"
                        />
                        <button
                          type="button"
                          className="button-primary"
                          onClick={fetchLink}
                          disabled={!link.trim() || linkBusy}
                        >
                          {linkBusy ? (
                            <Loader2 size={15} className="spin" />
                          ) : (
                            <Link2 size={15} />
                          )}
                          Fetch
                        </button>
                      </div>
                      {linkError && <p className="lookup-error">{linkError}</p>}
                    </div>
                  ) : (
                    <>
                      <label className="library-search lookup-search">
                        <Search size={16} strokeWidth={1.8} />
                        <input
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder={`Search ${SOURCE_LABEL[source]}…`}
                          aria-label={`Search ${SOURCE_LABEL[source]}`}
                        />
                        {searching && <Loader2 size={15} className="spin" />}
                        {!searching && query && (
                          <button
                            type="button"
                            onClick={() => setQuery('')}
                            aria-label="Clear search"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </label>

                      {searchError && <p className="lookup-error">{searchError}</p>}

                      {!searchError && results.length > 0 && (
                        <div className="lookup-results">
                          {results.map((result) => (
                            <button
                              type="button"
                              key={result.key}
                              className="lookup-row"
                              onClick={() => applyResult(result)}
                            >
                              <span className="lookup-thumb">
                                {result.image ? (
                                  <img src={result.image ?? undefined} alt="" loading="lazy" />
                                ) : (
                                  <span className="lookup-thumb-fallback">
                                    <MediaGlyph type={type} size={13} />
                                  </span>
                                )}
                              </span>
                              <span className="lookup-copy">
                                <strong>{result.title}</strong>
                                <small>
                                  {[result.creator, result.year].filter(Boolean).join(' · ') ||
                                    'Details unknown'}
                                </small>
                              </span>
                              <span className="lookup-meta">{result.meta}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>

            <div className="form-grid">
              <label
                className={`field field-full ${titleTouched && !title.trim() ? 'has-error' : ''}`}
              >
                <span>Title</span>
                <input
                  autoFocus
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onBlur={() => setTitleTouched(true)}
                  placeholder="The thing itself"
                />
                {titleTouched && !title.trim() && (
                  <small className="field-error">A title is required.</small>
                )}
              </label>
              <label className="field">
                <span>Creator</span>
                <input
                  value={creator}
                  onChange={(event) => setCreator(event.target.value)}
                  placeholder="Director, author, artist…"
                />
              </label>
              <label className="field">
                <span>Year</span>
                <input
                  type="number"
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  min={1500}
                  max={2100}
                />
              </label>
            </div>

            <div className="field-block">
              <span className="field-label">Where is it at?</span>
              <div className="status-picker">
                {editableStatuses.map((option) => (
                  <button
                    type="button"
                    key={option}
                    className={status === option ? 'active' : ''}
                    onClick={() => handleStatus(option)}
                  >
                    {option === 'done'
                      ? 'Finished'
                      : option === 'active'
                        ? 'In progress'
                        : STATUS_META[option].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-grid progress-fields">
              <label className="field">
                <span>
                  Progress <small>{TYPE_META[type].unit}</small>
                </span>
                <input
                  type="number"
                  min={0}
                  max={Number(total) || undefined}
                  value={current}
                  onChange={(event) => setCurrent(event.target.value)}
                  disabled={status === 'done'}
                />
              </label>
              <label className="field">
                <span>
                  Total <small>{seasonal ? `in season ${season || 1}` : TYPE_META[type].unit}</small>
                </span>
                <input
                  type="number"
                  min={1}
                  value={total}
                  onChange={(event) => setTotal(event.target.value)}
                />
              </label>
              {seasonal && (
                <>
                  <label className="field">
                    <span>Season</span>
                    <input
                      type="number"
                      min={1}
                      value={season}
                      onChange={(event) => setSeason(event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>
                      Seasons <small>optional</small>
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={seasonsTotal}
                      onChange={(event) => setSeasonsTotal(event.target.value)}
                      placeholder="e.g. 4"
                    />
                  </label>
                </>
              )}
            </div>

            <div className="form-grid rating-row">
              <div className="field-block">
                <span className="field-label">Your rating</span>
                <div className="rating-input">
                  <RatingStars value={rating} onChange={setRating} size={22} />
                  <span>{rating !== null ? `${rating.toFixed(1)} / 5` : 'Not rated yet'}</span>
                  {rating !== null && (
                    <button type="button" className="clear-rating" onClick={() => setRating(null)}>
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <button
                type="button"
                className={`favorite-toggle ${favorite ? 'active' : ''}`}
                onClick={() => setFavorite((value) => !value)}
                aria-pressed={favorite}
              >
                <Heart size={16} fill={favorite ? 'currentColor' : 'none'} />
                {favorite ? 'In favorites' : 'Mark as favorite'}
              </button>
            </div>

            <label className="field">
              <span>
                Tags <small>comma separated</small>
              </span>
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="rainy day, sci-fi, rewatch"
              />
            </label>

            <label className="field">
              <span>
                Private notes <small>only you</small>
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="A thought to leave beside this one…"
                rows={2}
              />
            </label>
          </div>

          <aside className="cover-studio">
            <div className="cover-studio-head">
              <span className="field-label">Cover</span>
              {image && (
                <div className="cover-mode" role="group" aria-label="Cover style">
                  <button
                    type="button"
                    className={showPhoto ? 'active' : ''}
                    onClick={() => setUseArtwork(true)}
                  >
                    Artwork
                  </button>
                  <button
                    type="button"
                    className={!showPhoto ? 'active' : ''}
                    onClick={() => setUseArtwork(false)}
                  >
                    Drawn
                  </button>
                </div>
              )}
            </div>

            <div className="cover-preview">
              <span className="cover-preview-ring" aria-hidden="true" />
              <Cover
                className="form-cover"
                title={title || 'Untitled'}
                creator={creator || 'You'}
                type={type}
                year={previewYear}
                art={studioArt}
                image={showPhoto ? image : null}
              />
            </div>

            {image && (
              <button type="button" className="artwork-note" onClick={() => setImage(null)}>
                <ImageOff size={12} />
                Remove found artwork
              </button>
            )}

            <div className="studio-section">
              <span className="studio-label">Ink</span>
              <div className="palette-options">
                {PALETTES.map((swatch, index) => (
                  <button
                    type="button"
                    key={index}
                    className={palette.a === swatch.a ? 'active' : ''}
                    onClick={() => setPalette({ a: swatch.a, b: swatch.b, c: swatch.c })}
                    aria-label={`Palette ${index + 1}`}
                    aria-pressed={palette.a === swatch.a}
                    style={
                      {
                        '--pa': swatch.a,
                        '--pb': swatch.b,
                      } as CSSProperties
                    }
                  >
                    <i />
                  </button>
                ))}
              </div>
            </div>

            <div className="studio-section">
              <span className="studio-label">Pattern</span>
              <div className="pattern-options">
                {PATTERN_META.map((option) => (
                  <button
                    type="button"
                    key={option.pattern}
                    className={pattern === option.pattern ? 'active' : ''}
                    onClick={() => setPattern(option.pattern)}
                    aria-pressed={pattern === option.pattern}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="studio-note">
              <span>✳</span>
              <p>
                Found artwork and drawn covers sit side by side — switch whenever the mood changes.
              </p>
            </div>
          </aside>

          <div className="modal-foot item-form-foot">
            <span className="form-hint">
              <MediaGlyph type={type} size={13} /> Saved locally, just for you
            </span>
            <div>
              <button type="button" className="button-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="button-primary">
                {item ? (
                  'Save changes'
                ) : (
                  <>
                    <Plus size={15} /> Add to loom
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
