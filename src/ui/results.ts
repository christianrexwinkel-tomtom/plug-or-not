import type { App, AppState } from '../app.ts';
import { STAY_MAX, STAY_MIN, STAY_STEP } from '../engine/compare.ts';
import { h, icon, rangeFill, type IconName } from './dom.ts';
import { notice } from './chrome.ts';
import { duration } from './format.ts';
import { APPROXIMATE, APPROXIMATE_RESULTS, BATTERY_FULL, LOAD_ERROR, TRY_AGAIN } from './messages.ts';
import { entryViews, type EntryView, type VerdictKind } from './entry-view.ts';

const VERDICT_ICON: Record<VerdictKind, IconName> = {
  'worth-it': 'check', 'not-for-this-stay': 'clock', never: 'cross', unknown: 'question',
};
const VERDICT_CLASS: Record<VerdictKind, string> = { 'worth-it': 'w', 'not-for-this-stay': 'n', never: 'x', unknown: 'u' };
/** The results slider's id; the focus restore looks it up after each re-render. */
const STAY_SLIDER_ID = 'rstay';

/** G7-AC2: the label follows the drag; the results update on release (G7-AC4). */
function staySlider(state: AppState, app: App): HTMLElement {
  const value = h('b', { class: 'num' });
  const input = h('input', {
    type: 'range', class: 'range', id: STAY_SLIDER_ID, min: STAY_MIN, max: STAY_MAX, step: STAY_STEP, value: state.stayMin,
    'aria-label': 'Length of stay',
  });
  const show = (v: number) => {
    value.textContent = duration(v);
    input.style.setProperty('--p', rangeFill(v, STAY_MIN, STAY_MAX));
    input.setAttribute('aria-valuetext', duration(v));
  };
  show(state.stayMin);
  input.addEventListener('input', () => show(Number(input.value)));
  input.addEventListener('change', () => app.setStay(Number(input.value)));
  return h('label', { class: 'pill sl' }, h('span', { class: 't' }, h('small', {}, 'Stay'), value), input);
}

function topBar(state: AppState, app: App): HTMLElement {
  return h('div', { class: 'rtop' },
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'pill', 'aria-label': `Battery ${state.battery}%, change`, onclick: () => app.backToParked() },
        h('small', {}, 'Battery'), h('span', { class: 'num' }, `${state.battery}%`)),
      staySlider(state, app),
      h('button', { type: 'button', class: 'pill round', 'aria-label': 'Settings', onclick: () => app.openSettings() }, icon('gear', 17)),
    ),
  );
}

function message(kind: 'load' | 'full', app: App): HTMLElement {
  return kind === 'load'
    ? h('div', { class: 'rmsg', role: 'alert' },
        h('div', { class: 'big bad' }, icon('wifi', 32)),
        h('p', {}, LOAD_ERROR),
        h('button', { type: 'button', class: 'btn btn-primary', onclick: () => void app.findChargers() }, TRY_AGAIN))
    : h('div', { class: 'rmsg', role: 'status' },
        h('div', { class: 'big good' }, icon('full', 32)),
        h('p', {}, BATTERY_FULL));
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
      e.windowText && h('p', { class: e.hasWindow ? 'window-line ok' : 'window-line' },
        icon(e.hasWindow ? 'win' : 'cross', 16), h('span', {}, e.windowText)),
      e.reasonText && h('p', { class: 'reason' }, e.reasonText),
    ),
    h('div', { class: 'strip', role: 'list', 'aria-label': 'All chargers, best saving first' },
      ...all.map((x) => h('div', { role: 'listitem', class: 'strip-item' }, h('button', {
        type: 'button', 'data-id': x.id, 'aria-current': x.id === e.id ? 'true' : 'false', onclick: () => app.select(x.id),
      }, h('b', { class: VERDICT_CLASS[x.verdict] === 'x' ? 'n' : VERDICT_CLASS[x.verdict] }, icon(VERDICT_ICON[x.verdict], 12), x.chipText), x.stripText)))),
  );
}

export function renderResults(root: HTMLElement, state: AppState, app: App): void {
  // Every render replaces the controls; put focus back on the one the driver used:
  // the stay slider, or the strip item / "Also here" row of a selection.
  const active = document.activeElement instanceof HTMLElement && root.contains(document.activeElement) ? document.activeElement : null;
  const stayFocused = active?.id === STAY_SLIDER_ID;
  const focused = active?.dataset.id
    ? { id: active.dataset.id, inStrip: active.closest('.strip') !== null }
    : undefined;
  if (state.search === 'load-error' || state.search === 'battery-full') {
    root.replaceChildren(h('div', { class: 'rwrap' }, topBar(state, app), message(state.search === 'load-error' ? 'load' : 'full', app)));
    if (stayFocused) document.getElementById(STAY_SLIDER_ID)?.focus();
    return;
  }
  const views = entryViews(state.results);
  const selected = views.find((v) => v.id === state.selectedId) ?? views[0];
  root.replaceChildren(
    h('div', { class: 'rwrap' },
      topBar(state, app),
      state.approximateResults && notice('info', 'status', h('p', {}, APPROXIMATE), h('p', { class: 'plain' }, APPROXIMATE_RESULTS)),
      selected ? panel(selected, views, app) : null,
    ),
  );
  root.querySelector('.strip [aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (stayFocused) {
    document.getElementById(STAY_SLIDER_ID)?.focus();
  } else if (focused) {
    const id = CSS.escape(focused.id);
    // Back where it was if that control still exists (an "Also here" row disappears once selected), else its strip item.
    const same = root.querySelector<HTMLElement>(focused.inStrip ? `.strip [data-id="${id}"]` : `.also[data-id="${id}"]`);
    (same ?? root.querySelector<HTMLElement>(`.strip [data-id="${id}"]`))?.focus();
  }
}
