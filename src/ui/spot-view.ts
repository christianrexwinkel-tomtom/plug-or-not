// What the map area on the parked screen shows, read from app state (G3-AC1–AC4, G6-AC9). Pure, so Vitest pins it.
import { spotFor, type AppState } from '../app.ts';
import { NL_CENTRE } from '../services/location.ts';
import { coords } from './format.ts';
import { spotZoom } from './map-core.ts';
import { APPROXIMATE, LOCATION_DENIED, LOCATION_DENIED_NO_MAP, MAP_FAILED, MOVED_SPOT, NO_LOCATION, OUTSIDE_NL, YOUR_LOCATION } from './messages.ts';

export interface SpotNotice {
  tone: 'info' | 'bad';
  role: 'status' | 'alert';
  text: string;
  /** Show "Try again" (G3-AC1). */
  retry: boolean;
}

export interface SpotView {
  notice: SpotNotice | null;
  /** A refused "Find chargers" tap or an outside answer highlights the notice and the map (G3-AC1, G3-AC4). */
  highlight: boolean;
  /** Where the map should be; null for a moved spot, so the map stays where the driver put it. */
  centre: { lat: number; lon: number; zoom: number } | null;
  /** Blue on a spot; grey with no spot yet. */
  pin: 'me' | 'none';
  /** "Your location", "Moved spot" or "No location yet"; null while locating. */
  chipLabel: string | null;
  chipCoords: string | null;
  /** Show "My location". */
  recentre: boolean;
  /** "Finding your location…" over the map. */
  busy: boolean;
  draggable: boolean;
  /** The accuracy circle's radius, for an unmoved approximate position (G3-AC2). */
  accuracyM: number | null;
  mapMessage: string | null;
}

function spotNotice(state: AppState, approximate: boolean): SpotNotice | null {
  if (state.search === 'outside-nl') return { tone: 'bad', role: 'alert', text: OUTSIDE_NL, retry: false };
  if (state.location.status === 'denied') {
    // G6-AC9: without a map there's nothing to drag, so the notice asks only for location access.
    return { tone: 'bad', role: 'alert', text: state.mapFailed ? LOCATION_DENIED_NO_MAP : LOCATION_DENIED, retry: true };
  }
  if (approximate) return { tone: 'info', role: 'status', text: APPROXIMATE, retry: false };
  return null;
}

export function spotView(state: AppState): SpotView {
  const spot = spotFor(state);
  const locating = state.location.status === 'locating';
  return {
    notice: spotNotice(state, spot.kind === 'browser' && spot.approximate),
    highlight: state.blocked === 'location' || state.search === 'outside-nl',
    centre: spot.kind === 'moved'
      ? null
      : spot.kind === 'browser'
        ? { lat: spot.lat, lon: spot.lon, zoom: spotZoom(spot.accuracyM, spot.lat) }
        : { lat: NL_CENTRE.lat, lon: NL_CENTRE.lon, zoom: NL_CENTRE.zoom },
    pin: spot.kind === 'none' ? 'none' : 'me',
    chipLabel: locating ? null : spot.kind === 'moved' ? MOVED_SPOT : spot.kind === 'browser' ? YOUR_LOCATION : NO_LOCATION,
    chipCoords: spot.kind === 'none' ? null : coords(spot.lat, spot.lon),
    recentre: spot.kind === 'moved' && state.location.status === 'found',
    busy: locating,
    draggable: !locating && !state.mapFailed,
    accuracyM: spot.kind === 'browser' && spot.approximate ? spot.accuracyM : null,
    mapMessage: state.mapFailed ? MAP_FAILED : null,
  };
}
