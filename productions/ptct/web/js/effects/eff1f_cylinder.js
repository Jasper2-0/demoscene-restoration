// 0x1F morphing cylinder (drawn over eff0C's tubes).
// Ported from: init FUN_00401000 (renderfuncs.c 3), render FUN_004013d0
// (renderfuncs.c 51), mesh FUN_004010c0 (ptct.c 6). See EFFECTS.md eff1F.
//
// 25 rings (z = -180..180 step 15) x 40 verts. Per ring a wobble value
// w = 15*(sin((ring*0.5 + t*0.005)*0.10471967) + cos((ring/3 + t*0.0025)*0.1256636))
// drives both the ring-center offset (20*sin/cos(w*0.1570795)) and the spike
// phase (|sin((vert+w)*0.23561925)|+1)*0.5 of the radius-40 profile.
// NOTE: the caller computes k = 8+2*sin(t*0.0005) and passes it, but the
// decompiled FUN_004010c0 never reads that parameter — it is dead.
// Exact data constants extracted from PTCT_unpacked.exe (.rdata).
//
// Geometry supersampling (R.tess = T): rings 25 -> 24*T+1 (same z span
// -180..180, step 15/T) and verts/ring 40 -> 40*T. All wobble/spike formulas
// are evaluated at the fractional original parameters ring/T and vert j/T,
// so the surface converges to the same analytic shape (smoother spikes).
// UVs keep the original per-unit grid: 0.1 per ORIGINAL ring/vert step
// (u = (ring/T)*0.1, v = (j/T)*0.1) — texture scale unchanged. T=1 reduces
// to the exact original math (x/1 is exact in IEEE754).

// FUN_004010c0(mesh, k(unused), t)  [T = tess factor]
function buildMesh(mesh, t, T) {
  const RV = 40 * T;            // verts per ring   (original 40)
  const NR = 24 * T + 1;        // rings            (original 25)
  mesh.nVerts = RV * NR;        // original 1000
  const V = mesh.verts;
  let vi = 0;
  for (let ring = 0; ring < NR; ring++) {
    const rf = ring / T;                         // original ring index
    const z = rf * 15 - 180;                     // original: z = -180..180 step 15
    // _DAT_0041a350 = 0.333333343f, _DAT_0041a360 = 0.0025, _DAT_0041a348 = 0.1256636
    // _DAT_0041a340 = 0.5f, _DAT_0041a358 = 0.005, _DAT_0041a338 = 0.10471966666666667
    const w = (Math.sin((rf * 0.5 + t * 0.005) * 0.10471966666666667) +
               Math.cos((rf * 0.3333333432674408 + t * 0.0025) * 0.12566359999999999)) * 15.0;
    const c = w * 0.15707949999999998;           // _DAT_0041a328
    const cx = Math.sin(c) * 20.0;               // _DAT_0041a320
    const cy = Math.cos(c) * 20.0;
    for (let j = 0; j < RV; j++) {
      const jf = j / T;                          // original vert index
      // _DAT_0041a318 = 0.23561925, _DAT_0041a310 = 1, _DAT_0041a308 = 0.5,
      // _DAT_0041a300 = 0.1570795, _DAT_0041a2f8 = 40
      const amp = (Math.abs(Math.sin((jf + w) * 0.23561925)) + 1.0) * 0.5;
      V[vi++] = Math.sin(jf * 0.15707950000000001) * amp * 40.0 + cx;
      V[vi++] = Math.cos(jf * 0.15707950000000001) * amp * 40.0 + cy;
      V[vi++] = z;
    }
  }
  // faces: 24*T bands x 40*T quads (2 tris each), uv grid 0.1/ORIGINAL unit
  // (_DAT_0041a2f0)
  const F = mesh.faces, U = mesh.uvs;
  let f = 0, base = 0;
  for (let r = 0; r < NR - 1; r++) {
    const u0 = (r / T) * 0.1, u1 = ((r + 1) / T) * 0.1;
    const nb = ((r + 1) % NR) * RV;
    let v0 = base, v3 = nb;
    for (let j = 1; j <= RV; j++) {
      const v1 = base + (j % RV), v2 = nb + (j % RV);
      const va = ((j - 1) / T) * 0.1, vb = (j / T) * 0.1;
      // face A: (v0, v1, v2) uv (u0,va),(u0,vb),(u1,vb)
      F[f * 3] = v0; F[f * 3 + 1] = v1; F[f * 3 + 2] = v2;
      U[f * 6] = u0; U[f * 6 + 1] = va;
      U[f * 6 + 2] = u0; U[f * 6 + 3] = vb;
      U[f * 6 + 4] = u1; U[f * 6 + 5] = vb;
      f++;
      // face B: (v0, v2, v3) uv (u0,va),(u1,vb),(u1,va)
      F[f * 3] = v0; F[f * 3 + 1] = v2; F[f * 3 + 2] = v3;
      U[f * 6] = u0; U[f * 6 + 1] = va;
      U[f * 6 + 2] = u1; U[f * 6 + 3] = vb;
      U[f * 6 + 4] = u1; U[f * 6 + 5] = va;
      f++;
      v0++; v3++;
    }
    base += RV;
  }
  mesh.nFaces = f; // 1920 * T^2
}

export function makeEffect(R) {
  let scene = null;
  let mesh = null;
  const tess = Math.max(1, Math.floor(R.tess || 1));

  return {
    init() {
      // FUN_00401000 — capacity scales with tess^2 (original 1000/2000 kept
      // as the floor so tess=1 allocates exactly the original sizes)
      scene = R.createScene();
      mesh = R.newMesh(Math.max(1000, 40 * tess * (24 * tess + 1)),
                       Math.max(2000, 1920 * tess * tess),
                       R.textures[0]);            // tex 31.atg
      mesh.drawMode = 4;               // +0x40
      mesh.texFxMask = 1;              // +0x44 = 1 → detail pass
      mesh.detailTex = R.textures[1];  // +0x4c = 13.atg (DAT_0041d93c)
      mesh.cull = 0;                   // +0x45 = 0 (front/CW)
      mesh.dynamic = 1;                // +0x46
      scene.addObject(mesh);
    },

    // t = elapsed ticks on this layer (0.25 ms each)
    render(t) {
      // FUN_004013d0
      R.clearDepth();                  // glClear(GL_DEPTH_BUFFER_BIT)
      buildMesh(mesh, t, tess);        // k = 8+2*sin(t*0.0005) unused (see above)
      mesh.dynamic = 1;
      mesh.normalsValid = false;
      mesh.setRot(90.0, 0, 0);         // 0x42b40000
      scene.camera.target = [-100.0, 0, 0];      // 0xc2c80000
      scene.camera.pos = [-100.0, 0, 300.0];     // 0x43960000
      scene.camera.fov = 60.0;                   // 0x42700000
      R.drawScene(scene);
    },
  };
}
