// The PRD's named tariffs and settings, prices excluding VAT as in the NDW feed.
import type { OcpiPriceComponent, OcpiRestrictions, TileLocation, TileTariff } from '../../src/shared/data-format.ts';
import type { EngineSettings } from '../../src/engine/results.ts';

export function tariff(
  elements: Array<{ components: Array<[OcpiPriceComponent['type'], number]>; restrictions?: OcpiRestrictions }>,
  extra: Partial<TileTariff> = {},
): TileTariff {
  return {
    currency: 'EUR',
    start_date_time: null,
    end_date_time: null,
    elements: elements.map((e) => ({
      price_components: e.components.map(([type, price]) => ({ type, price, vat: null, step_size: 1 })),
      restrictions: e.restrictions ?? null,
    })),
    ...extra,
  };
}

/** PRD Story 1, Scenario 1 (no card markup). */
export const EXAMPLE_SETTINGS: EngineSettings = {
  batteryKwh: 15,
  chargeKw: 3.6,
  kwhPerKm: 0.25,
  kmPerL: 12,
  petrolPrice: 2.399,
  cardStartFee: 0.89,
  cardMarkup: 0,
};

export const TARIFFS = {
  /** S2 sc. 1 and S4 sc. 1: Vattenfall Parkstraat 21 / Marconilaan 183. */
  vattenfall: tariff([{ components: [['ENERGY', 0.2691]] }]),
  /** S2 sc. 1: Allego Kerkstraat 6, €2.479/h, no kWh price. */
  allego: tariff([{ components: [['TIME', 2.479]] }]),
  /** S2 sc. 4: €0.30/kWh. */
  flat30: tariff([{ components: [['ENERGY', 0.3]] }]),
  /** S2 sc. 5: E-Flux Het Voorburg 6, Culemborg. */
  efluxVoorburg: tariff([
    { components: [['ENERGY', 0.5717], ['TIME', 0.41]], restrictions: { start_time: '16:00', end_time: '22:00' } },
    { components: [['ENERGY', 0.5417], ['TIME', 0.41]] },
  ]),
  /** S4 sc. 1: Opcharge Zernikestraat 17. */
  opcharge: tariff([{ components: [['ENERGY', 0.43], ['FLAT', 0.5], ['PARKING_TIME', 0.5]] }]),
  /** S4 sc. 3: E-Flux Laboratoriumstraat 2. */
  efluxLab: tariff([{ components: [['ENERGY', 0.5417], ['TIME', 0.41]] }]),
};

export function location(id: string, entries: TileLocation['entries'], extra: Partial<TileLocation> = {}): TileLocation {
  return { id, operator: 'Operator', address: `Street ${id}`, city: 'Nuenen', lat: 51.44, lon: 5.55, entries, ...extra };
}

/** 2026-10-09 15:30 in Amsterdam (CEST, UTC+2). */
export const FRIDAY_1530 = Date.parse('2026-10-09T13:30:00Z');
/** 2026-10-09 10:00 in Amsterdam. */
export const FRIDAY_1000 = Date.parse('2026-10-09T08:00:00Z');
