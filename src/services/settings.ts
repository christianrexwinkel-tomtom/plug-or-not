export interface Settings {
  batteryKwh: number;
  chargeKw: number;
  kwhPerKm: number;
  kmPerL: number;
  petrolPrice: number;
  cardStartFee: number;
  cardMarkup: number;
}

export type SettingKey = keyof Settings;

export interface FieldSpec {
  key: SettingKey;
  group: 'car' | 'petrol' | 'card';
  label: string;
  /** Unit shown next to the input. */
  unit: string;
  /** Unit used in messages, when it differs from `unit`. */
  messageUnit?: string;
  min: number;
  max: number;
  decimals: number;
  /** Name in "Enter your {askName} ({unit}) to continue." */
  askName: string;
  /** Name in "{name} must be between …". */
  name: string;
  /** Pre-filled value on first setup; card fees default to 0 (FR-001). */
  initial: string;
}

/** FR-001 fields and FR-004 ranges, with the mockup's labels. */
export const FIELDS: FieldSpec[] = [
  { key: 'batteryKwh', group: 'car', label: 'Usable battery size', unit: 'kWh', min: 1, max: 40, decimals: 0, askName: 'usable battery size', name: 'Usable battery size', initial: '' },
  { key: 'chargeKw', group: 'car', label: 'Charging speed on AC', unit: 'kW', min: 1, max: 22, decimals: 0, askName: "car's charging speed", name: 'Charging speed', initial: '' },
  { key: 'kwhPerKm', group: 'car', label: 'Electric use', unit: 'kWh/km', min: 0.1, max: 0.4, decimals: 2, askName: 'electric use', name: 'Electric use', initial: '' },
  { key: 'kmPerL', group: 'petrol', label: 'Petrol use', unit: 'km/L', min: 5, max: 30, decimals: 0, askName: 'petrol use', name: 'Petrol use', initial: '' },
  { key: 'petrolPrice', group: 'petrol', label: 'Petrol price', unit: '€/L', min: 0.5, max: 5, decimals: 2, askName: 'petrol price', name: 'Petrol price', initial: '' },
  { key: 'cardStartFee', group: 'card', label: 'Start fee', unit: '€ / session', messageUnit: '€', min: 0, max: 5, decimals: 2, askName: 'card start fee', name: 'Card start fee', initial: '0.00' },
  { key: 'cardMarkup', group: 'card', label: 'Markup', unit: '€/kWh', min: 0, max: 1, decimals: 2, askName: 'card markup', name: 'Card markup', initial: '0.00' },
];

/** "2,399" → 2.399; null for anything that isn't a plain non-negative decimal (G1-AC2). */
export function parseDecimal(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(t)) return null;
  return Number(t);
}

export type RawSettings = Record<SettingKey, string>;
export type ValidationResult =
  | { ok: true; settings: Settings }
  | { ok: false; errors: Partial<Record<SettingKey, string>> };

/** G1-AC1: the PRD's charging-speed message pattern, for every field. */
export function validate(raw: RawSettings): ValidationResult {
  const errors: Partial<Record<SettingKey, string>> = {};
  const values: Partial<Settings> = {};
  for (const f of FIELDS) {
    const unit = f.messageUnit ?? f.unit;
    const text = raw[f.key]?.trim() ?? '';
    if (text === '') {
      errors[f.key] = `Enter your ${f.askName} (${unit}) to continue.`;
      continue;
    }
    const n = parseDecimal(text);
    if (n === null || n < f.min || n > f.max) {
      errors[f.key] = `${f.name} must be between ${f.min.toFixed(f.decimals)} and ${f.max.toFixed(f.decimals)} ${unit}.`;
      continue;
    }
    values[f.key] = n;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, settings: values as Settings };
}

export function toRaw(s: Settings): RawSettings {
  return Object.fromEntries(FIELDS.map((f) => [f.key, String(s[f.key])])) as RawSettings;
}

export function initialRaw(): RawSettings {
  return Object.fromEntries(FIELDS.map((f) => [f.key, f.initial])) as RawSettings;
}

export const STORAGE_KEY = 'plugornot.settings.v1';

export interface SettingsStore {
  load(): Settings | null;
  /** Keeps the values for this visit; `persisted` is false when the browser refused them (G1-AC3). */
  save(s: Settings): { persisted: boolean };
}

/** `getStorage` may itself throw (Safari private mode, blocked site data). */
export function createSettingsStore(getStorage: () => Storage): SettingsStore {
  let memory: Settings | null = null;
  return {
    load() {
      if (memory) return memory;
      try {
        const text = getStorage().getItem(STORAGE_KEY);
        if (!text) return null;
        const stored = JSON.parse(text) as { version?: number; settings?: Settings };
        if (stored.version !== 1 || !stored.settings) return null;
        const checked = validate(toRaw(stored.settings));
        memory = checked.ok ? checked.settings : null;
        return memory;
      } catch {
        return null;
      }
    },
    save(s) {
      memory = s;
      try {
        getStorage().setItem(STORAGE_KEY, JSON.stringify({ version: 1, settings: s }));
        return { persisted: true };
      } catch {
        return { persisted: false };
      }
    },
  };
}
