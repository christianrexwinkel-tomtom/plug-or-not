import { describe, expect, it } from 'vitest';
import { firstMatchPrice, isStaticallyReadable, restrictionsMatch } from './tariff.ts';
import type { MinuteClock } from './clock.ts';
import { tariff } from '../../test/fixtures/prd-tariffs.ts';

const at = (hm: string, day: MinuteClock['day'] = 'FRIDAY', date = '2026-10-09'): MinuteClock => {
  const [h, m] = hm.split(':').map(Number);
  return { date, minuteOfDay: h! * 60 + m!, day };
};
const START = Date.parse('2026-10-09T08:00:00Z');

describe('restrictionsMatch', () => {
  it('matches a time window with start inclusive and end exclusive', () => {
    const r = { start_time: '16:00', end_time: '22:00' };
    expect(restrictionsMatch(r, at('15:59'), 0)).toBe(false);
    expect(restrictionsMatch(r, at('16:00'), 0)).toBe(true);
    expect(restrictionsMatch(r, at('21:59'), 0)).toBe(true);
    expect(restrictionsMatch(r, at('22:00'), 0)).toBe(false);
  });

  it('matches a window that wraps past midnight', () => {
    const r = { start_time: '21:00', end_time: '07:00' };
    expect(restrictionsMatch(r, at('23:30'), 0)).toBe(true);
    expect(restrictionsMatch(r, at('06:59'), 0)).toBe(true);
    expect(restrictionsMatch(r, at('07:00'), 0)).toBe(false);
  });

  it('matches day of week and dates (start inclusive, end exclusive)', () => {
    expect(restrictionsMatch({ day_of_week: ['SATURDAY', 'SUNDAY'] }, at('10:00', 'FRIDAY'), 0)).toBe(false);
    expect(restrictionsMatch({ day_of_week: ['SATURDAY', 'SUNDAY'] }, at('10:00', 'SATURDAY'), 0)).toBe(true);
    expect(restrictionsMatch({ start_date: '2026-10-10' }, at('10:00'), 0)).toBe(false);
    expect(restrictionsMatch({ end_date: '2026-10-09' }, at('10:00'), 0)).toBe(false);
    expect(restrictionsMatch({ end_date: '2026-10-10' }, at('10:00'), 0)).toBe(true);
  });

  it('reads min_duration and max_duration as elapsed session seconds', () => {
    expect(restrictionsMatch({ min_duration: 18_000 }, at('10:00'), 17_940)).toBe(false);
    expect(restrictionsMatch({ min_duration: 18_000 }, at('10:00'), 18_000)).toBe(true);
    expect(restrictionsMatch({ max_duration: 3_600 }, at('10:00'), 3_540)).toBe(true);
    expect(restrictionsMatch({ max_duration: 3_600 }, at('10:00'), 3_600)).toBe(false);
  });

  it('treats all-null restrictions as matching', () => {
    expect(restrictionsMatch({ start_time: null, end_time: null, day_of_week: null, min_duration: null }, at('03:00'), 0)).toBe(true);
  });
});

describe('firstMatchPrice', () => {
  it('takes the first element that carries the component and matches', () => {
    const t = tariff([
      { components: [['ENERGY', 0.5717]], restrictions: { start_time: '16:00', end_time: '22:00' } },
      { components: [['ENERGY', 0.5417], ['TIME', 0.41]] },
    ]);
    expect(firstMatchPrice(t, 'ENERGY', at('15:30'), 0)).toBe(0.5417);
    expect(firstMatchPrice(t, 'ENERGY', at('16:30'), 0)).toBe(0.5717);
    expect(firstMatchPrice(t, 'TIME', at('16:30'), 0)).toBe(0.41);
    expect(firstMatchPrice(t, 'PARKING_TIME', at('16:30'), 0)).toBeNull();
  });
});

describe('isStaticallyReadable (G5-AC4)', () => {
  const ok = tariff([{ components: [['ENERGY', 0.3]] }]);

  it('accepts a plain EUR tariff', () => {
    expect(isStaticallyReadable(ok, START)).toBe(true);
  });

  it.each(['min_kwh', 'max_kwh', 'min_current', 'max_current', 'min_power', 'max_power'] as const)(
    'rejects the unsupported restriction %s',
    (key) => {
      expect(isStaticallyReadable(tariff([{ components: [['ENERGY', 0.3]], restrictions: { [key]: 5 } }]), START)).toBe(false);
    },
  );

  it('rejects a reservation restriction', () => {
    expect(isStaticallyReadable(tariff([{ components: [['ENERGY', 0.3]], restrictions: { reservation: 'RESERVATION' } }]), START)).toBe(false);
  });

  it('rejects no elements, a non-EUR currency and a FLAT fee behind a min_duration', () => {
    expect(isStaticallyReadable(tariff([]), START)).toBe(false);
    expect(isStaticallyReadable({ ...ok, currency: 'GBP' }, START)).toBe(false);
    expect(isStaticallyReadable(tariff([
      { components: [['ENERGY', 0.3]] },
      { components: [['FLAT', 1]], restrictions: { min_duration: 3600 } },
    ]), START)).toBe(false);
  });

  it('rejects a validity period that does not cover the 24 hours from the start', () => {
    expect(isStaticallyReadable({ ...ok, start_date_time: '2026-10-09T09:00:00Z' }, START)).toBe(false);
    expect(isStaticallyReadable({ ...ok, end_date_time: '2026-10-10T07:59:00Z' }, START)).toBe(false);
    expect(isStaticallyReadable({ ...ok, start_date_time: '2026-01-01T00:00:00Z', end_date_time: '2026-10-10T08:00:00Z' }, START)).toBe(true);
  });
});
