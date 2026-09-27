// Chapter 3: short sight, long sight and glasses. Most short sight (myopia) is an eyeball that has
// grown too long, so distant light focuses in front of the retina; long sight (hyperopia) is an eye
// too short for its power (NEI "Nearsightedness", "Farsightedness"; AAO). The model stretches the
// back of Le Grand's eye and traces rays exactly: each extra millimetre gives about 2.7 D of myopia,
// in line with the usual clinical rule of about 3 D per mm. The spectacle lens sits 12 mm in front
// of the cornea and its power is found so the eye's far point lands at the lens's focal point.
// Astigmatism: a cornea curved more steeply in one direction than the other, so vertical and
// horizontal lines focus at different depths (AAO, "What is astigmatism?").
// Myopia worldwide: Holden et al., Ophthalmology 123:1036 (2016): 1,406 million people (22.9%) in
// 2000, about 28% in 2010, projected 4,758 million (49.8%) by 2050. Urban Indian children aged 5–15:
// 4.44% (1999) to 21.15% (2019), projected 48.1% by 2050 (Priscilla & Verkicharla, Ophthalmic
// Physiol Opt 41:466, 2021). Time outdoors is linked to less myopia in children (e.g. He et al.,
// JAMA 314:1142, 2015; AAO).
import { THREE, M } from '../kit.js';
import { makeEye, rayRig, board, boardBg, compactReadout, fitNarrow, tint, latheMM, Rays } from '../eye.js';
import { AXIAL, farPointVergence, spectacleFor, quarter, fan, SPECTACLE_VERTEX } from '../optics.js';
import { drawChart } from './focus.js';

const kind = (e) => (e > 0.15 ? 'Short-sighted (myopia)' : e < -0.15 ? 'Long-sighted (hyperopia)' : 'Normal length');
const fmtD = (d) => (d > 0 ? '+' : d < 0 ? '−' : '') + Math.abs(d).toFixed(2) + ' D';

// A clock-dial of lines: with astigmatism some directions look sharper than others.
function dial(g, x, y, w, h, blurV, blurH) {
  const cx = x + w / 2, cy = y + h / 2 + 8, R = Math.min(w, h) * 0.4;
  const pass = (bx, by) => {
    const n = 11;
    for (let i = 0; i < n; i++) {
      const ox = n > 1 ? (i / (n - 1) - 0.5) * bx : 0, oy = n > 1 ? (i / (n - 1) - 0.5) * by : 0;
      g.globalAlpha = Math.min(1, 2.2 / n);
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI; g.strokeStyle = '#16181d'; g.lineWidth = 5; g.beginPath(); g.moveTo(cx + ox - Math.cos(a) * R, cy + oy - Math.sin(a) * R); g.lineTo(cx + ox + Math.cos(a) * R, cy + oy + Math.sin(a) * R); g.stroke(); }
    }
    g.globalAlpha = 1;
  };
  pass(blurH, blurV);
}

function drawMyopia(g, x, y, w, h) {
  const rows = [
    { t: 'World, 2000', v: 22.9, c: '#8fb0ff' }, { t: 'World, 2010', v: 28, c: '#8fb0ff' }, { t: 'World, 2050 (projected)', v: 49.8, c: '#8fb0ff', p: true },
    { t: 'Indian city kids, 1999', v: 4.4, c: '#ffd166' }, { t: 'Indian city kids, 2019', v: 21.2, c: '#ffd166' }, { t: 'Indian city kids, 2050 (proj.)', v: 48.1, c: '#ffd166', p: true },
  ];
  g.fillStyle = '#e8eef8'; g.font = 'bold 26px sans-serif'; g.fillText('Short sight is rising', x, y + 26);
  const top = y + 50, bh = (h - 90) / rows.length;
  rows.forEach((r, i) => {
    const yy = top + i * bh, bw = (r.v / 55) * (w - 150);
    g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '22px sans-serif'; g.fillText(r.t, x, yy + 20);
    g.fillStyle = r.c; g.globalAlpha = r.p ? 0.45 : 0.95; g.fillRect(x, yy + 27, bw, bh - 36); g.globalAlpha = 1;
    g.fillStyle = '#e8eef8'; g.font = 'bold 22px sans-serif'; g.fillText(r.v.toFixed(1).replace('.0', '') + '%', x + bw + 8, yy + 27 + (bh - 36));
  });
  g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '18px sans-serif'; g.fillText('Holden 2016; Priscilla & Verkicharla 2021 (ages 5–15)', x, y + h - 8);
}

export default {
  id: 'glasses',
  short: 'Glasses',
  title: 'Short sight, long sight and glasses',
  subtitle: 'An eyeball a millimetre too long, and the lens that fixes it.',
  view: { pos: [-0.6, 6.6, 16.5], target: [-0.6, 5.7, 0] },
  learn: `<p>For sharp distance vision, the eye's length has to match its focusing power almost exactly. The margin is tiny: an eyeball just <b>1 mm too long</b> is about <b>3 dioptres</b> short-sighted.</p>
    <p>In <b>short sight (myopia)</b> the eyeball has usually grown too long, so light from far away meets <b>in front of</b> the retina and has spread out again by the time it lands. Near things still look sharp. A <b>concave</b> (minus) lens, thinner in the middle, spreads the light out a little first, so it meets further back, on the retina.</p>
    <p>In <b>long sight (hyperopia)</b> the eye is too short, so the light would meet <b>behind</b> the retina. A <b>convex</b> (plus) lens, thicker in the middle, adds the missing power. Young people can often squeeze their own lens to make up for it, but that can tire the eyes, especially when reading.</p>
    <p>In <b>astigmatism</b> the cornea is shaped more like the back of a spoon than a ball, curved more one way than the other. Lines in one direction come into focus at a different depth from lines in the other. Glasses fix it with a <b>cylinder</b>, a lens that bends light more in one direction.</p>
    <p>Short sight is becoming much more common. About <b>1 in 4</b> people in the world were short-sighted in 2000, and researchers project about <b>half</b> by 2050. In Indian cities, the share of school children with myopia rose from about <b>4%</b> in 1999 to about <b>21%</b> in 2019. Studies link more time <b>outdoors</b> in daylight to less myopia in children. Only an eye test can tell what you need, so see an optometrist or eye doctor if things look blurry.</p>
    <p class="tip"><b>Try it:</b> make the eye 2 mm longer and watch the rays cross too early, then put the glasses on. Try a shorter eye and some astigmatism too.</p>`,
  terms: [
    { t: 'Myopia', d: 'Short sight: distant things look blurry because light focuses in front of the retina.' },
    { t: 'Hyperopia', d: 'Long sight: the eye is too short for its power, so light would focus behind the retina.' },
    { t: 'Astigmatism', d: 'Unequal curvature of the cornea or lens, so lines in different directions focus at different depths.' },
    { t: 'Concave (minus) lens', d: 'Thinner in the middle. It spreads light out and corrects short sight.' },
    { t: 'Convex (plus) lens', d: 'Thicker in the middle. It brings light together and corrects long sight.' },
    { t: 'Prescription', d: 'The power of your glasses in dioptres, usually in steps of 0.25 D, with a cylinder for astigmatism.' },
  ],
  defaults: { err: 1, glasses: false, astig: 0 },
  controls: [
    { key: 'err', type: 'range', label: 'Length of the eyeball', min: -3, max: 3, step: 0.05, ends: ['too short', 'too long'], fmt: (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + ' mm' },
    { key: 'astig', type: 'range', label: 'Astigmatism', min: 0, max: 3, step: 0.25, ends: ['none', '3 D'], fmt: (v) => v.toFixed(2) + ' D' },
    { key: 'glasses', type: 'toggle', label: 'Put the glasses on' },
    { key: 'preset', type: 'buttons', label: 'Try', items: [
      { label: 'Normal', act: (s) => { s.err = 0; s.astig = 0; } },
      { label: 'Short-sighted', act: (s) => { s.err = 1.5; s.astig = 0; } },
      { label: 'Long-sighted', act: (s) => { s.err = -1.5; s.astig = 0; } },
      { label: 'Astigmatism', act: (s) => { s.err = 0; s.astig = 2; } },
    ] },
  ],
  quiz: [
    { q: 'In short sight, where does light from far away come into focus?', options: ['On the retina', 'In front of the retina', 'Behind the retina', 'On the cornea'], answer: 1, why: 'The eyeball is usually too long, so the rays meet before they reach the retina and have spread again when they land.' },
    { q: 'Which lens corrects short sight?', options: ['A convex (plus) lens', 'A concave (minus) lens', 'A coloured lens', 'A pinhole'], answer: 1, why: 'A concave lens spreads the light a little so the eye brings it to a focus further back, on the retina.' },
    { q: 'An eyeball 1 mm longer than normal is roughly how short-sighted?', options: ['0.1 D', 'About 3 D', 'About 30 D', 'Not at all'], answer: 1, why: 'Each extra millimetre of length gives roughly 2.5 to 3 dioptres of myopia, which is why the eye’s growth matters so much.' },
  ],
  reel: [
    { ms: 6000, caption: 'A short-sighted eye is too long, so light meets in front of the retina. A concave lens fixes it.', set: { err: 2, astig: 0 }, anim: { glasses: [false, true] }, view: { pos: [0.8, 5.6, 13], target: [0.8, 5.0, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const eye = makeEye(stage, { muscles: false, lids: false, labels: false, cut: Math.PI, cutAt: 0 });
    eye.root.position.set(3.5, 6.8, 0); eye.root.scale.setScalar(0.24); eye.nerveG.visible = false;
    stage.root.add(eye.root);
    eye.setPupil(2.0); eye.setAccom(0);
    const rig = rayRig(stage, eye);
    const rays2 = new Rays(stage, eye.mm, { width: 2 });
    // spectacle lens: its thickness difference is exaggerated so you can see concave vs convex
    const specG = new THREE.Group(); specG.position.x = -SPECTACLE_VERTEX; eye.mm.add(specG);
    const specMat = new THREE.MeshPhysicalMaterial({ color: 0xd6f2ff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(8.4, 0.35, 10, 48), M.matte(0x2b2f3a)); rim.rotation.y = Math.PI / 2; specG.add(rim);
    let specMesh = null, specP = null;
    const setSpec = (P) => {
      if (specMesh && Math.abs(P - specP) < 0.05) return; specP = P;
      if (specMesh) { specG.remove(specMesh); specMesh.geometry.dispose(); }
      const T = (r) => 0.6 + 0.012 * Math.abs(P) * (P < 0 ? r * r : 67.2 - r * r), prof = [], n = 16;
      for (let i = 0; i <= n; i++) { const r = (8.2 * i) / n; prof.push([-T(r) / 2, r]); }
      for (let i = n; i >= 0; i--) { const r = (8.2 * i) / n; prof.push([T(r) / 2, r]); }
      specMesh = latheMM(prof, specMat, 0, Math.PI * 2, 40); specMesh.castShadow = false; specG.add(specMesh);
    };
    const labs = {
      len: tint(stage.label('', [18, 14.5, 0], eye.mm), 'gold'),
      spec: tint(stage.label('', [-12, -11.5, 0], eye.mm), 'side'),
      focus: tint(stage.label('', [16, -14.5, 0], eye.mm), 'light'),
    };
    const panel = board(stage.root, 10.4, 3.9, 1000, (g, w, h, st) => {
      boardBg(g, w, h);
      const astig = st.astig > 0.05 && !st.glasses;
      drawChart(g, 24, 58, 360, h - 80, astig ? 0 : st.blur, astig ? 'What you see: lines' : 'What you see far away', astig ? { draw: (gg, x, y, ww, hh) => dial(gg, x, y, ww, hh, st.blurV, st.blurH) } : {});
      drawMyopia(g, 410, 16, w - 430, h - 24);
    });
    panel.mesh.position.set(-0.6, 2.1, 0.4);
    const fit = fitNarrow(stage, { pos: [0.6, 7.0, 16], target: [0.6, 6.0, 0] });
    let last = '', stt = null;
    const api = compactReadout(stage, {
      update(dt, s, time) {
        dt = Math.max(0, dt); stage.css.domElement.style.visibility = fit() ? 'hidden' : '';
        const key = [s.err, s.glasses, s.astig].join();
        if (key !== last) {
          last = key;
          const L = AXIAL + s.err;
          eye.setAxial(L);
          const P = spectacleFor(L), Pv = spectacleFor(L, s.astig);
          const spec = s.glasses ? Pv : null, specH = s.glasses ? P : null;
          specG.visible = s.glasses;
          if (s.glasses) setSpec(P);
          const info = rig.draw({ k: 0, objDist: Infinity, L, spec, astigD: s.astig, pupil: 1.8, tip: false });
          // the horizontal meridian (no extra corneal power), drawn in the x–z plane
          if (s.astig > 0.05) {
            const hz = fan(5, 1.6, { k: 0, L, spec: specH, startX: -21 });
            rays2.lines(hz.map((r) => ({ pts: r.pts.map(([x, y]) => [x, 0.06, y]), col: [0.55, 0.75, 1] })));
          } else rays2.set([], []);
          const defV = farPointVergence(L, s.astig), defH = farPointVergence(L);
          const resV = s.glasses ? 0 : defV, resH = s.glasses ? 0 : defH;
          stt = { L, P, cyl: Pv - P, far: farPointVergence(L), defocus: Math.max(Math.abs(resV), Math.abs(resH)), xf: info.xf };
          labs.len.element.innerHTML = `Eyeball ${L.toFixed(1)} mm long`;
          labs.spec.element.innerHTML = s.glasses ? `${P < -0.1 ? 'Concave' : P > 0.1 ? 'Convex' : 'Plain'} lens ${fmtD(quarter(P))}` : '';
          labs.spec.visible = s.glasses;
          const off = info.xf - L;
          labs.focus.element.innerHTML = Math.abs(off) < 0.08 || s.glasses ? 'Focus on the retina' : off < 0 ? `Focus ${(-off).toFixed(1)} mm in front of the retina` : `Focus ${off.toFixed(1)} mm behind the retina`;
          // blur: about 5 px per dioptre of defocus on the card (illustrative)
          panel.redraw({ blur: Math.min(18, stt.defocus * 5), blurV: Math.min(30, Math.abs(resV) * 6), blurH: Math.min(30, Math.abs(resH) * 6), astig: s.astig, glasses: s.glasses });
        }
        rig.tick(time);
      },
      readout: (s) => {
        if (!stt) return '';
        const cyl = Math.abs(stt.cyl) > 0.1 ? ` with ${fmtD(quarter(stt.cyl))} cylinder` : '';
        const farTxt = stt.far > 0.05 ? `${Math.round(100 / stt.far)} cm` : stt.far < -0.05 ? 'none (needs extra power)' : 'far away';
        return `<div class="big">${s.astig > 0.05 && Math.abs(s.err) <= 0.15 ? 'Astigmatism' : kind(s.err)}</div>
          <div class="row"><span>Glasses needed</span><b>${fmtD(quarter(stt.P))}${cyl}</b></div>
          <div class="row"><span>Farthest sharp point</span><b>${farTxt}</b></div>
          <div class="row"><span>With glasses on</span><b>${s.glasses ? 'sharp' : 'glasses off'}</b></div>
          <small>A model eye, not a prescription: only an eye test can say what you need.</small>`;
      },
    });
    return api;
  },
};
