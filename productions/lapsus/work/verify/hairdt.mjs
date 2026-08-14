// hairdt.mjs — measure the frame rate the hair simulation was stepped at.
//
//   node productions/lapsus/work/verify/hairdt.mjs
//
// WHY THIS EXISTS. Everything else about the hair is readable out of the
// binary — the file format, the material, the normals, the draw state, the
// integrator itself. One thing is not: the step size. `HairMesh::update` is
// handed the real elapsed QPC time, so the shape of a strand is a function of
// the frame rate the demo happened to be running at, and RENDER.md §11.1 is
// explicit that this is load-bearing rather than incidental — "same dt => same
// image; different dt => visibly different hair". The integrator is explicit
// and each step ends in a hard length projection, so the balance between
// "stay where you were" (magnitude ~segment length), "align with the previous
// tangent" (~len * dt * stiffness) and gravity (~dt * g) shifts with dt. Small
// steps remember the previous pose and the strands stay straight; large steps
// forget it and the strands curl.
//
// At the assumed 1/60 our strands fly outward nearly straight while the
// capture's are curled into a dense ball. So 1/60 is not obviously right, and
// guessing a prettier number would be exactly the kind of fitting this project
// does not do.
//
// WHAT MAKES THIS A MEASUREMENT AND NOT A FIT. The unknown is a single
// physical quantity — the frame period of the machine the capture was made on
// — and it is shared. krediili (phase 1, 1000 strands, two meshes) and
// hairball (phase 2, 1020 strands, three meshes) are different scenes, at
// different points in the demo, with different hair files, cameras and
// gravity-to-stiffness ratios. One free parameter cannot fit both by accident.
// So the test is not "which dt scores best" but:
//
//   * do the two parts peak at the SAME dt, and
//   * is that dt a plausible frame period for the hardware?
//
// If they disagree, dt is not the explanation and nothing should be adopted —
// the honest outcome is to leave 1/60 in place and record the negative result.
// Each part is also swept at two different times, because a value that is
// really the frame period must hold across the part, not just at its midpoint.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { withPage, shootCanvas, fromRepo } from '../../../../tools/harness/index.mjs';

const W = 640, H = 480, N = W * H;
// scene -> [phase, partStart, localTimes to probe]
const CASES = {
  krediili: [1, 31, [5, 11]],
  hairball: [2, 29.7, [2.5, 5.0]],
};
// Frame periods worth testing, as periods not rates: 1/60 is the assumption in
// place, and the rest bracket what a 2000-vintage machine plausibly sustained
// on 9000 lit lines.
const DTS = [1 / 60, 1 / 50, 1 / 40, 1 / 30, 1 / 25, 1 / 20, 1 / 15, 1 / 12];

const prod = JSON.parse(fs.readFileSync(fromRepo('productions/lapsus/prod.json'), 'utf8'));
const cap = prod.captures[0];
const OFF = {
  1: cap.trackOffsetsMs['data/mjuusik/1.mp3'] / 1000,
  2: cap.trackOffsetsMs['data/mjuusik/2.mp3'] / 1000,
};
const TMP = path.join(process.env.TMPDIR ?? '/tmp', 'lapsus-hairdt');
fs.mkdirSync(TMP, { recursive: true });

const gray = (png, out) => {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-vf',
    `scale=${W}:${H},format=gray`, '-f', 'rawvideo', out]);
  return fs.readFileSync(out);
};
const corr = (a, b) => {
  let ma = 0, mb = 0;
  for (let i = 0; i < N; i++) { ma += a[i]; mb += b[i]; }
  ma /= N; mb /= N;
  let d = 0, sa = 0, sb = 0;
  for (let i = 0; i < N; i++) { const u = a[i] - ma, v = b[i] - mb; d += u * v; sa += u * u; sb += v * v; }
  return d / Math.sqrt(sa * sb || 1);
};

const best = {};
for (const [scene, [phase, start, locals]] of Object.entries(CASES)) {
  console.log(`\n${scene}  (phase ${phase})`);
  const perDt = DTS.map(() => []);
  for (const local of locals) {
    const capture = OFF[phase] + start + local;
    const refPng = path.join(TMP, `${scene}_${local}_ref.png`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(capture), '-i', fromRepo(cap.path),
      '-frames:v', '1', '-vf', `scale=${W}:${H}`, refPng]);
    const ref = gray(refPng, path.join(TMP, 'ref.raw'));
    const line = [];
    for (let i = 0; i < DTS.length; i++) {
      const dt = DTS[i];
      const png = path.join(TMP, `${scene}_${local}_${i}.png`);
      await withPage(
        { root: 'productions/lapsus', path: '/web/index.html',
          query: `?scene=${scene}&t=${local}&hairdt=${dt}`,
          width: W, height: H, viewport: { width: W, height: H } },
        async ({ page }) => {
          await page.waitForFunction('window.__lapsusReady === true', { timeout: 60000 });
          const err = await page.evaluate(() => window.__lapsusError ?? null);
          if (err) throw new Error('renderer: ' + err);
          fs.writeFileSync(png, await shootCanvas(page, { canvasSelector: '#c', warmupFrames: 2 }));
        });
      const r = corr(gray(png, path.join(TMP, 'ours.raw')), ref);
      perDt[i].push(r);
      line.push(r);
    }
    console.log(`  t=${local}s   ` + DTS.map((d, i) =>
      `1/${Math.round(1 / d)}:${line[i].toFixed(3)}`).join('  '));
  }
  // score a dt by its WORST time, so a value only wins if it holds across the
  // part rather than getting lucky at one instant
  const worst = perDt.map((rs) => Math.min(...rs));
  let bi = 0;
  for (let i = 1; i < worst.length; i++) if (worst[i] > worst[bi]) bi = i;
  best[scene] = { dt: DTS[bi], fps: Math.round(1 / DTS[bi]), worst: worst[bi] };
  console.log(`  best (by worst-case across times): 1/${best[scene].fps}s  r=${worst[bi].toFixed(3)}`);
}

const fps = Object.values(best).map((b) => b.fps);
console.log('\n' + '-'.repeat(60));
if (new Set(fps).size === 1) {
  console.log(`AGREE: both parts peak at 1/${fps[0]}s. One shared physical quantity,`);
  console.log('two independent scenes — this is a measurement of the capture frame rate.');
} else {
  console.log(`DISAGREE: ${Object.entries(best).map(([s, b]) => `${s} 1/${b.fps}`).join(', ')}.`);
  console.log('One frame period cannot be two values, so dt is NOT the whole story here.');
  console.log('Adopt nothing; leave 1/60 and record the negative result.');
}
