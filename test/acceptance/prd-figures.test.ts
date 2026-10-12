// Acceptance: every PRD figure for Slice 1, through the whole pure pipeline
// (tile data → cost curves → ranking at the stay → what the details panel shows).
import { describe, expect, it } from 'vitest';
import { computeEntries, rankAtStay, type EngineSettings } from '../../src/engine/results.ts';
import { entryViews } from '../../src/ui/entry-view.ts';
import type { TileLocation, TileTariff } from '../../src/shared/data-format.ts';
import { EXAMPLE_SETTINGS, FRIDAY_1000, FRIDAY_1530, TARIFFS, location } from '../fixtures/prd-tariffs.ts';

function views(
  locs: Array<{ loc: TileLocation; distanceM: number }>,
  tariffs: Record<string, TileTariff>,
  opts: { battery: number; stay: number; start?: number; settings?: EngineSettings },
) {
  const settings = opts.settings ?? EXAMPLE_SETTINGS;
  const computed = computeEntries(
    locs.map((l) => ({ location: l.loc, distanceM: l.distanceM })),
    tariffs,
    settings,
    opts.battery,
    opts.start ?? FRIDAY_1000,
  );
  return entryViews(rankAtStay(computed, opts.stay, settings));
}

describe('PRD Story 2 — nearby chargers ranked by saving', () => {
  it('scenario 1: Parkstraat Nuenen, battery 20%, stay 45 min', () => {
    const vattenfall = location('VAT:park21', [{ tariffKey: 'VAT:t1', powerKw: 11 }], {
      operator: 'Vattenfall', address: 'Parkstraat 21',
    });
    const allego = location('ALL:kerk6', [{ tariffKey: 'ALL:t2', powerKw: 11 }], {
      operator: 'Allego', address: 'Kerkstraat 6',
    });
    const v = views(
      [{ loc: allego, distanceM: 266 }, { loc: vattenfall, distanceM: 74 }],
      { 'VAT:t1': TARIFFS.vattenfall, 'ALL:t2': TARIFFS.allego },
      { battery: 20, stay: 45 },
    );
    expect(v[0]).toMatchObject({
      operator: 'Vattenfall',
      address: 'Parkstraat 21, Nuenen',
      distanceText: '74 m',
      verdictText: 'Worth it',
      rankText: '#1 of 2 · best saving first',
      savingText: 'Saves €0.39 compared with €2.16 of petrol',
      priceText: '€0.33/kWh · total €1.77',
    });
    expect(v[1]).toMatchObject({
      operator: 'Allego',
      distanceText: '266 m',
      verdictText: 'Never worth it',
      savingText: 'Costs €0.98 more than €2.16 of petrol',
    });
  });

  it('scenario 4: card markup €0.05/kWh, €0.30/kWh, 1 hour → total €2.38 for 3.6 kWh', () => {
    const settings = { ...EXAMPLE_SETTINGS, cardMarkup: 0.05 };
    const computed = computeEntries(
      [{ location: location('X:1', [{ tariffKey: 'X:t', powerKw: 22 }]), distanceM: 10 }],
      { 'X:t': TARIFFS.flat30 }, settings, 20, FRIDAY_1000,
    );
    const [ranked] = rankAtStay(computed, 60, settings);
    expect(ranked!.outcome).toMatchObject({ kind: 'priced' });
    if (ranked!.outcome.kind !== 'priced') return;
    expect(ranked!.outcome.kwh).toBeCloseTo(3.6, 9);
    expect(entryViews([ranked!])[0]!.priceText).toBe('€0.36/kWh · total €2.38');
  });

  it('scenario 5: Culemborg at 15:30 for 2 h → 7.2 kWh, total €6.80, peak from 16:00', () => {
    const computed = computeEntries(
      [{ location: location('EFL:voorburg', [{ tariffKey: 'EFL:t', powerKw: 11 }]), distanceM: 30 }],
      { 'EFL:t': TARIFFS.efluxVoorburg }, EXAMPLE_SETTINGS, 20, FRIDAY_1530,
    );
    const [ranked] = rankAtStay(computed, 120, EXAMPLE_SETTINGS);
    if (ranked!.outcome.kind !== 'priced') throw new Error('expected priced');
    expect(ranked!.outcome.kwh).toBeCloseTo(7.2, 9);
    expect(entryViews([ranked!])[0]!.priceText).toBe('€0.66/kWh · €0.50/h charging · price varies by time · total €6.80');
  });

  it('a charger without a published tariff is listed last as "Price unknown" with its reason', () => {
    const v = views(
      [
        { loc: location('A:none', [{ tariffKey: null, powerKw: null, unknown: 'no-tariff' }]), distanceM: 5 },
        { loc: location('B:priced', [{ tariffKey: 'B:t', powerKw: 11 }]), distanceM: 500 },
      ],
      { 'B:t': TARIFFS.vattenfall },
      { battery: 20, stay: 45 },
    );
    expect(v.map((x) => x.verdictText)).toEqual(['Worth it', 'Price unknown']);
    expect(v[1]).toMatchObject({ reasonText: 'No price published for this charger.', savingText: null, priceText: null });
  });

  it('a location with two tariffs shows two entries with the same address and distance', () => {
    const v = views(
      [{ loc: location('C:two', [{ tariffKey: 'C:a', powerKw: 11 }, { tariffKey: 'C:b', powerKw: 11 }]), distanceM: 120 }],
      { 'C:a': TARIFFS.vattenfall, 'C:b': TARIFFS.efluxLab },
      { battery: 20, stay: 45 },
    );
    expect(v).toHaveLength(2);
    expect(new Set(v.map((x) => `${x.address}|${x.distanceText}`)).size).toBe(1);
    expect(v[0]!.alsoHere).toEqual([{ id: v[1]!.id, text: expect.stringMatching(/^Also here: Never worth it · costs €\d\.\d\d more$/) }]);
  });
});

describe('PRD Story 4 — verdicts that depend on the worth-it window (Slice 1: verdict only)', () => {
  const opcharge = location('OPC:zernike', [{ tariffKey: 'OPC:t', powerKw: 11 }], { operator: 'Opcharge' });

  it('Opcharge Zernikestraat at battery 10%: worth it at 1h30 and 7h30, not worth it at 1h20 or 7h45', () => {
    const at = (stay: number) => views([{ loc: opcharge, distanceM: 1 }], { 'OPC:t': TARIFFS.opcharge }, { battery: 10, stay })[0]!;
    expect(at(90).verdictText).toBe('Worth it');
    expect(at(450).verdictText).toBe('Worth it');
    expect(at(80).verdictText).toBe('Not worth it for this stay');
    expect(at(465).verdictText).toBe('Not worth it for this stay');
    expect(at(90).priceText).toBe('€0.52/kWh · €0.61/h after full · €0.61 start · total €4.30');
  });

  it('E-Flux Laboratoriumstraat at battery 10% is never worth it', () => {
    const v = views([{ loc: location('EFL:lab', [{ tariffKey: 'EFL:t', powerKw: 11 }]), distanceM: 1 }], { 'EFL:t': TARIFFS.efluxLab }, { battery: 10, stay: 90 });
    expect(v[0]!.verdictText).toBe('Never worth it');
  });
});
