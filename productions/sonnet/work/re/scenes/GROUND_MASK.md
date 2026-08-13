# The ground blend mask — making it scale with resolution

Work log, appended as I go (2026-08-05). Companion to `GROUND_TEXTURING.md`, which
states the problem: `bakeGroundTexture`'s blend weight `W` is the terrain's vertex
`normal.y` bilinearly resampled from the N×N vertex grid, so it has exactly N² real
values however large the output texture is. `texA`/`texB` scale with the remaster; `W`
does not, and `W` is what the eye reads as "the landscape texture".

## 0. Reading the machine first — where does `normal.y` actually come from?

Chain, all confirmed by reading the ported code:

```
texgen prog 23 (128×128, values 0..255)          js/scene7.js  desc.heightmapTexProg
  -> MG.upsampleHeightmap()   2× bilinear  ->  map256   (256×256)
  -> MG.downsampleHeightmap(map256, N)      ->  heights  (N×N, integer box mean)
  -> MG.buildGrid({W:N,H:N, extX=extZ=128, heightScale=256, heightArray:heights})
       -> mesh.computeNormals()             ->  vertex normal.y   == W's source
mesh.scale = desc.terrainScale                 <-- APPLIED AS A WORLD MATRIX, LATER
```

**First real finding: `terrainScale` does not enter the normal at all.**
`buildGrid` calls `computeNormals()` on the *object-space* positions, and
`mesh.scale = scaleVec.slice()` is assigned afterwards, in `buildTerrain`. So the
brief's worry about "(3, 0.5, 3) — x/z spacing versus y amplitude" is answered: the
mask is computed in a space where the grid spacing is `256/N` and the height
amplitude is `heights·256/255`, with **no** `terrainScale` anywhere. Whatever I
derive must use those object-space units, not world units.

Object-space grid geometry (`buildGrid` with the terrain's arguments):

```
x(c) = (c/N)·128·2 − 128     ->  spacing  h = 256/N   (h = 4 at N=64, 2 at N=128)
z(r) = (r/N)·128·2 − 128     ->  spacing  h = 256/N
y(r,c) = heights[r·N+c] · (1/255) · 256
```

(the `/N` rather than `/(N−1)` is the original's documented off-by-one; it makes the
grid span `[−128, 128−h]`, and the ground texture is aligned to it.)

## 1. The derivation — what `normal.y` from `FUN_004045f1` actually IS

`buildGrid` emits, for quad `(R,C)`:

```
tri A = (R,C), (R+1,C), (R+1,C+1)
tri B = (R+1,C+1), (R,C+1), (R,C)
```

`computeNormals` (`FUN_004045f1`) does, per face,
`e1 = P[i1]−P[i0]`, `e2 = P[i2]−P[i0]`, `fn = unit(−cross(e1,e2))`, accumulates
`fn` into each of the three vertices with an unweighted `+1.0` count, and finishes
with `v *= −1/count`. The two negations cancel, so

```
vertex normal = (1/count) · Σ  unit( cross(e1,e2) )
```

Now substitute the grid. With `P(r,c) = (h·c + x0, Y[r][c], h·r + z0)`:

**tri A** — `e1 = (0, a, h)`, `e2 = (h, b, h)` where `a = Y[R+1][C] − Y[R][C]`,
`b = Y[R+1][C+1] − Y[R][C]`:

```
cross(e1,e2) = ( h(a−b),  h²,  −a·h )  =  h² · ( −fx, 1, −fz ),   fx = (b−a)/h,  fz = a/h
```

**tri B** — `e1 = (0, p, −h)`, `e2 = (−h, q, −h)` where `p = Y[R][C+1] − Y[R+1][C+1]`,
`q = Y[R][C] − Y[R+1][C+1]`:

```
cross(e1,e2) = ( h(q−p),  h²,   p·h )  =  h² · ( −fx, 1, −fz ),   fx = (p−q)/h,  fz = −p/h
```

**Both triangles of every quad give `cross(e1,e2) ∝ (−fx, 1, −fz)` with a strictly
positive `y`** — `fx, fz` being the triangle's own planar gradient of the height
field. So every unit face normal is `(−fx, 1, −fz)/√(1+fx²+fz²)`, and therefore

> ### `normal.y  =  mean over the incident faces of  1/√(1 + fx² + fz²)`
>
> i.e. the **unweighted arithmetic mean of the per-face `cos(slope)`**.

Two things fall out that matter for the brief's warning:

* **The `y` component is not affected by the un-normalised magnitude in the way one
  might fear.** `|n| < 1` at a crease because the *horizontal* components partially
  cancel; the `y` components never cancel — they are all positive — so `n.y` is
  exactly a mean of cosines, with no cancellation and no hidden scale factor. That
  is why this is calibratable at all.
* **It is NOT the central-difference normal's `y`.** `1/√(1+f̄x²+f̄z²)` evaluated on
  the *averaged* gradient is a different number from the *average* of
  `1/√(1+fx²+fz²)` over six faces (Jensen: the mean of the concave-in-|f| function
  is ≤ the function of the mean, so the face mean is systematically the **darker**
  / rockier of the two). Substituting a central-difference normal would have moved
  the sand/rock boundary. It has to be the **face mean**.

An interior vertex `(r,c)` has exactly **6** incident faces:
`quad(r,c)` A and B, `quad(r−1,c−1)` A and B, `quad(r−1,c)` A, `quad(r,c−1)` B.
Edge vertices simply have fewer (the mesh has no wrap), which the formula
reproduces by skipping non-existent quads — the same thing the mesh does.

### Calibration — the derived formula against the real mesh, at the N×N points

Evaluated at every one of the N² grid nodes and diffed against the vertex buffer's
actual `normal.y` (`re/scenes/GROUND_MASK` harness). No fudge factors, no fitting:

| scene | N | terrainScale | hm prog | mean \|residual\| | max \|residual\| |
|---|---|---|---|---|---|
| 0 | 64 | (4, 1.5, 4) | 23 | 3.246e−8 | 1.055e−6 |
| 1 | 64 | (3, 0.5, 3) | 23 | 3.246e−8 | 1.055e−6 |
| 4 | 64 | (3, 0.5, 3) | 25 | 2.962e−8 | 9.814e−7 |
| 7 | 128 | (3, 1.6, 3) | 22 | 5.486e−8 | 6.235e−7 |
| 8 | 128 | (2, 1, 2) | 26 | 7.687e−8 | 1.718e−6 |

float32 eps is 1.19e−7; the mesh accumulates six `fround`ed terms and then divides,
so a max residual of ~1e−6 is exactly float-error and the mean of ~3e−8 is well
below one ulp. **The closed form is the mesh's normal.y.** (The harness computes in
float64 deliberately — matching the float32 rounding too would have hidden a real
disagreement behind coincidental cancellation.)

Note also: `terrainScale` really is absent from the whole derivation, confirmed
numerically — scenes 0 and 1 share a heightmap and grid but have different scales
`(4,1.5,4)` vs `(3,0.5,3)`, and their residuals are *identical to every digit*.

## 2. The construction — a pinned height field, the mesh's own stencil

Knowing what `normal.y` *is*, the mask can be evaluated anywhere. Two choices decide
whether the result is a remaster or a re-authoring.

### 2a. The stencil footprint stays one terrain cell

The derived formula reads the height field at `±h` (one grid cell, `h = 256/N` object
units). That footprint is the *spatial extent of the operator*, and shrinking it to the
texel spacing would measure sub-cell roughness instead of the slope the original
measured — `f = Δy/h` blows up as `h` shrinks, `1/√(1+f²)` collapses, and the whole
mask goes dark/rocky. Measured: with the stencil shrunk to ¼ cell, scene 7's mean `W`
swings by −2.0 % and its total variation goes up 6.6× — that is not a sharper boundary,
it is noise.

This is the same decision, for the same reason, as `REMASTER.md` §3 (scale the texgen
convolution kernel's *radius* so the operator keeps its spatial extent) and as the
`step = S` seam rule already in `bakeGroundTexture`. **Footprint fixed at one cell,
evaluation density raised to one sample per texel.**

Because the stencil offset is exactly `cell = size/N` texels, every stencil tap lands on
the output texel lattice — so the fine height field is built once as a `size × size`
array and the mask is nine array reads per texel. No resampling in the inner loop.

### 2b. The height field is PINNED to the mesh's own heights

```
Y(x,y) = B(x,y)  +  [ M(x,y) − Bilinear(M|nodes)(x,y) ]
```

* `B` = bilinear interpolation of the mesh's `N×N` `heights` array. Exact at the nodes.
* `M` = `map256` (the 256×256 field the mesh's heights were box-averaged *from*),
  resampled into texel coordinates with the block-centre offset `(mstep−1)/2`, i.e.
  `m = x·(mstep/cell) + (mstep−1)/2`, `mstep = 256/N`. Without that offset the detail
  sits ⅜ of a cell off the geometry it is supposed to describe.
* The bracket is a **detail residual that vanishes identically at every node**, so
  `Y(node) == heights[node]` exactly.

Same idea as the texgen's `pinned` noise and the DCT upsampler on the sibling project:
reproduce the original sample points exactly, add information only between them.

**Consequence, and it is the whole ballgame:** at a node texel the nine stencil taps are
exactly the mesh's own nine neighbouring vertex heights, so by §1 the fine mask *is* the
mesh's `normal.y` there. The rock/sand assignment cannot move at the nodes — it is
pinned to the original mask's own values — and between nodes it interpolates through
the real terrain instead of through a box fill.

### Measured — node agreement and global drift

`nodeErr` = |fine mask at texel `(c·cell, r·cell)` − mesh `normal.y` at node `(r,c)`|,
over all interior nodes. `meanW` is the mask's global mean (the sand/rock balance).
`TV` is mean |Δ| between horizontally adjacent mask texels.

| scene | N | size | nodeErr mean | nodeErr max | meanW orig → new | TV orig → new |
|---|---|---|---|---|---|---|
| 1 | 64 | 256 | 3.14e−8 | 1.03e−6 | 0.41925 → 0.42028 (+0.25 %) | 2.334e−2 → 2.800e−2 |
| 1 | 64 | 512 | 3.14e−8 | 1.03e−6 | 0.41903 → 0.42042 (+0.33 %) | 1.171e−2 → 1.495e−2 |
| 1 | 64 | 1024 | 3.14e−8 | 1.03e−6 | 0.41893 → 0.42018 (+0.30 %) | 5.865e−3 → 7.480e−3 |
| 4 | 64 | 256 | 3.19e−8 | 9.92e−7 | 0.75351 → 0.76024 (+0.89 %) | 1.728e−2 → 1.454e−2 |
| 7 | 128 | 256 | 4.84e−8 | 3.25e−7 | 0.90410 → 0.91725 (+1.45 %) | 1.598e−2 → 2.382e−2 |
| 7 | 128 | 512 | 4.84e−8 | 3.25e−7 | 0.90320 → 0.91314 (+1.10 %) | 8.172e−3 → 1.683e−2 |
| 8 | 128 | 256 | 6.16e−8 | 1.70e−6 | 0.47728 → 0.48261 (+1.12 %) | 3.449e−2 → 3.885e−2 |
| 8 | 128 | 512 | 6.16e−8 | 1.70e−6 | 0.47681 → 0.48462 (+1.64 %) | 1.741e−2 → 2.340e−2 |

**nodeErr is float error at every size** — same order as the §1 calibration residual.
The placement is provably unmoved at the N² points the original actually defined.

The detail residual is also what keeps the *global* balance honest. Dropping it (pure
bilinear `B`, no `M` term) leaves a field that is too smooth between nodes and reads as
flatter: scene 1's mean `W` then drifts **+4.2 %** (0.41925 → 0.43692) instead of
+0.25 %. So the extra detail is not decoration — it is what stops the terrain from
turning sandier.

### 2c. Rejected: generating the heightmap at a higher texgen scale

The obvious "more information" route is to run the heightmap program at `scale = 2`
instead of upsampling `map256`. **Measured and rejected: the heightmap programs are not
pinned-reproducible.** `runTexgen(prog, {scale:2})` sampled at `2p` versus
`runTexgen(prog)` at `p`, mean |Δ| out of 255:

| scene | prog | mean | max |
|---|---|---|---|
| 1 | 23 | 18.41 | 82 |
| 7 | 22 | 4.18 | 16 |
| 8 | 26 | 60.54 | 220 |

That is a *different landform*, not a finer one — it would move mountains, literally.
And it buys nothing anyway: total variation per texel of the 2× texgen output is
2.62 vs `map256`'s 2.87 in scene 1. `map256` — which the mesh's own heights are the box
average of — is the correct and the only defensible detail source.

**Honest ceiling:** the mask's information therefore tops out at `map256`, i.e. 256×256.
At `size = 256` that is 4× the old mask in scene 1 (2× linear) and 2× in scenes 7/8.
Beyond `size = 256` the mask gets smoother-resolved but not more informative — the
`texA`/`texB` grain keeps scaling, the mask does not. That is a real limit and it is
stated here rather than glossed.

## 3. The wiring

`bakeGroundTexture` keeps its signature and gains a seventh argument:

```js
bakeGroundTexture(terrainMesh, N, texA, texB, size = 256, step = 1, opts = {})
//   opts.terrain  = MG.buildTerrain()'s result -> fine mask.  Absent -> the original.
```

The call site passes `{ terrain: terr }` only when `TEX_SCALE > 1`. That is the only
remaster signal this module has, and it is exactly the condition `?quality=original`
forces to false (`main.js`: `?quality=original` wins over `?texscale` unconditionally
and pins the scale to 1). As a side benefit `?texscale=1` on the default path is now
also a byte-identical fallback, so the regression guard has a second way in.

The `size % N` guard is **still meaningful on both paths**, and more so: the authentic
path needs integer cell arithmetic, and the fine path needs `cell` to be a whole number
of texels because `cell` *is* its stencil offset — that is what makes the taps land on
the vertex nodes and gives the pinning.

The x87 accumulation order at 0x40e4e9 is untouched; the fine path is a sibling branch,
not a replacement, and the authentic branch's four lines are character-for-character
what they were.

### Byte-identity of the authentic path — all 9 descriptors

sha256 (first 16 hex) over the raw `Uint32Array` of the baked ground texture, against
the values recorded in `re/REMASTER_WIRING.md` §5 **before** this change:

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
ALL 9 BYTE-IDENTICAL
```

`bakeGroundTexture(...)` and `bakeGroundTexture(..., {})` were also compared byte-for-byte
so the new default parameter cannot smuggle anything in.

## 4. Before / after — what actually changed

Object → sceneIdx is `object − 3` (`scene4.js` = sceneIdx 1, `scene7.js` = 4,
`scene8.js` = 5).

### 4a. The baked texture itself — this is the clearest evidence

`verify/groundmask_tex_scene1.png` (and `_scene4.png`), a 128×128 crop of the 512×512
baked ground texture at `texscale=2`, 4× nearest-neighbour, before | after.

The BEFORE side shows **rectangular blocks with straight seams** cutting through the
green/rock boundary — that is the mask's 8×8-texel cells and the `(x+step)/cell` seam,
and it is exactly the artifact the owner calls "coarse". The AFTER side has the same
green region in the same place and the same rock region in the same place, but the
boundary between them is an organic curve that follows the terrain instead of a
staircase quantised to the vertex grid. **The blockiness is gone and nothing moved.**

Mean |Δ| per channel over the whole 512² baked texture, `texscale=2`:

| sceneIdx | N | mean \|Δ\| | max \|Δ\| |
|---|---|---|---|
| 0 | 64 | 3.34 | 118 |
| **1** (object 4) | 64 | **3.34** | 118 |
| 2 | 64 | 1.84 | 136 |
| 3 | 64 | 3.34 | 118 |
| **4** (object 7) | 64 | **3.30** | 213 |
| **5** (object 8) | 64 | **2.47** | 132 |
| 6 | 64 | 3.34 | 118 |
| 7 | 128 | 1.42 | 125 |
| 8 | 128 | **0.00** | 1 |

A mean of ~3/255 with a max of 118–213 is the right signature: almost everything is
unchanged, and the change is concentrated on the boundary, which is precisely where
the mask was quantised. Small means, big local maxima — a re-authoring would show a
large mean.

**sceneIdx 8 is exactly zero, and that is a real finding, not a failure.** Its
descriptor has `groundTexProgA == groundTexProgB == 27`: it blends a texture with
itself, so `W` is arithmetically irrelevant there. The credits shot's ground can never
be improved by anything done to the mask.

### 4b. Rendered frames

`verify/groundmask_0x0738.png`, `_0x1210.png`, `_0x1828.png` — the three frames the
owner named, `texscale=2` both sides, identical camera, 4× nearest-neighbour zoom on
the highest-difference 180×120 window, before | after.

Whole-frame mean |Δ| per channel (640×480):

| frame | object | mean \|Δ\| | max \|Δ\| |
|---|---|---|---|
| 0x0738 | 4 | 0.720 | 35 |
| 0x1210 | 7 | 0.156 | 52 |
| 0x1828 | 8 | 0.251 | 18 |

* **0x1210** is the clearest of the three: the striated rock face gains contrast
  between its light and dark grooves — the mask is no longer averaging across a cell —
  while the island's silhouette, its beach and the grass cap are pixel-for-pixel where
  they were.
* **0x0738** is a very close ground shot, so the ground texture is magnified far past
  1:1 and the bilinear magnification blurs both versions equally. The change is real
  (largest whole-frame mean of the three) but it is a subtler mottling difference
  rather than a visible sharpening, because at this magnification nothing in the
  texture is resolvable.
* **0x1828** changes least in the crop because the auto-picked window lands on the
  shadowed side. The rocky band higher in the frame does visibly gain crisper
  light/dark rock patches.

**Judged by eye, on the baked texture (4a) rather than on the rendered frames.** The
frames are where the owner will look, but a 640×480 render of a magnified texture
cannot show a 512²-vs-64² mask difference as clearly as the texture can, and I would
rather say which evidence I am relying on than average them together.

## 5. The sweep

`node web-sonnet/test/sweep.mjs --quality=remaster --tag=groundmask` (default cold
warm-up, never `--seq`; `pgrep -f sweep.mjs` was clean before starting):

```
RMSE  best 0 (0x2b00)  median 27.55  mean 28.21  worst 74.39 (0x1408)
PSNR  median 19.33 dB
```

**Do not compare that to the recorded 27.06–27.13 baseline.** Another agent's scene 1
water-level ramp landed in the same tree between the two runs — visible in the sweep's
own output, where the worst sample moves from 0x0710 at RMSE 119 to 0x1408 at 74.4.
Comparing across that would attribute their change to mine.

So the number below is an **isolated A/B in one tree state**: the same 354 positions
rendered twice, the second pass serving a `scene7.js` with the gate forced false
**patched in memory by the harness's own static server, never written to disk** — the
file was not touched, which matters with another agent editing it.

```
mask OFF  median=27.50  mean=28.12
mask ON   median=27.55  mean=28.21
```

**+0.05 median, +0.09 mean** — "moves very little or slightly worsens", as expected.
The reference is a 640×480 capture of a 2001 CRT; it cannot resolve a 512²-versus-64²
blend mask, and RMSE against it is not the instrument for this change. **I am judging
by eye, on the baked texture (§4a).**

Only 115 of 354 frames change at all (A/B RMSE > 0.5) — the rest have no visible ground.

### The 0x1328–0x1430 outliers are the FLARE, not the ground

Ten frames showed A/B RMSE of 21–34, far more than a mask tweak should produce, and
0x1328/0x1330/0x1338 got 6–10 RMSE *worse*. That looked like a placement move, so it
was chased down rather than waved off.

Re-run with `&flare=0`, same A/B:

| frame | A/B RMSE with flare | A/B RMSE with `flare=0` |
|---|---|---|
| 0x1328 | 21.10 | **0.28** |
| 0x1330 | 22.93 | **0.10** |
| 0x1338 | 23.79 | **0.00** |
| 0x1400 | 26.00 | **0.00** |
| 0x1408 | 28.58 | **0.00** |
| 0x1410 | 29.10 | **0.00** |
| 0x1418 | 29.82 | **0.00** |
| 0x1420 | 31.11 | **0.01** |
| 0x1428 | 34.18 | 6.21 |
| 0x1430 | 26.40 | 3.20 |

Eight of the ten collapse to **exactly zero**. The whole difference is the occlusion-
gated lens flare: `flare.js` reads back the framebuffer around the sun and integrates
the result over the warm-up, so a sub-pixel change in ground colour flips one occlusion
sample and the flare's ramp amplifies it into a differently-sized sun. Chaotic, entirely
pre-existing, and nothing to do with where rock and sand are. (0x1428/0x1430 keep a real
6.2/3.2 of terrain difference, and there the mask makes RMSE **better**: 48.07 → 47.42
and 45.34 → 44.73.)

On the owner's three frames with the flare's chaos removed:

| frame | A/B RMSE | vs reference, OFF → ON |
|---|---|---|
| 0x0738 | 1.99 | 32.29 → **32.25** |
| 0x1210 | 1.13 | 40.03 → 40.07 |
| 0x1828 | 1.07 | 30.36 → **30.35** |

Two of three marginally better, one marginally worse, all within noise. That is the
right signature for a change that alters detail without altering placement.

### Suites

`integration_test`, `timeline_test`, `text_test`, `generate_test` — ALL PASS.
`minid3d8_test` 116/116. `meshgen_test` 369/369.

## 6. Does this fix "the shadow is too dark AND too coarse"?

`GROUND_TEXTURING.md` §2 argued the coarseness IS the mask. **That half is now fixed,
and the §4a texture crop is the proof**: the rectangular cell blocks and the seams are
gone from the sand/rock boundary and it follows the terrain instead.

Three honest qualifications.

1. **"Too dark" is untouched and still open.** That is `REVIEW_FIXES.md` §2c, a separate
   question; the ambient-material fix was already ruled out as its cause. Nothing here
   changes any brightness — `W` is a blend weight between two textures, and its global
   mean moves by +0.25 % in scene 1.
2. **At 0x0738 specifically the win is smaller than the texture crop suggests.** That
   camera is very close to the ground, so the ground texture is magnified far past 1:1
   and bilinear magnification blurs the mask's new detail away again. What the owner
   sees as "coarse" *there* may be as much the magnification as the mask. The fix bites
   hardest at middle distance — 0x1210's rock face is the clearest rendered example.
3. **The credits shot cannot benefit at all.** sceneIdx 8 blends program 27 with
   program 27, so its mask is arithmetically inert (§4a, mean |Δ| = 0.00).

My honest read: this addresses the specific artifact — the blocky, grid-quantised
sand/rock boundary — that the texture-resolution work could not touch, and it does so
without moving anything. It is not a dramatic change frame to frame, and it should not
be sold as one. It removes a visible authoring artifact that the eye reads as low
resolution.

## 7. Open / not done

* The mask's information ceiling is `map256` (§2c). Raising it needs a heightmap
  generator that is pinned-reproducible at scale, which prog 22/23/25/26 are not.
* `?texscale=1` on the remaster path does not get the fine mask (the gate is
  `TEX_SCALE > 1`). Deliberate — it is the only remaster signal `scene7.js` has, and
  making it a byte-identical fallback strengthens the guard. If a dedicated
  `?groundmask=` knob is ever wanted it belongs in `main.js`, which is not mine.
* The fine path clamps at the terrain border instead of reproducing the authentic
  bake's hard zero-fill on the last row/column (`c1 == N` → contributes 0). The
  authentic path keeps that seam; the remaster fades into the edge value instead.
