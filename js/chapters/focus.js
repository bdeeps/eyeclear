// Chapter 2: focusing. The cornea does about two-thirds of the bending (≈42 D of Le Grand's 60 D)
// and the lens the rest (≈22 D relaxed). To see something near, the ciliary muscle contracts, the
// zonules slacken and the lens rounds up (Helmholtz's theory of accommodation, widely accepted; see
// Glasser & Kaufman, Ophthalmology 106:863, 1999). Rays are traced exactly through the lens shape
// the eye can reach at the chosen age. How much extra focusing an eye can add (the amplitude of
// accommodation) falls with age: Duane's measurements (JAMA 79:1176, 1922) and Hofstetter's
// average line, 18.5 − 0.3 × age (Am J Optom 27:361, 1950). This is presbyopia (NEI, AAO).
import { THREE, approach } from '../kit.js';
import { makeEye, rayRig, board, boardBg, compactReadout, fitNarrow, tint } from '../eye.js';
import { amplitude, hofstetter, shapeFor, powers, focusVergence, DUANE, AXIAL } from '../optics.js';

const V0 = focusVergence(0);
const distFmt = (m) => (m >= 6 ? 'far away (6 m+)' : m >= 1 ? m.toFixed(1) + ' m' : Math.round(m * 100) + ' cm');
export const need = (m) => (m >= 6 ? 0 : 1 / m);

// "What you see": an eye-chart card blurred by the defocus (illustrative scale).
export function drawChart(g, x, y, w, h, blurPx, title = 'What you see', opts = {}) {
  g.save();
  g.fillStyle = '#f4f1ea'; g.beginPath(); g.roundRect(x, y, w, h, 14); g.fill();
  g.beginPath(); g.roundRect(x, y, w, h, 14); g.clip();
  g.filter = blurPx > 0.2 ? `blur(${blurPx.toFixed(1)}px)` : 'none';
  if (opts.draw) opts.draw(g, x, y, w, h);
  else {
    g.fillStyle = '#16181d'; g.textAlign = 'center';
    [['E', 96], ['F P', 64], ['T O Z', 46], ['L P E D', 34], ['P E C F D', 25]].reduce((yy, [t, s]) => { g.font = `bold ${s}px sans-serif`; g.fillText(t.split(' ').join('  '), x + w / 2, yy + s); return yy + s * 1.28; }, y + 22);
  }
  g.restore();
  g.fillStyle = 'rgba(232,238,248,.8)'; g.font = 'bold 24px sans-serif'; g.textAlign = 'left'; g.fillText(title, x + 4, y - 14);
}

function drawDuane(g, x, y, w, h, s) {
  const X = (a) => x + 46 + ((a - 5) / 70) * (w - 60), Y = (d) => y + h - 34 - (d / 16) * (h - 60);
  g.font = '22px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)';
  for (let d = 0; d <= 16; d += 4) { g.strokeStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(X(5), Y(d)); g.lineTo(X(75), Y(d)); g.stroke(); g.fillText(d, x + 8, Y(d) + 6); }
  for (let a = 10; a <= 70; a += 10) g.fillText(a, X(a) - 10, y + h - 8);
  g.fillText('D', x + 12, Y(16) - 26); g.fillText('age', X(75) - 30, y + h - 8);
  // Hofstetter's average line
  g.setLineDash([8, 7]); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(8), Y(hofstetter(8))); g.lineTo(X(58), Y(hofstetter(58))); g.stroke(); g.setLineDash([]);
  // Duane's mean curve
  g.strokeStyle = '#ffd166'; g.lineWidth = 4; g.beginPath(); DUANE.forEach(([a, d], i) => (i ? g.lineTo(X(a), Y(d)) : g.moveTo(X(a), Y(d)))); g.stroke();
  // needed for the object
  const n = need(s.dist);
  g.strokeStyle = '#7ef0b0'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(X(5), Y(Math.min(16, n))); g.lineTo(X(75), Y(Math.min(16, n))); g.stroke();
  g.fillStyle = '#7ef0b0'; g.font = 'bold 22px sans-serif'; g.fillText(`needed ${n.toFixed(1)} D`, X(50), Y(Math.min(16, n)) - 10);
  const A = amplitude(s.age);
  g.fillStyle = A >= n ? '#7ef0b0' : '#ff8a94'; g.beginPath(); g.arc(X(s.age), Y(A), 9, 0, 7); g.fill();
  g.fillStyle = '#ffd166'; g.font = 'bold 26px sans-serif'; g.fillText('Focusing range by age', x + 46, y + 26);
  g.font = '19px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText('Duane 1922 (gold), Hofstetter (dashed)', x + 46, y + 52);
}

export default {
  id: 'focus',
  short: 'Focusing',
  title: 'How the eye focuses',
  subtitle: 'A fixed cornea, a lens that changes shape, and an upside-down picture.',
  view: { pos: [-0.6, 6.6, 16.5], target: [-0.6, 5.7, 0] },
  learn: `<p>Light only makes a sharp picture if every ray from one point of an object lands on one point of the retina. Bending light to do that is called <b>focusing</b>, and it happens at curved, clear surfaces: light bends as it slows down entering the eye (the physics is Snell's law of refraction, which our upcoming SnellClear box explains).</p>
    <p>The eye has about <b>60 dioptres</b> of focusing power. The <b>cornea</b> does about two-thirds of it, around <b>42 D</b>, because the jump from air into the cornea is the biggest change of speed. The <b>lens</b> adds about <b>20 D</b>. A dioptre is 1 divided by the focal length in metres.</p>
    <p>The cornea is fixed, so the lens does the adjusting. Looking far away, the <b>ciliary muscle</b> relaxes, its ring is wide, the zonules pull tight and the lens is flat. To look at something near, the muscle <b>contracts</b>, the zonules go slack and the springy lens <b>rounds up</b>, adding power. This is <b>accommodation</b>. A camera moves its lens instead: compare <a href="/cameraclear/#focus">CameraClear's focus chapter</a>.</p>
    <p>The picture on the retina is <b>upside down</b> and flipped left to right, just like in a camera. Your brain learns to read it the right way up.</p>
    <p>With age, the lens stiffens. A 10-year-old can focus on something about 7 cm away; by about 45 the <b>near point</b> has moved past arm's length, which is why many people need reading glasses in their 40s. This is <b>presbyopia</b>, and it happens to everyone.</p>
    <p class="tip"><b>Try it:</b> bring the object close and watch the lens bulge, then raise the age until the rays can't meet on the retina any more.</p>`,
  terms: [
    { t: 'Dioptre (D)', d: 'A unit of focusing power: 1 divided by the focal length in metres. A 2 D lens focuses parallel light 50 cm away.' },
    { t: 'Accommodation', d: 'The eye changing its lens shape to focus on near things.' },
    { t: 'Ciliary muscle', d: 'The ring of muscle that controls the lens shape through the zonules.' },
    { t: 'Near point', d: 'The closest distance at which you can see something sharply.' },
    { t: 'Presbyopia', d: 'The age-related loss of near focusing, as the lens stiffens. It usually shows in the 40s.' },
  ],
  defaults: { dist: 0.33, age: 15, tip: true },
  controls: [
    { key: 'dist', type: 'log', label: 'How far away the object is', min: 0.1, max: 6.5, ends: ['10 cm', 'far away'], fmt: (v) => distFmt(v) },
    { key: 'age', type: 'range', label: 'Age of the eye', min: 8, max: 72, step: 1, ends: ['8', '72'], fmt: (v) => Math.round(v) + ' years' },
    { key: 'tip', type: 'toggle', label: 'Show the upside-down image' },
  ],
  quiz: [
    { q: 'Which part of the eye does about two-thirds of the focusing?', options: ['The lens', 'The cornea', 'The pupil', 'The vitreous'], answer: 1, why: 'The cornea gives about 42 of the eye’s 60 dioptres. The lens adds the rest and is the part that adjusts.' },
    { q: 'To focus on a book close to your face, the lens…', options: ['Gets flatter', 'Gets rounder, adding power', 'Moves backwards', 'Stays the same'], answer: 1, why: 'The ciliary muscle contracts, the zonules slacken and the elastic lens rounds up.' },
    { q: 'Why do many people need reading glasses after about 45?', options: ['Their eyeballs grow', 'Their lens has stiffened and can no longer round up enough', 'Their cornea gets thinner', 'Their retina has fewer cones'], answer: 1, why: 'This is presbyopia. The range of accommodation shrinks from about 14 D in childhood to about 1 D by 60.' },
  ],
  reel: [
    { ms: 5600, caption: 'The cornea does two-thirds of the focusing. The lens rounds up to focus on near things.', set: { age: 15, tip: false }, anim: { dist: [6.5, 0.15, true] }, view: { pos: [0.8, 5.6, 13], target: [0.8, 5.0, 0] }, spin: 0 },
    { ms: 5400, caption: 'After about 45 the lens stiffens, and the picture of a near book stays blurry.', set: { dist: 0.3, tip: true }, anim: { age: [20, 60] }, view: { pos: [0.8, 5.6, 13], target: [0.8, 5.0, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const eye = makeEye(stage, { muscles: false, lids: false, labels: false, cut: Math.PI, cutAt: 0 });
    eye.root.position.set(3.5, 6.8, 0); eye.nerveG.visible = false; eye.root.scale.setScalar(0.24);
    stage.root.add(eye.root);
    eye.setPupil(2.0);
    const rig = rayRig(stage, eye);
    const labs = {
      cornea: tint(stage.label('Cornea ~42 D', [-3, -8.5, 0], eye.mm), 'light'),
      lens: tint(stage.label('', [6, -9.5, 0], eye.mm), 'light'),
      cil: tint(stage.label('', [7, 13, 0], eye.mm), 'red'),
      obj: tint(stage.label('', [-24, -3.2, 0], eye.mm), 'green'),
      focus: tint(stage.label('', [27, -13.5, 0], eye.mm), 'gold'),
    };
    let k = 0, last = '';
    const panel = board(stage.root, 10.4, 3.9, 1000, (g, w, h, st) => {
      boardBg(g, w, h);
      drawChart(g, 24, 58, 360, h - 80, st.blur);
      drawDuane(g, 400, 12, w - 414, h - 22, st.s);
    });
    panel.mesh.position.set(-0.6, 2.1, 0.4);
    const fit = fitNarrow(stage, { pos: [0.6, 7.0, 16], target: [0.6, 6.0, 0] });
    let info = { xf: AXIAL };
    const api = compactReadout(stage, {
      update(dt, s, time) {
        dt = Math.max(0, dt); stage.css.domElement.style.visibility = fit() ? 'hidden' : '';
        const n = need(s.dist), A = amplitude(s.age);
        k = approach(k, shapeFor(Math.min(n, A)), 5, dt);
        eye.setAccom(k);
        const key = [k.toFixed(3), s.dist.toFixed(3), s.tip].join();
        if (key !== last) {
          last = key;
          info = rig.draw({ k, objDist: s.dist >= 6 ? Infinity : s.dist * 1000, L: AXIAL, spec: null, pupil: 1.8, tip: s.tip, field: 7 });
          const P = powers(k), acc = focusVergence(k) - V0;
          api.state = { P, acc, n, A, defocus: Math.max(0, n - acc) };
          labs.lens.element.innerHTML = `Lens ${Math.round(P.lens)} D`;
          labs.cil.element.innerHTML = k > 0.15 ? 'Ciliary muscle: squeezing' : 'Ciliary muscle: relaxed';
          labs.obj.element.innerHTML = `Object ${distFmt(s.dist)} <small>(not to scale)</small>`;
          const d = api.state.defocus;
          labs.focus.element.innerHTML = d > 0.25 ? `Would focus ${(info.xf - AXIAL).toFixed(1)} mm behind the retina` : '';
          labs.focus.visible = d > 0.25;
          panel.redraw({ blur: Math.min(18, d * 5), s: { ...s } });
        }
        rig.tick(time);
      },
      readout: (s) => {
        const st = api.state; if (!st) return '';
        const sharp = st.defocus <= 0.25;
        return `<div class="big">${sharp ? 'Sharp' : 'Blurry'}</div>
          <div class="row"><span>Focusing needed</span><b>${st.n.toFixed(1)} D</b></div>
          <div class="row"><span>Lens adds now (max)</span><b>${st.acc.toFixed(1)} D (${st.A.toFixed(1)} D)</b></div>
          <div class="row"><span>Near point at ${Math.round(s.age)}</span><b>${Math.round(100 / st.A)} cm</b></div>
          <small>${sharp ? 'Rays from each point meet on the retina.' : 'The lens can’t round up enough: the rays would meet behind the retina.'}</small>`;
      },
    });
    return api;
  },
};
