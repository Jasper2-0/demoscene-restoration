// textures.js — build the intro's textures from its own bytecode.
//
// The texture VM in texturevm.js reproduces all 69 shipped programs byte for
// byte (see ../../work/re/PORT_SPEC.md §7). This is the layer that turns that
// into something the Warp3D shim can bind: run each program, convert the VM's
// A8R8G8B8 output to the RGBA byte order WebGL wants, and hand back one array
// per part.
//
// WHY PER PART. Texture handles in the recorded draw stream are indices into
// the order `W3D_AllocTexObj` was called, and `_calculate_txt` walks one part's
// texture table — `r2+0x2642` for part one, `r2+0x2706` for part three. So a
// draw's `texture: 12` means the twelfth entry of whichever table was current,
// and the two tables are different sets. The counts settle it rather than the
// naming: part one's table has 48 programs and its draws use ids 0..47; part
// three's has 21 and uses 0..20.

import { decode, run, toARGB, SIZE, PIXELS } from './texturevm.js';
import { expandAtlas } from './font.js';

// THE FONT SLOTS. The texture VM does not produce these: `_init_txtgen` expands
// seg2's 1bpp mask into a 128x128 atlas and writes it into the texture buffer
// directly, so the VM's program for those slots produces nothing and they come
// out flat in every channel — which is how they were found. They are also
// exactly the slots every text node in the intro draws from.
export const FONT_SLOTS = { p1: [1], p3: [4, 12] };

/** Overwrite the font slots with the expanded atlas, in place. */
/**
 * Give the glyph atlas the alpha it needs, which the intro does not store.
 *
 * AN OPEN QUESTION, MARKED AS ONE. `_init_txtgen` provably writes 0x00ffffff --
 * `lis r11, 0xff` then `ori r11, r11, 0xffff` at 0x1000139c -- so every set
 * pixel of the atlas has an alpha byte of ZERO, and the texture is allocated
 * through the same single `W3D_AllocTexObj` site (0x10002064) and the same
 * A8R8G8B8 format as every other texture. Taken literally the credits are
 * invisible, and they are plainly legible in the capture.
 *
 * Two readings were tested against the capture and both lost. Ignoring texture
 * alpha everywhere scores +0.336 over part one against +0.458 for using it, and
 * complementing it -- which the `255 - mask` convention in `toARGB` makes a
 * reasonable guess, and which would have drawn the credits' black bar for free
 * -- scores +0.056. So the multiply is right and the atlas is the exception.
 *
 * Until the mechanism is found this supplies the alpha a font atlas obviously
 * wants: opaque where a bit was set, transparent where it was not. That is a
 * DEVIATION from the binary, deliberately narrow and confined to three texture
 * slots, and it is the only one in the texture path.
 */
function coverAlpha(rgba) {
  const out = new Uint8Array(rgba);
  for (let i = 0; i < out.length; i += 4) out[i + 3] = rgba[i] ? 0xff : 0;
  return out;
}

export function installFont(byPart, seg2) {
  if (!seg2) return 0;
  const atlas = expandAtlas(seg2);
  let n = 0;
  for (const [part, slots] of Object.entries(FONT_SLOTS)) {
    for (const i of slots) {
      // THROUGH THE SAME CONVERSION as everything else in this array.
      // `expandAtlas` reproduces `_init_txtgen` faithfully, which means it
      // returns the arena's A8R8G8B8 byte order; dropping that straight into a
      // slot that holds RGBA rotates every channel by one and the intro's text
      // comes out cyan -- which is what it did until this was measured.
      if (byPart[part]?.[i]) { byPart[part][i] = coverAlpha(argbToRGBA(atlas)); n++; }
    }
  }
  return n;
}

/**
 * A8R8G8B8 (the VM's own order, as `W3D_AllocTexObj` receives it) -> RGBA
 * bytes, which is what `texImage2D` reads.
 */
export function argbToRGBA(argb) {
  const out = new Uint8Array(argb.length);
  for (let i = 0; i < PIXELS; i++) {
    out[i * 4] = argb[i * 4 + 1];
    out[i * 4 + 1] = argb[i * 4 + 2];
    out[i * 4 + 2] = argb[i * 4 + 3];
    out[i * 4 + 3] = argb[i * 4];
  }
  return out;
}

const hexToBytes = (hex) => {
  const b = new Uint8Array(hex.length / 2);
  for (let i = 0; i < b.length; i++) b[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return b;
};

/** `tex_kernels.json` keys by "0x50" and wraps each entry; flatten to op -> nine weights. */
export function readKernels(doc) {
  const out = {};
  for (const [k, v] of Object.entries(doc.kernels ?? doc)) {
    out[Number(k)] = Array.isArray(v) ? v : (v.kernel ?? v.weights);
  }
  return out;
}

/**
 * -> { p1: [RGBA, ...], p3: [...] }, each indexed the way the draw stream's
 * `texture` field is. A program that throws yields null in its slot rather than
 * taking the whole build down; `failures` names them.
 */
export function buildTextures(programsDoc, kernelsDoc) {
  const kernels = readKernels(kernelsDoc);
  const byPart = {};
  const failures = [];
  for (const p of programsDoc.programs) {
    const list = byPart[p.part] ?? (byPart[p.part] = []);
    if (!p.hex) { list[p.index] = null; failures.push(`${p.part}_${p.index}: no bytecode`); continue; }
    try {
      const { ops } = decode(hexToBytes(p.hex));
      list[p.index] = argbToRGBA(toARGB(run(ops, kernels)));
    } catch (e) {
      list[p.index] = null;
      failures.push(`${p.part}_${p.index}: ${e.message}`);
    }
  }
  return { byPart, failures, size: SIZE };
}

/**
 * The same 69 textures, LOADED from the exported PNGs instead of generated.
 *
 * These are the oracle `work/re/texvmdiff.mjs` holds the VM to, so their colour
 * is the original's own. Having them selectable is what makes the texture stage
 * a real switch rather than a label: a wrong-looking frame can be shown with
 * recorded textures and computed raster, which says whether the fault is in the
 * VM or below it.
 *
 * THEY CARRY NO ALPHA. `rendertex.py` writes PNG colour type 2 — it takes the
 * ARGB surface and emits only R, G and B — so this side comes back opaque
 * everywhere while the VM's textures have a real alpha channel, and the shim
 * blends on `SRC_ALPHA`. The two therefore render DIFFERENTLY on any scene that
 * uses transparency, and that is the dataset's limit rather than a fault in
 * either path. It also means the texture VM's alpha has never been checked
 * against anything: `texvmdiff` compares three channels of four, and says so.
 *
 * Same shape as `buildTextures` so the two are interchangeable, and the same
 * failure convention — a PNG that will not load leaves null in its slot and a
 * line in `failures` rather than taking the page down.
 */
export async function loadTextures(programsDoc) {
  const byPart = {};
  const failures = [];
  await Promise.all(programsDoc.programs.map(async (p) => {
    const list = byPart[p.part] ?? (byPart[p.part] = []);
    const name = `${p.part}_${String(p.index).padStart(2, '0')}.png`;
    try {
      const r = await fetch(`./data/textures/${name}`);
      if (!r.ok) throw new Error(`${r.status}`);
      const bmp = await createImageBitmap(await r.blob());
      const c = new OffscreenCanvas(SIZE, SIZE);
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(bmp, 0, 0);
      // An RGB PNG decodes with alpha 255 everywhere, so the canvas round trip
      // is exact — there is no premultiplication to lose here, precisely
      // because there is no alpha to premultiply by.
      list[p.index] = new Uint8Array(g.getImageData(0, 0, SIZE, SIZE).data.buffer);
    } catch (e) {
      list[p.index] = null;
      failures.push(`${name}: ${e.message}`);
    }
  }));
  return { byPart, failures, size: SIZE, noAlpha: true };
}
