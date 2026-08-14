// align.mjs — re-measure where each shipped MP3 starts inside the capture.
//
//   node productions/lapsus/work/verify/align.mjs
//
// WHY THIS EXISTS. Every phase-2 part was measured rendering ~0.2s early while
// phase 1 was exact. That is the signature of a wrong clock ORIGIN for phase
// 2, and phase 2's origin is one number: `trackOffsetsMs['data/mjuusik/2.mp3']`
// in prod.json. It was pinned at 106.96s by a 10ms log-energy correlation.
//
// A 10ms grid cannot be 200ms wrong by quantisation, so either the number is
// right and the fault is elsewhere, or the ESTIMATOR is biased. Log-energy is
// exactly the kind of statistic that can be: it is a compressive nonlinearity
// applied before the correlation, so quiet lead-in samples get the same weight
// as the downbeat and a track that fades in pulls its own peak late.
//
// This measures it again with a different, better-conditioned instrument and
// reports the peak SHAPE, not just its location:
//
//   * amplitude envelope (RMS per 1ms bin), not log-energy — linear in signal
//     power, so the loud transients that actually localise a track dominate.
//   * envelope is high-passed by subtracting a 200ms moving mean, which makes
//     the correlation measure ONSETS rather than overall loudness. Loudness is
//     nearly constant across a demo soundtrack and contributes only a broad,
//     flat pedestal that can shift a peak by hundreds of ms.
//   * mp3#1 is measured the same way as a CONTROL. Phase 1 is known good, so
//     if this instrument reproduces 6.41s for track 1 and disagrees for track
//     2, the disagreement is about track 2 and not about the instrument.
//
// Sub-bin location comes from a parabolic fit through the peak and its
// neighbours. The 95% span (every lag scoring within 5% of the peak) is
// printed so a broad, untrustworthy peak cannot be read as a precise answer.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fromRepo } from '../../../../tools/harness/index.mjs';

const SR = 8000;          // decode rate — plenty for an onset envelope
const BIN = 8;            // 8 samples = 1ms per envelope bin
const HP = 200;           // moving-mean window for the onset high-pass, in bins

const decode = (file, extra = []) => {
  const raw = execFileSync('ffmpeg', ['-v', 'error', ...extra, '-i', file,
    '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'],
    { maxBuffer: 1 << 30 });
  return new Float32Array(raw.buffer, raw.byteOffset, raw.length >> 2);
};

/** RMS per 1ms bin, then subtract a moving mean so only onsets survive. */
function envelope(pcm) {
  const n = Math.floor(pcm.length / BIN);
  const e = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < BIN; j++) { const v = pcm[i * BIN + j]; s += v * v; }
    e[i] = Math.sqrt(s / BIN);
  }
  // running mean over HP bins, centred
  const out = new Float32Array(n);
  let acc = 0;
  const half = HP >> 1;
  for (let i = 0; i < n; i++) {
    acc += e[i];
    if (i >= HP) acc -= e[i - HP];
    const c = Math.min(Math.max(i - half, 0), Math.max(n - 1, 0));
    out[c] = e[c] - acc / Math.min(i + 1, HP);
  }
  return out;
}

/** Normalised correlation of `pat` against `sig` at every lag in [lo,hi]. */
function scan(sig, pat, lo, hi) {
  let pm = 0;
  for (const v of pat) pm += v;
  pm /= pat.length;
  const p = Float32Array.from(pat, (v) => v - pm);
  let pn = 0;
  for (const v of p) pn += v * v;
  pn = Math.sqrt(pn) || 1;

  const scores = new Float64Array(hi - lo + 1);
  for (let lag = lo; lag <= hi; lag++) {
    let dot = 0, sm = 0;
    for (let i = 0; i < p.length; i++) sm += sig[lag + i] ?? 0;
    sm /= p.length;
    let sn = 0;
    for (let i = 0; i < p.length; i++) {
      const s = (sig[lag + i] ?? 0) - sm;
      dot += s * p[i]; sn += s * s;
    }
    scores[lag - lo] = dot / (Math.sqrt(sn) || 1) / pn;
  }
  return scores;
}

const prod = JSON.parse(fs.readFileSync(fromRepo('productions/lapsus/prod.json'), 'utf8'));
const cap = prod.captures[0];
const DATA = 'productions/lapsus/work/unpacked/lapsus_dat/';

console.log('decoding capture audio…');
const capEnv = envelope(decode(fromRepo(cap.path)));
console.log(`capture envelope ${(capEnv.length / 1000).toFixed(1)}s @1ms\n`);

const PATTERN = 30;      // seconds of each track used as the pattern
const SEARCH = 2.0;      // +/- seconds around the pinned value
// Four DISJOINT excerpts per track. One window can agree with a wrong pinned
// value by landing on a repeat of the same bar; four windows drawn from
// different minutes of the track cannot all do so at the same lag. Windows
// start at 2s rather than 0 because an MP3's head carries encoder-delay
// padding, and a fade-in there is exactly the low-information region that
// biases a loudness-driven estimator.
const WINDOWS = [2, 32, 62, 92];

for (const [track, pinnedMs] of Object.entries(cap.trackOffsetsMs)) {
  const pinned = pinnedMs / 1000;
  console.log(`${track}   pinned ${pinned.toFixed(3)}s`);
  const found = [];
  for (const SKIP of WINDOWS) {
    const pcm = decode(fromRepo(DATA + track), ['-ss', String(SKIP), '-t', String(PATTERN)]);
    if (pcm.length < SR * PATTERN * 0.9) { console.log(`  +${SKIP}s  (past end of track)`); continue; }
    const trk = envelope(pcm);
    const centre = Math.round((pinned + SKIP) * 1000);
    const lo = Math.max(0, centre - SEARCH * 1000);
    const hi = Math.min(capEnv.length - trk.length - 1, centre + SEARCH * 1000);
    if (hi <= lo) { console.log(`  +${SKIP}s  (past end of capture)`); continue; }
    const sc = scan(capEnv, trk, lo, hi);

    let bi = 0;
    for (let i = 1; i < sc.length; i++) if (sc[i] > sc[bi]) bi = i;
    // parabolic refinement through the peak and its two neighbours
    let sub = 0;
    if (bi > 0 && bi < sc.length - 1) {
      const a = sc[bi - 1], b = sc[bi], c = sc[bi + 1];
      const d = a - 2 * b + c;
      if (d !== 0) sub = 0.5 * (a - c) / d;
    }
    const start = (lo + bi + sub) / 1000 - SKIP;
    const thr = sc[bi] * 0.95;
    let w0 = bi, w1 = bi;
    while (w0 > 0 && sc[w0 - 1] >= thr) w0--;
    while (w1 < sc.length - 1 && sc[w1 + 1] >= thr) w1++;
    found.push(start);
    console.log(`  +${String(SKIP).padStart(3)}s   ${start.toFixed(3)}s   ` +
      `delta ${(start - pinned >= 0 ? '+' : '')}${(start - pinned).toFixed(3)}s   ` +
      `r=${sc[bi].toFixed(3)}   95% span ${w1 - w0 + 1}ms`);
  }
  if (found.length) {
    const mean = found.reduce((a, b) => a + b, 0) / found.length;
    const spread = Math.max(...found) - Math.min(...found);
    console.log(`  => mean ${mean.toFixed(3)}s  (delta ${(mean - pinned >= 0 ? '+' : '')}` +
      `${(mean - pinned).toFixed(3)}s), window spread ${(spread * 1000).toFixed(0)}ms`);
  }
  console.log();
}
