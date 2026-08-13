# Sonnet — the lens flare and its software occlusion query

*(working notes; being written incrementally as the RE proceeds)*

## 0. Cast of functions

| VA | role |
|---|---|
| `FUN_00405082` | **constructor** of the flare object (vtable `PTR_FUN_004182b4`) |
| `FUN_004050cc` | destructor |
| `FUN_004050ed` | **update(dt)** — runs the occlusion query, fades the intensity in/out |
| `FUN_004051ac` | **render** — pushes intensity+alpha into the material, then billboard-draws |
| `FUN_0040520d` | **the probe draw** — calls `FUN_00402788` (draws the magic-coloured probe quad) |
| `FUN_00402788` | project world pos → screen, stamp magic colour into 4 verts, draw quad |
| `FUN_00402907` | the 4×4 `CopyRects`+`LockRect` readback; returns **0 if any sky pixel found** |
| `FUN_00402773` | `DAT_0041a000 = (clearColour − 0x00020304) \| 0xFF000000` |
| `FUN_004026be` | creates the 4×4 sysmem surface + the static quad's index/vertex scaffolding |

## 1. First finding — the query is BINARY, not a count

`FUN_00402907` decompiles as:

```c
local_5 = 1;                                  // default: "not sky" == occluded
if (px >= 1.0 && py >= 1.0 && px < W-2 && py < H-2) {
    ... CopyRects 4x4 from backbuffer at (ftol(px), ftol(py)) ...
    LockRect(D3DLOCK_READONLY)
    for 4 rows: for 4 cols:
        if (adapterFormat is 0x14/0x15/0x16 &&
            (pixel & 0xFFFFFF) == (DAT_0041a000 & 0xFFFFFF))
            local_5 = 0;                      // ANY sky pixel clears the flag
    ...
}
return local_5;
```

There is **no counter** — a single matching pixel out of 16 flips the result.
The 16 samples act as a slightly-forgiving point test, nothing more. The
*smoothness* of the flare comes from the fade in `FUN_004050ed`, not from the
sample count.

## 2. Second finding — the order, and why it is the whole trick

Disassembled/read out of `FUN_00408eef` (the Landscape render) at
0x4097xx–0x4098xx, and `FUN_00406004` @ 0x406004:

```
...clear, camera, main geometry pass...
flare->+0xac = 0                 ; the flare is DISABLED for the main FUN_00406004 pass
FUN_00406004(root, dt)           ; terrain, trees, water, clouds...
flare->+0xac = 1
...water surface, ribbons...
flare->+0xe5 = 0
FUN_0040520d(flare)              ; (1) DRAW THE MARKER QUAD
...precip, a couple of extra draws...
flare->+0xe5 = 1
FUN_004050ed(flare, dt)          ; (2) READ IT BACK, fade in or out
...
cam->far = 10000.0 ; cam->apply()
flare->vtbl[1](0)                ; (3) DRAW THE FLARE SPRITE
cam->far = restored ; cam->apply()
```

The marker quad is a ~3×3-pixel screen-space quad at the sun's projected
position, drawn with material flags **`0x1810`** = lighting off | fog off |
cull none, i.e. **opaque, `ZWRITEENABLE = 1`, `ZFUNC = LESSEQUAL`** (bit 0x0080
is clear), at **clip-space z = 1.0, w = 1.0** — the far plane.

So it is drawn *after* all the geometry and survives **only where nothing has
written depth**, i.e. only over raw sky. That is the occlusion test. Its colour
is the clear colour minus `0x00020304`, so the surviving 3×3 patch is
numerically distinguishable but visually identical to the sky — the artifact is
≤3 RGB levels over 9 pixels and stays in the presented frame. Reproduced.

The flare sprite itself is drawn **last, over everything**, with
`ZFUNC = D3DCMP_ALWAYS` and additive blending. It does not need to be depth
tested, because the occlusion query has already shrunk it to nothing when the
sun is behind geometry. **This is the load-bearing consequence:** a port
without the query must either draw the flare early (so geometry covers it) or
accept the sun shining through the terrain. `scene3.js` (objects 3..6, another
agent) chose to draw it early and documented that drawing it late "washes the
entire frame white" at 0x0600 — that is exactly the symptom of the missing
query, not a mis-read of the order.

## 3. The object

`FUN_00405082(this, float p1, float p2)` — verified by disassembly, because
Ghidra types both parameters as `undefined4` and loses the fact that `p1` is
`fld`ed as a float:

```
00405089  call 0x404bb8            ; base ctor: FUN_00404bb8(this, N=1, screenSpace=0)
0040508E  fld  dword [esp+8]       ; <- p1 IS A FLOAT
0040509D  fst  dword [esi+0xd8]    ; +0xd8 = MAX size
004050A3  fstp dword [esi+0xdc]    ; +0xdc = CURRENT size  <- seeded to MAX
004050A9  mov  [esi+0xe0], eax     ; +0xe0 = fade RATE (p2)
004050AF  mov  dword [esi], 0x4182b4
004050B5  mov  dword [esi+0xa4], 4 ; type mask 4 — how FUN_00405f8b dispatches it
004050BF  mov  byte [esi+0xe5], 1  ; "draw the sprite"
```

`FUN_00404bb8(this, 1, 0)` makes it a **one-element billboard group**, not a
chain: `+0xb0 = 1` sprite, `+0xb4` = one 32-byte record
`{ float pos[3]; float viewOffset[3]; float halfSize; u32 colour; }`, `+0xbc` =
four vertices of 44 bytes, `+0xc4` = the index list `{0,1,2,2,3,0}`.

**There is no multi-element flare chain along the sun→screen-centre axis.**
The `viewOffset` field (record +0x0c..0x17) is exactly the mechanism a chain
would use — it is added to the *view-space* centre, so it slides an element
along the screen — but for the flare it is never written and stays `(0,0,0)`
(`FUN_00408d4b`, the record's constructor, zeroes both vec3s). Sonnet's flare is
a **single additive sun disc**. Confidence: **high** — `FUN_00404bb8`'s count
argument is an immediate `push 1`, and the only writes to `+0xb4` anywhere in
the image are `sprite[0].pos` (`FUN_004082a9`), `sprite[0].pos[1]` (the sunset
ramp) and the two fields `FUN_004051ac` sets every frame.

### Fields

| offset | meaning | set by |
|---|---|---|
| `+0xa4` | type mask **4** | ctor |
| `+0xac` | enabled | the Landscape render toggles it around the reflection and RTT passes |
| `+0xb4` | the sprite record array (1 element) | `FUN_00404da7` |
| `+0xc8` | the material, `FUN_00401c67(mat, texgen 14, 0, 0x1891)` | `FUN_004082a9` |
| `+0xcc` | the probe: `{ ?, float screenX, float screenY }` | `FUN_00402788` |
| `+0xd8` | max size = `(float)desc.u16[0x2e]` | ctor |
| `+0xdc` | current size | `FUN_004050ed` |
| `+0xe0` | fade rate = `(float)desc.u16[0x30]` | ctor |
| `+0xe4` | "was occluded last frame" — pure bookkeeping, nothing reads it | `FUN_004050ed` |
| `+0xe5` | draw the sprite | the render toggles it |

### The eight scenes' parameters

Decoded through `js/scene_desc.mjs`, not by byte-poking:

| sceneIdx | obj | sun position | max | rate | the query matters? |
|---|---|---|---|---|---|
| 0 | 3 | (0, 400, 0) | 300 | **0** | no — rate 0 pins the size |
| 1 | 4 | (−400, 374, 400) | 400 | **0** | no |
| 2 | 5 | (0, 400, 400) | 300 | 50 | **yes** |
| 3 | 6 | (0, 440, 400) | 300 | **0** | no |
| 4 | **7** | (−600, 200→**50**, 300) | **800** | 20 | **yes** |
| 5 | 8 | (−600, 400, −300) | 300 | 20 | **yes** |
| 7 | 9 | (100, 255, 400) | 300 | 100 | **yes** |
| 8 | 10 | (0, 1000, 0) | 300 | 20 | **yes** |

Scene 4's sun **moves**: `FUN_00408eef`'s `m8` sunset ramp writes
`sprite[0].pos[1] = 200.0 − t·150.0` (`[0x418eb8]` = 200, `[0x418e9c]` = 150)
while `t += dt·0.002`, so by 0x1630 the sun has dropped to y = 50. The point
*light* keeps the descriptor's y = 200; only the sprite moves.

## 4. The marker quad — `FUN_00402788`

Ghidra drops the third argument (the sun position is pushed as three `movsd`s
between a `sub esp,0xc` and a `push [eax+8]`); the true signature is
`__thiscall FUN_00402788(probe*, Camera*, vec3 worldPos)`, recovered from
0x40520d:

```
0040521E  sub  esp,0xc
00405221  mov  eax,[ecx+0xa0]      ; the scene root
00405227  mov  edi,esp
00405229  movsd                    ; pos.x  -> [esp+4] after the push below
0040522A  push dword [eax+8]       ; the CAMERA -> [esp+0]
0040522D  add  ecx,0xcc            ; this = the probe
00405233  movsd
00405234  movsd                    ; pos.y, pos.z
00405235  call 0x402788
```

Then, with `M_view = camera+0x08` and `M_proj = camera+0xcc`:

```
viewPos = worldPos * M_view          (FUN_00402a6f, divides by w)
if (viewPos.z < 0.0) { probe.screenX = probe.screenY = -1.0; return; }

DAT_0041a000 = (clearColour - 0x00020304) | 0xFF000000     ; FUN_00402773
stamp it into all four vertex diffuses (offset 24 of each 44-byte vertex)

ndc = viewPos * M_proj               (divides by w)
probe.screenX = (ndc.x + 1.0) * 0.5 * 640
probe.screenY = (1.0 - (ndc.y + 1.0) * 0.5) * 480

applyMaterial(markerMat 0x1810)
reset2D()                            ; VIEW / PROJ / WORLD <- identity
half = (2.0 / 640) * 1.5             ; [0x418200] = 2.0, [0x4170bc] = 1.5
v0..v3 = (ndc.xy -+ half, z = 1.0)   ; z is a static global, set once by FUN_004026be
DrawIndexedPrimitiveUP(TRIANGLELIST, 0, 4, 2, {0,1,2,2,3,0}, INDEX16, verts, 44)
unapplyMaterial()
camera->apply()                      ; restores VIEW and PROJECTION
```

`half` is **1.5 logical pixels**, so the quad is 3×3 px, while the readback is
4×4 px with its **top-left corner at** `(ftol(screenX), ftol(screenY))` rather
than centred. The overlap is therefore only 1–4 of the 16 sampled pixels. That
is not a mistake to correct — it is why a *binary* test is all the original
needs, and the port reproduces the asymmetry exactly. Measured in the port at
0x1630: `screen = (361.9, 246.9)`, marker covers x∈{360,361,362} y∈{245,246,247},
block covers x∈{362..365} y∈{247..250} ⇒ **exactly one** matching pixel, and the
predicted `fraction` of 0.0625 is what the harness reports. The overlap can
never be zero: `round(x)` ≤ x + 0.5 and the marker reaches x + 1.5.

The quad's UVs are never written anywhere in the image and the material binds no
texture, so it is flat-shaded from the diffuse — consistent with
`D3D8_API.md` §"open questions" item 2.

## 5. The fade — `FUN_004050ed`

```
if (!enabled) return;
occluded = FUN_00402907(probe);             ; 1 = occluded / off-screen
if (occluded) { if (cur > 0)   cur -= dt * rate;  if (cur < 0)   cur = 0;   }
else          { if (cur < max) cur += dt * rate;  if (cur > max) cur = max; }
```

`dt` is the object's `+0x04`, elapsed time in **1/30-second units**
(`FUN_004060db`), so scene 4's rate of 20 opens the flare from 0 to 800 in
800/20 = 40 "frames at 30 fps" = **1.33 s**.

## 6. The sprite — `FUN_004051ac` + `FUN_00404dbb`

```
004051CA  mov  [ecx+0x18], edx     ; sprite[0].halfSize = cur
004051CD  fld  dword [esi+0xdc]
004051CF  fdiv dword [esi+0xd8]
004051D5  fmul dword [0x418268]    ; * 255.0
004051DB  call 0x404224            ; ftol  (round-half-to-EVEN)
004051E6  shl  eax,0x18
004051E9  or   eax,0xffffff
004051EE  mov  [ecx+0x1c], eax     ; sprite[0].colour = alpha<<24 | 0xFFFFFF
```

so **size and alpha both scale with the occlusion fade**, and the disc is pure
white modulated by texgen program 14.

`FUN_00404dbb` then, for the one sprite, with `objectPos = 0` and `scale = 1`:

```
SetTransform(VIEW, I); SetTransform(WORLD, I)
centre = sprite.pos * scale + objectPos, transformed by the CAMERA VIEW MATRIX
centre += sprite.viewOffset * scale                 ; (0,0,0) for the flare
v0 = centre + (-h, -h, 0)   v1 = centre + ( h, -h, 0)
v2 = centre + ( h,  h, 0)   v3 = centre + (-h,  h, 0)   with h = sprite.halfSize
all four diffuses = sprite.colour
DrawIndexedPrimitiveUP(TRIANGLELIST, 0, 4, 2, idx, INDEX16, verts, 44)
SetTransform(VIEW, cameraView)                      ; restored
```

Building the quad in camera space is what makes it exactly camera-facing.
Material `0x1891` = lighting off | fog off | `ZWRITEENABLE=0` + `ZFUNC=ALWAYS` |
cull none | **additive**.

The whole pass runs with the camera's far plane pushed to **10000.0**
(`[0x461c4000]`) and restored immediately afterwards, because the sun sits far
beyond the fog-derived far plane (scene 4's is 1000).

## 7. What the port does

`web-sonnet/js/flare.js`, a 1:1 transcription of the above.

* `SyncOcclusionQuery.sample(x, y, marker) -> fraction in [0,1]` is the **single
  point** at which the query touches the device. `Flare` never calls
  `readbackRect` itself and only ever tests `fraction > 0`, which is the
  original's binary verdict. An asynchronous backend (readPixels → PBO →
  `fenceSync`, result consumed one or two frames later) is a drop-in replacement
  for that one method — but it would report occlusion 16–33 ms late, so it is a
  **remaster-path** option only; `?quality=original` must keep the stall,
  because the stall is part of what the original did. Not built; measured
  instead — see `verify/SWEEP.md`.
* `installFlare(Landscape, texgenImage)` wraps `build` / `reset` / `render` on
  the class scene7.js exports, so **scene7.js itself is untouched**. The only
  edit outside `flare.js` is three marked lines in `js/scenes.js`.
* `?flare=0` disables it, in the spirit of main.js's `?skip=`, so a before/after
  can be quoted without editing anything.

### Confidence

| claim | confidence | why |
|---|---|---|
| the query is binary, not a count | **high** | `local_5 = 0` with no counter; disassembly confirms a single `mov byte` |
| the marker quad is z = 1.0 with `ZFUNC = LESSEQUAL` and is the occlusion test | **high** | flags `0x1810` has bit `0x0080` clear; the four z globals are `0x3f800000` from `FUN_004026be` |
| draw order: geometry → marker → readback → sprite | **high** | read directly out of `FUN_00408eef` around `flare+0xac` / `+0xe5` |
| one sprite, no chain | **high** | `push 1` into `FUN_00404bb8` |
| `half = 1.5 px`, block top-left at the sun | **high** | constants read from the image; predicted `fraction` matches the port's measurement exactly |
| alpha = `ftol(cur/max · 255)` | **high** | disassembled |
| scene 4's sun y ramps 200 → 50 | **high** | already independently derived in `SCENES_7_10.md` §"the sunset ramp" |
| the marker patch stays in the presented frame | **medium-high** | nothing erases it; it is ≤3 RGB levels over ~9 px, below any measurable threshold |
| GL and D3D8 rasterise the 3×3 marker to the same pixels | **medium** | both put sample points at pixel centres, and the overlap is ≥1 px for any sub-pixel phase — but this was reasoned, not proved against hardware |

## 8. Measured

Full numbers and the montages are in `verify/SWEEP.md`; the flare-specific ones:

| | |
|---|---|
| **0x1630, the sunset** | RMSE **69.6 → 26.0**, PSNR **11.3 → 19.8 dB** |
| across the whole 354-sample sweep | median RMSE 34.13 → **33.76**, mean 36.93 → **35.88** |
| samples improved / unchanged / worsened | 65 / 241 / 48 |
| best single improvement | 0x1628, RMSE 86.6 → 35.8 |

`SCENES_7_10.md` §8 quoted "~60 RMSE at 0x1630" against a then-baseline of 101;
on this harness the pre-flare figure is 69.6, because other work has landed
since. Either way the flare accounts for about two thirds of that frame's error,
and what remains there is the unported water-reflection pass.

The 48 worsened samples are **all** in 0x1400–0x1430, where the reference's
array-B curtain field fills the frame and ours is empty: with no occluder drawn,
the query correctly answers "the sun is visible" and we draw the full 800-unit
disc over a bare beach. That is the query working, not failing. When the
curtains are fixed the flare will close there by itself.

### The offline half of the fade

`Flare.updateOffline(view, proj, dt)` runs the *bounds* half of
`FUN_00402907` — the guard that returns "occluded" without touching the back
buffer when the projected sun is outside `[2, W−2) × [2, H−2)` — during
`main.js`'s `warmTo`, which steps every object's state machine with no
rendering. Without it a captured frame comes out of a warm-up with the flare at
full size regardless of where the camera has been looking. With it:

* object 8's sun leaves the frame at 0x1828 and `cur` correctly sits at **0**
  for the rest of the scene;
* object 7's sun enters at 0x1300 and the port shows `cur = 55 / 800`, mid-ramp,
  exactly as a 1.33 s ramp at rate 20 predicts;
* object 9's re-entry at 0x2210 opens in three frames (rate 100), as it should.

When the sun *is* inside the frame we cannot know whether geometry covers it
without drawing, so the offline path assumes visible — the same assumption the
port made before this file existed. Live playback never uses it: `tick` is only
called by `warmTo`.

## 9. Cost

Chrome / ANGLE-Metal, headless, 640×480, sampled with the CDP CPU profiler
(a `performance.now()` bracket would charge the GPU stall to JS and read
"CPU-bound"):

| | 0x1630 (flare-heavy) | 0x1a00 (dense geometry) | 0x0300 (text only) |
|---|---|---|---|
| live frame (`renderAt`, inclusive) | 3.92 ms | 0.50 ms | 0.08 ms |
| `readPixels` self time | **3.13 ms** | 0.00 ms | 0.00 ms |
| 4×4 `readPixels` with the pipeline drained | 66 µs | 63 µs | 63 µs |

So the readback itself costs ~65 µs; everything above that is **waiting for work
already queued**, which is why it is 80 % of a 3.9 ms frame at 0x1630 and
unmeasurable at 0x1a00 (where the CPU-side leaf stepping has already given the
GPU time to drain). Worst case observed: 3.9 ms of a 16.6 ms budget, in the
demo's cheapest scene.

**An async PBO path is not worth building.** It would buy ≤3 ms at one position,
cost one to two frames of occlusion latency, and could not run on
`?quality=original` anyway. The seam exists if that ever changes:
`SyncOcclusionQuery.sample` is the only place the query touches the device, and
`installFlare(Landscape, texgenImage, { makeQuery })` lets a caller substitute a
backend without editing `Flare`.

---

## ⚠ OPEN (found 2026-08-11, while checking a shim hunch): the flare draws too LATE

After the missing-WRAP fix, `0x1410` (the beach, previously the demo's worst
frame at 109.72, now 81.07) shows the grass curtains matching the reference
well — and a **fully blown-out sun blazing in front of them**. The reference has
no visible flare there: the grass is in front of it.

**It is not the occlusion query.** The query is wired and running (the sweep's
profiler reports ~3.3 ms/frame of it), the marker material `0x1810` correctly
leaves depth testing ON, and the marker colour is recomputed per call from the
scene's clear colour.

**It is depth + draw order, and the two interact:**

1. The curtain material is `0x1050` → blend mode 2 → **`ZWRITEENABLE = 0`**, so
   the grass writes no depth at all. The marker quad at z = 1.0 therefore
   cannot be depth-rejected by it, and the query reports the sun visible.
2. The original does not depend on depth for this. `FUN_00406004` runs **four
   layer passes in a fixed order**, and the flare's is the SECOND:

```
FUN_00405f8b(this, 1,    dt, 0)      ; pass 1
FUN_00405f8b(this, 4,    dt, 0)      ; pass 2  <- the flare (the `al & 4` branch)
(camera apply)
FUN_00405f8b(this, 2,    dt, 0)      ; pass 3
FUN_00405f8b(this, 0xc,  dt, 1)      ; pass 4  <- scene geometry
```

So the original draws the flare EARLY and then paints the scene over it. Ours
draws it late, so it sits on top of everything.

`scenes.js`'s own comment records the change and its reasoning: the flare was
moved off `scene3.js`'s "early-in-the-frame draw order" onto the shared
`Landscape` wrapper so all eight objects would get the occlusion-gated sprite.
**That was right about the sprite and wrong about the order** — and it is
invisible in every scene whose foreground does not cross the sun, which is why
it survived.

**Fix direction (not yet done):** draw the flare in the original's pass-2
position rather than after the scene, i.e. restore the early order while
keeping the occlusion gate. Verify at 0x1410 and 0x1428 (the current worst),
and re-check the scenes where the flare is unoccluded — `?flare=0` isolates it.

### CORROBORATION (2026-08-11, later): the impact, measured across the whole demo

The diagnosis above predicted the defect would be "invisible in every scene whose
foreground does not cross the sun". That prediction is now tested, and it holds
exactly — which is the strongest evidence we have that the draw-order reading is
the right one.

Method: for every sampled frame, count pixels with `r>235 && g>235 && b>225` (the
sun disc and its bloom dominate this set; butterflies and specular are a few
pixels). Call the sun OFF below 0.02% of frame area. Then count samples where the
**reference's sun is OFF while ours is ON** — i.e. the occlusion the original gets
and we do not.

| obj | scene | n | ref OFF | **ref OFF & ours ON** | median ours% | median ref% |
|---|---|---|---|---|---|---|
| 3 | spires | 24 | 3 | 1 | 9.610 | 11.761 |
| 4 | lakes | 24 | 9 | 1 | 0.553 | 0.093 |
| **5** | **trees** | 40 | 25 | **13** | 0.045 | 0.003 |
| 6 | cloud sea | 24 | 4 | 1 | 16.284 | 23.636 |
| **7** | **beach** | 40 | 18 | **10** | 5.566 | 0.341 |
| 8 | autumn forest | 56 | 36 | 3 | 0.000 | 0.000 |
| 9 | winter | 40 | 8 | 2 | 1.629 | 1.037 |
| 10 | finale | 64 | 7 | 2 | 12.636 | 11.825 |

**Objects 5 and 7 fail on ~52% and ~56% of the frames where the original occludes
the sun; every other object fails on 1–3 samples out of 24–64.** Those two are
precisely the scenes with alpha-blended foreground crossing the sun — obj 5's
canopy leaves and obj 7's grass curtains (`0x1050`, `ZWRITEENABLE = 0`). The
median tells the same story: ours carries ~15× the reference's sun footprint in
both (0.045 vs 0.003; 5.566 vs 0.341), and is within noise everywhere else.

Fine-grained confirmation of the *pulse* itself, obj 5 across ten consecutive
rows (`--positions`, original quality):

| pos | 0x0b38 | 0x0b3c | 0x0b3f | 0x0c00 | 0x0c01 | 0x0c02 | 0x0c03 | 0x0c04 | 0x0c06 | 0x0c08 |
|---|---|---|---|---|---|---|---|---|---|---|
| ours % | 1.65 | 1.65 | 1.65 | 1.34 | 1.40 | 1.47 | 1.56 | 1.65 | 1.45 | 1.68 |
| ref % | 1.53 | 1.52 | 1.51 | 1.50 | 1.53 | 0.07 | **0.00** | **0.00** | **0.00** | 0.00 |

The reference shuts the sun off completely inside ~0.3 s and keeps it off. **Ours
never closes at all** — it is flat at ~1.5% throughout. The bright-pixel centroid
is (0.48, 0.48) in both while the sun is up, so the sun is in the *right place*;
only the gate fails. This is Jasper's original report — *"the pulses of the sun
coincide with leaves moving in front of it… there is no canopy for the sun to
shine through"* — reduced to two numbers. Note it is **not** a canopy-geometry
problem: at these positions the leaf masses match the reference closely
(`verify/sheet_canopy_01.png`), which rules out the leaf-placement hypothesis
that this was originally filed under.

`rate` is not the problem either: obj 5 has `flareParam2 = 50` against `max = 300`,
so a fully occluded flare collapses in 6 ticks ≈ 0.2 s — matching the reference's
observed 0.3 s. The integrator is correct and simply never receives an
"occluded" verdict.

**This makes the pass-2 draw-order fix the highest-value item in the flare work**,
worth ~23 samples across the two worst-scoring 3D objects, and it is the same
root cause as obj 7's `0x1428` — still the demo's single worst frame at 81.5.

> ### ⚠ THE TWO TABLES ABOVE ARE CAPTURE-PATH MEASUREMENTS, AND FOR OBJECT 5 THAT
> ### MAKES THEM WRONG ABOUT LIVE PLAYBACK. Corrected the same day.
>
> `web-sonnet/test/flare_live.mjs` now traces the flare **per frame during real
> playback**, and object 5 is not pinned at all:
>
> | segment | on-screen | visible | flips | `cur` |
> |---|---|---|---|---|
> | grove (obj 5) @ 0x0b30 | 100% | 69.5% | **8** | 0..300 / 300 |
> | beach (obj 7) @ 0x1400 | 100% | **100.0%** | **0** | 800..800 / 800 |
> | forest A (obj 8) @ 0x1800 | 100% | 99.2% | 1 | 268..300 / 300 |
> | forest B (obj 8) @ 0x1b00 | 30% | 0.0% | 0 | 0..0 / 300 |
>
> **The grove pulses correctly in live playback** — `cur` sweeps the entire range
> and the verdict flips eight times in six seconds. The flat 1.5% in the
> ten-row table is the sweep's warm-up pinning the flare open, exactly as the
> "harness artifact" section below predicts; it is the *instrument* that never
> closes, not the port. Object 5 should not have been listed as a defect.
>
> **Object 7 is the real one**: 100% visible over 721 consecutive rendered
> frames with zero flips, `cur` welded to 800/800. That is a genuine
> PINNED OPEN in live playback, and it is the same object that owns `0x1428`.
>
> Forest B reads 0% visible, but only 30% of its frames have the sun on screen at
> all and the reference's obj-8 sun is off in 36 of 56 samples with a median
> footprint of 0.000 — staying shut there is correct, not a regression.
>
> **What went wrong in the reasoning:** the whole-demo table was built from
> `frames/ours_*.png`, and those are capture-path renders. This file's own
> "harness artifact" section, written earlier the same day, says in as many words
> that the capture path cannot measure occlusion — and the table was still built
> on it. **A known instrument limitation has to be applied when it is
> inconvenient, not just when it is being documented.** The per-object *pattern*
> (objects 5 and 7 far worse than the rest) survives and still points at
> alpha-blended foreground crossing the sun; only the object-5 verdict is
> withdrawn.

### RESOLVED (2026-08-11): the marker/draw split is real; the blown sun is a HARNESS artifact

Two separate things, and only the first is a port defect.

**1. The probe and the draw were both happening at frame end. Fixed.**
`FUN_00405f8b` visits the flare object TWICE per frame (`0x405FA9 test al,0x4`):

```
pass 2   mask 4,   param_3 = 0  -> FUN_0040520d -> FUN_00402788   the MARKER
pass 4   mask 0xc, param_3 = 1  -> FUN_004050ed -> FUN_00402907   READBACK + sprite
```

The gap between them is the entire occlusion test: the marker goes down, the
scene paints over it, then the 4×4 block is read back. This port ran both
back-to-back after the scene, so the marker was drawn on top of the finished
frame and read straight back — it could never score anything but fully visible.

Split: `stepMarker()` is called from a new `__flareMarker` hook in scene7's
render, positioned right after the camera transforms and before any geometry
(the original's pass-2 slot); `step()` keeps the readback, the integrator and
the sprite. The hook lives in scene7 rather than flare.js's wrapper because the
marker needs THIS frame's camera, which `#advance()` produces.

Measured: median 26.13 → **26.13**, mean 27.55 → **27.55**, worst
81.07 → **80.36**, every per-scene median unchanged. A correctness fix with no
metric cost — and the query now genuinely reports occlusion (`fraction: 0`,
`visible: false` at 0x1410, where it previously could not).

**⚠ An earlier attempt moved the whole flare early and was REFUTED by
measurement** — mean 27.55 → 29.17, beach 32.46 → **45.59**. The sprite belongs
last; only the marker belongs early. Recorded so it is not retried.

**2. The sun still blazes at 0x1410 — and that is the capture harness, not the port.**
`updateOffline` (used by `main.js`'s `warmTo`, which steps every object at 60 Hz
with no rendering) states its own assumption:

> *When the sun IS on screen we cannot know whether geometry covers it without
> drawing, so we assume visible.*

So a warm-up ramps `cur` to `max` unconditionally, and the single rendered frame
that follows can only decay it by one `dt * rate` step — measured at 0x1410:
`fraction 0`, `visible false`, but `cur` **798.5 / 800**. In LIVE playback every
frame runs the real query, so the flare occludes correctly; only the
warm-then-capture path shows it open.

**Consequence for verification: the sweep systematically over-reports error at
any position where foreground covers the sun** — which is much of the beach.
Some of scene 4's remaining RMSE is measurement error. Options: render the last
~N frames of a warm-up for real so the integrator converges (N ≈ the ramp time,
1.33 s ≈ 40 frames at object 7's rate), or have `capture.mjs` render a short
burst before sampling. Neither is done.


---

## ⚠ THE PROBE/DRAW SPLIT WAS REVERTED (2026-08-11) — it killed the forest sun

Jasper, in a real browser: *"the sun is gone from the forest scene."* He was
right, and the split is the cause.

**Why it only showed in live playback.** The split turned the occlusion query
from "always reports visible" (marker drawn on top of the finished frame and
read straight back) into a real test. In the CAPTURE path that barely matters:
`warmTo` steps every object without rendering, so `updateOffline` ramps `cur` to
`max` and the single rendered frame can only decay it one step — which is why
the sweep moved by 0.7 at the worst sample and nothing else. In LIVE PLAYBACK
every frame queries, so a marker that is occluded most frames drives the
integrator to **zero** and the sun disappears entirely instead of pulsing.

**The measurement that should have caught it, and did not.** The sweep is a
capture-path instrument, and this change is specifically one the capture path
cannot see. "Metric-neutral" was true and irrelevant.

Reverted. `flare.js` is back to doing probe + query + draw at frame end;
`scene7.js` keeps the `__flareMarker` hook, guarded and inert, because
`flare.js` no longer defines it — the analysis below is worth keeping.

Verified after the revert (scene 2's flare, `__sonnetFlare[2]`):

| pos | cur / max | visible | fraction |
|---|---|---|---|
| 0x0a28 | 300 / 300 | true | 0.125 |
| 0x0b28 | 296.2 / 300 | false | 0 |
| 0x0c08 | 300 / 300 | true | 0.125 |

`fraction 0.125` is the canopy partially covering the sun — the pulsing
`scene5.js` describes — with the integrator holding near max rather than
collapsing.

**To re-land it, the split needs verifying IN A BROWSER, not in a sweep**, and
probably alongside a fix to `updateOffline` so the warm-up and the live path
agree about occlusion. Until then the structural finding stands as analysis
only.

### THAT INSTRUMENT NOW EXISTS: `web-sonnet/test/flare_live.mjs` (2026-08-11)

Plays the demo for real at six start positions and records `cur`, `visible`,
`fraction` and `onScreen` **every animation frame** (an in-page rAF recorder, not
CDP polling — a `page.evaluate` round trip would alias against a 60 Hz
integrator and drop the flips being counted). Baseline saved as
`verify/flare_live_base.json`, captured from the build Jasper confirmed good.

```
node web-sonnet/test/flare_live.mjs --tag=base          # capture a baseline
node web-sonnet/test/flare_live.mjs --compare=base      # judge a change
```

The diagnostic number is **`flips`** — how often the verdict changes. Both
shipped catastrophes are pinning, and they sit at opposite ends: PINNED OPEN
(the sun blazes through foreground) and PINNED SHUT (the reverted split's "the
sun is gone from the forest"). A mean or a median cannot tell those apart; a
flip count of zero catches both. `--compare` flags any segment that was flipping
and has stopped, which is the revert's exact signature.

Two design points worth keeping:

* **Judge only the on-screen frames.** `update()` short-circuits to
  `visible = false` whenever the probe falls outside the bounds guard, which is
  correct and unrelated to the query. Folding those in manufactures a fake
  PINNED SHUT for any segment where the camera looks away — the first run of the
  file did exactly that to the forest.
* **`expect` comes from the reference table, not from intuition.** The forest was
  first labelled "must pulse" because that is what the original report described,
  and the probe duly failed a segment whose reference sun is off in 36 of 56
  samples. Staying shut there is correct.

**Current verdict: object 7 is the only segment pinned the wrong way**
(100.0% visible, 0 flips, `cur` welded at 800/800 over 721 frames). Object 5
pulses correctly in live playback. So the split's remaining job is the beach,
and the forest segments are the regression guard it has to survive.

---

## ✅ CLOSED (2026-08-11): the split is REFUTED, marker-LAST is the original's order

The split was re-implemented, run against the guard, and **measured wrong**. It is
now behind `?flare=split` as executable evidence and is off by default. Do not
retry it; the numbers below are the reason.

Two rounds, and the second is the informative one.

**Round 1 — the hook placed right after the camera transforms** (where the
reverted 2026-08-11 attempt had it): *every* segment went PINNED SHUT, including
the open-sky controls. Cause found immediately, and only because the controls
were in the harness: three things run between that point and the main pass — the
water-reflection pass, the 64×64 precipitation render target, and
`endRenderTarget(false)`, which **clears the colour buffer to the fog colour in
every scene without water**. The marker was wiped before it could ever be read.
That, and nothing subtler, is the whole of *"the sun is gone from the forest
scene"*. The original revert blamed the split; the split was innocent and the
call site was 70 lines too early.

**Round 2 — hook moved below the clear, into the true pre-geometry slot:**

| segment | marker LAST (default) | marker EARLY (`?flare=split`) | |
|---|---|---|---|
| grove (obj 5) | 69.5% vis, 8 flips | 69.3% vis, 8 flips | unchanged |
| beach (obj 7) | 100.0% vis, 0 flips | **0.0% vis, 0 flips** | BREAKS |
| forest A (obj 8) | 99.2% vis, 1 flip | **0.0% vis, 0 flips** | BREAKS |
| spires (obj 3) | 95.3% vis, 4 flips | 95.4% vis, 4 flips | unchanged |
| cloud sea (obj 6) | 15.1% vis, 1 flip | 15.1% vis, 1 flip | unchanged |

Marker-early breaks **exactly** the scenes with alpha-blended OVERDRAW — the
forest's rain and the beach's grass — and leaves every other scene bit-for-bit
alone. Blended geometry paints over the marker's *colour* whatever the depth
buffer says, so a marker laid down before it is destroyed every frame.

**So this file's header was right all along and §2's pass-order reading was
wrong.** The mechanism is DEPTH REJECTION, not colour overwrite: the quad goes
down at z = 1.0 with `ZFUNC = LESSEQUAL` **after** the depth-writing geometry and
survives only where nothing wrote depth. That single model accounts for every row
above — the grove pulses because its canopy leaves are alpha-TESTED and therefore
*do* write depth; the beach does not because its grass curtain is `0x1050` →
blend mode 2 → `ZWRITEENABLE = 0` and cannot reject anything.

`FUN_004019e6` confirms the shim is faithful, so this is not a shim bug:

```
param_1 == 0 : rs(0x1b ALPHABLENDENABLE, 0)                    ; rs(0x0e ZWRITE, 1)
param_1 == 1 : rs(0x1b, 1) rs(0x13 SRCBLEND, 5) rs(0x14 DEST, 2) ; rs(0x0e ZWRITE, 0)
param_1 == 2 : rs(0x1b, 1) rs(0x13, 5)          rs(0x14, 6)      ; rs(0x0e ZWRITE, 0)
```

**Methodological note.** The open-sky controls did all the work here. A harness
of only the three "interesting" scenes would have shown three failures and no way
to tell "the fix is wrong" from "the fix is right and something else is broken".
Because spires and cloud sea failed too — and nothing occludes the sun in
either — round 1's cause was unambiguous within one run. Controls are not padding.

### Where object 7's error actually comes from — it is NOT the flare

`0x1400`–`0x1430` is a single camera and it holds the demo's worst frames
(RMSE 70.8, 73.1, 75.2, 74.5, 78.1, **81.5**, 77.3). Sun footprint across the
whole beach, ours vs reference:

| pos | 0x1310 | 0x1338 | **0x1400** | **0x1410** | **0x1428** | 0x1510 | 0x1610 |
|---|---|---|---|---|---|---|---|
| ours | 6.24 | 5.57 | **5.28** | **5.95** | **12.59** | 32.87 | 10.35 |
| ref | 6.69 | 5.08 | **0.00** | **0.00** | **0.003** | 23.38 | 15.40 |

Every other beach camera tracks the reference. Only this one diverges, and
`verify/pair_0x1428.png` says why: **the reference's grass curtain is dense and
opaque, filling the frame; ours is sparse.** The sea, the horizon, the birds and
the sun are all visible through our grass and none of them are visible through
the original's. Jasper independently reported the same shot as *"the grass is
facing the camera but the birds are rendered on top of it instead of behind"* —
same defect, seen from the other side.

A denser curtain would not by itself close the flare (the grass writes no depth
either way, so the marker still survives and the sprite still draws last and
additive) — but the curtain is the dominant error here by a wide margin, it is
the visible one, and the sun's screen position at `0x1428` sits *below* the
horizon line, which points at the water/terrain depth writes rather than the
grass. **Next action for object 7 is the curtain's density, not the flare.**
Tracked in `SCENE4_BEACH.md`.
