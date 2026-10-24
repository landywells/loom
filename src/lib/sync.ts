import type { AppData } from '../types';

export type Revisions = Map<string, { signature: string; at: number }>;

type Stamped = { id: string; updatedAt?: number };

const signatureOf = (entry: Stamped) => JSON.stringify({ ...entry, updatedAt: 0 });

/**
 * Keeps `updatedAt` honest without threading a stamp through every mutation:
 * the persist path compares each entry against what it last wrote and only
 * moves the clock when the content actually changed.
 */
export function stampRevisions<T extends Stamped>(
  revisions: Revisions,
  entries: T[],
  now = Date.now(),
): T[] {
  return entries.map((entry) => {
    const signature = signatureOf(entry);
    const known = revisions.get(entry.id);
    const at = known
      ? known.signature === signature
        ? known.at
        : now
      : entry.updatedAt ?? now;
    revisions.set(entry.id, { signature, at });
    return entry.updatedAt === at ? entry : { ...entry, updatedAt: at };
  });
}

/** Libraries saved before timestamps existed borrow their last known activity. */
export function backfillStamps(data: AppData, now = Date.now()): AppData {
  const stampOf = (entry: { addedAt?: string; finishedAt?: string }) => {
    const parsed = Date.parse(entry.finishedAt ?? entry.addedAt ?? '');
    return Number.isNaN(parsed) ? now : parsed;
  };
  return {
    ...data,
    items: data.items.map((item) => (item.updatedAt ? item : { ...item, updatedAt: stampOf(item) })),
    collections: data.collections.map((collection) =>
      collection.updatedAt ? collection : { ...collection, updatedAt: now },
    ),
  };
}

export interface MergeReport {
  added: number;
  updated: number;
}

function mergeById<T extends Stamped>(
  ours: T[],
  theirs: T[],
  revisions: Revisions,
  report: MergeReport,
): T[] {
  const byId = new Map(ours.map((entry) => [entry.id, entry]));
  for (const incoming of theirs) {
    if (!incoming || typeof incoming.id !== 'string') continue;
    const known = byId.get(incoming.id);
    if (!known || (incoming.updatedAt ?? 0) > (known.updatedAt ?? 0)) {
      byId.set(incoming.id, incoming);
      revisions.delete(incoming.id);
      if (known) report.updated += 1;
      else report.added += 1;
    }
  }
  return [...byId.values()];
}

/**
 * Folds another device's library into this one. Newest edit wins per entry, so
 * neither phone nor desktop has to be the authority; time is reconciled by day
 * because two devices logging the same evening must not count it twice.
 */
export function mergeLibrary(
  local: AppData,
  remote: Partial<AppData>,
  revisions: Revisions,
): { data: AppData; report: MergeReport } {
  const report: MergeReport = { added: 0, updated: 0 };

  const items = mergeById(local.items, (remote.items ?? []) as AppData['items'], revisions, report);
  const collections = mergeById(
    local.collections,
    (remote.collections ?? []) as AppData['collections'],
    revisions,
    report,
  );

  const knownActivities = new Set(local.activities.map((activity) => activity.id));
  const activities = [
    ...local.activities,
    ...(remote.activities ?? []).filter(
      (activity) => activity && !knownActivities.has(activity.id),
    ),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  const timeLog = { ...local.timeLog };
  for (const [day, minutes] of Object.entries(remote.timeLog ?? {})) {
    timeLog[day] = Math.max(timeLog[day] ?? 0, minutes);
  }

  const reading =
    (remote.reading?.date ?? '') > (local.reading.date ?? '') ? remote.reading! : local.reading;

  return {
    data: { ...local, items, collections, activities, timeLog, reading },
    report,
  };
}
