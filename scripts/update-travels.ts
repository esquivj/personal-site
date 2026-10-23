#!/usr/bin/env npx tsx
/**
 * Import a Flighty export without publishing passenger/booking details.
 * Usage: npx tsx scripts/update-travels.ts /path/to/FlightyExport.csv YYYY-MM-DD
 * The optional as-of date defaults to the export filename's date, then today.
 * Airport reference: https://ourairports.com/data/ (public domain).
 * Distance is summed great-circle distance, not actual aircraft tracks.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeTravelStats } from './travel-import.mjs';
import { travelStatsSchema } from '../src/data/schemas.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const csvPath = process.argv[2] || resolve(process.cwd(), 'FlightyExport.csv');
const asOf = process.argv[3] || basename(csvPath).match(/\d{4}-\d{2}-\d{2}/)?.[0] ||
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
const airportReference = JSON.parse(readFileSync(resolve(scriptDirectory, '../src/data/travel-airports.json'), 'utf8'));
const stats = travelStatsSchema.parse(computeTravelStats(readFileSync(csvPath, 'utf8'), airportReference, asOf));
const output = `// Travel stats computed from Flighty export; past non-cancelled flights only.
// Data as of: ${asOf}. Distance is a great-circle estimate using OurAirports coordinates.
// To update: npx tsx scripts/update-travels.ts /path/to/FlightyExport.csv YYYY-MM-DD

import { z } from 'astro/zod';
import { travelStatsSchema } from './schemas.mjs';

export type TravelStats = z.infer<typeof travelStatsSchema>;

export const travelStats: TravelStats = travelStatsSchema.parse(${JSON.stringify(stats, null, 2).replace(/"([^"]+)":/g, '$1:')});
`;
writeFileSync(resolve(scriptDirectory, '../src/data/travels.ts'), output);
console.log(`Updated through ${asOf}: ${stats.totalFlights} flights, ${stats.totalAirports} airports, ${stats.totalCountries} countries/territories, ${stats.totalDistance.toLocaleString()} estimated km.`);
