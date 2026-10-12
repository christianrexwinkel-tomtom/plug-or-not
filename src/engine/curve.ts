import type { PriceComponentType, TileTariff } from '../shared/data-format.ts';
import { SIM_MINUTES, type MinuteClock } from './clock.ts';
import { VAT, firstMatchPrice, hasComponent, isStaticallyReadable } from './tariff.ts';

/** Prices in force at minute 0, excluding VAT; 0 when no element matches. */
export interface StartPrices {
  energy: number;
  time: number;
  parking: number;
  flat: number;
}

export interface CostCurve {
  /** cost[T] = cumulative cost (€, incl. VAT and card fees, unrounded) of a stay of T minutes, T = 0…1440. */
  cost: Float64Array;
  /** kwh[T] = cumulative energy delivered after T minutes. */
  kwh: Float64Array;
  startPrices: StartPrices;
  /** True when some component's matching price at another minute differs from minute 0 (G6-AC6). */
  variesByTime: boolean;
}

export interface CurveInput {
  tariff: TileTariff;
  chargerKw: number;
  carKw: number;
  /** Room left in the battery: battery kWh × (1 − level). */
  roomKwh: number;
  /** Card fees as entered, including VAT (FR-012). */
  cardStartFee: number;
  cardMarkup: number;
  startMs: number;
  clock: MinuteClock[];
}

/** Order matters: index 3 is FLAT, read from `atStart[3]`. */
const TYPES: PriceComponentType[] = ['ENERGY', 'TIME', 'PARKING_TIME', 'FLAT'];
const FULL_EPSILON_KWH = 1e-9;

/** One 1,440-minute simulation (D-10); null when the tariff can't be fully interpreted (G5-AC4). */
export function buildCurve(input: CurveInput): CostCurve | null {
  const { tariff, clock } = input;
  if (!isStaticallyReadable(tariff, input.startMs)) return null;

  const atStart = TYPES.map((t) => firstMatchPrice(tariff, t, clock[0]!, 0));
  const flat = atStart[3]!;
  if (flat === null && hasComponent(tariff, 'FLAT', true)) return null;
  const hasEnergy = hasComponent(tariff, 'ENERGY');

  const perMinuteKwh = Math.min(input.carKw, input.chargerKw) / 60;
  const cost = new Float64Array(SIM_MINUTES + 1);
  const kwh = new Float64Array(SIM_MINUTES + 1);
  let variesByTime = false;
  let total = (flat ?? 0) * VAT + input.cardStartFee;
  let delivered = 0;
  cost[0] = total;

  for (let i = 0; i < SIM_MINUTES; i++) {
    const elapsedS = i * 60;
    const prices = TYPES.map((t) => firstMatchPrice(tariff, t, clock[i]!, elapsedS));
    if (prices.some((p, k) => p !== atStart[k])) variesByTime = true;
    const [energyPrice, timePrice, parkingPrice] = prices;

    const left = input.roomKwh - delivered;
    const charging = left > FULL_EPSILON_KWH;
    if (charging) {
      if (energyPrice === null && hasEnergy) return null;
      const e = Math.min(perMinuteKwh, left);
      total += e * ((energyPrice ?? 0) * VAT + input.cardMarkup);
      total += ((timePrice ?? 0) * VAT) / 60;
      delivered += e;
    } else {
      total += ((parkingPrice ?? 0) * VAT) / 60;
    }
    cost[i + 1] = total;
    kwh[i + 1] = delivered;
  }

  return {
    cost,
    kwh,
    startPrices: {
      energy: atStart[0] ?? 0,
      time: atStart[1] ?? 0,
      parking: atStart[2] ?? 0,
      flat: atStart[3] ?? 0,
    },
    variesByTime,
  };
}
