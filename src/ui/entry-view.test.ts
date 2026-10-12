import { describe, expect, it } from 'vitest';
import { entryViews } from './entry-view.ts';
import { computeEntries, rankAtStay } from '../engine/results.ts';
import { EXAMPLE_SETTINGS, FRIDAY_1000, TARIFFS, location, tariff } from '../../test/fixtures/prd-tariffs.ts';

function viewsFor(entries: Parameters<typeof location>[1], tariffs: Record<string, ReturnType<typeof tariff>>) {
  const computed = computeEntries([{ location: location('L:1', entries, { operator: 'Vattenfall', address: 'Parkstraat 21' }), distanceM: 74 }], tariffs, EXAMPLE_SETTINGS, 20, FRIDAY_1000);
  return entryViews(rankAtStay(computed, 45, EXAMPLE_SETTINGS));
}

describe('entryViews', () => {
  it('Nuenen fixture: what the details panel shows for a priced entry', () => {
    expect(viewsFor([{ tariffKey: 'V:t', powerKw: 11 }], { 'V:t': TARIFFS.vattenfall })[0]).toEqual({
      id: 'L:1#V:t',
      verdict: 'worth-it',
      verdictText: 'Worth it',
      rankText: '#1 of 1 · best saving first',
      distanceText: '74 m',
      operator: 'Vattenfall',
      address: 'Parkstraat 21, Nuenen',
      savingText: 'Saves €0.39 compared with €2.16 of petrol',
      priceText: '€0.33/kWh · total €1.77',
      reasonText: null,
      alsoHere: [],
      chipText: '€0.39',
      stripText: '1. Parkstraat 21',
    });
  });

  it.each([
    ['no-tariff', { tariffKey: null, powerKw: null, unknown: 'no-tariff' as const }, {}, 'No price published for this charger.'],
    ['no-power', { tariffKey: 'V:t', powerKw: null, unknown: 'no-power' as const }, { 'V:t': TARIFFS.vattenfall }, "Charging power isn't published for this charger."],
    ['unreadable', { tariffKey: 'V:t', powerKw: 11 }, { 'V:t': { ...TARIFFS.vattenfall, currency: 'GBP' } }, "The published price is incomplete or can't be read."],
  ])('unknown entry (%s) says what is missing and shows no figures (G6-AC7)', (_r, entry, tariffs, reason) => {
    expect(viewsFor([entry], tariffs)[0]).toMatchObject({
      verdict: 'unknown', verdictText: 'Price unknown', reasonText: reason, savingText: null, priceText: null, chipText: 'Unknown',
    });
  });

  it('links each entry to the other entries at the same location', () => {
    const v = viewsFor(
      [{ tariffKey: 'V:t', powerKw: 11 }, { tariffKey: null, powerKw: null, unknown: 'no-tariff' }],
      { 'V:t': TARIFFS.vattenfall },
    );
    expect(v[0]!.alsoHere).toEqual([{ id: 'L:1#no-tariff', text: 'Also here: Price unknown' }]);
    expect(v[1]!.alsoHere).toEqual([{ id: 'L:1#V:t', text: 'Also here: Worth it · saves €0.39' }]);
  });
});
