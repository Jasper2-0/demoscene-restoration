// dsp.mjs - small DSP helpers shared by the audio validation scripts.
// Nothing here is part of the restoration proper; it exists so that
// oversample_test.mjs and validate.mjs measure the same way.

/** Normalized cross-correlation of two equal-length signals (means removed). */
export function ncc(a, b) {
  const n = Math.min(a.length, b.length);
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma, y = b[i] - mb;
    num += x * y; da += x * x; db += y * y;
  }
  return (da === 0 || db === 0) ? 0 : num / Math.sqrt(da * db);
}

/** Blackman-windowed sinc low-pass kernel, cutoff `fc` in cycles/sample. */
export function lowpassKernel(taps, fc) {
  const h = new Float64Array(taps);
  const M = taps - 1;
  let sum = 0;
  for (let n = 0; n <= M; n++) {
    const x = n - M / 2;
    const s = x === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * x) / (Math.PI * x);
    const w = 0.42 - 0.5 * Math.cos((2 * Math.PI * n) / M)
      + 0.08 * Math.cos((4 * Math.PI * n) / M);
    h[n] = s * w; sum += h[n];
  }
  for (let n = 0; n <= M; n++) h[n] /= sum;   // unity DC gain
  return h;
}

/**
 * Band-limited decimation by `factor`, group-delay compensated.
 * `phase` selects which sub-sample of each output period is kept (see the note in
 * oversample_test.mjs: the synth's descending delay-line read puts the 1x grid on
 * sub-phase factor-1).
 */
export function decimate(sig, factor, { taps = 255, phase = factor - 1 } = {}) {
  const h = lowpassKernel(taps, 0.5 / factor);
  const half = (taps - 1) >> 1;
  const outLen = Math.floor((sig.length - phase) / factor);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const c = i * factor + phase + half;      // +half undoes the FIR group delay
    let acc = 0;
    const kFrom = Math.max(0, c - sig.length + 1), kTo = Math.min(taps - 1, c);
    for (let k = kFrom; k <= kTo; k++) acc += h[k] * sig[c - k];
    out[i] = acc;
  }
  return out;
}

/** Naive decimation: keep every `factor`-th sample (folds the upper band back down). */
export function decimateNaive(sig, factor, phase = factor - 1) {
  const out = new Float32Array(Math.floor((sig.length - phase) / factor));
  for (let i = 0; i < out.length; i++) out[i] = sig[i * factor + phase];
  return out;
}

// ------------------------------------------------------------------------- FFT

/** In-place iterative radix-2 Cooley-Tukey FFT. `inverse` scales by 1/n. */
export function fft(re, im, inverse = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (inverse ? 2 : -2) * Math.PI / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k], ai = im[i + k];
        const br = re[i + k + len / 2], bi = im[i + k + len / 2];
        const tr = br * cr - bi * ci, ti = br * ci + bi * cr;
        re[i + k] = ar + tr; im[i + k] = ai + ti;
        re[i + k + len / 2] = ar - tr; im[i + k + len / 2] = ai - ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

/**
 * Exact normalized cross-correlation of `a` against `b` for every integer lag in
 * [lagMin, lagMax], where lag L means a[n+L] lines up with b[n].
 *
 * The numerator comes from one FFT correlation; the per-lag energies come from
 * prefix sums, so the result is a true NCC at each lag rather than a raw dot
 * product. Returns { lags: Float64Array, best: {lag, ncc} }.
 *
 * A CONSTRAINED window is mandatory for this material: Lost Vegas repeats
 * patterns every ~3.7 s, so a global argmax happily locks onto the wrong bar.
 */
export function nccCurve(a, b, lagMin, lagMax) {
  const Na = a.length, Nb = b.length;
  let ma = 0, mb = 0;
  for (let i = 0; i < Na; i++) ma += a[i];
  for (let i = 0; i < Nb; i++) mb += b[i];
  ma /= Na; mb /= Nb;

  let n = 1;
  while (n < Na + Nb) n <<= 1;
  const ar = new Float64Array(n), ai = new Float64Array(n);
  const br = new Float64Array(n), bi = new Float64Array(n);
  for (let i = 0; i < Na; i++) ar[i] = a[i] - ma;
  for (let i = 0; i < Nb; i++) br[i] = b[i] - mb;
  fft(ar, ai); fft(br, bi);
  for (let i = 0; i < n; i++) {          // A * conj(B)
    const xr = ar[i] * br[i] + ai[i] * bi[i];
    const xi = ai[i] * br[i] - ar[i] * bi[i];
    ar[i] = xr; ai[i] = xi;
  }
  fft(ar, ai, true);                     // ar[k] = sum_m a[m+k]*b[m]

  // prefix sums of squares for the per-lag energy normalisation
  const cumA = new Float64Array(Na + 1), cumB = new Float64Array(Nb + 1);
  for (let i = 0; i < Na; i++) { const v = a[i] - ma; cumA[i + 1] = cumA[i] + v * v; }
  for (let i = 0; i < Nb; i++) { const v = b[i] - mb; cumB[i + 1] = cumB[i] + v * v; }

  const out = new Float64Array(lagMax - lagMin + 1);
  let best = { lag: lagMin, ncc: -2 };
  for (let L = lagMin; L <= lagMax; L++) {
    const lo = Math.max(0, -L), hi = Math.min(Nb, Na - L);
    if (hi - lo < 1000) continue;
    const num = ar[((L % n) + n) % n];
    const Ea = cumA[hi + L] - cumA[lo + L];
    const Eb = cumB[hi] - cumB[lo];
    const v = (Ea <= 0 || Eb <= 0) ? 0 : num / Math.sqrt(Ea * Eb);
    out[L - lagMin] = v;
    if (v > best.ncc) best = { lag: L, ncc: v };
  }
  return { lags: out, lagMin, best };
}

/** Short-time RMS envelope, `hop`-sample frames. */
export function envelope(sig, hop = 128) {
  const n = Math.floor(sig.length / hop);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < hop; k++) { const v = sig[i * hop + k]; s += v * v; }
    out[i] = Math.sqrt(s / hop);
  }
  return out;
}
