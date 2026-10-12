import type { DayOfWeek } from '../shared/data-format.ts';

/** Minutes simulated per entry: 24 hours from the session start (D-10). */
export const SIM_MINUTES = 1440;

export interface MinuteClock {
  /** Local date in Europe/Amsterdam, "YYYY-MM-DD". */
  date: string;
  /** Local minutes since midnight, 0–1439. */
  minuteOfDay: number;
  day: DayOfWeek;
}

const AMSTERDAM = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Amsterdam',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'long',
  hourCycle: 'h23',
});

export function amsterdamClock(utcMs: number): MinuteClock {
  const parts: Record<string, string> = {};
  for (const p of AMSTERDAM.formatToParts(new Date(utcMs))) parts[p.type] = p.value;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minuteOfDay: Number(parts.hour) * 60 + Number(parts.minute),
    day: parts.weekday!.toUpperCase() as DayOfWeek,
  };
}

/** Clock for each simulated minute: index i is the minute starting at startMs + i minutes (D-16). */
export function buildClock(startMs: number): MinuteClock[] {
  const clock: MinuteClock[] = [];
  for (let i = 0; i < SIM_MINUTES; i++) clock.push(amsterdamClock(startMs + i * 60_000));
  return clock;
}
