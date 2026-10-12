// The Night and Day map styles (D-32): OpenFreeMap's vector tiles, glyphs and sprites in the UI mockup's map colours.
import type { ExpressionSpecification, LineLayerSpecification, StyleSpecification } from '@maplibre/maplibre-gl-style-spec';

export type Theme = 'night' | 'day';

export interface MapColours {
  land: string;
  road: string;
  edge: string;
  park: string;
  water: string;
  label: string;
}

/** The mockup's --map-* tokens (ui-mockup.html), Night and Day. */
export const MAP_COLOURS: Record<Theme, MapColours> = {
  night: { land: '#111816', road: '#212c29', edge: '#0b100f', park: '#13231b', water: '#0f1f2a', label: '#4c5d58' },
  day: { land: '#eceeea', road: '#ffffff', edge: '#d4d9d4', park: '#d7e9d1', water: '#cde2ee', label: '#97a29d' },
};

const SOURCE = 'openmaptiles';
const MAJOR = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'];
const MINOR = ['minor', 'service'];

/** A line width growing with zoom: `z10` px at zoom 10 to `z18` px at zoom 18. */
function width(z10: number, z18: number): ExpressionSpecification {
  return ['interpolate', ['exponential', 1.5], ['zoom'], 10, z10, 18, z18];
}

function road(id: string, classes: string[], colour: string, lineWidth: ExpressionSpecification): LineLayerSpecification {
  return {
    id,
    type: 'line',
    source: SOURCE,
    'source-layer': 'transportation',
    filter: ['match', ['get', 'class'], classes, true, false],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': colour, 'line-width': lineWidth },
  };
}

export function mapStyle(theme: Theme): StyleSpecification {
  const c = MAP_COLOURS[theme];
  const text = { 'text-color': c.label, 'text-halo-color': c.land, 'text-halo-width': 1.2 };
  return {
    version: 8,
    name: `Plug or Not ${theme}`,
    sources: { [SOURCE]: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } },
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sprite: 'https://tiles.openfreemap.org/sprites/ofm_f384/ofm',
    layers: [
      { id: 'land', type: 'background', paint: { 'background-color': c.land } },
      { id: 'park', type: 'fill', source: SOURCE, 'source-layer': 'park', paint: { 'fill-color': c.park } },
      {
        id: 'green', type: 'fill', source: SOURCE, 'source-layer': 'landcover',
        filter: ['match', ['get', 'class'], ['grass', 'wood'], true, false],
        paint: { 'fill-color': c.park },
      },
      { id: 'water', type: 'fill', source: SOURCE, 'source-layer': 'water', paint: { 'fill-color': c.water } },
      { id: 'waterway', type: 'line', source: SOURCE, 'source-layer': 'waterway', paint: { 'line-color': c.water, 'line-width': width(1, 6) } },
      {
        id: 'building', type: 'fill', source: SOURCE, 'source-layer': 'building', minzoom: 14,
        paint: { 'fill-color': c.edge, 'fill-opacity': 0.5 },
      },
      road('road-minor-casing', MINOR, c.edge, width(1.5, 14)),
      road('road-major-casing', MAJOR, c.edge, width(3, 22)),
      road('road-minor', MINOR, c.road, width(0.5, 11)),
      road('road-major', MAJOR, c.road, width(2, 18)),
      {
        id: 'road-name', type: 'symbol', source: SOURCE, 'source-layer': 'transportation_name', minzoom: 14,
        layout: {
          'symbol-placement': 'line', 'text-field': ['coalesce', ['get', 'name'], ''], 'text-font': ['Noto Sans Regular'],
          'text-size': 10, 'text-letter-spacing': 0.08, 'text-transform': 'uppercase',
        },
        paint: text,
      },
      {
        id: 'place-name', type: 'symbol', source: SOURCE, 'source-layer': 'place',
        filter: ['match', ['get', 'class'], ['city', 'town', 'village', 'suburb'], true, false],
        layout: {
          'text-field': ['coalesce', ['get', 'name'], ''], 'text-font': ['Noto Sans Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 6, 11, 14, 15],
        },
        paint: text,
      },
    ],
  };
}
