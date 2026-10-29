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
  await page.locator('[data-globe-state="ready"]').waitFor({ timeout: 45000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/travel-map/desktop.png', fullPage: true });

  const payload = JSON.parse(await page.locator('[data-globe-data]').textContent());
  const codes = payload.airports.map(a => a.code);
  assert.ok(codes.includes('LAX') && codes.includes('LIS') && codes.includes('KUL'));
  const cities = (await page.locator('[data-globe-cities]').textContent()).replace(/^[^:]*:\s*/, '').replace(/\.$/, '').split(', ');
  assert.ok(cities.includes('Los Angeles') && cities.includes('Lisbon') && cities.includes('Kuala Lumpur'));
  assert.equal(cities.filter(name => name === 'Paris').length, 1);
  assert.ok(payload.land.length > 4000, 'land dots present');
  assert.ok(payload.routes.length > 0 && payload.routes.every(r => payload.airports.some(a => a.code === r.from)));

  // The canvas actually draws something: compare a screenshot of it against the flat page background.
  const canvas = page.locator('[data-globe-canvas]');
  const shot = (await canvas.screenshot()).toString('base64');
  const painted = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = `data:image/png;base64,${src}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    const [r0, g0, b0] = data;
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (Math.abs(data[i] - r0) + Math.abs(data[i + 1] - g0) + Math.abs(data[i + 2] - b0) > 24) n++;
    }
    return n;
  }, shot);
  assert.ok(painted > 1000, `globe painted ${painted} pixels`);

  // Drag and keyboard rotate without errors.
  const bounds = await canvas.boundingBox();
  assert.ok(bounds);
  await page.mouse.move(bounds.x + bounds.width * .3, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height / 2, { steps: 20 });
  await page.mouse.up();
  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  await page.screenshot({ path: 'test-results/travel-map/rotated.png', fullPage: true });
  assert.deepEqual(errors, []);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await mobile.goto(url);
  await mobile.locator('[data-globe-state="ready"]').waitFor({ timeout: 45000 });
  await mobile.screenshot({ path: 'test-results/travel-map/mobile.png', fullPage: true });
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

  const fallback = await browser.newPage();
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (String(type).includes('webgl')) return null;
      return original.call(this, type, ...args);
    };
  });
  await fallback.goto(url);
  await fallback.locator('[data-globe-state="fallback"]').waitFor();
  assert.ok(await fallback.locator('[data-globe-fallback]').isVisible());
  const noJS = await browser.newPage({ javaScriptEnabled: false });
  await noJS.goto(url);
  assert.ok(await noJS.locator('[data-globe-fallback]').isVisible());
  console.log('Travel globe passed: data, rendering, drag and keyboard rotation, mobile, reduced motion, WebGL fallback, and no-JS fallback.');
} finally {
  await browser?.close();
  server.close();
}
