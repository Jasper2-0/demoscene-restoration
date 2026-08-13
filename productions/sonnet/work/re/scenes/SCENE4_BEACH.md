# Scene 4 — the beach (obj 7, sceneIdx 4, 0x1200–0x1700)

Opened 2026-08-11 on two observations from Jasper:
*"in the first shot, the waves are there only close to the island"* and
*"in the second shot, the grass is facing the camera but the birds are rendered
on top of it instead of behind"*.

## What the scene asks for

```
flags   waterGlitter, buildB, buildBillboards0, hiResWater, buildBirds, terrainVisible
arrays  B = 1 curtain record       C = 1 billboard instance
        G = 64 birds, species 1, centre (-200, 140, 100), radius 100
waterLevel 1        terrainScale (3, 0.5, 3)      sunPosition (-600, 200, 300)
```

Three camera shots, cut by `obj 7 m4` at 0x1300 (path 1) and 0x1500 (path 2),
each cut wrapped in a global fade — `obj 0 m4` at 0x1200/0x1230, 0x1300/0x1430,
0x1500/0x1630.

## Observation 1 — the waves: `FUN_004080e0` IS GENUINELY UNPORTED

`waterGlitter` (`desc[0x4f] & 0x…`, the flag) is set for this scene and for no
other, and `FUN_004080e0` — the water glitter strip — **is the single remaining
❌ in `INVENTORY.md`**. It was identified in `REVIEW_FIXES.md` §4 as the
"missing waves on the ocean" note and never ported.

Confirmed visually at 0x1220: the reference carries wave detail across the whole
water plane; ours has it only in patches near the island, which is the ribbon
strips (`hiResWater` → `FUN_0040f5a8`, which IS ported) and nothing else.

**So Jasper's first observation has a known, named, unported cause.** This is
the highest-value remaining item in the scene and the last ❌ in the table.

(Also visible in the same frame, and separately known: our beach strip blows out
to white where the reference is sandy.)

## Observation 2 — birds: TWO REAL DEFECTS FOUND AND FIXED (2026-08-11)

The draw-order hypothesis was refuted (see the table below), and chasing it
further into `FUN_0040f803` found the real cause: **the port drew FIVE LCG steps
per bird where the original draws EIGHT, and drew two of them in the wrong
order.** Every bird after the first therefore landed somewhere else.

The original's per-bird sequence, from the decompile plus ndisasm:

| # | draw | use |
|---|---|---|
| 1 | `rand01` | speed = `(r + 0.5) * 1.0 * A * 0.01`  `[0x418fd8]` |
| 2 | `rand01` | phase = `r * 100.0`  `[0x4170c0]` |
| 3 | `rand01` | **Z** = `2*r*A + A*(-2.0)`  `[0x4182c8]` |
| 4 | `rand01` | **X** = `2*r*A + A*(-2.0)` |
| 5–7 | `rand` ×3 | per-vertex colour, `(r%100 + 0x9b)` per channel |
| 8 | `rand01` | preroll = `ftol(r * 500.0)`  `[0x418fd0]` |

Two faults:

1. **Z is drawn BEFORE X**; the port drew X first. Identical distribution,
   different positions — exactly the trap `MG.scatter` had (`SPIRE_REOPEN.md`).
2. **The three colour draws happen for EVERY species.** The original computes
   the colour and then throws it away when `species != 0`
   (`if (in_stack_00000020 != 0) uVar8 = 0xffffffff`) — but the draws still
   occur. `buildBird` only drew them for species 0, so scenes 3 and 4
   (species 1) were short 3 draws per bird, and species 0 drew them at the
   wrong point (before the position instead of after).

Fixed by giving `buildFlock` all eight draws in order and making `buildBird`
RNG-free with the colour passed in. **Measured: whole-demo median
26.13 → 25.91, beach 32.46 → 32.32**, meshgen 370/370. `meshgen_test`'s
bird-colour assertion encoded the old contract and was rewritten to the new one.

## The draw-order hypothesis, refuted — recorded so it is not retried

Everything that would obviously explain it checks out:

| fact | evidence | verdict |
|---|---|---|
| bird material `0x1310` | `0040F88C push 0x1310` in `FUN_0040f803` | matches port |
| curtain material `0x1050` | `0040C63E push 0x1050` in `FUN_0040c1b2` | matches port |
| every mesh declares layer mask 8 | `FUN_004042f6` (mesh_new) `this+0xa4 = 8` | — |
| so all meshes draw in ONE pass, in child-add order | `FUN_00406004` pass 4, mask 0xc | — |
| the original builds curtains BEFORE birds | `FUN_004082a9`: curtains 6688, birds 6804 | matches port |

`0x1050` carries blend mode 2 ⇒ **`ZWRITEENABLE = 0`**, so the grass writes no
depth **in the original too**; and `0x1310` has no `0x0080`, so birds both write
and test depth. Birds drawn after grass therefore paint over it in BOTH
implementations. **Draw order and depth state are faithful — the ordering
hypothesis is refuted.**

⇒ The remaining candidate is **where the birds are**, not when they are drawn:
the flock's flight state (`FUN_0040fba1`) and its build-time preroll
(`ftol(rand01()*500)` updates per bird, replayed in creation order). If our
birds are in different places than the original's, they appear against the grass
where the reference's are elsewhere. **Not yet checked.**

## ⚠ Two HARNESS artifacts that make this scene look worse than it is

Both cost me time; recording them so they do not again.

1. **`capture.mjs` renders text frames in ink-mask mode with `skip=0`, which
   omits timeline object 0 — the compositor.** Scene 4's shots are separated by
   full fades to black, so those captures show OUR frame un-faded and bright
   against a REFERENCE that is mid-fade. It reads exactly like a missing fade
   and is not one. Probing the real render proves the fades work:
   `0x1230 lum 95.8 → 0x1238 17.7 → 0x1240–0x12f8 0.0 → 0x1300 7.3 → 0x1308 114.3`.
   **Use the sweep's `verify/frames/ours_*.png` for appearance questions in this
   scene; `capture.mjs`'s output is for text.**
2. **The flare is at maximum size in every captured frame** (`FLARE.md`): the
   warm-up's `updateOffline` assumes the sun visible whenever it is on screen,
   so `cur` ramps to `max` and one rendered frame can only decay it a step.
   At 0x1400/0x1410 that puts a blown-out sun over the grass which live playback
   does not show. Scene 4 is sun-facing throughout, so **a real share of its
   RMSE is this artifact rather than port error.**

---

## `FUN_004080e0` — THE WATER GLITTER, FULLY SPECIFIED (2026-08-11)

Everything below is PINNED. Ghidra dropped the alpha's `ftol` argument (the
usual x87 pattern), so the per-frame maths comes from ndisasm at 0x409900.

### It reuses the LENS FLARE's sprite class

`FUN_00404bb8(obj, count, flag)` has exactly two call sites:

```
0x4152   FUN_00404bb8(this, 1,    0)   <- FUN_00405082, the LENS FLARE
0x6847   FUN_00404bb8(this, 0x80, 0)   <- FUN_004080e0, the GLITTER (128 sprites)
```

So the glitter is **128 instances of the sprite the flare already draws**, and
`js/flare.js` owns that draw path. This is not a new renderer.

### Build (`FUN_004080e0`, VA 0x4080e0–0x408251)

```
obj              = FUN_00404bb8(alloc(0xcc), 128, 0)      -> Landscape+0x40
material         = FUN_00401c67(alloc(0x2c), Landscape+0x38, 0, 0x891)
phases           = alloc(0x200)                           -> Landscape+0x48  (128 floats)
obj[0xac]        = 0                                      (hidden by default)

per record i in 0..127, stride 0x20 into obj[0xb4]:
  rec[+0x00] = vec3 copy of (Landscape+0x3c)->[0xb4]      ; a base position
  rec[+0x04] = 0                                          ; y forced to zero
  r = rand()                                              ; FUN_00404258, raw
  a = rand01() * 1000.0 - 1000.0                          ; [0x418300]
  b = (r < 0x4000) ? rand01() * 40.0 - 20.0               ; [0x418e64] / [0x418e24]
                   : rand01() * 10.0 -  5.0               ; [0x418e5c] / [0x418e54]
  rec[+0x0c] = vec3(b, a, 0)                              ; FUN_00401558(dst, b, a, 0)
  rec[+0x18] = 2.0                                        ; [0x418200]   size
  phases[i]  = rand01() * 2.0 * PI                        ; [0x418220] qword
```

Two populations, chosen 50/50 by the top bit of `rand()`: a wide one spread
±20 and a narrow one ±5, both stretching 0 → −1000 along the other axis. That
is the "strip".

**RNG budget: 4 LCG steps per record (one raw `rand` + three `rand01`) = 512
draws.** `FUN_004080e0` runs at 0x7244, AFTER every array generator and BEFORE
`FUN_0040ec28`, so those 512 draws sit at a fixed point in the shared stream —
porting it will move everything built after it, and NOT porting it already has.

### Per frame (inside `FUN_00408eef`, VA 0x409900–0x40995d)

Gated on `waterLevel > 0` **and** `desc[0x4f] & 1` (the `waterGlitter` flag):

```
obj[0xac] = 1 ; obj->vtbl[1](0) ; obj[0xac] = 0        ; show, draw, hide again
for i in 0..127:
    s = sinf(T * 10.0 + phases[i])                     ; T = Landscape+0x13c, [0x418e5c]
    u = s * 0.5 + 0.5                                  ; [0x4170d4]
    rec[+0x18] = u * 96.0 + 32.0                       ; SIZE  32..128   [0x418e94]/[0x418e84]
    rec[+0x1c] = (ftol((u * 127.0 + 63.0) * 0.5) << 24) | 0xffffff
                                                       ; ALPHA 31..95    [0x418e34]/[0x418e90]
```

So every sprite pulses on its own phase — size 32→128 and alpha 31→95 together.
Note the draw happens BEFORE the update, so the first frame shows the build-time
size 2.0.

Material `0x891` = fog off | `ZWRITEENABLE=0, ZFUNC=ALWAYS` | cull none |
additive — depth-independent additive sparkle, which is why it reads as glitter
rather than geometry.

### Port plan

1. Build the 128 records in `Landscape.build()` at the original's position
   (after the arrays, before the cloud) so the 512 stream draws land correctly.
2. Reuse flare.js's sprite draw with a 128-instance path and material `0x891`.
3. Drive size/alpha from `Landscape+0x13c`'s clock each frame.
4. Regression: the 512 draws WILL move the stream for anything built after — so
   check scene 4's bird preroll and the sweep before/after, not just the water.


---

## The glitter's DRAW path (the last unknown before it can land)

`FUN_00404bb8`'s class draws through vtbl[1] = **`FUN_00404dbb`**
(vtable at `0x4182ac`). Its per-record loop at 0x404e60 composes **two** vec3s,
each scaled by the object's own scale vector at `obj+0x94`:

```
esi = obj + 0x94                      ; the object scale
vec3_mul(t1, rec+0x00, scale)  ; vec3_add(t2, t1, …)  ; vec3_transform(…, t2, …)
vec3_mul(t3, rec+0x0c, scale)  ; vec3_add(t4, t3, …)
   then  fld [rec+0x18]  (the width)  -> vec3_set -> vec3_add  x2
```

So a record is **a STREAK between two points**, not a point sprite: `+0x00` is
the base, `+0x0c` the far end, `+0x18` the width and `+0x1c` the colour. That is
what "water glitter **strip**" means, and it matches the reference's long
horizontal wave streaks rather than round sparkles.

**Remaining to land it:** finish decoding 0x404ea8–0x404f20 (the four corner
positions from the two endpoints and the width), then reuse it for both the
flare (count 1) and the glitter (count 128). The build and per-frame maths are
already fully specified above.


---

## `FUN_004080e0` — IMPLEMENTED (2026-08-11)

The whole chain is now ported from the decompile + disassembly as oracle, and it
draws. `INVENTORY.md`'s last ❌ is closed.

**What the anchor turned out to be, and it is a nice detail.** Every record's
base position is copied from `(Landscape+0x3c)->[0xb4]` — and `Landscape+0x3c`
is the **LENS FLARE** (`FUN_00405082`, 0x407075), whose record 0 is written with
`desc+0x32`, the **sun position**, at 0x407084. `FUN_004080e0` copies that and
forces y to 0 (`[dst+4] = 0`, 0x408119). So the glitter is anchored at
**the sun dropped onto the water plane** — it is the sun's sparkle on the sea,
not a generic wave field. Verified live: base = `(-600, 0, 300)` for scene 4's
sun at `(-600, 200, 300)`.

The draw (`FUN_00404dbb`, vtbl[1] of the sprite class at 0x4182ac) is a
view-space billboard, and my earlier "streak between two endpoints" reading was
WRONG — the decompile settles it:

```
centre = vec3_transform(rec[0..2] * objScale + objPos, view) + rec[3..5] * objScale
corners = centre + (-s,-s,0), (+s,-s,0), (+s,+s,0), (-s,+s,0)     s = rec[6]
colour  = rec[7]                                                   stride 0x2c
```

`objScale` is (1,1,1) and `objPos` (0,0,0) — `FUN_00404b2d` writes `fld1` ×3
into +0x94 — so it reduces to `view * base + off`. **The offset is added AFTER
the view transform**, which is why `rec[3..5]`'s y spans [-1000, 0]: it is a
screen-space spread downward from the sun's reflection.

### Two bugs found while landing it, both worth remembering

1. **The update lived inside the draw**, so `warmTo` — which steps every object
   without ever rendering — never ran it, and every captured frame drew the
   build-time size of 2.0 (about one pixel). Size and alpha are a *pure
   function* of the clock and the record's phase, with no accumulated state, so
   they are now evaluated at draw time from `t13cPrev`. That reproduces the
   original's draw-then-update one-frame lag AND survives a warm-up.
2. **The UVs were never written**, so all four vertices sampled texel (0,0) of
   the flare texture — transparent — and 128 additive quads contributed
   *exactly nothing* while measurably submitting geometry. The flare's own
   sprite writes `[[0,0],[1,0],[1,1],[0,1]]` once at construction; the glitter
   now does the same. **A draw call that runs and produces zero pixels is the
   failure mode to suspect when geometry is "there" but invisible.**

Measured contribution (sum of RGB over the frame, glitter on vs off):
0x1300 **+25,608**; 0x1220, 0x1410, 0x1500, 0x1600 ≈ 0. Whole-demo sweep
unchanged at two decimals (median 25.91, beach 32.32) — one sample moving does
not shift a 354-sample statistic. meshgen 370/370; all suites green.

### ⚠ …which means Jasper's "waves only close to the island" is probably NOT this

At **0x1220**, the island shot where the observation was made, the sun's
reflection point is **behind the camera** — measured view-space z = **−118.4** —
so the glitter legitimately draws nothing there, and would not have in the
original either. The waves visible across the reference's water at 0x1220 must
therefore be the **ribbon strips** (`hiResWater` → `FUN_0040f5a8`, 32 of them),
which ARE ported.

So the next question for that observation is **ribbon extent/placement**, not
the glitter. The glitter was still a genuine gap and is now closed, but it is
not the thing in that frame.

---

## The ribbons are CORRECT — verified against the binary (2026-08-11)

Chased next, because with the glitter anchored behind the camera at 0x1220 the
waves in that frame had to be something else. `FUN_0040f42f` (build) and
`FUN_0040f5a8` (update) were compared line by line with the port. Everything
matches:

| fact | binary | port |
|---|---|---|
| six build draws, in order | speed `r*20+90`, phase `2r+2`, phaseRate `r+1`, freqA `r+1`, freqB `r+1`, yaw `(r*-0.7+0.1)*PI` | identical |
| texture | `FUN_00416036(8, 0x100, 0x100, …)` — program 8 | `TEX.RIBBON` |
| material | `FUN_00401c67(…, 0x11)` | `0x11` |
| geometry | 0x20 verts / 0x1e tris, `QUAD_RIBBON` every 2 | identical |
| placement | `(0, i*0.1 + 0.2, 300.0 - phase*speed)` | identical |
| station x | `u*200 - 100`, `u = i/15` | identical |
| wave | `cos(freqB*phase + 2u*freqB*PI) * sin(freqA*phase + 2u*freqA*PI) * 10` | identical |
| half-width | `±36.0` `[0x418fc8]` | identical |
| alpha ramp | `|i-8| * 0.125` `[0x418f64]`, colour `| 0x6f6f6f` | identical |

**So neither the glitter nor the ribbons explain the 0x1220 frame.** The
ribbons cover only `x ∈ [-100, 100]`, `z ∈ [80, 300]` — a 200×220 patch on a
±600 water plane (`K.HIRES_WATER_EXT`), so they are *supposed* to be a local
band, not a full-ocean effect. That is true of the original too.

⇒ **The broad wave texture across the reference's water must be the WATER
SURFACE ITSELF** — `buildWaterPlane(hiRes=1)`: a 32×32 grid at ±600 with uv0
tiled ×5, textured with texgen program 13. That is the next thing to compare,
and the specific questions are its material flags (the port uses `0x1011`,
unverified against the binary — the material call at 0x4084dd is the FLARE's
`0x1891`, so the water's is elsewhere in `FUN_004082a9`) and whether program 13
is being generated correctly.

**Two candidates eliminated, one named.** Worth stating plainly: the glitter was
a real gap and closing it was right, but it was never the thing in that frame,
and neither are the ribbons.

---

## The water surface is CORRECT too — and the real defect is the beach strip

Continuing the elimination with the disassembly as oracle:

| fact | binary | port |
|---|---|---|
| hi-res water material | `0x4087AF push 0x1011` | `0x1011` ✓ |
| coarse water material | `0x408967 push 0x1019` | `0x1019` ✓ |
| water texture | texgen program 13 — a rich teal wave field, R 2–30 / G 0–227 / B 0–251 | correct |
| water shoreline colour | `*0.5`, `fcom 48`, `*4`, `ftol`, `shl 24`, `or 0x3f3f3f` (0x408752–0x40877B) | identical |
| terrain shoreline colour | `ftol`, clamp `0xff`, `< 0x40 → 0`, skip if `y > waterLevel`, `-(a+1) << 24 \| 0xffffff` (0x4086a2–0x4086d7) | identical |
| terrain flag | `0x40879F or byte [eax+0xd],0x40` ⇒ `\|= 0x4000` | identical |

**And the rendered water matches.** Cropping the water at 0x1220 from the
sweep's own frames (`verify/frames`, the faithful ones) puts ours and the
reference side by side with the same wave pattern, the same colour and the same
structure. The waves are there, across the whole plane, in both.

### So what IS different at 0x1220

One thing, and it is a known open item: **the island's beach strip blows out to
streaky pure white where the reference is sandy tan.** Everything else in that
frame — sky, water, rock, tree, birds, text — matches.

That is almost certainly what read as "waves only close to the island": the
white streaks sit exactly where the shoreline is.

**Three candidates eliminated for that frame** — the glitter (anchored behind
the camera there), the ribbons (a local band by design), and now the water
surface and its shoreline colouring (all exact). The beach blowout is a
separate defect and is the one to chase: the remaining suspects are the baked
ground texture in the shoreline band (`groundTexProgA`/`B` for this scene) and
the additive water plane drawn over it.

### Where the beach blowout most likely comes from (measured, not yet fixed)

Scene 4's ground textures are `groundTexProgA = 17` (the FLAT surface) and
`groundTexProgB = 18` (the STEEP one):

```
prog 17   256x256   R 92-255 mean 232   G 88-255 mean 227   B 84-255 mean 193
prog 18   256x256   R  0-255 mean 123   G  0-255 mean 112   B  0-255 mean 102
```

**Program 17 is already a very pale sand — mean 232 of 255.** The beach flat is
almost entirely program 17 (it is flat, so `normal.y ≈ 1` and the A/B blend
weight goes to A), and the **additive** water plane (`0x1011`) is then drawn
over it wherever the terrain sits below `waterLevel`. Sand at 232 plus any
additive contribution saturates to 255, which is exactly the streaky white.

The water's own vertex alpha is `shorelineAlpha(x,z)` — small near the island
centre and saturating with distance — so the additive term should FADE OUT
toward the shore, not peak there. If ours does the opposite, that is the bug.
**Next probe: sample the water plane's vertex alpha near the island and compare
with the distance term**, before touching either texture.

---

## ⚠ THE CURTAIN IS TOO SPARSE — object 7's worst frames, 2026-08-11

`0x1400`–`0x1430` is one camera and it owns the demo's worst run of frames:
RMSE 70.8, 73.1, 75.2, 74.5, 78.1, **81.5** (`0x1428`, the single worst in the
demo), 77.3. Every other beach camera tracks the reference within a few points.

`verify/pair_0x1428.png` is unambiguous: **the reference's grass curtain is dense
and opaque and fills the frame; ours is sparse.** Through our grass you can see
the sea, the horizon line, the birds and a fully blown sun. Through the
original's you can see none of them — the upper half of that frame is solid
grass over sky.

Two independent reports of the same defect:

* Jasper, from watching it: *"the grass is facing the camera but the birds are
  rendered on top of it instead of behind"* — the birds are not mis-sorted, they
  are simply visible through grass that should have hidden them.
* The sun-footprint measurement (`FLARE.md`): ours 5.3–12.6% of frame against the
  reference's 0.000–0.003% across exactly these seven samples, while every other
  beach camera matches to within ~1.5 points.

**This was mis-filed as a lens-flare defect for most of a day.** The flare on this
object is genuinely pinned open in live playback (`flare_live.mjs`: 100.0%
visible, 0 flips, `cur` welded at 800/800 over 721 frames), which is real — but it
is a *symptom shared with* the curtain problem, not the cause of the RMSE. The
grass is what the eye sees.

**What to check, in order:**

1. **Blade count / spacing.** How many curtain quads does `FUN_004082a9` build for
   object 7, and at what spacing? The port's count is the first thing to diff
   against the disassembly — a sparse curtain is most cheaply explained by a
   wrong instance count or a wrong extent.
2. **Blade width.** A correct count with too-narrow quads looks identical from
   here. Check the quad half-width constant, not just the count.
3. **Draw order within the curtain.** Blend mode 2 writes no depth, so a curtain
   is only opaque by *overdraw*; too few layers reads as gaps regardless of
   individual blade opacity.
4. Only then look at the flare. The sun's screen position at `0x1428` sits BELOW
   the horizon line, so if it should be occluded by the water/terrain (which do
   write depth) rather than by the grass (which does not), that is a separate
   question about the sunset ramp's `sunY` and the water plane's depth writes —
   see `FLARE.md`'s closing section.

Do NOT reach for the flare's draw order: the marker/draw split was implemented,
measured against `flare_live.mjs`, and refuted twice. `FLARE.md` has the numbers.
