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
 * The globe is about cities visited: one marker per city (airports serving the same
 * city merge, anchored on the busiest one). Airports are kept only to draw routes.
 * @param {{ routes: { from: string, to: string, count: number }[] }} stats
 * @param {Record<string, { city: string, country: string, lat: number, lon: number }>} reference
 * @returns {{
 *   cities: { name: string, country: string, codes: string[], lat: number, lon: number }[],
 *   airports: { code: string, lat: number, lon: number }[],
 *   routes: { from: string, to: string, count: number }[],
 * }}
 */
export function globeNetwork(stats, reference) {
  const routes = stats.routes
    .filter((route) => reference[route.from] && reference[route.to])
    .map((route) => ({ from: route.from, to: route.to, count: route.count }));
  const flights = (code) => routes.reduce((sum, r) => sum + (r.from === code || r.to === code ? r.count : 0), 0);
  const codes = [...new Set(routes.flatMap((route) => [route.from, route.to]))].sort();
  const airports = codes.map((code) => ({ code, lat: reference[code].lat, lon: reference[code].lon }));

  const byCity = new Map();
  for (const code of [...codes].sort((a, b) => flights(b) - flights(a))) {
    const ref = reference[code];
    const name = cityName(code, ref.city);
    const country = ref.country.replace(/^[^\p{L}]+/u, '');
    const key = `${country}:${name}`;
    const city = byCity.get(key);
    if (city) city.codes.push(code);
    else byCity.set(key, { name, country, codes: [code], lat: ref.lat, lon: ref.lon });
  }
  const cities = [...byCity.values()]
    .map((city) => ({ ...city, codes: city.codes.sort() }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { cities, airports, routes };
}
