import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const css = await readFile('src/layouts/Layout.astro', 'utf8');
const color = name => css.match(new RegExp(`--${name}: (#[a-f0-9]+)`))[1];
const font = await readFile(new URL('./assets/InstrumentSerif-Regular.ttf', import.meta.url));
// Pango loads the bundled font through Fontconfig when sharp renders the SVG.
process.env.FONTCONFIG_FILE = new URL('./assets/fonts.conf', import.meta.url).pathname;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<style>@font-face { font-family: 'Instrument Serif'; src: url(data:font/ttf;base64,${font.toString('base64')}); }</style>
<rect width="1200" height="630" fill="${color('bg')}"/>
<path d="M80 80H1120 M80 550H1120" stroke="${color('text-faint')}" stroke-opacity=".3"/>
<rect x="80" y="121" width="9" height="9" fill="${color('accent')}"/>
<text x="104" y="132" font-family="sans-serif" font-size="17" letter-spacing="3" fill="${color('text-soft')}">CONTENT · SOCIAL · BRAND</text>
<text x="76" y="303" font-family="Instrument Serif" font-size="108" fill="${color('text')}">Juan Esquivel</text>
<text x="82" y="380" font-family="sans-serif" font-size="29" fill="${color('text-soft')}">Content, social, and brand for crypto and AI</text>
<text x="82" y="509" font-family="sans-serif" font-size="21" fill="${color('accent')}">juanesquivel.xyz</text>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile('public/images/og-image.png');
