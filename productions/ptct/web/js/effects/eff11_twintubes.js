// 0x11 twin warped tri-tubes.
// Port of init FUN_00405e70 (ptct.c 2156) and render FUN_00405f80
// (renderfuncs.c 887). Two genTube(26, 3, 300, 5000, 31.atg); obj0 visible
// (cull=1, fog 600, detail pass with 31.atg), obj1 hidden uv/vertex source;
// obj0 is added to the scene TWICE (drawn twice => double-bright detail).
//
// Geometry supersampling (R.tess, integer >= 1; tess=1 == original): the
// tube wall is analytic — verts-around scales 26→26T and the 2 ring spans
// become 2T (rings = 2T+1), so the per-vertex sine warp just evaluates at
// finer samples. genTube uvs are 0..1 around/along at any density, so the
// "*4 − phi" v-scroll keeps identical texture scale and speed.
export function makeEffect(R) {
  let scene, tube, srcTube;
  return {
    init() {
      const T = Math.max(1, Math.floor(R.tess) || 1);
      scene = R.createScene();
      tube = R.genTube(26 * T, 2 * T + 1, 300, 5000, R.textures[0]); // 0x1a around, 3 rings
      scene.addObject(tube);
      srcTube = R.genTube(26 * T, 2 * T + 1, 300, 5000, R.textures[0]);
      scene.addObject(srcTube);
      tube.cull = 1;                   // +0x45 = 1
      tube.fogDist = 600;              // 0x44160000 (fog color stays 0 = black)
      tube.texFxMask = 1;              // +0x44 = 1 detail pass
      tube.detailTex = R.textures[0];  // +0x4c = 31.atg
      srcTube.drawMode = 0;            // hidden source
      scene.addObject(tube);           // re-added: scene = [obj0, obj1, obj0]
      scene.camera.fov = 110;          // 0x42dc0000, set once at init
    },

    // FUN_00405f80 — t in ticks
    render(t) {
      const cam = scene.camera;
      const T = Math.fround(t * 1.7);  // fVar1 = (float)(param_1 * 1.7)
      // NOTE: the first sine is computed from the unrounded product, the other
      // two from the float32-rounded T — mirrored from the original FPU code.
      const s1 = Math.sin(t * 1.7 * 0.000125);
      const s2 = Math.sin(T * 0.00011111111);
      const c3 = Math.cos(T * 7.6923076e-5);
      cam.target[0] = s1 * 100; cam.target[1] = s2 * 100; cam.target[2] = c3 * 100;
      cam.pos[0] = -(s1 * 100); cam.pos[1] = -(s2 * 100); cam.pos[2] = -(c3 * 100);
      cam.roll = -T * 0.005882353;
      const phi = t * 0.0005;
      // uv v = source v * 4 - phi (u untouched)
      const A = tube.uvs, B = srcTube.uvs;
      for (let f = 0; f < tube.nFaces; f++) {
        const o = f * 6;
        A[o + 1] = B[o + 1] * 4 - phi;
        A[o + 3] = B[o + 3] * 4 - phi;
        A[o + 5] = B[o + 5] * 4 - phi;
      }
      // vertex warp from the pristine source verts
      const V = tube.verts, S = srcTube.verts;
      for (let i = 0; i < tube.nVerts; i++) {
        const o = i * 3;
        const x = S[o], z = S[o + 2];
        const wz = Math.sin(x * 0.005882353 + z * 0.01 + phi);        // 1/170, 1/100
        const wx = Math.sin(z * 0.008333334 + x * 0.0076923077 + phi); // 1/120, 1/130
        V[o] = (wx * 0.35 + 1.0) * x;
        V[o + 2] = (wz * 0.35 + 1.0) * z;
      }
      R.drawScene(scene);
    },
  };
}
