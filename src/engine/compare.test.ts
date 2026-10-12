import { describe, expect, it } from 'vitest';
import { WINDOW_GRID, clampStay, outcomeAt, petrolCost, rank, worthItWindow, type Rankable } from './compare.ts';
import { buildCurve } from './curve.ts';
import { buildClock } from './clock.ts';
import { EXAMPLE_SETTINGS, TARIFFS, tariff } from '../../test/fixtures/prd-tariffs.ts';
import type { TileTariff } from '../shared/data-format.ts';

const START = Date.parse('2026-10-09T08:00:00Z');
const CLOCK = buildClock(START);
const curveFor = (t: TileTariff, battery: number) =>
  buildCurve({ tariff: t, chargerKw: 11, carKw: 3.6, roomKwh: 15 * (1 - battery / 100), cardStartFee: 0.89, cardMarkup: 0, startMs: START, clock: CLOCK })!;

describe('WINDOW_GRID (D-20)', () => {
  it('is 15 min, every 10 min from 20 min, plus every 15-minute slider stay, up to 24 h', () => {
    expect(WINDOW_GRID.slice(0, 8)).toEqual([15, 20, 30, 40, 45, 50, 60, 70]);
    expect(WINDOW_GRID.at(-1)).toBe(1440);
    for (let t = 15; t <= 1440; t += 15) expect(WINDOW_GRID).toContain(t);
  });
});

describe('clampStay (G7-AC3)', () => {
  it('keeps stays between 15 min and 24 h', () => {
    expect([clampStay(0), clampStay(15), clampStay(90), clampStay(1440), clampStay(1455)]).toEqual([15, 15, 90, 1440, 1440]);
  });
});

describe('petrolCost (FR-014)', () => {
  it('prices the distance the energy covers', () => {
    expect(petrolCost(2.7, EXAMPLE_SETTINGS)).toBeCloseTo(2.1591, 9);
  });
});

describe('worthItWindow', () => {
  it('Opcharge at 10%: 1h30 to 7h30', () => {
    expect(worthItWindow(curveFor(TARIFFS.opcharge, 10), EXAMPLE_SETTINGS)).toEqual({ shortest: 90, longest: 450, hasGaps: false });
  });

  it('Vattenfall Marconilaan at 10%: from 40 min up to 24 h', () => {
    expect(worthItWindow(curveFor(TARIFFS.vattenfall, 10), EXAMPLE_SETTINGS)).toEqual({ shortest: 40, longest: 1440, hasGaps: false });
  });

  it('E-Flux Laboratoriumstraat at 10%: none', () => {
    expect(worthItWindow(curveFor(TARIFFS.efluxLab, 10), EXAMPLE_SETTINGS)).toBeNull();
  });

  it('marks gaps when some stays inside the window are not worth it', () => {
    // Cheap first hour, an expensive second hour (€10/h while charging), cheap again until full at 40 kWh.
    const t = tariff([
      { components: [['ENERGY', 0.2], ['TIME', 0]], restrictions: { max_duration: 3600 } },
      { components: [['ENERGY', 0.2], ['TIME', 10]], restrictions: { max_duration: 7200 } },
      { components: [['ENERGY', 0.2]] },
    ]);
    const c = buildCurve({ tariff: t, chargerKw: 11, carKw: 3.6, roomKwh: 40, cardStartFee: 0, cardMarkup: 0, startMs: START, clock: CLOCK })!;
    expect(worthItWindow(c, EXAMPLE_SETTINGS)).toMatchObject({ shortest: 15, longest: 1440, hasGaps: true });
  });
});

describe('outcomeAt — verdict (G6-AC2)', () => {
  const opc = curveFor(TARIFFS.opcharge, 10);
  const win = worthItWindow(opc, EXAMPLE_SETTINGS);

  it('is "worth-it" when the unrounded saving is above 0', () => {
    expect(outcomeAt(opc, win, 90, EXAMPLE_SETTINGS)).toMatchObject({ verdict: 'worth-it' });
    expect(outcomeAt(opc, win, 90, EXAMPLE_SETTINGS).saving).toBeCloseTo(0.0136, 3);
  });

  it('is "not-for-this-stay" outside an existing window', () => {
    expect(outcomeAt(opc, win, 60, EXAMPLE_SETTINGS).verdict).toBe('not-for-this-stay');
  });

  it('is "never" without a window', () => {
    const c = curveFor(TARIFFS.efluxLab, 10);
    expect(outcomeAt(c, worthItWindow(c, EXAMPLE_SETTINGS), 90, EXAMPLE_SETTINGS).verdict).toBe('never');
  });

  it('carries cost, kWh, petrol cost and cost per km', () => {
    const c = curveFor(TARIFFS.vattenfall, 20);
    const o = outcomeAt(c, worthItWindow(c, EXAMPLE_SETTINGS), 45, EXAMPLE_SETTINGS);
    expect(o.kwh).toBeCloseTo(2.7, 9);
    expect(o.cost).toBeCloseTo(1.76915, 6);
    expect(o.petrolCost).toBeCloseTo(2.1591, 6);
    expect(o.costPerKm).toBeCloseTo(1.76915 / 10.8, 6);
  });
});

describe('rank (G6-AC3)', () => {
  const priced = (locationId: string, distanceM: number, saving: number, tariffKey = 'T:a'): Rankable => ({
    locationId, distanceM, tariffKey,
    outcome: { kind: 'priced', saving, cost: 0, kwh: 0, petrolCost: 0, costPerKm: 0, verdict: saving > 0 ? 'worth-it' : 'never' },
  });
  const unknown = (locationId: string, distanceM: number, reason: 'no-tariff' | 'no-power' | 'unreadable', tariffKey: string | null = null): Rankable => ({
    locationId, distanceM, tariffKey, outcome: { kind: 'unknown', reason },
  });
  const ids = (xs: Rankable[]) => rank(xs).map((x) => `${x.locationId}/${x.tariffKey}`);

  it('orders by saving, biggest first, then nearer, then tariff key, then location id', () => {
    expect(ids([
      priced('L1', 100, 0.5), priced('L2', 50, 0.5), priced('L3', 10, 0.9),
      priced('L4', 50, 0.5, 'T:0'), priced('L0', 50, 0.5, 'T:0'), priced('L5', 1, -2),
    ])).toEqual(['L3/T:a', 'L0/T:0', 'L4/T:0', 'L2/T:a', 'L1/T:a', 'L5/T:a']);
  });

  it('puts unknown entries last: by distance, no-tariff after other reasons, then tariff key, then location id', () => {
    expect(ids([
      unknown('U1', 10, 'no-tariff'), unknown('U2', 10, 'unreadable', 'T:b'), priced('P', 999, -5),
      unknown('U3', 5, 'no-tariff'), unknown('U4', 10, 'no-power', 'T:a'), unknown('U0', 10, 'no-tariff'),
    ])).toEqual(['P/T:a', 'U3/null', 'U4/T:a', 'U2/T:b', 'U0/null', 'U1/null']);
  });
});
