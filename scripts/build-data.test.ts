import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DATA_BOUNDS, connectorPowerKw, dataTimestampFrom, transformFeeds, writeSnapshot, type FeedLocation, type FeedTariff } from './build-data.ts';
import { FORMAT_VERSION, type TileLocation } from '../src/shared/data-format.ts';

const feed = <T>(name: string): T => JSON.parse(readFileSync(new URL(`../test/fixtures/feeds/${name}`, import.meta.url), 'utf8')) as T;
const LOCATIONS = feed<FeedLocation[]>('locations.json');
const TARIFFS = feed<FeedTariff[]>('tariffs.json');
const STAMP = '2026-10-09T06:12:00.000Z';

function byId(): Map<string, TileLocation & { tile: string }> {
  const { tiles } = transformFeeds(LOCATIONS, TARIFFS, STAMP);
  return new Map(tiles.flatMap((t) => t.locations.map((l) => [l.id, { ...l, tile: t.key }] as const)));
}

describe('connectorPowerKw', () => {
  it('uses max_electric_power, else V × A (× 3 for three-phase), else null', () => {
    expect(connectorPowerKw({ power_type: 'AC_3_PHASE', max_electric_power: 11000 })).toBe(11);
    expect(connectorPowerKw({ power_type: 'AC_3_PHASE', max_voltage: 230, max_amperage: 16 })).toBeCloseTo(11.04, 9);
    expect(connectorPowerKw({ power_type: 'AC_1_PHASE', max_voltage: 230, max_amperage: 16 })).toBeCloseTo(3.68, 9);
    expect(connectorPowerKw({ power_type: 'AC_1_PHASE', max_electric_power: 0 })).toBeNull();
  });
});

describe('transformFeeds — which locations are kept (G2-AC2)', () => {
  it('keeps published locations with an AC connector and drops DC-only and unpublished ones', () => {
    const ids = [...byId().keys()].sort();
    expect(ids).toEqual(['AAA:AC_ONLY', 'AAA:HALF_PRICED', 'AAA:MIXED', 'AAA:NO_POWER', 'AAA:NULL_TARIFFS', 'AAA:ONE_UNRESOLVED', 'AAA:SHARED', 'BBB:COLLIDE']);
  });
});

describe('transformFeeds — bogus coordinates', () => {
  const at = (id: string, latitude: string, longitude: string): FeedLocation => ({
    ...LOCATIONS.find((l) => l.id === 'AC_ONLY')!, id, coordinates: { latitude, longitude },
  });

  it('keeps the box generous around the Netherlands and its neighbours', () => {
    expect(DATA_BOUNDS).toEqual({ minLat: 50.0, maxLat: 54.0, minLon: 2.5, maxLon: 7.5 });
  });

  it('drops locations outside DATA_BOUNDS and keeps those inside, edges included', () => {
    const feedLocs = [
      at('ZERO', '0', '0'),
      at('SWAPPED', '5.5519', '51.4436'),
      at('TOO_BIG', '90', '135'),
      at('HANOI', '21.03', '105.85'),
      at('DELHI', '28.61', '77.21'),
      at('NYC', '40.71', '-74.0'),
      at('NUENEN', '51.4436', '5.5519'),
      at('SW_EDGE', '50.0', '2.5'),
      at('NE_EDGE', '54.0', '7.5'),
    ];
    const { tiles } = transformFeeds(feedLocs, TARIFFS, STAMP);
    const ids = tiles.flatMap((t) => t.locations.map((l) => l.id)).sort();
    expect(ids).toEqual(['AAA:NE_EDGE', 'AAA:NUENEN', 'AAA:SW_EDGE']);
  });
});

describe('dataTimestampFrom (G2-AC4)', () => {
  it("turns the tariff feed's Last-Modified header into an ISO timestamp", () => {
    expect(dataTimestampFrom('Fri, 09 Oct 2026 06:12:00 GMT')).toBe('2026-10-09T06:12:00.000Z');
  });

  it('fails without a usable header', () => {
    expect(() => dataTimestampFrom(null)).toThrow(/Last-Modified/);
    expect(() => dataTimestampFrom('not a date')).toThrow(/Last-Modified/);
  });
});

describe('transformFeeds — entry rules (G2-AC2, G2-AC3)', () => {
  const locs = byId();
  const entries = (id: string) => locs.get(id)!.entries;

  it('one entry per resolved tariff with the connector power', () => {
    expect(entries('AAA:AC_ONLY')).toEqual([{ tariffKey: 'AAA:T1', powerKw: 11 }]);
  });

  it('ignores DC connectors at a mixed location', () => {
    expect(entries('AAA:MIXED')).toEqual([{ tariffKey: 'AAA:T1', powerKw: 11.04 }]);
  });

  it('adds one no-tariff entry next to a priced connector', () => {
    expect(entries('AAA:HALF_PRICED')).toEqual([{ tariffKey: 'AAA:T1', powerKw: 7.4 }, { tariffKey: null, powerKw: null, unknown: 'no-tariff' }]);
    expect(entries('AAA:NULL_TARIFFS')).toEqual([{ tariffKey: null, powerKw: null, unknown: 'no-tariff' }]);
  });

  it('a connector with one resolvable and one unresolvable ID gives one priced entry plus one no-tariff entry', () => {
    expect(entries('AAA:ONE_UNRESOLVED')).toEqual([{ tariffKey: 'AAA:T1', powerKw: 11 }, { tariffKey: null, powerKw: null, unknown: 'no-tariff' }]);
  });

  it('marks a tariff whose connectors publish no power as no-power', () => {
    expect(entries('AAA:NO_POWER')).toEqual([{ tariffKey: 'AAA:T2', powerKw: null, unknown: 'no-power' }]);
  });

  it('prices a shared tariff at the highest published power (D-21), ignoring connectors without power', () => {
    expect(entries('AAA:SHARED')).toEqual([{ tariffKey: 'AAA:T1', powerKw: 11 }, { tariffKey: 'AAA:T2', powerKw: 7.4 }]);
  });

  it('joins on party_id + id, so a colliding bare ID gets its own operator\'s tariff', () => {
    expect(entries('BBB:COLLIDE')).toEqual([{ tariffKey: 'BBB:T1', powerKw: 11 }]);
    const { tiles } = transformFeeds(LOCATIONS, TARIFFS, STAMP);
    const tile = tiles.find((t) => t.locations.some((l) => l.id === 'BBB:COLLIDE'))!;
    expect(tile.tariffs['BBB:T1']!.elements[0]!.price_components[0]!.price).toBe(0.55);
    expect(tile.tariffs['AAA:T1']!.elements[0]!.price_components[0]!.price).toBe(0.3);
  });

  it('falls back to the party ID when the feed names no operator', () => {
    expect(locs.get('BBB:COLLIDE')!.operator).toBe('BBB');
    expect(locs.get('AAA:AC_ONLY')!.operator).toBe('Vattenfall');
  });
});

describe('transformFeeds — tiles and manifest (G2-AC1, G2-AC4)', () => {
  it('buckets by floor of 0.1° and copies only referenced tariffs into each tile', () => {
    const { manifest, tiles } = transformFeeds(LOCATIONS, TARIFFS, STAMP);
    expect(manifest).toEqual({ formatVersion: FORMAT_VERSION, tileSizeDeg: 0.1, tiles: ['514_55', '523_49'], dataTimestamp: STAMP });
    expect(Object.keys(tiles[0]!.tariffs).sort()).toEqual(['AAA:T1', 'AAA:T2', 'BBB:T1']);
    expect(Object.keys(tiles[1]!.tariffs).sort()).toEqual(['AAA:T1', 'AAA:T2']);
    expect(JSON.stringify(tiles)).not.toContain('UNUSED');
  });

  it('copies elements, currency and validity dates verbatim', () => {
    const { tiles } = transformFeeds(LOCATIONS, TARIFFS, STAMP);
    expect(tiles[0]!.tariffs['AAA:T2']).toEqual({
      currency: 'EUR', start_date_time: null, end_date_time: null,
      elements: [{ price_components: [{ type: 'TIME', price: 1, vat: null, step_size: 60 }], restrictions: null }],
    });
  });
});

describe('writeSnapshot', () => {
  it('replaces the output directory with the manifest and one file per tile', async () => {
    const dir = join(await mkdtemp(join(tmpdir(), 'pon-')), 'data');
    await writeSnapshot(dir, transformFeeds(LOCATIONS, TARIFFS, STAMP));
    await writeSnapshot(dir, transformFeeds(LOCATIONS.slice(0, 1), TARIFFS, STAMP));
    expect((await readdir(join(dir, 'tiles'))).sort()).toEqual(['514_55.json']);
    expect(JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8')).tiles).toEqual(['514_55']);
  });
});
