// 0x1C streak field (32:00 -> end, layer 3).
// Ported from: init FUN_004025c0 (ptct.c 591), render FUN_00402a50
// (renderfuncs.c 419), drawMode 0x20 callback FUN_00402750 (renderfuncs2.c
// 236). The callback decompile is register-garbled; the body below was
// re-derived from the disassembly of PTCT_unpacked.exe at 0x402750.
// Constants read from .rdata:
//   0x41a4f8=0.625f 0x41a4f4=7.6923076e-5f 0x41a4f0=3.0f   (global fade K)
//   0x41a4e8=4.0 0x41a4e0=10.0                              (quad size w)
//   0x41a4d8=0.033333335f 0x41a4d0=0.011904762 (1/84)       (color ramps)
//   0x41a4c8=0.0021123 0x41a4c0=0.002 0x41a4b8=0.0026123 0x41a4b0=0.002443
//   0x41a430=0.1 (T scale) 0x41a460=0.01 0x41a308=0.5 0x41a420=0.05
// Structure per the binary: **20 groups x 64 quads** (loop bounds 0x41d5f8..
// 0x41d738 step 0x10, and the init fills 20 param groups at 0x41d5f0..0x41d730
// right up against the 64-entry X table at 0x41d730) — EFFECTS.md's "4 groups"
// is a decompile misreading.
// Init random tables use the MSVC CRT rand() (call 0x41896e) in this exact
// order: 64 x (X, Y) pairs, then 20 x (ax, ay, f1, f2).

import { rand } from '../scene.js';
import { ensurePlasmaTexture } from './eff13_credits.js';

export function makeEffect(R) {
  let scene = null;
  let plasmaTex = null;
  // DAT_0041d730 / DAT_0041d830 — 64 xy jitter offsets in (-25, 25)
  const X = new Float32Array(64);
  const Y = new Float32Array(64);
  // DAT_0041d5f0.. — 20 groups of {int ax, int ay, float f1, float f2}
  const groups = [];
  const state = { layerT: 0, ticks: 0 }; // DAT_0041d930 / getTicks()

  // FUN_00402750 — the drawMode 0x20 callback.
  function drawStreaks() {
    const mgl = R.mgl, gl = R.gl;

    // global brightness K = clamp(3 - layerT*0.625*7.6923e-5, 0, 1):
    // full for ~10.4 s, then the end-of-demo fade to black by 15.6 s.
    let K = 3.0 - state.layerT * 0.625 * 7.69230755395256e-5;
    if (K > 1.0) K = 1.0; else if (K < 0.0) K = 0.0;

    mgl.bindTexture(plasmaTex);
    mgl.enableTexture(true);
    mgl.enableDepthTest(false);
    mgl.enableBlend(true);
    gl.blendFunc(gl.ONE, gl.ONE);

    // T from the GLOBAL demo clock (FUN_004119d0), not the layer timer
    const T = state.ticks * 0.1;
    const w = Math.sin(T * 0.001) * 4.0 + 10.0; // quad size 6..14
    const HW = w * 0.5;
    const W = Math.trunc(w); // _ftol'ed once, used for all 4 corners

    mgl.begin(mgl.QUADS);
    for (let g = 0; g < 20; g++) {
      const P = groups[g];
      const PH = g * 0x2851; // per-group phase offset 10321
      const GT = g * 1000;
      const GC = g * 0.03333333507180214;
      for (let i = 0; i < 64; i++) {
        mgl.color4(
          (i * 0.011904761904761904 + GC) * K,
          (i * 0.011904761904761904 + 0.2) * K,
          (i * 0.01 + 0.5) * K,
          1,
        );
        const A1 = 9 * i + PH + T; // fast modulation phase
        const A2 = 7 * i + GT + T;
        const A3 = 5 * i + GT + T;
        const x = Math.sin(A2 * 0.0021123) * Math.sin(A1 * P.f1 * 0.002) * P.ax
          + X[i] - HW;
        const y = Math.cos(A3 * 0.0026123) * Math.cos(A1 * P.f2 * 0.002443) * P.ay
          + Y[i] - HW;
        mgl.texCoord2(0, 0); mgl.vertex3(x, y + W, 0);
        mgl.texCoord2(1, 0); mgl.vertex3(x + W, y + W, 0);
        mgl.texCoord2(1, 1); mgl.vertex3(x + W, y, 0);
        mgl.texCoord2(0, 1); mgl.vertex3(x, y, 0);
      }
    }
    mgl.end();
    mgl.enableBlend(false);
    mgl.enableDepthTest(true);
    mgl.color4(1, 1, 1, 1);
  }

  return {
    init() {
      plasmaTex = ensurePlasmaTexture(R); // DAT_0041e968 (built by eff13 init)
      scene = R.createScene();
      const mesh = R.newMesh(0, 0, null); // FUN_00416770(this,0,0,0)
      mesh.cull = 2;        // +0x45 = 2
      mesh.drawMode = 0x20; // +0x40 = 0x20
      scene.addObject(mesh);
      R.setDrawCallback(0x20, drawStreaks);

      // CRT rand() in exact original order:
      for (let i = 0; i < 64; i++) {
        X[i] = (rand() % 1000 - 500) * 0.05;
        Y[i] = (rand() % 1000 - 500) * 0.05;
      }
      for (let g = 0; g < 20; g++) {
        const ax = rand() % 0xf0;
        const ay = rand() % 0xf0;
        const f1 = Math.fround((rand() % 1000) * 0.0005 + 0.5); // 0.5..1.0
        const f2 = Math.fround((rand() % 1000) * 0.0005 + 0.5);
        groups.push({ ax, ay, f1, f2 });
      }
    },

    // FUN_00402a50 — stores t (DAT_0041d930), camera (0,0,200) -> origin
    render(t, pos) {
      state.layerT = t;
      state.ticks = pos.ticks;
      const cam = scene.camera;
      cam.pos = [0, 0, 200]; // 0x43480000
      cam.target = [0, 0, 0];
      R.drawScene(scene);
    },
  };
}
