import { Map, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import type { MultiLineString } from 'geojson';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

interface City { name: string; country: string; lat: number; lon: number; flights: number }
interface MapData { cities: City[]; routes: MultiLineString[] }

setWorkerUrl(workerUrl);

export function initTravelMap(root: HTMLElement) {
  const data: MapData = JSON.parse(root.querySelector('[data-map-data]')!.textContent!);
  const container = root.querySelector<HTMLElement>('[data-map-canvas]')!;
  const fallback = root.querySelector<HTMLElement>('[data-map-fallback]')!;
  const note = root.querySelector<HTMLElement>('[data-map-note]')!;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let map: Map | undefined;
  let ready = false;

  function showFallback() {
    ready = false;
    root.dataset.mapState = 'fallback';
    fallback.hidden = false;
    container.hidden = true;
    note.textContent = 'Cities in my flight history';
  }

  const style: StyleSpecification = {
    version: 8,
    'font-faces': { 'Atlas Regular': '/fonts/iAWriterQuattroS-Regular.woff2' },
    sources: {
      world: { type: 'geojson', data: '/maps/countries.geojson', attribution: '<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a>' },
      routes: { type: 'geojson', data: { type: 'FeatureCollection', features: data.routes.map(geometry => ({ type: 'Feature', properties: {}, geometry })) } },
      cities: { type: 'geojson', data: { type: 'FeatureCollection', features: data.cities.map(city => ({ type: 'Feature', properties: { name: city.name, priority: -city.flights }, geometry: { type: 'Point', coordinates: [city.lon, city.lat] } })) } },
    },
    layers: [
      { id: 'water', type: 'background', paint: { 'background-color': '#e8ece8' } },
      { id: 'land', type: 'fill', source: 'world', paint: { 'fill-color': '#f4f1e9' } },
      { id: 'borders', type: 'line', source: 'world', paint: { 'line-color': '#c6c9bc', 'line-width': .5, 'line-opacity': .45 } },
      // Routes are visual context only: no hit targets, tooltips, or selection.
      { id: 'routes', type: 'line', source: 'routes', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#b67560', 'line-width': .9, 'line-opacity': .28 } },
      { id: 'cities', type: 'circle', source: 'cities', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 2.6, 4, 4], 'circle-color': '#ae462d', 'circle-stroke-color': '#f7f5f1', 'circle-stroke-width': 1.2 } },
      { id: 'city-labels', type: 'symbol', source: 'cities', layout: {
        'text-field': ['get', 'name'], 'text-font': ['Atlas Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 0, 10, 3, 12],
        'text-variable-anchor': ['right', 'left', 'top', 'bottom'], 'text-radial-offset': .65,
        'text-padding': 7, 'text-max-width': 12, 'symbol-sort-key': ['get', 'priority'],
      }, paint: { 'text-color': '#494641', 'text-halo-color': '#f4f1e9', 'text-halo-width': 1.5, 'text-halo-blur': .5 } },
    ],
  };

  try {
    root.dataset.mapState = 'loading';
    map = new Map({ container, style, center: [0, 25], zoom: 1, minZoom: -1.5, maxZoom: 6,
      renderWorldCopies: true, dragRotate: false, pitchWithRotate: false,
      cooperativeGestures: true, fadeDuration: reducedMotion ? 0 : 150,
      attributionControl: { compact: false },
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');
    const timer = window.setTimeout(() => { if (!ready) showFallback(); }, 18000);
    map.on('load', () => {
      window.clearTimeout(timer);
      ready = true;
      container.hidden = false;
      fallback.hidden = true;
      root.dataset.mapState = 'ready';
      map!.resize();
      // On narrow screens retain enough scale for city labels and pan to explore.
      const zoom = Math.max(.3, Math.log2(container.clientWidth / 512));
      map!.jumpTo({ center: [5, 25], zoom });
    });
    map.on('error', event => { if ('sourceId' in event && event.sourceId === 'world') showFallback(); });
    const observer = new ResizeObserver(() => map?.resize());
    observer.observe(container);
    window.addEventListener('pagehide', event => { if (!event.persisted) { window.clearTimeout(timer); observer.disconnect(); map?.remove(); } });
  } catch {
    showFallback();
  }
}
