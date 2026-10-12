# Plan: Plug or Not — is charging here worth it? (v0.1 proof of concept)

> **For agentic workers:** REQUIRED PHASE COMMAND: Run `/tt-agentic-sdlc:implement` to execute this plan. Steps use checkbox syntax for tracking.

**Date:** 2026-10-12
**Goal:** Slice 1 — a static web page on GitHub Pages that, for the driver's browser location, ranks the 10 nearest Dutch AC chargers by saving against petrol, from a committed NDW tariff snapshot, with the full cost engine and trust guard.
**Architecture:** An offline Node script (`scripts/build-data.ts`) turns the NDW OCPI feeds into a 0.1° tile snapshot under `public/data/`. The page is plain TypeScript in four layers: UI views → controller (`src/app.ts`) → services (settings, location, data) → a pure engine that simulates each tariff minute by minute over 24 h. Next to the files the design names, the plan adds small single-purpose modules inside the same layers: `src/engine/clock.ts`, `src/engine/results.ts`, `src/ui/entry-view.ts`, `src/ui/dom.ts`, `src/ui/chrome.ts`, `src/ui/app.css` and `scripts/build-nl-border.mjs`.
**Tech Stack:** TypeScript 7.0.2, Vite 8.3.4, Vitest 5.0.3, tsx 4.23.15, `@fontsource/sora` and `@fontsource/ibm-plex-mono` 5.3.0, Node ≥ 20.19 locally and Node 22 in CI, GitHub Actions and GitHub Pages
**Design:** [solution-design.md](solution-design.md) · UI mockup [ui-mockup.html](ui-mockup.html)
**PRD:** [prd.md](prd.md)
**References:** NDW open data `charging_point_locations_ocpi.json.gz` and `charging_point_tariffs_ocpi.json.gz` (https://opendata.ndw.nu/); Natural Earth v5.1.2 `ne_10m_admin_0_countries.geojson`; repo `christianrexwinkel-tomtom/plug-or-not`
**Strategy:** sequential vertical slices (first only)
**Status:** Draft
**Template version:** default/0.4.0

**Plugin version:** 0.5.3
**Agent Sessions:** claude-code: 80635553-6ee2-4ce4-90ef-801ac5fb9f22

---

## TL;DR

This plan builds the first shippable cut of Plug or Not. It's a web page that tells a plug-in hybrid driver whether the nearest public chargers are cheaper than petrol for their stay. It ships as 4 vertical slices, one pull request each. Only Slice 1 is written out here: data snapshot, cost engine, settings, browser location, and ranked results with a details panel and a ranked strip, deployed to GitHub Pages. The work goes test-first. Two acceptance suites encode the PRD (Product Requirements Document) figures and flows. The engine, services, data build, controller and views follow, and a final run plus device checks closes the slice. Slices 2–4 (worth-it window and live stay changes, spot map, results map) get their own plan runs.

## Plan at a glance

Slice 1 has 19 tasks. Each title names the component or acceptance criterion it delivers, and each task ends with a runnable **Verify** command and its expected output.

| Component | Slice | Phase | Tasks | Delivers |
|-----------|-------|-------|-------|----------|
| Toolchain and PRD acceptance tests | 1 | 1 | [1](#task-1-toolchain-and-prd-figure-acceptance-tests), [2](#task-2-flow-acceptance-tests) | npm project, Vitest, PRD fixtures; two failing acceptance suites |
| Shared data format | 1 | 2 | [3](#task-3-shared-data-format) | Tile, manifest and OCPI types used by the script and the page; tile keys |
| Cost engine | 1 | 3 | [4](#task-4-amsterdam-clock), [5](#task-5-tariff-matching-and-trust-guard), [6](#task-6-cost-curve), [7](#task-7-petrol-comparison-verdict-window-and-ranking), [8](#task-8-results-builder) | Per-minute cost curves, verdict, window and ranking, all to the cent |
| What the results show | 1 | 3 | [9](#task-9-display-formatting), [10](#task-10-entry-view-model) | Money, distance and price-line formatting; the details panel's view model — Task 1 goes green |
| Settings | 1 | 3 | [11](#task-11-settings-service) | Validation, comma decimals, versioned localStorage with a fallback |
| Location | 1 | 3 | [12](#task-12-netherlands-border-and-browser-location) | Browser location wrapper, approximate check, Netherlands border |
| Data | 1 | 3 | [13](#task-13-tile-data-service-nearest-10), [14](#task-14-data-build-script-and-committed-snapshot) | Ring search for the true nearest 10; `npm run build-data` and the committed snapshot |
| Controller | 1 | 3 | [15](#task-15-controller) | App state and request flow — Task 2 goes green |
| Page | 1 | 3 | [16](#task-16-views-setup-parked-loading-results), [17](#task-17-page-shell-theme-and-fonts) | Setup, parked, loading and results views; Night/Day theme; self-hosted fonts |
| Deployment | 1 | 3 | [18](#task-18-github-pages-deployment) | Test, build and deploy to GitHub Pages on push to `main` |
| Acceptance | 1 | 4 | [19](#task-19-verify-slice-1-acceptance) | Full suite green, build clean, device checks done |

## Slice Status

| Slice | Name | Use case ref(s) | Status |
|-------|------|-----------------|--------|
| 1 | Answer for my location (no map) | S1; S2 (scenarios 1–5, battery full, outside the Netherlands, load error, approximate notice, location denied + Try again); S3 (parked-screen slider, − and +, limits) | todo |
| 2 | Worth-it window and live stay changes | S4; S3 (results-screen slider, scenario 1 "keeps the selected charger") | todo (separate plan run) |
| 3 | Spot on a map | S2 edge cases (location denied → drag, approximate circle, location still being found); FR-025 | todo (separate plan run) |
| 4 | Results on a map | S2 scenario 1 (pins); FR-024; S2 "Map can't load" on results | todo (separate plan run) |

_Only Slice 1 is authored in this plan. Slices 2..N will be authored via subsequent plan-skill invocations against the same design artifact, one per PR._

## Slice 1: Answer for my location (no map)

**In scope:** G1 (all), G2 (all), G3-AC1 (location asked on opening, "Finding your location…", denied + "Try again", "Find chargers" blocked while locating and after a denial), G3-AC2 (approximate notice on the parked screen and repeated on the results; the accuracy circle comes with Slice 3), G3-AC4 (outside the Netherlands for the browser position), G4 (all), G5 (all), G6-AC2–AC4, G6-AC5 (all except the window sentence), G6-AC6, G6-AC7, G6-AC8 (details panel opening on #1 with "#R of N", ranked strip with tap selection, "Also here"; pins come with Slice 4), G7-AC1–AC3, G7-AC5, G7-AC6 (page colours; map colours come with Slice 3), G8 (all), D-31.

**Left for later slices:** the window sentence and the results-screen stay slider with the selection kept on a re-rank (Slice 2: G6-AC1 wording, G7-AC2 shared slider, G7-AC4); the parked map, dragging, "Moved spot", "My location", the accuracy circle and MapLibre (Slice 3: G3-AC1 map parts, G3-AC3, D-22, D-24, D-32); pins, framing, "Change spot" and the map-failure fallback (Slice 4: G6-AC8 pin parts, G6-AC9). The engine already computes each entry's window in Slice 1, because the "Not worth it for this stay" and "Never worth it" verdicts depend on it (G6-AC2).

**Commands used throughout:** `npm test` runs `TZ=America/New_York vitest run`, so every test runs in a non-Dutch time zone (Testing & verification). `npm test -- <path>` runs one file with the same time zone.

### Phase 1: Acceptance Tests

### Task 1: Toolchain and PRD-figure acceptance tests

Sets up the npm project (the empty repo has no toolchain yet) and writes the acceptance test for every Slice 1 PRD figure. The test runs the whole pure pipeline: tile data → cost curves → ranking at the stay → the text the details panel shows. It fails until Task 10.

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `.gitignore`
- Create: `test/fixtures/prd-tariffs.ts`
- Create: `test/acceptance/prd-figures.test.ts`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: npm scripts `dev`, `build`, `test`, `build-data`; fixture exports `tariff(elements, extra?) → TileTariff`, `EXAMPLE_SETTINGS: EngineSettings`, `TARIFFS.{vattenfall, allego, flat30, efluxVoorburg, opcharge, efluxLab}`, `location(id, entries, extra?) → TileLocation`, `FRIDAY_1530`, `FRIDAY_1000` (epoch ms). The test expects `computeEntries`, `rankAtStay` and `EngineSettings` from `src/engine/results.ts` (Task 8), `entryViews` from `src/ui/entry-view.ts` (Task 10), and `TileLocation`/`TileTariff`/`OcpiPriceComponent`/`OcpiRestrictions` from `src/shared/data-format.ts` (Task 3).

- [ ] **Step 1: Create the toolchain files**

`package.json` — versions are pinned exactly. The `test` script fixes `TZ=America/New_York`, so a hidden dependency on the machine's time zone fails the tests. `build-data` raises Node's heap because the uncompressed locations feed is 186 MB:

```json
{
  "name": "plug-or-not",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "TZ=America/New_York vitest run",
    "build-data": "node --max-old-space-size=4096 --import tsx scripts/build-data.ts"
  },
  "dependencies": {
    "@fontsource/ibm-plex-mono": "5.3.0",
    "@fontsource/sora": "5.3.0"
  },
  "devDependencies": {
    "@types/node": "22.20.5",
    "tsx": "4.23.15",
    "typescript": "7.0.2",
    "vite": "8.3.4",
    "vitest": "5.0.3"
  }
}
```

`tsconfig.json` — `allowImportingTsExtensions` because every import names its `.ts` file, which Vite, Vitest and tsx all resolve. `noUncheckedIndexedAccess` makes array and record reads explicit, which matters for the curve arrays:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["node", "vite/client"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true
  },
  "include": ["src", "scripts", "test", "vite.config.ts"]
}
```

`vite.config.ts` — `base` is the GitHub Pages path (D-5). The test include list covers the colocated unit tests, the script tests and `test/`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/plug-or-not/',
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'test/**/*.test.ts'],
  },
});
```

`.gitignore` — `public/data.next/` is the build script's staging directory (Task 14). `*.json.gz` keeps raw feeds out of the repo (D-2):

```text
node_modules/
dist/
public/data.next/
*.json.gz
.DS_Store
```

Run: `npm install`
Expected: `added … packages` and a new `package-lock.json`, with no errors.

- [ ] **Step 2: Write the PRD fixtures**

```ts
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
```

- [ ] **Step 3: Write the failing acceptance test**

The figures: S2 scenario 1 (€1.77 total, saves €0.39 against €2.16 of petrol; Allego costs €0.98 more), S2 scenario 4 (€2.38 for 3.6 kWh), S2 scenario 5 (€6.80 for 7.2 kWh, off-peak then peak from 16:00), the S2 edge cases for "no published tariff" and "different tariffs per point", and the S4 verdicts that depend on the window. The Opcharge total of €4.30 at 1h30 is €0.89 + 5.4 kWh × €0.5203 + €0.605 start fee.

```ts
// Acceptance: every PRD figure for Slice 1, through the whole pure pipeline
// (tile data → cost curves → ranking at the stay → what the details panel shows).
import { describe, expect, it } from 'vitest';
import { computeEntries, rankAtStay, type EngineSettings } from '../../src/engine/results.ts';
import { entryViews } from '../../src/ui/entry-view.ts';
import type { TileLocation, TileTariff } from '../../src/shared/data-format.ts';
import { EXAMPLE_SETTINGS, FRIDAY_1000, FRIDAY_1530, TARIFFS, location } from '../fixtures/prd-tariffs.ts';

function views(
  locs: Array<{ loc: TileLocation; distanceM: number }>,
  tariffs: Record<string, TileTariff>,
  opts: { battery: number; stay: number; start?: number; settings?: EngineSettings },
) {
  const settings = opts.settings ?? EXAMPLE_SETTINGS;
  const computed = computeEntries(
    locs.map((l) => ({ location: l.loc, distanceM: l.distanceM })),
    tariffs,
    settings,
    opts.battery,
    opts.start ?? FRIDAY_1000,
  );
  return entryViews(rankAtStay(computed, opts.stay, settings));
}

describe('PRD Story 2 — nearby chargers ranked by saving', () => {
  it('scenario 1: Parkstraat Nuenen, battery 20%, stay 45 min', () => {
    const vattenfall = location('VAT:park21', [{ tariffKey: 'VAT:t1', powerKw: 11 }], {
      operator: 'Vattenfall', address: 'Parkstraat 21',
    });
    const allego = location('ALL:kerk6', [{ tariffKey: 'ALL:t2', powerKw: 11 }], {
      operator: 'Allego', address: 'Kerkstraat 6',
    });
    const v = views(
      [{ loc: allego, distanceM: 266 }, { loc: vattenfall, distanceM: 74 }],
      { 'VAT:t1': TARIFFS.vattenfall, 'ALL:t2': TARIFFS.allego },
      { battery: 20, stay: 45 },
    );
    expect(v[0]).toMatchObject({
      operator: 'Vattenfall',
      address: 'Parkstraat 21, Nuenen',
      distanceText: '74 m',
      verdictText: 'Worth it',
      rankText: '#1 of 2 · best saving first',
      savingText: 'Saves €0.39 compared with €2.16 of petrol',
      priceText: '€0.33/kWh · total €1.77',
    });
    expect(v[1]).toMatchObject({
      operator: 'Allego',
      distanceText: '266 m',
      verdictText: 'Never worth it',
      savingText: 'Costs €0.98 more than €2.16 of petrol',
    });
  });

  it('scenario 4: card markup €0.05/kWh, €0.30/kWh, 1 hour → total €2.38 for 3.6 kWh', () => {
    const settings = { ...EXAMPLE_SETTINGS, cardMarkup: 0.05 };
    const computed = computeEntries(
      [{ location: location('X:1', [{ tariffKey: 'X:t', powerKw: 22 }]), distanceM: 10 }],
      { 'X:t': TARIFFS.flat30 }, settings, 20, FRIDAY_1000,
    );
    const [ranked] = rankAtStay(computed, 60, settings);
    expect(ranked!.outcome).toMatchObject({ kind: 'priced' });
    if (ranked!.outcome.kind !== 'priced') return;
    expect(ranked!.outcome.kwh).toBeCloseTo(3.6, 9);
    expect(entryViews([ranked!])[0]!.priceText).toBe('€0.36/kWh · total €2.38');
  });

  it('scenario 5: Culemborg at 15:30 for 2 h → 7.2 kWh, total €6.80, peak from 16:00', () => {
    const computed = computeEntries(
      [{ location: location('EFL:voorburg', [{ tariffKey: 'EFL:t', powerKw: 11 }]), distanceM: 30 }],
      { 'EFL:t': TARIFFS.efluxVoorburg }, EXAMPLE_SETTINGS, 20, FRIDAY_1530,
    );
    const [ranked] = rankAtStay(computed, 120, EXAMPLE_SETTINGS);
    if (ranked!.outcome.kind !== 'priced') throw new Error('expected priced');
    expect(ranked!.outcome.kwh).toBeCloseTo(7.2, 9);
    expect(entryViews([ranked!])[0]!.priceText).toBe('€0.66/kWh · €0.50/h charging · price varies by time · total €6.80');
  });

  it('a charger without a published tariff is listed last as "Price unknown" with its reason', () => {
    const v = views(
      [
        { loc: location('A:none', [{ tariffKey: null, powerKw: null, unknown: 'no-tariff' }]), distanceM: 5 },
        { loc: location('B:priced', [{ tariffKey: 'B:t', powerKw: 11 }]), distanceM: 500 },
      ],
      { 'B:t': TARIFFS.vattenfall },
      { battery: 20, stay: 45 },
    );
    expect(v.map((x) => x.verdictText)).toEqual(['Worth it', 'Price unknown']);
    expect(v[1]).toMatchObject({ reasonText: 'No price published for this charger.', savingText: null, priceText: null });
  });

  it('a location with two tariffs shows two entries with the same address and distance', () => {
    const v = views(
      [{ loc: location('C:two', [{ tariffKey: 'C:a', powerKw: 11 }, { tariffKey: 'C:b', powerKw: 11 }]), distanceM: 120 }],
      { 'C:a': TARIFFS.vattenfall, 'C:b': TARIFFS.efluxLab },
      { battery: 20, stay: 45 },
    );
    expect(v).toHaveLength(2);
    expect(new Set(v.map((x) => `${x.address}|${x.distanceText}`)).size).toBe(1);
    expect(v[0]!.alsoHere).toEqual([{ id: v[1]!.id, text: expect.stringMatching(/^Also here: Never worth it · costs €\d\.\d\d more$/) }]);
  });
});

describe('PRD Story 4 — verdicts that depend on the worth-it window (Slice 1: verdict only)', () => {
  const opcharge = location('OPC:zernike', [{ tariffKey: 'OPC:t', powerKw: 11 }], { operator: 'Opcharge' });

  it('Opcharge Zernikestraat at battery 10%: worth it at 1h30 and 7h30, not worth it at 1h20 or 7h45', () => {
    const at = (stay: number) => views([{ loc: opcharge, distanceM: 1 }], { 'OPC:t': TARIFFS.opcharge }, { battery: 10, stay })[0]!;
    expect(at(90).verdictText).toBe('Worth it');
    expect(at(450).verdictText).toBe('Worth it');
    expect(at(80).verdictText).toBe('Not worth it for this stay');
    expect(at(465).verdictText).toBe('Not worth it for this stay');
    expect(at(90).priceText).toBe('€0.52/kWh · €0.61/h after full · €0.61 start · total €4.30');
  });

  it('E-Flux Laboratoriumstraat at battery 10% is never worth it', () => {
    const v = views([{ loc: location('EFL:lab', [{ tariffKey: 'EFL:t', powerKw: 11 }]), distanceM: 1 }], { 'EFL:t': TARIFFS.efluxLab }, { battery: 10, stay: 90 });
    expect(v[0]!.verdictText).toBe('Never worth it');
  });
});
```

- [ ] **Step 4: Run it to see it fail**

Run: `npm test -- test/acceptance/prd-figures.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/engine/results.ts'`

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts .gitignore test/fixtures/prd-tariffs.ts test/acceptance/prd-figures.test.ts
git commit -m "test: PRD figure acceptance tests and project toolchain"
```

**Verify:** `npm test -- test/acceptance/prd-figures.test.ts` — FAIL with `Cannot find module '../../src/engine/results.ts'` (expected at this stage; green after Task 10)

### Task 2: Flow acceptance tests

The PRD Story 1–3 flows for Slice 1, run through the controller with stubbed browser APIs: first setup and reload, validation, the data date, blocked storage, the S2 happy path, load error with "Try again", battery full, outside the Netherlands, battery unset, location denied with retry, approximate location, and the stay limits. Fails until Task 15.

**Files:**
- Create: `test/fixtures/memory-storage.ts`
- Create: `test/fixtures/app-deps.ts`
- Create: `test/acceptance/flows.test.ts`

**Interfaces:**
- Consumes: `test/fixtures/prd-tariffs.ts` (Task 1)
- Produces: `memoryStorage(): Storage` in its own fixture module (Task 11 imports it too, before `app-deps.ts` can load); fixture exports `EXAMPLE_RAW: RawSettings`, `NUENEN`, `BRUSSELS` (`Position`), `MANIFEST: Manifest`, `NEAREST: NearestResult`, `memoryStorage` (re-exported), `stubDeps(opts?) → AppDeps` with `vi.fn` spies on `locate`, `loadManifest` and `findNearest`. The tests expect `createApp` and `AppDeps` from `src/app.ts` (Task 15), `createSettingsStore`/`RawSettings` (Task 11), `DataLoadError`/`NearestResult` (Task 13) and `LocateOutcome`/`Position` (Task 12).

- [ ] **Step 1: Write the stub fixtures**

```ts
/** An in-memory Web Storage for tests. */
export function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}
```

```ts
// Stub dependencies for the controller: in-memory storage, scripted geolocation, a two-location tile set.
import { vi } from 'vitest';
import type { AppDeps } from '../../src/app.ts';
import { createSettingsStore, type RawSettings } from '../../src/services/settings.ts';
import { DataLoadError, type NearestResult } from '../../src/services/data.ts';
import type { LocateOutcome } from '../../src/services/location.ts';
import { FORMAT_VERSION, type Manifest } from '../../src/shared/data-format.ts';
import { FRIDAY_1000, TARIFFS, location } from './prd-tariffs.ts';
import { memoryStorage } from './memory-storage.ts';

export { memoryStorage };

export const EXAMPLE_RAW: RawSettings = {
  batteryKwh: '15', chargeKw: '3.6', kwhPerKm: '0.25', kmPerL: '12', petrolPrice: '2,399', cardStartFee: '0.89', cardMarkup: '0',
};

export const NUENEN = { lat: 51.4436, lon: 5.5519, accuracyM: 20 };
export const BRUSSELS = { lat: 50.8467, lon: 4.3525, accuracyM: 20 };

export const MANIFEST: Manifest = { formatVersion: FORMAT_VERSION, tileSizeDeg: 0.1, tiles: ['514_55'], dataTimestamp: '2026-10-09T06:12:00.000Z' };

export const NEAREST: NearestResult = {
  nearby: [
    { location: location('ALL:kerk6', [{ tariffKey: 'ALL:t', powerKw: 11 }], { operator: 'Allego', address: 'Kerkstraat 6' }), distanceM: 266 },
    { location: location('VAT:park21', [{ tariffKey: 'VAT:t', powerKw: 11 }], { operator: 'Vattenfall', address: 'Parkstraat 21' }), distanceM: 74 },
  ],
  tariffs: { 'VAT:t': TARIFFS.vattenfall, 'ALL:t': TARIFFS.allego },
};

/** Each call to `locate` resolves with the next scripted outcome (the last one repeats). */
export function stubDeps(opts: {
  storage?: () => Storage;
  locations?: LocateOutcome[];
  failFind?: number;
} = {}) {
  const outcomes = [...(opts.locations ?? [{ kind: 'found', position: NUENEN }])];
  let finds = 0;
  const deps = {
    store: createSettingsStore(opts.storage ?? (() => memoryStorage())),
    locate: vi.fn(async (): Promise<LocateOutcome> => (outcomes.length > 1 ? outcomes.shift()! : outcomes[0]!)),
    loadManifest: vi.fn(async () => MANIFEST),
    findNearest: vi.fn(async (): Promise<NearestResult> => {
      finds++;
      if (opts.failFind && finds <= opts.failFind) throw new DataLoadError('offline');
      return NEAREST;
    }),
    now: () => FRIDAY_1000,
  } satisfies AppDeps;
  return deps;
}
```

- [ ] **Step 2: Write the failing flow tests**

```ts
// Acceptance: the PRD Story 1–3 flows for Slice 1, through the controller with stubbed browser APIs.
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.ts';
import { entryViews } from '../../src/ui/entry-view.ts';
import { BRUSSELS, EXAMPLE_RAW, NUENEN, memoryStorage, stubDeps } from '../fixtures/app-deps.ts';

async function parkedApp(deps = stubDeps()) {
  const app = createApp(deps);
  await app.start();
  app.saveSettings(EXAMPLE_RAW);
  await deps.locate.mock.results.at(-1)!.value;
  return app;
}

describe('Story 1 — set up my car and costs', () => {
  it('scenario 1: first visit opens the setup; saving goes straight to "parked here now"; a reload skips setup', async () => {
    const storage = memoryStorage();
    const first = createApp(stubDeps({ storage: () => storage }));
    await first.start();
    expect(first.getState()).toMatchObject({ view: 'setup', setupNotice: true });
    expect(first.saveSettings(EXAMPLE_RAW).ok).toBe(true);
    expect(first.getState().view).toBe('parked');

    const reloaded = createApp(stubDeps({ storage: () => storage }));
    await reloaded.start();
    expect(reloaded.getState()).toMatchObject({ view: 'parked', settings: { petrolPrice: 2.399 } });
  });

  it('scenario 2: an out-of-range value blocks saving with the range message', async () => {
    const app = createApp(stubDeps());
    await app.start();
    expect(app.saveSettings({ ...EXAMPLE_RAW, chargeKw: '0' })).toEqual({ ok: false, errors: { chargeKw: 'Charging speed must be between 1 and 22 kW.' } });
    expect(app.getState().view).toBe('setup');
  });

  it('scenario 4: the settings screen has the tariff data date', async () => {
    const app = await parkedApp();
    app.openSettings();
    expect(app.getState()).toMatchObject({ view: 'setup', dataTimestamp: '2026-10-09T06:12:00.000Z' });
  });

  it('storage unavailable: works for the visit and warns', async () => {
    const app = createApp(stubDeps({ storage: () => { throw new Error('blocked'); } }));
    await app.start();
    app.saveSettings(EXAMPLE_RAW);
    expect(app.getState()).toMatchObject({ view: 'parked', storageWarning: true, settings: { chargeKw: 3.6 } });
  });
});

describe('Story 2 — see which nearby chargers are worth it', () => {
  it('scenario 1: allow location, battery 20%, stay 45 min, "Find chargers" → ranked results with the best selected', async () => {
    const app = await parkedApp();
    expect(app.getState().location).toEqual({ status: 'found', position: NUENEN, approximate: false });
    app.setBattery(20);
    app.setStay(45);
    await app.findChargers();
    const s = app.getState();
    expect(s).toMatchObject({ view: 'results', search: 'results' });
    const v = entryViews(s.results);
    expect(v.map((e) => [e.operator, e.verdictText, e.savingText])).toEqual([
      ['Vattenfall', 'Worth it', 'Saves €0.39 compared with €2.16 of petrol'],
      ['Allego', 'Never worth it', 'Costs €0.98 more than €2.16 of petrol'],
    ]);
    expect(s.selectedId).toBe(s.results[0]!.id);
  });

  it('scenario 2: data that can\'t be loaded shows the load error and no results; "Try again" recovers', async () => {
    const deps = stubDeps({ failFind: 1 });
    const app = await parkedApp(deps);
    app.setBattery(20);
    await app.findChargers();
    expect(app.getState()).toMatchObject({ view: 'results', search: 'load-error', results: [] });
    await app.findChargers();
    expect(app.getState()).toMatchObject({ search: 'results' });
  });

  it('scenario 3: battery 100% → "battery full", no results, no data loaded', async () => {
    const deps = stubDeps();
    const app = await parkedApp(deps);
    app.setBattery(100);
    await app.findChargers();
    expect(app.getState()).toMatchObject({ search: 'battery-full', results: [] });
    expect(deps.findNearest).not.toHaveBeenCalled();
  });

  it('outside the Netherlands: no results and no data loaded', async () => {
    const deps = stubDeps({ locations: [{ kind: 'found', position: BRUSSELS }] });
    const app = await parkedApp(deps);
    app.setBattery(20);
    await app.findChargers();
    expect(app.getState()).toMatchObject({ view: 'parked', search: 'outside-nl', results: [] });
    expect(deps.findNearest).not.toHaveBeenCalled();
  });

  it('battery not set: "Find chargers" is blocked and highlights the battery', async () => {
    const deps = stubDeps();
    const app = await parkedApp(deps);
    await app.findChargers();
    expect(app.getState()).toMatchObject({ view: 'parked', blocked: 'battery' });
    expect(deps.findNearest).not.toHaveBeenCalled();
  });

  it('location denied: "Find chargers" is blocked; "Try again" asks again and unblocks', async () => {
    const deps = stubDeps({ locations: [{ kind: 'denied' }, { kind: 'found', position: NUENEN }] });
    const app = await parkedApp(deps);
    app.setBattery(20);
    expect(app.getState().location).toEqual({ status: 'denied' });
    await app.findChargers();
    expect(app.getState().blocked).toBe('location');
    await app.retryLocation();
    await app.findChargers();
    expect(app.getState().search).toBe('results');
  });

  it('approximate location: the results repeat the notice', async () => {
    const deps = stubDeps({ locations: [{ kind: 'found', position: { ...NUENEN, accuracyM: 1500 } }] });
    const app = await parkedApp(deps);
    expect(app.getState().location).toMatchObject({ approximate: true });
    app.setBattery(20);
    await app.findChargers();
    expect(app.getState()).toMatchObject({ search: 'results', approximateResults: true });
  });
});

describe('Story 3 — tell the app how long I\'ll stay (parked screen)', () => {
  it('scenario 3: the stay starts at 1h30', async () => {
    expect((await parkedApp()).getState().stayMin).toBe(90);
  });

  it('scenario 2: − and + stop at 15 min and 24 h with the limit note', async () => {
    const app = await parkedApp();
    app.setStay(15);
    app.nudgeStay(-1);
    expect(app.getState()).toMatchObject({ stayMin: 15, stayLimitNote: true });
    app.nudgeStay(1);
    expect(app.getState()).toMatchObject({ stayMin: 30, stayLimitNote: false });
    app.setStay(1440);
    app.nudgeStay(1);
    expect(app.getState()).toMatchObject({ stayMin: 1440, stayLimitNote: true });
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npm test -- test/acceptance/flows.test.ts`
Expected: FAIL with `Error: Cannot find module '../../src/app.ts'`

- [ ] **Step 4: Commit**

```bash
git add test/fixtures/memory-storage.ts test/fixtures/app-deps.ts test/acceptance/flows.test.ts
git commit -m "test: Slice 1 flow acceptance tests for setup, search and stay"
```

**Verify:** `npm test -- test/acceptance/flows.test.ts` — FAIL with `Cannot find module '../../src/app.ts'` (expected at this stage; green after Task 15)

### Phase 2: Interfaces & Contracts

### Task 3: Shared data format

The one type file both the build script and the page import, so writer and reader can't drift apart (Components, `src/shared/data-format.ts`). It also holds the tile-key functions, because both sides must bucket points identically. The `+ 1e-9` in `tileIndex` keeps a point exactly on an edge (51.4) in tile 514, despite `51.4 / 0.1 = 513.9999…`.

**Files:**
- Create: `src/shared/data-format.ts`
- Test: `src/shared/data-format.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `FORMAT_VERSION = 1`, `TILE_SIZE_DEG = 0.1`; types `DayOfWeek`, `PriceComponentType`, `OcpiPriceComponent`, `OcpiRestrictions`, `OcpiTariffElement`, `TileTariff {currency, start_date_time, end_date_time, elements}`, `DataUnknownReason = 'no-tariff' | 'no-power'`, `TileEntry {tariffKey: string|null, powerKw: number|null, unknown?}`, `TileLocation {id, operator, address, city, lat, lon, entries}`, `Tile {formatVersion, key, locations, tariffs: Record<string, TileTariff>}`, `Manifest {formatVersion, tileSizeDeg, tiles: string[], dataTimestamp}`; functions `tileIndex(deg): number`, `tileKey(latIndex, lonIndex): string`, `tileKeyFor(lat, lon): string`, `parseTileKey(key): {latIndex, lonIndex}`. Tariff keys are `${party_id}:${id}` and location IDs are `${party_id}:${id}`, because bare IDs collide across operators (D-9).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { parseTileKey, tileIndex, tileKey, tileKeyFor } from './data-format.ts';

describe('tile keys (D-7)', () => {
  it('buckets by floor of 0.1°', () => {
    expect(tileKeyFor(51.4436, 5.5519)).toBe('514_55');
    expect(tileKeyFor(52.3700, 4.9000)).toBe('523_49');
  });

  it('puts a point exactly on a tile edge in the tile north/east of it', () => {
    expect(tileIndex(51.4)).toBe(514);
    expect(tileIndex(5.3)).toBe(53);
  });

  it('round-trips through parseTileKey', () => {
    expect(parseTileKey(tileKey(514, 55))).toEqual({ latIndex: 514, lonIndex: 55 });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -- src/shared/data-format.test.ts`
Expected: FAIL with `Cannot find module './data-format.ts'`

- [ ] **Step 3: Write the types and tile-key functions**

```ts
// Data format shared by scripts/build-data.ts (writer) and src/services/data.ts (reader).

export const FORMAT_VERSION = 1;
export const TILE_SIZE_DEG = 0.1;

export type DayOfWeek =
  | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export type PriceComponentType = 'ENERGY' | 'FLAT' | 'TIME' | 'PARKING_TIME';

export interface OcpiPriceComponent {
  type: PriceComponentType;
  price: number;
  vat?: number | null;
  step_size?: number;
}

export interface OcpiRestrictions {
  start_time?: string | null;
  end_time?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  min_kwh?: number | null;
  max_kwh?: number | null;
  min_current?: number | null;
  max_current?: number | null;
  min_power?: number | null;
  max_power?: number | null;
  min_duration?: number | null;
  max_duration?: number | null;
  day_of_week?: DayOfWeek[] | null;
  reservation?: string | null;
}

export interface OcpiTariffElement {
  price_components: OcpiPriceComponent[];
  restrictions?: OcpiRestrictions | null;
}

/** The part of an OCPI tariff the page needs; copied verbatim by the build script (D-8). */
export interface TileTariff {
  currency: string;
  start_date_time: string | null;
  end_date_time: string | null;
  elements: OcpiTariffElement[];
}

export type DataUnknownReason = 'no-tariff' | 'no-power';

export interface TileEntry {
  /** `${party_id}:${tariff id}`; null only for a `no-tariff` entry. */
  tariffKey: string | null;
  /** Highest published power (kW) among the AC connectors using this tariff (D-21). */
  powerKw: number | null;
  unknown?: DataUnknownReason;
}

export interface TileLocation {
  /** `${party_id}:${location id}` — bare location IDs collide across operators. */
  id: string;
  operator: string;
  address: string;
  city: string;
  lat: number;
  lon: number;
  entries: TileEntry[];
}

export interface Tile {
  formatVersion: number;
  key: string;
  locations: TileLocation[];
  tariffs: Record<string, TileTariff>;
}

export interface Manifest {
  formatVersion: number;
  tileSizeDeg: number;
  /** Keys of every tile file that exists, e.g. "514_55". */
  tiles: string[];
  /** ISO 8601 time of the tariff feed's Last-Modified header (G2-AC4). */
  dataTimestamp: string;
}

export function tileIndex(deg: number): number {
  return Math.floor(deg / TILE_SIZE_DEG + 1e-9);
}

export function tileKey(latIndex: number, lonIndex: number): string {
  return `${latIndex}_${lonIndex}`;
}

export function tileKeyFor(lat: number, lon: number): string {
  return tileKey(tileIndex(lat), tileIndex(lon));
}

export function parseTileKey(key: string): { latIndex: number; lonIndex: number } {
  const [lat, lon] = key.split('_').map(Number);
  return { latIndex: lat!, lonIndex: lon! };
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npm test -- src/shared/data-format.test.ts`
Expected: PASS — `Tests  3 passed (3)`

- [ ] **Step 5: Commit**

```bash
git add src/shared/data-format.ts src/shared/data-format.test.ts
git commit -m "feat: shared tile and tariff data format"
```

**Verify:** `npm test -- src/shared/data-format.test.ts` — `Tests  3 passed (3)`

### Phase 3: Component Implementation

### Task 4: Amsterdam clock

Gives the wall-clock date, minute of the day and weekday in Europe/Amsterdam for each of the 1,440 simulated minutes (D-16, G5-AC3). It's computed once per search and shared by every entry's simulation, so `Intl` runs 1,440 times per search, not per entry.

**Files:**
- Create: `src/engine/clock.ts`
- Test: `src/engine/clock.test.ts`

**Interfaces:**
- Consumes: `DayOfWeek` (Task 3)
- Produces: `SIM_MINUTES = 1440`; `interface MinuteClock { date: string; minuteOfDay: number; day: DayOfWeek }`; `amsterdamClock(utcMs: number): MinuteClock`; `buildClock(startMs: number): MinuteClock[]` (index i = the minute starting at `startMs + i × 60 000`)

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -- src/engine/clock.test.ts`
Expected: FAIL with `Cannot find module './clock.ts'`

- [ ] **Step 3: Implement the clock**

```ts
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
```

- [ ] **Step 4: Run it to see it pass**

Run: `npm test -- src/engine/clock.test.ts`
Expected: PASS — `Tests  3 passed (3)`

- [ ] **Step 5: Commit**

```bash
git add src/engine/clock.ts src/engine/clock.test.ts
git commit -m "feat: Amsterdam wall-clock time per simulated minute"
```

**Verify:** `npm test -- src/engine/clock.test.ts` — `Tests  3 passed (3)` (the suite runs with `TZ=America/New_York`)

### Task 5: Tariff matching and trust guard

OCPI restriction matching for one minute (D-11) and the G5-AC4 causes that can be decided without simulating (D-12): unsupported restriction types, no elements, a currency other than EUR, a non-zero `FLAT` behind a `min_duration`, and a validity period that doesn't cover the 24 hours. Time windows include the start and exclude the end, and a window with `end < start` wraps past midnight. Dates are compared as local `YYYY-MM-DD` strings, with the start included and the end excluded. `min_duration` and `max_duration` are read as elapsed session seconds at the start of the minute. A tariff carries a component type only through the elements that list it, so `firstMatchPrice` skips elements without that type (OCPI first match per component).

**Files:**
- Create: `src/engine/tariff.ts`
- Test: `src/engine/tariff.test.ts`

**Interfaces:**
- Consumes: `OcpiRestrictions`, `PriceComponentType`, `TileTariff` (Task 3); `SIM_MINUTES`, `MinuteClock` (Task 4); `tariff()` fixture (Task 1)
- Produces: `VAT = 1.21`; `isStaticallyReadable(tariff: TileTariff, startMs: number): boolean`; `restrictionsMatch(r: OcpiRestrictions | null | undefined, clock: MinuteClock, elapsedS: number): boolean`; `firstMatchPrice(tariff, type: PriceComponentType, clock, elapsedS): number | null` (excl. VAT; null = no element matched); `hasComponent(tariff, type, nonZero = false): boolean`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { firstMatchPrice, isStaticallyReadable, restrictionsMatch } from './tariff.ts';
import type { MinuteClock } from './clock.ts';
import { tariff } from '../../test/fixtures/prd-tariffs.ts';

const at = (hm: string, day: MinuteClock['day'] = 'FRIDAY', date = '2026-10-09'): MinuteClock => {
  const [h, m] = hm.split(':').map(Number);
  return { date, minuteOfDay: h! * 60 + m!, day };
};
const START = Date.parse('2026-10-09T08:00:00Z');

describe('restrictionsMatch', () => {
  it('matches a time window with start inclusive and end exclusive', () => {
    const r = { start_time: '16:00', end_time: '22:00' };
    expect(restrictionsMatch(r, at('15:59'), 0)).toBe(false);
    expect(restrictionsMatch(r, at('16:00'), 0)).toBe(true);
    expect(restrictionsMatch(r, at('21:59'), 0)).toBe(true);
    expect(restrictionsMatch(r, at('22:00'), 0)).toBe(false);
  });

  it('matches a window that wraps past midnight', () => {
    const r = { start_time: '21:00', end_time: '07:00' };
    expect(restrictionsMatch(r, at('23:30'), 0)).toBe(true);
    expect(restrictionsMatch(r, at('06:59'), 0)).toBe(true);
    expect(restrictionsMatch(r, at('07:00'), 0)).toBe(false);
  });

  it('matches day of week and dates (start inclusive, end exclusive)', () => {
    expect(restrictionsMatch({ day_of_week: ['SATURDAY', 'SUNDAY'] }, at('10:00', 'FRIDAY'), 0)).toBe(false);
    expect(restrictionsMatch({ day_of_week: ['SATURDAY', 'SUNDAY'] }, at('10:00', 'SATURDAY'), 0)).toBe(true);
    expect(restrictionsMatch({ start_date: '2026-10-10' }, at('10:00'), 0)).toBe(false);
    expect(restrictionsMatch({ end_date: '2026-10-09' }, at('10:00'), 0)).toBe(false);
    expect(restrictionsMatch({ end_date: '2026-10-10' }, at('10:00'), 0)).toBe(true);
  });

  it('reads min_duration and max_duration as elapsed session seconds', () => {
    expect(restrictionsMatch({ min_duration: 18_000 }, at('10:00'), 17_940)).toBe(false);
    expect(restrictionsMatch({ min_duration: 18_000 }, at('10:00'), 18_000)).toBe(true);
    expect(restrictionsMatch({ max_duration: 3_600 }, at('10:00'), 3_540)).toBe(true);
    expect(restrictionsMatch({ max_duration: 3_600 }, at('10:00'), 3_600)).toBe(false);
  });

  it('treats all-null restrictions as matching', () => {
    expect(restrictionsMatch({ start_time: null, end_time: null, day_of_week: null, min_duration: null }, at('03:00'), 0)).toBe(true);
  });
});

describe('firstMatchPrice', () => {
  it('takes the first element that carries the component and matches', () => {
    const t = tariff([
      { components: [['ENERGY', 0.5717]], restrictions: { start_time: '16:00', end_time: '22:00' } },
      { components: [['ENERGY', 0.5417], ['TIME', 0.41]] },
    ]);
    expect(firstMatchPrice(t, 'ENERGY', at('15:30'), 0)).toBe(0.5417);
    expect(firstMatchPrice(t, 'ENERGY', at('16:30'), 0)).toBe(0.5717);
    expect(firstMatchPrice(t, 'TIME', at('16:30'), 0)).toBe(0.41);
    expect(firstMatchPrice(t, 'PARKING_TIME', at('16:30'), 0)).toBeNull();
  });
});

describe('isStaticallyReadable (G5-AC4)', () => {
  const ok = tariff([{ components: [['ENERGY', 0.3]] }]);

  it('accepts a plain EUR tariff', () => {
    expect(isStaticallyReadable(ok, START)).toBe(true);
  });

  it.each(['min_kwh', 'max_kwh', 'min_current', 'max_current', 'min_power', 'max_power'] as const)(
    'rejects the unsupported restriction %s',
    (key) => {
      expect(isStaticallyReadable(tariff([{ components: [['ENERGY', 0.3]], restrictions: { [key]: 5 } }]), START)).toBe(false);
    },
  );

  it('rejects a reservation restriction', () => {
    expect(isStaticallyReadable(tariff([{ components: [['ENERGY', 0.3]], restrictions: { reservation: 'RESERVATION' } }]), START)).toBe(false);
  });

  it('rejects no elements, a non-EUR currency and a FLAT fee behind a min_duration', () => {
    expect(isStaticallyReadable(tariff([]), START)).toBe(false);
    expect(isStaticallyReadable({ ...ok, currency: 'GBP' }, START)).toBe(false);
    expect(isStaticallyReadable(tariff([
      { components: [['ENERGY', 0.3]] },
      { components: [['FLAT', 1]], restrictions: { min_duration: 3600 } },
    ]), START)).toBe(false);
  });

  it('rejects a validity period that does not cover the 24 hours from the start', () => {
    expect(isStaticallyReadable({ ...ok, start_date_time: '2026-10-09T09:00:00Z' }, START)).toBe(false);
    expect(isStaticallyReadable({ ...ok, end_date_time: '2026-10-10T07:59:00Z' }, START)).toBe(false);
    expect(isStaticallyReadable({ ...ok, start_date_time: '2026-01-01T00:00:00Z', end_date_time: '2026-10-10T08:00:00Z' }, START)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -- src/engine/tariff.test.ts`
Expected: FAIL with `Cannot find module './tariff.ts'`

- [ ] **Step 3: Implement matching and the static checks**

```ts
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
```

- [ ] **Step 4: Run it to see it pass**

Run: `npm test -- src/engine/tariff.test.ts`
Expected: PASS — `Tests  16 passed (16)`

- [ ] **Step 5: Commit**

```bash
git add src/engine/tariff.ts src/engine/tariff.test.ts
git commit -m "feat: OCPI restriction matching and static tariff checks"
```

**Verify:** `npm test -- src/engine/tariff.test.ts` — `Tests  16 passed (16)`

### Task 6: Cost curve

The per-minute simulation for one entry (D-10; Architecture, "The cost engine"). Power is the lower of the car's and the charger's. Each minute adds the lower of power ÷ 60 and the room left, and the car counts as charging while more than 1e-9 kWh of room is left. That threshold keeps floating-point dust after a full battery from billing an extra `TIME` minute. Each component type is priced by its first matching element, read once per minute. The `FLAT` fee is read once, from `atStart[3]`, for both the trust check and the start fee. `ENERGY` × kWh is billed while charging, `TIME` per minute while charging, `PARKING_TIME` per minute after full, and `FLAT` once, from minute 0. All tariff prices get × 1.21, and the card fees are added as entered. The function returns `null` for the G5-AC4 causes found while simulating: a non-zero `FLAT` that nothing applies at minute 0, and an `ENERGY` gap in any charging minute of the 1,440 (independent of the stay) when the tariff has `ENERGY` components. It also returns null for every static cause from Task 5. `startPrices` and `variesByTime` feed the price summary (G6-AC6).

**Files:**
- Create: `src/engine/curve.ts`
- Test: `src/engine/curve.test.ts`

**Interfaces:**
- Consumes: `TileTariff`, `PriceComponentType` (Task 3); `SIM_MINUTES`, `MinuteClock`, `buildClock` (Task 4); `VAT`, `firstMatchPrice`, `hasComponent`, `isStaticallyReadable` (Task 5)
- Produces: `interface StartPrices { energy; time; parking; flat }` (excl. VAT, 0 when nothing matches); `interface CostCurve { cost: Float64Array; kwh: Float64Array; startPrices: StartPrices; variesByTime: boolean }`, where `cost[T]` and `kwh[T]` are cumulative after a stay of T minutes, T = 0…1440, unrounded; `interface CurveInput { tariff; chargerKw; carKw; roomKwh; cardStartFee; cardMarkup; startMs; clock: MinuteClock[] }`; `buildCurve(input: CurveInput): CostCurve | null`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { buildCurve, type CurveInput } from './curve.ts';
import { buildClock } from './clock.ts';
import { TARIFFS, tariff } from '../../test/fixtures/prd-tariffs.ts';
import type { TileTariff } from '../shared/data-format.ts';

const START = Date.parse('2026-10-09T08:00:00Z'); // 10:00 Amsterdam
const CLOCK = buildClock(START);

function input(t: TileTariff, over: Partial<CurveInput> = {}): CurveInput {
  return { tariff: t, chargerKw: 22, carKw: 3.6, roomKwh: 12, cardStartFee: 0, cardMarkup: 0, startMs: START, clock: CLOCK, ...over };
}

describe('buildCurve — energy (G5-AC2)', () => {
  it('uses the car speed when the charger is faster (22 kW charger, 3.6 kW car)', () => {
    expect(buildCurve(input(TARIFFS.flat30))!.kwh[60]).toBeCloseTo(3.6, 9);
  });

  it('uses the charger speed when the car is faster (11 kW car, 3.7 kW charger)', () => {
    expect(buildCurve(input(TARIFFS.flat30, { carKw: 11, chargerKw: 3.7 }))!.kwh[60]).toBeCloseTo(3.7, 9);
  });

  it('stops at the room left in the battery (90% of 15 kWh → 1.5 kWh)', () => {
    const c = buildCurve(input(TARIFFS.flat30, { roomKwh: 15 * (1 - 0.9) }))!;
    expect(c.kwh[1440]).toBeCloseTo(1.5, 9);
    expect(c.kwh[25]).toBeCloseTo(1.5, 9);
  });

  it('adds VAT to tariff prices and card fees as entered', () => {
    const c = buildCurve(input(TARIFFS.flat30, { cardStartFee: 0.89, cardMarkup: 0.05 }))!;
    expect(c.cost[0]).toBeCloseTo(0.89, 9);
    expect(c.cost[60]).toBeCloseTo(0.89 + 3.6 * (0.3 * 1.21 + 0.05), 9);
  });

  it('bills TIME while charging and PARKING_TIME only after full, per minute', () => {
    const t = tariff([{ components: [['TIME', 0.6], ['PARKING_TIME', 1.2]] }]);
    const c = buildCurve(input(t, { roomKwh: 0.6 }))!; // full after 10 min at 3.6 kW
    expect(c.cost[10]).toBeCloseTo(10 * (0.6 * 1.21) / 60, 9);
    expect(c.cost[20]! - c.cost[10]!).toBeCloseTo(10 * (1.2 * 1.21) / 60, 9);
  });

  it('does not bill an extra charging minute for floating-point dust once full', () => {
    const t = tariff([{ components: [['ENERGY', 0.3], ['TIME', 1.2]] }]);
    const c = buildCurve(input(t, { roomKwh: 15 * 0.8 }))!; // 12 kWh, full at exactly 200 min
    expect(c.cost[201]).toBe(c.cost[200]);
  });
});

describe('buildCurve — time windows in Amsterdam time (G5-AC3)', () => {
  it('prices an overnight stay from 21:00 with the night rate across midnight', () => {
    const t = tariff([
      { components: [['ENERGY', 0.2]], restrictions: { start_time: '21:00', end_time: '07:00' } },
      { components: [['ENERGY', 0.4]] },
    ]);
    const start = Date.parse('2026-10-09T19:00:00Z'); // 21:00 Amsterdam; process runs in New York time
    const c = buildCurve(input(t, { startMs: start, clock: buildClock(start), roomKwh: 40, carKw: 1.2 }))!;
    expect(c.cost[600]).toBeCloseTo(10 * 1.2 * 0.2 * 1.21, 9); // 21:00–07:00
    expect(c.cost[660]! - c.cost[600]!).toBeCloseTo(1.2 * 0.4 * 1.21, 9); // 07:00–08:00
    expect(c.variesByTime).toBe(true);
  });
});

describe('buildCurve — start prices', () => {
  it('reports the components in force at minute 0, excluding VAT', () => {
    const c = buildCurve(input(TARIFFS.opcharge))!;
    expect(c.startPrices).toEqual({ energy: 0.43, time: 0, parking: 0.5, flat: 0.5 });
    expect(c.variesByTime).toBe(false);
  });

  it('flags a price that only applies after some duration', () => {
    const t = tariff([
      { components: [['PARKING_TIME', 1]], restrictions: { min_duration: 18_000 } },
      { components: [['ENERGY', 0.3]] },
    ]);
    expect(buildCurve(input(t))!.variesByTime).toBe(true);
  });
});

describe('buildCurve — "unknown" causes found while simulating (G5-AC4)', () => {
  it('rejects a non-zero FLAT fee that no element applies at minute 0', () => {
    const t = tariff([
      { components: [['ENERGY', 0.3]] },
      { components: [['FLAT', 1]], restrictions: { start_time: '18:00', end_time: '23:00' } },
    ]);
    expect(buildCurve(input(t))).toBeNull();
  });

  it('rejects an ENERGY gap during charging', () => {
    const t = tariff([{ components: [['ENERGY', 0.3]], restrictions: { start_time: '07:00', end_time: '12:00' } }]);
    expect(buildCurve(input(t, { roomKwh: 40, carKw: 1 }))).toBeNull();
  });

  it('accepts a tariff with no ENERGY component at all (time-only pricing)', () => {
    expect(buildCurve(input(TARIFFS.allego))).not.toBeNull();
  });

  it('accepts an ENERGY window that only fails after the battery is full', () => {
    const t = tariff([{ components: [['ENERGY', 0.3]], restrictions: { start_time: '07:00', end_time: '12:00' } }]);
    expect(buildCurve(input(t, { roomKwh: 3.6 }))).not.toBeNull(); // full at 11:00
  });

  it('rejects a statically unreadable tariff', () => {
    expect(buildCurve(input({ ...TARIFFS.flat30, currency: 'USD' }))).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -- src/engine/curve.test.ts`
Expected: FAIL with `Cannot find module './curve.ts'`

- [ ] **Step 3: Implement the simulation**

```ts
import type { PriceComponentType, TileTariff } from '../shared/data-format.ts';
import { SIM_MINUTES, type MinuteClock } from './clock.ts';
import { VAT, firstMatchPrice, hasComponent, isStaticallyReadable } from './tariff.ts';

/** Prices in force at minute 0, excluding VAT; 0 when no element matches. */
export interface StartPrices {
  energy: number;
  time: number;
  parking: number;
  flat: number;
}

export interface CostCurve {
  /** cost[T] = cumulative cost (€, incl. VAT and card fees, unrounded) of a stay of T minutes, T = 0…1440. */
  cost: Float64Array;
  /** kwh[T] = cumulative energy delivered after T minutes. */
  kwh: Float64Array;
  startPrices: StartPrices;
  /** True when some component's matching price at another minute differs from minute 0 (G6-AC6). */
  variesByTime: boolean;
}

export interface CurveInput {
  tariff: TileTariff;
  chargerKw: number;
  carKw: number;
  /** Room left in the battery: battery kWh × (1 − level). */
  roomKwh: number;
  /** Card fees as entered, including VAT (FR-012). */
  cardStartFee: number;
  cardMarkup: number;
  startMs: number;
  clock: MinuteClock[];
}

/** Order matters: index 3 is FLAT, read from `atStart[3]`. */
const TYPES: PriceComponentType[] = ['ENERGY', 'TIME', 'PARKING_TIME', 'FLAT'];
const FULL_EPSILON_KWH = 1e-9;

/** One 1,440-minute simulation (D-10); null when the tariff can't be fully interpreted (G5-AC4). */
export function buildCurve(input: CurveInput): CostCurve | null {
  const { tariff, clock } = input;
  if (!isStaticallyReadable(tariff, input.startMs)) return null;

  const atStart = TYPES.map((t) => firstMatchPrice(tariff, t, clock[0]!, 0));
  const flat = atStart[3]!;
  if (flat === null && hasComponent(tariff, 'FLAT', true)) return null;
  const hasEnergy = hasComponent(tariff, 'ENERGY');

  const perMinuteKwh = Math.min(input.carKw, input.chargerKw) / 60;
  const cost = new Float64Array(SIM_MINUTES + 1);
  const kwh = new Float64Array(SIM_MINUTES + 1);
  let variesByTime = false;
  let total = (flat ?? 0) * VAT + input.cardStartFee;
  let delivered = 0;
  cost[0] = total;

  for (let i = 0; i < SIM_MINUTES; i++) {
    const elapsedS = i * 60;
    const prices = TYPES.map((t) => firstMatchPrice(tariff, t, clock[i]!, elapsedS));
    if (prices.some((p, k) => p !== atStart[k])) variesByTime = true;
    const [energyPrice, timePrice, parkingPrice] = prices;

    const left = input.roomKwh - delivered;
    const charging = left > FULL_EPSILON_KWH;
    if (charging) {
      if (energyPrice === null && hasEnergy) return null;
      const e = Math.min(perMinuteKwh, left);
      total += e * ((energyPrice ?? 0) * VAT + input.cardMarkup);
      total += ((timePrice ?? 0) * VAT) / 60;
      delivered += e;
    } else {
      total += ((parkingPrice ?? 0) * VAT) / 60;
    }
    cost[i + 1] = total;
    kwh[i + 1] = delivered;
  }

  return {
    cost,
    kwh,
    startPrices: {
      energy: atStart[0] ?? 0,
      time: atStart[1] ?? 0,
      parking: atStart[2] ?? 0,
      flat: atStart[3] ?? 0,
    },
    variesByTime,
  };
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npm test -- src/engine/curve.test.ts`
Expected: PASS — `Tests  14 passed (14)`

- [ ] **Step 5: Commit**

```bash
git add src/engine/curve.ts src/engine/curve.test.ts
git commit -m "feat: per-minute cost curve with the OCPI trust guard"
```

**Verify:** `npm test -- src/engine/curve.test.ts` — `Tests  14 passed (14)`

### Task 7: Petrol comparison, verdict, window and ranking

Everything read off a curve (Architecture, the list under "The cost engine"). The petrol cost is kWh ÷ kWh/km ÷ km/L × €/L (FR-014), and the saving is the unrounded petrol cost minus the charge cost (D-19). The window is the shortest and longest stay in `WINDOW_GRID` with a saving above 0. The grid is 15 min, every 10 min from 20 min, plus every 15-minute slider stay (D-20). `hasGaps` is set when some grid stay inside the window isn't worth it. The verdict comes from the chosen stay: "worth-it" above 0, else "not-for-this-stay" when a window exists, else "never" (G6-AC2). The ranking follows G6-AC3: priced entries by saving, biggest first, then nearer, then tariff key; then the unknown entries, by distance, then `no-tariff` after the other reasons, then tariff key. Location ID is the last tie-breaker for both groups. The stay constants and `clampStay` live here, because the window grid and the slider must agree, and Slice 2's results slider will reuse the same clamp.

**Files:**
- Create: `src/engine/compare.ts`
- Test: `src/engine/compare.test.ts`

**Interfaces:**
- Consumes: `SIM_MINUTES` (Task 4); `CostCurve`, `buildCurve` (Task 6); fixtures (Task 1)
- Produces: `STAY_MIN = 15`, `STAY_MAX = 1440`, `STAY_STEP = 15`, `STAY_DEFAULT = 90`, `clampStay(min): number`, `WINDOW_GRID: number[]`; `interface PetrolSettings { kwhPerKm; kmPerL; petrolPrice }`; `interface Window { shortest; longest; hasGaps }`; `type Verdict = 'worth-it' | 'not-for-this-stay' | 'never'`; `type UnknownReason = 'no-tariff' | 'no-power' | 'unreadable'`; `PricedOutcome { kind: 'priced'; cost; kwh; petrolCost; saving; costPerKm; verdict }`, `UnknownOutcome { kind: 'unknown'; reason }`, `Outcome`; `petrolCost(kwh, s)`, `savingAt(curve, stayMin, s)`, `worthItWindow(curve, s): Window | null`, `outcomeAt(curve, window, stayMin, s): PricedOutcome`; `interface Rankable { locationId; distanceM; tariffKey; outcome }`; `rank<T extends Rankable>(items: T[]): T[]` (returns a new array)

- [ ] **Step 1: Write the failing test**

The gap fixture has a cheap first hour, an expensive second hour (€10/h `TIME`) and is cheap again until full at 40 kWh. Element 1 must carry `['TIME', 0]`. Without it, the first-match rule would take `TIME` from element 2 in the first hour too (OCPI first match per component type).

```ts
import { describe, expect, it } from 'vitest';
import { WINDOW_GRID, clampStay, outcomeAt, petrolCost, rank, worthItWindow, type Rankable } from './compare.ts';
import { buildCurve } from './curve.ts';
import { buildClock } from './clock.ts';
import { EXAMPLE_SETTINGS, TARIFFS, tariff } from '../../test/fixtures/prd-tariffs.ts';
import type { TileTariff } from '../shared/data-format.ts';

const START = Date.parse('2026-10-09T08:00:00Z');
const CLOCK = buildClock(START);
const curveFor = (t: TileTariff, battery: number) =>
  buildCurve({ tariff: t, chargerKw: 11, carKw: 3.6, roomKwh: 15 * (1 - battery / 100), cardStartFee: 0.89, cardMarkup: 0, startMs: START, clock: CLOCK })!;

describe('WINDOW_GRID (D-20)', () => {
  it('is 15 min, every 10 min from 20 min, plus every 15-minute slider stay, up to 24 h', () => {
    expect(WINDOW_GRID.slice(0, 8)).toEqual([15, 20, 30, 40, 45, 50, 60, 70]);
    expect(WINDOW_GRID.at(-1)).toBe(1440);
    for (let t = 15; t <= 1440; t += 15) expect(WINDOW_GRID).toContain(t);
  });
});

describe('clampStay (G7-AC3)', () => {
  it('keeps stays between 15 min and 24 h', () => {
    expect([clampStay(0), clampStay(15), clampStay(90), clampStay(1440), clampStay(1455)]).toEqual([15, 15, 90, 1440, 1440]);
  });
});

describe('petrolCost (FR-014)', () => {
  it('prices the distance the energy covers', () => {
    expect(petrolCost(2.7, EXAMPLE_SETTINGS)).toBeCloseTo(2.1591, 9);
  });
});

describe('worthItWindow', () => {
  it('Opcharge at 10%: 1h30 to 7h30', () => {
    expect(worthItWindow(curveFor(TARIFFS.opcharge, 10), EXAMPLE_SETTINGS)).toEqual({ shortest: 90, longest: 450, hasGaps: false });
  });

  it('Vattenfall Marconilaan at 10%: from 40 min up to 24 h', () => {
    expect(worthItWindow(curveFor(TARIFFS.vattenfall, 10), EXAMPLE_SETTINGS)).toEqual({ shortest: 40, longest: 1440, hasGaps: false });
  });

  it('E-Flux Laboratoriumstraat at 10%: none', () => {
    expect(worthItWindow(curveFor(TARIFFS.efluxLab, 10), EXAMPLE_SETTINGS)).toBeNull();
  });

  it('marks gaps when some stays inside the window are not worth it', () => {
    // Cheap first hour, an expensive second hour (€10/h while charging), cheap again until full at 40 kWh.
    const t = tariff([
      { components: [['ENERGY', 0.2], ['TIME', 0]], restrictions: { max_duration: 3600 } },
      { components: [['ENERGY', 0.2], ['TIME', 10]], restrictions: { max_duration: 7200 } },
      { components: [['ENERGY', 0.2]] },
    ]);
    const c = buildCurve({ tariff: t, chargerKw: 11, carKw: 3.6, roomKwh: 40, cardStartFee: 0, cardMarkup: 0, startMs: START, clock: CLOCK })!;
    expect(worthItWindow(c, EXAMPLE_SETTINGS)).toMatchObject({ shortest: 15, longest: 1440, hasGaps: true });
  });
});

describe('outcomeAt — verdict (G6-AC2)', () => {
  const opc = curveFor(TARIFFS.opcharge, 10);
  const win = worthItWindow(opc, EXAMPLE_SETTINGS);

  it('is "worth-it" when the unrounded saving is above 0', () => {
    expect(outcomeAt(opc, win, 90, EXAMPLE_SETTINGS)).toMatchObject({ verdict: 'worth-it' });
    expect(outcomeAt(opc, win, 90, EXAMPLE_SETTINGS).saving).toBeCloseTo(0.0136, 3);
  });

  it('is "not-for-this-stay" outside an existing window', () => {
    expect(outcomeAt(opc, win, 60, EXAMPLE_SETTINGS).verdict).toBe('not-for-this-stay');
  });

  it('is "never" without a window', () => {
    const c = curveFor(TARIFFS.efluxLab, 10);
    expect(outcomeAt(c, worthItWindow(c, EXAMPLE_SETTINGS), 90, EXAMPLE_SETTINGS).verdict).toBe('never');
  });

  it('carries cost, kWh, petrol cost and cost per km', () => {
    const c = curveFor(TARIFFS.vattenfall, 20);
    const o = outcomeAt(c, worthItWindow(c, EXAMPLE_SETTINGS), 45, EXAMPLE_SETTINGS);
    expect(o.kwh).toBeCloseTo(2.7, 9);
    expect(o.cost).toBeCloseTo(1.76915, 6);
    expect(o.petrolCost).toBeCloseTo(2.1591, 6);
    expect(o.costPerKm).toBeCloseTo(1.76915 / 10.8, 6);
  });
});

describe('rank (G6-AC3)', () => {
  const priced = (locationId: string, distanceM: number, saving: number, tariffKey = 'T:a'): Rankable => ({
    locationId, distanceM, tariffKey,
    outcome: { kind: 'priced', saving, cost: 0, kwh: 0, petrolCost: 0, costPerKm: 0, verdict: saving > 0 ? 'worth-it' : 'never' },
  });
  const unknown = (locationId: string, distanceM: number, reason: 'no-tariff' | 'no-power' | 'unreadable', tariffKey: string | null = null): Rankable => ({
    locationId, distanceM, tariffKey, outcome: { kind: 'unknown', reason },
  });
  const ids = (xs: Rankable[]) => rank(xs).map((x) => `${x.locationId}/${x.tariffKey}`);

  it('orders by saving, biggest first, then nearer, then tariff key, then location id', () => {
    expect(ids([
      priced('L1', 100, 0.5), priced('L2', 50, 0.5), priced('L3', 10, 0.9),
      priced('L4', 50, 0.5, 'T:0'), priced('L0', 50, 0.5, 'T:0'), priced('L5', 1, -2),
    ])).toEqual(['L3/T:a', 'L0/T:0', 'L4/T:0', 'L2/T:a', 'L1/T:a', 'L5/T:a']);
  });

  it('puts unknown entries last: by distance, no-tariff after other reasons, then tariff key, then location id', () => {
    expect(ids([
      unknown('U1', 10, 'no-tariff'), unknown('U2', 10, 'unreadable', 'T:b'), priced('P', 999, -5),
      unknown('U3', 5, 'no-tariff'), unknown('U4', 10, 'no-power', 'T:a'), unknown('U0', 10, 'no-tariff'),
    ])).toEqual(['P/T:a', 'U3/null', 'U4/T:a', 'U2/T:b', 'U0/null', 'U1/null']);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -- src/engine/compare.test.ts`
Expected: FAIL with `Cannot find module './compare.ts'`

- [ ] **Step 3: Implement the comparison and ranking**

```ts
import { SIM_MINUTES } from './clock.ts';
import type { CostCurve } from './curve.ts';

export const STAY_MIN = 15;
export const STAY_MAX = SIM_MINUTES;
export const STAY_STEP = 15;
export const STAY_DEFAULT = 90;

/** Keeps a stay within 15 min–24 h (G7-AC3). */
export function clampStay(min: number): number {
  return Math.min(STAY_MAX, Math.max(STAY_MIN, min));
}

/** Stays checked for the window: 15 min, every 10 min from 20 min, and every slider stay (D-20). */
export const WINDOW_GRID: number[] = (() => {
  const grid = new Set<number>([STAY_MIN]);
  for (let t = 20; t <= STAY_MAX; t += 10) grid.add(t);
  for (let t = STAY_MIN; t <= STAY_MAX; t += STAY_STEP) grid.add(t);
  return [...grid].sort((a, b) => a - b);
})();

export interface PetrolSettings {
  kwhPerKm: number;
  kmPerL: number;
  petrolPrice: number;
}

export interface Window {
  shortest: number;
  longest: number;
  /** Some grid stay between shortest and longest is not worth it. */
  hasGaps: boolean;
}

export type Verdict = 'worth-it' | 'not-for-this-stay' | 'never';
export type UnknownReason = 'no-tariff' | 'no-power' | 'unreadable';

export interface PricedOutcome {
  kind: 'priced';
  cost: number;
  kwh: number;
  petrolCost: number;
  /** petrolCost − cost, unrounded (D-19). */
  saving: number;
  costPerKm: number;
  verdict: Verdict;
}

export interface UnknownOutcome {
  kind: 'unknown';
  reason: UnknownReason;
}

export type Outcome = PricedOutcome | UnknownOutcome;

/** FR-014: petrol for the distance the added energy covers. */
export function petrolCost(kwh: number, s: PetrolSettings): number {
  return (kwh / s.kwhPerKm / s.kmPerL) * s.petrolPrice;
}

export function savingAt(curve: CostCurve, stayMin: number, s: PetrolSettings): number {
  return petrolCost(curve.kwh[stayMin]!, s) - curve.cost[stayMin]!;
}

/** Shortest and longest grid stay with saving > 0 (unrounded, D-19); null when there is none. */
export function worthItWindow(curve: CostCurve, s: PetrolSettings): Window | null {
  const worth = WINDOW_GRID.filter((t) => savingAt(curve, t, s) > 0);
  if (worth.length === 0) return null;
  const shortest = worth[0]!;
  const longest = worth[worth.length - 1]!;
  const span = WINDOW_GRID.filter((t) => t >= shortest && t <= longest).length;
  return { shortest, longest, hasGaps: span !== worth.length };
}

export function outcomeAt(
  curve: CostCurve,
  window: Window | null,
  stayMin: number,
  s: PetrolSettings,
): PricedOutcome {
  const kwh = curve.kwh[stayMin]!;
  const cost = curve.cost[stayMin]!;
  const petrol = petrolCost(kwh, s);
  const saving = petrol - cost;
  const km = kwh / s.kwhPerKm;
  const verdict: Verdict = saving > 0 ? 'worth-it' : window ? 'not-for-this-stay' : 'never';
  return { kind: 'priced', cost, kwh, petrolCost: petrol, saving, costPerKm: km > 0 ? cost / km : 0, verdict };
}

export interface Rankable {
  locationId: string;
  distanceM: number;
  tariffKey: string | null;
  outcome: Outcome;
}

function byText(a: string | null, b: string | null): number {
  const x = a ?? '';
  const y = b ?? '';
  return x < y ? -1 : x > y ? 1 : 0;
}

/** G6-AC3 ordering. Returns a new array. */
export function rank<T extends Rankable>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const pa = a.outcome;
    const pb = b.outcome;
    if (pa.kind === 'priced' && pb.kind === 'priced') {
      if (pa.saving !== pb.saving) return pb.saving - pa.saving;
      if (a.distanceM !== b.distanceM) return a.distanceM - b.distanceM;
    } else if (pa.kind !== pb.kind) {
      return pa.kind === 'priced' ? -1 : 1;
    } else if (pa.kind === 'unknown' && pb.kind === 'unknown') {
      if (a.distanceM !== b.distanceM) return a.distanceM - b.distanceM;
      const na = pa.reason === 'no-tariff' ? 1 : 0;
      const nb = pb.reason === 'no-tariff' ? 1 : 0;
      if (na !== nb) return na - nb;
    }
    return byText(a.tariffKey, b.tariffKey) || byText(a.locationId, b.locationId);
  });
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npm test -- src/engine/compare.test.ts`
Expected: PASS — `Tests  13 passed (13)`

- [ ] **Step 5: Commit**

```bash
git add src/engine/compare.ts src/engine/compare.test.ts
git commit -m "feat: petrol comparison, verdict, worth-it window and ranking"
```

**Verify:** `npm test -- src/engine/compare.test.ts` — `Tests  13 passed (13)`

### Task 8: Results builder

Connects the tiles to the engine. `computeEntries` builds one curve and window per entry, once per search (Data flow step 4). It keeps the tile's `no-tariff` and `no-power` reasons, and turns a missing tariff record, a missing power or a `null` curve into `unreadable`. `rankAtStay` reads every curve at the stay and ranks without running the engine again (Data flow step 5). That's what lets Slice 2 make a stay change cheap (G7-AC4). The room in the battery is battery kWh × (1 − level ÷ 100) (FR-013).

**Files:**
- Create: `src/engine/results.ts`
- Test: `src/engine/results.test.ts`

**Interfaces:**
- Consumes: `TileEntry`, `TileLocation`, `TileTariff` (Task 3); `buildClock` (Task 4); `buildCurve`, `CostCurve` (Task 6); `outcomeAt`, `rank`, `worthItWindow`, `Outcome`, `PetrolSettings`, `UnknownReason`, `Window` (Task 7)
- Produces: `interface EngineSettings extends PetrolSettings { batteryKwh; chargeKw; cardStartFee; cardMarkup }` (structurally the same as `Settings` in Task 11); `interface NearbyLocation { location: TileLocation; distanceM: number }`; `interface ComputedEntry { id; location; distanceM; tariffKey; curve: CostCurve | null; window: Window | null; reason: UnknownReason | null }`; `interface RankedEntry { id; locationId; distanceM; tariffKey; outcome: Outcome; entry: ComputedEntry; rank: number }`; `entryId(location, entry): string` (`${location.id}#${tariffKey ?? 'no-tariff'}`); `computeEntries(nearby, tariffs, settings, batteryPct, startMs): ComputedEntry[]`; `rankAtStay(entries, stayMin, settings: PetrolSettings): RankedEntry[]`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { computeEntries, entryId, rankAtStay } from './results.ts';
import { EXAMPLE_SETTINGS, FRIDAY_1000, TARIFFS, location } from '../../test/fixtures/prd-tariffs.ts';

describe('computeEntries', () => {
  it('builds one curve and window per priced entry', () => {
    const [e] = computeEntries([{ location: location('L:1', [{ tariffKey: 'T:v', powerKw: 11 }]), distanceM: 10 }], { 'T:v': TARIFFS.vattenfall }, EXAMPLE_SETTINGS, 20, FRIDAY_1000);
    expect(e).toMatchObject({ id: 'L:1#T:v', distanceM: 10, tariffKey: 'T:v', reason: null, window: { shortest: 40, longest: 1440 } });
    expect(e!.curve!.kwh[45]).toBeCloseTo(2.7, 9);
  });

  it('keeps the data reasons and marks anything it cannot price as unreadable', () => {
    const entries = computeEntries([{
      location: location('L:1', [
        { tariffKey: null, powerKw: null, unknown: 'no-tariff' },
        { tariffKey: 'T:v', powerKw: null, unknown: 'no-power' },
        { tariffKey: 'T:missing', powerKw: 11 },
        { tariffKey: 'T:gbp', powerKw: 11 },
      ]),
      distanceM: 10,
    }], { 'T:v': TARIFFS.vattenfall, 'T:gbp': { ...TARIFFS.vattenfall, currency: 'GBP' } }, EXAMPLE_SETTINGS, 20, FRIDAY_1000);
    expect(entries.map((e) => [e.id, e.reason, e.curve])).toEqual([
      ['L:1#no-tariff', 'no-tariff', null],
      ['L:1#T:v', 'no-power', null],
      ['L:1#T:missing', 'unreadable', null],
      ['L:1#T:gbp', 'unreadable', null],
    ]);
  });
});

describe('rankAtStay', () => {
  it('reads each curve at the stay, ranks, and numbers from 1', () => {
    const computed = computeEntries([
      { location: location('A:1', [{ tariffKey: 'T:lab', powerKw: 11 }]), distanceM: 5 },
      { location: location('B:1', [{ tariffKey: 'T:v', powerKw: 11 }]), distanceM: 50 },
      { location: location('C:1', [{ tariffKey: null, powerKw: null, unknown: 'no-tariff' }]), distanceM: 1 },
    ], { 'T:v': TARIFFS.vattenfall, 'T:lab': TARIFFS.efluxLab }, EXAMPLE_SETTINGS, 20, FRIDAY_1000);
    const ranked = rankAtStay(computed, 90, EXAMPLE_SETTINGS);
    expect(ranked.map((r) => [r.rank, r.id, r.outcome.kind])).toEqual([
      [1, 'B:1#T:v', 'priced'],
      [2, 'A:1#T:lab', 'priced'],
      [3, 'C:1#no-tariff', 'unknown'],
    ]);
  });

  it('entryId combines the location and the tariff key', () => {
    expect(entryId(location('L:9', []), { tariffKey: null, powerKw: null, unknown: 'no-tariff' })).toBe('L:9#no-tariff');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -- src/engine/results.test.ts`
Expected: FAIL with `Cannot find module './results.ts'`

- [ ] **Step 3: Implement the builder**

```ts
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
```

- [ ] **Step 4: Run it to see it pass**

Run: `npm test -- src/engine/results.test.ts`
Expected: PASS — `Tests  4 passed (4)`

- [ ] **Step 5: Commit**

```bash
git add src/engine/results.ts src/engine/results.test.ts
git commit -m "feat: compute cost curves per entry and rank at the stay"
```

**Verify:** `npm test -- src/engine/results.test.ts` — `Tests  4 passed (4)`

### Task 9: Display formatting

Every number the page shows. Rounding is half-up to cents after adding 1e-9, never `toFixed` on its own (Architecture, "Rounding"). The saving and extra-cost sentences follow G6-AC5, with the "less than €0.01" wording below €0.005 (D-19). That threshold is one function, `isTiny`, shared by the sentence, the short "Also here" phrase (`savingPhrase`) and the strip chip, so the three can't disagree for one entry. The strip chip shows "€4.23", "−€0.82" with U+2212 as in the mockup, or "<€0.01". Durations read "40 min", "1h30" and "2h". Distances are metres with an en-GB thousands separator. The price line lists the components in the order kWh, per hour while charging, per hour after full, start, then "price varies by time" when it applies, then the total (G6-AC5, G6-AC6). The data date is formatted in Amsterdam time from fixed month abbreviations, because ICU spells September "Sept" in some en-GB builds.

**Files:**
- Create: `src/ui/format.ts`
- Test: `src/ui/format.test.ts`

**Interfaces:**
- Consumes: `VAT` (Task 5); `StartPrices` (Task 6)
- Produces: `roundCents(x)`, `euro(x)` (absolute value, "€0.39"), `isTiny(amount)`, `savingSentence(saving, petrolCost)`, `savingPhrase(saving)` ("saves €0.39", "costs €0.82 more"), `amountChip(saving)`, `duration(min)`, `metres(m)`, `priceLine(start: StartPrices, variesByTime: boolean, total: number)`, `dataDate(iso): string` ("9 Oct 2026, 08:12")

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { amountChip, dataDate, duration, euro, metres, priceLine, roundCents, savingPhrase, savingSentence } from './format.ts';

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
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -- src/ui/format.test.ts`
Expected: FAIL with `Cannot find module './format.ts'`

- [ ] **Step 3: Implement the formatters**

```ts
import { VAT } from '../engine/tariff.ts';
import type { StartPrices } from '../engine/curve.ts';

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

export function metres(m: number): string {
  return `${Math.round(m).toLocaleString('en-GB')} m`;
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
```

- [ ] **Step 4: Run it to see it pass**

Run: `npm test -- src/ui/format.test.ts`
Expected: PASS — `Tests  11 passed (11)`

- [ ] **Step 5: Commit**

```bash
git add src/ui/format.ts src/ui/format.test.ts
git commit -m "feat: money, distance, duration and price-line formatting"
```

**Verify:** `npm test -- src/ui/format.test.ts` — `Tests  11 passed (11)`

### Task 10: Entry view model

What the details panel and the ranked strip show for each ranked entry, as plain strings. The views stay dumb, and every user-facing results message is unit-tested. The verdict and reason texts are the PRD's (G6-AC2, G6-AC7). An unknown entry has no saving and no price line. "Also here" links each entry to the others at its location (G6-AC8), using the mockup's "Also here: {verdict} · saves €X" wording. With this task the Task 1 acceptance test goes green.

**Files:**
- Create: `src/ui/entry-view.ts`
- Test: `src/ui/entry-view.test.ts`

**Interfaces:**
- Consumes: `RankedEntry` (Task 8); `UnknownReason`, `Verdict` (Task 7); `amountChip`, `metres`, `priceLine`, `savingPhrase`, `savingSentence` (Task 9)
- Produces: `type VerdictKind = Verdict | 'unknown'`; `VERDICT_TEXT: Record<VerdictKind, string>`; `REASON_TEXT: Record<UnknownReason, string>`; `interface AlsoHere { id; text }`; `interface EntryView { id; verdict; verdictText; rankText; distanceText; operator; address; savingText: string|null; priceText: string|null; reasonText: string|null; alsoHere: AlsoHere[]; chipText; stripText }`; `entryViews(ranked: RankedEntry[]): EntryView[]`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { entryViews } from './entry-view.ts';
import { computeEntries, rankAtStay } from '../engine/results.ts';
import { EXAMPLE_SETTINGS, FRIDAY_1000, TARIFFS, location, tariff } from '../../test/fixtures/prd-tariffs.ts';

function viewsFor(entries: Parameters<typeof location>[1], tariffs: Record<string, ReturnType<typeof tariff>>) {
  const computed = computeEntries([{ location: location('L:1', entries, { operator: 'Vattenfall', address: 'Parkstraat 21' }), distanceM: 74 }], tariffs, EXAMPLE_SETTINGS, 20, FRIDAY_1000);
  return entryViews(rankAtStay(computed, 45, EXAMPLE_SETTINGS));
}

describe('entryViews', () => {
  it('Nuenen fixture: what the details panel shows for a priced entry', () => {
    expect(viewsFor([{ tariffKey: 'V:t', powerKw: 11 }], { 'V:t': TARIFFS.vattenfall })[0]).toEqual({
      id: 'L:1#V:t',
      verdict: 'worth-it',
      verdictText: 'Worth it',
      rankText: '#1 of 1 · best saving first',
      distanceText: '74 m',
      operator: 'Vattenfall',
      address: 'Parkstraat 21, Nuenen',
      savingText: 'Saves €0.39 compared with €2.16 of petrol',
      priceText: '€0.33/kWh · total €1.77',
      reasonText: null,
      alsoHere: [],
      chipText: '€0.39',
      stripText: '1. Parkstraat 21',
    });
  });

  it.each([
    ['no-tariff', { tariffKey: null, powerKw: null, unknown: 'no-tariff' as const }, {}, 'No price published for this charger.'],
    ['no-power', { tariffKey: 'V:t', powerKw: null, unknown: 'no-power' as const }, { 'V:t': TARIFFS.vattenfall }, "Charging power isn't published for this charger."],
    ['unreadable', { tariffKey: 'V:t', powerKw: 11 }, { 'V:t': { ...TARIFFS.vattenfall, currency: 'GBP' } }, "The published price is incomplete or can't be read."],
  ])('unknown entry (%s) says what is missing and shows no figures (G6-AC7)', (_r, entry, tariffs, reason) => {
    expect(viewsFor([entry], tariffs)[0]).toMatchObject({
      verdict: 'unknown', verdictText: 'Price unknown', reasonText: reason, savingText: null, priceText: null, chipText: 'Unknown',
    });
  });

  it('links each entry to the other entries at the same location', () => {
    const v = viewsFor(
      [{ tariffKey: 'V:t', powerKw: 11 }, { tariffKey: null, powerKw: null, unknown: 'no-tariff' }],
      { 'V:t': TARIFFS.vattenfall },
    );
    expect(v[0]!.alsoHere).toEqual([{ id: 'L:1#no-tariff', text: 'Also here: Price unknown' }]);
    expect(v[1]!.alsoHere).toEqual([{ id: 'L:1#V:t', text: 'Also here: Worth it · saves €0.39' }]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -- src/ui/entry-view.test.ts`
Expected: FAIL with `Cannot find module './entry-view.ts'`

- [ ] **Step 3: Implement the view model**

```ts
import type { RankedEntry } from '../engine/results.ts';
import type { UnknownReason, Verdict } from '../engine/compare.ts';
import { amountChip, metres, priceLine, savingPhrase, savingSentence } from './format.ts';

export type VerdictKind = Verdict | 'unknown';

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
  reasonText: string | null;
  alsoHere: AlsoHere[];
  chipText: string;
  stripText: string;
}

export function entryViews(ranked: RankedEntry[]): EntryView[] {
  return ranked.map((e) => {
    const verdict: VerdictKind = e.outcome.kind === 'priced' ? e.outcome.verdict : 'unknown';
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
      reasonText: e.outcome.kind === 'unknown' ? REASON_TEXT[e.outcome.reason] : null,
      alsoHere: others.map((o) => {
        const ov: VerdictKind = o.outcome.kind === 'priced' ? o.outcome.verdict : 'unknown';
        const amount = o.outcome.kind === 'priced' ? savingPhrase(o.outcome.saving) : '';
        return { id: o.id, text: `Also here: ${VERDICT_TEXT[ov]}${amount ? ` · ${amount}` : ''}` };
      }),
      chipText: priced ? amountChip(priced.saving) : 'Unknown',
      stripText: `${e.rank}. ${loc.address}`,
    };
  });
}
```

- [ ] **Step 4: Run it and the Task 1 acceptance test to see them pass**

Run: `npm test -- src/ui/entry-view.test.ts test/acceptance/prd-figures.test.ts`
Expected: PASS — `Tests  12 passed (12)`

- [ ] **Step 5: Commit**

```bash
git add src/ui/entry-view.ts src/ui/entry-view.test.ts
git commit -m "feat: details panel and ranked strip view model"
```

**Verify:** `npm test -- src/ui/entry-view.test.ts test/acceptance/prd-figures.test.ts` — `Tests  12 passed (12)`

### Task 11: Settings service

The seven FR-001 fields, with the FR-004 ranges and the mockup's labels and units. Validation follows the PRD's charging-speed message pattern for every field (G1-AC1), and `parseDecimal` accepts comma decimals (G1-AC2). Settings are stored as `{version: 1, settings}` under `plugornot.settings.v1`. They're validated again on load, so a hand-edited or out-of-range value never reaches the engine. The store keeps an in-memory copy, so the page works for the visit when storage throws, and `save` reports `persisted: false` for the notice (G1-AC3). `getStorage` is a function because reading `window.localStorage` can itself throw in Safari private mode. The card fees start at "0.00" (FR-001), and the other fields start empty.

**Files:**
- Create: `src/services/settings.ts`
- Test: `src/services/settings.test.ts`

**Interfaces:**
- Consumes: `memoryStorage` (Task 2, `test/fixtures/memory-storage.ts`)
- Produces: `interface Settings { batteryKwh; chargeKw; kwhPerKm; kmPerL; petrolPrice; cardStartFee; cardMarkup }`; `type SettingKey`; `interface FieldSpec { key; group: 'car'|'petrol'|'card'; label; unit; messageUnit?; min; max; decimals; askName; name; initial }`; `FIELDS: FieldSpec[]`; `parseDecimal(text): number | null`; `type RawSettings = Record<SettingKey, string>`; `type ValidationResult = {ok: true; settings} | {ok: false; errors: Partial<Record<SettingKey, string>>}`; `validate(raw)`, `toRaw(s)`, `initialRaw()`; `STORAGE_KEY`; `interface SettingsStore { load(): Settings | null; save(s): { persisted: boolean } }`; `createSettingsStore(getStorage: () => Storage): SettingsStore`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -- src/services/settings.test.ts`
Expected: FAIL with `Cannot find module './settings.ts'`

- [ ] **Step 3: Implement the service**

```ts
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
```

- [ ] **Step 4: Run it to see it pass**

Run: `npm test -- src/services/settings.test.ts`
Expected: PASS — `Tests  29 passed (29)`

- [ ] **Step 5: Commit**

```bash
git add src/services/settings.ts src/services/settings.test.ts
git commit -m "feat: settings validation and versioned local storage"
```

**Verify:** `npm test -- src/services/settings.test.ts` — `Tests  29 passed (29)`

### Task 12: Netherlands border and browser location

`locate` wraps `getCurrentPosition` with the 10 s timeout. Denied, unavailable, timed-out and unsupported all become `denied`, which is what G3-AC1 shows. `isApproximate` uses the PRD's 1,000 m threshold (G3-AC2). `isInNetherlands` is an even-odd point-in-polygon test over the bundled border (D-15, G3-AC4). The border is generated once from Natural Earth by a small committed script, so it can be regenerated. The output is 608 points (about 9 kB): a 0.002° Douglas–Peucker tolerance is the coarsest that still puts Essen, Belgium (about 2 km from the border) outside. At 0.005° it lands inside.

**Files:**
- Create: `scripts/build-nl-border.mjs`
- Create: `src/services/nl-border.ts` (generated by the script; do not edit by hand)
- Create: `src/services/location.ts`
- Test: `src/services/location.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `NL_RINGS: ReadonlyArray<ReadonlyArray<readonly [number, number]>>` ([lon, lat]); `LOCATE_TIMEOUT_MS = 10_000`; `APPROXIMATE_ACCURACY_M = 1_000`; `interface Position { lat; lon; accuracyM }`; `type LocateOutcome = {kind: 'found'; position: Position} | {kind: 'denied'}`; `locate(geo: Geolocation | undefined, timeoutMs?): Promise<LocateOutcome>`; `isApproximate(p: Position): boolean`; `isInNetherlands(lat, lon): boolean`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { isApproximate, isInNetherlands, locate } from './location.ts';

function geo(behaviour: (ok: PositionCallback, fail: PositionErrorCallback, opts?: PositionOptions) => void): Geolocation {
  return { getCurrentPosition: vi.fn(behaviour), watchPosition: vi.fn(), clearWatch: vi.fn() } as unknown as Geolocation;
}
const pos = (lat: number, lon: number, accuracy: number) => ({ coords: { latitude: lat, longitude: lon, accuracy } }) as GeolocationPosition;

describe('locate (G3-AC1)', () => {
  it('returns the position when granted, asking with a 10 s timeout', async () => {
    const g = geo((ok) => ok(pos(51.4436, 5.5519, 20)));
    await expect(locate(g)).resolves.toEqual({ kind: 'found', position: { lat: 51.4436, lon: 5.5519, accuracyM: 20 } });
    expect(g.getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), expect.objectContaining({ timeout: 10_000 }));
  });

  it.each([
    ['denied', 1],
    ['unavailable', 2],
    ['timed out', 3],
  ])('returns denied when location is %s', async (_name, code) => {
    await expect(locate(geo((_ok, fail) => fail({ code, message: '' } as GeolocationPositionError)))).resolves.toEqual({ kind: 'denied' });
  });

  it('returns denied when the browser has no location API', async () => {
    await expect(locate(undefined)).resolves.toEqual({ kind: 'denied' });
  });
});

describe('isApproximate (G3-AC2)', () => {
  it('is true above 1,000 m', () => {
    expect(isApproximate({ lat: 0, lon: 0, accuracyM: 1500 })).toBe(true);
    expect(isApproximate({ lat: 0, lon: 0, accuracyM: 1000 })).toBe(false);
  });
});

describe('isInNetherlands (G3-AC4)', () => {
  it.each([
    ['Parkstraat Nuenen', 51.4436, 5.5519, true],
    ['Klokgebouw Eindhoven', 51.4484, 5.4573, true],
    ['Venlo (border town)', 51.3704, 6.1724, true],
    ['Grand-Place Brussels', 50.8467, 4.3525, false],
    ['Essen, Belgium (2 km south of the border)', 51.4651, 4.4517, false],
    ['Aachen, Germany', 50.7753, 6.0839, false],
    ['Texel (island)', 53.0546, 4.7977, true],
  ])('%s → %s', (_name, lat, lon, expected) => {
    expect(isInNetherlands(lat, lon)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -- src/services/location.test.ts`
Expected: FAIL with `Cannot find module './location.ts'`

- [ ] **Step 3: Write the border generator and generate the border**

```js
// Generates src/services/nl-border.ts from Natural Earth (public domain). Re-run by hand only if the border data changes:
//   curl -sL -o /tmp/ne.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_countries.geojson
//   node scripts/build-nl-border.mjs /tmp/ne.geojson
import fs from 'node:fs';
const [src, out = 'src/services/nl-border.ts'] = process.argv.slice(2);
const TOL = 0.002; // degrees, about 140–220 m
const g = JSON.parse(fs.readFileSync(src, 'utf8'));
const nld = g.features.find((f) => f.properties.ADM0_A3 === 'NLD');
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i]; const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1e-12;
    const d = Math.abs(dy * x - dx * y + b[0] * a[1] - b[1] * a[0]) / len;
    if (d > max) { max = d; idx = i; }
  }
  if (max <= tol) return [a, b];
  return [...dp(pts.slice(0, idx + 1), tol).slice(0, -1), ...dp(pts.slice(idx), tol)];
}
const rings = nld.geometry.coordinates
  .map((poly) => poly[0])
  .filter((ring) => ring.every(([, lat]) => lat > 50)) // European Netherlands only
  .map((ring) => {
    // A closed ring has equal end points, so simplify its two halves separately.
    const mid = Math.floor(ring.length / 2);
    return [...dp(ring.slice(0, mid + 1), TOL).slice(0, -1), ...dp(ring.slice(mid), TOL)];
  })
  .map((ring) => ring.map(([lon, lat]) => [Number(lon.toFixed(3)), Number(lat.toFixed(3))]))
  .filter((ring) => ring.length >= 4);
const body = rings.map((r) => '  [' + r.map(([lon, lat]) => `[${lon},${lat}]`).join(',') + ']').join(',\n');
fs.writeFileSync(out, `// Generated from Natural Earth v5.1.2 ne_10m_admin_0_countries (public domain): European
// Netherlands, Douglas–Peucker at ${TOL}°, coordinates [lon, lat] rounded to 0.001° (D-15).
export const NL_RINGS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
${body},
];
`);
console.log('rings', rings.length, 'points', rings.reduce((n, r) => n + r.length, 0), 'bytes', fs.statSync(out).size);
```

Run (the download goes to the system temp directory, never into the repo):

```bash
curl -sL -o "${TMPDIR:-/tmp}/ne_10m_admin_0_countries.geojson" https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_countries.geojson
```

```bash
node scripts/build-nl-border.mjs "${TMPDIR:-/tmp}/ne_10m_admin_0_countries.geojson"
```

Expected: `rings 9 points 608 bytes 9289`, and `shasum -a 256 src/services/nl-border.ts` prints `1838f77ec67ce3d19088138c05c54d22fc6817edf08a3bb35b0640aac41c7cca`.

- [ ] **Step 4: Implement the location service**

```ts
import { NL_RINGS } from './nl-border.ts';

export const LOCATE_TIMEOUT_MS = 10_000;
/** Worse than this is "approximate" (PRD S5 edge case, G3-AC2). */
export const APPROXIMATE_ACCURACY_M = 1_000;

export interface Position {
  lat: number;
  lon: number;
  accuracyM: number;
}

export type LocateOutcome = { kind: 'found'; position: Position } | { kind: 'denied' };

/** Browser location (G3-AC1). Denied, unavailable, timed out and unsupported all become `denied`. */
export function locate(geo: Geolocation | undefined, timeoutMs = LOCATE_TIMEOUT_MS): Promise<LocateOutcome> {
  return new Promise((resolve) => {
    if (!geo) {
      resolve({ kind: 'denied' });
      return;
    }
    geo.getCurrentPosition(
      (p) => resolve({ kind: 'found', position: { lat: p.coords.latitude, lon: p.coords.longitude, accuracyM: p.coords.accuracy } }),
      () => resolve({ kind: 'denied' }),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

export function isApproximate(p: Position): boolean {
  return p.accuracyM > APPROXIMATE_ACCURACY_M;
}

/** Even-odd point-in-polygon over every ring of the bundled border (D-15). */
export function isInNetherlands(lat: number, lon: number): boolean {
  let inside = false;
  for (const ring of NL_RINGS) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]!;
      const [xj, yj] = ring[j]!;
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `npm test -- src/services/location.test.ts`
Expected: PASS — `Tests  13 passed (13)`

- [ ] **Step 6: Commit**

```bash
git add scripts/build-nl-border.mjs src/services/nl-border.ts src/services/location.ts src/services/location.test.ts
git commit -m "feat: browser location wrapper and Netherlands border check"
```

**Verify:** `npm test -- src/services/location.test.ts` — `Tests  13 passed (13)`

### Task 13: Tile data service: nearest 10

Manifest and tile fetching with all-or-nothing failure (G4-AC3), where any network error, HTTP error, parse error or unknown `formatVersion` becomes a `DataLoadError`. Distance is haversine. The ring search (G4-AC1; Architecture, "Nearest-10 search") loads ring r of tiles, skipping keys the manifest doesn't list. It stops when the 10th-nearest location is closer than the nearest edge of the loaded block, or when the block covers the manifest's full tile extent. The distance to a north or south edge is the latitude difference along the meridian. The distance to an east or west edge is the great-circle distance to that meridian, R·asin(cos φ·sin Δλ). That makes the stop rule a true lower bound. Ties sort by location ID, so the result is deterministic.

**Files:**
- Create: `src/services/data.ts`
- Test: `src/services/data.test.ts`

**Interfaces:**
- Consumes: `FORMAT_VERSION`, `TILE_SIZE_DEG`, `parseTileKey`, `tileIndex`, `tileKey`, `Manifest`, `Tile`, `TileTariff` (Task 3); `NearbyLocation` (Task 8)
- Produces: `NEAREST_COUNT = 10`; `class DataLoadError extends Error`; `type FetchJson = (path: string) => Promise<unknown>`; `createFetchJson(baseUrl: string, fetchFn?: typeof fetch): FetchJson`; `haversineM(lat1, lon1, lat2, lon2): number`; `loadManifest(fetchJson): Promise<Manifest>`; `interface NearestResult { nearby: NearbyLocation[]; tariffs: Record<string, TileTariff> }`; `findNearest(lat, lon, manifest, fetchJson, count?): Promise<NearestResult>`. Paths are relative to the base URL: `data/manifest.json`, `data/tiles/{key}.json`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { DataLoadError, createFetchJson, findNearest, haversineM, loadManifest, type FetchJson } from './data.ts';
import { FORMAT_VERSION, TILE_SIZE_DEG, tileKeyFor, type Manifest, type Tile, type TileLocation } from '../shared/data-format.ts';

/** Deterministic pseudo-random numbers (LCG). */
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
}

/** A fixture tile set: dense around Eindhoven, a handful of sparse locations far away. */
function fixture() {
  const rand = rng(42);
  const locs: TileLocation[] = [];
  for (let i = 0; i < 400; i++) locs.push(loc(`D:${i}`, 51.3 + rand() * 0.3, 5.3 + rand() * 0.4));
  for (let i = 0; i < 6; i++) locs.push(loc(`S:${i}`, 52.8 + rand() * 0.6, 6.0 + rand() * 1.0));
  const tiles = new Map<string, Tile>();
  for (const l of locs) {
    const key = tileKeyFor(l.lat, l.lon);
    const t = tiles.get(key) ?? { formatVersion: FORMAT_VERSION, key, locations: [], tariffs: {} };
    t.locations.push(l);
    t.tariffs[`T:${key}`] = { currency: 'EUR', start_date_time: null, end_date_time: null, elements: [] };
    tiles.set(key, t);
  }
  const manifest: Manifest = { formatVersion: FORMAT_VERSION, tileSizeDeg: TILE_SIZE_DEG, tiles: [...tiles.keys()], dataTimestamp: '2026-10-09T06:12:00Z' };
  const fetchJson = vi.fn<FetchJson>(async (path) => {
    if (path === 'data/manifest.json') return manifest;
    const key = path.replace('data/tiles/', '').replace('.json', '');
    const t = tiles.get(key);
    if (!t) throw new DataLoadError(`404 ${path}`);
    return t;
  });
  return { locs, manifest, fetchJson };
}

function loc(id: string, lat: number, lon: number): TileLocation {
  return { id, operator: 'Op', address: id, city: 'X', lat, lon, entries: [{ tariffKey: null, powerKw: null, unknown: 'no-tariff' }] };
}

function bruteForce(locs: TileLocation[], lat: number, lon: number, n = 10) {
  return [...locs]
    .map((l) => ({ id: l.id, d: haversineM(lat, lon, l.lat, l.lon) }))
    .sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : 1))
    .slice(0, n)
    .map((x) => x.id);
}

describe('haversineM', () => {
  it('measures Parkstraat Nuenen to Klokgebouw Eindhoven at about 6.6 km', () => {
    expect(haversineM(51.4436, 5.5519, 51.4484, 5.4573)).toBeGreaterThan(6_500);
    expect(haversineM(51.4436, 5.5519, 51.4484, 5.4573)).toBeLessThan(6_700);
  });
});

describe('findNearest (G4-AC1)', () => {
  it.each([
    ['dense spot', 51.45, 5.5],
    ['spot on a tile corner', 51.4, 5.4],
    ['sparse spot far from everything', 53.3, 7.1],
  ])('matches a brute-force nearest-10 at a %s', async (_n, lat, lon) => {
    const { locs, manifest, fetchJson } = fixture();
    const res = await findNearest(lat, lon, manifest, fetchJson);
    expect(res.nearby.map((x) => x.location.id)).toEqual(bruteForce(locs, lat, lon));
    expect(res.nearby[0]!.distanceM).toBeCloseTo(haversineM(lat, lon, res.nearby[0]!.location.lat, res.nearby[0]!.location.lon), 6);
  });

  it('only fetches tiles listed in the manifest, and stops early in a dense area', async () => {
    const { manifest, fetchJson } = fixture();
    await findNearest(51.45, 5.5, manifest, fetchJson);
    const fetched = fetchJson.mock.calls.map(([p]) => p.replace('data/tiles/', '').replace('.json', ''));
    for (const k of fetched) expect(manifest.tiles).toContain(k);
    expect(fetched.length).toBeLessThan(manifest.tiles.length);
  });

  it('returns every location when the manifest holds fewer than 10', async () => {
    const { manifest, fetchJson, locs } = fixture();
    const small = { ...manifest, tiles: manifest.tiles.filter((k) => k.startsWith('52') || k.startsWith('53')) };
    const res = await findNearest(53.0, 6.5, small, fetchJson);
    expect(res.nearby).toHaveLength(locs.filter((l) => l.id.startsWith('S:')).length);
  });

  it('merges the tariffs of every loaded tile', async () => {
    const { manifest, fetchJson } = fixture();
    const res = await findNearest(51.45, 5.5, manifest, fetchJson);
    expect(Object.keys(res.tariffs).length).toBeGreaterThan(1);
  });
});

describe('load failures (G4-AC3)', () => {
  it('fails the whole request when the third tile fails', async () => {
    const { manifest, fetchJson } = fixture();
    let n = 0;
    const flaky: FetchJson = async (p) => {
      if (p.startsWith('data/tiles/') && ++n === 3) throw new DataLoadError('boom');
      return fetchJson(p);
    };
    await expect(findNearest(51.45, 5.5, manifest, flaky)).rejects.toBeInstanceOf(DataLoadError);
  });

  it('rejects a manifest with an unknown format version', async () => {
    await expect(loadManifest(async () => ({ formatVersion: 99, tiles: [] }))).rejects.toBeInstanceOf(DataLoadError);
  });

  it('turns network errors and HTTP errors into DataLoadError', async () => {
    const offline = createFetchJson('/base/', (async () => { throw new TypeError('offline'); }) as typeof fetch);
    await expect(offline('data/manifest.json')).rejects.toBeInstanceOf(DataLoadError);
    const missing = createFetchJson('/base/', (async () => new Response('', { status: 404 })) as typeof fetch);
    await expect(missing('data/tiles/1_1.json')).rejects.toBeInstanceOf(DataLoadError);
    const ok = createFetchJson('/base/', (async (url: string) => Response.json({ url })) as typeof fetch);
    await expect(ok('data/manifest.json')).resolves.toEqual({ url: '/base/data/manifest.json' });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -- src/services/data.test.ts`
Expected: FAIL with `Cannot find module './data.ts'`

- [ ] **Step 3: Implement the service**

```ts
import {
  FORMAT_VERSION, TILE_SIZE_DEG, parseTileKey, tileIndex, tileKey,
  type Manifest, type Tile, type TileTariff,
} from '../shared/data-format.ts';
import type { NearbyLocation } from '../engine/results.ts';

export const NEAREST_COUNT = 10;
const EARTH_RADIUS_M = 6_371_008.8;
const RAD = Math.PI / 180;

/** Any failed fetch, missing tile or unknown format: the whole request fails (G4-AC3). */
export class DataLoadError extends Error {}

export type FetchJson = (path: string) => Promise<unknown>;

export function createFetchJson(baseUrl: string, fetchFn: typeof fetch = fetch): FetchJson {
  return async (path) => {
    let res: Response;
    try {
      res = await fetchFn(`${baseUrl}${path}`);
    } catch (e) {
      throw new DataLoadError(`fetch ${path}: ${String(e)}`);
    }
    if (!res.ok) throw new DataLoadError(`fetch ${path}: HTTP ${res.status}`);
    try {
      return await res.json();
    } catch (e) {
      throw new DataLoadError(`parse ${path}: ${String(e)}`);
    }
  };
}

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * RAD;
  const dLon = (lon2 - lon1) * RAD;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

export async function loadManifest(fetchJson: FetchJson): Promise<Manifest> {
  const m = (await fetchJson('data/manifest.json')) as Manifest;
  if (!m || m.formatVersion !== FORMAT_VERSION || !Array.isArray(m.tiles)) {
    throw new DataLoadError('unknown manifest format');
  }
  return m;
}

export interface NearestResult {
  nearby: NearbyLocation[];
  tariffs: Record<string, TileTariff>;
}

/** Shortest distance from the spot to the edge of the loaded block of tiles (a lower bound for anything outside it). */
function distanceToBlockEdgeM(lat: number, lon: number, latIdx: number, lonIdx: number, r: number): number {
  const south = (latIdx - r) * TILE_SIZE_DEG;
  const north = (latIdx + r + 1) * TILE_SIZE_DEG;
  const west = (lonIdx - r) * TILE_SIZE_DEG;
  const east = (lonIdx + r + 1) * TILE_SIZE_DEG;
  const toParallel = (edge: number) => Math.abs(lat - edge) * RAD * EARTH_RADIUS_M;
  const toMeridian = (edge: number) =>
    EARTH_RADIUS_M * Math.asin(Math.min(1, Math.cos(lat * RAD) * Math.sin(Math.abs(lon - edge) * RAD)));
  return Math.min(toParallel(south), toParallel(north), toMeridian(west), toMeridian(east));
}

/** Ring search over the tiles (G4-AC1): the true `count` nearest by straight-line distance, however far. */
export async function findNearest(
  lat: number,
  lon: number,
  manifest: Manifest,
  fetchJson: FetchJson,
  count = NEAREST_COUNT,
): Promise<NearestResult> {
  const existing = new Set(manifest.tiles);
  const keys = manifest.tiles.map(parseTileKey);
  const minLat = Math.min(...keys.map((k) => k.latIndex));
  const maxLat = Math.max(...keys.map((k) => k.latIndex));
  const minLon = Math.min(...keys.map((k) => k.lonIndex));
  const maxLon = Math.max(...keys.map((k) => k.lonIndex));
  const la = tileIndex(lat);
  const lo = tileIndex(lon);
  const found: NearbyLocation[] = [];
  const tariffs: Record<string, TileTariff> = {};

  for (let r = 0; ; r++) {
    const ring: string[] = [];
    for (let i = la - r; i <= la + r; i++) {
      for (let j = lo - r; j <= lo + r; j++) {
        if (Math.max(Math.abs(i - la), Math.abs(j - lo)) !== r) continue;
        const key = tileKey(i, j);
        if (existing.has(key)) ring.push(key);
      }
    }
    const tiles = await Promise.all(ring.map((key) => fetchJson(`data/tiles/${key}.json`) as Promise<Tile>));
    for (const tile of tiles) {
      if (!tile || tile.formatVersion !== FORMAT_VERSION) throw new DataLoadError('unknown tile format');
      Object.assign(tariffs, tile.tariffs);
      for (const location of tile.locations) {
        found.push({ location, distanceM: haversineM(lat, lon, location.lat, location.lon) });
      }
    }
    found.sort((a, b) => a.distanceM - b.distanceM || (a.location.id < b.location.id ? -1 : 1));
    const coversAll = la - r <= minLat && la + r >= maxLat && lo - r <= minLon && lo + r >= maxLon;
    const nth = found[count - 1];
    if (coversAll || (nth && nth.distanceM < distanceToBlockEdgeM(lat, lon, la, lo, r))) {
      return { nearby: found.slice(0, count), tariffs };
    }
  }
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npm test -- src/services/data.test.ts`
Expected: PASS — `Tests  10 passed (10)`

- [ ] **Step 5: Commit**

```bash
git add src/services/data.ts src/services/data.test.ts
git commit -m "feat: tile loading and exact nearest-10 ring search"
```

**Verify:** `npm test -- src/services/data.test.ts` — `Tests  10 passed (10)`

### Task 14: Data build script and committed snapshot

`npm run build-data` downloads both feeds into memory, transforms them and writes `public/data/` (G2). The transform is pure and exported for tests. It keeps locations whose `publish` isn't false and that have an AC connector, and applies the entry rules from Architecture: (a) one entry per resolved tariff at the highest published power (D-21); (b) `no-power` when none of that tariff's connectors publishes power (D-18); (c) at most one `no-tariff` entry when any AC connector lists no tariff or an unresolvable one. Tariffs are joined on the location's `party_id` + the tariff ID (D-9). Each tile gets copies of only the tariffs its locations use, copied verbatim (D-8). The feed sometimes names no operator (about 2,000 AC locations in the 2026-10-12 feed). The design is silent here, so the operator falls back through `operator` → `suboperator` → `owner` → `party_id`. Nothing is written until both downloads are parsed. Writing goes to `public/data.next/` first and is then swapped in, so a failure leaves the old snapshot untouched (Error handling). Measured on 2026-10-12: about 6 s, 1.3 GB peak memory, 591 tiles, 72,729 locations, 24 MB uncompressed.

The live-snapshot smoke check (Testing & verification) is part of this task: it reads the committed tiles from disk at Parkstraat Nuenen and Klokgebouw Eindhoven.

**Files:**
- Create: `scripts/build-data.ts`
- Create: `test/fixtures/feeds/locations.json`
- Create: `test/fixtures/feeds/tariffs.json`
- Test: `scripts/build-data.test.ts`
- Create: `test/snapshot.test.ts`
- Create: `public/data/manifest.json`, `public/data/tiles/*.json` (generated by `npm run build-data`)

**Interfaces:**
- Consumes: `FORMAT_VERSION`, `TILE_SIZE_DEG`, `tileKeyFor`, `Manifest`, `OcpiTariffElement`, `Tile`, `TileEntry`, `TileLocation`, `TileTariff` (Task 3); `findNearest`, `loadManifest`, `FetchJson` (Task 13); `computeEntries`, `rankAtStay` (Task 8); `EXAMPLE_SETTINGS` (Task 1)
- Produces: `LOCATIONS_URL`, `TARIFFS_URL`; feed types `FeedConnector`, `FeedLocation`, `FeedTariff`; `connectorPowerKw(c): number | null`; `tariffKey(partyId, id)`; `locationEntries(loc, tariffs: Map<string, TileTariff>): TileEntry[]`; `transformFeeds(locations, tariffs, dataTimestamp): { manifest: Manifest; tiles: Tile[] }`; `writeSnapshot(outDir, result): Promise<void>`; the committed snapshot

- [ ] **Step 1: Write the fixture feeds**

`test/fixtures/feeds/tariffs.json` — two operators share the bare ID `T1` (the G2-AC3 collision). `UNUSED` must not reach any tile:

```json
[
  { "id": "T1", "party_id": "AAA", "currency": "EUR", "start_date_time": null, "end_date_time": null, "elements": [{ "price_components": [{ "type": "ENERGY", "price": 0.30, "vat": null, "step_size": 1 }], "restrictions": null }], "last_updated": "2026-10-08T00:00:00Z" },
  { "id": "T1", "party_id": "BBB", "currency": "EUR", "start_date_time": null, "end_date_time": null, "elements": [{ "price_components": [{ "type": "ENERGY", "price": 0.55, "vat": null, "step_size": 1 }], "restrictions": null }], "last_updated": "2026-10-08T00:00:00Z" },
  { "id": "T2", "party_id": "AAA", "currency": "EUR", "start_date_time": null, "end_date_time": null, "elements": [{ "price_components": [{ "type": "TIME", "price": 1.00, "vat": null, "step_size": 60 }], "restrictions": null }], "last_updated": "2026-10-08T00:00:00Z" },
  { "id": "UNUSED", "party_id": "AAA", "currency": "EUR", "start_date_time": null, "end_date_time": null, "elements": [], "last_updated": "2026-10-08T00:00:00Z" }
]
```

`test/fixtures/feeds/locations.json` — one location per G2-AC2 case: AC-only, DC-only, mixed, priced plus tariff-less connector, one resolvable and one unresolvable ID, no published power, unpublished, colliding ID with no operator name, a shared tariff at two powers, and `tariff_ids: null`:

```json
[
 {
  "id": "AC_ONLY",
  "party_id": "AAA",
  "country_code": "NL",
  "publish": true,
  "name": "AC_ONLY",
  "address": "Street AC_ONLY",
  "city": "Nuenen",
  "postal_code": "5671",
  "coordinates": {
   "latitude": "51.4436",
   "longitude": "5.5519"
  },
  "operator": {
   "name": "Vattenfall"
  },
  "suboperator": null,
  "owner": null,
  "time_zone": "Europe/Amsterdam",
  "evses": [
   {
    "uid": "AC_ONLY-0",
    "connectors": [
     {
      "id": "1",
      "standard": "IEC_62196_T2",
      "format": "SOCKET",
      "power_type": "AC_3_PHASE",
      "max_voltage": null,
      "max_amperage": null,
      "max_electric_power": 11000,
      "tariff_ids": [
       "T1"
      ]
     }
    ]
   }
  ]
 },
 {
  "id": "DC_ONLY",
  "party_id": "AAA",
  "country_code": "NL",
  "publish": true,
  "name": "DC_ONLY",
  "address": "Street DC_ONLY",
  "city": "Nuenen",
  "postal_code": "5671",
  "coordinates": {
   "latitude": "51.444",
   "longitude": "5.552"
  },
  "operator": {
   "name": "Op X"
  },
  "suboperator": null,
  "owner": null,
  "time_zone": "Europe/Amsterdam",
  "evses": [
   {
    "uid": "DC_ONLY-0",
    "connectors": [
     {
      "id": "1",
      "standard": "IEC_62196_T2",
      "format": "SOCKET",
      "power_type": "DC",
      "max_voltage": null,
      "max_amperage": null,
      "max_electric_power": 50000,
      "tariff_ids": [
       "T2"
      ]
     }
    ]
   }
  ]
 },
 {
  "id": "MIXED",
  "party_id": "AAA",
  "country_code": "NL",
  "publish": true,
  "name": "MIXED",
  "address": "Street MIXED",
  "city": "Nuenen",
  "postal_code": "5671",
  "coordinates": {
   "latitude": "51.445",
   "longitude": "5.553"
  },
  "operator": {
   "name": "Op X"
  },
  "suboperator": null,
  "owner": null,
  "time_zone": "Europe/Amsterdam",
  "evses": [
   {
    "uid": "MIXED-0",
    "connectors": [
     {
      "id": "1",
      "standard": "IEC_62196_T2",
      "format": "SOCKET",
      "power_type": "AC_3_PHASE",
      "max_voltage": 230,
      "max_amperage": 16,
      "max_electric_power": null,
      "tariff_ids": [
       "T1"
      ]
     }
    ]
   },
   {
    "uid": "MIXED-1",
    "connectors": [
     {
      "id": "1",
      "standard": "IEC_62196_T2",
      "format": "SOCKET",
      "power_type": "DC",
      "max_voltage": null,
      "max_amperage": null,
      "max_electric_power": 50000,
      "tariff_ids": [
       "T2"
      ]
     }
    ]
   }
  ]
 },
 {
  "id": "HALF_PRICED",
  "party_id": "AAA",
  "country_code": "NL",
  "publish": true,
  "name": "HALF_PRICED",
  "address": "Street HALF_PRICED",
  "city": "Nuenen",
  "postal_code": "5671",
  "coordinates": {
   "latitude": "51.446",
   "longitude": "5.554"
  },
  "operator": {
   "name": "Op X"
  },
  "suboperator": null,
  "owner": null,
  "time_zone": "Europe/Amsterdam",
  "evses": [
   {
    "uid": "HALF_PRICED-0",
    "connectors": [
     {
      "id": "1",
      "standard": "IEC_62196_T2",
      "format": "SOCKET",
      "power_type": "AC_1_PHASE",
      "max_voltage": null,
      "max_amperage": null,
      "max_electric_power": 7400,
      "tariff_ids": [
       "T1"
      ]
     }
    ]
   },
   {
    "uid": "HALF_PRICED-1",
    "connectors": [
     {
      "id": "1",
      "standard": "IEC_62196_T2",
      "format": "SOCKET",
      "power_type": "AC_1_PHASE",
      "max_voltage": null,
      "max_amperage": null,
      "max_electric_power": 7400,
      "tariff_ids": []
     }
    ]
   }
  ]
 },
 {
  "id": "ONE_UNRESOLVED",
  "party_id": "AAA",
  "country_code": "NL",
  "publish": true,
  "name": "ONE_UNRESOLVED",
  "address": "Street ONE_UNRESOLVED",
  "city": "Nuenen",
  "postal_code": "5671",
  "coordinates": {
   "latitude": "51.447",
   "longitude": "5.555"
  },
  "operator": {
   "name": "Op X"
  },
  "suboperator": null,
  "owner": null,
  "time_zone": "Europe/Amsterdam",
  "evses": [
   {
    "uid": "ONE_UNRESOLVED-0",
    "connectors": [
     {
      "id": "1",
      "standard": "IEC_62196_T2",
      "format": "SOCKET",
      "power_type": "AC_3_PHASE",
      "max_voltage": null,
      "max_amperage": null,
      "max_electric_power": 11000,
      "tariff_ids": [
       "T1",
       "NOPE"
      ]
     }
    ]
   }
  ]
 },
 {
  "id": "NO_POWER",
  "party_id": "AAA",
  "country_code": "NL",
  "publish": true,
  "name": "NO_POWER",
  "address": "Street NO_POWER",
  "city": "Nuenen",
  "postal_code": "5671",
  "coordinates": {
   "latitude": "51.448",
   "longitude": "5.556"
  },
  "operator": {
   "name": "Op X"
  },
  "suboperator": null,
  "owner": null,
  "time_zone": "Europe/Amsterdam",
  "evses": [
   {
    "uid": "NO_POWER-0",
    "connectors": [
     {
      "id": "1",
      "standard": "IEC_62196_T2",
      "format": "SOCKET",
      "power_type": "AC_3_PHASE",
      "max_voltage": null,
      "max_amperage": null,
      "max_electric_power": null,
      "tariff_ids": [
       "T2"
      ]
     }
    ]
   }
  ]
 },
 {
  "id": "HIDDEN",
  "party_id": "AAA",
  "country_code": "NL",
  "publish": false,
  "name": "HIDDEN",
  "address": "Street HIDDEN",
  "city": "Nuenen",
  "postal_code": "5671",
  "coordinates": {
   "latitude": "51.449",
   "longitude": "5.557"
  },
  "operator": {
   "name": "Op X"
  },
  "suboperator": null,
  "owner": null,
  "time_zone": "Europe/Amsterdam",
  "evses": [
   {
    "uid": "HIDDEN-0",
    "connectors": [
     {
      "id": "1",
      "standard": "IEC_62196_T2",
      "format": "SOCKET",
      "power_type": "AC_3_PHASE",
      "max_voltage": null,
      "max_amperage": null,
      "max_electric_power": 11000,
      "tariff_ids": [
       "T1"
      ]
     }
    ]
   }
  ]
 },
 {
  "id": "COLLIDE",
  "party_id": "BBB",
  "country_code": "NL",
  "publish": true,
  "name": "COLLIDE",
  "address": "Street COLLIDE",
  "city": "Nuenen",
  "postal_code": "5671",
  "coordinates": {
   "latitude": "51.45",
   "longitude": "5.558"
  },
  "operator": null,
  "suboperator": null,
  "owner": null,
  "time_zone": "Europe/Amsterdam",
  "evses": [
   {
    "uid": "COLLIDE-0",
    "connectors": [
     {
      "id": "1",
      "standard": "IEC_62196_T2",
      "format": "SOCKET",
      "power_type": "AC_3_PHASE",
      "max_voltage": null,
      "max_amperage": null,
      "max_electric_power": 11000,
      "tariff_ids": [
       "T1"
      ]
     }
    ]
   }
  ]
 },
 {
  "id": "SHARED",
  "party_id": "AAA",
  "country_code": "NL",
  "publish": true,
  "name": "SHARED",
  "address": "Street SHARED",
  "city": "Nuenen",
  "postal_code": "5671",
  "coordinates": {
   "latitude": "52.37",
   "longitude": "4.9"
  },
  "operator": {
   "name": "Op X"
  },
  "suboperator": null,
  "owner": null,
  "time_zone": "Europe/Amsterdam",
  "evses": [
   {
    "uid": "SHARED-0",
    "connectors": [
     {
      "id": "1",
      "standard": "IEC_62196_T2",
      "format": "SOCKET",
      "power_type": "AC_1_PHASE",
      "max_voltage": null,
      "max_amperage": null,
      "max_electric_power": 3700,
      "tariff_ids": [
       "T1"
      ]
     }
    ]
   },
   {
    "uid": "SHARED-1",
    "connectors": [
     {
      "id": "1",
      "standard": "IEC_62196_T2",
      "format": "SOCKET",
      "power_type": "AC_3_PHASE",
      "max_voltage": null,
      "max_amperage": null,
      "max_electric_power": 11000,
      "tariff_ids": [
       "T1"
      ]
     }
    ]
   },
   {
    "uid": "SHARED-2",
    "connectors": [
     {
      "id": "1",
      "standard": "IEC_62196_T2",
      "format": "SOCKET",
      "power_type": "AC_3_PHASE",
      "max_voltage": null,
      "max_amperage": null,
      "max_electric_power": null,
      "tariff_ids": [
       "T2"
      ]
     }
    ]
   },
   {
    "uid": "SHARED-3",
    "connectors": [
     {
      "id": "1",
      "standard": "IEC_62196_T2",
      "format": "SOCKET",
      "power_type": "AC_1_PHASE",
      "max_voltage": null,
      "max_amperage": null,
      "max_electric_power": 7400,
      "tariff_ids": [
       "T2"
      ]
     }
    ]
   }
  ]
 },
 {
  "id": "NULL_TARIFFS",
  "party_id": "AAA",
  "country_code": "NL",
  "publish": true,
  "name": "NULL_TARIFFS",
  "address": "Street NULL_TARIFFS",
  "city": "Nuenen",
  "postal_code": "5671",
  "coordinates": {
   "latitude": "52.371",
   "longitude": "4.901"
  },
  "operator": {
   "name": "Op X"
  },
  "suboperator": null,
  "owner": null,
  "time_zone": "Europe/Amsterdam",
  "evses": [
   {
    "uid": "NULL_TARIFFS-0",
    "connectors": [
     {
      "id": "1",
      "standard": "IEC_62196_T2",
      "format": "SOCKET",
      "power_type": "AC_1_PHASE",
      "max_voltage": null,
      "max_amperage": null,
      "max_electric_power": 7400,
      "tariff_ids": null
     }
    ]
   }
  ]
 }
]
```

- [ ] **Step 2: Write the failing transform test**

```ts
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { connectorPowerKw, transformFeeds, writeSnapshot, type FeedLocation, type FeedTariff } from './build-data.ts';
import { FORMAT_VERSION, type TileLocation } from '../src/shared/data-format.ts';

const feed = <T>(name: string): T => JSON.parse(readFileSync(new URL(`../test/fixtures/feeds/${name}`, import.meta.url), 'utf8')) as T;
const LOCATIONS = feed<FeedLocation[]>('locations.json');
const TARIFFS = feed<FeedTariff[]>('tariffs.json');
const STAMP = '2026-10-09T06:12:00.000Z';

function byId(): Map<string, TileLocation & { tile: string }> {
  const { tiles } = transformFeeds(LOCATIONS, TARIFFS, STAMP);
  return new Map(tiles.flatMap((t) => t.locations.map((l) => [l.id, { ...l, tile: t.key }] as const)));
}

describe('connectorPowerKw', () => {
  it('uses max_electric_power, else V × A (× 3 for three-phase), else null', () => {
    expect(connectorPowerKw({ power_type: 'AC_3_PHASE', max_electric_power: 11000 })).toBe(11);
    expect(connectorPowerKw({ power_type: 'AC_3_PHASE', max_voltage: 230, max_amperage: 16 })).toBeCloseTo(11.04, 9);
    expect(connectorPowerKw({ power_type: 'AC_1_PHASE', max_voltage: 230, max_amperage: 16 })).toBeCloseTo(3.68, 9);
    expect(connectorPowerKw({ power_type: 'AC_1_PHASE', max_electric_power: 0 })).toBeNull();
  });
});

describe('transformFeeds — which locations are kept (G2-AC2)', () => {
  it('keeps published locations with an AC connector and drops DC-only and unpublished ones', () => {
    const ids = [...byId().keys()].sort();
    expect(ids).toEqual(['AAA:AC_ONLY', 'AAA:HALF_PRICED', 'AAA:MIXED', 'AAA:NO_POWER', 'AAA:NULL_TARIFFS', 'AAA:ONE_UNRESOLVED', 'AAA:SHARED', 'BBB:COLLIDE']);
  });
});

describe('transformFeeds — entry rules (G2-AC2, G2-AC3)', () => {
  const locs = byId();
  const entries = (id: string) => locs.get(id)!.entries;

  it('one entry per resolved tariff with the connector power', () => {
    expect(entries('AAA:AC_ONLY')).toEqual([{ tariffKey: 'AAA:T1', powerKw: 11 }]);
  });

  it('ignores DC connectors at a mixed location', () => {
    expect(entries('AAA:MIXED')).toEqual([{ tariffKey: 'AAA:T1', powerKw: 11.04 }]);
  });

  it('adds one no-tariff entry next to a priced connector', () => {
    expect(entries('AAA:HALF_PRICED')).toEqual([{ tariffKey: 'AAA:T1', powerKw: 7.4 }, { tariffKey: null, powerKw: null, unknown: 'no-tariff' }]);
    expect(entries('AAA:NULL_TARIFFS')).toEqual([{ tariffKey: null, powerKw: null, unknown: 'no-tariff' }]);
  });

  it('a connector with one resolvable and one unresolvable ID gives one priced entry plus one no-tariff entry', () => {
    expect(entries('AAA:ONE_UNRESOLVED')).toEqual([{ tariffKey: 'AAA:T1', powerKw: 11 }, { tariffKey: null, powerKw: null, unknown: 'no-tariff' }]);
  });

  it('marks a tariff whose connectors publish no power as no-power', () => {
    expect(entries('AAA:NO_POWER')).toEqual([{ tariffKey: 'AAA:T2', powerKw: null, unknown: 'no-power' }]);
  });

  it('prices a shared tariff at the highest published power (D-21), ignoring connectors without power', () => {
    expect(entries('AAA:SHARED')).toEqual([{ tariffKey: 'AAA:T1', powerKw: 11 }, { tariffKey: 'AAA:T2', powerKw: 7.4 }]);
  });

  it('joins on party_id + id, so a colliding bare ID gets its own operator\'s tariff', () => {
    expect(entries('BBB:COLLIDE')).toEqual([{ tariffKey: 'BBB:T1', powerKw: 11 }]);
    const { tiles } = transformFeeds(LOCATIONS, TARIFFS, STAMP);
    const tile = tiles.find((t) => t.locations.some((l) => l.id === 'BBB:COLLIDE'))!;
    expect(tile.tariffs['BBB:T1']!.elements[0]!.price_components[0]!.price).toBe(0.55);
    expect(tile.tariffs['AAA:T1']!.elements[0]!.price_components[0]!.price).toBe(0.3);
  });

  it('falls back to the party ID when the feed names no operator', () => {
    expect(locs.get('BBB:COLLIDE')!.operator).toBe('BBB');
    expect(locs.get('AAA:AC_ONLY')!.operator).toBe('Vattenfall');
  });
});

describe('transformFeeds — tiles and manifest (G2-AC1, G2-AC4)', () => {
  it('buckets by floor of 0.1° and copies only referenced tariffs into each tile', () => {
    const { manifest, tiles } = transformFeeds(LOCATIONS, TARIFFS, STAMP);
    expect(manifest).toEqual({ formatVersion: FORMAT_VERSION, tileSizeDeg: 0.1, tiles: ['514_55', '523_49'], dataTimestamp: STAMP });
    expect(Object.keys(tiles[0]!.tariffs).sort()).toEqual(['AAA:T1', 'AAA:T2', 'BBB:T1']);
    expect(Object.keys(tiles[1]!.tariffs).sort()).toEqual(['AAA:T1', 'AAA:T2']);
    expect(JSON.stringify(tiles)).not.toContain('UNUSED');
  });

  it('copies elements, currency and validity dates verbatim', () => {
    const { tiles } = transformFeeds(LOCATIONS, TARIFFS, STAMP);
    expect(tiles[0]!.tariffs['AAA:T2']).toEqual({
      currency: 'EUR', start_date_time: null, end_date_time: null,
      elements: [{ price_components: [{ type: 'TIME', price: 1, vat: null, step_size: 60 }], restrictions: null }],
    });
  });
});

describe('writeSnapshot', () => {
  it('replaces the output directory with the manifest and one file per tile', async () => {
    const dir = join(await mkdtemp(join(tmpdir(), 'pon-')), 'data');
    await writeSnapshot(dir, transformFeeds(LOCATIONS, TARIFFS, STAMP));
    await writeSnapshot(dir, transformFeeds(LOCATIONS.slice(0, 1), TARIFFS, STAMP));
    expect((await readdir(join(dir, 'tiles'))).sort()).toEqual(['514_55.json']);
    expect(JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8')).tiles).toEqual(['514_55']);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npm test -- scripts/build-data.test.ts`
Expected: FAIL with `Cannot find module './build-data.ts'`

- [ ] **Step 4: Implement the script**

```ts
// Builds public/data/ (manifest + 0.1° tiles) from the NDW OCPI feeds. Run by hand: npm run build-data.
// Raw feed data stays in memory (D-2); nothing is written until both feeds are downloaded and parsed.
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import {
  FORMAT_VERSION, TILE_SIZE_DEG, tileKeyFor,
  type Manifest, type OcpiTariffElement, type Tile, type TileEntry, type TileLocation, type TileTariff,
} from '../src/shared/data-format.ts';

export const LOCATIONS_URL = 'https://opendata.ndw.nu/charging_point_locations_ocpi.json.gz';
export const TARIFFS_URL = 'https://opendata.ndw.nu/charging_point_tariffs_ocpi.json.gz';

/** The subset of an NDW OCPI location this script reads. */
export interface FeedConnector {
  power_type: 'AC_1_PHASE' | 'AC_3_PHASE' | 'DC';
  max_voltage?: number | null;
  max_amperage?: number | null;
  max_electric_power?: number | null;
  tariff_ids?: string[] | null;
}
export interface FeedLocation {
  id: string;
  party_id: string;
  publish?: boolean | null;
  address?: string | null;
  city?: string | null;
  coordinates: { latitude: string; longitude: string };
  operator?: { name?: string | null } | null;
  suboperator?: { name?: string | null } | null;
  owner?: { name?: string | null } | null;
  evses?: Array<{ connectors?: FeedConnector[] | null }> | null;
}
export interface FeedTariff {
  id: string;
  party_id: string;
  currency: string;
  start_date_time?: string | null;
  end_date_time?: string | null;
  elements?: OcpiTariffElement[] | null;
}

/** kW from max_electric_power (W), else voltage × amperage (× 3 for AC_3_PHASE); null when not published. */
export function connectorPowerKw(c: FeedConnector): number | null {
  if (c.max_electric_power && c.max_electric_power > 0) return c.max_electric_power / 1000;
  if (c.max_voltage && c.max_amperage && c.max_voltage > 0 && c.max_amperage > 0) {
    return (c.max_voltage * c.max_amperage * (c.power_type === 'AC_3_PHASE' ? 3 : 1)) / 1000;
  }
  return null;
}

export const tariffKey = (partyId: string, id: string) => `${partyId}:${id}`;

/** The entry rules from the solution design's Architecture section, for one location. */
export function locationEntries(loc: FeedLocation, tariffs: Map<string, TileTariff>): TileEntry[] {
  const ac = (loc.evses ?? []).flatMap((e) => e.connectors ?? []).filter((c) => c.power_type !== 'DC');
  const powerByTariff = new Map<string, number | null>();
  let missing = false;
  for (const c of ac) {
    const ids = c.tariff_ids ?? [];
    if (ids.length === 0) missing = true;
    for (const id of ids) {
      const key = tariffKey(loc.party_id, id);
      if (!tariffs.has(key)) {
        missing = true;
        continue;
      }
      const power = connectorPowerKw(c);
      const best = powerByTariff.get(key) ?? null;
      powerByTariff.set(key, power === null ? best : Math.max(best ?? 0, power));
    }
  }
  const entries: TileEntry[] = [...powerByTariff.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, powerKw]) => (powerKw === null ? { tariffKey: key, powerKw: null, unknown: 'no-power' } : { tariffKey: key, powerKw }));
  if (missing) entries.push({ tariffKey: null, powerKw: null, unknown: 'no-tariff' });
  return entries;
}

export function transformFeeds(
  locations: FeedLocation[],
  feedTariffs: FeedTariff[],
  dataTimestamp: string,
): { manifest: Manifest; tiles: Tile[] } {
  const tariffs = new Map<string, TileTariff>();
  for (const t of feedTariffs) {
    tariffs.set(tariffKey(t.party_id, t.id), {
      currency: t.currency,
      start_date_time: t.start_date_time ?? null,
      end_date_time: t.end_date_time ?? null,
      elements: t.elements ?? [],
    });
  }
  const tiles = new Map<string, Tile>();
  for (const loc of locations) {
    if (loc.publish === false) continue;
    const hasAc = (loc.evses ?? []).some((e) => (e.connectors ?? []).some((c) => c.power_type !== 'DC'));
    if (!hasAc) continue;
    const lat = Number(loc.coordinates.latitude);
    const lon = Number(loc.coordinates.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const key = tileKeyFor(lat, lon);
    const tile = tiles.get(key) ?? { formatVersion: FORMAT_VERSION, key, locations: [], tariffs: {} };
    const entries = locationEntries(loc, tariffs);
    const out: TileLocation = {
      id: `${loc.party_id}:${loc.id}`,
      operator: loc.operator?.name ?? loc.suboperator?.name ?? loc.owner?.name ?? loc.party_id,
      address: loc.address ?? '',
      city: loc.city ?? '',
      lat,
      lon,
      entries,
    };
    tile.locations.push(out);
    for (const e of entries) if (e.tariffKey) tile.tariffs[e.tariffKey] = tariffs.get(e.tariffKey)!;
    tiles.set(key, tile);
  }
  const sorted = [...tiles.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
  return {
    manifest: { formatVersion: FORMAT_VERSION, tileSizeDeg: TILE_SIZE_DEG, tiles: sorted.map((t) => t.key), dataTimestamp },
    tiles: sorted,
  };
}

async function download(url: string): Promise<{ json: unknown; lastModified: string | null }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return { json: JSON.parse(gunzipSync(buf).toString('utf8')), lastModified: res.headers.get('last-modified') };
}

/** Writes next to public/data and swaps it in, so a failed write never leaves a half-replaced snapshot. */
export async function writeSnapshot(outDir: string, result: { manifest: Manifest; tiles: Tile[] }): Promise<void> {
  const next = `${outDir}.next`;
  await rm(next, { recursive: true, force: true });
  await mkdir(`${next}/tiles`, { recursive: true });
  for (const tile of result.tiles) await writeFile(`${next}/tiles/${tile.key}.json`, JSON.stringify(tile));
  await writeFile(`${next}/manifest.json`, `${JSON.stringify(result.manifest, null, 1)}\n`);
  await rm(outDir, { recursive: true, force: true });
  await rename(next, outDir);
}

async function main(): Promise<void> {
  const [locations, tariffs] = await Promise.all([download(LOCATIONS_URL), download(TARIFFS_URL)]);
  if (!tariffs.lastModified) throw new Error('tariff feed sent no Last-Modified header');
  const result = transformFeeds(
    locations.json as FeedLocation[],
    tariffs.json as FeedTariff[],
    new Date(tariffs.lastModified).toISOString(),
  );
  await writeSnapshot('public/data', result);
  const locs = result.tiles.reduce((n, t) => n + t.locations.length, 0);
  console.log(`Wrote ${result.tiles.length} tiles, ${locs} locations, data of ${result.manifest.dataTimestamp}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
```

- [ ] **Step 5: Run the transform test to see it pass**

Run: `npm test -- scripts/build-data.test.ts`
Expected: PASS — `Tests  13 passed (13)`

- [ ] **Step 6: Build the real snapshot**

Run: `npm run build-data`
Expected: `Wrote <about 590> tiles, <about 72,700> locations, data of <ISO time of the tariff feed's Last-Modified>`; `git status --short` lists only `public/data/` (no `*.json.gz`, no `public/data.next/`).

- [ ] **Step 7: Write the smoke check and run it against the snapshot**

```ts
// Live-snapshot smoke check: run after every `npm run build-data` (solution design, Testing & verification).
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { findNearest, loadManifest, type FetchJson } from '../src/services/data.ts';
import { computeEntries, rankAtStay } from '../src/engine/results.ts';
import { EXAMPLE_SETTINGS } from './fixtures/prd-tariffs.ts';

const fromDisk: FetchJson = async (path) => JSON.parse(await readFile(new URL(`../public/${path}`, import.meta.url), 'utf8'));

describe('committed snapshot in public/data', () => {
  it.each([
    ['Parkstraat Nuenen', 51.4436, 5.5519],
    ['Klokgebouw Eindhoven', 51.4484, 5.4573],
  ])('%s: 10 locations, at least one priced entry, no errors', async (name, lat, lon) => {
    const manifest = await loadManifest(fromDisk);
    const { nearby, tariffs } = await findNearest(lat, lon, manifest, fromDisk);
    expect(nearby).toHaveLength(10);
    const ranked = rankAtStay(computeEntries(nearby, tariffs, EXAMPLE_SETTINGS, 20, Date.now()), 90, EXAMPLE_SETTINGS);
    const unknown = ranked.filter((r) => r.outcome.kind === 'unknown').length;
    expect(ranked.length - unknown).toBeGreaterThan(0);
    console.info(`${name}: ${ranked.length} entries, ${unknown} unknown (${Math.round((100 * unknown) / ranked.length)}%)`);
  });
});
```

Run: `npm test -- test/snapshot.test.ts --silent=false`
Expected: PASS — `Tests  2 passed (2)`, plus one line per spot like `Parkstraat Nuenen: 11 entries, 1 unknown (9%)` (reported, not asserted; the 2026-10-12 feed gave 1 unknown at Nuenen and 0 at Klokgebouw).

- [ ] **Step 8: Commit**

```bash
git add scripts/build-data.ts scripts/build-data.test.ts test/fixtures/feeds test/snapshot.test.ts public/data
git commit -m "feat: NDW data build script and committed tile snapshot"
```

**Verify:** `npm test -- scripts/build-data.test.ts test/snapshot.test.ts` — `Tests  15 passed (15)`; `git ls-files public/data | grep -c tiles/` prints the tile count reported by `npm run build-data`

### Task 15: Controller

Owns app state and the request flow (Architecture layer 2; G7-AC5): settings → location → "Find chargers" → Netherlands check → battery-full check → tiles → curves → results. The location is asked for when the parked view first opens. Going back to the parked view keeps it and doesn't ask again (Architecture, controller). "Find chargers" is refused while the battery is unset (`blocked: 'battery'`) and while the location is unknown or denied (`blocked: 'location'`). Outside the Netherlands and at 100% battery, no data is loaded. The loaded tiles are cached per spot, so a battery change with the same spot doesn't refetch (Data flow step 6). The controller keeps the computed curves, so the settings screen can recompute without a refetch when the driver changes a setting from the results (G1-AC4). The manifest loads at start for the data date on the settings screen (G2-AC4). A failed load is retried on the next search, and whichever load succeeds sets the data date. With this task the Task 2 acceptance test goes green.

**Files:**
- Create: `src/app.ts`
- Test: `src/app.test.ts`

**Interfaces:**
- Consumes: `Manifest` (Task 3); `computeEntries`, `rankAtStay`, `ComputedEntry`, `RankedEntry` (Task 8); `STAY_DEFAULT`, `STAY_STEP`, `clampStay` (Task 7); `validate`, `RawSettings`, `Settings`, `SettingsStore`, `ValidationResult` (Task 11); `isApproximate`, `isInNetherlands`, `LocateOutcome`, `Position` (Task 12); `NearestResult` (Task 13); `stubDeps`, `EXAMPLE_RAW` fixtures (Task 2)
- Produces: `type View = 'setup' | 'parked' | 'loading' | 'results'`; `type LocationState`; `type SearchStatus = 'idle' | 'outside-nl' | 'load-error' | 'battery-full' | 'results'`; `interface AppState` (fields as in the code); `interface AppDeps { store; locate(); loadManifest(); findNearest(lat, lon, manifest); now() }`; `interface App { getState; subscribe; start; saveSettings; openSettings; closeSettings; retryLocation; setBattery; setStay; nudgeStay; findChargers; select; backToParked }`; `createApp(deps: AppDeps): App`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { createApp } from './app.ts';
import { EXAMPLE_RAW, stubDeps } from '../test/fixtures/app-deps.ts';

async function searched(deps = stubDeps()) {
  const app = createApp(deps);
  await app.start();
  app.saveSettings(EXAMPLE_RAW);
  await deps.locate.mock.results.at(-1)!.value;
  app.setBattery(20);
  await app.findChargers();
  return { app, deps };
}

describe('createApp — controller state machine (G7-AC5)', () => {
  it('asks for the location when the parked view opens, with "locating" until it answers', async () => {
    const deps = stubDeps();
    const app = createApp(deps);
    await app.start();
    app.saveSettings(EXAMPLE_RAW);
    expect(app.getState().location).toEqual({ status: 'locating' });
    app.setBattery(20);
    await app.findChargers();
    expect(app.getState().blocked).toBe('location');
  });

  it('shows the loading view while tiles and curves are resolved, and results complete at once', async () => {
    const deps = stubDeps();
    const app = createApp(deps);
    await app.start();
    app.saveSettings(EXAMPLE_RAW);
    await deps.locate.mock.results.at(-1)!.value;
    app.setBattery(20);
    const views: string[] = [];
    app.subscribe((s) => views.push(`${s.view}:${s.results.length}`));
    await app.findChargers();
    expect(views).toContain('loading:0');
    expect(views.at(-1)).toBe('results:2');
    expect(views.filter((v) => v.startsWith('results:')).every((v) => v === 'results:2')).toBe(true);
  });

  it('a battery change with the same spot reuses the loaded tiles and does not ask for the location again', async () => {
    const { app, deps } = await searched();
    app.backToParked();
    app.setBattery(70);
    await app.findChargers();
    expect(deps.findNearest).toHaveBeenCalledTimes(1);
    expect(deps.locate).toHaveBeenCalledTimes(1);
    expect(app.getState().search).toBe('results');
  });

  it('selects an entry and keeps unknown ids out', async () => {
    const { app } = await searched();
    const second = app.getState().results[1]!.id;
    app.select(second);
    expect(app.getState().selectedId).toBe(second);
    app.select('nope');
    expect(app.getState().selectedId).toBe(second);
  });

  it('changing the petrol price from the results screen recomputes without refetching (G1-AC4)', async () => {
    const { app, deps } = await searched();
    const before = app.getState().results[0]!.outcome;
    app.openSettings();
    app.saveSettings({ ...EXAMPLE_RAW, petrolPrice: '2.459' });
    const s = app.getState();
    expect(s.view).toBe('results');
    expect(s.settings).toMatchObject({ petrolPrice: 2.459, chargeKw: 3.6, cardStartFee: 0.89 });
    expect(s.results[0]!.outcome).not.toEqual(before);
    expect(deps.findNearest).toHaveBeenCalledTimes(1);
  });

  it('sets the data date from a later search when the manifest failed at start (G2-AC4)', async () => {
    const deps = stubDeps();
    deps.loadManifest.mockRejectedValueOnce(new Error('offline'));
    const app = createApp(deps);
    await app.start();
    app.saveSettings(EXAMPLE_RAW);
    await deps.locate.mock.results.at(-1)!.value;
    expect(app.getState().dataTimestamp).toBeNull();
    app.setBattery(20);
    await app.findChargers();
    expect(app.getState()).toMatchObject({ search: 'results', dataTimestamp: '2026-10-09T06:12:00.000Z' });
  });

  it('closing the settings returns to the view it was opened from', async () => {
    const { app } = await searched();
    app.openSettings();
    app.closeSettings();
    expect(app.getState().view).toBe('results');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -- src/app.test.ts`
Expected: FAIL with `Cannot find module './app.ts'`

- [ ] **Step 3: Implement the controller**

```ts
// Controller: owns app state and the request flow (solution design, Architecture layer 2).
import type { Manifest } from './shared/data-format.ts';
import { computeEntries, rankAtStay, type ComputedEntry, type RankedEntry } from './engine/results.ts';
import { STAY_DEFAULT, STAY_STEP, clampStay } from './engine/compare.ts';
import { validate, type RawSettings, type Settings, type SettingsStore, type ValidationResult } from './services/settings.ts';
import { isApproximate, isInNetherlands, type LocateOutcome, type Position } from './services/location.ts';
import type { NearestResult } from './services/data.ts';

export type View = 'setup' | 'parked' | 'loading' | 'results';

export type LocationState =
  | { status: 'locating' }
  | { status: 'found'; position: Position; approximate: boolean }
  | { status: 'denied' };

export type SearchStatus = 'idle' | 'outside-nl' | 'load-error' | 'battery-full' | 'results';

export interface AppState {
  view: View;
  /** View to return to when the settings screen is closed. */
  returnView: View;
  settings: Settings | null;
  /** "Set up your car first so we can calculate your costs." (G7-AC1) */
  setupNotice: boolean;
  /** "Your settings won't be remembered in this browser…" (G1-AC3) */
  storageWarning: boolean;
  dataTimestamp: string | null;
  location: LocationState;
  battery: number | null;
  stayMin: number;
  /** "Stays can be 15 minutes to 24 hours." (G7-AC3) */
  stayLimitNote: boolean;
  /** What a refused "Find chargers" tap highlights. */
  blocked: 'battery' | 'location' | null;
  search: SearchStatus;
  results: RankedEntry[];
  /** Results were calculated for an approximate position (G3-AC2). */
  approximateResults: boolean;
  selectedId: string | null;
}

export interface AppDeps {
  store: SettingsStore;
  locate: () => Promise<LocateOutcome>;
  loadManifest: () => Promise<Manifest>;
  findNearest: (lat: number, lon: number, manifest: Manifest) => Promise<NearestResult>;
  now: () => number;
}

export interface App {
  getState(): AppState;
  subscribe(listener: (s: AppState) => void): void;
  start(): Promise<void>;
  saveSettings(raw: RawSettings): ValidationResult;
  openSettings(): void;
  closeSettings(): void;
  retryLocation(): Promise<void>;
  setBattery(pct: number): void;
  setStay(min: number): void;
  nudgeStay(direction: 1 | -1): void;
  findChargers(): Promise<void>;
  select(id: string): void;
  backToParked(): void;
}

export function createApp(deps: AppDeps): App {
  let state: AppState = {
    view: 'setup',
    returnView: 'parked',
    settings: null,
    setupNotice: false,
    storageWarning: false,
    dataTimestamp: null,
    location: { status: 'locating' },
    battery: null,
    stayMin: STAY_DEFAULT,
    stayLimitNote: false,
    blocked: null,
    search: 'idle',
    results: [],
    approximateResults: false,
    selectedId: null,
  };
  const listeners: Array<(s: AppState) => void> = [];
  let manifest: Promise<Manifest> | null = null;
  /** Loaded tiles for the last spot, so a battery change doesn't refetch (Data flow step 6). */
  let nearestCache: { key: string; result: NearestResult } | null = null;
  let computed: ComputedEntry[] = [];
  let located = false;
  let busy = false;

  function set(patch: Partial<AppState>): void {
    state = { ...state, ...patch };
    for (const l of listeners) l(state);
  }

  /** Loads the manifest once; a failure is retried on the next call, and whichever call succeeds sets the data date (G2-AC4). */
  function getManifest(): Promise<Manifest> {
    manifest ??= deps.loadManifest().then(
      (m) => {
        set({ dataTimestamp: m.dataTimestamp });
        return m;
      },
      (e: unknown) => {
        manifest = null;
        throw e;
      },
    );
    return manifest;
  }

  async function startLocating(): Promise<void> {
    located = true;
    set({ location: { status: 'locating' }, blocked: null });
    const outcome = await deps.locate();
    set({
      location: outcome.kind === 'found'
        ? { status: 'found', position: outcome.position, approximate: isApproximate(outcome.position) }
        : { status: 'denied' },
    });
  }

  function showParked(): void {
    set({ view: 'parked', search: 'idle' });
    // Going back keeps the current spot; location is asked for only once (Architecture, controller).
    if (!located) void startLocating();
  }

  function rerank(): void {
    const results = rankAtStay(computed, state.stayMin, state.settings!);
    const selectedId = results.some((r) => r.id === state.selectedId) ? state.selectedId : (results[0]?.id ?? null);
    set({ results, selectedId });
  }

  return {
    getState: () => state,
    subscribe: (l) => void listeners.push(l),

    async start() {
      getManifest().catch(() => undefined);
      const settings = deps.store.load();
      if (!settings) {
        set({ view: 'setup', setupNotice: true });
        return;
      }
      set({ settings });
      showParked();
    },

    saveSettings(raw) {
      const result = validate(raw);
      if (!result.ok) return result;
      const { persisted } = deps.store.save(result.settings);
      set({ settings: result.settings, setupNotice: false, storageWarning: !persisted });
      if (state.returnView === 'results' && computed.length > 0) {
        // Settings change the curves: recompute from the loaded tiles, no refetch.
        const cached = nearestCache!.result;
        computed = computeEntries(cached.nearby, cached.tariffs, result.settings, state.battery!, deps.now());
        rerank();
        set({ view: 'results' });
      } else {
        showParked();
      }
      return result;
    },

    openSettings() {
      set({ returnView: state.view, view: 'setup' });
    },

    closeSettings() {
      if (!state.settings) return;
      set({ view: state.returnView });
    },

    retryLocation: () => startLocating(),

    setBattery(pct) {
      set({ battery: pct, blocked: state.blocked === 'battery' ? null : state.blocked });
    },

    setStay(min) {
      set({ stayMin: clampStay(min), stayLimitNote: false });
    },

    nudgeStay(direction) {
      const want = state.stayMin + direction * STAY_STEP;
      set({ stayMin: clampStay(want), stayLimitNote: clampStay(want) !== want });
    },

    async findChargers() {
      if (busy || !state.settings) return;
      if (state.battery === null) {
        set({ blocked: 'battery' });
        return;
      }
      if (state.location.status !== 'found') {
        set({ blocked: 'location' });
        return;
      }
      const { position, approximate } = state.location;
      set({ blocked: null });
      if (!isInNetherlands(position.lat, position.lon)) {
        set({ search: 'outside-nl' });
        return;
      }
      if (state.battery === 100) {
        set({ view: 'results', search: 'battery-full', results: [], selectedId: null });
        return;
      }
      busy = true;
      set({ view: 'loading' });
      try {
        const key = `${position.lat},${position.lon}`;
        if (nearestCache?.key !== key) {
          const m = await getManifest();
          nearestCache = { key, result: await deps.findNearest(position.lat, position.lon, m) };
        }
        const { nearby, tariffs } = nearestCache.result;
        computed = computeEntries(nearby, tariffs, state.settings, state.battery, deps.now());
        set({ selectedId: null, approximateResults: approximate });
        rerank();
        set({ view: 'results', search: 'results' });
      } catch {
        computed = [];
        set({ view: 'results', search: 'load-error', results: [], selectedId: null });
      } finally {
        busy = false;
      }
    },

    select(id) {
      if (state.results.some((r) => r.id === id)) set({ selectedId: id });
    },

    backToParked() {
      showParked();
    },
  };
}
```

- [ ] **Step 4: Run it and the Task 2 acceptance test to see them pass**

Run: `npm test -- src/app.test.ts test/acceptance/flows.test.ts`
Expected: PASS — `Tests  20 passed (20)`

- [ ] **Step 5: Commit**

```bash
git add src/app.ts src/app.test.ts
git commit -m "feat: controller for the setup, location and search flow"
```

**Verify:** `npm test -- src/app.test.ts test/acceptance/flows.test.ts` — `Tests  20 passed (20)`

### Task 16: Views: setup, parked, loading, results

Plain DOM rendering from app state (Architecture layer 1; D-6), with the markup, wording and classes of the UI mockup (style B), minus the map. `h()` builds elements and turns text into text nodes, so feed data such as operator names and addresses is never parsed as HTML. The icons are the mockup's static SVGs. The setup and parked screens are built once per visit (`mountSetup`, `mountParked`), and each returns an updater that patches the page in place. App state changes land while the driver is busy: the location answer, the data date, a refused tap. Because they never replace an input, a slider keeps following the finger and a field keeps its caret. Each slider shows its live value while dragging, ignores state updates until release, and commits on `change`. The setup form rebuilds only after a failed save, to show the errors. The results view re-renders on each selection and keeps keyboard focus on the strip item the driver used. In the results view the "Stay" pill is display-only, because the slider there comes with Slice 2. The location-denied message drops its map clause until Slice 3 (see Deviations from Design). The load error and battery-full messages appear as the mockup's message card on the results screen, under the top bar, so the Battery pill leads back.

There's no unit test for this task: the views are glue over the tested view model (Task 10) and controller (Task 15). D-17 puts UI checks in the manual device pass. The check that already exists here is the TypeScript compiler over the new files. Task 17 covers rendering in a browser.

**Files:**
- Create: `src/ui/dom.ts`
- Create: `src/ui/chrome.ts`
- Create: `src/ui/setup.ts`
- Create: `src/ui/parked.ts`
- Create: `src/ui/results.ts`

**Interfaces:**
- Consumes: `App`, `AppState` (Task 15); `FIELDS`, `initialRaw`, `toRaw`, `FieldSpec`, `RawSettings`, `SettingKey` (Task 11); `STAY_MAX`, `STAY_MIN`, `STAY_STEP` (Task 7); `dataDate`, `duration` (Task 9); `entryViews`, `EntryView`, `VerdictKind` (Task 10)
- Produces: `h(tag, props?, ...children)`, `icon(name: IconName, size?)`, `type Child`, `type IconName`; `appBar(app | null)`, `notice(kind, role, ...body)`, `storageNotice()` (the one G1-AC3 message, used by setup and parked), `errorText(id, message)`; `mountSetup(root, initial: AppState, app): (state: AppState) => void`; `mountParked(root, app): (state: AppState) => void`, `renderLoading(root)`; `renderResults(root, state, app)`

- [ ] **Step 1: Write the DOM helper and icons**

```ts
// Tiny DOM builder. Text children become text nodes, so feed data (operator, address) is never parsed as HTML.
export type Child = Node | string | null | false | undefined;
type Props = Record<string, string | number | boolean | EventListener | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const c of children) if (c !== null && c !== false && c !== undefined) el.append(c);
  return el;
}

const ICONS = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  clock: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  cross: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  question: '<path d="M9 9.2a3 3 0 1 1 4.2 2.8c-.8.4-1.2 1-1.2 1.8v.6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="18.2" r="1.5" fill="currentColor"/>',
  warn: '<path d="M12 3l10 18H2z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 10v5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="18" r="1.3" fill="currentColor"/>',
  info: '<circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 11v6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="7.5" r="1.3" fill="currentColor"/>',
  pin: '<path d="M12 22s7-6.6 7-12.2A7 7 0 0 0 5 9.8C5 15.4 12 22 12 22z" fill="none" stroke="currentColor" stroke-width="2.3"/><circle cx="12" cy="10" r="2.6" fill="currentColor"/>',
  gear: '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor"/>',
  wifi: '<path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/><path d="M3 3l18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  full: '<rect x="2" y="7" width="18" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="4.5" y="9.5" width="13" height="5" rx="1" fill="currentColor"/><path d="M22 10.5v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
} as const;

export type IconName = keyof typeof ICONS;

/** The mockup's icons; the SVG markup is static, never data. */
export function icon(name: IconName, size = 16): SVGElement {
  const t = document.createElement('template');
  t.innerHTML = `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
  return t.content.firstElementChild as SVGElement;
}
```

- [ ] **Step 2: Write the shared chrome**

```ts
import type { App } from '../app.ts';
import { h, icon, type Child } from './dom.ts';

export function appBar(app: App | null): HTMLElement {
  return h('header', { class: 'appbar' },
    h('div', { class: 'brand' }, h('span', { class: 'plug' }, icon('bolt', 16)), 'Plug or Not'),
    app && h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Settings', onclick: () => app.openSettings() }, icon('gear', 18)),
  );
}

export function notice(kind: 'info' | 'bad', role: 'status' | 'alert', ...body: Child[]): HTMLElement {
  return h('div', { class: `notice ${kind}`, role }, icon(kind === 'info' ? 'info' : 'warn', 18), h('div', {}, ...body));
}

/** G1-AC3, shown on the setup and parked screens. */
export function storageNotice(): HTMLElement {
  return notice('info', 'status', h('p', {}, "Your settings won't be remembered in this browser. You can still use Plug or Not now."));
}

export function errorText(id: string, message: string): HTMLElement {
  return h('div', { class: 'errmsg', id }, icon('warn', 16), h('span', {}, message));
}
```

- [ ] **Step 3: Write the setup view**

```ts
import type { App, AppState } from '../app.ts';
import { FIELDS, initialRaw, toRaw, type FieldSpec, type RawSettings, type SettingKey } from '../services/settings.ts';
import { h, icon } from './dom.ts';
import { appBar, errorText, notice, storageNotice } from './chrome.ts';
import { dataDate } from './format.ts';

const GROUPS: Array<{ group: FieldSpec['group']; title: string; hint?: string; two: boolean }> = [
  { group: 'car', title: 'Your car', two: false },
  { group: 'petrol', title: 'Petrol', two: true },
  { group: 'card', title: 'Your charge card', hint: 'As on your card’s price list, including VAT. Leave at 0 if your card has no fees.', two: true },
];

/**
 * Builds the setup form once per visit to the screen and returns an updater. Later state changes
 * (the data date arriving, the storage notice) patch the page in place, so the inputs are never
 * replaced while the driver types. Only a failed save rebuilds the form, to show the errors.
 */
export function mountSetup(root: HTMLElement, initial: AppState, app: App): (state: AppState) => void {
  const reopen = initial.settings !== null;
  const values: RawSettings = initial.settings ? toRaw(initial.settings) : initialRaw();
  let errors: Partial<Record<SettingKey, string>> = {};

  const setupNotice = notice('info', 'status', h('p', {}, 'Set up your car first so we can calculate your costs.'));
  const storage = storageNotice();
  const dateText = h('b', {});
  const date = h('p', { class: 'datadate' }, icon('info', 14),
    h('span', {}, 'Charger prices from NDW open data of ', dateText, '. Prices include VAT; your card fees are added.'));
  const formSlot = h('div', {});

  const field = (f: FieldSpec) => {
    const id = `f_${f.key}`;
    const err = errors[f.key];
    return h('div', { class: err ? 'field err' : 'field' },
      h('label', { for: id }, f.label),
      h('div', { class: 'inwrap' },
        h('input', {
          id, name: f.key, inputmode: 'decimal', autocomplete: 'off', value: values[f.key],
          'aria-invalid': err ? 'true' : undefined, 'aria-describedby': err ? `${id}_e` : undefined,
          oninput: (e: Event) => { values[f.key] = (e.target as HTMLInputElement).value; },
        }),
        h('span', { class: 'unit' }, f.unit),
      ),
      err && errorText(`${id}_e`, err),
    );
  };

  function buildForm(): void {
    formSlot.replaceChildren(h('form', {
      novalidate: true,
      onsubmit: (e: Event) => {
        e.preventDefault();
        const result = app.saveSettings(values);
        if (result.ok) return;
        errors = result.errors;
        buildForm();
        formSlot.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus();
      },
    },
      ...GROUPS.flatMap((g) => [
        h('h2', { class: 'sec' }, g.title),
        g.hint ? h('p', { class: 'lede hint' }, g.hint) : null,
        h('div', { class: g.two ? 'grid2' : '' }, ...FIELDS.filter((f) => f.group === g.group).map(field)),
      ]),
      h('div', { class: 'btn-row' },
        reopen && h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => app.closeSettings() }, 'Cancel'),
        h('button', { type: 'submit', class: 'btn btn-primary' }, 'Save'),
      ),
    ));
  }

  buildForm();
  root.replaceChildren(
    appBar(null),
    h('section', { class: 'screen' },
      h('h1', {}, reopen ? 'Settings' : 'Set up your car'),
      h('p', { class: 'lede' }, reopen ? 'Change what you need. Everything else stays as it is.' : 'Enter these once. They’re saved in this browser only.'),
      setupNotice, storage, formSlot, date,
    ),
  );

  const update = (state: AppState) => {
    setupNotice.hidden = !state.setupNotice;
    storage.hidden = !state.storageWarning;
    date.hidden = state.dataTimestamp === null;
    dateText.textContent = state.dataTimestamp ? dataDate(state.dataTimestamp) : '';
  };
  update(initial);
  return update;
}
```

- [ ] **Step 4: Write the parked and loading views**

```ts
import type { App, AppState } from '../app.ts';
import { STAY_MAX, STAY_MIN, STAY_STEP } from '../engine/compare.ts';
import { h, icon } from './dom.ts';
import { appBar, errorText, notice, storageNotice } from './chrome.ts';
import { duration } from './format.ts';

const fill = (v: number, min: number, max: number) => `${(((v - min) / (max - min)) * 100).toFixed(1)}%`;

/** A range slider whose element is never replaced, so a state change can't interrupt a drag. */
function slider(opts: {
  id: string; label: string; min: number; max: number; step: number; scale: string[]; inset?: boolean;
  format: (v: number) => string; valueText: (v: number) => string; commit: (v: number) => void;
}) {
  let dragging = false;
  const value = h('span', { class: 'val num' });
  const input = h('input', { type: 'range', class: 'range', id: opts.id, min: opts.min, max: opts.max, step: opts.step });
  const box = h('div', { class: 'slider' },
    h('div', { class: 'stop' }, h('label', { for: opts.id }, opts.label), value),
    h('div', { class: 'srow' }, input),
    h('div', { class: opts.inset ? 'scale inset' : 'scale', 'aria-hidden': 'true' }, ...opts.scale.map((t) => h('span', {}, t))),
  );
  const show = (v: number | null) => {
    const set = v !== null;
    const n = v ?? (opts.min + opts.max) / 2;
    input.value = String(n);
    input.style.setProperty('--p', set ? fill(n, opts.min, opts.max) : '0%');
    input.setAttribute('aria-valuetext', set ? opts.valueText(n) : 'not set');
    value.textContent = set ? opts.format(n) : 'Slide to set';
    value.className = set ? 'val num' : 'val num unset';
    box.classList.toggle('unset', !set);
  };
  // Live label while dragging; the value is committed on release (`change`).
  input.addEventListener('input', () => {
    dragging = true;
    show(Number(input.value));
  });
  input.addEventListener('change', () => {
    dragging = false;
    opts.commit(Number(input.value));
  });
  return {
    box,
    input,
    /** Shows the app's value unless the driver is dragging. */
    sync: (v: number | null) => { if (!dragging) show(v); },
  };
}

function spotNotice(state: AppState, app: App): HTMLElement {
  const hl = state.blocked === 'location' ? ' highlight' : '';
  if (state.search === 'outside-nl') {
    return notice('bad', 'alert', h('p', {}, 'Charger prices are available for the Netherlands only for now.'));
  }
  const loc = state.location;
  if (loc.status === 'locating') {
    const n = notice('info', 'status', h('p', {}, 'Finding your location…'));
    n.className += hl;
    return n;
  }
  if (loc.status === 'denied') {
    // Slice 1 has no map yet: the "or drag the map to your spot" clause arrives with Slice 3 (see Deviations).
    const n = notice('bad', 'alert',
      h('p', {}, "We couldn't get your location. Allow location access in your browser and try again."),
      h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn btn-secondary btn-small', onclick: () => void app.retryLocation() }, 'Try again')),
    );
    n.className += hl;
    return n;
  }
  const { lat, lon } = loc.position;
  return h('div', {},
    loc.approximate ? notice('info', 'status', h('p', {}, 'Your location is approximate')) : null,
    h('p', { class: 'spotline mono' }, `YOUR LOCATION · ${lat.toFixed(4)}, ${lon.toFixed(4)}`),
  );
}

/** Builds the parked screen once per visit and returns an updater that patches it in place. */
export function mountParked(root: HTMLElement, app: App): (state: AppState) => void {
  const battery = slider({
    id: 'batt', label: 'Battery now', min: 0, max: 100, step: 1, scale: ['0%', '25%', '50%', '75%', '100%'],
    format: (v) => `${v}%`, valueText: (v) => `${v} percent`, commit: (v) => app.setBattery(v),
  });
  const batteryError = errorText('batt_e', 'Enter your current battery level (0–100%).');
  battery.box.append(batteryError);

  const stay = slider({
    id: 'stay', label: 'How long you’ll stay', min: STAY_MIN, max: STAY_MAX, step: STAY_STEP,
    scale: ['15 min', '6h', '12h', '18h', '24h'], inset: true,
    format: duration, valueText: duration, commit: (v) => app.setStay(v),
  });
  const srow = stay.box.querySelector('.srow')!;
  srow.prepend(h('button', { type: 'button', class: 'nudge', 'aria-label': '15 minutes shorter', onclick: () => app.nudgeStay(-1) }, '−'));
  srow.append(h('button', { type: 'button', class: 'nudge', 'aria-label': '15 minutes longer', onclick: () => app.nudgeStay(1) }, '+'));
  const limitNote = h('div', { class: 'limitnote', role: 'status' }, 'Stays can be 15 minutes to 24 hours.');
  stay.box.append(limitNote);

  const storage = storageNotice();
  const spot = h('div', {});
  root.replaceChildren(
    appBar(app),
    h('section', { class: 'screen' },
      h('h1', {}, 'Parked here now'),
      h('p', { class: 'lede' }, 'We’ll rank the 10 nearest chargers by what they save you compared with petrol.'),
      storage, battery.box, stay.box,
      h('h2', { class: 'sec' }, 'Where you parked'),
      spot,
      h('button', { type: 'button', class: 'btn btn-primary', onclick: () => void app.findChargers() }, icon('bolt', 18), 'Find chargers'),
    ),
  );

  return (state) => {
    storage.hidden = !state.storageWarning;
    battery.sync(state.battery);
    const batteryBlocked = state.blocked === 'battery';
    battery.box.classList.toggle('err', batteryBlocked);
    batteryError.hidden = !batteryBlocked;
    if (batteryBlocked) battery.input.setAttribute('aria-invalid', 'true');
    else battery.input.removeAttribute('aria-invalid');
    battery.input.setAttribute('aria-describedby', 'batt_e');
    stay.sync(state.stayMin);
    limitNote.hidden = !state.stayLimitNote;
    spot.replaceChildren(spotNotice(state, app));
  };
}

export function renderLoading(root: HTMLElement): void {
  root.replaceChildren(
    appBar(null),
    h('section', { class: 'screen' },
      h('div', { class: 'loading', role: 'status' }, h('div', { class: 'pulse' }, icon('pin', 28)), h('p', {}, 'Finding chargers near you…')),
    ),
  );
}
```

- [ ] **Step 5: Write the results view**

```ts
import type { App, AppState } from '../app.ts';
import { h, icon, type IconName } from './dom.ts';
import { notice } from './chrome.ts';
import { duration } from './format.ts';
import { entryViews, type EntryView, type VerdictKind } from './entry-view.ts';

const VERDICT_ICON: Record<VerdictKind, IconName> = {
  'worth-it': 'check', 'not-for-this-stay': 'clock', never: 'cross', unknown: 'question',
};
const VERDICT_CLASS: Record<VerdictKind, string> = { 'worth-it': 'w', 'not-for-this-stay': 'n', never: 'x', unknown: 'u' };

function topBar(state: AppState, app: App): HTMLElement {
  return h('div', { class: 'rtop' },
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'pill', 'aria-label': `Battery ${state.battery}%, change`, onclick: () => app.backToParked() },
        h('small', {}, 'Battery'), h('span', { class: 'num' }, `${state.battery}%`)),
      h('div', { class: 'pill grow' }, h('small', {}, 'Stay'), h('b', { class: 'num' }, duration(state.stayMin))),
      h('button', { type: 'button', class: 'pill round', 'aria-label': 'Settings', onclick: () => app.openSettings() }, icon('gear', 17)),
    ),
  );
}

function message(kind: 'load' | 'full', app: App): HTMLElement {
  return kind === 'load'
    ? h('div', { class: 'rmsg', role: 'alert' },
        h('div', { class: 'big bad' }, icon('wifi', 32)),
        h('p', {}, "Couldn't load charger prices. Check your connection and try again."),
        h('button', { type: 'button', class: 'btn btn-primary', onclick: () => void app.findChargers() }, 'Try again'))
    : h('div', { class: 'rmsg', role: 'status' },
        h('div', { class: 'big good' }, icon('full', 32)),
        h('p', {}, "Your battery is full, so there's nothing to charge here."));
}

function panel(e: EntryView, all: EntryView[], app: App): HTMLElement {
  const cls = VERDICT_CLASS[e.verdict];
  return h('section', { class: 'sheet', 'aria-label': 'Charger details' },
    h('div', { class: 'sbody' },
      h('div', { class: 'rk' }, h('span', {}, e.rankText), h('span', { class: 'num' }, e.distanceText)),
      h('div', { class: `verdict ${cls}` }, icon(VERDICT_ICON[e.verdict], e.verdict === 'not-for-this-stay' ? 24 : 30), e.verdictText),
      e.savingText && h('p', { class: 'sub' }, e.savingText),
      e.priceText && h('p', { class: 'sub price-line' }, e.priceText),
      h('p', { class: 'name' }, e.operator),
      h('p', { class: 'addr' }, e.address),
      ...e.alsoHere.map((o) => h('button', { type: 'button', class: 'also', 'data-id': o.id, onclick: () => app.select(o.id) },
        h('span', {}, o.text), h('span', { class: 'go2' }, 'Show'))),
      e.reasonText && h('p', { class: 'reason' }, e.reasonText),
    ),
    h('div', { class: 'strip', role: 'list', 'aria-label': 'All chargers, best saving first' },
      ...all.map((x) => h('button', {
        type: 'button', role: 'listitem', 'data-id': x.id, 'aria-current': x.id === e.id ? 'true' : 'false', onclick: () => app.select(x.id),
      }, h('b', { class: VERDICT_CLASS[x.verdict] === 'x' ? 'n' : VERDICT_CLASS[x.verdict] }, icon(VERDICT_ICON[x.verdict], 12), x.chipText), x.stripText))),
  );
}

export function renderResults(root: HTMLElement, state: AppState, app: App): void {
  // A selection re-renders the panel; keep focus on the strip item (or "Also here" row) the driver used.
  const active = document.activeElement;
  const focusedId = active instanceof HTMLElement && root.contains(active) ? active.dataset.id : undefined;
  if (state.search === 'load-error' || state.search === 'battery-full') {
    root.replaceChildren(h('div', { class: 'rwrap' }, topBar(state, app), message(state.search === 'load-error' ? 'load' : 'full', app)));
    return;
  }
  const views = entryViews(state.results);
  const selected = views.find((v) => v.id === state.selectedId) ?? views[0];
  root.replaceChildren(
    h('div', { class: 'rwrap' },
      topBar(state, app),
      state.approximateResults && notice('info', 'status', h('p', {}, 'Your location is approximate'), h('p', { class: 'plain' }, 'Results are for the reported spot.')),
      selected ? panel(selected, views, app) : null,
    ),
  );
  root.querySelector('.strip [aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (focusedId) root.querySelector<HTMLElement>(`.strip [data-id="${CSS.escape(focusedId)}"]`)?.focus();
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0

- [ ] **Step 7: Commit**

```bash
git add src/ui/dom.ts src/ui/chrome.ts src/ui/setup.ts src/ui/parked.ts src/ui/results.ts
git commit -m "feat: setup, parked, loading and results views"
```

**Verify:** `npx tsc --noEmit && npm test` — no type errors; `Tests  163 passed (163)`

### Task 17: Page shell, theme and fonts

The page shell (`index.html`, with the three view containers and the mobile viewport meta) and `main.ts`, which wires the real browser APIs into the controller. On entering setup or parked it mounts the screen once and then passes every state change to its updater. Loading and results render on each change. A view change scrolls to the top. `theme.css` holds the mockup's Night tokens on `:root` and its Day tokens under `@media (prefers-color-scheme: light)`. The page therefore follows the device and switches live when the device theme changes (G7-AC6, D-28). The mockup's hard-coded rgba glows become `color-mix()` over the tokens, so they switch too. `app.css` carries the mockup's component styles without the map parts. The details panel sits in the page flow under the top bar, because there's no map behind it yet. Sora (400/600/700/800) and IBM Plex Mono (500/600) come from `@fontsource` and are bundled by Vite, so no font request leaves the site (D-31).

There's no unit test for this task (see Task 16). Verification is the production build plus a run in the browser.

**Files:**
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/ui/theme.css`
- Create: `src/ui/app.css`

**Interfaces:**
- Consumes: `createApp`, `AppState`, `View` (Task 15); `createSettingsStore` (Task 11); `locate` (Task 12); `createFetchJson`, `findNearest`, `loadManifest` (Task 13); `mountSetup`, `mountParked`, `renderLoading`, `renderResults` (Task 16)
- Produces: the runnable page at `http://localhost:5173/plug-or-not/` (`npm run dev`) and `dist/` (`npm run build`)

- [ ] **Step 1: Write the page shell**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="color-scheme" content="dark light" />
    <meta name="description" content="Is charging here cheaper than petrol? The 10 nearest chargers, ranked by saving." />
    <title>Plug or Not</title>
  </head>
  <body>
    <main class="phone">
      <div id="view-setup" hidden></div>
      <div id="view-parked" hidden></div>
      <div id="view-results" hidden></div>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Write the colour tokens**

```css
/* Night and Day colour sets of the same design, picked by the device setting (D-28, G7-AC6). */
:root {
  --bg: #0c1211; --surface: #121a18; --raised: #18211f; --raised2: #25302d; --line: #26312e;
  --ink: #e8efec; --soft: #c9d4d0; --muted: #8b9a95; --faint: #6f7e79;
  --go: #2fd39a; --go-ink: #04150e; --go-soft: #10291f;
  --no: #ff6f5e; --no-text: #ff7d6d; --no-ink: #2a0703; --no-soft: #2a1513;
  --info: #f2c14e; --info-soft: #2a2410;
  --unknown: #a7b4b0; --focus: #7da5ff; --me: #4f86ff;
  --dash: #6c7b76; --glow: .55;
  --f-ui: "Sora", "Avenir Next", system-ui, sans-serif;
  --f-data: "IBM Plex Mono", ui-monospace, Menlo, monospace;
  color-scheme: dark;
}

@media (prefers-color-scheme: light) {
  :root {
    --bg: #f3f5f4; --surface: #ffffff; --raised: #eef2f0; --raised2: #e0e6e3; --line: #d3dbd7;
    --ink: #0f1715; --soft: #2c3835; --muted: #56625e; --faint: #75817d;
    --go: #0a8a5f; --go-ink: #ffffff; --go-soft: #dcf2e8;
    --no: #d23b28; --no-text: #b42616; --no-ink: #ffffff; --no-soft: #fde8e4;
    --info: #9a6200; --info-soft: #fff3d6;
    --unknown: #56625e; --focus: #2a62d6; --me: #2a62d6;
    --dash: #8a9692; --glow: 0;
    color-scheme: light;
  }
}
```

- [ ] **Step 3: Write the component styles**

```css
/* Component styles from the UI mockup (style B), map parts left out until Slice 3. */
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 400 16px/1.45 var(--f-ui); }
button, input { font: inherit; color: inherit; }
button { cursor: pointer; }
:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
[hidden] { display: none !important; }
.ico { display: inline-block; flex: none; }
.num { font-variant-numeric: tabular-nums; }
.mono { font-family: var(--f-data); font-weight: 500; }
.phone { width: 100%; max-width: 430px; min-height: 100dvh; margin: 0 auto; background: var(--bg); position: relative; }

.appbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 16px 6px; }
.brand { font: 800 18px/1 var(--f-ui); letter-spacing: -.02em; display: flex; align-items: center; gap: 9px; }
.brand .plug { width: 28px; height: 28px; border-radius: 9px; background: var(--go); color: var(--go-ink); display: grid; place-items: center; }
.iconbtn { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background: var(--raised); border: 1px solid var(--line); }
.screen { padding: 6px 16px 36px; }
h1 { font: 800 30px/1.08 var(--f-ui); letter-spacing: -.03em; margin: 10px 0 6px; text-wrap: balance; }
.lede { color: var(--muted); margin: 0 0 20px; font-size: 15px; }
.lede.hint { margin: -2px 0 12px; font-size: 13px; }
.sec { font: 600 11px/1 var(--f-data); text-transform: uppercase; letter-spacing: .14em; color: var(--faint); margin: 26px 0 10px; }

.field { margin-bottom: 12px; }
.field label { display: block; font-weight: 600; font-size: 14px; margin-bottom: 6px; color: var(--soft); }
.inwrap { display: flex; align-items: stretch; border: 1px solid var(--line); border-radius: 14px; background: var(--raised); overflow: hidden; transition: border-color .15s; }
.inwrap:focus-within { border-color: var(--focus); box-shadow: 0 0 0 3px color-mix(in srgb, var(--focus) 18%, transparent); }
.inwrap input { flex: 1; min-width: 0; border: 0; background: transparent; padding: 13px 14px; font: 500 18px/1.2 var(--f-data); outline: none; color: var(--ink); }
.inwrap .unit { display: flex; align-items: center; padding: 0 14px; color: var(--muted); font-size: 13px; font-weight: 600; white-space: nowrap; }
.field.err .inwrap { border-color: var(--no); background: var(--no-soft); }
.errmsg { display: flex; gap: 7px; align-items: flex-start; color: var(--no-text); font-weight: 600; margin-top: 7px; font-size: 14px; }
.errmsg svg { margin-top: 2px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10px; }
.grid2 .field { min-width: 0; }

.btn { display: flex; width: 100%; align-items: center; justify-content: center; gap: 10px; border-radius: 16px; padding: 16px 18px; font-weight: 700; font-size: 17px; border: 1px solid transparent; letter-spacing: -.01em; }
.btn-primary { background: var(--go); color: var(--go-ink); box-shadow: 0 10px 30px -12px color-mix(in srgb, var(--go) 60%, transparent); }
.btn-secondary { background: var(--raised); border-color: var(--line); color: var(--ink); }
.btn-row { display: flex; gap: 10px; margin-top: 18px; }
.btn-small { width: auto; padding: 10px 16px; font-size: 15px; border-radius: 12px; }

.notice { display: flex; gap: 10px; border-radius: 14px; padding: 13px 14px; margin: 0 0 14px; font-weight: 600; font-size: 15px; border: 1px solid; }
.notice svg { margin-top: 2px; }
.notice.info { background: var(--info-soft); border-color: color-mix(in srgb, var(--info) 55%, transparent); color: var(--ink); }
.notice.info svg { color: var(--info); }
.notice.bad { background: var(--no-soft); border-color: color-mix(in srgb, var(--no) 60%, transparent); color: var(--ink); }
.notice.bad svg { color: var(--no-text); }
.notice.highlight { outline: 3px solid var(--focus); outline-offset: 2px; }
.notice p { margin: 0; }
.notice p.plain { font-weight: 400; }
.notice .acts { margin-top: 12px; }
.datadate { display: flex; gap: 8px; align-items: flex-start; margin: 20px 0 0; font-size: 13px; color: var(--muted); }
.datadate b { color: var(--soft); }
.datadate svg { margin-top: 2px; }
.spotline { font-size: 11px; letter-spacing: .04em; color: var(--muted); margin: 0 0 14px; }

.limitnote { color: var(--info); font-weight: 600; font-size: 14px; margin-top: 8px; }
.slider { background: var(--raised); border: 1px solid var(--line); border-radius: 18px; padding: 14px 14px 12px; margin-bottom: 12px; }
.slider .stop { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
.slider label { font-weight: 600; font-size: 14px; color: var(--soft); }
.slider .val { font: 800 28px/1 var(--f-ui); letter-spacing: -.03em; }
.slider .val.unset { color: var(--faint); font-size: 15px; font-weight: 600; letter-spacing: 0; }
.slider .srow { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.slider .nudge { width: 36px; height: 36px; border-radius: 50%; border: 0; background: var(--raised2); font-size: 18px; flex: none; }
input.range { -webkit-appearance: none; appearance: none; flex: 1; min-width: 0; height: 30px; background: transparent; margin: 0; --p: 50%; }
input.range::-webkit-slider-runnable-track { height: 10px; border-radius: 5px; background: linear-gradient(90deg, var(--go) var(--p), var(--raised2) var(--p)); }
input.range::-moz-range-track { height: 10px; border-radius: 5px; background: var(--raised2); }
input.range::-moz-range-progress { height: 10px; border-radius: 5px; background: var(--go); }
input.range::-webkit-slider-thumb { -webkit-appearance: none; width: 28px; height: 28px; border-radius: 50%; background: #fff; border: 4px solid var(--go); margin-top: -9px; box-shadow: 0 2px 8px rgba(0, 0, 0, .35); }
input.range::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: #fff; border: 4px solid var(--go); }
.slider.unset input.range::-webkit-slider-thumb { border-color: var(--faint); }
.slider.unset input.range::-moz-range-thumb { border-color: var(--faint); }
.slider.unset input.range::-moz-range-progress { background: transparent; }
.slider .scale { display: flex; justify-content: space-between; font: 500 10px/1 var(--f-data); color: var(--faint); margin-top: 6px; }
.slider .scale.inset { margin-inline: 46px; }
.slider.err { border-color: var(--no); background: var(--no-soft); }

.loading { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 22px; min-height: 62vh; }
.loading p { font: 700 21px/1.25 var(--f-ui); margin: 0; letter-spacing: -.01em; }
.pulse { width: 72px; height: 72px; border-radius: 50%; background: var(--go-soft); color: var(--go); display: grid; place-items: center; position: relative; }
.pulse::after, .pulse::before { content: ""; position: absolute; inset: 0; border-radius: 50%; border: 2px solid var(--go); animation: ring 1.8s ease-out infinite; }
.pulse::before { animation-delay: .9s; }
@keyframes ring { from { transform: scale(.8); opacity: .9; } to { transform: scale(1.9); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .pulse::after, .pulse::before { animation: none; opacity: .4; } }

.rwrap { display: flex; flex-direction: column; min-height: 100dvh; }
.rwrap > .notice { margin: 0 14px 10px; padding: 9px 11px; font-size: 13px; }
.rtop { padding: 14px; }
.rtop .row { display: flex; align-items: center; gap: 8px; }
.pill { display: flex; align-items: center; gap: 6px; height: 44px; border-radius: 999px; background: var(--raised); border: 1px solid var(--line); padding: 0 14px; font-weight: 600; font-size: 15px; }
.pill small { color: var(--muted); font-weight: 400; font-size: 11px; }
.pill.grow { flex: 1; min-width: 0; }
.pill.round { width: 44px; justify-content: center; padding: 0; }

.rmsg { margin: 24px 16px; background: var(--surface); border: 1px solid var(--line); border-radius: 24px; padding: 28px 20px; text-align: center; }
.rmsg .big { width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 14px; }
.rmsg .big.bad { background: var(--no-soft); color: var(--no-text); }
.rmsg .big.good { background: var(--go-soft); color: var(--go); }
.rmsg p { font: 700 19px/1.3 var(--f-ui); margin: 0 0 18px; letter-spacing: -.01em; }
.rmsg p:last-child { margin-bottom: 0; }
.rmsg .btn { max-width: 220px; margin: 0 auto; }

.sheet { margin: 0 12px 16px; background: var(--surface); border: 1px solid var(--line); border-radius: 24px; padding: 18px 18px 14px; box-shadow: 0 20px 40px -10px rgba(0, 0, 0, calc(.2 + var(--glow) * .7)); }
.rk { font: 500 10.5px/1.2 var(--f-data); color: var(--muted); letter-spacing: .12em; text-transform: uppercase; display: flex; justify-content: space-between; }
.verdict { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 32px; letter-spacing: -.035em; line-height: 1.05; margin: 7px 0 4px; }
.verdict.w { color: var(--go); }
.verdict.n, .verdict.x { color: var(--no-text); }
.verdict.u { color: var(--unknown); }
.verdict.n { font-size: 25px; }
.sub { font-size: 15px; color: var(--soft); margin: 0; }
.sub.price-line { margin-top: 3px; color: var(--ink); font-weight: 600; }
.name { margin: 12px 0 0; font-weight: 600; font-size: 15px; }
.addr { margin: 0; color: var(--muted); font-size: 13px; }
.also { display: flex; align-items: center; gap: 8px; width: 100%; margin: 10px 0 0; background: var(--raised); border: 1px dashed var(--faint); border-radius: 12px; padding: 8px 10px; text-align: left; font-size: 12.5px; color: var(--soft); }
.also .go2 { margin-left: auto; color: var(--focus); font-weight: 600; white-space: nowrap; }
.reason { margin: 12px 0 0; font-size: 15px; color: var(--soft); }
.strip { display: flex; gap: 8px; overflow-x: auto; margin: 14px -18px 0; padding: 0 18px 2px; scrollbar-width: none; }
.strip::-webkit-scrollbar { display: none; }
.strip button { flex: none; border: 1px solid var(--line); background: var(--raised); border-radius: 12px; padding: 7px 10px; text-align: left; font-size: 11.5px; line-height: 1.3; color: var(--soft); }
.strip button[aria-current="true"] { border-color: var(--ink); background: var(--raised2); color: var(--ink); }
.strip b { display: flex; align-items: center; gap: 4px; font-size: 13px; }
.strip .w { color: var(--go); }
.strip .n { color: var(--no-text); }
.strip .u { color: var(--unknown); }
```

- [ ] **Step 4: Write the entry point**

```ts
import '@fontsource/sora/400.css';
import '@fontsource/sora/600.css';
import '@fontsource/sora/700.css';
import '@fontsource/sora/800.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import './ui/theme.css';
import './ui/app.css';
import { createApp, type AppState, type View } from './app.ts';
import { createSettingsStore } from './services/settings.ts';
import { locate } from './services/location.ts';
import { createFetchJson, findNearest, loadManifest } from './services/data.ts';
import { mountSetup } from './ui/setup.ts';
import { mountParked, renderLoading } from './ui/parked.ts';
import { renderResults } from './ui/results.ts';

const fetchJson = createFetchJson(import.meta.env.BASE_URL);
const app = createApp({
  store: createSettingsStore(() => window.localStorage),
  locate: () => locate(navigator.geolocation),
  loadManifest: () => loadManifest(fetchJson),
  findNearest: (lat, lon, manifest) => findNearest(lat, lon, manifest, fetchJson),
  now: () => Date.now(),
});

const containers: Record<'setup' | 'parked' | 'results', HTMLElement> = {
  setup: document.getElementById('view-setup')!,
  parked: document.getElementById('view-parked')!,
  results: document.getElementById('view-results')!,
};
/** Updater of the mounted setup or parked screen; both patch in place while the view stays open. */
let update: ((s: AppState) => void) | null = null;
let lastView: View | null = null;

function render(): void {
  const state = app.getState();
  const entered = state.view !== lastView;
  lastView = state.view;
  const target = state.view === 'loading' ? 'results' : state.view;
  for (const [name, el] of Object.entries(containers)) el.hidden = name !== target;
  if (entered) {
    update = null;
    window.scrollTo(0, 0);
  }
  if (state.view === 'setup') {
    update ??= mountSetup(containers.setup, state, app);
    update(state);
  } else if (state.view === 'parked') {
    update ??= mountParked(containers.parked, app);
    update(state);
  } else if (state.view === 'loading') {
    renderLoading(containers.results);
  } else {
    renderResults(containers.results, state, app);
  }
}

app.subscribe(render);
render();
void app.start();
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: `✓ built in …`, with `dist/index.html`, one `dist/assets/index-*.js` (about 35 kB, 13–14 kB gzipped), one CSS file, the `sora-*` and `ibm-plex-mono-*` font files, and `dist/data/manifest.json`

- [ ] **Step 6: Run it in a browser**

Run: `npm run dev`, then open `http://localhost:5173/plug-or-not/`, and check:
1. A first visit shows "Set up your car" with "Set up your car first so we can calculate your costs." and "Charger prices from NDW open data of {date}" at the bottom.
2. Saving with charging speed `0` shows "Charging speed must be between 1 and 22 kW." on that field. Saving the PRD example values (petrol price typed as `2,399`) opens "Parked here now" and asks for location.
3. Find chargers with the battery unset shows "Enter your current battery level (0–100%)." on the battery slider.
4. Reload, and start dragging the battery slider at once, while "Finding your location…" is showing. The thumb keeps following the drag when the location answers, and the released value is kept.
5. With location allowed (or a Dutch location set in the browser's developer tools, Sensors), battery 20% and stay 45 min, "Find chargers" shows "Finding chargers near you…" and then the details panel "#1 of N · best saving first" with a ranked strip. Tapping a strip item selects it.
6. Switching the system between dark and light mode switches the colours without a reload.
7. In the developer tools Network panel, no request goes to any host other than localhost.

- [ ] **Step 7: Commit**

```bash
git add index.html src/main.ts src/ui/theme.css src/ui/app.css
git commit -m "feat: page shell, Night and Day theme, self-hosted fonts"
```

**Verify:** `npm run build` — exits 0 with `✓ built in`; `ls dist/data/manifest.json dist/assets/*.woff2 | head -3` lists the manifest and font files

### Task 18: GitHub Pages deployment

On every push to `main`, the workflow installs, runs the tests, builds and deploys `dist/` to GitHub Pages (Components, `.github/workflows/deploy.yml`; D-5; G8-AC1). The test step runs the snapshot smoke check against the committed data, so a broken snapshot can't ship. Action versions are the current major tags (checked 2026-10-12): checkout v7, setup-node v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5. CI uses Node 22, which Vite 8 supports.

There's no automated local check for this task: no workflow linter is installed in this repo. The workflow is verified by its first run after merge (Task 19, step 4). That run needs two repository settings, which the repository owner changes by hand: the repository must be public (D-5), and **Settings → Pages → Build and deployment → Source** must be set to "GitHub Actions".

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: npm scripts `test` and `build` (Task 1)
- Produces: the Pages deployment at `https://christianrexwinkel-tomtom.github.io/plug-or-not/`

- [ ] **Step 1: Write the workflow**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

- [ ] **Step 2: Check the workflow names the right scripts and output**

Run: `grep -nE 'npm (ci|test|run build)|path: dist|deploy-pages@v5' .github/workflows/deploy.yml`
Expected: 5 matching lines (`npm ci`, `npm test`, `npm run build`, `path: dist`, `actions/deploy-pages@v5`)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: test, build and deploy to GitHub Pages on push to main"
```

**Verify:** `grep -cE 'npm (ci|test|run build)|path: dist|deploy-pages@v5' .github/workflows/deploy.yml` prints `5`; the real check is the first Actions run on `main` (Task 19, step 4)

### Phase 4: Acceptance Verification

### Task 19: Verify Slice 1 acceptance

No new code. Run everything, then do the manual checks that unit tests can't cover (D-17; Testing & verification, "Devices").

- [ ] **Step 1: Run the whole suite**

Run: `npm test`
Expected: `Test Files  16 passed (16)` and `Tests  163 passed (163)`, including both acceptance suites (`test/acceptance/prd-figures.test.ts` 7, `test/acceptance/flows.test.ts` 13)

- [ ] **Step 2: Typecheck and build**

Run: `npm run build`
Expected: exits 0 with `✓ built in`

- [ ] **Step 3: Check that no raw feed is in the tree**

Run: `git ls-files | grep -cE '\.json\.gz$|data\.next/'`
Expected: `0`

- [ ] **Step 4: After the PR merges to `main`: check the deployment** (G8-AC1)

Run: `gh run list --workflow deploy.yml --branch main --limit 1`
Expected: the latest run shows `completed  success`. `https://christianrexwinkel-tomtom.github.io/plug-or-not/` opens over HTTPS on an iPhone (Safari) and an Android phone (Chrome), with no install.

- [ ] **Step 5: Manual device checks on the Pages link**

On iPhone Safari, Android Chrome, and desktop Chrome, Edge and Safari:
1. Location prompt: allow → "Your location · {lat}, {lon}"; deny → the denied notice with "Try again"; "Find chargers" is blocked in both the locating and the denied state.
2. Storage blocked (a private window in Safari): saving shows "Your settings won't be remembered in this browser. You can still use Plug or Not now." and the search still works.
3. Both colour sets: switch the device between light and dark while the results are open; the page switches without a reload. Check the Day set outdoors in daylight.
4. Stopwatch (G8-AC2): with saved settings, time from opening the link, through setting the battery and tapping "Find chargers", to the #1 details panel on screen, 5 trials on a phone over mobile data. Target: under 30 s in each trial.

**Verify:** `npm test && npm run build` — `Tests  163 passed (163)` and `✓ built in`; the steps 4 and 5 checks recorded in `implementation-log.md`

## Deviations from Design

| ID | Type | Status | Design updated? | Note |
|----|------|--------|-----------------|------|
| G3-AC1, PRD S2 error table "Location denied or unavailable" | change | pending | n/a — interim wording for Slice 1 only; the design text stays the target and Slice 3 restores it | Slice 1: Slice 1 has no map, so the denied message reads "We couldn't get your location. Allow location access in your browser and try again." without "…, or drag the map to your spot." Showing the design's sentence before the map exists would point the driver at something that isn't there. Needs your sign-off |
