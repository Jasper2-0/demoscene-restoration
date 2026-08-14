// phase.mjs — is a part rendering at the wrong TIME?
//
//   node productions/lapsus/work/verify/phase.mjs paleksi 3.61 [span] [step]
//
// A low correlation says the picture is wrong; it does not say why. This
// separates one specific cause from all the others: render ONE frame of a
// part, then slide it against the capture and see which capture instant it
// actually matches. A part whose peak sits away from zero is rendering the
// right thing at the wrong moment, and no amount of work on its shading will
// help. A part whose peak sits AT zero but low is genuinely drawing the wrong
// picture.
//
// Rendering once and sliding the reference is deliberate — the render is the
// expensive half, and this way the scan costs one render plus N ffmpeg seeks.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { withPage, shootCanvas, fromRepo } from '../../../../tools/harness/index.mjs';

const W = 640, H = 480, N = W * H;
const part = process.argv[2] ?? 'paleksi';
const local = parseFloat(process.argv[3] ?? '3.61');
const span = parseFloat(process.argv[4] ?? '1.5');
const step = parseFloat(process.argv[5] ?? '0.1');

const prod = JSON.parse(fs.readFileSync(fromRepo('productions/lapsus/prod.json'), 'utf8'));
const cap = prod.captures[0];
const MKV = fromRepo(cap.path);
const offsets = cap.visualTrackOffsetsMs ?? cap.trackOffsetsMs;
const PHASE = {
  1: { off: offsets['data/mjuusik/1.mp3'] / 1000, parts: {
    empt: 1, flu2: 14, pene: 23, krediili: 31, silli: 47,
    syrjakyla: 55, paleksi: 64.531, pehko: 74.062, hulluolli: 83.593 } },
  2: { off: offsets['data/mjuusik/2.mp3'] / 1000, parts: {
    kuubiotekniikka: 0, diskojea: 13.8, kartonki: 22.3, hairball: 29.7,
    higherbiing: 36.7, viherio: 50.7, morko: 61.16, turska: 64.7,
    rad_out: 72.2, kaivoalieni: 86.2, made: 99.7, hedi: 105.2 } },
};
const ph = PHASE[1].parts[part] !== undefined ? PHASE[1] : PHASE[2];
if (ph.parts[part] === undefined) { console.error(`unknown part ${part}`); process.exit(2); }
const captureAt = ph.off + ph.parts[part] + local;

const TMP = path.join(process.env.TMPDIR ?? '/tmp', 'lapsus-phase');
fs.mkdirSync(TMP, { recursive: true });
const gray = (png, out) => {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-vf', `scale=${W}:${H},format=gray`, '-f', 'rawvideo', out]);
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

let ours = null;
await withPage(
  { root: 'productions/lapsus', path: '/web/index.html',
    query: `?scene=${part}&t=${local}`, width: W, height: H,
    viewport: { width: W, height: H } },
  async ({ page }) => {
    await page.waitForFunction('window.__lapsusReady === true', { timeout: 60000 });
    fs.writeFileSync(`${TMP}/o.png`, await shootCanvas(page, { canvasSelector: '#c', warmupFrames: 2 }));
    ours = gray(`${TMP}/o.png`, `${TMP}/o.raw`);
  });

console.log(`${part} local ${local}s  -> capture ${captureAt.toFixed(3)}s\n`);
console.log('  offset     capture       r');
const rows = [];
for (let d = -span; d <= span + 1e-9; d += step) {
  const t = captureAt + d;
  if (t < 0) continue;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', MKV,
    '-frames:v', '1', `${TMP}/r.png`]);
  const r = corr(ours, gray(`${TMP}/r.png`, `${TMP}/r.raw`));
  rows.push({ d: +d.toFixed(3), t: +t.toFixed(3), r });
}
const best = rows.reduce((a, b) => (b.r > a.r ? b : a));
for (const row of rows) {
  const mark = row === best ? '  <== best' : (Math.abs(row.d) < 1e-9 ? '   (aligned)' : '');
  console.log(`  ${String(row.d.toFixed(2)).padStart(6)}s  ${String(row.t.toFixed(2)).padStart(8)}s  ${row.r.toFixed(4)}${mark}`);
}
// A PEAK HAS TO BE A PEAK. Where the maximum sits means nothing on its own:
// if a frame matches nothing nearby, the scan is flat noise and its argmax
// lands wherever the noise is highest. Reporting that as a timing offset
// invents a finding — the peak has to beat the ALIGNED sample by a real margin
// before it counts as one. (An earlier version gated on that margin even when
// the peak was at zero, where the margin is zero by definition, and duly
// called a perfectly aligned control part misaligned.)
const atZero = rows.find((x) => Math.abs(x.d) < 1e-9);
const rs = rows.map((x) => x.r).sort((a, b) => a - b);
const median = rs[rs.length >> 1];
const MARGIN = 0.1;
console.log(`\n  aligned r ${atZero ? atZero.r.toFixed(4) : '?'}   best r ${best.r.toFixed(4)} ` +
            `at ${best.d >= 0 ? '+' : ''}${best.d.toFixed(2)}s   scan median ${median.toFixed(4)}`);
if (Math.abs(best.d) < step * 1.5) {
  console.log(atZero.r > 0.75
    ? '\n  -> ALIGNED. The peak is at zero and it is high: this part is on time and matching.'
    : '\n  -> Peak is at zero but low: the timing is right and the picture itself is wrong.');
} else if (best.r - atZero.r > MARGIN) {
  console.log(`\n  -> OFF BY ${best.d.toFixed(2)}s. The peak beats the aligned sample by ` +
              `${(best.r - atZero.r).toFixed(3)},\n     so this part renders at the wrong time.`);
} else {
  console.log('\n  -> FLAT. Nothing nearby matches appreciably better than the aligned frame\n' +
              '     (best beats it by only ' + (best.r - atZero.r).toFixed(3) + '), so this is not a\n' +
              '     timing offset — the part draws a different picture.');
}
