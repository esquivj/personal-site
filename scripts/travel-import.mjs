import { geoDistance } from 'd3-geo';

// Flighty notes may contain commas, escaped quotes, and embedded newlines.
export function parseCSV(content) {
  const rows = [];
  let row = [], value = '', quoted = false;
  const input = content.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
      row.push(value); value = '';
      if (char !== ',') {
        if (row.some(cell => cell.trim())) rows.push(row);
        row = [];
        if (char === '\r' && input[i + 1] === '\n') i++;
      }
    } else value += char;
  }
  if (quoted) throw new Error('Unclosed quoted CSV field');
  row.push(value);
  if (row.some(cell => cell.trim())) rows.push(row);
  return rows;
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function computeTravelStats(content, airportReference, asOf) {
  if (!validDate(asOf)) throw new Error('Expected an as-of date in YYYY-MM-DD format');
  const [header, ...rows] = parseCSV(content);
  for (const field of ['Date', 'From', 'To', 'Canceled', 'Airline', 'Aircraft Type Name']) {
    if (!header?.includes(field)) throw new Error(`Missing Flighty column: ${field}`);
  }
  const records = rows.map(row => Object.fromEntries(header.map((key, i) => [key, (row[i] ?? '').trim()])));
  const flights = records.filter(row => {
    if (row.Canceled.toLowerCase() === 'true') return false;
    if (!validDate(row.Date)) throw new Error('Invalid flight date');
    return row.Date <= asOf;
  });
  if (!flights.length) throw new Error('No past, non-cancelled flights in export');
  const airports = new Set(), airlines = new Set(), aircraft = new Set(), countries = new Set();
  const routeCounts = new Map();
  let totalDistance = 0;
  for (const flight of flights) {
    // A diversion's actual arrival takes precedence over the booked destination.
    const from = flight.From, to = flight['Diverted To'] || flight.To;
    for (const code of [from, to]) {
      if (!airportReference[code]) throw new Error(`Missing airport reference: ${code}`);
      airports.add(code);
      countries.add(airportReference[code].country);
    }
    const a = airportReference[from], b = airportReference[to];
    totalDistance += geoDistance([a.lon, a.lat], [b.lon, b.lat]) * 6371.0088;
    if (flight.Airline) airlines.add(flight.Airline);
    if (flight['Aircraft Type Name']) aircraft.add(flight['Aircraft Type Name']);
    const route = [from, to].sort().join('-');
    routeCounts.set(route, (routeCounts.get(route) ?? 0) + 1);
  }
  return {
    totalFlights: flights.length,
    totalDistance: Math.round(totalDistance),
    totalCountries: countries.size,
    totalAirports: airports.size,
    totalAirlines: airlines.size,
    totalAircraftTypes: aircraft.size,
    firstFlight: flights.map(flight => flight.Date).sort()[0],
    lastUpdated: asOf,
    airports: [...airports].sort(),
    countries: [...countries].sort(),
    routes: [...routeCounts].sort(([a], [b]) => a.localeCompare(b)).map(([route, count]) => {
      const [from, to] = route.split('-');
      return { from, to, count };
    }),
  };
}
