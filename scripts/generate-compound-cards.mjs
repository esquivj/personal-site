import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Optional first argument overrides the supplied source-image directory.
const source = process.argv[2] ?? '/workspace/site-specs/jsp/compound-src/';
const output = new URL('../public/work/compound/', import.meta.url);
await mkdir(output, { recursive: true });
const css = await readFile(new URL('../src/layouts/Layout.astro', import.meta.url), 'utf8');
const color = name => css.match(new RegExp(`--${name}: (#[a-f0-9]+)`))[1];
const font = await readFile(new URL('./assets/InstrumentSerif-Regular.ttf', import.meta.url));
// Pango uses Fontconfig for the same bundled font embedded in the SVG.
process.env.FONTCONFIG_FILE = fileURLToPath(new URL('./assets/fonts.conf', import.meta.url));
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const text = (x, y, value, size = 24, family = 'sans-serif', fill = 'text-soft') =>
  `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" fill="${color(fill)}">${escape(value)}</text>`;
const frame = content => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675">
<style>@font-face { font-family: 'Instrument Serif'; src: url(data:font/ttf;base64,${font.toString('base64')}); }</style>
<rect width="1200" height="675" fill="${color('bg')}"/>
<rect x="32" y="32" width="1136" height="611" rx="8" fill="${color('bg-raised')}" stroke="${color('text-faint')}" stroke-opacity=".25"/>
${content}</svg>`;
const funding = frame(`
${text(80, 104, 'Compound Foundation', 44, 'Instrument Serif', 'text')}
${text(80, 145, '@Compound_xyz  ·  Aug 17, 2026', 21)}
${text(1120, 104, 'x.com', 20, 'monospace').replace('x="1120"', 'x="1120" text-anchor="end"')}
<path d="M80 179H1120 M80 538H1120" stroke="${color('text-faint')}" stroke-opacity=".25"/>
${[
  '1/ Compound is entering its next era. Today we’re',
  'announcing a new leadership team and a $52M',
  'DAO-approved development program, the largest',
  'in the protocol’s history, to bring institutional',
  'credit onchain.',
].map((line, i) => text(80, 245 + i * 53, line.replaceAll('’', "'"), 32, 'sans-serif', 'text')).join('')}
${text(80, 591, '156K+ views · 280+ likes · 30+ reposts', 24, 'sans-serif', 'text')}
`);
const dashboard = frame(`
${text(80, 110, 'Compound Institutional Market', 55, 'Instrument Serif', 'text')}
${text(80, 155, 'Dune dashboard · Oct 18, 2026', 23)}
<path d="M80 195H1120 M600 233V530 M80 385H1120" stroke="${color('text-faint')}" stroke-opacity=".25"/>
${[
  [80, 255, 'Capital in market', '$55.3M'],
  [650, 255, 'Active deposits', '$20.4M'],
  [80, 435, 'Active loans', '$18.3M'],
  [650, 435, 'Utilization', '90%'],
].map(([x, y, label, value]) => text(x, y, label, 23) + text(x, y + 80, value, 76, 'Instrument Serif', 'text')).join('')}
${text(80, 601, 'dune.com/cadena', 20, 'monospace')}
`);
for (const [name, svg] of [['funding-program-thread', funding], ['dune-dashboard', dashboard]]) {
  await sharp(Buffer.from(svg)).webp({ quality: 80 }).toFile(fileURLToPath(new URL(`${name}.webp`, output)));
}
for (const [input, name] of [
  ['launch-thread.jpg', 'institutional-market-launch-thread'],
  ['im-60m.jpg', 'institutional-market-60m'],
  ['chainlink.jpg', 'partner-spotlight-chainlink'],
  ['sky.jpg', 'partner-spotlight-sky'],
]) {
  await sharp(`${source.replace(/\/$/, '')}/${input}`).rotate().resize({ width: 1200 }).webp({ quality: 80 })
    .toFile(fileURLToPath(new URL(`${name}.webp`, output)));
}
console.log('Generated six Compound WebP assets.');
