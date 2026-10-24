import type { AppData } from '../types';
import {
  decryptJson,
  deriveKeyBase64,
  encryptJson,
  encryptJsonWithKey,
  isEnvelope,
} from './crypto';
import { pullRemote, pushRemote, type SyncTarget } from './remotes';

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

export interface SyncSecret {
  key?: string;
  salt?: string;
  passphrase?: string;
}

/**
 * Folds the remote copy in. `null` means there is nothing out there yet.
 * When it returns a key and salt, the caller should cache them: that is the
 * remote's own salt, so pushing back never rotates it and strands a second
 * device's cached key.
 */
export async function pullSync(
  target: SyncTarget,
  secret: SyncSecret,
  local: AppData,
  revisions: Revisions,
  signal?: AbortSignal,
): Promise<{ data: AppData; report: MergeReport; key?: string; salt?: string } | null> {
  const doc = await pullRemote(target, signal);
  if (!doc) return null;

  let incoming: Partial<AppData>;
  let rekeyed: { key?: string; salt?: string } = {};

  if (isEnvelope(doc)) {
    if (!secret.key && !secret.passphrase) {
      throw new Error('That copy is locked — enter its passphrase.');
    }
    let opened;
    try {
      opened = await decryptJson<AppData>(doc, secret);
    } catch (error) {
      // A cached key can be stale if this device joined before the first sync;
      // the passphrase still opens it if the user has it.
      if (!secret.passphrase) {
        throw new Error(
          'Another device started this copy — type the passphrase to join it.',
        );
      }
      opened = await decryptJson<AppData>(doc, { passphrase: secret.passphrase });
    }
    incoming = opened.value;
    rekeyed = { key: opened.key, salt: doc.kdf.salt };
  } else {
    // A plain export written before encryption existed still merges.
    incoming = doc as Partial<AppData>;
  }

  return { ...mergeLibrary(local, incoming, revisions), ...rekeyed };
}

/**
 * Reuses the original salt whenever a cached key exists, because deriving
 * against a fresh salt would strand every other device's stored key.
 * Returns only the key and salt — the passphrase must never be persisted.
 */
export async function pushSync(
  target: SyncTarget,
  secret: SyncSecret,
  data: AppData,
  signal?: AbortSignal,
): Promise<{ target: SyncTarget; key: string; salt: string }> {
  const reusable = Boolean(secret.key && secret.salt);
  const envelope = reusable
    ? await encryptJsonWithKey(data, secret.salt!, secret.key!)
    : await encryptJson(data, secret.passphrase ?? '');

  const salt = envelope.kdf.salt;
  const key = reusable
    ? secret.key!
    : await deriveKeyBase64(secret.passphrase ?? '', salt, envelope.kdf.iterations);

  return { target: await pushRemote(target, envelope, signal), key, salt };
}
