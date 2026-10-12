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
