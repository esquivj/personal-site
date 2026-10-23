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
  assert.equal(await page.locator('select, [data-map-reset], [data-route-browser], [data-detail-title]').count(), 0);
  const payload = await page.locator('[data-map-data]').textContent();
  const cities = JSON.parse(payload).cities.map(city => city.name);
  assert.ok(cities.includes('Los Angeles') && cities.includes('Lisbon') && cities.includes('Kuala Lumpur'));
  assert.equal(cities.filter(name => name === 'Paris').length, 1);
  assert.ok(!cities.includes('LAX'));
  const canvas = page.locator('.maplibregl-canvas');
  const bounds = await canvas.boundingBox();
  assert.ok(bounds);
  // Drag beyond a whole world in both directions: land and labels should repeat.
  for (const direction of [1, -1]) {
    for (let i = 0; i < 3; i++) {
      const start = bounds.x + bounds.width * (direction > 0 ? .2 : .8);
      const end = bounds.x + bounds.width * (direction > 0 ? .8 : .2);
      await page.mouse.move(start, bounds.y + bounds.height / 2);
      await page.mouse.down();
      await page.mouse.move(end, bounds.y + bounds.height / 2, { steps: 20 });
      await page.mouse.up();
    }
    await page.screenshot({ path: `test-results/travel-map/wrapped-${direction}.png`, fullPage: true });
  }
  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('+');
  assert.deepEqual(errors, []);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await mobile.goto(url);
  await mobile.locator('[data-map-state="ready"]').waitFor({ timeout: 45000 });
  await mobile.screenshot({ path: 'test-results/travel-map/mobile.png', fullPage: true });
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await mobile.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await mobile.screenshot({ path: 'test-results/travel-map/mobile-zoomed.png', fullPage: true });

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
  const noJS = await browser.newPage({ javaScriptEnabled: false });
  await noJS.goto(url);
  assert.ok(await noJS.locator('[data-map-fallback] svg').isVisible());
  console.log('Travel map passed: city data, minimal controls, horizontal panning, keyboard navigation, mobile, reduced motion, WebGL fallback, and no-JS fallback.');
} finally {
  await browser?.close();
  server.close();
}
