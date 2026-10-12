import { VAT } from '../engine/tariff.ts';
import type { StartPrices } from '../engine/curve.ts';
import { STAY_MAX, STAY_MIN, type Window } from '../engine/compare.ts';

/** Half-up to cents after adding 1e-9, so €0.605 shows as €0.61 (never toFixed directly). */
export function roundCents(x: number): number {
  return Math.round((x + 1e-9) * 100) / 100;
}

export function euro(x: number): string {
  return `€${roundCents(Math.abs(x)).toFixed(2)}`;
}

/** Amounts below €0.005 would round to €0.00, so they are labelled "less than €0.01" (D-19). */
export function isTiny(amount: number): boolean {
  return Math.abs(amount) < 0.005;
}

/** "Saves €0.39 compared with €2.16 of petrol" / "Costs €0.98 more than €2.16 of petrol" (G6-AC5, D-19). */
export function savingSentence(saving: number, petrolCost: number): string {
  const petrol = `${euro(petrolCost)} of petrol`;
  if (saving > 0) {
    return isTiny(saving) ? `Saves less than €0.01 compared with ${petrol}` : `Saves ${euro(saving)} compared with ${petrol}`;
  }
  return isTiny(saving) ? `Costs less than €0.01 more than ${petrol}` : `Costs ${euro(saving)} more than ${petrol}`;
}

/** Short form for the "Also here" row: "saves €0.39", "costs €0.82 more". */
export function savingPhrase(saving: number): string {
  if (saving > 0) return isTiny(saving) ? 'saves less than €0.01' : `saves ${euro(saving)}`;
  return isTiny(saving) ? 'costs less than €0.01 more' : `costs ${euro(saving)} more`;
}

/** Short amount for the ranked strip: "€4.23", "−€0.82" (U+2212) or "<€0.01". */
export function amountChip(saving: number): string {
  if (isTiny(saving)) return '<€0.01';
  return saving > 0 ? euro(saving) : `−${euro(saving)}`;
}

/** "40 min", "1h30", "2h". */
export function duration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/** PRD S4 scenario 3: the window sentence when no stay is worth it. */
export const NEVER_WORTH_IT = 'Never worth it: always more expensive than petrol for your car';

/** G6-AC1: "Worth it if you stay 1h30 to 7h30", "… at least 40 min", "Worth it for any stay (up to X)". */
export function windowSentence(w: Window | null): string {
  if (!w) return NEVER_WORTH_IT;
  const fromMin = w.shortest === STAY_MIN;
  const toMax = w.longest === STAY_MAX;
  const base = fromMin
    ? (toMax ? 'Worth it for any stay' : `Worth it for any stay up to ${duration(w.longest)}`)
    : toMax
      ? `Worth it if you stay at least ${duration(w.shortest)}`
      : `Worth it if you stay ${duration(w.shortest)} to ${duration(w.longest)}`;
  return w.hasGaps ? `${base} (not for every stay in between)` : base;
}

export function metres(m: number): string {
  return `${Math.round(m).toLocaleString('en-GB')} m`;
}

/** G3-AC3: the spot as "51.4436, 5.5519"; it is shown as coordinates, never as a place name. */
export function coords(lat: number, lon: number): string {
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

/** G6-AC6 + G6-AC5: "€0.52/kWh · €0.61/h after full · €0.61 start · total €7.11". */
export function priceLine(start: StartPrices, variesByTime: boolean, total: number): string {
  const parts: string[] = [];
  if (start.energy > 0) parts.push(`${euro(start.energy * VAT)}/kWh`);
  if (start.time > 0) parts.push(`${euro(start.time * VAT)}/h charging`);
  if (start.parking > 0) parts.push(`${euro(start.parking * VAT)}/h after full`);
  if (start.flat > 0) parts.push(`${euro(start.flat * VAT)} start`);
  if (variesByTime) parts.push('price varies by time');
  parts.push(`total ${euro(total)}`);
  return parts.join(' · ');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DATA_DATE = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Amsterdam',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** "9 Oct 2026, 08:12" in Amsterdam time (G2-AC4, D-27). */
export function dataDate(iso: string): string {
  const p: Record<string, string> = {};
  for (const part of DATA_DATE.formatToParts(new Date(iso))) p[part.type] = part.value;
  return `${Number(p.day)} ${MONTHS[Number(p.month) - 1]} ${p.year}, ${p.hour}:${p.minute}`;
}
