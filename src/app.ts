// Controller: owns app state and the request flow (solution design, Architecture layer 2).
import type { Manifest } from './shared/data-format.ts';
import { computeEntries, rankAtStay, type ComputedEntry, type RankedEntry } from './engine/results.ts';
import { STAY_DEFAULT, STAY_STEP, clampStay } from './engine/compare.ts';
import { validate, type RawSettings, type Settings, type SettingsStore, type ValidationResult } from './services/settings.ts';
import { isApproximate, isInNetherlands, spotOf, type LatLon, type LocateOutcome, type Position, type Spot } from './services/location.ts';
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
  /** The map centre after the driver dragged the map; null = the browser position is the spot (G3-AC3). */
  movedSpot: LatLon | null;
  /** The map couldn't start, or its style or tiles failed (G6-AC9). */
  mapFailed: boolean;
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
  /** The driver dragged the map to this centre (FR-025). */
  moveSpot(lat: number, lon: number): void;
  /** "My location": back to the browser position. */
  recentre(): void;
  /** The map wrapper reports that the map can't be used (G6-AC9). */
  reportMapFailure(): void;
  setBattery(pct: number): void;
  setStay(min: number): void;
  nudgeStay(direction: 1 | -1): void;
  findChargers(): Promise<void>;
  select(id: string): void;
  backToParked(): void;
}

/** G3-AC3: the spot "Find chargers" uses — the moved map centre, else the browser position, else none. */
export function spotFor(state: AppState): Spot {
  return spotOf(state.location.status === 'found' ? state.location.position : null, state.movedSpot);
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
    movedSpot: null,
    mapFailed: false,
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
    // "Try again" starts over from the browser position; the map can't be moved until it answers (G3-AC1).
    set({ location: { status: 'locating' }, movedSpot: null, blocked: null });
    const outcome = await deps.locate();
    set({
      location: outcome.kind === 'found'
        ? { status: 'found', position: outcome.position, approximate: isApproximate(outcome.position) }
        : { status: 'denied' },
      // A found location answers a "Find chargers" tap that was refused while locating.
      blocked: outcome.kind === 'found' && state.blocked === 'location' ? null : state.blocked,
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

  /** A new spot answers an outside-the-Netherlands message; the next "Find chargers" checks the spot again. */
  function searchAfterSpotChange(): SearchStatus {
    return state.search === 'outside-nl' ? 'idle' : state.search;
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
      if (state.returnView === 'results' && state.search === 'results' && computed.length > 0) {
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

    moveSpot(lat, lon) {
      // No dragging while the location is being found (G3-AC1), and none once the map has failed (G6-AC9).
      if (state.location.status === 'locating' || state.mapFailed) return;
      set({
        movedSpot: { lat, lon },
        search: searchAfterSpotChange(),
        blocked: state.blocked === 'location' ? null : state.blocked,
      });
    },

    recentre() {
      if (state.location.status !== 'found') return;
      set({ movedSpot: null, search: searchAfterSpotChange() });
    },

    reportMapFailure() {
      if (state.mapFailed) return;
      // Without a map the browser position is the spot (G6-AC9).
      set({ mapFailed: true, movedSpot: null, search: searchAfterSpotChange() });
    },

    setBattery(pct) {
      set({ battery: pct, blocked: state.blocked === 'battery' ? null : state.blocked });
    },

    setStay(min) {
      set({ stayMin: clampStay(min), stayLimitNote: false });
      // Results screen: read the cached curves at the new stay; no fetch, no engine run (G7-AC4).
      // rerank() keeps the selected entry while the ranking around it changes (D-30).
      if (state.view === 'results' && state.search === 'results' && computed.length > 0) rerank();
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
      // G3-AC1: no spot while locating, or after a denial until the map has been moved.
      const spot = spotFor(state);
      if (spot.kind === 'none') {
        set({ blocked: 'location' });
        return;
      }
      set({ blocked: null });
      if (!isInNetherlands(spot.lat, spot.lon)) {
        set({ search: 'outside-nl' });
        return;
      }
      if (state.battery === 100) {
        computed = [];
        set({ view: 'results', search: 'battery-full', results: [], selectedId: null });
        return;
      }
      busy = true;
      set({ view: 'loading' });
      try {
        const key = `${spot.lat},${spot.lon}`;
        if (nearestCache?.key !== key) {
          const m = await getManifest();
          nearestCache = { key, result: await deps.findNearest(spot.lat, spot.lon, m) };
        }
        const { nearby, tariffs } = nearestCache.result;
        computed = computeEntries(nearby, tariffs, state.settings, state.battery, deps.now());
        // G3-AC2: the results repeat the notice only for an unmoved approximate position.
        set({ selectedId: null, approximateResults: spot.kind === 'browser' && spot.approximate });
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
