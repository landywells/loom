import { Heart } from 'lucide-react';
import type { MediaItem } from '../types';
import {
  TYPE_META,
  compactProgress,
  progressPercent,
  statusLabel,
} from '../lib/utils';
import { Cover } from './Cover';
import { CreatorLink } from './CreatorLink';
import { RatingStars } from './RatingStars';

interface MediaCardProps {
  item: MediaItem;
  onOpen: (id: string) => void;
  onFavorite: (id: string) => void;
}

export function MediaCard({ item, onOpen, onFavorite }: MediaCardProps) {
  const percent = progressPercent(item);
  const showProgress = item.status !== 'backlog';

  return (
    <article className="media-card">
      <div className="media-card-visual">
        <button
          className="cover-hit"
          onClick={() => onOpen(item.id)}
          aria-label={`Open ${item.title}`}
        >
          <Cover
            title={item.title}
            creator={item.creator}
            type={item.type}
            year={item.year}
            art={item.art}
            image={item.image}
          />
        </button>
        <button
          className={`favorite-button ${item.favorite ? 'is-favorite' : ''}`}
          onClick={() => onFavorite(item.id)}
          aria-label={item.favorite ? `Remove ${item.title} from favorites` : `Favorite ${item.title}`}
        >
          <Heart size={14} fill={item.favorite ? 'currentColor' : 'none'} strokeWidth={1.8} />
        </button>
      </div>

      <div className="media-card-body">
        <div className="media-card-meta">
          <span>
            {TYPE_META[item.type].short} · {item.year}
          </span>
          {item.rating !== null ? (
            <RatingStars value={item.rating} size={10} />
          ) : (
            <span className="unrated">Unrated</span>
          )}
        </div>
        <button className="media-card-title" onClick={() => onOpen(item.id)}>
          {item.title}
        </button>
        <p className="media-card-creator"><CreatorLink name={item.creator} /></p>

        {showProgress ? (
          <div className="media-card-progress">
            <div className="card-progress-labels">
              <span>{item.status === 'active' ? compactProgress(item) : statusLabel(item.type, item.status)}</span>
              <span>{percent}%</span>
            </div>
            <div className="thin-progress">
              <span style={{ width: `${percent}%` }} />
            </div>
          </div>
        ) : (
          <div className="media-card-progress">
            <div className="card-progress-labels">
              <span>{statusLabel(item.type, item.status)}</span>
              <span>{TYPE_META[item.type].plural}</span>
            </div>
            <div className="thin-progress is-idle">
              <span style={{ width: '0%' }} />
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
