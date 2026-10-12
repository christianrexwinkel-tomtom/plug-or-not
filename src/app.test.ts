import { describe, expect, it } from 'vitest';
import { createApp, spotFor } from './app.ts';
import { BRUSSELS, EXAMPLE_RAW, MANIFEST, NUENEN, stubDeps } from '../test/fixtures/app-deps.ts';

async function searched(deps = stubDeps()) {
  const app = createApp(deps);
  await app.start();
  app.saveSettings(EXAMPLE_RAW);
  await deps.locate.mock.results.at(-1)!.value;
  app.setBattery(20);
  await app.findChargers();
  return { app, deps };
}

async function parked(deps = stubDeps()) {
  const app = createApp(deps);
  await app.start();
  app.saveSettings(EXAMPLE_RAW);
  await deps.locate.mock.results.at(-1)!.value;
  return { app, deps };
}

describe('createApp — controller state machine (G7-AC5)', () => {
  it('asks for the location when the parked view opens, with "locating" until it answers', async () => {
    const deps = stubDeps();
    // A location that hasn't answered yet: a found one would answer the refused tap (Slice 3).
    deps.locate.mockImplementation(() => new Promise(() => undefined));
    const app = createApp(deps);
    await app.start();
    app.saveSettings(EXAMPLE_RAW);
    expect(app.getState().location).toEqual({ status: 'locating' });
    app.setBattery(20);
    await app.findChargers();
    expect(app.getState().blocked).toBe('location');
  });

  it('shows the loading view while tiles and curves are resolved, and results complete at once', async () => {
    const deps = stubDeps();
    const app = createApp(deps);
    await app.start();
    app.saveSettings(EXAMPLE_RAW);
    await deps.locate.mock.results.at(-1)!.value;
    app.setBattery(20);
    const views: string[] = [];
    app.subscribe((s) => views.push(`${s.view}:${s.results.length}`));
    await app.findChargers();
    expect(views).toContain('loading:0');
    expect(views.at(-1)).toBe('results:2');
    expect(views.filter((v) => v.startsWith('results:')).every((v) => v === 'results:2')).toBe(true);
  });

  it('a battery change with the same spot reuses the loaded tiles and does not ask for the location again', async () => {
    const { app, deps } = await searched();
    app.backToParked();
    app.setBattery(70);
    await app.findChargers();
    expect(deps.findNearest).toHaveBeenCalledTimes(1);
    expect(deps.locate).toHaveBeenCalledTimes(1);
    expect(app.getState().search).toBe('results');
  });

  it('selects an entry and keeps unknown ids out', async () => {
    const { app } = await searched();
    const second = app.getState().results[1]!.id;
    app.select(second);
    expect(app.getState().selectedId).toBe(second);
    app.select('nope');
    expect(app.getState().selectedId).toBe(second);
  });

  it('changing the petrol price from the results screen recomputes without refetching (G1-AC4)', async () => {
    const { app, deps } = await searched();
    const before = app.getState().results[0]!.outcome;
    expect(before).toMatchObject({ kind: 'priced', kwh: expect.closeTo(5.4, 9) });
    app.openSettings();
    app.saveSettings({ ...EXAMPLE_RAW, petrolPrice: '2.459' });
    const s = app.getState();
    expect(s.view).toBe('results');
    expect(s.settings).toMatchObject({ petrolPrice: 2.459, chargeKw: 3.6, cardStartFee: 0.89 });
    // PRD S1 figures: 5.4 kWh ÷ 0.25 kWh/km = 21.6 km; ÷ 12 km/L = 1.8 L; × €2.459/L = €4.4262.
    const after = s.results[0]!.outcome;
    if (after.kind !== 'priced' || before.kind !== 'priced') throw new Error('expected priced outcomes');
    expect(after.petrolCost).toBeCloseTo(4.4262, 9);
    expect(after.cost).toBeCloseTo(before.cost, 9);
    expect(after.saving).toBeCloseTo(4.4262 - before.cost, 9);
    expect(deps.findNearest).toHaveBeenCalledTimes(1);
  });

  it('sets the data date from a later search when the manifest failed at start (G2-AC4)', async () => {
    const deps = stubDeps();
    deps.loadManifest.mockRejectedValueOnce(new Error('offline'));
    const app = createApp(deps);
    await app.start();
    app.saveSettings(EXAMPLE_RAW);
    await deps.locate.mock.results.at(-1)!.value;
    expect(app.getState().dataTimestamp).toBeNull();
    app.setBattery(20);
    await app.findChargers();
    expect(app.getState()).toMatchObject({ search: 'results', dataTimestamp: '2026-10-09T06:12:00.000Z' });
  });

  it('a Settings save after a battery-full answer leaves the results empty', async () => {
    const { app } = await searched();
    app.backToParked();
    app.setBattery(100);
    await app.findChargers();
    expect(app.getState()).toMatchObject({ view: 'results', search: 'battery-full', results: [] });
    app.openSettings();
    app.saveSettings({ ...EXAMPLE_RAW, petrolPrice: '2.459' });
    const s = app.getState();
    expect(s.results).toEqual([]);
    expect(s.selectedId).toBeNull();
    expect(s.search).not.toBe('results');
  });

    it('closing the settings returns to the view it was opened from', async () => {
    const { app } = await searched();
    app.openSettings();
    app.closeSettings();
    expect(app.getState().view).toBe('results');
  });

  it('a stay change on the results screen re-reads the cached curves at the new stay (G7-AC4)', async () => {
    const { app, deps } = await searched();
    const before = app.getState().results;
    expect(before[0]!.outcome).toMatchObject({ kind: 'priced', kwh: expect.closeTo(5.4, 9) });
    app.setStay(45);
    const after = app.getState().results;
    expect(after[0]!.outcome).toMatchObject({ kind: 'priced', kwh: expect.closeTo(2.7, 9) });
    expect(after[0]!.entry).toBe(before[0]!.entry);
    expect(deps.findNearest).toHaveBeenCalledTimes(1);
  });

  it('a stay change after a load error stores the stay and leaves the results empty', async () => {
    const { app } = await searched(stubDeps({ failFind: 1 }));
    expect(app.getState().search).toBe('load-error');
    app.setStay(45);
    expect(app.getState()).toMatchObject({ search: 'load-error', results: [], selectedId: null, stayMin: 45 });
  });

  it('ignores a map move while the location is being found, so the answer never moves a chosen spot (G3-AC1)', async () => {
    const deps = stubDeps();
    const app = createApp(deps);
    await app.start();
    app.saveSettings(EXAMPLE_RAW);
    app.moveSpot(51.4484, 5.4573);
    expect(app.getState().movedSpot).toBeNull();
    await deps.locate.mock.results.at(-1)!.value;
    expect(spotFor(app.getState())).toMatchObject({ kind: 'browser', lat: 51.4436, lon: 5.5519 });
  });

  it('a found location clears a "Find chargers" block made while locating', async () => {
    const deps = stubDeps();
    const app = createApp(deps);
    await app.start();
    app.saveSettings(EXAMPLE_RAW);
    app.setBattery(20);
    void app.findChargers();
    expect(app.getState().blocked).toBe('location');
    await deps.locate.mock.results.at(-1)!.value;
    expect(app.getState().blocked).toBeNull();
  });

  it('"Try again" after a denial drops a moved spot and asks again', async () => {
    const { app } = await parked(stubDeps({ locations: [{ kind: 'denied' }, { kind: 'found', position: NUENEN }] }));
    app.moveSpot(51.4484, 5.4573);
    expect(app.getState().movedSpot).toEqual({ lat: 51.4484, lon: 5.4573 });
    await app.retryLocation();
    expect(app.getState().movedSpot).toBeNull();
    expect(spotFor(app.getState())).toMatchObject({ kind: 'browser', lat: 51.4436, lon: 5.5519 });
  });

  it('a map move clears an outside-the-Netherlands answer', async () => {
    const { app } = await parked(stubDeps({ locations: [{ kind: 'found', position: BRUSSELS }] }));
    app.setBattery(20);
    await app.findChargers();
    expect(app.getState().search).toBe('outside-nl');
    app.moveSpot(51.4436, 5.5519);
    expect(app.getState()).toMatchObject({ search: 'idle', movedSpot: { lat: 51.4436, lon: 5.5519 } });
  });

  it('"My location" drops the moved spot only when there is a browser position', async () => {
    const { app } = await parked();
    app.moveSpot(51.4484, 5.4573);
    app.recentre();
    expect(app.getState().movedSpot).toBeNull();
    const { app: denied } = await parked(stubDeps({ locations: [{ kind: 'denied' }] }));
    denied.moveSpot(51.4484, 5.4573);
    denied.recentre();
    expect(denied.getState().movedSpot).toEqual({ lat: 51.4484, lon: 5.4573 });
  });

  it('a map failure drops a moved spot, stops map moves and clears an outside-the-Netherlands answer (G6-AC9)', async () => {
    const { app } = await parked();
    app.setBattery(20);
    app.moveSpot(BRUSSELS.lat, BRUSSELS.lon);
    await app.findChargers();
    expect(app.getState().search).toBe('outside-nl');
    app.reportMapFailure();
    expect(app.getState()).toMatchObject({ mapFailed: true, movedSpot: null, search: 'idle' });
    app.moveSpot(51.4484, 5.4573);
    expect(app.getState().movedSpot).toBeNull();
  });

  it('a map that loads late recovers: the map can be moved again, the browser position stays the spot (G6-AC9)', async () => {
    const { app } = await parked();
    app.reportMapFailure();
    app.reportMapRecovered();
    expect(app.getState()).toMatchObject({ mapFailed: false, movedSpot: null });
    app.moveSpot(51.4484, 5.4573);
    expect(app.getState().movedSpot).toEqual({ lat: 51.4484, lon: 5.4573 });
  });

  it('a search at a moved spot loads the tiles for that spot; a battery change there reuses them', async () => {
    const { app, deps } = await parked();
    app.setBattery(20);
    app.moveSpot(51.4484, 5.4573);
    await app.findChargers();
    expect(deps.findNearest).toHaveBeenLastCalledWith(51.4484, 5.4573, MANIFEST);
    app.backToParked();
    app.setBattery(70);
    await app.findChargers();
    expect(deps.findNearest).toHaveBeenCalledTimes(1);
    expect(app.getState()).toMatchObject({ search: 'results', movedSpot: { lat: 51.4484, lon: 5.4573 } });
  });

  it('records the searched spot for the results, and keeps it when the map fails afterwards (G6-AC8, G6-AC9)', async () => {
    const { app } = await parked();
    app.setBattery(20);
    app.moveSpot(51.4484, 5.4573);
    await app.findChargers();
    expect(app.getState().searchedSpot).toEqual({ kind: 'moved', lat: 51.4484, lon: 5.4573 });
    app.reportMapFailure();
    expect(app.getState()).toMatchObject({ movedSpot: null, searchedSpot: { kind: 'moved', lat: 51.4484, lon: 5.4573 } });
  });

  it('a map move off the parked screen is not a spot move: panning the results map keeps the spot', async () => {
    const { app } = await searched();
    app.moveSpot(51.4484, 5.4573);
    expect(app.getState()).toMatchObject({ view: 'results', movedSpot: null });
    expect(app.getState().searchedSpot).toMatchObject({ kind: 'browser', lat: 51.4436, lon: 5.5519 });
  });
});
