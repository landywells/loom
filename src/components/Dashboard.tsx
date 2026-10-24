import type { CSSProperties } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Clock3,
  Flame,
  Heart,
  LibraryBig,
  Plus,
  Sparkles,
} from 'lucide-react';
import type { MediaItem, Page, ReadingLog } from '../types';
import { CURRENT_USER } from '../lib/data';
import {
  TYPE_META,
  compactProgress,
  currentStreak,
  formatHours,
  greeting,
  isThisYear,
  longDate,
  progressPercent,
  recentDays,
  relativeTime,
  remainingLabel,
  totalMinutes,
} from '../lib/utils';
import { Cover } from './Cover';
import { MediaCard } from './MediaCard';
import { MediaGlyph } from './MediaGlyph';
import { Player } from './Player';

interface DashboardProps {
  items: MediaItem[];
  reading: ReadingLog;
  timeLog: Record<string, number>;
  onOpenItem: (id: string) => void;
  onNavigate: (page: Page) => void;
  onAdd: () => void;
  onToggleFavorite: (id: string) => void;
  onLogReading: (pages: number) => void;
}

const READING_GOAL = 30;

export function Dashboard({
  items,
  reading,
  timeLog,
  onOpenItem,
  onNavigate,
  onAdd,
  onToggleFavorite,
  onLogReading,
}: DashboardProps) {
  const active = items.filter((item) => item.status === 'active');
  const current =
    items.find((item) => item.id === 'dune-two' && item.status === 'active') ??
    active[0] ??
    items[0];
  const readingNow =
    items.find((item) => item.type === 'book' && item.status === 'active') ??
    items.find((item) => item.type === 'book');
  const backlog = items.filter((item) => item.status === 'backlog');
  const streak = currentStreak(timeLog);
  const finishedThisYear = items.filter(
    (item) => item.status === 'done' && isThisYear(item.finishedAt),
  ).length;
  const loggedTotal = totalMinutes(timeLog);
  const pagesToday = reading.pages;
  const readingPercent = Math.min(100, Math.round((pagesToday / READING_GOAL) * 100));
  const pagesLeft = Math.max(0, READING_GOAL - pagesToday);
  const percent = current ? progressPercent(current) : 0;

  // Real logged minutes, this week and the one before it.
  const week = recentDays(timeLog, 7);
  const todayIndex = week.length - 1;
  const weekTotal = week.reduce((sum, day) => sum + day.minutes, 0);
  const previousTotal = recentDays(timeLog, 14)
    .slice(0, 7)
    .reduce((sum, day) => sum + day.minutes, 0);
  const maxWeekValue = Math.max(...week.map((day) => day.minutes), 1);
  const weekDelta = previousTotal
    ? Math.round(((weekTotal - previousTotal) / previousTotal) * 100)
    : null;
  const busiest = week.reduce((best, day) => (day.minutes > best.minutes ? day : best), week[0]);
  const busiestDay = busiest && busiest.minutes > 0 ? busiest.date.toLocaleDateString('en-US', { weekday: 'long' }) : null;

  const stats = [
    {
      label: 'In your loom',
      value: String(items.length),
      detail: 'across ten formats',
      icon: LibraryBig,
      mark: '01',
    },
    {
      label: `Finished in ${new Date().getFullYear()}`,
      value: String(finishedThisYear),
      detail: 'a very good year',
      icon: Check,
      mark: '02',
    },
    {
      label: 'Time well spent',
      value: formatHours(loggedTotal),
      detail: 'stories, pages & play',
      icon: Clock3,
      mark: '03',
    },
    {
      label: 'Current streak',
      value: `${streak} days`,
      detail: 'tender consistency',
      icon: Flame,
      mark: '04',
    },
  ];

  return (
    <div className="page dashboard-page">
      <section className="page-intro">
        <div className="page-intro-copy">
          <span className="eyebrow">{longDate()} · a living archive</span>
          <h1>
            {greeting()}, <em>{CURRENT_USER.name}.</em>
          </h1>
          <p>Everything you love, gathered into one quiet corner.</p>
        </div>
        <div className="intro-actions">
          <button className="button-secondary" onClick={onAdd}>
            <Plus size={16} />
            Log something new
          </button>
        </div>
      </section>

      <section className="hero-layout" aria-label="Currently consuming">
        {current && (
          <article
            className="now-card"
            style={
              {
                '--now-accent': current.art.b,
                '--now-bg': current.art.a,
              } as CSSProperties
            }
          >
            <span className="now-ornament" aria-hidden="true">
              02
            </span>
            <div className="now-glow" aria-hidden="true" />

            <div className="now-copy">
              <div className="now-label">
                <span className="live-dot" />
                Now consuming
                <span className="now-separator">/</span>
                <span>{TYPE_META[current.type].label}</span>
              </div>
              <h2>{current.title}</h2>
              <p className="now-meta">
                {current.creator} <span>·</span> {current.year} <span>·</span>{' '}
                {current.progress.total} {current.progress.unit}
              </p>
              <p className="now-blurb">{current.blurb}</p>

              <div className="now-progress">
                <div className="now-progress-top">
                  <span>{compactProgress(current)}</span>
                  <span>{percent}%</span>
                </div>
                <div className="now-progress-line">
                  <span style={{ width: `${percent}%` }} />
                </div>
                <span className="now-remaining">{remainingLabel(current)}</span>
              </div>

              <div className="now-actions">
                <button className="button-accent" onClick={() => onOpenItem(current.id)}>
                  Pick up where you left off
                  <ArrowUpRight size={16} />
                </button>
                <button
                  className={`round-heart ${current.favorite ? 'active' : ''}`}
                  onClick={() => onToggleFavorite(current.id)}
                  aria-label="Toggle favorite"
                >
                  <Heart size={17} fill={current.favorite ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>

            <div className="now-art">
              <span className="cover-aura" aria-hidden="true" />
              <button
                className="now-cover-button"
                onClick={() => onOpenItem(current.id)}
                aria-label={`Open ${current.title}`}
              >
                <Cover
                  className="now-cover"
                  title={current.title}
                  creator={current.creator}
                  type={current.type}
                  year={current.year}
                  art={current.art}
                  image={current.image}
                />
              </button>
              <span className="now-art-caption">
                <Sparkles size={12} />
                handpicked for tonight
              </span>
            </div>
          </article>
        )}

        <div className="hero-aside">
          <article className="side-card ritual-card">
            <div className="ritual-heading">
              <span className="tiny-label">
                <BookOpen size={12} />
                Daily ritual
              </span>
              <span className="ritual-streak">
                <Flame size={12} fill="currentColor" />
                {streak}
              </span>
            </div>
            <div className="ritual-body">
              <div
                className="reading-ring"
                style={{ '--reading-progress': `${readingPercent * 3.6}deg` } as CSSProperties}
              >
                <div className="reading-ring-inner">
                  <strong>{pagesToday}</strong>
                  <span>of {READING_GOAL} pp.</span>
                </div>
              </div>
              <div className="ritual-copy">
                <h3>A few pages before the day ends.</h3>
                {readingNow && (
                  <p>
                    in <button onClick={() => onOpenItem(readingNow.id)}>{readingNow.title}</button>
                  </p>
                )}
              </div>
            </div>
            <div className="ritual-footer">
              <span>
                {pagesLeft > 0 ? `${pagesLeft} pages to close the ring` : 'Today’s goal is closed ✳'}
              </span>
              <button onClick={() => onLogReading(10)}>
                <Plus size={12} />
                10 pages
              </button>
            </div>
          </article>

          <Player />
        </div>
      </section>

      <section className="stats-strip" aria-label="Library statistics">
        {stats.map(({ label, value, detail, icon: Icon, mark }) => (
          <article className="stat-cell" key={label}>
            <div className="stat-top">
              <span className="stat-icon">
                <Icon size={15} strokeWidth={1.8} />
              </span>
              <span className="stat-mark">{mark}</span>
            </div>
            <strong className="stat-value">{value}</strong>
            <div className="stat-bottom">
              <span>{label}</span>
              <small>{detail}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Mid-flight</span>
            <h2>In your orbit</h2>
          </div>
          <div className="section-heading-side">
            <span>{active.length} in progress</span>
            <button className="text-link" onClick={() => onNavigate('library')}>
              View library <ArrowRight size={14} />
            </button>
          </div>
        </div>
        <div className="orbit-rail">
          {active.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onOpen={onOpenItem}
              onFavorite={onToggleFavorite}
            />
          ))}
        </div>
      </section>

      <section className="dashboard-split">
        <article className="week-card">
          <div className="week-heading">
            <div>
              <span className="eyebrow">Rhythm</span>
              <h2>Your week in stories</h2>
            </div>
            <span className="trend-chip">
              {weekDelta === null
                ? 'first week logged'
                : `${weekDelta >= 0 ? '+' : '−'}${Math.abs(weekDelta)}% `}
              {weekDelta !== null && <small>vs last week</small>}
            </span>
          </div>
          <div className="week-summary">
            <strong>{formatHours(weekTotal)}</strong>
            <span>well spent this week</span>
          </div>
          <div className="week-chart" aria-label="Minutes logged each day this week">
            {week.map((day, index) => (
              <div
                className={`week-bar ${index === todayIndex ? 'is-today' : ''}`}
                key={day.key}
                title={`${day.date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })} · ${formatHours(day.minutes)}`}
              >
                <div className="week-bar-track">
                  <span
                    style={{
                      height: day.minutes ? `${Math.max(8, (day.minutes / maxWeekValue) * 100)}%` : '2px',
                    }}
                  />
                </div>
                <small>{day.date.toLocaleDateString('en-US', { weekday: 'short' })}</small>
              </div>
            ))}
          </div>
          <div className="week-foot">
            <span>
              <Flame size={13} />
              {busiestDay ? `Busiest day so far: ${busiestDay}` : 'Nothing logged yet this week'}
            </span>
            <button className="text-link" onClick={() => onNavigate('insights')}>
              See insights <ArrowUpRight size={13} />
            </button>
          </div>
        </article>

        <article className="queue-card">
          <div className="queue-heading">
            <div>
              <span className="eyebrow">Next in line</span>
              <h2>The queue</h2>
            </div>
            <span className="queue-count">{backlog.length}</span>
          </div>
          <div className="queue-list">
            {backlog.slice(0, 3).map((item) => (
              <button className="queue-row" key={item.id} onClick={() => onOpenItem(item.id)}>
                <Cover
                  className="queue-cover"
                  title={item.title}
                  creator={item.creator}
                  type={item.type}
                  year={item.year}
                  art={item.art}
                  image={item.image}
                  hideTitle
                  hideMeta
                />
                <span className="queue-copy">
                  <span className="queue-type">
                    <MediaGlyph type={item.type} size={12} />
                    {TYPE_META[item.type].label}
                  </span>
                  <strong>{item.title}</strong>
                  <small>
                    {item.creator} · added {relativeTime(item.addedAt)}
                  </small>
                </span>
                <span className="queue-arrow">
                  <ArrowUpRight size={15} />
                </span>
              </button>
            ))}
          </div>
          <button className="queue-footer" onClick={() => onNavigate('discover')}>
            <span>
              <Sparkles size={14} />
              Find something unexpected
            </span>
            <ArrowRight size={15} />
          </button>
        </article>
      </section>
    </div>
  );
}
