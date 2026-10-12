import { describe, expect, it } from 'vitest';
import { amsterdamClock, buildClock, SIM_MINUTES } from './clock.ts';

describe('amsterdamClock', () => {
  it('reads Amsterdam wall-clock time whatever the process time zone (tests run with TZ=America/New_York)', () => {
    expect(amsterdamClock(Date.parse('2026-10-09T13:30:00Z'))).toEqual({ date: '2026-10-09', minuteOfDay: 15 * 60 + 30, day: 'FRIDAY' });
  });

  it('follows the switch to winter time (25 Oct 2026, 03:00 CEST → 02:00 CET)', () => {
    expect(amsterdamClock(Date.parse('2026-10-25T00:30:00Z')).minuteOfDay).toBe(2 * 60 + 30);
    expect(amsterdamClock(Date.parse('2026-10-25T01:30:00Z')).minuteOfDay).toBe(2 * 60 + 30);
  });
});

describe('buildClock', () => {
  it('has one entry per simulated minute, crossing midnight into the next day', () => {
    const clock = buildClock(Date.parse('2026-10-09T19:00:00Z')); // 21:00 Friday
    expect(clock).toHaveLength(SIM_MINUTES);
    expect(clock[0]).toEqual({ date: '2026-10-09', minuteOfDay: 21 * 60, day: 'FRIDAY' });
    expect(clock[180]).toEqual({ date: '2026-10-10', minuteOfDay: 0, day: 'SATURDAY' });
  });
});
