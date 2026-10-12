// The parts of the map wrapper that need neither MapLibre nor a DOM, so Vitest can run them.

/** G6-AC9: no `load` within this long counts as a map that can't start. */
export const MAP_LOAD_TIMEOUT_MS = 8_000;
/** G3-AC3: street level for a precise position. */
export const SPOT_ZOOM = 15;
/** G3-AC2: an approximate position zooms out until its accuracy circle has this radius (the spot map is 230 px high). */
export const ACCURACY_FIT_PX = 90;

const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
/** MapLibre's tile size in CSS pixels. */
const TILE_PX = 512;
/** About 1 cm of latitude. */
const MOVE_EPSILON_DEG = 1e-7;

export interface Startable {
  on(type: 'load' | 'error', listener: () => void): unknown;
}

/**
 * Creates the map and watches it start (G6-AC9). A constructor that throws (no WebGL), no `load` within the
 * timeout, or any `error` event (style or tiles) calls `onFail`, once. A throwing constructor reports on a
 * microtask, never synchronously, so a view that is still building itself isn't re-entered. Returns null then.
 */
export function startMap<M extends Startable>(create: () => M, onFail: () => void, timeoutMs = MAP_LOAD_TIMEOUT_MS): M | null {
  let failed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const fail = () => {
    if (failed) return;
    failed = true;
    clearTimeout(timer);
    onFail();
  };
  let map: M;
  try {
    map = create();
  } catch {
    queueMicrotask(fail);
    return null;
  }
  timer = setTimeout(fail, timeoutMs);
  map.on('load', () => clearTimeout(timer));
  map.on('error', fail);
  return map;
}

/** Ground resolution at a latitude and zoom, in metres per CSS pixel. */
export function metresPerPixel(lat: number, zoom: number): number {
  return (EARTH_CIRCUMFERENCE_M * Math.cos((lat * Math.PI) / 180)) / (TILE_PX * 2 ** zoom);
}

/** G3-AC2: the accuracy circle's radius on screen. */
export function accuracyRadiusPx(accuracyM: number, lat: number, zoom: number): number {
  return accuracyM / metresPerPixel(lat, zoom);
}

/** Street level, or wider when the accuracy circle wouldn't fit at street level. */
export function spotZoom(accuracyM: number, lat: number): number {
  // The radius doubles with each zoom step: accuracyM × 2^zoom ÷ metresPerPixel(lat, 0) = ACCURACY_FIT_PX.
  const fit = Math.log2((ACCURACY_FIT_PX * metresPerPixel(lat, 0)) / accuracyM);
  return Math.min(SPOT_ZOOM, fit);
}

/** A centre change bigger than about 1 cm counts as a move; a zoom around the centre doesn't. */
export function hasMoved(a: { lat: number; lon: number }, b: { lat: number; lon: number }): boolean {
  return Math.abs(a.lat - b.lat) > MOVE_EPSILON_DEG || Math.abs(a.lon - b.lon) > MOVE_EPSILON_DEG;
}
