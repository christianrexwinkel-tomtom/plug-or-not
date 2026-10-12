import { describe, expect, it } from 'vitest';
import { createApp } from './app.ts';
import { EXAMPLE_RAW, stubDeps } from '../test/fixtures/app-deps.ts';

async function searched(deps = stubDeps()) {
  const app = createApp(deps);
  await app.start();
  app.saveSettings(EXAMPLE_RAW);
  await deps.locate.mock.results.at(-1)!.value;
  app.setBattery(20);
  await app.findChargers();
  return { app, deps };
}

describe('createApp — controller state machine (G7-AC5)', () => {
  it('asks for the location when the parked view opens, with "locating" until it answers', async () => {
    const deps = stubDeps();
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
});
