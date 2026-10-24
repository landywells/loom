import { chromium } from 'playwright';
import { createServer } from 'node:http';

const BASE = process.env.QA_BASE || 'http://localhost:5173';
const PORT = 8899;
const PASSPHRASE = 'a library is a mind kept private';

let failures = 0;
const check = (label, pass, detail = '') => {
  if (!pass) failures += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

// ---------- a stand-in for any PUT/GET store ----------
const store = new Map();
const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (req.url === '/dump') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify([...store.entries()]));
  }
  if (req.method === 'GET') {
    const body = store.get(req.url);
    if (!body) return res.writeHead(404).end('{"error":"not found"}');
    return res.writeHead(200, { 'Content-Type': 'application/json' }).end(body);
  }
  if (req.method === 'PUT') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    return req.on('end', () => {
      store.set(req.url, body);
      res.writeHead(201).end();
    });
  }
  res.writeHead(405).end();
});
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

const browser = await chromium.launch();

const device = async () => {
  const ctx = await browser.newContext({ viewport: { width: 1320, height: 880 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/#/library`, { waitUntil: 'networkidle' });
  await page.keyboard.press('Control+k');
  await page.keyboard.type('sync and');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await page.waitForSelector('.settings-sheet');
  await page.locator('.settings-targets button', { hasText: 'WebDAV' }).click();
  const fields = page.locator('.settings-fields input');
  await fields.nth(0).fill(`http://127.0.0.1:${PORT}/library.json`);
  await fields.nth(1).fill('loom');
  await fields.nth(2).fill('test-pass');
  await page.locator('.settings-sync input').fill(PASSPHRASE);
  return { ctx, page, errors };
};

const one = await device();
await one.page.locator('.settings-row .button-primary').click();
await one.page.waitForTimeout(2500);
const status = await one.page.locator('.settings-sync .settings-row > span').innerText();
await one.page.keyboard.press('Escape');
await one.page.waitForTimeout(300);
check('device one reports a sync', /last synced/i.test(status), status);

const wire = await (await fetch(`http://127.0.0.1:${PORT}/dump`)).json();
const [path, body] = wire[0] ?? [];
const envelope = body ? JSON.parse(body) : null;
check('the remote holds an envelope, not a library', envelope?.v === 1 && typeof envelope?.data === 'string', path);
check('nothing readable crosses the wire', !!body && !/Blonde|Severance|creator/.test(body));
check('the salt and iv travel with the ciphertext', !!envelope?.kdf?.salt && !!envelope?.iv);

// device one adds something only it knows about
await one.page.locator('.intro-actions .button-primary').click();
await one.page.locator('input[placeholder="The thing itself"]').fill('A record only on the desktop');
await one.page.locator('.item-form button[type="submit"]').click();
await one.page.waitForTimeout(700);
await one.page.keyboard.press('Control+k');
await one.page.keyboard.type('sync and');
await one.page.waitForTimeout(300);
await one.page.keyboard.press('Enter');
await one.page.waitForSelector('.settings-sheet');
await one.page.locator('.settings-row .button-primary').click();
await one.page.waitForTimeout(2500);
await one.page.keyboard.press('Escape');
const afterPush = JSON.parse((await (await fetch(`http://127.0.0.1:${PORT}/dump`)).json())[0][1]);
check('the second push reuses the cached key', afterPush.kdf.salt === envelope.kdf.salt);
await one.ctx.close();

// a fresh phone profile: same server, same passphrase, different library
const two = await device();
await two.page.locator('.settings-row .button-primary').click();
await two.page.waitForTimeout(4000);

const merged = await two.page.evaluate(
  () => JSON.parse(localStorage.getItem('loom.library.v1')).items.map((item) => item.title),
);
check(
  'device two receives what only device one had',
  merged.includes('A record only on the desktop'),
  `${merged.length} titles after the merge`,
);
const wrongPass = await two.page.evaluate(async () => {
  const c = await import('/src/lib/crypto.ts');
  const s = await import('/src/lib/sync.ts');
  try {
    await s.pullSync(
      { kind: 'webdav', url: 'http://127.0.0.1:8899/library.json', user: 'loom', password: 'test-pass' },
      { passphrase: 'guessing' },
      { items: [], collections: [], activities: [], reading: { date: '', pages: 0 }, timeLog: {} },
    );
    return 'accepted a wrong passphrase';
  } catch (error) {
    return error.message;
  }
});
const storedPrefs = await two.page.evaluate(() => localStorage.getItem('loom.prefs.v1') ?? '');
check('the passphrase is never persisted', !/passphrase/i.test(storedPrefs), storedPrefs.slice(0, 90));
check('a wrong passphrase cannot read it', /does not open/i.test(wrongPass), wrongPass);
const final = JSON.parse((await (await fetch(`http://127.0.0.1:${PORT}/dump`)).json())[0][1]);
check('a joining device adopts the existing salt instead of rotating it', final.kdf.salt === envelope.kdf.salt);
check('no page errors', one.errors.length + two.errors.length === 0, [...one.errors, ...two.errors].join(' | '));

console.log(failures ? `\n${failures} check(s) failed` : '\nall sync checks passed');
await two.ctx.close();
await browser.close();
server.close();
process.exit(failures ? 1 : 0);
