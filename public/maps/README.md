Basemap: Natural Earth country boundaries at 1:50m scale, converted from
world-atlas@2.0.2/countries-50m.json with topojson-client; coordinates rounded
to four decimal places. D3 clips polygons at the date line before tiling.
Regenerate with `node scripts/build-travel-basemap.mjs`.
Natural Earth data is public domain.
https://www.naturalearthdata.com/about/terms-of-use/
https://github.com/topojson/world-atlas

The browser uses this local GeoJSON with MapLibre. No map API key or remote
tile service is required. Flight routes are great-circle connections, not
recorded aircraft tracks. Airport coordinates come from OurAirports.
