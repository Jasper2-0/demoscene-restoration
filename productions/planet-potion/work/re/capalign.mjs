// capalign.mjs — where our soundtrack sits inside the reference capture.
//
//   node work/re/capalign.mjs <capture.mkv> <part1.dbm> [part3.dbm] [--record]
//
// METHOD.md §7 makes the capture ground truth, but a capture is only ground
// truth once you know WHEN it starts. Every per-scene visual comparison —
// "the frame at t=93 s should look like this" — is a claim about the capture's
// clock, and the capture's clock has an unknown offset from ours: it includes
// whatever lead-in the person recording it left in. That offset is
// `alignmentOffsetMs` in prod.json, and until it is measured it is null and no
// visual signoff is possible at all.
//
// SIGN CONVENTION, following lost-vegas (work/reference/NOTES.md there):
// alignmentOffsetMs = ours - reference at the same instant. Positive means our
// clock runs AHEAD, so the capture should be sampled at `t - offset` to see
// what we draw at `t`.
//
// WHY THIS PRODUCTION CAN MEASURE IT WELL. Alignment is by audio
// cross-correlation, which is only as good as the two signals. Here both are
// unusually clean: the primary capture carries FLAC rather than a lossy
// re-encode, and our side is not a recording of anything — dbmplayer.js
// renders the module from scratch, and the module itself is regenerable
// byte-exactly from the binary. So this correlates two clean signals rather
// than two guesses.
//
// ENVELOPES, NOT WAVEFORMS. The capture is a DIFFERENT MIXER's render of the
// same score: dbplayer.library on a real 604e, through whatever the recording
// chain was. Resampling, filtering and phase all differ, so sample-level
// correlation is near zero even at the correct lag. The amplitude envelope —
// where notes start and stop — survives all of it. dbmdiff.mjs already draws
// this same distinction, reporting envelope and waveform as two numbers
// because they measure different things.
//
// WINDOWS AND A LINE FIT, NOT ONE GLOBAL PEAK. The first version of this tool
// slid the whole 289-second part one through the whole 446-second capture and
// took the best lag. THAT DOES NOT WORK, and the way it fails is worth keeping:
// the overlap is nearly total at every lag, so the score is dominated by the
// two signals' gross energy shape and the surface comes out flat — it reported
// 0.6958 against a runner-up of 0.6528 over 3,143 lags, which is not a peak,
// and the answer it gave (2.15 s) was wrong by two seconds. Correlating SHORT
// WINDOWS INDEPENDENTLY and fitting a line to their lags is strictly better:
// each window has a sharp peak of its own, the intercept is the offset, and
// the SLOPE is clock drift, which one global peak can only smear away.
//
// THAT SLOPE IS NOT DECORATION. lost-vegas's note makes the point that if the
// offset is not constant then a single constant is the wrong MODEL, not merely
// the wrong value. This tool can tell the difference, so it reports both and
// says which one the data supports.
//
// PART THREE IS AN INDEPENDENT MEASUREMENT, not a repeat. Its lag is found on
// its own and compared against where part one's end predicts it. The
// difference is the gap between the parts, which is a fact about the intro we
// had no other way to learn.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
// fileURLToPath, not `new URL().pathname`: this repository lives under a path
// with spaces in it, which the URL form percent-encodes into %20.
import { fileURLToPath } from 'node:url';
import { parseDBM } from '../../web/js/dbm.js';
import { render } from '../../web/js/dbmplayer.js';
import { readProd, writeProd } from '../../../../tools/fetch/lib/prod.mjs';

const ABSENT = 77;
const SLUG = 'planet-potion';
const RATE = 44100;      // the capture's own rate; no resampling on either side
const WINDOW = 20;       // seconds per correlation window
const STEP = 10;         // seconds between window starts (windows overlap)
const LADDER = [20, 200, 1000];   // envelope bins/s: 50 ms -> 5 ms -> 1 ms
const MIN_R = 0.4;       // coarse-pass r below this is not a measurement

const argv = process.argv.slice(2);
const record = argv.includes('--record');
const files = argv.filter((a) => !a.startsWith('--'));
const [capture, part1, part3] = files;

if (!capture || !part1) {
  console.log('usage: capalign.mjs <capture.mkv> <part1.dbm> [part3.dbm] [--record]');
  process.exit(2);
}
for (const f of [capture, part1, part3].filter(Boolean)) {
  if (!fs.existsSync(f)) {
    // A missing capture is the normal state of a fresh clone: work/reference/
    // is gitignored because captures are recorded, never distributed. 77 is
    // SKIP, as everywhere else in this tree.
    console.log(`capalign: ${f} not here — fetch with tools/fetch/capture.mjs. Skipping.`);
    process.exit(ABSENT);
  }
}
if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).error) {
  console.log('capalign: no ffmpeg on PATH. Skipping.');
  process.exit(ABSENT);
}

/** The capture's audio as mono float at RATE, straight out of ffmpeg. */
function captureMono(file) {
  const raw = execFileSync('ffmpeg', [
    '-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', String(RATE),
    '-f', 'f32le', '-',
  ], { maxBuffer: 1 << 30 });
  return new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
}

/** One of our modules as mono float at RATE — the channel sum, as dbmdiff uses. */
function renderMono(file) {
  const mod = parseDBM(new Uint8Array(fs.readFileSync(file)));
  const { pcm, seconds } = render(mod, { sampleRate: RATE });
  const mono = new Float32Array(pcm.length / 2);
  for (let i = 0; i < mono.length; i++) mono[i] = (pcm[i * 2] + pcm[i * 2 + 1]) / 2;
  return { mono, seconds };
}

/**
 * Mean absolute amplitude in fixed-width bins — the envelope.
 *
 * Mean-abs rather than peak: peak follows single transients and is noisy
 * across two different mixers, where the average over a window is not.
 */
function envelope(mono, binsPerSecond) {
  const bin = Math.round(RATE / binsPerSecond);
  const n = Math.floor(mono.length / bin);
  const env = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = i * bin, e = j + bin; j < e; j++) s += mono[j] < 0 ? -mono[j] : mono[j];
    env[i] = s / bin;
  }
  return env;
}

/** Pearson correlation of sig[from..from+len) against ref shifted by `lag` bins. */
function scoreAt(ref, sig, lag, from, len) {
  if (from + lag < 0 || from + lag + len > ref.length || from + len > sig.length) return -1;
  let sa = 0, sb = 0;
  for (let i = 0; i < len; i++) { sa += ref[from + lag + i]; sb += sig[from + i]; }
  const ma = sa / len, mb = sb / len;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < len; i++) {
    const x = ref[from + lag + i] - ma, y = sig[from + i] - mb;
    num += x * y; da += x * x; db += y * y;
  }
  if (da <= 0 || db <= 0) return -1;
  return num / Math.sqrt(da * db);
}

/**
 * Lag of one window, in seconds, refined down the LADDER.
 *
 * Coarse over `spanSec` either side of `guessSec`, then each finer rate
 * searches only one coarse bin either side of the previous winner. Three
 * passes cost about as much as one, and land on 1 ms.
 *
 * TWO NUMBERS COME BACK, AND ONLY ONE OF THEM JUDGES ANYTHING. `r` is from the
 * COARSE pass; the fine passes only sharpen the lag. That split was learned the
 * hard way: gating on the finest pass's r threw away 21 of part one's 27
 * windows and all 14 of part three's, while the lags those same windows
 * reported agreed with their neighbours to a millisecond. At 1 ms bins two
 * different mixers genuinely disagree about envelope detail — r falls to 0.2
 * where the 50 ms pass says 0.8 — so the fine r measures how alike the mixers
 * are, which is dbmdiff's question, not this tool's. Here the coarse pass says
 * WHETHER a window matches and the fine pass says BY HOW MUCH.
 */
function windowLag(envs, startSec, guessSec, spanSec) {
  let centre = guessSec, span = spanSec, coarse = -1;
  for (let k = 0; k < LADDER.length; k++) {
    const bps = LADDER[k];
    const { ref, sig } = envs[bps];
    const from = Math.round(startSec * bps);
    const len = Math.round(WINDOW * bps);
    const lo = Math.round((centre - span) * bps);
    const hi = Math.round((centre + span) * bps);
    let bl = lo, best = -2;
    for (let lag = lo; lag <= hi; lag++) {
      const r = scoreAt(ref, sig, lag, from, len);
      if (r > best) { best = r; bl = lag; }
    }
    if (k === 0) coarse = best;
    centre = bl / bps;
    span = 1 / bps;             // next rate searches one coarse bin either side
  }
  return { lag: centre, r: coarse };
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};

/**
 * Theil-Sen line through (t, lag): the median of all pairwise slopes.
 *
 * NOT least squares, because one window here is reliably bad. The capture
 * begins a tenth of a second INTO the music, so the window at t=0 is comparing
 * our first 20 seconds against only 19.9 of the capture's; it lands 285 ms off
 * its neighbours and it is the lowest-scoring window of the run. Least squares
 * lets that one point swing the slope — it turned part one's dead-flat -120 ms
 * into a fictitious -190 ppm of drift. A median of slopes ignores it, and the
 * cost at 27 points is 351 subtractions.
 */
function fit(points) {
  const slopes = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dt = points[j].t - points[i].t;
      if (dt > 0) slopes.push((points[j].lag - points[i].lag) / dt);
    }
  }
  if (!slopes.length) return { slope: 0, intercept: points[0]?.lag ?? 0 };
  const slope = median(slopes);
  return { slope, intercept: median(points.map((p) => p.lag - slope * p.t)) };
}

console.log(`capture:  ${path.basename(capture)}`);
const cap = captureMono(capture);
const capSeconds = cap.length / RATE;
console.log(`          ${capSeconds.toFixed(3)} s of audio at ${RATE} Hz\n`);
const capEnv = Object.fromEntries(LADDER.map((b) => [b, envelope(cap, b)]));

/**
 * Measure one part.
 *
 * `guessSec` seeds the coarse search; ±`spanSec` bounds it. Part one is looked
 * for near the start of the capture, part three near where part one ends.
 */
function align(label, file, guessSec, spanSec) {
  const { mono, seconds } = renderMono(file);
  const envs = Object.fromEntries(LADDER.map((b) =>
    [b, { ref: capEnv[b], sig: envelope(mono, b) }]));

  const points = [];
  let guess = guessSec, span = spanSec;
  for (let t = 0; t + WINDOW <= seconds; t += STEP) {
    if (t + guess + WINDOW > capSeconds) break;
    const { lag, r } = windowLag(envs, t, guess, span);
    points.push({ t, lag, r });
    // Later windows start from the previous answer and search narrowly: once
    // one window has locked on, the next cannot be seconds away from it.
    if (r >= MIN_R) { guess = lag; span = 0.5; }
  }

  const good = points.filter((p) => p.r >= MIN_R);
  console.log(`${label}: ${seconds.toFixed(3)} s rendered, ` +
    `${good.length}/${points.length} windows above r=${MIN_R}`);
  for (const p of points) {
    console.log(`  t=${String(p.t).padStart(4)} s   lag=${p.lag.toFixed(3).padStart(9)} s   ` +
      `r=${p.r.toFixed(3)}${p.r < MIN_R ? '   (dropped)' : ''}`);
  }
  if (good.length < 3) {
    console.log('  too few usable windows to fit anything.\n');
    return null;
  }
  const { slope, intercept } = fit(good);
  const rs = good.map((p) => p.r);
  console.log(`  starts at:   ${intercept.toFixed(3)} s of the capture`);
  console.log(`  drift:       ${(slope * 1e6).toFixed(0)} ppm ` +
    `(${(slope * seconds * 1000).toFixed(0)} ms over the part)`);
  console.log(`  r:           ${Math.min(...rs).toFixed(3)} .. ${Math.max(...rs).toFixed(3)}\n`);
  return { seconds, intercept, slope, rMin: Math.min(...rs) };
}

const a1 = align('part one  ', part1, 0, 20);
if (!a1) { console.log('capalign: part one did not lock on; nothing to record.'); process.exit(1); }

// Our clock minus the capture's: our time t matches capture time t + lag, so
// ours runs AHEAD by -lag. Part one defines this, because our t=0 IS the
// intro's t=0. Part three's lag is measured from the capture's start and is
// therefore a position, not an offset — the two are not the same quantity and
// only one of them belongs in prod.json.
const offsetMs = Math.round(-a1.intercept * 1000);
console.log(`ours runs ${offsetMs >= 0 ? 'ahead of' : 'behind'} the capture ` +
  `by ${Math.abs(offsetMs)} ms\n`);

let a3 = null;
if (part3) {
  // Seeded where part one's end says part three should begin.
  a3 = align('part three', part3, a1.intercept + a1.seconds, 20);
  if (a3) {
    const predicted = a1.intercept + a1.seconds;
    const gap = a3.intercept - predicted;
    console.log(`part one ends at ${predicted.toFixed(3)} s of the capture; ` +
      `part three begins at ${a3.intercept.toFixed(3)} s`);
    console.log(`  the intro is SILENT between them for ${(gap * 1000).toFixed(0)} ms\n`);
  }
}

// A drift this tool can see is a fact about the player, not about the capture:
// both sides are digital, so a slope means our tick duration is wrong. Report
// it loudly rather than folding it into the offset.
const DRIFT_PPM = 500;
for (const [label, a] of [['part one', a1], ['part three', a3]]) {
  if (a && Math.abs(a.slope) * 1e6 > DRIFT_PPM) {
    console.log(`NOTE: ${label} drifts ${(a.slope * 1e6).toFixed(0)} ppm against the capture ` +
      `(${(a.slope * a.seconds * 1000).toFixed(0)} ms end to end).`);
    console.log('      Both sides are digital, so that is our tick duration, not the recording.');
    console.log('      A single offset is then an approximation over the length of the part.\n');
  }
}

if (a1.rMin < MIN_R) {
  console.log('WEAK CORRELATION — not recording.');
  process.exit(1);
}

const prod = readProd(SLUG);
const target = prod.captures.find((c) => path.basename(c.path) === path.basename(capture));
if (!target) {
  console.log(`capalign: ${path.basename(capture)} is not in captures[].`);
  process.exit(1);
}

if (record) {
  target.alignmentOffsetMs = offsetMs;
  writeProd(prod);
  console.log(`recorded alignmentOffsetMs=${offsetMs} for ${path.basename(target.path)}`);
} else if (target.alignmentOffsetMs === null || target.alignmentOffsetMs === undefined) {
  console.log(`pass --record to write alignmentOffsetMs=${offsetMs} into prod.json`);
} else {
  // WITH THE OFFSET ALREADY PINNED THIS IS A CHECK, not a report. Re-measuring
  // and comparing is what makes it able to fail: the offset is a joint property
  // of the capture and of our renderer, so it moves if either changes — a
  // refetched capture that yt-dlp trimmed differently, or a player change that
  // shifts where the first note lands. Either is news.
  //
  // TOLERANCE is one window's worth of measurement noise. The 27 windows agree
  // within 6 ms of each other, so 10 ms is comfortably outside the scatter and
  // well inside anything that would matter to a visual comparison.
  const TOL = 10;
  const delta = offsetMs - target.alignmentOffsetMs;
  console.log(`pinned alignmentOffsetMs=${target.alignmentOffsetMs}, ` +
    `measured ${offsetMs} (${delta >= 0 ? '+' : ''}${delta} ms)`);
  if (Math.abs(delta) > TOL) {
    console.log(`ALIGNMENT MOVED by more than ${TOL} ms — the capture or the renderer changed.`);
    console.log('Re-run with --record once you know which, and why.');
    process.exit(1);
  }
  console.log('alignment holds.');
}
