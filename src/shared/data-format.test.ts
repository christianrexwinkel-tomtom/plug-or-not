import { describe, expect, it } from 'vitest';
import { parseTileKey, tileIndex, tileKey, tileKeyFor } from './data-format.ts';

describe('tile keys (D-7)', () => {
  it('buckets by floor of 0.1°', () => {
    expect(tileKeyFor(51.4436, 5.5519)).toBe('514_55');
    expect(tileKeyFor(52.3700, 4.9000)).toBe('523_49');
  });

  it('puts a point exactly on a tile edge in the tile north/east of it', () => {
    expect(tileIndex(51.4)).toBe(514);
    expect(tileIndex(5.3)).toBe(53);
  });

  it('round-trips through parseTileKey', () => {
    expect(parseTileKey(tileKey(514, 55))).toEqual({ latIndex: 514, lonIndex: 55 });
  });
});
