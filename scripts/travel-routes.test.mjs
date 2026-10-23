import assert from 'node:assert/strict';
import test from 'node:test';
import { routeGeometry, routeDistance } from '../src/lib/travel-routes.mjs';

test('Pacific routes split at the date line without crossing the map', () => {
  for (const [from, to] of [[[-118.4, 33.94], [139.78, 35.55]], [[139.78, 35.55], [-118.4, 33.94]]]) {
    const geometry = routeGeometry(from, to);
    assert.equal(geometry.coordinates.length, 2);
    for (const segment of geometry.coordinates) {
      for (let i = 1; i < segment.length; i++) assert.ok(Math.abs(segment[i][0] - segment[i - 1][0]) <= 180);
      for (const [lon, lat] of segment) assert.ok(Math.abs(lon) <= 180 && Math.abs(lat) <= 90);
    }
    const a = geometry.coordinates[0].at(-1), b = geometry.coordinates[1][0];
    assert.equal(Math.abs(a[0]), 180);
    assert.equal(a[0], -b[0]);
    assert.equal(a[1], b[1]);
  }
});

test('Atlantic routes remain continuous and preserve endpoint coordinates', () => {
  const geometry = routeGeometry([-118.4, 33.94], [-.45, 51.47]);
  assert.equal(geometry.coordinates.length, 1);
  assert.ok(Math.abs(geometry.coordinates[0][0][0] + 118.4) < 1e-6);
  assert.ok(Math.abs(geometry.coordinates[0].at(-1)[1] - 51.47) < 1e-6);
  assert.ok(routeDistance([-118.4, 33.94], [-.45, 51.47]) > 8700);
});

test('country boundaries do not draw across the date line at visible latitudes', async () => {
  const { readFile } = await import('node:fs/promises');
  const world = JSON.parse(await readFile(new URL('../public/maps/countries.geojson', import.meta.url), 'utf8'));
  assert.equal(world.features.length, 241);
  for (const feature of world.features) {
    for (const polygon of feature.geometry.coordinates) {
      for (const ring of polygon) {
        assert.deepEqual(ring[0], ring.at(-1));
        for (let i = 1; i < ring.length; i++) {
          if (Math.abs(ring[i][1]) >= 85 && Math.abs(ring[i - 1][1]) >= 85) continue;
          assert.ok(Math.abs(ring[i][0] - ring[i - 1][0]) <= 180, feature.properties.name);
        }
      }
    }
  }
  const southAfrica = world.features.find(f => f.properties.name === 'South Africa');
  assert.ok(southAfrica.geometry.coordinates.some(p => p.length > 1), 'preserves the Lesotho interior boundary');
});

test('city labels combine airports serving the same city and require a recorded arrival', async () => {
  const { travelCities } = await import('../src/lib/travel-cities.mjs');
  const cities = travelCities([
    { code: 'CDG', city: 'Roissy', country: 'France', lon: 2.5, lat: 49, flights: 3 },
    { code: 'ORY', city: 'Orly', country: 'France', lon: 2.3, lat: 48.7, flights: 2 },
    { code: 'MTY', city: 'Monterrey', country: 'Mexico', lon: -100, lat: 25, flights: 1 },
  ], ['CDG', 'ORY']);
  assert.equal(cities.length, 1);
  assert.equal(cities[0].name, 'Paris');
  assert.equal(cities[0].flights, 5);
  assert.equal(cities[0].lon, 2.5);
});
