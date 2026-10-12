import type { App } from '../app.ts';
import type { MapHandle } from './map.ts';

let shared: Promise<MapHandle> | null = null;

/**
 * MapLibre and the wrapper, in their own chunk, loaded once and bound to the app (D-22). The parked and the results
 * view both take the map from here. A failed load reports a map that can't load (G6-AC9), once, and is not retried:
 * nothing would clear that report if a later retry worked. Each caller handles the rejection itself.
 */
export function loadSharedMap(app: App): Promise<MapHandle> {
  shared ??= import('./map.ts').then(
    (mod) => mod.sharedMap({
      moved: (lat, lon) => app.moveSpot(lat, lon),
      failed: () => app.reportMapFailure(),
      recovered: () => app.reportMapRecovered(),
    }),
    (e: unknown) => {
      app.reportMapFailure();
      throw e;
    },
  );
  return shared;
}
