// Acceptance: results on a map (Slice 4) — PRD S2 scenario 1 (pins), FR-024, the S2 edge case "Several prices at one
// pin" and the S2 error "Map can't load" on the results screen — through the controller with stubbed browser APIs and
// the results map's view model.
import { describe, expect, it } from 'vitest';
import { createApp, type App } from '../../src/app.ts';
import { entryViews } from '../../src/ui/entry-view.ts';
import { resultsMapView } from '../../src/ui/results-map-view.ts';
import { EXAMPLE_RAW, KLOKGEBOUW, NEAREST_MIXED, stubDeps } from '../fixtures/app-deps.ts';

const MAP_FAILED = "Map couldn't load.";

/** Settings saved, location found, battery 20% and the stay set, then "Find chargers" — optionally at a moved spot. */
async function resultsApp(deps = stubDeps(), opts: { stay?: number; move?: { lat: number; lon: number }; mapFailed?: boolean } = {}) {
  const app = createApp(deps);
  await app.start();
  app.saveSettings(EXAMPLE_RAW);
  await deps.locate.mock.results.at(-1)!.value;
  app.setBattery(20);
  app.setStay(opts.stay ?? 45);
  if (opts.move) app.moveSpot(opts.move.lat, opts.move.lon);
  if (opts.mapFailed) app.reportMapFailure();
  await app.findChargers();
  return app;
}

const view = (app: App) => resultsMapView(app.getState());

describe('PRD S2 scenario 1 — results as pins on a map (G6-AC8, FR-024)', () => {
  it('one pin per location, labelled with the saving or extra cost and marked by verdict; the best one selected', async () => {
    const app = await resultsApp();
    expect(view(app).pins).toEqual([
      {
        locationId: 'VAT:park21', entryId: 'VAT:park21#VAT:t', lat: 51.4442, lon: 5.5527,
        tone: 'w', icon: 'check', label: '€0.39', count: null, selected: true,
        ariaLabel: '1. Vattenfall, Parkstraat 21: Worth it, saves €0.39',
      },
      {
        locationId: 'ALL:kerk6', entryId: 'ALL:kerk6#ALL:t', lat: 51.4458, lon: 5.5522,
        tone: 'n', icon: 'cross', label: '−€0.98', count: null, selected: false,
        ariaLabel: '2. Allego, Kerkstraat 6: Never worth it, costs €0.98 more',
      },
    ]);
  });

  it('frames the spot and every location, with the spot as a blue dot and the spot line "Your location"', async () => {
    const app = await resultsApp();
    expect(view(app)).toMatchObject({
      spot: { lat: 51.4436, lon: 5.5519 }, spotLabel: 'Your location', spotCoords: '51.4436, 5.5519',
      bounds: [[5.5519, 51.4436], [5.5527, 51.4458]], mapMessage: null,
    });
  });

  it('results for a moved spot frame that spot and say "Moved spot"', async () => {
    const app = await resultsApp(stubDeps(), { move: KLOKGEBOUW });
    expect(view(app)).toMatchObject({
      spot: { lat: 51.4484, lon: 5.4573 }, spotLabel: 'Moved spot', spotCoords: '51.4484, 5.4573',
      bounds: [[5.4573, 51.4442], [5.5527, 51.4484]],
    });
  });

  it('tapping a pin selects its location\'s best entry, and the details panel shows "#2 of 2"', async () => {
    const app = await resultsApp();
    const kerk = view(app).pins[1]!;
    app.select(kerk.entryId);
    expect(view(app).pins.map((p) => p.selected)).toEqual([false, true]);
    const selected = entryViews(app.getState().results).find((e) => e.id === app.getState().selectedId)!;
    expect(selected.rankText).toBe('#2 of 2 · best saving first');
  });
});

describe('PRD S2 edge case — several prices at one pin (G6-AC8)', () => {
  it('the pin shows the best entry\'s saving and verdict with "×2"; a "Price unknown" pin shows only its icon', async () => {
    const app = await resultsApp(stubDeps({ nearest: NEAREST_MIXED }));
    expect(view(app).pins).toMatchObject([
      {
        locationId: 'VAT:park21', entryId: 'VAT:park21#VAT:t', tone: 'w', label: '€0.39', count: '×2', selected: true,
        ariaLabel: '1. Vattenfall, Parkstraat 21: Worth it, saves €0.39, and 1 more price here',
      },
      {
        locationId: 'LMS:molen5', entryId: 'LMS:molen5#no-tariff', tone: 'u', icon: 'question', label: '', count: null,
        ariaLabel: '3. Last Mile Solutions, Molenstraat 5: Price unknown',
      },
    ]);
    // The details panel links to the other entry; selecting it keeps the location's pin selected.
    expect(entryViews(app.getState().results)[0]!.alsoHere).toEqual([{ id: 'VAT:park21#no-tariff', text: 'Also here: Price unknown' }]);
    app.select('VAT:park21#no-tariff');
    expect(view(app).pins.map((p) => p.selected)).toEqual([true, false]);
  });
});

describe('PRD S3 scenario 1 on the map — a stay change keeps the selection (D-30)', () => {
  it('the pins re-label and the selected entry stays selected; the map isn\'t reframed', async () => {
    const app = await resultsApp();
    app.select('ALL:kerk6#ALL:t');
    const key = view(app).frameKey;
    app.setStay(15);
    expect(view(app).pins).toMatchObject([
      { locationId: 'VAT:park21', tone: 'n', icon: 'clock', label: '−€0.46', selected: false },
      { locationId: 'ALL:kerk6', label: '−€0.92', selected: true },
    ]);
    expect(app.getState().selectedId).toBe('ALL:kerk6#ALL:t');
    expect(view(app).frameKey).toBe(key);
  });
});

describe('PRD S2 error — map can\'t load, on the results screen (G6-AC9)', () => {
  it('a map that fails with the results open shows the message and no pins; the results stay in full', async () => {
    const app = await resultsApp(stubDeps(), { move: KLOKGEBOUW });
    const framedKey = view(app).frameKey;
    app.reportMapFailure();
    expect(view(app)).toMatchObject({
      mapMessage: MAP_FAILED, pins: [], bounds: null, spotLabel: 'Moved spot', spotCoords: '51.4484, 5.4573',
    });
    expect(app.getState()).toMatchObject({ view: 'results', search: 'results', selectedId: 'VAT:park21#VAT:t' });
    expect(entryViews(app.getState().results).map((e) => e.stripText)).toEqual(['1. Parkstraat 21', '2. Kerkstraat 6']);
    // A map that loads after all brings the pins back and is framed again.
    app.reportMapRecovered();
    expect(view(app)).toMatchObject({ mapMessage: null, frameKey: framedKey });
    expect(view(app).pins).toHaveLength(2);
  });

  it('a map that failed before the search: results without pins, calculated for the browser position', async () => {
    const deps = stubDeps();
    const app = await resultsApp(deps, { mapFailed: true });
    expect(deps.findNearest).toHaveBeenCalledWith(51.4436, 5.5519, expect.anything());
    expect(view(app)).toMatchObject({ mapMessage: MAP_FAILED, pins: [], spotLabel: 'Your location' });
    expect(entryViews(app.getState().results).map((e) => [e.verdictText, e.savingText])).toEqual([
      ['Worth it', 'Saves €0.39 compared with €2.16 of petrol'],
      ['Never worth it', 'Costs €0.98 more than €2.16 of petrol'],
    ]);
  });
});
