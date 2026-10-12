// What the map on the results screen shows, read from app state (G6-AC8, G6-AC9, FR-024). Pure, so Vitest pins it.
import type { AppState } from '../app.ts';
import type { RankedEntry } from '../engine/results.ts';
import type { IconName } from './dom.ts';
import { VERDICT_TEXT, verdictKind, type VerdictKind } from './entry-view.ts';
import { amountChip, coords, savingPhrase } from './format.ts';
import { boundsOf, type Bounds } from './map-core.ts';
import { MAP_FAILED, MOVED_SPOT, YOUR_LOCATION } from './messages.ts';

/** FR-024: ✓ for "Worth it", a clock for "Not worth it for this stay", ✕ for "Never worth it", ? for "Price unknown". */
export const VERDICT_ICON: Record<VerdictKind, IconName> = {
  'worth-it': 'check', 'not-for-this-stay': 'clock', never: 'cross', unknown: 'question',
};
/** FR-024: green, red for both "not worth it" verdicts, grey and dashed for "Price unknown". */
export const VERDICT_TONE: Record<VerdictKind, 'w' | 'n' | 'u'> = {
  'worth-it': 'w', 'not-for-this-stay': 'n', never: 'n', unknown: 'u',
};

export interface PinView {
  locationId: string;
  /** The entry a tap selects: the location's best-ranked one. */
  entryId: string;
  lat: number;
  lon: number;
  tone: 'w' | 'n' | 'u';
  icon: IconName;
  /** "€4.23", "−€0.82" or "<€0.01"; empty for "Price unknown", whose pin shows only its icon. */
  label: string;
  /** "×2" when the location has more than one entry. */
  count: string | null;
  /** The selected entry is at this location. */
  selected: boolean;
  ariaLabel: string;
}

export interface ResultsMapView {
  pins: PinView[];
  /** The searched spot, shown as a blue dot. */
  spot: { lat: number; lon: number } | null;
  /** "Your location" or "Moved spot", for the spot line in the top bar. */
  spotLabel: string | null;
  spotCoords: string | null;
  /** The spot and every pin, to frame; null without pins. */
  bounds: Bounds | null;
  /** Changes only with a new search or when the pins appear or go, so a stay change never reframes the map. */
  frameKey: string;
  mapMessage: string | null;
}

/** One pin per location, in ranking order; the ranking is best first, so a location's first entry is its best. */
export function pinViews(ranked: RankedEntry[], selectedId: string | null): PinView[] {
  const selectedLocation = ranked.find((e) => e.id === selectedId)?.locationId ?? null;
  const counts = new Map<string, number>();
  for (const e of ranked) counts.set(e.locationId, (counts.get(e.locationId) ?? 0) + 1);
  const seen = new Set<string>();
  const pins: PinView[] = [];
  for (const e of ranked) {
    if (seen.has(e.locationId)) continue;
    seen.add(e.locationId);
    const verdict = verdictKind(e.outcome);
    const n = counts.get(e.locationId) ?? 1;
    const more = n - 1;
    const saving = e.outcome.kind === 'priced' ? e.outcome.saving : null;
    const loc = e.entry.location;
    pins.push({
      locationId: e.locationId,
      entryId: e.id,
      lat: loc.lat,
      lon: loc.lon,
      tone: VERDICT_TONE[verdict],
      icon: VERDICT_ICON[verdict],
      label: saving === null ? '' : amountChip(saving),
      count: n > 1 ? `×${n}` : null,
      selected: e.locationId === selectedLocation,
      ariaLabel: `${e.rank}. ${loc.operator}, ${loc.address}: ${VERDICT_TEXT[verdict]}`
        + (saving === null ? '' : `, ${savingPhrase(saving)}`)
        + (more > 0 ? `, and ${more} more ${more > 1 ? 'prices' : 'price'} here` : ''),
    });
  }
  return pins;
}

export function resultsMapView(state: AppState): ResultsMapView {
  const searched = state.searchedSpot;
  const spot = searched ? { lat: searched.lat, lon: searched.lon } : null;
  // G6-AC9: without a map there are no pins; the details panel and the ranked strip still show everything.
  const pins = state.mapFailed ? [] : pinViews(state.results, state.selectedId);
  return {
    pins,
    spot,
    spotLabel: searched === null ? null : searched.kind === 'moved' ? MOVED_SPOT : YOUR_LOCATION,
    spotCoords: spot ? coords(spot.lat, spot.lon) : null,
    bounds: spot && pins.length > 0 ? boundsOf([spot, ...pins]) : null,
    frameKey: `${spot ? `${spot.lat},${spot.lon}` : ''}|${pins.map((p) => p.locationId).sort().join(',')}`,
    mapMessage: state.mapFailed ? MAP_FAILED : null,
  };
}
