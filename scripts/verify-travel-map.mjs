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
  // Markers are cities: airports serving one city merge into a single marker.
  const cities = payload.cities.map(c => c.name);
  assert.ok(cities.includes('Los Angeles') && cities.includes('Lisbon') && cities.includes('Kuala Lumpur'));
  assert.equal(cities.filter(name => name === 'Paris').length, 1);
  assert.deepEqual(payload.cities.find(c => c.name === 'Paris').codes, ['CDG', 'ORY']);
  assert.ok(!cities.includes('Sepang') && !cities.includes('LAX'));
  assert.match(await page.locator('.travels-summary').textContent(), new RegExp(`^${cities.length} cities · `));
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

  // Zoom: buttons, keyboard, and limits.
  const zoomLevel = async () => Number(await page.locator('[data-travel-globe]').getAttribute('data-globe-zoom'));
  assert.equal(await zoomLevel(), 1);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  assert.ok(await zoomLevel() > 1);
  await canvas.focus();
  await page.keyboard.press('+');
  const zoomed = await zoomLevel();
  for (let i = 0; i < 8; i++) await page.getByRole('button', { name: 'Zoom in', exact: true }).click({ force: true });
  assert.equal(await zoomLevel(), 3);
  assert.ok(await page.getByRole('button', { name: 'Zoom in', exact: true }).isDisabled());
  await canvas.focus();
  await page.keyboard.press('-');
  assert.ok(await zoomLevel() < 3 && zoomed > 1);
  await page.screenshot({ path: 'test-results/travel-map/zoomed.png', fullPage: true });
  // The scroll wheel zooms anywhere over the dark band, not just the globe itself.
  const band = await page.locator('.travels-stage').boundingBox();
  await page.mouse.move(band.x + 40, band.y + band.height / 2);
  const before = await zoomLevel();
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(100);
  assert.ok(await zoomLevel() > before, 'wheel up zooms in');
  // Once fully zoomed out, scrolling down hands back to the page.
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Zoom out', exact: true }).click({ force: true });
  const scrollTop = await page.evaluate(() => window.scrollY);
  await page.mouse.move(band.x + 40, band.y + band.height / 2);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(300);
  assert.equal(await zoomLevel(), 0.85);
  assert.ok(await page.evaluate(() => window.scrollY) > scrollTop, 'page scrolls at min zoom');
  // Clicking the globe and pressing Esc shows no focus ring; tabbing to it does.
  await canvas.click({ position: { x: 20, y: (await canvas.boundingBox()).height / 2 } });
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-travel-globe]').getAttribute('data-globe-keyboard'), null);
  await page.locator('[data-globe-zoom-in]').focus();
  await page.keyboard.press('Shift+Tab');
  assert.ok(await page.evaluate(() => document.activeElement?.hasAttribute('data-globe-canvas')));
  assert.equal(await page.locator('[data-travel-globe]').getAttribute('data-globe-keyboard'), '');
  assert.deepEqual(errors, []);

  // Hovering a city dot shows its name. With motion reduced the globe holds still on Los Angeles.
  const still = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  await still.goto(url);
  await still.locator('[data-globe-state="ready"]').waitFor({ timeout: 45000 });
  const box = await still.locator('.globe-stage').boundingBox();
  const tip = still.locator('[data-globe-tip]');
  // Home sits just above center. Search outward from there so the nearest city wins.
  let found = '';
  const offsets = [];
  for (let dy = -24; dy <= 24; dy += 3) for (let dx = -24; dx <= 24; dx += 3) offsets.push([dx, dy]);
  offsets.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
  for (const [dx, dy] of offsets) {
    await still.mouse.move(box.x + box.width * 0.5 + dx, box.y + box.height * 0.453 + dy);
    if (await tip.isVisible()) {
      found = await still.locator('[data-tip-city]').textContent();
      break;
    }
  }
  // LAX and Burbank sit a few pixels apart; either label proves hover works.
  assert.ok(['Los Angeles', 'Burbank'].includes(found), `hover showed ${found}`);
  assert.match(await still.locator('[data-tip-meta]').textContent(), /^United States/);
  await still.screenshot({ path: 'test-results/travel-map/hover.png' });
  await still.mouse.move(box.x + 4, box.y + 4);
  assert.ok(await tip.isHidden());

  // Home markers: Los Angeles is home, Lisbon was. Both carry a label on the globe.
  assert.deepEqual(payload.homes, { current: 'Los Angeles', previous: 'Lisbon' });
  assert.ok(await still.locator('[data-globe-home="Los Angeles"]').isVisible());

  // Clicking a city flies to it and keeps its card up; the home control flies back.
  const tagAt = async () => {
    const tag = await still.locator('[data-globe-home="Los Angeles"]').boundingBox();
    const stage = await still.locator('[data-globe-canvas]').boundingBox();
    return tag && { x: tag.x - stage.x, y: tag.y - stage.y };
  };
  const homeView = await tagAt();
  await still.keyboard.press('Escape');
  await still.locator('[data-globe-canvas]').focus();
  for (let i = 0; i < 6; i++) await still.keyboard.press('ArrowRight');
  await still.waitForTimeout(150);
  const moved = await tagAt();
  assert.ok(!moved || Math.abs(moved.x - homeView.x) > 20, 'arrow keys turn the globe');
  await still.getByRole('button', { name: 'Back to home' }).click();
  await still.waitForTimeout(150);
  const back = await tagAt();
  assert.ok(back && Math.abs(back.x - homeView.x) < 3 && Math.abs(back.y - homeView.y) < 3, 'home control returns to Los Angeles');
  await still.screenshot({ path: 'test-results/travel-map/home.png' });

  // Zoomed all the way in, the globe runs past its square instead of being cropped to it.
  for (let i = 0; i < 4; i++) await still.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await still.waitForTimeout(150);
  const wide = await still.locator('[data-globe-canvas]').boundingBox();
  const square = await still.locator('.globe-stage').boundingBox();
  assert.ok(wide.width > square.width * 1.5, 'canvas extends beyond the globe square');

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
  console.log('Travel globe passed: data, rendering, drag and keyboard rotation, zoom, city hover, home markers and home control, mobile, reduced motion, WebGL fallback, and no-JS fallback.');
} finally {
  await browser?.close();
  server.close();
}
