// Generates src/services/nl-border.ts from Natural Earth (public domain). Re-run by hand only if the border data changes:
//   curl -sL -o /tmp/ne.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_countries.geojson
//   node scripts/build-nl-border.mjs /tmp/ne.geojson
import fs from 'node:fs';
const [src, out = 'src/services/nl-border.ts'] = process.argv.slice(2);
const TOL = 0.002; // degrees, about 140–220 m
const g = JSON.parse(fs.readFileSync(src, 'utf8'));
const nld = g.features.find((f) => f.properties.ADM0_A3 === 'NLD');
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i]; const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1e-12;
    const d = Math.abs(dy * x - dx * y + b[0] * a[1] - b[1] * a[0]) / len;
    if (d > max) { max = d; idx = i; }
  }
  if (max <= tol) return [a, b];
  return [...dp(pts.slice(0, idx + 1), tol).slice(0, -1), ...dp(pts.slice(idx), tol)];
}
const rings = nld.geometry.coordinates
  .map((poly) => poly[0])
  .filter((ring) => ring.every(([, lat]) => lat > 50)) // European Netherlands only
  .map((ring) => {
    // A closed ring has equal end points, so simplify its two halves separately.
    const mid = Math.floor(ring.length / 2);
    return [...dp(ring.slice(0, mid + 1), TOL).slice(0, -1), ...dp(ring.slice(mid), TOL)];
  })
  .map((ring) => ring.map(([lon, lat]) => [Number(lon.toFixed(3)), Number(lat.toFixed(3))]))
  .filter((ring) => ring.length >= 4);
const body = rings.map((r) => '  [' + r.map(([lon, lat]) => `[${lon},${lat}]`).join(',') + ']').join(',\n');
fs.writeFileSync(out, `// Generated from Natural Earth v5.1.2 ne_10m_admin_0_countries (public domain): European
// Netherlands, Douglas–Peucker at ${TOL}°, coordinates [lon, lat] rounded to 0.001° (D-15).
export const NL_RINGS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
${body},
];
`);
console.log('rings', rings.length, 'points', rings.reduce((n, r) => n + r.length, 0), 'bytes', fs.statSync(out).size);
