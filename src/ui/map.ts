// The one MapLibre map (D-22): OpenFreeMap tiles in the Night or Day style (D-32), dragged under a fixed spot pin
// (G3-AC3), with the load and error detection of G6-AC9. Result pins come with Slice 4.
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre looks for its worker next to its own module file, which isn't there once Vite has bundled it
// (dev or build). Let Vite emit the worker as its own file and point MapLibre at it.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { NL_CENTRE } from '../services/location.ts';
import { accuracyRadiusPx, isDriverMove, startMap } from './map-core.ts';
import { mapStyle, themeFor, type Theme } from './map-style.ts';

maplibregl.setWorkerUrl(workerUrl);

export interface MapEvents {
  /** The driver moved the map; its new centre is the spot. Never called for the wrapper's own jumps. */
  moved(lat: number, lon: number): void;
  /** The map can't start, or its style failed (a lost tile after `load` is not a failure). Never synchronously. */
  failed(): void;
  /** A map that timed out has loaded after all. */
  recovered(): void;
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

  if (map) {
    // The attribution comes from OpenFreeMap's TileJSON, always spelled out (D-22).
    map.addControl(new maplibregl.AttributionControl({ compact: false }), 'bottom-right');
    // Zooming keeps the spot under the pin: only a drag moves it.
    map.scrollZoom.enable({ around: 'center' });
    map.touchZoomRotate.enable({ around: 'center' });
    map.touchZoomRotate.disableRotation();
    // Only a gesture moves the spot (isDriverMove): not our jumps, not MapLibre's own resizes.
    map.on('move', (e) => {
      if (!live || !isDriverMove({ jumping, originalEvent: e.originalEvent })) return;
      const c = map.getCenter();
      live(c.lat, c.lng);
    });
    map.on('moveend', (e) => {
      const c = map.getCenter();
      const now = { lat: c.lat, lon: c.lng };
      if (isDriverMove({ jumping, originalEvent: e.originalEvent }, last, now)) events.moved(now.lat, now.lon);
      last = now;
    });
    map.on('zoom', drawCircle);
    // G7-AC6: follow a device theme switch without a reload; the pin and the circle are HTML and stay.
    LIGHT.addEventListener('change', () => map.setStyle(mapStyle(theme())));
  }

  return {
    attachTo(parent) {
      parent.prepend(el);
      map?.resize();
    },
    centreOn(lat, lon, zoom) {
      if (!map) return;
      // jumpTo fires its move events synchronously, so the flag covers them all.
      jumping = true;
      try {
        map.jumpTo({ center: [lon, lat], zoom });
      } finally {
        jumping = false;
      }
      drawCircle();
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
  };
}

let shared: MapHandle | null = null;

/** The one map (D-22), made on first use. The first caller's events stay bound: the app is a singleton. */
export function sharedMap(events: MapEvents): MapHandle {
  shared ??= createMap(events);
  return shared;
}
