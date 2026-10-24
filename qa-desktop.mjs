import { chromium } from 'playwright';

const invoked = [];

const desktopStub = `
  window.__invoked = [];
  window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => {} };
  window.__TAURI_INTERNALS__ = {
    metadata: { currentWindow: { label: 'main' } },
    transformCallback: (handler, once) => {
      const id = window.__cbId = (window.__cbId || 0) + 1;
      window.__cb = window.__cb || {};
      window.__cb[id] = handler;
      return id;
    },
    invoke: (cmd, args) => {
      window.__invoked.push(cmd);
      if (cmd === 'plugin:window|is_maximized') return Promise.resolve(!!window.__max);
      if (cmd === 'plugin:window|toggle_maximize' || cmd === 'plugin:window|internal_toggle_maximize') {
        window.__max = !(window.__max || false);
        return Promise.resolve(window.__max);
      }
      if (cmd === 'plugin:window|minimize' || cmd === 'plugin:window|close') {
        window.__closed = cmd;
        return Promise.resolve(null);
      }
      if (cmd === 'plugin:webview|internal_page_load'
        || cmd === 'plugin:window|inner_size'
        || cmd === 'plugin:event|listen') {
        return Promise.resolve(1);
      }
      return Promise.resolve(1);
    },
  };
`;

const browser = await chromium.launch();
const errors = [];

const newPage = async (init) => {
  const ctx = await browser.newContext({ viewport: { width: 1320, height: 880 } });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  if (init) await page.addInitScript(init);
  return { ctx, page };
};

const check = (label, pass, detail = '') =>
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);

// ---------- 1. plain browser build: no fake window chrome ----------
{
  const { ctx, page } = await newPage();
  await page.goto('http://localhost:5173/#/library', { waitUntil: 'networkidle' });
  const bar = await page.locator('.titlebar').count();
  check('browser build has no title bar', bar === 0, `found ${bar}`);
  const htmlClass = await page.evaluate(() => document.documentElement.className);
  check('browser root is not flagged desktop', !htmlClass.includes('is-desktop'), htmlClass);
  const sidebarTop = await page.evaluate(() => document.querySelector('.sidebar').getBoundingClientRect().top);
  check('browser sidebar starts at the top', sidebarTop === 0, `top=${sidebarTop}`);
  await ctx.close();
}

// ---------- 2. desktop shell ----------
const { ctx, page } = await newPage(desktopStub);
await page.goto('http://localhost:5173/#/library', { waitUntil: 'networkidle' });

const geo = await page.evaluate(() => {
  const r = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { top: Math.round(b.top), height: Math.round(b.height), width: Math.round(b.width), right: Math.round(b.right) };
  };
  return {
    titlebar: r('.titlebar'),
    brand: r('.titlebar-brand'),
    controls: r('.titlebar-controls'),
    sidebar: r('.sidebar'),
    topbar: r('.topbar'),
    caption: document.querySelector('.titlebar-caption')?.textContent,
    htmlClass: document.documentElement.className,
    buttons: [...document.querySelectorAll('.titlebar-button')].map((b) => b.getAttribute('aria-label')),
    scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});

check('title bar is 40px', geo.titlebar?.height === 40 && geo.titlebar?.top === 0, JSON.stringify(geo.titlebar));
check('brand column matches sidebar width', geo.brand?.width === 252, `w=${geo.brand?.width}`);
check('caption carries the view', /library/i.test(geo.caption || ''), geo.caption);
check('three window buttons', geo.buttons?.length === 3, geo.buttons?.join(','));
check('close button reaches the right edge', geo.controls?.right === 1320, `right=${geo.controls?.right}`);
check('sidebar sits under the chrome', geo.sidebar?.top === 40, `top=${geo.sidebar?.top}`);
check('sticky topbar offsets by the chrome', geo.topbar?.top === 40, `top=${geo.topbar?.top}`);
check('root flagged is-desktop', geo.htmlClass.includes('is-desktop'), geo.htmlClass);
check('no horizontal overflow', geo.scroll === 0, `overflow=${geo.scroll}`);

// window buttons actually talk to the shell
const getInvoked = () => page.evaluate(() => window.__invoked || []);
await page.locator('.titlebar-button[aria-label="Minimize"]').click();
await page.waitForTimeout(250);
let cmds = await getInvoked();
check('minimize reaches the shell', cmds.some((c) => /minimize/.test(c)), cmds.slice(-3).join(' | '));
await page.locator('.titlebar-button[aria-label="Maximize"]').click();
await page.waitForTimeout(200);
cmds = await getInvoked();
check('maximize reaches the shell', cmds.some((c) => /toggle_maximize/.test(c)), cmds.slice(-3).join(' | '));
const restore = await page.locator('.titlebar-button[aria-label="Restore down"]').count();
check('button flips to restore state', restore === 1);
await page.locator('.titlebar-button[aria-label="Restore down"]').click();
await page.waitForTimeout(200);

// overlays must stay inside the client area, chrome stays clickable
await page.locator('.library-controls button, .intro-actions .button-primary').first().waitFor();
await page.keyboard.press('Control+k');
await page.waitForTimeout(300);
const palette = await page.evaluate(() => {
  const b = document.querySelector('.palette-backdrop')?.getBoundingClientRect();
  const t = document.querySelector('.titlebar')?.getBoundingClientRect();
  return { backdropTop: b ? Math.round(b.top) : null, barBottom: t ? Math.round(t.bottom) : null, hit: document.elementFromPoint(660, 20)?.className };
});
check('palette covers the client area only', palette.backdropTop === 40, JSON.stringify(palette));
check('chrome stays on top of overlays', /titlebar/.test(palette.hit || ''), palette.hit);
await page.keyboard.press('Escape');

await page.screenshot({ path: 'verify-desktop-chrome.png' });

// a drawer too
await page.locator('.media-card').first().click();
await page.waitForTimeout(500);
const drawer = await page.evaluate(() => Math.round(document.querySelector('.drawer-backdrop')?.getBoundingClientRect().top));
check('drawer starts under the chrome', drawer === 40, `top=${drawer}`);
const editBox = await page.evaluate(() => {
  const b = document.querySelector('.drawer-edit');
  if (!b) return { missing: true };
  const r = b.getBoundingClientRect();
  return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: window.innerHeight };
});
check('the Edit button is fully on screen', editBox.bottom <= editBox.vh && editBox.top >= 40, JSON.stringify(editBox));
await page.locator('.drawer-edit').click();
await page.waitForTimeout(600);
check('edit opens the form from the desktop drawer', (await page.locator('.item-form').count()) === 1);
const prefill = await page.locator('input[placeholder="The thing itself"]').inputValue().catch(() => '');
check('the form arrives filled in', prefill.length > 2, prefill);
await page.screenshot({ path: 'verify-desktop-drawer.png' });

console.log(`\n${errors.length ? errors.join('\n') : 'no console or page errors'}`);
await ctx.close();
await browser.close();
