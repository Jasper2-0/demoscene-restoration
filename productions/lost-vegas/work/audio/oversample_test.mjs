// oversample_test.mjs - the decisive experiment for the "should we oversample?"
// question on the Lost Vegas softsynth.
//
// The synth is additive-cosine grains laid into a 512-sample overlap-add delay
// line. Its WAVE table is a sum of 8 low harmonics multiplied by a *pointwise*
// square wave (the `k & 0x40` sign flip) -- a discrete-time construct whose
// upper partials are already folded. Era softsynths often derive character from
// exactly that folding, so "cleaner" can mean "less faithful".
//
// We have ground truth: distance's own XM release (reference/oracle/dst_vega.xm)
// stores the real 17 samples. The test:
//
//   A. baseline  - generate at 1x, correlate each sample against the oracle.
//   B. control   - generate at 2x, decimate NAIVELY (drop every other sample,
//                  which folds the extra band back down exactly as 1x does).
//                  If this matches A, the 2x generator is a correct finer
//                  sampling of the same continuous process.
//   C. verdict   - generate at 2x, low-pass at Nyquist_1x (255-tap Blackman
//                  sinc, group delay compensated) and decimate. This REMOVES the
//                  partials that folded at 1x. Correlate against the oracle.
//                  >= 0.98 -> the aliasing is not load-bearing, adopt.
//                  <  0.98 -> the aliasing IS the instrument, do not adopt.
//
// Run: node oversample_test.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { synthesizeFloat } from './synth.mjs';
import { ncc, decimate, decimateNaive } from './dsp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// ------------------------------------------------------- oracle sample extraction

/** Pull the 17 raw sample PCMs (un-delta'd, signed 8-bit) out of a standard XM. */
function oracleSamples(b) {
  const u16 = (o) => b[o] | (b[o + 1] << 8);
  const u32 = (o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
  const headerSize = u32(60);
  const numPatterns = u16(70), numInstruments = u16(72);
  let at = 60 + headerSize;
  for (let p = 0; p < numPatterns; p++) {
    const hlen = u32(at), packed = u16(at + 7);
    at += hlen + packed;
  }
  const out = [];
  for (let i = 0; i < numInstruments; i++) {
    const isize = u32(at);
    const numSamples = u16(at + 27);
    if (numSamples === 0) { at += isize; continue; }
    const shdr = u32(at + 29);
    let sat = at + isize;
    const heads = [];
    for (let s = 0; s < numSamples; s++) {
      heads.push({
        length: u32(sat), loopStart: u32(sat + 4), loopLength: u32(sat + 8),
        volume: b[sat + 12], finetune: (b[sat + 13] << 24) >> 24,
        type: b[sat + 14], panning: b[sat + 15],
        relativeNote: (b[sat + 16] << 24) >> 24,
      });
      sat += shdr;
    }
    for (const h of heads) {
      const sixteen = (h.type & 16) !== 0;
      const frames = sixteen ? h.length >> 1 : h.length;
      const pcm = new Float32Array(frames);
      let old = 0;
      for (let k = 0; k < frames; k++) {
        if (sixteen) {
          old = (old + ((u16(sat + k * 2) << 16) >> 16)) & 0xffff;
          pcm[k] = ((old << 16) >> 16) / 256;   // express in 8-bit units
        } else {
          old = (old + ((b[sat + k] << 24) >> 24)) & 0xff;
          pcm[k] = (old << 24) >> 24;
        }
      }
      sat += h.length;
      out.push({ pcm, frames, head: h });
    }
    at = sat;
  }
  return out;
}

// ------------------------------------------------------------------- DSP helpers
// (ncc / decimate / decimateNaive live in dsp.mjs so validate.mjs measures the
// same way. PHASE NOTE: each synthesis step reads `step` samples off the TOP of
// the delay line *descending* (ACC[accLen-1-j]), so at oversample OS the 1x grid
// lands on sub-phase OS-1, not 0. Decimating on sub-phase 0 costs a half sample
// and destroys the comparison -- dsp.mjs defaults to OS-1.)

/** Best NCC of `ref` against `sig` starting near `off`, over lags in [-max, +max]. */
function bestNcc(ref, sig, off, maxLag = 8) {
  let best = -1, bestLag = 0;
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    const s = off + lag;
    if (s < 0 || s + ref.length > sig.length) continue;
    const v = ncc(ref, sig.subarray(s, s + ref.length));
    if (v > best) { best = v; bestLag = lag; }
  }
  return { ncc: best, lag: bestLag };
}

// ------------------------------------------------------------------------- main

const WARMUP = 480;
const ceil32 = (x) => Math.ceil(x / 32) * 32;

/** Instrument start offsets in the 1x stream (see MXM_NOTES.md sec.4). */
function sampleOffsets(lengths) {
  const offs = []; let cur = 0;
  for (const len of lengths) { offs.push(cur); cur = ceil32(cur + len + WARMUP); }
  return offs;
}

const oracle = oracleSamples(
  new Uint8Array(readFileSync(join(HERE, '..', 'reference', 'oracle', 'dst_vega.xm'))));
const lengths = oracle.map((o) => o.frames);
const offsets = sampleOffsets(lengths);

console.log(`oracle samples: ${oracle.length}  lengths: ${lengths.join(',')}`);
console.log(`1x offsets    : ${offsets.join(',')}\n`);

const s1 = synthesizeFloat(undefined, { oversample: 1 }).pcm;
const s2raw = synthesizeFloat(undefined, { oversample: 2 }).pcm;
const s2naive = decimateNaive(s2raw, 2);
const s2band = decimate(s2raw, 2);

// quantized 1x variants, to show what 16-bit buys over 8-bit
const q = (src, bits) => {
  const out = new Float32Array(src.length);
  const s = bits === 8 ? 1 : 256, lo = bits === 8 ? -128 : -32768,
    hi = bits === 8 ? 127 : 32767;
  for (let i = 0; i < src.length; i++) {
    out[i] = Math.min(hi, Math.max(lo, Math.round(src[i] * s))) / s;
  }
  return out;
};
const s1q8 = q(s1, 8), s1q16 = q(s1, 16);

// sanity: the control must reproduce the 1x stream (same continuous process,
// sampled finer then folded back). If this is not ~1.0 the 2x port is wrong.
{
  const n = Math.min(s1.length, s2naive.length);
  let maxAbs = 0;
  for (let i = 0; i < n; i++) maxAbs = Math.max(maxAbs, Math.abs(s1[i] - s2naive[i]));
  console.log(`control check: max |1x - naive(2x)| = ${maxAbs.toExponential(3)} `
    + `(NCC ${ncc(s1.subarray(0, n), s2naive.subarray(0, n)).toFixed(6)})\n`);
}

const rows = [];
for (let i = 0; i < oracle.length; i++) {
  const ref = oracle[i].pcm, off = offsets[i];
  rows.push({
    i,
    len: lengths[i],
    f1: bestNcc(ref, s1, off).ncc,
    q8: bestNcc(ref, s1q8, off).ncc,
    q16: bestNcc(ref, s1q16, off).ncc,
    ctl: bestNcc(ref, s2naive, off).ncc,
    band: bestNcc(ref, s2band, off).ncc,
  });
}

const mean = (k) => rows.reduce((s, r) => s + r[k], 0) / rows.length;
const worst = (k) => rows.reduce((s, r) => Math.min(s, r[k]), 1);

console.log('ins  len    1x-float  1x-int8  1x-int16  2x->naive  2x->bandlimited');
for (const r of rows) {
  console.log(
    `${String(r.i).padStart(3)}  ${String(r.len).padStart(5)}    `
    + `${r.f1.toFixed(4)}   ${r.q8.toFixed(4)}   ${r.q16.toFixed(4)}    `
    + `${r.ctl.toFixed(4)}     ${r.band.toFixed(4)}`);
}
console.log('\nmean  ',
  ['f1', 'q8', 'q16', 'ctl', 'band'].map((k) => mean(k).toFixed(4)).join('  '));
console.log('worst ',
  ['f1', 'q8', 'q16', 'ctl', 'band'].map((k) => worst(k).toFixed(4)).join('  '));

console.log('\nVERDICT: band-limited-2x mean NCC vs oracle = ' + mean('band').toFixed(4)
  + (mean('band') >= 0.98
    ? '  >= 0.98 -> aliasing NOT load-bearing, ADOPT oversampling.'
    : '  <  0.98 -> aliasing IS the instrument, DO NOT adopt oversampling.'));

// how much of the 1x band actually sits above Nyquist/2 (i.e. would be lost)?
let eLo = 0, eHi = 0;
for (let i = 0; i < s1.length; i++) {
  const lo = s2band[i] ?? 0;
  eLo += lo * lo;
  const d = s1[i] - lo;
  eHi += d * d;
}
console.log(`energy removed by band-limiting: ${(100 * eHi / (eLo + eHi)).toFixed(1)}%`
  + ` of the 1x stream (${(10 * Math.log10(eHi / eLo)).toFixed(1)} dB relative)`);

// headroom check for the 16-bit path
let fmin = Infinity, fmax = -Infinity, clip8 = 0;
for (const v of s1) {
  if (v < fmin) fmin = v; if (v > fmax) fmax = v;
  if (v > 127 || v < -128) clip8++;
}
console.log(`1x float range: [${fmin.toFixed(2)}, ${fmax.toFixed(2)}], `
  + `samples outside int8 range: ${clip8} / ${s1.length}`);
