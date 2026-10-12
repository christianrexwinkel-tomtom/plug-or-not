// The one MapLibre map (D-22): OpenFreeMap tiles in the Night or Day style (D-32), with the load and error detection
// of G6-AC9. On the parked view it is dragged under a fixed spot pin (G3-AC3); on the results view it carries the
// result pins and the spot dot (G6-AC8).
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre looks for its worker next to its own module file, which isn't there once Vite has bundled it
// (dev or build). Let Vite emit the worker as its own file and point MapLibre at it.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { NL_CENTRE } from '../services/location.ts';
import {
  FRAME_MAX_ZOOM, accuracyRadiusPx, isDriverMove, liveMoveCentre, startMap, type Bounds, type Padding,
} from './map-core.ts';
import { mapStyle, themeFor, type Theme } from './map-style.ts';

maplibregl.setWorkerUrl(workerUrl);

export interface MapEvents {
  /** The driver moved the parked map; its new centre is the spot. Never called for the wrapper's own jumps, nor on results. */
  moved(lat: number, lon: number): void;
  /** The map can't start, or its style failed (a lost tile after `load` is not a failure). Never synchronously. */
  failed(): void;
  /** A map that failed before `load` (the timeout, a tile error during startup) has loaded after all. */
  recovered(): void;
}

/** An HTML element placed on the map at a point: a result pin or the spot dot (G6-AC8). */
export interface MapMarker {
  lat: number;
  lon: number;
  element: HTMLElement;
}

export interface MapHandle {
  /** Moves the map into `parent`, as its first child (one map, moved between views: D-22). */
  attachTo(parent: HTMLElement): void;
  /** Centres the map without animation; not reported as a move. */
  centreOn(lat: number, lon: number, zoom: number): void;
  /** G3-AC1: no dragging while the location is being found. */
  setDraggable(on: boolean): void;
  /** G3-AC2: the accuracy circle around the pin, or none. */
  setAccuracy(metres: number | null): void;
  /** Follows the centre while the driver drags, for the coordinates chip; one listener at a time. */
  onLiveMove(listener: ((lat: number, lon: number) => void) | null): void;
  /**
   * G6-AC8, results mode: saves the camera for showSpot, makes the attribution compact, and stops reporting moves,
   * so panning the results map never moves the spot.
   */
  showResults(): void;
  /** Back to spot mode for the parked view: the markers go, the attribution is spelled out, the saved camera returns. */
  showSpot(): void;
  /** Replaces every marker. */
  setMarkers(markers: MapMarker[]): void;
  /** G6-AC8: fits the bounds inside the padding, without animation; not reported as a move. */
  frame(bounds: Bounds, padding: Padding): void;
}

const LIGHT = window.matchMedia('(prefers-color-scheme: light)');
const theme = (): Theme => themeFor(LIGHT.matches);

function createMap(events: MapEvents): MapHandle {
  const el = document.createElement('div');
  el.className = 'mapcanvas';
  const map = startMap(() => new maplibregl.Map({
    container: el,
    style: mapStyle(theme()),
    center: [NL_CENTRE.lon, NL_CENTRE.lat],
    zoom: NL_CENTRE.zoom,
    attributionControl: false,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    doubleClickZoom: false,
  }), () => events.failed(), () => events.recovered());
  const circle = document.createElement('div');
  circle.className = 'acc';
  circle.hidden = true;
  el.append(circle);
  let accuracyM: number | null = null;
  let live: ((lat: number, lon: number) => void) | null = null;
  let jumping = false;
  let last: { lat: number; lon: number } = { lat: NL_CENTRE.lat, lon: NL_CENTRE.lon };
  let mode: 'spot' | 'results' = 'spot';
  /** The parked camera, saved by showResults and put back by showSpot. */
  let saved: { centre: maplibregl.LngLat; zoom: number } | null = null;
  let markers: maplibregl.Marker[] = [];
  let attribution: maplibregl.AttributionControl | null = null;

  function drawCircle(): void {
    if (!map || accuracyM === null) {
      circle.hidden = true;
      return;
    }
    const d = 2 * accuracyRadiusPx(accuracyM, map.getCenter().lat, map.getZoom());
    circle.style.width = `${d}px`;
    circle.style.height = `${d}px`;
    circle.hidden = false;
  }

  /** The attribution is always shown (D-22): spelled out on the parked map, compact above the panel on results. */
  function showAttribution(compact: boolean): void {
    if (!map) return;
    if (attribution) map.removeControl(attribution);
    attribution = new maplibregl.AttributionControl({ compact });
    map.addControl(attribution, 'bottom-right');
  }

  /** A camera move of the wrapper's own. MapLibre fires its move events synchronously, so the flag covers them all. */
  function jump(move: () => void): void {
    jumping = true;
    try {
      move();
    } finally {
      jumping = false;
    }
    drawCircle();
  }

  function clearMarkers(): void {
    for (const m of markers) m.remove();
    markers = [];
  }

  if (map) {
    // The attribution comes from OpenFreeMap's TileJSON, always spelled out on the parked map (D-22).
    showAttribution(false);
    // Zooming keeps the spot under the pin: only a drag moves it.
    map.scrollZoom.enable({ around: 'center' });
    map.touchZoomRotate.enable({ around: 'center' });
    map.touchZoomRotate.disableRotation();
    // Only a gesture on the parked map moves the spot (isDriverMove): not our jumps, not MapLibre's own resizes,
    // not a zoom, and nothing on the results map.
    map.on('move', (e) => {
      if (!live || mode !== 'spot') return;
      const now = liveMoveCentre({ jumping, originalEvent: e.originalEvent }, last, map.getCenter());
      if (now) live(now.lat, now.lon);
    });
    map.on('moveend', (e) => {
      const c = map.getCenter();
      const now = { lat: c.lat, lon: c.lng };
      if (mode === 'spot' && isDriverMove({ jumping, originalEvent: e.originalEvent }, last, now)) events.moved(now.lat, now.lon);
      last = now;
    });
    map.on('zoom', drawCircle);
    // G7-AC6: follow a device theme switch without a reload; the pin, the circle and the markers are HTML and stay.
    LIGHT.addEventListener('change', () => map.setStyle(mapStyle(theme())));
  }

  return {
    attachTo(parent) {
      parent.prepend(el);
      map?.resize();
    },
    centreOn(lat, lon, zoom) {
      const m = map;
      if (!m) return;
      jump(() => m.jumpTo({ center: [lon, lat], zoom }));
    },
    setDraggable(on) {
      if (!map) return;
      if (on) {
        map.dragPan.enable();
        map.keyboard.enable();
      } else {
        map.dragPan.disable();
        map.keyboard.disable();
      }
    },
    setAccuracy(metres) {
      accuracyM = metres;
      drawCircle();
    },
    onLiveMove(listener) {
      live = listener;
    },
    showResults() {
      if (!map || mode === 'results') return;
      mode = 'results';
      saved = { centre: map.getCenter(), zoom: map.getZoom() };
      showAttribution(true);
    },
    showSpot() {
      const m = map;
      if (!m || mode === 'spot') return;
      mode = 'spot';
      clearMarkers();
      showAttribution(false);
      const back = saved;
      saved = null;
      if (back) jump(() => m.jumpTo({ center: back.centre, zoom: back.zoom }));
    },
    setMarkers(list) {
      const m = map;
      if (!m) return;
      clearMarkers();
      markers = list.map((x) => new maplibregl.Marker({ element: x.element }).setLngLat([x.lon, x.lat]).addTo(m));
    },
    frame(bounds, padding) {
      const m = map;
      if (!m) return;
      jump(() => m.fitBounds(bounds, { padding, maxZoom: FRAME_MAX_ZOOM, animate: false }));
    },
  };
}

let shared: MapHandle | null = null;

/** The one map (D-22), made on first use. The first caller's events stay bound: the app is a singleton. */
export function sharedMap(events: MapEvents): MapHandle {
  shared ??= createMap(events);
  return shared;
}
