import type { TileEntry, TileLocation, TileTariff } from '../shared/data-format.ts';
import { buildClock } from './clock.ts';
import { buildCurve, type CostCurve } from './curve.ts';
import {
  outcomeAt, rank, worthItWindow,
  type Outcome, type PetrolSettings, type UnknownReason, type Window,
} from './compare.ts';

export interface EngineSettings extends PetrolSettings {
  batteryKwh: number;
  chargeKw: number;
  cardStartFee: number;
  cardMarkup: number;
}

export interface NearbyLocation {
  location: TileLocation;
  distanceM: number;
}

/** One tariff entry with its cost curve, computed once per search (G7-AC4). */
export interface ComputedEntry {
  id: string;
  location: TileLocation;
  distanceM: number;
  tariffKey: string | null;
  curve: CostCurve | null;
  window: Window | null;
  reason: UnknownReason | null;
}

export interface RankedEntry {
  id: string;
  locationId: string;
  distanceM: number;
  tariffKey: string | null;
  outcome: Outcome;
  entry: ComputedEntry;
  /** 1-based position in the ranking. */
  rank: number;
}

export function entryId(location: TileLocation, entry: TileEntry): string {
  return `${location.id}#${entry.tariffKey ?? 'no-tariff'}`;
}

export function computeEntries(
  nearby: NearbyLocation[],
  tariffs: Record<string, TileTariff>,
  settings: EngineSettings,
  batteryPct: number,
  startMs: number,
): ComputedEntry[] {
  const clock = buildClock(startMs);
  const roomKwh = settings.batteryKwh * (1 - batteryPct / 100);
  return nearby.flatMap(({ location, distanceM }) =>
    location.entries.map((entry): ComputedEntry => {
      const base = { id: entryId(location, entry), location, distanceM, tariffKey: entry.tariffKey };
      if (entry.unknown) return { ...base, curve: null, window: null, reason: entry.unknown };
      const tariff = entry.tariffKey ? tariffs[entry.tariffKey] : undefined;
      if (!tariff || entry.powerKw === null) return { ...base, curve: null, window: null, reason: 'unreadable' };
      const curve = buildCurve({
        tariff,
        chargerKw: entry.powerKw,
        carKw: settings.chargeKw,
        roomKwh,
        cardStartFee: settings.cardStartFee,
        cardMarkup: settings.cardMarkup,
        startMs,
        clock,
      });
      if (!curve) return { ...base, curve: null, window: null, reason: 'unreadable' };
      return { ...base, curve, window: worthItWindow(curve, settings), reason: null };
    }),
  );
}

/** Reads every curve at the chosen stay and ranks (no engine run, G7-AC4). */
export function rankAtStay(entries: ComputedEntry[], stayMin: number, settings: PetrolSettings): RankedEntry[] {
  const items = entries.map((entry) => ({
    id: entry.id,
    locationId: entry.location.id,
    distanceM: entry.distanceM,
    tariffKey: entry.tariffKey,
    entry,
    rank: 0,
    outcome: entry.curve
      ? outcomeAt(entry.curve, entry.window, stayMin, settings)
      : ({ kind: 'unknown', reason: entry.reason ?? 'unreadable' } as Outcome),
  }));
  return rank(items).map((item, i) => ({ ...item, rank: i + 1 }));
}
