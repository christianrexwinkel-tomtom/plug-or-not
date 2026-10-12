import type { App, AppState } from '../app.ts';
import { STAY_MAX, STAY_MIN, STAY_STEP } from '../engine/compare.ts';
import { h, icon, rangeFill } from './dom.ts';
import { notice } from './chrome.ts';
import { duration } from './format.ts';
import { SPOT_ZOOM, framePadding, framingPanelPx } from './map-core.ts';
import { loadSharedMap } from './map-loader.ts';
import type { MapHandle, MapMarker } from './map.ts';
import { VERDICT_ICON, VERDICT_TONE, resultsMapView, type PinView, type ResultsMapView } from './results-map-view.ts';
import {
  APPROXIMATE, APPROXIMATE_RESULTS, BATTERY_FULL, CHANGE_SPOT, LOAD_ERROR, RESULTS_MAP_LABEL, TRY_AGAIN, YOUR_SPOT,
} from './messages.ts';
import { entryViews, type EntryView, type VerdictKind } from './entry-view.ts';

const VERDICT_CLASS: Record<VerdictKind, string> = { 'worth-it': 'w', 'not-for-this-stay': 'n', never: 'x', unknown: 'u' };
/**
 * G7-AC2: the label follows the drag; the results update on release (G7-AC4). The element is never replaced, so an
 * update while dragging (a late map failure or recovery) can't cancel the drag, and it keeps its focus.
 */
function staySlider(app: App) {
  let dragging = false;
  const value = h('b', { class: 'num' });
  const input = h('input', {
    type: 'range', class: 'range', min: STAY_MIN, max: STAY_MAX, step: STAY_STEP, 'aria-label': 'Length of stay',
  });
  const show = (v: number) => {
    input.value = String(v);
    value.textContent = duration(v);
    input.style.setProperty('--p', rangeFill(v, STAY_MIN, STAY_MAX));
    input.setAttribute('aria-valuetext', duration(v));
  };
  input.addEventListener('input', () => {
    dragging = true;
    show(Number(input.value));
  });
  input.addEventListener('change', () => {
    dragging = false;
    app.setStay(Number(input.value));
  });
  // A drag that ends on its starting value fires no `change`: end it here too, or `sync` stays off for the visit.
  const endDrag = () => { dragging = false; };
  for (const type of ['pointerup', 'pointercancel', 'blur']) input.addEventListener(type, endDrag);
  return {
    box: h('label', { class: 'pill sl' }, h('span', { class: 't' }, h('small', {}, 'Stay'), value), input),
    /** Shows the app's value unless the driver is dragging. */
    sync: (v: number) => { if (!dragging) show(v); },
  };
}

/**
 * G6-AC8: Battery, the stay slider and Settings; under them the spot the results are for, with "Change spot", and the
 * approximate-position notice. All built once and patched in place, so "Change spot" keeps its focus across an update
 * and the notice isn't announced again on every stay change.
 */
function topBar(app: App) {
  const stay = staySlider(app);
  const batteryNum = h('span', { class: 'num' });
  const battery = h('button', { type: 'button', class: 'pill', onclick: () => app.backToParked() }, h('small', {}, 'Battery'), batteryNum);
  const row = h('div', { class: 'row' },
    battery,
    stay.box,
    h('button', { type: 'button', class: 'pill round', 'aria-label': 'Settings', onclick: () => app.openSettings() }, icon('gear', 17)),
  );
  const spotName = h('b', {});
  const spotCoords = document.createTextNode('');
  const spot = h('div', { class: 'spot' },
    h('span', { class: 'num' }, spotName, spotCoords),
    // Like the Battery pill, back to the parked view, where the spot can be moved.
    h('button', { type: 'button', class: 'linkbtn', onclick: () => app.backToParked() }, CHANGE_SPOT));
  const approximate = notice('info', 'status', h('p', {}, APPROXIMATE), h('p', { class: 'plain' }, APPROXIMATE_RESULTS));
  const el = h('div', { class: 'rtop' }, row, spot, approximate);
  return {
    el,
    update(state: AppState, v: ResultsMapView): void {
      batteryNum.textContent = `${state.battery}%`;
      battery.setAttribute('aria-label', `Battery ${state.battery}%, change`);
      stay.sync(state.stayMin);
      spot.hidden = v.spotLabel === null;
      spotName.textContent = v.spotLabel ?? '';
      spotCoords.data = ` · ${v.spotCoords ?? ''}`;
      approximate.hidden = !state.approximateResults;
    },
  };
}

/** Replaces everything after `keep` in its parent, leaving `keep` itself (and its focus) in place. */
function replaceAfter(keep: Element, ...nodes: Array<Node | false | null | undefined>): void {
  while (keep.nextSibling) keep.nextSibling.remove();
  keep.after(...nodes.filter((n): n is Node => n instanceof Node));
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
      }, h('b', { class: VERDICT_TONE[x.verdict] }, icon(VERDICT_ICON[x.verdict], 12), x.chipText), x.stripText)))),
  );
}

/**
 * The top bar (patched; its controls stay) and the message or the details panel (replaced on every update, with
 * focus put back on the strip item / "Also here" row of a selection the driver used).
 */
function renderContent(content: HTMLElement, top: ReturnType<typeof topBar>, state: AppState, app: App, v: ResultsMapView): void {
  const active = document.activeElement instanceof HTMLElement && content.contains(document.activeElement) ? document.activeElement : null;
  const focused = active?.dataset.id
    ? { id: active.dataset.id, inStrip: active.closest('.strip') !== null }
    : undefined;
  top.update(state, v);
  if (top.el.parentNode !== content) content.replaceChildren(top.el);
  if (state.search === 'load-error' || state.search === 'battery-full') {
    replaceAfter(top.el, message(state.search === 'load-error' ? 'load' : 'full', app));
    return;
  }
  const views = entryViews(state.results);
  const selected = views.find((x) => x.id === state.selectedId) ?? views[0];
  replaceAfter(top.el, selected && panel(selected, views, app));
  content.querySelector('.strip [aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (focused) {
    const id = CSS.escape(focused.id);
    // Back where it was if that control still exists (an "Also here" row disappears once selected), else its strip item.
    const same = content.querySelector<HTMLElement>(focused.inStrip ? `.strip [data-id="${id}"]` : `.also[data-id="${id}"]`);
    (same ?? content.querySelector<HTMLElement>(`.strip [data-id="${id}"]`))?.focus();
  }
}

/** FR-024: a pin button in a marker element; MapLibre positions the marker with its own transform. */
function pinElement(p: PinView, app: App): HTMLElement {
  return h('div', { class: p.selected ? 'pinm sel' : 'pinm' },
    h('button', {
      type: 'button', class: p.selected ? `pin ${p.tone} sel` : `pin ${p.tone}`, 'data-pin': p.locationId,
      'aria-label': p.ariaLabel, 'aria-pressed': p.selected ? 'true' : 'false', onclick: () => app.select(p.entryId),
    }, icon(p.icon, 13), p.label, p.count && h('span', { class: 'x2' }, p.count)));
}

function spotDot(): HTMLElement {
  return h('span', { class: 'me', role: 'img', 'aria-label': YOUR_SPOT });
}

/**
 * Builds the results screen once per visit and returns an updater that patches it (G6-AC8). The map layer stays while
 * the top bar and the panel re-render, so the shared map isn't moved on every stay change. Results never wait for the
 * map: it arrives once MapLibre has loaded, and a map that can't load leaves the panel and the strip in full (G6-AC9).
 */
export function mountResults(root: HTMLElement, app: App): (state: AppState) => void {
  const mapMessage = h('div', { class: 'mapmsg', role: 'status' });
  const layer = h('div', { class: 'rmap', role: 'application', 'aria-label': RESULTS_MAP_LABEL }, mapMessage);
  const content = h('div', { class: 'rlayer' });
  const top = topBar(app);
  const wrap = h('div', { class: 'rwrap' }, layer, content);
  root.replaceChildren(wrap);
  let map: MapHandle | null = null;
  /** The last view, its entries and the panel height measured with it, for a map that arrives after the first update. */
  let last: { v: ResultsMapView; views: EntryView[]; panelPx: number } | null = null;
  /** The frameKey last framed: a stay change keeps it, so the map isn't reframed under the driver. */
  let framed: string | null = null;

  /**
   * G6-AC8: the tallest details panel any entry renders, each built off-screen in the panel's own place (same width
   * and max-height), measured and removed at once. Hidden from assistive tech and focus while it exists.
   */
  function tallestPanelPx(views: EntryView[]): number {
    let tallest = 0;
    for (const e of views) {
      const probe = panel(e, views, app);
      probe.setAttribute('aria-hidden', 'true');
      probe.inert = true;
      probe.style.cssText = 'position:absolute;visibility:hidden;inset:auto 0 0 0';
      content.append(probe);
      tallest = Math.max(tallest, probe.offsetHeight);
      probe.remove();
    }
    return tallest;
  }

  function applyMap(m: MapHandle, v: ResultsMapView, views: EntryView[], panelPx: number): void {
    const focusedPin = document.activeElement instanceof HTMLElement ? document.activeElement.dataset.pin : undefined;
    m.setDraggable(v.mapMessage === null);
    m.setAccuracy(null);
    const markers: MapMarker[] = v.spot ? [{ lat: v.spot.lat, lon: v.spot.lon, element: spotDot() }] : [];
    for (const p of v.pins) markers.push({ lat: p.lat, lon: p.lon, element: pinElement(p, app) });
    m.setMarkers(markers);
    if (focusedPin) layer.querySelector<HTMLElement>(`[data-pin="${CSS.escape(focusedPin)}"]`)?.focus();
    if (v.mapMessage !== null) {
      framed = null;
      return;
    }
    if (v.frameKey === framed) return;
    framed = v.frameKey;
    const topPx = content.querySelector<HTMLElement>('.rtop')?.offsetHeight ?? 0;
    // Framed for the tallest panel any entry renders: selecting another entry never reframes, and the panel grows with
    // some (G6-AC8).
    const layerPx = layer.clientHeight;
    if (v.bounds) {
      const bottomPx = framingPanelPx(panelPx, tallestPanelPx(views), layerPx);
      m.frame(v.bounds, framePadding(topPx, bottomPx, layer.clientWidth, layerPx));
    }
    else if (v.spot) m.centreOn(v.spot.lat, v.spot.lon, SPOT_ZOOM);
  }

  // The loader reports a failed load itself (G6-AC9).
  void loadSharedMap(app).then((m) => {
    m.showResults();
    m.attachTo(layer);
    map = m;
    if (last) applyMap(m, last.v, last.views, last.panelPx);
  }, () => undefined);

  return (state) => {
    const v = resultsMapView(state);
    renderContent(content, top, state, app, v);
    // Measured once per update: the framing padding, the attribution and "Map couldn't load." all sit above the panel
    // (G6-AC8, D-22, G6-AC9).
    const panelPx = content.querySelector<HTMLElement>('.sheet')?.offsetHeight ?? 0;
    const views = state.search === 'results' ? entryViews(state.results) : [];
    last = { v, views, panelPx };
    wrap.style.setProperty('--sheet-h', `${panelPx}px`);
    mapMessage.hidden = v.mapMessage === null;
    mapMessage.textContent = v.mapMessage ?? '';
    if (map) applyMap(map, v, views, panelPx);
  };
}
