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
