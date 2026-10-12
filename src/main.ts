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
