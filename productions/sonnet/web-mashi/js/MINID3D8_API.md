# MINID3D8_API.md — the shim's public API

`minid3d8.js` is a Direct3D 8 **fixed-function** shim over WebGL2, written for
the restoration of *Sonnet* (threestate, Assembly 2001 64k intro, 1st place).
It implements exactly the subset of `IDirect3DDevice8` the original binary
uses, as reverse-engineered in `re/engine/D3D8_API.md`, so ported effect code
transcribes from the decompile almost line for line.

It descends from `web-lv/js/minid3d7.js` (the Lost Vegas D3D7 shim). **If you
know that shim, read §2 and §12 before writing anything** — several defaults
are the exact reverse here and the mistakes are silent.

Verified by `test/minid3d8_test.html`: **116/116 assertions pass** in headless
Chrome (ANGLE/Metal). Run it with `node test/run_minid3d8_test.mjs`.

---

## 1. Quick start

```js
import {
  MiniD3D8, D3DMatrix, makeVertexScratch,
  FVF_XYZ_NORMAL_DIFFUSE_TEX2, FVF_SONNET_STRIDE,
  D3DTS_WORLD, D3DTS_VIEW, D3DTS_PROJECTION,
  D3DPT_TRIANGLELIST, D3DFMT_INDEX16, D3DCLEAR_TARGET, D3DCLEAR_ZBUFFER,
} from './minid3d8.js';

const d3d = new MiniD3D8(document.getElementById('screen'));
d3d.applyDefaultState();     // the post-CreateDevice baseline, D3D8_API.md §1.5
d3d.BeginScene();

function frame() {
  d3d.resetLayerState();     // FUN_0040184c — start every layer from here
  d3d.SetTransform(D3DTS_PROJECTION,
    D3DMatrix.perspectiveFovDegLH(90, 4 / 3, 1.0, 1000.0));
  d3d.SetTransform(D3DTS_VIEW, D3DMatrix.lookAtLH(eye, at));
  d3d.SetTransform(D3DTS_WORLD, objectMatrix);
  d3d.DrawIndexedPrimitiveUP(D3DPT_TRIANGLELIST, 0, numVerts, numTris,
                             indices, D3DFMT_INDEX16, verts, 44);
  d3d.presentAndRestoreBackbuffer(clearColor);   // FUN_0040149b + FUN_00402c72(0)
  requestAnimationFrame(frame);
}
```

---

## 2. Conventions — read this before writing any effect

| | |
|---|---|
| **Matrices** | Row-major, row-vector, left-handed: `v' = v · WORLD · VIEW · PROJECTION`. `m[12..14]` is the translation row `_41.._43`. Handed to WebGL verbatim — reading a row-major array as column-major *is* the transpose, which is exactly what turns D3D's row-vector product into GL's column-vector one. |
| **Depth** | D3D clip z ∈ `[0,w]`. The original's projection matrix is kept bit-exact and fixed up in the vertex shader (`pos.z = 2*pos.z - pos.w`). |
| **Winding** | `gl.frontFace(gl.CW)` once, so `D3DCULL_CCW` → `cullFace(BACK)`, `D3DCULL_CW` → `cullFace(FRONT)`. |
| **Colours** | `D3DCOLOR` is `0xAARRGGBB`, which on x86 is bytes B,G,R,A. Vertex blocks upload raw; the vertex shader unswizzles with `.zyxw`. |
| **Filter/address** | Per texture *stage*, via cached WebGL2 sampler objects — not per texture object. |
| **2D** | **There is no XYZRHW path.** 2D is drawn in NDC with identity WORLD/VIEW/PROJECTION (`reset2D()`). NDC **+y is UP** — the opposite of D3D screen space. |
| **Texture v** | Content textures: row 0 → `t` 0, so D3D `v` == GL `t`, unflipped. Render targets are the exception — see §9. |

---

## 3. The vertex format

There is exactly one: **`FVF_XYZ_NORMAL_DIFFUSE_TEX2` = `0x252`, stride 44**
(`SetVertexShader(0x252)` at 0x401803 is the only vertex-format call in the
binary). `fvfStride()` throws on anything else.

| offset | type | field |
|---|---|---|
| 0 | 3×f32 | `x, y, z` — model space, or NDC for the identity-transform 2D |
| 12 | 3×f32 | `nx, ny, nz` — normal (lighting **and** the sphere map) |
| 24 | u32 | `diffuse` — `D3DCOLOR` `0xAARRGGBB` |
| 28 | 2×f32 | `u0, v0` — texcoord set 0 |
| 36 | 2×f32 | `u1, v1` — texcoord set 1 |

`makeVertexScratch(0x252, n)` returns `{ stride: 44, strideF: 11, bytes, f32,
u32, base(i), normalIndex(i), colorIndex(i), uv0Index(i), uv1Index(i) }`.

minid3d7's `0x242` / `0x244` and its whole `rhw` reconstruction path are gone.

---

## 4. Device methods

### Frame boundary

| method | original | notes |
|---|---|---|
| `BeginScene()` / `EndScene()` | vtbl 0x88 / 0x8c | bookkeeping only |
| `Present()` | vtbl 0x3c | flush + frame counter. **Does not assert `!inScene`** — see §12 |
| `presentAndRestoreBackbuffer(clearColor)` | `FUN_0040149b` + `FUN_00402c72(0)` | Present → EndScene → backbuffer → Clear(TARGET\|ZBUFFER) → BeginScene |
| `Clear(Count, pRects, Flags, Color, Z, Stencil)` | vtbl 0x90 | full COM form; `Clear(Flags, Color, Z)` also accepted. Ignores `ZWRITEENABLE`, like D3D. Rect lists unsupported (the original always passes `(0, NULL)`) |
| `GetDeviceCaps()` | vtbl 0x1c | |

### Transforms

| method | notes |
|---|---|
| `SetTransform(state, mat)` | **`D3DTS_WORLD` is `0x100`**, `VIEW`=2, `PROJECTION`=3, `TEXTURE0`=0x10, `TEXTURE1`=0x11. Unknown states **throw** |
| `GetTransform(state)` | returns a clone |
| `SetViewport(x, y, w, h, minZ, maxZ)` / `GetViewport()` | the original never calls this; the viewport follows the render target |
| `setRenderScale(s)` | shim extension: framebuffer-to-logical ratio for a supersampled remaster |

### Render state

`SetRenderState(state, value)` / `GetRenderState(state)`. Implemented for real:
`ZENABLE, ZWRITEENABLE, ZFUNC, ALPHATESTENABLE, ALPHAFUNC, ALPHAREF, SRCBLEND,
DESTBLEND, ALPHABLENDENABLE, CULLMODE, SHADEMODE, FOGENABLE, FOGCOLOR,
FOGTABLEMODE, FOGVERTEXMODE, FOGSTART, FOGEND, FOGDENSITY, RANGEFOGENABLE,
TEXTUREFACTOR, LIGHTING, AMBIENT, CLIPPLANEENABLE`.

States whose *default* the original relies on **throw if you change them**, so
a wrong assumption is loud: `NORMALIZENORMALS` (must stay FALSE), `COLORVERTEX`
(must stay TRUE), `DIFFUSEMATERIALSOURCE` (must stay `D3DMCS_COLOR1`),
**`AMBIENTMATERIALSOURCE` (must stay `D3DMCS_MATERIAL` — that is its D3D8
default, not `D3DMCS_COLOR1`; see `re/engine/AMBIENT_FIX.md`)**,
`SPECULARENABLE`, `STENCILENABLE`.
`DITHERENABLE` and `FILLMODE` are accepted and ignored.

Floats may be passed as real numbers or as D3D's raw DWORD bit patterns.

### The demo's own state helpers (`D3D8_API.md` §4.2 / §9.3)

| method | original | mapping |
|---|---|---|
| `setCullMode(n)` | `FUN_004018ec` | `0→NONE, 1→CW, 2→CCW` — **reversed vs. Lost Vegas** |
| `setBlendMode(n)` | `FUN_004019e6` | `0→opaque+Zwrite on, 1→additive+Zwrite off, 2→alpha+Zwrite off` |
| `setStage1Op(n)` | `FUN_004019a0` | `0→DISABLE, 1→ADD, 2→MODULATE`, on **both** COLOROP and ALPHAOP |
| `setAddressMode(stage, bWrap)` | `FUN_0040191b` | truthy→WRAP, 0→CLAMP, both axes |
| `setAlphaTest(on)` | `FUN_00401b45` | on → `GREATER` / `alphaRefDefault`; off → `ALWAYS` / 0 |
| `setFog(mode, color, start, end)` | `FUN_00401abf` | linear **vertex** fog + `RANGEFOGENABLE` |
| `setLighting(on, ambient)` | `FUN_00401b86` | **returns the previous `D3DRS_AMBIENT`** |
| `getLightingFlag()` | `FUN_00401bca` | the shadowed flag (`DAT_004747b0`) |
| `setTexTransform(stage, mode)` | `FUN_00401a3f` | `0→off, 1→camera-space-normal sphere map` |
| `applyMaterial(mat)` / `unapplyMaterial(mat)` | `FUN_00401d12` / `FUN_00401f8b` | the 16-bit flag word, §5 |
| `resetLayerState()` | `FUN_0040184c` | the per-layer baseline; **does not touch PROJECTION** |
| `reset2D()` | `FUN_00401bd0` | VIEW / PROJECTION / WORLD ← identity |
| `applyDefaultState()` | §1.5 | the post-`CreateDevice` baseline |

Mutable fields the helpers read: `d3d.alphaRefDefault` (`DAT_00474794`, 0x80),
`d3d.clearColor` (`DAT_00474790`), `d3d.fogState`, `d3d.rangeFogSupported`.

### Lighting

| method | notes |
|---|---|
| `SetMaterial(mat)` | `{Diffuse, Ambient, Specular, Emissive, Power}`. The vertex diffuse replaces `Diffuse` (so that field is stored only), but **`Ambient` is uploaded to the shader** and scales the whole ambient term (`AMBIENTMATERIALSOURCE` = `D3DMCS_MATERIAL`). Non-zero `Emissive`/`Specular` **throw** |
| `SetLight(index, light)` | **point lights only**; directional/spot throw. `{Type, Diffuse, Ambient, Position, Range, Falloff, Attenuation0/1/2}`. `Position` is WORLD space, `{x,y,z}` or `[x,y,z]`. `Attenuation1` is clamped to ≥ 1e-4, as `FUN_00405da8` does |
| `LightEnable(index, bool)` / `GetLight` / `GetLightEnable` | `MAX_LIGHTS` = 8; a higher index throws |

The model, per vertex:

```
N = normal · WORLD                          // NOT renormalised, see §12
for each enabled light within Range:
    d    = |lightPos - worldPos|
    att  = 1 / (a0 + a1·d + a2·d²)
    lit += att · (lightDiffuse · max(dot(N, L), 0) + lightAmbient)
colour.rgb = saturate(vertexDiffuse.rgb · (D3DRS_AMBIENT + lit))
colour.a   = vertexDiffuse.a               // never touched by lighting
```

With `D3DRS_LIGHTING = 0` the vertex diffuse passes through untouched.

### Clip plane

`SetClipPlane(0, [a,b,c,d])` / `GetClipPlane(0)`; gated by
`D3DRS_CLIPPLANEENABLE` bit 0. Any other index, or any other enable bit,
throws. The plane is applied to **world-space** positions (the D3D8
software-vertex-processing convention) and the **visible** half-space is
`dot(worldPos, plane) >= 0` — the same sense as `gl_ClipDistance`.

### Texture stage state

`SetTextureStageState(stage, type, value)` / `GetTextureStageState`. Stages 0
and 1 only; anything else throws. Supported types: `COLOROP, COLORARG1,
COLORARG2, ALPHAOP, ALPHAARG1, ALPHAARG2, TEXCOORDINDEX,
TEXTURETRANSFORMFLAGS, ADDRESSU, ADDRESSV, MAGFILTER, MINFILTER, MIPFILTER`,
plus the shim convenience `D3DTSS_ADDRESS` (both axes at once).

The combiner implements every `D3DTOP_*` and `D3DTA_*` including the
`COMPLEMENT` / `ALPHAREPLICATE` modifier bits, with independent colour and
alpha pipelines, per-stage saturation, and the rule that `CURRENT` at stage 0
is `DIFFUSE`. `TEXCOORDINDEX` accepts 0, 1 and
`D3DTSS_TCI_CAMERASPACENORMAL` (0x10000); other generators throw.

### Textures

| method | notes |
|---|---|
| `createTexture(pixels, w, h, { levels, generateMipmap })` | `pixels` = `Uint32Array` of ARGB dwords (what the texgen makes) or RGBA bytes. **`levels` is mandatory and is never inferred** — it mirrors D3D8's `Levels`: `0` = full chain, `1` = single level, `n` = n levels. Per-site truth table: `D3D8_API.md` §6.1.1 |
| `createRenderTargetTexture(w, h, hasAlpha)` | level 0 only, `RGBA8`/`RGB8`, tagged `flipV` |
| `updateTexture(handle, pixels)` | re-uploads, rebuilding mips if the handle has them |
| `destroyTexture(handle)` | |
| `SetTexture(stage, tex)` / `GetTexture(stage)` | `null` binds the 1×1 opaque-white stand-in, so `MODULATE(TEXTURE, DIFFUSE)` on an untextured material passes the diffuse through — `FUN_00401d12` relies on this |

**Mipmaps are authentic here**, unlike Lost Vegas: 23 of 24 content textures
request a full chain and the original fills every level with its own filter.
`buildMipsD3D8Box(pixels, w, h, maxLevels)` is a port of it — a per-channel
integer average of the 2×2 block with an arithmetic `>> 2`, no gamma, on the
stored non-linear values. `gl.generateMipmap` is **not** bit-identical, so
`?quality=original` must leave `generateMipmap` false.

### Render targets

| method | notes |
|---|---|
| `SetRenderTarget(colorTarget, depthTarget)` | `null` colour target = the backbuffer. `depthTarget` must be `d3d.depthSurface` (or omitted). Resets the viewport to the target's size, as D3D8 does |
| `beginRenderTarget(rt, bClear)` | `FUN_00402b4f` |
| `endRenderTarget(bOnlyIfRTT)` | `FUN_00402c72` |
| `d3d.depthSurface`, `d3d.backBufferSurface` | the `DAT_00474888` / `DAT_00474884` stand-ins |

### Draw calls

```js
DrawPrimitiveUP(primType, primitiveCount, pVerts, stride)
DrawIndexedPrimitiveUP(primType, minVertexIndex, numVertices, primitiveCount,
                       pIndices, indexFormat, pVerts, stride)
```

**`primitiveCount` is a PRIMITIVE count.** D3D7's `DrawPrimitive` took a vertex
count; D3D8 takes primitives. Getting this wrong silently draws one third of a
triangle list. `verticesForPrimitives(primType, primCount)` is exported.

`stride` is an explicit parameter (the original always passes 44) rather than
being derived from the FVF, which keeps the shim quality-agnostic.

`pIndices` may be a `Uint16Array` (`D3DFMT_INDEX16` — every original call) **or
a `Uint32Array`**. The GL index type comes from the *array class*, not from
`indexFormat`, so a remaster tessellator that exceeds the 65 536-vertex limit
of `D3DFMT_INDEX16` needs no other change. A `Uint32Array` passed with
`indexFormat = D3DFMT_INDEX16` warns once.

### Debug / readback

| method | notes |
|---|---|
| `readbackRect(x, y, w = 4, h = 4)` | `FUN_00402907`, the lens-flare software occlusion query. D3D screen coords (y = 0 at the **top**); returns a `Uint32Array(w*h)` of `0xAARRGGBB`, row 0 = top. **Synchronous GPU→CPU stall** — see §11 |
| `readPixel(x, y)` / `readPixelGL(x, y)` | one RGBA pixel, D3D / GL y convention |
| `getError()` / `checkError(label)` | |

---

## 5. `applyMaterial` — the 16-bit flag word

`applyMaterial({ texture0, texture1, flags, alphaRef })` decodes
`FUN_00401d12`'s flag word (the original's `+0x04, +0x08, +0x0C, +0x14`) and
stashes saved state back onto the object for `unapplyMaterial`.

| flag | effect |
|---|---|
| `0x0001` | blend mode 1 (additive); with `0x0100` also forces `DESTBLEND = ONE` |
| `0x0002` | stage-1 texture matrix = ±2.0 sphere map (4× zoom) |
| `0x0004` | stage-1 op `ADD` |
| `0x0008` | stage-1 op `MODULATE` (wins over `0x0004`) |
| `0x0010` | `CULLMODE = NONE`, else `CCW` |
| `0x0020` | sphere map on stage 1 if a stage-1 texture exists, else stage 0 |
| `0x0040` | blend mode 2 (alpha blend) |
| `0x0080` | `ZWRITEENABLE = 0`, `ZFUNC = ALWAYS` |
| `0x0100` | alpha test `GREATER` / `alphaRef`, plus forced alpha blending |
| `0x0200` | stage-0 `CLAMP` addressing |
| `0x0400` | stage-0 `MIRROR` addressing (`0x0200` wins if both) |
| `0x0800` | fog off for this draw, restored by `unapplyMaterial` |
| `0x1000` | lighting off for this draw, ambient saved/restored |
| `0x2000` | the dissolve look: alpha test `GREATER`/3 and stage-0 `ALPHAOP = SUBTRACT` |
| `0x4000` | blend mode 2 **and** `ZWRITEENABLE = 1`, `ZFUNC = LESSEQUAL` |
| `0x8000` | global alpha fade: `TEXTUREFACTOR = (alphaRef<<24) \| 0xFFFFFF`, stage-1 `ALPHAARG1 = TFACTOR`, `ALPHAOP = SELECTARG1` |

---

## 6. `D3DMatrix`

`identity, zero, copy, clone, mul, D3DMatrix.multiply(a,b,out)`,
`translation, scaling, rotationX/Y/Z, lookAtLH`, `toGLMat4 / fromGLMat4`,
`transformPoint`.

```js
D3DMatrix.perspectiveFovLH(fovY /* RADIANS */, aspect, zn, zf)
D3DMatrix.perspectiveFovDegLH(fovDeg, aspect, zn, zf)
```

**`fovY` is the VERTICAL field of view** — `_11 = cot(fovY/2)/aspect`,
`_22 = cot(fovY/2)`. Lost Vegas's `perspectiveFovLH` took a *horizontal* fov
and is the exact reverse; copying it across gives an aspect-squared FOV error
that looks almost plausible. The timeline supplies **degrees**; the camera
defaults are exported as `PROJECTION_DEFAULTS = {fovDeg: 90, aspect: 4/3,
zn: 1.0, zf: 1000.0}`, and `DEG2RAD` is the original's own constant.

`sphereMapMatrix(scale = 0.5)` builds `FUN_00401a3f`'s texture matrix:
`u = scale·Nx + 0.5`, `v = -scale·Ny + 0.5`.

---

## 7. Constants exported

`D3DTS_*` (with `WORLD = 0x100`), `D3DPT_*`, `D3DFVF_*` +
`FVF_XYZ_NORMAL_DIFFUSE_TEX2` / `FVF_SONNET` / `FVF_SONNET_STRIDE`,
`D3DFMT_INDEX16` (0x65) / `D3DFMT_INDEX32`, `D3DRS_*`, `D3DMCS_*`, `D3DZB_*`,
`D3DCMP_*`, `D3DBLEND_*`, `D3DCULL_*` (NONE=1, CW=2, CCW=3), `D3DSHADE_*`,
`D3DFOG_*`, `D3DTSS_*` (+ `D3DTSS_TCI_CAMERASPACENORMAL`), `D3DTTFF_*`,
`D3DTOP_*`, `D3DTA_*`, `D3DTADDRESS_*`, `D3DTEXF_NONE/POINT/LINEAR`,
`D3DCLEAR_TARGET/ZBUFFER/STENCIL`, `D3DLIGHT_POINT/SPOT/DIRECTIONAL`,
`D3DPOOL_*`, `D3DUSAGE_RENDERTARGET`, `D3DFMT_A8R8G8B8/X8R8G8B8/A4R4G4B4/D24S8`,
`MAX_LIGHTS`, `DEG2RAD`, `PROJECTION_DEFAULTS`.

Helpers: `D3DCOLOR_ARGB`, `D3DCOLOR_RGBA`, `D3DCOLOR_XRGB`,
`D3DCOLOR_COLORVALUE`, `fvfStride`, `makeVertexScratch`, `buildMipsD3D8Box`,
`argbToRGBA`, `sphereMapMatrix`, `verticesForPrimitives`, `Vec3`, `D3DMatrix`.

---

## 8. Worked example — an indexed 3D mesh draw

```js
const v = makeVertexScratch(FVF_XYZ_NORMAL_DIFFUSE_TEX2, nv);
for (let i = 0; i < nv; i++) {
  const b = v.base(i), n = v.normalIndex(i);
  v.f32[b] = px[i]; v.f32[b+1] = py[i]; v.f32[b+2] = pz[i];
  // NOTE: hand over the generator's normals AS THEY ARE. They are an
  // unweighted average of face normals, deliberately NOT normalised.
  v.f32[n] = nx[i]; v.f32[n+1] = ny[i]; v.f32[n+2] = nz[i];
  v.u32[v.colorIndex(i)] = D3DCOLOR_ARGB(255, 255, 255, 255);
  v.f32[v.uv0Index(i)] = u[i];  v.f32[v.uv0Index(i)+1] = vv[i];
  v.f32[v.uv1Index(i)] = u2[i]; v.f32[v.uv1Index(i)+1] = v2[i];
}
d3d.SetTransform(D3DTS_WORLD, world);
d3d.applyMaterial(mat);
d3d.DrawIndexedPrimitiveUP(D3DPT_TRIANGLELIST, 0, nv, nTris,
                           idx16, D3DFMT_INDEX16, v.bytes, FVF_SONNET_STRIDE);
d3d.unapplyMaterial(mat);
```

2D is the same minus the transforms: `d3d.reset2D()` and emit NDC directly,
remembering **+y is up**.

---

## 9. Deliberate divergences from the original hardware

1. **The shared depth-stencil is per-size.** The original creates ONE
   1024×512 `D3DFMT_D24S8` and binds it to the 640×480 backbuffer *and* to
   every 64/128/256/512-square render-target texture, relying on D3D8's rule
   that the depth surface may be larger than the render target. WebGL2 forbids
   a mismatched depth attachment, so the shim keeps a `DEPTH_COMPONENT24`
   renderbuffer **per render-target size** behind the single logical
   `d3d.depthSurface`. Safe because both target-switch paths (`FUN_00402b4f`,
   `FUN_00402c72`) `Clear` depth, so no depth content ever survives a switch.
   No stencil is allocated; none is ever used.
2. **Render-target textures are sampled with `v` flipped.** D3D's RT texel
   (0,0) is the top-left = NDC (−1,+1); GL's is the bottom-left. Content
   textures upload row 0 → `t` 0 so D3D `v` == GL `t`, but a target written
   through the rasteriser comes out upside down relative to that. RT handles
   carry `flipV: true` and the vertex shader flips `t` at sample time. Net
   result matches the original; the intermediate texture's memory layout does
   not.
3. **Alpha test is a fragment `discard`.** WebGL2 has no fixed-function alpha
   test. Behaviour is identical for opaque rasterisation; only the (unused)
   interaction with early-Z differs.
4. **`Present` is a flush, not a flip.** WebGL composites when the rAF callback
   returns. `Present` deliberately does **not** assert `!inScene`, because
   `FUN_0040149b` presents inside a `BeginScene`/`EndScene` pair.
5. **`D3DRS_DITHERENABLE` is ignored.** The original dithers into a 16-bit back
   buffer; we render RGBA8.
6. **`D3DTADDRESS_BORDER` maps to `CLAMP_TO_EDGE`** (no WebGL2 border colour).
   Never selected by Sonnet.
7. **`readbackRect` is `gl.readPixels`, not `CopyRects` + `LockRect`.** Same
   data, same stall class.
8. **Only 2 texture stages and 1 clip plane exist.** Anything more throws
   rather than silently degrading.
9. **The `D3DFMT_A4R4G4B4` packing path is not implemented.** Every content
   texture site passes `alpha = 0`, so the 4444 branch of `FUN_00403e48` is
   dead code. Textures are RGBA8 throughout.

---

## 10. Uncertainties — where the shim guesses, loudly

These correspond to `D3D8_API.md` §10 plus two decisions the RE did not pin
down. Each is implemented as documented, with a comment at the site, and where
possible an exception or a `console.warn` on unexpected input.

1. **`applyMaterial` flag ORDER.** §5.6 lists the flags as a table, not as code
   order, and no single literal order satisfies every documented combination.
   The shim applies: cull → blend mode → the `0x0080` depth override →
   `0x4000`. Blend mode runs first because `setBlendMode` owns `ZWRITEENABLE`
   and that is what stops transparent geometry writing depth; `0x0080`'s "else"
   branch therefore only restores `ZFUNC`. If a material combination looks
   wrong in-scene, this is the first thing to re-derive.
2. **`unapplyMaterial` restores stage-0 `ALPHAOP`.** Flag `0x2000` leaves it on
   `SUBTRACT`, and nothing documented restores it (`resetLayerState` does not
   touch stage-0 ops), which would leak the dissolve look into the next draw.
   The shim restores `MODULATE`. Possibly divergent from the original.
3. **Sphere-map normal normalisation.** `D3DRS_NORMALIZENORMALS` is FALSE, so
   the shim feeds the **raw** camera-space normal to
   `D3DTSS_TCI_CAMERASPACENORMAL`, consistently with the lighting path. Real
   2001 drivers may have normalised it. Flip with
   `new MiniD3D8(canvas, { sphereMapNormalize: true })`.
4. **`D3DRS_RANGEFOGENABLE`.** Only set if the card reported
   `D3DPRASTERCAPS_FOGRANGE`. The shim assumes it was on (radial distance);
   `new MiniD3D8(canvas, { rangeFogSupported: false })` reproduces a card
   without it.
5. **Material flag `0x0002`'s ±2.0 texture matrix** is applied to
   `D3DTS_TEXTURE1` unconditionally, *after* `0x0020` has already set the ±0.5
   one. Read as intentional (a zoomed environment map on the second layer), but
   it could be an original bug they kept.
6. **`buildMipsD3D8Box` on a degenerate axis.** When a dimension reaches 1 the
   original's 2×2 loop has no documented behaviour; the shim clamps the second
   sample to the last row/column (so the `>>2` of a duplicated pair is the
   average of the two real texels) and `console.warn`s once. Only the 2048×512
   font page reaches this.
7. **`D3DRS_FOGTABLEMODE != D3DFOG_NONE`** would mean pixel fog; the shim still
   evaluates the factor per vertex and warns once. The original always sets
   `NONE`.
8. **The second texture-coordinate set** is kept fully independent, as
   `TEXCOORDINDEX = stage` implies. It is *not* collapsed onto set 0 even if it
   turns out to always be a copy — the sphere-map path proves the two sets are
   independently meaningful.

---

## 11. Performance notes

### The upload strategy is load-bearing — do not "optimise" it

Every draw calls `bufferData(data)` — **orphaning**, not `bufferSubData`, not a
streaming arena. Measured on the sibling project (2000 draws, ANGLE/Metal,
`gl.finish()` on both sides of the clock, best of 3):

```
bufferSubData @0, exact-size buffer ....... 160.6 us/call
bufferSubData at a rising offset in 1 MB .. 122.8 us/call
bufferData(capacity) once/frame + subData . 249.3 us/call
bufferData(data) every draw  <-- we do this   7.8 us/call
no upload at all (floor) .................... 1.6 us/call
```

The conventionally-recommended arena pattern is 15× **slower** here, because
the cost is in `bufferSubData` itself, not in aliasing. On Lost Vegas this one
issue was the difference between 320 ms and 8 ms per frame. If you ever
re-measure: `gl.finish()` immediately before starting *and* before stopping the
clock, after warm-up, and assert frame content plus `gl.getError() === 0` **in
the same task as the timing** — writes past a buffer's end fail silently and
look like a huge speedup.

### What the shim already skips for you

Redundant `SetRenderState` / `SetTextureStageState` / `SetTexture` /
`SetTransform` calls are compared and dropped before touching GL. Matrices are
recomposed and uploaded only when dirty; the combiner goes up as one
`uniform1iv` of 12 ints; texture and sampler binds are shadowed per unit;
lights are compacted and uploaded only while `D3DRS_LIGHTING` is on.

### The one expensive call

`readbackRect` is a synchronous GPU→CPU stall: `gl.readPixels` flushes the
pipeline and blocks. That is **faithful** — locking and reading the back buffer
was expensive in 2001 too — and it is only 4×4 pixels once per lens flare, so
it is affordable. Do not use it for anything else.

---

## 12. If you know minid3d7, these are the traps

| | minid3d7 (Lost Vegas) | minid3d8 (Sonnet) |
|---|---|---|
| `perspectiveFovLH` fov | **horizontal** | **vertical** |
| `D3DTS_WORLD` | 1 | **0x100** |
| FVF | `0x242` / `0x244`, XYZRHW for 2D | **only `0x252`**, 2D is NDC |
| draw counts | **vertex** count | **primitive** count |
| lighting | none | point lights, materials, ambient |
| fog | EXP table fog on eye-z | **LINEAR vertex fog on radial distance** |
| `setCullMode` | `1→CCW, 2→CW` | **`1→CW, 2→CCW`** |
| mipmaps | remaster-only addition | **authentic** — 23 of 24 textures |
| clip planes / RTT / alpha test | none | implemented |
| `Present` in a scene | asserted against | **allowed** |

---

## 13. Test page

`test/minid3d8_test.html` — 116 assertions, all passing in headless Chrome
(ANGLE/Metal), driven by `test/run_minid3d8_test.mjs`. Result objects use the
field name `pass`; the page also sets `window.__results`, `window.__pass` and
`window.__done`.

Coverage: the constant traps and `SetTransform` throwing on the D3D7 `WORLD`
value; `perspectiveFovLH` being vertical (numeric *and* an NDC edge check);
NDC 2D with +y up; primitive-vs-vertex counts in both draw entry points;
`Uint32Array` indices; the stride-44 field offsets; texture `v` orientation;
uv-set routing to stage 1; the DISABLE/ADD/MODULATE stage-1 toggle; the white
fallback texture; both cull directions; depth ordering; all three blend modes;
point lighting including range, attenuation, ambient-only, vertex-diffuse
replacement and the `|n| < 1` darkening; linear range fog proved radial by an
off-axis quad, with alpha untouched; the sphere map; the clip plane and its
enable bit; alpha test; `D3DTOP_SUBTRACT` on the alpha pipeline; the
`D3DTA_TFACTOR` global fade; six `applyMaterial` flag combinations and their
unapply; `resetLayerState` / `reset2D`; `buildMipsD3D8Box` byte-exactness and
truncation; render-to-texture at two sizes with working depth and correct
v-orientation; `readbackRect`; `presentAndRestoreBackbuffer` inside a scene;
and a composite frame with `gl.getError() === 0`.

**Not covered:** the `gl_ClipDistance` / `EXT_clip_cull_distance` path.
Chrome exposes the extension on none of ANGLE's Metal, GL or SWiftShader
backends in this environment, so the tested clip-plane behaviour is always the
fragment-`discard` fallback. The `gl_ClipDistance` branch is code-complete but
unexercised; it should be re-verified on the first machine that reports the
extension.
