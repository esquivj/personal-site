import { geoContains } from 'd3-geo';
import { cityName } from './travel-cities.mjs';

/**
 * Evenly spaced points on the sphere (Fibonacci lattice) that fall on land.
 * Returns a flat [lat, lon, lat, lon, ...] array rounded to 0.1 degree.
 */
export function landDots(land, count = 16000, minLat = -58) {
  const dots = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    const lat = (Math.asin(y) * 180) / Math.PI;
    if (lat < minLat) continue;
    const lon = (Math.atan2(Math.sin(theta) * r, Math.cos(theta) * r) * 180) / Math.PI;
    if (geoContains(land, [lon, lat])) dots.push(Math.round(lat * 10) / 10, Math.round(lon * 10) / 10);
  }
  return dots;
}

/**
 * Airports used by at least one route, with coordinates, plus routes keyed by code.
 * @param {{ routes: { from: string, to: string, count: number }[] }} stats
 * @param {Record<string, { city: string, lat: number, lon: number }>} reference
 * @returns {{ airports: { code: string, city: string, name: string, flights: number, lat: number, lon: number }[], routes: { from: string, to: string, count: number }[] }}
 */
export function globeNetwork(stats, reference) {
  const codes = new Set(stats.routes.flatMap((route) => [route.from, route.to]));
  const airports = [...codes]
    .filter((code) => reference[code])
    .sort()
    .map((code) => ({
      code,
      city: reference[code].city,
      name: cityName(code, reference[code].city),
      flights: stats.routes.reduce((sum, r) => sum + (r.from === code || r.to === code ? r.count : 0), 0),
      lat: reference[code].lat,
      lon: reference[code].lon,
    }));
  const routes = stats.routes
    .filter((route) => reference[route.from] && reference[route.to])
    .map((route) => ({ from: route.from, to: route.to, count: route.count }));
  return { airports, routes };
}
