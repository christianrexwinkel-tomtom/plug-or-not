import { describe, expect, it } from 'vitest';
import { createApp, type AppState } from '../app.ts';
import { SPOT_ZOOM } from './map-core.ts';
import { spotView } from './spot-view.ts';
import { APPROXIMATE, LOCATION_DENIED, LOCATION_DENIED_NO_MAP, MAP_FAILED, MOVED_SPOT, NO_LOCATION, OUTSIDE_NL, YOUR_LOCATION } from './messages.ts';
import { NUENEN, stubDeps } from '../../test/fixtures/app-deps.ts';

const base: AppState = createApp(stubDeps()).getState();
const at = (patch: Partial<AppState>): AppState => ({ ...base, view: 'parked', ...patch });
const found = (accuracyM = 20): AppState['location'] => ({
  status: 'found', position: { ...NUENEN, accuracyM },
});
const NL_MAP = { lat: 52.13, lon: 5.29, zoom: 7 };

describe('spotView (G3-AC1–AC4, G6-AC9)', () => {
  it('while locating: the overlay, no chip, no dragging, and the map on the centre of the Netherlands', () => {
    expect(spotView(at({ location: { status: 'locating' } }))).toEqual({
      notice: null, highlight: false, centre: NL_MAP, pin: 'none', chipLabel: null, chipCoords: null,
      recentre: false, busy: true, draggable: false, accuracyM: null, mapMessage: null,
    });
  });

  it('found: the browser position at street level, "Your location" with its coordinates', () => {
    expect(spotView(at({ location: found() }))).toMatchObject({
      notice: null, centre: { lat: 51.4436, lon: 5.5519, zoom: SPOT_ZOOM }, pin: 'me',
      chipLabel: YOUR_LOCATION, chipCoords: '51.4436, 5.5519', recentre: false, busy: false, draggable: true, accuracyM: null,
    });
  });

  it('approximate: the notice, the accuracy circle and a wider zoom (G3-AC2)', () => {
    const v = spotView(at({ location: found(1500) }));
    expect(v).toMatchObject({ notice: { tone: 'info', text: APPROXIMATE, retry: false }, accuracyM: 1500, chipLabel: YOUR_LOCATION });
    expect(v.centre!.zoom).toBeLessThan(SPOT_ZOOM);
  });

  it('moved: "Moved spot" with its coordinates, "My location", and the map left where the driver put it (G3-AC3)', () => {
    expect(spotView(at({ location: found(1500), movedSpot: { lat: 51.45, lon: 5.56 } }))).toMatchObject({
      notice: null, centre: null, pin: 'me', chipLabel: MOVED_SPOT, chipCoords: '51.4500, 5.5600', recentre: true, accuracyM: null,
    });
  });

  it('denied: grey pin, "No location yet", no "My location", and the notice with "Try again" pointing to the map', () => {
    expect(spotView(at({ location: { status: 'denied' } }))).toMatchObject({
      notice: { tone: 'bad', role: 'alert', text: LOCATION_DENIED, retry: true },
      centre: NL_MAP, pin: 'none', chipLabel: NO_LOCATION, chipCoords: null, recentre: false, draggable: true,
    });
  });

  it('denied, then moved: "Moved spot" without "My location"', () => {
    expect(spotView(at({ location: { status: 'denied' }, movedSpot: { lat: 51.45, lon: 5.56 } }))).toMatchObject({
      pin: 'me', chipLabel: MOVED_SPOT, recentre: false, notice: { text: LOCATION_DENIED },
    });
  });

  it('outside the Netherlands: the message and the highlight, with the map still draggable (G3-AC4)', () => {
    expect(spotView(at({ location: found(), movedSpot: { lat: 50.8467, lon: 4.3525 }, search: 'outside-nl' }))).toMatchObject({
      notice: { tone: 'bad', role: 'alert', text: OUTSIDE_NL, retry: false }, highlight: true, draggable: true,
    });
  });

  it('map failed: "Map couldn\'t load." and no dragging; with location denied too, the notice drops the map clause (G6-AC9)', () => {
    expect(spotView(at({ location: found(), mapFailed: true }))).toMatchObject({
      mapMessage: MAP_FAILED, draggable: false, chipLabel: YOUR_LOCATION,
    });
    expect(spotView(at({ location: { status: 'denied' }, mapFailed: true, blocked: 'location' }))).toMatchObject({
      notice: { text: LOCATION_DENIED_NO_MAP, retry: true }, highlight: true,
    });
  });
});
