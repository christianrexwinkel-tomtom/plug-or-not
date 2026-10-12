import { describe, expect, it } from 'vitest';
import { buildCurve, type CurveInput } from './curve.ts';
import { buildClock } from './clock.ts';
import { TARIFFS, tariff } from '../../test/fixtures/prd-tariffs.ts';
import type { TileTariff } from '../shared/data-format.ts';

const START = Date.parse('2026-10-09T08:00:00Z'); // 10:00 Amsterdam
const CLOCK = buildClock(START);

function input(t: TileTariff, over: Partial<CurveInput> = {}): CurveInput {
  return { tariff: t, chargerKw: 22, carKw: 3.6, roomKwh: 12, cardStartFee: 0, cardMarkup: 0, startMs: START, clock: CLOCK, ...over };
}

describe('buildCurve — energy (G5-AC2)', () => {
  it('uses the car speed when the charger is faster (22 kW charger, 3.6 kW car)', () => {
    expect(buildCurve(input(TARIFFS.flat30))!.kwh[60]).toBeCloseTo(3.6, 9);
  });

  it('uses the charger speed when the car is faster (11 kW car, 3.7 kW charger)', () => {
    expect(buildCurve(input(TARIFFS.flat30, { carKw: 11, chargerKw: 3.7 }))!.kwh[60]).toBeCloseTo(3.7, 9);
  });

  it('stops at the room left in the battery (90% of 15 kWh → 1.5 kWh)', () => {
    const c = buildCurve(input(TARIFFS.flat30, { roomKwh: 15 * (1 - 0.9) }))!;
    expect(c.kwh[1440]).toBeCloseTo(1.5, 9);
    expect(c.kwh[25]).toBeCloseTo(1.5, 9);
  });

  it('adds VAT to tariff prices and card fees as entered', () => {
    const c = buildCurve(input(TARIFFS.flat30, { cardStartFee: 0.89, cardMarkup: 0.05 }))!;
    expect(c.cost[0]).toBeCloseTo(0.89, 9);
    expect(c.cost[60]).toBeCloseTo(0.89 + 3.6 * (0.3 * 1.21 + 0.05), 9);
  });

  it('bills TIME while charging and PARKING_TIME only after full, per minute', () => {
    const t = tariff([{ components: [['TIME', 0.6], ['PARKING_TIME', 1.2]] }]);
    const c = buildCurve(input(t, { roomKwh: 0.6 }))!; // full after 10 min at 3.6 kW
    expect(c.cost[10]).toBeCloseTo(10 * (0.6 * 1.21) / 60, 9);
    expect(c.cost[20]! - c.cost[10]!).toBeCloseTo(10 * (1.2 * 1.21) / 60, 9);
  });

  it('does not bill an extra charging minute for floating-point dust once full', () => {
    const t = tariff([{ components: [['ENERGY', 0.3], ['TIME', 1.2]] }]);
    const c = buildCurve(input(t, { roomKwh: 15 * 0.8 }))!; // 12 kWh, full at exactly 200 min
    expect(c.cost[201]).toBe(c.cost[200]);
  });
});

describe('buildCurve — time windows in Amsterdam time (G5-AC3)', () => {
  it('prices an overnight stay from 21:00 with the night rate across midnight', () => {
    const t = tariff([
      { components: [['ENERGY', 0.2]], restrictions: { start_time: '21:00', end_time: '07:00' } },
      { components: [['ENERGY', 0.4]] },
    ]);
    const start = Date.parse('2026-10-09T19:00:00Z'); // 21:00 Amsterdam; process runs in New York time
    const c = buildCurve(input(t, { startMs: start, clock: buildClock(start), roomKwh: 40, carKw: 1.2 }))!;
    expect(c.cost[600]).toBeCloseTo(10 * 1.2 * 0.2 * 1.21, 9); // 21:00–07:00
    expect(c.cost[660]! - c.cost[600]!).toBeCloseTo(1.2 * 0.4 * 1.21, 9); // 07:00–08:00
    expect(c.variesByTime).toBe(true);
  });
});

describe('buildCurve — start prices', () => {
  it('reports the components in force at minute 0, excluding VAT', () => {
    const c = buildCurve(input(TARIFFS.opcharge))!;
    expect(c.startPrices).toEqual({ energy: 0.43, time: 0, parking: 0.5, flat: 0.5 });
    expect(c.variesByTime).toBe(false);
  });

  it('flags a price that only applies after some duration', () => {
    const t = tariff([
      { components: [['PARKING_TIME', 1]], restrictions: { min_duration: 18_000 } },
      { components: [['ENERGY', 0.3]] },
    ]);
    expect(buildCurve(input(t))!.variesByTime).toBe(true);
  });
});

describe('buildCurve — "unknown" causes found while simulating (G5-AC4)', () => {
  it('rejects a non-zero FLAT fee that no element applies at minute 0', () => {
    const t = tariff([
      { components: [['ENERGY', 0.3]] },
      { components: [['FLAT', 1]], restrictions: { start_time: '18:00', end_time: '23:00' } },
    ]);
    expect(buildCurve(input(t))).toBeNull();
  });

  it('rejects an ENERGY gap during charging', () => {
    const t = tariff([{ components: [['ENERGY', 0.3]], restrictions: { start_time: '07:00', end_time: '12:00' } }]);
    expect(buildCurve(input(t, { roomKwh: 40, carKw: 1 }))).toBeNull();
  });

  it('accepts a tariff with no ENERGY component at all (time-only pricing)', () => {
    expect(buildCurve(input(TARIFFS.allego))).not.toBeNull();
  });

  it('accepts an ENERGY window that only fails after the battery is full', () => {
    const t = tariff([{ components: [['ENERGY', 0.3]], restrictions: { start_time: '07:00', end_time: '12:00' } }]);
    expect(buildCurve(input(t, { roomKwh: 3.6 }))).not.toBeNull(); // full at 11:00
  });

  it('rejects a statically unreadable tariff', () => {
    expect(buildCurve(input({ ...TARIFFS.flat30, currency: 'USD' }))).toBeNull();
  });
});
