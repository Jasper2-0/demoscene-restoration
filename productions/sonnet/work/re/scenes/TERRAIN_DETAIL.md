# Terrain detail map — why the ground reads as bilinear mush

Live investigation log. Appended as findings land (agents on this project keep
dying to infrastructure stalls, so nothing here is batched).

## Finding 1 — WITHDRAWN. It was a probe bug, not a port bug. (2026-08-05)

**Retracted in full — see Finding 2.** The probe below stored a *reference* to
the live `d3d.tss[1]` object and only serialised it after the whole frame had
finished, so what it printed was the post-`unapplyMaterial` end-of-frame state,
not the state at the draw. Re-run with the stage state read *inside* the draw
call, stage 1 is `D3DTOP_MODULATE (4)` with the 1024^2 detail map bound, exactly
as the material's 0x08 bit asks. Left here as a record of the false lead.

## Finding 1 (as originally written — WRONG, see above)

Instrumented `DrawIndexedPrimitiveUP` with a temporary probe and dumped the
device's texture-stage state at the terrain draw, `?pos=0x0738&quality=remaster`,
1280x960:

```
nv=4096 np=7938   (two identical draws)
tss0: COLOROP=4(MODULATE) ARG1=2(TEXTURE) ARG2=0(DIFFUSE)
      ALPHAOP=4          ARG1=2          ARG2=0
      TEXCOORDINDEX=0  TTFF=0  ADDRESS=WRAP/WRAP  MAG/MIN/MIP=LINEAR
tss1: COLOROP=1(**D3DTOP_DISABLE**) ARG1=2 ARG2=1(CURRENT)
      ALPHAOP=1(**DISABLE**)        ARG1=2 ARG2=1
      TEXCOORDINDEX=1  TTFF=0  ADDRESS=WRAP/WRAP  MAG/MIN/MIP=LINEAR
tex0 = 512x512 (groundTex, 2x remaster)
tex1 = 1024x1024 (texgen program 16, DETAIL, 2x remaster)  <- BOUND BUT INERT
uv0 range 0 .. 0.984      uv1 range 0 .. 15.75   (16x tiling, as intended)
x,z range -128 .. 124
```

So everything the task listed as "already established" is true and correct —
the FVF carries uv1, `buildTerrain` tiles it 16x, `TEXCOORDINDEX` for stage 1
is 1, the 1024^2 detail texture is created and bound — and then the combiner
throws it away. `minid3d8.js`'s fragment shader gates stage 1 on
`ST_COLOROP(1) != 1`, so with COLOROP = DISABLE the second texture is never
sampled at all. The ground is base texture x vertex diffuse and nothing else.

That is exactly the reported symptom: uv0 spans 0..0.984 across the whole
terrain, i.e. ONE tile of a 512^2 texture over 256x256 world units, ~2 texels
per world unit. Up close that is bilinear magnification of a handful of texels
across the screen — mush — and the detail map that exists precisely to fix it
is switched off.

Not a texcoord-routing bug, not a mip/LOD bug, not a flat texgen program:
suspects 1, 3 and 4 are cleared. This is suspect 2/5 territory — the combiner
op. Next: find who leaves stage 1 on DISABLE despite the material's 0x08 bit.

## Finding 2 — the wiring is all correct; measured at the draw (2026-08-05)

Re-instrumented by wrapping `applyMaterial` / `setStage1Op` /
`SetTextureStageState` / `DrawIndexedPrimitiveUP` on the device prototype and
reading the state *synchronously inside* the draw. `?pos=0x0738&quality=remaster`:

```
applyMaterial flags=0x18 t1=1024
  setStage1Op(2)
    TSS(1,COLOROP,4)      <- D3DTOP_MODULATE
    TSS(1,ALPHAOP,4)
  DRAW nv=4096 tss1.COLOROP=4 tex1=1024
applyMaterial flags=0x1050 t1=null        (something else)
applyMaterial flags=0x18 t1=1024          (the terrain overlay pass, 0xc018 path)
  setStage1Op(2)
    TSS(1,COLOROP,4)
  DRAW nv=4096 tss1.COLOROP=4 tex1=1024
```

and from the first probe (whose per-draw *vertex* and *texture* readings were
fine — only the tss snapshot was stale):

```
tex0 = 512x512  (groundTex, 2x)      uv0 range 0 .. 0.984   (1x tiling)
tex1 = 1024x1024 (texgen prog 16)    uv1 range 0 .. 15.75   (16x tiling)
TEXCOORDINDEX: stage 0 -> 0, stage 1 -> 1
TTFF: 0 / 0 (no sphere map)          ADDRESS: WRAP/WRAP on both stages
MAG/MIN/MIP: LINEAR/LINEAR/LINEAR on both stages
terrain x,z span -128 .. 124  (256 world units)
```

So: suspect 1 (texcoord routing) — clear. Suspect 2 (combiner op) — clear,
MODULATE as documented. Suspect 5 (stage leakage) — clear. The detail map is
sampled, with its own texcoord set, wrapped, tiled 16x, mip-filtered trilinear.

Which leaves suspect 3 and suspect 4, and they turn out to be the same problem.

## Finding 3 — the detail map IS drawn, and it IS what makes the grain (2026-08-05)

A/B at 1280x960, `quality=remaster`: render normally, then re-render with the
terrain material's stage 1 forced off (`texture1 = null`, flag bits 0x0c
cleared), via a prototype patch on `applyMaterial`. Difference between the two
frames, and mean |Laplacian| of luminance inside a 320x240 foreground-ground
crop:

| pos | detail contribution RMSE (whole / bottom third) | crop mean\|Laplacian\| with / without detail |
|---|---|---|
| 0x0738 | 7.24 / 9.46 | 7.83 / 6.42 |
| 0x1210 | (not measured — see note) | 6.33 / 6.33 |
| 0x1828 | 5.61 / 6.47 | **5.21 / 0.71** |

At 0x1828 the detail map supplies essentially ALL of the ground's
high-frequency content (0.71 without it — the base texture alone is completely
flat there at that camera distance). So the mechanism works.

Note on 0x1210: the A/B matched on `flags === 0x18 || 0xc018` and missed it,
because scene 4 has water and `scene7.js:1092` does
`terrainMesh.material.flags |= 0x4000` -> **0x4018**. Harness artefact, not a
port bug; the trace shows `applyMaterial flags=0x4018 t1=1024 / setStage1Op(2) /
TSS(1,COLOROP,4) / DRAW nv=4096`. (0x1210 is the island seen from ~far away
anyway, where the detail map is many mip levels down and contributes nothing
visible either way.)

## Finding 4 — against the reference, OUR grain is too fine and too weak

`reference/sonnet_ref.mkv` at 259.468 s (= 0x1828 + 2.43 s lead + settle), the
foreground hill: the original has **obvious, coarse, high-contrast mottling**
over the whole hill. Ours at the same moment has a faint fine grain that reads
as smooth. Same camera, same hill, unmistakable side by side. So this is NOT
"the original also looked like this" — the original's ground was visibly
grainier than ours.

## Finding 5 — where the detail goes: the remaster scale applied to a TILED map

Program 16 (`TEX.DETAIL`) decodes to exactly two instructions:

```
op 16  mask 7  slot 0  args {0: 25, 1: 198}   ; additive white noise, srand(198),
                                              ;   += sqrt(25/255)*rand()/32767
op 10  mask 7  slot 0  args {0: 205}          ; INVERT all four channels
```

so the whole 512x512 texture is one uniform random value per texel, inverted:
luminance in [175, 255], mean 214.6, sd 23.0, and mean |horizontal neighbour
difference| 26.6 — for uniform noise over a range of 80 the expected value is
80/3 = 26.7, i.e. it is *exactly* white noise, uncorrelated texel to texel, with
no blur and no structure of any kind.

**Its only feature IS the texel grid.** Resolution therefore cannot sharpen it.
Baking it at S can only halve the grain's size, S times over. Measured:

| scale | size | sd | mean \|dx\| | 2x2 horizontal pairs identical |
|---|---|---|---|---|
| 1 | 512^2 | 23.05 | 26.603 | 809 / 65536 (chance) |
| 2 | 1024^2 | 23.05 | 26.588 | 3214 / 262144 (chance) |

— i.e. at 2x the field is regenerated as fresh per-texel noise on the finer
grid, NOT block-replicated. That is `js/texgen.mjs`'s `noise` default, which was
deliberately changed from `pinned` to `native` on 2026-08-05 (the comment at
`js/texgen.mjs:1170` explains why: pinned looked like a mosaic in
`baked/tex_2x/2.png`). For a 1x-tiled surface texture that decision is right.

For THIS texture it is fatal, because of the tiling. `buildTerrain` sets
`u1Tile = v1Tile = K.TERRAIN_UV1 = 16.0` (`[0x418f0c]`) and the terrain spans
256 world units (probe: x,z = -128..124), so one detail texel covers

    1x:  16 / 512  = 0.031 world units
    2x:  16 / 1024 = 0.016 world units

A 16x-tiled noise map is *already* at the edge of what the screen can resolve at
1x. Halving it puts it under one pixel over almost the whole ground, the
trilinear mip chain averages white noise straight to its mean, and MODULATE by a
constant 214/255 is a flat 0.84 tint — chroma and contrast unchanged, detail
gone. That is the "bilinear filtered mush", and it is ours, not the original's.

Note the direction of the trap: the 2x bake is *more* faithful to "generate
noise at the canvas resolution" and *less* faithful to what the screen shows.
The remaster's own rule (`re/REMASTER.md` §3, and TEXGEN_PORT.md §14's pinning
argument) would have caught it; the 2026-08-05 default flip removed the guard
for every program, including the one place tiling made it load-bearing.

## Fix

`web-sonnet/js/scene7.js` only. Program 16 is pinned to scale 1 at both of its
two use sites — the terrain material (`flags 0x18`) and the terrain cross-fade
overlay (`flags 0xc018`) — plus a matching entry in `texturePlan` so the
pre-warm bakes it once, at 1, instead of baking a 1024^2 nobody uses and then a
512^2 lazily during `build()`:

```js
const TILED_DETAIL_TEX = new Set([TEX.DETAIL]);
// texturePlan: scale = (data.has(id) || TILED_DETAIL_TEX.has(id)) ? 1 : TEX_SCALE
// both material sites: texgenTexture(d3d, TEX.DETAIL, 1)
```

Scoped deliberately narrowly:

* NOT a revert of `js/texgen.mjs`'s `noise: 'native'` default. That default is
  correct for every 1x-tiled texture and the mosaic complaint that motivated it
  is real. It is TILING, not noise, that turns resolution into frequency.
* `noise: 'pinned'` at scale 2 would give the same world-space grain (each cell
  becomes a 2x2 block), so it is an equivalent fix — but for a texture that is
  pure noise it stores 4x the texels to represent identical information, and
  block-replication makes the magnified cell edges harder than the 512 map's
  bilinear interpolation between cells. Scale 1 is both simpler and literally
  what the original shipped.
* `K.TERRAIN_UV1 = 16.0` is an authentic constant from `[0x418f0c]` and
  `js/meshgen.mjs` is off-limits; the tiling is not the thing to change.

### Measured effect

mean |Laplacian| of luminance over a 320x240 foreground-ground crop, 1280x960,
`quality=remaster` (detail map on / forced off):

| pos | before (1024^2) | after (512^2) | detail off |
|---|---|---|---|
| 0x0738 | 7.83 | **10.85** | 6.42 |
| 0x1828 | 5.21 | **3.76** | 0.71 |

The two move in opposite directions and both are the fix working. At 0x0738 the
ground is at middle distance: before, the 2x grain was entirely below the mip
threshold and the crop was featureless; after, the grain resolves and HF rises
69 %. At 0x1828 the ground is near: before, the 2x grain was resolving but as
near-single-pixel speckle, which is what a Laplacian scores highest; after, the
grain is twice as coarse, so |Laplacian| falls even though the *visible*
texture is stronger. Judge that one by eye and against the reference, not by the
number — which is exactly the warning in the brief about metrics here.

### Against the reference

`reference/sonnet_ref.mkv` at 259.468 s vs our 0x1828, matched crops of the
foreground hill at equal magnification (ref 240x180 @4x, ours 320x240 @3x):

* ref: coarse mottled grain, clearly visible over the whole hill.
* before (1024^2): finer, sparser, reads as smooth.
* after (512^2): coarse mottled grain, matching the reference's scale and
  character.

This is the load-bearing evidence. The RMSE sweep cannot see it — the reference
is a 640x480 capture of a CRT and this is a 2-3 pixel feature — so the reference
comparison is done by matched-magnification crop, by eye, at the one position
where the camera is close to the ground and both frames show the same hill.

## Finding 6 — the remaining softness: anisotropy (authentic, but a lever)

With the detail map back at its authentic world scale, the ground is still
soft *into the distance*, and that part is authentic. Sonnet never touches
`D3DTSS_MAXANISOTROPY` (D3D8_API.md §5's per-stage census — the only stage
states it ever sets are COLOR/ALPHA op+args, TEXCOORDINDEX,
TEXTURETRANSFORMFLAGS, ADDRESSU/V and MIN/MAG/MIPFILTER), so the original ran
plain trilinear and had exactly this falloff. The shim reproduces it.

But trilinear selects its mip from the LARGER axis of the pixel footprint, and
the terrain is drawn at a grazing angle, so it is the worst case for it: the
16x-tiled detail map collapses to its mean only a short distance in front of
the camera no matter how coarse the grain is.

Measured (`?pos=0x1828&quality=remaster`, forcing `TEXTURE_MAX_ANISOTROPY_EXT`
on every sampler at bind time; the machine reports MAX = 16): the grain stays
resolved several times further out, and the distant rock ridge sharpens with
it. It is the single biggest remaining lever on "the ground looks soft".

Wired as **opt-in, default off**, in `minid3d8.js`:
`new MiniD3D8(canvas, { anisotropy: N })`. `_samplerFor` applies it only to
mip-filtered samplers; `N = 1` (the default) is byte-for-byte the previous
behaviour, and `?quality=original` must keep it. Verified: the option builds a
valid sampler at N = 1 and N = 16 with `gl.getError() == 0`, and
`minid3d8_test` is 116/116.

Nothing turns it on — that needs one line in `main.js`, which this agent does
not own:

```js
const d3d = new MiniD3D8(canvas, { anisotropy: AUTHENTIC ? 1 : 16 });
```

That is a look decision (it is NOT what the original did), so it is left to the
project owner.

## What is authentic and what was ours

* **The 2x detail map was ours** — a remaster regression, introduced when the
  texture-scale knob was applied uniformly. Fixed.
* **The base ground texture being soft up close is authentic and already
  improved.** `groundTex` is 1x-tiled over the whole 256-unit terrain: 256^2 in
  the original, 512^2 now, so ~0.5 world units per texel. Nothing at that
  density can be sharp with the camera a few units off the ground; the detail
  map is the original's answer and it is now doing its job again. Raising
  `?texscale` to 4 would sharpen the base further (and, with this fix, would
  *not* re-break the detail map, because program 16 is now pinned).
* **The falloff with distance is authentic** (no anisotropy in 2001).
* **The remaining per-pixel softness is authentic**: the whole ground is one
  512^2 base texture plus one white-noise detail map. There is no more signal
  in the original's data than that.

## Verification

* `minid3d8_test` 116/116; `meshgen_test` 369/369; `integration_test`,
  `timeline_test`, `text_test`, `generate_test` all ALL PASS.
* `?quality=original` is untouched by construction: at `TEX_SCALE = 1`,
  `texgenTexture(id, 1)` is the identical cache entry the old call produced,
  `texturePlan` already returned 1 for everything, and `anisotropy` defaults
  to 1.
* Sweep at `--quality=remaster --tag=terrdetail`. Expect no meaningful metric
  movement: the reference is a 640x480 CRT capture and this is a 2-3 pixel
  feature at 1280x960. **The load-bearing evidence is the matched-magnification
  crop comparison in Finding 4, not the sweep.**

### Sweep (2026-08-05)

`node web-sonnet/test/sweep.mjs --quality=remaster --tag=terrdetail`, 354
samples, against `verify/results_groundmask.json` — the immediately preceding
remaster-quality full sweep, i.e. this change and nothing else.

| | median | mean | p25 | p75 | p90 | <10 | <20 | <40 | >60 | worst |
|---|---|---|---|---|---|---|---|---|---|---|
| before (groundmask) | 27.55 | 28.21 | 15.91 | 34.84 | 54.74 | 45 | 109 | 292 | 23 | 74.39 @0x1408 |
| after (terrdetail)  | 27.56 | 28.22 | 15.92 | 34.84 | 54.75 | 45 | 109 | 292 | 23 | 74.39 @0x1408 |

No movement, in either direction, anywhere in the distribution — which is the
expected and honest result. A 2-3 pixel grain at 1280x960 compared against a
640x480 CRT capture is far below what this metric can see; the sweep's job here
is only to prove nothing else broke, and it does. **The evidence for the fix is
the crops.**

### Crops

Written to the session scratchpad (`.../scratchpad/tshots/`):

* `MONTAGE_1828.png` — before (1024^2) | after (512^2) | reference, matched
  magnification. The one that settles it.
* `MONTAGE_0738.png` — before | after. Mid-distance ground: featureless before,
  grain resolves after.
* `MONTAGE_1210.png` — before | after | reference. The distant island:
  indistinguishable before and after, correctly — the detail map is many mip
  levels down at that range either way. Confirms the fix costs nothing at
  distance.

### Unrelated observations noticed while doing this, NOT acted on

* At 0x0738 our camera does not match the reference's: ours is looking at a
  lake that the reference frame does not show at all. Same scene, same hills,
  different point on the path. Worth someone checking the scene-1 camera
  timing.
* At 0x1210 the beach strip below the island blows out to pure white in ours;
  the reference keeps it sandy.

### `?quality=original` regression sweep

`node web-sonnet/test/sweep.mjs --tag=terrdetail_orig` (default quality =
original), 354 samples: median **27.13**, p10 8.02, p25 15.29 — identical to
`results_fixfull.json` (18:15), the last original-quality full sweep. Its mean
and tail differ (28.15 vs 29.18; worst 74.43 @0x1408 vs 118.98 @0x0710) because
the GROUND_MASK work landed in between; those positions are that change, not
this one.

The authentic path is unchanged by construction, and each step is checkable:

* `cacheKey(16, 1) === 16`, the same key the old `texgenTexture(d3d, TEX.DETAIL)`
  produced when `TEX_SCALE === 1` — literally the same cached handle.
* `texturePlan` returns 1 for every id when `TEX_SCALE === 1`, with or without
  the new `TILED_DETAIL_TEX` term.
* `opts.anisotropy` defaults to 1, so `_samplerFor` never calls
  `samplerParameterf` and the sampler objects are bit-identical.
