// EyeClear's 3D eye: a stylised but anatomically laid-out right human eye, built in millimetres
// from the same Le Grand schematic eye that optics.js traces rays through.
//
// Frame (inside `eye.mm`): x runs along the optical axis from the front of the cornea (x = 0)
// back to the retina (x = 24.2 mm), y is up, +z is temporal (towards the right ear, for this
// RIGHT eye) and −z is nasal. The camera usually looks from +z, so we see the eye in profile
// with light arriving from the left, as in a textbook cross-section.
//
// Sizes follow standard anatomy (Gray's Anatomy; AAO Basic and Clinical Science Course, Section 2;
// Atchison & Smith, Optics of the Human Eye):
//  - globe about 24 mm across; cornea 11.7 mm wide, 0.55 mm thick in the middle, radius 7.8 mm;
//  - sclera, choroid and retina as three layers of the wall; the retina ends at the ora serrata,
//    about 6–7 mm behind the limbus (the edge of the cornea);
//  - the macula (about 5.5 mm wide) with the fovea at its centre on the back of the eye; the
//    optic disc (about 1.8 mm) about 4.5 mm, or 15°, towards the nose, with the retinal arteries
//    and veins arching around the macula;
//  - the four rectus muscles insert on the sclera 5.5 (medial), 6.5 (inferior), 6.9 (lateral) and
//    7.7 mm (superior) behind the limbus, the "spiral of Tillaux", and all start at a tendon ring
//    (the annulus of Zinn) around the optic nerve at the back of the orbit. The superior oblique
//    runs forward to a pulley (the trochlea) and turns back to the top of the globe; the inferior
//    oblique starts at the front of the orbit floor and passes under the eye to its back.
// One model unit is 5 mm (the mm group is scaled by 0.2).
import { THREE, M, tube, torus, clamp, lerp, approach } from './kit.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { GLOBE, lensShape, AXIAL, fan, imageX } from './optics.js';

export const SCALE = 0.2;
const G = GLOBE.cx;
const LIMBUS = { x: 2.64, r: 5.85 };

// ---------------------------------------------------------------- small helpers
// Lathe about the x axis from [x, r] pairs (in mm). phi 0 points at +z (towards the camera).
export function latheMM(profile, mat, phiStart = 0, phiLength = Math.PI * 2, seg = 64) {
  const g = new THREE.LatheGeometry(profile.map(([x, r]) => new THREE.Vector2(Math.max(0.0001, r), x)), seg, phiStart, phiLength);
  g.rotateZ(-Math.PI / 2);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
  return m;
}
const sphereArc = (R, x0, x1, n = 40) => { const out = []; for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n); out.push([x, Math.sqrt(Math.max(0, R * R - (x - G) ** 2))]); } return out; };
const dirOf = (aNasal, bUp) => new THREE.Vector3(Math.cos(aNasal) * Math.cos(bUp), Math.sin(bUp), -Math.sin(aNasal) * Math.cos(bUp));
const onGlobe = (r, aNasal, bUp) => dirOf(aNasal, bUp).multiplyScalar(r).add(new THREE.Vector3(G, 0, 0));
// A point on a sphere of radius r about the globe centre: beta from the front pole, psi around the
// axis (0 = temporal +z, 90° = up, 180° = nasal, −90° = down).
const polar = (r, betaDeg, psiDeg) => { const b = (betaDeg * Math.PI) / 180, p = (psiDeg * Math.PI) / 180; return new THREE.Vector3(G - r * Math.cos(b), r * Math.sin(b) * Math.sin(p), r * Math.sin(b) * Math.cos(p)); };

// A flat strap (a muscle or tendon) along points, lying on the surface whose outward normal is
// given at each point. widths per point, colours per point.
export function band(points, normals, widths, thick, colors, mat) {
  const pos = [], col = [], idx = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p = points[i], a = points[Math.max(0, i - 1)], b = points[Math.min(n - 1, i + 1)];
    const t = b.clone().sub(a).normalize();
    const nn = normals[i].clone().sub(t.clone().multiplyScalar(normals[i].dot(t))).normalize();
    const s = new THREE.Vector3().crossVectors(t, nn).normalize().multiplyScalar(widths[i] / 2);
    const h = nn.clone().multiplyScalar(thick / 2);
    for (const [ks, kh] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
      const v = p.clone().addScaledVector(s, ks).addScaledVector(h, kh);
      pos.push(v.x, v.y, v.z); col.push(...colors[i]);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let f = 0; f < 4; f++) {
    const a = i * 4 + f, b = i * 4 + ((f + 1) % 4), c = a + 4, d = b + 4;
    idx.push(a, c, b, b, c, d);
  }
  idx.push(0, 1, 2, 0, 2, 3); const L = (n - 1) * 4; idx.push(L, L + 2, L + 1, L, L + 3, L + 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true;
  return m;
}

// Thick screen-space lines for light rays (per-vertex colours).
export class Rays {
  constructor(stage, parent, { width = 2.2, opacity = 0.95 } = {}) {
    this.mat = stage.lineMaterial({ linewidth: width, vertexColors: true, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    this.group = new THREE.Group(); parent.add(this.group); this.obj = null;
  }
  set(pos, col) {
    if (this.obj) { this.group.remove(this.obj); this.obj.geometry.dispose(); this.obj = null; }
    if (!pos.length) return;
    const g = new LineSegmentsGeometry(); g.setPositions(pos); g.setColors(col);
    this.obj = new LineSegments2(g, this.mat); this.obj.frustumCulled = false;
    this.group.add(this.obj);
  }
  // polylines: [{ pts: [[x,y]...], col: [r,g,b], dash?: bool }], z: plane
  lines(polys, z = 0) {
    const pos = [], col = [];
    for (const p of polys) for (let i = 1; i < p.pts.length; i++) {
      const [x0, y0] = p.pts[i - 1], [x1, y1] = p.pts[i];
      const z0 = p.pts[i - 1][2] ?? z, z1 = p.pts[i][2] ?? z;
      if (p.dash) { const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 0.8)); for (let k = 0; k < n; k += 2) { const a = k / n, b = Math.min(1, (k + 1) / n); pos.push(lerp(x0, x1, a), lerp(y0, y1, a), lerp(z0, z1, a), lerp(x0, x1, b), lerp(y0, y1, b), lerp(z0, z1, b)); col.push(...p.col, ...p.col); } continue; }
      pos.push(x0, y0, z0, x1, y1, z1); col.push(...(p.c0 || p.col), ...p.col);
    }
    this.set(pos, col);
  }
}

// Photons travelling along polylines, spaced evenly in time.
export function photons(parent, count = 90, color = 0xfff1b0, size = 0.28) {
  const m = new THREE.InstancedMesh(new THREE.SphereGeometry(size, 8, 6), M.glow(color), count);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; parent.add(m);
  const o = new THREE.Object3D();
  let paths = [];
  m.setPaths = (polys) => {
    paths = polys.map((p) => { const L = [0]; for (let i = 1; i < p.pts.length; i++) L.push(L[i - 1] + Math.hypot(p.pts[i][0] - p.pts[i - 1][0], p.pts[i][1] - p.pts[i - 1][1])); return { pts: p.pts, L, total: L[L.length - 1], z: p.z ?? 0 }; });
  };
  m.tick = (time, speed = 14) => {
    let i = 0;
    if (paths.length) {
      const per = Math.floor(count / paths.length);
      paths.forEach((p, pi) => {
        for (let k = 0; k < per; k++) {
          const d = ((time * speed + (k / per) * p.total + pi * 1.7) % p.total);
          let s = 1; while (s < p.L.length - 1 && p.L[s] < d) s++;
          const a = p.pts[s - 1], b = p.pts[s], f = (d - p.L[s - 1]) / Math.max(1e-6, p.L[s] - p.L[s - 1]);
          o.position.set(lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2] ?? p.z, b[2] ?? p.z, f)); o.scale.setScalar(1); o.updateMatrix(); m.setMatrixAt(i++, o.matrix);
        }
      });
    }
    o.scale.setScalar(0); o.updateMatrix();
    for (; i < count; i++) m.setMatrixAt(i, o.matrix);
    m.instanceMatrix.needsUpdate = true;
  };
  return m;
}

// A flat board with a live canvas chart.
export function board(parent, w, h, px, draw) {
  const c = document.createElement('canvas'); c.width = px; c.height = Math.round((px * h) / w);
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  parent.add(mesh);
  const redraw = (...a) => { draw(g, c.width, c.height, ...a); tex.needsUpdate = true; };
  return { mesh, redraw, canvas: c };
}
export const boardBg = (g, w, h, title) => {
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(10,12,18,.92)'; g.beginPath(); g.roundRect(0, 0, w, h, 22); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2; g.stroke();
  if (title) { g.fillStyle = '#e8eef8'; g.font = 'bold 30px sans-serif'; g.fillText(title, 28, 46); }
};

// Label colours.
const TINT = { light: '#ffe08a', blue: '#8fb0ff', red: '#ff8a94', green: '#7ef0b0', side: '#8ef0ff', gold: '#ffd166', pink: '#ff9ec0' };
export function tint(l, cls) { const c = TINT[cls]; if (c) { l.element.style.borderColor = c; l.element.style.color = c; } return l; }

// On phones the readout covers the model, so keep its headline and two rows (as HeartClear does).
export function compactReadout(stage, api) {
  const full = api.readout; if (!full) return api;
  api.readout = (s) => {
    const html = full(s);
    if (stage.host.clientWidth >= 560 || !html) return html;
    let rows = 0;
    return html.replace(/<small>[\s\S]*?<\/small>/g, '').replace(/<div class="row">[\s\S]*?<\/div>/g, (m) => (++rows <= 2 ? m : ''));
  };
  return api;
}
export function fitNarrow(stage, view) {
  let done = false;
  return () => {
    const narrow = stage.host.clientWidth < 560;
    if (narrow && !done && !stage.moved && !document.body.classList.contains('gb-reel')) { stage.setView(view.pos, view.target, 0.01); done = true; }
    return narrow;
  };
}

// An iris texture: brown with radial fibres and a darker collarette (most people in India and the
// world have brown irises).
function irisTexture(color = [104, 62, 34]) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  const [r, gg, b] = color;
  const grd = g.createRadialGradient(256, 256, 40, 256, 256, 256);
  grd.addColorStop(0, `rgb(${r * 0.5},${gg * 0.5},${b * 0.5})`); grd.addColorStop(0.45, `rgb(${r},${gg},${b})`); grd.addColorStop(0.9, `rgb(${r * 0.75},${gg * 0.72},${b * 0.7})`); grd.addColorStop(1, `rgb(${r * 0.4},${gg * 0.4},${b * 0.4})`);
  g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 700; i++) {
    const a = rnd() * Math.PI * 2, r0 = 60 + rnd() * 60, r1 = 150 + rnd() * 100;
    g.strokeStyle = rnd() < 0.5 ? `rgba(255,220,170,${0.05 + rnd() * 0.12})` : `rgba(30,15,5,${0.08 + rnd() * 0.15})`;
    g.lineWidth = 1 + rnd() * 2; g.beginPath(); g.moveTo(256 + Math.cos(a) * r0, 256 + Math.sin(a) * r0);
    const w = (rnd() - 0.5) * 0.12; g.quadraticCurveTo(256 + Math.cos(a + w) * (r0 + r1) / 2, 256 + Math.sin(a + w) * (r0 + r1) / 2, 256 + Math.cos(a) * r1, 256 + Math.sin(a) * r1); g.stroke();
  }
  g.strokeStyle = 'rgba(40,20,8,.55)'; g.lineWidth = 6; g.beginPath(); g.arc(256, 256, 120, 0, 7); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------------------------------------------------------- the eye
// opts: { muscles, lids, labels, cut: wedge width (rad), cutAt: wedge centre (rad), vessels }
export function makeEye(stage, opts = {}) {
  const o = { muscles: true, lids: true, labels: true, cut: 1.9, cutAt: -0.35, vessels: true, ...opts };
  const root = new THREE.Group(); root.scale.setScalar(SCALE);
  const mm = new THREE.Group(); mm.position.x = -12.1; root.add(mm);
  const phiA = o.cutAt + o.cut / 2, phiL = Math.PI * 2 - o.cut, phiW = o.cutAt - o.cut / 2;
  const parts = {};
  const labels = [];
  const lab = (html, pos, parent, cls, when = 'in') => { const l = tint(stage.label(html, pos, parent), cls); l.userData.when = when; labels.push(l); return l; };

  // Each wall layer is a main (cut-away) mesh plus a "wedge" mesh that fades out in X-ray mode.
  const wedges = [];
  const shell = (profile, mat, parent) => {
    const main = latheMM(profile, mat, phiA, phiL);
    const wm = mat.clone(); wm.transparent = true;
    const wedge = latheMM(profile, wm, phiW, o.cut);
    parent.add(main, wedge); wedges.push(wedge);
    return main;
  };

  // ---- the wall: sclera (outside), choroid, retina (inside)
  const sclG = new THREE.Group(), chG = new THREE.Group(), retG = new THREE.Group(); mm.add(sclG, chG, retG);
  const scleraMat = new THREE.MeshPhysicalMaterial({ color: 0xf3eee4, roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.4, side: THREE.DoubleSide });
  const scleraProfile = [[LIMBUS.x - 0.05, LIMBUS.r], ...sphereArc(GLOBE.rSclera, 2.8, G + GLOBE.rSclera, 48)];
  parts.sclera = shell(scleraProfile, scleraMat, sclG);
  const choroidMat = new THREE.MeshStandardMaterial({ color: 0x6e2a22, roughness: 0.7, side: THREE.DoubleSide });
  parts.choroid = shell(sphereArc(GLOBE.rChoroid, 8.2, G + GLOBE.rChoroid, 40), choroidMat, chG);
  const retinaMat = new THREE.MeshStandardMaterial({ color: 0xd9704f, roughness: 0.6, side: THREE.DoubleSide });
  parts.retina = shell(sphereArc(GLOBE.rRetina, 9.2, G + GLOBE.rRetina, 40), retinaMat, retG);
  // ciliary body: a ring of muscle behind the iris, where the choroid meets the iris root. Its
  // inner edge (the ciliary processes) holds the zonules; it moves inward when the muscle contracts.
  const cilG = new THREE.Group(); mm.add(cilG);
  const cilMat = new THREE.MeshStandardMaterial({ color: 0x8a3a30, roughness: 0.65, side: THREE.DoubleSide });
  let cil = null, cilIn = 5.65;
  const cilProfile = (d) => {
    const inner = [[3.35, 6.3], [4.0, 5.65 - d], [5.2, 5.75 - d * 0.9], [6.6, 7.5 - d * 0.5], [8.6, 10.2]];
    const outer = []; for (let x = 8.6; x >= 3.35; x -= 0.35) outer.push([x, Math.sqrt(GLOBE.rSclera ** 2 - (x - G) ** 2) - 0.45]);
    return [...inner, ...outer, [3.35, 6.3]];
  };
  const setCiliary = (d) => {
    if (cil) { cilG.remove(cil); cil.geometry.dispose(); }
    cil = latheMM(cilProfile(d), cilMat, phiA, phiL, 64); cilG.add(cil); parts.ciliary = cil; cilIn = 5.65 - d;
  };

  // ---- macula, fovea, optic disc, retinal vessels (inside the retina)
  const cap = (r, theta, color, dir) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 8, 0, Math.PI * 2, 0, theta), new THREE.MeshStandardMaterial({ color, roughness: 0.6, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.position.set(G, 0, 0); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); retG.add(m); return m;
  };
  const back = new THREE.Vector3(1, 0, 0);
  parts.macula = cap(GLOBE.rRetina - 0.03, 0.25, 0xa8612c, back);
  parts.fovea = cap(GLOBE.rRetina - 0.06, 0.075, 0x5a2410, back);
  const discDir = dirOf(0.41, 0.03);
  parts.disc = cap(GLOBE.rRetina - 0.05, 0.085, 0xf4d9a8, discDir);
  parts.cup = cap(GLOBE.rRetina - 0.08, 0.085 * 0.3, 0xfff6e6, discDir);
  const vessels = new THREE.Group(); retG.add(vessels);
  if (o.vessels) {
    const R = GLOBE.rRetina - 0.12;
    const arc = (pts, r, col) => vessels.add(tube(pts.map(([a, b]) => onGlobe(R, a, b)), r, M.matte(col), false, 60));
    for (const s of [1, -1]) {
      arc([[0.41, 0.03], [0.37, 0.18 * s], [0.24, 0.29 * s], [0.04, 0.33 * s], [-0.2, 0.31 * s], [-0.45, 0.26 * s], [-0.7, 0.2 * s]], 0.11, 0x6a0f14);
      arc([[0.41, 0.02], [0.4, 0.15 * s], [0.28, 0.25 * s], [0.08, 0.28 * s], [-0.16, 0.27 * s], [-0.42, 0.22 * s], [-0.66, 0.16 * s]], 0.075, 0xc4262e);
      arc([[0.41, 0.03], [0.53, 0.18 * s], [0.72, 0.32 * s], [0.92, 0.42 * s]], 0.09, 0x6a0f14);
      arc([[0.41, 0.03], [0.5, 0.12 * s], [0.68, 0.24 * s], [0.9, 0.3 * s]], 0.065, 0xc4262e);
    }
  }
  // diabetic retinopathy marks (hidden until used): small bleeds and yellow exudates near the macula
  const dr = new THREE.Group(); retG.add(dr);
  { let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 46; i++) {
      const a = (rnd() - 0.5) * 0.9, b = (rnd() - 0.5) * 0.8, ex = i % 3 === 0;
      const m = new THREE.Mesh(new THREE.CircleGeometry(ex ? 0.22 : 0.3 + rnd() * 0.25, 10), M.matte(ex ? 0xf5d56a : 0x7a0a10, { side: THREE.DoubleSide }));
      m.position.copy(onGlobe(GLOBE.rRetina - 0.15, a, b)); m.lookAt(G, 0, 0); m.userData.t = rnd(); dr.add(m);
    }
    dr.visible = false; }

  // ---- vitreous (a clear gel filling the back of the eye)
  const vitG = new THREE.Group(); mm.add(vitG);
  const vitMat = M.ghost(0xbfe6ff, 0.06); vitMat.side = THREE.BackSide;
  vitG.add(latheMM([[7.7, 0], [7.9, 3.2], [8.5, 4.6], ...sphereArc(GLOBE.rRetina - 0.15, 9.5, G + GLOBE.rRetina - 0.15, 30)], vitMat, phiA, phiL));

  // ---- cornea and aqueous humour
  const corG = new THREE.Group(), aqG = new THREE.Group(); mm.add(corG, aqG);
  const corneaProfile = [];
  for (let i = 0; i <= 24; i++) { const r = (LIMBUS.r * i) / 24; corneaProfile.push([7.8 - Math.sqrt(7.8 * 7.8 - r * r), r]); }
  corneaProfile.push([3.0, 5.9]);
  for (let i = 24; i >= 0; i--) { const r = (5.5 * i) / 24; corneaProfile.push([0.55 + 6.5 - Math.sqrt(6.5 * 6.5 - r * r), r]); }
  const corneaMat = new THREE.MeshPhysicalMaterial({ color: 0xd8f1ff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
  parts.cornea = latheMM(corneaProfile, corneaMat); parts.cornea.castShadow = false; corG.add(parts.cornea);
  const aqMat = M.ghost(0x9fd8ff, 0.08);
  const aqProfile = [[0.6, 0]]; for (let i = 1; i <= 12; i++) { const r = (5.4 * i) / 12; aqProfile.push([0.6 + 6.5 - Math.sqrt(6.5 * 6.5 - r * r), r]); } aqProfile.push([3.4, 5.5], [3.45, 2.5], [3.5, 0]);
  aqG.add(latheMM(aqProfile, aqMat, phiA, phiL, 48));

  // ---- iris and pupil
  const irisG = new THREE.Group(); mm.add(irisG);
  const irisMat = new THREE.MeshStandardMaterial({ map: irisTexture(), roughness: 0.75, side: THREE.DoubleSide });
  let iris = null, pupilR = -1;
  const setPupil = (r) => {
    r = clamp(r, 0.8, 4.2); if (Math.abs(r - pupilR) < 0.02) return; pupilR = r;
    if (iris) { irisG.remove(iris); iris.geometry.dispose(); }
    const g = new THREE.RingGeometry(r, 6.0, 72, 1);
    const uv = g.attributes.uv, p = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 + p.getX(i) / 12, 0.5 + p.getY(i) / 12);
    iris = new THREE.Mesh(g, irisMat); iris.rotation.y = -Math.PI / 2; iris.castShadow = true; irisG.add(iris);
  };
  setPupil(2.0);

  // ---- lens, zonules, IOL
  const lensG = new THREE.Group(); mm.add(lensG);
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0xeaf7ff, roughness: 0.12, clearcoat: 0.8, transparent: true, opacity: 0.5, depthWrite: false, emissive: 0x000000 });
  let lens = null, curK = -1, lensEq = { x: 5.4, r: 4.75 };
  const lensProfile = (k) => {
    const L = lensShape(k), R3 = 1 / L.c3, R4 = -1 / L.c4;
    const pts = [];
    let eq = { x: L.front, r: 0 };
    for (let i = 0; i <= 60; i++) {
      const t = i / 60, x = L.front + (L.back - L.front) * (0.5 - 0.5 * Math.cos(Math.PI * t));
      const ra = R3 * R3 - (L.front + R3 - x) ** 2, rp = R4 * R4 - (x - (L.back - R4)) ** 2;
      const r = Math.min(ra > 0 ? Math.sqrt(ra) : 0, rp > 0 ? Math.sqrt(rp) : 0, L.equator);
      if (r > eq.r) eq = { x, r };
      pts.push([x, i === 0 || i === 60 ? 0 : r]);
    }
    return { pts, eq, L };
  };
  const setAccom = (k) => {
    if (Math.abs(k - curK) < 0.004) return; curK = k;
    const { pts, eq, L } = lensProfile(k);
    if (lens) { lensG.remove(lens); lens.geometry.dispose(); }
    lens = latheMM(pts, lensMat, 0, Math.PI * 2, 56); lens.castShadow = false; lensG.add(lens);
    lensEq = eq;
    irisG.position.x = Math.min(3.45, L.front - 0.12);
    // Helmholtz: the ciliary muscle contracts, its ring gets smaller, the zonules go slack and the
    // elastic lens rounds up. Relaxed, the ring is wide and the zonules pull the lens flat.
    setCiliary(0.75 * clamp(k / 2, 0, 1));
    buildZonules(k);
  };
  const zonMat = new THREE.LineBasicMaterial({ color: 0xfff4d8, transparent: true, opacity: 0.75 });
  const zon = new THREE.LineSegments(new THREE.BufferGeometry(), zonMat); lensG.parent.add(zon);
  function buildZonules(k) {
    const rIn = cilIn + 0.05, slack = clamp(k / 1.2, 0, 1);
    const pts = [];
    const lx = lensG.position.x, cx = cilG.position.x;
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      for (const f of [-0.9, 0, 0.9]) {
        const x0 = lensEq.x + f + lx, r0 = Math.max(0.5, lensEq.r - Math.abs(f) * 0.35);
        const x1 = cx + 4.4 + 0.5 * f, r1 = rIn + Math.abs(f) * 0.1;
        const xm = (x0 + x1) / 2 + slack * 0.25, rm = (r0 + r1) / 2 - slack * 0.25;
        const P = (x, r) => [x, r * Math.sin(a), r * Math.cos(a)];
        pts.push(...P(x0, r0), ...P(xm, rm), ...P(xm, rm), ...P(x1, r1));
      }
    }
    zon.geometry.dispose(); zon.geometry = new THREE.BufferGeometry(); zon.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    zonMat.opacity = lerp(0.8, 0.35, slack);
  }
  setAccom(0);
  // An intraocular lens (IOL) for cataract surgery: a thin acrylic optic about 6 mm wide with two
  // springy C-shaped arms (haptics), placed in the lens's own capsule.
  const iol = new THREE.Group(); iol.visible = false; mm.add(iol);
  { const optic = latheMM([[4.9, 0], [5.0, 1.8], [5.25, 2.9], [5.6, 3.0], [5.95, 2.9], [6.2, 1.8], [6.3, 0]], new THREE.MeshPhysicalMaterial({ color: 0xe8fbff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.55 }), 0, Math.PI * 2, 40);
    iol.add(optic);
    for (const a0 of [0, Math.PI]) { const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20, a = a0 + 0.2 + t * 2.0, r = 2.9 + 2.3 * Math.sin((t * Math.PI) / 2); pts.push(new THREE.Vector3(5.6, r * Math.sin(a), r * Math.cos(a))); } iol.add(tube(pts, 0.14, M.plastic(0x7fd3ff), false, 40)); } }

  // ---- optic nerve
  const APEX = new THREE.Vector3(38, 0, -5.5);
  const nerveG = new THREE.Group(); mm.add(nerveG);
  { const d0 = discDir.clone(), p0 = d0.clone().multiplyScalar(GLOBE.rRetina).add(new THREE.Vector3(G, 0, 0));
    const p1 = d0.clone().multiplyScalar(GLOBE.rSclera + 2).add(new THREE.Vector3(G, 0, 0));
    const pts = [p0, p1, p1.clone().add(new THREE.Vector3(5, 0, -1.6)), new THREE.Vector3(32, 0, -5.2), APEX];
    parts.nerve = tube(pts, 1.75, new THREE.MeshPhysicalMaterial({ color: 0xf0dfbd, roughness: 0.5, clearcoat: 0.3 }), false, 60);
    nerveG.add(parts.nerve); }

  // ---- extraocular muscles
  const musG = new THREE.Group(); mm.add(musG);
  const musMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, transparent: true, opacity: 1 });
  const troMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc4, roughness: 0.7, transparent: true, opacity: 1 });
  const RED = [0.36, 0.045, 0.04], TEN = [0.78, 0.74, 0.66];   // linear colours: muscle red, tendon white
  const muscles = [];
  const rectus = (name, psi, insert, labelPos) => {
    const Rm = GLOBE.rSclera + 0.6, bI = 29.2 + (insert / GLOBE.rSclera) * 57.3;
    const pts = [], nrm = [], wid = [], col = [];
    for (let b = bI; b <= 112; b += 4) { const p = polar(Rm, b, psi); pts.push(p); nrm.push(p.clone().sub(new THREE.Vector3(G, 0, 0)).normalize()); const t = (b - bI) / (112 - bI); wid.push(8.5 - 1 * t); col.push(t < 0.12 ? TEN : RED); }
    const last = pts[pts.length - 1], dp = new THREE.Vector3(0, Math.sin((psi * Math.PI) / 180), Math.cos((psi * Math.PI) / 180));
    const end = APEX.clone().addScaledVector(dp, 2.6);
    for (let i = 1; i <= 8; i++) { const t = i / 8; const p = last.clone().lerp(end, t); pts.push(p); nrm.push(nrm[nrm.length - 1].clone()); wid.push(lerp(8.5, 2.5, t)); col.push(t > 0.9 ? TEN : RED); }
    const m = band(pts, nrm, wid, 1.6, col, musMat); musG.add(m);
    const dir = dp.clone().multiplyScalar(0.6).add(new THREE.Vector3(0.3, 0, 0));
    muscles.push({ m, dir }); if (labelPos) lab(name, labelPos, musG, 'red', 'out');
    return m;
  };
  rectus('Superior rectus', 90, 7.7, [20, 13.5, 1]);
  rectus('Inferior rectus', -90, 6.5, [20, -13.5, 1]);
  rectus('Lateral rectus', 0, 6.9, [24, 1.5, 11.5]);
  rectus('Medial rectus', 180, 5.5, null);
  // superior oblique: belly from the back of the orbit forward to the trochlea, tendon back to the globe
  { const T = new THREE.Vector3(1.5, 11.5, -11.5);
    const bellyPts = [], bn = [], bw = [], bc = [];
    const O = APEX.clone().add(new THREE.Vector3(-1, 4, -3));
    for (let i = 0; i <= 10; i++) { const t = i / 10; const p = O.clone().lerp(T, t); p.y += Math.sin(t * Math.PI) * 2.5; p.z -= Math.sin(t * Math.PI) * 1.5; bellyPts.push(p); bn.push(new THREE.Vector3(0, 0.7, -0.7).normalize()); bw.push(t > 0.8 ? 2 : lerp(3, 5, Math.sin(t * Math.PI))); bc.push(t > 0.75 ? TEN : RED); }
    musG.add(band(bellyPts, bn, bw, 1.4, bc, musMat));
    const Rm = GLOBE.rSclera + 0.9;
    const tp = [T, polar(Rm + 1.4, 58, 118), polar(Rm, 75, 100), polar(Rm, 88, 78), polar(Rm, 100, 55)];
    const tn = tp.map((p) => p.clone().sub(new THREE.Vector3(G, 0, 0)).normalize());
    musG.add(band(tp, tn, [2, 3, 5, 7, 9], 0.9, tp.map(() => TEN), musMat));
    const tro = torus(1.3, 0.35, troMat, 24); tro.position.copy(T); tro.lookAt(T.clone().add(new THREE.Vector3(1, 0, 1))); musG.add(tro);
    lab('Superior oblique', [6, 16.5, -6], musG, 'red', 'out');
    lab('Trochlea (pulley)', [-2, 14.5, -12], musG, '', 'none');
    muscles.push({ m: musG.children[musG.children.length - 3], dir: new THREE.Vector3(0.2, 0.6, -0.4) }, { m: musG.children[musG.children.length - 2], dir: new THREE.Vector3(0.1, 0.6, -0.2) }, { m: tro, dir: new THREE.Vector3(0.1, 0.6, -0.4) }); }
  // inferior oblique: from the front of the orbit floor (nasal), under the eye, to the back (temporal)
  { const Rm = GLOBE.rSclera + 1.0;
    const pts = [new THREE.Vector3(1.5, -12.5, -10.5), polar(Rm + 2.2, 62, -128), polar(Rm + 1.2, 80, -100), polar(Rm + 0.3, 95, -65), polar(Rm, 108, -35), polar(Rm, 116, -12)];
    const n = pts.map((p) => p.clone().sub(new THREE.Vector3(G, 0, 0)).normalize());
    const m = band(pts, n, [3, 6, 8, 9, 9, 8], 1.4, pts.map((_, i) => (i === 0 || i === 5 ? TEN : RED)), musMat); musG.add(m);
    muscles.push({ m, dir: new THREE.Vector3(0.2, -0.6, 0.1) });
    lab('Inferior oblique', [8, -15.5, 6], musG, 'red', 'out'); }
  musG.visible = o.muscles;

  // ---- eyelids (skin over a spherical cap in front of the eye)
  const lidG = new THREE.Group(); mm.add(lidG);
  const lidMat = new THREE.MeshStandardMaterial({ color: 0xc08766, roughness: 0.7, transparent: true, opacity: 1, side: THREE.DoubleSide });
  const LR = 13.8, LC = 12.6;
  let lidU = null, lidL = null, lidRims = [], lidKey = '';
  const setLids = (yU, yL) => {
    const key = yU.toFixed(2) + yL.toFixed(2); if (key === lidKey) return; lidKey = key;
    [lidU, lidL, ...lidRims].forEach((m) => { if (m) { lidG.remove(m); m.geometry.dispose(); } });
    const tU = Math.acos(clamp(yU / LR, -1, 1)), tL = Math.acos(clamp(yL / LR, -1, 1));
    const mk = (t0, t1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(LR, 40, 12, -1.0, 2.0, t0, t1 - t0), lidMat); m.position.x = LC; m.castShadow = true; lidG.add(m); return m; };
    lidU = mk(1.0, tU); lidL = mk(tL, Math.PI - 1.15);
    lidRims = [tU, tL].map((t) => { const pts = []; for (let i = 0; i <= 30; i++) { const p = -1.0 + (2.0 * i) / 30; pts.push(new THREE.Vector3(LC - LR * Math.cos(p) * Math.sin(t), LR * Math.cos(t), LR * Math.sin(p) * Math.sin(t))); } const m = tube(pts, 0.6, lidMat, false, 40); lidG.add(m); return m; });
  };
  setLids(4.5, -5.5);
  lidG.visible = o.lids;

  // ---- labels
  if (o.labels) {
    lab('Cornea', [-1.5, 7.5, 3], corG, 'light', 'both');
    lab('Aqueous humour', [1.6, -2.4, 2.5], aqG, 'blue', 'ex');
    lab('Iris', [3.4, 7.2, 0], irisG, 'pink', 'in');
    lab('Pupil', [3.4, 0, 1.2], irisG, '', 'ex');
    lab('Lens', [5.6, -3.2, 1.5], lensG, 'light', 'in');
    lab('Zonules', [5.5, 5.8, 1], lensG, '', 'ex');
    lab('Ciliary muscle', [5.5, -9.0, 1.5], cilG, 'red', 'in');
    lab('Vitreous humour', [15, -4.5, 0], vitG, 'blue', 'in');
    lab('Retina', [16, -10.4, 1.5], retG, 'gold', 'in');
    lab('Choroid', [21, -8.8, 1.8], chG, 'red', 'in');
    lab('Sclera', [10, -12.6, 2.5], sclG, '', 'both');
    lab('Macula and fovea', [24, 4.6, 0], retG, 'gold', 'in');
    lab('Optic disc: the blind spot', [20.5, -2.2, -5.4], retG, 'gold', 'in');
    lab('Optic nerve', [33, 3.4, -4.6], nerveG, 'gold', 'both');
    lab('Upper eyelid', [-3, 9, 2], lidG, '', 'out');
  }

  // ---- explode
  const expl = [
    [corG, [-14, 0, 0]], [aqG, [-10, 0, 0]], [irisG, [-6.5, 0, 0]], [lensG, [-3, 0, 0]], [vitG, [3, 0, 0]],
    [retG, [6, 0, 0]], [chG, [10, 0, 0]], [cilG, [1.5, 0, 0]], [sclG, [14, 0, 0]], [nerveG, [17, 0, 0]], [lidG, [-17, 0, 0]],
  ];
  expl.forEach(([g]) => { g.userData.home = g.position.clone(); });
  muscles.forEach((mu) => { mu.m.userData.home = mu.m.position.clone(); });

  // ---- state
  const st = { xray: 1, explode: -1, labels: true, narrow: false };
  const setXray = (k) => {
    st.xray = k;
    wedges.forEach((w) => { w.material.opacity = 1 - k; w.visible = k < 0.98; w.material.depthWrite = k < 0.5; });
    lidMat.opacity = lerp(1, 0.14, k); lidMat.depthWrite = k < 0.5;
    musMat.opacity = lerp(1, 0.16, k); musMat.depthWrite = k < 0.5; troMat.opacity = musMat.opacity; troMat.depthWrite = k < 0.5;
    updLabels();
  };
  const setExplode = (k) => {
    if (Math.abs(k - st.explode) < 1e-4) return; st.explode = k;
    const e = k * k * (3 - 2 * k);
    expl.forEach(([g, off]) => g.position.copy(g.userData.home).add(new THREE.Vector3(...off).multiplyScalar(e * 0.8)));
    lidG.position.y = 0;
    muscles.forEach((mu) => mu.m.position.copy(mu.m.userData.home).addScaledVector(mu.dir, 13 * e));
    iol.position.x = lensG.position.x;
    buildZonulesNow(); updLabels();
  };
  const buildZonulesNow = () => { const k = curK; curK = -1; setAccom(k); };
  function updLabels() {
    labels.forEach((l) => {
      const w = l.userData.when, inside = st.xray > 0.5;
      let on = st.labels && (w === 'both' || (w === 'in' && inside) || (w === 'ex' && inside && st.explode > 0.3) || (w === 'out' && !inside));
      if (st.narrow && !/Cornea|Lens|Retina|Optic disc|Iris|Superior rectus|Sclera/.test(l.element.textContent)) on = false;
      l.visible = on;
    });
  }
  const showLabels = (on, narrow = false) => { if (on === st.labels && narrow === st.narrow) return; st.labels = on; st.narrow = narrow; updLabels(); };

  setXray(1); setExplode(0);
  return {
    root, mm, parts, lensMat, iol, dr, lensG, irisG, cilG, retG, sclG, musG, lidG, nerveG, vitG, labels,
    get lensEq() { return lensEq; },
    setXray, setExplode, setAccom, setPupil, setLids, showLabels,
    // Stretch the back of the eye for a longer (short-sighted) or shorter (long-sighted) eye.
    setAxial(L) { const s = L / AXIAL; [sclG, chG, retG, vitG].forEach((g) => { g.scale.x = s; }); nerveG.position.x = (s - 1) * 24; musG.scale.x = lerp(1, s, 0.6); },
    setCup(ratio) { parts.cup.geometry.dispose(); parts.cup.geometry = new THREE.SphereGeometry(GLOBE.rRetina - 0.08, 32, 8, 0, Math.PI * 2, 0, 0.085 * clamp(ratio, 0.05, 0.95)); },
  };
}

// Map a ray path in mm (optics frame) into the eye's mm group: identical (x from the cornea).
export const W = (eye, x, y, z = 0) => eye.mm.localToWorld(new THREE.Vector3(x, y, z));

// ---------------------------------------------------------------- ray rig
// Light from an object (left) through a half-cut eye: exact rays in the section plane (z = 0),
// dashed where they would have met if the retina were not in the way, the object as an arrow and
// its upside-down image on the retina.
export function rayRig(stage, eye, { photonsOn = true } = {}) {
  const rays = new Rays(stage, eye.mm, { width: 2.2 });
  const ph = photonsOn ? photons(eye.mm, 70, 0xfff1b0, 0.32) : null;
  const obj = new THREE.Group(); eye.mm.add(obj);
  const objMat = M.glow(0x7ef0b0);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 3, 12), objMat); shaft.position.y = 1.5;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 16), objMat); head.position.y = 3.6;
  obj.add(shaft, head); obj.position.set(-24, 0, 0);
  const img = new THREE.Group(); eye.mm.add(img);
  const imgShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1, 10), objMat), imgHead = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.9, 12), objMat);
  img.add(imgShaft, imgHead);
  const YEL = [1, 0.85, 0.42], ORA = [0.49, 0.94, 0.69];
  return {
    rays, ph, obj, img,
    // o: { k, objDist (mm), L, spec (D or null), astigD, pupil (mm radius), tip (bool), field (deg) }
    draw(o) {
      const opts = { k: o.k, L: o.L, spec: o.spec, astigD: o.astigD || 0, startX: -21, objDist: o.objDist };
      const axis = fan(7, o.pupil, opts);
      const xf = imageX(o.k, o.objDist, o.spec, o.astigD || 0);
      const polys = [];
      axis.forEach((r) => {
        polys.push({ pts: r.pts, col: YEL });
        if (r.hit && xf > o.L + 0.05 && isFinite(xf) && xf < o.L + 12) {
          const t = (xf - r.hit[0]) / r.dir[0];
          polys.push({ pts: [r.hit, [r.hit[0] + r.dir[0] * t, r.hit[1] + r.dir[1] * t]], col: [0.7, 0.6, 0.35], dash: true });
        }
      });
      let tipHit = null;
      if (o.tip) {
        const f = o.field ?? 9;
        const tips = fan(5, o.pupil * 0.8, { ...opts, fieldDeg: f });
        tips.forEach((r) => { polys.push({ pts: r.pts, col: ORA }); });
        const mid = tips[2]; tipHit = mid.hit;
      }
      rays.lines(polys, 0.06);
      ph?.setPaths(axis.map((r) => ({ pts: r.pts, z: 0.06 })));
      // the image: from the axis point on the retina down to where the tip rays land
      img.visible = !!(o.tip && tipHit);
      if (img.visible) {
        const x0 = o.L - 0.25, y1 = tipHit[1];
        const len = Math.abs(y1);
        imgShaft.scale.y = Math.max(0.1, len - 0.9); imgShaft.position.set(0, -(len - 0.9) / 2, 0);
        imgHead.position.set(0, -len + 0.45, 0); imgHead.rotation.z = Math.PI;
        img.position.set(x0, 0, 0.1);
      }
      obj.visible = !!o.tip;
      return { xf, tipHit };
    },
    tick(time) { ph?.tick(time, 16); },
  };
}
