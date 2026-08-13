// 0x0D lightgrid floor + ceiling.
// Port of init FUN_004066f0 (ptct.c 2260), render FUN_004069c0
// (renderfuncs.c 1003), trigger FUN_00406960 (renderfuncs.c 978 — texture /
// speed switch, unused by the shipped script). _DAT_0041a374 = 6.0 (source
// uv mult, read from the binary). The 9 light orbit radii come from the
// startup random table DAT_0041f834[0..8] (R.randomTable).
//
// Geometry supersampling (R.tess, integer >= 1; tess=1 == original): the
// floor/ceiling planes are analytic — segment counts scale 15→15T. genGrid
// uvs are 0..1 across the plane at any density, so the ×6 source mult and
// the per-frame uv scroll keep identical texture scale/speed. The win is the
// per-frame 9-light vertex lighting resolving on a finer lattice.
export function makeEffect(R) {
  let scene, floor, ceil, srcF, srcC;
  let speed = 5000.0; // this+4 = 0x459c4000
  return {
    init() {
      const T = Math.max(1, Math.floor(R.tess) || 1);
      scene = R.createScene();
      const tex = R.textures[5];                    // DAT_0041d94c = 18.atg
      floor = R.genGrid(15 * T, 600, tex);
      scene.addObject(floor);
      ceil = R.genGrid(15 * T, 600, tex);
      scene.addObject(ceil);
      floor.cull = 2;                               // +0x45 = 2 (off)
      ceil.cull = 2;
      floor.setPos(0, -20, 0);                      // 0xc1a00000
      ceil.setPos(0, 20, 0);                        // 0x41a00000
      srcF = R.genGrid(15 * T, 600, tex);
      scene.addObject(srcF);
      srcC = R.genGrid(15 * T, 600, tex);
      scene.addObject(srcC);
      srcF.drawMode = 0;                            // hidden uv sources
      srcC.drawMode = 0;
      for (let i = 0; i < srcF.nFaces * 6; i++) {
        srcF.uvs[i] *= 6;
        srcC.uvs[i] *= 6;
      }
      // floor vertex colors forced to white (already the ctor default)
      for (let i = 0; i < floor.nVerts; i++) {
        floor.colors[i * 4] = 1; floor.colors[i * 4 + 1] = 1; floor.colors[i * 4 + 2] = 1;
      }
      for (let i = 0; i < 9; i++) scene.addLight(0, 0, 0, 60, 0xffffff);
    },

    // FUN_004069c0 — t in ticks
    render(t) {
      const du = t / (speed * 1.5);
      const dv = t / (speed * 0.66);
      const F = floor.uvs, C = ceil.uvs, SF = srcF.uvs, SC = srcC.uvs;
      for (let f = 0; f < floor.nFaces; f++) {
        const o = f * 6;
        F[o] = du + SF[o];         F[o + 1] = dv + SF[o + 1];
        F[o + 2] = du + SF[o + 2]; F[o + 3] = dv + SF[o + 3];
        F[o + 4] = du + SF[o + 4]; F[o + 5] = dv + SF[o + 5];
        C[o] = du + SC[o];         C[o + 1] = dv + SC[o + 1];
        C[o + 2] = du + SC[o + 2]; C[o + 3] = dv + SC[o + 3];
        C[o + 4] = du + SC[o + 4]; C[o + 5] = dv + SC[o + 5];
      }
      const th = t / speed;
      const sn = Math.sin(th), c2 = Math.cos(th + 2), cs = Math.cos(th);
      const cam = scene.camera;
      cam.pos[0] = sn * -4; cam.pos[1] = c2 * -4; cam.pos[2] = cs * -4;
      cam.target[0] = sn * 100; cam.target[1] = c2 * 100; cam.target[2] = cs * 100;
      cam.fov = 140;                                // 0x430c0000
      cam.roll = t * 0.005;
      // 9 orbiting lights; radius doubles as the phase offset
      for (let i = 0; i < 9; i++) {
        const rad = (R.randomTable[i] & 0x7f) + 10;
        const ang = rad + t * 0.00066666666;
        const s = Math.sin(ang);
        const L = scene.lights[i];
        L.pos[0] = rad * s;
        L.pos[1] = s * 20;
        L.pos[2] = rad * Math.cos(ang);
      }
      R.computeVertexLighting(scene, 0);            // per-frame, ambient 0
      R.drawScene(scene);
      R.clearDepth();                               // glClear(GL_DEPTH_BUFFER_BIT)
    },

    // FUN_00406960 (never sent by the shipped script)
    trigger(param) {
      param &= 0xffff;
      if (param < 0x10) {
        const tex = R.textures[param];
        if (tex) { ceil.tex = tex; floor.tex = ceil.tex; }
      }
      if (param === 0x10) speed = 12000.0;          // 0x463b8000
      if (param === 0x11) speed = 6000.0;           // 0x45bb8000
    },
  };
}
