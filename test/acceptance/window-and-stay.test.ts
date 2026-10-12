// Acceptance: the PRD Story 4 worth-it window and the Story 3 results-screen stay slider (Slice 2),
// through the pure pipeline and through the controller with stubbed browser APIs.
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.ts';
import { computeEntries, rankAtStay, type EngineSettings } from '../../src/engine/results.ts';
import { entryViews } from '../../src/ui/entry-view.ts';
import type { NearestResult } from '../../src/services/data.ts';
import type { TileTariff } from '../../src/shared/data-format.ts';
import { EXAMPLE_SETTINGS, FRIDAY_1000, TARIFFS, location, tariff } from '../fixtures/prd-tariffs.ts';
import { EXAMPLE_RAW, stubDeps } from '../fixtures/app-deps.ts';

const NEVER = 'Never worth it: always more expensive than petrol for your car';

/** One charger with one tariff, through computeEntries → rankAtStay → entryViews. */
function viewAt(t: TileTariff, opts: { battery: number; stay: number; settings?: EngineSettings }) {
  const settings = opts.settings ?? EXAMPLE_SETTINGS;
  const computed = computeEntries(
    [{ location: location('L:1', [{ tariffKey: 'L:t', powerKw: 11 }]), distanceM: 1 }],
    { 'L:t': t }, settings, opts.battery, FRIDAY_1000,
  );
  return entryViews(rankAtStay(computed, opts.stay, settings))[0]!;
}

async function parkedApp(deps = stubDeps()) {
  const app = createApp(deps);
  await app.start();
  app.saveSettings(EXAMPLE_RAW);
  await deps.locate.mock.results.at(-1)!.value;
  return app;
}

describe('PRD Story 4 — see the worth-it window', () => {
  it('scenario 1: Opcharge Zernikestraat "1h30 to 7h30" and Vattenfall Marconilaan "at least 40 min" at battery 10%', () => {
    expect(viewAt(TARIFFS.opcharge, { battery: 10, stay: 90 })).toMatchObject({
      verdictText: 'Worth it', windowText: 'Worth it if you stay 1h30 to 7h30',
    });
    expect(viewAt(TARIFFS.vattenfall, { battery: 10, stay: 90 })).toMatchObject({
      verdictText: 'Worth it', windowText: 'Worth it if you stay at least 40 min',
    });
  });

  it('scenario 2: a tariff that can\'t be interpreted shows "Price unknown" and no window', () => {
    expect(viewAt({ ...TARIFFS.vattenfall, currency: 'GBP' }, { battery: 10, stay: 90 })).toMatchObject({
      verdictText: 'Price unknown', windowText: null, savingText: null,
    });
  });

  it('scenario 3: E-Flux Laboratoriumstraat at battery 10% is never worth it', () => {
    expect(viewAt(TARIFFS.efluxLab, { battery: 10, stay: 90 })).toMatchObject({ verdictText: 'Never worth it', windowText: NEVER });
  });

  it('stay outside the window: 45 min against a window from 1h10 reads "Not worth it for this stay"', () => {
    // €1.80 start fee: the saving turns positive at 3.80 kWh (minute 64); the next grid stay is 1h10.
    const settings = { ...EXAMPLE_SETTINGS, cardStartFee: 1.8 };
    expect(viewAt(TARIFFS.vattenfall, { battery: 10, stay: 45, settings })).toMatchObject({
      verdictText: 'Not worth it for this stay', windowText: 'Worth it if you stay at least 1h10',
    });
  });

  it('a window from the minimum stay with no upper limit reads "Worth it for any stay"', () => {
    // No start fee: 15 min adds 0.9 kWh and already saves €0.43.
    const settings = { ...EXAMPLE_SETTINGS, cardStartFee: 0 };
    expect(viewAt(TARIFFS.vattenfall, { battery: 10, stay: 15, settings })).toMatchObject({
      verdictText: 'Worth it', windowText: 'Worth it for any stay',
    });
  });

  it('a window from the minimum stay with an upper limit reads "Worth it for any stay up to X"', () => {
    // Battery 90%: full after 25 min with 1.5 kWh, saving €0.71; €0.88/h after full uses that up 40 min later.
    const settings = { ...EXAMPLE_SETTINGS, cardStartFee: 0 };
    const t = tariff([{ components: [['ENERGY', 0.2691], ['PARKING_TIME', 0.88]] }]);
    expect(viewAt(t, { battery: 90, stay: 15, settings })).toMatchObject({
      verdictText: 'Worth it', windowText: 'Worth it for any stay up to 1h',
    });
  });

  it('battery level changes the window: Opcharge at 10%, then 70% after going back and searching again', async () => {
    const opcharge: NearestResult = {
      nearby: [{ location: location('OPC:zernike', [{ tariffKey: 'OPC:t', powerKw: 11 }], { operator: 'Opcharge' }), distanceM: 50 }],
      tariffs: { 'OPC:t': TARIFFS.opcharge },
    };
    const app = await parkedApp(stubDeps({ nearest: opcharge }));
    app.setBattery(10);
    await app.findChargers();
    expect(entryViews(app.getState().results)[0]!.windowText).toBe('Worth it if you stay 1h30 to 7h30');
    app.backToParked();
    app.setBattery(70);
    await app.findChargers();
    // 4.5 kWh of room: €3.60 of petrol never covers €1.50 of fixed fees plus €2.34 of energy.
    expect(entryViews(app.getState().results)[0]).toMatchObject({ verdictText: 'Never worth it', windowText: NEVER });
  });
});

describe('PRD Story 3 — the stay slider on the results screen', () => {
  // Cheaper kWh but a bigger start fee: behind Vattenfall for a short stay, ahead of it once the battery is full.
  const SWAP: NearestResult = {
    nearby: [
      { location: location('VAT:park21', [{ tariffKey: 'VAT:t', powerKw: 11 }], { operator: 'Vattenfall', address: 'Parkstraat 21' }), distanceM: 100 },
      { location: location('CHP:berg', [{ tariffKey: 'CHP:t', powerKw: 11 }], { operator: 'Cheapkwh', address: 'Berg 14' }), distanceM: 300 },
    ],
    tariffs: { 'VAT:t': TARIFFS.vattenfall, 'CHP:t': tariff([{ components: [['ENERGY', 0.1], ['FLAT', 2]] }]) },
  };

  it('scenario 1: releasing the slider re-ranks every result from the cached curves and keeps the selected charger', async () => {
    const deps = stubDeps({ nearest: SWAP });
    const app = await parkedApp(deps);
    app.setBattery(10);
    app.setStay(45);
    await app.findChargers();
    const before = app.getState();
    expect(before.results.map((r) => r.locationId)).toEqual(['VAT:park21', 'CHP:berg']);
    const vattenfall = before.results[0]!.id;
    app.select(vattenfall);
    const views: string[] = [];
    app.subscribe((s) => views.push(s.view));

    app.setStay(240);

    const after = app.getState();
    // 13.5 kWh: Cheapkwh saves €5.85, Vattenfall €5.51.
    expect(after.results.map((r) => r.locationId)).toEqual(['CHP:berg', 'VAT:park21']);
    expect(after.selectedId).toBe(vattenfall);
    expect(entryViews(after.results)[1]).toMatchObject({ id: vattenfall, rankText: '#2 of 2 · best saving first' });
    expect(views).not.toContain('loading');
    expect(deps.findNearest).toHaveBeenCalledTimes(1);
    // The same cost curves, read at the new stay: no engine run (G7-AC4).
    const curves = before.results.map((r) => r.entry);
    for (const r of after.results) expect(curves).toContain(r.entry);
  });

  it('both screens share one stay: a change on the results screen shows on the parked screen (G7-AC2)', async () => {
    const app = await parkedApp();
    app.setBattery(20);
    await app.findChargers();
    app.setStay(150);
    app.backToParked();
    expect(app.getState()).toMatchObject({ view: 'parked', stayMin: 150 });
  });
});
