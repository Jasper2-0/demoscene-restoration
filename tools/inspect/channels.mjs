// channels.mjs — per-CHANNEL statistics for one instant, ours vs the reference.
//
//   node tools/inspect/channels.mjs lapsus flu2 5.59
//   node tools/inspect/channels.mjs lapsus flu2 5.59 --box=0,0,400,480
//
// score1 answers "how close is this frame" in luma. That is the right question
// for a timing or geometry fault and the WRONG one for a colour fault:
// correlation is invariant to exactly the affine change a colour bug produces,
// so a surface can carry a strong cast and still score 0.85. lapsus's flu2 sat
// at r 0.84 for weeks while visibly the wrong colour.
//
// Promoted from productions/lapsus/work/verify/ (#29 S4).
//
// WHAT IT MEASURES, and why:
//   * LIT PIXELS ONLY, counted when EITHER side is above the threshold, so
//     "we are black where the capture is not" is included rather than dropped
//     by the very condition it violates.
//   * R/B RATIO, the cast in one number.
//   * The per-channel factor needed to reach the reference: a FLAT row is a
//     level fault, a SLOPED row is a cast fault, and they have different causes.
//   * A coarse histogram, because "too dark" and "missing mid-tone" look the
//     same in a mean and completely different in a distribution.
//   * --box restricts BOTH sides to a region. `?onlyobj=`-style knobs filter
//     only OUR render while the reference keeps every object, so isolating that
//     way silently compares one object against two.
import { execFileSync } from 'node:child_process';
import { withDemo, captureOf, refFrame } from './demo.mjs';
import { W, H, N } from './compare.mjs';

const args = process.argv.slice(2);
const num = (n, d) => Number((args.find((a) => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).slice(n.length + 3));
const [prodName, part, localArg] = args.filter((a) => !a.startsWith('--'));
const local = parseFloat(localArg);
const extra = args.filter((a) => a.includes('=') && !a.startsWith('--'));
const LIT = num('lit', 40);
const BOX = (args.find((a) => a.startsWith('--box=')) ?? '').slice(6).split(',').map(Number);
const [X0, Y0, X1, Y1] = BOX.length === 4 ? BOX : [0, 0, W, H];
if (!prodName || !part || !Number.isFinite(local)) {
  console.error('usage: node tools/inspect/channels.mjs <production> <part> <local> [k=v] [--lit=40] [--box=x0,y0,x1,y1]');
  process.exit(2);
}

const rgb = (png) => execFileSync('ffmpeg',
  ['-v', 'error', '-i', png, '-vf', `scale=${W}:${H},format=rgb24`, '-f', 'rawvideo', '-'],
  { maxBuffer: 1 << 28 });

const cap = captureOf(prodName);
await withDemo(prodName, extra, async (api) => {
  const t = api.captureTime(part, local);
  const { pngPath } = await api.render(part, local);
  const A = rgb(pngPath), B = rgb(refFrame(prodName, cap.file, t));
  const luma = (b, i) => 0.2126 * b[i] + 0.7152 * b[i + 1] + 0.0722 * b[i + 2];

  const acc = { a: [0, 0, 0], b: [0, 0, 0], n: 0, litA: 0, litB: 0 };
  const BANDS = [0, 32, 64, 96, 128, 160, 192, 224, 256];
  const hA = new Array(BANDS.length - 1).fill(0), hB = hA.slice();
  let inBox = 0;
  for (let p = 0; p < N; p++) {
    const px = p % W, py = (p / W) | 0;
    if (px < X0 || px >= X1 || py < Y0 || py >= Y1) continue;
    inBox++;
    const i = p * 3, la = luma(A, i), lb = luma(B, i);
    if (la >= LIT) acc.litA++;
    if (lb >= LIT) acc.litB++;
    for (let k = 0; k < BANDS.length - 1; k++) {
      if (la >= BANDS[k] && la < BANDS[k + 1]) hA[k]++;
      if (lb >= BANDS[k] && lb < BANDS[k + 1]) hB[k]++;
    }
    if (la < LIT && lb < LIT) continue;
    for (let c = 0; c < 3; c++) { acc.a[c] += A[i + c]; acc.b[c] += B[i + c]; }
    acc.n++;
  }

  const mean = (v) => v.map((x) => x / Math.max(acc.n, 1));
  const [ar, ag, ab] = mean(acc.a), [br, bg, bb] = mean(acc.b);
  const pct = (x) => (100 * x / Math.max(inBox, 1)).toFixed(1) + '%';

  console.log(`\n  ${prodName}/${part} @${local}s   ${extra.join(' ') || '(baseline)'}` +
    `   capture ${t.toFixed(3)}s   lit >= ${LIT}` +
    (BOX.length === 4 ? `   box ${X0},${Y0}..${X1},${Y1}` : ''));
  console.log(`\n  over ${acc.n} pixels lit on either side:\n`);
  console.log('           R       G       B     R/B    lit area');
  console.log(`  ours   ${ar.toFixed(1).padStart(6)}  ${ag.toFixed(1).padStart(6)}  ` +
    `${ab.toFixed(1).padStart(6)}  ${(ar / (ab || 1)).toFixed(2).padStart(6)}   ${pct(acc.litA)}`);
  console.log(`  ref    ${br.toFixed(1).padStart(6)}  ${bg.toFixed(1).padStart(6)}  ` +
    `${bb.toFixed(1).padStart(6)}  ${(br / (bb || 1)).toFixed(2).padStart(6)}   ${pct(acc.litB)}`);
  console.log(`\n  ours x (${(br / (ar || 1)).toFixed(3)}, ${(bg / (ag || 1)).toFixed(3)}, ` +
    `${(bb / (ab || 1)).toFixed(3)}) would match the reference's mean` +
    '\n    (flat => level fault; sloped => cast fault)');

  console.log('\n  luma histogram, share of the measured region:\n');
  console.log('    band     ours     ref');
  for (let k = 0; k < hA.length; k++) {
    const d = 100 * (hA[k] - hB[k]) / Math.max(inBox, 1);
    console.log(`   ${String(BANDS[k]).padStart(4)}-${String(BANDS[k + 1] - 1).padEnd(4)} ` +
      `${pct(hA[k]).padStart(7)} ${pct(hB[k]).padStart(7)}   ${d > 0 ? '+' : ''}${d.toFixed(1)}`);
  }
});
