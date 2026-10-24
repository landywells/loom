export const SYNC_FILENAME = 'loom.library.json';

export type SyncTarget =
  | { kind: 'off' }
  | { kind: 'gist'; token: string; gistId?: string }
  | { kind: 'webdav'; url: string; user: string; password: string };

export const emptyTarget = (): SyncTarget => ({ kind: 'off' });

export function describeTarget(target: SyncTarget): string {
  if (target.kind === 'gist') return target.gistId ? `gist ${target.gistId}` : 'a new secret gist';
  if (target.kind === 'webdav') return new URL(target.url).host;
  return 'off';
}

function basic(user: string, password: string) {
  const bytes = new TextEncoder().encode(`${user}:${password}`);
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(text);
}

function headersFor(target: SyncTarget): Record<string, string> {
  if (target.kind === 'gist') {
    return {
      Authorization: `Bearer ${target.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };
  }
  if (target.kind === 'webdav') {
    return {
      Authorization: `Basic ${basic(target.user, target.password)}`,
      'Content-Type': 'application/json',
    };
  }
  return {};
}

async function failure(res: Response): Promise<string> {
  let detail = '';
  try {
    const body = await res.text();
    detail = body.slice(0, 160);
  } catch {
    // A body we cannot read is still a failure worth reporting.
  }
  if (res.status === 401) return 'That token or password was refused.';
  if (res.status === 404) return 'Nothing is there yet — or the address is wrong.';
  return `${res.status} ${detail}`.trim();
}

/** Returns the stored document, or null when the remote simply has nothing yet. */
export async function pullRemote(
  target: SyncTarget,
  signal?: AbortSignal,
): Promise<unknown | null> {
  if (target.kind === 'off') return null;

  if (target.kind === 'webdav') {
    const res = await fetch(target.url, { method: 'GET', headers: headersFor(target), signal });
    if (res.status === 404 || res.status === 405) return null;
    if (!res.ok) throw new Error(await failure(res));
    return res.json();
  }

  if (!target.gistId) return null;
  const res = await fetch(`https://api.github.com/gists/${target.gistId}`, {
    headers: headersFor(target),
    signal,
  });
  if (!res.ok) throw new Error(await failure(res));
  const body = (await res.json()) as { files?: Record<string, { content?: string }> };
  const content = body.files?.[SYNC_FILENAME]?.content;
  return content ? JSON.parse(content) : null;
}

/**
 * Creates the gist on first push and reports its id back, so the user only
 * ever has to paste a token — never hunt for an address to put in a box.
 */
export async function pushRemote(
  target: SyncTarget,
  payload: unknown,
  signal?: AbortSignal,
): Promise<SyncTarget> {
  if (target.kind === 'off') return target;
  const content = JSON.stringify(payload);

  if (target.kind === 'webdav') {
    const res = await fetch(target.url, {
      method: 'PUT',
      headers: headersFor(target),
      body: content,
      signal,
    });
    if (!res.ok) throw new Error(await failure(res));
    return target;
  }

  if (target.gistId) {
    const res = await fetch(`https://api.github.com/gists/${target.gistId}`, {
      method: 'PATCH',
      headers: headersFor(target),
      body: JSON.stringify({ files: { [SYNC_FILENAME]: { content } } }),
      signal,
    });
    if (!res.ok) throw new Error(await failure(res));
    return target;
  }

  const res = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: headersFor(target),
    body: JSON.stringify({
      description: 'Loom library — encrypted, unreadable without the passphrase',
      public: false,
      files: { [SYNC_FILENAME]: { content } },
    }),
    signal,
  });
  if (!res.ok) throw new Error(await failure(res));
  const created = (await res.json()) as { id?: string };
  if (!created.id) throw new Error('GitHub created nothing.');
  return { ...target, gistId: created.id };
}
