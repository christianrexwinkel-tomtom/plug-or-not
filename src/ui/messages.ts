// Every PRD / solution-design error and notice string the views show, in one place so a test can pin the wording.
import { dataDate } from './format.ts';

/** PRD S2 "Location outside the Netherlands" / G3 outside coverage. */
export const OUTSIDE_NL = 'Charger prices are available for the Netherlands only for now.';
/** G3-AC1, while the browser location API answers. */
export const LOCATING = 'Finding your location…';
/** G3-AC1 denied / unavailable / timed out — Slice 1 interim wording without the map clause (plan, Deviations from Design). */
export const LOCATION_DENIED = "We couldn't get your location. Allow location access in your browser and try again.";
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
