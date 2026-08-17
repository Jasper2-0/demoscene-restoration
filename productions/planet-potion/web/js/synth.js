// synth.js — the softsynth: the primitives that build both DigiBooster modules.
//
// The intro ships ~37 KB of seed data and expands it to 8.3 MB of music at
// startup. Until this file is finished the browser downloads those 8.3 MB,
// which is the largest single thing between this port and being self-contained.
//
// WHAT IS ACTUALLY GENERATED, which is less than PORT_SPEC §8i suggests.
// Everything in each module before its first sample — DBM0, NAME, INFO, SONG,
// INST, VENV, DSPE, PATT and the SMPL chunk header — is ONE CONTIGUOUS LITERAL
// in seg4, copied verbatim. It is not even located by a hardcoded offset: `r2`
// holds a pointer to a self-describing `[u32 length][bytes…]` descriptor, one
// per part, and `0x10006ef0` copies what it finds there.
//
//     part 1   descriptor r2+0x2f06 -> 0x10047f80   17,882 bytes
//     part 3   descriptor r2+0x2f02 -> 0x10044e0c   12,656 bytes
//
// `synthref.py` verifies both against the built modules on every run. So there
// is no container to assemble and no chunk to lay out, and the ENTIRE remaining
// problem is PCM.
//
// That also settles the call arithmetic exactly. Part one's script is 57 calls,
// the first being the blob copy, leaving 56 — and part one's SMPL holds 56
// samples. Part three is 39 and 38. Every call after the first appends exactly
// one sample, which is what lets `synthref.py` hand each of the 94 samples a
// byte-exact target of its own, and `synthdiff.mjs` check them one at a time.
//
// THE MACHINE MODEL. PowerPC FPRs are doubles and JS numbers are doubles, so
// most of this is plain arithmetic:
//
//   * `lfs` loads a float32 and widens it exactly — the float pool and the
//     parameter blocks are read this way.
//   * `fmul`/`fadd`/`fsub`/`fdiv` are the DOUBLE forms in this binary even
//     though their inputs came from `lfs`. Plain `*`, `+`, `-`, `/` match.
//   * `fmadd` is FUSED — one rounding, not two. `fma()` from fp.js.
//   * the `…s` forms (`fmuls`, `fnmsubs`) round their result to single:
//     `Math.fround`, which is correct rounding.
//   * `stfs`/`stfsx` STORES TRUNCATE — fp.js's `f32`, a DIFFERENT operation
//     from `Math.fround`. Every float this synth keeps in memory between
//     frames goes through it, so it is not a detail.
//   * `fctiw` rounds to nearest, ties to even — tables.js. Not `Math.trunc`.
import { f32, fma } from './fp.js';
import { fctiw, sinLookup, cosLookup, powLookup, expLookup } from './tables.js';

const SEG0 = 0x10000000;
const SEG4 = 0x10040000;
// r2 is the small-data base, biased by -2: the binary does `LEA $7FFE,A4`, so
// every `r2+disp` in the disassembly resolves to seg0 + 0x7ffe + disp.
const R2 = 0x7ffe;

/** The two generators, as the address ranges their scripts occupy in seg0. */
export const SCRIPTS = {
  p1: { lo: 0x10006b6c, hi: 0x10006da0, descriptor: 0x2f06 },
  p3: { lo: 0x10006da0, hi: 0x10006ef0, descriptor: 0x2f02 },
};

/** The blob copier — first call of each script, and the only non-producer. */
export const HEADER_ROUTINE = 0x10006ef0;

/**
 * Walk a script's `bl`s and the register setup between them.
 *
 * The generators are straight-line: an `addi rN, r2, disp` or two setting
 * parameter-block pointers, then a `bl`. Decoding this at run time rather than
 * shipping a table is both the faithful reading and the cheaper one — the
 * script is already in the bytes we have to carry anyway.
 *
 * `r8` IS STICKY and this is why the walk must not clear everything per call:
 * the script sets it once and several following calls run under it. Only the
 * registers actually written since the previous `bl` are reported as that
 * call's setup, exactly as synthscript.py does it, and the caller carries the
 * rest forward.
 */
export function decodeScript(seg0, lo, hi) {
  const dv = new DataView(seg0.buffer, seg0.byteOffset, seg0.byteLength);
  const out = [];
  let regs = {};
  for (let a = lo; a < hi; a += 4) {
    const w = dv.getUint32(a - SEG0, false);
    const op = w >>> 26;
    const rD = (w >>> 21) & 31, rA = (w >>> 16) & 31;
    const imm = w & 0xffff;
    const simm = imm & 0x8000 ? imm - 0x10000 : imm;
    if (op === 18 && (w & 1)) {                       // bl
      let li = w & 0x03fffffc;
      if (li & 0x02000000) li -= 0x04000000;
      out.push({ at: a, call: a + li, setup: regs });
      regs = {};
    } else if (op === 14 && rA === 2) {               // addi rD, r2, disp
      regs[`r${rD}`] = { r2: simm };
    } else if (op === 14 && rA === 0) {               // li rD, imm
      regs[`r${rD}`] = simm;
    } else if (op === 15) {                           // lis rD, imm
      regs[`r${rD}`] = imm << 16;
    } else if (op === 24 && rD === rA) {              // ori — completes a lis
      if (typeof regs[`r${rD}`] === 'number') regs[`r${rD}`] |= imm;
    } else if (op === 32 && rA === 2) {               // lwz rD, disp(r2)
      regs[`r${rD}`] = { load: simm };
    } else if (op === 48 && rA === 2) {               // lfs fD, disp(r2)
      regs[`f${rD}`] = { r2: simm };
    }
  }
  return out;
}

/**
 * The generator's register file and address space, named after the registers.
 *
 * Keeping the original's names is deliberate. Every routine here is a
 * transcription of PowerPC that will be re-read against the disassembly many
 * times before all 32 are done, and a reader checking `f28` against
 * `fmr f28, f30` should not first have to learn what we renamed it to. The ABI
 * table in PORT_SPEC §8c is the glossary.
 */
export class SynthContext {
  /**
   * @param {Uint8Array} seg0  code, float pool, and the 42 parameter blocks —
   *                           COPIED, because the synth writes to it
   * @param {Uint8Array} seg4  seed data: header blobs and tapes
   * @param {{sinus:Float32Array, power:Float32Array, mexp:Float32Array}} tables
   */
  constructor(seg0, seg4, tables) {
    // MUTABLE. The reverb keeps its cursors, its filter coefficients and its
    // two allpass states in the small-data area — `stw r5, 0x2ec2(r2)`,
    // `stfs f3, 0x2e72(r2)` — so seg0 is working memory here, not a constant.
    // A port that maps it read-only appears to work until the second call.
    this.seg0 = seg0.slice();
    this.seg4 = seg4;
    this.d0 = new DataView(this.seg0.buffer);
    this.d4 = new DataView(seg4.buffer, seg4.byteOffset, seg4.byteLength);
    this.sinus = tables.sinus;
    this.power = tables.power;
    this.mexp = tables.mexp;

    // The six delay lines the reverb runs on live in seg6's BSS at
    // 0x1114c760 on 80,000-byte centres. Their addresses are read out of
    // `r2+0x2eea…0x2efe` rather than assumed, so this allocation only has to
    // cover the span those pointers describe.
    this.delayBase = this.w(0x2eea);
    const last = this.w(0x2efe);
    this.delay = new Float32Array((last - this.delayBase + 80000) / 4);

    this.out = null;      // the module being built
    this.r31 = 0;         // module write cursor, held across the whole script
    this.r19 = 0;         // sample length in frames
    this.r18 = 1;         // frames per step
    this.r20 = 0;         // frame index within the sample
    this.r16 = 0;         // steps done
    this.r17 = 0;         // frame within the step
    this.r15 = 0;
    this.f29 = 0;         // the value the emitter is about to write
    this.f30 = 1;         // constant 1.0, from r2+0x2ce2
    this.f31 = 0;         // constant 0.0
  }

  // --- reading and writing -------------------------------------------------

  /** float32 at `r2 + disp` — an `lfs fN, disp(r2)`. */
  k(disp) { return this.d0.getFloat32(R2 + disp, false); }

  /** u32 at `r2 + disp` — `lwz`, used for the relocated pointers. */
  w(disp) { return this.d0.getUint32(R2 + disp, false); }

  /** `stw rN, disp(r2)`. */
  setw(disp, v) { this.d0.setUint32(R2 + disp, v >>> 0, false); }

  /** `stfs fN, disp(r2)` — TRUNCATES, see fp.js. */
  setk(disp, v) { this.d0.setFloat32(R2 + disp, f32(v), false); }

  /** unsigned byte at an absolute address in seg0 or seg4. */
  u8(addr) {
    return addr >= SEG4 ? this.seg4[addr - SEG4] : this.seg0[addr - SEG0];
  }

  /** signed byte — `lbz` then `slwi 24`/`srawi 24`, which is a sign extend. */
  s8(addr) { return (this.u8(addr) << 24) >> 24; }

  /** big-endian u16 at an absolute address. */
  u16(addr) {
    return addr >= SEG4
      ? this.d4.getUint16(addr - SEG4, false)
      : this.d0.getUint16(addr - SEG0, false);
  }

  /** float32 at an absolute address in seg0 or seg4. */
  f(addr) {
    return addr >= SEG4
      ? this.d4.getFloat32(addr - SEG4, false)
      : this.d0.getFloat32(addr - SEG0, false);
  }

  // --- the shared ABI routines ---------------------------------------------

  /**
   * `0x10006ef0(size, descriptor, dest)` — the module header.
   *
   * Loads the three table pointers into r30/r29/r28 and the constants 1.0 and
   * 0.0 into f30/f31, writes the u32 size prefix, then copies the blob the
   * descriptor describes. Sets `r31`, the cursor every later call appends at.
   *
   * The buffer is `[u32 size][DBM0…]`, so `DBM0` is at offset 0 OF THE MODULE
   * and offset 4 of the buffer — §8's warning against building a parser around
   * offset 4.
   */
  header(size, descriptorDisp) {
    this.out = new Uint8Array(4 + size);
    new DataView(this.out.buffer).setUint32(0, size, false);
    const desc = this.w(descriptorDisp) - SEG4;
    const len = this.d4.getUint32(desc, false);
    this.out.set(this.seg4.subarray(desc + 4, desc + 4 + len), 4);
    this.r31 = 4 + len;
    this.f30 = this.k(0x2ce2);
    this.f31 = this.f30 - this.f30;
    return len;
  }

  /**
   * `0x1000a23c(frames)` — start a sample.
   *
   * Writes `flags = 1` and the frame count, advances 8, and clears the frame,
   * step and phase counters along with NINE float accumulators. §8c says four;
   * the instruction sequence zeroes f28 down to f20.
   */
  startSample(frames) {
    const dv = new DataView(this.out.buffer);
    this.r19 = frames;
    dv.setUint32(this.r31, 1, false);
    dv.setUint32(this.r31 + 4, frames, false);
    this.r31 += 8;
    this.r20 = 0; this.r16 = 0; this.r17 = 0; this.r15 = 2;
    this.f28 = 0; this.f27 = 0; this.f26 = 0; this.f25 = 0; this.f24 = 0;
    this.f23 = 0; this.f22 = 0; this.f21 = 0; this.f20 = 0;
  }

  /**
   * `0x1000a114()` — emit one frame. Returns whether the sample continues.
   *
   * `float2int(f29)`, clamp to [-128, 127], store one byte, then advance the
   * frame index and the phase-within-step; on reaching `r18` the phase resets
   * and the step counter bumps. The routine ends on `cmpw r20, r19`, which
   * sets the condition register the CALLER's loop branches on — so that
   * comparison is the return value here, and every voice is
   * `do { … } while (c.emit())`.
   */
  emit() {
    let v = fctiw(this.f29);
    if (v > 127) v = 127;
    else if (v < -128) v = -128;
    this.out[this.r31++] = v & 0xff;
    this.r20++;
    this.r17++;
    if (this.r17 >= this.r18) { this.r17 = 0; this.r16++; }
    return this.r20 < this.r19;
  }

  // --- the four table accessors, §8f (which documents three) ----------------
  //
  // `0x1000a168` is sine WITHOUT the quarter-turn bias and is a separate entry
  // point from the cosine at `0x1000a18c`, so a port with only "cos" is missing
  // a function the voices call.

  sin(x) { return sinLookup(this.sinus, x, this.k(0x2e2a)); }
  cos(x) { return cosLookup(this.sinus, x, this.k(0x2e2a)); }
  pow2(x) { return powLookup(this.power, x, this.k(0x2e3a)); }
  exp(x) { return expLookup(this.mexp, x, this.k(0x2e22)); }
}

// --- the reverb, shared by several voices -----------------------------------
//
// Four comb filters in parallel into two allpass stages. All of its state —
// four cursors, four lengths, four feedback coefficients and two allpass
// accumulators — lives in the small-data area, so it persists across calls and
// across samples. That is why SynthContext copies seg0 instead of aliasing it.

/** Where each of the reverb's four taps keeps its cursor, buffer and length. */
const COMB = [
  { cursor: 0x2ec2, buffer: 0x2eea, length: 0x2eda, feedback: 0x2eaa },
  { cursor: 0x2ec6, buffer: 0x2eee, length: 0x2ede, feedback: 0x2eae },
  { cursor: 0x2eca, buffer: 0x2ef2, length: 0x2ee2, feedback: 0x2eb2 },
  { cursor: 0x2ece, buffer: 0x2ef6, length: 0x2ee6, feedback: 0x2eb6 },
];

/** The six delay lines the initialiser clears, in the order it clears them. */
const LINES = [0x2eea, 0x2eee, 0x2ef2, 0x2ef6, 0x2efa, 0x2efe];

/**
 * `0x10009f00` and its three alternate entries — configure and clear the reverb.
 *
 * One body with four entry points, each setting a different set of four delay
 * lengths and one of two feedback presets:
 *
 *     0x10009f00   0x778 0x1468 0x243c 0x2a68   -0.90 -0.75 -0.60 -0.55
 *     0x10009f40   0x534 0x1850  0xff4  0xf38   -0.80 -0.70 -0.60 -0.75
 *     0x10009f54   0x534 0x692c 0x4ed0 0x34b8   (same as above)
 *     0x10009f68   0x534 0x340c 0x1ff0 0x1578   (same as above)
 *
 * IT CLEARS 5,000 WORDS PER LINE, NOT THE WHOLE LINE. The lines sit on
 * 80,000-byte centres and the loop runs 0x1388 times, so exactly 20,000 bytes
 * of each are zeroed — while `0x692c` = 26,924 asks for more than that. On the
 * first call the rest is still BSS zero and it does not matter; on a later
 * call with a longer line it is stale audio from the previous configuration.
 * That is the original's behaviour, so it is reproduced rather than tidied.
 */
export function reverbInit(c, entry) {
  const PRESETS = {
    0x10009f00: { len: [0x778, 0x1468, 0x243c, 0x2a68], fb: 0x2e7a },
    0x10009f40: { len: [0x534, 0x1850, 0x0ff4, 0x0f38], fb: 0x2e92 },
    0x10009f54: { len: [0x534, 0x692c, 0x4ed0, 0x34b8], fb: 0x2e92 },
    0x10009f68: { len: [0x534, 0x340c, 0x1ff0, 0x1578], fb: 0x2e92 },
  };
  const p = PRESETS[entry];
  if (!p) throw new Error(`reverbInit: no entry ${entry.toString(16)}`);
  for (let i = 0; i < 4; i++) {
    c.setk(COMB[i].feedback, c.k(p.fb + i * 4));
    c.setw(COMB[i].length, p.len[i]);
  }
  for (const line of LINES) {
    const base = (c.w(line) - c.delayBase) >> 2;
    c.delay.fill(0, base, base + 5000);
  }
  for (const d of [0x2ec2, 0x2ec6, 0x2eca, 0x2ece, 0x2ed2, 0x2ed6, 0x2e72, 0x2e76]) {
    c.setw(d, 0);
  }
}

/**
 * `0x1000a0e8(cursor, buffer, length, feedback, input)` — one comb tap.
 *
 * Reads the line one slot AHEAD of the cursor (wrapped), writes
 * `delayed*feedback + input` at the cursor, and returns the delayed value with
 * the advanced cursor. The modulo is on BYTES and every length is a multiple
 * of four, so it stays aligned.
 *
 * The store is `stfsx` — truncating.
 */
function comb(c, tap, input) {
  const cursor = c.w(tap.cursor);
  const base = (c.w(tap.buffer) - c.delayBase) >> 2;
  const length = c.w(tap.length);
  const feedback = c.k(tap.feedback);
  let next = cursor + 4;
  const delayed = c.delay[base + ((next % length) >> 2)];
  c.delay[base + (cursor >> 2)] = f32(fma(delayed, feedback, input));
  if (next >= length) next = 0;
  c.setw(tap.cursor, next);
  return delayed;
}

/**
 * `0x1000a024(input, mix)` — the reverb proper.
 *
 * Four combs summed and scaled by 0.25, then two allpass stages on 0.70710677,
 * then a dry/wet mix. The allpass states are `stfs`-stored, so they truncate
 * every frame — over 32,768 frames that is not a rounding detail.
 */
export function reverb(c, input, mix) {
  let sum = 0;
  for (let i = 0; i < 4; i++) sum += comb(c, COMB[i], input);
  const kScale = c.k(0x2b96);          // 0.25
  const kAll = c.k(0x2c0e);            // 1/sqrt(2)
  let v = sum * kScale;
  for (const state of [0x2e72, 0x2e76]) {
    const s = c.k(state);
    const outv = s - v;
    c.setk(state, kAll * (v + s));
    v = outv;
  }
  return (c.f30 - mix) * input + v * mix;
}

// --- the primitives ---------------------------------------------------------

/**
 * `0x10006f38` — an empty sample: `flags = 0, length = 0`, eight bytes.
 *
 * Eight calls in part one and two in part three, and both modules contain
 * exactly that many zero-length samples with `flags = 0`. Ten of the 94, and
 * the only ones that need no arithmetic at all.
 */
export function gen_10006f38(c) {
  const dv = new DataView(c.out.buffer);
  dv.setUint32(c.r31, 0, false);
  dv.setUint32(c.r31 + 4, 0, false);
  c.r31 += 8;
}

/**
 * `0x10006f4c` — 32,768 frames, one call in part one.
 *
 * A tape of 1,974 signed bytes at the pointer in `r2+0x2f0e`, crossfaded
 * against a reverberated copy of itself. `f28` starts at 1.0 and loses a
 * 1/1974th of itself every frame, so the mix slides from all-reverb to all-dry
 * — and 1,974 is exactly the tape length, so the crossfade and the tape run
 * out together. Past frame 0x7b6 the input is zero and the tail rings down.
 *
 * `lbzu r3, 1(r25)` PRE-INCREMENTS: the cursor moves and then loads, so the
 * first byte read is the one AFTER the pointer, not the one at it.
 */
export function gen_10006f4c(c) {
  reverbInit(c, 0x10009f00);
  c.startSample(0x8000);
  c.f28 = c.f30;
  let r25 = c.w(0x2f0e);
  const kMix = c.k(0x2c5e);            // 0.99
  const kDecay = c.k(0x2e32);          // 1974.0
  do {
    let r3 = 0;
    if (c.r20 < 0x7b6) { r25 += 1; r3 = c.s8(r25); }
    const dry = r3;
    const wet = reverb(c, dry, kMix);
    c.f28 = c.f28 - c.f28 / kDecay;
    const f27 = c.f30 - c.f28;
    c.f29 = fma(f27, wet, c.f28 * dry);
  } while (c.emit());
}

/** Address -> implementation. Everything absent is filled from the oracle. */
export const PRIMITIVES = {
  0x10006f38: gen_10006f38,
  0x10006f4c: gen_10006f4c,
};
