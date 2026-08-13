/*
 * dr.mjs — port of the "DR design generator" from "Lost Vegas" (threestate,
 * Ambience 2000).  Original credit: stevie [design], code by sagacity/sarix.
 *
 * WHAT IT ACTUALLY IS
 * -------------------
 * Not an opcode interpreter: the DR generator is a *hand-rolled MPEG-1 video
 * I-frame decoder*.  stevie's designs (the yellow angular overlay sheets and
 * the scene surface textures) were authored as images, encoded as single-frame
 * MPEG-1 elementary streams by a standard encoder, and embedded verbatim in
 * `.data`.  The "big-endian MSB bitstream reader" the earlier pass found is the
 * MPEG start-code / VLC reader.
 *
 * Binary correspondence (image base 0x400000):
 *   FUN_004053f1  peekBits(n)          FUN_00405434  readBits(n)
 *   FUN_00405474  readBit()            FUN_00405429  skipBits(n)
 *   FUN_0040549d  seekStartCode()      -- align to byte, scan for 00 00 01
 *   FUN_004054cb  idctColumn()         -- 1-D column IDCT, in place
 *   FUN_0040563b  idctRow()            -- 1-D row IDCT, src -> dst
 *   FUN_004057bc  decodeIntraBlock()   -- DC VLC + AC VLC + dequant + zigzag
 *   FUN_004059cf  packClampRGB()
 *   FUN_00405a17  parseHeaders()       -- sequence / GOP / picture headers
 *   FUN_00405bee  decodePicture()      -- slice+macroblock loop, YCbCr->RGB,
 *                                         then the 8x8 deblock filter
 *   FUN_00405fe6  decodeAndUpload()    -- decodePicture + FUN_00403bd6 upload
 *   FUN_0040604d  decodeToBuffer()     -- decodePicture, returns raw buffer
 *
 * See re/engine/DR_FORMAT.md for the full spec.
 *
 * Everything here is a literal transcription of the decompiled integer maths
 * (statement order preserved) so the output is bit-identical to the 2000 exe.
 */

/* ------------------------------------------------------------------ *
 * Tables, lifted verbatim from .data of 3s-vegas-u.exe
 * ------------------------------------------------------------------ */

/* MPEG-1 default intra quantiser matrix, in ZIGZAG order (@0x0041b744) */
export const DEFAULT_INTRA_QUANT = Int32Array.from([
  8, 16, 16, 19, 16, 19, 22, 22, 22, 22, 22, 22, 26, 24, 26, 27,
  27, 27, 26, 26, 26, 26, 27, 27, 27, 29, 29, 29, 34, 34, 34, 29,
  29, 29, 27, 27, 29, 29, 32, 32, 34, 34, 37, 38, 37, 35, 35, 34,
  35, 38, 38, 40, 40, 40, 48, 48, 46, 46, 56, 56, 58, 69, 69, 83,
]);

/* zigzag scan -> raster index (@0x0041b784) */
export const ZIGZAG = Uint8Array.from([
   0,  1,  8, 16,  9,  2,  3, 10, 17, 24, 32, 25, 18, 11,  4,  5,
  12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13,  6,  7, 14, 21, 28,
  35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51,
  58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63,
]);

/* dct_dc_size VLC.  Each entry is [size, bits].  Selection is by a 10-bit
 * peek `u`; see decodeIntraBlock().                                        */
/* luma, u < 0x3e0, index u>>5           (@0x0041b7c4, 31 entries)          */
const DC_LUM_LO = [
  [1,2],[1,2],[1,2],[1,2],[1,2],[1,2],[1,2],[1,2],
  [2,2],[2,2],[2,2],[2,2],[2,2],[2,2],[2,2],[2,2],
  [0,3],[0,3],[0,3],[0,3],[3,3],[3,3],[3,3],[3,3],
  [4,3],[4,3],[4,3],[4,3],[5,4],[5,4],[6,5],
];
/* luma, u >= 0x3e0, index (u>>1)-0x1f0  (@0x0041b804, 16 entries)          */
const DC_LUM_HI = [
  [7,6],[7,6],[7,6],[7,6],[7,6],[7,6],[7,6],[7,6],
  [8,7],[8,7],[8,7],[8,7],[9,8],[9,8],[10,9],[11,9],
];
/* chroma, u < 0x3e0, index u>>5         (@0x0041b824, 31 entries)          */
const DC_CHR_LO = [
  [0,2],[0,2],[0,2],[0,2],[0,2],[0,2],[0,2],[0,2],
  [1,2],[1,2],[1,2],[1,2],[1,2],[1,2],[1,2],[1,2],
  [2,2],[2,2],[2,2],[2,2],[2,2],[2,2],[2,2],[2,2],
  [3,3],[3,3],[3,3],[3,3],[4,4],[4,4],[5,5],
];
/* chroma, u >= 0x3e0, index u-0x3e0     (@0x0041b864, 32 entries)          */
const DC_CHR_HI = [
  [6,6],[6,6],[6,6],[6,6],[6,6],[6,6],[6,6],[6,6],
  [6,6],[6,6],[6,6],[6,6],[6,6],[6,6],[6,6],[6,6],
  [7,7],[7,7],[7,7],[7,7],[7,7],[7,7],[7,7],[7,7],
  [8,8],[8,8],[8,8],[8,8],[9,9],[9,9],[10,10],[11,10],
];

/* DCT coefficient VLC (MPEG-1 table B.14, intra).  Entries are
 * [run, level, bits]; run 0x40 = EOB, 0x41 = ESCAPE.  Eight sub-tables,
 * selected by a 16-bit peek. Addresses noted per table.                    */
const AC_T0 = [ /* @0x0041b8a4, u>=0x4000, idx (u>>12)-4 */
  [0,2,4],[2,1,4],[1,1,3],[1,1,3],[0x40,0,2],[0x40,0,2],[0x40,0,2],[0x40,0,2],
  [0,1,2],[0,1,2],[0,1,2],[0,1,2],
];
const AC_T1 = [ /* @0x0041b8c8, 0x400<=u<0x4000, idx (u>>8)-4 */
  [0x41,0,6],[0x41,0,6],[0x41,0,6],[0x41,0,6],[2,2,7],[2,2,7],[9,1,7],[9,1,7],
  [0,4,7],[0,4,7],[8,1,7],[8,1,7],[7,1,6],[7,1,6],[7,1,6],[7,1,6],
  [6,1,6],[6,1,6],[6,1,6],[6,1,6],[1,2,6],[1,2,6],[1,2,6],[1,2,6],
  [5,1,6],[5,1,6],[5,1,6],[5,1,6],[13,1,8],[0,6,8],[12,1,8],[11,1,8],
  [3,2,8],[1,3,8],[0,5,8],[10,1,8],[0,3,5],[0,3,5],[0,3,5],[0,3,5],
  [0,3,5],[0,3,5],[0,3,5],[0,3,5],[4,1,5],[4,1,5],[4,1,5],[4,1,5],
  [4,1,5],[4,1,5],[4,1,5],[4,1,5],[3,1,5],[3,1,5],[3,1,5],[3,1,5],
  [3,1,5],[3,1,5],[3,1,5],[3,1,5],
];
const AC_T2 = [ /* @0x0041b97c, 0x200<=u<0x400, idx (u>>6)-8 */
  [16,1,10],[5,2,10],[0,7,10],[2,3,10],[1,4,10],[15,1,10],[14,1,10],[4,2,10],
];
const AC_T3 = [ /* @0x0041b994, 0x100<=u<0x200, idx (u>>4)-0x10 */
  [0,11,12],[8,2,12],[4,3,12],[0,10,12],[2,4,12],[7,2,12],[21,1,12],[20,1,12],
  [0,9,12],[19,1,12],[18,1,12],[1,5,12],[3,3,12],[0,8,12],[6,2,12],[17,1,12],
];
const AC_T4 = [ /* @0x0041b9c4, 0x80<=u<0x100, idx (u>>3)-0x10 */
  [10,2,13],[9,2,13],[5,3,13],[3,4,13],[2,5,13],[1,7,13],[1,6,13],[0,15,13],
  [0,14,13],[0,13,13],[0,12,13],[26,1,13],[25,1,13],[24,1,13],[23,1,13],[22,1,13],
];
const AC_T5 = [ /* @0x0041b9f4, 0x40<=u<0x80, idx (u>>2)-0x10 */
  [0,31,14],[0,30,14],[0,29,14],[0,28,14],[0,27,14],[0,26,14],[0,25,14],[0,24,14],
  [0,23,14],[0,22,14],[0,21,14],[0,20,14],[0,19,14],[0,18,14],[0,17,14],[0,16,14],
];
const AC_T6 = [ /* @0x0041ba24, 0x20<=u<0x40, idx (u>>1)-0x10 */
  [0,40,15],[0,39,15],[0,38,15],[0,37,15],[0,36,15],[0,35,15],[0,34,15],[0,33,15],
  [0,32,15],[1,14,15],[1,13,15],[1,12,15],[1,11,15],[1,10,15],[1,9,15],[1,8,15],
];
const AC_T7 = [ /* @0x0041ba54, 0x10<=u<0x20, idx u-0x10 */
  [1,18,16],[1,17,16],[1,16,16],[1,15,16],[6,3,16],[16,2,16],[15,2,16],[14,2,16],
  [13,2,16],[12,2,16],[11,2,16],[31,1,16],[30,1,16],[29,1,16],[28,1,16],[27,1,16],
];

/* ------------------------------------------------------------------ *
 * The decoder
 * ------------------------------------------------------------------ */

class DR {
  constructor(bytes) {
    /* pad by 8: peekBits() always fetches a whole dword */
    const buf = new Uint8Array(bytes.length + 8);
    buf.set(bytes);
    this.d = buf;
    this.bit = 0;                       // DAT_0050ffdc
    this.quant = Int32Array.from(DEFAULT_INTRA_QUANT);   // PTR_DAT_0041ba98
    /* chroma -> RGB LUTs (PTR_DAT_0041ba84..90), index -512..511 */
    this.lutCbB = new Int32Array(1024);   // *0xe2d  >> 11   (~1.7715)
    this.lutCbG = new Int32Array(1024);   // *-0xb   >>  5   (~-0.34375)
    this.lutCrR = new Int32Array(1024);   // *0x2cdd >> 13   (~1.40197)
    this.lutCrG = new Int32Array(1024);   // *-0xb6d >> 12   (~-0.71411)
    for (let i = -512; i < 512; i++) {
      const k = i + 512;
      this.lutCbB[k] = (i * 0x0e2d) >> 11;
      this.lutCbG[k] = (i * -0x0b) >> 5;
      this.lutCrR[k] = (i * 0x2cdd) >> 13;
      this.lutCrG[k] = (i * -0xb6d) >> 12;
    }
    /* macroblock scratch (PTR_DAT_0041ba94), int[0x180]:
     *   [0x000..0x0ff]  luma 16x16
     *   [0x100..0x13f]  Cb 8x8
     *   [0x140..0x17f]  Cr 8x8  — ALSO the coefficient block (aliased) */
    this.mb = new Int32Array(0x180);
    this.seqWidth = 0; this.seqHeight = 0;
    this.mbW = 0; this.mbH = 0; this.totalMb = 0;
  }

  /* --- FUN_004053f1 ------------------------------------------------ */
  peek(n) {
    const o = this.bit >> 3, d = this.d;
    const w = ((d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]);
    return ((w << (this.bit & 7)) >>> ((32 - n) & 31)) >>> 0;
  }
  /* --- FUN_00405434 ------------------------------------------------ */
  read(n) { const v = this.peek(n); this.bit += n; return v; }
  /* --- FUN_00405429 ------------------------------------------------ */
  skip(n) { this.bit += n; }
  /* --- FUN_00405474 ------------------------------------------------ */
  read1() {
    const s = this.bit & 7, o = this.bit >> 3;
    this.bit++;
    return (this.d[o] >> (7 - s)) & 1;
  }
  /* --- FUN_0040549d: byte-align, then scan to the next 00 00 01 ---- */
  seekStartCode() {
    this.bit = (this.bit + 7) & ~7;
    while (this.peek(24) !== 1) this.skip(8);
  }

  /* --- FUN_004057bc: decode one intra block ------------------------- *
   * cc 0..3 = luma quadrant, 4 = Cb, 5 = Cr.  dcPred is Int32Array(3).
   * Returns true on EOB, false on a malformed stream (= abort picture). */
  decodeIntraBlock(block, cc, dcPred, quantScale) {
    const pred = cc < 4 ? 0 : cc - 3;
    block.fill(0);

    /* --- DC --- */
    let u = this.peek(10), e;
    if (pred === 0) e = u < 0x3e0 ? DC_LUM_LO[u >> 5] : DC_LUM_HI[(u >> 1) - 0x1f0];
    else            e = u < 0x3e0 ? DC_CHR_LO[u >> 5] : DC_CHR_HI[u - 0x3e0];
    this.skip(e[1]);
    const size = e[0];
    let diff = 0;
    if (size !== 0) {
      diff = this.read(size);
      if ((diff & (1 << (size - 1))) === 0) diff = diff + (1 - (1 << size));
      diff |= 0;
    }
    dcPred[pred] = (dcPred[pred] + diff) | 0;
    block[0] = dcPred[pred] << 3;

    /* --- AC --- */
    let i = 1;
    for (;;) {
      u = this.peek(16);
      let t;
      if (u >= 0x4000)      t = AC_T0[(u >> 12) - 4];
      else if (u >= 0x400)  t = AC_T1[(u >> 8) - 4];
      else if (u >= 0x200)  t = AC_T2[(u >> 6) - 8];
      else if (u >= 0x100)  t = AC_T3[(u >> 4) - 0x10];
      else if (u >= 0x80)   t = AC_T4[(u >> 3) - 0x10];
      else if (u >= 0x40)   t = AC_T5[(u >> 2) - 0x10];
      else if (u >= 0x20)   t = AC_T6[(u >> 1) - 0x10];
      else if (u >= 0x10)   t = AC_T7[u - 0x10];
      else return false;                        // 15+ leading zeros: bail
      this.skip(t[2]);

      const run = t[0];
      if (run === 0x40) return true;            // end of block
      let pos, level;
      if (run === 0x41) {                       // escape
        pos = i + this.read(6);
        const b = this.read(8);
        const sb = (b << 24) >> 24;             // as signed char
        if (sb === 0)          level = this.read(8);
        else if (sb === -128)  level = this.read(8) - 0x100;
        else                   level = sb;
      } else {
        level = t[1];
        pos = i + run;
        if (this.read1()) level = -level;
      }
      if (pos > 0x3f) return false;

      const neg = level < 0;
      let a = neg ? -level : level;
      a = ((Math.imul(Math.imul(this.quant[pos], a), quantScale) >> 3) - 1) | 1;
      if (neg) a = -a;
      i = pos + 1;
      block[ZIGZAG[pos]] = a;
    }
  }

  /* --- FUN_004054cb: 1-D column IDCT, in place (stride 8) ----------- */
  idctColumn(b, c) {
    const x0 = b[c], x1 = b[c + 8], x2 = b[c + 16], x3 = b[c + 24];
    const x4 = b[c + 32], x5 = b[c + 40], x6 = b[c + 48], x7 = b[c + 56];
    let v2 = Math.imul(x7 + x1, 0x46a);
    let v5 = (Math.imul(x1, 0x11c7) + v2) | 0;
    v2 = (v2 + Math.imul(x7, -0x1a9b)) | 0;
    let v3 = Math.imul(x3 + x5, 0x12d0);
    let v6 = (v3 + Math.imul(x5, -0x63e)) | 0;
    v3 = (v3 + Math.imul(x3, -0x1f62)) | 0;
    let v7 = Math.imul(x2 + x6, 0x8a9);
    const v8 = (v7 + Math.imul(x6, -0x1d91)) | 0;
    v7 = (Math.imul(x2, 0xc3f) + v7) | 0;
    let v4 = (Math.imul(x4 + x0, 0x1000) + 0x10) | 0;
    const v1 = (v6 + v5) | 0;
    v5 = (v5 - v6) | 0;
    v6 = (v3 + v2) | 0;
    v2 = (v2 - v3) | 0;
    const v9 = (v7 + v4) | 0;
    v4 = (v4 - v7) | 0;
    let v10 = (Math.imul(x0 - x4, 0x1000) + 0x10) | 0;
    v7 = (v8 + v10) | 0;
    v10 = (v10 - v8) | 0;
    v3 = ((Math.imul(v5 - v2, 0xb5) + 0x80) | 0) >> 8;
    v2 = ((Math.imul(v2 + v5, 0xb5) + 0x80) | 0) >> 8;
    b[c     ] = ((v1 + v9) | 0) >> 5;
    b[c +  8] = ((v7 + v2) | 0) >> 5;
    b[c + 16] = ((v3 + v10) | 0) >> 5;
    b[c + 32] = ((v4 - v6) | 0) >> 5;
    b[c + 40] = ((v10 - v3) | 0) >> 5;
    b[c + 24] = ((v6 + v4) | 0) >> 5;
    b[c + 48] = ((v7 - v2) | 0) >> 5;
    b[c + 56] = ((v9 - v1) | 0) >> 5;
  }

  /* --- FUN_0040563b: 1-D row IDCT, src[so..so+7] -> dst[do..do+7] --- */
  idctRow(src, so, dst, dof) {
    const s0 = src[so], s1 = src[so+1], s2 = src[so+2], s3 = src[so+3];
    const s4 = src[so+4], s5 = src[so+5], s6 = src[so+6], s7 = src[so+7];
    let v4 = (Math.imul(s7 + s1, 0x46a) + 0x800) | 0;
    let v5 = ((v4 + Math.imul(s7, -0x1a9b)) | 0) >> 12;
    let v6 = (Math.imul(s3 + s5, 0x12d0) + 0x800) | 0;
    let v1 = ((v6 + Math.imul(s5, -0x63e)) | 0) >> 12;
    let v7 = ((v6 + Math.imul(s3, -0x1f62)) | 0) >> 12;
    v6 = (s4 + s0) | 0;
    let v3 = (s0 - s4) | 0;
    let v2 = (Math.imul(s2 + s6, 0x8a9) + 0x800) | 0;
    let v8 = ((v2 + Math.imul(s6, -0x1d91)) | 0) >> 12;
    let v10 = ((Math.imul(s1, 0x11c7) + v4) | 0) >> 12;
    v4 = ((Math.imul(s2, 0xc3f) + v2) | 0) >> 12;
    v2 = (v1 + v10) | 0;
    v10 = (v10 - v1) | 0;
    let v9 = (v5 - v7) | 0;
    v5 = (v5 + v7) | 0;
    v1 = (v6 + 0x200 + v4) | 0;
    v6 = (v6 + (0x200 - v4)) | 0;
    v4 = (v8 + 0x200 + v3) | 0;
    v3 = (v3 + (0x200 - v8)) | 0;
    v7 = ((Math.imul(v10 - v9, 0xb5) + 0x80) | 0) >> 8;
    dst[dof    ] = ((v1 + v2) | 0) >> 10;
    v9 = ((Math.imul(v9 + v10, 0xb5) + 0x80) | 0) >> 8;
    dst[dof + 1] = ((v4 + v9) | 0) >> 10;
    dst[dof + 2] = ((v7 + v3) | 0) >> 10;
    dst[dof + 5] = ((v3 - v7) | 0) >> 10;
    dst[dof + 3] = ((v5 + v6) | 0) >> 10;
    dst[dof + 7] = ((v1 - v2) | 0) >> 10;
    dst[dof + 4] = ((v6 - v5) | 0) >> 10;
    dst[dof + 6] = ((v4 - v9) | 0) >> 10;
  }

  /* --- scaled IDCT (REMASTER, not in the original) ------------------ *
   *
   * The 2-D transform the pair above computes is, exactly, the unit-normalised
   * 8-point IDCT
   *
   *   f(x,y) = 1/4 * SUM_u SUM_v C(u) C(v) F(u,v)
   *                  cos((2x+1) u pi/16) cos((2y+1) v pi/16)
   *
   * (checked against the fixed-point code: a lone DC term D yields D/8 in every
   * output sample, and block[0] = dcPred << 3, so the sample value is dcPred —
   * which is what MPEG-1's <<3 / >>3 convention is for).
   *
   * That formula is a *continuous* band-limited surface sampled at the 64 cell
   * centres (x+0.5)/8.  To reconstruct the same surface on an S-times finer
   * grid, evaluate it at the finer cell centres — which is what zero-padding
   * the 8x8 coefficient block to N x N (N = 8S) and running an N-point IDCT
   * does.  With the N-point normalisation 2/N and the coefficients scaled by
   * N/8 to preserve amplitude the two prefactors cancel and the expression is
   * literally the one above with 16 -> 2N:
   *
   *   f(x,y) = 1/4 * SUM_{u,v<8} C(u) C(v) F(u,v)
   *                  cos((2x+1) u pi/(2N)) cos((2y+1) v pi/(2N))
   *
   * This is the exact dual of libjpeg's scaled (jpeg_idct_NxN) decoding: no
   * detail is invented, nothing is extrapolated beyond the 8 basis functions
   * the encoder actually stored, and no ringing is introduced that the encoded
   * signal does not already contain.
   */
  _basis(S) {
    if (this._basisS === S) return this._basisM;
    const N = 8 * S;
    const M = new Float64Array(N * 8);          // M[x*8 + u]
    for (let x = 0; x < N; x++) {
      for (let u = 0; u < 8; u++) {
        const c = u === 0 ? Math.SQRT1_2 : 1;
        M[x * 8 + u] = c * Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N));
      }
    }
    this._basisS = S; this._basisM = M;
    return M;
  }

  /** Zero-padded N x N IDCT of one 8x8 coefficient block (N = 8*scale).
   *  `dst` is a Float32Array with the given row stride; the tile is written at
   *  `dof`.  Output units match the integer path (i.e. still needs +0x80). */
  idctScaled(block, dst, dof, stride, S) {
    const N = 8 * S;
    const M = this._basis(S);
    let tmp = this._idctTmp;
    if (!tmp || tmp.length < 8 * N) tmp = this._idctTmp = new Float64Array(8 * N);
    /* pass 1 — horizontal: tmp[v*N + x] = SUM_u M[x][u] * F[v][u] */
    for (let v = 0; v < 8; v++) {
      const b = v * 8;
      const f0 = block[b], f1 = block[b+1], f2 = block[b+2], f3 = block[b+3];
      const f4 = block[b+4], f5 = block[b+5], f6 = block[b+6], f7 = block[b+7];
      const to = v * N;
      if ((f1|f2|f3|f4|f5|f6|f7) === 0) {          // DC-only row: constant
        const c = f0 * Math.SQRT1_2;
        for (let x = 0; x < N; x++) tmp[to + x] = c;
        continue;
      }
      for (let x = 0; x < N; x++) {
        const m = x * 8;
        tmp[to + x] = M[m]*f0 + M[m+1]*f1 + M[m+2]*f2 + M[m+3]*f3
                    + M[m+4]*f4 + M[m+5]*f5 + M[m+6]*f6 + M[m+7]*f7;
      }
    }
    /* pass 2 — vertical, with the 1/4 prefactor */
    for (let y = 0; y < N; y++) {
      const m = y * 8;
      const m0 = M[m]*0.25, m1 = M[m+1]*0.25, m2 = M[m+2]*0.25, m3 = M[m+3]*0.25;
      const m4 = M[m+4]*0.25, m5 = M[m+5]*0.25, m6 = M[m+6]*0.25, m7 = M[m+7]*0.25;
      const o = dof + y * stride;
      for (let x = 0; x < N; x++) {
        dst[o + x] = m0*tmp[x] + m1*tmp[N+x] + m2*tmp[2*N+x] + m3*tmp[3*N+x]
                   + m4*tmp[4*N+x] + m5*tmp[5*N+x] + m6*tmp[6*N+x] + m7*tmp[7*N+x];
      }
    }
  }

  /* --- FUN_00405a17: sequence / GOP / picture headers --------------- *
   * Leaves the bit cursor sitting on the first slice start code.
   * Returns true if a decodable I-picture header was found.             */
  parseHeaders() {
    this.bit = 0;
    if (this.read(32) !== 0x1b3) return false;          // sequence_header_code
    this.seqWidth  = this.read(12);
    this.seqHeight = this.read(12);
    /* aspect(4) frame_rate(4) bit_rate(18) marker(1) vbv(10) constrained(1) */
    this.skip(0x26);
    if (this.read1()) {                                  // load_intra_quantiser
      for (let i = 0; i < 64; i++) this.quant[i] = this.read(8);
    }
    if (this.read1()) this.skip(0x200);                  // load_non_intra (unused)
    this.mbW = (this.seqWidth  + 15) >> 4;
    this.mbH = (this.seqHeight + 15) >> 4;

    for (;;) {
      let code;
      for (;;) {
        this.seekStartCode();
        code = this.read(32);
        if (code === 0x100) {                            // picture_start_code
          this.skip(10);                                 // temporal_reference
          if (this.read(3) !== 1) return false;          // must be an I-frame
          let n = 16;                                    // vbv_delay
          for (;;) { this.skip(n); if (!this.read1()) break; n = 8; }
          for (;;) {                                     // skip user data etc.
            this.seekStartCode();
            if (this.peek(32) !== 0x1b2) break;
            this.skip(32);
          }
          this.totalMb = this.mbH * this.mbW;
          return true;
        }
        if (code !== 0x1b8) break;                       // group_start_code
        this.skip(0x1b);
      }
      if (code !== 0x1b2) return false;                  // user_data_start_code
    }
  }

  /* --- FUN_00405bee: slices, macroblocks, colour, deblock ----------- */
  decodePicture(fb, width, height, deblock = true) {
    const mb = this.mb;
    const block = mb.subarray(0x140, 0x180);   // aliases the Cr plane
    const dcPred = new Int32Array(3);
    let quantScale = 0;
    let addr = 0;
    let complete = false;

    outer:
    for (;;) {
      let cur = addr;
      if (this.peek(23) === 0) {               // a start code is next
        if (addr >= this.totalMb) {            // picture complete
          complete = true;
          break outer;
        }
        this.seekStartCode();
        const code = this.read(32);
        if (code < 0x101 || code > 0x1af) return;   // not a slice
        quantScale = this.read(5);
        while (this.read1()) this.skip(8);          // extra_slice_information
        addr = (code - 0x101) * this.mbW;           // slice vertical position
        cur = addr;
        dcPred[0] = dcPred[1] = dcPred[2] = 0;
      }
      if (addr >= this.totalMb) return;

      /* macroblock_address_increment: only the single-bit "1" is supported */
      if (!this.read1()) break outer;
      /* macroblock_type, I-picture: "1"=Intra, "01"=Intra+Quant */
      if (!this.read1()) {
        if (!this.read1()) return;
        quantScale = this.read(5);
      }

      for (let cc = 0; cc < 6; cc++) {
        if (!this.decodeIntraBlock(block, cc, dcPred, quantScale)) return;
        for (let c = 0; c < 8; c++) this.idctColumn(block, c);
        let stride, base;
        if (cc < 4) { stride = 16; base = ((cc & 1) + (cc & 2) * 8) * 8; }
        else        { stride = 8;  base = cc * 64; }
        for (let r = 0; r < 8; r++)
          this.idctRow(block, r * 8, mb, base + r * stride);
      }

      /* YCbCr 4:2:0 -> packed 0x00RRGGBB, in place over the luma plane */
      const px = (cur % this.mbW) << 4, py = ((cur / this.mbW) | 0) << 4;
      for (let j = 0; j < 8; j++) {
        for (let i = 0; i < 8; i++) {
          const cb = mb[0x100 + j * 8 + i], cr = mb[0x140 + j * 8 + i];
          const cbi = (cb + 512) & 1023, cri = (cr + 512) & 1023;
          const addR = this.lutCrR[cri];
          const addG = (this.lutCbG[cbi] + this.lutCrG[cri]) | 0;
          const addB = this.lutCbB[cbi];
          const o = (j * 16 + i) * 2;
          for (const q of [o, o + 1, o + 16, o + 17]) {
            const y = mb[q] + 0x80;
            mb[q] = packClampRGB(y + addR, y + addG, y + addB);
          }
        }
      }
      for (let j = 0; j < 16; j++)
        for (let i = 0; i < 16; i++)
          fb[(py + j) * width + px + i] = mb[j * 16 + i];

      addr = cur + 1;
    }

    /* The original only reaches the deblock filter on the clean-completion
     * path; any malformed-stream exit returns without filtering. */
    if (!complete || !deblock) return;

    /* --- deblock across every 8x8 boundary (FUN_00405bee tail) ------ */
    /* vertical: rows 7/8, 15/16, ... both sides adjusted (0.75/0.25)   */
    if (height > 8) {
      let rowB = width * 7, rowA = 0;
      for (let n = (height - 1) >> 3; n > 0; n--) {
        rowA += width * 8;
        for (let x = 0; x < width; x++) {
          const a = (fb[rowA + x] >>> 1) & 0x7f7f7f;
          const b = (fb[rowB + x] >>> 1) & 0x7f7f7f;
          const m = ((b + a) >>> 1) & 0x7f7f7f;
          fb[rowB + x] = b + m;
          fb[rowA + x] = m + a;
        }
        rowB += width * 8;
      }
    }
    /* horizontal: columns 8, 16, ... only the RIGHT side is adjusted.
     * (asymmetric in the original — kept faithful)                     */
    if (height > 0 && width > 8) {
      let row = 8;
      for (let y = 0; y < height; y++) {
        let p = row;
        for (let n = (width - 1) >> 3; n > 0; n--) {
          const v = (fb[p] >>> 1) & 0x7f7f7f;
          fb[p] = ((((fb[p - 1] >>> 1) & 0x7f7f7f) + v) >>> 1 & 0x7f7f7f) + v;
          p += 8;
        }
        row += width;
      }
    }
  }

  /* --- REMASTER: the same picture decode at S times the resolution --- *
   * Structurally identical to decodePicture() above — same VLC parse, same
   * dequantiser, same slice/macroblock bookkeeping, same authentic full-range
   * JFIF colour LUTs, same nearest 2x2 chroma replication (so the 4:2:0
   * relationship between the planes is preserved exactly).  The ONLY change is
   * that every 8x8 block is reconstructed on an 8S x 8S grid via idctScaled().
   * `fb` is (width*S) x (height*S).                                       */
  decodePictureScaled(fb, width, height, S, deblock = true, chroma = 'fine') {
    const block = new Int32Array(64);
    const B = 8 * S;                      // block side
    const MB = 16 * S;                    // macroblock side (luma)
    const CS = chroma === 'coarse' ? 1 : S;   // chroma reconstruction scale
    const CB = 8 * CS;
    const luma = new Float32Array(MB * MB);
    const cb   = new Float32Array(CB * CB);
    const cr   = new Float32Array(CB * CB);
    const dcPred = new Int32Array(3);
    const W = width * S;
    let quantScale = 0, addr = 0, complete = false;

    outer:
    for (;;) {
      let cur = addr;
      if (this.peek(23) === 0) {
        if (addr >= this.totalMb) { complete = true; break outer; }
        this.seekStartCode();
        const code = this.read(32);
        if (code < 0x101 || code > 0x1af) return;
        quantScale = this.read(5);
        while (this.read1()) this.skip(8);
        addr = (code - 0x101) * this.mbW;
        cur = addr;
        dcPred[0] = dcPred[1] = dcPred[2] = 0;
      }
      if (addr >= this.totalMb) return;
      if (!this.read1()) break outer;
      if (!this.read1()) {
        if (!this.read1()) return;
        quantScale = this.read(5);
      }

      for (let cc = 0; cc < 6; cc++) {
        if (!this.decodeIntraBlock(block, cc, dcPred, quantScale)) return;
        if (cc < 4) {
          const ox = (cc & 1) * B, oy = (cc >> 1) * B;
          this.idctScaled(block, luma, oy * MB + ox, MB, S);
        } else {
          this.idctScaled(block, cc === 4 ? cb : cr, 0, CB, CS);
        }
      }

      /* YCbCr 4:2:0 -> 0x00RRGGBB.  Chroma is replicated 2x2 over the luma
       * grid, exactly as the original does (nearest, not interpolated) — both
       * planes simply live on an S-times finer lattice now.                */
      const px = (cur % this.mbW) * MB, py = ((cur / this.mbW) | 0) * MB;
      for (let j = 0; j < MB; j++) {
        const crow = (CS === 1 ? (((j / S) | 0) >> 1) : (j >> 1)) * CB;
        const orow = (py + j) * W + px;
        for (let i = 0; i < MB; i++) {
          const ci = crow + (CS === 1 ? (((i / S) | 0) >> 1) : (i >> 1));
          let cbv = Math.round(cb[ci]), crv = Math.round(cr[ci]);
          if (cbv < -512) cbv = -512; else if (cbv > 511) cbv = 511;
          if (crv < -512) crv = -512; else if (crv > 511) crv = 511;
          const cbi = cbv + 512, cri = crv + 512;
          const y = Math.round(luma[j * MB + i]) + 0x80;
          fb[orow + i] = packClampRGB(
            y + this.lutCrR[cri],
            y + this.lutCbG[cbi] + this.lutCrG[cri],
            y + this.lutCbB[cbi]);
        }
      }
      addr = cur + 1;
    }

    if (!complete || !deblock) return;
    deblockScaled(fb, W, height * S, S);
  }
}

/* --- REMASTER: the deblock filter, generalised to an S-times finer grid ---
 *
 * The original's vertical filter is a 2-tap cross-fade across the 8x8 block
 * boundary: the pixel just below becomes 0.75*below + 0.25*above and vice
 * versa.  Read as a continuous blend weight t(d) against the mirror sample at
 * -d (d = signed distance from the boundary in ORIGINAL pixels), the unique
 * linear profile whose average over the first original pixel is 0.25 is
 *
 *     t(d) = 0.5 * (1 - |d|),   |d| < 1
 *
 * (t -> 0.5 at the seam itself, 0 one original pixel away).  Sampling it at
 * the S fine cell centres d = (k+0.5)/S therefore box-averages back to exactly
 * the original 0.75/0.25 pair, so the filter has the same strength and the
 * same visual footprint at every scale.  At S = 1 it degenerates to the
 * original weights.
 *
 * The horizontal filter is left ASYMMETRIC — only the right-hand side of each
 * boundary is touched — because that is what the 2000 binary ships (see
 * DR_FORMAT.md 5.4).  Vertical runs first, as in the original.
 */
export function deblockScaled(fb, W, H, S) {
  const B = 8 * S;
  const t = new Float64Array(S);
  for (let k = 0; k < S; k++) t[k] = 0.5 * (1 - (k + 0.5) / S);

  if (H > B) {
    for (let b = B; b < H; b += B) {
      for (let k = 0; k < S; k++) {
        const w = t[k];
        const ya = b + k, yb = b - 1 - k;
        if (ya >= H) break;
        const ra = ya * W, rb = yb * W;
        for (let x = 0; x < W; x++) {
          const A = fb[ra + x], Bv = fb[rb + x];
          fb[ra + x] = mix2(A, Bv, w);
          fb[rb + x] = mix2(Bv, A, w);
        }
      }
    }
  }
  if (H > 0 && W > B) {
    for (let y = 0; y < H; y++) {
      const row = y * W;
      for (let b = B; b < W; b += B) {
        for (let k = 0; k < S; k++) {
          const xr = b + k, xl = b - 1 - k;
          if (xr >= W) break;
          fb[row + xr] = mix2(fb[row + xr], fb[row + xl], t[k]);
        }
      }
    }
  }
}

/** per-channel a + w*(b - a) on two packed 0x00RRGGBB words. */
function mix2(a, b, w) {
  const r = ((a >>> 16) & 0xff) + w * (((b >>> 16) & 0xff) - ((a >>> 16) & 0xff));
  const g = ((a >>> 8) & 0xff) + w * (((b >>> 8) & 0xff) - ((a >>> 8) & 0xff));
  const bl = (a & 0xff) + w * ((b & 0xff) - (a & 0xff));
  return (((Math.round(r) << 8 | Math.round(g)) << 8) | Math.round(bl)) >>> 0;
}

/* --- FUN_004059cf ------------------------------------------------- */
function packClampRGB(r, g, b) {
  r = r < 0 ? 0 : r > 255 ? 255 : r;
  g = g < 0 ? 0 : g > 255 ? 255 : g;
  b = b < 0 ? 0 : b > 255 ? 255 : b;
  return ((r << 8 | g) << 8 | b) >>> 0;
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/**
 * Run the DR design generator over one embedded bitstream.
 *
 * @param {Uint8Array} bitstreamBytes  MPEG-1 elementary stream, starting at
 *        the 00 00 01 B3 sequence header.  Trailing garbage is fine — the
 *        decoder stops once every macroblock has been written.
 * @param {object} [opts]
 * @param {number} [opts.width]   framebuffer width  (the exe always passes the
 *                                same value as the sequence header)
 * @param {number} [opts.height]  framebuffer height
 * @param {boolean} [opts.deblock=true] run the 8x8 deblock filter (the exe
 *        always does; set false only to compare against a stock MPEG decoder)
 * @param {number} [opts.alpha=255] alpha byte written into `rgba`.  The exe
 *        leaves A = 0 in its ARGB buffer; the D3D upload path ignores it for
 *        the opaque formats these textures use.
 * @param {number} [opts.scale=1] REMASTER: reconstruct at S times the
 *        resolution by zero-padding each 8x8 coefficient block to 8S x 8S and
 *        running the matching IDCT (see idctScaled).  scale = 1 takes the
 *        bit-exact integer path and is unchanged.
 * @returns {{width:number, height:number, rgba:Uint8ClampedArray,
 *            xrgb:Uint32Array, seqWidth:number, seqHeight:number,
 *            mbW:number, mbH:number, ok:boolean, bytesConsumed:number,
 *            scale:number}}
 */
export function runDR(bitstreamBytes, opts = {}) {
  const dr = new DR(bitstreamBytes);
  const ok = dr.parseHeaders();
  const width  = opts.width  ?? dr.seqWidth;
  const height = opts.height ?? dr.seqHeight;
  const S = Math.max(1, opts.scale ?? 1) | 0;
  const fb = new Uint32Array(width * S * height * S);   // VirtualAlloc => zeroed
  if (ok) {
    /* `floatIdct` runs the remaster path at S = 1: same output grid as the
     * original, so the difference isolates the exe's fixed-point IDCT error
     * from the band-limited-resampling error.  Validation lever only. */
    if (S === 1 && !opts.floatIdct) dr.decodePicture(fb, width, height, opts.deblock ?? true);
    else dr.decodePictureScaled(fb, width, height, S, opts.deblock ?? true,
                                opts.chroma ?? 'fine');
  }
  const alpha = opts.alpha ?? 255;
  const rgba = new Uint8ClampedArray(fb.length * 4);
  for (let i = 0, o = 0; i < fb.length; i++) {
    const v = fb[i];
    rgba[o++] = (v >>> 16) & 0xff;
    rgba[o++] = (v >>> 8) & 0xff;
    rgba[o++] = v & 0xff;
    rgba[o++] = alpha;
  }
  return {
    width: width * S, height: height * S, rgba, xrgb: fb, ok, scale: S,
    bytesConsumed: (dr.bit + 7) >> 3,
    seqWidth: dr.seqWidth, seqHeight: dr.seqHeight, mbW: dr.mbW, mbH: dr.mbH,
  };
}

/**
 * Post-pass applied by FUN_00409bb0 to two of the four textures: black out a
 * 2-pixel grid every `step` pixels (columns 0,1 and rows 0,1 of each cell),
 * turning a plain surface into a tiled/panelled one.
 *   step 8  for the 256x256 sheet, step 4 for the 64x64 one.
 *
 * REMASTER: `scale` regenerates the SAME procedural grid on an S-times finer
 * lattice — pitch step*S, line width 2*S — so the panels keep their exact
 * geometric proportions (a line is always a quarter of a cell) but the edges
 * land on the finer grid instead of being an upscaled 2-texel stair.
 */
export function applyGridLines(img, step, scale = 1) {
  const { width, height, xrgb, rgba } = img;
  const pitch = step * scale, wide = 2 * scale;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((x % pitch) < wide || (y % pitch) < wide) {
        const i = y * width + x;
        xrgb[i] = 0;
        rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = 0;
      }
    }
  }
  return img;
}

/* ------------------------------------------------------------------ *
 * The bitmap font (FUN_00404b10 / FUN_00404c30) — see DR_FORMAT.md §7
 * ------------------------------------------------------------------ */

/**
 * Decode the 2-bit-per-pixel alpha font atlas (@0x0041a2b8, 0x1380 bytes)
 * into a 256x256 RGBA image: white texels, alpha in {0, 0x55, 0xaa, 0xff}.
 * Only the first 78 rows are written; the rest of the texture is left clear.
 */
export function decodeFontAtlas(atlasBytes, opts = {}) {
  const W = 256, H = 256;
  const rgba = new Uint8ClampedArray(W * H * 4);
  const [cr, cg, cb] = opts.colour ?? [255, 255, 255];
  const rows = Math.floor(atlasBytes.length / 64);
  for (let row = 0; row < rows; row++) {
    for (let i = 0; i < 64; i++) {
      const byte = atlasBytes[row * 64 + i];
      for (let k = 0; k < 4; k++) {
        const a = (byte >> (6 - 2 * k)) & 3;
        const o = ((row * W) + i * 4 + k) * 4;
        rgba[o] = cr; rgba[o + 1] = cg; rgba[o + 2] = cb;
        rgba[o + 3] = a * 0x55;
      }
    }
  }
  return { width: W, height: H, rgba, rows };
}

/** Character -> glyph index, exactly as FUN_00404c30 computes it.
 *  38 real glyphs; ' ' is handled separately by the layout code; any other
 *  character indexes past the end of the table (the exe does this too — see
 *  DR_FORMAT.md §7.3; '*' lands on a run of zero bytes and renders as a
 *  zero-size quad, i.e. a thin gap, which is how "threestate**in***lost..."
 *  is spaced). */
export function glyphIndex(ch) {
  const c = ch.charCodeAt(0);
  if (c >= 0x61 && c <= 0x7a) return c - 0x61;   // a..z  ->  0..25
  if (c >= 0x30 && c <= 0x39) return c - 0x16;   // 0..9  -> 26..35
  if (ch === '#') return 36;
  if (ch === '+') return 37;
  return c;                                      // out of range, as in the exe
}

/** Parse the glyph rectangle table (@0x0041b638, 4 bytes each: x0 y0 x1 y1). */
export function parseGlyphRects(bytes, count = 38) {
  const out = [];
  for (let i = 0; i < count; i++)
    out.push({ x0: bytes[i*4], y0: bytes[i*4+1], x1: bytes[i*4+2], y1: bytes[i*4+3] });
  return out;
}

/* Vertical kern per character, in atlas pixels (FUN_00404c30). Scaled by
 * s/256 before use, so it is a *baseline offset*, not a horizontal one. */
const KERN = { a: -4, g: -4, e: -1, h: -2, c: -2, i: -2, k: 2, p: 2, x: 2, z: 2 };
const UV_SCALE   = 1 / 255;      // dword @0x004123b8
const UNIT_SCALE = 1 / 256;      // qword @0x00412088
const SPACE_W    = 16;           // qword @0x004123c0  (space width, units)
const CHAR_GAP   = 4;            // qword @0x004123c8  (inter-glyph gap, units)

/**
 * Lay out a string the way FUN_00404dd0 / FUN_00404f10 do.
 *
 * Geometry is expressed in the exe's own units: with `s` = the scale argument
 * the intro passes, a glyph quad is (x1-x0)*s/255 wide and (y1-y0)*s/255 tall,
 * the pen advances by width + s*4/256 per character, a space is s*16/256 wide
 * (+ the same gap), and the per-character kern shifts the quad by
 * kernPx*s/256.  FUN_00404dd0 then centres the run: penX starts at
 * x - totalWidth*0.5.
 *
 * @param {string} str
 * @param {object} opts
 * @param {Array}  opts.rects   glyph rect table (>= 128 entries recommended)
 * @param {number} [opts.scale=255]  the exe's scale argument; 255 makes one
 *        output unit == one atlas pixel.
 * @param {number} [opts.x=0] [opts.y=0]
 * @param {boolean} [opts.centre=false]  reproduce FUN_00404dd0's centring
 * @returns {{width:number, glyphs:Array}}
 */
export function layoutText(str, opts) {
  const rects = opts.rects;
  const s = opts.scale ?? 255;
  const gap = s * UNIT_SCALE * CHAR_GAP;
  const glyphs = [];
  let width = 0;
  for (const ch of str) {
    let w;
    if (ch === ' ') w = s * UNIT_SCALE * SPACE_W;
    else {
      const r = rects[glyphIndex(ch)] ?? { x0: 0, y0: 0, x1: 0, y1: 0 };
      w = (r.x1 - r.x0) * UV_SCALE * s;
    }
    width += w + gap;
  }
  let penX = (opts.x ?? 0) - (opts.centre ? width * 0.5 : 0);
  const y = opts.y ?? 0;
  for (const ch of str) {
    if (ch === ' ') { penX += s * UNIT_SCALE * SPACE_W + gap; continue; }
    const r = rects[glyphIndex(ch)] ?? { x0: 0, y0: 0, x1: 0, y1: 0 };
    const w = (r.x1 - r.x0) * UV_SCALE * s;
    const h = (r.y1 - r.y0) * UV_SCALE * s;
    const kern = (KERN[ch] ?? 0) * s * UNIT_SCALE;
    glyphs.push({
      ch, x: penX, y: y + kern, w, h,
      u0: r.x0 * UV_SCALE, v0: r.y0 * UV_SCALE,
      u1: r.x1 * UV_SCALE, v1: r.y1 * UV_SCALE,
    });
    penX += w + gap;
  }
  return { width, glyphs };
}

/**
 * Rasterise a string into an RGBA buffer using the decoded atlas — a CPU
 * stand-in for the textured-quad path (FUN_00404a3f, FVF 0x244), good enough
 * to eyeball the typography against reference/contact.png.
 *
 * @param {string} str
 * @param {object} opts  { rects, atlas (from decodeFontAtlas), scale=1,
 *                         colour=[255,214,0], pad=4 }
 */
export function renderText(str, opts) {
  const px = opts.scale ?? 1;
  const lay = layoutText(str, { rects: opts.rects, scale: 255 * px });
  const pad = opts.pad ?? 4;
  let top = Infinity, bot = -Infinity;
  for (const g of lay.glyphs) { top = Math.min(top, g.y); bot = Math.max(bot, g.y + g.h); }
  if (!lay.glyphs.length) { top = 0; bot = 0; }
  const W = Math.max(1, Math.ceil(lay.width) + pad * 2);
  const H = Math.max(1, Math.ceil(bot - top) + pad * 2);
  const rgba = new Uint8ClampedArray(W * H * 4);
  const [cr, cg, cb] = opts.colour ?? [255, 214, 0];
  const A = opts.atlas;
  for (const g of lay.glyphs) {
    const gx0 = Math.round(g.x) + pad, gy0 = Math.round(g.y - top) + pad;
    const gw = Math.max(1, Math.round(g.w)), gh = Math.max(1, Math.round(g.h));
    for (let j = 0; j < gh; j++) {
      for (let i = 0; i < gw; i++) {
        const sx = Math.min(255, Math.round(g.u0 * 255 + (i + 0.5) * (g.u1 - g.u0) * 255 / gw));
        const sy = Math.min(255, Math.round(g.v0 * 255 + (j + 0.5) * (g.v1 - g.v0) * 255 / gh));
        const a = A.rgba[(sy * 256 + sx) * 4 + 3];
        if (!a) continue;
        const dx = gx0 + i, dy = gy0 + j;
        if (dx < 0 || dy < 0 || dx >= W || dy >= H) continue;
        const o = (dy * W + dx) * 4;
        rgba[o] = cr; rgba[o + 1] = cg; rgba[o + 2] = cb;
        rgba[o + 3] = Math.max(rgba[o + 3], a);
      }
    }
  }
  return { width: W, height: H, rgba, layout: lay };
}
