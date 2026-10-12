// Acceptance: the PRD Story 1–3 flows for Slice 1, through the controller with stubbed browser APIs.
import { describe, expect, it } from 'vitest';
import { createApp, spotFor } from '../../src/app.ts';
import { entryViews } from '../../src/ui/entry-view.ts';
import { BRUSSELS, EXAMPLE_RAW, NUENEN, memoryStorage, stubDeps } from '../fixtures/app-deps.ts';

async function parkedApp(deps = stubDeps()) {
  const app = createApp(deps);
  await app.start();
  app.saveSettings(EXAMPLE_RAW);
  await deps.locate.mock.results.at(-1)!.value;
  return app;
}

describe('Story 1 — set up my car and costs', () => {
  it('scenario 1: first visit opens the setup; saving goes straight to "parked here now"; a reload skips setup', async () => {
    const storage = memoryStorage();
    const first = createApp(stubDeps({ storage: () => storage }));
    await first.start();
    expect(first.getState()).toMatchObject({ view: 'setup', setupNotice: true });
    expect(first.saveSettings(EXAMPLE_RAW).ok).toBe(true);
    expect(first.getState().view).toBe('parked');

    const reloaded = createApp(stubDeps({ storage: () => storage }));
    await reloaded.start();
    expect(reloaded.getState()).toMatchObject({ view: 'parked', settings: { petrolPrice: 2.399 } });
  });

  it('scenario 2: an out-of-range value blocks saving with the range message', async () => {
    const app = createApp(stubDeps());
    await app.start();
    expect(app.saveSettings({ ...EXAMPLE_RAW, chargeKw: '0' })).toEqual({ ok: false, errors: { chargeKw: 'Charging speed must be between 1 and 22 kW.' } });
    expect(app.getState().view).toBe('setup');
  });

  it('scenario 4: the settings screen has the tariff data date', async () => {
    const app = await parkedApp();
    app.openSettings();
    expect(app.getState()).toMatchObject({ view: 'setup', dataTimestamp: '2026-10-09T06:12:00.000Z' });
  });

  it('storage unavailable: works for the visit and warns', async () => {
    const app = createApp(stubDeps({ storage: () => { throw new Error('blocked'); } }));
    await app.start();
    app.saveSettings(EXAMPLE_RAW);
    expect(app.getState()).toMatchObject({ view: 'parked', storageWarning: true, settings: { chargeKw: 3.6 } });
  });
});

describe('Story 2 — see which nearby chargers are worth it', () => {
  it('scenario 1: allow location, battery 20%, stay 45 min, "Find chargers" → ranked results with the best selected', async () => {
    const app = await parkedApp();
    expect(app.getState().location).toEqual({ status: 'found', position: NUENEN });
    app.setBattery(20);
    app.setStay(45);
    await app.findChargers();
    const s = app.getState();
    expect(s).toMatchObject({ view: 'results', search: 'results' });
    const v = entryViews(s.results);
    expect(v.map((e) => [e.operator, e.verdictText, e.savingText])).toEqual([
      ['Vattenfall', 'Worth it', 'Saves €0.39 compared with €2.16 of petrol'],
      ['Allego', 'Never worth it', 'Costs €0.98 more than €2.16 of petrol'],
    ]);
    expect(s.selectedId).toBe(s.results[0]!.id);
  });

  it('scenario 2: data that can\'t be loaded shows the load error and no results; "Try again" recovers', async () => {
    const deps = stubDeps({ failFind: 1 });
    const app = await parkedApp(deps);
    app.setBattery(20);
    await app.findChargers();
    expect(app.getState()).toMatchObject({ view: 'results', search: 'load-error', results: [] });
    await app.findChargers();
    expect(app.getState()).toMatchObject({ search: 'results' });
  });

  it('scenario 3: battery 100% → "battery full", no results, no data loaded', async () => {
    const deps = stubDeps();
    const app = await parkedApp(deps);
    app.setBattery(100);
    await app.findChargers();
    expect(app.getState()).toMatchObject({ search: 'battery-full', results: [] });
    expect(deps.findNearest).not.toHaveBeenCalled();
  });

  it('outside the Netherlands: no results and no data loaded', async () => {
    const deps = stubDeps({ locations: [{ kind: 'found', position: BRUSSELS }] });
    const app = await parkedApp(deps);
    app.setBattery(20);
    await app.findChargers();
    expect(app.getState()).toMatchObject({ view: 'parked', search: 'outside-nl', results: [] });
    expect(deps.findNearest).not.toHaveBeenCalled();
  });

  it('battery not set: "Find chargers" is blocked and highlights the battery', async () => {
    const deps = stubDeps();
    const app = await parkedApp(deps);
    await app.findChargers();
    expect(app.getState()).toMatchObject({ view: 'parked', blocked: 'battery' });
    expect(deps.findNearest).not.toHaveBeenCalled();
  });

  it('location denied: "Find chargers" is blocked; "Try again" asks again and unblocks', async () => {
    const deps = stubDeps({ locations: [{ kind: 'denied' }, { kind: 'found', position: NUENEN }] });
    const app = await parkedApp(deps);
    app.setBattery(20);
    expect(app.getState().location).toEqual({ status: 'denied' });
    await app.findChargers();
    expect(app.getState().blocked).toBe('location');
    await app.retryLocation();
    await app.findChargers();
    expect(app.getState().search).toBe('results');
  });

  it('approximate location: the results repeat the notice', async () => {
    const deps = stubDeps({ locations: [{ kind: 'found', position: { ...NUENEN, accuracyM: 1500 } }] });
    const app = await parkedApp(deps);
    expect(spotFor(app.getState())).toMatchObject({ kind: 'browser', approximate: true });
    app.setBattery(20);
    await app.findChargers();
    expect(app.getState()).toMatchObject({ search: 'results', approximateResults: true });
  });
});

describe('Story 3 — tell the app how long I\'ll stay (parked screen)', () => {
  it('scenario 3: the stay starts at 1h30', async () => {
    expect((await parkedApp()).getState().stayMin).toBe(90);
  });

  it('scenario 2: − and + stop at 15 min and 24 h with the limit note', async () => {
    const app = await parkedApp();
    app.setStay(15);
    app.nudgeStay(-1);
    expect(app.getState()).toMatchObject({ stayMin: 15, stayLimitNote: true });
    app.nudgeStay(1);
    expect(app.getState()).toMatchObject({ stayMin: 30, stayLimitNote: false });
    app.setStay(1440);
    app.nudgeStay(1);
    expect(app.getState()).toMatchObject({ stayMin: 1440, stayLimitNote: true });
  });
});
