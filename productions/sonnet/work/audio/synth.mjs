// Sonnet — softsynth port.
//
// Original: FMUSIC_LoadSong's SAMPLELOADCALLBACK @0x00402f19 dispatches on a
// mode word; mode 1 runs the generator @0x00403580. Ghidra fails to decompile
// that function (x87), so everything here is transcribed from ndisasm output.
//
// Signal chain, per sample slot:
//   1. three-partial oscillator bank driven by a step sequencer  (loop @0x004035de)
//   2. per-sample-recomputed 4th-order Butterworth LP or HP      (loop @0x00403803)
//   3. optional single-tap feedback delay                        (loop @0x004038fc)
//   4. write out as 16-bit (truncating wrap) or 8-bit (>>8)      (      @0x00403957)
//
// All arithmetic is float32 where the original stores through a `fstp dword`;
// Math.fround marks each of those points. Integer conversions are x87 ftol with
// the rounding mode forced to truncate (@0x00404224), i.e. Math.trunc.

const fr = Math.fround;

/** Samples per sequencer step. FUN_004031b8: N = lengthUnits * 0x0ac4. */
export const STEP_SAMPLES = 0x0ac4; // 2756 ≈ 44100/16

// Constants read straight out of the image, not the decompile.
const C_BASEFREQ = fr(523.2511596679688); // 0x00418204 — C-5
const C_RATE = fr(44096.0); //               0x00418274 — the synth's own "sample rate"
const C_SAW_SCALE = fr(65536.0); //          0x00418270
const C_PEAK = fr(32767.0); //               0x0041826c
const C_255 = fr(255.0); //                  0x00418268
const C_CUTOFF_MAX = fr(0.49); //            0x00418264
const C_CUTOFF_MIN = fr(0.01); //            0x00418260
const C_DECAY_SCALE = fr(4.0); //            0x00418230
const C_RES_SCALE = fr(100.0); //            0x004170c0
const C_CLIP = 32000; //                     0x00418210 (32000.0f), ftol'd in the filter ctor
const BW_Q1 = 0.765367; //                   0x00418258 — 4th-order Butterworth section 1
const BW_Q2 = 1.847759; //                   0x00418228 — section 2

/** Waveform ids stored in the parameter block (byte triple at payload end). */
export const WAVE = { SILENT: 0, SAW: 1, SINE: 2, SQUARE: 3, NOISE: 4 };

/**
 * MSVC rand() — FUN_00404258:  seed = seed*0x343fd + 0x269ec3; return (seed>>16)&0x7fff.
 *
 * The seed word at VA 0x0041a9b8 is 1 in the image and srand (FUN_0040424e) has
 * NO callers, but main (FUN_004160ff @0x004160ff) runs the whole scene precalc —
 * FUN_00402e4e(this) and FUN_00402d87(this,0xffff) — BEFORE audio init
 * FUN_00403039, and the texgen/meshgen call rand() an unknown number of times.
 * So the state at synth time is not knowable statically; it was recovered from
 * the oracle PCM by a full 32-bit sweep (re/audio/seedsearch.c) against the
 * first 16 samples of instrument 23, then rolled back 88192 LCG steps (the
 * number of rand() calls consumed by instruments 15..19).
 *
 * Only instruments 15..19 (1 noise partial) and 23 (2 noise partials) use the
 * noise oscillator; instruments 0..14 and 20..22 make no rand() calls at all,
 * so instrument 15 starts at the raw state below.
 */
export const SYNTH_RAND_SEED = 0x2be15a5b;

export class Rand {
  constructor(seed = SYNTH_RAND_SEED) { this.seed = seed >>> 0; }
  next() {
    this.seed = (Math.imul(this.seed, 0x343fd) + 0x269ec3) >>> 0;
    return (this.seed >>> 16) & 0x7fff;
  }
}

/** FUN_004031c5: freq = 523.2511596679688f * 2^(note/12). Note 0 is C-5. */
function noteToFreq(note) {
  return fr(Math.pow(2.0, fr(note / 12.0)) * C_BASEFREQ);
}

/**
 * FUN_0040326d — coefficients for two cascaded biquads forming a 4th-order
 * Butterworth lowpass. `cutoff` is a normalised frequency; the prewarp uses a
 * 512-entry tan table built in FUN_004031f6 (tan(i*PI/1024)) with linear
 * interpolation, which is close enough to Math.tan to be irrelevant here.
 */
function filterCoefficients(cutoff, resonance) {
  const k = 2.0 * Math.tan(Math.PI * cutoff);
  const ik = 1.0 / k;
  const q = fr(Math.sqrt(resonance));
  const tmp = ik * 4.0;
  const h = 2.0 - ik * ik * 8.0;
  const d1 = BW_Q1 / q;
  const g1 = 1.0 / ((d1 * 2.0 + tmp) * ik + 1.0);
  const d2 = BW_Q2 / q;
  const g2 = 1.0 / ((d2 * 2.0 + tmp) * ik + 1.0);
  return {
    gain: fr(g1 * g2), //          [this+0x10]
    a1s1: fr(h * g1), //           [this+0x14]
    a2s1: fr(1.0 - d1 * 4.0 * ik * g1), // [this+0x18]
    a1s2: fr(h * g2), //           [this+0x24]
    a2s2: fr(1.0 - d2 * 4.0 * ik * g2), // [this+0x28]
  };
}

/**
 * Generate one instrument sample.
 *
 * @param {object} p     parsed synth payload (see module.mjs)
 * @param {number} bits  8 or 16 — MiniFMOD passes the sample's own bit depth
 * @param {Rand}   rng   PRNG shared across the whole load, as in the original
 * @returns {Int16Array} for bits === 16, or {Int8Array} for bits === 8
 */
export function generateSample(p, bits = 16, rng = new Rand(1)) {
  const E = p.lengthUnits;
  const N = E * STEP_SAMPLES;
  const step = Math.trunc(N / E); // == STEP_SAMPLES, but computed as the original does
  const stepF = fr(N / E);
  const n1 = p.numSteps;
  const n2 = p.numFilterSteps;
  const amp = p.amp.map(fr);
  const detune = p.detune.map(fr);

  // ---- 1. oscillator bank ------------------------------------------------
  // Periods only depend on (sequencer step, partial), so hoist them out of the
  // sample loop; the original recomputes them every sample, to the same values.
  const period = [];
  const periodInt = [];
  for (let k = 0; k < n1; k++) {
    const rowP = [];
    const rowI = [];
    for (let j = 0; j < 3; j++) {
      const per = fr(C_RATE / noteToFreq(fr(p.seq[k].note + detune[j])));
      rowP.push(per);
      rowI.push(Math.trunc(per));
    }
    period.push(rowP);
    periodInt.push(rowI);
  }

  const buf = new Int32Array(N);
  for (let i = 0; i < N; i++) {
    const k = Math.trunc(i / step) % n1;
    const u = fr((i % step) / stepF);
    const { note, decay } = p.seq[k];
    let acc = 0;
    // 0x7f is the rest marker (`cmp byte [edi+eax],0x7f` @0x004035fe).
    if (note !== 127) {
      for (let j = 0; j < 3; j++) {
        const w = p.wave[j];
        if (w === WAVE.SILENT) continue;
        // a = trunc(i/period*period) which, for every N used here, is exactly i.
        const ph = fr((i % periodInt[k][j]) / period[k][j]);
        // Only the marked values round to float32; everything between a load and
        // the final `fstp dword [ebp-0x8]` stays in an x87 register.
        let v;
        if (w === WAVE.SAW) v = ph * C_SAW_SCALE - C_PEAK;
        else if (w === WAVE.SINE) v = fr(Math.sin(fr(ph * 2.0 * Math.PI))) * C_PEAK;
        else if (w === WAVE.SQUARE) v = ph < 0.5 ? -32767 : 32767;
        else v = 2 * rng.next() - 32767; // WAVE.NOISE
        acc = fr(v * amp[j] + acc);
      }
    }
    // Per-step linear decay: env = 1 - (decay/255 * 4) * u, floored at 0.
    const slope = fr(decay / C_255 * C_DECAY_SCALE);
    let env = fr(1.0 - slope * u);
    if (env < 0.0) env = 0.0;
    buf[i] = Math.trunc(fr(env * acc));
  }

  // ---- 2. filter sweep ---------------------------------------------------
  // The original news up the filter, then calls setParams() for every single
  // sample; the parameters only change once per step, so cache per step.
  const coefs = [];
  for (let m = 0; m < n2; m++) {
    const { cutoff, resonance } = p.filt[m];
    let fc = fr(C_CUTOFF_MAX - cutoff / C_255 * C_CUTOFF_MAX);
    if (fc === 0.0) fc = C_CUTOFF_MIN;
    const res = fr(1.0 + resonance / C_255 * C_RES_SCALE);
    coefs.push(filterCoefficients(fc, res));
  }

  // Both filter routines round every intermediate back to float32 (`fstp dword`)
  // and keep the four state words as float32 too, so fround has to appear at
  // exactly those five points or resonant settings drift by a few LSB.
  let z1 = 0, z2 = 0, w1 = 0, w2 = 0;
  const filtered = new Int32Array(N);
  for (let i = 0; i < N; i++) {
    const c = coefs[Math.trunc(i / step) % n2];
    const x = fr(buf[i]);
    const t1 = fr(x * c.gain - c.a1s1 * z1 - c.a2s1 * z2);
    const y1 = fr(t1 + 2.0 * z1 + z2);
    z2 = z1; z1 = t1;
    const t2 = fr(y1 - c.a1s2 * w1 - c.a2s2 * w2);
    const y2 = fr(t2 + 2.0 * w1 + w2);
    w2 = w1; w1 = t2;
    // FUN_004033d7 emits the lowpass; FUN_0040349f emits input-minus-lowpass.
    let o = Math.trunc(p.filterIsHighpass ? x * 1.0 - y2 : y2);
    if (o > C_CLIP) o = C_CLIP;
    if (o < -C_CLIP) o = -C_CLIP;
    filtered[i] = o;
  }
  buf.set(filtered);

  // ---- 3. feedback delay -------------------------------------------------
  // Skipped entirely when feedback is 0.0. Writes back into the same buffer it
  // reads, so the tap feeds itself: a real recirculating echo.
  if (p.echoFeedback !== 0.0) {
    const delay = fr(p.echoDelay);
    const fb = fr(p.echoFeedback);
    for (let i = 0; i < N; i++) {
      const k = Math.trunc(fr(fr(i) - delay));
      if (k < 0) continue;
      let v = Math.trunc(buf[k] * fb + buf[i]);
      if (v < -32000) v = -32000;
      if (v > 32000) v = 32000;
      buf[i] = v;
    }
  }

  // ---- 4. output ---------------------------------------------------------
  if (bits === 8) {
    const out = new Int8Array(N);
    for (let i = 0; i < N; i++) out[i] = (buf[i] >> 8) & 0xff;
    return out;
  }
  const out = new Int16Array(N);
  for (let i = 0; i < N; i++) out[i] = buf[i] & 0xffff; // truncating wrap, as `mov [eax],dx`
  return out;
}
