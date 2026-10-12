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

/** What MapLibre puts on an `error` event: a tile or source failure carries `sourceId` and/or `tile`. */
export interface MapErrorLike {
  error?: unknown;
  sourceId?: string;
  tile?: unknown;
}

export interface Startable {
  on(type: 'load' | 'error', listener: (e: MapErrorLike) => void): unknown;
}

/**
 * Creates the map and watches it start (G6-AC9, "Map can't load"). A constructor that throws (no WebGL), no `load`
 * within the timeout, or an `error` event before `load` calls `onFail`, once. After `load`, a tile or source error
 * (one tile lost on flaky mobile data) is not a failure; any other error (the style) still is. A `load` that comes
 * after a timeout-only failure calls `onRecover`, once: the map did start, just late. A throwing constructor reports
 * on a microtask, never synchronously, so a view that is still building itself isn't re-entered. Returns null then.
 */
export function startMap<M extends Startable>(
  create: () => M, onFail: () => void, onRecover: () => void = () => undefined, timeoutMs = MAP_LOAD_TIMEOUT_MS,
): M | null {
  let failed = false;
  let loaded = false;
  let timedOut = false;
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
  timer = setTimeout(() => {
    timedOut = true;
    fail();
  }, timeoutMs);
  map.on('load', () => {
    if (loaded) return;
    loaded = true;
    clearTimeout(timer);
    if (failed && timedOut) {
      failed = false;
      onRecover();
    }
  });
  map.on('error', (e) => {
    if (loaded && (e?.sourceId !== undefined || e?.tile !== undefined)) return;
    timedOut = false;
    fail();
  });
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

/**
 * G3-AC3: whether a `move` or `moveend` is the driver's. The wrapper's own jumps (`jumping`) and MapLibre's own moves
 * (a resize, which carry no DOM event) are not; MapLibre puts the DOM event on every move a gesture causes, inertia
 * included. With both centres given (`moveend`), a gesture that leaves the centre where it was (a zoom) is not a move.
 */
export function isDriverMove(
  e: { jumping: boolean; originalEvent?: unknown },
  from?: { lat: number; lon: number },
  to?: { lat: number; lon: number },
): boolean {
  if (e.jumping || e.originalEvent == null) return false;
  return from === undefined || to === undefined || hasMoved(from, to);
}
