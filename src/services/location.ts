import { NL_RINGS } from './nl-border.ts';

export const LOCATE_TIMEOUT_MS = 10_000;
/** Worse than this is "approximate" (PRD S5 edge case, G3-AC2). */
export const APPROXIMATE_ACCURACY_M = 1_000;

export interface Position {
  lat: number;
  lon: number;
  accuracyM: number;
}

export type LocateOutcome = { kind: 'found'; position: Position } | { kind: 'denied' };

export interface LatLon {
  lat: number;
  lon: number;
}

/** G3-AC1: with no location, the map opens here. */
export const NL_CENTRE = { lat: 52.13, lon: 5.29, zoom: 7 } as const;

/** G3-AC3: where "Find chargers" searches — the map centre once the driver moved it, else the browser position. */
export type Spot =
  | { kind: 'none' }
  | { kind: 'browser'; lat: number; lon: number; accuracyM: number; approximate: boolean }
  | { kind: 'moved'; lat: number; lon: number };

export function spotOf(browser: Position | null, moved: LatLon | null): Spot {
  if (moved) return { kind: 'moved', lat: moved.lat, lon: moved.lon };
  if (browser) {
    return { kind: 'browser', lat: browser.lat, lon: browser.lon, accuracyM: browser.accuracyM, approximate: isApproximate(browser) };
  }
  return { kind: 'none' };
}

/** Browser location (G3-AC1). Denied, unavailable, timed out and unsupported all become `denied`. */
export function locate(geo: Geolocation | undefined, timeoutMs = LOCATE_TIMEOUT_MS): Promise<LocateOutcome> {
  return new Promise((resolve) => {
    if (!geo) {
      resolve({ kind: 'denied' });
      return;
    }
    geo.getCurrentPosition(
      (p) => resolve({ kind: 'found', position: { lat: p.coords.latitude, lon: p.coords.longitude, accuracyM: p.coords.accuracy } }),
      () => resolve({ kind: 'denied' }),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

export function isApproximate(p: Position): boolean {
  return p.accuracyM > APPROXIMATE_ACCURACY_M;
}

/** Even-odd point-in-polygon over every ring of the bundled border (D-15). */
export function isInNetherlands(lat: number, lon: number): boolean {
  let inside = false;
  for (const ring of NL_RINGS) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]!;
      const [xj, yj] = ring[j]!;
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}
