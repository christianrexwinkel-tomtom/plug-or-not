import { SIM_MINUTES } from './clock.ts';
import type { CostCurve } from './curve.ts';

export const STAY_MIN = 15;
export const STAY_MAX = SIM_MINUTES;
export const STAY_STEP = 15;
export const STAY_DEFAULT = 90;

/** Keeps a stay within 15 min–24 h (G7-AC3). */
export function clampStay(min: number): number {
  return Math.min(STAY_MAX, Math.max(STAY_MIN, min));
}

/** Stays checked for the window: 15 min, every 10 min from 20 min, and every slider stay (D-20). */
export const WINDOW_GRID: number[] = (() => {
  const grid = new Set<number>([STAY_MIN]);
  for (let t = 20; t <= STAY_MAX; t += 10) grid.add(t);
  for (let t = STAY_MIN; t <= STAY_MAX; t += STAY_STEP) grid.add(t);
  return [...grid].sort((a, b) => a - b);
})();

export interface PetrolSettings {
  kwhPerKm: number;
  kmPerL: number;
  petrolPrice: number;
}

export interface Window {
  shortest: number;
  longest: number;
  /** Some grid stay between shortest and longest is not worth it. */
  hasGaps: boolean;
}

export type Verdict = 'worth-it' | 'not-for-this-stay' | 'never';
export type UnknownReason = 'no-tariff' | 'no-power' | 'unreadable';

export interface PricedOutcome {
  kind: 'priced';
  cost: number;
  kwh: number;
  petrolCost: number;
  /** petrolCost − cost, unrounded (D-19). */
  saving: number;
  costPerKm: number;
  verdict: Verdict;
}

export interface UnknownOutcome {
  kind: 'unknown';
  reason: UnknownReason;
}

export type Outcome = PricedOutcome | UnknownOutcome;

/** FR-014: petrol for the distance the added energy covers. */
export function petrolCost(kwh: number, s: PetrolSettings): number {
  return (kwh / s.kwhPerKm / s.kmPerL) * s.petrolPrice;
}

export function savingAt(curve: CostCurve, stayMin: number, s: PetrolSettings): number {
  return petrolCost(curve.kwh[stayMin]!, s) - curve.cost[stayMin]!;
}

/** Shortest and longest grid stay with saving > 0 (unrounded, D-19); null when there is none. */
export function worthItWindow(curve: CostCurve, s: PetrolSettings): Window | null {
  const worth = WINDOW_GRID.filter((t) => savingAt(curve, t, s) > 0);
  if (worth.length === 0) return null;
  const shortest = worth[0]!;
  const longest = worth[worth.length - 1]!;
  const span = WINDOW_GRID.filter((t) => t >= shortest && t <= longest).length;
  return { shortest, longest, hasGaps: span !== worth.length };
}

export function outcomeAt(
  curve: CostCurve,
  window: Window | null,
  stayMin: number,
  s: PetrolSettings,
): PricedOutcome {
  const kwh = curve.kwh[stayMin]!;
  const cost = curve.cost[stayMin]!;
  const petrol = petrolCost(kwh, s);
  const saving = petrol - cost;
  const km = kwh / s.kwhPerKm;
  const verdict: Verdict = saving > 0 ? 'worth-it' : window ? 'not-for-this-stay' : 'never';
  return { kind: 'priced', cost, kwh, petrolCost: petrol, saving, costPerKm: km > 0 ? cost / km : 0, verdict };
}

export interface Rankable {
  locationId: string;
  distanceM: number;
  tariffKey: string | null;
  outcome: Outcome;
}

function byText(a: string | null, b: string | null): number {
  const x = a ?? '';
  const y = b ?? '';
  return x < y ? -1 : x > y ? 1 : 0;
}

/** G6-AC3 ordering. Returns a new array. */
export function rank<T extends Rankable>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const pa = a.outcome;
    const pb = b.outcome;
    if (pa.kind === 'priced' && pb.kind === 'priced') {
      if (pa.saving !== pb.saving) return pb.saving - pa.saving;
      if (a.distanceM !== b.distanceM) return a.distanceM - b.distanceM;
    } else if (pa.kind !== pb.kind) {
      return pa.kind === 'priced' ? -1 : 1;
    } else if (pa.kind === 'unknown' && pb.kind === 'unknown') {
      if (a.distanceM !== b.distanceM) return a.distanceM - b.distanceM;
      const na = pa.reason === 'no-tariff' ? 1 : 0;
      const nb = pb.reason === 'no-tariff' ? 1 : 0;
      if (na !== nb) return na - nb;
    }
    return byText(a.tariffKey, b.tariffKey) || byText(a.locationId, b.locationId);
  });
}
