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

// --- the fused multiply-add family, in capstone's operand order -------------
//
// Capstone prints these as `op frD, frA, frC, frB`, so the ADDEND IS LAST in
// the text and second-to-last in the arithmetic. Reading `fmadd f23, f0, f1,
// f23` as "f0*f1 + f23" is right; reading it left to right as "f0 + f1*f23" is
// the mistake these wrappers exist to prevent.
//
// All four are single-rounding. Negating a fused result is exact and
// round-to-nearest-even is sign-symmetric, so `-fma(...)` is the fused negative
// form rather than an approximation of it.

/** `fmadd frD, a, c, b` = a*c + b */
const fmadd = (a, c, b) => fma(a, c, b);
/** `fmsub frD, a, c, b` = a*c - b */
const fmsub = (a, c, b) => fma(a, c, -b);
/** `fnmadd frD, a, c, b` = -(a*c + b) */
const fnmadd = (a, c, b) => -fma(a, c, b);
/** `fnmsub frD, a, c, b` = -(a*c - b) */
const fnmsub = (a, c, b) => -fma(a, c, -b);

/**
 * `fsel frD, a, b, c` — b if a >= 0, else c. A BRANCHLESS SELECT, not a
 * comparison: it takes the `c` side for NaN, and -0.0 counts as >= 0.
 */
const fsel = (a, b, c) => (a >= 0 ? b : c);

// --- the single-precision forms ---------------------------------------------
//
// `0x10009510` and `0x1000742c` are written almost entirely in the `…s`
// instructions, where the earlier routines use the double ones. These ROUND
// THEIR RESULT TO SINGLE, which is `Math.fround` — correct rounding, and a
// different operation from fp.js's `f32`, which is what a `stfs` STORE does to
// a value the FPU never rounded. Using one for the other is the single easiest
// way to be wrong by one ulp everywhere.
//
// A NOTE ON THE FUSED SINGLES. `fmadds` computes a*c+b to infinite precision
// and rounds ONCE to single; `fround(fma(...))` rounds to double and then to
// single. Those differ only when the exact result sits within a double's last
// bit of a single-precision tie, which needs a*c+b to be inexact in double at
// all — and with single inputs the product a*c is exact, so only the addition
// can lose anything. Over the 1.3 million frames these two routines emit, the
// samples come out byte-exact, so on this data the two agree. That is a
// measurement, not a proof: if a later primitive is off by one in the last
// place with everything else right, this is the place to look.
const fs = Math.fround;
const fadds = (a, b) => fs(a + b);
const fsubs = (a, b) => fs(a - b);
const fmuls = (a, b) => fs(a * b);
const fdivs = (a, b) => fs(a / b);
const fmadds = (a, c, b) => fs(fma(a, c, b));
const fnmsubs = (a, c, b) => fs(-fma(a, c, -b));


/**
 * `0x1000a2d4(value, limit)` — symmetric clamp to [-limit, +limit].
 *
 * Two `fsel`s rather than two branches, which is why it is a called routine
 * and not inline: min against +limit, then max against -limit.
 */
function clampSym(value, limit) {
  let v = fsel(value - limit, limit, value);      // min against +limit
  v = fsel(v - -limit, v, -limit);                // max against -limit
  return v;
}

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
    } else if (op === 63 && ((w >>> 1) & 0x3ff) === 72) {   // fmr fD, fB
      regs[`f${rD}`] = { fmr: (w >>> 11) & 31 };
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

    // ONE ARRAY FOR ALL OF THE SYNTH'S SCRATCH, because the pieces overlap.
    //
    // The six reverb delay lines live in seg6's BSS at 0x1114c760 on
    // 80,000-byte centres. `0x10009a8c`'s eight scratch floats live at
    // r2+0x2f0a plus 0x68 — which resolves to 0x1114c760 EXACTLY, the first
    // delay line's base. That is not a coincidence to tidy away: when that
    // routine runs with the reverb enabled, the comb filter's cursor sweeps
    // over the same words it keeps its oscillator signs and filter history in.
    // Two separate arrays would silently produce different audio.
    //
    // Base is the lower of the two, so the 0x68 bytes below the delay lines
    // that `0x1000a2f0` clears are inside the array too.
    this.memBase = Math.min(this.w(0x2f0a), this.w(0x2eea));
    const last = this.w(0x2efe);
    this.mem = new Float32Array((last - this.memBase + 80000) / 4);

    // THE REGISTERS ARE MACHINE STATE, not per-call arguments. `r8` is the
    // clearest case: the script sets it once and several following calls run
    // under it, and its authors knew — they re-set it after every call that
    // could clobber it. `r10`, `r19` and the parameter-block pointers behave
    // the same way.
    //
    // The float registers are here too rather than in `g`, because f0 is a
    // real argument to `0x10008c9c` and the script sets it two different ways:
    // `lfs f0, 0x2d5e(r2)` at two call sites and `fmr f0, f30` at the third.
    // Missing that `fmr` cost an afternoon — decodeScript modelled `lfs` only,
    // so f0 read as whatever was left over and the sample was wrong from
    // frame 267.
    this.g = {};

    // The PRNG, `0x1000a1f4` (seed) and `0x1000a20c` (step) — a plain LCG on
    // 0x41c64e6d and 12345, masked to 15 bits. METHOD.md §5 warns that a shared
    // PRNG stream makes build order part of the spec; here it does not, and
    // that was checked rather than hoped: the synth has eight callers of the
    // stepper and eight callers of the seeder, and every routine that draws
    // from it seeds it first. So the stream never crosses a call boundary.
    this.r14 = 0; this.r12 = 0; this.r11 = 0;

    this.out = null;      // the module being built
    this.r31 = 0;         // module write cursor, held across the whole script
    this.r19 = 0;         // sample length in frames
    this.r18 = 1;         // frames per step
    this.r20 = 0;         // frame index within the sample
    this.r16 = 0;         // steps done
    this.r17 = 0;         // frame within the step
    this.r15 = 0;
    // EVERY float register, because the clear in `0x1000a23c` stops at f5 and
    // `0x10009aa4` reads f4. So f4 and below are NOT per-sample state: they
    // hold whatever the previous routine left, and at the start of the script
    // that is the machine's power-on zero. Leaving them undefined here made
    // one voice read NaN out of a lookup table.
    for (let i = 0; i <= 31; i++) this[`f${i}`] = 0;
    this.f29 = 0;         // the value the emitter is about to write
    this.f30 = 1;         // constant 1.0, from r2+0x2ce2
    this.f31 = 0;         // constant 0.0
  }

  // --- reading and writing -------------------------------------------------

  /** float32 at `r2 + disp` — an `lfs fN, disp(r2)`. */
  k(disp) { return this.d0.getFloat32(R2 + disp, false); }

  /** u32 at `r2 + disp` — `lwz`, used for the relocated pointers. */
  w(disp) { return this.d0.getUint32(R2 + disp, false); }

  /**
   * float64 at `r2 + disp` — an `lfd`.
   *
   * Only one instruction in the synth uses this and it is a mistake: the float
   * pool holds float32s, so reading eight bytes takes two of them and calls the
   * pair a double. `0x2e36` comes out as 3.82e24. Reproduced, not corrected.
   */
  kd(disp) { return this.d0.getFloat64(R2 + disp, false); }

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
   * Writes `flags = 1` and the frame count, advances 8, clears the frame, step
   * and phase counters, sets `r15 = 2`, and zeroes EVERY float register from
   * f28 down to f5.
   *
   * §8c says it zeroes "four oscillator accumulators" and it zeroes
   * twenty-four. That matters more than a miscount: several voices READ f16 and
   * f17 before writing them — `fmadd f17, f1, f18, f17` accumulates into its
   * own previous value on the first frame — so if the clear stopped short those
   * registers would carry state from the PREVIOUS sample and no primitive could
   * be checked on its own. It does not, so every sample starts from a clean
   * machine and `synthdiff.mjs`'s fill-from-reference isolation is sound.
   */
  startSample(frames) {
    const dv = new DataView(this.out.buffer);
    this.r19 = frames;
    dv.setUint32(this.r31, 1, false);
    dv.setUint32(this.r31 + 4, frames, false);
    this.r31 += 8;
    this.r20 = 0; this.r16 = 0; this.r17 = 0; this.r15 = 2;
    for (let i = 5; i <= 28; i++) this[`f${i}`] = 0;
  }

  /**
   * Apply one call's register setup, exactly as the script's instructions do.
   *
   * MERGES rather than replaces, because that is what a register file does:
   * anything this call did not write keeps the value an earlier call left in
   * it. `r8` and `r25` both depend on that.
   */
  applySetup(setup) {
    for (const [name, v] of Object.entries(setup)) {
      // An `lfs fN, disp(r2)` in the script loads a FLOAT REGISTER, so it goes
      // to the register file rather than to `g` — and a later call that does
      // not reload it does not inherit it either, because everything in
      // between has used f0 as scratch. `0x10008c9c` is the only primitive
      // that takes a float argument and the only one this distinction reaches.
      if (name[0] === 'f') {
        this[name] = 'r2' in v ? this.k(v.r2) : this[`f${v.fmr}`];
        continue;
      }
      if (v && typeof v === 'object') {
        this.g[name] = 'r2' in v ? SEG0 + R2 + v.r2 : this.w(v.load);
      } else {
        this.g[name] = v;
      }
    }
  }

  /** `0x1000a1f4` — seed the LCG. */
  srand() { this.r14 = 1; this.r12 = 0x41c64e6d; this.r11 = 0x3039; }

  /**
   * `0x1000a20c` — step it and return a float.
   *
   * `mullw` keeps the low 32 bits, which is what `Math.imul` does; the mask to
   * 0x7fff then makes the sign irrelevant.
   */
  rand() {
    this.r14 = (Math.imul(this.r14, this.r12) + this.r11) & 0x7fff;
    return (this.r14 - this.k(0x2e6a)) * this.k(0x2e6e);
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
    // f0 is left holding the raw fctiw result — the clamp below applies to the
    // GPR copy, not the register. Its top 32 bits are architecturally
    // undefined, so its value as a double is not something to rely on, and
    // nothing does: `0x10008c9c` is the only primitive that reads f0 and the
    // script sets it before all three of its calls.
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
    const base = (c.w(line) - c.memBase) >> 2;
    c.mem.fill(0, base, base + 5000);
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
  const base = (c.w(tap.buffer) - c.memBase) >> 2;
  const length = c.w(tap.length);
  const feedback = c.k(tap.feedback);
  let next = cursor + 4;
  const delayed = c.mem[base + ((next % length) >> 2)];
  c.mem[base + (cursor >> 2)] = f32(fma(delayed, feedback, input));
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
  // IT CLOBBERS f4 AND f5, and that is not an implementation detail here —
  // `0x10009aa4` keeps two oscillator phases in exactly those registers and
  // calls this every frame. On exit f5 holds the allpass coefficient it last
  // loaded and f4 holds the dry term, so the caller's phases are replaced
  // rather than advanced. Recording them is what makes that voice reproducible.
  c.f5 = kAll;
  c.f4 = (c.f30 - mix) * input;
  return c.f4 + v * mix;
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

/**
 * `0x10009020` — 100,800 frames in 16 steps of 6,300. Eight calls in part one.
 *
 * A drum. `f10` ramps linearly into a cosine while `f9` (its rate) and `f5`
 * (its amplitude) are multiplied by constants EVERY FRAME, so the cosine
 * argument sweeps downward under an exponential decay — a pitched-down click.
 * `f26` accumulates the oscillator phase and wraps against `r2+0x2e26`, and on
 * each wrap `f10`, `f9` and `f5` restart, which is what makes it a repeating
 * hit rather than one decaying tone.
 *
 * FOUR BYTE TABLES, indexed by the STEP counter `r16`, not by the frame:
 *
 *     r24 = r2+0x2faa   local     per-step flag: glide (non-zero) or jump
 *     r25 = script                the note, +12
 *     r22 = script                a per-step gate for the two shaping stages
 *     r21 = script                per-step amplitude
 *
 * §8g says this routine "hardcodes its tables rather than taking them from the
 * script". It hardcodes ONE of four; the other three come from the script,
 * which is what §8b says two pages earlier and what makes eight calls cover
 * eight instruments from three shared tables. §8g is right about `0x10009258`.
 *
 * `r15` IS A THREE-STATE ENVELOPE, and `0x1000a2c4` exists only to compare it
 * against 0, 1 and 2 in one place: 0 attacks (`f12` ramps to 1.0 and switches
 * to 1), 1 sustains, 2 releases. `startSample` sets it to 2, so every sample
 * begins in release and the first step's flag byte kicks it into attack.
 */
export function gen_10009020(c) {
  const r24 = SEG0 + R2 + 0x2faa;
  const { r21, r22, r25 } = c.g;
  c.r18 = 0x189c;                       // 6,300 frames per step
  c.startSample(0x189c0);               // 100,800 = 16 steps
  let f19 = c.k(0x2b26), f9 = c.k(0x2e52), f5 = c.k(0x2d7a), f4 = c.f30;
  let f10 = c.f10, f12 = c.f12, f16 = c.f16, f17 = c.f17;
  let f21 = c.f21, f22 = c.f22, f23 = c.f23, f24 = c.f24, f26 = c.f26;
  do {
    const f28 = (c.k(0x2bfe) - c.cos(f10 * f9)) * f5;
    f10 += c.k(0x2af6);
    f9 *= c.k(0x2c66);
    f5 *= c.k(0x2c5a);

    // Per-step portamento: glide toward the target when the flag is set, jump
    // to it when it is not.
    if (c.u8(r24 + c.r16) !== 0) f23 = fmadd(f24 - f23, c.k(0x2ac2), f23);
    else f23 = f24;
    if (f23 !== f22) f21 = c.pow2(f23 - c.k(0x2bd6));
    f22 = f23;

    f26 += f21;
    if (f26 >= c.k(0x2e26)) {
      f26 -= c.k(0x2e26);
      f10 = c.f31;
      f9 = c.k(0x2e52);
      f5 = c.k(0x2d7a);
    }

    if (c.r17 === 0) {
      f24 = (c.u8(r25 + c.r16) + 0xc) * c.k(0x2b2e);
      if (c.u8(r24 + c.r16) === 0) c.r15 = 0;
    }

    if (c.u8(r22 + c.r16) !== 0) {
      if (c.r17 > 0 && c.r17 < 0x2ee) {
        f4 *= c.k(0x2d02);
        f19 *= c.k(0x2cf6);
        f12 *= c.k(0x2cfe);
      }
      if (c.r17 > 0x320) {
        f4 = f4 / c.k(0x2cf2);
        f4 = fsel(f4 - c.f30, f4, c.f30);
        f19 = f19 / c.k(0x2d06);
        f19 = fsel(f19 - c.k(0x2b26), f19, c.k(0x2b26));
      }
    }

    const f8 = c.u8(r21 + c.r16) * c.k(0x2afa);
    const f7 = f8 * c.k(0x2bd6);
    const f18 = fnmsub(f19, f17, fnmsub(f16, c.k(0x2bba), f28));
    const drive = f12 * f4;
    f17 = fmadd(c.k(0x2d1e) * drive * f8, f18, f17);
    f16 = fmadd(c.k(0x2d46) * drive * f7, f17, f16);

    if (c.r17 === 0x15a8 && c.u8(r24 + ((c.r16 + 1) & 0xf)) !== 1) c.r15 = 2;

    if (c.r15 === 0) {
      f12 = fmadd(f12, c.k(0x2d0e), c.k(0x2afe));
      if (f12 >= c.f30) { f12 = c.f30; c.r15 = 1; }
    } else if (c.r15 === 1) {
      if (c.u8(r24 + c.r16) === 0) f12 *= c.k(0x2c9e);
    } else if (c.r15 === 2) {
      f12 *= c.u8(r22 + c.r16) !== 0 ? c.k(0x2c96) : c.k(0x2c5e);
    }

    c.f29 = f12 * c.k(0x2d8e) * f16;
    c.f4 = f4;
    // `cmpw r17, r18; blt` guards a reset of f4 and f19 that CANNOT RUN: the
    // emitter wraps r17 to 0 the instant it reaches r18, so r17 < r18 holds at
    // every visit. Transcribed as dead because it is dead, not omitted — the
    // next reader should not have to re-derive that.
  } while (c.emit());
}

/**
 * `0x10009258` — 50,400 frames in 16 steps of 3,150. Eight calls in part one.
 *
 * The other half of the percussion pair, and a clean one-to-one: eight calls,
 * and part one's SMPL holds exactly eight samples of 50,400 frames.
 *
 * Same skeleton as `0x10009020` — swept cosine, per-step glide, three-state
 * `r15` envelope — but three tables are hardcoded and only the amplitude table
 * comes from the script, and the output stage is quite different: a symmetric
 * clamp through `0x1000a2d4`, a dry/wet blend against the clamped signal, and
 * then a THREE-POLE cascade (f15 -> f14 -> f13) whose middle coefficient is
 * itself modulated by the envelope `f12`. That last stage is what a drum's body
 * sounds like as opposed to its click.
 */
export function gen_10009258(c) {
  const r22 = SEG0 + R2 + 0x2f5a;
  const r25 = SEG0 + R2 + 0x309a;
  const r24 = SEG0 + R2 + 0x2fba;
  const { r21 } = c.g;
  c.r18 = 0xc4e;                        // 3,150 frames per step
  c.startSample(0xc4e0);                // 50,400 = 16 steps
  const r9 = 0x294;
  let f12 = c.f30, f27 = c.f30;
  let f5 = c.k(0x2d7a), f9 = c.k(0x2e52);
  let f4 = c.f4, f7 = c.f7, f8 = c.f8, f10 = c.f10, f19 = c.f19;
  let f13 = c.f13, f14 = c.f14, f16 = c.f16, f17 = c.f17;
  let f21 = c.f21, f22f = c.f22, f23 = c.f23, f24 = c.f24, f26 = c.f26;
  do {
    const f28 = (c.k(0x2bfe) - c.cos(f10 * f9)) * f5;
    f10 += c.k(0x2af6);
    f9 *= c.k(0x2c66);
    f5 *= c.k(0x2c5a);

    if (c.u8(r24 + c.r16) !== 0) f23 = fmadd(f24 - f23, c.k(0x2abe), f23);
    else f23 = f24;
    if (f23 !== f22f) f21 = c.pow2(f23 - c.k(0x2bd6));
    f22f = f23;

    f26 += f21;
    if (f26 >= c.k(0x2e0e)) {
      f26 -= c.k(0x2e0e);
      f10 = c.f31;
      f9 = c.k(0x2e52);
      f5 = c.k(0x2d7a);
    }

    if (c.r17 === 0) {
      f24 = c.u8(r25 + c.r16) * c.k(0x2b2e);
      f7 = fmadd(c.u8(r21 + c.r16), c.k(0x2afa), c.k(0x2b1a));
      f19 = c.k(0x2b22);
      f4 = c.k(0x2b56);
      if (c.u8(r24 + c.r16) === 0) c.r15 = 0;
    }

    let f6 = f4 * c.k(0x2d1e);
    f6 = fnmsub(f27, f6, f6);           // f6 * (1 - f27)

    if (c.u8(r22 + c.r16) !== 0 && c.r17 !== r9) {
      if (c.r17 < r9) { f27 *= c.k(0x2cfe); f12 *= c.k(0x2cee); }
      else { f27 *= c.k(0x2cb6); f12 *= c.k(0x2cce); }
    }

    if (c.r16 !== 0) f8 = fmadd(f7 - f8, c.k(0x2abe), f8);
    else f8 = f7;

    let f0 = f8 * (f27 - f6);
    f0 = fsel(f0 - c.k(0x2d2e), c.k(0x2d2e), f0);
    let f18 = fnmadd(f19, f17, f16);
    f18 = f28 + f18;
    f17 = fmadd(f18, f0, f17);
    f16 = fmadd(f17, f0, f16);

    if (c.r17 === 0x762 && c.u8(r24 + ((c.r16 + 1) & 0xf)) !== 1) c.r15 = 2;

    if (c.r15 === 0) {
      f12 = fmadd(f12, c.k(0x2d0e), c.k(0x2ad2));
      f27 = fmadd(f27, c.k(0x2d0e), c.k(0x2ad2));
      f27 = fsel(f27 - c.f30, c.f30, f27);
      if (f12 >= c.f30) { f12 = c.f30; c.r15 = 1; }
    } else if (c.r15 === 1) {
      if (c.u8(r24 + c.r16) !== 0) { f12 *= c.k(0x2cc6); f27 *= c.k(0x2cca); }
      else { f12 *= c.k(0x2cba); f27 *= c.k(0x2cbe); }
    } else if (c.r15 === 2) {
      if (c.u8(r22 + c.r16) !== 0) { f12 *= c.k(0x2c72); f27 *= c.k(0x2cd2); }
      else { f12 *= c.k(0x2c66); f27 *= c.k(0x2cce); }
    }

    const f3 = f16 * (f12 * c.k(0x2d76));
    const f2 = clampSym(f3, c.k(0x2bd6));
    const mix = c.k(0x2c42);
    let f29 = c.k(0x2d96) * mix * f2;
    f29 = fmadd(c.f30 - mix, f3, f29);
    const f15v = f29 - fmadd(c.k(0x2bba), f14, f13);
    f14 = fmadd(f15v, fnmsub(f12, c.k(0x2bb6), c.f30), f14);
    f13 = fmadd(f14, f12 * c.k(0x2be6), f13);
    const kOut = c.k(0x2c3e);
    c.f29 = fmsub(f15v, kOut, (c.f30 - kOut) * f29);
    c.f4 = f4;
  } while (c.emit());
}

/**
 * `0x10009510` — part one's dominant voice. 13 of its 56 samples.
 *
 * `r8` PICKS EVERYTHING. It is set once by the script and is sticky across
 * calls, and it chooses the length, the step count and all three byte tables at
 * the same time:
 *
 *     r8 == 0   201,600 frames = 32 steps   r25/r24/r23 = 0x30aa/0x2fca/0x2fca
 *     r8 != 0   100,800 frames = 16 steps   r25/r24/r23 = 0x303a/0x2f6a/0x301a
 *
 * With `r8 == 0` the glide-flag table and the gate table are THE SAME POINTER
 * (`r23 = r24`), so the 32-step patterns cannot gate and glide independently
 * and the 16-step ones can. Nine of the thirteen calls run with `r8 = 0`, which
 * with the one 16-step call elsewhere is exactly the eleven samples of 201,600
 * frames the module holds.
 *
 * TWO OSCILLATORS, and they are square rather than sinusoidal: `f6` and `f5`
 * are sign flags that NEGATE on each phase wrap while `f28`/`f27` are envelopes
 * reset to 1.0 at the same moment and decaying by `f *= 1-k` through `fnmsubs`.
 * The second wraps at twice the first's period — `fadd f0, f0, f0` — and at
 * `r8 == 1` twice again, so the flag is an octave as well as a length.
 *
 * The output stage is a symmetric clamp at ±2.0 blended against the unclamped
 * signal — soft saturation — into a two-pole cascade whose coefficient is `f10`,
 * the smoothed amplitude, so the filter opens with the note.
 */
export function gen_10009510(c) {
  const at = (d) => SEG0 + R2 + d;
  const r8 = c.g.r8 ?? 0;
  let r25 = at(0x30aa), r24 = at(0x2fca), r23 = r24, r19 = 0x31380;
  if (r8 !== 0) {
    r25 = at(0x303a); r24 = at(0x2f6a); r23 = at(0x301a); r19 = 0x189c0;
  }
  const { r21 } = c.g;
  c.r18 = 0x189c;
  c.startSample(r19);

  let f28 = c.f30, f27 = c.f30, f6 = c.f30, f5 = c.f30, f4 = c.f30;
  let f19 = c.k(0x2b1a), f23 = c.k(0x2db6);
  let f24 = c.f24, f22 = c.f22, f21 = c.f21, f20 = c.f20;
  let f25 = c.f25, f26 = c.f26, f12 = c.f12;
  let f7 = c.f7, f8 = c.f8, f9 = c.f9, f10 = c.f10;
  let f13 = c.f13, f14 = c.f14, f16 = c.f16, f17 = c.f17, f18 = c.f18;

  do {
    f28 = fnmsubs(f28, c.k(0x2b76), f28);
    f27 = fnmsubs(f27, c.k(0x2b3e), f27);

    if (c.u8(r24 + c.r16) !== 0) {
      f23 = fmadds(fsubs(f24, f23), c.k(0x2ac6), f23);
    } else {
      f23 = f24;
    }
    if (f23 !== f22) { f21 = c.pow2(fsubs(f23, c.k(0x2bd6))); f20 = f21; }
    f22 = f23;

    f26 = fadds(f26, f21);
    f25 = fadds(f25, f20);
    const wrap = c.k(0x2df2);
    if (f26 >= wrap) { f26 = fsubs(f26, wrap); f28 = c.f30; f6 = -f6; }
    // The second oscillator's wrap point is the first's doubled — and doubled
    // again at r8 == 1. These two are `fadd`, not `fadds`: double adds in the
    // middle of an otherwise single-precision routine.
    let wrap2 = wrap + wrap;
    if (r8 === 1) wrap2 = wrap2 + wrap2;
    if (f25 >= wrap2) { f25 = fsubs(f25, wrap2); f27 = c.f30; f5 = -f5; }

    if (c.r17 === 0) {
      f24 = fmuls(c.u8(r25 + c.r16) + 0xc, c.k(0x2b2e));
      const amp = fmuls(c.u8(r21 + c.r16), c.k(0x2afa));
      f8 = fdivs(amp, c.k(0x2d1e));
      f7 = fdivs(f8, c.k(0x2d1e));
      if (c.u8(r23 + c.r16) === 0) c.r15 = 0;
    }

    if (c.r16 !== 0) {
      f10 = fmadds(fsubs(f8, f10), c.k(0x2aae), f10);
      f9 = fmadds(fsubs(f7, f9), c.k(0x2aae), f9);
    } else {
      f10 = f8; f9 = f7;
    }

    const osc = fmuls(fadds(fmuls(f28, f6), fmuls(f27, f5)), c.k(0x2bd6));
    f18 = fnmsubs(f16, c.k(0x2b52), osc);
    f18 = fnmsubs(f19, f17, f18);
    f17 = fmadds(fmuls(f4, f10), f18, f17);
    f16 = fmadds(fmuls(f4, f9), f17, f16);

    if (c.r17 === 0x627 && c.u8(r23 + ((c.r16 + 1) & 0x1f)) !== 1) c.r15 = 2;

    // Only states 0 and 2 do anything — there is no cr1 branch here, where
    // both percussion routines have one. State 1 is a plain sustain.
    if (c.r15 === 0) {
      f12 = fmadds(f12, c.k(0x2d0e), c.k(0x2afe));
      if (f12 >= c.f30) { f12 = c.f30; c.r15 = 1; }
    } else if (c.r15 === 2) {
      f12 = fmuls(f12, c.k(0x2c82));
    }

    const env = fmuls(f12, c.k(0x2d96));
    let f3 = fmuls(f16, env);
    f3 = fmadds(f18, fmuls(c.k(0x2d96), f12), f3);
    const f2 = clampSym(f3, c.f30 + c.f30);       // fadd f0, f30, f30 — double
    const mix = c.k(0x2c4a);
    let f29 = fmadds(fmuls(c.k(0x2d9e), mix), f2, fmuls(fsubs(c.f30, mix), f3));
    f29 = fmuls(c.k(0x2d1e), f29);

    const f15 = fsubs(f29, fmadds(f14, fsubs(c.k(0x2d0e), f12), f13));
    f14 = fmadds(f15, f10, f14);
    f13 = fmadds(f14, f10, f13);
    c.f29 = fmuls(fsubs(f29, fadds(f14, f15)), c.k(0x2bd6));
    c.f4 = f4;
    // As in 0x10009020, `cmpw r17, r18` guards a reset the emitter's wrap makes
    // unreachable. Left out here rather than written as dead code, because it
    // would touch four registers and read as live.
  } while (c.emit());
}

/**
 * `0x1000742c` — part three's voice. 18 of its 38 samples, sixteen of them
 * consecutive with no arguments at all.
 *
 * ITS SEED DATA IS A TAPE, NOT A TABLE. `r25` is a cursor the routine advances
 * across its own blocks — but NOT across calls, and §8h has that wrong. It
 * says the sixteen consecutive calls need no setup because the cursor carries
 * over; in fact each of the eighteen calls is preceded by its own
 * `lwz r25, 0x372a+4k(r2)`, a table of eighteen tape pointers. `synthscript.py`
 * does not record `lwz`, which is why those calls looked bare.
 *
 * The tape reads:
 *
 *     u16   total frames / 4
 *     u16   number of blocks
 *     then per block, eleven u16: ten control targets and, at +0x14,
 *           that block's length in frames / 2
 *
 * SO `r19` IS OVERWRITTEN PER BLOCK. It holds the sample length while
 * `startSample` writes the header, and from then on it is the current BLOCK's
 * length, with `r20` reset to zero each time — so the emitter's loop bound is
 * per block and the outer loop counts blocks. That is why every one of these
 * eighteen samples is a different length while all the other routines' are
 * immediates: the length is data.
 *
 * TEN ONE-POLE SMOOTHERS, into f28…f19, all on `r2+0x2ad2` except the tenth,
 * which is deliberately on `r2+0x2ae2` — a different time constant for the
 * parameter that ends up crossfading the noise in.
 *
 * FOUR PHASE ACCUMULATORS advanced by `x += K - round(x)`. §8h reads this as
 * `frac(x) + K`, which would be truncation; the instruction pair is `float2int`
 * then `int2float`, and `float2int` is `fctiw`, which ROUNDS TO NEAREST. For a
 * phase in [0,1) the two agree, but these accumulators do not stay there.
 *
 * Then a noise/tone crossfade and three identical two-pole resonators — one per
 * (cutoff, resonance) pair out of the smoothed controls — summed at the output.
 *
 * IT LEAVES TWO BYTES UNWRITTEN. The final `addi r31, r31, 2` advances the
 * module cursor past two frames the emitter never produced, so the block
 * lengths sum to two less than the declared sample length and every one of
 * these samples ends with two bytes of whatever the buffer already held. The
 * original allocated that buffer zeroed and so do we, so they are zeros — but
 * they are not silence the synth computed, and a port that "fixes" the
 * off-by-two by emitting two more frames gets 18 samples wrong.
 */
export function gen_1000742c(c) {
  c.srand();
  let r25 = c.g.r25;
  const frames = c.u16(r25) * 4;
  r25 += 2;
  c.startSample(frames);
  let r24 = c.u16(r25);
  r25 += 2;

  let f28 = c.f28, f27 = c.f27, f26 = c.f26, f22 = c.f22, f21 = c.f21, f20 = c.f20;
  let f19 = c.f19, f17 = c.f17, f16 = c.f16, f14 = c.f14, f13 = c.f13;
  let f11 = c.f11, f10 = c.f10;
  let f8 = c.f8, f7 = c.f7, f9 = c.f9, f6 = c.f6;

  do {
    c.r19 = c.u16(r25 + 0x14) * 2;      // this block's length, in frames
    c.r20 = 0;
    let f25 = c.k(0x2daa), f24 = c.k(0x2dda), f23 = c.k(0x2de2);
    do {
      // Ten one-pole smoothers toward the block's ten u16 targets.
      const k = c.k(0x2ad2);
      f28 = fmadd(c.u16(r25 + 0x00) - f28, k, f28);
      f27 = fmadd(c.u16(r25 + 0x02) - f27, k, f27);
      f26 = fmadd(c.u16(r25 + 0x04) - f26, k, f26);
      f25 = fmadd(c.u16(r25 + 0x06) - f25, k, f25);
      f24 = fmadd(c.u16(r25 + 0x08) - f24, k, f24);
      f23 = fmadd(c.u16(r25 + 0x0a) - f23, k, f23);
      f22 = fmadd(c.u16(r25 + 0x0c) - f22, k, f22);
      f21 = fmadd(c.u16(r25 + 0x0e) - f21, k, f21);
      f20 = fmadd(c.u16(r25 + 0x10) - f20, k, f20);
      const k10 = c.k(0x2ae2);
      f19 = fmadd(c.u16(r25 + 0x12) - f19, k10, f19);

      f8 += c.k(0x2ab6) - fctiw(f8);
      f7 += c.k(0x2aba) - fctiw(f7);
      f9 += c.k(0x2aca) - fctiw(f9);
      f6 += c.k(0x2ace) - fctiw(f6);

      let f5 = (((f9 + f8) + f7) + f6) * c.k(0x2b96);
      const noise = c.rand() * c.k(0x2a7a);
      const half = c.k(0x2bd6);
      const depth = c.k(0x2aea);
      f5 = f5 - half;
      const wet = fmsub(noise, depth, half);
      f5 = f5 * fnmsub(f19, depth, c.f30);
      f5 = fmadd(f19 * depth, wet, f5);

      // Three two-pole resonators: (cutoff, resonance) pairs (f25,f22),
      // (f24,f21), (f23,f20), damped by f28, f27, f26 respectively.
      const kQ = c.k(0x2abe), kA = c.k(0x2a96), kB = c.k(0x2a92);
      const f18 = fmsub(f5, f22, fmadd(kQ * f25, f17, f16));
      f17 = fmadd(f18, kA * f28, f17);
      f16 = fmadd(f17, kB * f28, f16);
      const f15 = fmsub(f5, f21, fmadd(kQ * f24, f14, f13));
      f14 = fmadd(f15, kA * f27, f14);
      f13 = fmadd(f14, kB * f27, f13);
      const f12 = fmsub(f5, f20, fmadd(kQ * f23, f11, f10));
      f11 = fmadd(f12, kA * f26, f11);
      f10 = fmadd(f11, kB * f26, f10);

      c.f29 = ((f17 + f14) + f11) * c.k(0x2d26);
    } while (c.emit());
    r25 += 0x16;
  } while (--r24 > 0);

  c.r31 += 2;
  c.g.r25 = r25;
}

/**
 * `0x10008f38` and `0x10008f64` — 128,000 frames each, one call apiece.
 *
 * Two entry points into one body at `0x10008f8c`: filtered noise through the
 * reverb. The LCG drives a two-pole resonator whose coefficient `f26` is itself
 * swept, and `r10` chooses how — a plain decay, or (0x10008f38) a RISE clamped
 * at 1.0 for the first 19,200 frames and a decay after, which opens the filter
 * and then closes it. A cymbal against a hiss.
 */
function noiseBody(c, r10, f22, f23, f24, f25, f26) {
  reverbInit(c, 0x10009f68);
  c.srand();
  const f12 = c.f30;
  let f16 = c.f16, f17 = c.f17;
  do {
    let f28 = c.rand() * f22;
    if (r10 === 0) {
      f26 = f26 * c.k(0x2cc2);
    } else if (c.r20 < 0x4b00) {
      f26 = f26 * c.k(0x2cfa);
      f26 = fsel(c.f30 - f26, f26, c.f30);       // min against 1.0
    } else {
      f26 = f26 * c.k(0x2cbe);
    }
    f28 = fnmsub(f23, f17, f28);
    f28 = fnmsub(f16, f24, f28);
    f17 = fmadd(f28, f26, f17);
    f16 = fmadd(f17, f26, f16);
    const f9 = (f17 - f16) * f25 * f12;
    const f10 = c.k(0x2bea) * reverb(c, f9, c.k(0x2c4e));
    c.f29 = fmsub(c.k(0x2bba), f9, f10);
  } while (c.emit());
}

export function gen_10008f38(c) {
  c.startSample(0x1f400);
  noiseBody(c, 1, c.k(0x2a72), c.k(0x2bd6), c.k(0x2c1a), c.k(0x2d76), c.k(0x2afa));
}

export function gen_10008f64(c) {
  c.startSample(0x1f400);
  noiseBody(c, 0, c.k(0x2a76), c.k(0x2b76), c.k(0x2bd6), c.f30, c.f30);
}

/**
 * `0x1000977c`, `0x100097d8` and `0x10009834` — 65,536 frames, one call each.
 *
 * Three entry points into one body at `0x10009890`. Two sine oscillators whose
 * phases advance by a fixed increment derived through the 2^x table — so the
 * two entry points that differ only in their `r2` constants are the same voice
 * at different pitches — summed into a FOUR-POLE ladder filter. The cubic
 * `f10 - k*f10^3` after it is the ladder's saturation.
 *
 * `r10` is not a pitch selector but a shape one: at 1 each oscillator is
 * multiplied by a sign that flips with the phase, turning the sine pair into a
 * harder waveform; at 3 the sweep coefficient changes.
 *
 * THE FIVE STACK SLOTS ARE STATE, not scratch. `stfs f0, 0x74(r1)` holds a sign
 * that survives across frames, and the routine reserves 0x98 bytes for them —
 * so they are locals here rather than anything to do with the register file.
 * The stores TRUNCATE, like every other `stfs`.
 */
function ladderBody(c, r10, s70, s68, s6c) {
  let f28 = c.f30, f24 = c.f30, f23 = c.f30, f20 = c.f30;
  let s74 = c.f30, s78 = c.f30;
  let f21 = c.f21, f22 = c.f22;
  let f6 = c.f6, f7 = c.f7, f8 = c.f8, f9 = c.f9;
  let f10 = c.f10, f11 = c.f11, f12 = c.f12, f13 = c.f13;
  const wrap = c.k(0x2e52), gate = c.k(0x2e56);
  do {
    if (c.r20 > 0xc000) f20 = f20 * c.k(0x2c9a);

    let f27 = f24 * c.sin(f22);
    if (r10 === 1) f27 = f27 * s74;
    f22 = f22 + s68;
    if (f22 > wrap) f22 = f22 - wrap;
    if (f22 > gate) {
      if (f22 < c.k(0x2d42)) { f24 = -c.f30; s74 = f32(-s74); }
    } else {
      f24 = c.f30;
    }

    let f26 = f23 * c.sin(f21);
    if (r10 === 1) f26 = f26 * s78;
    f21 = f21 + s6c;
    if (f21 > wrap) f21 = f21 - wrap;
    if (f21 > gate) {
      if (f21 < c.k(0x2d3e)) { f23 = -c.f30; s78 = f32(-s78); }
    } else {
      f23 = c.f30;
    }

    const f14 = (f27 + f26) * c.k(0x2bd6);
    const f19 = c.k(0x2c12) * f28;
    let f17 = fmsub(c.k(0x2d56), f19, c.k(0x2d22) * (f19 * f19));
    f17 = f17 - c.f30;
    const f18 = (f17 + c.f30) * c.k(0x2bd6);
    const f15 = c.exp((c.f30 - f18) * c.k(0x2d16));
    const f16 = s70 * f15;
    f28 = f28 * (r10 === 3 ? c.k(0x2cbe) : c.k(0x2caa));

    const f25 = fnmsub(f16, f10, f14);
    f13 = fmadd(f25, f18, fmsub(f9, f18, f17 * f13));
    f12 = fmadd(f13, f18, fmsub(f8, f18, f17 * f12));
    f11 = fmadd(f12, f18, fmsub(f7, f18, f17 * f11));
    f10 = fmadd(f11, f18, fmsub(f6, f18, f17 * f10));
    f10 = f10 - f10 * f10 * f10 * c.k(0x2b5a);
    f9 = f25; f8 = f13; f7 = f12; f6 = f11;

    c.f29 = f10 * f20 * c.k(0x2e0e);
  } while (c.emit());
}

/**
 * The phase increment: 2^k, then divided down twice, then TRUNCATED.
 *
 * The `stfs f0, 0x68(r1)` that parks it on the stack is a truncating store, and
 * the loop reads it back with `lfs` every frame. Leaving the value in double
 * costs a fraction of an ulp per frame, which is invisible until it tips a
 * phase-wrap comparison — these three samples then came out byte-exact for
 * 2,294, 2,441 and 4,360 frames and diverged after.
 */
const ladderStep = (c, note, div) => f32(c.pow2(c.k(note)) / c.k(0x2e52) / c.k(div));

export function gen_1000977c(c) {
  c.startSample(0x10000);
  ladderBody(c, 3, c.k(0x2c46),
    ladderStep(c, 0x2c26, 0x2dd2), ladderStep(c, 0x2c32, 0x2dd2));
}

export function gen_100097d8(c) {
  c.startSample(0x10000);
  ladderBody(c, 0, c.k(0x2c46),
    ladderStep(c, 0x2c22, 0x2dd2), ladderStep(c, 0x2c36, 0x2dd2));
}

export function gen_10009834(c) {
  c.startSample(0x10000);
  ladderBody(c, 1, c.k(0x2bfa),
    ladderStep(c, 0x2c1e, 0x2db2), ladderStep(c, 0x2c3a, 0x2db2));
}

/**
 * `0x10008e8c` — 32,768 frames, one call in part one.
 *
 * Two sines beating against each other, both sweeping: `f26` and `f27` are
 * multiplied by constants every frame so their arguments run away, and one is
 * read negated. Under it `f24` decays and `f12` decays with it until frame
 * 0x2a30, after which only `f24` does — a two-stage fall.
 *
 * `f25` RISES rather than falls, clamped at 1.0 by an `fsel`: the attack.
 */
export function gen_10008e8c(c) {
  c.startSample(0x8000);
  let f12 = c.f30, f24 = c.f30;
  let f25 = c.k(0x2afa), f26 = c.k(0x2dba), f27 = c.k(0x2dca);
  do {
    f25 = f25 * c.k(0x2d0e);
    f25 = fsel(f25 - c.f30, c.f30, f25);          // min against 1.0
    let f22 = c.sin(-f26) + c.sin(f27);
    const f23 = f25 * f24;
    f22 = f22 * c.k(0x2d4a) * f23 * f12;
    f26 = f26 * c.k(0x2ca2);
    f27 = f27 * c.k(0x2cce);
    if (c.r20 < 0x2a30) {
      f24 = f24 * c.k(0x2cae);
      f12 = fnmsub(f12, c.k(0x2a8e), f12);
    } else {
      f24 = f24 * c.k(0x2cb2);
    }
    c.f29 = f22 * c.k(0x2db2);
  } while (c.emit());
}

/**
 * `0x100087b0` — 32,768 frames, one call in part one.
 *
 * A single sine whose argument runs away (`f27 *= k` every frame, read
 * negated) into a two-pole filter, then through the reverb inverted — `fneg f1,
 * f16` — and mixed back against the dry signal. Two decays again, `f12` and
 * `f11`, with `f11` stopping at frame 0x2a30 and `f12` changing rate there.
 *
 * `f19` is the attack, rising and clamped at 1.0.
 */
export function gen_100087b0(c) {
  reverbInit(c, 0x10009f40);
  c.startSample(0x8000);
  let f12 = c.f30, f11 = c.f30;
  let f19 = c.k(0x2afa), f27 = c.k(0x2dba);
  let f16 = c.f16, f17 = c.f17;
  do {
    const f28 = c.sin(-f27);
    f19 = f19 * c.k(0x2d0e);
    f19 = fsel(f19 - c.f30, c.f30, f19);
    const f9 = f28 * c.k(0x2d72) * f19 * (f12 * f11);
    const k = c.k(0x2afa);
    const drive = f9 - f16 - f17;
    f17 = fmadd(drive, k, f17);
    f16 = fmadd(f17, k, f16);
    let v = reverb(c, -f16, c.k(0x2c5e)) * c.k(0x2bba);
    v = fmadd(f9, c.k(0x2bea), v) * c.k(0x2bb6);
    c.f29 = v * c.k(0x2e0e);
    f27 = f27 * c.k(0x2c8e);
    if (c.r20 < 0x2a30) {
      f12 = f12 * c.k(0x2cae);
      f11 = fnmsub(f11, c.k(0x2a8e), f11);
    } else {
      f12 = f12 * c.k(0x2ca6);
    }
  } while (c.emit());
}

/**
 * `0x10008430` — 201,600 frames in 32 steps of 6,300, one call in part one.
 *
 * Noise into a resonant filter whose cutoff comes from a per-step byte table at
 * `r2+0x34e2`, scaled by `f6`. Reverberated and mixed.
 *
 * THE THREE-STATE ENVELOPE IS DRIVEN BY THE STEP TABLE'S FLAG HERE, not by a
 * note: `r2+0x350a` says whether this step releases late (0xd89) or early
 * (0x3b1), and `r17 == 0xa` re-attacks ten frames into every step. So the
 * pattern is entirely in the two byte tables and the routine takes no
 * arguments at all.
 */
export function gen_10008430(c) {
  reverbInit(c, 0x10009f68);
  c.r18 = 0x189c;
  c.startSample(0x31380);
  c.srand();
  const r24 = SEG0 + R2 + 0x350a, r25 = SEG0 + R2 + 0x34e2;
  c.r15 = 0;
  let f12 = c.f30, f6 = c.k(0x2d3a);
  let f16 = c.f16, f17 = c.f17;
  do {
    const noise = c.rand() * c.k(0x2dd2);
    let f2 = noise * c.k(0x2a6e);
    let f0 = c.u8(r25 + c.r16) / c.k(0x2dc2);
    f0 = f0 * f6 * c.k(0x2bc6);
    f2 = f2 - fmadd(c.k(0x2b2a), f17, f16);
    f17 = fmadd(f0, f2, f17);
    f16 = fmadd(f17, f0, f16);

    if (c.r17 === 0xa) c.r15 = 0;
    if (c.u8(r24 + c.r16) !== 0) {
      if (c.r17 === 0xd89) c.r15 = 2;
    } else if (c.r17 === 0x3b1) {
      c.r15 = 2;
    }

    if (c.r15 === 0) {
      f6 = c.k(0x2d3a); f12 = c.f30; c.r15 = 1;
    } else if (c.r15 === 1) {
      f12 = f12 * c.k(0x2cce); f6 = f6 * c.k(0x2cd2);
    } else if (c.r15 === 2) {
      f12 = f12 * c.k(0x2c86); f6 = f6 * c.k(0x2caa);
    }

    let f29 = c.k(0x2d52) * f2 * f12;
    f29 = f29 * (c.u8(r25 + c.r16) / c.k(0x2dd2));
    const wet = reverb(c, f29, c.k(0x2c1a));
    c.f29 = fmadd(wet, c.k(0x2baa), f29 * c.k(0x2c06));
  } while (c.emit());
}

/**
 * `0x10008b00` — the body behind THREE entry points, §8e's alternate-entry case.
 *
 *     0x10008ac4   82,688 frames, step 2,584   r21 = r2+0x354a, r10 = 1
 *     0x10008adc   25,200 frames, step 3,150   r21 = r2+0x315a, r10 = 0
 *     0x10008af4  100,800 frames, step 3,150   r21 and r10 FROM THE SCRIPT
 *
 * Six one-pole filters on the same noise source, at six different cutoffs,
 * SUBTRACTED from each other — `f15 - f14 - f13 - f26 - f25 - f19` — which is a
 * crude band-pass bank and gives the noise a pitch. Then one resonant filter
 * whose coefficient is the product of two per-step byte tables.
 *
 * `r10` SELECTS THE TABLES AND HOW THEY ARE INDEXED at the same time. At 0 the
 * step index is masked to 8 (`andi. r9, r16, 7`), so an 8-entry pattern repeats
 * across all 32 steps; at 1 it is used whole against a different pair of
 * tables. That is one routine covering both a short loop and a long one.
 *
 * `f8` and `f28` are loaded before the loop and never read. Transcribed as
 * absent rather than as dead assignments, but noted so the next reader checking
 * this against the disassembly does not go looking for their use.
 */
function bandBody(c, r10, r21) {
  c.srand();
  let r24 = SEG0 + R2 + 0x3502, r25 = SEG0 + R2 + 0x34da;
  if (r10 !== 0) { r24 = SEG0 + R2 + 0x36aa; r25 = SEG0 + R2 + 0x368a; }
  c.r15 = 2;
  let f12 = c.f30, f6 = c.k(0x2d3a);
  let f13 = c.f13, f14 = c.f14, f15 = c.f15, f16 = c.f16, f17 = c.f17;
  let f19 = c.f19, f25 = c.f25, f26 = c.f26;
  do {
    const n = c.rand() * c.k(0x2dd2);
    f15 = fmadd(f15, c.k(0x2c6e), c.k(0x2b02) * n);
    f14 = fmadd(f14, c.k(0x2c5a), c.k(0x2b0a) * n);
    f13 = fmadd(f13, c.k(0x2c4e), c.k(0x2b16) * n);
    f26 = fmadd(f26, c.k(0x2c3e), c.k(0x2b3a) * n);
    f25 = fmadd(f25, c.k(0x2bee), c.k(0x2b46) * n);
    f19 = fmadd(f19, c.k(0x2b96), c.k(0x2b9a) * n);
    const f3 = (f15 - f14 - f13 - f26 - f25 - f19) * c.k(0x2a6e);

    const r9 = r10 !== 0 ? c.r16 : (c.r16 & 7);
    let f29 = (c.u8(r24 + r9) / c.k(0x2dce)) * f6;
    f29 = (c.u8(r21 + c.r16) * c.k(0x2afa)) * f29;

    let f18 = fnmsub(f17, c.k(0x2b56), f3);
    f18 = fnmsub(f16, c.k(0x2bae), f18);
    f17 = fmadd(f18, f29, f17);
    f16 = fmadd(f17, f29, f16);

    if (c.r17 === 0xa) c.r15 = 0;
    if (c.r17 === 0x3b1) c.r15 = 2;
    if (c.r15 === 0) {
      f6 = c.k(0x2d3a); f12 = c.f30; c.r15 = 1;
    } else if (c.r15 === 1) {
      f12 = f12 * c.k(0x2cce); f6 = f6 * c.k(0x2caa);
    } else if (c.r15 === 2) {
      f12 = f12 * c.k(0x2c86); f6 = f6 * c.k(0x2c82);
    }

    c.f29 = (c.u8(r25 + r9) / c.k(0x2dd2)) * f12 * c.k(0x2d66) * f17;
  } while (c.emit());
}

export function gen_10008ac4(c) {
  c.r18 = 0xa18;
  c.startSample(0x14300);
  bandBody(c, 1, SEG0 + R2 + 0x354a);
}

export function gen_10008adc(c) {
  c.r18 = 0xc4e;
  c.startSample(0x6270);
  bandBody(c, 0, SEG0 + R2 + 0x315a);
}

export function gen_10008af4(c) {
  c.r18 = 0xc4e;
  c.startSample(0x189c0);
  bandBody(c, c.g.r10 ?? 0, c.g.r21);
}

/**
 * `0x10009aa4` — the body behind `0x10009a68` and `0x10009a8c`. Four samples.
 *
 *     0x10009a68  r10 = 3, step 6,300, so 100,800 frames
 *     0x10009a8c  r10 from the script (0, 1, 2), step 2,584, so 41,344
 *
 * `r19 = r18 * 0x10` — the length is the step times sixteen rather than an
 * immediate, which is why `synthlen.py` had to follow the branch to find it.
 *
 * Three sine oscillators with sign flags into a four-pole ladder, pitched by
 * three separate 2^x lookups off the same note. `r10` is a voice selector
 * threaded through eleven conditionals; 3 is the part-one voice and is the only
 * one that runs the reverb.
 *
 * THREE ORIGINAL BUGS, all reproduced because the reference bytes contain them:
 *
 *  1. THE THIRD OSCILLATOR NEVER MOVES. Its phase is `f4`, but the code that
 *     should advance it advances `f5` — the second oscillator's phase — a
 *     second time. So `sin(f4)` is `sin(0)` for every frame of every sample and
 *     `f26` is identically zero, while `f5` runs at the sum of two rates.
 *
 *  2. `fmr f1, f31` ZEROES THE COEFFICIENT the two instructions above it have
 *     just chosen between, so the ladder's input gain is always 0.0 and the
 *     `fnmsub` that uses it degenerates to passing `f2` through unchanged. The
 *     exp() feeding it is computed and discarded every frame.
 *
 *  3. `lfd f1, 0x2e36(r2)` READS TWO FLOAT32 CONSTANTS AS ONE DOUBLE. The
 *     divisor comes out as 3.82e24 instead of anything sensible, so the
 *     correction it scales is annihilated and `f19 = f0 + f19` is a no-op. The
 *     author almost certainly meant `lfs`.
 *
 * ITS SCRATCH SITS JUST BELOW DELAY LINE 0 AND DOES NOT ALIAS IT — which is
 * worth stating because it looks as though it does. `0x1000a2f0`'s clearing
 * loop advances r7 across 0x68 bytes, and r7 + 0x68 is EXACTLY the first delay
 * line's base, so a reading that stops at the loop concludes the scratch is
 * inside the reverb's buffer. It is not: the instruction after the loop
 * reloads r7 from r2+0x2f0a. Getting this wrong let the comb filter overwrite
 * the oscillator sign flags, and the sample diverged at frame 14.
 */
function ladder3Body(c, r10, r21, r23, r24, r25) {
  // 0x1000a2f0: zero 0x68 bytes at the pointer. The loop advances r7 as it
  // goes, but the routine RELOADS it from r2+0x2f0a before returning, so r7 is
  // the base and all eight scratch floats live inside the range just cleared.
  const r7 = c.w(0x2f0a);
  const base = (r7 - c.memBase) >> 2;
  c.mem.fill(0, base, base + 0x1a);
  const s = (off) => c.mem[base + (off >> 2)];
  const setS = (off, v) => { c.mem[base + (off >> 2)] = f32(v); };
  const is3 = r10 === 3;

  let f19 = c.k(0x2bd6), f12 = c.k(0x2afa);
  let f7 = c.k(0x2afa) * c.u8(r21);
  setS(0x10, c.f30); setS(0x14, c.f30); setS(0x18, c.f30); setS(0x1c, c.f30);
  let f16 = is3 ? c.k(0x2bbe)
    : r10 === 0 ? c.k(0x2bf2) : r10 === 1 ? c.k(0x2b9e) : c.k(0x2b32);

  let f4 = c.f4, f5 = c.f5, f6 = c.f6, f8 = c.f8;
  let f10 = c.f10, f11 = c.f11, f13 = c.f13, f14 = c.f14;
  let f15 = c.f15, f20 = c.f20, f21 = c.f21;
  let f22 = c.f22, f23 = c.f23, f24 = c.f24, f28 = c.f28;

  const wrap = c.k(0x2e52), gate = c.k(0x2e56);

  do {
    if (c.u8(r24 + c.r16) !== 0) f23 = fmadd(f24 - f23, c.k(0x2abe), f23);
    else f23 = f24;
    if (f23 !== f22) {
      f21 = c.pow2(f23 - (is3 ? c.k(0x2b7a) : c.k(0x2b72)));
      f20 = c.pow2(f23 - (is3 ? c.k(0x2b8e) : c.k(0x2b6a)));
      f15 = c.pow2(f23 - c.k(0x2b6e));
    }
    f22 = f23;

    // Oscillator 1, phase f6.
    f28 = c.sin(f6) * s(0x10);
    f6 = f6 + (f21 / wrap) / (is3 ? c.k(0x2df2) : c.k(0x2db2));
    f6 = fsel(f6 - wrap, f6 - wrap, f6);
    if (f6 > gate) {
      if (f6 < c.k(0x2c1a) * wrap) setS(0x10, -c.f30);
    } else setS(0x10, c.f30);

    // Oscillator 2, phase f5.
    const f27 = c.sin(f5) * s(0x14);
    f5 = f5 + (f20 / wrap) / (is3 ? c.k(0x2df2) : c.k(0x2db2));
    f5 = fsel(f5 - wrap, f5 - wrap, f5);
    if (f5 > gate) {
      if (f5 < c.k(0x2c1a) * wrap) setS(0x14, -c.f30);
    } else setS(0x14, c.f30);

    // Oscillator 3 reads f4 and then advances f5 AGAIN — bug 1 above. f4 is
    // never written anywhere in the routine, so this term is always sin(0).
    const f26 = c.sin(f4) * s(0x18);
    f5 = f5 + (f15 / wrap) / c.k(0x2db2);
    f5 = fsel(f5 - wrap, f5 - wrap, f5);
    if (f5 > gate) {
      if (f5 < c.k(0x2c1a) * wrap) setS(0x18, -c.f30);
    } else setS(0x18, c.f30);

    if (c.r17 === 0) {
      f24 = (c.u8(r25 + c.r16) + (is3 ? 0 : 0xc)) / c.k(0x2d82);
      f8 = c.u8(r21 + c.r16) * c.k(0x2afa);
      if (c.u8(r23 + c.r16) === 0) c.r15 = 0;
    }
    if (c.r16 !== 0) f7 = fmadd(f8 - f7, is3 ? c.k(0x2abe) : c.k(0x2ad2), f7);
    else f7 = f8;

    let f2 = fmadd(f26, s(0x1c), f28 - f27) * c.k(0x2c1a);
    if (is3) f2 = f28 + f27;

    if (r10 !== 0) {
      f16 = f16 * c.k(0x2ce6);
      f16 = fsel(f16 - c.f30, c.f30, f16);
    }
    let f18 = f7 * f19 * f16;
    f18 = fsel(f18 - c.f30, c.f30, f18);

    const f3 = fnmsub(c.k(0x2d22) * f18, f18, fmsub(c.k(0x2d56), f18, c.f30));
    const f29 = fmadd(f3, c.k(0x2bd6), c.k(0x2bd6));
    c.exp(fnmsub(f29, c.k(0x2d16), c.k(0x2d16)));   // computed, then discarded

    // Bug 2: the coefficient is zeroed, so this is `f18 = f2`.
    f18 = fnmsub(0, f10, f2);
    f14 = fnmsub(f3, f14, fmadd(s(0x58), f29, f18 * f29));
    f13 = fnmsub(f3, f13, fmadd(s(0x5c), f29, f14 * f29));
    f11 = fnmsub(f3, f11, fmadd(s(0x60), f29, f13 * f29));
    f10 = fnmsub(f3, f10, fmadd(s(0x64), f29, f11 * f29));
    f10 = f10 - c.k(0x2b5a) * f10 * f10 * f10;
    setS(0x58, f18); setS(0x5c, f14); setS(0x60, f13); setS(0x64, f11);

    if (c.r17 === (is3 ? 0x1275 : 0x184)
      && c.u8(r23 + ((c.r16 + 1) & 0xf)) !== 1) c.r15 = 2;

    if (c.r15 === 0) {
      f19 = fmadd(f19, c.k(0x2d0e), is3 ? c.k(0x2b3e) : c.k(0x2c1a));
      f19 = fsel(f19 - c.f30, c.f30, f19);
      f12 = f12 * (is3 ? c.k(0x2d0a) : c.k(0x2d12));
      if (f12 > c.f30) { f12 = c.f30; c.r15 = 1; }
    } else if (c.r15 === 1) {
      f19 = f19 * (is3 ? c.k(0x2caa) : c.k(0x2cd2));
    } else if (c.r15 === 2) {
      if (is3) {
        f28 = f28 * c.k(0x2c72);
        f12 = f12 * c.k(0x2c86);
      } else {
        // Bug 3: an lfd across two float32 constants, so the divisor is 3.8e24
        // and the whole correction vanishes.
        f19 = fmsub(f19, c.k(0x2b96), f19) / c.kd(0x2e36) + f19;
        f12 = f12 * c.k(0x2c76);
      }
    }

    c.f29 = c.k(0x2d4e) * (f11 - f10) * f12 * c.k(0x2dd2);
    if (is3) {
      const f9 = f10 * c.k(0x2df2) * f12;
      const wet = reverb(c, f9, c.k(0x2c1a));
      c.f29 = fmadd(wet, c.k(0x2baa), f9 * c.k(0x2c06));
      // …and take back the two phases it just overwrote. See reverb().
      f5 = c.f5;
      f4 = c.f4;
    }
  } while (c.emit());
}

export function gen_10009a68(c) {
  reverbInit(c, 0x10009f68);
  c.r18 = 0x189c;
  c.startSample(0x189c * 0x10);
  ladder3Body(c, 3, SEG0 + R2 + 0x325a, SEG0 + R2 + 0x302a,
    SEG0 + R2 + 0x2f9a, SEG0 + R2 + 0x308a);
}

export function gen_10009a8c(c) {
  const r24 = SEG0 + R2 + 0x300a;
  c.r18 = 0xa18;
  c.startSample(0xa18 * 0x10);
  ladder3Body(c, c.g.r10 ?? 0, SEG0 + R2 + 0x34ca, r24, r24, SEG0 + R2 + 0x314a);
}

/**
 * `0x10008c9c` — three calls: 120,000 frames twice and 150,000 once.
 *
 * THE ONLY PRIMITIVE THAT TAKES A FLOAT ARGUMENT. The script sets it with
 * `lfs f0, 0x2d5e(r2)` and the routine keeps it in `f9` as a frequency offset
 * added to all three oscillators — so this is one voice at a pitch the script
 * chooses, rather than one with a pitch of its own.
 *
 * Three sawtooth-ish oscillators built by hand rather than by phase wrapping:
 * each accumulates a sine-modulated increment into `f26`/`f25`/`f5` and holds a
 * sign in `f28`/`f27`/`f6` that goes to -1 when the accumulator passes a
 * threshold and back to +1 when it wraps. `r10` picks the wrap point, and with
 * it the octave.
 *
 * Their sum runs through two integrators and a resonant pair whose coefficient
 * `f18` is, for `r10 != 0`, a slow linear ramp — and for `r10 == 0`, a COSINE
 * sweep, plus a saturating output stage the other variant does not have.
 */
export function gen_10008c9c(c) {
  const r10 = c.g.r10 ?? 0;
  const r19 = c.g.r19;
  c.startSample(r19);
  let f28 = c.f30, f27 = c.f30, f6 = c.f30;
  let f25 = c.k(0x2df2), f18 = c.k(0x2a9a);
  const f9 = c.f0;
  let f5 = c.f5, f26 = c.f26, f24 = c.f24, f22 = c.f22, f19 = c.f19;
  let f4 = c.f4, f7 = c.f7, f8 = c.f8, f10 = c.f10, f11 = c.f11, f12 = c.f12;
  let f13 = c.f13, f14 = c.f14, f16 = c.f16, f17 = c.f17;
  const half = c.k(0x2bd6);

  do {
    f8 += c.k(0x2a9e);
    f7 += c.k(0x2aaa);
    f12 += c.k(0x2aa2);
    f11 += c.k(0x2aa6);

    let o = c.sin(f12);
    f26 += fmadd(o, c.k(0x2b1a), f9);
    f28 = fsel(f26 - fmadd(o, c.k(0x2dd2), c.k(0x2df2)), -c.f30, f28);

    o = c.sin(f11);
    f25 += fnmsub(o, c.k(0x2b1a), f9);
    f27 = fsel(f25 - fnmsub(o, c.k(0x2dd2), c.k(0x2df2)), -c.f30, f27);

    f5 += f9;
    o = c.sin(f8);
    f6 = fsel(f5 - fmadd(o, c.k(0x2dd6), c.k(0x2df2)), -c.f30, f6);

    const wrap = r10 === 0 ? c.k(0x2e26) : c.k(0x2e0e);
    if (f26 >= wrap) { f26 -= wrap; f28 = c.f30; }
    if (f25 >= wrap) { f25 -= wrap; f27 = c.f30; }
    if (f5 >= wrap) { f5 -= wrap; f6 = c.f30; }

    const mix = f28 - f27 + f6;
    f17 += mix - fmadd(c.k(0x2c06), f17, f16);
    f16 = fmadd(f17, half, f16);
    const f15 = f16 - fmadd(c.k(0x2c2a), f14, f13);
    f14 += f15;
    f13 = fmadd(f14, fmadd(c.sin(f7), c.k(0x2b3e), c.k(0x2baa)), f13);

    let a, b;
    if (r10 !== 0) {
      f18 += c.k(0x2a7e);
      a = c.k(0x2b0e); b = c.k(0x2b96);
    } else {
      f18 = fnmsub(c.cos(f10), c.k(0x2b1e), c.k(0x2b42));
      f10 += c.k(0x2a82);
      a = c.k(0x2b4a); b = half;
    }
    let v = fnmsub(a, f22, f16 + f16);
    v = fnmsub(f24, b, v);
    f22 = fmadd(v, f18, f22);
    f24 = fmadd(f22, f18, f24);
    c.f29 = f22 - f24;

    if (r10 === 0) {
      const f3 = c.k(0x2d5e) * f24;
      const f2 = clampSym(f3, c.k(0x2d86));
      const k = c.k(0x2b06);
      f19 = fmadd(f2 - f19 - f4, k, f19);
      f4 = fmadd(f19, k, f4);
      const wet = c.k(0x2bae);
      c.f29 = fmadd(c.f30 - wet, f3, c.k(0x2d7e) * f4 * wet);
    }
    c.f4 = f4;
  } while (c.emit());
}

/**
 * `0x10008568` — 262,144 frames, one call in each part. The longest sample.
 *
 * Three square-gated sines into a four-pole ladder, and the ladder's cutoff is
 * `f19`, an envelope with THREE separate rules: it rises for the first 65,536
 * frames, and once it has been clamped at 1.0 it decays — slowly before frame
 * 183,500 and faster after. So the filter opens, holds and closes over the
 * length of the sample, which is what four seconds of one note needs.
 *
 * Each oscillator's phase increment comes from `pow2(1 - k)`, so the three `k`
 * constants are the detuning. The gate is the same shape as everywhere else:
 * the sign goes to -1 between a quarter and three eighths of the way round.
 *
 * It configures the reverb and never calls it.
 */
export function gen_10008568(c) {
  reverbInit(c, 0x10009f68);
  c.startSample(0x40000);
  let f12 = c.f30, f18 = c.f30, f17 = c.f30, f16 = c.f30;
  let f19 = c.k(0x2afa);
  let f20 = c.f20, f25 = c.f25, f27 = c.f27;
  let f6 = c.f6, f7 = c.f7, f8 = c.f8, f11 = c.f11;
  let f13 = c.f13, f14 = c.f14, f15 = c.f15, f22 = c.f22, f4 = c.f4;
  const wrap = c.k(0x2e52), gate = c.k(0x2e56);
  const upper = fmadd(gate, c.k(0x2bd6), gate);

  /** One oscillator: value, advanced phase, and the new sign. */
  const step = (phase, sign, kNote) => {
    const v = sign * c.sin(phase);
    let p = phase + c.pow2(c.f30 - c.k(kNote)) / wrap / c.k(0x2df2);
    p = fsel(p - wrap, p - wrap, p);
    let s = sign;
    if (p > gate) { if (p < upper) s = -c.f30; } else s = c.f30;
    return [v, p, s];
  };

  do {
    if (c.r20 > 0x2cccc) f12 = f12 * c.k(0x2cd6);

    let f21, f28, f26;
    [f21, f20, f18] = step(f20, f18, 0x2b5e);
    [f28, f27, f17] = step(f27, f17, 0x2b86);
    [f26, f25, f16] = step(f25, f16, 0x2b6e);

    let f3 = c.k(0x2bfa) * (f21 + f28 + f26);
    const cut = f19 * c.k(0x2c16);
    f4 = cut * c.k(0x2d56) - fmadd(cut * cut, c.k(0x2d22), c.f30);
    const f5 = fmadd(f4, c.k(0x2bd6), c.k(0x2bd6));
    const f2 = c.exp(fnmsub(f5, c.k(0x2d16), c.k(0x2d16))) * c.k(0x2c4a);

    if (c.r20 < 0x10000) f19 = f19 * c.k(0x2cea);
    if (f19 > c.f30) f19 = c.f30;
    else f19 = f19 * (c.r20 > 0x2cccc ? c.k(0x2cc2) : c.k(0x2cda));

    f3 = fnmsub(f2, f6, f3);
    f8 = fnmsub(f4, f8, fmadd(f15, f5, f3 * f5));
    f11 = fnmsub(f4, f11, fmadd(f14, f5, f8 * f5));
    f7 = fnmsub(f4, f7, fmadd(f13, f5, f11 * f5));
    f6 = fnmsub(f4, f6, fmadd(f22, f5, f7 * f5));
    f15 = f3; f14 = f8; f13 = f11; f22 = f7;
    f6 = f6 - (f6 * f6 * f6) / c.k(0x2d72);
    c.f29 = f6 * f12 * c.k(0x2df2);
    c.f4 = f4;
  } while (c.emit());
}

/**
 * `0x10008880` — 20,000 frames, three calls in part one at `r10` 0, 1 and 2.
 *
 * Two swept sines plus noise through the reverb, and `r10` reconfigures almost
 * every stage: the two sine rates, whether the filter is read before or after
 * its second pole, the wet/dry pair, and which of two resonator topologies runs
 * after it. Three distinct instruments out of one body.
 *
 * `r10 == 3` IS IMPLEMENTED AND CANNOT BE CHECKED. It has its own length
 * (28,000 rather than 20,000), its own coefficients, and a fifth stage the
 * others skip — and the shipped script never uses it, so no reference sample
 * exists. Transcribed from the disassembly and marked here rather than left
 * out, which is the same call PORT_SPEC §3 makes for the two undecidable
 * animation gates.
 */
export function gen_10008880(c) {
  const r10 = c.g.r10 ?? 0;
  reverbInit(c, 0x10009f40);
  c.startSample(r10 === 3 ? 0x4e20 + 0x1f40 : 0x4e20);
  c.srand();
  let f12 = c.f30, f11 = c.f30, f28 = c.k(0x2afa);
  let f24 = c.k(0x2de2), f23 = c.k(0x2dfa);
  if (r10 !== 0) {
    f24 = c.k(0x2e1a); f23 = c.k(0x2e1e);
    if (r10 !== 1) { f24 = c.k(0x2d96); f23 = c.k(0x2dc6); }
  }
  let f16 = c.f16, f17 = c.f17, f22 = c.f22, f25 = c.f25, f26 = c.f26, f27 = c.f27;
  const deep = r10 >= 2;

  do {
    let f9 = (c.rand() * c.k(0x2dc6)) * c.k(0x2a6e);
    f28 = f28 * c.k(0x2d0e);
    f28 = fsel(f28 - c.f30, c.f30, f28);
    const f6 = f12 * f11;
    const k = c.k(0x2d72);
    let f2 = (c.sin(-f24) * f28) * f6;
    const b = ((c.sin(-f23) * f28) * f6) * k;
    f2 = fmadd(f2, k, b);
    f9 = fmadd(f6 * f6, f9, f2) * c.k(0x2bd6);

    const kf = deep ? c.k(0x2b06) : c.k(0x2b26);
    const prev = deep ? f17 * kf : f17;
    const drive = f9 - prev - f16;
    f17 = fmadd(drive, kf, f17);
    f16 = fmadd(f17, kf, f16);

    const wet = reverb(c, deep ? f17 : f16, c.k(0x2c5e));
    const wk = deep ? c.k(0x2b76) : c.k(0x2bba);
    const dk = deep ? c.k(0x2c2a) : c.k(0x2bea);
    let f0 = fmadd(f9, dk, wet * wk) * c.k(0x2bb6);

    let f5, a, bb, cc, dd, ee;
    if (deep) {
      let p1 = c.k(0x2b56), p2 = c.k(0x2b96);
      if (r10 !== 0) p1 = c.k(0x2bb6);
      f5 = f0 - fmadd(p2, f27, c.k(0x2b52) * f22);
      let g1 = c.k(0x2be6), g2 = p2;
      if (r10 === 3) { g1 = c.k(0x2b56); g2 = c.k(0x2bf6); }
      f27 = fmadd(fnmsub(f6, f6, c.k(0x2d0e)) * g1, f5, f27);
      f22 = fmadd(g2 * f6, f27, f22);
      if (r10 === 3) {
        let t = fmsub(c.k(0x2e02), f5 - f27, f25);
        t = fnmsub(f26, c.k(0x2bc6), t);
        f26 = fmadd(t, c.k(0x2b96), f26);
        f25 = fmadd(f26, c.k(0x2b3e), f25);
      }
      a = c.k(0x2c7e); bb = c.k(0x2c86); cc = c.k(0x2cc6); dd = c.k(0x2cba);
      ee = c.k(0x2df2);
      void p1;
    } else {
      // f2 and f3 both start as 0x2b56; at r10 != 0 f2 is replaced and f3
      // scaled by f6 — but r10 < 2 and r10 != 0 means r10 == 1 only.
      const f2c = r10 !== 0 ? c.k(0x2bb6) : c.k(0x2b56);
      const f3c = r10 !== 0 ? c.k(0x2b56) * f6 : c.k(0x2b56);
      f5 = f0 - fmadd(f2c, f27, f22);
      f27 = fmadd(f3c, f5, f27);
      f22 = fmadd(f27, f3c, f22);
      a = c.k(0x2c62); bb = c.k(0x2c6a); cc = c.k(0x2cae); dd = c.k(0x2ca6);
      ee = c.k(0x2df2);
    }

    f24 = f24 * a;
    f23 = f23 * bb;
    if (c.r20 < 0x3138) {
      f12 = f12 * cc;
      f11 = fnmsub(f11, c.k(0x2a8a), f11);
    } else {
      f12 = f12 * dd;
    }

    c.f29 = f27 * ee;
    c.f4 = ee;
    if (r10 !== 0) c.f29 = f5 * ee;
    if (r10 === 2) { c.f4 = c.k(0x2dd2); c.f29 = f5 * c.f4; }
    if (r10 === 3) { c.f4 = c.k(0x2d1a); c.f29 = f26 * c.f4; }
  } while (c.emit());
}

/**
 * `0x10006fc0` — 65,536 frames, one call in part three.
 *
 * A runaway sine into a one-pole pair, reverberated inverted. Two decays again,
 * `f12` geometric and `f11` by subtracting a 1/16384th of itself, and both stop
 * changing rate at frame 0x7333.
 *
 * IT SAVES f5 ACROSS THE REVERB CALL — `stfdu f5, -8(r13)` before and
 * `lfd f5, 0(r13)` after — which is the author telling us the reverb clobbers
 * f5. `0x10009aa4` keeps an oscillator phase there and does NOT save it, which
 * is why that voice comes out the way it does. See reverb().
 */
export function gen_10006fc0(c) {
  reverbInit(c, 0x10009f40);
  c.startSample(0x10000);
  let f12 = c.f30, f11 = c.f30;
  let f21 = c.k(0x2afa), f5 = c.k(0x2dde);
  let f16 = c.f16, f17 = c.f17;
  do {
    const f19 = f12 * f11;
    const f20 = c.sin(-f5);
    f21 = f21 * c.k(0x2d0e);
    f21 = fsel(f21 - c.f30, c.f30, f21);
    const f9 = f20 * c.k(0x2d72) * f21 * f19;
    const f18 = f9 - fmadd(c.k(0x2c4e), f17, f16);
    f17 = fmadd(f18 * c.k(0x2c2e), f12, f17);
    f16 = fmadd(f17, c.k(0x2afa), f16);
    const saved = f5;
    const wet = reverb(c, -f16, c.k(0x2c5e));
    f5 = saved;
    const f6 = fmadd(c.f10, c.k(0x2bba), c.k(0x2bea) * wet) * c.k(0x2bb6);
    c.f29 = f6 * c.k(0x2dd2);
    const more = c.emit();
    f5 = f5 * c.k(0x2cca);
    if (c.r20 <= 0x7333) {
      f12 = f12 * c.k(0x2cda);
      f11 = f11 - f11 / c.k(0x2e42);
    } else {
      f12 = f12 * c.k(0x2c9e);
    }
    if (!more) break;
  } while (true);
}

/**
 * `0x10007a68` — read one signed byte of the sample being built, as a float.
 *
 * The only reason it exists is the second pass below, which reads back what the
 * first pass already emitted.
 */
const tap = (c, addr) => (c.out[addr] << 24) >> 24;

/**
 * The three-tap smoother `0x10007654` and `0x10007860` both run as a SECOND
 * PASS over the sample they have just written, in place.
 *
 * This is the only place in the synth where a routine reads its own output
 * back. It walks the PCM with a 3-tap FIR — taps at p, p+2 and p+1, in that
 * order — into a two-pole recursive section, and stores the result back at p
 * before moving on. Reading ahead and writing behind is what keeps it from
 * feeding on itself: every byte is read before the pass reaches it.
 *
 * The coefficients come from a resonator design done at RUN TIME:
 * `cos(2*pi*303/22050)` sets the pole angle and the rest falls out of it, so
 * 303 Hz at 22,050 is written into the binary as a filter rather than as
 * numbers.
 *
 * It stops FOUR frames short of the end (`addic. r19, r19, 0xfffc`), so the
 * last four bytes of both samples are whatever the first pass left.
 */
function smoothPass(c, start, frames, perFrame) {
  const angle = c.cos(c.k(0x2e5a) * c.k(0x2dfa) / c.k(0x2e3e));
  const two = c.k(0x2d36);
  const f11 = c.k(0x2a9a) / fmadd(Math.abs(angle), two, two) + c.k(0x2c5e);
  const f18 = angle * f11 * -two;
  const poleA = (angle * -two) * c.k(0x2c5e);
  const poleB = c.k(0x2c56);
  let f13 = 0, f14 = 0;
  let r24 = start;
  for (let n = frames - 4; n > 0; n--) {
    let f15 = tap(c, r24);
    r24 += 2;
    f15 += tap(c, r24);
    r24 -= 1;
    f15 = fmadd(f15, f11, tap(c, r24) * f18);
    f15 = f15 - fmadd(poleB, f13, poleA * f14);
    f13 = f14;
    f14 = f15;
    let v = fctiw(perFrame(f15, f18));
    c.out[r24 - 1] = v & 0xff;
  }
}

/**
 * `0x10007654` — 16,000 frames, one call in part three.
 *
 * Noise into a resonator with a swept `f6`, then the smoothing pass — whose
 * output stage here adds a decaying sine and runs a further one-pole pair, so
 * the second pass is not only a filter but the instrument's tail.
 */
export function gen_10007654(c) {
  c.startSample(0x3e80);
  c.srand();
  const start = c.r31;
  let f6 = c.k(0x2d3a), f12 = c.k(0x2b3e);
  let f16 = c.f16, f17 = c.f17, f22 = c.f22, f23 = c.f23;
  do {
    const f3 = (c.rand() * c.k(0x2d92)) * c.k(0x2a6e);
    const f11 = f6;
    if (c.r20 < 0xaa0) {
      f12 = f12 * c.k(0x2d0a);
      f12 = fsel(f12 - c.k(0x2d66), c.k(0x2d66), f12);
    }
    if (c.r20 > 0x12c0) f12 = f12 * c.k(0x2c9e);
    f6 = fmadd(f6, c.k(0x2aaa), c.k(0x2d32) - f6);
    let f0 = f3 - fmadd(f16, c.k(0x2bae), c.k(0x2ba6) * f17);
    f17 = fmadd(c.k(0x2d12) * f0, f11, f17);
    f16 = fmadd(f17, c.k(0x2d0e) * f11, f16);
    f0 = ((f0 - f17) * c.k(0x2d6e)) * f12;
    f0 = fnmsub(c.k(0x2b4e), f23, f0);
    const f24 = fnmsub(c.k(0x2b96), f22, f0);
    f23 = fmadd(f24, c.k(0x2bae), f23);
    f22 = fmadd(f23, c.k(0x2bae), f22);
    c.f29 = (f24 - f23) * c.k(0x2bfa);
  } while (c.emit());

  let f27 = c.k(0x2afa), f28 = c.k(0x2dc6);
  let g16 = 0, g17 = 0;
  smoothPass(c, start, 0x3e80, (f15, f18) => {
    let f0 = c.sin(-f28);
    f27 = f27 * c.k(0x2d0e);
    f27 = fsel(f27 - c.f30, c.f30, f27);
    f0 = c.k(0x2d82) * ((f0 * c.k(0x2d72)) * f27);
    f0 = fmadd(c.k(0x2c1a), f15, f0) * c.k(0x2bae);
    f0 = fnmsub(g17, c.k(0x2b06), f0 - g16);
    g17 = fmadd(f0, c.k(0x2c52), g17);
    g16 = fmadd(g17, c.k(0x2afa), g16);
    f27 = f27 * c.k(0x2cd2);
    f28 = f28 * c.k(0x2c9e);
    return g17 - f18;
  });
}

/**
 * `0x10007860` — 9,900 frames, one call in part three.
 *
 * The same shape as `0x10007654`, but its noise is coloured by the six-filter
 * bank `0x10008b00` uses, and its second pass writes the smoother's output
 * straight out with no tail stage.
 */
export function gen_10007860(c) {
  c.startSample(0x26ac);
  c.srand();
  const start = c.r31;
  let f6 = c.k(0x2d3a), f12 = c.k(0x2b3e);
  let f13 = c.f13, f14 = c.f14, f15 = c.f15, f16 = c.f16, f17 = c.f17;
  let f19 = c.f19, f22 = c.f22, f23 = c.f23, f25 = c.f25, f26 = c.f26;
  do {
    const n = c.rand() * c.k(0x2db2);
    f15 = fmadd(f15, c.k(0x2c6e), c.k(0x2b02) * n);
    f14 = fmadd(f14, c.k(0x2c5a), c.k(0x2b0a) * n);
    f13 = fmadd(f13, c.k(0x2c4e), c.k(0x2b16) * n);
    f26 = fmadd(f26, c.k(0x2c3e), c.k(0x2b3a) * n);
    f25 = fmadd(f25, c.k(0x2bee), c.k(0x2b46) * n);
    f19 = fmadd(f19, c.k(0x2b96), c.k(0x2b9a) * n);
    const f3 = (f15 - f14 - f13 - f26 - f25 - f19) * c.k(0x2a6e);
    const f11 = f6;
    if (c.r20 < 0x693) {
      f12 = f12 * c.k(0x2d0a);
      f12 = fsel(f12 - c.k(0x2d66), c.k(0x2d66), f12);
    }
    if (c.r20 > 0x1167) {
      f12 = f12 * c.k(0x2c86);
      f6 = fmadd(f6, c.k(0x2aaa), c.k(0x2d32) - f6);
    }
    let f0 = f3 - fmadd(f16, c.k(0x2bae), c.k(0x2ba6) * f17);
    f17 = fmadd(c.k(0x2d12) * f0, f11, f17);
    f16 = fmadd(f17, c.k(0x2d0e) * f11, f16);
    f0 = ((f0 - f17) * c.k(0x2d62)) * f12;
    f0 = fnmsub(c.k(0x2b4e), f23, f0);
    const f24 = fnmsub(c.k(0x2b96), f22, f0);
    f23 = fmadd(f24, c.k(0x2bae), f23);
    f22 = fmadd(f23, c.k(0x2bae), f22);
    c.f29 = (f24 - f23) * c.k(0x2bfa);
  } while (c.emit());

  smoothPass(c, start, 0x26ac, (v) => v);
}

/**
 * `0x100070b0` — 82,688 frames in 32 steps of 2,584, one call in part three.
 *
 * Three decaying ramps reset on their own phase wraps — a three-oscillator
 * sawtooth stack — into a two-pole filter whose coefficient is the product of a
 * per-step amplitude byte and `f4`, itself under the three-state envelope. Its
 * three tables are hardcoded rather than taken from the script.
 *
 * Its `r15 == 2` branch reads BOTH its coefficients with `lfd` across pairs of
 * float32 constants, the same mistake `0x10009aa4` makes once. The values are
 * meaningless as doubles and the multiplications they drive are effectively
 * annihilations; reproduced because the reference contains them.
 */
export function gen_100070b0(c) {
  const r21 = SEG0 + R2 + 0x360a, r25 = SEG0 + R2 + 0x35ca, r24 = SEG0 + R2 + 0x35ea;
  c.r18 = 0xa18;
  c.startSample(0xa18 * 0x20);
  let f28 = c.f30, f27 = c.f30, f19 = c.f30, f4 = c.k(0x2d2a);
  let f7 = c.f7, f11 = c.f11, f12 = c.f12, f13 = c.f13, f14 = c.f14;
  let f20 = c.f20, f21 = c.f21, f22 = c.f22, f23 = c.f23, f24 = c.f24;
  let f25 = c.f25, f26 = c.f26;
  do {
    const f8 = c.u8(r21 + c.r16) * c.k(0x2afa);
    const decay = c.k(0x2bba);
    f28 = fnmsub(f28, decay, f28);
    f27 = fnmsub(f27, decay, f27);
    f19 = fnmsub(f19, decay, f19);
    const f6 = (f28 + f27 + f19) * c.k(0x2c1a);

    if (c.u8(r24 + c.r16) !== 0) f23 = fmadd(f24 - f23, c.k(0x2af2), f23);
    else f23 = f24;
    if (f23 !== f22) {
      f21 = c.pow2(f23 - c.k(0x2bde));
      f20 = c.pow2(f23 - c.k(0x2bce));
      f11 = c.pow2(f23 - c.k(0x2bd6));
    }
    f22 = f23;
    f26 += f21; f25 += f20; f7 += f11;
    const w = c.k(0x2e0e);
    if (f26 >= w) { f26 -= w; f28 = c.f30; }
    if (f25 >= w) { f25 -= w; f27 = c.f30; }
    const w2 = w + w;
    if (f7 >= w2) { f7 -= w2; f19 = c.f30; }

    if (c.r17 === 0) {
      f24 = c.u8(r25 + c.r16) / c.k(0x2d82);
      f4 = c.k(0x2d2a);
      if (c.u8(r24 + c.r16) === 0) c.r15 = 0;
    }

    const f15 = f6 - fmadd(c.k(0x2b76), f14, f13);
    f14 = fmadd(f15 * f8 * f4, f12, f14);
    f13 = fmadd(f14 * f8 * f4, f12, f13);

    if (c.r17 === 0x6a9 && c.u8(r24 + ((c.r16 + 1) & 0x1f)) !== 1) c.r15 = 2;
    if (c.r15 === 0) {
      f12 = fmadd(f12, c.k(0x2d0e), c.k(0x2afa));
      if (f12 >= c.f30) { f12 = c.f30; c.r15 = 1; }
    } else if (c.r15 === 1) {
      f4 = f4 * c.k(0x2c7e);
    } else if (c.r15 === 2) {
      f4 = f4 * c.kd(0x2c7a);
      f12 = f12 * c.kd(0x2c66);
    }

    c.f29 = f13 * (f12 * c.k(0x2df2));
    c.f4 = f4;
  } while (c.emit());
}

/**
 * `0x10007284` — 82,688 frames in 32 steps of 2,584, one call in part three.
 *
 * Two ramps decaying by half every frame and stepping DOWN by 1.0 on each phase
 * wrap rather than resetting — so they run away downward, which is what makes
 * this the bass. `f7` and `f12` start at 2.0, not 1.0.
 *
 * Its three byte tables come from the script (`r21`, `r24`, `r25`), and it is
 * the call that sets `r25` — the same register `0x1000742c` then reloads per
 * call from its own table.
 */
export function gen_10007284(c) {
  const { r21, r24, r25 } = c.g;
  c.r18 = 0xa18;
  c.startSample(0xa18 * 0x20);
  let f28 = c.f30, f27 = c.f30;
  let f7 = c.f30 + c.f30, f12 = c.f30 + c.f30;
  let f16 = c.f16, f17 = c.f17, f20 = c.f20, f21 = c.f21;
  let f22 = c.f22, f23 = c.f23, f24 = c.f24, f25 = c.f25, f26 = c.f26;
  do {
    const h = c.k(0x2bd6);
    f28 = f28 - f28 * h;
    f27 = f27 - f27 * h;
    const f6 = f28 + f27;

    if (c.u8(r24 + c.r16) !== 0) f23 = fmadd(f24 - f23, c.k(0x2ae6), f23);
    else f23 = f24;
    if (f23 !== f22) {
      f21 = c.pow2(f23 - c.k(0x2bca));
      f20 = c.pow2(f23 - c.k(0x2be2));
    }
    f22 = f23;
    f26 += f21; f25 += f20;
    const w = c.k(0x2df2);
    if (f26 >= w) { f26 -= w; f28 -= c.f30; }
    if (f25 >= w) { f25 -= w; f27 -= c.f30; }

    if (c.r17 === 0) {
      f24 = (c.u8(r25 + c.r16) + 0xc) / c.k(0x2d82);
      if (c.u8(r24 + c.r16) === 0) c.r15 = 0;
    }

    const f8 = c.u8(r21 + c.r16) * c.k(0x2afa);
    const f18 = f6 - c.k(0x2bea) * f17 - f16;
    f17 = fmadd(f18 * f8, f12, f17);
    f16 = fmadd(f17 * f8, f7, f16);

    if (c.r17 === 0x384 && c.u8(r24 + ((c.r16 + 1) & 0x1f)) !== 1) c.r15 = 2;
    if (c.r15 === 0) {
      f12 = fmadd(f12, c.k(0x2d0e), c.k(0x2afa));
      if (f12 >= c.f30) { f12 = c.f30; c.r15 = 1; }
    } else if (c.r15 === 1) {
      f12 = f12 * c.k(0x2c86);
      f7 = f7 / c.k(0x2cc6);
    } else {
      // No cr2 guard here, unlike its siblings: anything that is not 0 or 1
      // lands in this branch. r15 is only ever 0, 1 or 2, so it is the same
      // thing — but it is written differently and worth not "fixing".
      f12 = f12 * c.k(0x2c72);
      f7 = f7 * c.k(0x2cc6);
    }

    c.f29 = c.k(0x2e12) * f12 * f16;
    if (c.r17 === 0xa17) { f7 = c.f30; f27 = c.f30; }
  } while (c.emit());
}

/**
 * `0x10007a84` — 82,688 frames in 32 steps of 2,584, one call in part three.
 *
 * A single ramp under a soft-knee waveshaper: the filter's feedback term is
 * passed through a piecewise-quadratic limiter — beyond ±`0x2b2a` the excess is
 * doubled and squared back in, in one direction with `fmadd` and in the other
 * with `fnmsub`. That is distortion written as arithmetic rather than as a
 * table, and it is the only one in the synth.
 *
 * Its step table is read with `cmpwi r3, 1` and `cmpwi r3, 2` rather than
 * against zero, so its flag byte carries three states where the other voices'
 * carry two.
 */
export function gen_10007a84(c) {
  const r25 = SEG0 + R2 + 0x36ca, r21 = SEG0 + R2 + 0x370a, r23 = SEG0 + R2 + 0x36ea;
  c.r18 = 0xa18;
  c.startSample(0xa18 * 0x20);
  let f27 = c.f30, f7 = c.f30, f11 = c.f30;
  const f19 = c.k(0x2b2a);
  let f12 = c.k(0x2d36);
  let f16 = c.f16, f17 = c.f17, f21 = c.f21;
  let f22 = c.f22, f23 = c.f23, f24 = c.f24, f26 = c.f26;
  do {
    f27 = fnmsub(f27, c.k(0x2b62), f27);
    if (f27 < -c.f30) f27 = c.f30;

    f23 = fmadd(f24 - f23, c.k(0x2af2), f23);
    if (f23 !== f22) f21 = c.pow2(f23 - c.k(0x2bd6));
    f22 = f23;
    f26 += f21;
    const w = c.k(0x2df2);
    if (f26 > w) { f26 -= w; f27 = c.f30; }

    if (c.r17 === 0) {
      f24 = c.u8(r25 + c.r16) / c.k(0x2d82);
      if (c.u8(r23 + c.r16) === 1) c.r15 = 0;
    }

    const amp = c.u8(r21 + c.r16) * c.k(0x2afa);
    const f8 = fmadd(c.k(0x2b4e), f12 * amp, amp);

    // The soft knee, both sides.
    let f0 = f19 * f17;
    const knee = c.k(0x2b2a);
    if (f0 > knee) {
      const e = (f0 - knee) + (f0 - knee);
      f0 = fmadd(e, e, f0);
    } else if (f0 < -knee) {
      const e = (f0 - -knee) + (f0 - -knee);
      f0 = fnmsub(e, e, f0);
    }

    f0 = (f27 - (f0 + f16)) * f8;
    f17 = fmadd(f0, f11, f17);
    f16 = fmadd(f17 * f8, f7, f16);

    if (c.r17 === 0x4e2 && c.u8(r23 + ((c.r16 + 1) & 0x1f)) !== 2) c.r15 = 2;
    if (c.r15 === 0) {
      f12 = fmadd(f12, c.k(0x2d0e), c.k(0x2afa));
      if (f12 > c.f30) { f12 = c.f30; c.r15 = 1; }
    } else if (c.r15 === 1) {
      f12 = f12 * c.k(0x2c86);
      f11 = f11 * c.k(0x2c8a);
      f7 = f7 * c.k(0x2c92);
    } else if (c.r15 === 2) {
      f12 = f12 * c.k(0x2c9e);
    }

    c.f29 = f12 * c.k(0x2e06) * f16;
    if (c.r17 >= c.r18 - 1) { f7 = c.f30; f11 = c.f30; }
  } while (c.emit());
}

/**
 * `0x10007c44` — 120,000 frames, one call in part three.
 *
 * Three pulse oscillators whose DUTY CYCLE is modulated: each compares its ramp
 * against a threshold `f6` that is itself a sine of a slower ramp, so the pulse
 * width breathes. Two integrators and a one-pole after them, and the final
 * coefficient is another sine — five ramps of five different rates, and no
 * tables at all.
 */
export function gen_10007c44(c) {
  c.startSample(0x1d4c0);
  let f28 = c.f30, f27 = c.f30, f21 = c.f30;
  let f25 = c.k(0x2df2);
  let f4 = c.f4, f11 = c.f11, f13 = c.f13, f14 = c.f14;
  let f16 = c.f16, f17 = c.f17, f20 = c.f20, f23 = c.f23, f24 = c.f24, f26 = c.f26;
  const w = c.k(0x2e0e);
  do {
    f20 += c.k(0x2aaa);
    f24 += c.k(0x2aa2);
    f23 += c.k(0x2aa6);
    f4 += c.k(0x2a9e);

    let f6 = fmadd(w, c.sin(f24) * c.k(0x2b96), c.k(0x2df2));
    f26 += fmadd(c.sin(f24), c.k(0x2b1a), c.k(0x2d5e));
    if (f26 > f6) f28 = -c.f30;
    if (f26 > w) { f26 -= w; f28 = c.f30; }

    f6 = fnmsub(w, c.sin(f23) * c.k(0x2b96), c.k(0x2df2));
    f25 += fnmsub(c.sin(f23), c.k(0x2b1a), c.k(0x2d5e));
    if (f25 > f6) f27 = -c.f30;
    if (f25 > w) { f25 -= w; f27 = c.f30; }

    f6 = fmadd(c.sin(f4) * c.k(0x2b96), c.k(0x2d0e), c.k(0x2bd6)) * w;
    f11 += c.k(0x2d5e);
    if (f11 > f6) f21 = -c.f30;
    if (f11 > w) { f11 -= w; f21 = c.f30; }

    f17 += (f28 - f27 + f21) - fmadd(c.k(0x2c06), f17, f16);
    f16 = fmadd(f17, c.k(0x2bd6), f16);
    f14 += f16 - fmadd(c.k(0x2c2a), f14, f13);
    const kf = fmadd(c.sin(f20), c.k(0x2b3e), c.k(0x2b3e)) + c.k(0x2b76);
    f13 = fmadd(f14, kf, f13);
    c.f29 = c.k(0x2d9a) * f13;
    c.f4 = f4;
  } while (c.emit());
}

/**
 * `0x10007ddc` — 120,000 frames, one call in part three.
 *
 * Three pulse oscillators whose duty cycles are all driven from ONE slow LFO
 * in `f4`: `f6 = sin(f4) * k` widens the first, narrows the second by the same
 * amount, and shifts the third — so the three pulses breathe against each
 * other rather than independently.
 *
 * `f4` IS NOT CLEARED BY startSample and it is not local to this routine
 * either: `0x10007c44`, the very next call in the script, reads it as its own
 * LFO phase and never initialises it. The two samples are joined through a
 * register.
 */
export function gen_10007ddc(c) {
  c.startSample(0x1d4c0);
  let f28 = c.f30, f27 = c.f30, f11 = c.f30;
  let f4 = c.f4, f12 = c.f12, f13 = c.f13, f14 = c.f14;
  let f16 = c.f16, f17 = c.f17, f25 = c.f25, f26 = c.f26;
  const w = c.k(0x2e26), half = c.k(0x2bd6);
  do {
    f4 += c.k(0x2a9a);
    f4 = fsel(f4 - c.k(0x2e5a), c.f31, f4);      // wrap a full turn to zero
    const f6 = c.sin(f4) * c.k(0x2b66);

    f26 += c.k(0x2d5a);
    f25 += fmadd(c.k(0x2afa), c.sin(c.k(0x2d1e) * f4), c.k(0x2d5e));
    f12 += fnmsub(c.k(0x2afa), c.sin(f4), c.k(0x2d5e));

    if (f26 > (half + f6) * w) f28 = -c.f30;
    if (f25 > (half - f6) * w) f27 = -c.f30;
    if (f12 > fnmsub(f6, c.k(0x2d0e), half) * w) f11 = -c.f30;
    if (f26 > w) { f26 -= w; f28 = c.f30; }
    if (f25 > w) { f25 -= w; f27 = c.f30; }
    if (f12 > w) { f12 -= w; f11 = c.f30; }

    f17 += (f28 - f27 - f11) - fmadd(c.k(0x2bba), f17, f16);
    f16 = fmadd(f17, c.k(0x2b06), f16);
    f14 += f16 - fmadd(f14, c.k(0x2b76), f13);
    f13 = fmadd(f14, c.k(0x2baa), f13);
    c.f29 = c.k(0x2d9a) * f13;
  } while (c.emit());
  c.f4 = f4;
}

/** `fres` — the reciprocal ESTIMATE, which is a float32 divide. See texturevm.js. */
const fres = (x) => Math.fround(1 / x);

/**
 * `0x10008044` — 201,600 frames in 32 steps of 6,300, one call in part one.
 *
 * The largest primitive at 251 instructions, and the only one that keeps its
 * whole state in the scratch block rather than in registers: four oscillator
 * phases at `0x20`, four signs at `0x10`, four outputs at `0x00`, two spare
 * pitches at `0x48`, and four filter states at `0x38`. It runs out of registers
 * because it is four oscillators into FOUR two-pole sections, each with its own
 * coefficient — `f8`, `f7` and the two smoothed values at `0x50`/`0x54`, all
 * derived from the same per-step amplitude byte on four different time
 * constants.
 *
 * It is also the only primitive that uses `fres`. The phase increment divides
 * by 128*pi, and it does so with the reciprocal ESTIMATE — which is a float32
 * divide under this harness, settled by `fpest.py` and already relied on by the
 * texture VM. A `double` divide here is a different number.
 */
export function gen_10008044(c) {
  c.r18 = 0x189c;
  c.startSample(0x31380);
  const r7 = c.w(0x2f0a);
  const base = (r7 - c.memBase) >> 2;
  c.mem.fill(0, base, base + 0x1a);
  const s = (o) => c.mem[base + (o >> 2)];
  const setS = (o, v) => { c.mem[base + (o >> 2)] = f32(v); };

  const r24 = SEG0 + R2 + 0x2f7a, r25 = SEG0 + R2 + 0x304a, r21 = SEG0 + R2 + 0x352a;
  let f4 = c.k(0x2c1a), f8 = f4;
  const half = c.k(0x2bd6);
  let f7 = fmadd(f4, half, half);
  setS(0x54, fnmsub(f4, half, half));
  for (const o of [0x10, 0x14, 0x18, 0x1c]) setS(o, c.f30);
  setS(0x50, c.f30 - f4);
  let f12 = c.f30;
  let f13 = c.f13, f14 = c.f14, f16 = c.f16, f17 = c.f17;
  let f20 = c.f20, f21 = c.f21, f22 = c.f22, f23 = c.f23, f24 = c.f24;

  do {
    const glide = c.u8(r24 + c.r16) === 0 ? c.k(0x2ad2) : c.k(0x2afa);
    f23 = fmadd(f24 - f23, glide, f23);
    if (f23 !== f22) {
      f21 = c.pow2(f23 - c.k(0x2b8a));
      f20 = c.pow2(f23 - c.k(0x2b82));
      setS(0x48, c.pow2(f23 - c.k(0x2b92)));
      setS(0x4c, c.pow2(f23 - c.k(0x2b7e)));
    }
    f22 = f23;

    const f3 = c.k(0x2e52);
    const inv = fres(c.k(0x2dd2) * f3);
    const rates = [f21, f20, s(0x48), s(0x4c)];
    for (let i = 0; i < 4; i++) {
      const ph = s(0x20 + i * 4);
      setS(i * 4, c.sin(ph) * s(0x10 + i * 4));
      let p = fmadd(rates[i], inv, ph);
      p = fsel(p - f3, p - f3, p);
      setS(0x20 + i * 4, p);
      if (p > c.k(0x2e56)) {
        if (p < f3 * c.k(0x2c1a)) setS(0x10 + i * 4, -c.f30);
      } else setS(0x10 + i * 4, c.f30);
    }

    if (c.r17 === 0) {
      f4 = c.u8(r21 + c.r16) * c.k(0x2afa);
      f24 = (c.u8(r25 + c.r16) + 0xc) / c.k(0x2d82);
      if (c.u8(r24 + c.r16) === 0) c.r15 = 0;
    }

    f8 = fmadd(f4 - f8, c.k(0x2aae), f8);
    f7 = fmadd(fmadd(f4, half, half) - f7, c.k(0x2aaa), f7);
    setS(0x50, fmadd((c.f30 - f4) - s(0x50), c.k(0x2aa2), s(0x50)));
    setS(0x54, fmadd(c.k(0x2aaa), half - fmadd(f4, half, s(0x54)), s(0x54)));

    const f2 = (s(0) + s(4) + s(8) + s(0xc)) * c.k(0x2b96);
    f17 = fmadd(f2 - fmadd(half, f17, f16), f8, f17);
    f16 = fmadd(f17, f8, f16);
    f14 = fmadd(f2 - fmadd(half, f14, f13), f7, f14);
    f13 = fmadd(f14, f7, f13);

    for (const [ka, lo, hi, q] of [[0x2b56, 0x38, 0x40, 0x50], [0x2b96, 0x3c, 0x44, 0x54]]) {
      const a0 = s(lo), b0 = s(hi), coef = s(q);
      const a = fmadd(f2 - fmadd(c.k(ka), a0, b0), coef, a0);
      setS(lo, a);
      setS(hi, fmadd(a, coef, b0));
    }

    if (c.r17 === 0xd89 && c.u8(r24 + ((c.r16 + 1) & 0x1f)) !== 1) c.r15 = 2;
    if (c.r15 === 0) {
      f12 = fmadd(f12, c.k(0x2d0e), c.k(0x2afa));
      if (f12 >= c.f30) { f12 = c.f30; c.r15 = 1; }
    } else if (c.r15 === 2) {
      f12 = f12 * c.k(0x2c4e);
    }

    const f3o = (((s(0x3c) - s(0x38)) - f14) - f17) * c.k(0x2db2) * f12;
    const f2o = clampSym(f3o, c.k(0x2d5e));
    c.f29 = fmadd(c.k(0x2be6), f3o, c.k(0x2d8a) * f2o);
    c.f4 = f4;
  } while (c.emit());
}

/** Address -> implementation. Everything absent is filled from the oracle. */
export const PRIMITIVES = {
  0x10006fc0: gen_10006fc0,
  0x10007ddc: gen_10007ddc,
  0x10008044: gen_10008044,
  0x10007a84: gen_10007a84,
  0x10007c44: gen_10007c44,
  0x100070b0: gen_100070b0,
  0x10007284: gen_10007284,
  0x10007654: gen_10007654,
  0x10007860: gen_10007860,
  0x10008430: gen_10008430,
  0x10008568: gen_10008568,
  0x10008880: gen_10008880,
  0x10008c9c: gen_10008c9c,
  0x10009a68: gen_10009a68,
  0x10009a8c: gen_10009a8c,
  0x10008ac4: gen_10008ac4,
  0x10008adc: gen_10008adc,
  0x10008af4: gen_10008af4,
  0x100087b0: gen_100087b0,
  0x10008e8c: gen_10008e8c,
  0x10008f38: gen_10008f38,
  0x10008f64: gen_10008f64,
  0x1000977c: gen_1000977c,
  0x100097d8: gen_100097d8,
  0x10009834: gen_10009834,
  0x10006f38: gen_10006f38,
  0x10006f4c: gen_10006f4c,
  0x10009020: gen_10009020,
  0x10009258: gen_10009258,
  0x10009510: gen_10009510,
  0x1000742c: gen_1000742c,
};
