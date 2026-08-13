// 0x15 swinging tube-worm chain.
// Ported from: init FUN_00407bf0 (ptct.c 2876), render FUN_00407e40
// (renderfuncs.c 1156-1248), euler matrix chain FUN_00407b80/FUN_00407af0/
// FUN_00407b20/FUN_00407b50, point transform FUN_00407a40. See EFFECTS.md eff15.
//
// 23 tubes genTube(5, 20, 70, 1000, 28.atg) (v uvs x3), each additive +
// dynamic, statically rotated (i*17.217392deg, 0, 254*i deg); plus a tiny
// additive genSphere(20, 1.4) head and two radius-40 lights (white, pink).
// Per frame every tube is re-posed: accumulated euler angles per segment,
// each ring of 5 verts placed via eulerMatrix(ax,ay,az).
//
// Matrix semantics (verified against the PTCT_unpacked.exe disassembly):
// FUN_004079b0(dst,B,A) computes dst = A*B (row-major), so FUN_00407b80
// yields M = X*(Y*Z); FUN_00407a40 transforms row-vectors (v' = v*M), which
// equals applying the X rotation first, then Y, then Z:
//   Rx: y' = y*c - z*s,  z' = y*s + z*c
//   Ry: x' = x*c + z*s,  z' = -x*s + z*c
//   Rz: x' = x*c - y*s,  y' = x*s + y*c
//
// Geometry supersampling (R.tess = T): each tube becomes
// genTube(4*T+1, 19*T+1, ...). The 20-segment euler-phase choreography (and
// the 23-chain phase offsets) is ANIMATION and stays exactly as-is: the
// accumulated per-segment angles/scales are computed first with the original
// loop (identical phase stepping), then the 19*T+1 rings are posed by
// linearly interpolating (ax,ay,az,sc) between the bracketing segments and
// evaluating the same euler/ring formulas at the fractional parameters
// (ring angle (i/T)*pi/2, y = (ring/T)*1.5). Around the ring the original's
// 5 verts are quarter-turn steps with vert 4 duplicating vert 0 (the wrap
// face is degenerate); 4*T+1 verts keep that seam layout exactly, so T=1 is
// the original genTube(5, 20) call and byte-identical posing.
//
// Camera anchor: the last vertex is ring 19*T, vert 4*T — its parameters
// (4*T)/T = 4 and (19*T)/T = 19 are exact in IEEE754 and the interpolation
// fraction is 0, so "camera = last vertex * 0.8333333" lands on the exact
// original position at every tess factor (semantics preserved).
function eulerXYZ(x, y, z, ax, ay, az, out) {
  let c = Math.cos(ax), s = Math.sin(ax);
  const y1 = y * c - z * s, z1 = y * s + z * c;
  c = Math.cos(ay); s = Math.sin(ay);
  const x2 = x * c + z1 * s, z2 = -x * s + z1 * c;
  c = Math.cos(az); s = Math.sin(az);
  out[0] = x2 * c - y1 * s;
  out[1] = x2 * s + y1 * c;
  out[2] = z2;
}

export function makeEffect(R) {
  let scene = null;
  const tubes = [];
  const tmp = [0, 0, 0];
  const tess = Math.max(1, Math.floor(R.tess || 1));
  // per-segment choreography tables (filled per chain, original 20 segments)
  const segAx = new Float64Array(20);
  const segAy = new Float64Array(20);
  const segAz = new Float64Array(20);
  const segSc = new Float64Array(20);

  return {
    init() {
      // FUN_00407bf0
      scene = R.createScene();
      scene.camera.pos = [0, 0, 100.0]; // 0x42c80000
      tubes.length = 0;
      // 23 chains: z counter 0,254,...,5588 (< 0x16d2)
      for (let i = 0, zc = 0; zc < 0x16d2; i++, zc += 0xfe) {
        // original genTube(5, 0x14, ...) — 4*T+1 around x 19*T+1 rings
        const m = R.genTube(4 * tess + 1, 19 * tess + 1, 70.0, 1000.0,
                            R.textures[4]); // 28.atg
        scene.addObject(m);
        // v of every face corner x3 (_DAT_0041a4f0 = 3.0f)
        for (let f = 0; f < m.nFaces; f++) {
          m.uvs[f * 6 + 1] *= 3.0;
          m.uvs[f * 6 + 3] *= 3.0;
          m.uvs[f * 6 + 5] *= 3.0;
        }
        if (tess > 1) {
          // genTube u = i/(4T+1); the original ring covers u 0..0.8 over the
          // full turn (i/5 at quarter-turn steps). Rescale u by (4T+1)/(5T)
          // so u = (i/T)*0.2 — original texture scale around the tube.
          const uScale = (4 * tess + 1) / (5 * tess);
          for (let f = 0; f < m.nFaces; f++) {
            m.uvs[f * 6] *= uScale;
            m.uvs[f * 6 + 2] *= uScale;
            m.uvs[f * 6 + 4] *= uScale;
          }
        }
        // _DAT_0041a8b4 = 17.217392f (degrees); z rotation = 254*i degrees
        m.setRot(i * 17.217392, 0, zc);
        m.additiveBlend = 1;   // +0x48
        m.setPos(0, 0, 0);     // euler transform of the origin = origin
        m.dynamic = 1;         // +0x46
        tubes.push(m);
      }
      const sph = R.genSphere(0x14, 1.4, R.textures[4]);
      sph.additiveBlend = 1;   // +0x48
      scene.addObject(sph);
      scene.addLight(0.0, 0.0, 0.0, 40.0, 0xffffff);
      scene.addLight(0.0, 0.0, 0.0, 40.0, 0xffd0d0);
    },

    // t = elapsed ticks on this layer (0.25 ms each)
    render(t) {
      // FUN_00407e40: T = (uint)t >> 2; phase runs on across segments/chains
      const T = Math.floor(t) >>> 2;
      const SIDES = 4 * tess + 1, RINGS = 19 * tess + 1;
      let phase = T * 0.6;
      for (let ci = 0; ci < 23; ci++) {
        const mesh = tubes[ci];
        const V = mesh.verts;
        // pass 1 — the ORIGINAL 20-segment euler accumulation (phase stepping
        // untouched; the phase sequence is identical at every tess factor)
        let ax = 0.0, ay = 0.0, az = 0.0;
        for (let seg = 0; seg < 0x14; seg++) {
          if (seg > 2) {
            ax += Math.sin(phase * -0.00083333335) * 5.0;
            ay += Math.cos(phase * 0.00066666666) * 5.0;
            az += Math.sin(phase * 0.0005) * 5.0;
            phase -= 300.0;
          }
          let sc = 0.35 - seg * 0.002631579;
          if (seg < 2) sc = 0.5;
          segAx[seg] = ax;
          segAy[seg] = ay;
          segAz[seg] = az;
          segSc[seg] = sc;
        }
        // pass 2 — pose the rings; tess>1 interpolates the per-segment
        // choreography, tess=1 hits the table entries exactly (fr === 0)
        let vi = 0;
        for (let ring = 0; ring < RINGS; ring++) {
          const seg = Math.floor(ring / tess);
          const fr = (ring - seg * tess) / tess;
          let a0, a1, a2, sc;
          if (fr === 0) {
            a0 = segAx[seg]; a1 = segAy[seg]; a2 = segAz[seg]; sc = segSc[seg];
          } else {
            a0 = segAx[seg] + (segAx[seg + 1] - segAx[seg]) * fr;
            a1 = segAy[seg] + (segAy[seg + 1] - segAy[seg]) * fr;
            a2 = segAz[seg] + (segAz[seg + 1] - segAz[seg]) * fr;
            sc = segSc[seg] + (segSc[seg + 1] - segSc[seg]) * fr;
          }
          const y = (ring / tess) * 1.5;
          const rx = a0 * 0.017453292, ry = a1 * 0.017453292, rz = a2 * 0.017453292;
          for (let i = 0; i < SIDES; i++) {
            const a = (i / tess) * 1.5707963;
            eulerXYZ(Math.sin(a) * sc, y, Math.cos(a) * sc, rx, ry, rz, tmp);
            V[vi++] = tmp[0];
            V[vi++] = tmp[1];
            V[vi++] = tmp[2];
          }
        }
        mesh.normalsValid = false;
        phase -= 43467.0;
      }
      // camera pos = last vertex of scene object 10 (the 11th chain) * 0.8333333
      // (exact at every tess factor — see header comment)
      const m10 = scene.objects[10];
      const lv = (m10.nVerts - 1) * 3;
      scene.camera.pos = [m10.verts[lv] * 0.8333333,
                          m10.verts[lv + 1] * 0.8333333,
                          m10.verts[lv + 2] * 0.8333333];
      // light 0 orbits at radius 20, y = 30 (0x41f00000)
      scene.lights[0].pos[0] = Math.sin(T * 0.001) * 20.0;
      scene.lights[0].pos[1] = 30.0;
      scene.lights[0].pos[2] = Math.cos(T * 0.001) * 20.0;
      scene.camera.target = [Math.cos(T * 0.00025) * 6.0,
                             Math.sin(T * 0.00025) * 5.0,
                             Math.cos(-T * 0.00018518518) * 6.0];
      R.computeVertexLighting(scene, 0);
      scene.camera.fov = 70.0; // 0x428c0000
      R.drawScene(scene);
    },
  };
}
