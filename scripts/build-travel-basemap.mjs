import { readFileSync, writeFileSync } from 'node:fs';
import { geoEquirectangular, geoStream } from 'd3-geo';
import { feature } from 'topojson-client';

const source = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/countries-50m.json', import.meta.url)));
const countries = feature(source, source.objects.countries);
// D3 clips spherical geometry at the date line before MapLibre tiles it.
// A direct TopoJSON conversion leaves Russia and Fiji crossing the whole map.
const projection = geoEquirectangular().scale(180 / Math.PI).translate([0, 0]).precision(0);
const signedArea = ring => ring.reduce((sum, a, i) => {
  const b = ring[(i + 1) % ring.length];
  return sum + a[0] * b[1] - b[0] * a[1];
}, 0);
function contains(ring, [x, y]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[i], [bx, by] = ring[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}
for (const country of countries.features) {
  const rings = [];
  let ring;
  geoStream(country.geometry, projection.stream({
    polygonStart() {}, polygonEnd() {},
    lineStart() { ring = []; },
    point(x, y) { ring.push([+x.toFixed(4), +(-y).toFixed(4)]); },
    lineEnd() { ring.push([...ring[0]]); if (Math.abs(signedArea(ring)) > 1e-10) rings.push(ring); },
  }));
  const polygons = rings.filter(r => signedArea(r) < 0).map(r => [r]);
  for (const hole of rings.filter(r => signedArea(r) > 0)) {
    const polygon = polygons.find(p => contains(p[0], hole[0]));
    if (!polygon) throw new Error(`Unassigned interior ring: ${country.properties.name}`);
    polygon.push(hole);
  }
  country.geometry = { type: 'MultiPolygon', coordinates: polygons };
}
writeFileSync(new URL('../public/maps/countries.geojson', import.meta.url), JSON.stringify(countries));
console.log(`Generated ${countries.features.length} country features with date-line clipping.`);
