import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ACCURACY_FIT_PX, MAP_LOAD_TIMEOUT_MS, SPOT_ZOOM, accuracyRadiusPx, hasMoved, metresPerPixel, spotZoom, startMap,
} from './map-core.ts';

/** A stand-in for maplibregl.Map: records listeners so a test can fire `load` and `error`. */
function fakeMap() {
  const listeners: Record<string, Array<() => void>> = {};
  return {
    on(type: 'load' | 'error', listener: () => void) {
      (listeners[type] ??= []).push(listener);
    },
    fire(type: 'load' | 'error') {
      for (const l of listeners[type] ?? []) l();
    },
  };
}

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

  it('fails once on error events (style or tiles), also after load', () => {
    const onFail = vi.fn();
    const map = fakeMap();
    startMap(() => map, onFail);
    map.fire('load');
    map.fire('error');
    map.fire('error');
    expect(onFail).toHaveBeenCalledTimes(1);
  });

  it('fails, not synchronously, when the constructor throws (no WebGL), and returns null', async () => {
    const onFail = vi.fn();
    expect(startMap(() => { throw new Error('WebGL not supported'); }, onFail)).toBeNull();
    expect(onFail).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(onFail).toHaveBeenCalledTimes(1);
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
