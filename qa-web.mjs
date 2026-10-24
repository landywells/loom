import { chromium } from 'playwright';

const BASE = process.env.QA_BASE || 'http://localhost:5173';
const PAGES = ['overview', 'library', 'discover', 'collections', 'insights'];
const WIDTHS = [1320, 1024, 768, 375, 320];

let failures = 0;
const check = (label, pass, detail = '') => {
  if (!pass) failures += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch();
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 1320, height: 880 } });
const page = await ctx.newPage();
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
const remote = [];
page.on('request', (req) => {
  const url = req.url();
  if (/fonts\.(googleapis|gstatic)\.com/.test(url)) remote.push(url);
});

// ---------- typography is local ----------
await page.goto(`${BASE}/#/library`, { waitUntil: 'networkidle' });
check('no Google Fonts requests', remote.length === 0, remote[0] || 'clean');
const faces = await page.evaluate(async () => {
  await document.fonts.ready;
  return {
    sans: document.fonts.check('16px "DM Sans"'),
    serif: document.fonts.check('16px "Instrument Serif"'),
    serifItalic: document.fonts.check('italic 16px "Instrument Serif"'),
    mono: document.fonts.check('12px "DM Mono"'),
    loaded: document.fonts.size,
  };
});
check('all four faces resolve locally', faces.sans && faces.serif && faces.serifItalic && faces.mono, JSON.stringify(faces));
const serifWidth = await page.evaluate(() => {
  const h1 = document.querySelector('.page-intro h1');
  const span = document.createElement('span');
  span.style.cssText = 'position:absolute;visibility:hidden;font:16px Georgia';
  span.textContent = h1.textContent;
  document.body.append(span);
  const fallback = span.getBoundingClientRect().width;
  span.style.font = '16px "Instrument Serif"';
  const real = span.getBoundingClientRect().width;
  span.remove();
  return { fallback, real };
});
check('serif metrics differ from fallback', Math.abs(serifWidth.fallback - serifWidth.real) > 1, JSON.stringify(serifWidth));

// ---------- every page, every width ----------
for (const width of WIDTHS) {
  await page.setViewportSize({ width, height: 900 });
  const bad = [];
  for (const target of PAGES) {
    await page.goto(`${BASE}/#/${target}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(250);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const over = doc.scrollWidth - doc.clientWidth;
      const culprits = [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > doc.clientWidth + 1)
        .slice(0, 3)
        .map((el) => `${el.tagName.toLowerCase()}.${el.className.toString().split(' ')[0]}`);
      return { over, culprits };
    });
    if (overflow.over > 0) bad.push(`${target}@${width}: ${overflow.over}px ${overflow.culprits.join(',')}`);
  }
  check(`no horizontal overflow at ${width}px`, bad.length === 0, bad.join(' | '));
}

await page.setViewportSize({ width: 1320, height: 880 });

// ---------- search the catalog and file it ----------
await page.goto(`${BASE}/#/library`, { waitUntil: 'networkidle' });
const before = await page.evaluate(() => document.querySelectorAll('.media-card').length);
await page.locator('.intro-actions .button-primary').click();
await page.waitForSelector('.item-form, .modal-panel');
await page.locator('input[placeholder="The thing itself"]').fill('Dune: Part Two');
const toggle = page.locator('button.lookup-toggle');
if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
const search = page.locator('.lookup-panel input[aria-label^="Search "]');
await search.waitFor();
await search.fill('Dune Part Two');
await page.waitForSelector('.lookup-row', { timeout: 20000 });
const rows = await page.locator('.lookup-row').count();
const firstRow = (await page.locator('.lookup-row').first().innerText()).replace(/\s+/g, ' ');
check('catalog returns ranked results', rows > 0 && /dune/i.test(firstRow), `${rows} rows · ${firstRow.slice(0, 70)}`);
await page.locator('.lookup-row').first().click();
await page.waitForTimeout(400);
const filled = await page.locator('input[placeholder="The thing itself"]').inputValue();
check('picking a result fills the form', /dune/i.test(filled), filled);
await page.locator('.item-form button[type="submit"]').click();
await page.waitForTimeout(700);
const after = await page.evaluate(() => document.querySelectorAll('.media-card').length);
check('entry lands on the shelf', after === before + 1, `${before} → ${after}`);

// ---------- progress, undo, theme ----------
await page.locator('.media-card').first().click();
await page.waitForSelector('.item-drawer');
const readProgress = () =>
  page.locator('.drawer-progress-info').innerText().then((t) => t.replace(/\s+/g, ' '));
const progressBefore = await readProgress();
await page.locator('button[aria-label="Increase progress"]').click();
await page.waitForTimeout(400);
const progressAfter = await readProgress();
check('progress steps forward', progressBefore !== progressAfter, `${progressBefore} → ${progressAfter}`);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
check('escape closes the drawer', (await page.locator('.item-drawer').count()) === 0);

await page.locator('button[aria-label="Switch to dark mode"]').click();
await page.waitForTimeout(400);
const dark = await page.evaluate(() => ({
  theme: document.documentElement.dataset.theme,
  bg: getComputedStyle(document.body).backgroundColor,
  ink: getComputedStyle(document.body).color,
}));
check('dark theme applies', dark.theme === 'dark' && dark.ink !== 'rgb(29, 27, 22)', JSON.stringify(dark));
await page.screenshot({ path: 'qa-dark.png' });
await page.locator('button[aria-label="Switch to light mode"]').click();
await page.waitForTimeout(300);

// ---------- command palette ----------
await page.keyboard.press('Control+k');
await page.waitForTimeout(350);
check('palette opens', (await page.locator('.palette-panel').count()) === 1);
await page.keyboard.type('insig');
await page.waitForTimeout(300);
const hits = await page.locator('.palette-entry').count();
check('palette filters as you type', hits > 0, `${hits} matches`);
await page.keyboard.press('Enter');
await page.waitForTimeout(500);
check('enter navigates', /#\/insights/.test(page.url()), page.url());
await page.screenshot({ path: 'qa-insights.png' });

// ---------- persistence ----------
await page.reload({ waitUntil: 'networkidle' });
const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('loom.library.v1')).items.length);
check('library survives a reload', persisted === after, `${persisted} items`);

console.log(`\n${errors.length ? errors.join('\n') : 'no console or page errors'}`);
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
await ctx.close();
await browser.close();
process.exit(failures || errors.length ? 1 : 0);
