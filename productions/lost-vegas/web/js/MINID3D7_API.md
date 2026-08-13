# MINID3D7_API.md — the shim's public API

`web-lv/js/minid3d7.js` exports **`MiniD3D7`**, a Direct3D 7 immediate-mode
device emulated on WebGL2, plus the D3D constants and a left-handed matrix
class. It is the rendering substrate for the "lost vegas" restoration: port
effects against *this*, not against raw WebGL, and the ported code should read
close to `re/out/lv.c`.

Dependencies: `./mathlib.js` (for `Vec3` only). Nothing else. Pure ES module.

Verified end-to-end in headless Chrome (ANGLE/Metal) by
`web-lv/test/minid3d7_test.html` — 35 assertions, all green. Keep it working.

---

## 1. Quick start

```js
import {
  MiniD3D7, D3DMatrix, makeVertexScratch, D3DCOLOR_ARGB,
  FVF_XYZ_DIFFUSE_TEX2, D3DPT_TRIANGLELIST,
  D3DTS_WORLD, D3DTS_VIEW, D3DTS_PROJECTION,
  D3DRS_CULLMODE, D3DCULL_CCW, D3DCLEAR_TARGET, D3DCLEAR_ZBUFFER,
} from './minid3d7.js';

const d3d = new MiniD3D7(document.getElementById('canvas'));  // 640x480 canvas
d3d.applyDefaultState();            // = the baseline from FUN_004041df
d3d.BeginScene();

// ... effects draw here ...

d3d.presentAndBeginNextFrame();     // = FUN_004049a6 (EndScene/Flip/Clear/BeginScene)
```

`new MiniD3D7(canvas, opts)` — `opts.preserveDrawingBuffer` (default false,
set it for screenshot tests), `opts.antialias` (default false; the original ran
a 16-bit HAL with no AA). Throws if WebGL2 is unavailable. The canvas size *is*
the render target size; the demo uses 640×480.

---

## 2. Conventions — read this before writing any effect

| Topic | Convention |
|---|---|
| **Matrices** | `D3DMatrix`: **row-major** `float[16]`, index = `row*4+col`, so `m[12..14]` is the translation row `_41.._43`. **Row-vector** algebra: `v' = v * M`, and the pipeline is `v * WORLD * VIEW * PROJECTION`. This is D3D's layout, **not** mathlib's `Mat4` (which is column-major GL). Do not mix them; convert with `D3DMatrix.fromGLMat4()` / `.toGLMat4()`. |
| **Handedness** | **Left-handed.** +X right, +Y up, **+Z away from the viewer**. `lookAtLH`, `perspectiveFovLH`. |
| **Depth** | D3D device depth **`[0,1]`** (near→far). The shim remaps to GL's `[-1,1]` *in the vertex shader* (`pos.z = 2*pos.z - pos.w`), so projection matrices stay bit-identical to the original's `FUN_00401eb0`. `Clear` takes `z = 1.0` for "far", as in the intro. |
| **Screen space** | D3D pixels: origin **top-left**, **y grows downward**, measured from the viewport's top-left corner. XYZRHW vertices and `SetViewport` use this. (`readPixel` uses it too; `readPixelGL` uses GL's bottom-left origin.) |
| **Winding / culling** | Front faces are **clockwise on screen**, D3D's left-handed default. `D3DCULL_CCW` (the intro's "cull mode 1") culls the counter-clockwise = back faces — that is the normal solid-object setting. `D3DCULL_CW` culls the other way, `D3DCULL_NONE` draws both. Internally: `gl.frontFace(gl.CW)` + `cullFace(BACK/FRONT)`. |
| **Colours** | `D3DCOLOR` = packed `uint32` **`0xAARRGGBB`**, i.e. **BGRA byte order** in memory. Build them with `D3DCOLOR_ARGB(a,r,g,b)`. Vertex diffuse is unswizzled in the shader; you never convert by hand. |
| **Texture coords** | `(u,v)`, **v=0 is the FIRST row of the source pixel buffer**, which is the top of the image on screen. No flip anywhere. `u,v` outside `[0,1]` obey the stage's address mode. |
| **Lighting** | There is none. `D3DRS_LIGHTING` is accepted and ignored; vertices are pre-lit through `DIFFUSE`, exactly as the intro does it. `SetMaterial` is a no-op. |
| **Vertex data** | Raw bytes in FVF layout (a `TypedArray` or `ArrayBuffer`), uploaded verbatim like D3D's user-pointer draws. Indices are **`Uint16Array`**. |
| **Return values** | Device methods return `0` (`D3D_OK`) so call sites can transcribe from the decompile. Real failures throw. |

---

## 3. Vertex formats

Exactly two, matching D3D7_API.md §7. Fill them with `makeVertexScratch()`
(§8) or write the bytes yourself.

### `FVF_XYZ_DIFFUSE_TEX2` = `0x242` — 32-byte stride (3D geometry)

| offset | type | field |
|---|---|---|
| 0 | 3 × f32 | `x, y, z` (untransformed; goes through WORLD·VIEW·PROJECTION) |
| 12 | u32 | `diffuse` — D3DCOLOR `0xAARRGGBB` |
| 16 | 2 × f32 | `u0, v0` — texcoord set 0 |
| 24 | 2 × f32 | `u1, v1` — texcoord set 1 |

### `FVF_XYZRHW_DIFFUSE_TEX2` = `0x244` — 36-byte stride (2D overlays, text, logo)

| offset | type | field |
|---|---|---|
| 0 | 4 × f32 | `x, y` in **screen pixels** (y down, from the viewport's top-left), `z` = device depth in **[0,1]**, `rhw` = **1/w** (use `1.0` for flat 2D) |
| 16 | u32 | `diffuse` |
| 20 | 2 × f32 | `u0, v0` |
| 28 | 2 × f32 | `u1, v1` |

XYZRHW vertices **bypass all three transforms**. The shim rebuilds a clip-space
position from the current viewport:

```
w    = 1 / rhw
ndcx = (x - vp.x) / vp.width  * 2 - 1
ndcy = 1 - (y - vp.y) / vp.height * 2     // the y flip
gl_Position = vec4(ndcx*w, ndcy*w, (2z-1)*w, w)
```

Multiplying by `w` is what preserves D3D's perspective-correct texcoord
interpolation when `rhw != 1`. A quad at x 100…200, y 50…100 covers exactly
those pixels — asserted pixel-by-pixel in the test page.

Depth still applies to XYZRHW draws: `z` is compared/written against the Z
buffer like any other fragment. Overlays normally set `D3DRS_ZENABLE, 0`.

`fvfStride(fvf)` returns 32 / 36. Any other FVF throws.

---

## 4. Device methods

### Frame boundary
| Method | Notes |
|---|---|
| `BeginScene()` / `EndScene()` | Bookkeeping only (`this.inScene`). |
| `Clear(flags, color, z)` | Short form. `flags` = `D3DCLEAR_TARGET \| D3DCLEAR_ZBUFFER`, `color` = D3DCOLOR, `z` = 1.0 for far. |
| `Clear(count, rects, flags, color, z, stencil)` | Full COM form, so decompiled sites transcribe verbatim (`Clear(0, null, 3, color, 1.0, 0)`). Rect lists are ignored — the intro always passes `(0, NULL)`. Honours D3D semantics: the clear ignores `ZWRITEENABLE`. |
| `Flip()` / `Present()` | `gl.flush()` + frame counter. WebGL presents when the rAF callback returns; there is no explicit page flip. |
| `presentAndBeginNextFrame(clearColor?)` | The whole of `FUN_004049a6`: EndScene → Flip → Clear(TARGET\|ZBUFFER) → BeginScene → address WRAP → cull NONE → textures cleared. Call once per frame. |
| `SetViewport(x, y, w, h, minZ = 0, maxZ = 1)` / `GetViewport()` | D3D coords (y from the top). Drives both `gl.viewport` (flipped) and the XYZRHW mapping. |
| `GetCaps()` | `{ dwMaxTextureWidth, dwMaxTextureHeight, wMaxTextureBlendStages: 2, wMaxSimultaneousTextures: 2 }`. |
| `SetMaterial(m)` | No-op (lighting is off). |

**The frame is driven by MUSIC POSITION, not wall clock** (FRAME_LOOP.md §Timing):
each scene runs `while (musicPos < THRESHOLD)`. That belongs in the timeline
driver, not here, but effects must take their time coordinate from it.

### Transforms
| Method | Notes |
|---|---|
| `SetTransform(type, mat)` | `type` ∈ `D3DTS_WORLD` (1), `D3DTS_VIEW` (2), `D3DTS_PROJECTION` (3). `mat` is a `D3DMatrix`, `Float32Array(16)` or `number[16]`, row-major. |
| `GetTransform(type)` | Returns a clone. |

The combined `WORLD*VIEW*PROJECTION` is recomputed lazily at draw time and
uploaded to WebGL **untransposed** — reading a D3D row-major array as GL's
column-major *is* the transpose, which converts row-vector into column-vector
algebra for free.

### Render state
`SetRenderState(state, value)` / `GetRenderState(state)`.

| Constant | Values | Effect |
|---|---|---|
| `D3DRS_ZENABLE` | `D3DZB_FALSE/TRUE` | `gl.enable(DEPTH_TEST)` |
| `D3DRS_ZWRITEENABLE` | 0/1 | `gl.depthMask` |
| `D3DRS_ZFUNC` | `D3DCMP_*` | `gl.depthFunc` |
| `D3DRS_ALPHABLENDENABLE` | 0/1 | `gl.enable(BLEND)` |
| `D3DRS_SRCBLEND` / `D3DRS_DESTBLEND` | `D3DBLEND_*` | `gl.blendFunc`. `BOTHSRCALPHA`/`BOTHINVSRCALPHA` expand to their implied pair. |
| `D3DRS_CULLMODE` | `D3DCULL_NONE/CW/CCW` | see §2 |
| `D3DRS_SHADEMODE` | `D3DSHADE_FLAT/GOURAUD` | FLAT uses a `flat` varying. **Caveat:** D3D's provoking vertex is the *first* of the primitive, GL's is the *last*, and WebGL2 cannot change it — only matters if an effect actually selects FLAT (the intro does not). |
| `D3DRS_FOGENABLE` | 0/1 | |
| `D3DRS_FOGCOLOR` | D3DCOLOR | |
| `D3DRS_FOGTABLEMODE` | `D3DFOG_EXP` (the intro), `EXP2`, `LINEAR` | |
| `D3DRS_FOGDENSITY` / `FOGSTART` / `FOGEND` | float | Pass a JS float. Raw D3D `*(DWORD*)&f` bit patterns are also decoded (any integer > 64 is treated as a bit pattern). |
| `D3DRS_TEXTUREFACTOR` | D3DCOLOR | feeds `D3DTA_TFACTOR` |
| `D3DRS_LIGHTING`, `AMBIENT`, `DITHERENABLE`, `TEXTUREPERSPECTIVE`, `SPECULARENABLE`, `COLORVERTEX`, `FILLMODE` | | Accepted and ignored — no lighting in this intro; RGBA8 needs no dithering; GL is always perspective-correct. |

Fog is computed from the **eye-space z** (left-handed, so positive forward) for
3D vertices, and from `w = 1/rhw` for XYZRHW vertices, matching D3D table fog.
It blends into RGB only; alpha is untouched.

`applyDefaultState()` replays the whole `FUN_004041df` baseline: lighting off,
Z on + LEQUAL + writes, alpha blend on with SRCALPHA/INVSRCALPHA, stage 0
MODULATE(texture, diffuse), stage 1 DISABLE, bilinear, WRAP.

### The runtime state dispatcher (`FUN_0040484a`)
The intro flips pipeline modes through one switch. Both forms are available:

```js
d3d.dispatchState(mode, arg);   // verbatim transcription
```
| mode | helper | arg |
|---|---|---|
| 1 | `setStage1Op(n)` | 0 → stage-1 COLOROP DISABLE, 1 → ADD, 2 → MODULATE |
| 2 | `setAddressMode(n)` | 0 → CLAMP on both stages, else WRAP |
| 3 | `setCullMode(n)` | 0 → NONE, 1 → CCW, 2 → CW |
| 4 | `setFog(n)` | 0 → fog off, else fog on (EXP) |
| 5 | `setAlphaBlend(n)` | 0 → off, else on |

Plus `enableFog(colorD3DCOLOR, density)` = `FUN_004047f9`.

### Texture stage state
`SetTextureStageState(stage, type, value)` / `GetTextureStageState(stage, type)`.
**Stages 0 and 1 only** (higher stages are silently ignored — the intro has two).

| Type | Accepted values |
|---|---|
| `D3DTSS_COLOROP`, `D3DTSS_ALPHAOP` | `D3DTOP_DISABLE`, `SELECTARG1`, `SELECTARG2`, `MODULATE`, `MODULATE2X`, `MODULATE4X`, `ADD`, `ADDSIGNED`, `ADDSIGNED2X`, `SUBTRACT`, `ADDSMOOTH`, `BLENDDIFFUSEALPHA`, `BLENDTEXTUREALPHA`, `BLENDFACTORALPHA`, `BLENDTEXTUREALPHAPM`, `BLENDCURRENTALPHA` |
| `D3DTSS_COLORARG1/2`, `D3DTSS_ALPHAARG1/2` | `D3DTA_DIFFUSE`, `D3DTA_CURRENT`, `D3DTA_TEXTURE`, `D3DTA_TFACTOR`, optionally OR'd with `D3DTA_COMPLEMENT` (0x10) or `D3DTA_ALPHAREPLICATE` (0x20) |
| `D3DTSS_TEXCOORDINDEX` | 0 or 1 — which of the two texcoord sets this stage samples with |
| `D3DTSS_ADDRESS` | sets U and V together; `D3DTSS_ADDRESSU` / `ADDRESSV` set them separately. `D3DTADDRESS_WRAP/MIRROR/CLAMP/BORDER` (BORDER falls back to CLAMP — WebGL2 has no border colour) |
| `D3DTSS_MAGFILTER` | `D3DTFG_POINT` / `D3DTFG_LINEAR` |
| `D3DTSS_MINFILTER` | `D3DTFN_POINT` / `D3DTFN_LINEAR` |
| `D3DTSS_MIPFILTER` | `D3DTFP_NONE/POINT/LINEAR` — only bites on textures created with `D3DTEX_MIPMAP`; the original uploads a single level, so normally inert |

Combiner semantics implemented faithfully: colour and alpha pipelines are
independent; `CURRENT` at stage 0 is `DIFFUSE`; an `ALPHAOP` of `DISABLE`
passes `CURRENT`'s alpha through; a `COLOROP` of `DISABLE` at stage 0 disables
all texturing (output = diffuse) and at stage 1 ends the chain; each stage's
output is saturated to `[0,1]`. Filtering and addressing are per-stage (WebGL2
sampler objects), not per-texture, exactly as in D3D.

A stage with no texture bound samples an opaque white 1×1, so
`MODULATE(TEXTURE, DIFFUSE)` degrades to plain vertex colour.

### Textures
| Method | Notes |
|---|---|
| `createTexture(pixels, w, h, flags = 0)` | `pixels` may be a **`Uint32Array` of packed D3DCOLOR `0xAARRGGBB`** (what the intro's generators produce — repacked to RGBA here, the one unavoidable CPU conversion), a `Uint8Array` of RGBA bytes, or `null` for an uninitialised surface. Always RGBA8 internally: `D3DTEX_16BIT` and `D3DTEX_ALPHA` are accepted and ignored (they only chose a DDraw surface format). `D3DTEX_MIPMAP` builds a mip chain. Returns a handle `{ tex, width, height, hasMips }`. |
| `createTextureFromImage(image, flags = 0)` | From an `<img>` / `<canvas>` / `ImageBitmap`, no v flip. |
| `updateTexture(handle, pixels)` | Re-upload level 0 (the animated-texture path). |
| `destroyTexture(handle)` | |
| `SetTexture(stage, handle \| null)` | `IDirect3DDevice7::SetTexture`. |
| `SetTextureHandle(tex0, tex1 = null)` | `FUN_0040406d`: sets both stages at once; `SetTextureHandle(null)` clears both, as the frame pump does. |

Non-power-of-two sizes are fine (WebGL2 supports them with REPEAT).

### Draw calls
```js
DrawPrimitive(primType, fvf, pVtx, vertexCount, flags = 0)
DrawIndexedPrimitive(primType, fvf, pVtx, nVtx, pIdx, nIdx, flags = 0)
```
* `primType` — `D3DPT_TRIANGLELIST` (4) and `D3DPT_TRIANGLEFAN` (6) are what
  the intro uses; POINTLIST/LINELIST/LINESTRIP/TRIANGLESTRIP also map through.
* `fvf` — `0x242` or `0x244`.
* `pVtx` — TypedArray / ArrayBuffer of raw FVF bytes. Over-allocated scratch is
  fine: only `count * stride` bytes are uploaded.
* `vertexCount` / `nVtx` — a **vertex** count, as in D3D7 (not a primitive count).
* `pIdx` — `Uint16Array`; `nIdx` is the **index** count (`triangles * 3`).
* `flags` — accepted and ignored (`0x18` = `D3DDP_DONOTLIGHT|DONOTUPDATEEXTENTS`).

### Debug
`getError()`, `checkError(label)` (throws), `readPixel(x, y)` (D3D screen
coords, y from the top), `readPixelGL(x, y)` (GL window coords), `gl` (the raw
context), `canvas`, `frameCount`.

---

## 5. `D3DMatrix`

Row-major, left-handed, row-vector. `.m` is the `Float32Array(16)`.

| | |
|---|---|
| `new D3DMatrix(src?)` | identity, or a copy |
| `.identity()` `.zero()` `.copy(o)` `.clone()` | |
| `.mul(b)` | `this = this * b` (row-major order: apply `this` first, then `b`) |
| `D3DMatrix.multiply(a, b, out)` | `out = a * b`; `out` may alias, or be `null` for a new one |
| `D3DMatrix.translation(x,y,z)` | `FUN_00401a50` |
| `D3DMatrix.scaling(x,y,z)` | |
| `D3DMatrix.rotationX/Y/Z(radians)` | `FUN_00401f50/fa0/ff0` |
| `D3DMatrix.lookAtLH(eye, at, up = [0,1,0])` | `FUN_00401b50`. Accepts `Vec3` or `[x,y,z]`. |
| `D3DMatrix.perspectiveFovLH(fovH, aspect, zn, zf)` | `FUN_00401eb0`. **`fovH` is the full HORIZONTAL fov in radians** (`_11 = cot(fovH/2)`, `_22 = cot(fovH/2)*aspect`) — the reverse of D3DX's vertical-fov convention, kept so the demo's own fov values port unchanged. `aspect` = width/height (4/3). |
| `.transformPoint(v, out?)` | `v * M` with w=1 |
| `.toGLMat4(out?)` / `D3DMatrix.fromGLMat4(m)` | transpose to/from mathlib's column-major `Mat4` |

Composition order is the D3D one: `local * rotation * translation` builds a
world matrix that applies the rotation first.

---

## 6. Constants exported

`D3DTS_*`, `D3DPT_*`, `D3DFVF_*` + `FVF_XYZ_DIFFUSE_TEX2` / `FVF_XYZRHW_DIFFUSE_TEX2`,
`D3DRS_*`, `D3DZB_*`, `D3DCMP_*`, `D3DBLEND_*`, `D3DCULL_*`, `D3DSHADE_*`,
`D3DFOG_*`, `D3DTSS_*`, `D3DTOP_*`, `D3DTA_*`, `D3DTADDRESS_*`, `D3DTFG_*`,
`D3DTFN_*`, `D3DTFP_*`, `D3DCLEAR_*`, `D3DDP_*`, `D3DTEX_*`.

Helpers: `D3DCOLOR_ARGB(a,r,g,b)`, `D3DCOLOR_RGBA(r,g,b,a)`,
`D3DCOLOR_COLORVALUE(r,g,b,a)` (0..1 floats), `fvfStride(fvf)`,
`makeVertexScratch(fvf, n)`, `argbToRGBA(u32, n)`, `D3DMatrix`, `MiniD3D7`.

---

## 7. `makeVertexScratch(fvf, count)`

Allocates one FVF-layout block with the aliased views you need:

```js
const v = makeVertexScratch(FVF_XYZ_DIFFUSE_TEX2, 4);
v.bytes     // Uint8Array  — pass this to Draw*Primitive
v.f32       // Float32Array over the same buffer
v.u32       // Uint32Array over the same buffer (for the D3DCOLOR)
v.stride    // 32
v.strideF   // 8   (stride in 4-byte units)
v.base(i)   // index of vertex i's first float, in f32
v.colorIndex(i)  // index of vertex i's diffuse dword, in u32
```

Allocate these **once per effect**, not per frame.

---

## 8. Worked example A — indexed 3D draw (FVF `0x242`)

A textured, vertex-coloured quad through the full transform pipeline, as
`FUN_00402180` draws a mesh object.

```js
import {
  MiniD3D7, D3DMatrix, makeVertexScratch, D3DCOLOR_ARGB,
  FVF_XYZ_DIFFUSE_TEX2, D3DPT_TRIANGLELIST,
  D3DTS_WORLD, D3DTS_VIEW, D3DTS_PROJECTION,
  D3DRS_ZENABLE, D3DRS_ZWRITEENABLE, D3DRS_CULLMODE, D3DRS_ALPHABLENDENABLE,
  D3DZB_TRUE, D3DCULL_CCW,
  D3DTSS_COLOROP, D3DTSS_COLORARG1, D3DTSS_COLORARG2,
  D3DTOP_MODULATE, D3DTOP_DISABLE, D3DTA_TEXTURE, D3DTA_DIFFUSE,
} from './minid3d7.js';

// --- once ---
const quad = makeVertexScratch(FVF_XYZ_DIFFUSE_TEX2, 4);
const corners = [[-1,-1,0, 0,1], [-1,1,0, 0,0], [1,1,0, 1,0], [1,-1,0, 1,1]];
corners.forEach(([x, y, z, u, vv], i) => {
  const b = quad.base(i);
  quad.f32[b] = x; quad.f32[b+1] = y; quad.f32[b+2] = z;   // position
  quad.u32[quad.colorIndex(i)] = D3DCOLOR_ARGB(255, 255, 200, 64);
  quad.f32[b+4] = u;  quad.f32[b+5] = vv;                  // texcoord set 0
  quad.f32[b+6] = u;  quad.f32[b+7] = vv;                  // texcoord set 1
});
// CLOCKWISE on screen = front face under D3DCULL_CCW
const idx = new Uint16Array([0, 1, 2, 0, 2, 3]);

const proj = D3DMatrix.perspectiveFovLH(Math.PI / 2, 640 / 480, 0.2, 100);

// --- per frame (t comes from the MUSIC clock) ---
const view  = D3DMatrix.lookAtLH([0, 0, -4], [0, 0, 0], [0, 1, 0]);
const world = D3DMatrix.multiply(D3DMatrix.rotationX(0.4),
                                 D3DMatrix.rotationY(t * 0.001), null);

d3d.SetTransform(D3DTS_PROJECTION, proj);
d3d.SetTransform(D3DTS_VIEW, view);
d3d.SetTransform(D3DTS_WORLD, world);

d3d.SetRenderState(D3DRS_ZENABLE, D3DZB_TRUE);
d3d.SetRenderState(D3DRS_ZWRITEENABLE, 1);
d3d.SetRenderState(D3DRS_CULLMODE, D3DCULL_CCW);
d3d.SetRenderState(D3DRS_ALPHABLENDENABLE, 0);

d3d.SetTextureStageState(0, D3DTSS_COLOROP, D3DTOP_MODULATE);
d3d.SetTextureStageState(0, D3DTSS_COLORARG1, D3DTA_TEXTURE);
d3d.SetTextureStageState(0, D3DTSS_COLORARG2, D3DTA_DIFFUSE);
d3d.SetTextureStageState(1, D3DTSS_COLOROP, D3DTOP_DISABLE);
d3d.SetTexture(0, myTexture);

d3d.DrawIndexedPrimitive(D3DPT_TRIANGLELIST, FVF_XYZ_DIFFUSE_TEX2,
                         quad.bytes, 4, idx, 6, 0);
```

## 9. Worked example B — 2D XYZRHW overlay quad (FVF `0x244`)

A blended screen-space quad drawn as a TRIANGLEFAN, the way the logo/font layer
does it (`FUN_00404a3f`). Screen pixels, y down, no transforms involved.

```js
import {
  makeVertexScratch, D3DCOLOR_ARGB, FVF_XYZRHW_DIFFUSE_TEX2, D3DPT_TRIANGLEFAN,
  D3DRS_ZENABLE, D3DRS_ALPHABLENDENABLE, D3DRS_SRCBLEND, D3DRS_DESTBLEND,
  D3DRS_CULLMODE, D3DCULL_NONE, D3DBLEND_SRCALPHA, D3DBLEND_INVSRCALPHA,
} from './minid3d7.js';

const ov = makeVertexScratch(FVF_XYZRHW_DIFFUSE_TEX2, 4);

// x0,y0 .. x1,y1 in SCREEN PIXELS, y measured DOWNWARD from the top-left.
function overlayQuad(x0, y0, x1, y1, color, u0, v0, u1, v1) {
  const p = [[x0,y0,u0,v0], [x1,y0,u1,v0], [x1,y1,u1,v1], [x0,y1,u0,v1]];
  for (let i = 0; i < 4; i++) {
    const b = ov.base(i);
    ov.f32[b]   = p[i][0];   // x, pixels
    ov.f32[b+1] = p[i][1];   // y, pixels (down)
    ov.f32[b+2] = 0.0;       // z: device depth in [0,1] — 0 = nearest
    ov.f32[b+3] = 1.0;       // rhw = 1/w — 1.0 for flat 2D
    ov.u32[ov.colorIndex(i)] = color;
    ov.f32[b+5] = p[i][2]; ov.f32[b+6] = p[i][3];   // uv set 0
    ov.f32[b+7] = p[i][2]; ov.f32[b+8] = p[i][3];   // uv set 1
  }
  return ov;
}

d3d.SetRenderState(D3DRS_ZENABLE, 0);              // overlays ignore the Z buffer
d3d.SetRenderState(D3DRS_CULLMODE, D3DCULL_NONE);  // and are never culled
d3d.SetRenderState(D3DRS_ALPHABLENDENABLE, 1);
d3d.SetRenderState(D3DRS_SRCBLEND, D3DBLEND_SRCALPHA);
d3d.SetRenderState(D3DRS_DESTBLEND, D3DBLEND_INVSRCALPHA);
d3d.SetTexture(0, fontTexture);

// 200x60 box whose top-left corner sits at pixel (20, 380), half transparent
overlayQuad(20, 380, 220, 440, D3DCOLOR_ARGB(128, 255, 255, 255), 0, 0, 1, 1);
d3d.DrawPrimitive(D3DPT_TRIANGLEFAN, FVF_XYZRHW_DIFFUSE_TEX2, ov.bytes, 4, 0x18);
```

The four vertices are listed top-left → top-right → bottom-right → bottom-left,
which is clockwise on screen — the front-face order, so the quad also survives
`D3DCULL_CCW` if an effect leaves culling on.

---

## 10. Known divergences from real D3D7

Everything here is deliberate; none of it affects the intro as reverse
engineered, but effect authors should know:

1. **Flat shading provoking vertex** — D3D takes the first vertex of a
   primitive, GL the last. `D3DRS_SHADEMODE` is honoured otherwise.
2. **`D3DTADDRESS_BORDER`** falls back to CLAMP_TO_EDGE (no border colour in
   WebGL2).
3. **16-bit surfaces and dithering** — everything is RGBA8. The original's
   16-bit back buffer and `DITHERENABLE` produce visible dither in captures of
   the real thing; the port will look cleaner (and banding-free).
4. **Stages above 1** are ignored; `SetTexture` for stage > 1 is a no-op.
5. **No alpha test, stencil, W-buffer, specular or lighting** — none is used.
6. **`Clear` rectangle lists** are ignored.
7. **Mip chains** are only built when you pass `D3DTEX_MIPMAP`; the original
   uploads a single level, so `D3DTSS_MIPFILTER` is normally inert.
8. **Z precision** — the original ran a 16-bit Z buffer; WebGL2 gives 24-bit.
   Z fighting present in the original may be absent here.

---

## 11. Performance notes

**A faithful per-object draw loop is affordable — keep the original's call
structure.** The finale issues 824 `DrawIndexedPrimitive` calls per frame (two
per L-system tree node, exactly as the original did) and that frame costs
~8 ms end to end. Do not restructure an effect to batch unless the original
batched; matching the call structure is a fidelity goal.

Measured per-call cost of `DrawIndexedPrimitive` (2000 draws, sub-pixel
geometry so the number is call-bound not fill-bound, `gl.finish()` on both
sides of the clock, best of 3, ANGLE/Metal): **~1 µs/call**, which is at or
below an equivalent hand-written raw WebGL2 loop.

### The upload strategy is load-bearing — do not "optimise" it

Geometry is uploaded with `bufferData` (orphaning) per draw, **not**
`bufferSubData`. This is counter-intuitive and cost a 34× frame-time
regression before it was measured, so it is worth stating plainly:

| strategy | µs/call |
|---|---|
| `bufferSubData` at offset 0 into a persistent buffer | 160.6 |
| `bufferSubData` at a rising offset in a 1 MB arena | 122.8 |
| `bufferData(capacity)` once per frame + `bufferSubData` | 249.3 |
| **`bufferData(data)` every draw — what the shim does** | **7.8** |
| no upload at all (floor) | 1.6 |

On ANGLE a partial update of a buffer the GPU may still be reading drops the
backend onto a synchronising path whose cost dwarfs everything else. Handing
it a whole new data store instead lets it allocate fresh storage and keep the
old one alive until the GPU is done. The usual desktop-GL advice ("use a
streaming arena with rising offsets, avoid re-specifying buffers") is actively
harmful here.

`test/bufstrat.html` re-runs that table. If this is ever ported to another
backend, re-run it before changing strategy; `test/percall.html` checks the
per-call cost against a raw WebGL2 baseline.

### What the shim already skips for you
Redundant D3D state is free — the shim shadows GL state and emits only deltas:
* `SetTransform` with an unchanged matrix does nothing (the 2D text path re-sets
  identity per glyph); the WORLD·VIEW·PROJECTION product is composed lazily and
  uploaded once per change.
* `uWV` is only uploaded while fog is enabled, and **no** matrix is uploaded for
  XYZRHW draws — the shader ignores them.
* `SetTexture`/`SetTextureStageState` with unchanged values do nothing; texture,
  sampler and active-unit bindings are shadowed.
* The whole 2-stage combiner is one packed `uniform1iv`, sent only when a stage
  value actually changes.
* Attribute pointers are re-issued only when the FVF changes.

So the steady-state cost of a draw is: 2 × `bufferData`, one `uniformMatrix4fv`
when the world matrix moved, and the draw call itself.

**Batching**, when an effect legitimately wants it, needs no special API: one
`DrawPrimitive`/`DrawIndexedPrimitive` call already accepts a vertex block
covering as many primitives as you like (`FUN_00402a60` does exactly this for
particle quads — `count*4` vertices and `count*6` indices in a single call).

### Measuring
Frame-time numbers taken without an explicit flush on **both** sides of the
timed region are unreliable — previously queued GPU work lands inside your
measurement and gets attributed to whatever call happens to be running. Prefer
rAF-to-rAF wall time for frame cost, `gl.finish()`-bracketed loops for per-call
cost, and **always assert the frame still has content** (`readPixels` +
`gl.getError()` in the same task): a "fast" result caused by an upload silently
failing with `INVALID_OPERATION`, or by a scene that has faded to black, looks
exactly like a successful optimisation.

## 12. Test page

`web-lv/test/minid3d7_test.html` — open it directly (any static server) or
drive it headless; it writes `window.__results` / `window.__pass` and prints a
pass/fail list. It asserts the XYZRHW pixel mapping, the y flip, texture v
orientation, both cull directions in 2D and 3D, LH projection orientation,
depth ordering, the three blend modes, the DISABLE/ADD/MODULATE combiner
toggle, the BGRA unpack, and EXP fog, then renders a textured indexed cube plus
a blended overlay. **Re-run it after touching `minid3d7.js`.**
