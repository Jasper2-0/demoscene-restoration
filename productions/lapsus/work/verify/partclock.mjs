// partclock.mjs — sweep ONE part's render time against a fixed capture frame.
//
//   node productions/lapsus/work/verify/partclock.mjs <scene> <partStart> <local> [phase]
//   node productions/lapsus/work/verify/partclock.mjs flu2 14 4.5 1
//
// WHY. A part can score badly for two completely different reasons: it is
// drawn wrong, or it is drawn at the wrong moment. Those want opposite work,
// and whole-frame correlation at a single time cannot tell them apart — a
// shading error and a 100ms offset both just look like "low r".
//
// This is the same instrument that found the 240ms phase-2 clock error, aimed
// at one part instead of a whole phase. Hold the capture frame fixed, sweep
// the render time, and look at the SHAPE: a sharp peak away from zero is a
// clock error and no amount of shading work will fix it; a flat curve peaking
// at zero means the timing is right and the residual is in the rendering.
//
// Read the peak, not the score. If several parts of the same phase agree on a
// non-zero offset that is a phase-clock problem (fix the origin once); if only
// one part does, it is that part's schedule entry.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { withPage, shootCanvas, fromRepo } from '../../../../tools/harness/index.mjs';

const W = 640, H = 480, N = W * H;
const scene = process.argv[2];
const start = parseFloat(process.argv[3]);
const local = parseFloat(process.argv[4]);
const phase = parseInt(process.argv[5] ?? '1', 10);
if (!scene || !Number.isFinite(start) || !Number.isFinite(local)) {
  console.error('usage: partclock.mjs <scene> <partStart> <local> [phase]');
  process.exit(2);
}

const prod = JSON.parse(fs.readFileSync(fromRepo('productions/lapsus/prod.json'), 'utf8'));
const cap = prod.captures[0];
const offsets = cap.visualTrackOffsetsMs ?? cap.trackOffsetsMs;
const off = offsets[phase === 1 ? 'data/mjuusik/1.mp3' : 'data/mjuusik/2.mp3'] / 1000;
const TMP = path.join(process.env.TMPDIR ?? '/tmp', 'lapsus-partclock');
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

const refPng = path.join(TMP, 'ref.png');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(off + start + local),
  '-i', fromRepo(cap.path), '-frames:v', '1', '-vf', `scale=${W}:${H}`, refPng]);
const ref = gray(refPng, path.join(TMP, 'ref.raw'));

console.log(`${scene}  phase ${phase}  part start ${start}s  local ${local}s`);
const rows = [];
for (const dt of [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3]) {
  const t = local + dt;
  const png = path.join(TMP, `${scene}${dt}.png`);
  await withPage(
    { root: 'productions/lapsus', path: '/web/index.html',
      query: `?scene=${scene}&t=${t}`, width: W, height: H,
      viewport: { width: W, height: H } },
    async ({ page }) => {
      await page.waitForFunction('window.__lapsusReady === true', { timeout: 60000 });
      const err = await page.evaluate(() => window.__lapsusError ?? null);
      if (err) throw new Error('renderer: ' + err);
      fs.writeFileSync(png, await shootCanvas(page, { canvasSelector: '#c', warmupFrames: 2 }));
    });
  const r = corr(gray(png, path.join(TMP, 'o.raw')), ref);
  rows.push([dt, r]);
  console.log(`  dt=${dt >= 0 ? '+' : ''}${dt.toFixed(1)}  r=${r.toFixed(3)}`);
}
let b = 0;
for (let i = 1; i < rows.length; i++) if (rows[i][1] > rows[b][1]) b = i;
const flat = Math.max(...rows.map((r) => r[1])) - Math.min(...rows.map((r) => r[1]));
console.log(`  peak at ${rows[b][0] >= 0 ? '+' : ''}${rows[b][0].toFixed(1)}s ` +
  `(r=${rows[b][1].toFixed(3)}), peak-to-trough ${flat.toFixed(3)}`);
