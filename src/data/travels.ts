// Travel stats computed from Flighty export
// Last updated: 2026-04-08
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
  totalFlights: 63,
  totalDistance: 264800,
  totalCountries: 17,
  totalAirports: 33,
  totalAirlines: 20,
  totalAircraftTypes: 23,
  firstFlight: "2018-12-29",
  lastUpdated: "2026-04-08",
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
    "NCE",
    "OPO",
    "ORY",
    "PDX",
    "PHL",
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
  ]
};
