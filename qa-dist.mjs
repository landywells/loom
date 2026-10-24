import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

// Runs against the built bundle, not the dev server. Absolute asset paths work
// fine in dev and produce a white screen on Android, so dev-only coverage is
// how that shipped once already.
const PORT = 4179;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
  shell: true,
});

let failures = 0;
const check = (label, pass, detail = '') => {
  if (!pass) failures += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

await new Promise((resolve) => setTimeout(resolve, 4000));

try {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = [];
  const broken = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('requestfailed', (r) => broken.push(r.url().split('/').pop()));
  page.on('response', (r) => {
    if (r.status() >= 400) broken.push(`${r.status()} ${r.url().split('/').slice(-2).join('/')}`);
  });

  await page.goto(`http://localhost:${PORT}/#/library`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const state = await page.evaluate(async () => {
    await document.fonts.ready;
    return {
      cards: document.querySelectorAll('.media-card').length,
      serif: document.fonts.check('16px "Instrument Serif"'),
      sans: document.fonts.check('16px "DM Sans"'),
      mono: document.fonts.check('12px "DM Mono"'),
      scripts: [...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')),
      stylesheets: [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.getAttribute('href')),
    };
  });

  check('the built page renders its library', state.cards > 0, `${state.cards} cards`);
  check('self-hosted fonts load', state.serif && state.sans && state.mono);
  check(
    'no root-absolute asset URLs',
    [...state.scripts, ...state.stylesheets].every((src) => !src?.startsWith('/')),
    [...state.scripts, ...state.stylesheets].join(' '),
  );
  check('nothing 404s', broken.length === 0, broken.join(', '));
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
} finally {
  server.kill();
}

console.log(failures ? `\n${failures} check(s) failed` : '\nbundle is loadable as built');
process.exit(failures ? 1 : 0);
