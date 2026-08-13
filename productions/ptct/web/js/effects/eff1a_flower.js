// 0x1A spiky blob flower (drawn over eff0D's lightgrid).
// Ported from: init FUN_00402a90 (ptct.c 661), render FUN_00402de0
// (renderfuncs.c 434), mesh FUN_00402b50 (ptct.c 707). See EFFECTS.md eff1A.
//
// 50 petal rows x 25 verts on a lattice of sin/cos(row*0.1256636) centers
// (+-120/72), each row extruded along atan2-derived direction; envmap pass
// (texFxMask=2) so the base uvs are never written. NOTE: the caller computes
// k = 8+2*sin(t*0.0005) and passes it, but the decompiled FUN_00402b50 never
// reads that parameter — only phi = t*0.0005 is used.
// Exact data constants extracted from PTCT_unpacked.exe (.rdata).
//
// Geometry supersampling (R.tess = T): the petal lattice is refined to
// 50*T rows x 25*T verts by evaluating the SAME radius/amplitude formulas at
// the fractional original indices i = row/T (the original's derived counters
// local_4c = 6+3i and local_48 = 4+2i become 6+3*(row/T), 4+2*(row/T)) and
// j/T around each petal. Both directions are closed loops (%50 rows, %25
// verts), so the refined lattice wraps identically. No uvs to preserve —
// the envmap pass generates them. T=1 reduces to the exact original math.

// FUN_00402b50(mesh, k(unused), phi)  [T = tess factor]
function buildMesh(mesh, phi, T) {
  const RV = 25 * T;             // verts per row (original 25)
  const NR = 50 * T;             // rows          (original 50)
  mesh.nVerts = NR * RV;         // original 0x4e2 = 1250
  mesh.nFaces = 0;
  const s1 = Math.sin(phi * 0.1);            // _DAT_0041a430
  const cHalf = Math.cos(phi * 0.5) * 0.5;   // _DAT_0041a308 both times
  const V = mesh.verts;
  let vi = 0;
  // original outer loop: local_4c = 6,9,..,153 (50 rows); row index i = 0..49;
  // local_48 = 4 + 2*i  →  refined: i = row/T, l4c = 6+3i, l48 = 4+2i
  for (let row = 0; row < NR; row++) {
    const i = row / T;
    const l4c = 6 + 3 * i, l48 = 4 + 2 * i;
    const sx = Math.sin(l48 * 0.12566359999999999);        // _DAT_0041a348
    const cy = Math.cos((i - 1) * 0.12566359999999999);
    const sy = Math.sin((i - 1) * 0.12566359999999999);
    const cz = Math.cos(l4c * 0.12566359999999999);
    const cx = Math.cos(l48 * 0.12566359999999999);
    // fpatan(cos(l48*..)*120, sin((i-1)*..)*(-120)) = atan2(y, x)
    const ang = Math.atan2(cx * 120.0, sy * -120.0);
    // _DAT_0041a518 = 0.8796452
    const w = Math.sin((i + phi) * 0.8796451999999999) * cHalf;
    const sA = Math.sin(ang + 1.5707960000000001);         // _DAT_0041a520
    const cA = Math.cos(ang + 1.5707960000000001);
    for (let j = 0; j < RV; j++) {
      const jf = j / T;
      // _DAT_0041a508 = 0.2513272, _DAT_0041a500 = 0.99, _DAT_0041a450 = 0.2
      const petal = Math.sin(jf * 6 * 0.25132719999999997) * s1 * 0.2 + 0.99;
      // _DAT_0041a2f8 = 40, _DAT_0041a510 = 0.6
      const rad = Math.sin(jf * 0.25132719999999997) * petal * 40.0 * (w + 0.6);
      V[vi++] = sA * rad + sx * 120.0;                     // _DAT_0041a538
      V[vi++] = cA * rad + cy * 120.0;
      // _DAT_0041a390 = 0.8, _DAT_0041a530 = 72
      V[vi++] = Math.cos(jf * 0.25132719999999997) * petal * 40.0 * (w + 0.8) + cz * 72.0;
    }
  }
  // faces: 50*T bands x 25*T quads (2 tris), no uvs (envmap pass replaces them)
  const F = mesh.faces;
  let f = 0, base = 0;
  for (let i = 0; i < NR; i++) {
    const nb = ((i + 1) % NR) * RV;
    let v0 = base, v3 = nb;
    for (let j = 1; j <= RV; j++) {
      const v1 = base + (j % RV), v2 = nb + (j % RV);
      F[f * 3] = v0; F[f * 3 + 1] = v1; F[f * 3 + 2] = v2; f++;
      F[f * 3] = v0; F[f * 3 + 1] = v2; F[f * 3 + 2] = v3; f++;
      v0++; v3++;
    }
    base += RV;
  }
  mesh.nFaces = f; // 2500 * T^2
}

export function makeEffect(R) {
  let scene = null;
  let mesh = null;
  const tess = Math.max(1, Math.floor(R.tess || 1));

  return {
    init() {
      // FUN_00402a90 — capacity scales with tess^2 (original 4000/8000 kept
      // as the floor so tess=1 allocates exactly the original sizes)
      scene = R.createScene();
      mesh = R.newMesh(Math.max(4000, 1250 * tess * tess),
                       Math.max(8000, 2500 * tess * tess),
                       R.textures[4]);            // tex 28.atg (DAT_0041d948)
      mesh.drawMode = 4;     // +0x40
      mesh.texFxMask = 2;    // +0x44 = 2 → envmap pass
      mesh.cull = 1;         // +0x45 = 1 (back/CCW)
      scene.addObject(mesh);
    },

    // t = elapsed ticks on this layer (0.25 ms each)
    render(t) {
      // FUN_00402de0
      R.clearDepth();                   // glClear(GL_DEPTH_BUFFER_BIT)
      // phi = t * 0.0005f (_DAT_0041a370); k = 8+2*sin(t*0.0005) unused
      buildMesh(mesh, t * 0.000500000024, tess);
      mesh.dynamic = 1;                 // +0x46 set every frame
      mesh.normalsValid = false;
      // r = t * 0.005f (_DAT_0041a550); multipliers are the exact doubles
      // 1.5 (_DAT_0041a3e0), 1.9f (_DAT_0041a540), 1.212f (_DAT_0041a548)
      const r = t * 0.00499999989;
      mesh.setRot(r * 1.5, r * 1.8999999761581421, r * 1.2120000123977661);
      scene.camera.target = [10.0, 10.0, 10.0];     // 0x41200000
      scene.camera.pos = [255.0, 255.0, 255.0];     // 0x437f0000
      scene.camera.fov = 60.0;                      // 0x42700000
      R.drawScene(scene);
    },
  };
}
