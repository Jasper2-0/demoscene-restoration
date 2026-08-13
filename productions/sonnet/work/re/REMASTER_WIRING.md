# Sonnet — wiring the texture-resolution remaster into the scenes

Work log, appended as I go (2026-08-05).

## 0. The finding, restated from the code

`js/texgen.mjs` has been resolution-independent since Part II of `re/gen/TEXGEN_PORT.md`
(kernel `continuous`, noise `pinned`, ops 31/32/34 unit-fixed, round-trip 2.3 / 3.0 / 3.0
mean at S = 2/3/4). **Nothing called it with a scale.** `web-sonnet/js/scene7.js`:

```js
const r = runTexgen(RESOURCES[id]);        // scale defaults to 1
```

`?quality=original` only ever changed `ATLAS_SCALE` (the font atlas) and the canvas size.
So every in-demo texture was 1x on both paths, which is exactly what the owner's four
"texture resolution is really low" notes describe.

## 1. Inventory of every texture-sized thing in the scene layer

Taken by grepping `createTexture` / `createRenderTargetTexture` / `texgenImage` in
`web-sonnet/js/`.

| site | size at 1x | source | scales? | why |
|---|---|---|---|---|
| `texgenTexture(d3d, id)` — all program textures | 8..512 | texgen | **yes** | the whole point |
| `texgenImage(desc.heightmapTexProg)` @ scene7:637 | 128x128 | texgen | **NO — data, not pixels** | it is read as `argb[i] & 0xff` into a `128*128` `Int32Array` and handed to `MG.buildTerrain`. Scaling it would (a) read the top quarter of a 256-row image and (b) change terrain geometry. Programs 22/23/24/25, used for nothing else. |
| ground bake `bakeGroundTexture` @ scene7:650 | 256x256 | composed from two texgen images + terrain normals | **yes** | the most visible texture in the demo |
| cloud noise @ scene7:328 | 256x256 (prog 7) | texgen + alpha bias | yes (follows prog 7) | |
| leaf tint @ scene7:467/799 | 256x256 (prog 1) | texgen + modulate | yes | |
| precip snow cut @ scene7:1074 | 16x16 (prog 15) | texgen + alpha cut | yes | |
| water stage-1 grey @ scene7:695 | 256x256 | `terr.map256` (meshgen) | **no** | it is a recolour of the 256x256 heightmap image `meshgen.mjs` produces. There is no finer data to draw from, and meshgen is not mine to change. Upscaling it would be invented detail. |
| curtain (beach grass) @ scene7:743 | 256x256 | `buildCurtainTexture()`, RNG | **no — see §2** | 2 RNG draws per COLUMN off the shared stream |
| impostor render targets @ scene7:454 | 512x512 x2 | rendered | **yes** | baked once, never per frame. NOTE: these are the horizon trees, but scaling them does **not** fix them — see §10 |
| cloud render targets @ scene7:304 | 256, 512 | rendered per frame | **yes, but measured** | per-frame fill cost, not a bake |
| font atlas | 2048x512 | `fontgen.js` | already did | the one thing that was wired |

## 2. Why the curtain texture stays at 256x256

`buildCurtainTexture()` draws exactly **2 randoms per column** off the shared meshgen LCG
(`MG.rand01()`), and `re/REMASTER.md`'s hard rule is *never change PRNG draw count or
order*. 512 columns would be 1024 draws and would desynchronise everything built after it
in scene 4.

The pinned-lattice escape (draw the 256 columns, replicate each one S times, scale the
rows) is available and costs nothing — but it buys nothing either: the only per-texel
variation in this texture is a per-column `keep` bit and a per-column integer `start` row
in original texels. Replicating columns and rows reproduces the same image exactly, just
larger. **Zero real detail, so it is not done.** Noted here so the next reader does not
re-derive it.

## 3. Where the scale now threads through

```
main.js            ?quality / ?texscale  ->  TEX_SCALE  (1 | 2 | 4)
   |                     ?quality=original WINS over ?texscale, unconditionally
   v
scene7.setTexScale(S)          before the first texgenImage() call
   |
   +-- TEX_SCALE ---> texgenImage(id, scale = TEX_SCALE)
   |                     -> runTexgen(bytes, {scale})   [kernel 'continuous',
   |                        noise 'pinned' — runTexgen's own defaults; at scale 1
   |                        it forces kernel 'none' and native noise]
   |                     -> cache key `id` at 1x, `id@S` otherwise
   |
   +-- texgenTexture(d3d, id)  -> createTexture(..., {levels: 0})  full box chain
   +-- texgenImage(hmProg, 1)  -> PINNED, terrain data (see §1)
   +-- bakeGroundTexture(mesh, N, A, B, size = gA.w)  -> 256*S square
   +-- RT_SCALE ---> impostor RTs 512*S, cloud RTs 256*S / 512*S
   |
   v
assets.warmTextures(texgenImage, scene7.texturePlan(ids), onEach)
   the plan pairs each program with the scale it is actually USED at, so the
   heightmaps are warmed once at 1x instead of being generated at S and then
   again at 1x by build().
```

Everything downstream is size-agnostic already: `cloudNoiseTexture`, the leaf
modulate, the precip alpha cut and `bakeImpostors` all iterate `img.argb.length`
and upload `img.w`/`img.h`. `flare.js` calls `texgenImage(14)` with one argument
and so picks up the default scale without being touched (it is not mine to edit).

## 4. Mipmaps

Nothing to change, and that is the point: `createTexture(..., {levels: 0})` already
routes to `buildMipsD3D8Box` (minid3d8.js:541), the port of the original's integer
`>> 2` box filter, and every call site in scene7.js already passes an explicit
`levels`. A 2x texture simply gets one more level in the same chain, built by the
same filter. `gl.generateMipmap` is available in the shim as `opts.generateMipmap`
and is **not** used anywhere here.

The one thing this constrains is the *scale*: it must be a power of two. Every
content texture is POT (8, 16, 32, 128, 256, 512) and the box filter halves
exactly; S = 3 would make the 8x8 rain sprite 24x24 and the chain would go
24 -> 12 -> 6 -> 3 -> 1 with a non-halving step. `setTexScale` rejects anything
but 1, 2, 4. (S = 3 remains available to `js/scale_roundtrip.mjs`, which does not
build mips — that is why the odd-scale evidence in TEXGEN_PORT.md §15 still
stands.)

## 5. Byte-identity of the authentic path — evidence, not assertion

### CPU side — exact

1. **The ground bake.** The only algorithm I generalised. A transcript of the
   pre-change literal-256 body was diffed against the new `size`/`step`-parameterised
   one at `size = 256, step = 1`, over all nine scene descriptors (both N = 64 and
   N = 128, every A/B program pair):

   ```
   PASS sceneIdx 0 N=64  A=19 B=18  sha=3167f3d05b63cf54
   PASS sceneIdx 1 N=64  A=19 B=18  sha=3167f3d05b63cf54
   PASS sceneIdx 2 N=64  A=19 B=18  sha=c65968677c3fc8dd
   PASS sceneIdx 3 N=64  A=19 B=18  sha=3167f3d05b63cf54
   PASS sceneIdx 4 N=64  A=17 B=18  sha=bb0b3fa3584c6453
   PASS sceneIdx 5 N=64  A=20 B=18  sha=ebf0b3ba7505d320
   PASS sceneIdx 6 N=64  A=19 B=18  sha=3167f3d05b63cf54
   PASS sceneIdx 7 N=128 A=20 B=18  sha=9fd7b7821bb9af2b
   PASS sceneIdx 8 N=128 A=27 B=27  sha=55be5e9ac27d7df4
   ```
   sha256 over the raw `Uint32Array` bytes; identical in every case.

2. **`scene7.texgenImage()` at scale 1 vs the bake.** `generate_test.mjs` proves
   `runTexgen` still matches `baked/tex/*.png`; this proves the *caller* does, i.e.
   that the cache key, the default argument and the `scale === 1 ? {} : {scale}`
   dispatch did not perturb anything: **27/27 programs byte-identical**.

### GPU side — identical to within the driver's own noise, and that limit is measured

The three files I own were mechanically reverted to their pre-change form and a
**full 354-sample `--quality=original` sweep** run on that build, then the same sweep
on the wired build, off the same snapshot of everyone else's code.

* Summary statistics are **identical**: median 26.94, mean 28.92, worst 118.99
  (0x0710) on both.
* Per-sample RMSE agrees on **354/354 samples to two decimals**.
* sha256 over each frame's raw RGBA: **336 of 354 frames bit-identical**. The 18 that
  differ are all in scene 4 (0x1208–0x1330) and differ by **1 to 10 subpixels out of
  921,600, each by exactly ±1**.

That last figure is not a defect, and here is the control that shows it: **two full
sweeps of the SAME build differ at 17 frames**, in the same region, the same way
(0x0a30, 0x0b08, 0x1220…0x1330, 0x1528, 0x1608, 0x1620, 0x1c20, 0x1c30, 0x1d10).
ANGLE-Metal is not bit-reproducible run to run in the alpha-blended parts of the
beach scene. 18-vs-17 is the same population.

**So: the authentic path is byte-identical everywhere it is deterministic, and
indistinguishable from itself everywhere it is not.**

An earlier round of this comparison used `--positions=` subsets and produced a
confusing result. Do not do that: rendering consumes the shared meshgen RNG (the
reason `__sonnetRenderSeq` snapshots it), so a sweep of 6 positions is only
comparable with another sweep of *the same* 6 positions, and even then it is noisier
than a full sweep. Compare full sweeps.

### Two traps worth writing down

**(a) The stored baseline was stale.** The brief quotes median **26.70** from
`verify/results.json` (generated 10:52). The wired build measured **26.72**, with 79
samples differing by up to 12 RMSE — all in objects 3, 4, 5 and 7.
`re/scenes/REVIEW_FIXES.md` §1 documents a spire fix landed at 11:40 that adds **80
RNG draws inside object 3's build**, carrying its own "RNG-stream warning" that
everything built after object 3 shifts; its table says 0x0628 goes 65.72 -> **72.88**,
and the wired build reports exactly **72.88** there.

**(b) `scene7.js` is being edited by two agents at once.** Between my first and second
full sweeps the scene agent landed the **lens droplets** (`FUN_0040d5c6`'s tail:
`DROP_*` constants, `TEX.DROPLET`, `#emitDroplet`, a 64x64 `precipRT`). That moved the
`?quality=original` median from 26.72 to **26.94** — the deltas start at 0x1708 and
jump in the rain window from 0x1b00, exactly where droplets appear. My edits are
surgical and survived; the legacy/wired A/B above was run off one snapshot so that
their work is held constant in both arms. **Every number in §8 is post-droplet.**
`?quality=original` is now **median 26.94**, and neither 26.70 nor 26.72 is the live
baseline any more.

## 6. Generation time and memory — measured

Browser (headless Chrome, ANGLE-Metal), `window.__sonnetTimings`, cold page per row:

| | atlas | **textures** | scenes | boot total |
|---|---|---|---|---|
| `?quality=original` (1x) | 35–69 ms | **848 ms** | 215 ms | 1.9 s |
| remaster `?texscale=1` | 80–130 ms | **620–1485 ms** | 150–365 ms | 2.0 s |
| remaster **2x (default)** | 69–163 ms | **2253–3354 ms** | 216–295 ms | **3.7–4.9 s** |
| remaster `?texscale=4` | 69–103 ms | **8570–12920 ms** | 572–819 ms | **9.9–15.0 s** |

Node, same code, less noisy (relative cost is the point): **699 / 1945 / 7785 ms** for
S = 1 / 2 / 4, i.e. **2.8x and 11.1x** the 1x cost for 4x and 16x the texels. It is
sub-linear in texels because the fixed per-op overhead does not grow.

Live frame cost at the three flagged positions (`gl.finish()` both sides, 30 frames,
`__sonnetRenderSeq` at the position it is already warmed to so the timeline steps zero
times — re/PERFORMANCE.md §1's warning that `__sonnetRender` is 97–99 % warm-up):

| pos | 1x | 2x | 4x |
|---|---|---|---|
| 0x0738 | 1.20 ms | 0.53 ms | 0.72 ms |
| 0x1210 | 1.69 ms | 0.92 ms | 1.13 ms |
| 0x1828 | 1.54 ms | 1.01 ms | 1.55 ms |

These are all far below the 16.6 ms budget and the spread between columns is machine
noise, not signal — **texture resolution does not cost frame time here.** (It cannot:
the texel count per pixel drawn is unchanged, only the mip level selected differs.)

Texture memory, counting a full mip chain as 4/3 of the base level:

| | content | ground bakes | render targets | atlas | **total** |
|---|---|---|---|---|---|
| 1x | 6.8 MB | 3.0 MB | 3.3 MB | 5.3 MB | **18.4 MB** |
| 2x | 25.8 MB | 12.0 MB | 13.0 MB | 21.3 MB | **72.2 MB** |
| 4x | 102.0 MB | 48.0 MB | 52.0 MB | 21.3 MB | **223.4 MB** |

Node peak RSS while generating the 4x set was **596 MB** — the texgen VM works in
`Float32Array` layers, so a 2048² canvas is 64 MB *per layer*. In the browser, 4x
generated fine in a fresh tab but **the renderer process was killed** when a 4x boot
followed 1x and 2x boots in the same page, i.e. it is close to the edge.

### Recommended default: **2x**

- It is where the visible gain is (the crops in §8): 1x -> 2x is the step that removes
  the mush; 2x -> 4x is barely distinguishable at 640x480, which is what one would
  expect once the texture is already finer than the framebuffer.
- 4x costs **9–15 s of load** against 2x's 3.7–4.9 s, on a demo whose whole point is
  that it generates its content in front of you, and it puts 223 MB of texture on the
  GPU plus a ~600 MB transient in the generator.
- 4x is kept reachable as `?texscale=4` and works; it is a knob, not the default.

## 7. THE HARD-CODED-DIMENSION AUDIT

The principle, borrowed verbatim from `TEXGEN_PORT.md` §16: a number that is a
**sampling rate of a continuous function** scales; a number that is a **unit** — a
threshold, a screen-space size, a count, a texel-denominated offset the original tuned
by eye — does not. Categories below are that section's: **R** = resolution (scale it),
**S** = semantics (must not change), **G** = grid-structural (a bound expressed in
texels; scale the *extent*, not the count).

| # | baked-in value | where | cat | decision |
|---|---|---|---|---|
| 1 | 28 texgen programs, 8..512 px | `texgenImage` | **R** | **scaled.** `runTexgen(bytes, {scale})`, kernel `continuous`, noise `pinned`. |
| 2 | ground bake `256x256` | `bakeGroundTexture` | **R** | **scaled** to `256*S`, driven by the source programs' own width so it cannot drift out of step. |
| 3 | ground bake `cell = trunc(256/N)` | same | **R** (derived) | **scaled implicitly** — `cell = trunc(size/N)`. N = 64 or 128 and size = 256·S with S a power of two, so `cell` stays an exact integer (64 -> 4/8/16, 128 -> 2/4/8). A guard throws if it ever would not. |
| 4 | ground bake `(x+1)/cell` off-by-one | same | **G** | **generalised to `(x+step)/cell`, `step = S`.** Worked out, the off-by-one makes the A/B weight field piecewise-CONSTANT per terrain cell with a **one-texel seam** at each cell boundary. One *texel* is a texel-denominated bound; left literal it would have made the blend relatively harder-edged as the cell grew. `step = S` holds the seam at the same fraction of a cell, i.e. the same spatial extent. `step = 1` is the literal original and is what scale 1 uses. |
| 5 | terrain heightmap program at 128x128 | `build()` | **S** | **pinned to 1x.** It is not a picture, it is the array `MG.buildTerrain` turns into geometry. Programs 22/23/24/25/26; none is also a surface texture (checked against every descriptor's `groundTexProgA/B`: no overlap). |
| 6 | terrain grid `N` (64 / 128) | descriptor | **S** | **untouched.** `re/REMASTER.md` §4 excludes the terrain grid from tessellation outright, and `MESHGEN_notes.md` §9's un-normalised normals make any change a shading change. See the honest note below. |
| 7 | water stage-1 grey `256x256` | `build()` | **S** | **left.** It is a recolour of `terr.map256`, which is `upsampleHeightmap(hmap128)` — already an interpolation of a 128² field. Re-baking it at 512 would interpolate an interpolation. |
| 8 | curtain texture `256x256` | `buildCurtainTexture` | **S** | **left.** 2 RNG draws per COLUMN off the shared meshgen LCG (changing the count desynchronises everything built after scene 4), and even with the pinned-lattice escape the content is a per-column keep-bit and a per-column integer start-row, so a finer grid reproduces the same image exactly. Zero detail, 4x memory. |
| 9 | tree impostor RTs `512x512` x2 | `bakeImpostors` | **R** | **scaled** to `512*S`. A square perspective render (aspect 1.0) of a fixed subject — pure resolution. Baked twice at load, never per frame. These are the horizon trees at 0x1828. |
| 10 | cloud RTs `256` and `512` | `cloudRenderTargets` | **R** | **scaled** to `256*S` / `512*S`. Both quads are full-target NDC quads through an identity transform; the 256:512 ratio (the noise target is alpha-tested-blitted into the sky target) is preserved. Measured: no frame-time cost. |
| 10b | precipitation RT `64x64` | `build()` — **landed by the scene agent mid-task** | **R**, but **left** | This appeared in `scene7.js` while I was measuring (`desc.flag.precipRenderTarget`, `createRenderTargetTexture(64, 64, false)`). By the principle it is resolution and should follow `RT_SCALE`. I have **not** touched it: it is a brand-new, still-being-verified path belonging to another agent's investigation, and silently quadrupling its resolution mid-diagnosis would inject a variable into their work. Flagged here so it is scaled deliberately, by whoever owns it, once it is settled. |
| 11 | font atlas `2048x512` | `fontgen.js` | **R** | **already scaled** (`ATLAS_SCALE`), and **deliberately capped at 2**, not tied to `?texscale`. At 2x the glyph strip already out-resolves a 640x480 frame; 4x would be an 8192x2048 page (64 MB) for no visible gain, and `baked/tex_2x/11.png` — the no-Times-New-Roman fallback and the regression corpus — only exists at 2x. |
| 12 | flare quad half-size `2.0/640 * 1.5` | `flare.js` | **S** | **left, and correct as it stands.** `flare.js` divides by its own `K.WIDTH = 640`, not by the canvas, so the marker stays 1.5 *original* pixels in NDC at any resolution. Scaling it with the canvas would change the sun's apparent size. Not my file; verified, not modified. |
| 13 | 4x4 occlusion readback | `minid3d8.readbackRect` | **S** | **left, and already handled.** The rect is given in original 640x480 logical pixels and `readbackRect` multiplies by `renderScale` and then samples ONE texel per logical pixel, so 4x4 covers the same solid angle at any canvas size — the sun's visibility test does not get pickier. This is the behaviour the widened brief asked for, already in place. Not my file; verified, not modified. |
| 14 | text batch 2048 verts / 3072 indices | `text.js` / shim | **S** | **no cap exists.** Grepped: the only 2048 in `text.js` is `ONE_OVER_2048`, the atlas u-scale. Nothing to raise. |
| 15 | 2D quads at NDC ±1 | compositor, preloader, blit | — | resolution-independent by construction. Nothing to do. |
| 16 | `D3DFMT_INDEX16` / 65 536 verts | shim | — | not reached: this is textures only, no tessellation (`re/REMASTER.md` §4). |
| 17 | 640x480 backbuffer | `main.js fit()` | **R** | already handled on the remaster path (DPR-driven `setRenderScale`), pinned at 640x480 on the authentic one. Untouched. |

### The honest part: what scaling the ground texture does NOT fix

The owner's note *"the shadow on the landscape is too dark and too coarse"* has two
contributions and this work addresses **one**.

* **Texture detail** — the A and B ground programs (17/18/19/20/27) and therefore the
  grain of the rock and the grass. **Fixed**: 256² -> 512², and this is what the
  0x1828 crops show.
* **The A/B blend mask's resolution** — `W` is a resample of the terrain vertices'
  `normal.y` on the **N x N** grid, N = 64 or 128, and (item 4) it is piecewise
  constant per cell. Its resolution is N, **not** the texture size, so it is exactly as
  blocky at 2x as at 1x. Scaling the texture cannot fix it; only a finer terrain grid
  could, and the terrain grid is excluded from tessellation by
  `re/REMASTER.md` §4 and `MESHGEN_notes.md` §9 (un-normalised normals + the `/W`
  rather than `/(W-1)` UV quirk). **So: expect the rock/grass to get sharper and the
  boundary between them to stay where it is.** Item 4 stops that boundary getting
  *relatively* harder, which is the most that can honestly be done from here.
* The shadow being too *dark* is `FUN_0040e923`, unported (`S = 1.0` here). That is the
  scene agent's item 2 in `REVIEW_FIXES.md`, not this one.

## 8. What it looks like, and what the metric says

Crops at the owner's three positions are in `verify/remaster/` — 1x, 2x and 4x side by
side, nearest-neighbour magnified 3x so what you see is texels, not a resample. All
three variants render into the same 640x480 canvas (headless DPR = 1), so the **only**
variable between the panels is texture resolution.

* `crop_0x1828_the_rocky_ridge.png` — the clearest one. At 1x the ridge is a smear; at
  2x it has stone structure. This is the "rocky parts not ground parts" note.
* `crop_0x1828_foreground_ground.png` — the flat ground the same note excluded; it
  gains too, less dramatically.
* `crop_0x1210_the_island_beach_rock_.png` — the beach. The rock face goes from mush to
  strata.
* `crop_0x0738_the_ridge_and_the_lit_slope.png` — the landscape note. Real but the
  subtlest of the four; this camera is close to the ground and mip level 0 was already
  doing most of the work.
* 2x -> 4x is barely distinguishable in any of them at 640x480.

### Sweep — and read it carefully

`node web-sonnet/test/sweep.mjs` (354 samples, step 8, default cold warm-up, **no
`--seq`**):

| run | median | mean | p75 | p90 | over 60 |
|---|---|---|---|---|---|
| `--quality=original` | 26.94 | 28.92 | 35.96 | 55.93 | 26 |
| `--quality='remaster&texscale=1'` | 26.16 | 28.21 | 34.92 | 55.56 | 26 |
| `--quality=remaster` (**2x, the new default**) | **26.33** | **28.31** | 34.48 | 53.29 | 26 |

All three are post-droplet (§5b), so they are comparable with each other and with
nothing generated before ~16:00. `?texscale=N` is passed through the harness as
`--quality='remaster&texscale=N'`, which lands in the query string intact — no change
to `sweep.mjs` was needed or made.

The row that answers the question is **remaster 1x vs remaster 2x**, because those two
differ in *nothing* but texture resolution (same canvas, same 2x atlas, same
everything else). Per scene, `2x minus 1x`:

| scene | n | mean Δ | median Δ |
|---|---|---|---|
| title / poem | 32 | 0.000 | 0.000 |
| scene 0 — spires | 24 | +0.013 | +0.010 |
| scene 1 — lakes | 24 | +0.019 | +0.010 |
| scene 2 — trees/butterflies | 40 | +0.469 | +0.480 |
| scene 3 — cloud sea | 24 | +0.068 | +0.010 |
| **scene 4 — beach / sunset** | 40 | **−0.116** | 0.000 |
| scene 5 — autumn forest | 56 | +0.220 | +0.020 |
| scene 7 — winter | 40 | +0.124 | +0.100 |
| scene 8 — finale | 64 | +0.013 | 0.000 |

**The brief predicted RMSE would get slightly worse and it does — by about a tenth of
an RMSE point overall**, with the beach actually improving. That is far smaller than
the effect I expected: a 640x480 capture of a 2001 CRT simply cannot resolve the
difference between a 256² and a 512² texture on a surface that is being minified
anyway, so the metric has almost nothing to say either way.

**I am relying on the eye here, not the metric**, and saying so plainly: the metric's
verdict is "no measurable change", which is a licence rather than an endorsement. The
crops are the evidence. What the metric *does* usefully prove is the negative — that
nothing regressed, no scene fell apart, `over 60` moved by one sample, and the worst
case (0x0710) is unchanged to two decimals.

## 9. Files changed

| file | what |
|---|---|
| `web-sonnet/js/scene7.js` | `setTexScale` / `getTexScale` / `getRtScale`, scale-keyed texgen cache, `dataTextureIds()`, `texturePlan()`, `bakeGroundTexture(..., size, step)`, RT scaling, the heightmap pin, decision comments at the two sites that stay 256² |
| `web-sonnet/js/assets.js` | `warmTextures` takes a plan of `{id, scale}` |
| `web-sonnet/js/main.js` | `?texscale=1\|2\|4`, `?quality=original` forces 1, `setTexScale` called before the pre-warm |
| `js/texgen.mjs` | **unchanged** — it was already resolution-independent; that was the whole finding |
| `verify/remaster/` | the crops, plus the two harness scripts that made them |

## 10. The tree impostors — scaled, but NOT fixed

`re/scenes/REVIEW_FIXES.md` §3 (the scene agent, mid-task) finds that the impostor
bake **overflows its render target**: `MG.buildTree` gives a canopy radius of ~117
where the impostor camera at z = −150 with a 45° half-angle can only hold ~75, so the
baked "tree" is a solid slab of foliage with no trunk and no margin.

**My RT scaling neither causes nor fixes that, and I am not claiming the owner's
horizon-tree notes as addressed.** Two things were checked, because a resolution
change landing on top of an open geometry fault is exactly where a new variable gets
injected into someone else's investigation:

1. **Can the scaling change the framing?** No, structurally: the projection is
   `perspectiveFovLH(PI/2, **1.0**, 1.0, 1000.0)` — the aspect is a literal, not
   derived from the target — and `beginRenderTarget` takes the viewport from the
   target's own dimensions. Size is the only thing that changes.
2. **Does it make the overflow worse?** Measured, by reading the live RTs back out of
   the GL context at both scales (`verify/remaster/`-adjacent harness in the
   scratchpad; α ≥ 128 counted as opaque):

   | impostor | coverage 1x | coverage 2x | left edge | right edge | bottom edge |
   |---|---|---|---|---|---|
   | set 0, angle 0 | 49.32 % | 50.06 % | 3.7 → 4.2 % | 11.5 → 13.5 % | 15.8 → 16.0 % |
   | set 0, angle 1 | 42.96 % | 43.66 % | 28.5 → 29.9 % | 3.7 → 4.0 % | 0 → 0 % |
   | set 1, angle 0 | 21.63 % | 21.64 % | 0 | 0 | 0 |
   | set 1, angle 1 | 25.89 % | 25.89 % | 0 | 0 | 2.3 → 2.1 % |

   Coverage moves by at most **0.74 points** and the *edges the silhouette runs off*
   are unchanged — the sub-point rise is a finer-resolved silhouette edge passing the
   alpha test, nothing else. This also independently reproduces the scene agent's
   diagnosis: set 0 is ~49 %/43 % opaque and runs off the left, right and bottom
   borders, which no correctly-framed tree impostor would do.

So the impostor is **sharper**, not **fixed**. Once the canopy radius is corrected the
scaling will be worth having; until then it makes a crisper slab. The code comment at
`bakeImpostors` says so explicitly, so nobody reads the scaling as a fix.
