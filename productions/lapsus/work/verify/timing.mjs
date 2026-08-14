// timing.mjs — judge animation timing on the MOVING content only.
//
//   node productions/lapsus/work/verify/timing.mjs [scene] [localTime] [span] [step]
//   node productions/lapsus/work/verify/timing.mjs pene 4 1.0 0.1
//
// WHY THIS EXISTS. Whole-frame luma correlation is the wrong instrument for
// judging *when* something is, whenever a static backdrop fills most of the
// frame: it mostly measures the time-invariant background and only weakly the
// motion being judged. On `pene` that produced a real but unstable answer —
// the apparent offset came out +0.60s at local t=2, +0.40s at t=4 and +0.00s
// at t=6, which cannot all be true of one clock. It is METHOD.md §8's failure
// mode exactly: a measurement that quietly lies because it is dominated by
// something other than the quantity of interest.
//
// The fix is to remove the background from both sides before comparing:
//
//   ours  — render twice, once normally and once with `?objects=0` (backdrop
//           only). The difference is an EXACT object mask; no estimation.
//   ref   — the backdrop is static for the whole part, so the per-pixel MEDIAN
//           across frames spanning the part is a robust estimate of it (median
//           rather than mean so a bright object passing through a pixel does
//           not drag the estimate). Difference each frame against that.
//
// Both sides then carry only moving content, and the correlation peak against
// render time becomes sharp. Two independent statistics are reported —
// correlation and centroid distance — because they fail differently: a
// centroid can agree while the shape is wrong, and correlation can be dragged
// by residual background.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { withPage, shootCanvas, fromRepo } from '../../../../tools/harness/index.mjs';

const W = 640, H = 480, N = W * H;
const SCENE = (process.argv[2] ?? 'pene').toLowerCase();
const LOCAL = parseFloat(process.argv[3] ?? '4');
const SPAN = parseFloat(process.argv[4] ?? '1.0');
const STEP = parseFloat(process.argv[5] ?? '0.1');

// phase-1 schedule (re/ENGINE.md §5) — shared with frame.mjs
const PHASE1 = {
  startpart1: { start: 0, dur: 1 },     empt: { start: 1, dur: 13 },
  flu2: { start: 14, dur: 9 },          pene: { start: 23, dur: 8 },
  krediili: { start: 31, dur: 16 },     silli: { start: 47, dur: 8 },
  syrjakyla: { start: 55, dur: 9.531 }, paleksi: { start: 64.531, dur: 9.531 },
  pehko: { start: 74.062, dur: 9.531 }, hulluolli: { start: 83.593, dur: 9.531 },
};
const PHASE2 = {
  kuubiotekniikka: { start: 0, dur: 13.8 }, diskojea: { start: 13.8, dur: 8.5 },
  kartonki: { start: 22.3, dur: 7.4 },      hairball: { start: 29.7, dur: 7 },
  higherbiing: { start: 36.7, dur: 14 },    viherio: { start: 50.7, dur: 10.46 },
  morko: { start: 61.16, dur: 3.54 },       turska: { start: 64.7, dur: 7.5 },
  rad_out: { start: 72.2, dur: 14 },        kaivoalieni: { start: 86.2, dur: 13.5 },
  made: { start: 99.7, dur: 5.5 },          hedi: { start: 105.2, dur: 3 },
};

const prod = JSON.parse(fs.readFileSync(fromRepo('productions/lapsus/prod.json'), 'utf8'));
const cap = prod.captures[0];
const inP1 = SCENE in PHASE1;
const entry = PHASE1[SCENE] ?? PHASE2[SCENE];
if (!entry) { console.error(`unknown part "${SCENE}"`); process.exit(2); }
const offsets = cap.visualTrackOffsetsMs ?? cap.trackOffsetsMs;
const trackMs = offsets[inP1 ? 'data/mjuusik/1.mp3' : 'data/mjuusik/2.mp3'];
const partStartCapture = trackMs / 1000 + entry.start;

const TMP = path.join(process.env.TMPDIR ?? '/tmp', 'lapsus-timing');
fs.mkdirSync(TMP, { recursive: true });
const MKV = fromRepo(cap.path);

const gray = (png) => {
  const raw = path.join(TMP, 'g.raw');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-vf', `scale=${W}:${H},format=gray`, '-f', 'rawvideo', raw]);
  return fs.readFileSync(raw);
};
const refFrame = (captureTime) => {
  const png = path.join(TMP, 'r.png');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(captureTime), '-i', MKV, '-frames:v', '1', png]);
  return gray(png);
};

// --- reference background: per-pixel median across the part ----------------
const SAMPLES = 12;
const stack = [];
for (let i = 0; i < SAMPLES; i++) {
  const f = (i + 0.5) / SAMPLES;                       // spread across the part
  stack.push(refFrame(partStartCapture + f * entry.dur));
}
const refBg = new Uint8Array(N);
{
  const col = new Uint8Array(SAMPLES);
  for (let p = 0; p < N; p++) {
    for (let i = 0; i < SAMPLES; i++) col[i] = stack[i][p];
    col.sort();
    refBg[p] = col[SAMPLES >> 1];
  }
}

// --- our backdrop-only render (exact, not estimated) -----------------------
const render = async (query) => {
  const png = path.join(TMP, 'o.png');
  await withPage({ root: 'productions/lapsus', path: '/web/index.html', query,
    width: W, height: H, viewport: { width: W, height: H } },
    async ({ page }) => {
      await page.waitForFunction('window.__lapsusReady === true', { timeout: 30000 });
      fs.writeFileSync(png, await shootCanvas(page, { canvasSelector: '#c', warmupFrames: 2 }));
    });
  return gray(png);
};
const ourBg = await render(`?scene=${SCENE}&t=${LOCAL}&objects=0`);

// --- statistics on the moving signal ---------------------------------------
const signal = (frame, bg) => {
  const s = new Float64Array(N);
  for (let p = 0; p < N; p++) s[p] = Math.abs(frame[p] - bg[p]);
  return s;
};
const stats = (s) => {
  let sum = 0, cx = 0, cy = 0;
  for (let y = 0, p = 0; y < H; y++) for (let x = 0; x < W; x++, p++) {
    sum += s[p]; cx += s[p] * x; cy += s[p] * y;
  }
  return { mass: sum, cx: sum ? cx / sum : 0, cy: sum ? cy / sum : 0 };
};
const corr = (a, b) => {
  let ma = 0, mb = 0;
  for (let p = 0; p < N; p++) { ma += a[p]; mb += b[p]; }
  ma /= N; mb /= N;
  let d = 0, sa = 0, sb = 0;
  for (let p = 0; p < N; p++) { const u = a[p] - ma, v = b[p] - mb; d += u * v; sa += u * u; sb += v * v; }
  return d / Math.sqrt(sa * sb || 1);
};

const refSig = signal(refFrame(partStartCapture + LOCAL), refBg);
const refStat = stats(refSig);

console.log(`${SCENE} local t=${LOCAL}s  (capture ${(partStartCapture + LOCAL).toFixed(2)}s)`);
console.log(`background: ours exact (objects=0), ref = median of ${SAMPLES} frames across the part`);
console.log(`reference moving-signal centroid (${refStat.cx.toFixed(1)}, ${refStat.cy.toFixed(1)})  mass ${(refStat.mass/1e6).toFixed(2)}M\n`);
console.log('   t      corr   centroid dist   mass ratio');

const rows = [];
for (let off = -SPAN; off <= SPAN + 1e-9; off += STEP) {
  const t = +(LOCAL + off).toFixed(3);
  if (t < 0) continue;
  const sig = signal(await render(`?scene=${SCENE}&t=${t}`), ourBg);
  const st = stats(sig);
  const c = corr(sig, refSig);
  const dist = Math.hypot(st.cx - refStat.cx, st.cy - refStat.cy);
  rows.push({ t, c, dist });
  console.log(`  ${t.toFixed(2).padStart(5)}  ${c.toFixed(4)}   ${dist.toFixed(1).padStart(6)} px   ${(st.mass/refStat.mass).toFixed(3)}`);
}

const bestC = rows.reduce((a, b) => (b.c > a.c ? b : a));
const bestD = rows.reduce((a, b) => (b.dist < a.dist ? b : a));
const off = (t) => `${t - LOCAL >= 0 ? '+' : ''}${(t - LOCAL).toFixed(2)}s`;

// A statistic is only worth reading if it actually VARIES over the sweep. An
// argmin of a flat curve is noise wearing the costume of a measurement, which
// is the same disease as the whole-frame correlation this probe replaces —
// so quantify the peak rather than just reporting where it is.
const cs = rows.map((r) => r.c), ds = rows.map((r) => r.dist);
const spread = (a) => Math.max(...a) - Math.min(...a);
const corrSharp = spread(cs);                       // r units
const centSharp = spread(ds);                       // pixels
const CORR_MIN = 0.05, CENT_MIN = 5;                // below this: uninformative

console.log(`\nbest correlation : t=${bestC.t}  (${off(bestC.t)}, r=${bestC.c.toFixed(4)}, peak-to-trough ${corrSharp.toFixed(3)})`);
console.log(`best centroid    : t=${bestD.t}  (${off(bestD.t)}, ${bestD.dist.toFixed(1)} px, peak-to-trough ${centSharp.toFixed(1)} px)`);

const corrOK = corrSharp >= CORR_MIN, centOK = centSharp >= CENT_MIN;
if (!corrOK && !centOK) {
  console.log('VERDICT: both statistics are FLAT over this sweep — nothing moves enough here to time. Pick a moment with more motion.');
} else if (corrOK && !centOK) {
  console.log(`VERDICT: centroid is flat (${centSharp.toFixed(1)} px over the whole sweep) and its argmin is noise. Trust correlation: ${off(bestC.t)}.`);
} else if (!corrOK && centOK) {
  console.log(`VERDICT: correlation is flat and its argmax is noise. Trust centroid: ${off(bestD.t)}.`);
} else if (bestC.t === bestD.t) {
  console.log(`VERDICT: both statistics are informative and AGREE — treat ${off(bestC.t)} as real.`);
} else {
  console.log(`VERDICT: both informative but they DISAGREE (${off(bestC.t)} vs ${off(bestD.t)}) — look at the frames before believing either.`);
}
