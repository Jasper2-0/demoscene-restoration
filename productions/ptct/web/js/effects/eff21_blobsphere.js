// 0x21 pulsating cos-blob sphere.
// Ported from: init FUN_00401a80 (ptct.c 356), render FUN_00401b70
// (renderfuncs.c 112). See EFFECTS.md eff21.
//
// genSphere(35, 100, 31.atg), detail pass with 31.atg, dynamic. Base verts
// are snapshotted at init (DAT_0041d5ec); each frame every vertex is scaled by
// 0.6*(1.5 + 3*0.2439*(cos(x/R+phi)+cos(y/R+phi)+cos(z/R+phi))) with
// R = 30+20*sin(t*1e-4), phi = t*3.3333e-4.
//
// Geometry supersampling (R.tess): the deformation is a purely analytic
// per-vertex function of the base sphere position, so a denser genSphere
// (35*tess) refines the surface through the exact same formula — the render
// loop already runs over mesh.nVerts and the base snapshot. tess=1 is the
// untouched original call (genSphere(0x23, 100)).
export function makeEffect(R) {
  let scene = null;
  let mesh = null;
  let base = null; // DAT_0041d5ec — base vertex snapshot

  return {
    init() {
      const tess = Math.max(1, Math.floor(R.tess || 1));
      scene = R.createScene();
      mesh = R.genSphere(0x23 * tess, 100.0, R.textures[0]); // 35x35 (x tess), tex 31.atg
      mesh.texFxMask = 1;              // +0x44 = 1 → detail/lightmap pass
      mesh.detailTex = R.textures[0];  // +0x4c = 31.atg
      mesh.dynamic = 1;                // +0x46
      scene.addObject(mesh);
      base = mesh.verts.slice();
    },

    // t = elapsed ticks on this layer (0.25 ms each)
    render(t) {
      // FUN_00401b70
      const rad = Math.sin(t * 0.0001) * 20.0 + 30.0;
      const phi = t * 0.00033333333;
      const V = mesh.verts;
      for (let i = 0; i < mesh.nVerts; i++) {
        const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
        // original sums cos(z/..)+cos(y/..)+cos(x/..); order irrelevant
        const s = ((Math.cos(x / rad + phi) + Math.cos(y / rad + phi) +
                    Math.cos(z / rad + phi)) * 3.0 * 0.24390243902439027 + 1.5) * 0.6;
        V[i * 3] = s * x;
        V[i * 3 + 1] = s * y;
        V[i * 3 + 2] = s * z;
      }
      mesh.normalsValid = false;
      mesh.setRot(t * 0.016666668, t * 0.02, t * 0.011111111);
      scene.camera.pos = [0, 0, 225.0];  // 0x43610000
      scene.camera.target = [0, 0, 0];   // camera ctor default, never changed
      R.drawScene(scene);
    },
  };
}
