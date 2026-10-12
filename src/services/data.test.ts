import { describe, expect, it, vi } from 'vitest';
import { DataLoadError, createFetchJson, findNearest, haversineM, loadManifest, type FetchJson } from './data.ts';
import { FORMAT_VERSION, TILE_SIZE_DEG, tileKeyFor, type Manifest, type Tile, type TileLocation } from '../shared/data-format.ts';

/** Deterministic pseudo-random numbers (LCG). */
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
}

/** A fixture tile set: dense around Eindhoven, a handful of sparse locations far away. */
function fixture() {
  const rand = rng(42);
  const locs: TileLocation[] = [];
  for (let i = 0; i < 400; i++) locs.push(loc(`D:${i}`, 51.3 + rand() * 0.3, 5.3 + rand() * 0.4));
  for (let i = 0; i < 6; i++) locs.push(loc(`S:${i}`, 52.8 + rand() * 0.6, 6.0 + rand() * 1.0));
  const tiles = new Map<string, Tile>();
  for (const l of locs) {
    const key = tileKeyFor(l.lat, l.lon);
    const t = tiles.get(key) ?? { formatVersion: FORMAT_VERSION, key, locations: [], tariffs: {} };
    t.locations.push(l);
    t.tariffs[`T:${key}`] = { currency: 'EUR', start_date_time: null, end_date_time: null, elements: [] };
    tiles.set(key, t);
  }
  const manifest: Manifest = { formatVersion: FORMAT_VERSION, tileSizeDeg: TILE_SIZE_DEG, tiles: [...tiles.keys()], dataTimestamp: '2026-10-09T06:12:00Z' };
  const fetchJson = vi.fn<FetchJson>(async (path) => {
    if (path === 'data/manifest.json') return manifest;
    const key = path.replace('data/tiles/', '').replace('.json', '');
    const t = tiles.get(key);
    if (!t) throw new DataLoadError(`404 ${path}`);
    return t;
  });
  return { locs, manifest, fetchJson };
}

function loc(id: string, lat: number, lon: number): TileLocation {
  return { id, operator: 'Op', address: id, city: 'X', lat, lon, entries: [{ tariffKey: null, powerKw: null, unknown: 'no-tariff' }] };
}

function bruteForce(locs: TileLocation[], lat: number, lon: number, n = 10) {
  return [...locs]
    .map((l) => ({ id: l.id, d: haversineM(lat, lon, l.lat, l.lon) }))
    .sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : 1))
    .slice(0, n)
    .map((x) => x.id);
}

describe('haversineM', () => {
  it('measures Parkstraat Nuenen to Klokgebouw Eindhoven at about 6.6 km', () => {
    expect(haversineM(51.4436, 5.5519, 51.4484, 5.4573)).toBeGreaterThan(6_500);
    expect(haversineM(51.4436, 5.5519, 51.4484, 5.4573)).toBeLessThan(6_700);
  });
});

describe('findNearest (G4-AC1)', () => {
  it.each([
    ['dense spot', 51.45, 5.5],
    ['spot on a tile corner', 51.4, 5.4],
    ['sparse spot far from everything', 53.3, 7.1],
  ])('matches a brute-force nearest-10 at a %s', async (_n, lat, lon) => {
    const { locs, manifest, fetchJson } = fixture();
    const res = await findNearest(lat, lon, manifest, fetchJson);
    expect(res.nearby.map((x) => x.location.id)).toEqual(bruteForce(locs, lat, lon));
    expect(res.nearby[0]!.distanceM).toBeCloseTo(haversineM(lat, lon, res.nearby[0]!.location.lat, res.nearby[0]!.location.lon), 6);
  });

  it('only fetches tiles listed in the manifest, and stops early in a dense area', async () => {
    const { manifest, fetchJson } = fixture();
    await findNearest(51.45, 5.5, manifest, fetchJson);
    const fetched = fetchJson.mock.calls.map(([p]) => p.replace('data/tiles/', '').replace('.json', ''));
    for (const k of fetched) expect(manifest.tiles).toContain(k);
    expect(fetched.length).toBeLessThan(manifest.tiles.length);
  });

  it('returns every location when the manifest holds fewer than 10', async () => {
    const { manifest, fetchJson, locs } = fixture();
    const small = { ...manifest, tiles: manifest.tiles.filter((k) => k.startsWith('52') || k.startsWith('53')) };
    const res = await findNearest(53.0, 6.5, small, fetchJson);
    expect(res.nearby).toHaveLength(locs.filter((l) => l.id.startsWith('S:')).length);
  });

  it('counts a location with several tariffs once towards the 10 (G4-AC2)', async () => {
    const { locs, manifest, fetchJson } = fixture();
    // Give the nearest locations three entries each, as for a location with several tariffs.
    for (const id of bruteForce(locs, 51.45, 5.5, 20)) {
      const l = locs.find((x) => x.id === id)!;
      l.entries = ['A', 'B', 'C'].map((t) => ({ tariffKey: `${t}:${id}`, powerKw: 11 }));
    }
    const res = await findNearest(51.45, 5.5, manifest, fetchJson);
    expect(res.nearby).toHaveLength(10);
    expect(new Set(res.nearby.map((x) => x.location.id)).size).toBe(10);
    expect(res.nearby.map((x) => x.location.id)).toEqual(bruteForce(locs, 51.45, 5.5));
    expect(res.nearby.reduce((n, x) => n + x.location.entries.length, 0)).toBe(30);
  });

  it('merges the tariffs of every loaded tile', async () => {
    const { manifest, fetchJson } = fixture();
    const res = await findNearest(51.45, 5.5, manifest, fetchJson);
    expect(Object.keys(res.tariffs).length).toBeGreaterThan(1);
  });
});

describe('load failures (G4-AC3)', () => {
  it('fails the whole request when the third tile fails', async () => {
    const { manifest, fetchJson } = fixture();
    let n = 0;
    const flaky: FetchJson = async (p) => {
      if (p.startsWith('data/tiles/') && ++n === 3) throw new DataLoadError('boom');
      return fetchJson(p);
    };
    await expect(findNearest(51.45, 5.5, manifest, flaky)).rejects.toBeInstanceOf(DataLoadError);
  });

  it('rejects a manifest with an unknown format version', async () => {
    await expect(loadManifest(async () => ({ formatVersion: 99, tiles: [] }))).rejects.toBeInstanceOf(DataLoadError);
  });

  it('turns network errors and HTTP errors into DataLoadError', async () => {
    const offline = createFetchJson('/base/', (async () => { throw new TypeError('offline'); }) as typeof fetch);
    await expect(offline('data/manifest.json')).rejects.toBeInstanceOf(DataLoadError);
    const missing = createFetchJson('/base/', (async () => new Response('', { status: 404 })) as typeof fetch);
    await expect(missing('data/tiles/1_1.json')).rejects.toBeInstanceOf(DataLoadError);
    const ok = createFetchJson('/base/', (async (url: string) => Response.json({ url })) as typeof fetch);
    await expect(ok('data/manifest.json')).resolves.toEqual({ url: '/base/data/manifest.json' });
  });
});
