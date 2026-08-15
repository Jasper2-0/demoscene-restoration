// 0x12 title board "please the cookie thing" (08:00 -> 10:00, layer 2).
// Ported from: init FUN_004091b0 (ptct.c 3316), render FUN_004092a0
// (renderfuncs.c 1441), trigger FUN_00409410.
// The decompile's "random flicker" is actually a linear fade-in: the
// disassembly at 0x4092fe..0x40934f shows v = min((now - t0) * 0x41a9a8f,
// 0x41a9a4f) _ftol'ed -> constants read from .rdata: 0.03187499940395355 and
// 255.0 — i.e. the board ramps from black to white over 8000 ticks (2 s).
// colorARGB = v<<16 | v<<8 | v (alpha byte 0; the flat-color pass forces
// alpha 1). Rotation: th = (now - t0) * 0.00015738117508590221;
// rot = (-30 sin th, 30 cos(1.123 th + 2) + 90, -30 cos(1.123 th + 2)).
// Camera pos (10, -70, 10), target 0, fov 160 (0x43200000), roll 45
// (0x42340000). glClear(DEPTH) first — draws over the landscape (layer 1).
// t0 (DAT_0041d2f4) starts -1 and latches getTicks() on the first call;
// per API.md we latch pos.ticks. trigger resets t0 (and a mode word the
// render immediately forces back to 1 — not used by the shipped script).

export function makeEffect(R) {
  let scene = null;
  let board = null;
  // t0 (DAT_0041d2f4) latched getTicks() on the FIRST RENDER EVER, so seeking
  // to 520s and then 490s produced a negative dt. The timeline already computes
  // the layer elapsed (timeline.js: d.elapsed = nowTicks - c.start), which is
  // exactly "ticks since this activation began" — so dt is that, statelessly.
  // `restart` is per-playthrough only and reset() clears it.
  let restart = null;

  return {
    init() {
      scene = R.createScene();
      // FUN_00417400(3, 600.0, ptct.atg) — 4x4-vert flat board
      board = R.genGrid(3, 600.0, R.textures[14]);
      board.cull = 2; // +0x45 = 2
      scene.addObject(board);
      // (the init's uv copy loop is a no-op — verts copied onto themselves)
    },

    // FUN_004092a0
    render(t, pos) {
      R.clearDepth();            // glClear(GL_DEPTH_BUFFER_BIT)
      board.additiveBlend = 1;   // +0x48 = 1
      board.texFxMask = 4;       // +0x44 = 4 (flat color)
      const dt = restart === null ? t : pos.ticks - restart;
      let v = dt * 0.03187499940395355;
      if (v > 255.0) v = 255.0;
      v = Math.trunc(v);
      board.colorARGB = (((v << 8 | v) << 8) | v) >>> 0;
      const th = dt * 0.00015738117508590221;
      const ca = Math.cos(th * 1.123 + 2.0);
      board.setRot(Math.sin(th) * -30.0, ca * 30.0 + 90.0, ca * -30.0);
      const cam = scene.camera;
      cam.target = [0, 0, 0];
      cam.pos = [10, -70, 10];
      cam.fov = 160; // +0x20
      cam.roll = 45; // +0x1c
      R.drawScene(scene);
    },

    // FUN_00409410 — restart the board clock (unused by the shipped script)
    trigger(param, pos) {
      restart = pos.ticks;
    },

    reset() { restart = null; },

    probe: () => ({ restart }),
  };
}
