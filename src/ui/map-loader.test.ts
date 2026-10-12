import { afterEach, describe, expect, it, vi } from 'vitest';
import type { App } from '../app.ts';

/** Just the App methods the loader binds. */
function fakeApp() {
  return { moveSpot: vi.fn(), reportMapFailure: vi.fn(), reportMapRecovered: vi.fn() };
}

/** A fresh loader module (its shared promise is module state), with ./map.ts mocked by `factory`. */
async function freshLoader(factory: () => object) {
  vi.resetModules();
  vi.doMock('./map.ts', factory);
  return import('./map-loader.ts');
}

describe('loadSharedMap (D-22, G6-AC9)', () => {
  afterEach(() => {
    vi.doUnmock('./map.ts');
  });

  it('two calls give the same handle from one import, bound to the app', async () => {
    const handle = { name: 'map' };
    const sharedMap = vi.fn(() => handle);
    const factory = vi.fn(() => ({ sharedMap }));
    const { loadSharedMap } = await freshLoader(factory);
    const app = fakeApp();
    const a = loadSharedMap(app as unknown as App);
    const b = loadSharedMap(app as unknown as App);
    expect(await a).toBe(handle);
    expect(await b).toBe(handle);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(sharedMap).toHaveBeenCalledTimes(1);
    const events = (sharedMap.mock.calls[0] as unknown as [{ moved(lat: number, lon: number): void; failed(): void; recovered(): void }])[0];
    events.moved(51.4, 5.4);
    events.failed();
    events.recovered();
    expect(app.moveSpot).toHaveBeenCalledWith(51.4, 5.4);
    expect(app.reportMapFailure).toHaveBeenCalledTimes(1);
    expect(app.reportMapRecovered).toHaveBeenCalledTimes(1);
  });

  it('a failed import reports a map failure once and is not retried', async () => {
    const factory = vi.fn(() => {
      throw new Error('chunk failed to load');
    });
    const { loadSharedMap } = await freshLoader(factory);
    const app = fakeApp();
    await expect(loadSharedMap(app as unknown as App)).rejects.toThrow();
    await expect(loadSharedMap(app as unknown as App)).rejects.toThrow();
    expect(app.reportMapFailure).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
