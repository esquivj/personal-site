import sharp from 'sharp';
import { readFile, writeFile, stat } from 'node:fs/promises';

const work = await readFile('src/pages/work.astro', 'utf8');
const paths = new Set([...work.matchAll(/['"](\/work\/[^'"\s]+\.(?:jpg|jpeg|png|webp|avif))['"]/g)].map(m => `public${m[1]}`));
for (const path of paths) {
  if ((await stat(path)).size <= 500_000) continue;
  const before = (await stat(path)).size;
  const buffer = await sharp(path).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).toFormat(path.endsWith('.jpg') || path.endsWith('.jpeg') ? 'jpeg' : path.split('.').pop(), { quality: 80 }).toBuffer();
  await writeFile(path, buffer);
  console.log(`${path}: ${before} → ${buffer.length} bytes`);
}
for (const format of ['avif', 'webp']) {
  await sharp('public/images/avatar.jpg').rotate().resize({ width: 400 }).toFormat(format, { quality: format === 'avif' ? 55 : 75 }).toFile(`public/images/avatar.${format}`);
}
