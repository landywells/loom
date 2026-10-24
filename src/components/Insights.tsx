import {
  ArrowUpRight,
  Check,
  Download,
  Flame,
  Heart,
  Plus,
  Star,
  Upload,
} from 'lucide-react';
import type { Activity, ActivityKind, MediaItem } from '../types';
import {
  ALL_TYPES,
  TYPE_META,
  avgRating,
  currentStreak,
  dateKey,
  formatHours,
  isThisYear,
  relativeTime,
  totalMinutes,
} from '../lib/utils';
import { TYPE_COLOR, TYPE_ICON } from './MediaGlyph';
import { RatingStars } from './RatingStars';
import { Cover } from './Cover';

interface InsightsProps {
  items: MediaItem[];
  activities: Activity[];
  timeLog: Record<string, number>;
  onOpenItem: (id: string) => void;
  onExport: () => void;
  onImport: () => void;
}

const kindMeta: Record<ActivityKind, { icon: typeof Check; label: string }> = {
  added: { icon: Plus, label: 'Added' },
  progress: { icon: ArrowUpRight, label: 'Progress' },
  finished: { icon: Check, label: 'Finished' },
  rated: { icon: Star, label: 'Rated' },
  favorited: { icon: Heart, label: 'Favorite' },
  note: { icon: Plus, label: 'Note' },
};

const DAY = 86_400_000;

export function Insights({ items, activities, timeLog, onOpenItem, onExport, onImport }: InsightsProps) {
  const year = new Date().getFullYear();
  const finished = items.filter((item) => item.status === 'done');
  const finishedThisYear = finished.filter((item) => isThisYear(item.finishedAt));
  const loggedMinutes = totalMinutes(timeLog);
  const rating = avgRating(items);
  const favorites = items.filter((item) => item.favorite);
  const typeCounts = ALL_TYPES.map((type) => ({
    type,
    count: items.filter((item) => item.type === type).length,
  }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
  const topType = typeCounts[0];

  const activityByDay = new Map<string, number>();
  for (const activity of activities) {
    const key = dateKey(activity.at);
    activityByDay.set(key, (activityByDay.get(key) ?? 0) + 1);
  }

  /** 0–4 from minutes actually logged that day. */
  const levelFor = (minutes: number) =>
    minutes <= 0 ? 0 : minutes <= 30 ? 1 : minutes <= 60 ? 2 : minutes <= 120 ? 3 : 4;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mondayOffset = (today.getDay() + 6) % 7;
  const currentMonday = new Date(today.getTime() - mondayOffset * DAY);
  const heatmapStart = new Date(currentMonday.getTime() - 51 * 7 * DAY);
  const heatmapDays = Array.from({ length: 52 * 7 }).map((_, index) => {
    const date = new Date(heatmapStart.getTime() + index * DAY);
    const key = dateKey(date);
    const minutes = timeLog[key] ?? 0;
    return {
      date,
      key,
      minutes,
      future: date.getTime() > today.getTime(),
      level: levelFor(minutes),
      logged: activityByDay.get(key) ?? 0,
    };
  });
  const activeDays = heatmapDays.filter((day) => day.minutes > 0).length;

  const donutTypes = typeCounts.slice(0, 5);
  let cumulative = 0;
  const donutSegments = donutTypes.map((entry) => {
    const start = cumulative;
    const percentage = items.length ? (entry.count / items.length) * 100 : 0;
    cumulative += percentage;
    return `${TYPE_COLOR[entry.type]} ${start}% ${cumulative}%`;
  });
  if (cumulative < 100) {
    donutSegments.push(`var(--line-strong) ${cumulative}% 100%`);
  }

  // Rows whose title has since been deleted would be dead ends.
  const liveActivities = activities.filter((activity) =>
    items.some((item) => item.id === activity.itemId),
  );

  const ratingBuckets = [5, 4, 3, 2, 1].map((value) => ({
    value,
    count: items.filter((item) => item.rating !== null && Math.ceil(item.rating) === value).length,
  }));
  const ratingMax = Math.max(...ratingBuckets.map((bucket) => bucket.count), 1);

  const streak = currentStreak(timeLog);

  return (
    <div className="page insights-page">
      <section className="page-intro insights-intro">
        <div className="page-intro-copy">
          <span className="eyebrow">The long view · {year}</span>
          <h1>
            The shape of your <em>attention.</em>
          </h1>
          <p>A gentle record of where the hours and the feelings went.</p>
        </div>
        <div className="intro-actions">
          <button className="button-secondary" onClick={onImport}>
            <Upload size={15} />
            Import a copy
          </button>
          <button className="button-secondary" onClick={onExport}>
            <Download size={15} />
            Export your data
          </button>
        </div>
      </section>

      <section className="insight-ledger">
        <article>
          <span className="ledger-label">Time, gathered</span>
          <strong>{formatHours(loggedMinutes)}</strong>
          <p>across {items.length} pieces of media</p>
          <span className="ledger-mark">01</span>
        </article>
        <article>
          <span className="ledger-label">Finished this year</span>
          <strong>{finishedThisYear.length}</strong>
          <p>
            {finished.length} since you started keeping track
          </p>
          <span className="ledger-mark">02</span>
        </article>
        <article>
          <span className="ledger-label">Your mean rating</span>
          <strong>{rating.toFixed(1)}</strong>
          <p>out of five, generously</p>
          <span className="ledger-mark">03</span>
        </article>
        <article className="ledger-art">
          <span className="ledger-label">Most gathered</span>
          <strong>{topType ? TYPE_META[topType.type].plural : '—'}</strong>
          <p>{topType?.count ?? 0} titles on the shelf</p>
          <span className="ledger-mark">04</span>
        </article>
      </section>

      <section className="heatmap-card">
        <div className="heatmap-heading">
          <div>
            <span className="eyebrow">Consistency, not perfection</span>
            <h2>The last twelve months</h2>
          </div>
          <div className="heatmap-summary">
            <div>
              <Flame size={14} />
              <span>
                <strong>{streak} days</strong> current streak
              </span>
            </div>
            <div className="heatmap-legend">
              <span>Less</span>
              {[0, 1, 2, 3, 4].map((level) => (
                <i className={`heat-cell level-${level}`} key={level} />
              ))}
              <span>More</span>
            </div>
          </div>
        </div>
        <div className="heatmap-shell">
          <div className="heatmap-weekdays" aria-hidden="true">
            <span>Mon</span>
            <span />
            <span>Wed</span>
            <span />
            <span>Fri</span>
            <span />
            <span>Sun</span>
          </div>
          <div className="heatmap-grid" aria-label="Activity over the last twelve months">
            {heatmapDays.map((day) => (
              <i
                key={day.key}
                className={`heat-cell ${day.future ? 'future' : `level-${day.level}`}`}
                title={`${day.date.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })} · ${day.minutes > 0 ? formatHours(day.minutes) + ' logged' : 'nothing logged'}`}
              />
            ))}
          </div>
        </div>
        <p className="heatmap-caption">
          {activeDays} days with something logged in the last twelve months. Some weeks are louder
          than others — that’s the shape of a life.
        </p>
        <p className="heatmap-hint">Swipe the calendar sideways to see the whole year →</p>
      </section>

      <section className="insight-grid">
        <article className="format-card insight-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Format mix</span>
              <h2>A little of everything</h2>
            </div>
            <span className="panel-index">A</span>
          </div>
          <div className="donut-layout">
            <div
              className="donut"
              style={{ background: `conic-gradient(${donutSegments.join(', ')})` }}
            >
              <div className="donut-center">
                <strong>{items.length}</strong>
                <span>titles</span>
              </div>
            </div>
            <div className="format-legend">
              {donutTypes.map(({ type, count }) => {
                const Icon = TYPE_ICON[type];
                const percentage = Math.round((count / items.length) * 100);
                return (
                  <div className="format-row" key={type}>
                    <span
                      className="format-dot"
                      style={{ background: TYPE_COLOR[type] }}
                    />
                    <Icon size={13} strokeWidth={1.8} />
                    <span>{TYPE_META[type].plural}</span>
                    <strong>{percentage}%</strong>
                  </div>
                );
              })}
              {typeCounts.length > 5 && (
                <div className="format-row format-more">
                  <span className="format-dot" style={{ background: 'var(--line-strong)' }} />
                  <span>Other formats</span>
                  <strong>{100 - donutTypes.reduce((sum, entry) => sum + Math.round((entry.count / items.length) * 100), 0)}%</strong>
                </div>
              )}
            </div>
          </div>
        </article>

        <article className="ratings-card insight-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">A generous eye</span>
              <h2>How you rate</h2>
            </div>
            <span className="panel-index">B</span>
          </div>
          <div className="ratings-average">
            <strong>{rating.toFixed(1)}</strong>
            <div>
              <RatingStars value={rating} size={15} />
              <span>average across {items.filter((item) => item.rating !== null).length} rated titles</span>
            </div>
          </div>
          <div className="rating-bars">
            {ratingBuckets.map((bucket) => (
              <div className="rating-bar-row" key={bucket.value}>
                <span className="rating-bar-label">
                  {bucket.value} <Star size={10} fill="currentColor" />
                </span>
                <div className="rating-bar-track">
                  <span style={{ width: `${(bucket.count / ratingMax) * 100}%` }} />
                </div>
                <span className="rating-bar-count">{bucket.count}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="activity-card insight-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Recently</span>
              <h2>The log</h2>
            </div>
            <span className="panel-index">C</span>
          </div>
          <div className="activity-timeline">
            {liveActivities.slice(0, 6).map((activity) => {
              const KindIcon = kindMeta[activity.kind].icon;
              return (
                <button
                  className="activity-row"
                  key={activity.id}
                  onClick={() => onOpenItem(activity.itemId)}
                >
                  <span className={`activity-dot kind-${activity.kind}`}>
                    <KindIcon size={12} />
                  </span>
                  <span className="activity-copy">
                    <strong>{activity.itemTitle}</strong>
                    <small>{activity.label}</small>
                  </span>
                  <span className="activity-time">{relativeTime(activity.at)}</span>
                </button>
              );
            })}
          </div>
        </article>
      </section>

      <section className="year-callout">
        <div className="year-callout-copy">
          <span className="eyebrow">Your {year}, taking shape</span>
          <h2>
            {finishedThisYear.length} endings, {favorites.length} favorites, and{' '}
            <em>one attentive life.</em>
          </h2>
          <p>
            You’ve spent roughly {Math.round(loggedMinutes / 60)} hours with stories this
            year. That’s not a score — it’s a record of curiosity.
          </p>
        </div>
        <div className="year-covers" aria-hidden="true">
          {finishedThisYear.slice(0, 3).map((item, index) => (
            <div className={`year-cover year-cover-${index}`} key={item.id}>
              <Cover
                title={item.title}
                creator={item.creator}
                type={item.type}
                year={item.year}
                art={item.art}
                image={item.image}
                hideTitle
                hideMeta
              />
            </div>
          ))}
        </div>
        <span className="year-star" aria-hidden="true">
          ✳
        </span>
      </section>
    </div>
  );
}
