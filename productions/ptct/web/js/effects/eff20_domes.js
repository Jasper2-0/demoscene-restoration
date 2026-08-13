// 0x20 jumping cloth-domes + scrolling ground.
// Port of init FUN_00408da0 (ptct.c 3243), render FUN_00408f30
// (renderfuncs.c 1354) and the dome generator FUN_00408610 (ptct.c 3025,
// ported verbatim). Data constants read from the binary:
//   DAT_0041d2e4 = 10 (rows N), DAT_0041d2e8 = 10 (cols M),
//   _DAT_0041d2ec = 400.0 (radius), _DAT_0041d2f0 = 600.0 (size unit S),
//   _DAT_0041a920 = 6.28318 (dbl), _DAT_0041a918 = 3.14159 (dbl),
//   _DAT_0041a310 = 1.0 (dbl), _DAT_0041a308 = 0.5 (dbl),
//   _DAT_0041a910 = 2.2 (dbl), _DAT_0041a340 = 0.5 (f32),
//   _DAT_0041a418 = 1.0 (f32), _DAT_0041a90c = -1.0 (f32),
//   _DAT_0041a408 = 0.0 (dbl, cap-fan hub uv angle).
// Render loop (disassembled at 0x408f5e..0x408fd2; the decompile lost the
// ftol arguments): base = phase_i + s (s = t/60);
//   squash = |cos(base * 0.0314159)|; jump = ftol(base * 0.01);
//   z = jump*600*2 + z_i; flip = ftol(base * 0.02) & 1  — the dome hops
// forward one dome-length per |cos| cycle, flipping over mid-hop.
//
// Geometry supersampling (R.tess, integer >= 1; tess=1 == original): the
// dome BODY is analytic — genDome keeps the original N/M constants inside
// every formula but evaluates them at fractional row/column parameters
// j = jf/tess, i = if/tess (rows (N-1)·tess+1, cols M·tess), so the fine
// mesh samples the exact same continuous surface AND the exact same uv
// mapping (texture scale unchanged); at tess=1 the arithmetic is verbatim.
// The dome x/z positions and phases are random-lattice artwork: the three
// rand31 calls per dome stay untouched, in the original order.
import { rand31 } from '../scene.js';

const N = 10;      // DAT_0041d2e4 rings
const M = 10;      // DAT_0041d2e8 verts per ring
const RAD = 400.0; // _DAT_0041d2ec
const S = 600.0;   // _DAT_0041d2f0
const PI_ = 3.14159;    // _DAT_0041a918
const TWOPI_ = 6.28318; // _DAT_0041a920

// FUN_00408610(mesh, squash, flip, x, z) — verbatim port, supersampled by
// `tess` via fractional j/i (see header note). Row count NR = (N-1)*tess+1,
// ring count MT = M*tess; identical to the original at tess=1.
function genDome(mesh, squash, flip, x, z, tess) {
  const NR = (N - 1) * tess + 1, MT = M * tess;
  const V = mesh.verts, F = mesh.faces, T = mesh.uvs;
  let nv = 0, nf = 0;
  const step = S / (N - 1);   // fVar5
  const half = S * 0.5;       // fVar6 = S * _DAT_0041a340
  for (let jf = 0; jf < NR; jf++) {
    const j = jf / tess;      // fractional original row index
    const fVar4 = j * step - half;
    const sinSq = Math.sin(squash * TWOPI_);          // fVar11
    const a = j * (squash / (N - 1)) * PI_;
    const sa = Math.sin(a), ca = Math.cos(a);         // fVar13, fVar12
    for (let iF = 0; iF < MT; iF++) {
      const i = iF / tess;    // fractional original column index
      const cosj = Math.cos((PI_ / N + PI_ / N) * j); // fVar14
      const r1 = (1.0 - cosj * sinSq * 0.5) * RAD;    // fVar1
      const b = (TWOPI_ / M) * i;
      const c2 = Math.cos(b) * r1;                    // fVar2
      const s2 = Math.sin(b) * r1;
      const fVar3 = c2 * ca + -S * ca + fVar4 * sa;
      V[nv * 3 + 1] = RAD * 2.2 - (c2 * sa + (-S * sa - ca * fVar4));
      let xx;
      if (flip === 0) {
        V[nv * 3 + 2] = z - (S + S + fVar3);
        xx = x - s2;
      } else {
        V[nv * 3 + 2] = fVar3 + z;
        xx = s2 + x;
      }
      V[nv * 3] = xx;
      nv++;
    }
  }
  // body faces (uv formulas keep the original /M and /N denominators via the
  // fractional indices — same continuous mapping at any tess)
  for (let jf = 0; jf < NR - 1; jf++) {
    for (let iF = 0; iF < MT; iF++) {
      const vCoef = flip !== 0 ? -1.0 : 1.0;          // _DAT_0041a90c / _DAT_0041a418
      const i1 = iF + 1;
      const w = i1 % MT;
      const u0 = (iF / tess) / M, u1 = (i1 / tess) / M;
      const v0 = ((jf / tess) * vCoef) / N;
      const v1 = (((jf + 1) / tess) * vCoef) / N;
      // face A: [MT*jf+iF, MT*jf+w, (jf+1)*MT+w]  uv (u0,v0),(u1,v0),(u1,v1)
      F[nf * 3] = MT * jf + iF; F[nf * 3 + 1] = w + MT * jf; F[nf * 3 + 2] = (jf + 1) * MT + w;
      T[nf * 6] = u0; T[nf * 6 + 1] = v0;
      T[nf * 6 + 2] = u1; T[nf * 6 + 3] = v0;
      T[nf * 6 + 4] = u1; T[nf * 6 + 5] = v1;
      nf++;
      // face B: [MT*jf+iF, (jf+1)*MT+w, (jf+1)*MT+iF]  uv (u0,v0),(u1,v1),(u0,v1)
      F[nf * 3] = MT * jf + iF; F[nf * 3 + 1] = (jf + 1) * MT + w; F[nf * 3 + 2] = (jf + 1) * MT + iF;
      T[nf * 6] = u0; T[nf * 6 + 1] = v0;
      T[nf * 6 + 2] = u1; T[nf * 6 + 3] = v1;
      T[nf * 6 + 4] = u0; T[nf * 6 + 5] = v1;
      nf++;
    }
  }
  // cap fans — hub uv from angle 0 (_DAT_0041a408), rim from sin/cos(pi*i/M)
  const hubU = (Math.sin(0.0) + 1.0) * 0.5;   // 0.5
  const hubV = (Math.cos(0.0) + 1.0) * 0.5;   // 1.0
  for (let iF = 0; iF < MT - 1; iF++) {
    F[nf * 3] = 0; F[nf * 3 + 1] = iF; F[nf * 3 + 2] = iF + 1;
    T[nf * 6] = hubU; T[nf * 6 + 1] = hubV;
    T[nf * 6 + 2] = (Math.sin((PI_ / M) * (iF / tess)) + 1.0) * 0.5;
    T[nf * 6 + 3] = (Math.cos((PI_ / M) * (iF / tess)) + 1.0) * 0.5;
    T[nf * 6 + 4] = (Math.sin((PI_ / M) * ((iF + 1) / tess)) + 1.0) * 0.5;
    T[nf * 6 + 5] = (Math.cos((PI_ / M) * ((iF + 1) / tess)) + 1.0) * 0.5;
    nf++;
  }
  for (let iF = 0; iF < MT - 1; iF++) {
    F[nf * 3] = (NR - 1) * MT;
    F[nf * 3 + 1] = (NR - 1) * MT + iF;
    F[nf * 3 + 2] = (NR - 1) * MT + iF + 1;
    T[nf * 6] = hubU; T[nf * 6 + 1] = hubV;
    T[nf * 6 + 2] = (Math.sin((PI_ / M) * (iF / tess)) + 1.0) * 0.5;
    T[nf * 6 + 3] = (Math.cos((PI_ / M) * (iF / tess)) + 1.0) * 0.5;
    T[nf * 6 + 4] = (Math.sin((PI_ / M) * ((iF + 1) / tess)) + 1.0) * 0.5;
    T[nf * 6 + 5] = (Math.cos((PI_ / M) * ((iF + 1) / tess)) + 1.0) * 0.5;
    nf++;
  }
  mesh.nVerts = nv;   // NR*MT (100 at tess=1)
  mesh.nFaces = nf;   // 2*(NR-1)*MT + 2*(MT-1) — the allocated maximum
                      // (= N*M*2 - 2 = 198 at tess=1)
}

export function makeEffect(R) {
  let scene, ground;
  let tess = 1;
  const domes = [];
  const xpos = new Float32Array(16);
  const zpos = new Float32Array(16);
  const phase = new Float32Array(16);
  return {
    init() {
      tess = Math.max(1, Math.floor(R.tess) || 1);
      const NR = (N - 1) * tess + 1, MT = M * tess; // fine dome rows/cols
      scene = R.createScene();
      for (let i = 0; i < 16; i++) {
        const m = R.newMesh(NR * MT, (NR - 1) * MT * 2 + (MT - 1) * 2,
          R.textures[4]); // 28.atg (N*M and N*M*2-2 at tess=1)
        scene.addObject(m);
        m.drawMode = 4;    // +0x40
        m.texFxMask = 2;   // +0x44 envmap pass
        m.cull = 2;        // +0x45 off
        m.dynamic = 1;     // +0x46
        domes.push(m);
        // rand31 call order per dome: x, z, phase (FUN_004119a0 ×3)
        xpos[i] = (rand31() % 2000) - 5000 + (i >> 2) * 3000;
        zpos[i] = (rand31() % 2000) - 5000 + (i & 3) * 3000;
        phase[i] = rand31() % 50;
      }
      // ground plane is analytic; its uvs are rebuilt per frame from world
      // coords, so texture scale/scroll are tess-invariant
      ground = R.genGrid(10 * tess, 80000, R.textures[3]); // snq_steen2, objects[16]
      scene.addObject(ground);
    },

    // FUN_00408f30 — t in ticks
    render(t) {
      const s = t * 0.016666668;                     // _DAT_0041a3d0 (f32 1/60)
      for (let i = 0; i < 16; i++) {
        const base = phase[i] + s;
        const sq = Math.cos(base * 0.0314159);       // _DAT_0041a978
        const jump = Math.trunc(base * 0.01);        // _DAT_0041a460
        const zz = jump * S + jump * S + zpos[i];
        const flip = Math.trunc(base * 0.02) & 1;    // _DAT_0041a970
        genDome(domes[i], Math.abs(sq), flip, xpos[i], zz, tess);
      }
      const zmove = s * 12;                          // _DAT_0041a968 (dbl 12.0)
      ground.setPos(0, 0, zmove);
      // ground uv from world coords * 4e-5 (_DAT_0041a960) — infinite scroll
      const G = ground, V = G.verts, U = G.uvs, F = G.faces;
      for (let f = 0; f < G.nFaces; f++) {
        const i0 = F[f * 3] * 3, i1 = F[f * 3 + 1] * 3, i2 = F[f * 3 + 2] * 3;
        U[f * 6] = V[i0] * 4e-5;
        U[f * 6 + 2] = V[i1] * 4e-5;
        U[f * 6 + 4] = V[i2] * 4e-5;
        U[f * 6 + 1] = (V[i0 + 2] + zmove) * 4e-5;
        U[f * 6 + 3] = (V[i1 + 2] + zmove) * 4e-5;
        U[f * 6 + 5] = (V[i2 + 2] + zmove) * 4e-5;
      }
      const vx = Math.sin(s * 0.013888888888888888) * 150; // s/72
      const vy = Math.cos(s * 0.011764705882352941) * 150; // s/85
      const vz = Math.sin(s * 0.011111111111111112) * 150; // s/90
      const len = Math.sqrt(vx * vx + vy * vy + vz * vz);
      const d = len + 5000;
      const cam = scene.camera;
      cam.target[0] = 0; cam.target[1] = 0; cam.target[2] = zmove;
      cam.pos[0] = d * (vx / len);
      cam.pos[1] = d * (vy / len) + 8000;
      cam.pos[2] = d * (vz / len) + zmove;
      cam.fov = 60;                                  // 0x42700000
      R.drawScene(scene);
    },
  };
}
