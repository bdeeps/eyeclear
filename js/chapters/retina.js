// Chapter 4: the retina, rods and cones. A block of retina with its layers in the right order:
// light passes through the nerve fibres, ganglion cells and bipolar cells before it reaches the
// rods and cones, whose outer segments touch the pigment layer (RPE). Counts: about 120 million
// rods and 6 million cones in the classic estimate (Osterberg 1935; NEI); Curcio et al.
// (J Comp Neurol 292:497, 1990) counted about 92 million rods and 4.6 million cones on average.
// The fovea holds only cones, up to ~199,000 per mm²; rods peak ~18–20° out. Densities: optics.js.
// Phototransduction (Kolb, Webvision "Photoreceptors"; Wald's Nobel lecture, 1967): a photon
// straightens the retinal in rhodopsin, which switches on transducin and phosphodiesterase; cGMP
// falls, ion channels close and the rod hyperpolarises, releasing less glutamate onto bipolar
// cells. A single photon can produce a measurable rod response (Baylor, Lamb & Yau, J Physiol
// 288:613, 1979). Rhodopsin bleaches in light and regenerates in the dark over several minutes
// (time constant ~5–7 min; Rushton), giving the dark-adaptation curve (Hecht, Haig & Chase 1937).
import { THREE, M, clamp, lerp } from '../kit.js';
import { board, boardBg, compactReadout, fitNarrow, tint } from '../eye.js';
import { cones, rods, onDisc, DISC, visionMode, coneBranch, rodBranch, threshold } from '../optics.js';

const lux = (L) => (L < 0.001 ? 'a starlit night' : L < 0.05 ? 'moonlight' : L < 3 ? 'dusk' : L < 300 ? 'indoors' : 'bright daylight');
const fmtL = (L) => (L < 0.01 ? L.toPrecision(1) : L < 10 ? L.toFixed(2) : Math.round(L).toLocaleString('en-US'));
const k = (v) => (v >= 1000 ? Math.round(v / 1000) + ',000' : Math.round(v));

function drawDensity(g, w, h, s) {
  boardBg(g, w, h, 'Rods and cones across the retina');
  const L = 70, R = w - 30, T = 80, B = h - 60;
  const X = (e) => L + ((e + 60) / 120) * (R - L), Y = (v) => B - (v / 200000) * (B - T);
  g.font = '20px sans-serif'; g.fillStyle = 'rgba(255,255,255,.55)';
  for (let v = 0; v <= 200000; v += 50000) { g.strokeStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(R, Y(v)); g.stroke(); g.fillText(v / 1000 + 'k', 14, Y(v) + 7); }
  for (let e = -60; e <= 60; e += 20) g.fillText((e > 0 ? '+' : '') + e + '°', X(e) - 18, h - 30);
  g.fillText('nasal ←', L, h - 8); g.fillText('→ temporal (degrees from the fovea)', X(0) - 40, h - 8);
  g.fillStyle = 'rgba(255,209,102,.16)'; g.fillRect(X(DISC.centre - DISC.half), T, X(DISC.centre + DISC.half) - X(DISC.centre - DISC.half), B - T);
  g.fillStyle = '#ffd166'; g.font = 'bold 19px sans-serif'; g.fillText('blind spot', X(DISC.centre) - 45, T + 20);
  const curve = (f, col) => { g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); let pen = false; for (let e = -60; e <= 60; e += 0.25) { const v = f(e); if (onDisc(e)) { pen = false; continue; } pen ? g.lineTo(X(e), Y(v)) : g.moveTo(X(e), Y(v)); pen = true; } g.stroke(); };
  curve(rods, '#c9a5ff'); curve(cones, '#ff9e6b');
  g.font = 'bold 22px sans-serif'; g.fillStyle = '#ff9e6b'; g.fillText('cones', X(3), T + 10); g.fillStyle = '#c9a5ff'; g.fillText('rods', X(24), Y(160000) - 10);
  g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '17px sans-serif'; g.fillText('per mm², after Osterberg 1935 and Curcio 1990', w - 430, 46);
  g.strokeStyle = '#ffffff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(X(s.ecc), T); g.lineTo(X(s.ecc), B); g.stroke();
}

function drawDark(g, w, h, s) {
  boardBg(g, w, h, 'Getting used to the dark');
  const L = 80, R = w - 30, T = 80, B = h - 60;
  const X = (t) => L + (t / 40) * (R - L), Y = (v) => T + (B - T) * (1 - v / 4.5);
  g.font = '20px sans-serif'; g.fillStyle = 'rgba(255,255,255,.55)';
  for (let v = 0; v <= 4; v++) { g.strokeStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(R, Y(v)); g.stroke(); g.fillText('10' + ['⁰', '¹', '²', '³', '⁴'][v], 20, Y(v) + 7); }
  for (let t = 0; t <= 40; t += 10) g.fillText(t + ' min', X(t) - 22, h - 30);
  g.fillText('dimmest light you can see (relative)', L, h - 8);
  const line = (f, col, wd, dash) => { g.setLineDash(dash || []); g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); for (let t = 0; t <= 40; t += 0.2) { const v = Math.min(4.4, f(t)); t ? g.lineTo(X(t), Y(v)) : g.moveTo(X(t), Y(v)); } g.stroke(); g.setLineDash([]); };
  line(coneBranch, 'rgba(255,158,107,.45)', 2, [8, 7]); line(rodBranch, 'rgba(201,165,255,.45)', 2, [8, 7]);
  line(threshold, '#e8eef8', 4.5);
  g.font = 'bold 21px sans-serif'; g.fillStyle = '#ff9e6b'; g.fillText('cones', X(1.2), Y(3.15) - 12); g.fillStyle = '#c9a5ff'; g.fillText('rods take over', X(10), Y(2.2) + 36);
  const v = threshold(s.dark);
  g.fillStyle = '#ffd166'; g.beginPath(); g.arc(X(s.dark), Y(v), 10, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '17px sans-serif'; g.fillText('simplified from Hecht, Haig & Chase 1937', w - 360, 46);
}

// The blind-spot test: close your LEFT eye and look at the cross with your RIGHT eye.
function drawBlind(g, w, h, s) {
  boardBg(g, w, h);
  const cw = w * 0.56;
  g.fillStyle = '#f4f1ea'; g.beginPath(); g.roundRect(20, 20, cw, h - 40, 16); g.fill();
  const cy = h / 2 + 10;
  g.strokeStyle = '#111'; g.lineWidth = 7; g.beginPath(); g.moveTo(80, cy); g.lineTo(130, cy); g.moveTo(105, cy - 25); g.lineTo(105, cy + 25); g.stroke();
  if (s.line) { g.strokeStyle = '#1d5fd6'; g.lineWidth = 8; g.beginPath(); g.moveTo(cw - 230, cy); g.lineTo(cw - 10, cy); g.stroke(); }
  g.fillStyle = '#d6263a'; g.beginPath(); g.arc(cw - 120, cy, 22, 0, 7); g.fill();
  g.fillStyle = '#333'; g.font = 'bold 22px sans-serif'; g.fillText('Close your left eye. Stare at the + with your right eye.', 38, 58);
  g.font = '21px sans-serif'; g.fillText('Move slowly closer to or further from the screen.', 38, 88); g.fillText('At one distance the red dot disappears.', 38, h - 42);
  // retina map of the right eye, seen from the front (so the optic disc is on the right)
  const mx = cw + 40 + (w - cw - 60) / 2, my = h / 2 + 18, R = Math.min(w - cw - 80, h - 110) / 2, deg = R / 38;
  const grd = g.createRadialGradient(mx, my, 5, mx, my, R); grd.addColorStop(0, '#b4512c'); grd.addColorStop(1, '#7a2a18');
  g.fillStyle = grd; g.beginPath(); g.arc(mx, my, R, 0, 7); g.fill();
  g.fillStyle = 'rgba(60,20,8,.8)'; g.beginPath(); g.arc(mx, my, 3 * deg, 0, 7); g.fill();
  g.fillStyle = '#f4d9a8'; g.beginPath(); g.arc(mx + 15 * deg, my - 1.5 * deg, DISC.half * deg, 0, 7); g.fill();
  const dx = mx + s.dot * deg, hit = Math.abs(s.dot - 15) < DISC.half;
  g.strokeStyle = hit ? '#ffd166' : '#ffffff'; g.lineWidth = 4; g.beginPath(); g.arc(dx, my, 9, 0, 7); g.stroke();
  if (!hit) { g.fillStyle = '#ff4a5e'; g.beginPath(); g.arc(dx, my, 6, 0, 7); g.fill(); }
  g.fillStyle = '#e8eef8'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center';
  g.fillText('Your right retina', mx, 44);
  g.font = '19px sans-serif'; g.fillStyle = hit ? '#ffd166' : 'rgba(255,255,255,.7)';
  g.fillText(hit ? 'The dot lands on the optic disc: no rods or cones!' : `Dot image ${Math.round(s.dot)}° from the fovea`, mx, h - 16);
  g.textAlign = 'left';
}

export default {
  id: 'retina',
  short: 'Rods and cones',
  title: 'The retina: rods and cones',
  subtitle: 'Millions of light catchers, wired up back to front, with a hole in the middle.',
  view: { pos: [-0.6, 6.6, 16.5], target: [-0.6, 5.7, 0] },
  learn: `<p>The retina is thinner than a credit card, but it holds about <b>120 million rods</b> and <b>6 million cones</b> (a careful 1990 count found about 92 million and 4.6 million, and people vary). <b>Rods</b> are extremely sensitive and work in dim light, but they can't tell colours apart. <b>Cones</b> need brighter light, give you <b>colour</b> and fine <b>detail</b>. The <b>fovea</b> is packed with cones and has no rods at all, which is why you look straight at things to read them.</p>
    <p>Strangely, the retina is wired back to front: light passes through the nerve cells first and is caught by the rods and cones at the very back, next to a dark <b>pigment layer</b> that soaks up stray light. The signal then travels forward through <b>bipolar cells</b> to <b>ganglion cells</b>, whose long fibres run across the retina to the optic disc and on to the brain's <b>visual cortex</b> (see <a href="/brainclear/">BrainClear</a>).</p>
    <p>How does a rod catch light? It is full of a pigment, <b>rhodopsin</b>. When a photon hits one molecule, a small part of it, <b>retinal</b>, snaps into a straighter shape. That switches on a chain of proteins that closes tiny gates in the cell, and the rod sends a changed signal. One photon is enough. This is <b>phototransduction</b>.</p>
    <p>Bright light bleaches rhodopsin, and it takes time to rebuild. That is why a dark cinema looks pitch black at first. Your cones adapt within about 10 minutes, then the rods take over and keep improving for about <b>30 minutes</b>, making you roughly 10,000 times more sensitive.</p>
    <p>Where the optic nerve leaves, there are no rods or cones at all: your <b>blind spot</b>. You never notice it, because your other eye covers it and your brain fills in the gap.</p>
    <p class="tip"><b>Try it:</b> turn the light down to starlight and watch only the rods respond. Then open the blind-spot test and try it for real on your screen.</p>`,
  terms: [
    { t: 'Rod', d: 'A light-sensing cell that works in dim light but does not see colour. About 120 million per eye.' },
    { t: 'Cone', d: 'A light-sensing cell for colour and fine detail in good light. About 6 million per eye.' },
    { t: 'Rhodopsin', d: 'The light-catching pigment in rods, also called visual purple. Light bleaches it.' },
    { t: 'Phototransduction', d: 'How a photoreceptor turns a photon into an electrical signal.' },
    { t: 'Dark adaptation', d: 'The slow gain in sensitivity in the dark, as cones and then rods rebuild their pigment.' },
    { t: 'Blind spot', d: 'The optic disc, where there are no rods or cones, so nothing there is seen.' },
  ],
  defaults: { show: 'cells', ecc: 20, light: 0.02, dark: 15, dot: 8, line: false },
  controls: [
    { key: 'show', type: 'seg', label: 'Board', options: [{ v: 'cells', label: 'Where they are' }, { v: 'dark', label: 'In the dark' }, { v: 'blind', label: 'Blind spot test' }] },
    { key: 'ecc', type: 'range', label: 'Where on the retina', min: 0, max: 40, step: 0.5, ends: ['fovea', '40° out'], fmt: (v) => (v < 1 ? 'the fovea' : Math.round(v) + '° from the fovea') },
    { key: 'light', type: 'log', label: 'Light level', min: 0.00002, max: 10000, ends: ['starlight', 'sunlight'], fmt: (v) => lux(v) },
    { key: 'dark', type: 'range', label: 'Minutes in the dark', min: 0, max: 40, step: 0.5, fmt: (v) => Math.round(v) + ' min' },
    { key: 'dot', type: 'range', label: 'Blind-spot map: dot angle', min: 0, max: 25, step: 0.5, ends: ['at the fovea', '25°'], fmt: (v) => Math.round(v) + '°' },
    { key: 'line', type: 'toggle', label: 'Test card: add a line through the dot', hint: 'When the dot vanishes, the line still looks whole: your brain fills in the gap.' },
  ],
  quiz: [
    { q: 'Which cells let you see in very dim light?', options: ['Cones', 'Rods', 'Ganglion cells', 'Lens cells'], answer: 1, why: 'Rods are far more sensitive than cones, which is also why you can’t see colours well at night.' },
    { q: 'Why is the fovea best for reading?', options: ['It has the most rods', 'It is packed with cones and has no rods', 'It is closest to the lens', 'It has no blood'], answer: 1, why: 'Densely packed cones, each with its own line to the brain, give the sharpest detail.' },
    { q: 'What happens first when a photon hits rhodopsin?', options: ['The cell divides', 'Retinal changes shape', 'The pupil shrinks', 'A nerve fibre fires backwards'], answer: 1, why: 'Retinal straightens from its bent (11-cis) form, which starts the chain of events called phototransduction.' },
  ],
  reel: [
    { ms: 5400, caption: 'About 120 million rods catch dim light; 6 million cones see colour and detail.', set: { show: 'cells', light: 0.00005, ecc: 20 }, anim: { light: [0.00005, 2000, true] }, view: { pos: [0.8, 5.6, 13], target: [0.8, 5.0, 0] }, spin: 0 },
    { ms: 5000, caption: 'Where the optic nerve leaves, there are no rods or cones: your blind spot.', set: { show: 'blind', line: false }, anim: { dot: [5, 15] }, view: { pos: [0.8, 5.6, 13], target: [0.8, 5.0, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const slab = new THREE.Group(); slab.position.set(2.9, 5.7, 0); slab.rotation.y = -0.35; stage.root.add(slab);
    const NX = 14, NZ = 6, SP = 0.34, x0 = -((NX - 1) * SP) / 2, z0 = -((NZ - 1) * SP) / 2;
    const N = NX * NZ;
    // layers
    const rpe = new THREE.Mesh(new THREE.BoxGeometry(NX * SP + 0.2, 0.28, NZ * SP + 0.2), M.matte(0x3a2216)); rpe.position.y = -1.15; slab.add(rpe);
    const cho = new THREE.Mesh(new THREE.BoxGeometry(NX * SP + 0.2, 0.3, NZ * SP + 0.2), M.matte(0x6e2a22)); cho.position.y = -1.45; slab.add(cho);
    const fib = new THREE.Mesh(new THREE.BoxGeometry(NX * SP + 0.2, 0.08, NZ * SP + 0.2), M.ghost(0xfff0d0, 0.18)); fib.position.y = 2.25; slab.add(fib);
    // photoreceptors: outer segments (instanced, coloured per frame) and inner segments
    const rodOS = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.055, 0.9, 10), new THREE.MeshStandardMaterial({ roughness: 0.5 }), N);
    const coneOS = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.12, 0.6, 12), new THREE.MeshStandardMaterial({ roughness: 0.5 }), N);
    const inner = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.08, 0.55, 10), M.matte(0xe9d7c2), N);
    const bip = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), M.matte(0x9fd0ff), N);
    const gan = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 12, 8), M.matte(0x7ef0b0), Math.ceil(N / 3));
    [rodOS, coneOS, inner, bip, gan].forEach((m) => { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); slab.add(m); });
    const col = new THREE.Color();
    for (let i = 0; i < N; i++) { rodOS.setColorAt(i, col.set(0xffffff)); coneOS.setColorAt(i, col.set(0xffffff)); }
    // wiring: thin lines from each receptor up to its bipolar and on to a ganglion cell
    const wireMat = new THREE.LineBasicMaterial({ color: 0x9fb4d8, transparent: true, opacity: 0.35 });
    const wires = new THREE.LineSegments(new THREE.BufferGeometry(), wireMat); slab.add(wires);
    const cells = [];
    let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let ix = 0; ix < NX; ix++) for (let iz = 0; iz < NZ; iz++) cells.push({ x: x0 + ix * SP + (rnd() - 0.5) * 0.06, z: z0 + iz * SP + (rnd() - 0.5) * 0.06, r: rnd(), ph: rnd(), type: 0, glow: 0, acc: rnd(), cone: ['L', 'L', 'M', 'L', 'M', 'S'][Math.floor(rnd() * 6)] });
    // pulses (signals) travelling up the chain
    const P = 90, pulses = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), M.glow(0xffe08a), P); pulses.frustumCulled = false; slab.add(pulses);
    const pul = []; let pi = 0;
    const phot = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), M.glow(0xfff6c8), N); phot.frustumCulled = false; slab.add(phot);
    const o = new THREE.Object3D();
    const setI = (m, i, x, y, z, s = 1, sy = 1) => { o.position.set(x, y, z); o.rotation.set(0, 0, 0); o.scale.set(s, sy, s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); };
    [
      tint(stage.label('Light comes in', [-1.9, 3.3, 0], slab), 'light'),
      tint(stage.label('Nerve fibres → optic disc', [2.9, 2.55, 0.6], slab), ''),
      tint(stage.label('Ganglion cells', [3.2, 1.85, 0.6], slab), 'green'),
      tint(stage.label('Bipolar cells', [3.2, 1.2, 0.6], slab), 'blue'),
      tint(stage.label('Rods and cones', [3.35, -0.2, 0.6], slab), 'gold'),
      tint(stage.label('Pigment layer', [3.3, -1.15, 0.6], slab), ''),
    ];
    const arrows = new THREE.Group(); slab.add(arrows);
    for (const x of [-1.5, 0, 1.5]) { const a = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 12), M.glow(0xffe08a)); a.rotation.z = Math.PI; a.position.set(x, 2.75, 0); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), M.glow(0xffe08a)); sh.position.set(x, 3.1, 0); arrows.add(a, sh); }
    const b = board(stage.root, 10.4, 3.9, 1000, (g, w, h, s) => (s.show === 'dark' ? drawDark(g, w, h, s) : s.show === 'blind' ? drawBlind(g, w, h, s) : drawDensity(g, w, h, s)));
    b.mesh.position.set(-0.6, 2.1, 0.4);
    const fit = fitNarrow(stage, { pos: [0.6, 7.0, 16], target: [0.6, 6.0, 0] });
    let lastLayout = '', lastBoard = '', coneFrac = 0, t = 0;
    const layout = (ecc) => {
      // Which receptors are cones here: the share of cones among photoreceptors at this eccentricity.
      const c = cones(ecc), r = rods(ecc); coneFrac = c / (c + r);
      const fovea = ecc < 1.2, pit = ecc < 2.5;
      const wpos = [];
      let gi = 0;
      cells.forEach((cl, i) => {
        cl.type = cl.r < coneFrac ? 1 : 0;
        const slim = fovea ? 0.55 : 1;
        if (cl.type === 1) { setI(coneOS, i, cl.x, -0.62, cl.z, slim, fovea ? 1.5 : 1); setI(rodOS, i, 0, 0, 0, 0); }
        else { setI(rodOS, i, cl.x, -0.55, cl.z); setI(coneOS, i, 0, 0, 0, 0); }
        setI(inner, i, cl.x, 0.05, cl.z, cl.type ? 1.1 * slim : 0.8);
        // at the fovea, the inner layers are pushed aside to form a pit
        const push = pit ? Math.sign(cl.x || 0.01) * (1 - Math.min(1, Math.abs(cl.x) / 1.6)) * 1.1 : 0;
        const bx = cl.x + push * 0.9, by = 1.05 - (pit ? (1 - Math.min(1, Math.abs(cl.x) / 1.6)) * 0.3 : 0);
        setI(bip, i, bx, by, cl.z, 1);
        wpos.push(cl.x, 0.33, cl.z, bx, by, cl.z);
        if (i % 3 === 0) { const gx = cl.x + push * 1.3; setI(gan, gi++, gx, 1.8, cl.z); wpos.push(bx, by, cl.z, gx, 1.8, cl.z); }
        cl.bx = bx; cl.by = by; cl.gx = cl.x + push * 1.3;
      });
      [rodOS, coneOS, inner, bip, gan].forEach((m) => { m.instanceMatrix.needsUpdate = true; });
      wires.geometry.dispose(); wires.geometry = new THREE.BufferGeometry(); wires.geometry.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3));
    };
    const CONE = { S: new THREE.Color(0x6f8cff), M: new THREE.Color(0x5fe08a), L: new THREE.Color(0xff6a5a) };
    const PURPLE = new THREE.Color(0x9a3fa0), BLEACH = new THREE.Color(0xeadfb0), GREY = new THREE.Color(0x55505a);
    let vm = visionMode(1), rho = 1;
    const api = compactReadout(stage, {
      update(dt, s, time) {
        dt = Math.max(0, dt); t += dt; stage.css.domElement.style.visibility = fit() ? 'hidden' : '';
        const key = s.ecc.toFixed(1);
        if (key !== lastLayout) { lastLayout = key; layout(s.ecc); }
        const bkey = [s.show, s.ecc, s.dark, s.dot, s.line].join();
        if (bkey !== lastBoard) { lastBoard = bkey; b.redraw(s); }
        // In the dark-adaptation view the light has just gone off; otherwise use the light level.
        const L = s.show === 'dark' ? 0.0001 : s.light;
        vm = visionMode(L);
        // rhodopsin left unbleached: regenerates with a ~6 min time constant after a bright light
        const rhoTarget = s.show === 'dark' ? 1 - Math.exp(-s.dark / 6) : clamp(1 - Math.log10(Math.max(L, 0.01) / 0.01) / 5.5, 0.08, 1);
        rho += (rhoTarget - rho) * Math.min(1, dt * 3);
        const rodGain = s.show === 'dark' ? rho : vm.rods * rho;
        // photon rate per receptor, rising with the log of the light (for display)
        const rate = 0.12 + 1.1 * clamp((Math.log10(L) + 5) / 9, 0, 1);
        let active = 0;
        cells.forEach((cl, i) => {
          cl.acc += dt * rate * (0.7 + cl.ph * 0.6);
          const f = cl.acc % 1;
          setI(phot, i, cl.x, lerp(3.0, cl.type ? -0.3 : -0.1, f), cl.z, f < 0.95 ? 1 : 0);
          if (cl.acc >= 1) {
            cl.acc -= 1;
            const resp = cl.type ? vm.cones : rodGain;
            cl.glow = Math.max(cl.glow, resp);
            if (resp > 0.25) { pul[pi] = { cl, t0: t }; pi = (pi + 1) % P; }
          }
          cl.glow = Math.max(0, cl.glow - dt * 2.2);
          if (cl.glow > 0.3) active++;
          if (cl.type) { col.copy(vm.cones > 0.1 ? CONE[cl.cone] : GREY).multiplyScalar(0.35 + 0.65 * Math.max(vm.cones * 0.4, 0) + cl.glow * 1.2); coneOS.setColorAt(i, col); }
          else { col.copy(BLEACH).lerp(PURPLE, rho).multiplyScalar(0.55 + cl.glow * 1.4); rodOS.setColorAt(i, col); }
        });
        phot.instanceMatrix.needsUpdate = true; rodOS.instanceColor.needsUpdate = true; coneOS.instanceColor.needsUpdate = true;
        // signals: up to the bipolar cell, to the ganglion cell, then along the nerve fibre layer
        for (let j = 0; j < P; j++) {
          const p = pul[j]; let x = 0, y = -99, z = 0;
          if (p) { const a = (t - p.t0) / 0.9, cl = p.cl;
            if (a < 0.3) { const f = a / 0.3; x = cl.x + (cl.bx - cl.x) * f; y = lerp(0.33, cl.by, f); z = cl.z; }
            else if (a < 0.55) { const f = (a - 0.3) / 0.25; x = lerp(cl.bx, cl.gx, f); y = lerp(cl.by, 1.8, f); z = cl.z; }
            else if (a < 1.2) { const f = (a - 0.55) / 0.65; x = lerp(cl.gx, -2.6, f); y = lerp(1.8, 2.25, Math.min(1, f * 4)); z = cl.z; }
          }
          setI(pulses, j, x, y, z, y < -50 ? 0 : 1);
        }
        pulses.instanceMatrix.needsUpdate = true;
        arrows.children.forEach((a) => a.material.color.setScalar(clamp(0.25 + (Math.log10(L) + 5) / 9, 0.25, 1)));
        api.st = { coneFrac, active, rho };
      },
      readout: (s) => {
        const c = cones(s.ecc), r = rods(s.ecc);
        if (s.show === 'dark') {
          const gain = Math.pow(10, threshold(0) - threshold(s.dark));
          return `<div class="big">${Math.round(s.dark)} min in the dark</div>
            <div class="row"><span>Seeing with</span><b>${rodBranch(s.dark) < coneBranch(s.dark) ? 'rods' : 'cones'}</b></div>
            <div class="row"><span>More sensitive than at first</span><b>about ${gain < 100 ? Math.round(gain) : Math.round(gain / 100) * 100}×</b></div>
            <div class="row"><span>Rhodopsin rebuilt</span><b>${Math.round((1 - Math.exp(-s.dark / 6)) * 100)}%</b></div>
            <small>Rods are coloured purple as their rhodopsin (visual purple) rebuilds.</small>`;
        }
        const vmx = visionMode(s.light);
        return `<div class="big">${vmx.name}</div>
          <div class="row"><span>Light level</span><b>${lux(s.light)}, ${fmtL(s.light)} cd/m²</b></div>
          <div class="row"><span>Cones here per mm²</span><b>${k(c)}</b></div>
          <div class="row"><span>Rods here per mm²</span><b>${k(r)}</b></div>
          <div class="row"><span>Colour vision</span><b>${vmx.cones > 0.9 ? 'full' : vmx.cones > 0.05 ? 'fading' : 'none'}</b></div>
          <small>${s.ecc < 1.2 ? 'The fovea: only cones, packed tight, with the other layers pushed aside into a pit.' : 'Cells are coloured by type: cones red, green and blue; rods purple.'}</small>`;
      },
    });
    return api;
  },
};
