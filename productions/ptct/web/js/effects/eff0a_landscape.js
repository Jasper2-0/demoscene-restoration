// 0x0A landscape flyover (heightfield + sky sphere).
// Port of init FUN_00401490 (ptct.c 125) and render FUN_004016e0
// (renderfuncs.c 78). Constants read from the binary:
//   _DAT_0041a378 = 8.0 (grid uv mult), _DAT_0041a374 = 6.0 (sky uv mult).
// Height loop (disassembled at 0x4015b9..0x4016b6, the decompile lost the
// ftol argument): h = ftol(sqrt(x*x + z*z)); if (h < 400) h /= 2;
//   third = h/3; y = rand31() % (third/2 + 1) + third*2   (all int math,
// rand31 = engine LCG FUN_004119a0 — consumed once per vertex at init).
//
// NOTE: this effect deliberately IGNORES R.tess (user-validated: original
// tessellation kept, the remaster carries via the 4x texture set). The
// random height lattice IS the artwork — the rand31 stream below must stay
// exactly 961 calls in this order (other effects share the stream).
import { rand31 } from '../scene.js';

export function makeEffect(R) {
  let scene, grid, sky;
  return {
    init() {
      scene = R.createScene();
      grid = R.genGrid(30, 3000, R.textures[3]);      // FUN_00417400(0x1e, 3000, snq_steen2)
      scene.addObject(grid);
      sky = R.genSphere(13, 5500, R.textures[13]);    // FUN_00417140(0xd, 5500, lucht)
      scene.addObject(sky);

      // grid: detail pass with 31.atg, uv * 8
      grid.texFxMask = 1;             // +0x44 = 1
      grid.detailTex = R.textures[0]; // +0x4c = DAT_0041d938 (31.atg)
      for (let i = 0; i < grid.nFaces * 6; i++) grid.uvs[i] *= 8;

      // per-vertex blocky random heights
      for (let i = 0; i < grid.nVerts; i++) {
        const x = grid.verts[i * 3], z = grid.verts[i * 3 + 2];
        let h = Math.trunc(Math.sqrt(x * x + z * z)); // _ftol truncates
        if (h < 400) h = (h / 2) | 0;
        const third = (h / 3) | 0;
        grid.verts[i * 3 + 1] = rand31() % (((third / 2) | 0) + 1) + third * 2;
      }

      // sky: inverted cull, uv * 6
      sky.cull = 1;                   // +0x45 = 1
      for (let i = 0; i < sky.nFaces * 6; i++) sky.uvs[i] *= 6;
    },

    // FUN_004016e0 — t in ticks
    render(t) {
      const cam = scene.camera;
      const r = Math.sin(t * 0.00011111111) * 50 + 500;
      const a = t * 0.000125;
      const sa = Math.sin(a), ca = Math.cos(a);
      cam.target[0] = -(sa * r);          // FUN_004168d0(cam, …, 200, …)
      cam.target[1] = 200;                // 0x43480000
      cam.target[2] = -(ca * r);
      cam.pos[0] = sa * r;                // FUN_00416ee0(cam, …)
      cam.pos[1] = Math.sqrt(r * r + r * r) * 0.8;
      cam.pos[2] = ca * r;
      sky.setRot(0, t * 0.0033333334, 0); // sky sphere slow yaw
      cam.fov = 130;                      // 0x43020000
      cam.roll = Math.sin(t * 0.0001) * 13;
      grid.fogDist = 800;                 // 0x44480000
      grid.fogColorRGB = 0xff0000;        // red haze
      R.drawScene(scene);
    },
  };
}
