// Data format shared by scripts/build-data.ts (writer) and src/services/data.ts (reader).

export const FORMAT_VERSION = 1;
export const TILE_SIZE_DEG = 0.1;

export type DayOfWeek =
  | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export type PriceComponentType = 'ENERGY' | 'FLAT' | 'TIME' | 'PARKING_TIME';

export interface OcpiPriceComponent {
  type: PriceComponentType;
  price: number;
  vat?: number | null;
  step_size?: number;
}

export interface OcpiRestrictions {
  start_time?: string | null;
  end_time?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  min_kwh?: number | null;
  max_kwh?: number | null;
  min_current?: number | null;
  max_current?: number | null;
  min_power?: number | null;
  max_power?: number | null;
  min_duration?: number | null;
  max_duration?: number | null;
  day_of_week?: DayOfWeek[] | null;
  reservation?: string | null;
}

export interface OcpiTariffElement {
  price_components: OcpiPriceComponent[];
  restrictions?: OcpiRestrictions | null;
}

/** The part of an OCPI tariff the page needs; copied verbatim by the build script (D-8). */
export interface TileTariff {
  currency: string;
  start_date_time: string | null;
  end_date_time: string | null;
  elements: OcpiTariffElement[];
}

export type DataUnknownReason = 'no-tariff' | 'no-power';

export interface TileEntry {
  /** `${party_id}:${tariff id}`; null only for a `no-tariff` entry. */
  tariffKey: string | null;
  /** Highest published power (kW) among the AC connectors using this tariff (D-21). */
  powerKw: number | null;
  unknown?: DataUnknownReason;
}

export interface TileLocation {
  /** `${party_id}:${location id}` — bare location IDs collide across operators. */
  id: string;
  operator: string;
  address: string;
  city: string;
  lat: number;
  lon: number;
  entries: TileEntry[];
}

export interface Tile {
  formatVersion: number;
  key: string;
  locations: TileLocation[];
  tariffs: Record<string, TileTariff>;
}

export interface Manifest {
  formatVersion: number;
  tileSizeDeg: number;
  /** Keys of every tile file that exists, e.g. "514_55". */
  tiles: string[];
  /** ISO 8601 time of the tariff feed's Last-Modified header (G2-AC4). */
  dataTimestamp: string;
}

export function tileIndex(deg: number): number {
  return Math.floor(deg / TILE_SIZE_DEG + 1e-9);
}

export function tileKey(latIndex: number, lonIndex: number): string {
  return `${latIndex}_${lonIndex}`;
}

export function tileKeyFor(lat: number, lon: number): string {
  return tileKey(tileIndex(lat), tileIndex(lon));
}

export function parseTileKey(key: string): { latIndex: number; lonIndex: number } {
  const [lat, lon] = key.split('_').map(Number);
  return { latIndex: lat!, lonIndex: lon! };
}
