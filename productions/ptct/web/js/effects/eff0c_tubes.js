// 0x0C triple-tube flight.
// Port of init FUN_00408120 (ptct.c 2966) and render FUN_00408300
// (renderfuncs.c 1254). Notes vs EFFECTS.md: the streaming-light loop runs
// over DAT_0041f834..0x41f844 = FOUR lights (matching the 4 added at init),
// not 16. The lights are ported for fidelity but are visually inert — this
// effect never bakes vertex lighting (colors stay the ctor-default white).
// fogColorRGB is never written (stays 0) so the per-frame clear and the fog
// are black.
//
// Geometry supersampling (R.tess, integer >= 1; tess=1 == original): all
// three visible tubes are analytic walls — verts-around scale ×T and the 2
// ring spans become 2T (rings = 2T+1). The hidden uv sources scale
// identically (only their 0..1 uvs are read, which are density-invariant, so
// the "*5 − dv" v-scroll keeps identical texture scale/speed). The per-frame
// fog and the (visually inert) light setup are untouched.
export function makeEffect(R) {
  let scene, tube0, tube1, src0, src1, tube4;
  return {
    init() {
      const T = Math.max(1, Math.floor(R.tess) || 1);
      scene = R.createScene();
      const tex4 = R.textures[4];                   // 28.atg
      const tex6 = R.textures[6];                   // DAT_0041d950 = 29.atg
      tube0 = R.genTube(21 * T, 2 * T + 1, 300, 6000, tex4); // 0x15 around
      scene.addObject(tube0);
      tube0.cull = 1;
      tube0.setPos(0, 3000, 0);                     // 0x453b8000
      tube1 = R.genTube(19 * T, 2 * T + 1, 100, 6000, tex6); // 0x13 around
      scene.addObject(tube1);
      tube1.setPos(0, 3000, 0);
      tube1.additiveBlend = 1;                      // +0x48 = 1
      tube1.cull = 2;
      src0 = R.genTube(21 * T, 2 * T + 1, 300, 3000, tex4);  // hidden uv sources
      scene.addObject(src0);
      src1 = R.genTube(19 * T, 2 * T + 1, 150, 3000, tex4);
      scene.addObject(src1);
      src0.drawMode = 0;
      src1.drawMode = 0;
      tube4 = R.genTube(19 * T, 2 * T + 1, 270, 6000, tex6);
      scene.addObject(tube4);
      tube4.setPos(0, 3000, 0);
      tube4.additiveBlend = 1;
      tube4.cull = 1;
      for (let i = 0; i < 4; i++) scene.addLight(0, -10000, 0, 900, 0xffffff);
    },

    // FUN_00408300 — t in ticks
    render(t) {
      // glClearColor(unpack(obj0.fogColorRGB)) + glClear(COLOR|DEPTH)
      R.clearColorAndDepth(tube0.fogColorRGB);
      const cam = scene.camera;
      const a = t * 0.8 * 0.0005;
      const px = Math.sin(a) * 170;
      cam.pos[0] = px; cam.pos[1] = 3000; cam.pos[2] = Math.cos(a) * 170;
      const b = Math.fround(t * 0.8) * 5.8435107e-5; // (float)(t*0.8) in the original
      const tx = px - Math.sin(b) * 300;
      const cb = Math.cos(b);
      cam.target[0] = tx;
      cam.target[1] = 3000 - cb * 300;
      cam.target[2] = tx - cb * 300;                 // yes: built from target.x (verbatim)
      cam.fov = 120;                                 // 0x42f00000
      cam.roll = t * 0.014285714;
      const dv = t * 0.00033333333;
      // uv v = source v * 5 - dv (u untouched) on both visible tubes
      const A0 = tube0.uvs, B0 = src0.uvs;
      for (let f = 0; f < tube0.nFaces; f++) {
        const o = f * 6;
        A0[o + 1] = B0[o + 1] * 5 - dv;
        A0[o + 3] = B0[o + 3] * 5 - dv;
        A0[o + 5] = B0[o + 5] * 5 - dv;
      }
      const A1 = tube1.uvs, B1 = src1.uvs;
      for (let f = 0; f < tube1.nFaces; f++) {
        const o = f * 6;
        A1[o + 1] = B1[o + 1] * 5 - dv;
        A1[o + 3] = B1[o + 3] * 5 - dv;
        A1[o + 5] = B1[o + 5] * 5 - dv;
      }
      // 4 streaming lights along the tube (int math as in the original)
      const ti = Math.floor(t);
      for (let i = 0; i < 4; i++) {
        const v = ti + R.randomTable[i] * 0x51;
        const L = scene.lights[i];
        L.pos[1] = 6000 - (Math.trunc(v / 6) % 6000);
        const ang = v * 0.0013679891;
        L.pos[0] = Math.sin(ang) * 300;
        L.pos[2] = Math.cos(ang) * 300;
      }
      tube0.fogDist = 800;                           // 0x44480000
      tube1.fogDist = 800;
      R.drawScene(scene);
    },
  };
}
