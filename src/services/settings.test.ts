import { describe, expect, it } from 'vitest';
import { memoryStorage } from '../../test/fixtures/memory-storage.ts';
import { FIELDS, STORAGE_KEY, createSettingsStore, parseDecimal, validate, type RawSettings, type Settings } from './settings.ts';

const VALID: RawSettings = {
  batteryKwh: '15', chargeKw: '3.6', kwhPerKm: '0.25', kmPerL: '12', petrolPrice: '2.399', cardStartFee: '0.89', cardMarkup: '0.00',
};
const EXAMPLE: Settings = { batteryKwh: 15, chargeKw: 3.6, kwhPerKm: 0.25, kmPerL: 12, petrolPrice: 2.399, cardStartFee: 0.89, cardMarkup: 0 };

describe('parseDecimal (G1-AC2)', () => {
  it('accepts comma and dot decimals', () => {
    expect(parseDecimal('2,399')).toBe(2.399);
    expect(parseDecimal(' 2.399 ')).toBe(2.399);
    expect(parseDecimal('15')).toBe(15);
  });

  it('rejects text, signs and several separators', () => {
    for (const bad of ['', 'abc', '-1', '1,2,3', '1.2.3', '1e3']) expect(parseDecimal(bad)).toBeNull();
  });
});

describe('validate (G1-AC1)', () => {
  it('accepts the PRD example settings', () => {
    expect(validate(VALID)).toEqual({ ok: true, settings: EXAMPLE });
  });

  for (const f of FIELDS) {
    const eps = f.decimals === 0 ? 0.001 : 0.0001;
    const unit = f.messageUnit ?? f.unit;
    const range = `${f.name} must be between ${f.min.toFixed(f.decimals)} and ${f.max.toFixed(f.decimals)} ${unit}.`;

    it(`${f.key}: accepts min and max`, () => {
      expect(validate({ ...VALID, [f.key]: String(f.min) }).ok).toBe(true);
      expect(validate({ ...VALID, [f.key]: String(f.max) }).ok).toBe(true);
    });

    it(`${f.key}: rejects min−ε and max+ε with "${range}"`, () => {
      for (const v of [f.min - eps, f.max + eps]) {
        if (v < 0) continue; // a negative number is not a decimal the field accepts at all
        expect(validate({ ...VALID, [f.key]: v.toFixed(4) })).toEqual({ ok: false, errors: { [f.key]: range } });
      }
    });

    it(`${f.key}: rejects empty with "Enter your ${f.askName} (${unit}) to continue."`, () => {
      expect(validate({ ...VALID, [f.key]: '  ' })).toEqual({ ok: false, errors: { [f.key]: `Enter your ${f.askName} (${unit}) to continue.` } });
    });
  }

  it('uses the PRD wording for charging speed and petrol price', () => {
    expect(validate({ ...VALID, chargeKw: '' })).toMatchObject({ errors: { chargeKw: "Enter your car's charging speed (kW) to continue." } });
    expect(validate({ ...VALID, chargeKw: '0' })).toMatchObject({ errors: { chargeKw: 'Charging speed must be between 1 and 22 kW.' } });
    expect(validate({ ...VALID, petrolPrice: '25' })).toMatchObject({ errors: { petrolPrice: 'Petrol price must be between 0.50 and 5.00 €/L.' } });
  });
});

describe('createSettingsStore (G1-AC3, G1-AC4)', () => {
  it('survives a reload: a new store on the same storage reads what was saved', () => {
    const storage = memoryStorage();
    expect(createSettingsStore(() => storage).save(EXAMPLE)).toEqual({ persisted: true });
    expect(createSettingsStore(() => storage).load()).toEqual(EXAMPLE);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual({ version: 1, settings: EXAMPLE });
  });

  it('changing only the petrol price leaves every other value unchanged (PRD S1 scenario 3)', () => {
    const storage = memoryStorage();
    createSettingsStore(() => storage).save(EXAMPLE);
    const store = createSettingsStore(() => storage);
    store.save({ ...store.load()!, petrolPrice: 2.459 });
    expect(createSettingsStore(() => storage).load()).toEqual({ ...EXAMPLE, petrolPrice: 2.459 });
  });

  it('keeps settings for the visit when storage throws, and reports it', () => {
    const store = createSettingsStore(() => { throw new DOMException('blocked', 'SecurityError'); });
    expect(store.load()).toBeNull();
    expect(store.save(EXAMPLE)).toEqual({ persisted: false });
    expect(store.load()).toEqual(EXAMPLE);
  });

  it('ignores stored data of another version or with out-of-range values', () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, settings: EXAMPLE }));
    expect(createSettingsStore(() => storage).load()).toBeNull();
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, settings: { ...EXAMPLE, chargeKw: 99 } }));
    expect(createSettingsStore(() => storage).load()).toBeNull();
    storage.setItem(STORAGE_KEY, '{not json');
    expect(createSettingsStore(() => storage).load()).toBeNull();
  });
});
