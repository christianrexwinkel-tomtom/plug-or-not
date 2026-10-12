// Acceptance: the spot on a map (Slice 3) — PRD S2 edge cases "Location still being found", "Approximate location"
// and "Location outside the Netherlands", the "Location denied" and "Map can't load" errors on the parked screen,
// and FR-025 — through the controller with stubbed browser APIs and the parked map's view model.
import { describe, expect, it } from 'vitest';
import { createApp, type App } from '../../src/app.ts';
import { spotView } from '../../src/ui/spot-view.ts';
import { BRUSSELS, EXAMPLE_RAW, KLOKGEBOUW, MANIFEST, NUENEN, stubDeps } from '../fixtures/app-deps.ts';

const NL_MAP = { lat: 52.13, lon: 5.29, zoom: 7 };
const DENIED = "We couldn't get your location. Allow location access in your browser and try again, or drag the map to your spot.";

/** Settings saved and the parked screen open (by the time the caller resumes, the stub's location may have answered). */
async function opened(deps = stubDeps()) {
  const app = createApp(deps);
  await app.start();
  app.saveSettings(EXAMPLE_RAW);
  return app;
}

/** The parked screen after the browser answered. */
async function parkedApp(deps = stubDeps()) {
  const app = await opened(deps);
  await deps.locate.mock.results.at(-1)!.value;
  return app;
}

const view = (app: App) => spotView(app.getState());

describe('PRD S2 edge case — location still being found (G3-AC1)', () => {
  it('shows "Finding your location…" on the map with dragging off and "Find chargers" blocked; the answer centres the map', async () => {
    const deps = stubDeps();
    // Set up inline: awaiting an async helper would give the stub's locate() time to answer first.
    const app = createApp(deps);
    await app.start();
    app.saveSettings(EXAMPLE_RAW);
    app.setBattery(20);
    expect(view(app)).toMatchObject({ busy: true, draggable: false, centre: NL_MAP });
    // A drag can't happen while locating; a stray move is ignored, so the answer never moves a spot the driver chose.
    app.moveSpot(KLOKGEBOUW.lat, KLOKGEBOUW.lon);
    const tap = app.findChargers();
    expect(view(app).highlight).toBe(true);
    await tap;
    await deps.locate.mock.results.at(-1)!.value;
    expect(deps.findNearest).not.toHaveBeenCalled();
    expect(view(app)).toMatchObject({
      busy: false, highlight: false, chipLabel: 'Your location', chipCoords: '51.4436, 5.5519', centre: { lat: 51.4436, lon: 5.5519 },
    });
  });
});

describe('PRD S2 error — location denied or unavailable (G3-AC1)', () => {
  it('opens the map on the centre of the Netherlands with a grey pin; "Find chargers" waits until the map is moved', async () => {
    const deps = stubDeps({ locations: [{ kind: 'denied' }] });
    const app = await parkedApp(deps);
    app.setBattery(20);
    expect(view(app)).toMatchObject({
      notice: { text: DENIED, retry: true }, centre: NL_MAP, pin: 'none', chipLabel: 'No location yet', recentre: false,
    });
    await app.findChargers();
    expect(app.getState().blocked).toBe('location');
    expect(view(app).highlight).toBe(true);
    expect(deps.findNearest).not.toHaveBeenCalled();

    app.moveSpot(KLOKGEBOUW.lat, KLOKGEBOUW.lon);
    expect(view(app)).toMatchObject({ highlight: false, pin: 'me', chipLabel: 'Moved spot', chipCoords: '51.4484, 5.4573', recentre: false });
    await app.findChargers();
    expect(deps.findNearest).toHaveBeenCalledWith(51.4484, 5.4573, MANIFEST);
    expect(app.getState().search).toBe('results');
  });
});

describe('PRD S2 edge case — approximate location (G3-AC2)', () => {
  const approx = () => stubDeps({ locations: [{ kind: 'found', position: { ...NUENEN, accuracyM: 1500 } }] });

  it('shows the notice and the accuracy circle; a search as is uses the reported position and repeats the notice', async () => {
    const deps = approx();
    const app = await parkedApp(deps);
    expect(view(app)).toMatchObject({ notice: { text: 'Your location is approximate' }, accuracyM: 1500 });
    app.setBattery(20);
    await app.findChargers();
    expect(deps.findNearest).toHaveBeenCalledWith(51.4436, 5.5519, MANIFEST);
    expect(app.getState()).toMatchObject({ search: 'results', approximateResults: true });
  });

  it('dragging the map to the exact spot removes the notice and the circle, and the results don\'t repeat it', async () => {
    const deps = approx();
    const app = await parkedApp(deps);
    app.moveSpot(51.4441, 5.553);
    expect(view(app)).toMatchObject({ notice: null, accuracyM: null, chipLabel: 'Moved spot' });
    app.setBattery(20);
    await app.findChargers();
    expect(app.getState()).toMatchObject({ search: 'results', approximateResults: false });
  });
});

describe('FR-025 — move the spot by dragging the map (G3-AC3)', () => {
  it('a moved spot shows "Moved spot" with its coordinates and "My location", which returns to the browser position', async () => {
    const deps = stubDeps();
    const app = await parkedApp(deps);
    app.moveSpot(KLOKGEBOUW.lat, KLOKGEBOUW.lon);
    expect(view(app)).toMatchObject({ chipLabel: 'Moved spot', chipCoords: '51.4484, 5.4573', recentre: true, centre: null });
    app.recentre();
    expect(view(app)).toMatchObject({
      chipLabel: 'Your location', chipCoords: '51.4436, 5.5519', recentre: false, centre: { lat: 51.4436, lon: 5.5519 },
    });
    app.setBattery(20);
    await app.findChargers();
    expect(deps.findNearest).toHaveBeenCalledWith(51.4436, 5.5519, MANIFEST);
  });

  it('"Find chargers" uses the spot at that moment; going back keeps it without asking for the location again', async () => {
    const deps = stubDeps();
    const app = await parkedApp(deps);
    app.setBattery(20);
    app.moveSpot(KLOKGEBOUW.lat, KLOKGEBOUW.lon);
    await app.findChargers();
    expect(deps.findNearest).toHaveBeenLastCalledWith(51.4484, 5.4573, MANIFEST);
    app.backToParked();
    expect(view(app)).toMatchObject({ chipLabel: 'Moved spot', chipCoords: '51.4484, 5.4573' });
    expect(deps.locate).toHaveBeenCalledTimes(1);
  });
});

describe('PRD S2 edge case — a moved spot outside the Netherlands (G3-AC4)', () => {
  it('shows the message with the map kept open; moving back into the Netherlands clears it', async () => {
    const deps = stubDeps();
    const app = await parkedApp(deps);
    app.setBattery(20);
    app.moveSpot(BRUSSELS.lat, BRUSSELS.lon);
    await app.findChargers();
    expect(app.getState()).toMatchObject({ view: 'parked', search: 'outside-nl', results: [] });
    expect(view(app)).toMatchObject({ notice: { text: 'Charger prices are available for the Netherlands only for now.' }, draggable: true });
    expect(deps.findNearest).not.toHaveBeenCalled();
    app.moveSpot(KLOKGEBOUW.lat, KLOKGEBOUW.lon);
    expect(view(app).notice).toBeNull();
  });
});

describe('PRD S2 error — map can\'t load, on the parked screen (G6-AC9)', () => {
  it('shows "Map couldn\'t load." and uses the browser position as the spot', async () => {
    const deps = stubDeps();
    const app = await parkedApp(deps);
    app.moveSpot(KLOKGEBOUW.lat, KLOKGEBOUW.lon);
    app.reportMapFailure();
    expect(view(app)).toMatchObject({ mapMessage: "Map couldn't load.", chipLabel: 'Your location', draggable: false });
    app.setBattery(20);
    await app.findChargers();
    expect(deps.findNearest).toHaveBeenCalledWith(51.4436, 5.5519, MANIFEST);
  });

  it('with location also denied, "Find chargers" stays blocked and the notice says why', async () => {
    const deps = stubDeps({ locations: [{ kind: 'denied' }] });
    const app = await parkedApp(deps);
    app.reportMapFailure();
    app.setBattery(20);
    await app.findChargers();
    expect(app.getState().blocked).toBe('location');
    expect(view(app).notice).toMatchObject({ text: "We couldn't get your location. Allow location access in your browser and try again.", retry: true });
    expect(deps.findNearest).not.toHaveBeenCalled();
  });
});
