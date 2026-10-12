// Stub dependencies for the controller: in-memory storage, scripted geolocation, a two-location tile set.
import { vi } from 'vitest';
import type { AppDeps } from '../../src/app.ts';
import { createSettingsStore, type RawSettings } from '../../src/services/settings.ts';
import { DataLoadError, type NearestResult } from '../../src/services/data.ts';
import type { LocateOutcome } from '../../src/services/location.ts';
import { FORMAT_VERSION, type Manifest } from '../../src/shared/data-format.ts';
import { FRIDAY_1000, TARIFFS, location } from './prd-tariffs.ts';
import { memoryStorage } from './memory-storage.ts';

export { memoryStorage };

export const EXAMPLE_RAW: RawSettings = {
  batteryKwh: '15', chargeKw: '3.6', kwhPerKm: '0.25', kmPerL: '12', petrolPrice: '2,399', cardStartFee: '0.89', cardMarkup: '0',
};

export const NUENEN = { lat: 51.4436, lon: 5.5519, accuracyM: 20 };
export const BRUSSELS = { lat: 50.8467, lon: 4.3525, accuracyM: 20 };
export const KLOKGEBOUW = { lat: 51.4484, lon: 5.4573, accuracyM: 20 };

export const MANIFEST: Manifest = { formatVersion: FORMAT_VERSION, tileSizeDeg: 0.1, tiles: ['514_55'], dataTimestamp: '2026-10-09T06:12:00.000Z' };

export const NEAREST: NearestResult = {
  nearby: [
    { location: location('ALL:kerk6', [{ tariffKey: 'ALL:t', powerKw: 11 }], { operator: 'Allego', address: 'Kerkstraat 6' }), distanceM: 266 },
    { location: location('VAT:park21', [{ tariffKey: 'VAT:t', powerKw: 11 }], { operator: 'Vattenfall', address: 'Parkstraat 21' }), distanceM: 74 },
  ],
  tariffs: { 'VAT:t': TARIFFS.vattenfall, 'ALL:t': TARIFFS.allego },
};

/** Each call to `locate` resolves with the next scripted outcome (the last one repeats). */
export function stubDeps(opts: {
  storage?: () => Storage;
  locations?: LocateOutcome[];
  failFind?: number;
  /** Nearby chargers to return instead of the two-location Nuenen set. */
  nearest?: NearestResult;
} = {}) {
  const outcomes = [...(opts.locations ?? [{ kind: 'found', position: NUENEN }])];
  let finds = 0;
  const deps = {
    store: createSettingsStore(opts.storage ?? (() => memoryStorage())),
    locate: vi.fn(async (): Promise<LocateOutcome> => (outcomes.length > 1 ? outcomes.shift()! : outcomes[0]!)),
    loadManifest: vi.fn(async () => MANIFEST),
    findNearest: vi.fn(async (): Promise<NearestResult> => {
      finds++;
      if (opts.failFind && finds <= opts.failFind) throw new DataLoadError('offline');
      return opts.nearest ?? NEAREST;
    }),
    now: () => FRIDAY_1000,
  } satisfies AppDeps;
  return deps;
}
