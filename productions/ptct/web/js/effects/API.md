# Renderer / scene API for effect implementers

`web/js/scene.js` exports `Renderer` (constructed once in `main.js` as `R`) —
a faithful port of the original "asysgl" engine (addresses in
`work/re/engine/FUNCTION_MAP.md`; per-effect formulas in `EFFECTS.md`).
Effects are factories `makeEffect(R)` returning `{init?, render(t, pos),
trigger?(param)}`, registered in `registry.js`.

## Time & sync conventions

- **Ticks**: 1 tick = 0.25 ms (`getTicks` was `(timeGetTime()−t0)*4`).
  `render(t, pos)` receives `t` = elapsed ticks **on this effect's layer**
  (the layer timer restarts when the script re-arms the layer — e.g. eff20's
  clock restarts at 20:00 via TRESET). `t` is a float; the original was an
  int — use `Math.floor(t)` only where an effect truly depends on integer
  math.
- `pos = {order, row, ticks}`: `order`/`row` are the latency-compensated
  music position (the original `musicGetPos`), `ticks` is the global demo
  clock in ticks. Effects that beat-sync (eff18 additive switch at order 16,
  eff1E camera slam at orders 26/27) read `pos.order`/`pos.row`.
- Effects that latched `getTicks()` internally (eff12's `t0`, eff3C's
  `flashTime[]`) should latch `pos.ticks`.
- `init()` is called once for every registered effect before the demo starts
  (mirrors `scriptLoad` calling every effect's init during loading).
- `trigger(param)` receives the 16-bit script TRIG param.

## Frame model

`main.js` runs per frame: `R.beginFrame()` → active effects' `render` in
layer order → `R.endFrame()`.

- `beginFrame()` — clears color+depth (scissor disabled), then sets the
  letterbox scissor `(0, h/12, w, 5h/6)` + enables SCISSOR_TEST, resets
  MODELVIEW to identity·translate(0,0,−0.1), PROJECTION to
  gluPerspective(90,1,…), fog off, color white, blend off, depth LEQUAL.
  (The original cleared right after SwapBuffers; in WebGL that clear must
  happen at the start of the next frame — same net semantics.)
- `endFrame()` — resets matrices/fog/state only.
- Aspect is 1.0 everywhere (square canvas, CSS-stretched to 4:3) — do NOT
  compensate; the original image is intentionally stretched.
- `R.blackout()` — full-screen black clear, scissor off.
- `R.clearColorAndDepth(rgb0xRRGGBB)` — glClearColor + full clear with the
  scissor still on (eff0C clears to its fog color).
- `R.clearDepth()` — glClear(GL_DEPTH_BUFFER_BIT) (eff12/eff0D/eff19/eff1A/
  eff1F draw over the layer below).

## Textures

`R.textures[i]` — WebGL textures per the index table (256×256 RGBA, LINEAR,
no mipmaps, REPEAT):

| i | file | i | file |
|---|---|---|---|
| 0 | 31 | 8 | cr_rob *(null — raw only)* |
| 1 | 13 | 9 | cr_inopia *(null)* |
| 2 | gizmozone2 | 10 | cr_oyise *(null)* |
| 3 | snq_steen2 | 11 | cr_snq *(null)* |
| 4 | 28 | 12 | cr_cs *(null)* |
| 5 | 18 | 13 | lucht |
| 6 | 29 | 14 | ptct |

`R.rawPixels[i]` (indices 7–12 and 14) — `{data: Uint8ClampedArray RGBA,
width, height}` for CPU sampling (eff13 samples the credit images per pixel;
index 13 in its 7..13 rotation is the "blank" slot → treat as black/null,
NOT `lucht`: the original indexed a raw-image array where slot 13 was
freed). `R.rawPixels[i].data[(y*256+x)*4 + c]` with c = 0 R, 1 G, 2 B, 3 A.

- `R.makeTextureFromRGBA(data, w, h)` → WebGL texture (LINEAR, no mips,
  REPEAT). Use for procedural textures (eff13/eff1C plasma, eff34 grid).
- `R.defaultDetailTex` — the 128×128 radial-spot detail texture
  (`DAT_00481f18` equivalent; falloff approximated, see scene.js comment).
- Bind manually via `R.mgl.bindTexture(tex)` + `R.mgl.enableTexture(true)`
  (only needed inside draw callbacks / 2D code — `drawScene` handles meshes).

### Pre-baked text strips (effects 0x1D and 0x3C)

The original rasterized text through GDI at init. The web port ships the
same rasters pre-baked in `web/assets/text/` — **load these images instead
of drawing text at runtime**:

- `manifest.json`:
  - `greets`: 17 filenames (`greet_00.png` … `greet_16.png`), each a
    **512×16** Courier-New-16px strip = one greetings line (64 cells of
    8 px, matching `u_max = chars/64` in eff1D's typewriter math);
  - `lineLens`: the 17 `strlen` values eff1D subtracts per line;
  - `pleaseIt`: `please_it.png`, a **256×32** Arial-32 strip of
    `"   p l e a s e   i t"` (already blurred like `blurGrayscale`) shared
    by all 40 slots of eff3C.
- Load with `Image` + `R.mgl.createTextureFromImage(img, false, false)`
  inside `init()` (init may be async-tolerant: start loads in `init`, skip
  drawing in `render` until ready). The strips are white-on-transparent;
  draw them additively (0x1D) / with grey color (0x3C) exactly as the
  originals colored their alpha textures.

## Scenes, meshes, camera

```js
const scene = R.createScene();
// scene.camera = {pos:[-100,-100,-100], target:[0,0,0], roll:0, fov:90}
// scene.tilted = true → gluLookAt up = (1,1,1)   (eff1E only)
const mesh = R.genGrid(30, 3000, R.textures[3]);
scene.addObject(mesh);
scene.addLight(x, y, z, radius, 0xffffff); // → {color:[r,g,b], pos:[…], radius}
R.computeVertexLighting(scene, ambientARGB); // bake into mesh.colors
R.drawScene(scene);            // Scene::render with scene.camera
R.drawScene(scene, cam);       // …or an override camera object
```

Generators (ported exactly — effects mutate the arrays in place and rely on
the layouts):

- `R.genGrid(n, size, tex)` — (n+1)² verts, flat XZ, y=0, centered; vertex
  `row*(n+1)+col` with **x from row, z from col**; uv 0..1 across the grid.
- `R.genSphere(n, radius, tex)` — n×n; vertex `lat*n+lon`; lat angle
  j·π/(n−1) (cos → y), lon i·2π/n; u = i/n, v = j/(n−1).
- `R.genTube(nAround, nRings, radius, length, tex)` — rings along Y,
  centered; vertex `ring*nAround + i`; x = sin·r, z = cos·r; u = i/nAround,
  v = ring/(nRings−1). (Original call order: `genTube(26, 3, 300, 5000)` =
  26 around × 3 rings.)
- `R.genCube(halfSize, tex)` — 8 verts / 6 quads, `isQuadCube = 1`
  (loading screen only; quad meshes use faces[4/face], uvs[8/face]).
- `R.newMesh(nVerts, nFaces, tex)` — empty mesh (dynamic effects fill it and
  may draw fewer faces by lowering `mesh.nFaces` before drawing — keep the
  arrays allocated at the max and restore/overwrite each frame).
- `R.cloneMesh(mesh)` — deep copy, for "hidden source" objects (the
  original just ran the generator twice; either works).

### Mesh fields (original struct offsets in scene.js comments)

| field | meaning |
|---|---|
| `verts` | Float32Array(nVerts·3) — mutate freely |
| `colors` | Float32Array(nVerts·4) RGBA 0..1, init 1 (lighting bakes here) |
| `uvs` | Float32Array(nFaces·6) — **per-face-corner** [u0,v0,u1,v1,u2,v2] |
| `faces` | Uint32Array(nFaces·3) indices |
| `pos`, `rot` | translation / rotation degrees X,Y,Z (also `setPos/setRot`) |
| `drawMode` | mask: 0 hidden, 1 wire, 2 flat, 4 textured, 8 points, 0x10/0x20… user callback. 5 = textured + wireframe overlay |
| `texFxMask` | 1 = detail/lightmap pass, 2 = envmap pass, 4 = flat color |
| `colorARGB` | 0xAARRGGBB for flat/wire/points (main-pass flat uses α=1) |
| `cull` | 0 front(CW), 1 back(CCW), 2 off |
| `dynamic` | truthy → normals recomputed every frame |
| `alphaBlend` / `additiveBlend` | SRC_ALPHA blend / ONE,ONE (additive also **disables depth test**, as the original did) |
| `detailTex` | detail-pass texture (null → `R.defaultDetailTex`) |
| `fogDist`, `fogColorRGB` | per-object GL_EXP fog: density 1/fogDist toward 0xRRGGBB (0 = off). eff0C also passes its fogColor to `R.clearColorAndDepth` |
| `normalsValid` | set false after editing verts if you need fresh normals |
| `userData` | free slot |

Hidden objects: `drawMode = 0` — kept in the scene (UV/vert source copies),
skipped by drawing AND by `computeVertexLighting`, exactly as the original.

Notes on the passes (all decompiled from `FUN_00417860`):

- Colors: per-vertex `mesh.colors` unless `texFxMask & 4` (then constant
  `colorARGB` with alpha 1). Color unpack is **×1/256** (0xff → 0.99609375).
- Detail (mask 1) and envmap (mask 2) passes both use **GL_SPHERE_MAP**
  texgen (`glTexGeni(…, 0x2402)` in FUN_00417860): per-vertex uv from the
  eye-space reflection vector — `u=normalize(eyePos)`,
  `n=normalize(mat3(MV)·normal)`, `r=u−2n(n·u)`,
  `s=rx/m+0.5, t=ry/m+0.5` with `m=2·√(rx²+ry²+(rz+1)²)`. `n` is the RAW
  **unnormalized** transformed normal — the engine never enables
  GL_NORMALIZE, and the resulting UV collapse/stretch is the authentic
  streaked look of these passes. Normals come from
  `mesh.normals` (see below). Mask 2 replaces the base uv pass (base is
  drawn only when texFxMask is exactly 0 or 4); mask 1 draws base + an
  additive second pass with the detail texture (white when flat).
- Normals: `mesh.normals` (Float32Array nVerts·3) are computed automatically
  inside `drawMesh` — face normal `cross(v1−v0, v2−v0)`, vertex normal =
  average over adjacent faces, both unnormalized (FUN_004168f0/004169d0) —
  and cached; recomputed each frame when `mesh.dynamic` is set. After
  mutating verts on a NON-dynamic mesh, set `mesh.normalsValid = false` or
  call `R.recomputeNormals(mesh)` so the sphere-map passes stay correct.
- Lighting: `R.computeVertexLighting(scene, ambientARGB)` =
  `ambient + Σ max(0, 1 − d/radius)·lightRGB`, no upper clamp, alpha
  untouched, world pos = vert + mesh.pos, lights with radius 0 skipped.
  Call per frame for moving lights (eff0D/eff15/eff19).
- Light positions are mutable: `scene.lights[i].pos[0] = …` (eff0C streams
  16 lights every frame).

### Custom draw callbacks (drawMode 0x10 / 0x20)

```js
R.setDrawCallback(0x10, (mesh, R) => { /* eff13 spray */ });
mesh.drawMode = 0x10;
```
The callback runs inside `drawMesh` with the camera projection/modelview
already applied (read `R.currentEyeMatrix()` if needed) — draw with
`R.mgl.begin/texCoord2/vertex3/end` or the array helpers. Set/restore your
own texture, blend and depth state (eff13/eff1C: additive, depth off, their
own plasma texture).

## 2D helpers (ortho 0..1 space, v flipped)

- `R.orthoQuad(x, y, w, h)` — EXACT `FUN_004124a0` quad: vertices
  (x,y+h),(x+w,y+h),(x+w,y),(x,y) with uv (0,0),(1,0),(1,1),(0,1); pushes
  its own ortho(0,1,0,1,−1,1) + modelview and pops after. State (texture,
  blend, color, depth) is the caller's.
  Extension: `R.orthoQuad(x,y,w,h, u0,v0,u1,v1)` for partial strips —
  eff1D draws `orthoQuad(0.05, y, chars*0.015625, 0.045, 0, 0, chars/64, 1)`.
- `R.rotatedQuad([x0,y0, x1,y1, x2,y2, x3,y3], [u0,v0, …, u3,v3]?)` —
  `FUN_004125b0` (recovered from disassembly): a free quad with four corner
  positions AND four explicit texcoords, `texCoord(u_k,v_k); vertex(x_k,y_k)`
  per corner, in the same ortho space as orthoQuad. The uv array defaults to
  the flipped-v orthoQuad ordering (0,0),(1,0),(1,1),(0,1).
- `R.solidFade([r,g,b], alpha)` — untextured fullscreen quad, SRC_ALPHA
  blend, depth off; no-op when alpha ≤ 0 (overlays 0x32–0x37 use this).

## Randomness

- `import { rand, srand } from '../scene.js'` — MSVC-exact CRT rand()
  (0..32767), for code that linked the CRT.
- `rand31()` / `srand31()` — the engine's own LCG `FUN_004119a0`
  (`seed*0x41c64e6d + 0x3093; return seed>>>16`, 16-bit result, seed starts
  0). Most effect code ("rand" in EFFECTS.md) uses THIS one.
- `R.randomTable` — Uint32Array(256), the startup random table
  (`DAT_0041f834`), filled from rand31 before anything else (eff13 scales
  spray positions by it).

## Misc

- `R.mgl` — the MiniGL shim (matrix stack, immediate mode, drawElements);
  `R.gl` — raw WebGL2 context for state the shim doesn't wrap.
- `R.unpackColor(argb)` → `[r,g,b,a]` (×1/256).
- `R.currentEyeMatrix()` — modelview (camera·object) of the last-drawn
  mesh, a mathlib `Mat4` (column-major, `mulPoint` available) — for CPU
  texgen and spray math.
- `Mat4`, `Vec3`, `DEG2RAD` re-exported from scene.js / mathlib.
- Fog outside meshes: `R.mgl.enableFog(false)` is restored by
  begin/endFrame; per-mesh fog is handled by `drawScene`.
