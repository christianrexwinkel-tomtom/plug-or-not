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

/** The filled share of a range track, for the `--p` custom property ("37.5%"). */
export function rangeFill(v: number, min: number, max: number): string {
  return `${(((v - min) / (max - min)) * 100).toFixed(1)}%`;
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
  win: '<rect x="3" y="5" width="18" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
} as const;

export type IconName = keyof typeof ICONS;

/** The mockup's icons; the SVG markup is static, never data. */
export function icon(name: IconName, size = 16): SVGElement {
  const t = document.createElement('template');
  t.innerHTML = `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
  return t.content.firstElementChild as SVGElement;
}
