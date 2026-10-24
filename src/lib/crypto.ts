/**
 * Zero-knowledge envelope for the synced copy: the passphrase never leaves the
 * device and is never stored in the file, so whoever holds the file — including
 * whoever hosts it — sees ciphertext and an authenticated tag, nothing else.
 */

const ITERATIONS = 310_000;

export interface Envelope {
  v: 1;
  kdf: { salt: string; iterations: number; hash: 'SHA-256' };
  iv: string;
  data: string;
}

export const subtleAvailable =
  typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';

export function isEnvelope(value: unknown): value is Envelope {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Envelope>;
  return (
    candidate.v === 1 &&
    typeof candidate.data === 'string' &&
    typeof candidate.iv === 'string' &&
    typeof candidate.kdf?.salt === 'string'
  );
}

function toBase64(bytes: Uint8Array): string {
  let text = '';
  // Chunked: one giant String.fromCharCode(...) argument list overflows the stack.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(text);
}

function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}

async function pbkdf2Bits(passphrase: string, salt: Uint8Array, iterations: number) {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    base,
    256,
  );
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number) {
  const bits = await pbkdf2Bits(passphrase, salt, iterations);
  return crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/**
 * The derived bytes, not a key object, are what a device caches: the library
 * already sits unencrypted on that device's own storage, so remembering them
 * costs nothing it does not already pay, and it spares the 310k-round
 * derivation on every single sync. The working key itself stays non-extractable.
 */
export async function deriveKeyBase64(passphrase: string, saltBase64: string, iterations: number) {
  return toBase64(new Uint8Array(await pbkdf2Bits(passphrase, fromBase64(saltBase64), iterations)));
}

async function keyFromBase64(base64: string) {
  return crypto.subtle.importKey(
    'raw',
    fromBase64(base64) as unknown as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptJson(value: unknown, passphrase: string): Promise<Envelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return seal(value, toBase64(salt), await deriveKey(passphrase, salt, ITERATIONS));
}

async function seal(value: unknown, saltBase64: string, key: CryptoKey): Promise<Envelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const sealed = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    plaintext as unknown as BufferSource,
  );
  return {
    v: 1,
    kdf: { salt: saltBase64, iterations: ITERATIONS, hash: 'SHA-256' },
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(sealed)),
  };
}

/** Encrypts with a cached key, reusing the original salt so that key stays valid. */
export async function encryptJsonWithKey(
  value: unknown,
  saltBase64: string,
  keyBase64: string,
) {
  return seal(value, saltBase64, await keyFromBase64(keyBase64));
}

/** Throws if the passphrase is wrong — AES-GCM authenticates, so guesses fail loudly. */
export async function decryptJson<T>(
  envelope: Envelope,
  secret: { passphrase?: string; key?: string },
): Promise<{ value: T; key: string }> {
  const key = secret.key
    ? await keyFromBase64(secret.key)
    : await deriveKey(
        secret.passphrase ?? '',
        fromBase64(envelope.kdf.salt),
        envelope.kdf.iterations,
      );
  let opened: ArrayBuffer;
  try {
    opened = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(envelope.iv) as unknown as BufferSource },
      key,
      fromBase64(envelope.data) as unknown as BufferSource,
    );
  } catch {
    throw new Error('That passphrase does not open this library.');
  }
  return {
    value: JSON.parse(new TextDecoder().decode(opened)) as T,
    key: secret.key ?? (await deriveKeyBase64(secret.passphrase ?? '', envelope.kdf.salt, envelope.kdf.iterations)),
  };
}
