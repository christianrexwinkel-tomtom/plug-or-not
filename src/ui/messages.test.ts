// Pins every view string to the PRD / solution-design wording, copied here as literals.
import { describe, expect, it } from 'vitest';
import * as m from './messages.ts';

describe('PRD error and notice wording', () => {
  it.each([
    ['LOCATION_DENIED (approved Slice 1 interim text)', m.LOCATION_DENIED, "We couldn't get your location. Allow location access in your browser and try again."],
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
