# Sonnet — objects 7, 8, 9, 10 (the last four scenes)

What `web-sonnet/js/scene7.js` … `scene10.js` implement, what the reverse
engineering confirmed, what it corrected, and what is still missing.

All VAs are image VAs (`unpacked/sonnet_img.bin`, VA `0x401000` = file offset 0).
Every float constant quoted here was read out of the binary, never out of
`re/out/sonnet.c`.

| object | sceneIdx | descriptor | camera res | music positions | layer |
|---|---|---|---|---|---|
| 7 | 4 | res 32 | 43, 44, 45 | 0x1200–0x1700 | 2 (m252) |
| 8 | 5 | res 33 | 46, 47 | 0x1700–0x1e00 | **0** (never gets m252) |
| 9 | 7 | res 34 | 48, 49 | 0x1e00–0x2300 | 2 |
| 10 | 8 | res 35 | 50, 51 | 0x2300–0x2b00 | 2 |

---

## 0. There is only one class

`PTR_FUN_00418e68` is the vtable of **every** outdoor scene. Objects 3..10 are
eight instances of it; the only thing that differs is the descriptor index passed
to `FUN_004082a9` by the `m3` init event. So `scene7.js` exports the whole
`Landscape` class and `scene8/9/10.js` are three-line wrappers that pick a
different `sceneIdx`. (Objects 3..6 are another agent's files and are untouched.)

```
vtable 0x418e68  +0x00 FUN_00408d72   ctor / reset
                 +0x04 FUN_00408eef   render(layer)
                 +0x08 FUN_00409acb   event(method, param)
                 +0x0c FUN_00408276   dtor
```

### `FUN_00409acb` — the event handler (confidence: **high**)

`FUN_00404224` is `ftol` (x87 `ROUND`, i.e. round-half-even, **not** truncate);
Ghidra emits it with no argument because the value is on the FPU stack. Every
`m N` that takes an index goes through it.

| method | effect | who uses it |
|---|---|---|
| 252 | `+0x14` = layer | 7, 9, 10 (obj 8 keeps the ctor's 0) |
| 253 | `+0x08` = one-shot dt bias | nobody in 7..10 |
| 254 | `+0x0c` = the time base (default **30.0**, from `FUN_00402e4e`) | nobody in 7..10 |
| 255 | `+0x15` = visible | all four |
| 1 | activate array-A instance `ftol(param)` | scene 0 only |
| 2 | activate array-F prop | scene 2 only |
| 3 | `FUN_004082a9(this, ftol(param))` — BUILD the scene | all four, at t = 0xffff |
| 4 | `root+0x08 = cameras[ftol(param)]` — select the camera path | all four |
| 5 | `+0x1c = (1/+0x0c) · param · 0.64` — camera speed | nobody in 7..10 |
| 6 | `+0x20` = enabled | all four |
| 7 | `+0x144 = 1` | obj 4 |
| 8 | `+0x145 = 1` — start the SUNSET ramp | **obj 7 at 0x1500** |
| 9 | activate tree `ftol(param)` | **obj 8 at 0x191f** |
| 10 | `+0x14c = 1` | obj 6 |

### The clock (confidence: **high**, and independently corroborated)

`FUN_004060db`: `dt = (nowMs − lastMs) / (1000.0 / +0x0c)`, i.e. **dt is elapsed
time in units of 1/30 s** — "frames at 30 fps". `FUN_00408d72` then sets
`+0x1c = (1/30) · 6.4 = 0.21333`, and `FUN_00408eef` advances the active camera
by `+0x1c · dt` per frame ⇒ **6.4 spline units per second**.

That number is *checked* by the timeline, and it lands exactly:

| object | path | key times | window | rows | seconds | 6.4 · s |
|---|---|---|---|---|---|---|
| 7 | res 43 | 0 … 64 | 0x1200–0x1300 | 64 | 10.4 | 66.8 |
| 7 | res 44 | 0 … 128 | 0x1300–0x1500 | 128 | 20.9 | 133.7 |
| 7 | res 45 | 0 … 128 | 0x1500–0x1700 | 128 | 20.9 | 133.7 |
| 8 | res 47 | 0 … 128 | 0x1700–0x1900 | 128 | 20.9 | 133.7 |
| 8 | res 46 | 0 … 320 | 0x1900–0x1e00 | 320 | 52.2 | 334.1 |
| 9 | res 48 | 0 … 128 | 0x1e00–0x2000 | 128 | 20.9 | 133.7 |
| 9 | res 49 | 0 … 192 | 0x2000–0x2300 | 192 | 31.3 | 200.5 |
| 10 | res 50 | 0 … 256 | 0x2300–0x2700 | 256 | 41.7 | 267.4 |
| 10 | res 51 | 0 … 256 | 0x2700–0x2b00 | 256 | 41.7 | 267.4 |

Every path is traversed exactly once over exactly its slot, to within 4 %. That
simultaneously confirms the 6.4 constant, the 30.0 time base, the `(order<<8)|row`
clock, the `m4` → camera mapping, and the fact that **each of the 64 cameras keeps
its own `+0x110` time and only advances while it is the selected one** (so a
freshly selected path starts at 0). The port models it that way (`camTimes[]`).

### A confirmed no-op

`FUN_00408eef` reads the terrain height under the camera and does
`if (cam[0x118] <= h) cam[0x118] = h`. But `FUN_004058a6` has *already* copied
`+0x114..0x11c` into `+0x88` (the position the view matrix is built from) earlier
in the same frame, and `FUN_0040544c` rewrites `+0x114..0x11c` from the spline on
every subsequent frame. **The clamp can never affect the image.** It is
deliberately not reproduced; the comment in `render()` says so.

---

## 1. `FUN_004082a9` / `FUN_00407983` — what gets built

Read the descriptor via `js/scene_desc.mjs` (never parse bytes here). Then:

| step | source | port |
|---|---|---|
| heightmap | `FUN_00416036(desc+0x3f, 0x80, 0x80)` — the program's **native** size is 128×128 for progs 22/24/25/26, so the W/H arguments only size the cache copy | `runTexgen(RESOURCES[prog])`, blue channel (`& 0xff`) |
| terrain | `FUN_0040e058` | `MG.buildTerrain(hmap, N, scale)` |
| ground texture | `FUN_0040e058` step 5 | `bakeGroundTexture()`, §2 |
| terrain material | `FUN_00401c67(mat, ground, detail, 0x18)` | flags **0x18**, stage 1 = texgen 16 (512×512), uv1 ×16 |
| ” for sceneIdx 8 | `if (param_1 == 8)` → stage 1 = `groundTexProgB`, flags **0x3a** | obj 10 only |
| water | `FUN_004082a9`, only when `waterLevel > 0` | `MG.buildWaterPlane` + `MG.applyShorelineColours` |
| water material | hi-res branch: `FUN_00401c67(mat, texgen 13, 0, 0x1011)` | obj 7 |
| ribbons | 32 × `FUN_0040f42f` in the hi-res branch | `MG.buildRibbon` (built, not yet animated) |
| array B | `FUN_0040c1b2` + its procedural strand texture | **disassembled, §10** — 128 cross-hatched walls, not 16 fanned strips |
| trees | `FUN_00409d45` | `MG.buildTree`, leaf texture MODULATED, §3 |
| birds | `FUN_0040f803` | `MG.buildFlock`, material 0x1310, texgen 9/10 |
| clouds | `FUN_0040ec28` | `MG.buildCloudSky`, material **0x1050** (0x3091 when flag bit 11 is set), texgen 7 — see CONSOLIDATION.md §2; the port had 0x1811, which is the *noise quads'* material |
| precipitation | `FUN_0040d1f1` | `MG.buildPrecipitation`, material 0x1050, texgen 15 (snow) / 6 (rain) — LANDSCAPE_ANIM.md §7 |
| the sun light | `FUN_00405d13` @ 0x4082f0 | §4 |

`FUN_00416036` caches each program's output in `DAT_00478a38`; the port does the
same with a module-level `Map`, which matters — programs 18 and 16 are shared by
all four scenes, so the whole build for objects 7..10 costs ~600 ms once.

---

## 2. The ground-texture bake — SOLVED (confidence: **high**)

`MESHGEN_PORT.md` §11 lists this as unresolved. It is resolved here. The loop is
at **VA 0x40e3a6–0x40e5ea**; Ghidra drops the entire x87 chain (eight bare
`FUN_00404224()` calls with no arguments), so it was disassembled and the FPU
stack tracked by hand. Per 256×256 texel:

```
cell = 256 / N
ax = (x % cell) / cell                ay = (y % cell) / cell
n00 = ny[ (y/cell)*N     +  (x/cell)    ]
n01 = ny[ (y/cell)*N     + ((x+1)/cell) ]     <-- (x+1)/cell, NOT (x/cell)+1
n10 = ny[ ((y+1)/cell)*N +  (x/cell)    ]
n11 = ny[ ((y+1)/cell)*N + ((x+1)/cell) ]
   (any index >= N contributes 0 — the original just skips the fld)
W = (1-ax)(1-ay)·n00 + ax(1-ay)·n01 + (1-ax)ay·n10 + ax·ay·n11
S = param_14 ? 1.0 : shadow256[y][x].b · (1/255)          [0x418298] = 1/255
c = min(255, ftol( ( ftol(A.c · W) + ftol(B.c · (1-W)) ) · S ))    for c in R,G,B
out = 0xFF000000 | R<<16 | G<<8 | B
```

* `ny` is the terrain vertex's **normal.y** (`vertex + 0x10`), so flat ground gets
  `groundTexProgA` and slopes get `groundTexProgB`. `param_5` (= texture A) is the
  one weighted by `W`; `param_6` (= texture B) by `1 − W`.
* The `(x+1)/cell` / `(y+1)/cell` indexing is an **off-by-one in the original**:
  inside a cell `n01 == n00`, so the "bilinear" only actually blends on the last
  texel of each cell. It is reproduced verbatim (it is a one-texel seam feature,
  not a smooth gradient).
* Sanity: mean output RGB is (205,198,170) sand for scene 4, (111,86,12) brown for
  scene 7, (240,252,254) white ice for scene 8 — which is what the reference shows.

**Not ported:** `FUN_0040e923`, the 32-pass jittered shadow raymarch that fills
`this+0x24`. It `memset`s the map to 0xFF and can only ever darken, so the port
runs with `S = 1.0` — the unshadowed limit of exactly the same expression. Cost
estimate for doing it properly: 65 536 texels × 32 passes × ~10² march steps.

---

## 3. Two per-scene specials, both confirmed from the binary

### Obj 10 (sceneIdx 8) is rendered UNLIT, and its ice is a sphere map

1. `FUN_0040e058` ends with `if (param_1 == 8) { tex1 = texture(param_6); flags = 0x3a; }
   else { tex1 = DAT_00478978 /* texgen 16 */; flags = 0x18; }`.
   **0x3a = 0x20 | 0x10 | 0x08 | 0x02** = camera-space-normal SPHERE MAP with the
   ±2.0 texture matrix, stage-1 MODULATE, CULL NONE. That reflective sheen is what
   makes the ice read as ice, and it is unique to this scene.
2. `FUN_004082a9` @ 0x408320: `if ((desc[0x50] & 1) == 0) registerLight(); else
   root->ambient = 0xFFFFFFFF;`. `desc[0x50] & 1` is **flag bit 8** (`terrainOpt8`),
   which only scene 8 sets. `FUN_00406004` skips `FUN_00401b86(1, ambient)` when
   the ambient is −1, so obj 10 never turns lighting on at all.

### Obj 8's autumn colour is a texture modulate

Confirmed against `MESHGEN_PORT.md` §2's correction: `DAT_0047895c` (0xFFFF0032
when flag bit 23 is set) is applied per-texel to the *generated leaf texture*
(`out.c = (src.c · tint.c) >> 8`, `MG.modulateARGB`). Tree vertex colours stay
0xFFFFFFFF. The port modulates texgen program 1 at build time.

---

## 4. The sun light (confidence: **high**)

`FUN_00405d13` + `FUN_004082a9` @ 0x4082f0:

```
Type          = D3DLIGHT_POINT               (+0xac = 1)
Diffuse       = (1,1,1,1)                    (+0xb0..+0xbc)
Position      = desc+0x32, the sun position  (+0xe0, via the flare object's +0xb4)
Range         = 1500.0                       (+0xf8 <- +0x118 = 0x44bb8000)
Attenuation0  = 0                            Attenuation2 = 0
Attenuation1  = max( ((255 - desc[0x3e]) / 255)^3 , 1e-4 )    [0x4182f0]
scene ambient = 0x1F1F1F1F                   (root+0x14)
```

With those attenuations the light saturates over the whole terrain (haze is
2.5e-4 … 7.3e-4), so in practice it behaves as a hard `max(dot(N,L),0)` terminator
plus a 12 % ambient floor. That is exactly what the reference shows.

---

## 5. `FUN_00408eef` — the render, and the two fog ramps

Order (subset actually ported):

1. `DAT_00474790 = desc+0x22` — **the fog colour is also the device clear colour**.
2. `if ((flags & 0x200) == 0) FUN_00402c72(0)` — scenes **without** a cloud layer
   paint the sky by clearing colour+Z to the fog colour. Objects 7 and 9 do this;
   objects 8 and 10 have `cloudLayer` set and get their sky from cloud geometry.
   *Getting this wrong renders a black sky, which is how it was caught.*
3. `FUN_00401abf(1, fogColour, desc+0x26, desc+0x2a)` — **linear VERTEX fog**, and
   `camera+0xc4 = desc+0x2a`, so **fog end doubles as the far plane**.
4. water: mirror everything (`FUN_00408dfc`), clip plane `(0, −1, 0, 1.1·waterLevel)`,
   draw, un-mirror.
5. `if (waterLevel <= 0) FUN_00402c72(0); else Clear(ZBUFFER only)` — the Z-only
   clear is what preserves the reflection under the water.
6. the main pass, then the water surface.

### The precipitation gates — MUSIC POSITION, not the object's window

VA 0x408f0d–0x408fd6 and 0x408fe9–0x409008:

```
if (flags & 0x40) {                                   // buildPrecip
    if (pos > 0x19ff)  t154 += dt · 0.003             [0x418ecc]
    if (pos > 0x16ff && pos < 0x1e00)  <fog ramp B>   // obj 8's window exactly
    precipMesh->flags |= 2                            // HIDDEN by default
    if ((pos > 0x1aff && pos < 0x1e00) || pos > 0x1fff) {
        precipMesh->flags &= ~2                       // visible
        t158 += dt · (precipType ? 0.08 : 0.01)       [0x418ebc] / [0x418260]
    }
}
```

So obj 8's rain only starts a quarter of the way into the autumn scene (0x1b00)
and obj 9's snow only at 0x2000 — which is exactly what the reference shows, and
is why an ungated port looks wrong at 0x1e10.

### Fog ramp A — the SUNSET (obj 7's `m8`), VA 0x409070–0x4090cc

Disassembled; Ghidra emits only three bare `ftol`s.

```
t = +0x148
R = ftol( 163·t + 200·(1-t) )        [0x418ec4] = 163, [0x418eb8] = 200
G = ftol(  71·t + 200·(1-t) )        [0x418ec0] = 71
B = ftol( 255·(1-t) + t )            [0x418268] = 255
desc[0x22] = 0xFF000000 | R<<16 | G<<8 | B
sun.y      = 200.0 - t·150.0         [0x418e9c] = 150
t         += dt · 0.002              [0x418e98]
```

`t = 1` gives **0xA34701 — bit for bit scene 5's descriptor fog colour**, i.e. the
beach deliberately fades into the autumn palette over the 20.9 s between `m8`
(0x1500) and the handover (0x1700). At `1/(0.002·30) = 16.7 s` the ramp finishes
just before the cut. That coincidence is the proof the transcription is right.

### Fog ramp B — out of autumn, VA 0x408f69–0x408fd2

```
t = +0x154
R = ftol( 163·(1-t) + 50·t )         [0x418e60] = 50
G = ftol(  71·(1-t) + 50·t )
B = ftol(  50·t + (1-t) )
cloudByte = ftol( 225 - 225·t )      [0x418ec8] = 225   -> the cloud layer's grey
```

`t = 0` reproduces 0xA34701 exactly again; `t = 1` is a flat (50,50,50) storm grey.

### `applyShorelineColours` needs one extra flag

VA 0x408750, in the hi-res-water branch: `*(byte *)(terrainMesh->material + 0xd) |= 0x40`,
i.e. the **terrain's** flag word gains **0x4000** (alpha blend *with* Z-write and
`ZFUNC LESSEQUAL`). Without it the submerged flat of the terrain renders as an
opaque sandy shelf lying over the water instead of fading out through the
`alpha = 255 − a` ramp. This is the consumer of the shoreline alpha that
`MESHGEN_notes.md` §9.4 warns about.

---

## 6. A trap worth writing down

`minid3d8.js` resolves D3D's "float or DWORD bit pattern" ambiguity with
`_asFloat`: an integral JS number **> 64** is read as a *bit pattern*. Scene 4's
`fogStart` is exactly `600.0`, so `setFog(1, c, 600, 1000)` silently sets fog
start = 8.4e-43 and fogs the entire world to the sky colour — a completely blank
frame with no error anywhere. The port hands the shim `f32bits(x)`, which is what
`FUN_00401abf` hands D3D (the values are dwords copied straight out of the
descriptor). **This is not a shim bug** (it is documented behaviour), but it is a
silent one, and it cost the first hour of verification.

A second, self-inflicted one, recorded because the next porter will hit it:
`reset()` must clear `visible`. `main.js`'s `warmTo` calls `reset()` and then
replays the script from t = 0; an object that stays `visible` from a previous
warm-up integrates its timers across the whole song, and the symptom is
**order-dependent output** (obj 9's sky came out storm grey only when some other
frame had been rendered first).

---

## 7. Verification against `reference/sonnet_ref.mkv`

Headless Chrome (ANGLE/Metal), 640×480, the port warmed up from position 0 each
time, reference frame at `positionToSeconds(pos) + 2.43 + halfRow`.

The reference carries two things this port does not draw — the ragged black
border (object 2) and the poem (object 1) — so RMSE is measured over the
**centred inner 60 % of the frame, masked to where the reference is not black**.
`gradIoU` is the intersection-over-union of binary edge masks over the same
region (a strict structural metric; it is small for everyone because the
reference is video-compressed and carries text).

| pos | t (s) | obj | RMSE | mean luma ours / ref | horizon row ours / ref |
|---|---|---|---|---|---|
| 0x1210 | 192.95 | 7 | **40.8** | 147.4 / 167.3 | 225 / — |
| 0x1330 | 208.60 | 7 | 67.1 | 131.2 / 164.1 | — |
| 0x1520 | 226.86 | 7 | 67.7 | 174.2 / 235.1 | — |
| 0x1630 | 239.90 | 7 | 101.4 | 97.2 / 179.5 | — |
| 0x1710 | 245.12 | 8 | 54.8 | 95.7 / 70.3 | — |
| 0x1830 | 260.77 | 8 | 53.8 | 107.4 / 66.0 | — |
| 0x1a00 | 273.82 | 8 | **48.1** | 73.2 / 56.0 | — |
| 0x1c00 | 294.69 | 8 | 90.6 | 74.7 / 141.9 | — |
| 0x1e10 | 318.16 | 9 | 53.7 | 151.0 / 125.6 | **268 / 267** |
| 0x2030 | 344.25 | 9 | **25.1** | 123.4 / 129.6 | — |
| 0x2200 | 357.29 | 9 | **31.0** | 136.3 / 143.9 | — |
| 0x2310 | 370.34 | 10 | **29.8** | 234.0 / 216.6 | — |
| 0x2600 | 399.03 | 10 | 33.5 | 234.4 / 218.3 | — |
| 0x2830 | 427.73 | 10 | 40.7 | 230.2 / 213.5 | — |
| 0x2a30 | 448.60 | 10 | 59.9 | 223.3 / 167.3 | — |

(The horizon-row detector only agrees when the reference frame's strongest
horizontal luminance step really is the horizon; on frames dominated by the poem
or by the border it locks onto those instead, so it is quoted only where it is
meaningful.)

### What the frames actually show, by eye

* **0x1210 (obj 7, the island).** Island silhouette, its position in frame, the
  rock/sand ground texture, the water plane, the sky colour and the gull flock
  all line up. Missing: the tree on the summit (a billboard impostor), the water's
  reflection detail, the ribbon glitter.
* **0x1630 (obj 7, the sunset).** The sunset *colour* is right to within a few
  levels — the fog ramp transcription is visibly correct — as are the horizon, the
  water tone, the gulls and the rock at the right edge. The RMSE of 101 is almost
  entirely the **lens flare / sun disc**, which fills a fifth of the reference
  frame and is not ported.
* **0x1a00 (obj 8, autumn).** Near-identical: the same tree from the same angle,
  the same red leaves, the same orange sky, the same ground. The reference is
  darker (object 0's fade) and has more leaves in flight (the wind animation,
  `FUN_0040a9ad`, is not ported).
* **0x2200 (obj 9, snow).** Terrain colour, relief and horizon match closely. The
  snowflakes are the weak part — see §8.
* **0x2310 (obj 10, ice).** The best match of the set: the ice ridge, its
  striations (the sphere map), the sky and the tone are all right. The camera is a
  fraction of a second off along the same spline.

Honest summary: **terrain, ground texture, camera path, fog/sky colour, the two
fog ramps, lighting and the big set-piece geometry (island, tree, ice ridge) are
verified good.** Particles, the flare, and the billboard impostors are not.

---

## 8. Not ported (and why)

| thing | function | note |
|---|---|---|
| the 32-pass soft shadow bake | `FUN_0040e923` | 200 M+ operations per scene; the port runs at its unshadowed limit `S = 1` |
| lens flare / sun disc | `FUN_00405082`, `FUN_0040520d`, `FUN_004050ed` | needs the 4×4 readback occlusion query; **the single most visible gap**, worth ~60 RMSE at 0x1630 |
| billboard impostors | `FUN_0040b0b0` + `FUN_0040abed` | the impostor baker needs a render target and the tree/prop meshes; this removes the horizon trees from objects 7, 8 and 9 (array C: 1, 5 and 20 clusters) |
| particle integration | `FUN_0040d5c6` | the port integrates the particles itself and camera-faces the quads; the **quad extents are matched by eye** — LOW confidence, and the visible difference at 0x1c00/0x2200 |
| lens droplets | `FUN_0040d1f1`'s second mesh (texgen 4) | 256 screen-space refraction quads; visible as the big soft blobs in the reference rain shot |
| snow accumulation | `FUN_0040de4e` + the 64×64 render target | flag bit 7; obj 8 only |
| ribbon animation | `FUN_0040f5a8` | the 32 strips are built but static and currently hidden |
| leaf wind | `FUN_0040a9ad` | obj 8's leaves are static |
| bird flight | `FUN_0040fba1` | obj 7's 64 gulls are placed but static |
| cloud scroll | `FUN_0040f27e` and the 256→512 RT blit | the cloud sky mesh is drawn, not animated |
| array-B curtains | `FUN_0040c1b2` | **now disassembled — see §10.** The geometry is exact; the field still does not read like the reference and the reason is not understood |

## 9. Confidence, by section

| section | confidence |
|---|---|
| event handler, method table | **high** — transcribed from the switch |
| clock, camera speed, per-camera time | **high** — cross-checked against all nine timeline windows |
| descriptor consumption | **high** — via `js/scene_desc.mjs`, unchanged |
| ground-texture bake | **high** — disassembled, and the output colours match by eye |
| terrain / water / shoreline meshes | **high** — `js/meshgen.mjs`, 369/369 |
| terrain material flags (0x18 / 0x3a / \|= 0x4000) | **high** — read off the call sites |
| light + ambient, and the bit-8 unlit special case | **high** |
| both fog ramps | **high** — disassembled, and each endpoint reproduces a descriptor constant exactly |
| precipitation gating windows | **high** — disassembled |
| clear / fog / far-plane ordering | **medium-high** — the subset of `FUN_00408eef` that matters is followed; several branches (render targets, the flare's `+0xac`/`+0xe5` toggles, the two far-plane pokes at the end) are skipped |
| water reflection pass | **medium** — mirror + clip plane are as decompiled; the second `SetClipPlane` call's operand was mangled by Ghidra and is not reproduced |
| particle appearance | **low** — see §8 |
| array-B curtain geometry | **low-medium** |

---

## 10. `FUN_0040c1b2` — the array-B curtains, disassembled (and a dead end)

`verify/SWEEP.md` item 1 ranks this the single most valuable remaining fix:
object 7, positions 0x1400–0x1430, RMSE 84–107, six consecutive samples where
the reference puts the camera **inside a frame-filling field of green strands**
and the port shows an empty beach.

### 10.1 The call site — where the missing number was

VA 0x407c08, inside `FUN_004082a9`'s `desc[0x4f] & 4` block:

```
00407C0E  push dword 0x10                          ; param_10 = H = 16
00407C10  fld  dword [ecx+eax+0x8ef]               ; <-- THE FIELD GHIDRA DROPPED
00407C1A  call 0x404224                            ; ftol
00407C25  push eax                                 ; param_9 = W = ftol(128.0) = 128
00407C1F  fld  dword [esi+0x8eb] ... push          ; param_8 = 8.0
00407C2D  fld  dword [esi+0x8e7] ... push          ; param_7 = 10.0
00407C37  fld  dword [esi+0x8e3] ... push          ; param_6 = 120.0
00407C3E  lea  ecx,[esi+0x8d3] ; call 0x408c48     ; param_3..5 = origin vec3
00407C67  call 0x40c1b2
```

Ghidra emits that `ftol` as a bare `FUN_00404224()` with no argument, so
`desc + 0x1c` — the **only** field of the 0x20-byte record nothing else reads —
was invisible in the decompile. It is the **strip count, and it is 128**. The
port had 16. `MESHGEN_PORT.md` §8 and §8 above both graded this LOW-MEDIUM on
the grounds that "the vec3 argument aliasing was never disassembled"; the
aliasing is `param_3..5` being the origin passed by value, and `param_4` doing
double duty as `origin.y` in the height sum.

Field mapping (`js/scene_desc.mjs`'s names for this record predate the
disassembly and are misleading — they are not corrected there because that file
belongs to another agent):

| record | scene_desc name | value (scene 4) | what it actually is |
|---|---|---|---|
| +0x00 | `origin` | (50, 0, −100) | patch origin; its **y** is added to every station's terrain height |
| +0x10 | `param10` | 120.0 | half-span: each wall is 2× this long, and the cross-hatch spreads over ±this |
| +0x14 | `halfLength` | 10.0 | **base blade height** |
| +0x18 | `height` | 8.0 | **U tile count** along a wall |
| +0x1c | `param1c` | 128.0 | **W, the strip count** (via `ftol`) |
| — | — | 16 | H, stations per wall — the literal `push 0x10` |

### 10.2 The generator (VA 0x40c2d8–0x40c55e)

Not a radial fan, which is what the port had. A **cross-hatch**: the W strips
are split in half, the first W/2 running along Z and offset across X, the second
W/2 yawed by PI/2 (`[0x418f58]`) and offset across Z.

```
half = W >> 1
t     = (i % half) / (half - 1)
slide = 2*t*halfSpan - halfSpan
M     = Euler(0, i < half ? 0 : PI/2, 0)          ; FUN_00402280
M.translation = i < half ? (slide, 0, 0) : (0, 0, slide)     ; FUN_004022ff
A = (0,0,-halfSpan) * M ;  B = (0,0,+halfSpan) * M           ; FUN_00402a6f
for j in 0 .. H-1:
    c  = j / (H-1)
    p  = B*c + A*(1-c) + origin
    yb = terrainHeight(p.x, p.z) + origin.y                  ; FUN_0040e8d2
    yt = yb + baseHeight + rand01() * (baseHeight * 0.3)     ; [0x418f54]
    g  = ftol( shadowSample(p.x, p.z) * 255.0 )              ; FUN_0040e8fb, [0x418268]
    a  = ftol( 255.0 - 2*|origin - (p.x, 0, p.z)| ) ; if (a < 0) a = 0   ; FUN_00408c11
    colour = a<<24 | g<<16 | g<<8 | g
    2 verts at (p.x, yb, p.z) uv (c*uTile, 1.00)
    2 verts at (p.x, yt, p.z) uv (c*uTile, 0.01)
    indices, with b = (i*H + j)*4:
        {b, b+2, b+6, b+6, b+4, b}  and  {b+1, b+5, b+7, b+7, b+3, b+1}
```

Points worth recording:

* **Normals are never written** (only +0x00/04/08, +0x18, +0x1c, +0x20 of each
  44-byte vertex), consistent with the material's lighting-off bit. The port no
  longer calls `computeNormals` here.
* Each station emits **two coincident pairs**, and the index list emits **four**
  triangles per quad — the same strip wound both ways. Same quirk as the leaf
  generator.
* The **alpha is a radial fade from the record's origin**, `255 − 2d`, clamped
  at 0, so the patch dissolves over 127.5 units rather than ending at a hard
  edge. This is the field's most distinctive property and the port had nothing
  like it.
* `g` is the 32-pass soft-shadow bake (`FUN_0040e923`), unported; its map is
  memset to 0xFF and can only darken, so the port runs at `g = 255`, the same
  unshadowed limit the ground-texture bake uses.
* The updater `FUN_0040c674` (`desc[0x4f] & 4`, `dt·0.01`) confirms the layout
  independently: it walks `H*W` stations at 44-float stride and displaces
  **vertices 2 and 3 only** — the top pair — by
  `sin/cos((k+T)·[0x418f60 / 0x418f5c]) · halfSpan · 0.01`, i.e. a ±1.2-unit
  wind sway of the blade tips. (Transcribed here for the record; not yet ported.)

### 10.3 The texture (VA 0x40c5a7–0x40c60a) — both RNG draws were wrong

```
for each of 256 COLUMNS x:
    a     = ftol(rand01() * 128.0)                  [0x418e30]
    keep  = (a >= 0x60)          ; setnl/dec/and 1/add 0xff gives 0x00ff or 0x0100
    start = ftol(rand01() *  64.0)                  [0x418f50]
    for each of 256 rows y:
        texel = (y < start) ? 0x00007f40 : ((ecx << 24) | 0x00007f40)
```

`ecx << 24` for `ecx = 0x100` is a deliberate 32-bit overflow to 0, so a dropped
column is fully transparent. `a` is uniform on 0..127, so **only 25 % of columns
are kept** — the port tested `MG.rand() > 0x5f` against a 0..0x7FFF generator,
which is true essentially always. `start` spans 0..64, not 0..255. Material:
`FUN_00401c67(mat, tex, 0, 0x1050)` then `material + 0x14 = 0x20`, i.e. lighting
off | alpha blend | CULLMODE NONE with alpha ref 0x20 (the port already had this).

### 10.4 What is fixed, and what is NOT — a documented dead end

**Fixed and verified:** the geometry. Rendering the rebuilt mesh with an opaque
material (flags 0x1010, no texture) at 0x1410 **fills the entire frame**, in the
same place and at the same scale as the reference's strand field. The camera
really is inside the patch — it sits at (35, 132.2, −61.7) with the terrain at
127.5 under it, i.e. 4.7 units above ground inside 10–13-unit blades. So the
old "far too small and sparse" diagnosis was right and the cause was the strip
count and the topology.

**Not fixed:** with the transcribed texture the field contributes almost nothing
to the frame. A/B at 0x1410, all other things equal (reference mean luma 72.2):

| curtain variant | RMSE | our mean luma |
|---|---|---|
| as built (real texture, flags 0x1050) | 103.70 | 128.3 |
| vertex alpha forced to 255 | 100.71 | 126.1 |
| **texture forced all-opaque** | **72.71** | **88.4** |
| flags 0x1010, no blending | 70.60 | 89.1 |
| synthetic 50 % duty, 32-column blocks | 72.71 | 88.4 |
| synthetic 18 % duty, 6-of-32-column blocks | 104.47 | 128.3 |
| synthetic 18 % duty, 2-of-11-column stripes | 83.85 | 112.9 |
| `levels: 1` (no mip chain) | 104.48 | 128.3 |

Read that table carefully: **at the same 18 % duty cycle the result depends
entirely on stripe PITCH** — 2-of-11 is clearly visible, 6-of-32 is invisible —
and the real texture (random single columns, mean pitch ≈ 5.5) behaves like the
*coarse* one. Simple coverage arithmetic disagrees: a ray leaving the camera
crosses ~20 walls before the radial alpha reaches zero, so even 18 % per wall
should composite to ~98 % coverage.

Ruled out: mipmapping (`levels: 1` changes nothing, and `FUN_00403dd3` passes
`Levels = (param_4 != 0)`, which is 0 for every content texture — a full chain
*is* what the original asks for); the vertex alpha; the blend mode; the
geometry. **The cause is not identified.** The next thing to try is a direct
readback of the uploaded texture's alpha channel and of the interpolated `u`
range across a near wall, which needs a GL-level probe rather than a frame
comparison.

The rewritten generator is kept regardless: it is what the binary says, it
replaces a guess with a transcription, and it moves 0x1410 from 106.9 to 103.7
rather than backwards.

### 10.5 The dead end, revisited — it is the SHARED RNG STREAM, and the frame is chaotic in it

The cloud render-target composite (§11) draws **three randoms per cloud layer**
that neither port drew. Scenes 1 and 3 have `cloudCount` 3 each, and both build
*before* object 7, so porting the composite moves the shared stream **18 draws**
forward at the point `FUN_0040c1b2` bakes its texture. Nothing else about object
7 changed. Measured at 0x1410:

| | keep / 256 columns | mean blade height | mean vertex alpha | RMSE (flare on) | RMSE (flare off) | our mean luma |
|---|---|---|---|---|---|---|
| stream as it was | 80 | 11.5110 | 69.535 | 103.7 | ~84 | 127.6 |
| **+18 draws (correct)** | **73** | 11.5118 | 69.535 | **70.5** | **44.1** | **89.5 / 64.5** |

The geometry is identical to five significant figures and the radial alpha is
bit-identical. **The entire 33 / 40 RMSE move is which 256-column subset the
texture keeps.** Reference mean luma at 0x1410 is 72.2; with the flare
suppressed the port is now at 64.5 against that, i.e. the field's coverage is
finally in the right place.

Then the sensitivity was measured directly, by inserting N extra dummy draws
immediately before the array-B build (flare off, 0x1410, everything else equal):

| extra draws | RMSE | our mean luma |
|---|---|---|
| 0 | 44.07 | 64.5 |
| 1 | 44.46 | 64.3 |
| 2 | 59.87 | 99.2 |
| 3 | 60.24 | 99.4 |

So the frame is **bimodal in the stream position** — ±18 luminance levels, ±16
RMSE, from a one-or-two-draw shift, with no change in coverage statistics
(the keep count only varies between about 52 and 80 of 256 across offsets, and
its parity does *not* line up with the two regimes). Two consequences:

1. **§10.4's A/B table is measuring RNG noise as much as it is measuring texture
   design.** Several of its rows differ by less than the ±16 this shows, so they
   cannot be read as evidence about coverage. That is why "18 % duty as
   6-of-32 columns" and "18 % duty as 2-of-11 columns" appeared to disagree by
   20 RMSE at the same duty cycle: at this camera the frame is simply not a
   smooth function of the column set.
2. The right fix is therefore not a texture theory but **stream fidelity** —
   draw exactly the randoms the original draws, in the original's order, and the
   column set follows. That is what happened here, by accident, while porting a
   different function.

**Still not identified:** *why* the frame is bimodal — why swapping one
pseudo-random 256-column mask for another moves 35 luminance levels when a ray
crosses ~20 walls. The remaining candidates are the interaction of the full mip
chain with a 1-texel-wide feature at 8 tiles per 240-unit wall (a whole mip
level's alpha is the duty cycle, so the *level chosen* decides between "grass"
and "haze"), and the near-edge-on incidence of half the cross-hatch. A GL-level
probe of the sampled LOD across a near wall would settle it; a frame comparison
will not.

---

## 11. `FUN_0040ec28` + `FUN_0040f27e` — THE CLOUD RENDER-TARGET COMPOSITE

`CONSOLIDATION.md` §6 and `LANDSCAPE_ANIM.md` §11 both list this as the largest
remaining error: every sky in the demo was textured with texgen program 7
directly. It is ported now. This section is the transcription.

### 11.1 The cloud object (`Landscape + 0x94`) as `FUN_0040ec28` builds it

| offset | field |
|---|---|
| +0x00 | byte `cloudParam` (descriptor +0x1b) — the sky's per-frame vertex alpha AND the blit quad's alpha ref |
| +0x04 | float `T` |
| +0x08 | int `N` = `cloudCount` |
| +0x0c | the **noise-quad mesh**, N quads, material `0x1811` |
| +0x10 | the **blit-quad mesh**, 1 quad, material `0x1111` |
| +0x14 | the **sky mesh** (dome or stacked layers), material `0x1050` / `0x3091` |
| +0x18 | per-layer scroll params, stride 0xc |
| +0x1c | byte = descriptor flag bit 11 |

Build order, and it consumes the shared RNG stream, so it matters:

```
buf = alloc(0x40000);  FUN_00416036(7, 0x100, 0x100, buf)      ; texgen 7 @ 256x256
for each of 0x10000 texels: a = (t>>24) - 0x20; if (a<0) a=0; t = (t&0xffffff)|a<<24
noiseTex = FUN_00403dd3(buf, 256, 256, 0, 0)                   ; Levels = 0 -> full chain
params   = alloc(N * 0xc)
noiseMesh = mesh(N*4 verts, N*2 tris);  material FUN_00401c67(noiseTex, 0, 0x1811)
for i in 0..N-1:
    params[i][0] = rand01() * 4.0 + 1.0        [0x418230] = 4.0, [0x4170c4] = 1.0
    params[i][1] = rand01()                    ; u phase
    params[i][2] = rand01()                    ; v phase
    quad i verts = (-1,1,0) (1,1,0) (-1,-1,0) (1,-1,0)   [0x4170cc] = -1.0
    indices = {0,2,3,3,1,0} + 4i               ; the byte table at 0x418eec
DAT_00478960 ||= FUN_00402b16(256, 256, 1)     ; the 256x256 RENDER TARGET
blitMesh = mesh(4 verts, 2 tris); material FUN_00401ca8(DAT_00478960, 0, 0x1111)
    verts (-1,1,0) uv(0,0) | (1,1,0) uv(1,0) | (-1,-1,0) uv(0,1) | (1,-1,0) uv(1,1)
DAT_00478964 ||= FUN_00402b16(512, 512, 1)     ; the 512x512 RENDER TARGET
<then the sky mesh, and its material textures it with DAT_00478964>
```

`FUN_00404380` seeds every vertex's diffuse to `0xffffffff`, which is what the
blit quad keeps (its colour is never written) — that mattered, because the blit
is alpha-tested.

**Material decode** (`minid3d8`'s `applyMaterial`, which is a faithful decoder):

* `0x1811` = lighting off | **fog off** | cull none | **additive**. The N noise
  quads are added on top of each other into a black-cleared 256x256 target.
* `0x1111` = lighting off | cull none | additive | **alpha test GREATER
  `alphaRef`, SRCALPHA/ONE**. `FUN_0040f27e` writes `alphaRef = cloudParam`
  every frame, so `cloudParam` is a *threshold on the noise alpha* as well as
  the sky's vertex alpha.

### 11.2 `FUN_0040f27e` — the per-frame composite (VA 0x40f386-0x40f427, disassembled)

```
T += dt*0.01
if (skyMesh.flags & 2) return                    ; hidden -> the whole thing is skipped
c = 0x3f
for layer i in 0..N-1:
    s = params[i][0]
    k = (i*i*C + C) * T                          C = [0x418e48] = 0.03
    u = k + params[i][1];  v = k + params[i][2]
    uv0 = (u*s, v*s) ((u+1)*s, v*s) (u*s, (v+1)*s) ((u+1)*s, (v+1)*s)
    colour = 0xff000000 | c<<16 | c<<8 | c   for all four verts
    c += 0x3f
blitMesh.material.alphaRef = cloudParam
saved = DAT_00474790;  DAT_00474790 = 0          ; clear colour := BLACK
FUN_00401bd0()                                   ; WORLD = VIEW = PROJECTION = identity
FUN_00402b4f(RT256, bClear=1)                    ; push RT, clear to black
noiseMesh->render(0.0f)
DAT_00474790 = saved                             ; clear colour := the FOG COLOUR
FUN_00402b4f(RT512, bClear=1)                    ; push RT, clear to the fog colour
blitMesh->render(0.0f)
if (cloudObj[0x1c] == 0)  every sky vertex alpha = <see 11.3>
FUN_00402c72('\x01')                             ; pop to the backbuffer AND CLEAR IT
```

Two consequences worth spelling out:

1. **The 512 target is cleared to the scene's fog colour, not to black.** That
   is what gives the sky its base tint; the noise only ever *adds* to it.
2. **The composite is what clears the backbuffer in a cloud scene.** `FUN_00408eef`
   skips its own `FUN_00402c72(0)` when flag bit 9 is set, and `FUN_0040f27e`'s
   tail does it instead — with the clear colour already restored. The order in
   `FUN_00408eef` is: fog colour <- desc+0x22; the conditional clear; `SetFog`;
   camera far plane; the bit-17 water level; **then** `FUN_0040f27e`.

### 11.3 A correction: the sky's vertex alpha is `-(cloudParam + 1)`, not `+1`

Ghidra renders the write as `(*(byte *)this + 1) * -0x1000000`, and the
disassembly at 0x40f3fe is unambiguous:

```
0040F3FE  movzx ecx, byte [esi]      ; cloudParam
0040F401  inc   ecx
0040F404  neg   ecx                  ; <-- THE NEG
0040F406  shl   ecx, 0x18
0040F40F  or    ecx, edi             ; | (colour & 0xffffff)
```

so the alpha byte is `(-(cloudParam + 1)) & 0xff` = **`255 - cloudParam`**, not
`cloudParam + 1`. For scenes 1 / 5 / 8 (`cloudParam` 120 / 240 / 128) that is
**135 / 15 / 127** rather than 121 / 241 / 129, and the autumn fog ramp's
`cloudByte = ftol(225 - 225*t154)` therefore makes object 8's cloud layer
**thicken** from alpha 30 to alpha 255 as the storm closes in, rather than
dissolving away. Measured — see 11.5.

### 11.4 Measured — the composite, whole sweep

`node web-sonnet/test/sweep.mjs`, 354 samples, `--quality=original`, cold
warm-up, same cached reference frames throughout. "Before" is the consolidated
tree (`CONSOLIDATION.md` §5's 27.49 median, reproduced exactly on this harness).

| | before | after |
|---|---|---|
| median RMSE | 27.49 | **26.70** |
| mean RMSE | 31.89 | **28.80** |
| PSNR (median) | 19.35 dB | **19.60 dB** |
| improved / unchanged / worsened | — | 171 / 15 / 168 |

| obj | scene | n | median before → after |
|---|---|---|---|
| 1 | title / poem / credits | 42 | 6.61 → 6.84 |
| 3 | 0 — spires | 24 | 23.31 → 23.60 |
| 4 | 1 — lakes | 24 | **73.83 → 46.82** |
| 5 | 2 — trees | 40 | 19.86 → **19.71** |
| 6 | 3 — cloud sea | 24 | 27.15 → **26.63** |
| 7 | 4 — beach | 40 | 33.81 → 35.96 |
| 8 | 5 — autumn | 56 | **42.86 → 30.35** |
| 9 | 7 — winter | 40 | 30.08 → 31.07 |
| 10 | 8 — finale | 64 | 25.93 → **24.33** |

The three cloud scenes are where the work was and all three move: **object 8 by
12.5 points over 56 samples and object 4 by 27.0 over 24.** Object 4's regression
— `CONSOLIDATION.md` §5.2's "the clearest single lead for whoever picks this up"
— is closed by this and nothing else: its sky really was the water-reflection
pass showing through a half-transparent cloud layer, and giving the cloud layer
its real texture is what fixed it. No separate reflection work was needed.

Per position, the largest moves:

| pos | obj | before | after | Δ |
|---|---|---|---|---|
| 0x1710 | 8 | 42.54 | **13.61** | −28.9 |
| 0x0920 | 4 | 70.20 | **30.44** | −39.8 |
| 0x0918 | 4 | 63.35 | **26.99** | −36.4 |
| 0x0928 | 4 | 83.12 | **47.92** | −35.2 |
| 0x0838 | 4 | 87.38 | **54.78** | −32.6 |
| 0x0900 | 4 | 78.65 | **46.82** | −31.8 |
| 0x0910 | 4 | 68.41 | **37.37** | −31.0 |
| 0x0830 | 4 | 97.84 | **68.05** | −29.8 |
| 0x1410 | 7 | 103.70 | **70.48** | −33.2 (§10.5 — the RNG stream, not the composite itself) |
| 0x1420 | 7 | 103.13 | **70.80** | −32.3 |

**Object 7's cost.** Its median goes the wrong way (33.81 → 35.96) even though
its worst cluster improves by 20–33. Eleven positions in 0x1320–0x1430 improve
by 4 to 33; the other twenty-nine drift up by +0.2 to +7.2, the worst being
0x1508/0x1510/0x1520 in the sunset window. Ablation says this is **not** the
wind updater (§10.5's `nowind` run reproduces 0x1520 = 31.75 either way) — it is
the same 18-draw RNG stream shift, which perturbs the ribbons, the flock preroll
and the curtain jitter as well as the curtain texture. It is the stream the
original has, so it stays.

**Objects 1, 3 and 9 drift by +0.2 to +1.0 with no mechanism.** Object 1 is text
only and cannot be affected by any of this, so read those as the sweep's
documented cross-capture order dependence (`verify/SWEEP.md` §5.3), which the
shared RNG makes ±1 at this scale. Treat sub-1.5 moves as noise.

---

## 12. `FUN_0040c721` — THE COMPOUND PROP, transcribed (not ported — see 12.5)

`MESHGEN_PORT.md` §8, `CONSOLIDATION.md` §6 and `LANDSCAPE_ANIM.md` §11 all list
this as unported with the same reason: *"no transcription of the compound prop"*.
That reason is removed here. It is a **plant**: a 50-unit stem carrying 128
randomly-tilted twigs, each with 16 curved leaves.

Two consumers, both scene 2 (object 5) only:
* **array F** (`desc[0x50] & 0x80`, `buildProps`) — one instance at (0,0,0),
  scale 0.15, armed by event `m2`;
* **impostor set 2** — `FUN_0040b0b0` bakes it into a **128×128** render target
  and **array D** (`desc[0x4f] & 0x20`, `buildBillboards1`) draws **256**
  instances of size 1.6 scattered over ±300.

Constants: `[0x418220]` and `[0x418f70]` are **qwords** — `PI` and `PI/2`;
Ghidra's `float10` is the giveaway and reading them as dwords gives 3.37e12.

### 12.1 The twigs (`this+0x04`) — 0x800 verts, 0xc00 tris

128 instances × 16 verts (a 4-segment ring × 4 rows) and 24 tris.

```
for inst in 0..127:
    M = Euler(rand01()*2*PI, 0, rand01()*2*PI)          ; FUN_00402280, note X and Z only
    for row in 0..3:
        v0 = row * (1/3) * 4.0                          [0x418f78]=1/3, [0x418230]=4.0
        r  = 0.1 * 4.0 = 0.4                            [0x418efc]=0.1
        y  = {0:0, 1:1, 2:2, 3:5}[row]
        if (row >= 2) r *= 0.25                         [0x418ddc]=0.25
        for col in 0..3:
            u  = col * (1/3)
            th = u * 2 * PI
            p  = (sin(th)*r, y, cos(th)*r) * M          ; FUN_00402a6f
            vertex.pos    = (p.x, p.y + 50.0, p.z)      [0x418e60]=50.0
            vertex.colour = 0x5FFFFFFF                  ; VA 0x40c8e9, alpha 0x5f
            vertex.uv0    = (u, v0)
    indices: FUN_00409ccd(base=inst*16, i, W=4, j) for i in 0..3, j in 0..2
```

`FUN_00409ccd(out, base, i, W, j)` is the wrap-around grid quad emitter —
`(i+1) % W` — so each twig is a closed 4-sided tube, radius 0.4 for its first
two rows and 0.1 for the last two, i.e. **tapered**, standing at y = 50.

### 12.2 The leaves (`this+0x08`) — 0x4800 verts, 0x6000 tris

16 sub-instances per twig × 9 verts (a 3-segment ring × 3 rows) and 12 tris.

```
for each of 16 leaves on twig `inst`:
    a = rand01()*PI - PI/2 ;  b = rand01()*PI - PI/2    [0x418f70] = PI/2
    Mtop  = Euler(a*0.75, 0, b*0.75)                    [0x418eb0]=0.75
    Mroot = Euler(a*1.25, 0, b*1.25)                    [0x418f6c]=1.25
    for row in 0..2:
        w = row * 0.5                                   [0x4170d4]=0.5
        for col in 0..2:
            u  = col * 0.5
            th = u * 2 * PI
            q  = (sin(th)*0.1, w*2, cos(th)*0.1)        [0x418efc]=0.1
            p  = (q*Mroot)*w + (q*Mtop)*(1-w)           ; a LERP of two transforms
            p.y += 5.0                                  [0x418e54]=5.0
            p  = p * M                                  ; the twig's own rotation
            vertex.pos    = (p.x, p.y + 50.0, p.z)
            vertex.colour = 0x2FFFFFFF                  ; VA 0x40cb3d, alpha 0x2f
            vertex.uv0    = (u, w)
    indices: FUN_00409ccd(base, i, W=3, j) for i in 0..2, j in 0..1;  base += 9
```

Blending two *different* rotations along the leaf's length is what curves it —
the root end uses `Mroot` (the 1.25× angles) and the tip `Mtop` (0.75×).

### 12.3 The stem (`this+0x00`) — 0x80 verts, 0xf0 tris

Built once, after all 128 instances, when `local_2c > 0x15fff` (0x2c0 bytes per
instance × 128 = 0x16000, so the loop really does run 128 times).

```
for row in 0..15:
    y = row * 0.0625 * 50.0 = row * 3.125               [0x418f68]=0.0625
    for col in 0..7:
        u  = col * 0.125                                [0x418f64]=0.125
        th = u * 2 * PI
        vertex.pos = (sin(th)*0.3, y, cos(th)*0.3)      [0x418f54]=0.3
        vertex.uv0 = (u, 0)
        if (row < 15) emit {((col+1)&7)+8, (col&7)+8, col&7,
                             col&7, (col+1)&7, ((col+1)&7)+8}   (+ the row base)
```

so a closed 8-sided cylinder of radius 0.3 running from y = 0 to y = 46.9, which
is what the twigs at y = 50 sit on top of.

### 12.4 Materials, animation records, placement

```
buf = texgen program 3 at 32x32
twigs->material  = FUN_00401c67(tex(buf), 0, 0x11)     ; additive, alpha test, cull CCW
stem ->material  = FUN_00401c67(tex(buf), 0, 0x10)     ; opaque, cull NONE
buf = texgen program 4 at 32x32
leaves->material = FUN_00401c67(tex(buf), 0, 0x11)

this+0x1c = 128 records of 0x1c bytes (FUN_00408d4b ctor, vector_constructor_iterator):
    for i in 0..127:
        r[0..2] = (rand01()*2 - 1) each, then scaled by 10.0
        r[3..5] = DAT_00478938..40  (= 0,0,0)
        r[6]    = rand01() * 8.0                        [0x418e7c]=8.0
this+0x14 = memcpy of the twig vertex buffer      (0x2c bytes per vertex)
this+0x18 = memcpy of the leaf vertex buffer      ; the two REST POSES
this+0x10 = 0                                     ; the `armed` byte, set by event m2

if (terrain) y += terrainHeight(terrain, x, z)
all three meshes: pos = (x, y, z), scale = (s, s, s)      ; s = the record's +0x0c
FUN_00405f0e(root, mesh) x3                              ; register with the scene graph
```

The updater is `FUN_0040cfed` (`desc[0x50] & 0x80`, stride 0x20 at
`Landscape + 0xbc`, `dt * 0.01`) and reads the rest poses at `+0x14` / `+0x18`
against the 128 records — not transcribed here.

### 12.5 Why it is transcribed but NOT ported

It is a deliberate call, not an omission:

1. **Its own visual value is small.** `verify/SWEEP.md` §2 item 8 recorded that
   the prop is *not visible in any sampled frame*, and object 5 is currently the
   best-scoring 3D scene in the demo (median **19.71** over 40 samples). Array
   D's 256 impostors are size 1.6 over a ±300 box, i.e. specks.
2. **Its RNG cost is large and exact.** The generator draws
   `128 × (2 + 16 × 2) + 128 × 4 = **4864** randoms`, all of them *before*
   object 5's array G and before every one of objects 6..10 is built. §10.5
   shows this port's frames are **bimodal in the shared stream position** — an
   18-draw shift moved object 7 by 33 RMSE. Landing 4864 draws with the count
   even slightly wrong would be strictly worse than landing none, and there is
   no way to validate the count against the reference video.
3. What is left to disassemble before it can be landed safely: the stem's vertex
   colour dword and its index base (Ghidra emits `NAN` and drops the base), the
   `ftol` that supplies the twig index base at 0x40c8xx, and the whole of
   `FUN_0040cfed`. Each is a `ndisasm` session, not a research problem.

**Recommended order for whoever takes it:** finish `FUN_0040cfed`, port the
generator, and A/B object 5 *and objects 6..10* — the stream shift will move all
of them, and the per-object table is the only thing that can tell a real gain
from a lucky one.

> **CORRECTION, 2026-08-11 — item 2's framing was subtly wrong, and it cost
> real time.** "Land the count exactly" is necessary but *not sufficient*: the
> 4864 draws are split by a **stream barrier**. `FUN_0040c721` issues texgen
> program 3 (`0x40CDCC`) between the 4352 geometry draws and the 512 record
> draws at `0x40CEEC`, and that program's op 3 self-reseeds — so the records'
> 512 draws are *not* "before object 5's array G" in any meaningful sense;
> everything upstream of the reseed is erased. The port landed the count
> correctly and the program point incorrectly, and every audit built on this
> section's advice passed while the impostor yaws were 512 draws off. See
> `DANDELIONS.md`. **The general lesson, now in `METHOD.md`: for any generator
> that runs a reseeding texgen mid-body, the draw *count* is not the invariant
> to check — the exit state is.**

---

## 13. Object 4 at 0x0708–0x0730 — measured, and it is NOT the camera path

`verify/SWEEP.md` and `CONSOLIDATION.md` §5.3 both flag this window ("at 0x0710
the reference shows a flat plain and the port shows the ridge close up, so the
camera disagrees"). After §11 it is the demo's worst remaining cluster —
0x0708 101.7, 0x0710 **119.0**, 0x0718 113.9, 0x0720 106.6, 0x0728 80.4,
0x0730 47.2 — and it is untouched by any of this work (Δ ≤ 0.21).

What was checked, and ruled out:

| suspect | finding |
|---|---|
| wrong camera resource | `CAM_RES_BASE = [0,1,3,6,7,10,0,12,14]` is **exactly** the running sum of every scene's `cameraPathCount` (1,2,3,1,3,2,–,2). Scene 1's paths are resources 0x25 and 0x26. Correct. |
| wrong active path | object 4's whole script is `0x0700 m6(1) m255(1)`, `0x0720 m7`, `0x0820 m4(1)`, `0x0a00 m255(0)`, `m3(1)` at init. There is no `m4(0)`, so path 0 is the ctor default and is right. |
| camera outside the terrain | the terrain mesh spans ±128 in LOCAL space and carries `mesh.scale = terrainScale` (3,0.5,3), so its world footprint is ±384. The path's x reaches 226. Inside. |
| a neighbouring object drawing | object 3 is hidden at 0x0700 and object 5 does not appear until 0x0a00. Object 4 is alone. |
| the cloud layer / sky | fixed by §11; the sky halves of the two frames now agree. |

What the camera model actually says at 0x0710 (camTime = 2.61 s × 6.4 = 16.7):
position **(149.4, 38.9, 31.4)**, target (−105.6, 25.6, 13.6), i.e. 39 units
above flat ground looking almost due −X and slightly down. Sampling the terrain
along that ray gives heights `0 0 0 9 35 70 81 74 71 78 83 83 73 53 33 5 0` at
25-unit steps — **a ridge that rises 44 units above the camera 150 units away**.
So the port is rendering exactly what its terrain contains, and the reference at
the same instant is a flat plain to the horizon with soft cloud shadows on it.

That leaves two candidates, and they are testable:

1. **The camera speed.** Scene 1's path 0 has key times 0/32/96 but its slot
   (0x0700 → 0x0820, 288 rows = 46.9 s) is worth 300 units at 6.4 u/s, so the
   port traverses the path **3.1×** and then parks at the last key from 0x075c
   onwards. Contrast §0's table, where objects 7..10's paths match their slots to
   within 4 %. Scene 1 (and scene 2, whose paths are 96/64/160 against much
   longer slots) does **not** fit that model, so either those scenes get a rate
   this port does not model, or the spline is meant to be re-parameterised. This
   is the strongest lead and it is entirely inside `js/camera.mjs` + the `m5`
   handling.
2. **The terrain's vertical scale.** Scene 1's `terrainScale.y` is 0.5 and the
   raw heightmap peaks at 225, i.e. a 112-unit maximum against a camera flying at
   33–102. Halving it would flatten the ridge into the reference's plain. Nothing
   in `FUN_0040e058` suggests it should be halved, so this is a distant second.

Not attempted here: both live in `js/camera.mjs` / `js/meshgen.mjs`, neither of
which this work owns, and (1) would move every scene's pacing.

---

## 14. Suites, and one expected change to `warm_equiv_test`

| suite | result |
|---|---|
| `js/meshgen_test.mjs` | **369 / 369** (`js/meshgen.mjs` was not modified) |
| `web-sonnet/test/minid3d8_test.html` via `run_minid3d8_test.mjs` | **116 / 116** |
| `web-sonnet/test/integration_test.mjs` | ALL PASS |
| `web-sonnet/test/timeline_test.mjs` | ALL PASS (207 events) |
| `web-sonnet/test/text_test.mjs` | ALL PASS |
| `web-sonnet/test/warm_equiv_test.mjs` | **6 FAILED**, one more than before — see below |

`warm_equiv_test.mjs` exists to *prove a negative* ("incremental warm-up is NOT
equivalent, do not use it"), so its failures are its output, not a regression.
It previously failed on 5 positions, all inside the precipitation windows; it now
also fails **0x1210 (object 7)**, because `FUN_0040c674` makes the array-B
curtains a function of accumulated time and the cold and incremental warm-ups
accumulate different `dt` sequences. That is the property the test measures and
the conclusion is unchanged: **never pass `--seq` for a reported number.**

### 14.1 A measurement hazard found on the way

The 354-sample numbers in §11.4 were taken at 12:21 from `results_cloudfull.json`.
A **confirmation re-run four minutes later was contaminated**: another agent
working in the same tree edited `web-sonnet/js/main.js` mid-run, flipping
`ASSET_MODE` from `generated` to `baked`, and started its own concurrent sweep.
Two headless Chromes and a changed asset path make any overlapping capture
meaningless. §11.4's figures are the clean ones (baseline and after taken from
the same tree, four minutes and one file apart).

**If you re-run the sweep, check `pgrep -f sweep.mjs` and `git status`/mtimes on
`web-sonnet/js/` first.** The sweep takes several minutes and gives no error when
another process changes the code under it.

The contaminated run did finish (`results_final.json`, 12:37) and is worth one
line as *corroboration only*, since it straddled both the flip to `baked` at
12:25 and the restore to `generated` at 12:33:

| | clean 12:21 | straddled 12:37 |
|---|---|---|
| median | 26.70 | 26.54 |
| mean | 28.80 | 28.57 |
| obj 4 / 8 / 10 median | 46.82 / 30.35 / 24.33 | 46.32 / 30.21 / **24.33** |

252 of 354 samples move, all by ≤ 0.14, and the movement includes **object 1**,
which is text only and cannot be touched by any of this work (6.84 → 6.61). So
the difference is a uniform sub-0.25 offset, not a per-scene effect — which is a
useful direct measurement of this harness's noise floor, and the reason §11.4
quotes the clean run and treats anything under 1.5 as noise.
