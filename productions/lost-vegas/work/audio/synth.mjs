// synth.mjs - Node port of the "Lost Vegas" (threestate, 2000) procedural softsynth.
//
// Faithful port of the cosine-additive synth in 3s-vegas-u.exe:
//   FUN_00401000  (build WAVE + WIN cosine tables)      @0x401000
//   FUN_004010c0  (unpack the partial-parameter bitstream) @0x4010c0
//   FUN_004011e9  (per-step additive synthesis core)     @0x4011e9
//   FUN_0040123d  (driver: decode + synth + round/clamp to signed 8-bit) @0x40123d
//
// The instrument PCM samples are NOT stored in the module; they are regenerated
// here from the parameter bitstream (&DAT_00418008) using constants read from the
// binary. Output is one continuous stream from which mxm2xm.mjs carves the
// individual instrument samples (concatenated in sample-index order).
//
// Ported from the x86 disassembly (ndisasm), not the Ghidra C, because the
// decompiler mangled several pointer offsets (notably the +0x60 param stride).
//
// RESTORATION EXTENSIONS (additive, opt-in; the defaults reproduce the original
// byte-for-byte):
//   bits       : 8 (original) | 16  -- quantization width of the emitted PCM.
//                The synthesis core always works in float; the original threw
//                ~48 dB away at the final round-to-int8 purely for the 2000-era
//                8-bit sample format. bits:16 keeps it (same clip ceiling).
//   oversample : 1 (original) | 2 | 4 -- generate at N x the original sample
//                rate. Every cosine phase increment is divided by N and every
//                buffer length (WAVE table, WIN window, ACC delay line, step
//                size, warm-up) is multiplied by N, so the *timbre* is the same
//                continuous function sampled more finely. Callers must shift the
//                XM relativeNote by +12*log2(N) to keep the pitch.
//                NOTE: this removes the partials that folded down at 1x. See
//                oversample_test.mjs -- for this instrument set the aliasing is
//                load-bearing, so mxm2xm.mjs ships oversample:1.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

// Constants read verbatim from the .rdata section (image base 0x400000):
//   0x412080 : float  pi/256      (WAVE table cosine frequency)
//   0x412078 : double pi/64       (WIN  table cosine frequency, loaded via fmul qword)
//   0x412088 : double 1/256       (bitstream value scale)
//   0x41a284 : float[8]           additive harmonic coefficients
const FREQ0 = 0.012271846644580364;          // pi/256  (single)
const FREQ1 = 0.04908738521234052;           // pi/64   (double)
const SCALE = 0.00390625;                     // 1/256
const COEFS = [
  0.12499599903821945, -0.25, 0.2490610033273697, -0.23483100533485413,
  0.17678199708461761, -0.0857359990477562, 0.021642999723553658,
  -0.0019330000504851341,
];

// Float32 work buffer layout at oversample factor OS (float indices; the 1x case
// reproduces the original layout from base &DAT_00421668 exactly):
//   WAVE  512*OS  floats  (waveform from 8 harmonics)
//   WIN   32*64*OS floats (32 rows x 64*OS cosine-window basis)
//   ACC   512*OS  floats  (overlap-add accumulator / delay line)
//   PARAM 512     floats  (16 steps x 32 partials, decoded; rate-independent)
const PARTIALS = 32;        // partials per step
const WINCOLS = 64;         // window length at 1x
const TILES = 8;            // WAVE/ACC = TILES * WINCOLS
const STEP = 32;            // output samples per synthesis step at 1x
const WARMUP_STEPS = 15;    // 0x1e0 / 32 -- filter priming discarded by the driver

const fr = Math.fround; // the original stores intermediates as 32-bit floats

function layout(OS) {
  const winCols = WINCOLS * OS;
  const accLen = TILES * winCols;              // 512*OS
  return {
    OS, winCols, accLen, step: STEP * OS,
    WAVE: 0,
    WIN: accLen,
    ACC: accLen + PARTIALS * winCols,
    PARAM: accLen + PARTIALS * winCols + accLen,
    total: accLen + PARTIALS * winCols + accLen + 16 * PARTIALS,
  };
}

// FUN_00401000: build the WAVE and WIN cosine tables, zero the ACC region.
// At OS>1 the same continuous functions are sampled OS times more finely.
function buildTables(buf, L) {
  const { OS, WAVE, WIN, ACC, accLen, winCols } = L;
  // WAVE[k] = +/- sum_{j=0..7} coef[j] * cos((j*k) * pi/256), negated when k&0x40
  const f0 = FREQ0 / OS;
  const negMask = 0x40 * OS;
  for (let k = 0; k < accLen; k++) {
    let acc = 0, n = 0;
    for (let j = 0; j < 8; j++) {
      acc = fr(fr(Math.cos(n * f0) * COEFS[j]) + acc);
      n += k;
    }
    if (k & negMask) acc = -acc;
    buf[WAVE + k] = acc;
  }
  // WIN: 32 rows m, each 64*OS cols; row m uses n0=-16-32m, step=(1+2m)/OS, freq pi/64
  let idx = WIN;
  for (let m = 0; m < PARTIALS; m++) {
    const step = (1 + 2 * m) / OS;
    let n = -16 - 32 * m;
    for (let col = 0; col < winCols; col++) {
      buf[idx++] = fr(Math.cos(n * FREQ1));
      n += step;
    }
  }
  for (let i = ACC; i < ACC + accLen; i++) buf[i] = 0;
}

// FUN_004010c0: decode one block of up to 16 step-values for all 32 partials.
// Writes PARAM[step*0x20 + partial]. Returns number of stream bytes consumed.
// Rate-independent: the parameter stream is per synthesis step, not per sample.
function decodeBlock(buf, PARAM, stream, pos, count) {
  const dv = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);
  const m1 = dv.getUint32(pos, true) >>> 0;
  const m2 = dv.getUint32(pos + 4, true) >>> 0;
  const m3 = dv.getUint32(pos + 8, true) >>> 0;
  let bpos = pos + 12;
  for (let p = 0; p < 32; p++) {
    const bit = (1 << p) >>> 0;
    const b1 = (m1 & bit) !== 0, b2 = (m2 & bit) !== 0, b3 = (m3 & bit) !== 0;
    let nbits, shift;
    if (b1 && b2) { nbits = 4; shift = 4; }
    else if (b1 && b3) { nbits = 4; shift = 3; }
    else if (b2 && b3) { nbits = 4; shift = 2; }
    else if (b1) { nbits = 2; shift = 2; }
    else if (b2) { nbits = 2; shift = 1; }
    else if (b3) { nbits = 2; shift = 0; }
    else { // zero-fill this partial across the block
      for (let s = 0; s < count; s++) buf[PARAM + s * 0x20 + p] = 0;
      continue;
    }
    let bitsLeft = 0, cur = 0;
    for (let s = 0; s < count; s++) {
      if (bitsLeft === 0) { cur = stream[bpos++]; bitsLeft = 8; }
      // signed value extraction (exact port of the x86 shift/mask sequence)
      let b = (cur << 24) >> 24;        // movsx: sign-extend 8-bit
      b = (b << nbits) & 0xffffff80;    // shl nbits ; and ~0x7f
      b = ((b & ~0xff) | 0x80) | 0;     // or bl,0x80  -> low byte becomes 0x80
      b = (b << shift) | 0;             // shl shift (signed 32-bit)
      buf[PARAM + s * 0x20 + p] = fr(b * SCALE);
      cur = (cur << nbits) & 0xff;
      bitsLeft -= nbits;
    }
  }
  return bpos - pos;
}

// FUN_004011e9: additive synthesis of one step into ACC.
function synthStep(buf, L, paramBase) {
  const { WAVE, WIN, ACC, winCols } = L;
  for (let t = 0; t < winCols; t++) {
    let acc3 = 0;
    for (let i = 0; i < PARTIALS; i++) {
      acc3 = fr(fr(buf[paramBase + i] * buf[WIN + i * winCols + t]) + acc3);
    }
    for (let k = 0; k < TILES; k++) {
      const at = ACC + t + k * winCols;
      buf[at] = fr(fr(acc3 * buf[WAVE + t + k * winCols]) + buf[at]);
    }
  }
}

// FUN_0040123d without the final quantizer: returns the raw float sample stream
// (the values the x87 code would have had on the stack before `round`), with the
// leading WARMUP_STEPS priming samples already dropped.
export function synthesizeFloat(streamBytes, { oversample = 1 } = {}) {
  const OS = oversample | 0;
  if (!(OS === 1 || OS === 2 || OS === 4 || OS === 8)) {
    throw new Error(`oversample must be a power of two 1..8 (got ${oversample})`);
  }
  const stream = streamBytes ??
    new Uint8Array(readFileSync(join(HERE, 'synth_params.bin')));
  const dv = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);
  const count = dv.getUint32(0, true) >>> 0;

  const L = layout(OS);
  const buf = new Float32Array(L.total);
  buildTables(buf, L);

  const { ACC, PARAM, accLen, step } = L;
  const raw = new Float32Array(count * step);
  let outPos = 0;
  let readPos = 4;      // skip the count dword
  let stepInBlock = 16; // force a decode on the first iteration

  for (let g = 0; g < count; g++) {
    if (stepInBlock === 16) {
      const n = Math.min(count - g, 16);
      readPos += decodeBlock(buf, PARAM, stream, readPos, n);
      stepInBlock = 0;
    }
    synthStep(buf, L, PARAM + stepInBlock * 0x20);

    // read `step` samples from the top of ACC, descending
    for (let j = 0; j < step; j++) raw[outPos++] = buf[ACC + accLen - 1 - j];
    // shift ACC up by `step`
    for (let k = accLen - 1; k >= step; k--) buf[ACC + k] = buf[ACC + k - step];
    // clear the bottom `step` floats for next accumulation
    for (let k = 0; k < step; k++) buf[ACC + k] = 0;

    stepInBlock++;
  }

  // drop the priming samples (0x1e0 = 480 at 1x)
  return {
    pcm: raw.subarray(WARMUP_STEPS * step),
    count, oversample: OS, step, warmup: WARMUP_STEPS * step,
  };
}

// FUN_0040123d: full driver. Returns { pcm, count, bits, oversample } where pcm is
// the concatenated instrument sample stream (priming samples dropped).
//   bits: 8  -> Int8Array,  round + clamp to [-128, 127]   (original behaviour)
//   bits: 16 -> Int16Array, round(v*256) + clamp to [-32768, 32767]
// The 16-bit clip ceiling (+127.996) is within 1 LSB8 of the original's (+127), so
// the (rare) clipping character of the original is preserved; only the
// quantization floor moves down by 48 dB.
export function synthesize(streamBytes, { bits = 8, oversample = 1 } = {}) {
  if (bits !== 8 && bits !== 16) throw new Error(`bits must be 8 or 16 (got ${bits})`);
  const f = synthesizeFloat(streamBytes, { oversample });
  const n = f.pcm.length;
  let pcm;
  if (bits === 8) {
    pcm = new Int8Array(n);
    for (let i = 0; i < n; i++) {
      let v = Math.round(f.pcm[i]);   // round-half-up ~ x87 rint (ties rare)
      if (v > 127) v = 127; else if (v < -128) v = -128;
      pcm[i] = v;
    }
  } else {
    pcm = new Int16Array(n);
    for (let i = 0; i < n; i++) {
      let v = Math.round(f.pcm[i] * 256);
      if (v > 32767) v = 32767; else if (v < -32768) v = -32768;
      pcm[i] = v;
    }
  }
  return { pcm, count: f.count, bits, oversample: f.oversample, step: f.step };
}

// CLI: node synth.mjs [--bits=16] [--oversample=2]  -> prints stats
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (name, dflt) => {
    const m = process.argv.find((a) => a.startsWith(`--${name}=`));
    return m ? Number(m.split('=')[1]) : dflt;
  };
  const bits = arg('bits', 8), oversample = arg('oversample', 1);
  const { pcm, count } = synthesize(undefined, { bits, oversample });
  let min = Infinity, max = -Infinity, nz = 0;
  for (const v of pcm) { if (v < min) min = v; if (v > max) max = v; if (v) nz++; }
  console.log(`steps=${count} bits=${bits} os=${oversample} samples=${pcm.length} `
    + `min=${min} max=${max} nonzero=${nz}`);
}
