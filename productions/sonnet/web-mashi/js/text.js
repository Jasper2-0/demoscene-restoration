// text.js — Sonnet (threestate, Assembly 2001 64k) — the TEXT ENGINE, timeline object 1.
//
// The demo IS a poem, so this is the production's most important renderer.
//
// Reverse-engineered from the rebuilt PE:
//   FUN_004067c0  parser        — 50 records at VA 0x418328 -> re/text/poem.json
//   FUN_00406a7d  atlas setup   — charmap + the four-band column scan
//   FUN_00406c98  column scan   — derives every glyph's u extent FROM THE PIXELS
//   FUN_004071d3  measure       — max line width, ftol-truncated
//   FUN_00406db7  renderer      — one quad per character
//   FUN_0040727a  rot2          — rotate 4 vertices about the origin
//   FUN_004072e9  update+draw   — per-frame; also the title-card colour bars
//   FUN_004076c4  event handler — m0 show, m1 hide, m2 flash bar N
//
// Full write-up, including every uncertainty: re/text/TEXT_ENGINE.md.

import {
  D3DPT_TRIANGLELIST, D3DPT_TRIANGLEFAN, D3DFMT_INDEX16,
  D3DTS_PROJECTION, D3DTSS_COLOROP, D3DTSS_COLORARG1, D3DTSS_ALPHAOP, D3DTSS_ALPHAARG1,
  D3DTOP_SELECTARG1, D3DTOP_MODULATE, D3DTA_TEXTURE, D3DTA_TFACTOR,
  D3DRS_TEXTUREFACTOR, D3DMatrix, FVF_SONNET_STRIDE,
} from './minid3d8.js';

// ---------------------------------------------------------------------------
// Constants lifted verbatim from the image (VA 0x401000 == sonnet_img.bin +0).
// ---------------------------------------------------------------------------
export const K = {
  SIZE_DIV:      0.01587301678955555,  // 0x418dd8  (attr>>2)/63
  BAND_V:        0.25,                 // 0x418ddc  band height in v
  SPACE_U0:      0.98,                 // 0x418df0  blank atlas column, glyph 0x7f/0xff
  SPACE_U1:      0.99,                 // 0x418dec
  ONE_OVER_2048: 0.00048828125,        // 0x418df4  scan: column -> u
  NDC_Y:         0.004166666883975267, // 0x418df8  2/480
  NDC_X:         0.0031250000465661287,// 0x418dfc  2/640
  V_LOWER_BOT:   0.23999999463558197,  // 0x418e00
  V_UPPER_BOT:   0.49000000953674316,  // 0x418264
  ITAL_EXIT:     30.0,                 // 0x418e04  x shift leaving italic
  ITAL_SHEAR:    62.5,                 // 0x418e08  top-vertex shear
  ITAL_ADV:      37.5,                 // 0x418e0c  advance fixup entering italic
  ITAL_ENTER:    17.5,                 // 0x418e10  x shift entering italic
  U_TO_PX:       2048.0,               // 0x418e14  u fraction -> screen px at scale 1
  LINE_ADV:      80.0,                 // 0x418e18  newline y step
  HALF_NEG:     -0.5,                  // 0x418e1c
  CELL_H:        125.0,                // 0x418e20  quad height at scale 1, size 1
  SPACE_ADV:     20.0,                 // 0x418e24  measure-only space advance
  T_RATE:        0.01,                 // 0x418260  t += dt * 0.01 * speed
  BAR_DECAY:     0.05,                 // 0x418e2c
  BAR_A_BASE:    128.0,                // 0x418e30
  BAR_A_SPAN:    127.0,                // 0x418e34
  BAR_WOBBLE:    0.05999999865889549,  // 0x418e38
  BAR_X0:        0.6200000047683716,   // 0x418e3c
  BAR_SPAN:      1.2400000095367432,   // 0x418e40
  BAR_STEP:      0.1666666716337204,   // 0x418e44
  BAR_BUMP:      0.029999999329447746, // 0x418e48
  BAR_PHASE_RATE:4.0,                  // 0x418230
  RND_SPAN:      6.0,                  // 0x418e50  angle = rnd*6 - 3
  RND_BIAS:      3.0,                  // 0x4182cc
  ASPECT:        1.3333333730697632,   // 0x418314  bar projection y scale
  MS_PER_S:      1000.0,               // 0x418300  dt = ms * timeScale / 1000
};

/** DAT_0041a9bc — the six title-card bar colours (0x00RRGGBB). */
export const BAR_COLORS = [0x7fa7d7, 0xa7d77f, 0xfdda62, 0xa34701, 0xc9cdd0, 0x7fa7d7];
/** The per-bar wobble rates fed into DAT_004788d4 (FUN_004072e9). */
export const BAR_RATES = [0.01, 0.007, 0.013, 0.01, 0.008, 0.015, 0.008];
/** The bar branch only runs before this music position. */
export const BARS_UNTIL = 0x400;

// ---------------------------------------------------------------------------
// The ASCII -> glyph-index map, a port of FUN_00406a7d's table build.
//
//   'a'..'z' -> 0..25   '0'..'9' -> 26..35   ',' 36  '!' 37  '?' 38  '\'' 39
//   'A'..'Z' -> 40..65  '(' 66  ')' 67  '[' 68  ']' 69  ':' 70  '.' 71
//   ' '      -> 0xff (a blank strip of atlas, u 0.98..0.99)
// and then, for every code point, map[c | 0x80] = (map[c] - 0x80) & 0xff, which is
// what turns the parser's `text[i] |= 0x80` bold marker into the y=256/384 bands.
// ---------------------------------------------------------------------------
export function buildCharMap() {
  const m = new Uint8Array(256);
  m[0x20] = 0xff;
  for (let i = 0; i < 26; i++) m[0x61 + i] = i;              // a..z
  for (let i = 0; i < 26; i++) m[0x41 + i] = i + 0x28;       // A..Z
  for (let i = 0; i < 10; i++) m[0x30 + i] = i + 0x1a;       // 0..9
  m[0x2c] = 0x24; m[0x21] = 0x25; m[0x3f] = 0x26; m[0x27] = 0x27;
  m[0x28] = 0x42; m[0x29] = 0x43; m[0x5b] = 0x44; m[0x5d] = 0x45;
  m[0x3a] = 0x46; m[0x2e] = 0x47;
  for (let i = 0; i < 0x80; i++) m[i + 0x80] = (m[i] - 0x80) & 0xff;
  return m;
}

export const CHAR_MAP = buildCharMap();

// ---------------------------------------------------------------------------
// FUN_00406c98 — THE ATLAS COLUMN SCAN.
//
// This is the load-bearing trick of the whole font path. The original does NOT
// carry glyph metrics: it walks the rasterised atlas looking for runs of columns
// that contain a non-zero pixel inside the band, and stores (firstCol-1, lastGap+1)
// as the glyph's u extent. That is why an offline bake whose hinting and advances
// differ from GDI's still lays out correctly — every glyph box is re-derived from
// the pixels we actually have.
//
// `cov` is one byte per texel (the original keeps only the low channel:
// `buf[i] &= 0xff`). Column and band geometry are generalised from the original's
// hardcoded 0x800 / 0x80 so a 2x supersampled atlas works unchanged; the resulting
// u values are fractions, so they stay scale-invariant.
// ---------------------------------------------------------------------------
export function scanAtlasBand(cov, W, H, gStart, gEnd, bandY, bandH, out) {
  const invW = 1 / W;
  let next = 0;                       // local_c — where the next glyph search starts
  for (let g = gStart; g < gEnd; g++) {
    // Phase A: first column at or after `next` with any ink in the band.
    let first = next;                 // local_8 — unchanged if the row has run out
    for (let col = next; col < W; col++) {
      let any = false;
      for (let r = bandY; r < bandY + bandH; r++) if (cov[r * W + col]) { any = true; break; }
      if (any) { first = col; break; }
    }
    // Phase B: first fully blank column at or after `first` -> the gap after the glyph.
    for (let col = first; col < W; col++) {
      let any = false;
      for (let r = bandY; r < bandY + bandH; r++) if (cov[r * W + col]) { any = true; break; }
      if (!any) { next = col + 1; break; }
    }
    out[g * 2 + 0] = (first - 1) * invW;
    out[g * 2 + 1] = next * invW;
  }
  return out;
}

/**
 * Build the full 256-entry u table from a coverage bitmap, exactly as
 * FUN_00406a7d drives FUN_00406c98: four bands of H/4 rows each.
 *   glyphs 0x00..0x27 -> band 0 (regular lower)   glyphs 0x28..0x47 -> band 1 (regular upper)
 *   glyphs 0x80..0xa7 -> band 2 (bold lower)      glyphs 0xa8..0xc7 -> band 3 (bold upper)
 */
export function buildGlyphTable(cov, W, H) {
  const band = H >> 2;
  const uv = new Float32Array(256 * 2);
  scanAtlasBand(cov, W, H, 0x00, 0x28, 0 * band, band, uv);
  scanAtlasBand(cov, W, H, 0x80, 0xa8, 2 * band, band, uv);
  scanAtlasBand(cov, W, H, 0x28, 0x48, 1 * band, band, uv);
  scanAtlasBand(cov, W, H, 0xa8, 0xc8, 3 * band, band, uv);
  // The two space slots are hardcoded to a guaranteed-blank strip (FUN_00406a7d).
  uv[0x7f * 2] = K.SPACE_U0; uv[0x7f * 2 + 1] = K.SPACE_U1;
  uv[0xff * 2] = K.SPACE_U0; uv[0xff * 2 + 1] = K.SPACE_U1;
  return uv;
}

// ---------------------------------------------------------------------------
// The base scene object — FUN_004060ac / FUN_004060c9 / FUN_004060db / FUN_00406127.
// Every one of the eleven timeline objects derives from it; the shared methods are
// 252 = render layer, 253 = one-shot dt bias, 254 = time scale, 255 = enable.
// ---------------------------------------------------------------------------
export class SceneObjectBase {
  constructor() {
    this.layer = 0;         // +0x14, set by m252
    this.enabled = false;   // +0x15, set by m255
    this.dt = 0;            // +0x04
    this.dtBias = 0;        // +0x08, m253
    this.timeScale = 30.0;  // +0x0c, m254 (the ctor default is 30.0)
    this.lastMs = 0;        // +0x10
    this.started = false;
  }

  /** FUN_00406127 — the shared tail of every object's event handler. */
  event(m, f) {
    if (m === 252) this.layer = Math.trunc(f) & 0xff;
    else if (m === 253) this.dtBias = f;
    else if (m === 254) this.timeScale = f;
    else if (m === 255) this.enabled = f !== 0;
  }

  /**
   * FUN_004060db — the per-frame delta. The original's clock is FUN_00402f01, the
   * MiniFMOD player's own millisecond counter, NOT timeGetTime: the animation runs
   * off the music, which is why we feed it the audible audio clock.
   */
  tickDt(ms) {
    if (!this.started) { this.lastMs = ms; this.started = true; }
    this.dt = (ms - this.lastMs) / (K.MS_PER_S / this.timeScale);
    this.lastMs = ms;
    if (this.dtBias !== 0) { this.dt += this.dtBias; this.dtBias = 0; }
    return this.dt;
  }
}

// ---------------------------------------------------------------------------
// A poem item, mirroring the original's 0x40-byte record.
// ---------------------------------------------------------------------------
function makeItem(rec) {
  const n = rec.text.length;
  const bytes = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    // The parser folds attr bit 0 (BOLD) into the character itself: text[i] |= 0x80.
    bytes[i] = (rec.text.charCodeAt(i) & 0xff) | ((rec.attr[i] & 1) ? 0x80 : 0);
  }
  return {
    flags: rec.flags >>> 0,        // +0x0a
    rot: rec.rot,                  // +0x14
    x: rec.x, y: rec.y,            // +0x24 / +0x28
    tracking: rec.tracking,        // +0x2c
    lineadv: rec.lineadv,          // +0x30
    scale: rec.scale,              // +0x34
    color: rec.color >>> 0,        // +0x38
    speed: rec.speed,              // +0x3c
    text: bytes,                   // +0x18
    attr: Uint8Array.from(rec.attr, a => a & 3),  // +0x1c (bit 0 already consumed)
    size: Float32Array.from(rec.size),            // +0x20
    rand: new Float32Array(Math.max(n, 1)),       // +0x04, filled on show
    active: false,                 // +0x08
    t: 0,                          // +0x0c  clamped fade value
    tAccum: 0,                     // +0x10  unclamped accumulator
    idx: rec.idx,
  };
}

// ---------------------------------------------------------------------------
export class TextEngine extends SceneObjectBase {
  /**
   * @param {MiniD3D8} d3d
   * @param {{items:Array}} poem      re/text/poem.json
   * @param {object} atlas            { texture, uv }  from TextEngine.loadAtlas
   */
  constructor(d3d, poem, atlas, opts = {}) {
    super();
    this.d3d = d3d;
    this.items = poem.items.map(makeItem);
    this.texture = atlas.texture;
    this.uv = atlas.uv;
    this.opts = opts;
    this.enabled = true;            // object 1 is never given an m255 — always on
    this.layer = 14;                // m252 at t=0 sets 14; this is only the pre-init value
    this.barFlash = new Float32Array(6);   // DAT_00478900 — m2 sets one to 1.0
    this.barPhase = new Float32Array(7);   // DAT_004788d4
    this.position = 0;

    const MAXQ = 512;
    this.vb = new ArrayBuffer(MAXQ * 4 * FVF_SONNET_STRIDE);
    this.vf = new Float32Array(this.vb);
    this.vu = new Uint32Array(this.vb);
    this.ib = new Uint16Array(MAXQ * 6);
    for (let q = 0; q < MAXQ; q++) {
      const b = q * 4, o = q * 6;
      // The index pattern is the compositor's, read straight out of FUN_0040617b:
      // 0,1,2, 2,3,0.
      this.ib[o] = b; this.ib[o + 1] = b + 1; this.ib[o + 2] = b + 2;
      this.ib[o + 3] = b + 2; this.ib[o + 4] = b + 3; this.ib[o + 5] = b;
    }
    this.barVerts = new ArrayBuffer(4 * FVF_SONNET_STRIDE);
    this.barF = new Float32Array(this.barVerts);
    this.barU = new Uint32Array(this.barVerts);
    for (let i = 0; i < 4; i++) {
      const b = i * 11;
      this.barF[b + 2] = 1.0;                       // z
      this.barF[b + 1] = (i === 0 || i === 1) ? -1.0 : 1.0;
    }
    this.stats = { quads: 0, items: 0 };
    this.seed = 0x1234;
  }

  // ---------------------------------------------------------- events (FUN_004076c4)
  event(m, f) {
    super.event(m, f);
    const n = Math.trunc(f);
    if (m === 0) {
      const it = this.items[n]; if (!it) return;
      it.t = 0;
      it.active = true;
      // The per-character spin-in angles. Only generated when the item asks for one
      // of the four zoom/spin flags; otherwise every angle is a hard zero.
      const spin = (it.flags & 0x300c) !== 0;
      for (let i = 0; i < it.rand.length; i++)
        it.rand[i] = spin ? (this.rnd() * K.RND_SPAN - K.RND_BIAS) : 0;
    } else if (m === 1) {
      const it = this.items[n]; if (it) it.active = false;
    } else if (m === 2) {
      if (n >= 0 && n < 6) this.barFlash[n] = 1.0;
    }
  }

  /** FUN_00401341 — rand() * 1/32767. Deterministic so captures reproduce. */
  rnd() {
    this.seed = (Math.imul(this.seed | 0, 214013) + 2531011) | 0;
    return ((this.seed >>> 16) & 0x7fff) * 3.0518509447574615e-05;
  }

  /** Re-seed and clear all item state — used by seek() so warm-ups are repeatable. */
  reset() {
    this.seed = 0x1234;
    for (const it of this.items) { it.active = false; it.t = 0; it.tAccum = 0; it.rand.fill(0); }
    this.barFlash.fill(0);
    this.barPhase.fill(0);
    this.started = false;
  }

  // ---------------------------------------------------------- measure (FUN_004071d3)
  /** Widest line, in screen pixels, TRUNCATED to an integer exactly as ftol does. */
  measure(it, scale) {
    let best = 0, run = 0;
    for (let i = 0; i < it.text.length; i++) {
      const c = it.text[i], lo = c & 0x7f;
      if (lo === 0x20) {
        run += scale * K.SPACE_ADV;          // note: the size[] multiplier is NOT applied
      } else if (lo === 10) {
        if (run > best) best = run;
        run = 0;
      } else {
        const g = CHAR_MAP[c];
        run += (this.uv[g * 2 + 1] - this.uv[g * 2]) * it.size[i] * scale * K.U_TO_PX;
      }
    }
    if (run > best) best = run;
    return Math.trunc(best);
  }

  // ---------------------------------------------------------- render (FUN_004072e9)
  render(_layer, ctx) { this.tick(ctx, true); }

  /**
   * One frame of object 1. `draw === false` runs the identical state machine with
   * every device call suppressed, which is what the seek warm-up uses: item fades
   * and bar flashes accumulate over time, so cold-jumping to a position would show
   * every line at alpha zero.
   */
  tick(ctx, draw) {
    const d3d = this.d3d;
    this.tickDt(ctx.ms);
    this.position = ctx.position | 0;

    if (draw) {
      d3d.reset2D();
      d3d.setBlendMode(2);
      d3d.SetTexture(0, this.texture);
    }

    this.stats.quads = 0; this.stats.items = 0;
    for (const it of this.items) {
      if (!it.active && it.t === 0) continue;
      if ((it.flags & 0x4000) && this.position < BARS_UNTIL) this.drawBars(it, draw);
      if (draw) this.drawItem(it);
      this.advance(it);
      this.stats.items++;
    }
  }

  // ---------------------------------------------------------- one line (FUN_00406db7)
  /**
   * One quad per character, in NDC with identity transforms — there is no XYZRHW
   * path in this engine. Everything below is a straight transcription; the comment
   * on each block names the flag or constant it comes from.
   */
  drawItem(it) {
    const d3d = this.d3d, uv = this.uv, vf = this.vf, vu = this.vu;
    const flags = it.flags;
    const t = it.t > 1.0 ? 1.0 : it.t;

    // --- the four zoom/spin flags. `spinT` drives the per-character rotation;
    // 1.0 means "no rotation". 0x0004/0x0008 apply while SHOWN, 0x1000/0x2000
    // while HIDING, and each pair either zooms out from 2x or grows from 0.
    let spinT = t;                       // local_8
    let scale = it.scale;                // param_7
    if (flags & 0x1004) {
      if (((flags & 4) === 0 || !it.active) && ((flags & 0x1000) === 0 || it.active)) spinT = 1.0;
      else scale = (2.0 - t) * scale;
    }
    if (flags & 0x2008) {
      if (((flags & 8) === 0 || !it.active) && ((flags & 0x2000) === 0 || it.active)) spinT = 1.0;
      else scale = scale * t;
    }

    const n = it.text.length;
    const width = this.measure(it, scale);        // local_10, ftol-truncated
    const cellH = scale * K.CELL_H;               // local_14

    // --- flag 0x0010: fade the vertex alpha with t. This is the only flag on most
    // of the poem, and the reason nearly every line cross-fades.
    let color = it.color >>> 0;
    if (flags & 0x10) {
      const a = Math.trunc(((it.color >>> 24) & 0xff) * t) & 0xff;
      color = ((a << 24) | (it.color & 0xffffff)) >>> 0;
    }

    // The line is CENTRED on (x, y): the pen starts at -width*tracking/2.
    let penX = width * it.tracking * K.HALF_NEG;   // param_10
    let penY = cellH * it.lineadv * K.HALF_NEG;    // param_1

    let nq = 0;
    for (let i = 0; i < n; i++) {
      const c = it.text[i];
      const sz = it.size[i];
      if ((c & 0x7f) === 10) {                     // '\n'
        penX = width * it.tracking * K.HALF_NEG;
        penY += scale * it.lineadv * K.LINE_ADV;
        continue;
      }
      const g = CHAR_MAP[c];
      const u0 = uv[g * 2], u1 = uv[g * 2 + 1];
      const w = (u1 - u0) * sz * scale * K.U_TO_PX;   // fVar4 — glyph box width, px
      const xL = w * K.HALF_NEG, xR = w * 0.5;
      const yT = sz * cellH * K.HALF_NEG, yB = sz * cellH * 0.5;

      const b = nq * 44;                              // 4 verts x 11 floats
      vf[b + 0] = xL; vf[b + 1] = yT;                 // v0 top-left
      vf[b + 11] = xR; vf[b + 12] = yT;               // v1 top-right
      vf[b + 22] = xR; vf[b + 23] = yB;               // v2 bottom-right
      vf[b + 33] = xL; vf[b + 34] = yB;               // v3 bottom-left
      vu[b + 6] = color; vu[b + 17] = color; vu[b + 28] = color; vu[b + 39] = color;
      vf[b + 7] = u0; vf[b + 18] = u1; vf[b + 29] = u1; vf[b + 40] = u0;

      let adv = w * it.tracking;                      // param_9

      // --- attr bit 1: fake italic. Entering a run pulls the glyph left and eats
      // advance; leaving one pushes the next glyph right; and inside a run the two
      // TOP vertices shear right by 62.5 * size * scale (half the 125 px cell).
      const a = it.attr[i], prev = i > 0 ? it.attr[i - 1] : 0;
      if ((a & 2) === 0) {
        if (i > 0 && (prev & 2) !== 0) {
          const d = sz * scale * K.ITAL_EXIT;
          vf[b] += d; vf[b + 11] += d; vf[b + 22] += d; vf[b + 33] += d;
          adv += d;
        }
      } else {
        if (i > 0 && (prev & 2) === 0) {
          const d = sz * scale * K.ITAL_ENTER;
          vf[b] -= d; vf[b + 11] -= d; vf[b + 22] -= d; vf[b + 33] -= d;
          adv -= sz * scale * K.ITAL_ADV;
        }
        const s = sz * scale * K.ITAL_SHEAR;
        vf[b] += s; vf[b + 11] += s;
      }

      // --- the reveal: spin each glyph in from a random angle in [-3, +3] rad.
      rot2(vf, b, (1.0 - spinT) * it.rand[i]);

      const half = adv * 0.5;
      for (let v = 0; v < 4; v++) {
        vf[b + v * 11] += half + penX;
        vf[b + v * 11 + 1] += penY;
      }
      rot2(vf, b, it.rot);                            // whole-line rotation

      for (let v = 0; v < 4; v++) {
        vf[b + v * 11] += it.x;
        vf[b + v * 11 + 1] += it.y;
        vf[b + v * 11 + 2] = 1.0;
      }

      // --- the band the glyph lives in. Glyph index < 0x28 is the lowercase set,
      // and attr bit 0 (BOLD) drops another half-texture down to the bold bands.
      let vT, vB;
      if ((g & 0x7f) < 0x28) { vT = 0; vB = K.V_LOWER_BOT; }
      else { vT = K.BAND_V; vB = K.V_UPPER_BOT; }
      if (a & 1) { vT += 0.5; vB += 0.5; }
      vf[b + 8] = vT; vf[b + 19] = vT; vf[b + 30] = vB; vf[b + 41] = vB;

      // --- 640x480 screen pixels -> NDC, +y UP.
      for (let v = 0; v < 4; v++) {
        const o = b + v * 11;
        vf[o] = vf[o] * K.NDC_X - 1.0;
        vf[o + 1] = 1.0 - vf[o + 1] * K.NDC_Y;
      }

      penX += adv;
      nq++;
    }

    if (nq === 0) return;
    this.stats.quads += nq;
    d3d.DrawIndexedPrimitiveUP(D3DPT_TRIANGLELIST, 0, nq * 4, nq * 2,
      this.ib.subarray(0, nq * 6), D3DFMT_INDEX16,
      new Uint8Array(this.vb, 0, nq * 4 * FVF_SONNET_STRIDE), FVF_SONNET_STRIDE);
  }

  // ------------------------------------------------ the title card's colour bars
  /**
   * Six full-height vertical bars behind the "sonnet" title, drawn only by the item
   * carrying flag 0x4000 and only before music position 0x400. Object 1's method 2
   * pokes one bar's flash value to 1.0; it decays at 0.05 per dt and drives the
   * TEXTUREFACTOR alpha from 128 up to 255. The edges wobble on independent sines.
   */
  drawBars(it, draw = true) {
    const d3d = this.d3d;
    for (let i = 0; i < 7; i++) this.barPhase[i] += BAR_RATES[i] * this.dt * K.BAR_PHASE_RATE;

    if (!draw) {
      for (let k = 0; k < 6; k++) {
        if (this.barFlash[k] > 0) this.barFlash[k] -= this.dt * K.BAR_DECAY;
        else this.barFlash[k] = 0;
      }
      return;
    }

    d3d.SetTexture(0, null);
    d3d.SetTextureStageState(0, D3DTSS_COLORARG1, D3DTA_TFACTOR);
    d3d.SetTextureStageState(0, D3DTSS_COLOROP, D3DTOP_SELECTARG1);
    d3d.SetTextureStageState(0, D3DTSS_ALPHAARG1, D3DTA_TFACTOR);
    d3d.SetTextureStageState(0, D3DTSS_ALPHAOP, D3DTOP_SELECTARG1);
    d3d.SetTransform(D3DTS_PROJECTION, D3DMatrix.scaling(1.0, K.ASPECT, 1.0));

    const e = new Float32Array(7);
    for (let k = 0; k < 7; k++) {
      const bump = k > 2 ? K.BAR_BUMP : 0.0;
      let v = k * K.BAR_STEP * K.BAR_SPAN + bump - K.BAR_X0;
      if (k > 0 && k < 6) v += Math.sin(k + this.barPhase[k]) * K.BAR_WOBBLE;
      e[k] = v;
    }

    const bf = this.barF;
    for (let k = 0; k < 6; k++) {
      bf[0] = e[k]; bf[33] = e[k];                 // v0.x, v3.x
      bf[11] = e[k + 1]; bf[22] = e[k + 1];        // v1.x, v2.x

      let alphaInt = 0x80;
      if (this.barFlash[k] > 0) {
        alphaInt = Math.trunc(this.barFlash[k] * K.BAR_A_SPAN + K.BAR_A_BASE);
        this.barFlash[k] -= this.dt * K.BAR_DECAY;
      } else this.barFlash[k] = 0;

      const a = Math.trunc(alphaInt * it.t) & 0xff;
      d3d.SetRenderState(D3DRS_TEXTUREFACTOR, ((a << 24) | BAR_COLORS[k]) >>> 0);
      d3d.DrawPrimitiveUP(D3DPT_TRIANGLEFAN, 2, new Uint8Array(this.barVerts), FVF_SONNET_STRIDE);
    }

    d3d.SetTextureStageState(0, D3DTSS_COLORARG1, D3DTA_TEXTURE);
    d3d.SetTextureStageState(0, D3DTSS_COLOROP, D3DTOP_MODULATE);
    d3d.SetTextureStageState(0, D3DTSS_ALPHAARG1, D3DTA_TEXTURE);
    d3d.SetTextureStageState(0, D3DTSS_ALPHAOP, D3DTOP_MODULATE);
    d3d.SetTexture(0, this.texture);
    d3d.reset2D();
  }

  /** The tail of FUN_004072e9 — the fade state machine. */
  advance(it) {
    const step = this.dt * K.T_RATE * it.speed;
    if (!it.active) {
      // Without one of the "keep animating while hidden" flags the fade-out starts
      // from zero, i.e. the line vanishes on the frame it is hidden.
      if ((it.flags & 0x3010) === 0) it.t = 0;
      it.t -= step;
      if (it.t < 0) it.t = 0;
    } else {
      it.tAccum += step;
      it.t = it.tAccum > 1.0 ? 1.0 : it.tAccum;
    }
  }
}

/** FUN_0040727a — rotate the four vertices of a quad about the origin. */
export function rot2(vf, base, angle) {
  if (angle === 0) return;
  const c = Math.cos(angle), s = Math.sin(angle);
  for (let v = 0; v < 4; v++) {
    const o = base + v * 11;
    const x = vf[o], y = vf[o + 1];
    vf[o] = c * x - s * y;
    vf[o + 1] = s * x + c * y;
  }
}

// ---------------------------------------------------------------------------
// Atlas loading.
//
// The original generates texture 11 with GDI at startup and then keeps only the
// low byte of each texel (`buf[i] &= 0xff`) for the scan, before republishing it
// as `alpha = coverage, rgb = white`. Our atlas is baked offline (see
// re/gen/TEXGEN_PORT.md §17-19) into baked/tex/11.png as white-on-black coverage
// in RGB with alpha 255, so we take the BLUE channel — the same channel the
// original scans — and rebuild the ARGB the device wants.
// ---------------------------------------------------------------------------


function loadImage(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('text.js: cannot load font atlas ' + url));
    im.src = url;
  });
}

export default TextEngine;
