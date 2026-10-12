import { describe, expect, it } from 'vitest';
import { createApp, type AppState } from '../app.ts';
import { computeEntries, rankAtStay, type RankedEntry } from '../engine/results.ts';
import type { TileLocation, TileTariff } from '../shared/data-format.ts';
import { pinViews, resultsMapView } from './results-map-view.ts';
import { MAP_FAILED, YOUR_LOCATION } from './messages.ts';
import { stubDeps } from '../../test/fixtures/app-deps.ts';
import { EXAMPLE_SETTINGS, FRIDAY_1000, TARIFFS, location } from '../../test/fixtures/prd-tariffs.ts';

/** One location (51.44, 5.55) with the given entries, at battery 20%, ranked at the stay. */
function ranked(entries: TileLocation['entries'], tariffs: Record<string, TileTariff>, stay = 45): RankedEntry[] {
  const computed = computeEntries(
    [{ location: location('L:1', entries, { operator: 'Vattenfall', address: 'Parkstraat 21' }), distanceM: 74 }],
    tariffs, EXAMPLE_SETTINGS, 20, FRIDAY_1000,
  );
  return rankAtStay(computed, stay, EXAMPLE_SETTINGS);
}

const SPOT = { kind: 'browser' as const, lat: 51.4436, lon: 5.5519, accuracyM: 20, approximate: false };
const base: AppState = createApp(stubDeps()).getState();
const at = (patch: Partial<AppState>): AppState => ({ ...base, view: 'results', search: 'results', searchedSpot: SPOT, ...patch });

describe('pinViews (G6-AC8, FR-024)', () => {
  it('labels a saving or an extra cost below €0.005 "<€0.01" (D-19)', () => {
    const r = ranked([{ tariffKey: 'V:t', powerKw: 11 }], { 'V:t': TARIFFS.vattenfall })[0]!;
    const outcome = r.outcome;
    if (outcome.kind !== 'priced') throw new Error('expected a priced entry');
    expect(pinViews([{ ...r, outcome: { ...outcome, saving: 0.003 } }], r.id)[0]).toMatchObject({ label: '<€0.01', tone: 'w' });
    expect(pinViews([{ ...r, outcome: { ...outcome, saving: -0.003, verdict: 'never' } }], r.id)[0]).toMatchObject({
      label: '<€0.01', tone: 'n', icon: 'cross',
    });
  });

  it('marks "Not worth it for this stay" red with a clock', () => {
    expect(pinViews(ranked([{ tariffKey: 'V:t', powerKw: 11 }], { 'V:t': TARIFFS.vattenfall }, 15), null)[0]).toMatchObject({
      tone: 'n', icon: 'clock', label: '−€0.46', selected: false,
    });
  });

  it('a location with three entries shows its best entry with "×3" and "and 2 more prices here"', () => {
    const r = ranked(
      [{ tariffKey: 'E:t', powerKw: 11 }, { tariffKey: null, powerKw: null, unknown: 'no-tariff' }, { tariffKey: 'V:t', powerKw: 11 }],
      { 'V:t': TARIFFS.vattenfall, 'E:t': TARIFFS.efluxLab },
    );
    // The "Price unknown" entry (#3) is selected: its location's pin is.
    expect(pinViews(r, r[2]!.id)).toEqual([{
      locationId: 'L:1', entryId: 'L:1#V:t', lat: 51.44, lon: 5.55, tone: 'w', icon: 'check', label: '€0.39', count: '×3', selected: true,
      ariaLabel: '1. Vattenfall, Parkstraat 21: Worth it, saves €0.39, and 2 more prices here',
    }]);
  });
});

describe('resultsMapView (G6-AC8, G6-AC9)', () => {
  it('a map that can\'t load: the message, no pins and nothing to frame; the spot line stays', () => {
    const results = ranked([{ tariffKey: 'V:t', powerKw: 11 }], { 'V:t': TARIFFS.vattenfall });
    expect(resultsMapView(at({ results, selectedId: results[0]!.id, mapFailed: true }))).toMatchObject({
      mapMessage: MAP_FAILED, pins: [], bounds: null, spotLabel: YOUR_LOCATION, spotCoords: '51.4436, 5.5519',
    });
  });

  it('battery full: the spot dot only, with nothing to frame', () => {
    expect(resultsMapView(at({ search: 'battery-full', results: [] }))).toMatchObject({
      pins: [], bounds: null, spot: { lat: 51.4436, lon: 5.5519 }, mapMessage: null,
    });
  });
});
