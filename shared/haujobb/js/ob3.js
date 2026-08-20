// ob3.js — reader for the Haujobb .OB3 geometry container.
//
// Small, fixed and fully specified. One file, STAR.OB3, is byte-identical across
// FIVE productions (Genoaux, Liquid, Channel 5, and inside the Elements and
// We Are ACE archives), so this one reader serves all of them.
//
//   u16 nverts · u16 nfaces
//   nverts × 3×s16                                    vertex positions
//   nfaces × 10×s16  { v0, v1, v2, mat, 3×(u,v) }     UVs are /256 fixed point
//
// Size is fully determined: 4 + nverts*6 + nfaces*20. STAR.OB3 is 12 verts and
// 6 faces => 4 + 72 + 120 = 196 bytes, which is the file exactly. `parseOb3`
// asserts that rather than trusting it.
//
// The V coordinate is FLIPPED relative to GL's convention. That is the format,
// not a bug to correct: a reconstruction that "fixes" it stops matching.

export class Ob3FormatError extends Error {
  constructor(message) { super(message); this.name = 'Ob3FormatError'; }
}

const UV_SCALE = 1 / 256;

export function parseOb3(input, { source = '<OB3>' } = {}) {
  const bytes = input instanceof ArrayBuffer ? new Uint8Array(input)
    : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 4) throw new Ob3FormatError(`${source}: too short (${bytes.length} bytes)`);

  const nverts = dv.getUint16(0, true);
  const nfaces = dv.getUint16(2, true);
  const expect = 4 + nverts * 6 + nfaces * 20;
  if (expect !== bytes.length) {
    throw new Ob3FormatError(
      `${source}: header says ${nverts} verts + ${nfaces} faces = ${expect} bytes, file is ${bytes.length}`);
  }

  const verts = new Int16Array(nverts * 3);
  let o = 4;
  for (let i = 0; i < nverts * 3; i++, o += 2) verts[i] = dv.getInt16(o, true);

  const faces = new Array(nfaces);
  for (let f = 0; f < nfaces; f++) {
    const v = [dv.getInt16(o, true), dv.getInt16(o + 2, true), dv.getInt16(o + 4, true)];
    const mat = dv.getInt16(o + 6, true);
    const uv = new Float32Array(6);
    for (let k = 0; k < 3; k++) {
      uv[k * 2]     =  dv.getInt16(o + 8 + k * 4, true) * UV_SCALE;
      uv[k * 2 + 1] = -dv.getInt16(o + 10 + k * 4, true) * UV_SCALE;   // V flipped
    }
    faces[f] = { v, mat, uv };
    o += 20;
  }
  return { nverts, nfaces, verts, faces, bytesConsumed: o, bytesTotal: bytes.length };
}
