# D3D7_API.md — Direct3D 7 call surface used by "Lost Vegas"

This is the **contract for `minid3d7.js`**. It lists every Direct3D 7 / DirectDraw 7
COM method the engine calls, the vtable offset it is called through, and the exact
argument values passed. Everything below is derived from `re/out/lv.c`
(Ghidra decompile, image base `0x400000`) cross-referenced against the DX7 SDK
vtable layouts.

The port is a **fullscreen 640×480×16 exclusive-mode D3D7 HAL** app. It uses the
**fixed-function pipeline** with **2 texture stages**, pre-lit vertices (lighting
disabled), Z-buffered, and a flip chain. No vertex buffers for scene geometry —
everything goes through immediate-mode `DrawPrimitive` / `DrawIndexedPrimitive`
with user pointer arrays. (VBs are *not* used; the only `IDirectDrawSurface7::Lock`
path is texture upload.)

---

## 0. Dynamic loading (no static D3D imports)

Only `DDRAW.DLL` is loaded dynamically (KERNEL32/DSOUND/USER32/WINMM are static).
`FUN_00405170` is a generic `LoadLibraryA`+`GetProcAddress` resolver driven by the
table at `PTR_s_DDRAW_DLL_0041b6e8`. Two entry points are resolved into globals:

| Global      | ddraw.dll export       | Role |
|-------------|------------------------|------|
| `DAT_004f4f88` | `DirectDrawEnumerateA` | enumerate drivers, capture primary GUID |
| `DAT_004f4f8c` | `DirectDrawCreateEx`   | create the DX7 DirectDraw7 object |

All D3D7 interfaces are then obtained by COM `QueryInterface` off the DirectDraw7
object — there is no `d3d7.dll`; D3D7 lives inside ddraw.dll.

### IIDs (read from `.rdata`)
| Address     | GUID | Interface |
|-------------|------|-----------|
| `0x412158` | `{15E65EC0-3B9C-11D2-B92F-00609797EA5B}` | **IID_IDirectDraw7** |
| `0x412228` | `{F5049E77-4861-11D2-A407-00A0C90629A8}` | **IID_IDirect3D7** |
| `0x412258` | `{84E63DE0-46AA-11CF-816F-0000C020156E}` | **IID_IDirect3DHALDevice** (hardware) |

---

## 1. Device / surface creation path — `FUN_004041df`

Global holder struct `G` = `DAT_004b4eb8` (24 bytes, `VirtualAlloc`'d):

| offset | field | type |
|--------|-------|------|
| `G+0x00` | back-buffer width  = **640** (`0x280`) | DWORD |
| `G+0x04` | back-buffer height = **480** (`0x1e0`) | DWORD |
| `G+0x08` | `IDirect3D7*` | ptr |
| `G+0x0c` | **`IDirect3DDevice7*`** (the device — dereferenced everywhere as `*(int**)(G+0xc)`) | ptr |
| `G+0x10` | back-buffer surface `IDirectDrawSurface7*` (render target) | ptr |
| `G+0x14` | Z-buffer surface `IDirectDrawSurface7*` | ptr |

Other globals: `DAT_004b4f5c` = `IDirectDraw7*`, `DAT_004b4f60` = **primary/front
surface** (the flip chain root), `DAT_004b4f64` = clear color (32-bit ARGB).

Ordered call sequence (this is what the shim must emulate, in order):

```
DirectDrawEnumerateA(FUN_004041b6, 0)             ; callback stores 1st driver GUID
DirectDrawCreateEx(GUID, &DD7, IID_IDirectDraw7, 0)

DD7->SetCooperativeLevel(hwnd, 0x813)             ; [vtbl 0x50]
        0x813 = DDSCL_FULLSCREEN|DDSCL_ALLOWREBOOT|DDSCL_EXCLUSIVE|DDSCL_FPUSETUP
DD7->SetDisplayMode(640, 480, 16, 0, 0)           ; [vtbl 0x54]  16-bit color

; --- primary surface + 1 back buffer (flip chain) ---
DDSURFACEDESC2 desc; size=0x7c
  dwFlags   = 0x21   (DDSD_CAPS|DDSD_BACKBUFFERCOUNT)
  ddsCaps   = 0x6218 (PRIMARYSURFACE|FLIP|COMPLEX|3DDEVICE|VIDEOMEMORY)
  dwBackBufferCount = 1
DD7->CreateSurface(&desc, &primary /*DAT_004b4f60*/, 0)   ; [vtbl 0x18]

DDSCAPS2 caps = { DDSCAPS_BACKBUFFER(0x4) }
primary->GetAttachedSurface(&caps, &G[0x10] /*backbuffer*/)  ; [surf vtbl 0x30]

backbuffer->QueryInterface(IID_IDirect3D7, &G[0x08])         ; [surf vtbl 0x00]
G.d3d7->CreateDevice(IID_IDirect3DHALDevice, backbuffer, &G[0x0c] /*device*/) ; [d3d7 vtbl 0x10]

; --- Z buffer ---
G.d3d7->EnumZBufferFormats(IID_IDirect3DHALDevice, FUN_004040d2, 0)  ; [d3d7 vtbl 0x18]
        FUN_004040d2 keeps the format whose dwZBufferBitDepth == 0x10 (16-bit)
DDSURFACEDESC2 zdesc; size=0x7c
  dwFlags = 0x1007 (DDSD_CAPS|DDSD_WIDTH|DDSD_HEIGHT|DDSD_PIXELFORMAT)
  dwWidth=640 dwHeight=480
  ddpfPixelFormat = <picked 16-bit z format>
  ddsCaps = 0x20000 (DDSCAPS_ZBUFFER)
DD7->CreateSurface(&zdesc, &G[0x14] /*zbuf*/, 0)            ; [vtbl 0x18]
backbuffer->AddAttachedSurface(zbuf)                       ; [surf vtbl 0x0c]

device->SetRenderTarget(backbuffer, 0)                     ; [dev vtbl 0x20]
device->EnumTextureFormats(FUN_004040f4, 0)                ; [dev vtbl 0x10] picks tex formats
```

`FUN_004040f4` is the **texture-format enumerator callback**: it records the best
32-bit (masks → `DAT_004b4f18`), 16-bit (`DAT_004b4f38`) and alpha
(`DAT_004b4ed8`) `DDPIXELFORMAT`s. These masks feed the texture uploader (§5).

Then the initial pipeline state is set (§2–§3), device caps are read
(`device->GetCaps(&D3DDEVICEDESC7)` [vtbl 0x0c]) — `dwMaxTextureWidth/Height` are
stored to `DAT_0041a2b0/DAT_0041a2b4` and used to clamp texture sizes — and
`BeginScene` is called.

---

## 2. IDirect3DDevice7 — vtable offset → method (every offset the engine uses)

Device pointer = `*(int**)(DAT_004b4eb8 + 0xc)`.

| vtbl | Method | Where / notes |
|------|--------|---------------|
| `0x0c` | **GetCaps**(&D3DDEVICEDESC7) | init, read max texture dims |
| `0x10` | **EnumTextureFormats**(cb, ctx) | init, callback `FUN_004040f4` |
| `0x14` | **BeginScene**() | frame start (`FUN_004049a6`) |
| `0x18` | **EndScene**() | frame end (`FUN_004049a6`) |
| `0x20` | **SetRenderTarget**(surf, 0) | init |
| `0x24` | **GetRenderTarget**(&surf) | texture creation (to reach the DDraw obj) |
| `0x28` | **Clear**(cnt, rects, flags, color, z, stencil) | `FUN_00404984` (§4) |
| `0x2c` | **SetTransform**(type, &D3DMATRIX) | WORLD=1 / VIEW=2 / PROJECTION=3 (§6) |
| `0x40` | **SetMaterial**(&D3DMATERIAL7) | init: diffuse rgb=1, ambient rgb=1 |
| `0x50` | **SetRenderState**(state, value) | §3 |
| `0x64` | **DrawPrimitive**(primType, fvf, pVtx, count, flags) | §7 |
| `0x68` | **DrawIndexedPrimitive**(primType, fvf, pVtx, nVtx, pIdx, nIdx, flags) | §7 |
| `0x8c` | **SetTexture**(stage, IDirectDrawSurface7*) | `FUN_0040406d` |
| `0x94` | **SetTextureStageState**(stage, type, value) | §3 |

The device is COM: offsets `0x00/0x04/0x08` are QueryInterface/AddRef/Release
(Release is used at shutdown, `FUN_00404780`).

> A handful of `+0x2c`, `+0x64`, `+0x68` call sites in effect code were emitted by
> Ghidra with unrecovered args (empty `()`), but they are the same SetTransform /
> DrawPrimitive / DrawIndexedPrimitive methods with the same FVFs listed in §7.

---

## 3. Render / texture-stage state — exact values

### 3a. SetRenderState (device vtbl 0x50) — the fixed baseline
Set once in `FUN_004041df`:

| D3DRENDERSTATETYPE | value | meaning |
|--------------------|-------|---------|
| `0x89` LIGHTING | 0 | **lighting OFF** (pre-lit diffuse vertices) |
| `0x8b` AMBIENT | `0xFFFFFFFF` | white ambient |
| `0x07` ZENABLE | 1 | Z test ON (D3DZB_TRUE) |
| `0x0e` ZWRITEENABLE | 1 | Z write ON |
| `0x17` ZFUNC | 4 | D3DCMP_LESSEQUAL |
| `0x1a` DITHERENABLE | 1 | dithering ON (16-bit) |
| `0x04` TEXTUREPERSPECTIVE | 1 | perspective-correct texturing ON |
| `0x13` SRCBLEND | 2 → later 5 | D3DBLEND_ONE, then SRCALPHA |
| `0x14` DESTBLEND | 2 → later 6 | D3DBLEND_ONE, then INVSRCALPHA |
| `0x1b` ALPHABLENDENABLE | 1 | alpha blending ON |

The default working blend is therefore **SRCALPHA / INVSRCALPHA** (standard
alpha), toggled per-effect by the dispatcher (§3c).

### 3b. Fog (`FUN_004047f9`, enabled on demand)
| state | value |
|-------|-------|
| `0x1c` FOGENABLE | 1 |
| `0x22` FOGCOLOR | `DAT_0041a2a8` (per-scene) |
| `0x23` FOGTABLEMODE | 1 = D3DFOG_EXP |
| `0x26` FOGDENSITY | `DAT_0041a2ac` (per-scene float) |

### 3c. SetTextureStageState (device vtbl 0x94) — 2-stage setup
Baseline from `FUN_004041df` (stage, type, value):

Stage 0 (base texture, modulated by vertex diffuse):
| type | value |
|------|-------|
| `0x01` COLOROP  | 4 MODULATE |
| `0x02` COLORARG1 | 2 D3DTA_TEXTURE |
| `0x03` COLORARG2 | 0 D3DTA_DIFFUSE |
| `0x04` ALPHAOP  | 4 MODULATE |
| `0x05` ALPHAARG1 | 2 D3DTA_TEXTURE |
| `0x06` ALPHAARG2 | 0 D3DTA_DIFFUSE |
| `0x0b` TEXCOORDINDEX | 0 |
| `0x10` MAGFILTER | 2 LINEAR |
| `0x11` MINFILTER | 2 LINEAR |
| `0x12` MIPFILTER | 2 POINT |

Stage 1 (second texture, combine with stage-0 result — a **detail/dual-texture**
setup):
| type | value |
|------|-------|
| `0x01` COLOROP  | 1 DISABLE  (toggled to 7 ADD / 4 MODULATE at runtime) |
| `0x02` COLORARG1 | 2 D3DTA_TEXTURE |
| `0x03` COLORARG2 | 1 D3DTA_CURRENT |
| `0x04` ALPHAOP  | 1 DISABLE |
| `0x0b` TEXCOORDINDEX | 1 |
| `0x10` MAGFILTER | 2 LINEAR |
| `0x11` MINFILTER | 2 LINEAR |
| `0x12` MIPFILTER | 2 POINT |

### 3d. The runtime state dispatcher — `FUN_0040484a(mode, arg)`
A compact switch the effects call to flip pipeline modes. **The shim should expose
these five as helpers**:

| mode | action | arg mapping |
|------|--------|-------------|
| 1 | stage-1 COLOROP | 0→DISABLE(1), 1→ADD(7), 2→MODULATE(4) — multitexture combine |
| 2 | stage 0&1 D3DTSS_ADDRESS (`0xc`) | 0→CLAMP(3), else WRAP(1) |
| 3 | SetRenderState CULLMODE (`0x16`) | 0→NONE(1), 1→CCW(3), 2→CW(2) |
| 4 | fog | 0→FOGENABLE off, else `FUN_004047f9` (fog on) |
| 5 | SetRenderState ALPHABLENDENABLE (`0x1b`) | 0→off, else on |

`FUN_0040406d(handle)` = SetTexture: sets stage0 = `*(handle+0x14)` and stage1
(or NULL) — the texture surface pointer lives at **offset +0x14** of a texture
handle struct (see §5).

---

## 4. Clear / Present / frame boundary

`FUN_00404984` (Clear):
```
device->Clear(0, NULL, 3, DAT_004b4f64, 1.0f, 0)   ; flags 3 = TARGET|ZBUFFER
```
`FUN_004049a6` (present, called once per frame from the message pump `FUN_00405346`):
```
device->EndScene()
primary->Flip(NULL, 1)          ; [surf vtbl 0x2c], flag 1 = DDFLIP_WAIT
FUN_00404984()                  ; Clear target+Z
device->BeginScene()
FUN_0040484a(2,1)  (address WRAP)
FUN_0040484a(3,0)  (cull NONE)
FUN_0040406d(0)    (clear textures)
```
So the model is: effects draw **between** `BeginScene`…`EndScene`; the pump ends
the scene, flips to the front buffer, clears, and begins the next scene.

---

## 5. Texture creation & upload — `FUN_00403bd6(out, pixels, w, h, flags)`

The only texture path. Produces a 6-DWORD **texture handle** written to `out`
whose **offset +0x14 holds the `IDirectDrawSurface7*`** used by SetTexture.

```
GetRenderTarget(&surf); surf->GetDDInterface(&DD7) [surf 0x90]; surf->Release()
DDSURFACEDESC2 desc; size=0x7c
  dwFlags = 0x101007 (CAPS|WIDTH|HEIGHT|PIXELFORMAT|TEXTURESTAGE)
  dwWidth/Height = w,h (clamped to DAT_0041a2b0/DAT_0041a2b4 caps, power-of-two)
  ddpfPixelFormat = 32-bit(DAT_004b4f18) or 16-bit(DAT_004b4f38) or alpha(DAT_004b4ed8)
                    selected by `flags` bits: &4→alpha, &2→16-bit override
  ddsCaps = DDSCAPS_TEXTURE (0x1000)
DD7->CreateSurface(&desc, &tex, 0)
tex->Lock(NULL, &desc, 0x820, 0)     ; [surf 0x64] 0x820 = DDLOCK_NOSYSLOCK|DDLOCK_WRITEONLY
   -- convert source ARGB8888 to dest format with per-channel shift/mask
      (FUN_0040404a computes shift, masks come from the DDPIXELFORMAT)
      handles 32-bit dest (desc.dwRGBBitCount==0x20) and 16-bit dest (==0x10)
tex->Unlock(NULL)                    ; [surf 0x80]
```

`flags` low byte selects source scaling (bit3 → half-res prescale) and whether the
temp buffer is freed. Callers pass sizes `0x40, 0x100, 0x200` (64/256/512²).

**For WebGL2:** this maps to `texImage2D` with `RGBA8`; the shim can ignore the
16-bit packing and keep everything RGBA8. The important part is: textures are
procedurally generated CPU-side into an ARGB8888 buffer, then uploaded once.

---

## 6. Transforms — left-handed, [0,1] depth

`SetTransform(type, &D3DMATRIX)` with type WORLD=1 / VIEW=2 / PROJECTION=3.
Matrix builders (row-major 4×4, 16 floats):

| fn | builds |
|----|--------|
| `FUN_00401a10` | identity |
| `FUN_004019d0` | zero |
| `FUN_00401a50` | set translation (row 3: `_41,_42,_43`) |
| `FUN_00401f50 / 00401fa0 / 00401ff0` | rotation X / Y / Z |
| `FUN_00401a70` | combined yaw rotation |
| `FUN_00401b50` | **LookAt view matrix** (eye, target) |
| `FUN_00401eb0` | **perspective projection** |

`FUN_00401eb0` output confirms the D3D LH convention with **z in [0,1]**:
```
m[10] (=_33) = zf/(zf-zn)
m[11] (=_34) = 1.0            ; w = z  → left-handed
m[14] (=_43) = -zn*zf/(zf-zn)
m[0]  = cot(fovx/2)
m[5]  = cot(fovy/2) * aspect_fix
```
The shim's WebGL projection must therefore map NDC z to [0,1] (or convert to
GL's [-1,1]) and use a **left-handed** basis (front faces / cull sense as in §3d).

`FUN_00402860` sets all three transforms per object: PROJECTION(3), VIEW(2),
WORLD(1). `FUN_00402760` composes and sets the VIEW matrix for a scene camera.

---

## 7. Draw calls & FVF (the vertex layouts the shim must translate)

Two FVFs only. **Decode the WebGL vertex attributes from these.**

### FVF `0x242` = XYZ | DIFFUSE | TEX2  (32-byte stride) — 3D scene geometry
`0x242 = D3DFVF_XYZ(0x002) | D3DFVF_DIFFUSE(0x040) | D3DFVF_TEX2(0x200)`
Layout: `float x,y,z` (12) · `DWORD diffuse` ARGB (4) · `float u0,v0` (8) · `float u1,v1` (8).
Vertices are **untransformed** (go through WORLD·VIEW·PROJECTION), pre-lit
(lighting off → diffuse used directly), two texcoord sets for dual-texturing.

- `FUN_00402180` (draw mesh object):
  `DrawIndexedPrimitive(D3DPT_TRIANGLELIST=4, 0x242, pVtx=obj[0x18], nVtx=obj[0x1a](u16), pIdx=obj[0x1b], nIdx=obj[0x1d](u16)*3, 0)`
- `FUN_00402a60` (particle/billboard quads):
  `DrawIndexedPrimitive(D3DPT_TRIANGLELIST=4, 0x242, verts, nVtx=count*4, indices, nIdx=count*6, 0)`

### FVF `0x244` = XYZRHW | DIFFUSE | TEX2  (36-byte stride) — 2D overlays / text
`0x244 = D3DFVF_XYZRHW(0x004) | D3DFVF_DIFFUSE(0x040) | D3DFVF_TEX2(0x200)`
Layout: `float x,y,z,rhw` (16) · `DWORD diffuse` (4) · `float u0,v0` (8) · `float u1,v1` (8).
**Pre-transformed screen-space** vertices (x,y in pixels, rhw=1) — bypass the
transform pipeline; used for the logo/font and full-screen overlays.

- `FUN_004049f5`: `DrawPrimitive(D3DPT_TRIANGLELIST=4, 0x244, pv, 3, 0x18)`
- `FUN_00404a3f`: `DrawPrimitive(D3DPT_TRIANGLEFAN=6, 0x244, pv, 4, 0x18)` (glyph/quad)

`flags 0x18 = D3DDP_DONOTLIGHT(0x10) | D3DDP_DONOTUPDATEEXTENTS(0x8)`.

**Primitive types seen:** TRIANGLELIST(4), TRIANGLEFAN(6). (No strips, points, or
lines.)

---

## 8. Shutdown — `FUN_00404780`
```
DD7->SetCooperativeLevel(hwnd, 8)   ; DDSCL_NORMAL
device->Release(); backbuffer->Release(); zbuf->Release(); d3d7->Release(); DD7->Release()
DestroyWindow(hwnd)
```

---

## 9. Minimum surface the shim (`minid3d7.js`) must implement

Device methods: `Clear`, `BeginScene`, `EndScene`, `SetTransform(WORLD/VIEW/PROJECTION)`,
`SetRenderState` (subset: LIGHTING, AMBIENT, ZENABLE, ZWRITEENABLE, ZFUNC,
DITHERENABLE, TEXTUREPERSPECTIVE, SRCBLEND, DESTBLEND, ALPHABLENDENABLE, CULLMODE,
FOGENABLE, FOGCOLOR, FOGTABLEMODE, FOGDENSITY), `SetTextureStageState`
(COLOROP/COLORARG1/2, ALPHAOP/ALPHAARG1/2, TEXCOORDINDEX, ADDRESS, MAG/MIN/MIPFILTER
for 2 stages), `SetTexture(stage,tex)`, `SetMaterial`, `DrawPrimitive`,
`DrawIndexedPrimitive`, `GetCaps` (return generous max texture dims).

Surface side: a `Flip`/present, a texture-create-from-ARGB (Lock/Unlock emulated
by a CPU pixel buffer + `texImage2D`).

Fixed config: 640×480 canvas, LH projection with [0,1] depth, 2-stage combiner
(MODULATE stage0 with diffuse; stage1 DISABLE/ADD/MODULATE), alpha blend
SRCALPHA/INVSRCALPHA, bilinear filtering, dithering irrelevant (RGBA8).
