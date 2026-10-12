// Every PRD / solution-design error and notice string the views show, in one place so a test can pin the wording.
import { dataDate } from './format.ts';

/** PRD S2 "Location outside the Netherlands" / G3 outside coverage. */
export const OUTSIDE_NL = 'Charger prices are available for the Netherlands only for now.';
/** G3-AC1, while the browser location API answers. */
export const LOCATING = 'Finding your location…';
/** G3-AC1 denied / unavailable / timed out (PRD S2 error table). */
export const LOCATION_DENIED = "We couldn't get your location. Allow location access in your browser and try again, or drag the map to your spot.";
/** G6-AC9: the denied notice when the map can't load, so it doesn't point at a map that isn't there. */
export const LOCATION_DENIED_NO_MAP = "We couldn't get your location. Allow location access in your browser and try again.";
/** G6-AC9, PRD S2 error table "Map can't load". */
export const MAP_FAILED = "Map couldn't load.";
/** G3-AC3 chip on the spot map: the unmoved browser position (UI mockup wording). */
export const YOUR_LOCATION = 'Your location';
/** G3-AC3 chip once the map has been dragged. */
export const MOVED_SPOT = 'Moved spot';
/** G3-AC1 chip with location denied and the map unmoved. */
export const NO_LOCATION = 'No location yet';
/** G3-AC3 button that returns to the browser position (UI mockup wording). */
export const MY_LOCATION = 'My location';
/** Hint at the bottom of the spot map (UI mockup wording; not a PRD string). */
export const MAP_HINT = 'Drag the map to adjust the spot';
/** Accessible name of the spot map (not a PRD string). */
export const SPOT_MAP_LABEL = 'Map of your spot. Drag to move the spot under the pin.';
/** G6-AC8 link in the results top bar, back to the parked view (UI mockup wording). */
export const CHANGE_SPOT = 'Change spot';
/** Accessible name of the blue dot on the results map (UI mockup wording; not a PRD string). */
export const YOUR_SPOT = 'Your spot';
/** Accessible name of the results map (not a PRD string). */
export const RESULTS_MAP_LABEL = 'Map of the nearest chargers. Tap a pin to see its details.';
/** G3-AC2, accuracy worse than 1 km (also repeated on the results). */
export const APPROXIMATE = 'Your location is approximate';
/** Results line under the approximate notice (UI mockup wording; not a PRD string). */
export const APPROXIMATE_RESULTS = 'Results are for the reported spot.';
/** G7-AC1, "Find chargers" with the battery slider unset. */
export const BATTERY_NOT_SET = 'Enter your current battery level (0–100%).';
/** G7-AC1, settings missing. */
export const SETUP_MISSING = 'Set up your car first so we can calculate your costs.';
/** G7-AC3, − or + at a stay limit. */
export const STAY_LIMITS = 'Stays can be 15 minutes to 24 hours.';
/** G7-AC5, while tiles and curves are resolved. */
export const FINDING_CHARGERS = 'Finding chargers near you…';
/** G4-AC3, a tile or the manifest can't be loaded. */
export const LOAD_ERROR = "Couldn't load charger prices. Check your connection and try again.";
/** Button next to the load error and the denied-location notice. */
export const TRY_AGAIN = 'Try again';
/** G6-AC4, battery at 100%. */
export const BATTERY_FULL = "Your battery is full, so there's nothing to charge here.";
/** G1-AC3, storage throws. */
export const STORAGE_NOTICE = "Your settings won't be remembered in this browser. You can still use Plug or Not now.";
/** G2-AC4, the part before the date. */
export const DATA_DATE_PREFIX = 'Charger prices from NDW open data of ';

/** G2-AC4: "Charger prices from NDW open data of 9 Oct 2026, 08:12". */
export function dataDateSentence(iso: string): string {
  return `${DATA_DATE_PREFIX}${dataDate(iso)}`;
}
