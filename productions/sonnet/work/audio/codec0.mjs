// Sonnet — the mode-0 sample codec (SAMPLELOADCALLBACK @0x00402f19, mode word 0).
//
// Used by instruments 13 and 14 only. It is a subband coder with an
// MPEG-Layer-I/II-shaped polyphase synthesis filterbank: 32 subbands, one block
// of 32 coefficients producing 32 output samples, a 64-point cosine matrix and a
// 512-tap window applied over a 512-float ring that shifts by 32 per block.
//
//   FUN_00403a51 @0x00403a51  build the two tables
//   FUN_00403b25 @0x00403b25  bit reader / dequantiser
//   FUN_00403c50 @0x00403c50  matrixing + windowed overlap-add
//   FUN_00403ca6 @0x00403ca6  driver
//
// Everything below is transcribed from `ndisasm -b 32`; Ghidra drops the x87 and
// gets the float* strides wrong. All constants are READ FROM THE IMAGE rather
// than transcribed, so a typo cannot silently change the sound.
//
// Memory map inside the original (param_1 of the helpers is always 0x004750c0):
//   0x004750c0  float A[512]    window            (0x800 bytes)
//   0x004758c0  float B[2048]   cosine matrix     (0x2000 bytes)
//   0x004778c0  float V[512]    overlap-add ring  (0x800 bytes)
//   0x004780c0  float C[16*32]  dequantised block coefficients (0x800 bytes)
// so B is at param_1+0x2000, V at param_1+0x2800, C at param_1+0x3000.

const fr = Math.fround;

/** VAs of the constants, so the table builder can read them straight out of the image. */
export const CONST = {
  cosineArgScaleA: 0x00418280, // float32, = pi/256 — window cosine series
  cosineArgScaleB: 0x00418278, // float64, = pi/64  — matrix
  dequantScale: 0x00418284, //    float32, = 1/256
  windowCoefficients: 0x0041a998, // float32[8]
};
const IMG_BASE = 0x401000;

/**
 * FUN_00403a51 — build the window (A) and the cosine matrix (B).
 *
 * A[k] = +/- sum(j=0..7) coef[j] * cos(j*k * pi256f), negated when (k & 0x40).
 *        The accumulator round-trips through float32 every term (`fst dword
 *        [ebp-0xc]` @0x00403aa1 keeps st0 but the next term adds back the
 *        float32 copy), which is what `fr()` models here.
 * B[i*64 + j] = cos((-16 - 32i + j*(2i+1)) * pi/64), i.e. cos((2i+1)(j-16)pi/64),
 *        for i = 0..31 (coefficient) and j = 0..63 (matrix output).
 *
 * NOTE this is NOT the textbook MPEG window/matrix. The standard MPEG synthesis
 * matrix is cos((16+j)(2i+1)pi/64) — this build uses (j-16), and the window is an
 * 8-term cosine series with its own coefficients rather than the MPEG D[] table.
 * Both are used exactly as found.
 */
export function buildTables(img) {
  const at = (va) => va - IMG_BASE;
  const piOver256f = img.readFloatLE(at(CONST.cosineArgScaleA));
  const piOver64 = img.readDoubleLE(at(CONST.cosineArgScaleB));
  const coef = [];
  for (let j = 0; j < 8; j++) coef.push(img.readFloatLE(at(CONST.windowCoefficients) + j * 4));

  const A = new Float32Array(512);
  for (let k = 0; k < 512; k++) {
    let acc = 0;
    let n = 0; // n = j*k; `add [ebp-0x8],eax` @0x00403a95 with eax = k
    for (let j = 0; j < 8; j++) {
      acc = fr(Math.cos(n * piOver256f) * coef[j] + acc);
      n += k;
    }
    A[k] = (k & 0x40) ? -acc : acc;
  }

  const B = new Float32Array(2048);
  let o = 0;
  for (let i = 0; i < 32; i++) {
    const step = 2 * i + 1;
    let n = -16 - 32 * i;
    for (let j = 0; j < 64; j++) {
      B[o++] = fr(Math.cos(n * piOver64));
      n += step;
    }
  }
  return { A, B, dequantScale: img.readFloatLE(at(CONST.dequantScale)) };
}

/**
 * FUN_00403b25 — read one group of up to 16 blocks into `C` (32 coefficients per
 * block, block stride 32). Returns the number of payload bytes consumed.
 *
 * Group header is three 32-bit masks; bit `sb` of each selects the quantiser for
 * subband `sb`. The three masks encode six states — the decision tree at
 * 0x00403b6f..0x00403bc1 in source order:
 *
 *   A & B  -> 4 bits, shift 4      A only -> 2 bits, shift 2
 *   A & C  -> 4 bits, shift 3      B only -> 2 bits, shift 1
 *   B & C  -> 4 bits, shift 2      C only -> 2 bits, shift 0
 *   none   -> the subband is zero in every block of the group (no bits read)
 *
 * Samples are packed MSB-first, and the bit accumulator is reset to empty at the
 * start of every subband (`and dword [ebp+0x8],0` @0x00403bc5), so each subband's
 * data starts on a fresh byte.
 *
 * Dequantisation, verbatim from 0x00403be6..0x00403c0c:
 *   movsx ebx, byte      ; the whole byte, SIGNED
 *   shl   ebx, bits      ; push the field up
 *   and   ebx, ~0x7f     ; keep the sign-extended field
 *   or    bl, 0x80       ; midpoint: +0.5 LSB
 *   shl   ebx, shift     ; scale exponent
 *   fild / fmul 1/256
 * which is  coefficient = ((q << 8) | 0x80) << shift  / 256  =  (q + 0.5) * 2^shift
 * with q the sign-extended `bits`-wide field.
 */
export function readCoefficients(C, buf, at, count, dequantScale) {
  const maskA = buf.readUInt32LE(at);
  const maskB = buf.readUInt32LE(at + 4);
  const maskC = buf.readUInt32LE(at + 8);
  let p = at + 12;
  for (let sb = 0; sb < 32; sb++) {
    const bit = (1 << sb) >>> 0;
    const a = (maskA & bit) !== 0, b = (maskB & bit) !== 0, c = (maskC & bit) !== 0;
    let bits, shift;
    if (a && b) { bits = 4; shift = 4; }
    else if (a && c) { bits = 4; shift = 3; }
    else if (b && c) { bits = 4; shift = 2; }
    else if (a) { bits = 2; shift = 2; }
    else if (b) { bits = 2; shift = 1; }
    else if (c) { bits = 2; shift = 0; }
    else {
      for (let k = 0; k < count; k++) C[k * 32 + sb] = 0;
      continue;
    }
    let bitsLeft = 0, byte = 0;
    for (let k = 0; k < count; k++) {
      if (bitsLeft === 0) { byte = buf[p++]; bitsLeft = 8; }
      const s = (byte << 24) >> 24; // movsx
      const v = ((((s << bits) & ~0x7f) | 0x80) << shift);
      C[k * 32 + sb] = fr(v * dequantScale);
      byte = (byte << bits) & 0xff;
      bitsLeft -= bits;
    }
  }
  return p - at;
}

/**
 * FUN_00403c50 — matrixing plus windowed overlap-add of one block.
 *
 * for m = 0..63:
 *   s = sum(i=0..31) C[i] * B[i*64 + m]        (accumulated in x87, no rounding)
 *   for t = 0..7: V[m + 64t] = float32(s * A[m + 64t] + V[m + 64t])
 *
 * Strides matter and Ghidra renders them as float* arithmetic: `add eax,0x100`
 * is +64 floats, `fmul [eax-0x2800]` reaches from V back to A.
 */
export function synthesizeBlock(V, A, B, C, base) {
  for (let m = 0; m < 64; m++) {
    let s = 0;
    for (let i = 0; i < 32; i++) s += C[base + i] * B[i * 64 + m];
    for (let t = 0; t < 8; t++) {
      const idx = m + t * 64;
      V[idx] = fr(s * A[idx] + V[idx]);
    }
  }
}

/** Number of blocks of priming the driver throws away: 0x1e0 bytes / 32. */
export const PRIME_BLOCKS = 15;

/**
 * FUN_00403ca6 — decode a mode-0 payload to signed 8-bit PCM.
 *
 * payload[0]      u32   block count, minus the 15 priming blocks
 * payload[4..]          groups of <=16 blocks: 3 mask words then packed samples
 *
 * @param {Buffer} payload   the record payload (after mode/argLength)
 * @param {number} outBytes  the sample's `length` field; the driver decodes
 *                           whole blocks and the caller copies only this many
 * @param {Buffer} img       unpacked/sonnet_img.bin, for the constants
 * @returns {Int8Array}
 */
export function decodeMode0(payload, outBytes, img) {
  const { A, B, dequantScale } = buildTables(img);
  const numBlocks = payload.readUInt32LE(0) + PRIME_BLOCKS;
  const out = new Int8Array(numBlocks * 32);
  const V = new Float32Array(512);
  const C = new Float32Array(16 * 32);
  let cursor = 4, w = 0, blockInGroup = 16;

  for (let remaining = numBlocks; remaining > 0; remaining--) {
    if (blockInGroup === 16) {
      cursor += readCoefficients(C, payload, cursor, Math.min(16, remaining), dequantScale);
      blockInGroup = 0;
    }
    synthesizeBlock(V, A, B, C, blockInGroup * 32);
    // Output is read from the TOP of the ring downwards (edi starts at 0x004780bc
    // and decrements) but written forwards, so the block is time-reversed here.
    for (let t = 0; t < 32; t++) {
      let v = Math.trunc(V[511 - t]);
      if (v > 127) v = 127;
      if (v < -128) v = -128;
      out[w++] = v;
    }
    for (let i = 511; i >= 32; i--) V[i] = V[i - 32];
    V.fill(0, 0, 32);
    blockInGroup++;
  }
  const start = PRIME_BLOCKS * 32;
  return out.subarray(start, start + outBytes);
}
