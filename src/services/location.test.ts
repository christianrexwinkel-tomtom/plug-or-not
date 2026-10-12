import { describe, expect, it, vi } from 'vitest';
import { isApproximate, isInNetherlands, locate } from './location.ts';

function geo(behaviour: (ok: PositionCallback, fail: PositionErrorCallback, opts?: PositionOptions) => void): Geolocation {
  return { getCurrentPosition: vi.fn(behaviour), watchPosition: vi.fn(), clearWatch: vi.fn() } as unknown as Geolocation;
}
const pos = (lat: number, lon: number, accuracy: number) => ({ coords: { latitude: lat, longitude: lon, accuracy } }) as GeolocationPosition;

describe('locate (G3-AC1)', () => {
  it('returns the position when granted, asking with a 10 s timeout', async () => {
    const g = geo((ok) => ok(pos(51.4436, 5.5519, 20)));
    await expect(locate(g)).resolves.toEqual({ kind: 'found', position: { lat: 51.4436, lon: 5.5519, accuracyM: 20 } });
    expect(g.getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), expect.objectContaining({ timeout: 10_000 }));
  });

  it.each([
    ['denied', 1],
    ['unavailable', 2],
    ['timed out', 3],
  ])('returns denied when location is %s', async (_name, code) => {
    await expect(locate(geo((_ok, fail) => fail({ code, message: '' } as GeolocationPositionError)))).resolves.toEqual({ kind: 'denied' });
  });

  it('returns denied when the browser has no location API', async () => {
    await expect(locate(undefined)).resolves.toEqual({ kind: 'denied' });
  });
});

describe('isApproximate (G3-AC2)', () => {
  it('is true above 1,000 m', () => {
    expect(isApproximate({ lat: 0, lon: 0, accuracyM: 1500 })).toBe(true);
    expect(isApproximate({ lat: 0, lon: 0, accuracyM: 1000 })).toBe(false);
  });
});

describe('isInNetherlands (G3-AC4)', () => {
  it.each([
    ['Parkstraat Nuenen', 51.4436, 5.5519, true],
    ['Klokgebouw Eindhoven', 51.4484, 5.4573, true],
    ['Venlo (border town)', 51.3704, 6.1724, true],
    ['Grand-Place Brussels', 50.8467, 4.3525, false],
    ['Essen, Belgium (2 km south of the border)', 51.4651, 4.4517, false],
    ['Aachen, Germany', 50.7753, 6.0839, false],
    ['Texel (island)', 53.0546, 4.7977, true],
  ])('%s → %s', (_name, lat, lon, expected) => {
    expect(isInNetherlands(lat, lon)).toBe(expected);
  });
});
