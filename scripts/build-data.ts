// Builds public/data/ (manifest + 0.1° tiles) from the NDW OCPI feeds. Run by hand: npm run build-data.
// Raw feed data stays in memory (D-2); nothing is written until both feeds are downloaded and parsed.
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import {
  FORMAT_VERSION, TILE_SIZE_DEG, tileKeyFor,
  type Manifest, type OcpiTariffElement, type Tile, type TileEntry, type TileLocation, type TileTariff,
} from '../src/shared/data-format.ts';

export const LOCATIONS_URL = 'https://opendata.ndw.nu/charging_point_locations_ocpi.json.gz';
export const TARIFFS_URL = 'https://opendata.ndw.nu/charging_point_tariffs_ocpi.json.gz';

/** The subset of an NDW OCPI location this script reads. */
export interface FeedConnector {
  power_type: 'AC_1_PHASE' | 'AC_3_PHASE' | 'DC';
  max_voltage?: number | null;
  max_amperage?: number | null;
  max_electric_power?: number | null;
  tariff_ids?: string[] | null;
}
export interface FeedLocation {
  id: string;
  party_id: string;
  publish?: boolean | null;
  address?: string | null;
  city?: string | null;
  coordinates: { latitude: string; longitude: string };
  operator?: { name?: string | null } | null;
  suboperator?: { name?: string | null } | null;
  owner?: { name?: string | null } | null;
  evses?: Array<{ connectors?: FeedConnector[] | null }> | null;
}
export interface FeedTariff {
  id: string;
  party_id: string;
  currency: string;
  start_date_time?: string | null;
  end_date_time?: string | null;
  elements?: OcpiTariffElement[] | null;
}

/** kW from max_electric_power (W), else voltage × amperage (× 3 for AC_3_PHASE); null when not published. */
export function connectorPowerKw(c: FeedConnector): number | null {
  if (c.max_electric_power && c.max_electric_power > 0) return c.max_electric_power / 1000;
  if (c.max_voltage && c.max_amperage && c.max_voltage > 0 && c.max_amperage > 0) {
    return (c.max_voltage * c.max_amperage * (c.power_type === 'AC_3_PHASE' ? 3 : 1)) / 1000;
  }
  return null;
}

export const tariffKey = (partyId: string, id: string) => `${partyId}:${id}`;

/** The entry rules from the solution design's Architecture section, for one location. */
export function locationEntries(loc: FeedLocation, tariffs: Map<string, TileTariff>): TileEntry[] {
  const ac = (loc.evses ?? []).flatMap((e) => e.connectors ?? []).filter((c) => c.power_type !== 'DC');
  const powerByTariff = new Map<string, number | null>();
  let missing = false;
  for (const c of ac) {
    const ids = c.tariff_ids ?? [];
    if (ids.length === 0) missing = true;
    for (const id of ids) {
      const key = tariffKey(loc.party_id, id);
      if (!tariffs.has(key)) {
        missing = true;
        continue;
      }
      const power = connectorPowerKw(c);
      const best = powerByTariff.get(key) ?? null;
      powerByTariff.set(key, power === null ? best : Math.max(best ?? 0, power));
    }
  }
  const entries: TileEntry[] = [...powerByTariff.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, powerKw]) => (powerKw === null ? { tariffKey: key, powerKw: null, unknown: 'no-power' } : { tariffKey: key, powerKw }));
  if (missing) entries.push({ tariffKey: null, powerKw: null, unknown: 'no-tariff' });
  return entries;
}

export function transformFeeds(
  locations: FeedLocation[],
  feedTariffs: FeedTariff[],
  dataTimestamp: string,
): { manifest: Manifest; tiles: Tile[] } {
  const tariffs = new Map<string, TileTariff>();
  for (const t of feedTariffs) {
    tariffs.set(tariffKey(t.party_id, t.id), {
      currency: t.currency,
      start_date_time: t.start_date_time ?? null,
      end_date_time: t.end_date_time ?? null,
      elements: t.elements ?? [],
    });
  }
  const tiles = new Map<string, Tile>();
  for (const loc of locations) {
    if (loc.publish === false) continue;
    const hasAc = (loc.evses ?? []).some((e) => (e.connectors ?? []).some((c) => c.power_type !== 'DC'));
    if (!hasAc) continue;
    const lat = Number(loc.coordinates.latitude);
    const lon = Number(loc.coordinates.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const key = tileKeyFor(lat, lon);
    const tile = tiles.get(key) ?? { formatVersion: FORMAT_VERSION, key, locations: [], tariffs: {} };
    const entries = locationEntries(loc, tariffs);
    const out: TileLocation = {
      id: `${loc.party_id}:${loc.id}`,
      operator: loc.operator?.name ?? loc.suboperator?.name ?? loc.owner?.name ?? loc.party_id,
      address: loc.address ?? '',
      city: loc.city ?? '',
      lat,
      lon,
      entries,
    };
    tile.locations.push(out);
    for (const e of entries) if (e.tariffKey) tile.tariffs[e.tariffKey] = tariffs.get(e.tariffKey)!;
    tiles.set(key, tile);
  }
  const sorted = [...tiles.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
  return {
    manifest: { formatVersion: FORMAT_VERSION, tileSizeDeg: TILE_SIZE_DEG, tiles: sorted.map((t) => t.key), dataTimestamp },
    tiles: sorted,
  };
}

async function download(url: string): Promise<{ json: unknown; lastModified: string | null }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return { json: JSON.parse(gunzipSync(buf).toString('utf8')), lastModified: res.headers.get('last-modified') };
}

/** Writes next to public/data and swaps it in, so a failed write never leaves a half-replaced snapshot. */
export async function writeSnapshot(outDir: string, result: { manifest: Manifest; tiles: Tile[] }): Promise<void> {
  const next = `${outDir}.next`;
  await rm(next, { recursive: true, force: true });
  await mkdir(`${next}/tiles`, { recursive: true });
  for (const tile of result.tiles) await writeFile(`${next}/tiles/${tile.key}.json`, JSON.stringify(tile));
  await writeFile(`${next}/manifest.json`, `${JSON.stringify(result.manifest, null, 1)}\n`);
  await rm(outDir, { recursive: true, force: true });
  await rename(next, outDir);
}

async function main(): Promise<void> {
  const [locations, tariffs] = await Promise.all([download(LOCATIONS_URL), download(TARIFFS_URL)]);
  if (!tariffs.lastModified) throw new Error('tariff feed sent no Last-Modified header');
  const result = transformFeeds(
    locations.json as FeedLocation[],
    tariffs.json as FeedTariff[],
    new Date(tariffs.lastModified).toISOString(),
  );
  await writeSnapshot('public/data', result);
  const locs = result.tiles.reduce((n, t) => n + t.locations.length, 0);
  console.log(`Wrote ${result.tiles.length} tiles, ${locs} locations, data of ${result.manifest.dataTimestamp}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
