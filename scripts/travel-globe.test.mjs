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

test('globe network has one marker per city and keeps airports for routes', () => {
  const reference = {
    LHR: { city: 'London', country: '🇬🇧 United Kingdom', lat: 51.47, lon: -0.45 },
    STN: { city: 'London, Essex', country: '🇬🇧 United Kingdom', lat: 51.88, lon: 0.23 },
    LIS: { city: 'Lisbon', country: '🇵🇹 Portugal', lat: 38.77, lon: -9.13 },
  };
  const { cities, airports, routes } = globeNetwork(
    {
      routes: [
        { from: 'LHR', to: 'LIS', count: 3 },
        { from: 'LIS', to: 'STN', count: 1 },
        { from: 'LIS', to: 'XXX', count: 1 },
      ],
    },
    reference,
  );
  assert.deepEqual(cities.map((c) => [c.name, c.country, c.codes]), [
    ['Lisbon', 'Portugal', ['LIS']],
    ['London', 'United Kingdom', ['LHR', 'STN']],
  ]);
  // London is anchored on its busiest airport.
  assert.equal(cities[1].lat, 51.47);
  assert.deepEqual(airports.map((a) => a.code), ['LHR', 'LIS', 'STN']);
  assert.equal(routes.length, 2);
});
