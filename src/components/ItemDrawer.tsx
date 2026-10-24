import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock3,
  Heart,
  Minus,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { Activity, Collection, MediaItem, Status } from '../types';
import {
  TYPE_META,
  compactProgress,
  formatDate,
  formatMinutes,
  isSeasonal,
  progressPercent,
  progressStep,
  relativeTime,
  remainingLabel,
  statusLabel,
} from '../lib/utils';
import { useFocusTrap } from '../lib/useFocusTrap';
import { fetchSongPreview, playTargets, type SongPreview } from '../lib/music';
import { openExternal } from '../lib/desktop';
import { Cover } from './Cover';
import { CreatorLink } from './CreatorLink';
import { MediaGlyph } from './MediaGlyph';
import { RatingStars } from './RatingStars';

interface ItemDrawerProps {
  item: MediaItem;
  activities: Activity[];
  collections: Collection[];
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onRate: (id: string, rating: number | null) => void;
  onStatusChange: (id: string, status: Status) => void;
  onProgressChange: (id: string, current: number) => void;
  onSaveNotes: (id: string, notes: string) => void;
  onToggleCollection: (collectionId: string, itemId: string) => void;
  onChangeSeason: (id: string, direction: 1 | -1) => void;
  onEdit: (item: MediaItem) => void;
  onDelete: (id: string) => void;
}

const statusOrder: Status[] = ['active', 'backlog', 'paused', 'done', 'dropped'];

export function ItemDrawer({
  item,
  activities,
  collections,
  onClose,
  onToggleFavorite,
  onRate,
  onStatusChange,
  onProgressChange,
  onSaveNotes,
  onToggleCollection,
  onChangeSeason,
  onEdit,
  onDelete,
}: ItemDrawerProps) {
  const panelRef = useFocusTrap<HTMLElement>();
  const [notes, setNotes] = useState(item.notes);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const percent = progressPercent(item);
  const step = progressStep(item);
  const itemActivities = activities.filter((activity) => activity.itemId === item.id).slice(0, 3);
  const notesChanged = notes !== item.notes;

  const playable = item.type === 'music' || item.type === 'podcast' || item.type === 'video';
  const audioRef = useRef<HTMLAudioElement>(null);
  const [preview, setPreview] = useState<SongPreview | null>(null);
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'ready' | 'playing' | 'missing'>('idle');

  useEffect(() => {
    audioRef.current?.pause();
    setPreview(null);
    setPreviewState('idle');
  }, [item.id]);

  useEffect(() => () => audioRef.current?.pause(), []);

  const togglePreview = async () => {
    const audio = audioRef.current;
    if (!audio || previewState === 'loading') return;
    if (previewState === 'playing') {
      audio.pause();
      return;
    }
    if (preview) {
      await audio.play().catch(() => setPreviewState('missing'));
      return;
    }
    setPreviewState('loading');
    const found = await fetchSongPreview(item.title, item.creator).catch(() => null);
    if (!found) {
      setPreviewState('missing');
      return;
    }
    setPreview(found);
    audio.src = found.url;
    await audio.play().catch(() => setPreviewState('missing'));
  };

  useEffect(() => {
    setNotes(item.notes);
  }, [item.id, item.notes]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const increase = () => {
    onProgressChange(item.id, Math.min(item.progress.total, item.progress.current + step));
  };
  const decrease = () => {
    onProgressChange(item.id, Math.max(0, item.progress.current - step));
  };

  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside ref={panelRef} className="item-drawer" role="dialog" aria-modal="true" aria-label={`${item.title} details`}>
        <div className="drawer-topbar">
          <span className="drawer-index">
            <MediaGlyph type={item.type} size={13} />
            {TYPE_META[item.type].label} · {item.year}
          </span>
          <button className="quiet-icon-button" onClick={onClose} aria-label="Close details">
            <X size={17} />
          </button>
        </div>

        <div className="drawer-scroll">
          <div
            className="drawer-hero"
            style={{ '--drawer-accent': item.art.b, '--drawer-wash': item.art.a } as React.CSSProperties}
          >
            <span className="drawer-hero-orb" aria-hidden="true" />
            <Cover
              className="drawer-cover"
              title={item.title}
              creator={item.creator}
              type={item.type}
              year={item.year}
              art={item.art}
              image={item.image}
            />
            <div className="drawer-headline">
              <span className="eyebrow">
                {item.status === 'done' ? 'A finished thing' : statusLabel(item.type, item.status)}
              </span>
              <h1>{item.title}</h1>
              <p className="drawer-creator">
                <CreatorLink name={item.creator} /> <span>·</span> {item.year}
              </p>
              <div className="drawer-rating">
                <RatingStars value={item.rating} size={17} onChange={(value) => onRate(item.id, value)} />
                <span>{item.rating !== null ? item.rating.toFixed(1) : 'Rate this'}</span>
              </div>
              <button
                className={`drawer-favorite ${item.favorite ? 'active' : ''}`}
                onClick={() => onToggleFavorite(item.id)}
                aria-pressed={item.favorite}
              >
                <Heart size={15} fill={item.favorite ? 'currentColor' : 'none'} />
                {item.favorite ? 'A favorite' : 'Add to favorites'}
              </button>
            </div>
          </div>

          <div className="drawer-content">
            <p className="drawer-blurb">{item.blurb}</p>

            <div className="drawer-section">
              <div className="drawer-section-heading">
                <span>Progress</span>
                <span>{percent}%</span>
              </div>
              <div className="drawer-progress-card">
                <div className="drawer-progress-info">
                  <div>
                    <strong>{compactProgress(item)}</strong>
                    <span>
                      {item.status === 'done'
                        ? 'All the way through'
                        : remainingLabel(item)}
                    </span>
                  </div>
                  <span className="drawer-percent">{percent}%</span>
                </div>
                <div className="drawer-progress-track">
                  <span style={{ width: `${percent}%` }} />
                  <i style={{ left: `calc(${percent}% - 5px)` }} />
                </div>
                {isSeasonal(item) && (
                  <div className="drawer-season">
                    <span className="drawer-season-label">Season</span>
                    <div className="drawer-season-controls">
                      <button
                        onClick={() => onChangeSeason(item.id, -1)}
                        disabled={(item.progress.season ?? 1) <= 1}
                        aria-label="Previous season"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <strong>
                        {item.progress.season}
                        {item.progress.seasonsTotal ? ` / ${item.progress.seasonsTotal}` : ''}
                      </strong>
                      <button
                        onClick={() => onChangeSeason(item.id, 1)}
                        disabled={
                          !!item.progress.seasonsTotal &&
                          (item.progress.season ?? 1) >= item.progress.seasonsTotal
                        }
                        aria-label="Next season"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="drawer-progress-controls">
                  <button onClick={decrease} disabled={item.progress.current <= 0} aria-label="Decrease progress">
                    <Minus size={14} />
                  </button>
                  <span>
                    {item.progress.current}
                    <small> / {item.progress.total} {item.progress.unit}</small>
                  </span>
                  <button
                    onClick={increase}
                    disabled={item.progress.current >= item.progress.total}
                    aria-label="Increase progress"
                  >
                    <Plus size={14} />
                    <small>+{step}</small>
                  </button>
                </div>
              </div>
            </div>

            {playable && (
              <div className="drawer-section">
                <div className="drawer-section-heading">
                  <span>Play</span>
                  {item.type === 'music' && <span>30-second clip</span>}
                </div>

                {item.type === 'music' && (
                  <div className={`drawer-preview ${previewState === 'playing' ? 'is-playing' : ''}`}>
                    <button
                      onClick={togglePreview}
                      disabled={previewState === 'loading' || previewState === 'missing'}
                      aria-label={previewState === 'playing' ? 'Pause the clip' : 'Play a 30 second clip'}
                    >
                      {previewState === 'playing' ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <div className="drawer-preview-copy">
                      <strong>
                        {previewState === 'missing'
                          ? 'No clip for this one'
                          : previewState === 'loading'
                            ? 'Finding a clip…'
                            : preview?.track ?? item.title}
                      </strong>
                      <span>
                        {preview
                          ? `${preview.artist} · via Apple`
                          : previewState === 'missing'
                            ? 'Try a service below instead'
                            : 'Tap to audition it'}
                      </span>
                    </div>
                    <audio
                      ref={audioRef}
                      preload="none"
                      onPlay={() => setPreviewState('playing')}
                      onPause={() => setPreviewState((state) => (state === 'playing' ? 'ready' : state))}
                      onEnded={() => setPreviewState('ready')}
                    />
                  </div>
                )}

                <div className="drawer-play-targets">
                  {playTargets(item).map((target) => (
                    <button key={target.id} onClick={() => void openExternal(target.url)}>
                      {target.label}
                      <ArrowUpRight size={12} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="drawer-section">
              <div className="drawer-section-heading">
                <span>Status</span>
              </div>
              <div className="drawer-statuses">
                {statusOrder.map((option) => (
                  <button
                    key={option}
                    className={item.status === option ? 'active' : ''}
                    onClick={() => onStatusChange(item.id, option)}
                  >
                    {item.status === option && <Check size={11} />}
                    {statusLabel(item.type, option)}
                  </button>
                ))}
              </div>
            </div>

            {(item.tags.length > 0 || item.genres.length > 0) && (
              <div className="drawer-tags">
                {[...item.genres, ...item.tags].map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            )}

            {collections.length > 0 && (
              <div className="drawer-section">
                <div className="drawer-section-heading">
                  <span>On shelves</span>
                  <span>
                    {collections.filter((c) => c.itemIds.includes(item.id)).length} of{' '}
                    {collections.length}
                  </span>
                </div>
                <div className="drawer-collections">
                  {collections.map((collection) => {
                    const inside = collection.itemIds.includes(item.id);
                    return (
                      <button
                        key={collection.id}
                        className={`drawer-collection ${inside ? 'inside' : ''}`}
                        onClick={() => onToggleCollection(collection.id, item.id)}
                        aria-pressed={inside}
                      >
                        <span
                          className="drawer-collection-dot"
                          style={{ background: collection.accent }}
                        />
                        <span className="drawer-collection-name">{collection.name}</span>
                        <span className="drawer-collection-state">
                          {inside ? 'On' : 'Add'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="drawer-section drawer-notes">
              <div className="drawer-section-heading">
                <span>Private notes</span>
                {notesChanged && <button onClick={() => onSaveNotes(item.id, notes)}>Save note</button>}
              </div>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Leave a thought beside this one…"
                rows={3}
              />
            </div>

            <div className="drawer-section">
              <div className="drawer-meta-grid">
                <div>
                  <CalendarDays size={14} />
                  <span>
                    <small>Added</small>
                    {formatDate(item.addedAt)}
                  </span>
                </div>
                <div>
                  <Clock3 size={14} />
                  <span>
                    <small>Time logged</small>
                    {formatMinutes(item.minutesSpent) || '—'}
                  </span>
                </div>
                {item.finishedAt && (
                  <div>
                    <Check size={14} />
                    <span>
                      <small>Finished</small>
                      {formatDate(item.finishedAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {itemActivities.length > 0 && (
              <div className="drawer-section drawer-history">
                <div className="drawer-section-heading">
                  <span>Small moments</span>
                </div>
                {itemActivities.map((activity) => (
                  <div className="drawer-history-row" key={activity.id}>
                    <i />
                    <span>{activity.label}</span>
                    <small>{relativeTime(activity.at)}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {confirmDelete ? (
          <div className="drawer-confirm">
            <span>Remove “{item.title}” from your loom?</span>
            <div>
              <button onClick={() => setConfirmDelete(false)}>Keep it</button>
              <button className="danger-button" onClick={() => onDelete(item.id)}>
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="drawer-footer">
            <button className="drawer-delete" onClick={() => setConfirmDelete(true)} aria-label="Delete entry">
              <Trash2 size={16} />
            </button>
            <button className="button-secondary drawer-edit" onClick={() => onEdit(item)}>
              <Pencil size={14} />
              Edit entry
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
