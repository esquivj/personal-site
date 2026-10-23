import { Map, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import type { FilterSpecification, StyleSpecification } from 'maplibre-gl';
import type { MultiLineString } from 'geojson';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Airport { code: string; name: string; city: string; country: string; lat: number; lon: number; flights: number }
interface Route { id: string; from: string; to: string; count: number; distance: number; geometry: MultiLineString }
interface MapData { airports: Airport[]; routes: Route[] }

setWorkerUrl(workerUrl);

export function initTravelMap(root: HTMLElement) {
  const data: MapData = JSON.parse(root.querySelector('[data-map-data]')!.textContent!);
  const airportSelect = root.querySelector<HTMLSelectElement>('[data-airport-select]')!;
  const reset = root.querySelector<HTMLButtonElement>('[data-map-reset]')!;
  const container = root.querySelector<HTMLElement>('[data-map-canvas]')!;
  const fallback = root.querySelector<HTMLElement>('[data-map-fallback]')!;
  const note = root.querySelector<HTMLElement>('[data-map-note]')!;
  const hover = root.querySelector<HTMLElement>('[data-map-hover]')!;
  const label = root.querySelector<HTMLElement>('[data-detail-label]')!;
  const title = root.querySelector<HTMLElement>('[data-detail-title]')!;
  const copy = root.querySelector<HTMLElement>('[data-detail-copy]')!;
  const meta = root.querySelector<HTMLElement>('[data-detail-meta]')!;
  const count = root.querySelector<HTMLElement>('[data-route-count]')!;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-route-id]')];
  const airports = new globalThis.Map(data.airports.map(a => [a.code, a]));
  const routes = new globalThis.Map(data.routes.map(r => [r.id, r]));
  const totalFlights = data.routes.reduce((sum, r) => sum + r.count, 0);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let map: Map | undefined;
  let ready = false;
  let selectedAirport = '';
  let selectedRoute = '';
  const labels: { airport: Airport; marker: Marker; element: HTMLElement }[] = [];
  const ranked = [...data.airports].sort((a, b) => b.flights - a.flights);
  const topThree = new Set(ranked.slice(0, 3).map(a => a.code));
  const topSix = new Set(ranked.slice(0, 6).map(a => a.code));

  function airportAtPoint(features: ReturnType<Map['queryRenderedFeatures']>, point: { x: number; y: number }) {
    const candidates = features.filter(f => f.layer.id === 'airports-hit').map(feature => {
      const airport = airports.get(String(feature.properties.code))!;
      const position = map!.project([airport.lon, airport.lat]);
      return { feature, airport, distance: Math.hypot(position.x - point.x, position.y - point.y) };
    });
    const closest = Math.min(...candidates.map(c => c.distance));
    // At world scale neighboring airports overlap; prioritize the busiest one.
    return candidates.filter(c => c.distance <= closest + 2).sort((a, b) => b.airport.flights - a.airport.flights)[0]?.feature;
  }

  function updateLabels() {
    const zoom = map?.getZoom() ?? 0;
    for (const item of labels) {
      item.element.style.visibility = item.airport.code === selectedAirport ||
        (zoom >= 2.2 ? topSix : topThree).has(item.airport.code) ? 'visible' : 'hidden';
    }
  }

  function updateSelection() {
    const matching = data.routes.filter(r => !selectedAirport || r.from === selectedAirport || r.to === selectedAirport);
    for (const button of buttons) {
      button.hidden = !!selectedAirport && button.dataset.from !== selectedAirport && button.dataset.to !== selectedAirport;
      button.setAttribute('aria-pressed', String(button.dataset.routeId === selectedRoute));
    }
    count.textContent = String(matching.length);
    airportSelect.value = selectedAirport;
    if (selectedRoute) {
      const route = routes.get(selectedRoute)!;
      label.textContent = 'Route details';
      title.textContent = `${route.from} ↔ ${route.to}`;
      copy.textContent = `${airports.get(route.from)!.city} to ${airports.get(route.to)!.city}. ${route.count} recorded ${route.count === 1 ? 'flight' : 'flights'}, both directions combined.`;
      meta.textContent = `${route.distance.toLocaleString('en-US')} km · estimated one-way distance`;
    } else if (selectedAirport) {
      const airport = airports.get(selectedAirport)!;
      label.textContent = `${airport.code} · ${airport.country.replace(/^\S+\s/, '')}`;
      title.textContent = airport.city || airport.name;
      copy.textContent = airport.name;
      meta.textContent = `${airport.flights} flights · ${matching.length} ${matching.length === 1 ? 'connection' : 'connections'}`;
    } else {
      label.textContent = 'The full picture';
      title.textContent = `${data.routes.length} routes around the world.`;
      copy.textContent = 'Select an airport to explore its connections, or a route to see the details.';
      meta.textContent = `${data.airports.length} airports · ${totalFlights} flights`;
    }
    if (!ready || !map) return;
    const filter: FilterSpecification = selectedRoute ? ['==', ['get', 'id'], selectedRoute] :
      selectedAirport ? ['any', ['==', ['get', 'from'], selectedAirport], ['==', ['get', 'to'], selectedAirport]] : ['has', 'id'];
    map.setFilter('routes-active', filter);
    map.setPaintProperty('routes-active', 'line-opacity', selectedAirport || selectedRoute ? .92 : .46);
    map.setPaintProperty('routes-active', 'line-width', selectedAirport || selectedRoute ? 2 : 1.15);
    const connected = new Set((selectedRoute ? [routes.get(selectedRoute)!] : matching).flatMap(r => [r.from, r.to]));
    map.setFilter('airports-active', ['in', ['get', 'code'], ['literal', [...connected]]]);
    map.setFilter('airport-selected', ['==', ['get', 'code'], selectedAirport]);
    updateLabels();
  }

  function overview() {
    selectedAirport = ''; selectedRoute = ''; hover.hidden = true;
    updateSelection();
    map?.fitBounds([[-177, -34], [179, 76]], { padding: { top: 36, bottom: 44, left: 22, right: 22 }, duration: reducedMotion ? 0 : 700 });
  }

  function selectAirport(code: string, move = true) {
    selectedAirport = code; selectedRoute = ''; hover.hidden = true;
    updateSelection();
    const airport = airports.get(code);
    if (airport && move) map?.easeTo({ center: [airport.lon, airport.lat], zoom: Math.max(map.getZoom(), 2.2), duration: reducedMotion ? 0 : 650 });
  }

  airportSelect.addEventListener('change', () => airportSelect.value ? selectAirport(airportSelect.value) : overview());
  reset.addEventListener('click', overview);
  for (const button of buttons) button.addEventListener('click', () => {
    selectedRoute = button.dataset.routeId!;
    updateSelection();
  });
  root.addEventListener('keydown', event => { if (event.key === 'Escape') overview(); });

  function showFallback() {
    ready = false;
    root.dataset.mapState = 'fallback';
    fallback.hidden = false;
    container.hidden = true;
    note.textContent = 'Static map · explore the airport selector or route list below';
  }

  const routeFeatures = data.routes.map(({ geometry, ...properties }) => ({ type: 'Feature' as const, properties, geometry }));
  const airportFeatures = data.airports.map(a => ({ type: 'Feature' as const, properties: { code: a.code, flights: a.flights }, geometry: { type: 'Point' as const, coordinates: [a.lon, a.lat] } }));
  const style: StyleSpecification = {
    version: 8,
    sources: {
      world: { type: 'geojson', data: '/maps/countries.geojson', attribution: '<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a>' },
      routes: { type: 'geojson', data: { type: 'FeatureCollection', features: routeFeatures } },
      airports: { type: 'geojson', data: { type: 'FeatureCollection', features: airportFeatures } },
    },
    layers: [
      { id: 'water', type: 'background', paint: { 'background-color': '#e8ece8' } },
      { id: 'land', type: 'fill', source: 'world', paint: { 'fill-color': '#f4f1e9', 'fill-outline-color': '#d4d5c9' } },
      { id: 'borders', type: 'line', source: 'world', paint: { 'line-color': '#c6c9bc', 'line-width': .6, 'line-opacity': .65 } },
      { id: 'routes-context', type: 'line', source: 'routes', paint: { 'line-color': '#b9a499', 'line-width': .8, 'line-opacity': .2 } },
      { id: 'routes-active', type: 'line', source: 'routes', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#b84d31', 'line-width': 1.15, 'line-opacity': .46 } },
      { id: 'routes-hit', type: 'line', source: 'routes', paint: { 'line-color': '#b84d31', 'line-width': 14, 'line-opacity': 0 } },
      { id: 'airport-selected', type: 'circle', source: 'airports', filter: ['==', ['get', 'code'], ''], paint: { 'circle-radius': 11, 'circle-color': '#c24a2d', 'circle-opacity': .13 } },
      { id: 'airports-context', type: 'circle', source: 'airports', paint: { 'circle-radius': 2.5, 'circle-color': '#b9a499', 'circle-opacity': .45 } },
      { id: 'airports-active', type: 'circle', source: 'airports', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 2.8, 4, 5], 'circle-color': '#ae462d', 'circle-stroke-color': '#f7f5f1', 'circle-stroke-width': 1.3 } },
      { id: 'airports-hit', type: 'circle', source: 'airports', paint: { 'circle-radius': 12, 'circle-opacity': 0 } },
    ],
  };

  try {
    root.dataset.mapState = 'loading';
    map = new Map({ container, style, center: [0, 25], zoom: 1, minZoom: -1.5, maxZoom: 6, renderWorldCopies: false, dragRotate: false, pitchWithRotate: false, cooperativeGestures: true, attributionControl: { compact: false } });
    map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');
    const timer = window.setTimeout(() => { if (!ready) showFallback(); }, 18000);
    map.on('load', () => {
      window.clearTimeout(timer);
      ready = true;
      container.hidden = false;
      fallback.hidden = true;
      root.dataset.mapState = 'ready';
      note.textContent = 'Drag to explore · select an airport or route';
      map!.resize();
      map!.fitBounds([[-177, -34], [179, 76]], { padding: { top: 36, bottom: 44, left: 22, right: 22 }, duration: 0 });
      for (const airport of data.airports) {
        const element = document.createElement('span');
        element.className = 'atlas-airport-label';
        element.textContent = airport.code;
        element.setAttribute('aria-hidden', 'true');
        const marker = new Marker({ element, anchor: 'left', offset: [8, 0] }).setLngLat([airport.lon, airport.lat]).addTo(map!);
        labels.push({ airport, marker, element });
      }
      updateSelection();
    });
    map.on('zoom', updateLabels);
    map.on('error', event => { if ('sourceId' in event && event.sourceId === 'world') showFallback(); });
    map.on('click', event => {
      if (!ready) return;
      const features = map!.queryRenderedFeatures(event.point, { layers: ['airports-hit', 'routes-hit'] });
      const airport = airportAtPoint(features, event.point);
      const route = features.find(f => f.layer.id === 'routes-hit');
      if (airport) selectAirport(String(airport.properties.code), false);
      else if (route) {
        selectedAirport = ''; selectedRoute = String(route.properties.id);
        updateSelection();
      }
    });
    map.on('mousemove', event => {
      if (!ready) return;
      const features = map!.queryRenderedFeatures(event.point, { layers: ['airports-hit', 'routes-hit'] });
      const airport = airportAtPoint(features, event.point);
      const route = features.find(f => f.layer.id === 'routes-hit');
      map!.getCanvas().style.cursor = airport || route ? 'pointer' : 'grab';
      hover.hidden = !airport && !route;
      if (airport) {
        const a = airports.get(String(airport.properties.code))!;
        hover.textContent = `${a.city} · ${a.code}`;
      } else if (route) hover.textContent = `${route.properties.from} ↔ ${route.properties.to} · ${route.properties.count} flights`;
      hover.style.left = `${Math.max(8, Math.min(event.point.x + 14, container.clientWidth - 248))}px`;
      hover.style.top = `${Math.max(8, Math.min(event.point.y + 16, container.clientHeight - 50))}px`;
    });
    map.getCanvas().addEventListener('mouseleave', () => { hover.hidden = true; });
    const observer = new ResizeObserver(() => map?.resize());
    observer.observe(container);
    window.addEventListener('pagehide', event => { if (!event.persisted) { window.clearTimeout(timer); observer.disconnect(); map?.remove(); } });
  } catch {
    showFallback();
  }
}
