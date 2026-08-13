# Sonnet — the Direct3D 8 layer

Reverse engineered from `unpacked/sonnet_u.exe` (image base 0x400000, code at
VA 0x401000) and `re/out/sonnet.c`. Every claim carries the VA of its evidence.
Read `re/ENGINE.md` first for the timeline/object architecture.

**Headline facts**

| | |
|---|---|
| API | Direct3D **8.0** fixed function. `Direct3DCreate8(120)` — 120 = `D3D_SDK_VERSION` for DX8.0. Only import from `d3d8.dll`; **no d3dx8**. |
| Device | `D3DDEVTYPE_HAL`, adapter 0, **`D3DCREATE_SOFTWARE_VERTEXPROCESSING`** |
| Mode | **640×480 fullscreen**, 32-bit backbuffer, `D3DSWAPEFFECT_DISCARD` |
| Depth | app-created `D3DFMT_D24S8` surface, **1024×512**, `EnableAutoDepthStencil = FALSE` |
| Vertices | one FVF for the entire demo: **`0x252` = XYZ \| NORMAL \| DIFFUSE \| TEX2**, stride **44** |
| Geometry | **`DrawPrimitiveUP` / `DrawIndexedPrimitiveUP` only** — no vertex/index buffers, no streams |
| Primitives | `D3DPT_TRIANGLELIST` (4) and `D3DPT_TRIANGLEFAN` (6) only |
| Indices | **`D3DFMT_INDEX16` everywhere** |
| Shaders | none — `SetVertexShader` is called exactly once, with the FVF |
| Texture stages | **2**, never more |
| Lighting | **real D3D fixed-function lighting is used** (point lights, `SetLight`/`LightEnable`, material, ambient) — unlike Lost Vegas |
| Mipmaps | **yes** — nearly every content texture requests a full chain and fills it with a hand-written box filter |
| Viewport | `SetViewport` is **never called**; the default full-target viewport with `MinZ=0, MaxZ=1` is used throughout |

---

## 1. Device creation and present

### 1.1 The init function — `FUN_00401575` @ **0x401575**

Called from `FUN_004014ef(0x280, 0x1e0)` @ 0x4014ef, i.e. **640×480**
(`DAT_00474610` = width, `DAT_00474618` = height).

```
0x40157E  push 120                      ; D3D_SDK_VERSION (DX8.0)
0x401580  call 0x4161bc                 ; -> jmp [0x4170a8] = Direct3DCreate8
          DAT_004747a8 = IDirect3D8*
0x401596  pD3D->GetAdapterDisplayMode(0, &DAT_004746a8)     ; vtbl+0x20
          ; D3DDISPLAYMODE copied (4x movsd) to 0x474798:
          ;   0x474798 Width  0x47479c Height  0x4747a0 RefreshRate  0x4747a4 Format
```

**Fullscreen mode search** (only when `DAT_00474621 == 0`, which it always is —
`FUN_004014ef` clears it @ 0x4014f6), 0x4015B2–0x401629:

```
n = pD3D->GetAdapterModeCount(0)                            ; vtbl+0x18
for (i = 0; i < n; i++) {
    pD3D->EnumAdapterModes(0, i, &mode)                     ; vtbl+0x1c
    if (mode.Width  == 640 && mode.Height == 480 &&
        mode.RefreshRate == 0 &&
        (mode.Format == 0x15 || 0x14 || 0x16))              ; A8R8G8B8 / R8G8B8 / X8R8G8B8
        chosen = mode;                                      ; no break — LAST match wins
}
```

So the demo runs at **640×480 in a 32-bit display mode**, adapter-default refresh.

### 1.2 Depth format probe, 0x40166A–0x4016E1

`CheckDeviceFormat` (vtbl+0x28) is called three times, always as
`(Adapter=0, D3DDEVTYPE_HAL=1, AdapterFormat, Usage=D3DUSAGE_DEPTHSTENCIL(2), RType=D3DRTYPE_SURFACE(1), CheckFormat)`:

| VA | CheckFormat | meaning | result |
|---|---|---|---|
| 0x40168E | `0x4d` = 77 | `D3DFMT_D24X8` | if OK, `DAT_0047478c = 0x4d`, skip the D32 probe |
| 0x4016B6 | `0x47` = 71 | `D3DFMT_D32` | if OK, `DAT_0047478c = 0x47` |
| 0x4016DC | `0x4b` = 75 | `D3DFMT_D24S8` | **if this fails the whole init bails out** (`jnz 0x40181c`); if it succeeds `DAT_0047478c = 0x4b` unconditionally overwrites the earlier choice |

Net effect: **the depth-stencil format is always `D3DFMT_D24S8`**, and a card
without it gets no device at all. The first two probes are dead code. (High
confidence — the control flow is unambiguous in the disassembly.)

### 1.3 `D3DPRESENT_PARAMETERS` at `0x474660`

`memset(0x474660, 0, 0x34)` @ 0x401634 — 0x34 = 52 = `sizeof(D3DPRESENT_PARAMETERS)`
in D3D8, which pins the field offsets exactly.

| offset | VA | field | value |
|---|---|---|---|
| 0x00 | 0x474660 | `BackBufferWidth` | 640 |
| 0x04 | 0x474664 | `BackBufferHeight` | 480 |
| 0x08 | 0x474668 | `BackBufferFormat` | the enumerated 32-bit display format (`DAT_004747a4`) |
| 0x0C | 0x47466c | `BackBufferCount` | 0 (→ 1) |
| 0x10 | 0x474670 | `MultiSampleType` | 0 = `D3DMULTISAMPLE_NONE` |
| 0x14 | 0x474674 | `SwapEffect` | **1 = `D3DSWAPEFFECT_DISCARD`** (`mov [0x474674],ebx` @ 0x401672 with ebx=1, set by the `push 1 / pop ebx` pair at 0x401653/0x40165F — Ghidra gets this right) |
| 0x18 | 0x474678 | `hDeviceWindow` | NULL |
| 0x1C | 0x47467c | `Windowed` | `DAT_00474621` = **0 → FULLSCREEN** |
| 0x20 | 0x474680 | `EnableAutoDepthStencil` | **FALSE** |
| 0x24 | 0x474684 | `AutoDepthStencilFormat` | 0 |
| 0x28 | 0x474688 | `Flags` | 0 |
| 0x2C | 0x47468c | `FullScreen_RefreshRateInHz` | 0 |
| 0x30 | 0x474690 | `FullScreen_PresentationInterval` | 0 = `D3DPRESENT_INTERVAL_DEFAULT` |

### 1.4 `CreateDevice` @ 0x401709

```
pD3D->CreateDevice(                     ; vtbl+0x3c
    Adapter        = 0,
    DeviceType     = 1,                 ; D3DDEVTYPE_HAL
    hFocusWindow   = DAT_00474654,      ; the HWND from FUN_004013ce
    BehaviorFlags  = 0x20,              ; D3DCREATE_SOFTWARE_VERTEXPROCESSING
    pPresentationParameters = 0x474660,
    ppReturnedDeviceInterface = &DAT_004747ac)
```

**`0x20` is `D3DCREATE_SOFTWARE_VERTEXPROCESSING`** (`push 0x20` @ 0x4016F2), not
hardware. Consequences that matter for the port:

* The runtime does T&L, clipping, lighting and fog on the CPU. There is no
  hardware vertex-processing cap to respect, and **user clip planes are always
  available** (SW VP has no clip-plane count limit) — the demo uses one.
* All lighting/material/fog behaviour is the reference software path, so it is
  worth emulating exactly rather than approximating with whatever a driver did.

### 1.5 The device object and post-create baseline, 0x401714–0x401813

```
dev->GetDeviceCaps(&DAT_004746b8)                       ; vtbl+0x1c  -> D3DCAPS8 at 0x4746b8
SetRenderState(D3DRS_ZENABLE(7), TRUE)
SetRenderState(D3DRS_ZWRITEENABLE(0xe), TRUE)
SetRenderState(D3DRS_ZFUNC(0x17), D3DCMP_LESSEQUAL(4))
SetMaterial({ Diffuse=(1,1,1,0), Ambient=(1,1,1,0), Specular=0, Emissive=0, Power=0 })  ; vtbl+0xa8
for (stage = 0; stage < 2; stage++) {
    SetTextureStageState(stage, D3DTSS_MIPFILTER(0x12), D3DTEXF_LINEAR(2))
    SetTextureStageState(stage, D3DTSS_TEXCOORDINDEX(0x0b), stage)
    SetTextureStageState(stage, D3DTSS_MAGFILTER(0x10), D3DTEXF_LINEAR(2))
    SetTextureStageState(stage, D3DTSS_MINFILTER(0x11), D3DTEXF_LINEAR(2))
    SetTextureStageState(stage, D3DTSS_COLORARG1(2), D3DTA_TEXTURE(2))
    SetTextureStageState(stage, D3DTSS_COLORARG2(3), D3DTA_DIFFUSE(0))
    SetTextureStageState(stage, D3DTSS_COLOROP(1),   D3DTOP_MODULATE(4))
    SetTextureStageState(stage, D3DTSS_ALPHAARG1(5), D3DTA_TEXTURE(2))
    SetTextureStageState(stage, D3DTSS_ALPHAARG2(6), D3DTA_DIFFUSE(0))
    SetTextureStageState(stage, D3DTSS_ALPHAOP(4),   D3DTOP_MODULATE(4))
}
SetTextureStageState(1, D3DTSS_COLORARG2(3), D3DTA_CURRENT(1))
SetTextureStageState(1, D3DTSS_ALPHAARG2(6), D3DTA_CURRENT(1))
SetVertexShader(0x252)                                  ; vtbl+0x130 — the FVF, set ONCE, forever
FUN_00402bc9()   ; depth-stencil creation, below
FUN_004026be()   ; flare quad / material init
FUN_0040184c()   ; the per-layer state baseline, §8
```

The `SetMaterial` buffer is 0x44 = 68 bytes = `sizeof(D3DMATERIAL8)`, which
confirms vtbl+0xa8. Note **`Diffuse.a = 0` and `Ambient.a = 0`** — only rgb are
set to 1.0 (`fld1`/`fstp` at 0x401749..0x401771 hit offsets 0,4,8 and 0x10,0x14,0x18).

### 1.6 The depth-stencil surface — `FUN_00402bc9` @ **0x402bc9**

```
dev->GetRenderTarget(&DAT_00474884)                     ; vtbl+0x80 — the backbuffer surface
dev->CreateDepthStencilSurface(                         ; vtbl+0x68
      Width       = nextPow2(640) = 1024,               ; FUN_00402c29 @ 0x402c29
      Height      = nextPow2(480) = 512,
      Format      = DAT_0047478c = D3DFMT_D24S8,
      MultiSample = 0,
      &DAT_00474888)
dev->BeginScene()
FUN_00402c72(0)                                          ; bind + clear, below
```

The depth buffer is deliberately **oversized to the next power of two** so the
same surface can be bound alongside the 640×480 backbuffer *and* alongside the
128/256/512-square render-target textures (§6.2). `DAT_00474884` = backbuffer
surface, `DAT_00474888` = shared depth-stencil surface. Both released in
`FUN_00402c45` @ 0x402c45.

### 1.7 Present and the frame boundary — `FUN_0040149b` @ **0x40149b**

```
if (PeekMessageA(&msg,0,0,0,0)) { GetMessageA; TranslateMessage; DispatchMessageA; }
dev->Present(NULL, NULL, NULL, NULL)                     ; vtbl+0x3c  @ 0x4014E3
FUN_00402c72(0)
```

`FUN_00402c72(bOnlyIfRTT)` @ **0x402c72** — restore the backbuffer and start the
next frame:

```
if (!bOnlyIfRTT || DAT_0047488c != 0) {
    dev->EndScene()                                                    ; vtbl+0x8c
    DAT_0047488c = 0
    dev->SetRenderTarget(DAT_00474884, DAT_00474888)                   ; vtbl+0x7c
    dev->Clear(0, NULL, D3DCLEAR_TARGET|D3DCLEAR_ZBUFFER(3),
               DAT_00474790 /*clear colour*/, 1.0f, 0)                 ; vtbl+0x90
    dev->BeginScene()                                                  ; vtbl+0x88
}
```

**Note the ordering oddity:** `Present` is issued *while still inside* a
`BeginScene`/`EndScene` pair — the `EndScene` happens after it, in
`FUN_00402c72`. This was tolerated by 2001 drivers. For the port it just means
BeginScene/EndScene are bookkeeping and `Present` marks the frame boundary.

`DAT_00474790` is the global clear colour (a `D3DCOLOR`), set per effect scene.

### 1.8 Shutdown — `FUN_00401823` @ 0x401823

`FUN_00402c45()` (release RT + DS surfaces) → `FUN_00402756()` (release the 4×4
image surface) → `dev->Release()` → `pD3D->Release()`.

---

## 2. `IDirect3DDevice8` vtable map

Every offset that appears in the image, resolved. **Confidence is high for all
of them**: each was cross-checked against the argument count recovered from the
disassembly and against the semantics of the arguments, not from memory alone.
The decisive anchors are:

* vtbl+0x124 is called with **8 arguments + `this`** (disassembled at 0x40DF63) —
  `DrawIndexedPrimitiveUP` is the only 8-parameter method in the interface.
  That pins the tail of the table, and hence that the header this was built
  against has `GetInfo` at 0x104.
* vtbl+0xa8 takes a **68-byte** struct → `D3DMATERIAL8`; vtbl+0xb0 takes a
  **0x68-byte** struct → `D3DLIGHT8`; the present-params memset is **0x34**;
  `D3DCAPS8+0x26` is tested for bit 0x10000 of `RasterCaps` = `D3DPRASTERCAPS_FOGRANGE`.
  Four independent struct-size confirmations.

| offset | method | args (excl. `this`) | call sites (VA / function) |
|---|---|---|---|
| 0x08 | `Release` | 0 | `FUN_00401823` 0x401823 |
| 0x1c | `GetDeviceCaps` | 1 | `FUN_00401575` 0x401721 → `D3DCAPS8` at 0x4746b8 |
| 0x3c | `Present` | 4 | `FUN_0040149b` 0x4014E3 |
| 0x40 | `GetBackBuffer` | 3 | `FUN_00402907` (occlusion test) |
| 0x50 | `CreateTexture` | 7 | `FUN_00402b16` 0x402b16 (render targets), `FUN_00403dd3` 0x403dd3 (content textures) |
| 0x68 | `CreateDepthStencilSurface` | 5 | `FUN_00402bc9` 0x402bc9 |
| 0x6c | `CreateImageSurface` | 4 | `FUN_004026be` 0x4026be — a **4×4** sysmem surface in the adapter format |
| 0x70 | `CopyRects` | 5 | `FUN_00402907` |
| 0x7c | `SetRenderTarget` | 2 | `FUN_00402b4f` 0x402B86, `FUN_00402c72` |
| 0x80 | `GetRenderTarget` | 1 | `FUN_00402bc9` |
| 0x88 | `BeginScene` | 0 | `FUN_00402b4f`, `FUN_00402bc9`, `FUN_00402c72` |
| 0x8c | `EndScene` | 0 | `FUN_00402b4f`, `FUN_00402c72` |
| 0x90 | `Clear` | 6 | `FUN_00402b4f`, `FUN_00402c72`, `FUN_00402d87` (per-layer), `FUN_00408eef` |
| 0x94 | `SetTransform` | 2 | via wrapper `FUN_00402317` @ 0x402317 |
| 0x98 | `GetTransform` | 2 | via wrapper `FUN_00402330` @ 0x402330 (only `FUN_0040de4e`) |
| 0xa8 | `SetMaterial` | 1 | `FUN_00401575` 0x401776 — once |
| 0xb0 | `SetLight` | 2 | `FUN_00405da8` @ 0x405da8 (light apply) |
| 0xb8 | `LightEnable` | 2 | `FUN_00405da8` @ 0x405da8 |
| 0xc0 | `SetClipPlane` | 2 | `FUN_00408eef` @ 0x408eef, ×2 |
| 0xc8 | `SetRenderState` | 2 | via wrapper `FUN_00402349` @ 0x402349 |
| 0xcc | `GetRenderState` | 2 | `FUN_00401b86` 0x401b86 (reads `D3DRS_AMBIENT`) |
| 0xf4 | `SetTexture` | 2 | 12 sites |
| 0xfc | `SetTextureStageState` | 3 | via wrapper `FUN_00402362` @ 0x402362 |
| 0x120 | `DrawPrimitiveUP` | 4 | `FUN_004010dc`, `FUN_00401c04`, `FUN_004072e9` |
| 0x124 | `DrawIndexedPrimitiveUP` | 8 | `FUN_00402788`, `FUN_00404a10`, `FUN_00404dbb`, `FUN_00406222`, `FUN_00406db7`, `FUN_0040de4e` ×2 |
| 0x130 | `SetVertexShader` | 1 | `FUN_00401575` 0x401803 — once, with `0x252` |

**Never used:** `Reset`, `SetViewport`/`GetViewport` (0xa0/0xa4),
`MultiplyTransform`, `GetMaterial`, `GetLight`, `GetLightEnable`, `GetClipPlane`,
any state block (0xd0–0xe4), `SetClipStatus`, `GetTexture`,
`GetTextureStageState`, `ValidateDevice`, palettes, `DrawPrimitive`/
`DrawIndexedPrimitive` (0x118/0x11c), `ProcessVertices`, all vertex/pixel
shader creation, `SetStreamSource`, `SetIndices`, patches,
`CreateVertexBuffer`/`CreateIndexBuffer`, `UpdateTexture`, `GetFrontBuffer`,
`GetDepthStencilSurface`, gamma ramps, cursor.

### 2.1 Other COM interfaces

**`IDirect3D8`** (`DAT_004747a8`): 0x08 `Release`, 0x18 `GetAdapterModeCount`,
0x1c `EnumAdapterModes`, 0x20 `GetAdapterDisplayMode`, 0x28 `CheckDeviceFormat`,
0x3c `CreateDevice`.

**`IDirect3DTexture8`**: 0x08 `Release` (`FUN_00403e3a`), 0x34 `GetLevelCount`,
0x38 `GetLevelDesc`, 0x3c `GetSurfaceLevel` (`FUN_00402b4f` 0x402B73),
0x40 `LockRect`, 0x44 `UnlockRect` (both in `FUN_00403e48`).

**`IDirect3DSurface8`**: 0x08 `Release`, 0x24 `LockRect`, 0x28 `UnlockRect`
(`FUN_00402907`).

`D3DSURFACE_DESC` is confirmed by `FUN_00403e48` reading Width at +0x18 and
Height at +0x1C of a 32-byte struct; `D3DLOCKED_RECT` by `{ INT Pitch; void* pBits; }`.

---

## 3. Geometry submission

### 3.1 The one and only FVF — `0x252`

`SetVertexShader(0x252)` @ 0x401803 is the **only** call. `0x252` decodes as:

```
0x252 & 0x00E = 0x002   D3DFVF_XYZ
0x252 & 0x010 = 0x010   D3DFVF_NORMAL
0x252 & 0x040 = 0x040   D3DFVF_DIFFUSE
0x252 >> 8    = 2       D3DFVF_TEX2   (two 2-float texcoord sets)
```

**`D3DFVF_XYZ | D3DFVF_NORMAL | D3DFVF_DIFFUSE | D3DFVF_TEX2`, stride 44 (0x2C).**

| offset | type | field |
|---|---|---|
| 0 | 3 × f32 | `x, y, z` — untransformed model space |
| 12 | 3 × f32 | `nx, ny, nz` — normal (used by lighting and by the camera-space-normal sphere map) |
| 24 | u32 | `diffuse` — `D3DCOLOR` `0xAARRGGBB` |
| 28 | 2 × f32 | `u0, v0` — texcoord set 0 (stage 0) |
| 36 | 2 × f32 | `u1, v1` — texcoord set 1 (stage 1) |

Independently confirmed three ways:
* every draw call passes `VertexStreamZeroStride = 0x2c`;
* `FUN_00402788` @ 0x402788 writes the flare quad's diffuse at `0x4747d8`,
  `+0x2c`, `+0x58`, `+0x84` — i.e. **offset 24 of each 44-byte vertex**, loop
  stride `0xb` dwords;
* `FUN_0040de4e` @ 0x40de4e writes colours at `vertexBase+0x18` then
  `[0xb]`, `[0x16]`, `[0x21]` dwords — 4 vertices of 11 dwords.
* `FUN_004069ed` @ 0x4069ed writes `pfVar2[-7..-5]` (position) and
  `pfVar2[0..1]` (offsets 28/32 = texcoord set 0) at stride `0xb`.

**There is no `D3DFVF_XYZRHW` anywhere.** All 2D/overlay work is done by
setting WORLD, VIEW and PROJECTION to identity (`FUN_00401bd0` @ 0x401bd0) and
emitting vertices directly in **clip space / NDC**: x,y in [-1,1] with **+y up**,
z in [0,1]. This is a significant divergence from Lost Vegas.

### 3.2 Draw calls

Only two forms, and only two primitive types.

```
dev->DrawPrimitiveUP(D3DPT_TRIANGLEFAN(6), PrimitiveCount=2, pVerts, 44)
```
| VA / function | what |
|---|---|
| `FUN_004010dc` 0x4010dc (line ~177) | loading-screen particles |
| `FUN_00401c04` 0x401c04 | generic "draw one quad" helper |
| `FUN_004072e9` 0x4072e9 | title sparkle streaks |

```
dev->DrawIndexedPrimitiveUP(D3DPT_TRIANGLELIST(4), MinVertexIndex=0,
                            NumVertices, PrimitiveCount,
                            pIndexData, D3DFMT_INDEX16(0x65),
                            pVertexStreamZeroData, 44)
```
| VA / function | NumVertices / PrimitiveCount |
|---|---|
| `FUN_00402788` 0x402788 | 4 / 2 — the flare quad, indices `{0,1,2, 2,3,0}` at `0x474870` |
| `FUN_00404a10` 0x404a10 | mesh object: counts from the object at +0xac/+0xb4/+0xb8, indices at +0xb0 |
| `FUN_00404dbb` 0x404dbb | billboard/particle system, counts at +0xb8/+0xc0/+0xc4 |
| `FUN_00406222` 0x406222 | 4 / 2 — a single screen quad |
| `FUN_00406db7` 0x406db7 | text batch: `n*4` verts, `n*2` tris (batched glyph quads) |
| `FUN_0040de4e` 0x40de4e | `n*4` verts, `n*2` tris, drawn twice for a glow pass |

`D3DFMT_INDEX16 = 101 = 0x65` in every single call. **There is no 32-bit index
path.**

The text batcher's scratch buffers are allocated in `FUN_00406a7d` @ 0x406a7d
(decompile lines 5681–5682): `DAT_004788f4 = alloc(0x16000)` = 90112 B / 44 =
**2048 vertices**, and `DAT_004788f0 = alloc(0x1800)` = 6144 B / 2 =
**3072 indices** — 512 quads per batch.

### 3.3 Matrix conventions (identical to minid3d7)

* `FUN_00401950` @ 0x401950 builds identity: `m[0]=m[5]=m[10]=m[15]=1`, 16 floats.
* `FUN_004022ff` @ 0x4022ff writes translation to `m[0x30..0x38]` = `m[12..14]`
  = `_41.._43` → **row-major, translation in the last row, row-vector algebra**.
* `FUN_004024c5` @ 0x4024c5 computes `out[i][j] = Σ A[i][k]·B[k][j]` = `out = A*B`,
  applied as `world = scale * objectMatrix` in `FUN_00404a10`.

Matrices are handed to `SetTransform` verbatim — **upload untransposed**, exactly
as minid3d7 does.

---

## 4. Render-state census

All `SetRenderState` goes through **`FUN_00402349(State, Value)` @ 0x402349**.
49 call sites; here is every `(state, value)` pair that occurs.

### 4.1 The states used

| enum | value | D3DRS_* | where |
|---|---|---|---|
| 7 | 1 | `ZENABLE = D3DZB_TRUE` | 0x401725 — set once at init, never turned off |
| 0x0e | 0 / 1 | `ZWRITEENABLE` | init; `FUN_004019e6`; `FUN_00401d12` |
| 0x0f | 0 / 1 | `ALPHATESTENABLE` | `FUN_00401b45`, `FUN_00401d12` |
| 0x13 | 5 | `SRCBLEND = D3DBLEND_SRCALPHA` | `FUN_004019e6`, `FUN_00401d12` |
| 0x14 | 2 / 6 | `DESTBLEND = D3DBLEND_ONE` / `D3DBLEND_INVSRCALPHA` | `FUN_004019e6`, `FUN_00401d12` |
| 0x16 | 1 / 2 / 3 | `CULLMODE = NONE / CW / CCW` | `FUN_004018ec` |
| 0x17 | 4 / 8 | `ZFUNC = D3DCMP_LESSEQUAL` / `D3DCMP_ALWAYS` | init, `FUN_0040184c`, `FUN_00401d12`, `FUN_0040de4e` |
| 0x18 | 0 / 3 / `DAT_00474794` | `ALPHAREF` | `FUN_00401b45` (`DAT_00474794` defaults to **0x80**), `FUN_00401d12` |
| 0x19 | 5 / 8 | `ALPHAFUNC = D3DCMP_GREATER` / `D3DCMP_ALWAYS` | `FUN_00401b45`, `FUN_00401d12` |
| 0x1b | 0 / 1 | `ALPHABLENDENABLE` | `FUN_004019e6`, `FUN_00401d12` |
| 0x1c | 0 / 1 | `FOGENABLE` | `FUN_00401abf` |
| 0x22 | D3DCOLOR | `FOGCOLOR` | `FUN_00401abf` |
| 0x23 | 0 | `FOGTABLEMODE = D3DFOG_NONE` | `FUN_00401abf` — **table fog is explicitly off** |
| 0x24 | float | `FOGSTART` | `FUN_00401abf` |
| 0x25 | float | `FOGEND` | `FUN_00401abf` |
| 0x30 | 1 | `RANGEFOGENABLE` | `FUN_00401abf`, only if `D3DPRASTERCAPS_FOGRANGE` |
| 0x3c | D3DCOLOR | `TEXTUREFACTOR` | `FUN_004010dc`, `FUN_00401d12`, `FUN_004072e9` |
| 0x89 | 0 / 1 | `LIGHTING` | `FUN_00401b86` |
| 0x8b | D3DCOLOR | `AMBIENT` | `FUN_00401b86` |
| 0x8c | 3 | `FOGVERTEXMODE = D3DFOG_LINEAR` | `FUN_00401abf` |
| 0x98 | 0 / 1 | `CLIPPLANEENABLE` | `FUN_00408eef` |

**Never touched** (so the D3D8 defaults apply): `FILLMODE` (SOLID),
`SHADEMODE` (GOURAUD), `LASTPIXEL`, `DITHERENABLE` (FALSE),
`SPECULARENABLE` (FALSE), all stencil states, `WRAP0..7` (0),
`CLIPPING` (TRUE), `COLORVERTEX` (TRUE), `LOCALVIEWER` (TRUE),
`NORMALIZENORMALS` (**FALSE** — normals are *not* renormalised after the world
matrix, so non-uniform scale changes lighting; matters for fidelity),
`*MATERIALSOURCE` (diffuse←`D3DMCS_COLOR1`, ambient←`D3DMCS_COLOR1`,
specular←`D3DMCS_COLOR2`, emissive←`D3DMCS_MATERIAL`), `VERTEXBLEND`,
`COLORWRITEENABLE` (all), `BLENDOP` (ADD), `MULTISAMPLEANTIALIAS`.

### 4.2 The state helper functions

These are the demo's whole state API. Port these, not the raw enums.

**`FUN_004018ec(n)` @ 0x4018ec — cull mode**

| n | `D3DRS_CULLMODE` |
|---|---|
| 0 | 1 = `D3DCULL_NONE` |
| 1 | 2 = `D3DCULL_CW` |
| 2 | 3 = `D3DCULL_CCW` |

⚠ **This mapping is the reverse of Lost Vegas's dispatcher** (`1 → CCW, 2 → CW`
there). Transcribe from *this* table.

**`FUN_004019e6(n)` @ 0x4019e6 — blend mode**

| n | states |
|---|---|
| 0 | `ALPHABLENDENABLE=0`, `ZWRITEENABLE=1` |
| 1 | `ALPHABLENDENABLE=1`, `SRCBLEND=SRCALPHA(5)`, `DESTBLEND=ONE(2)`, `ZWRITEENABLE=0` — **additive** |
| 2 | `ALPHABLENDENABLE=1`, `SRCBLEND=SRCALPHA(5)`, `DESTBLEND=INVSRCALPHA(6)`, `ZWRITEENABLE=0` — **alpha blend** |

Note that the blend mode also drives Z-writes, which is what keeps transparent
geometry from punching the depth buffer.

**`FUN_00401b45(bEnable)` @ 0x401b45 — alpha test**

| arg | states |
|---|---|
| 0 | `ALPHATESTENABLE=0`, `ALPHAFUNC=D3DCMP_ALWAYS(8)`, `ALPHAREF=0` |
| 1 | `ALPHATESTENABLE=1`, `ALPHAFUNC=D3DCMP_GREATER(5)`, `ALPHAREF=DAT_00474794` |

`DAT_00474794` is reset to **0x80** by `FUN_0040184c` and overridden per-material.

**`FUN_00401abf(mode, color, start, end)` @ 0x401abf — fog**

| mode | states |
|---|---|
| 0 | `FOGENABLE=0` |
| 1 | `FOGENABLE=1`, `FOGCOLOR=color`, `FOGTABLEMODE=D3DFOG_NONE(0)`, `FOGVERTEXMODE=D3DFOG_LINEAR(3)`, `FOGSTART=start`, `FOGEND=end`, and `RANGEFOGENABLE=1` if `D3DCAPS8.RasterCaps & D3DPRASTERCAPS_FOGRANGE` (tested as `DAT_004746de & 1`, i.e. byte 2 of `RasterCaps` at `caps+0x24`) |

**Fog is VERTEX fog, LINEAR, not table/EXP fog** — the opposite of Lost Vegas.
`start`/`end` are `float` bit patterns passed through as DWORDs.
The only place fog is switched on with real values is `FUN_00408eef` @ 0x408eef
(the big outdoor scene): `FUN_00401abf(1, DAT_00474790, scene[0x26], scene[0x2a])`
— **the fog colour is the scene's clear colour**, so fog fades geometry into the
background. `FUN_0040184c` resets it to `(0, 0xffffffff, 0, 1.0f)` = fog off.
Range fog (radial distance instead of eye-space z) is enabled whenever the card
supported it, which for a modern port means: **use radial distance**.

**`FUN_00401b86(bLighting, ambient)` @ 0x401b86 — lighting + ambient**

```
old = GetRenderState(D3DRS_AMBIENT)
DAT_004747b0 = bLighting                    ; readable via FUN_00401bca @ 0x401bca
SetRenderState(D3DRS_LIGHTING(0x89), bLighting)
SetRenderState(D3DRS_AMBIENT(0x8b), ambient)
return old
```

Call sites: `FUN_0040184c` → `(0, 0xffffffff)`; `FUN_00406004` @ 0x406004 →
`(1, sceneAmbient)` around the lit part of the object list, then back to
`(0, 0xffffffff)`; `FUN_00401d12`/`FUN_00401f8b` save/restore it per material.
So **lighting is genuinely on for a subset of the scene graph**.

**`FUN_00401bd0()` @ 0x401bd0 — the 2D setup**
`SetTransform(VIEW=2, I); SetTransform(PROJECTION=3, I); SetTransform(WORLD=0x100, I)`.

### 4.3 Lights — `FUN_00405d13` @ 0x405d13 (ctor), `FUN_00405da8` @ 0x405da8 (apply)

`D3DLIGHT8` lives at object+0xAC (`memset(obj+0xAC, 0, 0x68)` confirms the
0x68-byte struct). Constructor defaults:

| field | offset in `D3DLIGHT8` | value |
|---|---|---|
| `Type` | 0x00 | **1 = `D3DLIGHT_POINT`** |
| `Diffuse` | 0x04 | (1,1,1,1) |
| `Range` | 0x4C | 2000.0 |
| `Falloff` | 0x50 | 1.0 |
| `Attenuation1` | 0x58 | 1.0 |

`FUN_00405da8` per frame, when the light's index (`obj+0x124`) is not −1:
unpacks the light's `D3DCOLOR` (`obj+0x114`, default 0xFFFFFFFF) into
`Diffuse.a/r/g/b` by `byte * (1/255)`, copies `Range` from `obj+0x118`,
clamps `Attenuation1` from `obj+0x11c` to ≥ 1e-4, copies the world position from
`obj+0x88` into `Position`, then
`dev->SetLight(index, &light)` + `dev->LightEnable(index, TRUE/FALSE)`.

Specular and emissive are zero throughout and `D3DRS_SPECULARENABLE` is never
set, so **only diffuse + ambient lighting is observable**.

### 4.4 Clip plane — `FUN_00408eef` @ 0x408eef

One user clip plane, index 0, used for a water/reflection cut:
```
plane = { 0, -1, 0, waterLevel * k }      ; then { -waterLevel, -1, 0, ... } for the second pass
dev->SetClipPlane(0, plane)               ; vtbl+0xc0
SetRenderState(D3DRS_CLIPPLANEENABLE(0x98), 1)
   ... draw the reflected scene ...
SetRenderState(D3DRS_CLIPPLANEENABLE(0x98), 0)
```
Under `SOFTWARE_VERTEXPROCESSING` the plane is in **world space** applied after
the world transform (D3D8 clip planes are in world space for FF pipelines).

---

## 5. Texture stage states

All go through **`FUN_00402362(Stage, Type, Value)` @ 0x402362**.
**Only stages 0 and 1 are ever touched.**

### 5.1 Types used

| type | D3DTSS_* | values seen |
|---|---|---|
| 1 | `COLOROP` | 1 `DISABLE`, 2 `SELECTARG1`, 4 `MODULATE`, 7 `ADD` |
| 2 | `COLORARG1` | 2 `D3DTA_TEXTURE`, 3 `D3DTA_TFACTOR` |
| 3 | `COLORARG2` | 0 `D3DTA_DIFFUSE`, 1 `D3DTA_CURRENT` |
| 4 | `ALPHAOP` | 1 `DISABLE`, 2 `SELECTARG1`, 4 `MODULATE`, 7 `ADD`, 10 `SUBTRACT` |
| 5 | `ALPHAARG1` | 2 `D3DTA_TEXTURE`, 3 `D3DTA_TFACTOR` |
| 6 | `ALPHAARG2` | 0 `D3DTA_DIFFUSE`, 1 `D3DTA_CURRENT` |
| 0x0b | `TEXCOORDINDEX` | 0, 1, **0x10000 = `D3DTSS_TCI_CAMERASPACENORMAL`** |
| 0x0d | `ADDRESSU` | 1 `WRAP`, 2 `MIRROR`, 3 `CLAMP` |
| 0x0e | `ADDRESSV` | 1 `WRAP`, 2 `MIRROR`, 3 `CLAMP` |
| 0x10 | `MAGFILTER` | 2 `D3DTEXF_LINEAR` |
| 0x11 | `MINFILTER` | 2 `D3DTEXF_LINEAR` |
| 0x12 | `MIPFILTER` | 2 `D3DTEXF_LINEAR` |
| 0x18 | `TEXTURETRANSFORMFLAGS` | 0 `D3DTTFF_DISABLE`, 2 `D3DTTFF_COUNT2` |

**Filtering is set once, at init, to LINEAR/LINEAR/LINEAR on both stages and is
never changed.** There is no `D3DTEXF_POINT` and no `MIPFILTER_NONE` anywhere in
the image — good news for a resolution remaster, nothing degrades on upscale.

### 5.2 The default combiner (from init, §1.5)

```
stage0: COLOR = MODULATE(TEXTURE, DIFFUSE)     ALPHA = MODULATE(TEXTURE, DIFFUSE)
stage1: COLOR = MODULATE(TEXTURE, CURRENT)     ALPHA = MODULATE(TEXTURE, CURRENT)
```
`FUN_0040184c` then disables stage 1 (`FUN_004019a0(0)`) at the start of every
layer, so the *effective* default is single-texture modulate.

### 5.3 `FUN_004019a0(n)` @ 0x4019a0 — the stage-1 op selector

| n | `SetTextureStageState(1, COLOROP, x)` and `(1, ALPHAOP, x)` |
|---|---|
| 0 | 1 = `D3DTOP_DISABLE` |
| 1 | 7 = `D3DTOP_ADD` |
| 2 | 4 = `D3DTOP_MODULATE` |

Same 0/1/2 → DISABLE/ADD/MODULATE mapping as Lost Vegas's `setStage1Op`.

### 5.4 `FUN_0040191b(stage, bWrap)` @ 0x40191b — addressing

`bWrap != 0` → `ADDRESSU = ADDRESSV = 1 (WRAP)`; `bWrap == 0` → `3 (CLAMP)`.
`FUN_00401d12` additionally sets `2 (MIRROR)` on stage 0 for materials with
flag 0x0400.

### 5.5 `FUN_00401a3f(stage, mode)` @ 0x401a3f — texcoord source / sphere map

```
mode 0:  SetTextureStageState(stage, TEXTURETRANSFORMFLAGS, D3DTTFF_DISABLE(0))
         SetTextureStageState(stage, TEXCOORDINDEX, stage)

mode 1:  SetTextureStageState(stage, TEXTURETRANSFORMFLAGS, D3DTTFF_COUNT2(2))
         SetTextureStageState(stage, TEXCOORDINDEX, 0x10000)   ; D3DTSS_TCI_CAMERASPACENORMAL
         SetTransform(D3DTS_TEXTURE0 + stage, M)               ; 0x10 / 0x11
              [ 0.5   0    0  0 ]
         M =  [ 0   -0.5   0  0 ]     ; u = 0.5*Nx + 0.5,  v = -0.5*Ny + 0.5
              [ 0     0    1  0 ]
              [ 0.5  0.5   0  1 ]
```
Verified byte-by-byte at 0x401A73–0x401A89 (`fld [0x4170d4]` = 0.5, stores to
M+0x00, M+0x30, M+0x34; `mov M+0x14, 0xBF000000` = −0.5).

This is a **classic camera-space-normal sphere/environment map**. `FUN_00401d12`
flag 0x0002 replaces the stage-1 matrix with the same shape scaled ±2.0 and
translated 0.5 (verified at 0x401DF5–0x401E1A), i.e. a 4× zoomed sphere map.

### 5.6 `FUN_00401d12` @ 0x401d12 — the "material" applier

The renderer's material object is 0x2C bytes; the important members are a
16-bit flag word at +0x0C and two texture pointers.

```
+0x00  u8    0 = texture0 is a content texture (use tex->obj at +0x0C)
             1 = texture0 is a render-target texture (use tex->obj at +0x00)
+0x04  ptr   texture object 0
+0x08  ptr   texture object 1
+0x0C  u16   FLAGS
+0x0E  u8    saved LIGHTING flag
+0x10  u32   saved AMBIENT
+0x14  u8    alpha reference / TFACTOR alpha
+0x18..0x24  saved fog state (mode, colour, start, end)
```

| flag | effect |
|---|---|
| 0x0001 | blend mode 1 (**additive**); with 0x0100 also forces `DESTBLEND = ONE` |
| 0x0002 | stage-1 texture matrix = ±2.0 sphere map (see §5.5) |
| 0x0004 | stage-1 op `ADD` |
| 0x0008 | stage-1 op `MODULATE` (0x0004+0x0008 ⇒ MODULATE wins) |
| 0x0010 | `CULLMODE = NONE` (else `CCW`) |
| 0x0020 | sphere-map mode: `FUN_00401a3f(1,1)` if a stage-1 texture exists, else `FUN_00401a3f(0,1)` |
| 0x0040 | blend mode 2 (**alpha blend**) |
| 0x0080 | `ZWRITEENABLE = 0`, `ZFUNC = D3DCMP_ALWAYS` (else `ZWRITEENABLE = 1`, `ZFUNC = LESSEQUAL`) |
| 0x0100 | alpha test on: `ALPHAREF = mat[0x14]`, `ALPHAFUNC = GREATER`, plus `ALPHABLENDENABLE=1`, `SRCBLEND=SRCALPHA`, `DESTBLEND = (flags&1) ? ONE : INVSRCALPHA` |
| 0x0200 | stage-0 `CLAMP` addressing |
| 0x0400 | stage-0 `MIRROR` addressing (0x0200 wins if both) |
| 0x0800 | fog forced off for this draw, restored afterwards |
| 0x1000 | lighting forced off for this draw, ambient saved/restored |
| 0x2000 | `ALPHATESTENABLE=1`, `ALPHAFUNC=GREATER`, `ALPHAREF=3`, stage-0 `ALPHAOP = D3DTOP_SUBTRACT(10)` — the "erosion / dissolve" look |
| 0x4000 | blend mode 2 **and** `ZWRITEENABLE=1`, `ZFUNC=LESSEQUAL` (blended but still writes Z) |
| 0x8000 | `TEXTUREFACTOR = (mat[0x14] << 24) \| 0x00FFFFFF`, stage-1 `ALPHAARG1 = D3DTA_TFACTOR(3)`, stage-1 `ALPHAOP = SELECTARG1(2)` — a global alpha fade |

Then: `SetTexture(0, tex0 or NULL)` and `SetTexture(1, tex1 or NULL)`.

`FUN_00401f8b` @ 0x401f8b is the matching *unapply*: restores stage-1 alpha to
`ALPHAARG1=TEXTURE, ALPHAOP=MODULATE`, restores lighting/ambient and fog,
clears alpha test, and calls `FUN_00401a3f(0,0)` + `FUN_00401a3f(1,0)` to drop
the texture transforms.

---

## 6. Textures

### 6.1 Content textures — `FUN_00403dd3` @ 0x403dd3

```
Texture(void* pixels, UINT w, UINT h, bool singleLevel, bool alpha)
  this+0x00 = pixels (a Uint32 ARGB8888 buffer produced by the texgen)
  this+0x04 = w
  this+0x08 = h
  this+0x0C = IDirect3DTexture8*
  this+0x10 = alpha flag
  this+0x14 = refcount

  fmt = alpha ? DAT_004788c4 : DAT_004788c8
  dev->CreateTexture(w, h,
                     Levels = (singleLevel != 0) ? 1 : 0,
                     Usage  = 0,
                     Format = fmt,
                     Pool   = D3DPOOL_MANAGED(1),
                     &this[0x0C])
  FUN_00403e48(this)                    ; upload
```

`FUN_00403dad` @ 0x403dad sets the format table once and it is **never changed**:

| global | value | meaning |
|---|---|---|
| `DAT_004788c8` | `0x15` | `D3DFMT_A8R8G8B8` — used when `alpha == false` |
| `DAT_004788c4` | `0x1a` | `D3DFMT_A4R4G4B4` — used when `alpha == true` |
| `DAT_004788c0` | 0 | pack mode for the non-alpha path: straight 32-bit `memcpy` |
| `DAT_004788cc` | 4 | pack mode for the alpha path: pack ARGB8888 → ARGB4444 |

**In practice every single call site passes `alpha = '\0'`**, so every content
texture is `D3DFMT_A8R8G8B8` with a plain row `memcpy`. The 4444 path
(`FUN_00403e48` @ 0x403e48, the `local_28 != 0` branch) is dead code in the
shipped build. `Levels = 0` means *"allocate a complete mip chain"*.

### 6.1.1 Every content-texture creation site — level counts (remaster-critical)

| calling function (VA) | decompile line | size | `singleLevel` arg | **`Levels` passed to `CreateTexture`** | mips? |
|---|---|---|---|---|---|
| `FUN_00406539` @ 0x406539 | 5418 | 32×32 | `'\0'` | **0** | full chain |
| `FUN_00406a7d` @ 0x406a7d — `DAT_0047891c`, the **font page** | 5748 | 2048×512 | `'\0'` | **0** | full chain |
| `FUN_004082a9` @ 0x4082a9 | 7028, 7037 | 256×256 | `'\0'` | **0** | full chain |
| `FUN_004082a9` @ 0x4082a9 | 7136 | 256×256 | `'\0'` | **0** | full chain |
| `FUN_00409d45` @ 0x409d45 | 8238, 8266 | 256×256 | `'\0'` | **0** | full chain |
| `FUN_0040bc63` @ 0x40bc63 | 9580 | 256×256 | `'\0'` | **0** | full chain |
| `FUN_0040c1b2` @ 0x40c1b2 | 10029 | 256×256 | `'\0'` | **0** | full chain |
| `FUN_0040c721` @ 0x40c721 | 10414, 10429, 10445 | 32×32 | `'\0'` | **0** | full chain |
| `FUN_0040d1f1` @ 0x40d1f1 | 10739, 10760 | 16×16 | `'\0'` | **0** | full chain |
| `FUN_0040d1f1` @ 0x40d1f1 | 10776 | 8×8 | `'\0'` | **0** | full chain |
| **`FUN_0040d1f1` @ 0x40d1f1** | **10796** | 256×256 | **`'\x01'`** | **1** | **NO MIPS** (scratch texture, `0xffffff` fill, re-created per use) |
| `FUN_0040e058` @ 0x40e058 — `DAT_00478978` | 11508 | 512×512 | `'\0'` | **0** | full chain |
| `FUN_0040e058` @ 0x40e058 | 11576, 11588, 11607 | 256×256 | `'\0'` | **0** | full chain |
| `FUN_0040ec28` @ 0x40ec28 | 11924 | 256×256 | `'\0'` | **0** | full chain |
| `FUN_0040f42f` @ 0x40f42f | 12302 | 256×256 | `'\0'` | **0** | full chain |
| `FUN_0040f803` @ 0x40f803 | 12494 | 256×256 | `'\0'` | **0** | full chain |

So: **23 of 24 content-texture creation sites request a full mip chain and get
one; exactly one — `FUN_0040d1f1` @ 0x40d1f1, decompile line 10796, 256×256 — is
single-level.** Combined with
`MIPFILTER = D3DTEXF_LINEAR` on both stages this is genuine **trilinear
filtering in the original** — mips are *not* an optional embellishment here,
they are part of the authentic look. See §9.4 for what that means for the
`?quality=original` path.

### 6.1.2 Upload and mip generation — `FUN_00403e48` @ 0x403e48

```
levels = tex->GetLevelCount()                                ; vtbl+0x34
if (levels > 1) work = copy of the source ARGB8888 buffer    ; mips are built in place in `work`
for (level = 0; level < levels; level++) {
    tex->GetLevelDesc(level, &desc)                          ; vtbl+0x38  -> desc.Width @+0x18, .Height @+0x1C
    tex->LockRect(level, &lr, NULL, 0)                       ; vtbl+0x40  -> lr.Pitch, lr.pBits
    for each row: memcpy(lr.pBits + Pitch*row, src, Width*4) ; pack mode 0
    if (levels > 1) box-filter `work` in place: each dst texel =
        (>>2 of the sum of the 2×2 source texels) per channel, A R G B independently
    tex->UnlockRect(level)                                   ; vtbl+0x44
}
```

The box filter (0x403F…, decompile lines 3040–3060) averages the four source
texels channel-by-channel with an arithmetic `>> 2` — **no gamma correction, no
sRGB, plain integer average in the stored (non-linear) space**. Reproduce it
exactly on the authentic path; `gl.generateMipmap` is *not* bit-identical.

Textures live in `D3DPOOL_MANAGED`, uploaded once at generation time. **There is
no per-frame texture update path and no `UpdateTexture` call** — the "animated"
texture at line 10796 is re-created through the same ctor.

### 6.2 Render-target textures — `FUN_00402b16` @ 0x402b16

```
RTTexture(UINT w, UINT h, bool wantAlpha)
  this+0x00 = IDirect3DTexture8*
  this+0x04 = IDirect3DSurface8*  (level 0, fetched on demand)
  this+0x08 = 0
  fmt = wantAlpha ? 0x15 (D3DFMT_A8R8G8B8) : 0x16 (D3DFMT_X8R8G8B8)
  dev->CreateTexture(w, h, Levels = 1, Usage = 1 (D3DUSAGE_RENDERTARGET),
                     Format = fmt, Pool = D3DPOOL_DEFAULT(0), &this[0])
```

**Render targets are always `Levels = 1` — no mips.** Sites:

| calling function (VA) | line | size | format |
|---|---|---|---|
| `FUN_004082a9` @ 0x4082a9 | 7017 | 64×64 | `X8R8G8B8` |
| `FUN_0040abed` @ 0x40abed | 8803 | 512×512 or 128×128 (`(-(param!=0) & 0xfe80) + 0x200`, truncated to u16) | `A8R8G8B8` |
| `FUN_0040ec28` @ 0x40ec28 — `DAT_00478960` | 11986 | 256×256 | `A8R8G8B8` |
| `FUN_0040ec28` @ 0x40ec28 — `DAT_00478964` | 12035 | 512×512 | `A8R8G8B8` |

Render-to-texture is driven by `FUN_00402b4f` @ 0x402b4f (disassembled to
recover the argument Ghidra dropped):

```
FUN_00402b4f(RTTexture* t, bool bClear)          ; __fastcall, `ret 4`
    dev->EndScene()
    DAT_0047488c = t                              ; "an RTT is active"
    t->tex->GetSurfaceLevel(0, &t->surf)          ; texture vtbl+0x3c
    dev->SetRenderTarget(t->surf, DAT_00474888)   ; <-- the SHARED 1024x512 depth-stencil
    t->surf->Release()
    if (bClear) dev->Clear(0, NULL, D3DCLEAR_TARGET|D3DCLEAR_ZBUFFER, DAT_00474790, 1.0f, 0)
    dev->BeginScene()
```

and unwound by `FUN_00402c72(1)` (§1.7). Because a single oversized depth
buffer is reused for every target, **the D3D8 rule "the depth surface may be
larger than the render target" is load-bearing** — see §9.

### 6.3 The 4×4 readback surface — `FUN_004026be` @ 0x4026be / `FUN_00402907` @ 0x402907

```
dev->CreateImageSurface(4, 4, DAT_004747a4 /*adapter format*/, &DAT_0047487c)   ; vtbl+0x6c
```

Used by `FUN_00402907` as a **software occlusion query** for the lens flare:

```
dev->GetBackBuffer(0, 0, &back)                                       ; vtbl+0x40
dev->CopyRects(back, &srcRect4x4, 1, DAT_0047487c, &dstPoint)         ; vtbl+0x70
DAT_0047487c->LockRect(&lr, NULL, D3DLOCK_READONLY(0x10))             ; surface vtbl+0x24
for each of the 16 pixels: if adapterFormat is 32-bit and
    (pixel & 0xFFFFFF) == (DAT_0041a000 & 0xFFFFFF)  -> "sky visible here"
DAT_0047487c->UnlockRect()                                            ; surface vtbl+0x28
back->Release()
```

`DAT_0041a000 = (DAT_00474790 - 0x00020304) | 0xFF000000` (`FUN_00402773` @
0x402773) — the clear colour nudged by a tiny amount so the sky is
distinguishable from anything drawn over it. The flare quad's four diffuse
colours are pre-stamped with that same magic value before the test.

---

## 7. Transforms, viewport and the projection matrix

### 7.1 `SetTransform` states used

`FUN_00402317(State, pMatrix)` @ 0x402317. D3D8 renumbered the world matrix:

| value | `D3DTRANSFORMSTATETYPE` |
|---|---|
| 2 | `D3DTS_VIEW` |
| 3 | `D3DTS_PROJECTION` |
| 0x10 | `D3DTS_TEXTURE0` |
| 0x11 | `D3DTS_TEXTURE1` |
| **0x100** | **`D3DTS_WORLD`** = `D3DTS_WORLDMATRIX(0)` = 256 |

⚠ In D3D7 `D3DTRANSFORMSTATE_WORLD` was **1**. In D3D8 it is **256**. The
constant tables must differ between the two shims.

Call sites: `FUN_0040184c` (VIEW+WORLD ← I), `FUN_00401bd0` (VIEW+PROJ+WORLD ← I),
`FUN_00401a3f`/`FUN_00401d12` (TEXTURE0/TEXTURE1), `FUN_00404a10` (WORLD ← the
object matrix), `FUN_00404dbb` (VIEW+WORLD ← I for billboards, VIEW restored
afterwards), `FUN_00405b5d` (the camera), `FUN_004072e9` (PROJECTION for the
sparkle streaks), `FUN_0040de4e` (VIEW+PROJ saved with `GetTransform` and
restored).

### 7.2 Viewport

**`SetViewport` is never called.** The device default applies:
`X=0, Y=0, Width=640, Height=480, MinZ=0.0, MaxZ=1.0` — and it *follows the
render target*, so during RTT the viewport is the RT's full size. Any
correct-by-construction port gets this for free by sizing the framebuffer.

### 7.3 The camera — `FUN_00405b5d` @ 0x405b5d

```
FUN_00402072(cam+8, cam+0x88 /*eye*/, cam+0xac /*at*/)   ; build the LH look-at view matrix
if (cam[0xb8] != 0) FUN_00405c98(cam+8, -cam[0xb8])      ; roll about the view axis
SetTransform(D3DTS_VIEW, cam+8)
FUN_00405c0c(cam+0xcc,
             zn     = cam[0xc0],
             zf     = cam[0xc4],
             fov    = cam[0xbc] * (float)0.017453292519943295,   ; DEGREES -> RADIANS, _DAT_004182e0
             aspect = cam[0xc8])
SetTransform(D3DTS_PROJECTION, cam+0xcc)
SetTransform(D3DTS_WORLD, identity)
```

Camera-object defaults from the constructor (decompile lines 4280–4312):

| field | offset | default |
|---|---|---|
| eye | +0x88 | (0, 0, 0) |
| at | +0xAC | (0, 0, **256.0**) |
| roll | +0xB8 | 0 |
| **fov (degrees)** | +0xBC | **90.0** (`0x42B40000`) |
| **znear** | +0xC0 | **1.0** |
| **zfar** | +0xC4 | **1000.0** (`0x447A0000`) |
| **aspect** | +0xC8 | **1.3333334** = 4/3 (`0x3FAAAAAB`) |
| projection matrix | +0xCC | 16 floats |

The timeline method `m254` (see `re/ENGINE.md`) feeding 24/30/45/60/75/90 is
therefore **the field of view in degrees**.

### 7.4 The projection formula — `FUN_00405c0c` @ **0x405c0c**

Disassembled at 0x405C0C–0x405C95 (Ghidra's x87 output is correct here, but it
was re-derived from the instruction stream to be certain):

```
FUN_00405c0c(out, zn, zf, fov /*radians*/, aspect)
    h  = cos(fov*0.5) / sin(fov*0.5)          ; = cot(fov/2)
    Q  = zf / (zf - zn)
    out = zero
    out._11 (out+0x00) = h / aspect
    out._22 (out+0x14) = h
    out._33 (out+0x28) = Q
    out._34 (out+0x2c) = 1.0
    out._43 (out+0x38) = -(Q * zn)
    out._44                = 0
```

This is **exactly `D3DXMatrixPerspectiveFovLH`**: left-handed, depth range
`[0,1]`, and — this is the point —

> ### ⚠ THE FOV PARAMETER IS **VERTICAL**.
> `_22 = cot(fov/2)` and `_11 = _22 / aspect`. The angle is applied to the
> **Y** axis and the aspect divides **X**. This is the standard D3DX
> convention, and it is **the opposite of Lost Vegas**, whose `FUN_00401eb0`
> used a *horizontal* fov (`_11 = cot(fovH/2)`, `_22 = cot(fovH/2)*aspect`).
> Do **not** reuse minid3d7's `perspectiveFovLH` for Sonnet without changing
> it — you would get a 4/3-squared error in the field of view.

Default camera ⇒ `perspectiveFovLH(90° vertical, 4/3, 1.0, 1000.0)`, i.e. a
horizontal fov of `2·atan(tan(45°)·4/3) ≈ 106.3°`.

### 7.5 The world matrix — `FUN_00404a10` @ 0x404a10

```
obj->matrix(+0x08)._41.._43 = obj->position(+0x88)          ; FUN_004022ff
S = identity; S = S * scale(obj->scale(+0x94))              ; FUN_004022bb
world = S * obj->matrix                                     ; FUN_004024c5, stored at obj+0x48
SetTransform(D3DTS_WORLD, obj+0x48)
```

Row-major, row-vector: `v' = v · WORLD · VIEW · PROJECTION`, same as minid3d7.

---

## 8. `FUN_0040184c` — the per-layer state reset @ **0x40184c**

Called from `FUN_00402d87` @ 0x402d87 *before every object draw*, from
`FUN_004010dc` (the loading screen) and once at init. It is the demo's "known
good" baseline; every effect starts from exactly this.

```
DAT_00474790 = 0x00000000        ; clear colour -> black
DAT_00474794 = 0x80              ; default ALPHAREF

FUN_00401b45(0)                  ; ALPHATESTENABLE=0, ALPHAFUNC=ALWAYS, ALPHAREF=0
FUN_004018ec(0)                  ; CULLMODE = D3DCULL_NONE
FUN_004019e6(0)                  ; ALPHABLENDENABLE=0, ZWRITEENABLE=1
FUN_004019a0(0)                  ; stage 1 COLOROP = ALPHAOP = D3DTOP_DISABLE

for (i = 0; i < 2; i++) {
    FUN_0040191b(i, 1)           ; ADDRESSU = ADDRESSV = D3DTADDRESS_WRAP
    dev->SetTexture(i, NULL)
    FUN_00401a3f(i, 0)           ; TEXTURETRANSFORMFLAGS = DISABLE, TEXCOORDINDEX = i
}

FUN_00401abf(0, 0xffffffff, 0, 1.0f)   ; FOGENABLE = 0 (colour/start/end cached, not applied)
FUN_00401b86(0, 0xffffffff)            ; LIGHTING = 0, AMBIENT = 0xFFFFFFFF

SetTransform(D3DTS_VIEW,  identity)
SetTransform(D3DTS_WORLD, identity)    ; 0x100
SetRenderState(D3DRS_ZFUNC, D3DCMP_LESSEQUAL)
```

**PROJECTION is deliberately *not* reset here** — the camera's projection
survives across layers. (`FUN_00401bd0` is the variant that also clears
PROJECTION, used only by the true-2D paths.)

Immediately afterwards, `FUN_00402d87` issues

```
dev->Clear(0, NULL, D3DCLEAR_ZBUFFER(2), DAT_00474790, 1.0f, 0)
```

so **each of the 16 layers composites over the previous one with a fresh Z
buffer**, matching `re/ENGINE.md`.

---

## 9. minid3d8.js spec — what to reuse from minid3d7, what to change

`web-lv/js/minid3d7.js` is ~1050 lines and roughly **80 % of it transfers
unchanged**. The list below is the delta; anything not mentioned should be
copied verbatim.

### 9.1 Reuse verbatim

* **The whole WebGL2 substrate**: context creation, the shadowed-GL-state
  design, the "only emit deltas" philosophy, `getError`/`checkError`,
  `readPixel`/`readPixelGL`.
* **The upload strategy.** `bufferData(data)` per draw — orphaning, *not*
  `bufferSubData`. Sonnet draws even more per frame than Lost Vegas (a batched
  glyph pass plus per-object mesh draws), so re-read MINID3D7_API §11 and do not
  "optimise" it. Sonnet is a `*UP` API by construction, so this maps 1:1.
* **`D3DMatrix`**, row-major/row-vector/left-handed, `.mul`, `.translation`,
  `.scaling`, `.rotationX/Y/Z`, `.lookAtLH`, `.toGLMat4`/`.fromGLMat4`.
* **Depth-range remap in the vertex shader** (`pos.z = 2*pos.z - pos.w`) so the
  projection matrix stays bit-identical to `FUN_00405c0c`.
* **`D3DCOLOR` stays BGRA on the wire; the shader unswizzles `.zyxw`.** Sonnet
  packs colours identically (`0xAARRGGBB`, e.g. `(alpha<<24)|0xFFFFFF`).
* **`frontFace(gl.CW)`** plus `D3DCULL_CCW → cullFace(BACK)`,
  `D3DCULL_CW → cullFace(FRONT)`, `D3DCULL_NONE → disable`.
* **Two-stage combiner emulation** — the op/arg set, the `CURRENT`-at-stage-0
  =`DIFFUSE` rule, independent colour/alpha pipelines, per-stage saturation, the
  packed `uniform1iv` upload. Sonnet uses a strict subset of minid3d7's ops:
  `DISABLE, SELECTARG1, MODULATE, ADD, SUBTRACT` and args
  `DIFFUSE, CURRENT, TEXTURE, TFACTOR`. `SUBTRACT` is the only one worth
  re-checking (minid3d7 lists it; Sonnet uses it on the *alpha* pipeline).
* **Per-stage sampler objects** for filtering/addressing — Sonnet needs
  `WRAP / MIRROR / CLAMP` on stage 0, which minid3d7 already has
  (`D3DTADDRESS_MIRROR` → `gl.MIRRORED_REPEAT`).
* **1×1 opaque-white fallback** for a stage with no texture bound. Sonnet relies
  on this: `FUN_00401d12` does `SetTexture(0, NULL)` for untextured materials
  while leaving `COLOROP = MODULATE(TEXTURE, DIFFUSE)`.
* **`Clear` in the full COM form** `Clear(count, rects, flags, color, z, stencil)`
  so call sites transcribe verbatim, ignoring `ZWRITEENABLE`.
* `BeginScene`/`EndScene` as bookkeeping.

### 9.2 Change — the hard requirements

**1. `perspectiveFovLH` takes a VERTICAL fov.**
```js
// minid3d7 (Lost Vegas):  _11 = cot(fovH/2);        _22 = cot(fovH/2)*aspect;
// minid3d8 (Sonnet):      _11 = cot(fovY/2)/aspect; _22 = cot(fovY/2);
static perspectiveFovLH(fovY, aspect, zn, zf)   // fovY in RADIANS
```
Also provide `perspectiveFovDegLH(fovDeg, …)` since the timeline supplies
degrees. Default: `(90°, 4/3, 1.0, 1000.0)`.

**2. `D3DTS_WORLD = 0x100`, not 1.** Export
`D3DTS_VIEW = 2, D3DTS_PROJECTION = 3, D3DTS_TEXTURE0 = 0x10, D3DTS_TEXTURE1 = 0x11,
D3DTS_WORLD = 0x100`. Keep `SetTransform` tolerant of both so transcription
mistakes are loud (throw on an unknown state, don't silently ignore).

**3. One FVF, with a NORMAL.** `FVF_XYZ_NORMAL_DIFFUSE_TEX2 = 0x252`, stride 44,
layout per §3.1. This is a *new* vertex format — minid3d7's `0x242`/`0x244` do
not apply and can be dropped. `makeVertexScratch` needs the new stride
(`strideF = 11`) and a `normalIndex(i)` accessor. There is no XYZRHW path at
all: **2D is drawn in NDC with identity transforms**, so the shim's whole
`rhw` reconstruction path can go. (Do keep the y-orientation straight: NDC
+y is *up*, unlike D3D screen space.)

**4. Draw entry points are the `UP` forms with D3D8 signatures.** Note the
argument-order difference from D3D7:
```js
DrawPrimitiveUP(primType, primitiveCount, pVerts, stride)
DrawIndexedPrimitiveUP(primType, minVertexIndex, numVertices, primitiveCount,
                       pIndices, indexFormat /*0x65 = INDEX16*/, pVerts, stride)
```
D3D7's `DrawPrimitive(type, fvf, ptr, vertexCount, flags)` took a **vertex**
count; **D3D8 takes a PRIMITIVE count**. Getting this wrong silently draws 1/3
of the geometry. Keep the `stride` parameter explicit rather than deriving it
from an FVF — that is what the original passes, and it keeps the shim
quality-agnostic.

**5. Fixed-function lighting must exist.** minid3d7 has none (`SetMaterial` is a
no-op, `D3DRS_LIGHTING` is accepted and ignored). Sonnet needs:
* `SetMaterial(m)` — `{diffuse, ambient, specular, emissive, power}`; only
  `ambient` actually reaches the shader (see the vertex-colour bullet below);
  `diffuse` is overridden by the vertex diffuse, and specular/emissive are
  always 0 with `D3DRS_SPECULARENABLE` never set.
* `SetLight(index, light)` / `LightEnable(index, bool)` — **point lights only**
  (`D3DLIGHT_POINT`), with `Position`, `Diffuse`, `Range`, `Attenuation0/1/2`,
  `Falloff`. Directional and spot need not be implemented; assert on them.
* `D3DRS_LIGHTING` and `D3DRS_AMBIENT` for real.
* Vertex colour — **read this carefully, an earlier revision of this document
  got it wrong and the shim inherited the error** (see `re/engine/AMBIENT_FIX.md`).
  The demo never sets `D3DRS_COLORVERTEX` (0x8d), `DIFFUSEMATERIALSOURCE` (0x91),
  `SPECULARMATERIALSOURCE` (0x92), `AMBIENTMATERIALSOURCE` (0x93) or
  `EMISSIVEMATERIALSOURCE` (0x94) — the complete set of render states it ever
  passes to the `FUN_00402349` wrapper is 0x07 0x0e 0x0f 0x13 0x14 0x16 0x17 0x18
  0x19 0x1b 0x1c 0x22 0x23 0x24 0x25 0x3c 0x89 0x8b 0x8c 0x98, plus one
  variable site in `FUN_00401abf` that is 0x1c or 0x30. So the **D3D8 defaults**
  stand, and they are *not* uniform:

  | render state | default |
  |---|---|
  | `D3DRS_COLORVERTEX` | TRUE |
  | `D3DRS_DIFFUSEMATERIALSOURCE` | `D3DMCS_COLOR1` |
  | `D3DRS_SPECULARMATERIALSOURCE` | `D3DMCS_COLOR2` |
  | **`D3DRS_AMBIENTMATERIALSOURCE`** | **`D3DMCS_MATERIAL`** — *not* COLOR1 |
  | `D3DRS_EMISSIVEMATERIALSOURCE` | `D3DMCS_MATERIAL` |

  Only the **diffuse** source is a vertex colour. The ambient source is the
  MATERIAL, and §1.5's one `SetMaterial` sets `Ambient = (1,1,1,0)` — white. So:

  ```
  colour.rgb = vertexDiffuse.rgb * Σ(att · lightDiffuse · N·L)     [D3DMCS_COLOR1]
             + materialAmbient   * (D3DRS_AMBIENT + Σ att·lightAmbient)
             + materialEmissive                                    [always 0 here]
  colour.a   = vertexDiffuse.a                                     [untouched]
  ```

  i.e. **the ambient term is NOT multiplied by the vertex diffuse.** (Microsoft's
  own DX8-era `D3DRENDERSTATETYPE` page says `D3DMCS_COLOR2` for the ambient
  default; that is a copy-paste bug from the specular row. The D3D9 page, the
  *Light Properties* table, Wine's `wined3d/stateblock.c` and DXVK's
  `d3d9_device.cpp` all agree on `D3DMCS_MATERIAL`.)

  In *this* demo the distinction happens to be invisible: `applyShorelineColours`
  bakes the shoreline fade into vertex **alpha** only and leaves the RGB at
  `0xffffff`, so `vertexDiffuse.rgb * ambient` and `white * ambient` coincide on
  every lit surface. Implement the correct form anyway — it is what D3D does, and
  any future non-white lit vertex colour would diverge.
* `D3DRS_NORMALIZENORMALS` is **FALSE** — transform normals by the world matrix
  and *do not* renormalise, or objects with non-uniform scale will be lit
  differently from the original.

**6. Fog is LINEAR VERTEX fog, not EXP table fog.**
`FOGTABLEMODE = D3DFOG_NONE`, `FOGVERTEXMODE = D3DFOG_LINEAR`,
`f = (fogEnd - d) / (fogEnd - fogStart)`, clamped, blended into RGB only.
`RANGEFOGENABLE` is on wherever the hardware allowed it, so **`d` is the radial
eye-space distance `length(viewPos.xyz)`**, not `viewPos.z`. Implement the
linear+range form; keep minid3d7's EXP code only if it costs nothing.

**7. User clip planes.** One plane, index 0, world space, gated by
`D3DRS_CLIPPLANEENABLE` bit 0. Implement with `gl_ClipDistance[0]` (WebGL2 needs
the `EXT_clip_cull_distance` extension) or, if that is unavailable, with a
`discard` in the fragment shader on an interpolated signed distance. Note the
D3D8/SW-VP convention: the plane is applied to **world-space** positions.

**8. Render targets and the depth buffer.** minid3d7 has no RTT at all. Add:
* `createRenderTargetTexture(w, h, hasAlpha)` — `RGBA8`/`RGB8`, **level 0 only**.
* `SetRenderTarget(colorTargetOrNull, depthTarget)` — `null` colour target means
  the backbuffer.
* The original binds **one shared 1024×512 depth-stencil to every target**,
  including the 640×480 backbuffer and the 128/256/512-square RT textures.
  WebGL2 requires the depth attachment to match the framebuffer's dimensions,
  so the shim must **allocate a depth renderbuffer per render-target size**
  behind the scenes and present it as a single logical depth surface. Because
  the demo always `Clear`s the depth buffer on every target switch
  (`FUN_00402b4f` and `FUN_00402c72` both do), *no depth content ever needs to
  survive a target switch* — a per-size cache is exactly equivalent. Record this
  as a deliberate, safe divergence.
* Depth precision: the original ran `D3DFMT_D24S8`; `DEPTH_COMPONENT24` or
  `DEPTH24_STENCIL8` matches it. (No stencil is ever used.)

**9. `Present` is called inside a scene.** Do not assert `!inScene` in
`Present()` — the original does exactly that. Provide
`presentAndRestoreBackbuffer(clearColor)` = the whole of
`Present` + `FUN_00402c72(0)` for verbatim transcription.

**10. The 4×4 occlusion readback.** `FUN_00402907` does a `CopyRects` from the
backbuffer into a 4×4 sysmem surface and inspects 16 pixels. Expose it as
`readbackRect(x, y, 4, 4) -> Uint32Array(16)` of `0xAARRGGBB`, implemented with
`gl.readPixels` on the current framebuffer. It is a **synchronous GPU→CPU
readback inside the frame**, and it will be the single most expensive call in
the shim; that is faithful (it was expensive in 2001 too), but flag it in the
docs so nobody is surprised by the stall. Only 4×4 pixels, once per flare, so it
is affordable.

### 9.3 Change — the state-helper layer

Port the demo's own helpers as named shim methods so the effect code transcribes
1:1. **Note the value mappings differ from Lost Vegas's `dispatchState`:**

| shim method | original | mapping |
|---|---|---|
| `setCullMode(n)` | `FUN_004018ec` | `0→NONE, 1→CW, 2→CCW` (**reversed vs. LV**) |
| `setBlendMode(n)` | `FUN_004019e6` | `0→off+Zwrite on, 1→additive+Zwrite off, 2→alpha+Zwrite off` |
| `setStage1Op(n)` | `FUN_004019a0` | `0→DISABLE, 1→ADD, 2→MODULATE` (same as LV) |
| `setAddressMode(stage, wrap)` | `FUN_0040191b` | `truthy→WRAP, 0→CLAMP` |
| `setAlphaTest(on)` | `FUN_00401b45` | see §4.2 |
| `setFog(mode, color, start, end)` | `FUN_00401abf` | linear vertex fog |
| `setLighting(on, ambient) -> prevAmbient` | `FUN_00401b86` | returns the previous `D3DRS_AMBIENT` |
| `setTexTransform(stage, mode)` | `FUN_00401a3f` | `0→off, 1→camera-space-normal sphere map` |
| `applyMaterial(mat)` / `unapplyMaterial(mat)` | `FUN_00401d12` / `FUN_00401f8b` | the 16-bit flag word of §5.6 |
| `resetLayerState()` | `FUN_0040184c` | §8 |
| `reset2D()` | `FUN_00401bd0` | VIEW/PROJ/WORLD ← identity |

`applyMaterial` is worth implementing as a faithful flag decoder rather than
open-coding each material — 16 flags, one function, and every effect in the demo
routes through it.

### 9.4 Mipmaps — explicitly gated, but note the default is *reversed* here

The coordinator's note assumed the Lost Vegas situation (original uploads one
level ⇒ mips are a remaster-only addition). **In Sonnet the original does the
opposite**: 23 of the 24 content textures are created with `Levels = 0` (full
chain) and filled by the demo's own box filter, with `MIPFILTER = LINEAR` on
both stages. So:

* On **`?quality=original`**, mips must be **ON** for those 23 textures and
  **OFF** for the one at decompile line 10796 and for all four render targets —
  otherwise the authentic path is wrong in the opposite direction.
* The API must therefore still be **explicit per texture**, exactly as
  requested — just with the per-site truth table of §6.1.1 as the input:
  ```js
  createTexture(pixels, w, h, { levels })   // levels: 0 = full chain, 1 = single level
  ```
  mirroring D3D8's own `Levels` parameter. Never infer it.
* For byte-identity the shim must use **the demo's box filter**, not
  `gl.generateMipmap`: per-channel integer average of the 2×2 block with `>> 2`,
  no gamma correction, computed on the CPU and uploaded level by level. Provide
  `buildMipsD3D8Box(pixels, w, h)` and use it whenever `levels === 0`.
  `gl.generateMipmap` may be offered as a remaster-only fast path.
* Filtering: the original is LINEAR/LINEAR/LINEAR everywhere, **no POINT
  filtering and no `MIPFILTER_NONE` anywhere in the image**, so nothing in the
  original's filtering choices degrades under a resolution remaster. Trilinear
  is already what it asked for.

### 9.5 Quality-agnosticism — where fixed sizes are baked in

Nothing in the D3D8 layer should be hard-coded in the shim; all of the following
are *caller* values and must stay parameters:

| baked-in value in the original | where | remaster note |
|---|---|---|
| 640 × 480 | `FUN_004014ef` / present params | the shim takes its size from the canvas; the *demo* code must be the only thing that knows 640×480 |
| depth surface 1024 × 512 | `FUN_00402bc9` | replace with per-target sizing (§9.2 item 8) |
| RT textures 64/128/256/512 | `FUN_00402b16` sites | caller-supplied |
| content textures 8…2048 | `FUN_00403dd3` sites | caller-supplied (texgen owns these) |
| text batch 2048 verts / 3072 indices | `FUN_00406a7d` @ 0x406a7d | the shim must not cap batch size |
| **`D3DFMT_INDEX16` on every indexed draw** | all `DrawIndexedPrimitiveUP` sites | **this is the real tessellation cap: 65 536 vertices per draw call.** The shim should accept `Uint16Array` *and* `Uint32Array` indices (WebGL2 supports `UNSIGNED_INT` natively) and pick the GL type from the array class. On the authentic path everything stays u16; on the remaster path a tessellator that exceeds 65 535 vertices can simply hand over a `Uint32Array` with no other change. Flag any effect that would need this. |
| clip-space 2D quads at NDC ±1 | `FUN_004010dc`, `FUN_004069ed`, `FUN_004072e9`, `FUN_00402788` | resolution-independent already — nothing to do |
| flare quad half-size `2.0/640 * 1.5` | `FUN_00402788` (`_DAT_00418200 / DAT_00474610 * _DAT_004170bc`) | **derives from the 640 width**, so it is already resolution-relative in NDC; keep the division by the *original* 640 if the flare should stay the same apparent size |
| the 4×4 occlusion readback | `FUN_00402907` | at higher resolution 4×4 pixels sample a smaller solid angle; consider scaling the rect with the resolution on the remaster path, and note it as a behaviour change |

### 9.6 Constants to export

`D3DTS_*` (with `WORLD = 0x100`), `D3DPT_TRIANGLELIST/TRIANGLEFAN`,
`D3DFVF_*` + `FVF_XYZ_NORMAL_DIFFUSE_TEX2 = 0x252`, `D3DFMT_INDEX16 = 0x65`,
`D3DRS_*` (the 21 of §4.1), `D3DZB_*`, `D3DCMP_*`, `D3DBLEND_*`,
`D3DCULL_*` (NONE=1, CW=2, CCW=3), `D3DFOG_NONE/LINEAR`, `D3DTSS_*`,
`D3DTOP_*`, `D3DTA_*` (+ `D3DTSS_TCI_CAMERASPACENORMAL = 0x10000`),
`D3DTADDRESS_*`, `D3DTEXF_POINT/LINEAR`, `D3DTTFF_DISABLE/COUNT2`,
`D3DCLEAR_TARGET(1)/ZBUFFER(2)/STENCIL(4)`, `D3DLIGHT_POINT = 1`,
`D3DPOOL_*`, `D3DUSAGE_RENDERTARGET = 1`.
Helpers: `D3DCOLOR_ARGB`, `D3DCOLOR_RGBA`, `D3DCOLOR_COLORVALUE`,
`makeVertexScratch(0x252, n)`, `buildMipsD3D8Box`.

### 9.7 Test page

Fork `web-lv/test/minid3d7_test.html`. The assertions that must be **added or
changed**:

1. `perspectiveFovLH` is **vertical**: a point at exactly `tan(fovY/2)` in
   eye-space y at `z = 1` lands on the top edge of NDC; a point at
   `tan(fovY/2)*aspect` in x lands on the right edge.
2. NDC 2D: a quad at NDC `(-1,-1)..(1,1)` with identity WORLD/VIEW/PROJECTION
   covers the whole viewport, **+y up** (this is the replacement for the D3D7
   XYZRHW pixel-mapping test).
3. `DrawIndexedPrimitiveUP` takes a **primitive** count — a 2-primitive call
   with 4 vertices draws a full quad.
4. Stride-44 attribute layout: position/normal/diffuse/uv0/uv1 land where §3.1
   says (assert by rendering a vertex-coloured, dual-textured quad).
5. Fixed-function point light: a unit-normal quad facing a point light at a
   known range/attenuation produces the expected shade; with
   `D3DRS_LIGHTING = 0` it produces the raw vertex diffuse.
6. Linear **range** fog: colour at radial distance `(start+end)/2` is the
   half-blend, and alpha is untouched.
7. Sphere map: `TEXCOORDINDEX = D3DTSS_TCI_CAMERASPACENORMAL` with the ±0.5
   matrix maps a camera-facing normal to uv `(0.5, 0.5)`.
8. Clip plane 0 removes exactly the half-space it names, and only while
   `CLIPPLANEENABLE` bit 0 is set.
9. Render-to-texture: draw into a 256×256 RT, bind it as a texture, sample it
   back; assert the depth buffer is usable at both target sizes.
10. `buildMipsD3D8Box` reproduces the integer `>> 2` average exactly for a known
    input (this is the byte-identity guard for `?quality=original`).
11. `D3DTOP_SUBTRACT` on the alpha pipeline, and `D3DTA_TFACTOR` feeding stage-1
    alpha with `SELECTARG1` (the global-fade path, material flag 0x8000).

Keep every existing minid3d7 assertion that still applies: BGRA unpack, both
cull directions, depth ordering, the three blend modes, the
DISABLE/ADD/MODULATE stage-1 toggle, texture v orientation.

---

## 10. Open questions / lower confidence

1. **`GetInfo` at vtable 0x104.** The tail of the vtable (`DrawPrimitiveUP` at
   0x120, `DrawIndexedPrimitiveUP` at 0x124, `SetVertexShader` at 0x130) is
   pinned by argument counts, which *implies* a `GetInfo` slot at 0x104. I did
   not verify against a period `d3d8.h`. Nothing in the port depends on it —
   the three methods actually used are confirmed independently — but if you ever
   need an offset in 0x104…0x118, re-derive it rather than trusting my table
   there. **Everything at offset < 0x104 is unaffected and certain.**
2. **`FUN_00402788` texture coordinates.** The lens-flare quad's uv fields
   (offsets 28…43) are never written by any code I found; they are static
   globals left at 0. The material used (`FUN_004026be`, flags `0x1810`) binds
   no texture, so the quad is flat-shaded and this is consistent — but I have
   not proved that no generator writes those globals.
3. **`DAT_00474794` (`ALPHAREF`) default.** Set to 0x80 by `FUN_0040184c` and
   overwritten per material from `mat[0x14]`. I did not enumerate every material
   to check the range of values it takes.
4. **Second texture-coordinate set.** `TEXCOORDINDEX` is initialised to
   `stage` (so stage 1 samples uv set 1), but I did not audit every geometry
   generator to confirm uv1 is ever written to something different from uv0. If
   it is always a copy, the shim could collapse to one set — but do **not** do
   that speculatively; the sphere-map path deliberately overrides
   `TEXCOORDINDEX` to `TCI_CAMERASPACENORMAL`, which proves the two sets are
   independently meaningful.
5. **The exact fog start/end values.** They come from a per-scene descriptor
   (`scene+0x26`, `scene+0x2a` in `FUN_00408eef`) which is populated by the
   scene-setup code I did not trace. Whoever owns the scenes should record them.
6. **`D3DRS_RANGEFOGENABLE`** is only set if the card reported
   `D3DPRASTERCAPS_FOGRANGE`. Most 2001 hardware did; I recommend the port
   assume it was on (radial fog), but a capture of the original would settle it.
7. **Material flag 0x0002's ±2.0 texture matrix** is applied to
   `D3DTS_TEXTURE1` unconditionally, *after* `FUN_00401a3f(1,1)` has already set
   the ±0.5 one. I read this as intentional (a zoomed environment map on the
   second layer) but it could equally be a bug in the original that produced a
   look they kept.
