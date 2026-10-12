import { describe, expect, it } from 'vitest';
import { NEVER_WORTH_IT, amountChip, dataDate, duration, euro, metres, priceLine, roundCents, savingPhrase, savingSentence, windowSentence } from './format.ts';

describe('roundCents / euro', () => {
  it('rounds half up, including binary edge cases', () => {
    expect(roundCents(0.605)).toBe(0.61);
    expect(roundCents(1.005)).toBe(1.01);
    expect(roundCents(0.38995)).toBe(0.39);
    expect(euro(-0.98)).toBe('€0.98');
  });
});

describe('savingSentence (G6-AC5, D-19)', () => {
  it('formats saving and extra cost next to the petrol cost', () => {
    expect(savingSentence(0.38995, 2.1591)).toBe('Saves €0.39 compared with €2.16 of petrol');
    expect(savingSentence(-0.03, 8.64)).toBe('Costs €0.03 more than €8.64 of petrol');
  });

  it('labels amounts below €0.005', () => {
    expect(savingSentence(0.003, 2)).toBe('Saves less than €0.01 compared with €2.00 of petrol');
    expect(savingSentence(-0.004, 2)).toBe('Costs less than €0.01 more than €2.00 of petrol');
    expect(savingSentence(0, 2)).toBe('Costs less than €0.01 more than €2.00 of petrol');
  });
});

describe('savingPhrase', () => {
  it('gives the short form with the same tiny-amount rule', () => {
    expect(savingPhrase(0.39)).toBe('saves €0.39');
    expect(savingPhrase(-0.82)).toBe('costs €0.82 more');
    expect(savingPhrase(0.004)).toBe('saves less than €0.01');
    expect(savingPhrase(-0.004)).toBe('costs less than €0.01 more');
  });
});

describe('amountChip', () => {
  it('shows saving, extra cost with a minus sign, or <€0.01', () => {
    expect(amountChip(4.231)).toBe('€4.23');
    expect(amountChip(-0.82)).toBe('−€0.82');
    expect(amountChip(0.004)).toBe('<€0.01');
  });
});

describe('duration and metres', () => {
  it('formats stays like the mockup', () => {
    expect(duration(40)).toBe('40 min');
    expect(duration(90)).toBe('1h30');
    expect(duration(120)).toBe('2h');
    expect(duration(1440)).toBe('24h');
  });

  it('formats metres with a thousands separator', () => {
    expect(metres(74.4)).toBe('74 m');
    expect(metres(1234.6)).toBe('1,235 m');
  });
});

describe('priceLine (G6-AC6)', () => {
  it('Vattenfall Marconilaan', () => {
    expect(priceLine({ energy: 0.2691, time: 0, parking: 0, flat: 0 }, false, 1.76915)).toBe('€0.33/kWh · total €1.77');
  });

  it('Opcharge Zernikestraat, in the order kWh, charging, after full, start', () => {
    expect(priceLine({ energy: 0.43, time: 0, parking: 0.5, flat: 0.5 }, false, 4.30462)).toBe('€0.52/kWh · €0.61/h after full · €0.61 start · total €4.30');
  });

  it('E-Flux Het Voorburg at 15:30 adds "price varies by time"', () => {
    expect(priceLine({ energy: 0.5417, time: 0.41, parking: 0, flat: 0 }, true, 6.7975)).toBe('€0.66/kWh · €0.50/h charging · price varies by time · total €6.80');
  });
});

describe('dataDate (G2-AC4)', () => {
  it('formats the snapshot time in Amsterdam time', () => {
    expect(dataDate('2026-10-09T06:12:00Z')).toBe('9 Oct 2026, 08:12');
    expect(dataDate('2026-09-01T22:05:00Z')).toBe('2 Sep 2026, 00:05');
  });
});

describe('windowSentence (G6-AC1)', () => {
  const w = (shortest: number, longest: number, hasGaps = false) => ({ shortest, longest, hasGaps });

  it('reads the PRD Story 4 windows', () => {
    expect(windowSentence(w(90, 450))).toBe('Worth it if you stay 1h30 to 7h30');
    expect(windowSentence(w(40, 1440))).toBe('Worth it if you stay at least 40 min');
    expect(windowSentence(w(70, 1440))).toBe('Worth it if you stay at least 1h10');
    expect(windowSentence(null)).toBe(NEVER_WORTH_IT);
    expect(NEVER_WORTH_IT).toBe('Never worth it: always more expensive than petrol for your car');
  });

  it('a window from the minimum stay reads "for any stay", which wins over "at least"', () => {
    expect(windowSentence(w(15, 1440))).toBe('Worth it for any stay');
    expect(windowSentence(w(15, 60))).toBe('Worth it for any stay up to 1h');
  });

  it('adds "(not for every stay in between)" to a window with gaps', () => {
    expect(windowSentence(w(90, 450, true))).toBe('Worth it if you stay 1h30 to 7h30 (not for every stay in between)');
    expect(windowSentence(w(15, 1440, true))).toBe('Worth it for any stay (not for every stay in between)');
  });
});
