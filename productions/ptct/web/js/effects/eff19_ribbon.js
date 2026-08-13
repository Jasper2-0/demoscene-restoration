// 0x19 Lissajous tunnel ribbon.
// Ported from: init FUN_00402ec0 (ptct.c 830), render FUN_00403410
// (ptct.c 1042), mesh FUN_004030b0 (ptct.c 925), path FUN_00402f90 /
// tangent FUN_00403020 (ptct.c 877/901). See EFFECTS.md eff19.
//
// A 20-ring x 40-vert lobed tube rebuilt each frame along a 2D Lissajous
// path; the tube advances in integer steps of t/600 while the camera flies
// P(s+3)->P(s+4) with s = t*0.0025 and the light rides at P(s+5).
// The init sets scene byte +0x10 = 1 — the same flag eff1E sets (tilted →
// gluLookAt up=(1,1,1)); EFFECTS.md's "only eff1E" note is contradicted by
// the decompile, so we follow the binary.
// Exact data constants extracted from PTCT_unpacked.exe (.rdata).

// FUN_00402f90 — path point (z always 0)
function pathPoint(u, out) {
  // _DAT_0041a590 = 0.07853975, _DAT_0041a570 = 0.2, _DAT_0041a558 = 2,
  // _DAT_0041a578 = 0.7, _DAT_0041a560 = 3, _DAT_0041a580 = 400, _DAT_0041a588 = 100
  const c04 = Math.cos((u + u) * 0.2 * 0.078539749999999992);
  const s2 = Math.sin(2.0 * u * 0.078539749999999992);
  out[0] = s2 * 400.0 + c04 * 100.0;
  const s07 = Math.sin(0.7 * u * 0.078539749999999992);
  const c3 = Math.cos(3.0 * u * 0.078539749999999992);
  out[1] = c3 * 400.0 + s07 * 100.0;
  out[2] = 0.0;
}

// FUN_00403020 — path tangent-ish direction (z always 0)
function pathTangent(u, out) {
  const c2 = Math.cos(2.0 * u * 0.078539749999999992);
  const s04 = Math.sin((u + u) * 0.2 * 0.078539749999999992);
  out[0] = c2 * 400.0 - s04 * 100.0;
  const c07 = Math.cos(0.7 * u * 0.078539749999999992);
  const s3 = Math.sin(3.0 * u * 0.078539749999999992);
  out[1] = c07 * 100.0 - s3 * 400.0;
  out[2] = 0.0;
}

// FUN_004030b0(mesh, tInt) — tInt is the effect time as a C int (t/600 below
// is INTEGER division; the tube advances in discrete steps).
//
// Geometry supersampling (R.tess = T): rings 20 -> 19*T+1 spanning the SAME
// path parameter range (u = ring/T + n, u in [n, n+19]) and 40 -> 40*T verts
// per ring through the same lobed-radius formulas at j/T. The tube advance
// n = trunc(1.5*t/600) and the camera path stepping are untouched. Per-ring
// uv v-step divides by T ((r/T)*0.2) so the texture scroll density (0.2 per
// ORIGINAL ring, off = n*0.2) is unchanged; u keeps 0.05 per original vert
// (0..2 around the ring). T=1 reduces to the exact original math.
function buildMesh(mesh, tInt, T) {
  const RV = 40 * T;             // verts per ring (original 40)
  const NR = 19 * T + 1;         // rings          (original 20)
  mesh.nVerts = RV * NR;         // original 800
  mesh.nFaces = 0;
  const n = Math.trunc(tInt / 600);
  const V = mesh.verts;
  const p = [0, 0, 0], tg = [0, 0, 0];
  let vi = 0;
  for (let ring = 0; ring < NR; ring++) {
    const rf = ring / T;                          // original ring index
    pathPoint(rf + n, p);
    pathTangent(rf + n, tg);
    const ang = Math.atan2(tg[0], tg[1]);         // fpatan(dx, dy)
    const sA = Math.sin(ang + 1.5707960000000001);
    const cA = Math.cos(ang + 1.5707960000000001);
    for (let j = 0; j < RV; j++) {
      const jf = j / T;                           // original vert index
      // _DAT_0041a5a8 = 3.2, _DAT_0041a328 = 0.1570795, _DAT_0041a428 = 0.4,
      // _DAT_0041a5a0 = 0.9, _DAT_0041a400 = 30, _DAT_0041a598 = 2.85
      const lobed = Math.sin(jf * 3.2 * 0.15707949999999998) * 0.4 + 0.9;
      const rad = Math.sin(jf * 0.15707949999999998) * lobed * 30.0;
      V[vi++] = sA * rad + p[0];
      V[vi++] = cA * rad + p[1];
      const lobed2 = Math.sin(jf * 2.85 * 0.15707949999999998) * 0.4 + 0.9;
      V[vi++] = Math.cos(jf * 0.15707949999999998) * lobed2 * 30.0 + p[2];
    }
  }
  // faces: 19*T bands x 40*T quads (2 tris each); v scrolls with n*0.2
  const off = n * 0.2;                            // _DAT_0041a450
  const F = mesh.faces, U = mesh.uvs;
  let f = 0, base = 0;
  for (let r = 0; r < NR - 1; r++) {
    const va = (r / T) * 0.2 + off, vb = ((r + 1) / T) * 0.2 + off;
    const nb = ((r + 1) % NR) * RV;
    let v0 = base, v3 = nb;
    for (let j = 1; j <= RV; j++) {
      const v1 = base + (j % RV), v2 = nb + (j % RV);
      const ua = ((j - 1) / T) * 0.05, ub = (j / T) * 0.05; // _DAT_0041a420
      // face A: (v0, v1, v2) uv (ua,va),(ub,va),(ub,vb)
      F[f * 3] = v0; F[f * 3 + 1] = v1; F[f * 3 + 2] = v2;
      U[f * 6] = ua; U[f * 6 + 1] = va;
      U[f * 6 + 2] = ub; U[f * 6 + 3] = va;
      U[f * 6 + 4] = ub; U[f * 6 + 5] = vb;
      f++;
      // face B: (v0, v2, v3) uv (ua,va),(ub,vb),(ua,vb)
      F[f * 3] = v0; F[f * 3 + 1] = v2; F[f * 3 + 2] = v3;
      U[f * 6] = ua; U[f * 6 + 1] = va;
      U[f * 6 + 2] = ub; U[f * 6 + 3] = vb;
      U[f * 6 + 4] = ua; U[f * 6 + 5] = vb;
      f++;
      v0++; v3++;
    }
    base += RV;
  }
  mesh.nFaces = f; // 1520 * T^2
}

export function makeEffect(R) {
  let scene = null;
  let mesh = null;
  const p = [0, 0, 0];
  const tess = Math.max(1, Math.floor(R.tess || 1));

  return {
    init() {
      // FUN_00402ec0 — capacity scales with tess^2 (original 1000/2000 kept
      // as the floor so tess=1 allocates exactly the original sizes)
      scene = R.createScene();
      mesh = R.newMesh(Math.max(1000, 40 * tess * (19 * tess + 1)),
                       Math.max(2000, 1520 * tess * tess),
                       R.textures[4]);           // tex 28.atg (DAT_0041d948)
      mesh.fogDist = 200.0;        // +0x50 (0x43480000)
      mesh.fogColorRGB = 0x3f0000; // +0x54
      scene.addObject(mesh);
      scene.addLight(0.0, 0.0, 0.0, 420.0, 0xffffff);
      scene.tilted = true;         // scene byte +0x10 = 1 (same flag as eff1E)
    },

    // t = elapsed ticks on this layer (0.25 ms each)
    render(t) {
      // FUN_00403410
      R.clearDepth();              // glClear(GL_DEPTH_BUFFER_BIT)
      // Ghidra dropped an fmuls in FUN_00403410: the asm passes ftol(t*1.5f)
      // to the mesh builder, so the tube advances at (1.5*t)/600 = t/400 —
      // exactly the camera's rate s = t*0.0025 (camera stays inside the tube).
      buildMesh(mesh, Math.trunc(t * 1.5), tess);
      const cam = scene.camera;
      cam.target = [0, 0, 0];      // dead stores in the original, kept
      cam.pos = [0, 0, -1500.0];   // (0xc4bb8000) — overwritten just below
      // s = t * 0.00166666671f * 1.5f (_DAT_0041a5b8/_DAT_0041a5bc)
      const s = t * 0.00166666671 * 1.5;
      pathPoint(s + 3.0, p);       // _DAT_0041a3f0
      cam.pos = [p[0], p[1], p[2]];
      pathPoint(s + 4.0, p);       // _DAT_0041a4e8
      cam.target = [p[0], p[1], p[2]];
      pathPoint(s + 5.0, p);       // _DAT_0041a440
      scene.lights[0].pos[0] = p[0];
      scene.lights[0].pos[1] = p[1];
      scene.lights[0].pos[2] = p[2];
      R.computeVertexLighting(scene, 0);
      cam.fov = t * 0.00100000005 + 60.0;  // _DAT_0041a5b4/_DAT_0041a5b0
      R.drawScene(scene);
    },
  };
}
