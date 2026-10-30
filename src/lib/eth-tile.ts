// CoinDock shows the live ETH price as its Dock icon. This draws that tile as an SVG
// so the Stack page can update it with a real price, at any size.
const ETH_GLYPH = 'M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z';

export function ethTile(price?: string): string {
  const label = price ?? 'ETH';
  const size = label.length > 5 ? 23 : 25;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f7e8ff"/>
      <stop offset="0.5" stop-color="#dfe8ff"/>
      <stop offset="1" stop-color="#c8f2ec"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="92" height="92" rx="21" fill="url(#g)"/>
  <rect x="4.5" y="4.5" width="91" height="91" rx="20.5" fill="none" stroke="#000" stroke-opacity="0.06"/>
  <g transform="translate(17 16) scale(1.15)" fill="#3c3c8f"><path d="${ETH_GLYPH}"/></g>
  <text x="50" y="${price ? 76 : 75}" text-anchor="middle" font-family="-apple-system, 'SF Pro Rounded', 'Helvetica Neue', Arial, sans-serif" font-weight="700" font-size="${size}" fill="#3c3c8f" letter-spacing="-0.5">${label}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function formatEthPrice(usd: number): string {
  return Math.round(usd).toLocaleString('en-US');
}
