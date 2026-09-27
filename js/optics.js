// EyeClear's optics and vision numbers. Pure maths, no three.js, so it can be checked in Node.
//
// The eye model is Le Grand's "full theoretical eye", the standard four-surface schematic eye
// (Le Grand & El Hage, Physiological Optics, Springer 1980; tabulated in Atchison & Smith,
// Optics of the Human Eye, 2000, Table A1). Distances in mm from the front of the cornea:
//   cornea front  R  7.8   n 1.3771  (thickness 0.55)
//   cornea back   R  6.5   n 1.3374  aqueous (anterior chamber 3.05)
//   lens front    R 10.2   n 1.42    (lens thickness 4.0)
//   lens back     R −6.0   n 1.336   vitreous, retina at 24.2 mm
// Relaxed, it has about 60 D of power (cornea ~42 D, lens ~22 D) and focuses distant light on
// the retina. Le Grand's accommodated eye (about 7 D) has lens radii 6.0 / −5.5 mm, a 4.5 mm thick
// lens and a 2.65 mm anterior chamber. We blend the lens between the two shapes in curvature with
// a shape factor k (0 relaxed, 1 = Le Grand accommodated) and let k run a little past 1 for the
// larger range of young eyes.
export const N = { air: 1, cornea: 1.3771, aqueous: 1.3374, lens: 1.42, vitreous: 1.336 };
export const AXIAL = 24.2;                         // mm, cornea to retina, emmetropic Le Grand eye
export const GLOBE = { cx: 13.2, rRetina: 11.0, rChoroid: 11.3, rSclera: 12.0 }; // the wall: spheres about one centre (mm)
export const K_MAX = 2;
export const SPECTACLE_VERTEX = 12;               // mm in front of the cornea, a typical frame

const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// The lens and cornea for a shape factor k. astigD adds power to the cornea in one meridian.
export function lensShape(k) {
  const c3 = lerp(1 / 10.2, 1 / 6.0, k), c4 = lerp(-1 / 6.0, -1 / 5.5, k);
  const front = lerp(3.6, 3.2, k), thick = lerp(4.0, 4.5, k);
  const equator = 4.75 - 0.35 * k;                // the lens gets slightly narrower as it rounds up
  return { c3, c4, front, back: front + thick, thick, equator };
}
export function surfaces(k = 0, astigD = 0) {
  const L = lensShape(k);
  const c1 = 1 / 7.8 + astigD / 1000 / (N.cornea - N.air);
  return [
    { x: 0, c: c1, n: N.cornea, h: 5.85 },
    { x: 0.55, c: 1 / 6.5, n: N.aqueous, h: 5.5 },
    { x: L.front, c: L.c3, n: N.lens, h: L.equator },
    { x: L.back, c: L.c4, n: N.vitreous, h: L.equator },
  ];
}

// Power of each part in dioptres (thin-lens sum of surface powers is close enough for the labels;
// the whole eye uses a real paraxial trace).
export function powers(k = 0) {
  const s = surfaces(k);
  const P = (i, n0) => (s[i].n - n0) * s[i].c * 1000;
  const cornea = P(0, N.air) + P(1, N.cornea) - (0.55 / 1000 / N.cornea) * P(0, N.air) * P(1, N.cornea);
  const l1 = P(2, N.aqueous), l2 = P(3, N.lens);
  const lens = l1 + l2 - (s[3].x - s[2].x) / 1000 / N.lens * l1 * l2;
  const eye = equivalentPower(k);
  return { cornea, lens, eye };
}

// ---------------------------------------------------------------- paraxial (y-nu) trace
// Elements: surfaces plus optional thin spectacle lens { x, P }. objDist: mm in front of the
// cornea (Infinity for far away). Returns where the image forms, in mm from the cornea.
export function imageX(k = 0, objDist = Infinity, spec = null, astigD = 0) {
  const els = [...(spec ? [{ x: -SPECTACLE_VERTEX, thin: spec }] : []), ...surfaces(k, astigD)];
  let n = 1, y, u, x;
  if (!isFinite(objDist)) { y = 1; u = 0; x = els[0].x; }
  else { x = -objDist; y = 0; u = 1 / Math.max(1, objDist - (spec ? SPECTACLE_VERTEX : 0)); }
  for (const e of els) {
    y += u * (e.x - x); x = e.x;
    if (e.thin != null) { u = u - y * e.thin / 1000; continue; }
    const nu = n * u - y * (e.n - n) * e.c;
    n = e.n; u = nu / n;
  }
  return u === 0 ? Infinity : x - y / u;
}
export function equivalentPower(k = 0) {
  let n = 1, y = 1, u = 0, x = 0;
  for (const e of surfaces(k)) { y += u * (e.x - x); x = e.x; const nu = n * u - y * (e.n - n) * e.c; n = e.n; u = nu / n; }
  return -n * u * 1000;                            // P = −n'u'/y, y = 1 mm, in dioptres
}

// Object vergence at the cornea (D; positive = diverging light from a near object, negative =
// converging light) that lens shape k focuses exactly on a retina at axial length L.
function imageFromVergence(k, V, astigD) {
  let n = 1, y = 1, u = V / 1000, x = 0;
  for (const e of surfaces(k, astigD)) { y += u * (e.x - x); x = e.x; const nu = n * u - y * (e.n - n) * e.c; n = e.n; u = nu / n; }
  return x - y / u;
}
export function focusVergence(k, L = AXIAL, astigD = 0) {
  let lo = -25, hi = 40;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (imageFromVergence(k, m, astigD) - L > 0) hi = m; else lo = m; }
  return (lo + hi) / 2;
}

// Accommodation for a shape factor: extra vergence it can focus beyond the relaxed eye.
const TABLE = (() => { const v0 = focusVergence(0); const t = []; for (let i = 0; i <= 160; i++) { const k = (i / 160) * K_MAX; t.push([k, focusVergence(k) - v0]); } return t; })();
export const accommodationOf = (k) => { const i = clamp(k / K_MAX * 160, 0, 160), a = Math.floor(i), b = Math.min(160, a + 1); return lerp(TABLE[a][1], TABLE[b][1], i - a); };
export function shapeFor(A) {
  if (A <= 0) return 0;
  for (let i = 1; i <= 160; i++) if (TABLE[i][1] >= A) { const [k0, a0] = TABLE[i - 1], [k1, a1] = TABLE[i]; return lerp(k0, k1, (A - a0) / (a1 - a0)); }
  return K_MAX;
}
export const MAX_MODEL_ACCOM = TABLE[160][1];

// ---------------------------------------------------------------- presbyopia
// Amplitude of accommodation with age. Duane's measurements (Duane, JAMA 79:1176, 1922) of about
// 4,200 eyes are summarised by Hofstetter's (1950) average line, 18.5 − 0.3 × age, which falls to
// the ~1 D floor Duane found after about 55 (that last dioptre is depth of focus, not real
// focusing). Points below are read from Duane's mean curve (approximate).
export const DUANE = [[8, 13.8], [12, 12.9], [16, 11.8], [20, 10.8], [24, 9.9], [28, 8.9], [32, 7.9], [36, 6.8], [40, 5.9], [44, 4.6], [48, 3.1], [52, 1.8], [56, 1.3], [60, 1.1], [64, 1.0], [68, 1.0], [72, 0.9]];
export function amplitude(age) {
  const a = clamp(age, DUANE[0][0], DUANE[DUANE.length - 1][0]);
  for (let i = 1; i < DUANE.length; i++) if (DUANE[i][0] >= a) { const [x0, y0] = DUANE[i - 1], [x1, y1] = DUANE[i]; return lerp(y0, y1, (a - x0) / (x1 - x0)); }
  return DUANE[DUANE.length - 1][1];
}
export const hofstetter = (age) => 18.5 - 0.3 * age;

// ---------------------------------------------------------------- exact 2D ray trace
// Rays live in one plane through the optical axis: x along the axis (mm from the cornea), y up.
// Snell's law is applied in vector form at each real sphere, so the drawn paths are the true ones.
function hitSphere(px, py, dx, dy, vx, c) {
  if (Math.abs(c) < 1e-9) { if (Math.abs(dx) < 1e-9) return null; const t = (vx - px) / dx; return t > 1e-6 ? t : null; }
  const R = 1 / c, cx = vx + R;
  const ox = px - cx, oy = py;
  const b = ox * dx + oy * dy, cc = ox * ox + oy * oy - R * R, disc = b * b - cc;
  if (disc < 0) return null;
  const s = Math.sqrt(disc), t1 = -b - s, t2 = -b + s;
  // choose the intersection on the vertex side of the sphere
  let best = null, bd = 1e9;
  for (const t of [t1, t2]) { if (t <= 1e-6) continue; const x = px + dx * t; const d = Math.abs(x - vx); if (d < bd) { bd = d; best = t; } }
  return best;
}
function refract(dx, dy, nx, ny, n1, n2) {
  if (nx * dx + ny * dy > 0) { nx = -nx; ny = -ny; }
  const eta = n1 / n2, ci = -(nx * dx + ny * dy), k = 1 - eta * eta * (1 - ci * ci);
  if (k < 0) return null;
  const a = eta * ci - Math.sqrt(k);
  const rx = eta * dx + a * nx, ry = eta * dy + a * ny, L = Math.hypot(rx, ry);
  return [rx / L, ry / L];
}

// Trace one ray. start [x, y], slope dy/dx. Returns { pts: [[x,y]...], hit: [x,y] on the retina, dir }.
// opts: { k, astigD, L (axial length), spec (thin lens power at the spectacle plane), scatter }
export function traceRay(start, slope, opts = {}) {
  const { k = 0, astigD = 0, L = AXIAL, spec = null } = opts;
  let [px, py] = start, dx = 1, dy = slope; { const l = Math.hypot(dx, dy); dx /= l; dy /= l; }
  const pts = [[px, py]];
  if (spec != null && px < -SPECTACLE_VERTEX) {
    const t = (-SPECTACLE_VERTEX - px) / dx; px += dx * t; py += dy * t; pts.push([px, py]);
    const m = dy / dx - py * spec / 1000; dx = 1; dy = m; const l = Math.hypot(dx, dy); dx /= l; dy /= l;
  }
  let n = 1;
  for (const s of surfaces(k, astigD)) {
    const t = hitSphere(px, py, dx, dy, s.x, s.c);
    if (t == null) return { pts, blocked: true };
    px += dx * t; py += dy * t; pts.push([px, py]);
    if (Math.abs(py) > s.h) return { pts, blocked: true };
    const R = 1 / s.c, nx = px - (s.x + R), ny = py, l = Math.hypot(nx, ny);
    const r = refract(dx, dy, nx / l, ny / l, n, s.n);
    if (!r) return { pts, blocked: true };
    [dx, dy] = r; n = s.n;
  }
  // Stop at the retina: the globe's inner wall, stretched along the axis for longer or shorter eyes.
  const sx = L / AXIAL, cx = GLOBE.cx * sx;
  const ex = (px - cx) / sx, edx = dx / sx;
  const a = edx * edx + dy * dy, b = 2 * (ex * edx + py * dy), c = ex * ex + py * py - GLOBE.rRetina ** 2;
  const disc = b * b - 4 * a * c;
  const t = disc >= 0 ? (-b + Math.sqrt(disc)) / (2 * a) : (L - px) / dx;
  const hit = [px + dx * t, py + dy * t];
  pts.push(hit);
  return { pts, hit, dir: [dx, dy], last: [pts[pts.length - 2][0], pts[pts.length - 2][1]] };
}

// A fan of rays from an object point. objDist in mm (Infinity = parallel), height in mm at the
// object (for off-axis points use fieldDeg instead). pupil: radius in mm at the iris.
export function fan(n, pupil, opts = {}) {
  const { objDist = Infinity, fieldDeg = 0, startX = -30 } = opts;
  const out = [];
  const irisX = 3.3;
  for (let i = 0; i < n; i++) {
    const h = n === 1 ? 0 : -pupil + (2 * pupil * i) / (n - 1);
    let slope, y0;
    if (!isFinite(objDist)) { slope = Math.tan((fieldDeg * Math.PI) / 180); }
    else { const oy = Math.tan((fieldDeg * Math.PI) / 180) * objDist; slope = (h - oy) / (irisX + objDist); }
    y0 = h - slope * (irisX - startX);
    out.push(traceRay([startX, y0], slope, opts));
  }
  return out;
}

// Spectacle lens (at 12 mm) that puts the far point on the retina, and the eye's refractive error.
export function farPointVergence(L = AXIAL, astigD = 0) { return focusVergence(0, L, astigD); }
export function spectacleFor(L = AXIAL, astigD = 0) {
  // The far point (vergence V: positive for a short-sighted eye, whose far point is in front) must sit at
  // the spectacle lens's focal point, d = 12 mm in front of the cornea: P = −V / (1 − dV).
  const V = farPointVergence(L, astigD), d = SPECTACLE_VERTEX / 1000;
  return -V / (1 - d * V);
}
export const quarter = (D) => Math.round(D * 4) / 4;

// Blur on the retina: diameter of the blur circle for a pupil (mm) and defocus (D). Uses the eye's
// nodal distance of about 17 mm: blur ≈ pupil × defocus × 17 / 1000 (Smith, Ophthalmic Physiol
// Opt 1982). Returns mm.
export const blurCircle = (pupilDiam, defocusD) => (pupilDiam * Math.abs(defocusD) * 16.7) / 1000;

// ---------------------------------------------------------------- the retina
// Rod and cone density along the horizontal meridian (cells per mm²), eccentricity in degrees
// (positive = temporal retina, negative = nasal). Smooth curves shaped after Osterberg (1935) and
// Curcio et al. (J Comp Neurol 292:497, 1990): cone peak ~199,000/mm² at the foveola falling to
// ~10,000 by 5°; a rod-free zone ~1.25° wide; rod peak ~150,000/mm² about 18–20° out; nothing at
// all on the optic disc, centred ~15° nasal and ~5.5° wide. 1 mm on the retina ≈ 3.4°.
export const DISC = { centre: -15, half: 2.9 };
export function cones(e) {
  const a = Math.abs(e);
  if (onDisc(e)) return 0;
  return 165000 * Math.exp(-a / 0.3) + 30000 / (1 + (a / 1.8) ** 1.6) + 4000;
}
export function rods(e) {
  const a = Math.abs(e);
  if (onDisc(e)) return 0;
  const rise = 1 - Math.exp(-Math.max(0, a - 0.6) / 4.5);
  return 160000 * rise * Math.exp(-Math.max(0, a - 18) / 50);
}
export const onDisc = (e) => Math.abs(e - DISC.centre) < DISC.half;
export const DEG_PER_MM = 3.4;

// Dark adaptation after a bright light: log threshold above the fully dark-adapted rod threshold.
// Two branches, cones then rods, with the rod–cone break near 8 minutes and full rod sensitivity by
// 30–40 minutes: a smooth fit to the classic curve of Hecht, Haig & Chase (J Gen Physiol 20:831, 1937).
export const coneBranch = (t) => 2.85 + 1.35 * Math.exp(-t / 1.7);
export const rodBranch = (t) => 9.6 * Math.exp(-t / 6.57) + 0.05;
export const threshold = (t) => Math.min(coneBranch(t), rodBranch(t));

// Scene light levels (luminance, cd/m²). CIE: photopic above ~3 cd/m² (cones), scotopic below
// ~0.001 cd/m² (rods only), mesopic in between (CIE 191:2010).
export function visionMode(L) {
  if (L >= 3) return { id: 'photopic', name: 'Cone vision (photopic)', cones: 1, rods: L > 300 ? 0.05 : 0.4 };
  if (L <= 0.001) return { id: 'scotopic', name: 'Rod vision (scotopic)', cones: 0, rods: 1 };
  const k = (Math.log10(L) + 3) / (Math.log10(3) + 3);
  return { id: 'mesopic', name: 'Twilight vision (mesopic)', cones: k, rods: 1 - 0.6 * k };
}

// ---------------------------------------------------------------- colour
// Cone sensitivity: the Govardovskii et al. visual pigment template (Visual Neuroscience 17:509,
// 2000, alpha band), with peaks at 420 (S), 530 (M) and 560 nm (L), the photopigment absorbance
// peaks of human cones (Dartnall, Bowmaker & Mollon, Proc R Soc B 220:115, 1983; Bowmaker & Dartnall,
// J Physiol 298:501, 1980). Normalised to 1 at the peak.
export const CONES = { S: 420, M: 530, L: 560 };
export function pigment(lmax, lambda) {
  const x = lmax / lambda;
  const a = 0.8795 + 0.0459 * Math.exp(-((lmax - 300) ** 2) / 11940);
  return 1 / (Math.exp(69.7 * (a - x)) + Math.exp(28 * (0.922 - x)) + Math.exp(-14.9 * (1.104 - x)) + 0.674);
}
// Anomalous trichromacy shifts one pigment towards another; dichromacy removes it.
export function coneSet(type = 'normal') {
  const s = { ...CONES };
  if (type === 'protanomaly') s.L = 545;
  if (type === 'deuteranomaly') s.M = 545;
  return s;
}
export function coneResponse(spectrum, type = 'normal') {
  // spectrum: function λ → power. Sum from 380 to 720 nm.
  const set = coneSet(type), r = { S: 0, M: 0, L: 0 };
  for (let l = 380; l <= 720; l += 2) { const p = spectrum(l); if (!p) continue; r.S += p * pigment(set.S, l); r.M += p * pigment(set.M, l); r.L += p * pigment(set.L, l); }
  if (type === 'protan') r.L = 0;
  if (type === 'deutan') r.M = 0;
  if (type === 'tritan') r.S = 0;
  return r;
}
// Typical display primaries as narrow peaks (an LED-backlit LCD or OLED): ~610, ~545, ~450 nm.
export const PRIMARIES = { R: 610, G: 545, B: 450 };
export const gauss = (l, c, w) => Math.exp(-(((l - c) / w) ** 2));

// Wavelength to an sRGB colour for drawing (after Dan Bruton's widely used approximation).
export function waveRGB(l) {
  let r = 0, g = 0, b = 0;
  if (l < 440) { r = -(l - 440) / 60; b = 1; } else if (l < 490) { g = (l - 440) / 50; b = 1; } else if (l < 510) { g = 1; b = -(l - 510) / 20; } else if (l < 580) { r = (l - 510) / 70; g = 1; } else if (l < 645) { r = 1; g = -(l - 645) / 65; } else r = 1;
  const f = l < 420 ? 0.3 + (0.7 * (l - 380)) / 40 : l > 700 ? 0.3 + (0.7 * (780 - l)) / 80 : 1;
  return [r, g, b].map((v) => Math.round(255 * Math.pow(clamp(v * f, 0, 1), 0.8)));
}

// Colour-blindness simulation in linear RGB: Machado, Oliveira & Fernandes, IEEE TVCG 15:1291
// (2009), severity 1.0 matrices (dichromacy, the strongest form).
export const CVD = {
  protan: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deutan: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.011820, 0.042940, 0.968881],
  tritan: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.303900],
};
const toLin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const toSRGB = (v) => Math.round(255 * clamp(v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055, 0, 1));
export function simulate(rgb, type) {
  const m = CVD[type]; if (!m) return rgb;
  const [r, g, b] = rgb.map(toLin);
  return [toSRGB(m[0] * r + m[1] * g + m[2] * b), toSRGB(m[3] * r + m[4] * g + m[5] * b), toSRGB(m[6] * r + m[7] * g + m[8] * b)];
}
export function simulateImage(data, type) {
  const m = CVD[type]; if (!m) return;
  const lut = new Float32Array(256); for (let i = 0; i < 256; i++) lut[i] = toLin(i);
  for (let i = 0; i < data.length; i += 4) {
    const r = lut[data[i]], g = lut[data[i + 1]], b = lut[data[i + 2]];
    data[i] = toSRGB(m[0] * r + m[1] * g + m[2] * b); data[i + 1] = toSRGB(m[3] * r + m[4] * g + m[5] * b); data[i + 2] = toSRGB(m[6] * r + m[7] * g + m[8] * b);
  }
}
