import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { feature } from 'topojson-client';
import { landDots, globeNetwork } from '../src/lib/travel-globe.mjs';

const topology = JSON.parse(await readFile(new URL('../node_modules/world-atlas/land-110m.json', import.meta.url), 'utf8'));
const land = feature(topology, topology.objects.land);

test('land dots fall on land and skip open ocean', () => {
  const dots = landDots(land, 4000);
  assert.equal(dots.length % 2, 0);
  const pairs = [];
  for (let i = 0; i < dots.length; i += 2) pairs.push([dots[i], dots[i + 1]]);
  // Roughly 30% of the globe north of -58 degrees is land.
  assert.ok(pairs.length > 800 && pairs.length < 1600, `got ${pairs.length}`);
  for (const [lat, lon] of pairs) assert.ok(Math.abs(lat) <= 90 && Math.abs(lon) <= 180);
  // Middle of the Pacific has no dots.
  assert.ok(!pairs.some(([lat, lon]) => Math.abs(lat) < 10 && lon > -170 && lon < -140));
});

test('globe network keeps only routes with known airports', () => {
  const reference = {
    LAX: { city: 'Los Angeles', lat: 33.9, lon: -118.4 },
    LHR: { city: 'London', lat: 51.5, lon: -0.5 },
  };
  const { airports, routes } = globeNetwork(
    { routes: [{ from: 'LAX', to: 'LHR', count: 6 }, { from: 'LAX', to: 'XXX', count: 1 }] },
    reference,
  );
  assert.deepEqual(airports.map((a) => a.code), ['LAX', 'LHR']);
  assert.deepEqual(routes, [{ from: 'LAX', to: 'LHR', count: 6 }]);
});
