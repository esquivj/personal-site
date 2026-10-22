import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? files(join(dir, e.name)) : join(dir, e.name)))).flat();
}
async function exists(path) {
  try { return (await stat(path)).isFile(); } catch { return false; }
}
const redirects = JSON.parse(await readFile('vercel.json', 'utf8')).redirects;
const failures = [];
for (const file of (await files('dist')).filter(f => f.endsWith('.html'))) {
  const html = await readFile(file, 'utf8');
  const paths = new Set([...html.matchAll(/(?:href|src|data-src|data-lightbox-src)=["'](\/(?!\/)[^"']*)["']/g)].map(m => m[1]));
  // Modal data embeds additional image paths in JSON.
  for (const m of html.matchAll(/["'](\/work\/[^"'\s]+\.(?:png|jpe?g|avif|webp))["']/g)) paths.add(m[1]);
  for (let path of paths) {
    path = decodeURIComponent(path.split(/[?#]/)[0]);
    path = redirects.find(r => r.source === path)?.destination ?? path;
    const base = join('dist', path);
    if (!(await exists(base)) && !(await exists(`${base}.html`)) && !(await exists(join(base, 'index.html')))) failures.push(`${file}: ${path}`);
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log('All internal links and image references resolve.');
