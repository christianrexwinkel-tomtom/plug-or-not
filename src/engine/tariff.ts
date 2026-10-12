import type { OcpiRestrictions, PriceComponentType, TileTariff } from '../shared/data-format.ts';
import { SIM_MINUTES, type MinuteClock } from './clock.ts';

/** Every tariff price is taken as excluding VAT and gets 21% on top (FR-011, D-13). */
export const VAT = 1.21;

const UNSUPPORTED: (keyof OcpiRestrictions)[] = [
  'min_kwh', 'max_kwh', 'min_current', 'max_current', 'min_power', 'max_power', 'reservation',
];

function hasValue(v: unknown): boolean {
  return v !== null && v !== undefined;
}

function parseHm(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h! * 60 + m!;
}

/**
 * The G5-AC4 causes that can be decided without simulating: currency, no elements,
 * unsupported restriction types, a FLAT fee behind a min_duration, and a validity
 * period that doesn't cover the 24-hour simulation.
 */
export function isStaticallyReadable(tariff: TileTariff, startMs: number): boolean {
  if (tariff.currency !== 'EUR') return false;
  if (tariff.elements.length === 0) return false;
  if (tariff.start_date_time && Date.parse(tariff.start_date_time) > startMs) return false;
  if (tariff.end_date_time && Date.parse(tariff.end_date_time) < startMs + SIM_MINUTES * 60_000) return false;
  for (const el of tariff.elements) {
    const r = el.restrictions;
    if (r && UNSUPPORTED.some((k) => hasValue(r[k]))) return false;
    const conditionalFlat = el.price_components.some((c) => c.type === 'FLAT' && c.price !== 0);
    if (conditionalFlat && r && hasValue(r.min_duration)) return false;
  }
  return true;
}

/** OCPI restriction match for one minute; durations are elapsed session time (D-11). */
export function restrictionsMatch(
  r: OcpiRestrictions | null | undefined,
  clock: MinuteClock,
  elapsedS: number,
): boolean {
  if (!r) return true;
  if (r.start_time || r.end_time) {
    const from = r.start_time ? parseHm(r.start_time) : 0;
    const to = r.end_time ? parseHm(r.end_time) : 1440;
    const m = clock.minuteOfDay;
    if (from < to && !(m >= from && m < to)) return false;
    if (from > to && !(m >= from || m < to)) return false;
  }
  if (r.start_date && clock.date < r.start_date) return false;
  if (r.end_date && clock.date >= r.end_date) return false;
  if (r.day_of_week && r.day_of_week.length > 0 && !r.day_of_week.includes(clock.day)) return false;
  if (hasValue(r.min_duration) && elapsedS < r.min_duration!) return false;
  if (hasValue(r.max_duration) && elapsedS >= r.max_duration!) return false;
  return true;
}

/** Price (excl. VAT) of the first element carrying `type` whose restrictions match; null if none matches. */
export function firstMatchPrice(
  tariff: TileTariff,
  type: PriceComponentType,
  clock: MinuteClock,
  elapsedS: number,
): number | null {
  for (const el of tariff.elements) {
    const component = el.price_components.find((c) => c.type === type);
    if (component && restrictionsMatch(el.restrictions, clock, elapsedS)) return component.price;
  }
  return null;
}

export function hasComponent(tariff: TileTariff, type: PriceComponentType, nonZero = false): boolean {
  return tariff.elements.some((el) =>
    el.price_components.some((c) => c.type === type && (!nonZero || c.price !== 0)),
  );
}
