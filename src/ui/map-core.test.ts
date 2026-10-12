import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ACCURACY_FIT_PX, FRAME_MARGIN_PX, FRAME_MIN_PX, MAP_LOAD_TIMEOUT_MS, SHEET_MAX_FRACTION, SPOT_ZOOM, accuracyRadiusPx, boundsOf,
  createCentreTracker, framePadding, framingPanelPx, hasMoved, isDriverMove, liveMoveCentre, metresPerPixel, spotZoom, startMap, type MapEventLike,
} from './map-core.ts';

/** A stand-in for maplibregl.Map: records listeners so a test can fire `load` and `error`. */
function fakeMap() {
  const listeners: Record<string, Array<(e: MapEventLike) => void>> = {};
  return {
    on(type: 'load' | 'error' | 'data', listener: (e: MapEventLike) => void) {
      (listeners[type] ??= []).push(listener);
    },
    fire(type: 'load' | 'error' | 'data', e: MapEventLike = { error: new Error('style') }) {
      for (const l of listeners[type] ?? []) l(e);
    },
  };
}

/** MapLibre's `data` event for a tile that did load. */
const TILE_DATA: MapEventLike = { dataType: 'source', sourceId: 'openmaptiles', tile: {} };
const TILE_ERROR: MapEventLike = { error: new Error('tile'), sourceId: 'openmaptiles', tile: {} };

describe('startMap (G6-AC9)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports nothing when the map loads within 8 s', () => {
    vi.useFakeTimers();
    const onFail = vi.fn();
    const map = fakeMap();
    expect(startMap(() => map, onFail)).toBe(map);
    map.fire('load');
    vi.advanceTimersByTime(MAP_LOAD_TIMEOUT_MS + 1);
    expect(onFail).not.toHaveBeenCalled();
  });

  it('fails when there is no load event within 8 s', () => {
    vi.useFakeTimers();
    const onFail = vi.fn();
    startMap(() => fakeMap(), onFail);
    vi.advanceTimersByTime(MAP_LOAD_TIMEOUT_MS - 1);
    expect(onFail).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onFail).toHaveBeenCalledTimes(1);
  });

  it('fails once on error events before load, tile errors included', () => {
    const onFail = vi.fn();
    const map = fakeMap();
    startMap(() => map, onFail);
    map.fire('error', TILE_ERROR);
    map.fire('error');
    expect(onFail).toHaveBeenCalledTimes(1);
  });

  it('after load, a tile error does not fail', () => {
    const onFail = vi.fn();
    const map = fakeMap();
    startMap(() => map, onFail);
    map.fire('load');
    map.fire('error', TILE_ERROR);
    map.fire('error', { error: new Error('source'), sourceId: 'openmaptiles' });
    expect(onFail).not.toHaveBeenCalled();
  });

  it('after load, a style error (no source or tile) still fails, once', () => {
    const onFail = vi.fn();
    const map = fakeMap();
    startMap(() => map, onFail);
    map.fire('load');
    map.fire('error');
    map.fire('error');
    expect(onFail).toHaveBeenCalledTimes(1);
  });

  it('a load after the timeout recovers, once', () => {
    vi.useFakeTimers();
    const onFail = vi.fn();
    const onRecover = vi.fn();
    const map = fakeMap();
    startMap(() => map, onFail, onRecover);
    vi.advanceTimersByTime(MAP_LOAD_TIMEOUT_MS);
    expect(onFail).toHaveBeenCalledTimes(1);
    map.fire('load');
    map.fire('load');
    expect(onRecover).toHaveBeenCalledTimes(1);
    map.fire('error', TILE_ERROR);
    expect(onFail).toHaveBeenCalledTimes(1);
  });

  it('a source or tile error before load is not recovered by load alone (OpenFreeMap unreachable)', () => {
    vi.useFakeTimers();
    const onFail = vi.fn();
    const onRecover = vi.fn();
    const map = fakeMap();
    startMap(() => map, onFail, onRecover);
    map.fire('error', TILE_ERROR);
    expect(onFail).toHaveBeenCalledTimes(1);
    // MapLibre counts an errored source as loaded, so `load` still fires.
    map.fire('load');
    map.fire('data', { dataType: 'source', sourceId: 'openmaptiles' }); // metadata, no tile
    map.fire('data', { dataType: 'style' });
    vi.advanceTimersByTime(MAP_LOAD_TIMEOUT_MS + 1);
    expect(onRecover).not.toHaveBeenCalled();
    expect(onFail).toHaveBeenCalledTimes(1);
  });

  it('a tile error before load, then load, then a tile that loads, recovers once (a tile lost during startup)', () => {
    const onFail = vi.fn();
    const onRecover = vi.fn();
    const map = fakeMap();
    startMap(() => map, onFail, onRecover);
    map.fire('error', TILE_ERROR);
    map.fire('load');
    expect(onRecover).not.toHaveBeenCalled();
    map.fire('data', TILE_DATA);
    map.fire('data', TILE_DATA);
    expect(onRecover).toHaveBeenCalledTimes(1);
    expect(onFail).toHaveBeenCalledTimes(1);
  });

  it('a tile error before load, a tile that loads, then load, recovers once at load', () => {
    const onRecover = vi.fn();
    const map = fakeMap();
    startMap(() => map, vi.fn(), onRecover);
    map.fire('error', TILE_ERROR);
    map.fire('data', TILE_DATA);
    expect(onRecover).not.toHaveBeenCalled();
    map.fire('load');
    expect(onRecover).toHaveBeenCalledTimes(1);
  });

  it('a tile that loaded before the first tile error counts: tile, error, load recovers once (MapLibre\'s order)', () => {
    const onFail = vi.fn();
    const onRecover = vi.fn();
    const map = fakeMap();
    startMap(() => map, onFail, onRecover);
    map.fire('data', TILE_DATA);
    map.fire('error', TILE_ERROR);
    expect(onFail).toHaveBeenCalledTimes(1);
    map.fire('load');
    expect(onRecover).toHaveBeenCalledTimes(1);
    map.fire('load');
    map.fire('data', TILE_DATA);
    expect(onRecover).toHaveBeenCalledTimes(1);
  });

  it('a timeout with a tile error before the late load needs a loaded tile too', () => {
    vi.useFakeTimers();
    const onRecover = vi.fn();
    const map = fakeMap();
    startMap(() => map, vi.fn(), onRecover);
    vi.advanceTimersByTime(MAP_LOAD_TIMEOUT_MS);
    map.fire('error', TILE_ERROR);
    map.fire('load');
    expect(onRecover).not.toHaveBeenCalled();
    map.fire('data', TILE_DATA);
    expect(onRecover).toHaveBeenCalledTimes(1);
  });

  it('a style error after load is not recovered by tile data', () => {
    const onFail = vi.fn();
    const onRecover = vi.fn();
    const map = fakeMap();
    startMap(() => map, onFail, onRecover);
    map.fire('load');
    map.fire('error');
    map.fire('data', TILE_DATA);
    expect(onFail).toHaveBeenCalledTimes(1);
    expect(onRecover).not.toHaveBeenCalled();
  });

  it('a load in time reports no recovery', () => {
    vi.useFakeTimers();
    const onRecover = vi.fn();
    const fine = fakeMap();
    startMap(() => fine, vi.fn(), onRecover);
    fine.fire('load');
    vi.advanceTimersByTime(MAP_LOAD_TIMEOUT_MS + 1);
    expect(onRecover).not.toHaveBeenCalled();
  });

  it('fails, not synchronously, when the constructor throws (no WebGL), and returns null', async () => {
    const onFail = vi.fn();
    expect(startMap(() => { throw new Error('WebGL not supported'); }, onFail)).toBeNull();
    expect(onFail).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(onFail).toHaveBeenCalledTimes(1);
  });
});

describe('isDriverMove (G3-AC3)', () => {
  const a = { lat: 51.4436, lon: 5.5519 };
  const b = { lat: 51.4484, lon: 5.4573 };
  const gesture = { type: 'pointermove' };

  it('a gesture move counts', () => {
    expect(isDriverMove({ jumping: false, originalEvent: gesture })).toBe(true);
    expect(isDriverMove({ jumping: false, originalEvent: gesture }, a, b)).toBe(true);
  });

  it('the wrapper\'s own jump does not count, even with a DOM event', () => {
    expect(isDriverMove({ jumping: true, originalEvent: gesture }, a, b)).toBe(false);
  });

  it('a move without a DOM event (resize, programmatic) does not count', () => {
    expect(isDriverMove({ jumping: false }, a, b)).toBe(false);
    expect(isDriverMove({ jumping: false, originalEvent: undefined })).toBe(false);
  });

  it('a gesture that leaves the centre where it was (a zoom) does not count', () => {
    expect(isDriverMove({ jumping: false, originalEvent: gesture }, a, { ...a })).toBe(false);
  });
});

describe('liveMoveCentre (G3-AC3, the live chip)', () => {
  const last = { lat: 51.4436, lon: 5.5519 };
  const gesture = { type: 'wheel' };

  it('a zoom-only gesture move (same centre, DOM event present) is not a driver move', () => {
    expect(liveMoveCentre({ jumping: false, originalEvent: gesture }, last, { lat: last.lat, lng: last.lon })).toBeNull();
  });

  it('a gesture that moves the centre gives the new centre', () => {
    expect(liveMoveCentre({ jumping: false, originalEvent: gesture }, last, { lat: 51.45, lng: 5.46 }))
      .toEqual({ lat: 51.45, lon: 5.46 });
  });

  it('the wrapper\'s jumps and MapLibre\'s own moves give nothing', () => {
    const to = { lat: 51.45, lng: 5.46 };
    expect(liveMoveCentre({ jumping: true, originalEvent: gesture }, last, to)).toBeNull();
    expect(liveMoveCentre({ jumping: false }, last, to)).toBeNull();
  });
});

describe('accuracy circle and zoom (G3-AC2)', () => {
  it('uses Web Mercator ground resolution for 512 px tiles', () => {
    expect(metresPerPixel(0, 0)).toBeCloseTo(78_271.517, 3);
    expect(metresPerPixel(60, 1)).toBeCloseTo(19_567.879, 3);
  });

  it('zooms to street level for a precise position, and out until an approximate circle fits', () => {
    expect(spotZoom(20, 51.4436)).toBe(SPOT_ZOOM);
    const z = spotZoom(1500, 51.4436);
    expect(z).toBeLessThan(SPOT_ZOOM);
    expect(accuracyRadiusPx(1500, 51.4436, z)).toBeCloseTo(ACCURACY_FIT_PX, 6);
  });

  it('counts a centre change as a move, but not a zoom around the centre', () => {
    const a = { lat: 51.4436, lon: 5.5519 };
    expect(hasMoved(a, { ...a })).toBe(false);
    expect(hasMoved(a, { lat: a.lat + 1e-9, lon: a.lon })).toBe(false);
    expect(hasMoved(a, { lat: a.lat, lon: a.lon + 1e-5 })).toBe(true);
  });
});

describe('boundsOf (G6-AC8)', () => {
  it('is null without points', () => {
    expect(boundsOf([])).toBeNull();
  });

  it('is [[west, south], [east, north]] around the spot and every location', () => {
    expect(boundsOf([{ lat: 51.4436, lon: 5.5519 }, { lat: 51.4458, lon: 5.5522 }, { lat: 51.4442, lon: 5.5527 }]))
      .toEqual([[5.5519, 51.4436], [5.5527, 51.4458]]);
  });
});

describe('framePadding (G6-AC8)', () => {
  it('keeps the pins clear of the top bar and the details panel, with a margin on every side', () => {
    expect(framePadding(110, 360, 390, 780)).toEqual({
      top: 110 + FRAME_MARGIN_PX, bottom: 360 + FRAME_MARGIN_PX, left: FRAME_MARGIN_PX, right: FRAME_MARGIN_PX,
    });
  });

  it('on a short or narrow map, shrinks the padding so FRAME_MIN_PX stays free and fitBounds can still frame', () => {
    const p = framePadding(110, 360, 150, 500);
    expect(p.top + p.bottom).toBeCloseTo(500 - FRAME_MIN_PX, 9);
    expect(p.top / p.bottom).toBeCloseTo((110 + FRAME_MARGIN_PX) / (360 + FRAME_MARGIN_PX), 9);
    expect(p.left + p.right).toBe(150 - FRAME_MIN_PX);
  });
});

describe('framingPanelPx (G6-AC8)', () => {
  it('frames for the tallest the details panel can grow, so selecting a taller entry never hides a pin', () => {
    expect(framingPanelPx(220, 780)).toBeCloseTo(SHEET_MAX_FRACTION * 780, 9);
  });

  it('never pads less than the panel as measured', () => {
    expect(framingPanelPx(600, 780)).toBe(600);
  });
});

describe('createCentreTracker (G3-AC3, G6-AC8)', () => {
  const nuenen = { lat: 51.4436, lon: 5.5519, zoom: 15 };

  it('centres on a new spot, once', () => {
    const t = createCentreTracker();
    expect(t.shouldCentre(nuenen)).toBe(true);
    expect(t.shouldCentre({ ...nuenen })).toBe(false);
    expect(t.shouldCentre({ ...nuenen, lat: 51.45 })).toBe(true);
  });

  it('a remounted parked view keeps the camera the driver left for an unchanged spot, and still centres a new one', () => {
    const t = createCentreTracker();
    t.shouldCentre(nuenen);
    // Back from the results (or Settings): the same tracker answers the fresh view's first update.
    expect(t.shouldCentre(nuenen)).toBe(false);
    expect(t.shouldCentre({ lat: 51.4484, lon: 5.4573, zoom: 16 })).toBe(true);
  });

  it("after the driver's own move (no centre), the same browser spot centres again (My location)", () => {
    const t = createCentreTracker();
    t.shouldCentre(nuenen);
    expect(t.shouldCentre(null)).toBe(false);
    expect(t.shouldCentre(nuenen)).toBe(true);
  });
});
