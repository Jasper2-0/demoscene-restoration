// 0x1E rotating-rings bounce (26:00 -> 27:127, layer 1).
// Ported from: init FUN_00407470 (ptct.c 2561), render FUN_00407570
// (renderfuncs2.c 7, cross-checked against the disassembly at 0x407570).
// Init per the binary: **22** concentric spheres genSphere(5, r) with
// r = 500..3650 step 150 (loop bound 0xed8=3800; pointer table
// DAT_0041e990..0x41e9e8 = 22 entries — EFFECTS.md's "12 rings ..2150" is a
// miscount), textures alternating 18.atg (index 5) / 31.atg (index 0),
// additive blend, colorARGB 0x01f1f1f5 / 0x5f5f5f5f, texFxMask 4 (flat
// color), scene "tilted" flag -> gluLookAt up=(1,1,1).
// Render constants from .rdata: roll 0x41a898=0.014285714f; ring phase step
// 200 ticks, angle scale 0x41a890=1e-4 (d); rotation amplitudes
// 0x41a880=250 0x41a884=208 0x41a888=331 (signed 4th powers on X/Y, plain
// cos on Z). Beat pulse: while (row & 0xf) == 0 latch DAT_0041e988 = t;
// dt = min(t - latch, 25600 [0x41a878d]); v = max(100, trunc(255 [0x41a410d]
// - dt*0.1 [0x41a430d])) — v is both the grey ring brightness (v in all 4
// colorARGB bytes) and the camera slam: during order 26 rows (row&0x1f)<16
// and order 27 rows row<16, camera pos y = (v*5 - 100)*10 (else 4200).

export function makeEffect(R) {
  let scene = null;
  const rings = [];
  let latch = 0; // DAT_0041e988 (BSS -> 0.0)

  // signed 4th power: v^4 with the sign of v (fmul chain at 0x4075d0/0x4075f3)
  function sp4(v) {
    const p = v * v * v * v;
    return v >= 0 ? p : -p;
  }

  return {
    init() {
      scene = R.createScene();
      let odd = false; // bVar3
      for (let r = 500; r < 0xed8; r += 150) {
        const mesh = R.genSphere(5, r, R.textures[odd ? 0 : 5]);
        mesh.additiveBlend = 1; // +0x48 = 1
        mesh.colorARGB = odd ? 0x5f5f5f5f : 0x01f1f1f5;
        mesh.texFxMask = 4;     // +0x44 = 4
        scene.addObject(mesh);
        rings.push(mesh);
        odd = !odd;
      }
      scene.tilted = true; // scene +0x10 = 1 -> up = (1,1,1)
    },

    // FUN_00407570 — t in layer ticks, pos = latency-compensated music pos
    render(t, pos) {
      const cam = scene.camera;
      cam.pos = [0, 4200, 0]; // 0x45834000
      cam.target = [0, 0, 0];
      cam.roll = t * 0.014285714365541935;

      for (let i = 0; i < rings.length; i++) {
        const s = (t + 200 * i) * 1e-4;
        const sn = Math.sin(s), cs = Math.cos(s);
        rings[i].setRot(sp4(sn) * 250.0, sp4(cs) * 208.0, cs * 331.0);
      }

      const row = pos.row & 0xff;
      if ((row & 0xf) === 0) latch = t; // re-latches every frame on rows 0/16/32/48
      let dt = t - latch;
      if (dt > 25600.0) dt = 25600.0;
      let v = Math.trunc(255.0 - dt * 0.1);
      if (v < 100) v = 100;

      if ((row & 0x1f) < 0x10 && pos.order === 0x1a) {
        cam.pos = [0, (v * 5 - 100) * 10, 0];
      }
      if (row < 0x10 && pos.order === 0x1b) {
        cam.pos = [0, (v * 5 - 100) * 10, 0];
      }

      const c = (((((v << 8) | v) << 8) | v) << 8 | v) >>> 0;
      for (const m of rings) m.colorARGB = c;

      R.drawScene(scene);
    },
  };
}
