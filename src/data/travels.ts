// Travel stats computed from Flighty export; past non-cancelled flights only.
// Data as of: 2026-10-21. Distance is a great-circle estimate using OurAirports coordinates.
// To update: npx tsx scripts/update-travels.ts /path/to/FlightyExport.csv YYYY-MM-DD

import { z } from 'astro/zod';
import { travelStatsSchema } from './schemas.mjs';

export type TravelStats = z.infer<typeof travelStatsSchema>;

export const travelStats: TravelStats = travelStatsSchema.parse({
  totalFlights: 71,
  totalDistance: 308754,
  totalCountries: 17,
  totalAirports: 35,
  totalAirlines: 21,
  totalAircraftTypes: 23,
  firstFlight: "2018-12-29",
  lastUpdated: "2026-10-21",
  airports: [
    "AUS",
    "BJV",
    "BKK",
    "BOG",
    "BRU",
    "BUR",
    "CDG",
    "DMK",
    "DUB",
    "EWR",
    "FRA",
    "HKG",
    "HKT",
    "HND",
    "ICN",
    "IST",
    "JFK",
    "KUL",
    "LAX",
    "LHR",
    "LIS",
    "LYS",
    "MAD",
    "MEX",
    "MTY",
    "NCE",
    "OPO",
    "ORY",
    "PDX",
    "PHL",
    "PVR",
    "SIN",
    "STN",
    "TIJ",
    "ZCL"
  ],
  landedAirports: [
    "AUS",
    "BJV",
    "BOG",
    "BRU",
    "CDG",
    "DMK",
    "DUB",
    "EWR",
    "FRA",
    "HKG",
    "HKT",
    "HND",
    "ICN",
    "IST",
    "JFK",
    "KUL",
    "LAX",
    "LHR",
    "LIS",
    "LYS",
    "MAD",
    "MEX",
    "OPO",
    "ORY",
    "PDX",
    "PHL",
    "PVR",
    "SIN",
    "STN",
    "TIJ",
    "ZCL"
  ],
  countries: [
    "🇧🇪 Belgium",
    "🇨🇴 Colombia",
    "🇩🇪 Germany",
    "🇪🇸 Spain",
    "🇫🇷 France",
    "🇬🇧 United Kingdom",
    "🇭🇰 Hong Kong",
    "🇮🇪 Ireland",
    "🇯🇵 Japan",
    "🇰🇷 South Korea",
    "🇲🇽 Mexico",
    "🇲🇾 Malaysia",
    "🇵🇹 Portugal",
    "🇸🇬 Singapore",
    "🇹🇭 Thailand",
    "🇹🇷 Turkey",
    "🇺🇸 United States"
  ],
  routes: [
    {
      from: "AUS",
      to: "LAX",
      count: 2
    },
    {
      from: "BJV",
      to: "IST",
      count: 2
    },
    {
      from: "BKK",
      to: "ICN",
      count: 1
    },
    {
      from: "BOG",
      to: "LAX",
      count: 2
    },
    {
      from: "BRU",
      to: "LHR",
      count: 1
    },
    {
      from: "BRU",
      to: "OPO",
      count: 1
    },
    {
      from: "BUR",
      to: "PDX",
      count: 1
    },
    {
      from: "CDG",
      to: "LAX",
      count: 1
    },
    {
      from: "CDG",
      to: "LIS",
      count: 1
    },
    {
      from: "DMK",
      to: "HKT",
      count: 1
    },
    {
      from: "DUB",
      to: "LAX",
      count: 1
    },
    {
      from: "DUB",
      to: "LIS",
      count: 1
    },
    {
      from: "EWR",
      to: "LAX",
      count: 1
    },
    {
      from: "EWR",
      to: "LIS",
      count: 1
    },
    {
      from: "FRA",
      to: "LAX",
      count: 1
    },
    {
      from: "FRA",
      to: "LIS",
      count: 1
    },
    {
      from: "HKG",
      to: "HKT",
      count: 1
    },
    {
      from: "HKG",
      to: "ICN",
      count: 1
    },
    {
      from: "HND",
      to: "LAX",
      count: 2
    },
    {
      from: "ICN",
      to: "LAX",
      count: 2
    },
    {
      from: "IST",
      to: "LIS",
      count: 2
    },
    {
      from: "JFK",
      to: "LAX",
      count: 3
    },
    {
      from: "JFK",
      to: "LIS",
      count: 1
    },
    {
      from: "KUL",
      to: "SIN",
      count: 2
    },
    {
      from: "LAX",
      to: "LHR",
      count: 6
    },
    {
      from: "LAX",
      to: "LIS",
      count: 1
    },
    {
      from: "LAX",
      to: "MAD",
      count: 1
    },
    {
      from: "LAX",
      to: "ORY",
      count: 2
    },
    {
      from: "LAX",
      to: "PDX",
      count: 2
    },
    {
      from: "LAX",
      to: "PHL",
      count: 3
    },
    {
      from: "LAX",
      to: "SIN",
      count: 2
    },
    {
      from: "LAX",
      to: "ZCL",
      count: 2
    },
    {
      from: "LHR",
      to: "LIS",
      count: 2
    },
    {
      from: "LIS",
      to: "LYS",
      count: 1
    },
    {
      from: "LIS",
      to: "MAD",
      count: 1
    },
    {
      from: "LIS",
      to: "NCE",
      count: 2
    },
    {
      from: "LIS",
      to: "OPO",
      count: 2
    },
    {
      from: "LIS",
      to: "PHL",
      count: 4
    },
    {
      from: "MEX",
      to: "TIJ",
      count: 2
    },
    {
      from: "MTY",
      to: "PVR",
      count: 1
    },
    {
      from: "OPO",
      to: "STN",
      count: 1
    },
    {
      from: "TIJ",
      to: "ZCL",
      count: 3
    }
  ]
});
