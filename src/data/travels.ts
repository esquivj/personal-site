// Travel stats computed from Flighty export
// Last updated: 2026-01-18
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

export const travelStats: TravelStats = {
  totalFlights: 59,
  totalDistance: 234850, // approximate km
  totalCountries: 17,
  totalAirports: 32,
  totalAirlines: 21,
  totalAircraftTypes: 19,
  firstFlight: "2018-12-29",
  lastUpdated: "2026-01-18",
  airports: [
    "AUS", "BJV", "BKK", "BOG", "BRU", "BUR", "CDG", "DMK", "DUB",
    "HKG", "HKT", "HND", "ICN", "IST", "JFK", "KUL", "LAX", "LHR",
    "LIS", "LYS", "MAD", "MEX", "NCE", "OPO", "ORY", "PDX", "PHL",
    "SIN", "STN", "TIJ", "ZCL"
  ],
  countries: [
    "🇧🇪 Belgium", "🇨🇴 Colombia", "🇫🇷 France", "🇭🇰 Hong Kong", "🇮🇪 Ireland", "🇯🇵 Japan",
    "🇲🇾 Malaysia", "🇲🇽 Mexico", "🇵🇹 Portugal", "🇸🇬 Singapore", "🇰🇷 South Korea",
    "🇪🇸 Spain", "🇹🇭 Thailand", "🇹🇷 Turkey", "🇬🇧 United Kingdom", "🇺🇸 United States"
  ]
};
