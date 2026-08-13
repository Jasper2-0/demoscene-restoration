// 0x10 radial-wave pool.
// Port of init FUN_00407780 (ptct.c 2616), render FUN_004078d0
// (renderfuncs.c 1109), trigger FUN_004078b0 (renderfuncs.c 1097 — texture
// switch, unused by the shipped script). Constants read from the binary:
//   _DAT_0041a8a0 = 2500.0 (double, bump amplitude)
//   _DAT_0041a8a8 = 0.00062831852119416 (f32, 2*pi/10000 bump frequency)
//   ambient arg of FUN_00416550 = float 5.808325e-39 = bit pattern 0x003f3f3f
//   (packed 0xRRGGBB grey ambient).
//
// Geometry supersampling (R.tess, integer >= 1; tess=1 == original): the
// cosine bump is analytic, so the grid segment count scales by tess and the
// same y(x,z) formula just samples finer — the baked two-light vertex
// lighting is the visual win. genGrid uvs stay 0..1 across the whole grid at
// any tess, so texture scale and the per-frame uv scroll are unchanged.
export function makeEffect(R) {
  let scene, grid, src;
  return {
    init() {
      const T = Math.max(1, Math.floor(R.tess) || 1);
      scene = R.createScene();
      grid = R.genGrid(9 * T, 10000, R.textures[4]); // 28.atg
      src = R.genGrid(9 * T, 10000, null);           // uv source, tex = 0
      src.drawMode = 0;                            // hidden
      // baked radial bump on the visible grid only:
      // y = 2500 - cos(sqrt(x^2+z^2) * 6.2831852e-4) * 2500
      for (let i = 0; i < grid.nVerts; i++) {
        const x = grid.verts[i * 3], z = grid.verts[i * 3 + 2];
        const c = Math.cos(Math.sqrt(z * z + x * x) * 0.00062831852119416);
        grid.verts[i * 3 + 1] = 2500.0 - c * 2500.0;
      }
      scene.addObject(grid);
      scene.addObject(src);
      scene.camera.fov = 130;                      // 0x43020000
      scene.addLight(0, 0, 0, 7000, 0xffffff);
      scene.addLight(0, 0, 0, 3000, 0xffffff);
      R.computeVertexLighting(scene, 0x3f3f3f);    // baked once at init
    },

    // FUN_004078d0 — t in ticks
    render(t) {
      const cam = scene.camera;
      cam.pos[0] = 0; cam.pos[1] = 5000; cam.pos[2] = 0; // 0x459c4000, straight down
      // camera target stays at the default (0,0,0)
      cam.roll = t * 0.011111111;
      const du = t * 6.666667e-5;
      const dv = t * 6.169031e-5;
      const A = grid.uvs, B = src.uvs;
      for (let f = 0; f < grid.nFaces; f++) {
        const o = f * 6;
        A[o] = du + B[o];         A[o + 1] = dv + B[o + 1];
        A[o + 2] = du + B[o + 2]; A[o + 3] = dv + B[o + 3];
        A[o + 4] = du + B[o + 4]; A[o + 5] = dv + B[o + 5];
      }
      R.drawScene(scene);
    },

    // FUN_004078b0: objects[0].tex = texture table[param] (script never sends it)
    trigger(param) {
      const tex = R.textures[param & 0xffff];
      if (tex) grid.tex = tex;
    },
  };
}
