// 0x18 6-face marching-squares blob shells.
// Ported from: init FUN_004041a0 (ptct.c 1632), render FUN_00404fb0
// (renderfuncs.c 467), field FUN_00404d30 (ptct.c 2049), tessellator
// FUN_00404550 (ptct.c 1787), vertex-dedup helpers FUN_004042d0/FUN_00404360,
// face emitters FUN_004043f0/FUN_00404450. See EFFECTS.md eff18.
//
// Per frame, for each of 6 cube-face selectors: a 17x17 scalar field (six
// travelling sines of the normalized +-300 cube-face direction) is marched
// per cell (corner verts for inside corners, interpolated edge verts on sign
// changes, fan triangulation), the whole vert/face batch is duplicated (shell
// copy) and side walls are stitched between shell A and B along every pair of
// contour edges of a cell. The render pass then normalizes shell A to radius
// 550 and shell B to radius 800 with per-face axis swizzles, rewrites all
// uvs from vertex x/y * 0.00125, and switches to additive blending once the
// music reaches order 16. Scene is drawn twice (double brightness).
//
// The original's dedup maps are keyed by BYTE offsets into the 17x17 field
// (row*0x44 + col*4 + 0..3); we keep those exact keys — including the quirk
// that a cell's TR/BR/BL corners use keys base+1/base+2/base+3 rather than
// the neighbouring cell's TL key, so corners shared between cells are
// duplicated exactly as in the original. (Generalized to the tess grid as
// key = (row*GP + col)*4 + c, which is row*0x44 + col*4 + c at tess=1.)
// Exact data constants extracted from PTCT_unpacked.exe (.rdata/.data).
//
// Geometry supersampling (R.tess): the 17x17 field grid IS the isosurface
// resolution — it scales to (16*T+1)^2 samples of the SAME analytic 6-sine
// field (cell size 37.5/T over the same +-300 face span); the marching
// squares, shell copy, side-wall stitching, dedup maps and mesh capacity
// scale with it. The iso-threshold timeline, camera path and order-16 blend
// switch are untouched. T=1 reduces to the exact original math (37.5/1 and
// the key arithmetic are IEEE-exact).
//
// NOTE: this effect's multiplier is CAPPED AT 2 regardless of R.tess. The
// whole two-shell mesh is re-marched on the CPU every frame and drawn twice;
// measured peaks (node bench sweeping the full 14:00-18:00 iso timeline):
//   T=1:   8980 verts /   7120 faces, ~0.4 ms/frame tessellation
//   T=2:  34364 verts /  26566 faces, ~1.1 ms avg / 4.7 ms max
//   T=4: 134204 verts / 102230 faces, ~3.5 ms avg / 9.8 ms max
// At T=4 the tessellation plus the per-frame normal recompute and the
// double-draw expansion of ~300k face corners would eat most of a 60 fps
// frame budget; T=2 stays comfortably inside it while already quadrupling
// the marching resolution.

export function makeEffect(R) {
  let scene = null;
  let mesh = null;                              // DAT_0041e944

  // tess factor, capped at 2 for this effect (see NOTE above)
  const tess = Math.min(2, Math.max(1, Math.floor(R.tess || 1)));
  const G = 16 * tess;                          // cells per side (original 16)
  const GP = G + 1;                             // field samples  (original 17)
  const STEP = 37.5 / tess;                     // cell size      (original 37.5)

  const field = new Float32Array(GP * GP);        // DAT_0041e94c (17x17)
  const cornerFlag = new Uint8Array(GP * GP * 4); // DAT_0041e948 (0x484)
  const edgeFlag = new Uint8Array(GP * GP * 4);   // DAT_0041e958
  const cornerIdx = new Int32Array(GP * GP * 4);  // DAT_0041e940
  const edgeIdx = new Int32Array(GP * GP * 4);    // DAT_0041e954
  const fan = new Int32Array(8);                // local_20
  let iso = 4.0;                                // DAT_0041d280

  // FUN_004042b0
  function inside(v) { return v >= iso ? 1 : 0; }

  // FUN_004042d0 — dedup'd corner vertex (z always 300)
  function cornerVert(x, y, key) {
    if (cornerFlag[key] === 0) {
      const n = mesh.nVerts;
      mesh.verts[n * 3] = x;
      mesh.verts[n * 3 + 1] = y;
      mesh.verts[n * 3 + 2] = 300.0;
      cornerFlag[key] = 1;
      cornerIdx[key] = n;
      mesh.nVerts = n + 1;
      return n;
    }
    return cornerIdx[key];
  }

  // FUN_00404360 — dedup'd edge vertex (z always 300)
  function edgeVert(x, y, key) {
    if (edgeFlag[key] === 0) {
      const n = mesh.nVerts;
      mesh.verts[n * 3] = x;
      mesh.verts[n * 3 + 1] = y;
      mesh.verts[n * 3 + 2] = 300.0;
      edgeFlag[key] = 1;
      edgeIdx[key] = n;
      mesh.nVerts = n + 1;
      return n;
    }
    return edgeIdx[key];
  }

  // FUN_004043f0 / FUN_00404450 — append a face (wall uvs are dummy values in
  // the original and are overwritten by the per-frame uv pass, so indices
  // only).
  function addFace(a, b, c) {
    const f = mesh.nFaces;
    mesh.faces[f * 3] = a;
    mesh.faces[f * 3 + 1] = b;
    mesh.faces[f * 3 + 2] = c;
    mesh.nFaces = f + 1;
  }

  // side wall between contour edge a and b: 2 tris bridging shell A and B
  function wall(a, b, N) {
    addFace(a, a + N, b + N);
    addFace(a, b + N, b);
  }

  // FUN_00404d30 — fill the GPxGP field for cube-face selector sel, phase phi
  function fillField(sel, phi) {
    for (let row = 0; row < GP; row++) {
      for (let col = 0; col < GP; col++) {
        // _DAT_0041a77c = 37.5, _DAT_0041a778 = 300, _DAT_0041a7b8 = -300
        let a = 0, b = 0, c = 0; // fVar4 / param_1 / local_c in the decompile
        const cc = col * STEP - 300.0, rc = row * STEP - 300.0;
        switch (sel) {
          case 0: c = 300.0; a = cc; b = rc; break;
          case 1: c = -300.0; a = cc; b = rc; break;
          case 2: b = 300.0; a = cc; c = rc; break;
          case 3: b = -300.0; a = cc; c = rc; break;
          case 4: a = 300.0; c = cc; b = rc; break;
          case 5: a = -300.0; c = cc; b = rc; break;
        }
        const len = Math.sqrt(a * a + b * b + c * c);
        a /= len; b /= len; c /= len;
        const c2 = c + c;
        // frequencies _DAT_0041a7b0..a780; _DAT_0041a4f0 = 3.0f, _DAT_0041a790 = 5.0f
        field[row * GP + col] =
          Math.sin(((a - phi) + c2 - b * 3.0) * 0.86880973066898348) +
          Math.sin(((b - phi) + c2 - a * 3.0) * 1.2150668286755772) +
          Math.sin(((b + b - phi) + a + a + c) * 0.75585789871504161) +
          Math.sin((b + phi + b + phi + c) * 1.6313213703099512) +
          Math.sin((c * 5.0 + a + a + phi) * 0.90909090909090906) +
          Math.sin(((a - (phi + phi)) - c2) * 1.7211703958691911);
      }
    }
  }

  // FUN_00404550 — marching squares + shell copy + side-wall stitching
  function tessellate() {
    cornerFlag.fill(0);
    edgeFlag.fill(0);
    const facesBefore = mesh.nFaces; // iVar13
    const vertsBefore = mesh.nVerts; // iVar7

    for (let row = 0; row < G; row++) {
      for (let col = 0; col < G; col++) {
        const key = (row * GP + col) * 4;   // = row*0x44 + col*4 at tess=1
        const fi = row * GP + col;
        const fTL = field[fi];              // fVar3
        const fTR = field[fi + 1];          // fVar4
        const fBR = field[fi + GP + 1];     // fVar5
        const fBL = field[fi + GP];         // fVar6
        const iTL = inside(fTL), iTR = inside(fTR);
        const iBR = inside(fBR), iBL = inside(fBL);
        if (!(iTL | iTR | iBR | iBL)) continue;
        let n = 0;
        if (iTL) {
          fan[n++] = cornerVert(col * STEP - 300.0, row * STEP - 300.0, key);
        }
        if (iTL !== iTR) {
          fan[n++] = edgeVert((col - (fTL - iso) / (fTR - fTL)) * STEP - 300.0,
                              row * STEP - 300.0, key);
        }
        if (iTR) {
          fan[n++] = cornerVert((col + 1) * STEP - 300.0, row * STEP - 300.0, key + 1);
        }
        if (iTR !== iBR) {
          fan[n++] = edgeVert((col + 1) * STEP - 300.0,
                              (row - (fTR - iso) / (fBR - fTR)) * STEP - 300.0, key + 1);
        }
        if (iBR) {
          fan[n++] = cornerVert((col + 1) * STEP - 300.0, (row + 1) * STEP - 300.0, key + 2);
        }
        if (iBR !== iBL) {
          fan[n++] = edgeVert((col - (fBL - iso) / (fBR - fBL)) * STEP - 300.0,
                              (row + 1) * STEP - 300.0, key + 2);
        }
        if (iBL) {
          fan[n++] = cornerVert(col * STEP - 300.0, (row + 1) * STEP - 300.0, key + 3);
        }
        if (iBL !== iTL) {
          fan[n++] = edgeVert(col * STEP - 300.0,
                              (row - (fTL - iso) / (fBL - fTL)) * STEP - 300.0, key + 3);
        }
        // fan triangulation: (fan[0], fan[k], fan[k+1]) for k = 0..n-2
        // (the k = 0 face is degenerate — kept, as in the original)
        for (let k = 0; k + 1 < n; k++) addFace(fan[0], fan[k], fan[k + 1]);
      }
    }

    // shell copy: duplicate this pass's verts...
    const N = mesh.nVerts - vertsBefore; // iVar19
    const V = mesh.verts, F = mesh.faces;
    for (let i = 0; i < N; i++) {
      const s = (vertsBefore + i) * 3, d = (mesh.nVerts + i) * 3;
      V[d] = V[s];
      V[d + 1] = V[s + 1];
      V[d + 2] = V[s + 2];
    }
    // ...and this pass's faces, re-indexed into the copy
    const nf = mesh.nFaces - facesBefore;
    for (let i = 0; i < nf; i++) {
      const s = (facesBefore + i) * 3, d = (mesh.nFaces + i) * 3;
      F[d] = F[s] + N;
      F[d + 1] = F[s + 1] + N;
      F[d + 2] = F[s + 2] + N;
    }
    mesh.nFaces = mesh.nFaces * 2 - facesBefore;

    // side walls: for every pair of contour edges present in a cell
    // (order (0,1),(1,2),(2,3),(3,0),(0,2),(1,3) as in the goto chain)
    for (let row = 0; row < G; row++) {
      for (let col = 0; col < G; col++) {
        const key = (row * GP + col) * 4;
        const e0 = edgeFlag[key], e1 = edgeFlag[key + 1];
        const e2 = edgeFlag[key + 2], e3 = edgeFlag[key + 3];
        const m0 = edgeIdx[key], m1 = edgeIdx[key + 1];
        const m2 = edgeIdx[key + 2], m3 = edgeIdx[key + 3];
        if (e0 && e1) wall(m0, m1, N);
        if (e1 && e2) wall(m1, m2, N);
        if (e2 && e3) wall(m2, m3, N);
        if (e3 && e0) wall(m3, m0, N);
        if (e0 && e2) wall(m0, m2, N);
        if (e1 && e3) wall(m1, m3, N);
      }
    }
    mesh.nVerts = mesh.nVerts * 2 - vertsBefore;
  }

  // per-face-selector vertex swizzles applied after tessellation:
  // normalize (x,y,z), scale first half of the new span to 550
  // (DAT_0041d284) and the second half (the shell copy) to 800 (DAT_0041d288).
  // swz encodes the axis shuffle per selector (from renderfuncs.c 508-653).
  function scaleSpan(prev, cur, sel) {
    const V = mesh.verts;
    const mid = prev + Math.floor((cur - prev) / 2);
    for (let i = prev; i < cur; i++) {
      const x = V[i * 3], y = V[i * 3 + 1], z = V[i * 3 + 2];
      const len = Math.sqrt(x * x + y * y + z * z);
      const r = i < mid ? 550.0 : 800.0;
      const nx = (x / len) * r, ny = (y / len) * r, nz = (z / len) * r;
      switch (sel) {
        case 0: V[i * 3] = nx; V[i * 3 + 1] = ny; V[i * 3 + 2] = nz; break;
        case 1: V[i * 3] = nx; V[i * 3 + 1] = ny; V[i * 3 + 2] = -nz; break;
        case 2: V[i * 3] = nx; V[i * 3 + 1] = nz; V[i * 3 + 2] = ny; break;
        case 3: V[i * 3] = nx; V[i * 3 + 1] = -nz; V[i * 3 + 2] = ny; break;
        case 4: V[i * 3] = nz; V[i * 3 + 1] = ny; V[i * 3 + 2] = nx; break;
        case 5: V[i * 3] = -nz; V[i * 3 + 1] = ny; V[i * 3 + 2] = nx; break;
      }
    }
  }

  return {
    init() {
      // FUN_004041a0 — 69360 verts / 34680 faces (31.atg). The original cap
      // bounds the per-cell worst case (which is local), so it scales by
      // tess^2; tess=1 allocates exactly 0x10ef0/0x8778.
      scene = R.createScene();
      mesh = R.newMesh(0x10ef0 * tess * tess, 0x8778 * tess * tess, R.textures[0]);
      mesh.drawMode = 5;   // +0x40 (overwritten to 4 every frame by the render)
      mesh.cull = 2;       // +0x45 = 2 (off)
      scene.addObject(mesh);
      // The original scene has no addLight calls, yet the render writes 3
      // light positions (into the scene's empty light array — no visual
      // effect since vertex lighting is never computed here). Radius-0
      // lights reproduce that harmlessly.
      scene.addLight(0, 0, 0, 0, 0xffffff);
      scene.addLight(0, 0, 0, 0, 0xffffff);
      scene.addLight(0, 0, 0, 0, 0xffffff);
    },

    // t = elapsed ticks on this layer; pos = {order, row, ticks}
    render(t, pos) {
      // FUN_00404fb0
      mesh.nVerts = 0;
      mesh.nFaces = 0;
      iso = 4.0 - t * 0.00033333333;
      if (iso < 0.1) iso = 0.1;
      const phi = t * 8.333333e-5;

      let prev = 0;
      for (let sel = 0; sel < 6; sel++) {
        fillField(sel, phi);
        tessellate();
        const cur = mesh.nVerts;
        scaleSpan(prev, cur, sel);
        prev = cur;
      }

      // uv pass: every face corner gets (x*0.00125, y*0.00125) of its vertex
      const V = mesh.verts, F = mesh.faces, T = mesh.uvs;
      for (let f = 0; f < mesh.nFaces; f++) {
        const i0 = F[f * 3], i1 = F[f * 3 + 1], i2 = F[f * 3 + 2];
        T[f * 6] = V[i0 * 3] * 0.00125;
        T[f * 6 + 1] = V[i0 * 3 + 1] * 0.00125;
        T[f * 6 + 2] = V[i1 * 3] * 0.00125;
        T[f * 6 + 3] = V[i1 * 3 + 1] * 0.00125;
        T[f * 6 + 4] = V[i2 * 3] * 0.00125;
        T[f * 6 + 5] = V[i2 * 3 + 1] * 0.00125;
      }
      mesh.normalsValid = false;

      const cam = scene.camera;
      cam.target = [0, 0, 0];
      const dx = Math.sin(t * 0.00021739131) * 200.0;
      const dy = Math.cos(t * 0.00021739131) * 200.0;
      const dz = Math.sin((t + 0x5eaa) * 0.00021739131) * 200.0;
      const dl = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // 3-light "ring" at radius 800 (DAT_0041d288); angle i*100 + t*0.0005f.
      // The asm stores sin*800 twice and cos*800 once — ALL to light.pos.x
      // (same dword, an original bug); the final value is cos(a)*800 and
      // pos.y/z are never written.
      for (let i = 0; i < 3; i++) {
        const a = i * 100 + t * 0.000500000024;
        scene.lights[i].pos[0] = Math.cos(a) * 800.0;
      }

      cam.pos = [(dx / dl) * 950.0, (dy / dl) * 950.0, (dz / dl) * 950.0];
      // musicGetPos: order < 16 → normal, >= 16 → additive
      mesh.additiveBlend = pos.order < 0x10 ? 0 : 1;
      mesh.drawMode = 4;     // +0x40 rewritten every frame (init's 5 never draws)
      cam.fov = 130.0;       // 0x43020000
      R.drawScene(scene);
      R.drawScene(scene);    // drawn twice — double brightness
    },
  };
}
