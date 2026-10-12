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
