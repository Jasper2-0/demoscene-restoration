# KERNEL_API.md — the shared render kernel

`web-lv/js/kernel.js` is the layer **all eight scenes plus the intro titles**
sit on: the mesh model and its generators, the two draw kernels, the camera,
screen-space quads and the text engine. Everything is ported one-for-one from
`work-lv/re/out/lv.c` (Ghidra, image base `0x400000`); every entry point names
the address it came from.

It renders **only** through `minid3d7.js` — read `MINID3D7_API.md` first, this
document assumes its conventions (left-handed, D3D row-major matrices,
depth `[0,1]`, `D3DCOLOR` = `0xAARRGGBB`, screen y down, front face = CW).

Verified end-to-end in headless Chrome by `web-lv/test/kernel_test.html` —
**82 assertions, all green**. Re-run it after touching `kernel.js`.

```js
import { MiniD3D7 } from './minid3d7.js';
import { Kernel, createGeoSphere, createParticles, createCamera } from './kernel.js';

const d3d = new MiniD3D7(canvas);   // 640x480
d3d.applyDefaultState();
const K = new Kernel(d3d);
```

Everything that needs the device is a **method on `Kernel`**. Everything that is
pure data (mesh/camera/particle construction, index math) is also exported as a
**free function**, and the `Kernel` methods of the same name just forward.

---

## 1. Coordinate system & units

| | |
|---|---|
| **World / view** | left-handed; +X right, +Y up, **+Z away from the viewer**. |
| **Scale** | the intro works in "big" units — the scene-E sphere has radius **100**, cameras sit 200–400 away, the far plane is 1000 and the near plane is 0.2. |
| **Rotations** | radians. `rotX * rotY * rotZ`, applied in that order (see `setMeshRotation`). |
| **Camera fov** | **degrees**, and it is a full **HORIZONTAL** fov (`_11 = cot(fov/2)`, `_22 = cot(fov/2) * 4/3`). Default 135. |
| **Screen space** | pixels, origin **top-left**, **y down**, 640×480. |
| **Colours** | `D3DCOLOR` `0xAARRGGBB` — build with `D3DCOLOR_ARGB(a,r,g,b)` from the shim. Vertex diffuse is the *only* light source; lighting is off. |
| **Text scale** | the original's own unit: `scale = 256` means "one atlas pixel ≈ one screen pixel". |

---

## 2. The mesh object (FUN_00402040)

`createMesh(nVerts, nFaces)` / `K.createMesh(...)`. Field names mirror the
original's dword offsets so ported effect code reads like the decompile.

| field | original | meaning |
|---|---|---|
| `m` | `obj[0..15]` | `Float32Array(16)`, the WORLD matrix, row-major |
| `px, py, pz` | `+0x40` | translation, written into `m[12..14]` by `drawMesh` |
| `scale` | `+0x4c` | uniform scale folded into the rotation matrix |
| `rx, ry, rz` | `+0x50` | Euler rotation |
| `flags` | `+0x5c` | **bit 0 = "rebuild the rotation matrix on every draw"** |
| `verts` | `+0x60` | `Float32Array(nVerts * 8)` — FVF `0x242`, 32-byte stride |
| `vertsU32` | — | `Uint32Array` over the *same buffer*, for the diffuse dword |
| `vertBytes` | — | `Uint8Array` over the same buffer |
| `normAccum` | `+0x64` | `Float32Array(nVerts * 4)` — smooth-normal accumulator (x,y,z,count) |
| `nVerts` | `+0x68` | u16 in the original |
| `indices` | `+0x6c` | `Uint16Array(nFaces * 3)` |
| `faceNormals` | `+0x70` | `Float32Array(nFaces * 3)` |
| `nFaces` | `+0x74` | u16 in the original |

### The vertex layout — FVF `0x242`, 8 floats per vertex

| float | field |
|---|---|
| `verts[i*8 + 0..2]` | `x, y, z` |
| `vertsU32[i*8 + 3]` | `diffuse`, D3DCOLOR `0xAARRGGBB` (initialised to `0xffffffff`) |
| `verts[i*8 + 4..5]` | `u0, v0` — texcoord set 0 (stage 0) |
| `verts[i*8 + 6..7]` | `u1, v1` — texcoord set 1 (stage 1) |

Helpers: `vbase(i)` → `i*8`, `vcolor(i)` → `i*8+3`.

**Effects mutate these arrays in place every frame** — that is the whole point
of keeping the layout. Nothing is cached; `drawMesh` re-uploads the block.

```js
const m = K.createMesh(4, 2);
for (let i = 0; i < 4; i++) {
  const b = vbase(i);
  m.verts[b] = X[i]; m.verts[b+1] = Y[i]; m.verts[b+2] = 0;
  m.vertsU32[vcolor(i)] = D3DCOLOR_ARGB(255, 255, 200, 64);
  m.verts[b+4] = U[i]; m.verts[b+5] = V[i];   // stage 0
  m.verts[b+6] = U[i]; m.verts[b+7] = V[i];   // stage 1
}
m.indices.set([0,1,2, 0,2,3]);   // CLOCKWISE on screen = front under D3DCULL_CCW
```

Other mesh helpers:

| call | original | notes |
|---|---|---|
| `setMeshVertexPos(obj, i, x, y, z)` | `FUN_00403150` | position only, leaves colour/uv |
| `setMeshRotation(obj, rx, ry, rz)` | `FUN_00402230` | stores the angles and rebuilds `m` as `rotX*rotY*rotZ*scale` |

---

## 3. `K.drawMesh(obj)` — FUN_00402180

```
if (obj.flags & 1) setMeshRotation(obj, obj.rx, obj.ry, obj.rz);
obj.m[12..14] = obj.px, obj.py, obj.pz;
SetTransform(WORLD, obj.m);
DrawIndexedPrimitive(TRIANGLELIST, 0x242, verts, nVerts, indices, nFaces*3, 0);
```

The world matrix is **not** rebuilt unless `flags & 1`; effects that animate a
rotation either set that bit or call `setMeshRotation` themselves — exactly as
in the original. `drawMesh` sets **no render state**: cull mode, Z, blending,
the texture and the combiner are the caller's business (the scene code sets
them, usually via `d3d.setCullMode()` / `d3d.SetTexture()` / `d3d.dispatchState()`).

---

## 4. `K.meshEnvMapUV(obj, cam, uvScale, mode)` — FUN_004022a0

Smooth vertex normals + spherical environment mapping, the intro's standard
shading trick. Two passes:

1. per-face normal `n = -( (v1-v0) × (v2-v0) )`, normalised, written to
   `obj.faceNormals`, accumulated into `obj.normAccum` for each of the three
   vertices (with a count in `.w`);
2. each vertex normal is averaged (divided by the count, **not** renormalised),
   transformed by `obj.m * cam.m` as a row vector, and turned into
   `u = n'.x*0.5 + 0.5`, `v = n'.y*0.5 + 0.5`.

| `mode` | writes |
|---|---|
| `0` | texcoord set **1** only, both scaled by `uvScale` |
| non-zero | set **1** unscaled, and set **0** scaled by `uvScale` |

Two gotchas, both faithful to the original:

* it uses `obj.m` as it stands, i.e. the world matrix left over from the
  **previous** `drawMesh`. Scene code calls `meshEnvMapUV` *before* `drawMesh`
  and lives with the one-frame lag;
* the face normal is `-(e1 × e2)`, which for a conventionally wound closed mesh
  points **inward**. The env map is mirrored accordingly.

`cam` may be a camera object, a `D3DMatrix`, or a raw 16-float array.

---

## 5. The geodesic sphere — `createGeoSphere(subdiv, radius, uvScale, splitSeams)` (FUN_004031b0)

An icosahedron with its **5-fold axis on Z**, every edge slerped into `subdiv`
segments, every face filled in row by row.

```
vertices = subdiv² * 20 / 2 + 2        faces = subdiv² * 20
```

The intro calls it as `FUN_004031b0(0xe, 100.0, 1.0, 0)` →
**1962 vertices / 3920 faces**, all at exactly radius 100.

Vertex order (this is what `geoIndex` encodes, and effects that index the
sphere by hand rely on it):

| range | contents |
|---|---|
| `0` | +Z pole |
| `1..5` | upper ring, `z = r/√5`, xy radius `2r/√5`, at `i·2π/5` |
| `6..10` | lower ring, `z = -r/√5`, at `i·π/5` for i = 1,3,5,7,9 |
| `11` | −Z pole |
| `12 .. 11+30(subdiv-1)` | the 30 edges, `subdiv-1` slerped points each, in the order (0,1..5), (ring), (upper→lower a), (upper→lower b), (lower ring), (11,6..10) |
| the rest | 20 face interiors, `(subdiv-1)(subdiv-2)/2` points each |

UV, per vertex: `u = (x/radius) * uvScale`,
`v = atan2(z/radius, y/radius) / π * uvScale` — a cylindrical wrap about the
**X** axis (not about the pole), so u and v both run roughly −1…1 at
`uvScale = 1`. Diffuse is `0xffffffff` everywhere.

Winding: `(v1-v0) × (v2-v0)` points outward for all 3920 faces, i.e. front
faces are **clockwise on screen** — the normal solid-object case, keep
`D3DCULL_CCW`.

`splitSeams` (the original's 4th argument; the shipped scenes pass 0) runs the
second pass — any triangle whose vertices span more than 0.6 in u or v gets a
private copy of its three vertices with the offending coordinate pulled back by
whole units. It returns a **new** mesh with more vertices and the same face
count; the input is discarded. Also exported on its own as `splitUVSeams(mesh)`.

Two building blocks are exported on their own:

* `geoIndex(n, face, row, col)` — FUN_00402f40, the vertex index for a face's
  row/column; use it to walk the sphere's rows.
* `slerpEdge(mesh, ia, ib, cursor, count)` — FUN_00402d00, great-circle
  interpolation of the edge `ia → ib` into `count` segments, appending the
  `count - 1` interior points at `cursor[0]` (a one-element array, advanced in
  place). Only positions are written.

---

## 6. Particles / billboards

### `createParticles(count)` — FUN_00402990

`count` camera-facing quads (the intro allocates `0x800` = 2048 for scene E;
`MAX_PARTICLES` is exported).

| field | original | meaning |
|---|---|---|
| `m` | `[0..15]` | an extra world matrix applied to the particle *centres* |
| `pos` | `+0x40` | `Float32Array(count*3)` — centre in world space |
| `color` | `+0x44` | `Uint32Array(count)` — D3DCOLOR per particle |
| `size` | `+0x48` | `Float32Array(count)` — full edge length (half-size is `size*0.5`) |
| `verts` | `+0x4c` | `Float32Array(count*32)` — 4 FVF-`0x242` vertices per quad |
| `vertsU32`, `vertBytes` | — | aliases of the same buffer |
| `indices` | `+0x50` | `Uint16Array(count*6)`, `[v, v+1, v+2, v+2, v+3, v]` per quad |
| `count` | `+0x54` | lower it to draw fewer than were allocated |

### `K.drawParticles(p, view)` — FUN_00402a60

```
SetTransform(WORLD, identity);
SetTransform(VIEW,  identity);
M = p.m * view;                      // then each centre goes through M on the CPU
... build axis-aligned quads at the transformed centres ...
DrawIndexedPrimitive(TRIANGLELIST, 0x242, verts, count*4, indices, count*6, 0);
SetTransform(VIEW, view);            // restored
```

Because the quads are built **in view space** they always face the camera. The
corners are `(-h,-h) (+h,-h) (+h,+h) (-h,+h)` with uv `(0,0) (1,0) (1,1) (0,1)`;
that order is *counter-clockwise* on screen, so **draw particles with
`D3DCULL_NONE`** (which is what the frame pump leaves set). PROJECTION is
untouched.

`view` is the camera object (or its matrix) currently installed as VIEW.

---

## 7. Camera

### `createCamera(ex, ey, ez, ax, ay, az)` — FUN_00402680

| field | original | default |
|---|---|---|
| `m` | `[0..15]` | the VIEW matrix (look-at, then roll) |
| `ex, ey, ez` | `+0x40` | eye |
| `ax, ay, az` | `+0x4c` | target |
| `fov` | `+0x58` | `135.0` — **degrees, horizontal** |
| `roll` | `+0x5c` | `0.0` — a Z rotation applied after the look-at |
| `zfar` | `+0x60` | `1000.0` (near is hard-coded 0.2) |

`cameraLookAt(cam, ex, ey, ez, ax, ay, az)` (FUN_004026f0) moves it and
rebuilds `cam.m`.

### `K.setCameraProjection(cam, fovDeg = cam.fov)` — FUN_00402860

```
cam.fov = fovDeg;
PROJECTION = perspectiveFovLH(fovDeg * π/180, 4/3, 0.2, cam.zfar);
VIEW  = identity;
WORLD = identity;
```

### `K.setCamera(cam)` — FUN_00402760

The one scenes actually call, once per frame:

```
cameraLookAt(cam, cam.ex … cam.az);   // rebuild from the stored eye/target
setCameraProjection(cam, cam.fov);    // PROJECTION, and VIEW/WORLD to identity
cam.m = cam.m * rotationZ(cam.roll);  // fold the roll in
SetTransform(VIEW, cam.m);
```

Afterwards `cam.m` holds the final view matrix — that is what you pass to
`drawParticles` and `meshEnvMapUV`.

---

## 8. Screen-space overlays (FVF `0x244`)

A 2D vertex is a plain array of **9 numbers**:

```
[ x, y, z, rhw, D3DCOLOR, u0, v0, u1, v1 ]
```

`x, y` in pixels (y down from the viewport's top-left). The intro's design bars
and glyph quads always use `z = 0.01`, `rhw = 100.0`.

| call | original | notes |
|---|---|---|
| `K.drawTri2D(v0, v1, v2)` | `FUN_004049f5` | `DrawPrimitive(TRIANGLELIST, 0x244, v, 3, 0x18)` |
| `K.drawQuad2D(v0, v1, v2, v3)` | `FUN_00404a3f` | `DrawPrimitive(TRIANGLEFAN, 0x244, v, 4, 0x18)`. Order **TL → TR → BR → BL** — clockwise, so it survives `D3DCULL_CCW` |
| `K.drawRect2D(x0, y0, x1, y1, color, opts?)` | — | convenience wrapper; `opts` may override `z`, `rhw`, `u0/v0/u1/v1` |
| `K.quad2DScratch` / `K.flushQuad2D()` | — | the raw 36-float scratch, for filling in place |

The design bars in the scene code are **not textured** — they are literal float
coordinates with one flat colour from the intro's palette
(design-yellow `0xFFD7B45A`, sky-blue `0xFF7DAFC8`, black, white), drawn
untextured (`stage 0 COLOROP = SELECTARG2, COLORARG2 = DIFFUSE`) with
`D3DRS_ZENABLE = 0`. Transcribe them straight into `drawQuad2D`:

```js
K.drawQuad2D(
  [534, 303, 0.01, 100, 0xFFD7B45A, 0,0, 0,0],
  [620, 303, 0.01, 100, 0xFFD7B45A, 1,0, 1,0],
  [620, 331, 0.01, 100, 0xFFD7B45A, 1,1, 1,1],
  [534, 331, 0.01, 100, 0xFFD7B45A, 0,1, 0,1]);
```

---

## 9. Text engine

### `K.setFont(texture, metrics?)`

Injected dependency. `texture` is a shim texture handle for the **256×256**
atlas built by `FUN_00404b10` (white texels, 2-bit alpha, only the top 78 rows
used) — `work-lv/baked/dr/font.png`. `metrics` is optional and accepts
`work-lv/baked/dr/font_metrics.json` verbatim, or
`{ rects, uvScale, unitScale, spaceWidth, charGap, centre, kern }`.

Without a call to `setFont`, the kernel still lays text out correctly using the
rect table baked in as `DEFAULT_GLYPH_RECTS` — it just has no texture bound.

```js
const img = new Image();
await new Promise(r => { img.onload = r; img.src = '../assets/font.png'; });
K.setFont(d3d.createTextureFromImage(img, 0), await (await fetch('font_metrics.json')).json());
```

### Layout semantics (FUN_00404c30 / FUN_00404f10)

* **lowercase only.** `a-z` → 0..25, `0-9` → 26..35, `#` → 36, `+` → 37.
  Anything else falls through to its raw char code and over-reads the rect
  table — `'*'` lands on index 42, a run of zeroes, so it is an **invisible
  zero-width glyph that still advances the pen by one gap**. That quirk is how
  `"threestate**in***lost***vegas**"` gets its wide word spacing; it is
  deliberate, keep it.
* glyph quad size = `rect size (atlas px) × scale / 255`;
* pen advance = `glyph width + scale × 4/256` (the gap is added after *every*
  character, including the last);
* space = width `scale × 16/256`, height 0 (a degenerate, invisible quad) plus
  the same gap;
* vertical kern, in units of `scale/256`, shifts the quad **down**:
  `a, g = -4` · `e = -1` · `c, h, i = -2` · `k, p, x, z = +2` · everything else 0;
* the quad is `(x, y+kern) (x+w, y+kern) (x+w, y+kern+h) (x, y+kern+h)`
  with uv `(u0,v0) (u1,v0) (u1,v1) (u0,v1)`, all four vertices carrying the
  same diffuse — **the colour comes entirely from vertex diffuse.**

| call | original | alignment |
|---|---|---|
| `K.drawText(str, x, y, scale, color)` | `FUN_00404dd0` | **centred**: pen starts at `x - width*0.5` |
| `K.drawTextRight(str, x, y, scale, color)` | `FUN_00404e70` | **right-aligned**: pen starts at `x - width`, so the run ends at `x` |
| `K.drawTextAt(str, x, y, scale, color)` | `FUN_00404f10` | **left**: pen starts at `x` |
| `K.measureText(str, scale)` | — | `Σ(glyph width + gap)`, trailing gap included |
| `K.glyphMetrics(ch, scale, out?)` | `FUN_00404c30` | `{u0,u1,v0,v1,w,h,kern}` |

`glyphMetrics` returns a **shared scratch object** unless you pass `out` — read
what you need before the next call, or pass `{}`.

All three drawing entry points return the number of quads emitted (= the
string length) and force this state, exactly as `FUN_00404f10` does:

```
cull NONE · stage-1 COLOROP DISABLE · SetTexture(font, NULL) ·
alpha blend ON · SRCBLEND = SRCALPHA · DESTBLEND = INVSRCALPHA
```

They do **not** touch Z (glyph quads sit at `z = 0.01`, `rhw = 100`) and they
do **not** set stage 0 — the text engine assumes the `applyDefaultState()`
baseline `MODULATE(TEXTURE, DIFFUSE)`. If your effect switched stage 0 to
`SELECTARG2/DIFFUSE` for untextured 2D work, restore MODULATE before drawing
text or the glyphs come out as solid blocks.

The real call sites, for reference:

```js
K.drawText('sagacity', 320, 190, 256, colour);            // credits, screen centre
K.drawTextRight('hard facts # we are better', 620, 384, 140, colour);
K.drawTextRight('amsterdam', 540, y, 64, colour);
```

---

## 10. Textures — `K.createTexture(pixels, w, h, flags = 0)` (FUN_00403bd6)

`pixels` is a `Uint32Array` of packed D3DCOLOR `0xAARRGGBB` — the format every
procedural generator in the intro produces. Sizes are clamped to the device's
maximum (and the source point-resampled if the clamp bites), then handed to the
shim's `createTexture`. The 16-bit / alpha-only DDraw surface formats the
original could pick are irrelevant — everything is RGBA8 — so `flags` survives
only for call-site fidelity (bit 1 = prefer 32-bit, bit 2 = alpha format).
Sizes used by the intro: 64², 256², 512².

`K.updateTexture(handle, pixels)` re-uploads level 0 (the animated-texture path).
`K.setTextureHandle(tex0, tex1?)` is `FUN_0040406d`: disable stage 1's COLOROP,
then bind stage 0 and stage 1 (or NULL). `setTextureHandle(null)` clears both.

---

## 11. Worked example — build, shade and draw a mesh, then a text line

```js
import { MiniD3D7, D3DCOLOR_ARGB,
         D3DRS_ZENABLE, D3DRS_ZWRITEENABLE, D3DRS_CULLMODE, D3DRS_ALPHABLENDENABLE,
         D3DZB_TRUE, D3DCULL_CCW,
         D3DTSS_COLOROP, D3DTSS_COLORARG1, D3DTSS_COLORARG2,
         D3DTOP_MODULATE, D3DTOP_DISABLE, D3DTA_TEXTURE, D3DTA_DIFFUSE } from './minid3d7.js';
import { Kernel, createGeoSphere, createCamera, createParticles } from './kernel.js';

const d3d = new MiniD3D7(canvas);
d3d.applyDefaultState();
const K = new Kernel(d3d);

// --- init (once) -------------------------------------------------------
const sphere = createGeoSphere(14, 100.0, 1.0, 0);   // 1962 verts / 3920 faces
const cam    = createCamera(0, 0, -300, 0, 0, 0);
const parts  = createParticles(2048);

const px = new Uint32Array(64 * 64);
for (let i = 0; i < px.length; i++) px[i] = D3DCOLOR_ARGB(255, 255, 210, 90);
const tex = K.createTexture(px, 64, 64, 0);

// --- per frame (t comes from the MUSIC clock, see timeline.js) ----------
d3d.Clear(3, 0, 1.0);

cam.ex = Math.sin(t) * 300; cam.ez = Math.cos(t) * -300;
cam.fov = 90;
K.setCamera(cam);                       // PROJECTION + VIEW

d3d.SetRenderState(D3DRS_ZENABLE, D3DZB_TRUE);
d3d.SetRenderState(D3DRS_ZWRITEENABLE, 1);
d3d.SetRenderState(D3DRS_ALPHABLENDENABLE, 0);
d3d.SetRenderState(D3DRS_CULLMODE, D3DCULL_CCW);
d3d.SetTextureStageState(0, D3DTSS_COLOROP, D3DTOP_MODULATE);
d3d.SetTextureStageState(0, D3DTSS_COLORARG1, D3DTA_TEXTURE);
d3d.SetTextureStageState(0, D3DTSS_COLORARG2, D3DTA_DIFFUSE);
d3d.SetTextureStageState(1, D3DTSS_COLOROP, D3DTOP_DISABLE);
d3d.SetTexture(0, tex);

// pulse the vertex colours — this is the sort of thing effects do per frame
for (let i = 0; i < sphere.nVerts; i++) {
  const b = i * 8;
  const k = 128 + 127 * Math.sin(sphere.verts[b + 1] * 0.05 + t);
  sphere.vertsU32[b + 3] = D3DCOLOR_ARGB(255, k, k, 255);
}

sphere.flags = 1;                       // rebuild the rotation each draw
sphere.rx = t * 0.3; sphere.ry = t * 0.7;
sphere.px = 0; sphere.py = 0; sphere.pz = 0;
K.meshEnvMapUV(sphere, cam, 1.0, 1);    // sphere-map uv into texcoord set 0
K.drawMesh(sphere);

// billboards — always cull NONE
parts.count = 64;
for (let i = 0; i < parts.count; i++) {
  parts.pos[i*3] = …; parts.pos[i*3+1] = …; parts.pos[i*3+2] = …;
  parts.size[i]  = 20;
  parts.color[i] = D3DCOLOR_ARGB(255, 255, 180, 60);
}
d3d.setCullMode(0);
d3d.setAlphaBlend(1);
K.drawParticles(parts, cam);

// overlays + text (2D, no Z)
d3d.SetRenderState(D3DRS_ZENABLE, 0);
K.drawRect2D(20, 424, 620, 432, 0xFFD7B45A);
K.drawText('lost vegas', 320, 30, 256, 0xFFD7B45A);   // centred on x = 320
```

---

## 12. Decompile ambiguities (things a later reader should know)

1. **`FUN_00402860`'s three `SetTransform` calls** were emitted by Ghidra with
   unrecovered arguments. Resolved from the disassembly: PROJECTION gets the
   `FUN_00401eb0` result, VIEW and WORLD both get identity.
2. **`FUN_00402a60` lost its parameters entirely** in the decompile. Resolved
   from the disassembly: `(particleObject, viewMatrix)`; VIEW is set to identity
   for the draw and restored to `viewMatrix` afterwards.
3. **`FUN_00404dd0` / `FUN_00404e70`** decompile identically (Ghidra dropped
   the width accumulator). They differ by one instruction: `dd0` subtracts
   `(w+gap) * 0.5` per character (centring), `e70` subtracts `(w+gap)`
   (right alignment). Both take **five** arguments — Ghidra recovered four; the
   fifth is the D3DCOLOR.
4. **`FUN_00404f10`'s two `SetRenderState` calls** had no arguments in the
   decompile; they are `SRCBLEND = SRCALPHA (5)` and `DESTBLEND = INVSRCALPHA (6)`.
   The text engine does **not** touch the Z states.
5. **The glyph struct's field order** is `[u0, u1, v0, v1, w, h, kern]` —
   Ghidra's local naming in `FUN_00404c30` makes it look like `[u0, v0, u1, v1]`;
   the rect table really is `x0, y0, x1, y1` and the assignments are
   interleaved.
6. `FUN_00402d00`'s first argument is an **integer vertex index** that Ghidra
   typed as `float` — the call sites pass float bit patterns like `1.4013e-45`
   (= 1), `8.40779e-45` (= 6), `1.54143e-44` (= 11), `1.82169e-44` (= 13).
7. `FUN_00402d00`'s angle is `acos(dot/|a|²)` computed as
   `atan2(t, -sqrt(1-t²)) + (t < 0 ? 3π/2 : -π/2)`.
8. **Texcoord set 1 of billboard quads** is never written by the original
   (stage 1 is DISABLEd for particles); this port mirrors set 0 into it so the
   vertex block is deterministic.
9. The slerped edge points inherit their colour/uv from the whole 32-byte copy
   of endpoint A; `createGeoSphere` overwrites both afterwards, so it is
   invisible — but effects that build meshes with `slerpEdge`-like code should
   know.
