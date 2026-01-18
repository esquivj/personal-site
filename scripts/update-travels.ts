#!/usr/bin/env npx tsx
/**
 * Update travel stats from Flighty CSV export
 *
 * Usage:
 *   npx tsx scripts/update-travels.ts /path/to/FlightyExport.csv
 *
 * Or place the CSV in the project root as FlightyExport.csv and run:
 *   npx tsx scripts/update-travels.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Airport to country mapping (with flag emojis)
const airportCountry: Record<string, string> = {
  // United States
  LAX: "🇺🇸 United States", JFK: "🇺🇸 United States", PHL: "🇺🇸 United States",
  AUS: "🇺🇸 United States", PDX: "🇺🇸 United States", BUR: "🇺🇸 United States",
  // Mexico
  TIJ: "🇲🇽 Mexico", ZCL: "🇲🇽 Mexico", MEX: "🇲🇽 Mexico",
  // United Kingdom
  LHR: "🇬🇧 United Kingdom", STN: "🇬🇧 United Kingdom",
  // Portugal
  LIS: "🇵🇹 Portugal", OPO: "🇵🇹 Portugal",
  // France
  ORY: "🇫🇷 France", CDG: "🇫🇷 France", LYS: "🇫🇷 France", NCE: "🇫🇷 France",
  // Spain
  MAD: "🇪🇸 Spain",
  // Belgium
  BRU: "🇧🇪 Belgium",
  // Ireland
  DUB: "🇮🇪 Ireland",
  // Japan
  HND: "🇯🇵 Japan", NRT: "🇯🇵 Japan",
  // South Korea
  ICN: "🇰🇷 South Korea",
  // Singapore
  SIN: "🇸🇬 Singapore",
  // Malaysia
  KUL: "🇲🇾 Malaysia",
  // Thailand
  BKK: "🇹🇭 Thailand", DMK: "🇹🇭 Thailand", HKT: "🇹🇭 Thailand",
  // Hong Kong
  HKG: "🇭🇰 Hong Kong",
  // Turkey
  IST: "🇹🇷 Turkey", BJV: "🇹🇷 Turkey",
  // Colombia
  BOG: "🇨🇴 Colombia",
  // Germany
  FRA: "🇩🇪 Germany", MUC: "🇩🇪 Germany",
  // Netherlands
  AMS: "🇳🇱 Netherlands",
  // Italy
  FCO: "🇮🇹 Italy", MXP: "🇮🇹 Italy",
  // UAE
  DXB: "🇦🇪 United Arab Emirates",
  // Taiwan
  TPE: "🇹🇼 Taiwan",
  // Australia
  SYD: "🇦🇺 Australia", MEL: "🇦🇺 Australia",
  // Canada
  YYZ: "🇨🇦 Canada", YVR: "🇨🇦 Canada",
};

// Approximate distances between common airport pairs (km)
const distances: Record<string, number> = {
  "LAX-LHR": 8780, "LHR-LAX": 8780,
  "LAX-HND": 8815, "HND-LAX": 8815,
  "LAX-SIN": 14100, "SIN-LAX": 14100,
  "LAX-ICN": 9590, "ICN-LAX": 9590,
  "LAX-CDG": 9100, "CDG-LAX": 9100,
  "LAX-BOG": 5900, "BOG-LAX": 5900,
  "LAX-PDX": 1540, "PDX-LAX": 1540,
  "LAX-BUR": 50, "BUR-LAX": 50,
  "LAX-AUS": 1970, "AUS-LAX": 1970,
  "LAX-PHL": 3850, "PHL-LAX": 3850,
  "LAX-ZCL": 1900, "ZCL-LAX": 1900,
  "LAX-MAD": 9350, "MAD-LAX": 9350,
  "LAX-JFK": 3970, "JFK-LAX": 3970,
  "LHR-LIS": 1580, "LIS-LHR": 1580,
  "LHR-BRU": 320, "BRU-LHR": 320,
  "PHL-LIS": 5450, "LIS-PHL": 5450,
  "LIS-ORY": 1450, "ORY-LIS": 1450,
  "LIS-DUB": 1640, "DUB-LIS": 1640,
  "LIS-MAD": 500, "MAD-LIS": 500,
  "LIS-LYS": 1380, "LYS-LIS": 1380,
  "LIS-IST": 3200, "IST-LIS": 3200,
  "LIS-JFK": 5430, "JFK-LIS": 5430,
  "LIS-CDG": 1450, "CDG-LIS": 1450,
  "LIS-NCE": 1480, "NCE-LIS": 1480,
  "SIN-KUL": 320, "KUL-SIN": 320,
  "ICN-HKG": 2060, "HKG-ICN": 2060,
  "HKG-HKT": 1660, "HKT-HKG": 1660,
  "HKT-DMK": 680, "DMK-HKT": 680,
  "BKK-ICN": 3680, "ICN-BKK": 3680,
  "TIJ-MEX": 2250, "MEX-TIJ": 2250,
  "TIJ-ZCL": 1300, "ZCL-TIJ": 1300,
  "BRU-OPO": 1610, "OPO-BRU": 1610,
  "OPO-STN": 1350, "STN-OPO": 1350,
  "IST-BJV": 430, "BJV-IST": 430,
  "DUB-LAX": 8340, "LAX-DUB": 8340,
};

function estimateDistance(from: string, to: string): number {
  const key = `${from}-${to}`;
  if (distances[key]) return distances[key];

  // Rough estimate based on known patterns
  // Domestic US: ~1500km avg
  // Transatlantic: ~7000km avg
  // Asia from US: ~11000km avg
  const fromCountry = airportCountry[from] || "Unknown";
  const toCountry = airportCountry[to] || "Unknown";

  if (fromCountry === toCountry) return 800;
  if ((fromCountry === "United States" && toCountry === "United Kingdom") ||
      (fromCountry === "United Kingdom" && toCountry === "United States")) return 8000;
  if ((fromCountry === "United States" && ["Japan", "South Korea", "Singapore", "Thailand", "Hong Kong"].includes(toCountry)) ||
      (["Japan", "South Korea", "Singapore", "Thailand", "Hong Kong"].includes(fromCountry) && toCountry === "United States")) return 10000;

  return 3000; // Default for other international flights
}

function parseCSV(content: string): string[][] {
  const lines = content.trim().split('\n');
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  });
}

function main() {
  const csvPath = process.argv[2] || resolve(process.cwd(), 'FlightyExport.csv');

  console.log(`Reading CSV from: ${csvPath}`);

  let content: string;
  try {
    content = readFileSync(csvPath, 'utf-8');
  } catch {
    console.error(`Could not read file: ${csvPath}`);
    console.error('\nUsage: npx tsx scripts/update-travels.ts /path/to/FlightyExport.csv');
    process.exit(1);
  }

  const rows = parseCSV(content);
  const header = rows[0];
  const data = rows.slice(1).filter(row => row.length > 1);

  // Find column indices
  const fromIdx = header.indexOf('From');
  const toIdx = header.indexOf('To');
  const canceledIdx = header.indexOf('Canceled');
  const dateIdx = header.indexOf('Date');
  const airlineIdx = header.indexOf('Airline');
  const aircraftIdx = header.indexOf('Aircraft Type Name');

  // Filter out canceled flights
  const flights = data.filter(row => row[canceledIdx]?.toLowerCase() !== 'true');

  console.log(`Found ${flights.length} completed flights (${data.length - flights.length} canceled)`);

  // Collect stats
  const airports = new Set<string>();
  const airlines = new Set<string>();
  const aircraftTypes = new Set<string>();
  let totalDistance = 0;
  let firstFlight = '9999-99-99';

  for (const row of flights) {
    const from = row[fromIdx]?.trim();
    const to = row[toIdx]?.trim();
    const date = row[dateIdx]?.trim();
    const airline = row[airlineIdx]?.trim();
    const aircraft = row[aircraftIdx]?.trim();

    if (from) airports.add(from);
    if (to) airports.add(to);
    if (airline) airlines.add(airline);
    if (aircraft) aircraftTypes.add(aircraft);
    if (date && date < firstFlight) firstFlight = date;

    if (from && to) {
      totalDistance += estimateDistance(from, to);
    }
  }

  // Get countries from airports
  const countries = new Set<string>();
  for (const airport of airports) {
    const country = airportCountry[airport];
    if (country) countries.add(country);
    else console.warn(`Unknown country for airport: ${airport}`);
  }

  const today = new Date().toISOString().split('T')[0];

  const stats = {
    totalFlights: flights.length,
    totalDistance: Math.round(totalDistance),
    totalCountries: countries.size,
    totalAirports: airports.size,
    totalAirlines: airlines.size,
    totalAircraftTypes: aircraftTypes.size,
    firstFlight,
    lastUpdated: today,
    airports: Array.from(airports).sort(),
    countries: Array.from(countries).sort(),
  };

  console.log('\nStats computed:');
  console.log(`  Flights: ${stats.totalFlights}`);
  console.log(`  Distance: ${stats.totalDistance.toLocaleString()} km`);
  console.log(`  Countries: ${stats.totalCountries}`);
  console.log(`  Airports: ${stats.totalAirports}`);
  console.log(`  Airlines: ${stats.totalAirlines}`);
  console.log(`  Aircraft types: ${stats.totalAircraftTypes}`);

  // Generate output
  const output = `// Travel stats computed from Flighty export
// Last updated: ${today}
// To update: Export new CSV from Flighty and run: npx tsx scripts/update-travels.ts

export interface TravelStats {
  totalFlights: number;
  totalDistance: number; // in km
  totalCountries: number;
  totalAirports: number;
  totalAirlines: number;
  totalAircraftTypes: number;
  firstFlight: string;
  lastUpdated: string;
  airports: string[];
  countries: string[];
}

export const travelStats: TravelStats = ${JSON.stringify(stats, null, 2).replace(/"([^"]+)":/g, '$1:')};
`;

  const outputPath = resolve(__dirname, '../src/data/travels.ts');
  writeFileSync(outputPath, output);
  console.log(`\nWrote stats to: ${outputPath}`);
}

main();
