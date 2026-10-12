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
