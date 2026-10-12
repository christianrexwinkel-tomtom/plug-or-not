// Pins every view string to the PRD / solution-design wording, copied here as literals.
import { describe, expect, it } from 'vitest';
import * as m from './messages.ts';

describe('PRD error and notice wording', () => {
  it.each([
    ['LOCATION_DENIED', m.LOCATION_DENIED, "We couldn't get your location. Allow location access in your browser and try again, or drag the map to your spot."],
    ['LOCATION_DENIED_NO_MAP', m.LOCATION_DENIED_NO_MAP, "We couldn't get your location. Allow location access in your browser and try again."],
    ['MAP_FAILED', m.MAP_FAILED, "Map couldn't load."],
    ['YOUR_LOCATION', m.YOUR_LOCATION, 'Your location'],
    ['MOVED_SPOT', m.MOVED_SPOT, 'Moved spot'],
    ['NO_LOCATION', m.NO_LOCATION, 'No location yet'],
    ['MY_LOCATION', m.MY_LOCATION, 'My location'],
    ['MAP_HINT', m.MAP_HINT, 'Drag the map to adjust the spot'],
    ['SPOT_MAP_LABEL', m.SPOT_MAP_LABEL, 'Map of your spot. Drag to move the spot under the pin.'],
    ['OUTSIDE_NL', m.OUTSIDE_NL, 'Charger prices are available for the Netherlands only for now.'],
    ['LOCATING', m.LOCATING, 'Finding your location…'],
    ['APPROXIMATE', m.APPROXIMATE, 'Your location is approximate'],
    ['BATTERY_NOT_SET', m.BATTERY_NOT_SET, 'Enter your current battery level (0–100%).'],
    ['SETUP_MISSING', m.SETUP_MISSING, 'Set up your car first so we can calculate your costs.'],
    ['STAY_LIMITS', m.STAY_LIMITS, 'Stays can be 15 minutes to 24 hours.'],
    ['FINDING_CHARGERS', m.FINDING_CHARGERS, 'Finding chargers near you…'],
    ['LOAD_ERROR', m.LOAD_ERROR, "Couldn't load charger prices. Check your connection and try again."],
    ['TRY_AGAIN', m.TRY_AGAIN, 'Try again'],
    ['BATTERY_FULL', m.BATTERY_FULL, "Your battery is full, so there's nothing to charge here."],
    ['STORAGE_NOTICE', m.STORAGE_NOTICE, "Your settings won't be remembered in this browser. You can still use Plug or Not now."],
  ])('%s', (_name, actual, expected) => {
    expect(actual).toBe(expected);
  });

  it('data-date sentence matches the PRD example (G2-AC4)', () => {
    expect(m.dataDateSentence('2026-10-09T06:12:00.000Z')).toBe('Charger prices from NDW open data of 9 Oct 2026, 08:12');
  });
});
