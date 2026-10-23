import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.geojson': 'application/geo+json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    let file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (file !== root && !file.startsWith(root + sep)) throw new Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/travels/`;
await mkdir('test-results/travel-map', { recursive: true });
let browser;
try {
  browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  await page.locator('[data-map-state="ready"]').waitFor({ timeout: 45000 });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'test-results/travel-map/desktop.png', fullPage: true });
  assert.equal(await page.locator('[data-airport-select] option').count(), 36);
  const label = await page.locator('.atlas-airport-label').filter({ hasText: /^LAX$/ }).boundingBox();
  assert.ok(label);
  await page.mouse.click(label.x - 8, label.y + label.height / 2);
  await page.waitForFunction(() => document.querySelector('[data-airport-select]').value === 'LAX');
  assert.equal(await page.locator('[data-detail-title]').textContent(), 'Los Angeles');
  await page.locator('[data-route-browser] summary').click();
  const route = page.locator('[data-route-id="LAX-LHR"]');
  await route.focus(); await page.keyboard.press('Enter');
  assert.equal(await route.getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('[data-detail-copy]').textContent(), /6 recorded flights/);
  await page.screenshot({ path: 'test-results/travel-map/route-selection.png', fullPage: true });
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-airport-select]').inputValue(), '');
  assert.equal(await page.locator('[data-route-count]').textContent(), '42');
  assert.equal(await page.locator('[data-route-id]:not([hidden])').count(), 42);
  assert.deepEqual(errors, []);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await mobile.goto(url);
  await mobile.locator('[data-map-state="ready"]').waitFor({ timeout: 45000 });
  await mobile.screenshot({ path: 'test-results/travel-map/mobile.png', fullPage: true });
  await mobile.locator('[data-airport-select]').selectOption('LIS');
  assert.equal(await mobile.locator('[data-detail-title]').textContent(), 'Lisbon');
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await mobile.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await mobile.screenshot({ path: 'test-results/travel-map/mobile-selected.png', fullPage: true });
  await mobile.locator('[data-map-reset]').click();
  assert.equal(await mobile.locator('[data-airport-select]').inputValue(), '');

  const fallback = await browser.newPage();
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (String(type).includes('webgl')) return null;
      return original.call(this, type, ...args);
    };
  });
  await fallback.goto(url);
  await fallback.locator('[data-map-state="fallback"]').waitFor();
  assert.ok(await fallback.locator('[data-map-fallback]').isVisible());
  await fallback.locator('[data-airport-select]').selectOption('LAX');
  assert.equal(await fallback.locator('[data-detail-title]').textContent(), 'Los Angeles');
  const noJS = await browser.newPage({ javaScriptEnabled: false });
  await noJS.goto(url);
  assert.ok(await noJS.locator('[data-map-fallback] svg').isVisible());
  console.log('Travel map passed: rendering, map clicks, route selection, keyboard reset, mobile, reduced motion, WebGL fallback, and no-JS fallback.');
} finally {
  await browser?.close();
  server.close();
}
