// Airport databases often name the municipality, rather than the city served.
const cityNames = {
  BRU: 'Brussels', CDG: 'Paris', ORY: 'Paris', STN: 'London',
  KUL: 'Kuala Lumpur', LYS: 'Lyon', NCE: 'Nice', FRA: 'Frankfurt', BOG: 'Bogotá',
};

/** Display name for the city an airport serves. */
export function cityName(code, city) {
  return cityNames[code] || city;
}

export function travelCities(airports) {
  const cities = new Map();
  // Use the busiest recorded airport to anchor a city with multiple airports.
  for (const airport of [...airports].sort((a, b) => b.flights - a.flights)) {
    const name = cityNames[airport.code] || airport.city;
    const key = `${airport.country}:${name}`;
    const existing = cities.get(key);
    if (existing) existing.flights += airport.flights;
    else cities.set(key, { name, country: airport.country, lon: airport.lon, lat: airport.lat, flights: airport.flights });
  }
  return [...cities.values()].sort((a, b) => b.flights - a.flights);
}
