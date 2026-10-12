import type { App, AppState } from '../app.ts';
import { STAY_MAX, STAY_MIN, STAY_STEP } from '../engine/compare.ts';
import { h, icon, rangeFill } from './dom.ts';
import { appBar, errorText, notice, storageNotice } from './chrome.ts';
import { coords, duration } from './format.ts';
import type { MapHandle } from './map.ts';
import { loadSharedMap } from './map-loader.ts';
import { spotView, type SpotNotice, type SpotView } from './spot-view.ts';
import {
  BATTERY_NOT_SET, FINDING_CHARGERS, LOCATING, MAP_HINT, MOVED_SPOT, MY_LOCATION, SPOT_MAP_LABEL, STAY_LIMITS, TRY_AGAIN,
} from './messages.ts';

/** A range slider whose element is never replaced, so a state change can't interrupt a drag. */
function slider(opts: {
  id: string; label: string; min: number; max: number; step: number; scale: string[]; inset?: boolean;
  format: (v: number) => string; valueText: (v: number) => string; commit: (v: number) => void;
}) {
  let dragging = false;
  let unset = true;
  const value = h('span', { class: 'val num' });
  const input = h('input', { type: 'range', class: 'range', id: opts.id, min: opts.min, max: opts.max, step: opts.step });
  const box = h('div', { class: 'slider' },
    h('div', { class: 'stop' }, h('label', { for: opts.id }, opts.label), value),
    h('div', { class: 'srow' }, input),
    h('div', { class: opts.inset ? 'scale inset' : 'scale', 'aria-hidden': 'true' }, ...opts.scale.map((t) => h('span', {}, t))),
  );
  const show = (v: number | null) => {
    const set = v !== null;
    unset = !set;
    const n = v ?? (opts.min + opts.max) / 2;
    input.value = String(n);
    input.style.setProperty('--p', set ? rangeFill(n, opts.min, opts.max) : '0%');
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
  // An unset slider parks its thumb mid-scale, so a tap or release exactly there fires no `change`:
  // commit on pointer release anyway, so any tap or drag sets the value.
  // (Keyboard input always moves the value, so it fires `change` by itself.)
  const commitIfUnset = () => {
    if (!unset) return;
    dragging = false;
    opts.commit(Number(input.value));
  };
  input.addEventListener('pointerup', commitIfUnset);
  return {
    box,
    input,
    /** Shows the app's value unless the driver is dragging. */
    sync: (v: number | null) => { if (!dragging) show(v); },
  };
}

function spotNotice(n: SpotNotice, highlight: boolean, app: App): HTMLElement {
  const el = notice(n.tone, n.role,
    h('p', {}, n.text),
    n.retry && h('div', { class: 'acts' },
      h('button', { type: 'button', class: 'btn btn-secondary btn-small', onclick: () => void app.retryLocation() }, TRY_AGAIN)),
  );
  el.classList.toggle('highlight', highlight);
  return el;
}

/**
 * The spot map (G3-AC1–AC4, FR-025): the shared map under a fixed pin, with its chip and overlays. Built once per
 * visit. MapLibre is loaded on first use, in its own chunk, so the setup screen doesn't wait for it; a failed load
 * counts as a map that can't load (G6-AC9). The overlays work without it.
 */
function spotMap(app: App) {
  let map: MapHandle | null = null;
  let attached = false;
  let last: SpotView | null = null;
  const pin = h('span', { class: 'target' });
  const chipLabel = h('b', {});
  const chipCoords = h('span', {});
  const chip = h('span', { class: 'chipx' }, chipLabel, chipCoords);
  const recentre = h('button', { type: 'button', class: 'recenter', onclick: () => app.recentre() }, icon('pin', 12), MY_LOCATION);
  const busy = h('div', { class: 'busy', role: 'status' }, h('span', {}, h('i', { class: 'dot' }), LOCATING));
  const hint = h('span', { class: 'maphint' }, MAP_HINT);
  const failed = h('div', { class: 'mapmsg', role: 'status' });
  const box = h('div', { class: 'spotmap', role: 'application', 'aria-label': SPOT_MAP_LABEL },
    pin, h('div', { class: 'mapchips' }, chip, recentre), busy, hint, failed);
  /** The centre last applied; null while the driver's own move is showing. */
  let applied: string | null = null;

  function applyMap(m: MapHandle, v: SpotView): void {
    m.setDraggable(v.draggable);
    m.setAccuracy(v.accuracyM);
    const key = v.centre && `${v.centre.lat},${v.centre.lon},${v.centre.zoom}`;
    if (v.centre && key !== applied) m.centreOn(v.centre.lat, v.centre.lon, v.centre.zoom);
    applied = key;
  }

  // The loader reports a failed load itself (G6-AC9).
  void loadSharedMap(app).then((m) => {
    // Back from the results: the pins go, and the camera the driver left comes back (G6-AC8).
    m.showSpot();
    // While dragging, the chip follows the map; the spot is committed when the move ends (`moved`).
    m.onLiveMove((lat, lon) => {
      chip.hidden = false;
      chipLabel.textContent = MOVED_SPOT;
      chipCoords.textContent = ` · ${coords(lat, lon)}`;
    });
    map = m;
    if (attached) m.attachTo(box);
    if (last) applyMap(m, last);
  }, () => undefined);

  return {
    box,
    /** Puts the shared map into this box (now, or once MapLibre has loaded); call once the box is in the page. */
    attach: () => {
      attached = true;
      map?.attachTo(box);
    },
    update(v: SpotView) {
      last = v;
      box.classList.toggle('hl', v.highlight);
      pin.className = v.pin === 'none' ? 'target none' : 'target';
      pin.hidden = v.mapMessage !== null;
      chip.hidden = v.chipLabel === null;
      chipLabel.textContent = v.chipLabel ?? '';
      chipCoords.textContent = v.chipCoords ? ` · ${v.chipCoords}` : '';
      recentre.hidden = !v.recentre;
      busy.hidden = !v.busy;
      hint.hidden = !v.draggable;
      failed.hidden = v.mapMessage === null;
      failed.textContent = v.mapMessage ?? '';
      if (map) applyMap(map, v);
    },
  };
}

/** Builds the parked screen once per visit and returns an updater that patches it in place. */
export function mountParked(root: HTMLElement, app: App): (state: AppState) => void {
  const battery = slider({
    id: 'batt', label: 'Battery now', min: 0, max: 100, step: 1, scale: ['0%', '25%', '50%', '75%', '100%'],
    format: (v) => `${v}%`, valueText: (v) => `${v} percent`, commit: (v) => app.setBattery(v),
  });
  const batteryError = errorText('batt_e', BATTERY_NOT_SET);
  battery.box.append(batteryError);

  const stay = slider({
    id: 'stay', label: 'How long you’ll stay', min: STAY_MIN, max: STAY_MAX, step: STAY_STEP,
    scale: ['15 min', '6h', '12h', '18h', '24h'], inset: true,
    format: duration, valueText: duration, commit: (v) => app.setStay(v),
  });
  const srow = stay.box.querySelector('.srow')!;
  srow.prepend(h('button', { type: 'button', class: 'nudge', 'aria-label': '15 minutes shorter', onclick: () => app.nudgeStay(-1) }, '−'));
  srow.append(h('button', { type: 'button', class: 'nudge', 'aria-label': '15 minutes longer', onclick: () => app.nudgeStay(1) }, '+'));
  const limitNote = h('div', { class: 'limitnote', role: 'status' }, STAY_LIMITS);
  stay.box.append(limitNote);

  const storage = storageNotice();
  const noticeSlot = h('div', {});
  const map = spotMap(app);
  root.replaceChildren(
    appBar(app),
    h('section', { class: 'screen' },
      h('h1', {}, 'Parked here now'),
      h('p', { class: 'lede' }, 'We’ll rank the 10 nearest chargers by what they save you compared with petrol.'),
      storage, battery.box, stay.box,
      h('h2', { class: 'sec' }, 'Where you parked'),
      noticeSlot,
      map.box,
      h('button', { type: 'button', class: 'btn btn-primary', onclick: () => void app.findChargers() }, icon('bolt', 18), 'Find chargers'),
    ),
  );
  map.attach();

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
    const spot = spotView(state);
    noticeSlot.replaceChildren(...(spot.notice ? [spotNotice(spot.notice, spot.highlight, app)] : []));
    map.update(spot);
  };
}

export function renderLoading(root: HTMLElement): void {
  root.replaceChildren(
    appBar(null),
    h('section', { class: 'screen' },
      h('div', { class: 'loading', role: 'status' }, h('div', { class: 'pulse' }, icon('pin', 28)), h('p', {}, FINDING_CHARGERS)),
    ),
  );
}
