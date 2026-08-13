# Sonnet — timeline objects 2, 3, 4, 5, 6

Port notes for `web-sonnet/js/scene_camera.js` (object 2) and
`web-sonnet/js/scene3.js` … `scene6.js` (objects 3..6 = scene indices 0..3).

All VAs are image VAs: `unpacked/sonnet_img.bin`, **VA `0x401000` = offset 0**.
Every numeric constant quoted here was read out of the image with
`struct.unpack`, never from the decompile.

---

## 0. THE HEADLINE CORRECTION — object 2 is not the camera

`re/ENGINE.md` guessed:

> | 2 | 0x0400–0x2813 | **camera**: `m0` × 28 stepping through keyframe indices 3,4,5,7,8…16 |

That is wrong on both counts. Object 2 is the **ragged black BORDER** that frames
the picture for the whole demo, and the 28 `m0` parameters are **`srand()` seeds**,
not keyframe indices. The camera is not an object at all — it lives *inside* each
Landscape (see §2).

The evidence chain, all verified in the image:

| step | finding |
|---|---|
| `FUN_00402e4e` | instantiates 11 objects from the factory table at `0x41a00c` (stride 3 dwords) indexed by the class-id array at `0x41a038` = `[1,2,0,3,3,3,3,3,3,3,3]` |
| class 0 → `FUN_00402cdf` | `new 0x38` + `FUN_00406539` — **object 2 only** |
| vtable `PTR_FUN_0041831c` | `{ init 0x40668c, render 0x4066a4, event 0x406783 }`. **Neither `FUN_004066a4` nor `FUN_00406783` is present in `re/out/sonnet.c`** — both were disassembled by hand |
| `FUN_00406539` | allocates **three** `0x1600`-byte blocks. `0x1600 = 4 strips × 16 stations × 2 verts × 44 bytes` — vertex buffers in the one FVF (`0x252`) |
| `FUN_00406438` | fills a block with four screen-edge strips **in NDC** |
| `FUN_00406783` | `if (method == 0) { morphing = 1; srand((int)param); FUN_00406438(target); }` |
| `FUN_004066a4` | 128-vertex x/y lerp between the two blocks, then one `DrawIndexedPrimitiveUP(TRIANGLELIST, 0, 0x80, 0x78, idx, D3DFMT_INDEX16, verts, 0x2c)` after `FUN_00401bd0` (`reset2D`) |

Verified visually: the border silhouette matches the reference capture with an
**IoU of 0.958–0.973** on the black-pixel mask at nine positions across four
scenes (§6). That is a very strong result for a procedurally seeded shape — the
notches land in the same places, which can only happen if the RNG, the seeds,
the random-walk thresholds and the station spacing are all right.

### The other big one: `m252` is the RENDER LAYER

`FUN_00406127` (the shared event tail every object runs first) is:

```
m252 (-4)  this->layer  = (char)ftol(param)      ; the byte at +0x14 the VM compares
m253 (-3)  this->dtBias = param                  ; one-shot delta added to dt
m254 (-2)  this->rate   = param                  ; units-per-second for dt
m255 (-1)  this->visible= (param != 0)
```

`ENGINE.md` had `m252`/`m254` down as unidentified scalars. `+0x14` is exactly
the byte `FUN_00402d87`'s render phase compares against the current layer, so
`m252 = 15.0` on object 2 puts the border in the **last** of the sixteen passes —
over the scenes (layer 2), the compositor (3) and the poem (14). `text.js`'s
`SceneObjectBase` already models this correctly.

### `m254` and the clock

`FUN_004060db`:

```
dt = (nowMs - lastMs) / (1000.0 / rate)          ; [0x418300] = 1000.0
```

`nowMs` is `FUN_00402f01` → `FUN_004100db`, the **MiniFMOD mixer's millisecond
counter**, not `timeGetTime`. So `rate` (the `m254` parameter, default 30.0 from
`FUN_00402e4e`) is literally "animation units per second".

---

## 1. Object 2 — the border (`js/scene_camera.js`)

### Geometry (`FUN_00406438`, confidence **high**)

Four independent strips, 16 stations each, positions written directly in NDC
(there is no `D3DFVF_XYZRHW` anywhere in the binary — 2D is identity-transform
clip space with **+y up**):

```
level = 2                                   ; per strip, a 0..3 random walk
s     = 1.0                                 ; steps by -0.13333334 [0x418310]
for each of 16 stations:
    if (rand() < 0x3000)                    ; the walk only moves ~37.5% of the time
        if (rand() < 0x4000) level = max(0, level-1)
        else                 level = min(3, level+1)
    d = level * 0.06666667 + 0.01           ; [0x418318], [0x418260]
    edge 0:  outer (-1, s)      inner (d-1, s)
    edge 1:  outer ( 1, s)      inner (1-d, s)
    edge 2:  outer ( s, 1)      inner (s, 1 - d*1.3333334)     ; [0x418314] = 4/3
    edge 3:  outer ( s,-1)      inner (s, d*1.3333334 - 1)
    s -= 0.13333334
```

The `4/3` on the top and bottom strips makes the frame the same width in
**pixels** on a 640×480 screen. `s` runs 1.0 → −1.0 in exactly 15 steps.

Indices, per station pair: `{v, v+1, w, w, v+3, v+1}` where `v = 2(j + 16·edge)`
and `w = v + 2` → 4 × 15 × 2 = **120 triangles**, `0x2d0` bytes of `u16`. ✓

### Appearance

The constructor writes `uv0 = (rand01(), -5.0)` on the outer vertex and
`(rand01(), 1.0)` on the inner one, `pos.z = 0`, and **`diffuse = 0x00000000`**.
With the default stage-0 `MODULATE(TEXTURE, DIFFUSE)` that is **black regardless
of what texture is bound**, which is why the frame is solid black in the capture.

The 32×32 texture the constructor bakes from **texgen program 12** (which
`baked/tex/manifest.json` confirms is an *empty* program, `opcount 0`) is stored
at `+0x18` and **never bound by anything**. Dead code. Left unported deliberately.

### Morph (`FUN_004066a4`, confidence **high**)

```
t += dt * 0.01                              ; [0x418260]
if (t >= 1.0) { memcpy(current, target, 0x1600); morphing = 0; t = 0; }
s  = 0.5 - 0.5 * cos(PI * t)                ; PI is the DOUBLE at [0x418220]
dest[i].x = s*target[i].x + (1-s)*current[i].x     ; x and y ONLY, 128 verts
dest[i].y = (1-s)*current[i].y + s*target[i].y
```

Seeds: the constructor does `srand(4000)` → current, `srand(5000)` → target, so
before the first `m0` the frame on screen is shape 4000 and the 5000 shape is
never seen (the first `m0` at `0x0439` overwrites it).

The 28 `m0` parameters, in order: 3, 4, 5, 7, 8, 9, 10, 11, 12, 15, 16, 13, 14,
20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, **50**, 32, 33. Arbitrary
author-chosen seeds; the out-of-order 15/16 before 13/14 and the stray 50 are
exactly what you expect from someone eyeballing shapes, and are meaningless as
keyframe indices.

`m254` retimes the morph: 60.0 at `0x0400`, 75.0 at `0x0430`, 45.0 at `0x0b39`.
At rate 60 a morph takes `1/(60·0.01) = 1.67 s`.

---

## 2. The camera actually lives in the Landscape

`FUN_004082a9` allocates **64** camera objects per scene (`0x134` bytes each,
`FUN_004052a5`) into `Landscape+0x18`, and loads spline data into the first
`desc[0]` of them from resource `0x24 + CAM_RES_BASE[sceneIdx] + i` with
`CAM_RES_BASE = [0,1,3,6,7,10,0,12,14]` — confirming `camera.mjs`'s table
byte-for-byte (the bytes live in the function's stack literals
`0x06030100 / 0x0c000a07 / 0x0e`).

Each camera is registered as a child of the scene root (`Landscape+0x2c`,
`FUN_00405ec9`, 0x18 bytes) by `FUN_00405f0e`, which sets `root+8 = child` for
the **first** child whose type mask `+0xa4` has bit 0 — so **camera 0 is active by
default**. `m4(i)` re-points `root+8` at `cameras[i]`.

Per frame, `FUN_00408eef`:

```
cam = root->activeCamera
cam.fovDeg = 90.0                            ; [0x42b40000], rewritten EVERY frame
FUN_004058a6(cam)                            ; evaluate the spline at cam.time
if (active) cam.time += this->camRate * dt   ; +0x1c * +0x04
h = FUN_0040e8d2(terrain, cam.x, cam.z)      ; terrainHeight
if (cam.y <= h) cam.y = h                    ; the camera never goes underground
cam.far = desc.fogEnd                        ; +0xc4 = desc+0x2a
```

`camRate` is initialised by `FUN_00408d72` to `(1/rate) * 6.4` (`[0x418e8c]`), and
`dt = deltaMs * rate / 1000`, so the two `rate`s cancel and the **camera clock
runs at exactly 6.4 units per second regardless of `m254`**. That is a clean,
independently checkable prediction, and it checks out on all four of my scenes:

| object | scene rows | seconds | 6.4·s | last key `t` |
|---|---|---|---|---|
| 3 | 0x0400→0x0700 = 192 | 31.3 | 200 | 192 (res 36) |
| 4 cam0 | 0x0700→0x0820 = 96 | 15.7 | 100 | 96 (res 37) |
| 4 cam1 | 0x0820→0x0a00 = 96 | 15.7 | 100 | 96 (res 38) |
| 5 cam0 | 0x0a00→0x0b20 = 32 | 5.2 | 33 | 96 (res 39, cut early) |
| 5 cam1 | 0x0b20→0x0c20 = 64 | 10.4 | 67 | 64 (res 40) |
| 5 cam2 | 0x0c20→0x0f00 = 160 | 26.1 | 167 | 160 (res 41) |
| 6 | 0x0f00→0x1200 = 192 | 31.3 | 200 | 192 (res 42) |

Every path is consumed to within 4 % of its last key. The camera port in
`js/camera.mjs` is used unmodified, including the Euler-angle correction and the
π roll flip.

`m5(f)` would set `camRate = (1/rate) * f * 0.64` (`[0x418ed0]`); none of objects
3..6 uses it.

---

## 3. `FUN_00409acb` — the Landscape event handler (confidence **high**)

| method | effect |
|---|---|
| `m1(i)` | if flag bit 1: arm array-A cluster `i` (`+0x20` of its record) → the spires start growing |
| `m2(i)` | if flag bit 15: arm compound prop `i` |
| `m3(i)` | **`FUN_004082a9(this, i)` — build the whole scene.** Fired at `t = 0xffff` with 0/1/2/3 for objects 3/4/5/6 |
| `m4(i)` | if active: `root->activeCamera = cameras[i]` |
| `m5(f)` | if active: camera time rate |
| `m6(f)` | the `active` flag at `+0x20` — **separate from `m255`'s visibility** |
| `m7` | `+0x144 = 1` (object 4 at `0x0720`) — gates the water-level fade at `+0x140` |
| `m8` | `+0x145 = 1` (object 7) |
| `m9(i)` | if flag bit 3: arm tree `i` |
| `m10` | `+0x14c = 1` (object 6 at `0x1100`) — starts the cloud-layer dissolve at `+0x150`, `dt * 0.003` (`[0x418ea8]`) |

---

## 4. Per-scene inventory

Descriptor fields all come from `js/scene_desc.mjs`; nothing is byte-parsed here.

### Object 3 — scene 0 (res 28, cam res 36), `0x0400`–`0x0700`

| | |
|---|---|
| fog | `0x00c8c8ff` lavender / start 500 / end 800 (**end = camera far plane**) |
| terrain | hmap prog 23, N 64, scale (4, 1.5, 4) — **hidden**, flag bit 16 clear |
| water / clouds / trees / billboards / birds | none |
| sun | (0, 400, 0), flareParam 300 / **0** → constant size, alpha 255 |
| array A | **1 cluster of 80 spires**, box centre (106, 40, 24) ±(150, ·, 150), radius 3.2, heightRatio 160 → 480 units tall, rings 16, segments 8 |
| script | `m6(1)`, `m254(24)`, `m252(2)`, then **`m1(0)` at `0x042a`** |

The spires are the grass blades that sweep the sun at ~65 s. Two things about
them that are easy to get wrong and that this port gets from the binary:

* **They have no UVs.** `FUN_0040bc63` writes only `[esi+0]/[esi+4]/[esi+8]`
  (`MESHGEN_PORT.md` §2 already corrected the notes on this). Their material —
  `FUN_00401c67(mat, texgen_prog_2 @256×256, 0, 0x20)` — has the **sphere-map
  bit `0x20`**, so the texture is addressed purely by the camera-space normal.
  That is where the yellow-green sheen comes from. Getting this wrong renders
  them as flat white hairlines.
* **They grow.** `FUN_0040bfc1` ramps the instance y-scale from `0.001`
  (`[0x418e28]`) to 1 at `desc.paramA (= 0.1) * dt * 0.01`.

### Object 4 — scene 1 (res 29, cam res 37+38), `0x0700`–`0x0a00`

Res 29 is the shortest descriptor in the demo: 83 bytes, header only, **no
arrays at all**.

| | |
|---|---|
| fog | `0x00c8c8ff` / 400 / 700 |
| terrain | hmap prog 23, N 64, scale (3, 0.5, 3), **visible** |
| water | level 1.0, **coarse 4×4** (bit 13 clear), half-extent 300, uv0 ×8; level **animated** by bit 17 — `FUN_00408eef` forces it to 0 before position `0x820` and 1.0 after |
| clouds | bit 9, count 3, size 250, colour `0xffffff`, bit 10 **clear** → the curved 16×16 dome |
| sun | (−400, **374**, 400) — `FUN_004082a9` patches `desc+0x36` to `374.0f` for scene 1 only; flareParam 400 / 0 |
| bit 24 | set → `FUN_0040e058`'s `param_13 = 0`, which skips the second ground-texture pass |
| script | `m6(1)` at `0x0700`, `m7` at `0x0720`, **`m4(1)` at `0x0820`** |

The `m4(1)` camera cut and the water switching on happen at the *same* music
position — that is the moment the lakes appear in the reference.

Water material, coarse branch: `FUN_00401c67(mat, texgen 13, <generated grey>,
0x1019)`, where the grey is a 256×256 built from the heightmap as
`x = (h >> 1) + 0x40; 0xff000000 | x<<16 | x<<8 | x`. Ported exactly.
(The hi-res branch's shoreline-alpha loops — the `d > 48 → d *= 4` knee and the
`a < 0x40 → 0` clamp — only run when bit 13 is set, which none of objects 3..6
does; `MG.applyShorelineColours` is wired up for it anyway.)

### Object 5 — scene 2 (res 30, cam res 39/40/41), `0x0a00`–`0x0f00`

| | |
|---|---|
| fog | `0x0086c8ff` sky blue / 500 / 800 |
| terrain | hmap prog 22 (peak only 38/255 → nearly flat), N 64, scale (5, 1.5, 5), visible |
| array C | 4 clusters of tree impostor billboards: 10 @ (0,0,−150) size 100; 5 @ (−300,20,300) size 87.5; 5 @ (300,20,300) size 125; 10 @ (0,20,300) size 100 |
| array D | 256 ground-cover billboards, size 1.6, ±300 box |
| array F | 1 compound prop at the origin, param 0.15 |
| array G | **256 species-0 "birds" at (0, 80, 0) radius 100** — the butterflies |
| sun | (0, 400, 400), flareParam 300 / **50** — the only one of my four with a non-zero grow rate, so its sun genuinely pulses as the trees occlude it |
| script | `m4(1)` at `0x0b20`, `m4(2)` + `m2(0)` at `0x0c20` |

### Object 6 — scene 3 (res 31, cam res 42), `0x0f00`–`0x1200`

| | |
|---|---|
| fog | `0x00c8c8ff` / **2950 / 3000** — by far the largest range, and since fog end *is* the far plane the camera sees 3000 units here |
| terrain | scale (5, **0.001**, 5) — a dead-flat plate — and **hidden** (bit 16 clear), so it is never drawn |
| clouds | bit 9, count 3, cloudParam 180, size 200, colour `0xffffff`, **bits 10 and 11 both set** (the only scene where that happens) → the 8-layer stacked-flat variant with the `max(t, 1−t)` alpha ramp. That is the sea of clouds |
| sun | (0, 440, 400), 300 / 0 |
| array G | 4 species-1 birds at (0, 300, 0), radius 100 |
| script | `m10` at `0x1100` |

**Correction to the meshgen contract:** `MG.buildCloudSky({opt10})` takes the
descriptor flag bit 10 **directly**, not `FUN_0040ec28`'s inverted
`~(flags>>10)&1` argument. Passing the inverted value gives scene 3 the curved
dome, which renders as a green arc in the middle of the frame instead of a
horizon-filling cloud sea. Settled by rendering both against the capture.

> **2026-08-05, confirmed with a mechanism.** This was the one place the two
> independent `Landscape` ports flatly contradicted each other, and it is
> resolved in `re/scenes/CONSOLIDATION.md` §2. The original's *argument* really
> is `~(flags>>10)&1` — `scene7.js` computed it correctly — but inside
> `FUN_0040ec28` the branch is `if (param_7 == '\0') { stacked layers }`, while
> `MG.buildCloudSky` is written `if (opt10) { stacked layers }`. The meshgen
> parameter is the **opposite polarity** of the original's argument, so the raw
> bit is what it wants. `meshgen.mjs`'s header comment describes the argument,
> not its own branch; flagged for its owner, not edited. Measured on the merged
> class: object 6's `0x0f30` went 35.4 → 23.0 and its mean luminance 138.6 →
> 159.7 against the reference's 160.5.

---

## 5. Render path (`FUN_00408eef`, reduced)

What this port does per frame, in order:

1. `dt` (`FUN_004060db`), `animT += dt*0.01`.
2. Camera: fov ← 90, evaluate spline, advance `cam.time`, clamp `cam.y` to the
   terrain, `cam.far ← desc.fogEnd`.
3. Water-level animation (bit 17).
4. **`Clear(TARGET|ZBUFFER, desc.fogColour)`** — this is `FUN_00402c72(0)`, and it
   is the *only* thing that paints the sky. The demo never sets a clear colour
   anywhere else; `DAT_00474790` is assigned the descriptor's fog colour at the
   top of every Landscape render.
5. `setFog(1, fogColour, fogStart, fogEnd)` — **as raw DWORD bit patterns**, see
   §7.
6. `SetTransform(VIEW / PROJECTION)`.
7. Sun sprite → terrain → spires → water → birds → clouds.

### The sun (`FUN_00405082` / `FUN_004051ac` / `FUN_00404dbb`)

A one-element **point-sprite** object (`FUN_00404bb8`, type mask `+0xa4 = 4`)
whose record is `{vec3 pos, vec3 offset, f32 size, u32 colour}`. Per frame:

```
sprite.size   = flare.cur                                   ; +0xdc
sprite.colour = ftol((cur / max) * 255.0) << 24 | 0xffffff   ; [0x418268] = 255.0
```

`FUN_00404dbb` sets **VIEW and WORLD to identity**, transforms the sprite centre
by the camera's view matrix itself, and emits the four corners at
`centre ± (size, size, 0)` in **camera space** — that is what makes it exactly
camera-facing. UVs `(0,0) (1,0) (1,1) (0,1)`, indices `{0,1,2,2,3,0}`.
Material: `FUN_00401c67(mat, texgen 14, 0, 0x1891)` = lighting off | fog off |
z-write off + `ZFUNC ALWAYS` | cull none | **additive**.

The flare pass runs with the far plane pushed to `10000.0` (`[0x461c4000]`) and
restored afterwards.

**Draw order matters and is easy to get backwards.** The flare is a child of the
scene root, so `FUN_00406004`'s `FUN_00405f8b(4, dt, 2)` draws it *before* any of
the Landscape's explicit mesh draws. Because it is additive with z-write off and
`ZFUNC = ALWAYS`, drawing it last instead washes the entire frame white — which
is exactly what scene 0's spires-crossing-the-sun shot at `0x0600` exposes.

`FUN_004050ed`'s grow/shrink is driven by an occlusion query
(`FUN_00402907` renders a marker quad at the projected sun and reads back 4×4
pixels). **Not ported.** For objects 3, 4 and 6 this is exactly equivalent
because `flareParam2 = 0` there, so the size is constant at `flareParam1`. For
object 5 (`flareParam2 = 50`) the sun is modelled as permanently unoccluded.

---

## 6. Verification

Reference `reference/sonnet_ref.mkv`, video time = music seconds + **2.43 s**
(the project's measured offset), plus the half-row settle `main.js` uses.
Rendered headless with puppeteer-core through `?pos=` / `window.__sonnetRender`,
warmed from position 0 by `main.js`'s `warmTo` (which replays the script via
`timeline.js`'s `seek`), then compared 640×480 against the matching video frame.

Two numbers per position. `rmse`/`psnr` is a straight photometric comparison of
the whole frame — it is a *harsh* metric here because a missing tree changes
tens of thousands of pixels. `borderIoU` is the intersection-over-union of the
"nearly black" masks, which is dominated by object 2's frame.

| pos | video t | rmse | psnr | mean ours / ref | borderIoU | reading |
|---|---|---|---|---|---|---|
| 0x0410 | 46.86 s | 15.6 | **24.3 dB** | 160.4 / 164.6 | 0.964 | scene 0, sky + sun only. Very close |
| 0x0450 | 57.29 s | 36.0 | 17.0 dB | 179.1 / 164.9 | 0.965 | scene 0, spires part-grown; ours brighter |
| 0x0600 | 65.12 s | 44.3 | 15.2 dB | 149.3 / 141.9 | 0.958 | scene 0, spires across the sun. Same effect, blades distributed differently |
| 0x0730 | 83.38 s | 32.7 | 17.8 dB | 65.2 / 67.4 | 0.964 | scene 1. **Same ridge, same green foreground, same horizon line** |
| 0x0900 | 96.42 s | 97.4 | 8.4 dB | 113.7 / 69.8 | 0.488 | scene 1 with water. Ours much brighter — no shadow bake; the IoU is meaningless here because the reference frame is mostly dark terrain |
| 0x0a30 | 114.69 s | 61.9 | 12.3 dB | 92.3 / 69.3 | 0.968 | scene 2, no trees |
| 0x0c00 | 127.73 s | 106.3 | 7.6 dB | 131.3 / 72.6 | 0.962 | scene 2. Butterflies, ground and sun all correct; **the tree impostors are missing**, and they are most of the frame |
| 0x0e00 | 148.60 s | 11.0 | **27.3 dB** | 57.6 / 53.2 | 0.920 | scene 2, mid-fade |
| 0x0f30 | 166.86 s | 25.5 | 20.0 dB | 149.0 / 160.5 | 0.970 | scene 3 |
| 0x1100 | 179.90 s | 20.7 | **21.8 dB** | 158.6 / 161.3 | 0.973 | scene 3. Sun position/size and cloud horizon both right; our cloud texture is streaky where the reference is puffy |

**Honest summary.** The border (object 2), the sky/fog colour, the camera path
and timing, the terrain silhouette, the sun's position and size, and scene 3's
cloud sea are all genuine matches — I looked at every one of the ten side-by-side
montages. Scene 2 is dominated by geometry this port does not build. Scene 1's
terrain is the right shape but too bright, because the ground bake is
approximated (§7).

Existing suites after these changes: `timeline_test` ALL PASS,
`text_test` ALL PASS, `integration_test` ALL PASS,
`run_minid3d8_test` **116/116**, `js/meshgen_test.mjs` **369/369**.

---

## 7. Known deviations, in order of how much they matter

1. **The ground texture bake is an approximation.** `FUN_0040e058` step 5
   (VA ~0x40e460) combines `texA`, `texB`, the 32-pass soft-shadow bake, the
   terrain vertex normal's `n.y` and two fractional cell coordinates through a
   chain of ~10 `ftol` calls whose x87 operands Ghidra discards;
   `MESHGEN_notes.md` §10 lists the blend math as UNRESOLVED and this port does
   not resolve it. What *is* established from the loop is the input set and the
   output format (`0xff000000 | r<<16 | g<<8 | b`, each channel clamped to 255),
   so `bakeGroundTexture()` has the right inputs and the right output, with a
   guessed weighting: `lerp(texB, texA, clamp(n.y))`. Confidence **low** on the
   curve, **high** on the inputs. The visible consequence is that scene 1's
   terrain lacks the reference's baked shadowing and reads too bright.
2. **Scene 2's tree impostors are absent.** `FUN_0040abed` (the impostor baker)
   is unported, and it needs both a render target and the tree generator's own
   texture programs. Without it the four array-C clusters have no texture and
   are not drawn. This is the single biggest visual gap in my scope.
3. **The compound prop (array F) is absent** — `FUN_0040c721` is
   `MESHGEN_PORT.md` §8's biggest remaining hole.
4. **Bird/butterfly flight is static.** `MG.buildFlock` produces the correct
   initial state (positions, per-bird scale, phase, species colour) and it is
   drawn, but `FUN_0040fba1`'s flight integration is not ported, so the
   butterflies hang still. Their count, colours and spread are right.
5. **The cloud texture's RGB literal is overruled.** `re/out/sonnet.c` renders
   `FUN_0040ec28`'s texel constant as `0x7f40`, which would make every cloud dark
   green. The reference is unambiguously white, the layer's vertex colour is
   `desc.cloudColour = 0xffffff` and the stage op is `MODULATE(TEXTURE, DIFFUSE)`,
   so white it is. The **streak pattern** (per column: a random row threshold and
   a coin flip on `> 0x5f` deciding alpha 0xff vs 0) is transcribed as decoded and
   is high confidence; the colour is a judgement call. The reference's puffier
   clouds suggest the real texture is the render-target noise bake
   (`buildCloudNoiseQuads` → RT → sky), which is not ported.
6. **The occlusion query is not ported** (§5). Exact for objects 3/4/6, an
   approximation for object 5.
7. **The reflection pass is not ported.** When `waterLevel > 0`,
   `FUN_00408eef` mirrors the scene through the water plane (`FUN_00408dd1`
   negates `scale.y` and reflects `pos.y`), enables user clip plane 0 and calls
   `FUN_00406004` a second time. Scene 1 is the only one of mine with water.
8. **`FUN_0040bfc1`'s exact spire-growth curve** is inferred, not disassembled;
   the rate source (`desc.paramA`) and the `dt * 0.01` scaling come from
   `FUN_00408eef`'s call site, which is solid, but the integrator inside
   `FUN_0040bfc1` was not read.

## 8. A shim trap worth writing down

`minid3d8.js`'s `_asFloat(value)` resolves an **integer greater than 64** as a
raw IEEE-754 bit pattern, because that is how the original passes floats through
`SetRenderState` (`FUN_00401abf` pushes the descriptor's f32 dwords). So calling
`d3d.setFog(1, colour, 400, 700)` with JS numbers sets fog start and end to
`5.6e-43`, i.e. **zero**, and every pixel comes back as flat fog colour. The
correct call — and the faithful one — is to hand over the bit patterns, which is
what `f32bits()` in `scene3.js` does. This is documented shim behaviour, not a
bug, but it is silent and it cost real time here; the symptom is a completely
featureless frame that still has the right sky colour.

## 9. Debug hooks left in place

* `globalThis.__landscapes` — every `Landscape` pushes itself on construction.
  Lets a headless probe read the live descriptor, camera time, evaluated
  position and mesh counts without exporting anything from `main.js`.
* `globalThis.__scenesReady` (set in `js/scenes.js`) — a promise that resolves
  once every scene's baked PNGs have decoded and its geometry is built. Headless
  capture must await it before the first `window.__sonnetRender`, otherwise the
  scenes are still empty.

---

## 10. Superseded by the consolidation (2026-08-05)

`scene3.js` no longer contains a `Landscape` class. Objects 3..10 are eight
instances of **one** class in the original, and they are again in the port: the
class lives in `web-sonnet/js/scene7.js` and `scene3/4/5/6.js` are three-line
wrappers. `re/scenes/CONSOLIDATION.md` records what each of the two independent
ports had that the other lacked, what was merged, what was dropped, and the
per-position measurements. Everything in §§1–9 above about *this scene set*
still holds; the statements about how it is implemented do not. In particular:

| §7 deviation | status after the merge |
|---|---|
| 1. the ground-texture bake is an approximation | **fixed** — `scene7.js`'s bake is the disassembled one (`SCENES_7_10.md` §2), including the `(x+1)/cell` off-by-one |
| 2. scene 2's tree impostors are absent | **fixed** — `FUN_0040abed`/`FUN_0040b0b0` were ported into the other file; object 5's median RMSE went 29.9 → 19.9 |
| 3. the compound prop (array F) is absent | still absent — `FUN_0040c721` has no transcription |
| 4. bird/butterfly flight is static | **fixed** — `FUN_0040fba1`, including the build-time preroll |
| 5. the cloud texture's RGB literal is overruled | the port now textures every sky with texgen 7 and uses the binary's material (`0x1050`, or `0x3091` for scene 3); the RGB judgement call is gone with the texture. The render-target composite is still unported |
| 6. the occlusion query is not ported | **fixed** — `js/flare.js` now attaches to the shared class, so objects 3..6 get it too |
| 7. the reflection pass is not ported | **fixed** for object 4 (mirror + clip plane, graded *medium* in `SCENES_7_10.md` §9) |
| 8. `FUN_0040bfc1`'s spire growth curve is inferred | unchanged, but the array-A **scatter** is fixed: it uses `FUN_004078b6` with `srand(clusterIndex)` and Z drawn before X, not `MG.scatter(seed: 1)`. §6's "same effect, blades distributed differently" at `0x0600` was that bug; the position went 48.4 → 39.3 |

Two things objects 3..6 gained that §7 did not know were missing: the **sun
point light** (`FUN_00405d13`, `0x1f1f1f1f` scene ambient — they were rendering
completely unlit, which is most of the +8 to +10 Δluminance §6 reports) and the
descriptor's **animated water level** for scene 1, which `scene3.js` had and
`scene7.js` did not, so the merge had to keep it.
