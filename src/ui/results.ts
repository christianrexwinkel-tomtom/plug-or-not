import type { App, AppState } from '../app.ts';
import { h, icon, type IconName } from './dom.ts';
import { notice } from './chrome.ts';
import { duration } from './format.ts';
import { APPROXIMATE, APPROXIMATE_RESULTS, BATTERY_FULL, LOAD_ERROR, TRY_AGAIN } from './messages.ts';
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
      e.reasonText && h('p', { class: 'reason' }, e.reasonText),
    ),
    h('div', { class: 'strip', role: 'list', 'aria-label': 'All chargers, best saving first' },
      ...all.map((x) => h('div', { role: 'listitem', class: 'strip-item' }, h('button', {
        type: 'button', 'data-id': x.id, 'aria-current': x.id === e.id ? 'true' : 'false', onclick: () => app.select(x.id),
      }, h('b', { class: VERDICT_CLASS[x.verdict] === 'x' ? 'n' : VERDICT_CLASS[x.verdict] }, icon(VERDICT_ICON[x.verdict], 12), x.chipText), x.stripText)))),
  );
}

export function renderResults(root: HTMLElement, state: AppState, app: App): void {
  // A selection re-renders the panel; keep focus on the strip item (or "Also here" row) the driver used.
  const active = document.activeElement;
  const focused = active instanceof HTMLElement && root.contains(active) && active.dataset.id
    ? { id: active.dataset.id, inStrip: active.closest('.strip') !== null }
    : undefined;
  if (state.search === 'load-error' || state.search === 'battery-full') {
    root.replaceChildren(h('div', { class: 'rwrap' }, topBar(state, app), message(state.search === 'load-error' ? 'load' : 'full', app)));
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
  if (focused) {
    const id = CSS.escape(focused.id);
    // Back where it was if that control still exists (an "Also here" row disappears once selected), else its strip item.
    const same = root.querySelector<HTMLElement>(focused.inStrip ? `.strip [data-id="${id}"]` : `.also[data-id="${id}"]`);
    (same ?? root.querySelector<HTMLElement>(`.strip [data-id="${id}"]`))?.focus();
  }
}
