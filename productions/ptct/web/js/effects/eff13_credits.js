// 0x13 credits pixel-spray.
// Ported from: init FUN_00406140 (ptct.c 2198), render FUN_00406660
// (renderfuncs.c 953), drawMode 0x10 callback FUN_00406280 (renderfuncs2.c 80).
// The callback decompile is register-garbled; the whole body was re-derived
// from the disassembly of PTCT_unpacked.exe at 0x406280 (see report), and all
// _DAT_ constants were read from .rdata:
//   0x41a844 = 1.1363636e-4 (image-cycle rate), 0x41a340 = 0.5, 0x41a840 = 13,
//   0x41a83c = 2.0 (crossfade period), 0x41a838 = 3.030303e-5 (jitter phase),
//   0x41a830 = 127.0 (d), 0x41a828 = 128.0 (d), 0x41a824 = 128.0 (quad recenter).
// Plasma texture FUN_00401ca0 (ptct.c 408) with helpers — NOTE the decompile
// dropped arguments: the real call (disasm 0x406181) is
// FUN_00401ca0(buf, 0x2d, 4, 0x32, 0x64, 0x14) and the function reads the
// 4th arg (0x32 = 50) as the wide-gaussian weight (K04 = 50*0.01 = 0.5);
// args 5/6 are pushed but never read. Helpers:
// FUN_00401ef0 / FUN_00401f40; constants 0x41a460=0.01 0x41a458=0.001
// 0x41a450=0.2 0x41a448=pi 0x41a440=5.0 0x41a438=5.411268064417877
// 0x41a430=0.1 0x41a428=0.4 0x41a420=0.05 0x41a418=1.0 0x41a410=255.0
// 0x41a408=0.0 0x41a310=1.0 0x41a468=2^-30 (all doubles unless noted).
// The GL upload (FUN_00412300) uses GL_BGRA_EXT on the little-endian ARGB
// ints, so channel order below is already correct (no R/B swap).

const INV256 = 1 / 256; // engine color unpack scale (FUN_00418830)

// FUN_00401f40 — integer hash noise, all 32-bit int math, result in (-1, 1].
function noiseHash(i) {
  const a = Math.imul(i, 0x47);
  const h = (a ^ (a << 13)) | 0; // i*0x47 ^ i*0x8e000
  let e = (Math.imul(Math.imul(h, h), 0x3d73) + 0xc0ae5) | 0;
  e = (Math.imul(e, h) - 0x2df722f3) | 0;
  e = e & 0x7fffffff;
  return 1.0 - e * 9.313225746154785e-10; // 1 - e/2^30
}

// FUN_00401ef0 — 1D value noise (lerp between integer lattice hashes)
function noise1d(v) {
  const i = Math.floor(v);
  const n0 = noiseHash(i | 0);
  const n1 = noiseHash((i + 1) | 0);
  return (v - i) * (n1 - n0) + n0;
}

// FUN_00401ca0(buf, p2=0x2d, p3=4, p4=0x32) — 256x256 radial plasma with
// value-noise spoke modulation: a wide soft white gaussian blob (V1) + a
// sharp orange-tinted core (E2) + noisy spokes (W). Returns RGBA bytes
// (alpha forced 255; the original wrote 0x00RRGGBB and alpha is never used —
// both effects draw it with ONE,ONE).
export function makePlasmaRGBA(p2 = 0x2d, p3 = 4, p4 = 0x32) {
  const D3 = (p2 & 0xff) * 0.01;   // 0.45  — core exp falloff
  const D4 = (p3 & 0xff) * 0.001;  // 0.004 — wide gaussian falloff
  const K04 = (p4 & 0xff) * 0.01;  // 0.5   — gaussian weight (x2 below -> 1.0)
  const K96 = 1.0 - K04;           // 0.5   — core weight
  const buf = new Uint8Array(256 * 256 * 4);
  let o = 0;
  // outer loop: y = 128 down to -127 (row 0 <-> y=128); inner x: fx = x-128
  for (let ly = 0x80; ly > -0x80; ly--) {
    const y2 = ly * ly;
    for (let xi = 0; xi < 256; xi++) {
      const fx = xi - 128;
      const r = Math.sqrt(fx * fx + y2);
      const q = r * 0.2;
      const V1 = 2 * K04 * Math.exp(-(q * q) * D4);     // wide soft blob
      const ang = Math.atan2(fx, ly) + Math.PI;         // fpatan(fx, y) + pi
      const N = noise1d(ang * 5.0);
      const X = (ang * 5.411268064417877 + N + 1.0) % 1.0; // _CIfmod(.., 1)
      const W = Math.pow(Math.abs((X - 0.5) * 2), 5);   // sharp noisy spokes
      const E2 = Math.exp(-q * D3) * K96;               // hot core
      const WA = W * 0.1;
      let cr = V1 + E2 + WA;        if (cr > 1) cr = 1;
      let cg = V1 + E2 * 0.4 + WA;  if (cg > 1) cg = 1; // orange tint
      let cb = V1 + W * 0.05;       if (cb > 1) cb = 1;
      let M = 255 - 2 * r;          if (M < 0) M = 0;   // edge-black envelope
      buf[o] = Math.trunc(cr * M);
      buf[o + 1] = Math.trunc(cg * M);
      buf[o + 2] = Math.trunc(cb * M);
      buf[o + 3] = 255;
      o += 4;
    }
  }
  return buf;
}

// DAT_0041e968 — one plasma texture shared by eff13 and eff1C (the original
// guards creation with `if (DAT_0041e974 == 0)` in eff13's init; eff1C's
// callback just binds the same global).
const plasmaTexCache = new WeakMap();
export function ensurePlasmaTexture(R) {
  let tex = plasmaTexCache.get(R);
  if (!tex) {
    tex = R.makeTextureFromRGBA(makePlasmaRGBA(0x2d, 4, 0x32), 256, 256);
    plasmaTexCache.set(R, tex);
  }
  return tex;
}

export function makeEffect(R) {
  let scene = null;
  let plasmaTex = null;
  const state = { t: 0 }; // DAT_0041e964 — elapsed layer ticks, set by render

  // FUN_00406280 — drawMode 0x10 callback (re-derived from disassembly).
  // 11000 additive 10x10 plasma quads at jittered positions; each samples the
  // raw ARGB pixels of the current & next credit image (7..13, 13 = blank)
  // and is colored by their crossfaded texel. z = (float)(int)DAT_0041e978,
  // a never-written BSS global -> 0.
  function drawSpray() {
    const mgl = R.mgl, gl = R.gl;
    mgl.bindTexture(plasmaTex);
    mgl.enableTexture(true);
    mgl.enableDepthTest(false);
    mgl.enableBlend(true);
    gl.blendFunc(gl.ONE, gl.ONE);

    const t = state.t;
    // image cycle: X advances 1.0 per 8800 ticks (2.2 s); images swap every
    // 2.0 of X; crossfade ramps over the first 1.0 then holds.
    const X = t * 0.00011363636440364644;
    const v = Math.trunc(X * 0.5 + 13.0);
    const curIdx = (v % 7) + 7;
    const nextIdx = ((v % 7) + 1) % 7 + 7;
    let f = X;
    while (f > 2.0) f -= 2.0;
    if (f > 1.0) f = 1.0;
    const wNext = f, wCur = 1.0 - f;
    // index 13 is the freed "blank" slot -> black (API.md note)
    const cur = curIdx === 13 ? null : R.rawPixels[curIdx];
    const next = nextIdx === 13 ? null : R.rawPixels[nextIdx];
    const curD = cur ? cur.data : null;
    const nextD = next ? next.data : null;

    const ph = t * 3.030303014384117e-5;
    const rt = R.randomTable;

    mgl.begin(mgl.QUADS);
    for (let i = 0; i < 11000; i++) {
      // fx from a smooth swirl, fy pseudo-random via the startup random table
      // (32-bit wrap of randomTable[i&0xff]*i, taken as unsigned)
      const fx = Math.sin(i + ph) * 127.0 + 128.0;
      const fy = Math.cos((Math.imul(rt[i & 0xff], i) >>> 0) + ph) * 127.0 + 128.0;
      const idx = ((Math.trunc(fy) << 8) + Math.trunc(fx)) * 4;
      let r1 = 0, g1 = 0, b1 = 0, r2 = 0, g2 = 0, b2 = 0;
      if (curD) { r1 = curD[idx]; g1 = curD[idx + 1]; b1 = curD[idx + 2]; }
      if (nextD) { r2 = nextD[idx]; g2 = nextD[idx + 1]; b2 = nextD[idx + 2]; }
      // original skips when both 32-bit ARGB words are 0; we test the RGB
      // bytes (alpha of our PNG readback is 255 everywhere) — visually
      // identical since rgb-black quads add nothing.
      if ((r1 | g1 | b1 | r2 | g2 | b2) === 0) continue;
      // crossfade with the original's double truncation (two _ftol calls)
      const rr = Math.trunc(Math.trunc(r1 * wCur) + r2 * wNext);
      const gg = Math.trunc(Math.trunc(g1 * wCur) + g2 * wNext);
      const bb = Math.trunc(Math.trunc(b1 * wCur) + b2 * wNext);
      mgl.color4(rr * INV256, gg * INV256, bb * INV256, 1);
      const qx = 128.0 - fx, qy = 128.0 - fy; // DAT_0041a824 = 128 recenter
      mgl.texCoord2(0, 0); mgl.vertex3(qx, qy + 10, 0);
      mgl.texCoord2(1, 0); mgl.vertex3(qx + 10, qy + 10, 0);
      mgl.texCoord2(1, 1); mgl.vertex3(qx + 10, qy, 0);
      mgl.texCoord2(0, 1); mgl.vertex3(qx, qy, 0);
    }
    mgl.end();
    // leave tidy state (drawMesh/overlays reset their own; harmless)
    mgl.enableBlend(false);
    mgl.enableDepthTest(true);
    mgl.color4(1, 1, 1, 1);
  }

  return {
    init() {
      plasmaTex = ensurePlasmaTexture(R);
      scene = R.createScene();
      // FUN_00417140(0x14, 1000.0, plasma) — placeholder sphere, never drawn
      // as geometry (drawMode 0x10 = callback only), cull off.
      const mesh = R.genSphere(0x14, 1000.0, plasmaTex);
      mesh.cull = 2;        // +0x45 = 2
      mesh.drawMode = 0x10; // +0x40 = 0x10
      scene.addObject(mesh);
      scene.camera.fov = 100; // camera +0x20 = 0x42c80000
      R.setDrawCallback(0x10, drawSpray);
      // NOTE: the original also samples 64 plasma texels into a heap table
      // (DAT_0041e974) — that table is never read anywhere; skipped.
    },

    // FUN_00406660 — t in layer ticks
    render(t /* , pos */) {
      state.t = t; // DAT_0041e964
      const cam = scene.camera;
      cam.pos = [
        Math.cos(t * 5.5555556e-5) * 60.0,
        Math.sin(t * 6.57419e-5) * 30.0,
        Math.cos(t * 5.2631578e-5) * 10.0 - 120.0,
      ];
      cam.target = [5, 0, 0];
      R.drawScene(scene);
    },
  };
}
