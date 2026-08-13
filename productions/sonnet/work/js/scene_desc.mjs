// scene_desc.mjs — JS port of the "Sonnet" (threestate, Assembly 2001 64k intro)
// scene-descriptor decoder.  Resources 28..35 -> 8 fully named scene objects.
//
// Reverse-engineered from re/out/sonnet.c + ndisasm of unpacked/sonnet_img.bin.
// See re/gen/MESHGEN_PORT.md.
//
// ---------------------------------------------------------------------------
// WIRE FORMAT
// FUN_00407767 @ 0x407767 is a straight structured memcpy from a PACKED
// resource stream into a 0x3213-byte struct.  Only `count` records of each
// array are present in the resource, and they appear in struct order:
//
//   0x0000  0x53 bytes   header
//   0x0053  count[0x01] x 0x22   array A — surface-of-revolution clusters
//   0x08d3  count[0x06] x 0x20   array B — FUN_0040c1b2
//   0x10d3  count[0x07] x 0x22   array C — billboards, type 0
//   0x1953  count[0x08] x 0x1e   array D — billboards, type 1
//   0x20d3  count[0x09] x 0x1e   array E — trees
//   0x2853  count[0x0e] x 0x10   array F — compound props
//   0x2c53  count[0x0f] x 0x17   array G — birds
//
// The record sizes are confirmed against the actual resource lengths:
//   res28 117 = 83 + 1*34                       (A=1)
//   res29  83 = 83                              (all zero)
//   res30 288 = 83 + 4*34 + 1*30 + 1*16 + 1*23  (C=4 D=1 F=1 G=1)
//   res31 106 = 83 + 1*23                       (G=1)
//   res32 172 = 83 + 1*32 + 1*34 + 1*23         (B=1 C=1 G=1)
//   res33 147 = 83 + 1*34 + 1*30                (C=1 E=1)
//   res34 117 = 83 + 1*34                       (C=1)
//   res35  83 = 83
//
// NOTE: 0xCD bytes are MSVC uninitialised-heap fill.  Fields that read as
// 0xcd/0xcdcdcdcd in a given scene are simply unused there; `_uninit` lists
// which named fields look like fill.
// ---------------------------------------------------------------------------

// FUN_004082a9: descriptor resource = 0x1c + DESC_RES_MAP[sceneIdx]
export const DESC_RES_MAP = [0, 1, 2, 3, 4, 5, 0, 6, 7];
/** The eight scenes actually instantiated by the timeline (index 6 is cut). */
export const ACTIVE_SCENES = [0, 1, 2, 3, 4, 5, 7, 8];

export const ARRAY_LAYOUT = {
  A: { offset: 0x0053, size: 0x22, countAt: 0x01, flagBit: 1,  generator: 'FUN_0040bc63 (surface of revolution)' },
  B: { offset: 0x08d3, size: 0x20, countAt: 0x06, flagBit: 2,  generator: 'FUN_0040c1b2' },
  C: { offset: 0x10d3, size: 0x22, countAt: 0x07, flagBit: 4,  generator: 'FUN_0040b0b0 type 0 (billboards)' },
  D: { offset: 0x1953, size: 0x1e, countAt: 0x08, flagBit: 5,  generator: 'FUN_0040b0b0 type 1 (billboards)' },
  E: { offset: 0x20d3, size: 0x1e, countAt: 0x09, flagBit: 3,  generator: 'FUN_00409d45 (trees)' },
  F: { offset: 0x2853, size: 0x10, countAt: 0x0e, flagBit: 15, generator: 'FUN_0040c721 (compound props)' },
  G: { offset: 0x2c53, size: 0x17, countAt: 0x0f, flagBit: 14, generator: 'FUN_0040f803 (birds)' },
};
const ARRAY_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

// ---------------------------------------------------------------------------
// Flag bits at desc+0x4f (u32).  Every one of these was traced to its
// consumer; the byte-level tests in the binary are given in the comments.
// ---------------------------------------------------------------------------
export const FLAG_BITS = {
  waterGlitter:      { bit: 0,  mask: 0x00000001, test: 'desc[0x4f] & 1',    note: 'animated water-glitter strip at Landscape+0x40 (only when waterLevel > 0); per-vertex Y = sin(t*10 + phase)*0.5+0.5 scaled by [0x418e94] + [0x418e84], alpha animated. Only scene 4.' },
  buildA:            { bit: 1,  mask: 0x00000002, test: 'desc[0x4f] & 2',    note: 'build array A (FUN_0040bc63)' },
  buildB:            { bit: 2,  mask: 0x00000004, test: 'desc[0x4f] & 4',    note: 'build array B (FUN_0040c1b2)' },
  buildTrees:        { bit: 3,  mask: 0x00000008, test: 'desc[0x4f] & 8',    note: 'build array E (FUN_00409d45)' },
  buildBillboards0:  { bit: 4,  mask: 0x00000010, test: 'desc[0x4f] & 0x10', note: 'build array C (FUN_0040b0b0 type 0)' },
  buildBillboards1:  { bit: 5,  mask: 0x00000020, test: 'desc[0x4f] & 0x20', note: 'build array D (FUN_0040b0b0 type 1)' },
  buildPrecip:       { bit: 6,  mask: 0x00000040, test: 'desc[0x4f] & 0x40', note: 'build rain/snow (FUN_0040d1f1)' },
  precipRenderTarget:{ bit: 7,  mask: 0x00000080, test: 'desc[0x4f] & 0x80', note: 'with bit6: allocate a 64x64 render target at Landscape+0x30' },
  terrainOpt8:       { bit: 8,  mask: 0x00000100, test: 'desc[0x4f] & 0x100',note: 'FUN_0040e058 param_14 (cVar11)' },
  cloudLayer:        { bit: 9,  mask: 0x00000200, test: 'desc[0x50] & 2',    note: 'cloud layer object (Landscape+0xa8) visible; also gates FUN_00402c72(0)' },
  cloudOpt10:        { bit: 10, mask: 0x00000400, test: 'desc[0x4f]>>10',    note: 'FUN_0040ec28 arg = ~(f>>10)&1; also gates the cloud-layer x2 scale' },
  cloudOpt11:        { bit: 11, mask: 0x00000800, test: 'desc[0x4f] & 0x800',note: 'FUN_0040ec28 last arg' },
  hiResWater:        { bit: 13, mask: 0x00002000, test: 'desc[0x50] & 0x20', note: '32x32 water plane (+-600, uv0 x5) + 32 ribbon strips; else coarse 4x4 (+-300, uv0 x8)' },
  buildBirds:        { bit: 14, mask: 0x00004000, test: 'desc[0x50] & 0x40', note: 'build array G (FUN_0040f803)' },
  buildProps:        { bit: 15, mask: 0x00008000, test: 'desc[0x50] & 0x80', note: 'build array F (FUN_0040c721)' },
  terrainVisible:    { bit: 16, mask: 0x00010000, test: 'desc[0x51] & 1',    note: 'if clear, terrain mesh gets +0xc8 |= 2 (hidden). ALSO the second gate on the bit-17 ramp (VA 0x4096de)' },
  // MISNAMED, kept for compatibility: nothing about the water level moves.
  // FUN_00408eef VA 0x40968a-0x4096f6 (ndisasm; Ghidra is right here for once):
  //     if (desc[0x51] & 2) {
  //         if (this[0x144]) this[0x140] += dt * 0.01     // the m7 gate
  //         clamp this[0x140] into [0.0, 1.0]
  //         if (desc[0x51] & 1)                           // terrainVisible, bit 16
  //             terrainMesh[0x98] = desc[0x44] * this[0x140]
  //     }
  // terrainMesh+0x94..0x9c is the mesh node's SCALE triple (FUN_0040e058 writes
  // terrainScale there; FUN_00407983 writes a tree's uniform scale there;
  // FUN_004082a9 writes the same triple on the water plane), so +0x98 is
  // scale.Y and desc+0x44 is terrainScale.Y.  THE LANDSCAPE RISES OUT OF THE
  // WATER: dead flat at the m7, full relief 100 frames-at-30fps (~3.3 s) later.
  // Scene 1 is the only descriptor with bit 17 and it does set bit 16 too.
  // desc+0x10 (waterLevel) is NEVER touched; it stays 1.0 all scene.
  waterLevelAnim:    { bit: 17, mask: 0x00020000, test: 'desc[0x51] & 2',    note: 'terrainMesh.scale.y = terrainScale.y * ramp(0->1); ramp starts at m7, rate dt*0.01, gated by bit 16' },
  billboard0Opt:     { bit: 18, mask: 0x00040000, test: 'desc[0x4f] & 0x40000', note: 'FUN_0040b0b0 type-0 last arg' },
  precipOpt:         { bit: 19, mask: 0x00080000, test: 'desc[0x4f] & 0x80000', note: 'FUN_0040d1f1 last arg' },
  autumnLeaves:      { bit: 23, mask: 0x00800000, test: 'desc[0x51] & 0x80', note: 'DAT_0047895c = 0xffff0032 (red) instead of 0xffa4ff9d (green)' },
  // FUN_0040e058 tail: `if (param_13 == 0)`, i.e. when bit 24 is SET, build a
  // SECOND terrain material at Landscape+0x40 (== scene+0x8c):
  //     texgen program 0x11 at 256x256      -> texture0
  //     DAT_00478978 (program 0x10, 512^2)  -> texture1   (the shared detail map)
  //     flags 0xc018, material+0x14 (the alpha byte, == the port's alphaRef) = 0xff
  // FUN_00408eef then drives that alpha off the SAME bit-17 ramp (VA 0x409783,
  // Ghidra drops the ftol's operand; ndisasm gives
  // `fld1; fsub [esi+0x140]; fmul [0x418268]=255.0; clamp at 0; ftol`), skips the
  // whole scene-graph render while the alpha is 0xff, and re-draws the terrain
  // with this material afterwards while the alpha is non-zero (VA 0x40980e).
  // So the terrain CROSS-FADES from texgen 17 to its baked ground texture as it
  // rises.  Scene 1 is the only descriptor with bit 24.
  terrainOpt24:      { bit: 24, mask: 0x01000000, test: 'desc[0x4f]>>24',    note: 'FUN_0040e058 param_13 = ~(f>>24)&1: builds the terrain cross-fade overlay material, alpha = ftol(max(0,(1-ramp)*255))' },
};

export const LEAF_COLOUR_GREEN = 0xffa4ff9d;   // DAT_0047895c default
export const LEAF_COLOUR_AUTUMN = 0xffff0032;  // when flag bit 23 is set

// ---------------------------------------------------------------------------
function reader(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    u8: o => bytes[o],
    i8: o => dv.getInt8(o),
    u16: o => dv.getUint16(o, true),
    u32: o => dv.getUint32(o, true) >>> 0,
    f32: o => dv.getFloat32(o, true),
    vec3: o => [dv.getFloat32(o, true), dv.getFloat32(o + 4, true), dv.getFloat32(o + 8, true)],
    raw: (o, n) => Array.from(bytes.slice(o, o + n)),
    len: bytes.length,
  };
}

const FILL = 0xcd;
function looksUninit(bytes, o, n) {
  for (let i = 0; i < n; i++) if (bytes[o + i] !== FILL) return false;
  return true;
}

// ---------------------------------------------------------------------------
// HEADER (0x53 bytes).  Every offset below was traced to a consumer; the
// consumer is named in the comment.
// ---------------------------------------------------------------------------
function decodeHeader(bytes) {
  const r = reader(bytes);
  const flags = r.u32(0x4f);
  const h = {
    cameraPathCount: r.u8(0x00),      // FUN_004082a9 loop bound
    countA: r.u8(0x01),
    paramA: r.f32(0x02),              // only scene 0 (the only scene with A>0): 0.1
    countB: r.u8(0x06),
    countC: r.u8(0x07),
    countD: r.u8(0x08),
    countE: r.u8(0x09),
    unknown0a: r.f32(0x0a),           // 1.0 in all eight descriptors
    countF: r.u8(0x0e),
    countG: r.u8(0x0f),
    waterLevel: r.f32(0x10),          // FUN_004082a9: > 0 -> a water plane exists
    precipCount: r.u16(0x14),         // FUN_0040d1f1 particle count
    precipType: r.u8(0x16),           // 0 = snow, 1 = rain
    cloudCount: r.u32(0x17),          // FUN_0040ec28 arg 3
    cloudParam: r.u8(0x1b),           // FUN_0040ec28 arg 5
    cloudColour: r.u32(0x1c),         // FUN_0040ec28 arg 6
    cloudSize: r.u16(0x20),           // FUN_0040ec28 arg 4 (converted to float)
    fogColour: r.u32(0x22),           // DAT_00474790 -> FUN_00401abf(1, col, start, end)
    fogStart: r.f32(0x26),            // FUN_00401abf arg 3
    fogEnd: r.f32(0x2a),              // FUN_00401abf arg 4; ALSO camera far plane (+0xc4)
    flareParam1: r.u16(0x2e),         // FUN_00405082 arg 1
    flareParam2: r.u16(0x30),         // FUN_00405082 arg 2
    sunPosition: r.vec3(0x32),        // flare object +0xb4; also -> FUN_0040e058 light dir
    hazeDensity: r.u8(0x3e),          // d = ((255 - x)/255)^3  (object +0x11c, +0x118 = 1500.0)
    heightmapTexProg: r.u8(0x3f),     // texgen program id, rendered at 128x128
    terrainScale: r.vec3(0x40),       // terrain mesh +0x94
    terrainGridN: r.u8(0x4c),         // 64 or 128
    groundTexProgA: r.u8(0x4d),       // texgen program id, 256x256
    groundTexProgB: r.u8(0x4e),       // texgen program id, 256x256
    flags,
  };
  // Flags expanded to booleans.
  h.flag = {};
  for (const [k, v] of Object.entries(FLAG_BITS)) h.flag[k] = (flags & v.mask) !== 0;

  // Derived / convenience.
  h.hasWater = h.waterLevel > 0;
  h.leafColour = h.flag.autumnLeaves ? LEAF_COLOUR_AUTUMN : LEAF_COLOUR_GREEN;
  h.haze = Math.pow((255 - h.hazeDensity) / 255, 3);
  // FUN_004082a9 / FUN_00407983 water plane parameters.
  h.water = h.flag.hiResWater
    ? { grid: 32, halfExtent: 600.0, uv0Tile: 5.0, uv1Tile: 1.0, ribbons: 32 }
    : { grid: 4, halfExtent: 300.0, uv0Tile: 8.0, uv1Tile: 1.0, ribbons: 0 };
  // FUN_00407983 rain/snow spawn box + scale (VA ~0x407e60).
  h.precip = {
    count: h.precipCount,
    type: h.precipType,
    isRain: h.precipType !== 0,
    box: h.precipType !== 0 ? [50, 256, 50] : [60, 128, 60],
    quadScale: h.precipType !== 0 ? [1, 2, 1] : [1, 1, 1],
  };
  // Which header fields are pure 0xCD fill in this descriptor.
  h._uninit = [];
  const probes = [
    ['paramA', 0x02, 4], ['precipCount', 0x14, 2], ['precipType', 0x16, 1],
    ['cloudParam', 0x1b, 1], ['cloudColour', 0x1c, 4], ['cloudSize', 0x20, 2],
    ['fogColour', 0x22, 4],
  ];
  for (const [name, o, n] of probes) if (looksUninit(bytes, o, n)) h._uninit.push(name);
  return h;
}

// ---------------------------------------------------------------------------
// ARRAY RECORDS.  Field offsets come from FUN_00407983 @ 0x407983 (the master
// scene builder) — it reads absolute descriptor addresses, e.g. 0x20eb, which
// is array E base 0x20d3 + 0x18.
// ---------------------------------------------------------------------------
function decodeA(r, o) {  // 0x22 — FUN_0040bc63(obj, list, radius, heightRatio, count, 16, 8, scatter)
  return {
    instanceCount: r.u16(o + 0x00),   // desc+0x53
    boxCentre: r.vec3(o + 0x02),      // desc+0x55 -> FUN_004078b6 scatter (y forced to 0)
    boxExtent: r.vec3(o + 0x0e),      // desc+0x61 -> FUN_004078b6 scatter (y ignored)
    radius: r.f32(o + 0x1a),          // desc+0x6d -> FUN_0040bc63 arg 3
    heightRatio: r.f32(o + 0x1e),     // desc+0x71 -> FUN_0040bc63 arg 4
    rings: 16, segments: 8,           // literal 0x10 / 8 at the call site
  };
}
function decodeB(r, o) {  // 0x20 — FUN_0040c1b2, terrain-following double-sided curtains
  return {                            // (confidence: medium — see MESHGEN_PORT.md)
    origin: r.vec3(o + 0x00),         // desc+0x8d3
    unknown0c: r.u32(o + 0x0c),       // 0xCDCDCDCD in scene 4 -> unused
    param10: r.f32(o + 0x10),         // desc+0x8e3 (120.0 in scene 4)
    halfLength: r.f32(o + 0x14),      // desc+0x8e7 (10.0)
    height: r.f32(o + 0x18),          // desc+0x8eb (8.0)
    param1c: r.f32(o + 0x1c),         // PINNED desc+0x8ef (128.0 in scene 4) — the
                                      // STRIP COUNT: FUN_0040c1b2 takes ftol() of it.
    // REMOVED: `strips: 16` ("literal 0x10 at the call site").  That was an
    // INFERRED value and it was WRONG — the count is ftol(desc+0x1c) = 128, the
    // one field Ghidra dropped (scene7.js `#buildCurtains`, SCENES_7_10.md
    // §10).  The field was dead (nothing read it), but a stale wrong constant
    // sitting in a decoder is exactly what re/CONVENTIONS.md is about.
  };
}
function decodeC(r, o) {  // 0x22 — FUN_0040b0b0 type 0
  return {
    instanceCount: r.u16(o + 0x00),   // desc+0x10d3
    boxCentre: r.vec3(o + 0x02),      // desc+0x10d5
    boxExtent: r.vec3(o + 0x0e),      // desc+0x10e1
    sizeRaw: r.f32(o + 0x1a),         // desc+0x10ed
    size: r.f32(o + 0x1a) * 50.0,     //   * [0x418e60] = 50.0
    unusedParam: r.u32(o + 0x1e),     // desc+0x10f1 — PASSED BUT NEVER READ
    quadType: 0, angleCount: 2,       // literals at the call site
  };
}
function decodeD(r, o) {  // 0x1e — FUN_0040b0b0 type 1
  return {
    instanceCount: r.u16(o + 0x00),   // desc+0x1953
    boxCentre: r.vec3(o + 0x02),      // desc+0x1955
    boxExtent: r.vec3(o + 0x0e),      // desc+0x1961
    sizeRaw: r.f32(o + 0x1a),         // desc+0x196d
    size: r.f32(o + 0x1a) * 4.0,      //   * [0x418230] = 4.0
    unusedParam: 10.0,                // literal [0x418e5c] = 10.0 at the call site
    quadType: 1, angleCount: 2,
  };
}
function decodeE(r, o) {  // 0x1e — FUN_00409d45 (trees)
  return {
    position: r.vec3(o + 0x00),       // desc+0x20d3 (y gets += terrainHeight)
    bend: r.vec3(o + 0x0c),           // desc+0x20df -> DAT_00478950, added to every Euler
    branchRadius: r.u8(o + 0x18),     // desc+0x20eb, used as (float)byte -> DAT_00478934
    levelTaper: r.u8(o + 0x19) / 255, // desc+0x20ec, * [0x418298] -> DAT_00478948
    levelTaperRaw: r.u8(o + 0x19),
    scale: r.f32(o + 0x1a),           // desc+0x20ed -> both meshes' +0x94 (uniform)
    meshScale: 1.0, leavesVisible: true, leafSize: 1.0,   // literals at the call site
  };
}
function decodeF(r, o) {  // 0x10 — FUN_0040c721 (compound props)
  return {
    position: r.vec3(o + 0x00),       // desc+0x2853
    param: r.f32(o + 0x0c),           // desc+0x285f (0.15 in scene 2)
    paramRaw: r.u32(o + 0x0c),
  };
}
function decodeG(r, o) {  // 0x17 — FUN_0040f803 (birds)
  return {
    centre: r.vec3(o + 0x00),         // desc+0x2c53 flock centre
    instanceCount: r.u16(o + 0x0c),   // desc+0x2c5f
    radius: r.f32(o + 0x0e),          // "A": flock radius / speed scale
    amp: r.f32(o + 0x12),             // banking amplitude
    species: r.u8(o + 0x16),          // 0 -> texgen 10, wing x1; else texgen 9, wing x3
  };
}
const DECODERS = { A: decodeA, B: decodeB, C: decodeC, D: decodeD, E: decodeE, F: decodeF, G: decodeG };

// ---------------------------------------------------------------------------
/**
 * Decode one scene-descriptor resource block (res 28..35).
 * @param {Uint8Array} bytes the raw packed resource
 * @param {number} sceneIdx  0..8 (6 is unused)
 */
export function decodeSceneDescriptor(bytes, sceneIdx = -1) {
  const header = decodeHeader(bytes);
  const r = reader(bytes);
  const counts = {
    A: header.countA, B: header.countB, C: header.countC, D: header.countD,
    E: header.countE, F: header.countF, G: header.countG,
  };
  const arrays = {};
  let p = 0x53;
  for (const key of ARRAY_ORDER) {
    const L = ARRAY_LAYOUT[key];
    const n = counts[key];
    const recs = [];
    for (let i = 0; i < n; i++) {
      recs.push(Object.assign({ _offset: p, _raw: r.raw(p, L.size) }, DECODERS[key](r, p)));
      p += L.size;
    }
    arrays[key] = recs;
  }
  const consumed = p;
  const scene = { sceneIdx, ...header, arrays, _bytesConsumed: consumed, _bytesTotal: bytes.length };
  // Sanity: a packed descriptor must be exactly consumed.
  scene._packedOk = consumed === bytes.length;
  // Scene 1 patches the sun's Y in FUN_004082a9 (VA ~0x4082ff): desc+0x36 = 374.0f.
  if (sceneIdx === 1) scene.sunPosition = [scene.sunPosition[0], 374.0, scene.sunPosition[2]];
  return scene;
}

/** Decode all eight scenes.  Keys are the timeline scene indices. */
export function decodeAllScenes(resources) {
  const out = {};
  for (const s of ACTIVE_SCENES) {
    out[s] = decodeSceneDescriptor(resources[0x1c + DESC_RES_MAP[s]], s);
  }
  return out;
}

// Object index -> scene index (FUN_004082a9 is invoked for objects 3..10).
export const OBJECT_TO_SCENE = { 3: 0, 4: 1, 5: 2, 6: 3, 7: 4, 8: 5, 9: 7, 10: 8 };
