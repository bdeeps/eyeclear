// Chapter 6: keeping eyes healthy, and what goes wrong. General facts only, never advice about a
// particular person: anyone with a worry should see an optometrist or ophthalmologist.
// Cataract: a clouded lens; the leading cause of blindness worldwide (15.2 million of the ~43
// million blind people aged 50+ in 2020: GBD 2019 Blindness and Vision Impairment Collaborators,
// Lancet Glob Health 9:e144, 2021) and in India (66.2% of blindness in people aged 50+, National
// Blindness & Visual Impairment Survey 2015–19). Treated by removing the lens and fitting an
// intraocular lens (IOL). India performed about 8.3 million cataract operations in 2022–23 under
// its national programme (PIB, Ministry of Health, 2023).
// Glaucoma: damage to the optic nerve, often linked to raised eye pressure; normal pressure is
// roughly 10–21 mmHg but damage can happen at normal pressure too; early loss is usually unnoticed
// and permanent (NEI "Glaucoma"; AAO). Aqueous humour is made by the ciliary body, flows through
// the pupil and drains at the angle (trabecular meshwork); poor drainage raises the pressure.
// Diabetic retinopathy: damage to retinal blood vessels from high blood sugar; a leading cause of
// vision loss in working-age adults; yearly dilated eye exams are advised for people with diabetes
// (NEI "Diabetic Retinopathy"; American Diabetes Association Standards of Care).
// Screens: the 20-20-20 rule (every 20 minutes, look 20 feet away for 20 seconds) is recommended by
// the AAO and widely credited to optometrist Jeffrey Anshel; screens cause strain but no lasting
// damage is known (AAO "Computers, Digital Devices and Eye Strain"). UV: sunglasses that block
// 99–100% of UVA and UVB (AAO).
import { THREE, approach, lerp } from '../kit.js';
import { makeEye, rayRig, board, boardBg, compactReadout, fitNarrow, tint, Rays, photons } from '../eye.js';
import { AXIAL, shapeFor } from '../optics.js';

const CONDS = {
  cataract: { name: 'Cataract', facts: ['The lens slowly turns cloudy, usually with age.', 'Leading cause of blindness in the world and in India.', 'Surgery swaps it for a clear plastic lens (IOL).', 'India does millions of these operations a year.'] },
  glaucoma: { name: 'Glaucoma', facts: ['Damage to the optic nerve, often with high eye pressure.', 'Early loss is at the edges and goes unnoticed.', 'Lost vision can’t be restored, so early checks matter.', 'Drops, laser or surgery can protect what is left.'] },
  diabetes: { name: 'Diabetic retinopathy', facts: ['High blood sugar damages the retina’s tiny vessels.', 'They leak and bleed; new weak vessels may grow.', 'People with diabetes need an eye check every year.', 'Laser and injections can save sight if caught early.'] },
  screens: { name: 'Screens and eye strain', facts: ['Close work keeps the ciliary muscle squeezing.', 'We blink much less when we stare at screens.', '20-20-20: every 20 min, look 20 ft (6 m) away for 20 s.', 'Kids: time outdoors helps. Sunglasses block UV.'] },
};

// A street scene, then the condition drawn over it (illustrations, not diagnoses).
function street(g, x, y, w, h) {
  const sky = g.createLinearGradient(0, y, 0, y + h * 0.6); sky.addColorStop(0, '#6fb3e8'); sky.addColorStop(1, '#cfe7f7');
  g.fillStyle = sky; g.fillRect(x, y, w, h);
  g.fillStyle = '#fff4c2'; g.beginPath(); g.arc(x + w * 0.82, y + h * 0.2, h * 0.08, 0, 7); g.fill();
  g.fillStyle = '#8a8f96'; g.fillRect(x, y + h * 0.66, w, h * 0.34);
  g.fillStyle = '#f1f1f1'; for (let i = 0; i < 6; i++) g.fillRect(x + i * w * 0.18 + 10, y + h * 0.82, w * 0.08, 5);
  g.fillStyle = '#d9824a'; g.fillRect(x + w * 0.08, y + h * 0.32, w * 0.3, h * 0.36);
  g.fillStyle = '#a3432a'; g.beginPath(); g.moveTo(x + w * 0.05, y + h * 0.33); g.lineTo(x + w * 0.23, y + h * 0.14); g.lineTo(x + w * 0.41, y + h * 0.33); g.fill();
  g.fillStyle = '#2c4a66'; g.fillRect(x + w * 0.13, y + h * 0.42, w * 0.07, h * 0.1); g.fillRect(x + w * 0.26, y + h * 0.42, w * 0.07, h * 0.1);
  g.fillStyle = '#6b4424'; g.fillRect(x + w * 0.6, y + h * 0.4, 8, h * 0.28);
  g.fillStyle = '#3f8f3a'; g.beginPath(); g.arc(x + w * 0.6 + 4, y + h * 0.36, h * 0.13, 0, 7); g.fill();
  g.fillStyle = '#1b6e3a'; g.fillRect(x + w * 0.44, y + h * 0.36, w * 0.13, h * 0.12); g.fillStyle = '#fff'; g.font = `bold ${Math.round(h * 0.07)}px sans-serif`; g.fillText('BUS 21', x + w * 0.452, y + h * 0.445);
  g.fillStyle = '#555'; g.fillRect(x + w * 0.5, y + h * 0.48, 4, h * 0.2);
}
function drawView(g, x, y, w, h, s) {
  g.save(); g.beginPath(); g.roundRect(x, y, w, h, 14); g.clip();
  const sev = s.cond === 'cataract' && s.iol ? 0 : s.sev;
  g.filter = s.cond === 'cataract' ? `blur(${(sev * 5).toFixed(1)}px)` : s.cond === 'diabetes' ? `blur(${(sev * 2.5).toFixed(1)}px)` : s.cond === 'screens' && !s.far ? 'blur(0px)' : 'none';
  street(g, x, y, w, h);
  g.filter = 'none';
  if (s.cond === 'cataract' && sev > 0) {
    g.fillStyle = `rgba(190,150,60,${sev * 0.45})`; g.fillRect(x, y, w, h);
    g.fillStyle = `rgba(255,255,240,${sev * 0.35})`; g.fillRect(x, y, w, h);
    const gl = g.createRadialGradient(x + w * 0.82, y + h * 0.2, 5, x + w * 0.82, y + h * 0.2, h * (0.1 + sev * 0.5)); gl.addColorStop(0, `rgba(255,255,230,${0.3 + sev * 0.6})`); gl.addColorStop(1, 'rgba(255,255,230,0)');
    g.fillStyle = gl; g.fillRect(x, y, w, h);
  }
  if (s.cond === 'glaucoma' && sev > 0) {
    // loss starts in patches away from the centre and closes in
    const cx = x + w / 2, cy = y + h / 2, R = Math.hypot(w, h) / 2;
    const r0 = R * (1.05 - sev * 0.8);
    const gr = g.createRadialGradient(cx, cy, r0 * 0.55, cx, cy, r0 * 1.1); gr.addColorStop(0, 'rgba(8,8,10,0)'); gr.addColorStop(1, 'rgba(8,8,10,0.96)');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.fillStyle = `rgba(8,8,10,${Math.min(0.9, sev * 1.2)})`; g.beginPath(); g.ellipse(cx - w * 0.15, cy - h * 0.28, w * 0.2 * sev, h * 0.12 * sev, 0.3, 0, 7); g.fill();
  }
  if (s.cond === 'diabetes' && sev > 0) {
    let seed = 9; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const n = Math.round(sev * 14);
    for (let i = 0; i < n; i++) { const r = (0.03 + rnd() * 0.06) * h; const gg = g.createRadialGradient(0, 0, 0, 0, 0, r); gg.addColorStop(0, 'rgba(20,10,10,.85)'); gg.addColorStop(1, 'rgba(20,10,10,0)'); g.save(); g.translate(x + w * (0.25 + rnd() * 0.5), y + h * (0.2 + rnd() * 0.6)); g.fillStyle = gg; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.restore(); }
  }
  if (s.cond === 'screens') {
    if (!s.far) { g.fillStyle = 'rgba(10,12,18,.55)'; g.fillRect(x, y, w, h); g.fillStyle = '#111'; g.beginPath(); g.roundRect(x + w * 0.33, y + h * 0.1, w * 0.34, h * 0.8, 18); g.fill(); g.fillStyle = '#e8eef8'; g.beginPath(); g.roundRect(x + w * 0.35, y + h * 0.15, w * 0.3, h * 0.7, 8); g.fill(); g.fillStyle = '#333'; g.font = `${Math.round(h * 0.06)}px sans-serif`; for (let i = 0; i < 6; i++) g.fillRect(x + w * 0.37, y + h * (0.22 + i * 0.1), w * (0.2 + (i % 3) * 0.03), h * 0.03); }
  }
  g.restore();
}
function drawHealth(g, w, h, s) {
  boardBg(g, w, h);
  const c = CONDS[s.cond];
  g.fillStyle = 'rgba(232,238,248,.85)'; g.font = 'bold 24px sans-serif';
  g.fillText(s.cond === 'screens' ? (s.far ? 'Looking 6 m away: muscle relaxes' : 'Close up on a phone') : 'What it can look like (illustration)', 24, 42);
  drawView(g, 24, 58, 420, h - 80, s);
  g.fillStyle = '#ffd166'; g.font = 'bold 28px sans-serif'; g.fillText(c.name + (s.cond === 'cataract' && s.iol ? ': after surgery' : ''), 466, 46);
  g.font = '25px sans-serif';
  let yy = 92;
  c.facts.forEach((f) => {
    const words = f.split(' '); let line = '', first = true;
    const put = () => { g.fillStyle = '#ffd166'; if (first) g.fillText('•', 466, yy); g.fillStyle = 'rgba(232,238,248,.9)'; g.fillText(line, 486, yy); yy += 31; first = false; };
    for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > w - 510) { put(); line = wd; } else line = t; }
    put(); yy += 8;
  });
  g.fillStyle = '#8ef0ff'; g.font = 'bold 22px sans-serif'; g.fillText('Worried about your eyes? See an eye doctor.', 466, h - 22);
}

export default {
  id: 'health',
  short: 'Healthy eyes',
  title: 'Keeping eyes healthy, and what goes wrong',
  subtitle: 'Cloudy lenses, pressure on the nerve, sugar in the vessels, and too much screen.',
  view: { pos: [-0.6, 6.6, 16.5], target: [-0.6, 5.7, 0] },
  learn: `<p>This chapter shares general facts only. If you notice any change in your sight, <b>see an optometrist or eye doctor</b>. Sudden loss of vision, a shower of new floaters or flashes, or a painful red eye need help the <b>same day</b>.</p>
    <p><b>Cataract.</b> With age the lens slowly turns cloudy and yellow, like a frosted window. Things look blurry and dull, and lights glare. Cataract is the <b>leading cause of blindness</b> in the world and in India. The fix is one of the most common operations anywhere: the surgeon removes the cloudy lens and puts in a clear plastic <b>intraocular lens (IOL)</b>. India does millions of them every year, many free.</p>
    <p><b>Glaucoma.</b> The eye is always making clear fluid, the aqueous humour, which drains out at the edge of the iris. If it drains too slowly the pressure can rise and slowly damage the <b>optic nerve</b>, so the pale cup in the optic disc grows. Vision fades from the edges first, so most people don't notice until a lot is lost, and lost sight can't come back. Regular eye checks, especially after 40 or if it runs in the family, catch it early.</p>
    <p><b>Diabetic retinopathy.</b> Years of high blood sugar damage the retina's tiny blood vessels. They leak and bleed, and fragile new ones can grow. People with diabetes are advised to have a <b>dilated eye check every year</b>.</p>
    <p><b>Screens and sun.</b> Staring at a phone keeps your ciliary muscle squeezing and you blink less, which can leave eyes tired and dry, though no lasting damage is known. The <b>20-20-20 rule</b>, recommended by the American Academy of Ophthalmology and widely credited to optometrist Jeffrey Anshel: every 20 minutes, look at something 20 feet (6 m) away for 20 seconds. Time outdoors helps children's eyes, sunglasses that block UV protect the lens and retina, and never look straight at the Sun.</p>
    <p class="tip"><b>Try it:</b> make the cataract worse, then press the surgery button. Switch to glaucoma and watch the fluid back up and the cup grow.</p>`,
  terms: [
    { t: 'Cataract', d: 'Clouding of the eye’s lens, most often with age. Treated with surgery.' },
    { t: 'Intraocular lens (IOL)', d: 'A small clear plastic lens that replaces the cloudy natural lens in cataract surgery.' },
    { t: 'Glaucoma', d: 'Damage to the optic nerve, often linked to high pressure inside the eye. Lost vision can’t be restored.' },
    { t: 'Eye pressure', d: 'The pressure of fluid inside the eye, roughly 10–21 mmHg in most people.' },
    { t: 'Diabetic retinopathy', d: 'Damage to the retina’s blood vessels caused by diabetes.' },
    { t: '20-20-20 rule', d: 'Every 20 minutes, look at something 20 feet (6 m) away for 20 seconds.' },
  ],
  defaults: { cond: 'cataract', sev: 0.5, iol: false, far: false },
  controls: [
    { key: 'cond', type: 'seg', label: 'Show', options: [{ v: 'cataract', label: 'Cataract' }, { v: 'glaucoma', label: 'Glaucoma' }, { v: 'diabetes', label: 'Diabetes' }, { v: 'screens', label: 'Screens' }] },
    { key: 'sev', type: 'range', label: 'How far along', min: 0, max: 1, step: 0.01, ends: ['none', 'advanced'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'fix', type: 'buttons', label: 'Treatment (by a surgeon)', items: [{ label: 'Cataract surgery: new lens', act: (s) => { s.cond = 'cataract'; s.iol = true; } }, { label: 'Reset', act: (s) => { s.iol = false; s.sev = 0.5; } }] },
    { key: 'far', type: 'toggle', label: 'Screens: look 6 m away (20-20-20)' },
  ],
  onChange(s, key) { if (key === 'far' && s.far) s.cond = 'screens'; if (key === 'sev' && s.cond === 'cataract') s.iol = false; },
  quiz: [
    { q: 'What is a cataract?', options: ['A scratch on the cornea', 'A clouding of the lens', 'A torn retina', 'A weak eye muscle'], answer: 1, why: 'The lens slowly turns cloudy, usually with age. Surgery replaces it with a clear intraocular lens.' },
    { q: 'Why are regular eye checks so important for glaucoma?', options: ['It is painful', 'Early vision loss is at the edges and usually goes unnoticed', 'It makes your eyes red', 'It always causes headaches'], answer: 1, why: 'Glaucoma steals side vision first and lost sight can’t come back, so it is best caught early by an eye check.' },
    { q: 'What does the 20-20-20 rule say?', options: ['Sleep 20 hours', 'Every 20 minutes, look 20 feet away for 20 seconds', 'Hold screens 20 cm away', 'Blink 20 times a minute'], answer: 1, why: 'Looking far away lets the focusing muscle relax and reminds you to blink.' },
  ],
  reel: [
    { ms: 6000, caption: 'Cataract, a cloudy lens, is the top cause of blindness. Surgery swaps in a clear plastic lens.', set: { cond: 'cataract', sev: 0.85 }, anim: { iol: [false, true] }, view: { pos: [0.8, 5.6, 13], target: [0.8, 5.0, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const eye = makeEye(stage, { muscles: false, lids: false, labels: false, cut: Math.PI, cutAt: 0 });
    eye.root.position.set(3.5, 6.8, 0); eye.root.scale.setScalar(0.24);
    stage.root.add(eye.root);
    eye.setPupil(2.0);
    const rig = rayRig(stage, eye);
    const scatter = new Rays(stage, eye.mm, { width: 1.6, opacity: 0.7 });
    // aqueous humour: made behind the iris, through the pupil, out at the drainage angle
    const aq = photons(eye.mm, 72, 0x8fd8ff, 0.22);
    const aqPath = (sgn) => ({ pts: [[5.0, 6.0 * sgn], [4.2, 4.2 * sgn], [3.75, 2.3 * sgn], [3.0, 1.8 * sgn], [1.8, 2.8 * sgn], [2.3, 4.6 * sgn], [3.0, 5.6 * sgn]], z: 0.1 });
    aq.setPaths([aqPath(1), aqPath(-1)]);
    const labs = {
      lens: tint(stage.label('', [6, -9.5, 0], eye.mm), 'gold'),
      disc: tint(stage.label('Optic nerve head', [22, 9.5, -4], eye.mm), 'gold'),
      drain: tint(stage.label('Fluid drains here', [1, -9.8, 0], eye.mm), 'blue'),
      dr: tint(stage.label('Bleeds and leaks', [20, -9.5, 0], eye.mm), 'red'),
      phone: tint(stage.label('', [-24, -4, 0], eye.mm), 'side'),
    };
    const b = board(stage.root, 10.4, 3.9, 1000, drawHealth);
    b.mesh.position.set(-0.6, 2.1, 0.4);
    const fit = fitNarrow(stage, { pos: [0.6, 7.0, 16], target: [0.6, 6.0, 0] });
    const CLEAR = new THREE.Color(0xeaf7ff), CLOUD = new THREE.Color(0xd4a84a);
    let last = '', k = 0, aqT = 0;
    const api = compactReadout(stage, {
      update(dt, s, time) {
        dt = Math.max(0, dt); stage.css.domElement.style.visibility = fit() ? 'hidden' : '';
        const near = s.cond === 'screens' && !s.far;
        k = approach(k, near ? shapeFor(2.5) : 0, 4, dt);
        eye.setAccom(k);
        const key = [s.cond, s.sev.toFixed(2), s.iol, s.far, k.toFixed(3)].join();
        if (key !== last) {
          last = key;
          const cat = s.cond === 'cataract' && !s.iol ? s.sev : 0;
          eye.lensMat.color.copy(CLEAR).lerp(CLOUD, cat); eye.lensMat.opacity = lerp(0.5, 0.95, cat);
          eye.lensG.visible = !(s.cond === 'cataract' && s.iol); eye.iol.visible = s.cond === 'cataract' && s.iol;
          eye.setCup(s.cond === 'glaucoma' ? lerp(0.3, 0.9, s.sev) : 0.3);
          eye.dr.visible = s.cond === 'diabetes';
          eye.dr.children.forEach((m) => { m.visible = m.userData.t < s.sev; });
          rig.draw({ k, objDist: near ? 400 : Infinity, L: AXIAL, spec: null, pupil: 1.8, tip: false });
          // a cloudy lens scatters light: stray rays fan out from the lens in all directions
          const pol = [];
          if (cat > 0.05) {
            let seed = 4; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
            for (let i = 0; i < Math.round(cat * 28); i++) { const y0 = (rnd() - 0.5) * 3.2, a = (rnd() - 0.5) * 1.3, L = 6 + rnd() * 12; pol.push({ pts: [[6.5, y0], [6.5 + Math.cos(a) * L, y0 + Math.sin(a) * L]], col: [0.9 * cat, 0.75 * cat, 0.35 * cat] }); }
          }
          scatter.lines(pol, 0.08);
          labs.lens.element.innerHTML = s.cond === 'cataract' ? (s.iol ? 'Clear plastic lens (IOL)' : 'Cloudy lens') : 'Lens';
          labs.lens.visible = s.cond === 'cataract' || s.cond === 'screens'; labs.disc.visible = s.cond === 'glaucoma'; labs.drain.visible = s.cond === 'glaucoma'; labs.dr.visible = s.cond === 'diabetes' && s.sev > 0.1;
          labs.phone.visible = near; labs.phone.element.innerHTML = 'Phone 40 cm away';
          b.redraw(s);
        }
        // aqueous flow slows as the drain blocks
        const flow = s.cond === 'glaucoma' ? lerp(1, 0.25, s.sev) : 1;
        aqT += dt * flow;
        aq.visible = s.cond === 'glaucoma';
        if (aq.visible) aq.tick(aqT, 5);
        rig.tick(time);
      },
      readout: (s) => {
        const c = CONDS[s.cond];
        if (s.cond === 'screens') return `<div class="big">${s.far ? 'Relaxed' : 'Focusing hard'}</div>
          <div class="row"><span>Focusing effort</span><b>${s.far ? 'about 0.2 D (6 m away)' : '2.5 D (phone at 40 cm)'}</b></div>
          <div class="row"><span>Ciliary muscle</span><b>${s.far ? 'relaxed' : 'squeezing'}</b></div>
          <small>Every 20 minutes, look 20 feet (6 m) away for 20 seconds, and remember to blink.</small>`;
        if (s.cond === 'glaucoma') return `<div class="big">${c.name}</div>
          <div class="row"><span>Cup of the optic disc</span><b>${Math.round(lerp(0.3, 0.9, s.sev) * 10) / 10} of its width</b></div>
          <div class="row"><span>Typical eye pressure</span><b>about 10–21 mmHg</b></div>
          <small>Damage can happen even at normal pressure. Only an eye check can find it early.</small>`;
        if (s.cond === 'cataract') return `<div class="big">${s.iol ? 'New clear lens' : c.name}</div>
          <div class="row"><span>Leading cause of blindness</span><b>worldwide and in India</b></div>
          <div class="row"><span>Treatment</span><b>surgery with an IOL</b></div>
          <small>Cataract surgery is quick and very common. An eye doctor decides when it is needed.</small>`;
        return `<div class="big">${c.name}</div>
          <div class="row"><span>Who is at risk</span><b>anyone with diabetes</b></div>
          <div class="row"><span>Advice for them</span><b>an eye check every year</b></div>
          <small>Keeping blood sugar, blood pressure and cholesterol in check protects the retina.</small>`;
      },
    });
    return api;
  },
};
