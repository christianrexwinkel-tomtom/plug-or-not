import { describe, expect, it } from 'vitest';
import { computeEntries, entryId, rankAtStay } from './results.ts';
import { EXAMPLE_SETTINGS, FRIDAY_1000, TARIFFS, location } from '../../test/fixtures/prd-tariffs.ts';

describe('computeEntries', () => {
  it('builds one curve and window per priced entry', () => {
    const [e] = computeEntries([{ location: location('L:1', [{ tariffKey: 'T:v', powerKw: 11 }]), distanceM: 10 }], { 'T:v': TARIFFS.vattenfall }, EXAMPLE_SETTINGS, 20, FRIDAY_1000);
    expect(e).toMatchObject({ id: 'L:1#T:v', distanceM: 10, tariffKey: 'T:v', reason: null, window: { shortest: 40, longest: 1440 } });
    expect(e!.curve!.kwh[45]).toBeCloseTo(2.7, 9);
  });

  it('keeps the data reasons and marks anything it cannot price as unreadable', () => {
    const entries = computeEntries([{
      location: location('L:1', [
        { tariffKey: null, powerKw: null, unknown: 'no-tariff' },
        { tariffKey: 'T:v', powerKw: null, unknown: 'no-power' },
        { tariffKey: 'T:missing', powerKw: 11 },
        { tariffKey: 'T:gbp', powerKw: 11 },
      ]),
      distanceM: 10,
    }], { 'T:v': TARIFFS.vattenfall, 'T:gbp': { ...TARIFFS.vattenfall, currency: 'GBP' } }, EXAMPLE_SETTINGS, 20, FRIDAY_1000);
    expect(entries.map((e) => [e.id, e.reason, e.curve])).toEqual([
      ['L:1#no-tariff', 'no-tariff', null],
      ['L:1#T:v', 'no-power', null],
      ['L:1#T:missing', 'unreadable', null],
      ['L:1#T:gbp', 'unreadable', null],
    ]);
  });
});

describe('rankAtStay', () => {
  it('reads each curve at the stay, ranks, and numbers from 1', () => {
    const computed = computeEntries([
      { location: location('A:1', [{ tariffKey: 'T:lab', powerKw: 11 }]), distanceM: 5 },
      { location: location('B:1', [{ tariffKey: 'T:v', powerKw: 11 }]), distanceM: 50 },
      { location: location('C:1', [{ tariffKey: null, powerKw: null, unknown: 'no-tariff' }]), distanceM: 1 },
    ], { 'T:v': TARIFFS.vattenfall, 'T:lab': TARIFFS.efluxLab }, EXAMPLE_SETTINGS, 20, FRIDAY_1000);
    const ranked = rankAtStay(computed, 90, EXAMPLE_SETTINGS);
    expect(ranked.map((r) => [r.rank, r.id, r.outcome.kind])).toEqual([
      [1, 'B:1#T:v', 'priced'],
      [2, 'A:1#T:lab', 'priced'],
      [3, 'C:1#no-tariff', 'unknown'],
    ]);
  });

  it('entryId combines the location and the tariff key', () => {
    expect(entryId(location('L:9', []), { tariffKey: null, powerKw: null, unknown: 'no-tariff' })).toBe('L:9#no-tariff');
  });
});
