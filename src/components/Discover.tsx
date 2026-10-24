import { useState } from 'react';
import { Check, Plus, Sparkles, Star } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { DiscoveryItem, MediaItem, MediaType } from '../types';
import { ALL_TYPES, TYPE_META } from '../lib/utils';
import { Cover } from './Cover';
import { MediaGlyph } from './MediaGlyph';

interface DiscoverProps {
  discovery: DiscoveryItem[];
  items: MediaItem[];
  onAddDiscovery: (discovery: DiscoveryItem) => void;
}

export function Discover({ discovery, items, onAddDiscovery }: DiscoverProps) {
  const [filter, setFilter] = useState<MediaType | 'all'>('all');
  const featured = discovery.find((item) => item.id === 'disc-piranesi') ?? discovery[0];
  const featuredSaved = items.some((item) => item.discoveryId === featured.id);
  const availableTypes = ALL_TYPES.filter((type) =>
    discovery.some((item) => item.type === type),
  );
  const filtered = discovery.filter((item) => {
    if (item.id === featured.id) return false;
    return filter === 'all' || item.type === filter;
  });

  return (
    <div className="page discover-page">
      <section className="page-intro discover-intro">
        <div className="page-intro-copy">
          <span className="eyebrow">The outside world · refreshed weekly</span>
          <h1>
            Go find your next <em>favorite.</em>
          </h1>
          <p>A hand-picked field guide to things worth your attention.</p>
        </div>
        <div className="discover-stamp" aria-hidden="true">
          <span>CURATED</span>
          <strong>12</strong>
          <span>THIS WEEK</span>
        </div>
      </section>

      <section
        className="feature-panel"
        style={
          {
            '--feature-wash': featured.art.a,
            '--feature-ink': featured.art.c,
            '--feature-accent': featured.art.b,
          } as CSSProperties
        }
      >
        <span className="feature-arch" aria-hidden="true" />
        <div className="feature-copy">
          <span className="feature-kicker">
            <Sparkles size={13} />
            Editor’s pick · No. 07
          </span>
          <h2>{featured.title}</h2>
          <p className="feature-byline">
            {featured.creator} <span>·</span> {featured.year} <span>·</span>{' '}
            {TYPE_META[featured.type].label}
          </p>
          <p className="feature-blurb">{featured.blurb}</p>
          <div className="feature-meta">
            <span className="feature-rating">
              <Star size={13} fill="currentColor" />
              {featured.rating.toFixed(1)}
            </span>
            {featured.tags.map((tag) => (
              <span className="soft-chip" key={tag}>
                {tag}
              </span>
            ))}
          </div>
          <button
            className={`feature-cta ${featuredSaved ? 'saved' : ''}`}
            onClick={() => onAddDiscovery(featured)}
            disabled={featuredSaved}
          >
            {featuredSaved ? (
              <>
                <Check size={16} /> In your loom
              </>
            ) : (
              <>
                <Plus size={16} /> Save to my library
              </>
            )}
          </button>
        </div>
        <div className="feature-visual">
          <span className="feature-orbit" aria-hidden="true" />
          <Cover
            className="feature-cover"
            title={featured.title}
            creator={featured.creator}
            type={featured.type}
            year={featured.year}
            art={featured.art}
          />
          <span className="feature-note">
            <i>“</i>
            The house is infinite. The tide is rising.
          </span>
        </div>
      </section>

      <section className="discover-browse">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Wander a little</span>
            <h2>Worth a look</h2>
          </div>
          <span className="section-side-note">{discovery.length - 1} picks, zero algorithms</span>
        </div>

        <div className="discover-filters">
          <button
            className={`type-chip ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Everything
          </button>
          {availableTypes.map((type) => (
            <button
              key={type}
              className={`type-chip ${filter === type ? 'active' : ''}`}
              onClick={() => setFilter(type)}
            >
              <MediaGlyph type={type} size={13} />
              {TYPE_META[type].plural}
            </button>
          ))}
        </div>

        <div className="discover-grid">
          {filtered.map((item, index) => {
            const saved = items.some((entry) => entry.discoveryId === item.id);
            return (
              <article className="discover-card" key={item.id}>
                <div className="discover-art">
                  <Cover
                    title={item.title}
                    creator={item.creator}
                    type={item.type}
                    year={item.year}
                    art={item.art}
                  />
                  <span className="discover-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="discover-copy">
                  <div className="discover-meta">
                    <span>
                      <MediaGlyph type={item.type} size={12} />
                      {TYPE_META[item.type].label}
                    </span>
                    <span className="discover-rating">
                      <Star size={11} fill="currentColor" />
                      {item.rating.toFixed(1)}
                    </span>
                  </div>
                  <h3>{item.title}</h3>
                  <p className="discover-creator">
                    {item.creator} · {item.year}
                  </p>
                  <p className="discover-blurb">{item.blurb}</p>
                  <div className="discover-tags">
                    {item.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className="discover-card-foot">
                    <span>Handpicked for you</span>
                    <button
                      className={`save-button ${saved ? 'saved' : ''}`}
                      onClick={() => onAddDiscovery(item)}
                      disabled={saved}
                    >
                      {saved ? <Check size={13} /> : <Plus size={13} />}
                      {saved ? 'In your loom' : 'Save'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="discover-closer">
        <span className="closer-mark">✳</span>
        <p>
          “Taste is not a personality. It’s a record of <em>paying attention.</em>”
        </p>
        <span className="closer-credit">A note from the editor</span>
      </section>
    </div>
  );
}
