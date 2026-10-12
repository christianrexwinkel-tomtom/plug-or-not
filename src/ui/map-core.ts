// The parts of the map wrapper that need neither MapLibre nor a DOM, so Vitest can run them.

/** G6-AC9: no `load` within this long counts as a map that can't start. */
export const MAP_LOAD_TIMEOUT_MS = 8_000;
/** G3-AC3: street level for a precise position. */
export const SPOT_ZOOM = 15;
/** G3-AC2: an approximate position zooms out until its accuracy circle has this radius (the spot map is 230 px high). */
export const ACCURACY_FIT_PX = 90;
/** G6-AC8: room around the framed pins, in CSS pixels — half a labelled pin plus a margin. */
export const FRAME_MARGIN_PX = 48;
/** The least free map, in CSS pixels, left between the paddings so fitBounds can still frame. */
export const FRAME_MIN_PX = 80;
/** G6-AC8: framing never zooms in past this, so a lone nearby charger doesn't fill the screen. */
export const FRAME_MAX_ZOOM = 16;

const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
/** MapLibre's tile size in CSS pixels. */
const TILE_PX = 512;
/** About 1 cm of latitude. */
const MOVE_EPSILON_DEG = 1e-7;

/**
 * What startMap reads from MapLibre's `load`, `error` and `data` events. A tile or source failure carries `sourceId`
 * and/or `tile`; a `data` event for a tile that loaded carries `dataType: 'source'` and the `tile`.
 */
export interface MapEventLike {
  error?: unknown;
  sourceId?: string;
  tile?: unknown;
  dataType?: string;
}

export interface Startable {
  on(type: 'load' | 'error' | 'data', listener: (e: MapEventLike) => void): unknown;
}

const isSourceError = (e: MapEventLike | undefined) => e?.sourceId !== undefined || e?.tile !== undefined;
const isTileData = (e: MapEventLike | undefined) => e?.dataType === 'source' && e.tile !== undefined;

/**
 * Creates the map and watches it start (G6-AC9, "Map can't load"). A constructor that throws (no WebGL), no `load`
 * within the timeout, or an `error` event before `load` calls `onFail`, once. After `load`, a tile or source error
 * (one tile lost on flaky mobile data) is not a failure; any other error (the style) still is.
 *
 * A failure before `load` can recover, once, through `onRecover`: the map did start after all. MapLibre counts an
 * errored source as loaded, so with the tile server unreachable `load` still fires after the tile errors; `load`
 * alone therefore recovers only a failure without a tile or source error before it (the timeout: a slow network, a
 * background tab). After a tile or source error, the map also needs a tile that did load (a `data` event with a
 * tile) at any point, before or after the error and before or after `load`: MapLibre usually finishes the good tiles
 * before one bad tile errors, and no new tile `data` arrives after `load` until the camera moves. So one tile lost
 * during startup recovers; a blocked tile server, which never delivers a tile, stays failed. A failure
 * after `load` (the style) never recovers. A throwing constructor reports on a microtask, never synchronously, so a
 * view that is still building itself isn't re-entered. Returns null then.
 */
export function startMap<M extends Startable>(
  create: () => M, onFail: () => void, onRecover: () => void = () => undefined, timeoutMs = MAP_LOAD_TIMEOUT_MS,
): M | null {
  let failed = false;
  let recoverable = false;
  let loaded = false;
  let sourceErrored = false;
  let tileLoaded = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const fail = () => {
    if (failed) return;
    failed = true;
    recoverable = !loaded;
    clearTimeout(timer);
    onFail();
  };
  const maybeRecover = () => {
    if (!failed || !recoverable || !loaded || (sourceErrored && !tileLoaded)) return;
    failed = false;
    recoverable = false;
    onRecover();
  };
  let map: M;
  try {
    map = create();
  } catch {
    queueMicrotask(fail);
    return null;
  }
  timer = setTimeout(fail, timeoutMs);
  map.on('load', () => {
    if (loaded) return;
    loaded = true;
    clearTimeout(timer);
    maybeRecover();
  });
  map.on('error', (e) => {
    if (isSourceError(e)) {
      if (loaded) return;
      sourceErrored = true;
    }
    fail();
  });
  map.on('data', (e) => {
    if (!isTileData(e)) return;
    tileLoaded = true;
    maybeRecover();
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

/**
 * G3-AC3: the centre to show in the live chip for a `move`, or null when the move isn't the driver's. `last` is the
 * centre at the previous `moveend`; a gesture that keeps the centre there (a wheel or pinch zoom around the centre)
 * is not a move, matching what `moveend` reports.
 */
export function liveMoveCentre(
  e: { jumping: boolean; originalEvent?: unknown },
  last: { lat: number; lon: number },
  centre: { lat: number; lng: number },
): { lat: number; lon: number } | null {
  const now = { lat: centre.lat, lon: centre.lng };
  return isDriverMove(e, last, now) ? now : null;
}

/** [[west, south], [east, north]], the shape MapLibre's fitBounds takes. */
export type Bounds = [[number, number], [number, number]];

export interface Padding {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** G6-AC8: the box around the spot and every result location; null for no points. */
export function boundsOf(points: Array<{ lat: number; lon: number }>): Bounds | null {
  if (points.length === 0) return null;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const p of points) {
    west = Math.min(west, p.lon);
    east = Math.max(east, p.lon);
    south = Math.min(south, p.lat);
    north = Math.max(north, p.lat);
  }
  return [[west, south], [east, north]];
}

/**
 * G6-AC8: fitBounds padding that keeps every pin clear of the top bar and the details panel. On a map too short for
 * both, the top and bottom shrink in proportion until FRAME_MIN_PX stays free; on a narrow one, the sides do.
 */
export function framePadding(topBarPx: number, panelPx: number, widthPx: number, heightPx: number): Padding {
  const side = Math.max(0, Math.min(FRAME_MARGIN_PX, (widthPx - FRAME_MIN_PX) / 2));
  let top = topBarPx + FRAME_MARGIN_PX;
  let bottom = panelPx + FRAME_MARGIN_PX;
  const room = Math.max(0, heightPx - FRAME_MIN_PX);
  if (top + bottom > room) {
    const k = room / (top + bottom);
    top *= k;
    bottom *= k;
  }
  return { top, bottom, left: side, right: side };
}

/** The details panel's `max-height` as a share of the results map (`.sheet` in app.css): keep the two in step. */
export const SHEET_MAX_FRACTION = 0.66;

/**
 * G6-AC8: the panel height to frame for. The panel grows with the selected entry (a "Never worth it" reason line),
 * and a selection never reframes, so frame for the tallest any entry renders (`tallestPx`, measured off-screen), capped
 * at the CSS limit it can't grow past: the pins stay clear whichever entry is shown, without padding a phone's map for
 * a panel no entry fills.
 */
export function framingPanelPx(measuredPx: number, tallestPx: number, heightPx: number): number {
  return Math.max(measuredPx, Math.min(tallestPx, SHEET_MAX_FRACTION * heightPx));
}

/**
 * When the parked map should centre (G3-AC3): on a spot it hasn't centred on yet. Kept across visits of the parked
 * view, since the one map (D-22) keeps its camera: back from the results or Settings, an unchanged spot keeps the
 * camera (and zoom) the driver left. A null centre (the driver's own move is showing) forgets the last one.
 */
export function createCentreTracker() {
  let applied: string | null = null;
  return {
    shouldCentre(centre: { lat: number; lon: number; zoom: number } | null): boolean {
      const key = centre && `${centre.lat},${centre.lon},${centre.zoom}`;
      const go = key !== null && key !== applied;
      applied = key;
      return go;
    },
  };
}
