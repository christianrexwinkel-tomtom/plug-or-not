import {
  FORMAT_VERSION, TILE_SIZE_DEG, parseTileKey, tileIndex, tileKey,
  type Manifest, type Tile, type TileTariff,
} from '../shared/data-format.ts';
import type { NearbyLocation } from '../engine/results.ts';

export const NEAREST_COUNT = 10;
const EARTH_RADIUS_M = 6_371_008.8;
const RAD = Math.PI / 180;

/** Any failed fetch, missing tile or unknown format: the whole request fails (G4-AC3). */
export class DataLoadError extends Error {}

export type FetchJson = (path: string) => Promise<unknown>;

export function createFetchJson(baseUrl: string, fetchFn: typeof fetch = fetch): FetchJson {
  return async (path) => {
    let res: Response;
    try {
      res = await fetchFn(`${baseUrl}${path}`);
    } catch (e) {
      throw new DataLoadError(`fetch ${path}: ${String(e)}`);
    }
    if (!res.ok) throw new DataLoadError(`fetch ${path}: HTTP ${res.status}`);
    try {
      return await res.json();
    } catch (e) {
      throw new DataLoadError(`parse ${path}: ${String(e)}`);
    }
  };
}

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * RAD;
  const dLon = (lon2 - lon1) * RAD;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

export async function loadManifest(fetchJson: FetchJson): Promise<Manifest> {
  const m = (await fetchJson('data/manifest.json')) as Manifest;
  if (!m || m.formatVersion !== FORMAT_VERSION || !Array.isArray(m.tiles)) {
    throw new DataLoadError('unknown manifest format');
  }
  return m;
}

export interface NearestResult {
  nearby: NearbyLocation[];
  tariffs: Record<string, TileTariff>;
}

/** Shortest distance from the spot to the edge of the loaded block of tiles (a lower bound for anything outside it). */
function distanceToBlockEdgeM(lat: number, lon: number, latIdx: number, lonIdx: number, r: number): number {
  const south = (latIdx - r) * TILE_SIZE_DEG;
  const north = (latIdx + r + 1) * TILE_SIZE_DEG;
  const west = (lonIdx - r) * TILE_SIZE_DEG;
  const east = (lonIdx + r + 1) * TILE_SIZE_DEG;
  const toParallel = (edge: number) => Math.abs(lat - edge) * RAD * EARTH_RADIUS_M;
  const toMeridian = (edge: number) =>
    EARTH_RADIUS_M * Math.asin(Math.min(1, Math.cos(lat * RAD) * Math.sin(Math.abs(lon - edge) * RAD)));
  return Math.min(toParallel(south), toParallel(north), toMeridian(west), toMeridian(east));
}

/** Ring search over the tiles (G4-AC1): the true `count` nearest by straight-line distance, however far. */
export async function findNearest(
  lat: number,
  lon: number,
  manifest: Manifest,
  fetchJson: FetchJson,
  count = NEAREST_COUNT,
): Promise<NearestResult> {
  const existing = new Set(manifest.tiles);
  const keys = manifest.tiles.map(parseTileKey);
  const minLat = Math.min(...keys.map((k) => k.latIndex));
  const maxLat = Math.max(...keys.map((k) => k.latIndex));
  const minLon = Math.min(...keys.map((k) => k.lonIndex));
  const maxLon = Math.max(...keys.map((k) => k.lonIndex));
  const la = tileIndex(lat);
  const lo = tileIndex(lon);
  const found: NearbyLocation[] = [];
  const tariffs: Record<string, TileTariff> = {};

  for (let r = 0; ; r++) {
    const ring: string[] = [];
    for (let i = la - r; i <= la + r; i++) {
      for (let j = lo - r; j <= lo + r; j++) {
        if (Math.max(Math.abs(i - la), Math.abs(j - lo)) !== r) continue;
        const key = tileKey(i, j);
        if (existing.has(key)) ring.push(key);
      }
    }
    const tiles = await Promise.all(ring.map((key) => fetchJson(`data/tiles/${key}.json`) as Promise<Tile>));
    for (const tile of tiles) {
      if (!tile || tile.formatVersion !== FORMAT_VERSION) throw new DataLoadError('unknown tile format');
      Object.assign(tariffs, tile.tariffs);
      for (const location of tile.locations) {
        found.push({ location, distanceM: haversineM(lat, lon, location.lat, location.lon) });
      }
    }
    found.sort((a, b) => a.distanceM - b.distanceM || (a.location.id < b.location.id ? -1 : 1));
    const coversAll = la - r <= minLat && la + r >= maxLat && lo - r <= minLon && lo + r >= maxLon;
    const nth = found[count - 1];
    if (coversAll || (nth && nth.distanceM < distanceToBlockEdgeM(lat, lon, la, lo, r))) {
      return { nearby: found.slice(0, count), tariffs };
    }
  }
}
