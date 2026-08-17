// font.js — the intro's own text setup: the glyph atlas and the glyph table.
//
// Two of PORT_SPEC §1's three init routines, and between them they replace two
// exported files. `data/font_atlas.png` is 128x128 of white-on-nothing that
// `_init_txtgen` expands from 2,048 bytes of 1bpp mask in seg2, and
// `data/font.json` is 40 records that `_init_scene_generate` unpacks from 200
// bytes in seg0. Neither needs to be downloaded once these run.
//
// NOTHING ON THE PAGE DRAWS TEXT YET. The type-4 handler is part of Stage 3b,
// so this is groundwork with an oracle rather than a change to what renders —
// which is exactly why it is worth doing now: both outputs can be checked
// byte-for-byte against the exports today, and will be untestable in isolation
// once the text handler is consuming them.
//
// The third routine, `_init_scene_show`, builds the clipper's scratch and is
// not portable as code — see CLIP_SCRATCH at the bottom for what it does say.

const SEG0 = 0x10000000;
const SEG2 = 0x10020000;
// r2 is the small-data base, biased by -2 (`LEA $7FFE,A4`).
const R2 = 0x7ffe;

export const ATLAS = 128;

/**
 * `_init_txtgen` (`0x1000139c`, 15 instructions) — 1bpp mask to 128x128 ARGB.
 *
 * Three nested counters: 128 rows, 16 bytes a row, 8 bits a byte, MSB first,
 * which is 16,384 pixels and exactly the 2,048 bytes seg2 holds.
 *
 * IT ONLY WRITES SET BITS. A clear bit is skipped entirely rather than stored
 * as zero, so the destination has to arrive zeroed — it is BSS in the original
 * and a fresh Uint8Array here. A port that writes both branches produces the
 * same picture and would hide the dependency.
 *
 * THE SET VALUE IS 0x00ffffff, alpha ZERO. That looks like a mistake and is
 * not ours to correct; `export.py` drops the first channel when it writes the
 * PNG, so the exported oracle cannot see that byte at all and this is the only
 * place the full word survives.
 *
 * The source pointer in `r2+0x247a` is 0x1001ffff — one byte BEFORE seg2 — and
 * the loop reads with `lbzu r6, 1(r14)`, which pre-increments. The two cancel:
 * the first byte read is seg2[0]. Getting one of them right and not the other
 * shifts the whole atlas by a byte.
 */
export function expandAtlas(seg2) {
  const out = new Uint8Array(ATLAS * ATLAS * 4);
  let src = 0, dst = 0;
  for (let row = 0; row < ATLAS; row++) {
    for (let byte = 0; byte < ATLAS / 8; byte++) {
      const bits = seg2[src++];
      for (let mask = 0x80; mask; mask >>= 1) {
        if (bits & mask) {
          // Big-endian 0x00ffffff: the alpha byte stays zero.
          out[dst + 1] = 0xff; out[dst + 2] = 0xff; out[dst + 3] = 0xff;
        }
        dst += 4;
      }
    }
  }
  return out;
}

/**
 * `_init_scene_generate` (`0x10002fb8`, 24 instructions) — the glyph table.
 *
 * A `0xFF`-terminated walk over 5-byte records at `seg0+0xa8e4`, each expanded
 * to 20 bytes: the character code as a word, then x, y, w and h each through
 * `int2float`. The terminator is written to the destination too, so the table
 * the renderer scans ends the same way the source does.
 *
 * TWO SHIPPED QUIRKS COME OUT OF THIS AND BOTH ARE REPRODUCED, because they are
 * in the data rather than in the code: '0' appears twice, at indices 0 and 11,
 * and 'v' carries 'w''s rectangle so the intro renders "v" as "w". Anything
 * that dedupes or repairs the table is drawing something the intro does not.
 */
export function glyphTable(seg0) {
  const out = [];
  let p = 0xa8e4;
  for (;;) {
    const code = seg0[p];
    if (code === 0xff) return out;
    out.push({
      code,
      char: code >= 32 && code < 127 ? String.fromCharCode(code) : null,
      x: seg0[p + 1], y: seg0[p + 2], w: seg0[p + 3], h: seg0[p + 4],
    });
    p += 5;
  }
}

/**
 * `_init_scene_show` (`0x100069f8`) — the clipper's scratch, as measurements.
 *
 * This one is NOT PORTED AS CODE, deliberately. All it does is fill two tables
 * with pointers into two vertex arrays on a fixed stride; in a language with
 * pointers that is the allocation, and in this one the clipper will hold its
 * own arrays. Transcribing it would produce a function that builds a table
 * nothing can use.
 *
 * What does carry over is the SHAPE, and Stage 3b needs it: Sutherland-Hodgman
 * ping-pongs between two vertex buffers, and these are they.
 *
 *   * two buffers, because the algorithm reads one and writes the other per
 *     clipping plane;
 *   * 100 pointer slots each, of which slot 0 is set to NULL and slots 1..99
 *     are filled — so 99 usable vertices, not 100. The loop runs 99 times
 *     (`li r23, 0x63`, decrement, `bgt`), which is the polygon's maximum size
 *     and therefore a real bound on the clipper;
 *   * 0x24 bytes per vertex — 36, nine floats, which matches the nine the
 *     mesh handler writes per vertex in §4c.
 *
 * `readClipScratch` re-derives all of that from the four pointers in the small
 * data area rather than trusting the numbers above, so a wrong reading shows up
 * as a check failure instead of a comment that has drifted.
 */
export const CLIP_SCRATCH = { buffers: 2, slots: 100, vertices: 99, stride: 0x24 };

/** The four pointers `_init_scene_show` reads, and the geometry they imply. */
export function readClipScratch(seg0) {
  const dv = new DataView(seg0.buffer, seg0.byteOffset, seg0.byteLength);
  const at = (disp) => dv.getUint32(R2 + disp, false);
  const tableA = at(0x2a42), tableB = at(0x2a46);
  const arrayA = at(0x2a4a), arrayB = at(0x2a4e);
  return {
    tableA, tableB, arrayA, arrayB,
    slots: (tableB - tableA) / 4,
    stride: CLIP_SCRATCH.stride,
    arrayVertices: (arrayB - arrayA) / CLIP_SCRATCH.stride,
  };
}

export const SEGMENTS = { SEG0, SEG2 };
