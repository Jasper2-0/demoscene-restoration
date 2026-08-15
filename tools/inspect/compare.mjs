// compare.mjs — the comparison layer, once, for every tool.
//
// The metrics and their guards were inside sweep.mjs, so every other tool that
// scored a frame either reimplemented them or went without. Going without is
// the expensive option: each guard here exists because its absence produced a
// confident, wrong finding.
//
// Two metrics, and the relationship between them is the diagnosis:
//
//   * CORRELATION answers "is this the same picture" and is INVARIANT to the
//     affine level change that a fade, an exposure error or a missing additive
//     layer produces. A score-only harness is therefore structurally blind to a
//     colour or brightness fault — lapsus's flu2 sat at r 0.84 for weeks while
//     visibly the wrong colour.
//   * RMSE answers "is it the same brightness" and says nothing about whether
//     the content is right.
//
// So: high r + high RMSE is a LEVEL fault, and the list of things that scale a
// whole frame is short (a fade, exposure, a missing additive layer). Low r with
// matching mean luma is STRUCTURE or phase. That single distinction resolved
// flu2, kartonki, hulluolli, paleksi and higherbiing, and it used to live only
// in the head of whoever was reading the numbers. `classify()` makes it a
// property of every finding instead.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

export const W = 640, H = 480, N = W * H;

/**
 * The filter chain for one frame, with an optional CROP applied first.
 *
 * A production may draw into only part of its canvas. ptct's backing store is
 * square (960x960 under the harness) while the demo occupies a 960x800 band at
 * y=H/12 — the letterbox its own CSS crops away for display. The tooling took
 * the canvas to BE the frame, so it compared a letterboxed image against a
 * full-frame reference and scored a well-verified port at median r 0.14 while
 * the frames plainly showed the same scene. Geometry, not fidelity.
 *
 * The page knows this rect — it computes it to lay itself out — so the adapter
 * declares it via frameRect() and nothing here has to guess or detect bars.
 * Detection would be actively dangerous: a legitimately dark frame (lapsus's
 * empt ends on black) has no content to bound.
 */
const chain = (crop) => (crop ? `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y},` : '')
  + `scale=${W}:${H},format=gray`;

/** One frame as 8-bit luma at the comparison resolution. */
export const grayOf = (png, crop = null) => execFileSync('ffmpeg',
  ['-v', 'error', '-i', png, '-vf', chain(crop), '-f', 'rawvideo', '-'],
  { maxBuffer: 1 << 28 });

/** Pearson correlation: "is this the same picture". */
export function corr(a, b) {
  let ma = 0, mb = 0;
  for (let i = 0; i < N; i++) { ma += a[i]; mb += b[i]; }
  ma /= N; mb /= N;
  let d = 0, sa = 0, sb = 0;
  for (let i = 0; i < N; i++) { const u = a[i] - ma, v = b[i] - mb; d += u * v; sa += u * u; sb += v * v; }
  // A FLAT FRAME HAS NO VARIANCE, so Pearson's r is 0/0 and reads 0 — which
  // brands a PERFECT match as a total failure. lapsus's empt ends on black: it
  // matched the capture exactly (RMSE 0.0) and scored r 0.000, and that number
  // became the gate's headline "worst instant". When BOTH frames are flat the
  // only question correlation could answer is whether they are flat at the same
  // level, so answer that instead. One flat and one not is a real mismatch and
  // still scores 0.
  const varA = sa / N, varB = sb / N;
  if (varA < 0.25 && varB < 0.25) return Math.abs(ma - mb) <= 1.0 ? 1 : 0;
  return d / Math.sqrt(sa * sb || 1);
}

/** RMSE: "is it the same brightness". */
export function rmse(a, b) {
  let s = 0;
  for (let i = 0; i < N; i++) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s / N);
}

export const meanOf = (a) => { let s = 0; for (let i = 0; i < N; i++) s += a[i]; return s / N; };

/**
 * Is a REFERENCE frame blank? A blank reference is an ABSENT MEASUREMENT, not a
 * mismatch — and it reads as a catastrophic failure if you do not check.
 *
 * Parts that run into the tail of a truncated capture, or that are sampled
 * inside a fade, get compared against solid black. lapsus's hedi does exactly
 * this: its midpoint lands 2.3s before the capture ends, and the side-by-side
 * showed a full picture against nothing.
 *
 * Two implementation traps, both real, both found by testing this against a
 * known-flat AND a known-good frame rather than trusting it:
 *   * ffmpeg's `signalstats` emits NOTHING at all on an RGB input without an
 *     explicit `format=yuv420p` — so the guard silently never fires.
 *   * not every ffmpeg build reports `YSTD`. `YMIN`/`YMAX` are always there,
 *     and a luma RANGE is a better flatness test than a stddev threshold.
 */
export function isFlat(png, range = 4) {
  try {
    const out = execFileSync('ffmpeg', ['-v', 'error', '-i', png, '-vf',
      'format=yuv420p,signalstats,metadata=print:file=-', '-f', 'null', '-'],
      { encoding: 'utf8' });
    const y = (k) => Number(new RegExp(`signalstats\\.${k}=([\\d.]+)`).exec(out)?.[1]);
    const [lo, hi] = [y('YMIN'), y('YMAX')];
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;   // unknown, not "fine"
    return { flat: hi - lo < range, min: lo, max: hi };
  } catch { return null; }
}

/**
 * LEVEL or STRUCTURE — the single most useful thing the two metrics say
 * together. Returns a short kind plus a one-line reason fit for an issue body.
 *
 * `r` is level-invariant, so:
 *   r high + luma ratio far from 1  -> LEVEL: something scales the whole frame
 *   r low  + luma ratio near 1      -> STRUCTURE: the content or its phase
 *   both bad                        -> STRUCTURE dominates; fixing level first
 *                                      will not move the score much
 */
export function classify({ r, meanOurs, meanRef }) {
  const ratio = meanRef > 0.5 ? meanOurs / meanRef : (meanOurs > 0.5 ? Infinity : 1);
  const levelOff = ratio > 1.35 || ratio < 0.74;
  if (r >= 0.75 && levelOff) {
    return { kind: 'level', ratio,
      reason: `structure matches (r ${r.toFixed(3)}) but luma is ${ratio.toFixed(2)}x the reference` +
              ` — something scales the whole frame: a fade, exposure, or a missing additive layer` };
  }
  if (r < 0.75 && !levelOff) {
    return { kind: 'structure', ratio,
      reason: `luma matches (${meanOurs.toFixed(1)} vs ${meanRef.toFixed(1)}) but r is ${r.toFixed(3)}` +
              ` — the content or its phase is wrong, not its brightness` };
  }
  if (r < 0.75 && levelOff) {
    return { kind: 'structure', ratio,
      reason: `r ${r.toFixed(3)} AND luma ${ratio.toFixed(2)}x — structure is wrong too, so fixing` +
              ` the level alone will not move the score much` };
  }
  return { kind: 'ok', ratio, reason: `r ${r.toFixed(3)}, luma ${ratio.toFixed(2)}x` };
}

/** Score one pair of PNGs, with the flat-reference guard applied. */
export function scorePair(oursPng, refPng, crop = null) {
  const flat = isFlat(refPng);
  // Only OURS is cropped: the reference is already the frame a viewer saw.
  const a = grayOf(oursPng, crop), b = grayOf(refPng);
  const meanOurs = meanOf(a), meanRef = meanOf(b);
  const r = corr(a, b), e = rmse(a, b);
  return {
    r, rmse: e, meanOurs, meanRef,
    refFlat: flat?.flat ?? null,
    ...classify({ r, meanOurs, meanRef }),
  };
}

export const exists = (p) => fs.existsSync(p);
