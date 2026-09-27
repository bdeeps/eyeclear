// Chapter 5: colour vision. Three kinds of cone, S, M and L, with pigment peaks near 420, 530 and
// 560 nm (Bowmaker & Dartnall 1980; Dartnall, Bowmaker & Mollon 1983). Their sensitivity curves
// use the Govardovskii (2000) pigment template (optics.js). A colour is just the pattern of the
// three responses, so a mix of red and green light can give exactly the same pattern as pure
// yellow light: a "metamer". That is why a screen needs only red, green and blue subpixels.
// Colour vision deficiency (NEI "Color Blindness"): about 1 in 12 men and 1 in 200 women of
// Northern European ancestry, mostly red–green, inherited on the X chromosome. Rates vary between
// populations; Indian studies report roughly 4–9% of males depending on the community (e.g.
// Shah et al., J Clin Diagn Res 2013 / PMC4645753; Natung et al., Iran J Public Health 2013 /
// PMC3595632). Simulation matrices: Machado, Oliveira & Fernandes 2009 (optics.js).
import { THREE, M } from '../kit.js';
import { board, boardBg, compactReadout, fitNarrow, tint } from '../eye.js';
import { pigment, coneSet, coneResponse, gauss, PRIMARIES, waveRGB, simulate, simulateImage, CONES } from '../optics.js';

const CVD_NAMES = { normal: 'Typical colour vision', protan: 'No L cones (protanopia)', deutan: 'No M cones (deuteranopia)', tritan: 'No S cones (tritanopia)' };
const spectrumOf = (s) => (s.mode === 'spectral' ? (l) => gauss(l, s.wl, 6) : (l) => s.r * gauss(l, PRIMARIES.R, 12) + s.g * gauss(l, PRIMARIES.G, 14) + s.b * gauss(l, PRIMARIES.B, 12));
const shownRGB = (s) => (s.mode === 'spectral' ? waveRGB(s.wl) : [s.r, s.g, s.b].map((v) => Math.round(255 * Math.pow(v, 1 / 1.4))));
function hueName([r, g, b]) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx < 30) return 'Black';
  if (mx - mn < 25) return mx > 200 ? 'White' : 'Grey';
  let h; const d = mx - mn;
  if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return h < 15 ? 'Red' : h < 40 ? 'Orange' : h < 68 ? 'Yellow' : h < 160 ? 'Green' : h < 195 ? 'Cyan' : h < 250 ? 'Blue' : h < 290 ? 'Violet' : h < 335 ? 'Magenta' : 'Red';
}
// The single wavelength whose L:M:S pattern is closest to this light's (for metamers).
function lookalike(r) {
  const n = r.S + r.M + r.L || 1, a = [r.S / n, r.M / n, r.L / n];
  let best = null, err = 1e9;
  for (let l = 400; l <= 700; l += 1) { const q = { S: pigment(CONES.S, l), M: pigment(CONES.M, l), L: pigment(CONES.L, l) }; const m = q.S + q.M + q.L; const e = Math.hypot(q.S / m - a[0], q.M / m - a[1], q.L / m - a[2]); if (e < err) { err = e; best = l; } }
  return { l: best, err };
}

// A little picture to test colour vision on: fruit, a traffic light and a dot plate hiding a number.
function paintScene(g, x, y, w, h) {
  g.fillStyle = '#efe7d8'; g.fillRect(x, y, w, h);
  const c = (cx, cy, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x + cx * w, y + cy * h, r * h, 0, 7); g.fill(); };
  g.fillStyle = '#7a4a2a'; g.beginPath(); g.ellipse(x + 0.28 * w, y + 0.78 * h, 0.24 * w, 0.1 * h, 0, 0, 7); g.fill();
  c(0.18, 0.6, 0.13, '#d8262e'); c(0.36, 0.6, 0.12, '#f08a1c'); c(0.27, 0.46, 0.1, '#58a832'); c(0.44, 0.47, 0.06, '#3b53b8'); c(0.14, 0.44, 0.07, '#e4c62a');
  g.fillStyle = '#2d7d2a'; g.beginPath(); g.ellipse(x + 0.2 * w, y + 0.34 * h, 0.05 * w, 0.02 * h, -0.6, 0, 7); g.fill();
  g.fillStyle = '#222'; g.fillRect(x + 0.52 * w, y + 0.1 * h, 0.08 * w, 0.62 * h);
  c(0.56, 0.2, 0.07, '#e0262b'); c(0.56, 0.41, 0.07, '#f2a81c'); c(0.56, 0.62, 0.07, '#27b04a');
  // dot plate: a "5" drawn in orange-red dots on olive-green dots of similar lightness
  const px = x + 0.82 * w, py = y + 0.5 * h, R = 0.36 * h;
  const mask = document.createElement('canvas'); mask.width = mask.height = 100; const mg = mask.getContext('2d');
  mg.fillStyle = '#000'; mg.font = 'bold 80px sans-serif'; mg.textAlign = 'center'; mg.fillText('5', 50, 80);
  const md = mg.getImageData(0, 0, 100, 100).data;
  let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 420; i++) {
    const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * R * 0.95, dx = Math.cos(a) * rr, dy = Math.sin(a) * rr;
    const u = Math.round(50 + (dx / R) * 50), v = Math.round(50 + (dy / R) * 50);
    const inDigit = md[(v * 100 + u) * 4 + 3] > 100;
    const pal = inDigit ? ['#d2682f', '#c9582d', '#dc7a3c', '#c86a3a'] : ['#8e9a3e', '#9aa24a', '#7f9444', '#a0a655'];
    g.fillStyle = pal[Math.floor(rnd() * 4)]; g.beginPath(); g.arc(px + dx, py + dy, R * (0.035 + rnd() * 0.035), 0, 7); g.fill();
  }
}

function drawColour(g, w, h, s, scene) {
  boardBg(g, w, h, 'Three cone types');
  const L = 60, R = 510, T = 70, B = h - 60;
  const X = (l) => L + ((l - 400) / 300) * (R - L), Y = (v) => B - v * (B - T - 10);
  // the spectrum along the bottom
  for (let l = 400; l < 700; l += 2) { const [r, gg, b] = waveRGB(l); g.fillStyle = `rgb(${r},${gg},${b})`; g.fillRect(X(l), B + 6, X(l + 2) - X(l) + 1, 14); }
  g.font = '19px sans-serif'; g.fillStyle = 'rgba(255,255,255,.55)'; for (let l = 400; l <= 700; l += 50) g.fillText(l, X(l) - 16, h - 12);
  g.fillText('nm', R - 10, h - 34);
  const set = coneSet('normal');
  const col = { S: '#6f8cff', M: '#5fe08a', L: '#ff6a5a' };
  for (const k of ['S', 'M', 'L']) {
    const gone = (s.cvd === 'protan' && k === 'L') || (s.cvd === 'deutan' && k === 'M') || (s.cvd === 'tritan' && k === 'S');
    g.strokeStyle = col[k]; g.globalAlpha = gone ? 0.2 : 1; g.lineWidth = 4; g.setLineDash(gone ? [8, 8] : []); g.beginPath();
    for (let l = 400; l <= 700; l += 2) { const v = pigment(set[k], l); l === 400 ? g.moveTo(X(l), Y(v)) : g.lineTo(X(l), Y(v)); }
    g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
    g.fillStyle = col[k]; g.font = 'bold 21px sans-serif'; g.fillText(`${k} ${set[k]}`, X(set[k]) - 30, Y(1) - 8);
  }
  // the light
  const drawLine = (l, a, c) => { g.strokeStyle = c; g.globalAlpha = 0.35 + 0.65 * a; g.lineWidth = 3 + 5 * a; g.beginPath(); g.moveTo(X(l), T); g.lineTo(X(l), B); g.stroke(); g.globalAlpha = 1; };
  if (s.mode === 'spectral') drawLine(s.wl, 1, '#ffffff');
  else { drawLine(PRIMARIES.R, s.r, '#ff5a4a'); drawLine(PRIMARIES.G, s.g, '#5fe08a'); drawLine(PRIMARIES.B, s.b, '#6f8cff'); }
  // what you see, and a picture seen through these cones
  const rgb = simulate(shownRGB(s), s.cvd);
  g.fillStyle = `rgb(${rgb.join(',')})`; g.beginPath(); g.roundRect(540, 80, 130, 130, 14); g.fill();
  g.fillStyle = 'rgba(232,238,248,.85)'; g.font = 'bold 22px sans-serif'; g.fillText('You see', 546, 240);
  g.drawImage(scene, 690, 70, 290, 203);
  g.fillText('Seen with these cones', 694, 305);
}

export default {
  id: 'colour',
  short: 'Colour',
  title: 'How we see colour',
  subtitle: 'Three kinds of cone, one brain doing the sums.',
  view: { pos: [-0.6, 6.6, 16.5], target: [-0.6, 5.7, 0] },
  learn: `<p>You have three kinds of cone. Each holds a slightly different pigment, so each catches some wavelengths better than others: <b>S</b> cones peak in the violet-blue (about <b>420 nm</b>), <b>M</b> cones in the green (about <b>530 nm</b>) and <b>L</b> cones in the yellow-green (about <b>560 nm</b>). Their curves overlap a lot.</p>
    <p>No single cone knows what colour it saw: it just sends "how much". Your brain compares the three, and the <b>pattern</b> is the colour. This is the <b>trichromatic theory</b>, first suggested by Thomas Young in 1802.</p>
    <p>Here is the trick: light of one pure wavelength, say 580 nm yellow, and a <b>mix</b> of red and green light can give the three cones exactly the same pattern. Your eyes can't tell them apart. So a phone or TV only needs red, green and blue <b>subpixels</b> to fool you into seeing every colour: see <a href="/tvclear/#pixels">TVClear's pixels</a>.</p>
    <p>In <b>colour vision deficiency</b> ("colour blindness"), one cone type is missing or shifted. Most common is <b>red–green</b>, which affects about <b>8% of men</b> and <b>0.5% of women</b> of Northern European ancestry, because the genes sit on the X chromosome. Rates differ between populations: studies in India find roughly 4 to 9% of boys and men, depending on the community. Most colour-blind people see many colours, just not all the differences. A simple eye test can check it.</p>
    <p class="tip"><b>Try it:</b> set the wavelength to 580 nm, then switch to the screen mix and find red and green levels that look the same. Then try each type of colour blindness on the picture.</p>`,
  terms: [
    { t: 'S, M and L cones', d: 'The short-, medium- and long-wavelength cones, peaking near 420, 530 and 560 nm.' },
    { t: 'Wavelength', d: 'The distance between wave crests of light. We see about 400 nm (violet) to 700 nm (red).' },
    { t: 'Trichromatic', d: 'Seeing with three channels. Any colour is a pattern of three cone signals.' },
    { t: 'Metamer', d: 'Two different lights that look exactly the same because they excite the cones in the same pattern.' },
    { t: 'Colour vision deficiency', d: 'Missing or shifted cones, so some colours are hard to tell apart. Usually red–green and inherited.' },
  ],
  defaults: { mode: 'spectral', wl: 580, r: 1, g: 0.62, b: 0, cvd: 'normal' },
  controls: [
    { key: 'mode', type: 'seg', label: 'Light', options: [{ v: 'spectral', label: 'One wavelength' }, { v: 'mix', label: 'Screen mix (R, G, B)' }] },
    { key: 'wl', type: 'range', label: 'Wavelength', min: 400, max: 700, step: 1, ends: ['violet', 'red'], fmt: (v) => Math.round(v) + ' nm' },
    { key: 'r', type: 'range', label: 'Red subpixel', min: 0, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'g', type: 'range', label: 'Green subpixel', min: 0, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'b', type: 'range', label: 'Blue subpixel', min: 0, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'cvd', type: 'seg', label: 'Colour vision', options: [{ v: 'normal', label: 'Typical' }, { v: 'protan', label: 'No L' }, { v: 'deutan', label: 'No M' }, { v: 'tritan', label: 'No S' }], fmt: (v) => CVD_NAMES[v] },
  ],
  onChange(s, key) { if (['r', 'g', 'b'].includes(key)) s.mode = 'mix'; if (key === 'wl') s.mode = 'spectral'; },
  quiz: [
    { q: 'How many kinds of cone does typical human colour vision use?', options: ['One', 'Two', 'Three', 'Seven'], answer: 2, why: 'S, M and L cones. The brain compares their three signals to make every colour you see.' },
    { q: 'Why can a screen show yellow with only red and green subpixels?', options: ['The screen makes yellow light', 'Red plus green excites your cones in the same pattern as yellow light', 'Yellow is not a real colour', 'The blue subpixel turns yellow'], answer: 1, why: 'Your cones can’t tell the mix from pure yellow light. The two lights are metamers.' },
    { q: 'Which colour vision deficiency is most common?', options: ['Blue–yellow', 'Red–green', 'Seeing no colour at all', 'Seeing only red'], answer: 1, why: 'Red–green deficiency, from missing or shifted L or M cones, is by far the most common, mostly in men.' },
  ],
  reel: [
    { caption: 'Three kinds of cone see colour. Red plus green light excites them just like yellow: that is how screens work.', set: { mode: 'mix', r: 1, b: 0, cvd: 'normal' }, anim: { g: [0, 0.62] }, ms: 5800, view: { pos: [0.3, 6.2, 13.2], target: [0.3, 5.6, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const cellsG = new THREE.Group(); cellsG.position.set(3.0, 6.4, 0); stage.root.add(cellsG);
    const COL = { S: 0x6f8cff, M: 0x5fe08a, L: 0xff6a5a };
    const cells = {};
    ['S', 'M', 'L'].forEach((k, i) => {
      const g = new THREE.Group(); g.position.x = (i - 1) * 1.95; cellsG.add(g);
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.9, 8, 20), M.matte(0xe9d7c2)); body.position.y = -0.6; g.add(body);
      const mat = new THREE.MeshStandardMaterial({ color: COL[k], emissive: COL[k], emissiveIntensity: 0, roughness: 0.4 });
      const os = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.3, 24), mat); os.position.y = 0.75; os.rotation.x = Math.PI; g.add(os);
      const lab = tint(stage.label(`${k} cone · ${CONES[k]} nm`, [0, -1.85, 0.5], g), ''); lab.element.style.color = '#' + COL[k].toString(16); lab.element.style.borderColor = lab.element.style.color;
      cells[k] = { g, mat, lab };
    });
    // the light: one beam of a wavelength, or three subpixel beams
    const beamMat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 2.9, 2.2, 40, 1, true), beamMat(0xffffff)); cone.position.y = 2.55; cellsG.add(cone);
    const pix = new THREE.Group(); pix.position.y = 3.85; cellsG.add(pix);
    const sub = ['R', 'G', 'B'].map((k, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.1), new THREE.MeshBasicMaterial({ color: [0xff3b30, 0x34e060, 0x3b6bff][i], toneMapped: false })); m.position.x = (i - 1) * 0.3; pix.add(m); return m; });
    const pixL = tint(stage.label('One screen pixel', [1.2, 0.35, 0], pix), 'side');
    const scene = document.createElement('canvas'); scene.width = 290; scene.height = 203;
    const sg = scene.getContext('2d');
    let sceneKey = '';
    const paint = (cvd) => { if (cvd === sceneKey) return; sceneKey = cvd; sg.clearRect(0, 0, 290, 203); paintScene(sg, 0, 0, 290, 203); if (cvd !== 'normal') { const im = sg.getImageData(0, 0, 290, 203); simulateImage(im.data, cvd); sg.putImageData(im, 0, 0); } };
    const b = board(stage.root, 10.4, 3.9, 1000, (g, w, h, s) => drawColour(g, w, h, s, scene));
    b.mesh.position.set(-0.6, 2.1, 0.4);
    const fit = fitNarrow(stage, { pos: [0.6, 7.0, 16], target: [0.6, 6.0, 0] });
    let last = '';
    const api = compactReadout(stage, {
      update(dt, s) {
        dt = Math.max(0, dt); stage.css.domElement.style.visibility = fit() ? 'hidden' : '';
        const key = [s.mode, s.wl, s.r, s.g, s.b, s.cvd].join();
        if (key === last) return; last = key;
        paint(s.cvd);
        const r = coneResponse(spectrumOf(s), s.cvd);
        const mx = Math.max(r.S, r.M, r.L, 1e-6);
        const norm = s.mode === 'spectral' ? 1 : Math.max(mx, coneResponse((l) => gauss(l, PRIMARIES.R, 12) + gauss(l, PRIMARIES.G, 14) + gauss(l, PRIMARIES.B, 12)).L);
        for (const k of ['S', 'M', 'L']) {
          const v = r[k] / (s.mode === 'spectral' ? mx : norm), gone = (s.cvd === 'protan' && k === 'L') || (s.cvd === 'deutan' && k === 'M') || (s.cvd === 'tritan' && k === 'S');
          cells[k].mat.emissiveIntensity = gone ? 0 : v * 1.6; cells[k].mat.color.set(gone ? 0x3a3a44 : COL[k]);
          cells[k].lab.element.innerHTML = gone ? `${k} cone missing` : `${k} · ${Math.round((r[k] / (r.S + r.M + r.L || 1)) * 100)}%`;
        }
        const rgb = shownRGB(s);
        cone.material.color.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, THREE.SRGBColorSpace);
        pix.visible = s.mode === 'mix'; pixL.visible = s.mode === 'mix';
        sub.forEach((m, i) => { const v = [s.r, s.g, s.b][i]; m.material.color.setHex([0xff3b30, 0x34e060, 0x3b6bff][i]).multiplyScalar(0.15 + 0.85 * v); });
        b.redraw(s);
        const tot = r.S + r.M + r.L || 1;
        api.st = { r, tot, rgb: simulate(rgb, s.cvd), look: s.mode === 'mix' ? lookalike(r) : null };
      },
      readout: (s) => {
        const st = api.st; if (!st) return '';
        const pct = (v) => Math.round((v / st.tot) * 100) + '%';
        const look = st.look && st.look.err < 0.03 ? `looks just like ${st.look.l} nm light` : st.look ? 'no single wavelength matches' : `${Math.round(s.wl)} nm light`;
        return `<div class="big">${hueName(st.rgb)}</div>
          <div class="row"><span>Signal share S · M · L</span><b>${pct(st.r.S)} · ${pct(st.r.M)} · ${pct(st.r.L)}</b></div>
          <div class="row"><span>The light</span><b>${look}</b></div>
          <div class="row"><span>Viewer</span><b>${CVD_NAMES[s.cvd]}</b></div>
          <small>Cone curves: Govardovskii pigment template. Colour-blind views: Machado 2009 simulation.</small>`;
      },
    });
    return api;
  },
};
