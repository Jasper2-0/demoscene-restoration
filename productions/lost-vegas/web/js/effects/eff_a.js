// eff_a.js — scene A, music pos 0x200 .. 0x600 (video ~9.6 s .. ~25.2 s):
// the WHITE CRYSTALLINE SHARD BAND — a receding corridor of glassy boxes with
// the "effect vs design" banner sliding in over it.
//
//   generator  FUN_00407380   (called up front from FUN_0040f285)
//   init       FUN_00407880
//   per frame  FUN_004078a0
//
// Geometry: ONE 8-vertex / 12-face box, x,z in [-50,50], y in [120,220], drawn
// 200 times — 20 depth slices (z = -1000 .. 900, step 100) x 10 copies.  All ten
// copies of a slice sit at the SAME position and differ only in their Z
// rotation (i * pi/4 plus a common wobble), so each slice is a radial fan of
// boxes around the origin; the stack of slices is the band you see.  The top
// face (vertices 2,3,6,7) breathes: y = sin(t * speed_i) * 85 + 85 + kick + 120.
//
// Shading: a 256x256 procedural radial glow (FUN_0040607f, ported below) sampled
// through spherical env-map UVs (FUN_004022a0 = K.meshEnvMapUV, mode 1) and
// blended ADDITIVELY (SRCALPHA / ONE) with Z-write off.  The vertex diffuse is
// the literal 0x3f9681b7 the generator stores into the diffuse dword —
// ARGB(63,150,129,183) — which is what gives the shards their pale blue cast.
//
// 2D layer: 18 screen-space triangles (FUN_004049f5 = K.drawTri2D) in two
// colours plus three text runs.  Ghidra prints every D3DCOLOR in those vertex
// arrays as `-NAN` (0xFFxxxxxx *is* a negative NaN bit pattern), so the two
// palette entries had to be read from the disassembly: 0xFFD7B45A (design
// yellow, 10 triangles) and 0xFFC1A251 (olive, the 4 diamond markers).
//
// Decompile ambiguities resolved from the disassembly (`ndisasm`/capstone):
//   * FUN_004049f5's three arguments were dropped; they are pushed as three
//     36-byte `rep movsd` blocks, argument 1 at the LOWEST esp.  Recovered by
//     tracking esp/edi through each call site.
//   * FUN_00404f10's five arguments were dropped as well:
//     (str, x, y, scale, colour).
//   * The `SetRenderState` calls decompile with no arguments: at the top of the
//     frame they are ZWRITEENABLE=0, SRCBLEND=SRCALPHA(5), DESTBLEND=ONE(2);
//     after the 3D pass, ZWRITEENABLE=1.
//   * `_DAT_00412460` is a double (pi/4), not the float Ghidra's cast suggests;
//     likewise 0x4123f0/0x412438/0x412440/0x4124c0/0x412468/0x4124a0/0x4124a8/
//     0x4124b0/0x412470/0x412478/0x412490/0x4120a8 are all qword loads.

import {
  D3DMatrix, D3DTS_WORLD, D3DPT_TRIANGLELIST, FVF_XYZ_DIFFUSE_TEX2,
  D3DRS_ZWRITEENABLE, D3DRS_SRCBLEND, D3DRS_DESTBLEND,
  D3DBLEND_SRCALPHA, D3DBLEND_ONE, D3DTEX_MIPMAP,
} from '../minid3d7.js';
import { createMesh, createCamera, setMeshRotation } from '../kernel.js';

const SKY = 0xff7dafc8;                  // DAT_004b4f64 / fog colour
const FOG_DENSITY = 0.0020000000949949026; // DAT_0041a2ac = 0x3b03126f (fog is OFF here)

// Timing: the original drives everything here from timeGetTime.  The clock is
// ANCHORED to the music position (a constant 120 ms/row — XM speed 6 @ 125 BPM)
// and only the sub-row remainder comes from `extra.ms`, so a single debug frame
// is exact and playback is still smooth per frame rather than per row.
const MS_PER_ROW = 120;
const rawPos = (p) => (p > 0x1ff ? p - 0x200 : p);
const rowOf = (p) => { const r = rawPos(p); return (r >> 8) * 64 + (r & 0xff); };
const SCENE_START_ROW = 2 * 64;          // normalized pos 0x400 == raw 0x200
const DROP_ROW = 3 * 64 + 0x38;          // pos 0x538 — the banner's exit cue

// ---------------------------------------------------------------------------
// The intro's rand(): a 32-bit LCG kept as two 16-bit halves at 0x41a2a4/0x41a2a6.
//   seed = seed * 0x015A4E35 + 1;   value = (seed >>> 16) & 0x7fff
// Initial seed from .data 0x41a2a4 = 0xabf8, 0x41a2a6 = 0x28c9.
// The four generators that run before FUN_00407380 (FUN_0040df90, FUN_004087c0,
// FUN_0040bd10, FUN_00409bb0) consume 32*4096 + 256, 2048*4, 1962 and 0 draws
// respectively, so scene A's generator starts 141482 draws in.
// ---------------------------------------------------------------------------
const RAND_PRESKIP = 32 * 4096 + 256 + 2048 * 4 + 1962;   // 141482

function makeRand(skip) {
  let lo = 0x28c9, hi = 0xabf8;
  const step = () => {
    const l = lo * 0x4e35;
    const carry = ((l & 0xffff) === 0xffff) ? 1 : 0;
    const nlo = ((l & 0xffff) + 1) & 0xffff;
    hi = ((l >>> 16) + hi * 0x4e35 + lo * 0x15a + carry) & 0xffff;
    lo = nlo;
    return hi & 0x7fff;
  };
  for (let i = 0; i < skip; i++) step();
  return step;
}

const INV32767 = 3.0518509475997192e-05;  // *(double*)0x412478 == 1/32767

/** x87 fistp / (int)ROUND — round half to even. */
function rn(x) {
  const f = Math.floor(x), d = x - f;
  if (d < 0.5) return f;
  if (d > 0.5) return f + 1;
  return (f & 1) ? f + 1 : f;
}

// ---------------------------------------------------------------------------
// FUN_0040607f — the 256x256 radial-glow texture.  For each texel at
// (x,y) in [-128,127]^2:  i = round((255 - 2*sqrt(x^2+y^2)) * k); if i > 0 then
// i = (i*i) >> 8; clamp 0..255; pixel = i * 0x10101 - 0x1000000  (= opaque grey).
// ---------------------------------------------------------------------------
function radialGlow(k) {
  const px = new Uint32Array(256 * 256);
  let p = 0;
  for (let y = -128; y < 128; y++) {
    for (let x = -128; x < 128; x++) {
      const r = Math.fround(Math.sqrt(x * x + y * y));
      let i = rn(Math.fround((255.0 - (r + r)) * k));
      if (i > 0) i = (i * i) >> 8;
      if (i < 0) i = 0;
      if (i > 0xff) i = 0xff;
      px[p++] = ((i * 0x10101) - 0x1000000) >>> 0;
    }
  }
  return px;
}

// --- the box (FUN_00407380) -------------------------------------------------
// x, y, z, u0, v0 — diffuse is the literal dword the generator stores.
const BOX_V = [
  -50, 120, -50, 0, 0,
   50, 120, -50, 1, 0,
  -50, 220, -50, 0, 0,
   50, 220, -50, 1, 0,
  -50, 120,  50, 0, 1,
   50, 120,  50, 1, 1,
  -50, 220,  50, 0, 1,
   50, 220,  50, 1, 1,
];
const BOX_I = [
  2, 6, 0, 6, 4, 0, 6, 7, 4, 7, 5, 4, 7, 3, 5, 3, 1, 5,
  3, 2, 1, 2, 0, 1, 0, 4, 1, 4, 5, 1, 3, 7, 2, 7, 6, 2,
];
const BOX_DIFFUSE = 0x3f9681b7;
const BOXES = 200;                       // 20 depth slices x 10 per slice

// --- the 2D design layer ----------------------------------------------------
// xs = the sign with which the horizontal slide offset is applied, ys = +slide.
const YELLOW = 0xffd7b45a;
const OLIVE = 0xffc1a251;
const DESIGN = [
  { c: YELLOW, xs: -1, v: [[29, 287], [257, 287], [328, 410], [29, 410]],
    t: [[0, 1, 2], [2, 3, 0]] },
  { c: YELLOW, xs: 1, v: [[303, 287], [608, 287], [608, 386], [511, 386], [487, 410], [373, 410]],
    t: [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5]] },
  { c: YELLOW, xs: 1, v: [[614, 287], [621, 287], [621, 386], [614, 386]],
    t: [[0, 1, 2], [2, 3, 0]] },
  { c: YELLOW, xs: 1, v: [[511, 392], [621, 392], [621, 410], [511, 410]],
    t: [[0, 1, 2], [2, 3, 0]] },
  { c: OLIVE, xs: -1, v: [[119, 317], [138, 297], [159, 317], [138, 337]],
    t: [[0, 1, 2], [2, 3, 0]] },
  { c: OLIVE, xs: -1, v: [[119, 376], [138, 356], [159, 376], [138, 395]],
    t: [[0, 1, 2], [2, 3, 0]] },
  { c: OLIVE, xs: -1, v: [[91, 347], [110, 327], [129, 347], [110, 366]],
    t: [[0, 1, 2], [2, 3, 0]] },
  { c: OLIVE, xs: -1, v: [[148, 347], [168, 327], [188, 347], [168, 366]],
    t: [[0, 1, 2], [2, 3, 0]] },
];

export function makeScene(ctx, variant = 0) {
  const { K, d3d, textures } = ctx;

  let cam = null, box = null, tex = null;
  let speed = null;      // DAT_005100ac — per-copy sin rate, [0.5, 1.5]
  let baseRz = null;     // DAT_005100e4 — (i % 10) * pi/4
  let posZ = null;       // DAT_005100e0 — the slice depth for each copy
  const V = [[0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0],
             [0, 0, 0, 0, 0, 0, 0, 0, 0]];
  const IDENTITY = new D3DMatrix();
  // one interleaved FVF-0x242 block + index list for all 200 copies of the box
  const batch = new Float32Array(BOXES * 8 * 8);
  const batchU32 = new Uint32Array(batch.buffer);
  const batchIdx = new Uint16Array(BOXES * 36);
  for (let i = 0; i < BOXES; i++) {
    for (let k = 0; k < 36; k++) batchIdx[i * 36 + k] = i * 8 + BOX_I[k];
  }

  // sub-row interpolation: wall-clock ms since the music position last advanced
  let lastPos = -1, lastWall = 0;
  function subRow(pos, extra) {
    // Exact fraction through the current row, measured from the audio clock.
    // The wall-clock reconstruction below is a fallback for the debug path; it
    // re-anchors on pos changes and clamps, which visibly steps during playback.
    if (extra && typeof extra.rowFrac === 'number') return extra.rowFrac * MS_PER_ROW;
    const wall = extra && typeof extra.ms === 'number' ? extra.ms : 0;
    if (pos !== lastPos) { lastPos = pos; lastWall = wall; }
    let f = wall - lastWall;
    if (!(f > 0)) f = 0;
    return f > MS_PER_ROW ? MS_PER_ROW : f;
  }

  function build() {
    const rand = makeRand(RAND_PRESKIP);
    cam = createCamera(0, 0, 0, 0, 0, 0);
    // The per-frame code assigns the eye AFTER K.setCamera, so the original
    // only picks it up on the next frame; the values are constant, so seed them
    // here to make frame 1 identical to every later frame.
    cam.ex = 200.0; cam.ey = -350.0; cam.ez = 50.0;

    // remastered 4x glow when present (assets/remaster/proc_radial_k100.png),
    // otherwise the original 256x256 CPU generator — same flags either way
    const hiGlow = textures && textures.proc_radial_k100;
    tex = hiGlow
      ? d3d.createTextureFromImage(hiGlow, 0 | D3DTEX_MIPMAP)
      : K.createTexture(radialGlow(1.0), 256, 256, 0);

    box = createMesh(8, 12);
    box.flags |= 1;                              // rebuild the rotation per draw
    for (let i = 0; i < 8; i++) {
      const b = i * 8, s = i * 5;
      box.verts[b] = BOX_V[s]; box.verts[b + 1] = BOX_V[s + 1]; box.verts[b + 2] = BOX_V[s + 2];
      box.vertsU32[b + 3] = BOX_DIFFUSE;
      box.verts[b + 4] = BOX_V[s + 3]; box.verts[b + 5] = BOX_V[s + 4];
    }
    box.indices.set(BOX_I);

    speed = new Float32Array(BOXES);
    baseRz = new Float32Array(BOXES);
    posZ = new Float32Array(BOXES);
    let i = 0;
    for (let z = -1000; z < 1000; z += 100) {
      for (let c = 0; c < 10; c++, i++) {
        posZ[i] = z;
        rand();                                        // DAT_005100f0 — unused
        speed[i] = Math.fround(rand() * INV32767 + 0.5);
        baseRz[i] = Math.fround(c * 0.78539816339744828);   // pi/4
      }
    }
  }

  return {
    init() { if (!box) build(); },

    render(pos, extra) {
      if (!box) build();

      // ---- state, verbatim from the head of FUN_004078a0 -------------------
      d3d.setAlphaBlend(1);                                    // FUN_0040484a(5,1)
      d3d.SetRenderState(D3DRS_ZWRITEENABLE, 0);
      d3d.SetRenderState(D3DRS_SRCBLEND, D3DBLEND_SRCALPHA);
      d3d.SetRenderState(D3DRS_DESTBLEND, D3DBLEND_ONE);       // additive
      d3d.setCullMode(0);                                      // FUN_0040484a(3,0)
      if (d3d.clearColor !== SKY) { d3d.clearColor = SKY; d3d.Clear(3, SKY, 1.0); }
      d3d.SetRenderState(34 /* D3DRS_FOGCOLOR */, SKY);
      d3d.SetRenderState(38 /* D3DRS_FOGDENSITY */, FOG_DENSITY);
      d3d.setFog(0);                                           // FUN_0040484a(4,0)

      // ---- clocks ----------------------------------------------------------
      const frac = subRow(pos, extra);
      const row = rowOf(pos);
      const ms = (row - SCENE_START_ROW) * MS_PER_ROW + frac;  // since FUN_00407880
      const T = Math.fround(ms * 0.001);                       // _DAT_005100b4

      // The "kick": 35 units of extra shard height, decaying at 0.05/ms, reset
      // whenever the music position's low nibble hits 4, 6 or 7 — i.e. "how long
      // since the last such row".  (The original starts the scene with the timer
      // 99999 ms in the past, so the very first bar has no kick; here it simply
      // starts in the steady-state pattern.)
      const k = pos & 0xf;
      const back = k >= 7 ? k - 7 : (k >= 6 ? k - 6 : (k >= 4 ? k - 4 : k + 9));
      const kickMs = back * MS_PER_ROW + frac;
      let kick = Math.fround(35.0 - kickMs * 0.05);
      if (kick < 0) kick = 0.0;

      // ---- camera ----------------------------------------------------------
      cam.roll = Math.fround(T * -0.029999999329447746);       // 0x4124c8
      cam.fov = 135.0;
      K.setCamera(cam);
      cam.ez = 50.0; cam.ey = -350.0; cam.ex = 200.0;          // as the original does

      d3d.setStage1Op(0);                                      // FUN_0040484a(1,0)
      K.setTextureHandle(tex);

      // ---- 200 boxes -------------------------------------------------------
      // Batched, exactly as in eff_b.js: the original calls FUN_00402180 (which
      // is SetTransform(WORLD) + DrawIndexedPrimitive) once per copy.  Here each
      // copy's world matrix is applied to its 8 vertices on the CPU and all 200
      // go out in one indexed draw.  The world matrix is still updated at the
      // exact point drawMesh would update it, because FUN_004022a0 deliberately
      // reads the world matrix left over from the PREVIOUS copy (KERNEL_API §4)
      // — that one-copy lag is part of the look and is preserved here.
      const BV = box.verts, BU = box.vertsU32, M = box.m;
      let i = 0, o = 0;
      for (let slice = 0; slice < 20; slice++) {
        const wob = Math.sin(T + slice * 0.2);                 // 0x4124c0
        for (let c = 0; c < 10; c++, i++) {
          const top = Math.fround(Math.sin(T * speed[i]) * 85.0 + 85.0 + kick + 120.0);
          BV[17] = top; BV[25] = top;                          // vertices 2 and 3
          BV[49] = top; BV[57] = top;                          // vertices 6 and 7
          box.rx = 0; box.ry = 0;
          box.rz = Math.fround(wob * 2.5 + baseRz[i]);
          box.px = 0; box.py = 0; box.pz = posZ[i];
          K.meshEnvMapUV(box, cam, 1.0, 1);                    // FUN_004022a0

          // the body of FUN_00402180, minus the draw call
          setMeshRotation(box, box.rx, box.ry, box.rz);        // obj.flags & 1
          M[12] = box.px; M[13] = box.py; M[14] = box.pz;

          for (let v = 0; v < 8; v++) {
            const s = v * 8;
            const x = BV[s], y = BV[s + 1], z = BV[s + 2];
            batch[o] = x * M[0] + y * M[4] + z * M[8] + M[12];
            batch[o + 1] = x * M[1] + y * M[5] + z * M[9] + M[13];
            batch[o + 2] = x * M[2] + y * M[6] + z * M[10] + M[14];
            batchU32[o + 3] = BU[s + 3];
            batch[o + 4] = BV[s + 4]; batch[o + 5] = BV[s + 5];
            batch[o + 6] = BV[s + 6]; batch[o + 7] = BV[s + 7];
            o += 8;
          }
        }
      }
      d3d.SetTransform(D3DTS_WORLD, IDENTITY);
      d3d.DrawIndexedPrimitive(D3DPT_TRIANGLELIST, FVF_XYZ_DIFFUSE_TEX2,
        batch, BOXES * 8, batchIdx, BOXES * 36, 0);

      // ---- 2D design layer -------------------------------------------------
      d3d.setAlphaBlend(0);                                    // FUN_0040484a(5,0)
      d3d.SetRenderState(D3DRS_ZWRITEENABLE, 1);
      K.setTextureHandle(null);

      // horizontal slide-in, 340 px decaying at 150 px/s, and the "vs" scale
      let slide = Math.fround(340.0 - T * 150.0);
      let vsScale = Math.fround(-slide * 10.0);
      if (vsScale < 0.0) vsScale = 0.0;
      else if (vsScale > 175.0) vsScale = 175.0;
      if (slide < 0.0) slide = 0.0;

      // after music pos 0x538 the whole banner slides off the bottom
      let drop = 60.0;
      if (pos >= 0x538) {
        drop = Math.fround(((row - DROP_ROW) * MS_PER_ROW + frac) * 0.2 + 60.0);
      }

      for (const g of DESIGN) {
        for (const t of g.t) {
          for (let n = 0; n < 3; n++) {
            const p = g.v[t[n]], v = V[n];
            v[0] = p[0] + g.xs * slide;
            v[1] = p[1] + drop;
            v[2] = 0.01; v[3] = 100.0; v[4] = g.c;
            v[5] = 0; v[6] = 0; v[7] = 0; v[8] = 0;
          }
          K.drawTri2D(V[0], V[1], V[2]);
        }
      }

      K.drawTextAt('effect', 42.0 - slide, drop + 336.0, 300.0, 0xff000000);
      K.drawTextAt('vs', 295.0, drop + 345.0, vsScale, 0xffffffff);
      K.drawTextAt('design', slide + 381.0, drop + 336.0, 300.0, 0xff000000);
    },
  };
}
