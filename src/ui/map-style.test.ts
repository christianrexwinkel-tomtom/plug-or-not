import { describe, expect, it } from 'vitest';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { MAP_COLOURS, mapStyle, type Theme } from './map-style.ts';

/** `vector_layers` of OpenFreeMap's planet TileJSON (https://tiles.openfreemap.org/planet, read 2026-10-12). */
const OFM_LAYERS = [
  'aerodrome_label', 'aeroway', 'boundary', 'building', 'housenumber', 'landcover', 'landuse', 'mountain_peak',
  'park', 'place', 'poi', 'transportation', 'transportation_name', 'water', 'water_name', 'waterway',
];
const THEMES: Theme[] = ['night', 'day'];

describe('mapStyle (D-32)', () => {
  it.each(THEMES)('the %s style is a valid MapLibre style', (theme) => {
    expect(validateStyleMin(mapStyle(theme))).toEqual([]);
  });

  it('every layer except the background reads a source layer that OpenFreeMap\'s tiles have', () => {
    for (const theme of THEMES) {
      for (const layer of mapStyle(theme).layers) {
        if (layer.type === 'background') continue;
        expect(layer).toMatchObject({ source: 'openmaptiles' });
        expect(OFM_LAYERS).toContain((layer as { 'source-layer': string })['source-layer']);
      }
    }
  });

  it('uses OpenFreeMap\'s tiles, glyphs and sprites, with no key', () => {
    const s = mapStyle('night');
    expect(s.sources).toEqual({ openmaptiles: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } });
    expect(s.glyphs).toBe('https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf');
    expect(s.sprite).toBe('https://tiles.openfreemap.org/sprites/ofm_f384/ofm');
  });

  it('paints land, water and labels in the theme\'s colours', () => {
    for (const theme of THEMES) {
      const paint = (id: string) => mapStyle(theme).layers.find((l) => l.id === id)!.paint as Record<string, unknown>;
      expect(paint('land')['background-color']).toBe(MAP_COLOURS[theme].land);
      expect(paint('water')['fill-color']).toBe(MAP_COLOURS[theme].water);
      expect(paint('road-name')['text-color']).toBe(MAP_COLOURS[theme].label);
    }
    expect(MAP_COLOURS.night.land).not.toBe(MAP_COLOURS.day.land);
  });
});
