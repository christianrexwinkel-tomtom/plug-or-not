import type { RankedEntry } from '../engine/results.ts';
import type { Outcome, UnknownReason, Verdict } from '../engine/compare.ts';
import { amountChip, metres, priceLine, savingPhrase, savingSentence, windowSentence } from './format.ts';

export type VerdictKind = Verdict | 'unknown';

/** The verdict an entry shows: its priced verdict, or "Price unknown". */
export function verdictKind(outcome: Outcome): VerdictKind {
  return outcome.kind === 'priced' ? outcome.verdict : 'unknown';
}

export const VERDICT_TEXT: Record<VerdictKind, string> = {
  'worth-it': 'Worth it',
  'not-for-this-stay': 'Not worth it for this stay',
  never: 'Never worth it',
  unknown: 'Price unknown',
};

export const REASON_TEXT: Record<UnknownReason, string> = {
  'no-tariff': 'No price published for this charger.',
  'no-power': "Charging power isn't published for this charger.",
  unreadable: 'The published price is incomplete or can\'t be read.',
};

export interface AlsoHere {
  id: string;
  text: string;
}

/** Everything the details panel and the ranked strip show for one entry. */
export interface EntryView {
  id: string;
  verdict: VerdictKind;
  verdictText: string;
  rankText: string;
  distanceText: string;
  operator: string;
  address: string;
  /** Null for "Price unknown" entries (G6-AC7). */
  savingText: string | null;
  priceText: string | null;
  /** G6-AC1 window sentence; null for "Price unknown" entries (G6-AC7). */
  windowText: string | null;
  /** A window exists: the line gets the calendar icon instead of the cross. */
  hasWindow: boolean;
  reasonText: string | null;
  alsoHere: AlsoHere[];
  chipText: string;
  stripText: string;
}

export function entryViews(ranked: RankedEntry[]): EntryView[] {
  return ranked.map((e) => {
    const verdict = verdictKind(e.outcome);
    const others = ranked.filter((o) => o.locationId === e.locationId && o.id !== e.id);
    const loc = e.entry.location;
    const priced = e.outcome.kind === 'priced' ? e.outcome : null;
    const curve = e.entry.curve;
    return {
      id: e.id,
      verdict,
      verdictText: VERDICT_TEXT[verdict],
      rankText: `#${e.rank} of ${ranked.length} · best saving first`,
      distanceText: metres(e.distanceM),
      operator: loc.operator,
      address: `${loc.address}, ${loc.city}`,
      savingText: priced ? savingSentence(priced.saving, priced.petrolCost) : null,
      priceText: priced && curve ? priceLine(curve.startPrices, curve.variesByTime, priced.cost) : null,
      windowText: priced ? windowSentence(e.entry.window) : null,
      hasWindow: priced !== null && e.entry.window !== null,
      reasonText: e.outcome.kind === 'unknown' ? REASON_TEXT[e.outcome.reason] : null,
      alsoHere: others.map((o) => {
        const ov = verdictKind(o.outcome);
        const amount = o.outcome.kind === 'priced' ? savingPhrase(o.outcome.saving) : '';
        return { id: o.id, text: `Also here: ${VERDICT_TEXT[ov]}${amount ? ` · ${amount}` : ''}` };
      }),
      chipText: priced ? amountChip(priced.saving) : 'Unknown',
      stripText: `${e.rank}. ${loc.address}`,
    };
  });
}
