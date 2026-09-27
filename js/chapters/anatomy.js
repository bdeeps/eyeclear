// Chapter 1: the eyeball itself. Front (cornea, aqueous, iris and pupil, lens with its zonules and
// ciliary muscle), the wall (sclera, choroid, retina with macula, fovea and optic disc), the optic
// nerve, the six muscles that turn the eye and the eyelids. Light rays from far away are traced
// exactly through Le Grand's schematic eye (optics.js) and meet on the fovea.
// Facts: NEI "How the Eyes Work" (nei.nih.gov); AAO "Parts of the Eye" (aao.org); Gray's Anatomy.
// Optic nerve: about 1.2 million nerve fibres (Jonas et al., Invest Ophthalmol Vis Sci 33:2012, 1992).
// Blinking: about 15 to 20 times a minute at rest (AAO, "Blinking"; Doane, Am J Ophthalmol 89:507, 1980).
import { THREE } from '../kit.js';
import { makeEye, Rays, photons, compactReadout, fitNarrow, tint } from '../eye.js';
import { fan, powers } from '../optics.js';

const P = powers(0);

export default {
  id: 'anatomy',
  short: 'Inside the eye',
  title: 'Inside the human eye',
  subtitle: 'A ball of clear jelly with a lens at the front and a light sensor at the back.',
  view: { pos: [-2.4, 5.0, 12.6], target: [-2.6, 3.5, 0] },
  learn: `<p>Your eye is a ball about <b>24 mm</b> across, a bit smaller than a table-tennis ball. Light comes in through the clear dome at the front, the <b>cornea</b>, crosses a watery fluid, the <b>aqueous humour</b>, and passes through a hole, the <b>pupil</b>. The coloured ring around the pupil is the <b>iris</b>, a muscle that makes the hole bigger in the dark and smaller in bright light.</p>
    <p>Just behind the pupil sits the <b>lens</b>. It hangs from hundreds of fine threads, the <b>zonules</b>, which are tied to a ring of muscle, the <b>ciliary muscle</b>. Behind the lens, the eye is filled with a clear jelly, the <b>vitreous humour</b>.</p>
    <p>The wall has three layers. The tough white <b>sclera</b> is the outside, the dark, blood-rich <b>choroid</b> feeds the layer inside it, and the innermost layer is the <b>retina</b>, a thin sheet of light-sensing cells. Right in the middle of the back is the <b>macula</b>, with a tiny pit, the <b>fovea</b>, where you see the sharpest detail. A little towards your nose is the <b>optic disc</b>, where about <b>1.2 million</b> nerve fibres leave the eye as the <b>optic nerve</b>. There are no light-sensing cells on the disc, so it is your <b>blind spot</b>.</p>
    <p>Outside, <b>six muscles</b> turn the eye: four straight ones (the <b>rectus</b> muscles: up, down, in and out) and two slanted ones (the <b>obliques</b>). The <b>eyelids</b> sweep tears over the cornea about 15 to 20 times a minute to keep it clean and wet.</p>
    <p>If this sounds like a camera, it is: the iris is the aperture, the lens focuses and the retina is the sensor. <a href="/cameraclear/">CameraClear</a> shows the camera side of the story.</p>
    <p class="tip"><b>Try it:</b> switch X-ray off to see the muscles, then take the eye apart layer by layer. Switch light on and follow the rays to the fovea.</p>`,
  terms: [
    { t: 'Cornea', d: 'The clear dome at the front of the eye. It does about two-thirds of the focusing.' },
    { t: 'Iris and pupil', d: 'The coloured muscle ring and the hole in it that lets light in.' },
    { t: 'Lens', d: 'A clear, flexible disc behind the pupil that fine-tunes the focus.' },
    { t: 'Retina', d: 'The thin light-sensing layer lining the back of the eye.' },
    { t: 'Fovea', d: 'A tiny pit in the middle of the macula, packed with cones, where vision is sharpest.' },
    { t: 'Optic disc', d: 'Where the optic nerve leaves the eye. It has no light-sensing cells, so it is the blind spot.' },
    { t: 'Sclera', d: 'The tough white outer coat of the eye.' },
  ],
  defaults: { explode: 0, xray: true, light: true, labels: true, blink: true },
  controls: [
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'apart'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'xray', type: 'toggle', label: 'X-ray: cut the eye open' },
    { key: 'light', type: 'toggle', label: 'Light coming in' },
    { key: 'blink', type: 'toggle', label: 'Blinking' },
    { key: 'labels', type: 'toggle', label: 'Labels' },
  ],
  quiz: [
    { q: 'Which part of the eye does most of the focusing?', options: ['The lens', 'The cornea', 'The retina', 'The iris'], answer: 1, why: 'The curved cornea does about two-thirds of it (about 42 of the eye’s 60 dioptres). The lens fine-tunes the rest.' },
    { q: 'Why do you have a blind spot?', options: ['The lens has a scratch', 'Where the optic nerve leaves, there are no light-sensing cells', 'The fovea is too small', 'The eyelid covers part of the eye'], answer: 1, why: 'The optic disc is full of nerve fibres leaving the eye, with no rods or cones, so light landing there is not seen.' },
    { q: 'What does the iris do?', options: ['Senses colour', 'Changes the size of the pupil', 'Makes tears', 'Focuses the image'], answer: 1, why: 'The iris is a ring of muscle. It widens the pupil in dim light and narrows it in bright light, like a camera’s aperture.' },
  ],
  reel: [
    { ms: 5000, caption: 'Your eye is a 24 mm ball of clear jelly, turned by six muscles.', set: { explode: 0, xray: false, light: false, labels: false, blink: true }, view: { pos: [-4.4, 4.9, 7.9], target: [0.3, 3.1, 0] }, spin: 0.5 },
    { ms: 5600, caption: 'Light passes the cornea, the pupil and the lens, and lands on the retina at the back.', set: { explode: 0, xray: true, light: true, labels: false, blink: false }, view: { pos: [0.3, 3.6, 8.2], target: [0.3, 3.1, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const eye = makeEye(stage);
    eye.root.position.set(-0.9, 3.0, 0);
    stage.root.add(eye.root);
    const rays = new Rays(stage, eye.mm, { width: 2 });
    const ph = photons(eye.mm, 70, 0xfff1b0, 0.3);
    const traced = fan(7, 1.7, { startX: -22 });
    const polys = traced.map((r) => ({ pts: r.pts, col: [1, 0.86, 0.45] }));
    rays.lines(polys, 0.05); ph.setPaths(polys.map((p) => ({ ...p, z: 0.05 })));
    const lightL = tint(stage.label('Light from far away', [-18, 4.2, 0], eye.mm), 'light');
    const focusL = tint(stage.label('Rays meet on the fovea', [27, -5, 0], eye.mm), 'light');
    let xr = 1, lids = 1, blinkT = 0, t = 0;
    const fit = fitNarrow(stage, { pos: [0.9, 4.6, 13.5], target: [0.9, 3.9, 0] });
    return compactReadout(stage, {
      update(dt, s, time) {
        dt = Math.max(0, dt); t += dt;
        xr += ((s.xray ? 1 : 0) - xr) * Math.min(1, dt * 5);
        eye.setXray(xr); eye.setExplode(s.explode);
        const narrow = fit(); stage.css.domElement.style.visibility = '';
        eye.showLabels(s.labels, narrow);
        // A blink every ~4 s: the lids close in about 0.1 s and reopen in about 0.2 s.
        let close = 0;
        if (s.blink) { blinkT = (t % 4.2); close = blinkT < 0.1 ? blinkT / 0.1 : blinkT < 0.3 ? 1 - (blinkT - 0.1) / 0.2 : 0; }
        lids += (1 - close - lids) * Math.min(1, dt * 30);
        eye.setLids(-2.3 + 6.8 * lids, -2.3 - 3.2 * lids);
        const show = s.light && s.explode < 0.05 && xr > 0.5;
        rays.group.visible = ph.visible = show;
        lightL.visible = focusL.visible = show && s.labels && !narrow;
        if (show) ph.tick(time, 16);
      },
      readout: (s) => `<div class="big">A 24 mm camera</div>
        <div class="row"><span>Focusing power</span><b>${Math.round(P.eye)} D (cornea ${Math.round(P.cornea)}, lens ${Math.round(P.lens)})</b></div>
        <div class="row"><span>Light-sensing cells</span><b>~120 million rods, ~6 million cones</b></div>
        <div class="row"><span>Optic nerve</span><b>~1.2 million fibres</b></div>
        <small>${s.xray ? 'Cut open from the side: the front of the eye faces left.' : 'This is a right eye seen from the side, with the eyelids open.'}</small>`,
    });
  },
};
