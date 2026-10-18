import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

const sources = [
  ['LGX66YflfGEGJHe68VvY5zlnsk', 'pyusd-adoption'],
  ['iFPpzgtjT4lr3IhEhviIN5Vza4', 'forse-grants-platform'],
  ['p3IgX1ZyIvoI0dWrUsa6xqPrpNo', 'forse-data-stack'],
];
const temp = await mkdtemp(join(tmpdir(), 'work-thumbnails-'));
try {
  await mkdir('public/work/stablelab', { recursive: true });
  for (const [id, name] of sources) {
    const path = join(temp, `${name}.jpg`);
    execFileSync('curl', ['--fail', '--location', '--retry', '2', `https://framerusercontent.com/images/${id}.jpg`, '--output', path], { stdio: 'inherit' });
    await sharp(path).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toFile(`public/work/stablelab/${name}.webp`);
  }
} finally {
  await rm(temp, { recursive: true, force: true });
}
