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
