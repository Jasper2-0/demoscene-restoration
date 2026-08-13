# Review fixes — the seven faults found by eye against the reference capture

Working document.  VAs are image VAs (`unpacked/sonnet_img.bin`, VA 0x401000 =
file offset 0).  Every float constant quoted was read out of the image, never out
of `re/out/sonnet.c`.

**Save as you go.**  Everything in this file is written the moment it is known.

## The list, in the project owner's words

| # | pos | obj | note | status |
|---|---|---|---|---|
| 1 | 0x0628 | 3 | "near plane should be closer, the grass is cut off" | **RE-OPENED 2026-08-05 and FIXED PROPERLY — see `SPIRE_REOPEN.md`.** §1 below was right about the near plane and right about `FUN_0040bfc1`, but INCOMPLETE: the array-A scatter was called with `seed = ci, snap = true`; the binary passes `seed = 1, snap = 0`. 72.88 → **59.00** |
| 2 | 0x0738 | 4 | "the shadow on the landscape is too dark and too coarse" | **REDIRECTED** — it is NOT the shadow bake, §2b/§2c |
| 3 | 0x0a28 | 5 | "orientation of part of the trees and leaves" | §3; premise disproved in §3b, one real fix §3c, root cause still open |
| 4 | 0x1210 | 7 | "tree seems problematic" | same as 3 |
| 5 | 0x1210 | 7 | "missing waves on the ocean" | **IDENTIFIED, NOT PORTED** (grep confirms no glitter path exists), §4 |
| 6 | 0x1828 | 8 | "clouds seem fluffier in the original" | §5b — first look; a missing sun glow at the same position is the bigger error |
| 7 | 0x1b38 | 8 | "missing the raindrops falling on the screen" | **FIXED**, §6 (78.18 → 67.24) |

## Baseline (cold, `--positions=…`, `results_base0.json`, 13:46)

| pos | 0x0628 | 0x0738 | 0x0a28 | 0x1210 | 0x1828 | 0x1b38 |
|---|---|---|---|---|---|---|
| RMSE | 65.72 | 26.53 | 27.21 | 42.22 | 30.01 | 78.18 |
| our mean luma | 140.4 | 38.1 | 72.1 | 103.0 | 52.3 | 54.9 |
| ref mean luma | 129.0 | 44.1 | 70.8 | 118.9 | 64.4 | 105.0 |

Whole-sweep baseline median is 26.70 (`SCENES_7_10.md` §11.4).

---

## 1. Object 3 @ 0x0628 — the near plane is INNOCENT; `FUN_0040bfc1` was mis-ported
### RE-OPENED by the owner and finished in `re/scenes/SPIRE_REOPEN.md` (2026-08-05)
> Everything below stands — the near plane really is 1.0 and untouched, and
> `FUN_0040bfc1` was re-checked instruction for instruction against `ndisasm` and
> the transcription is exact.  What it MISSED is the scatter's last two arguments.
> `FUN_004078b6` is `ret 0x28`, so `seed` and `snapToTerrain` are the 9th and 10th
> dwords; array A's call site at **0x407f7d** pushes `0` then `1`, i.e.
> **snap = 0 and seed = the literal 1** — the port had `snap = true, seed = ci`.
> With snap on, the (hidden) terrain lifted 39 of the 80 blade bases to or above
> the camera's own y = 54.5, so the field read as thin needles that stop in
> mid-air instead of the reference's few huge blades running off the frame.
> That is the owner's "the grass is cut off".  **0x0628: 72.88 → 59.00**, whole
> sweep median 27.06 → 27.13.  Read `SPIRE_REOPEN.md` before touching this again.

### The near plane, checked and ruled out

`FUN_00405b5d` builds the projection as
`FUN_00405c0c(cam+0xcc, near = cam+0xc0, far = cam+0xc4, cam+0xbc * DEG2RAD, aspect = cam+0xc8)`.
The camera ctor `FUN_004052a5` writes

```
param_1[0x2f] = 0x42b40000   ; +0xbc  fov     = 90.0 (VERTICAL)
param_1[0x30] = 0x3f800000   ; +0xc0  near    = 1.0
param_1[0x31] = 0x447a0000   ; +0xc4  far     = 1000.0
param_1[0x32] = 0x3faaaaab   ; +0xc8  aspect  = 4/3
```

and **nothing anywhere writes `+0xc0` again** — only `+0xbc` (forced to 90 every
frame by `FUN_00408eef`) and `+0xc4` (set to the descriptor's fog end, and
briefly to 10000.0 for the flare).  `FUN_00405c0c` itself is

```
h   = fovRad * 0.5
cot = cos(h)/sin(h)
Q   = far / (far - near)
m00 = cot / aspect ;  m11 = cot ;  m22 = Q ;  m23 = 1 ;  m32 = -(Q*near)
```

which is exactly `js/camera.mjs`'s `projectionMatrix()`.  So the port's near
plane is already the original's 1.0 and there is nothing to move.

### What is actually wrong

`FUN_0040bfc1` (`re/out/sonnet.c` line 9701) is not the y-scale ramp the port had.
Cluster object layout (stride 0x24 at `Landscape+0x130`):

| off | field |
|---|---|
| +0x00 | int instanceCount |
| +0x04 | int rings |
| +0x08 | int segments |
| +0x0c | the sphere-map texture |
| +0x10 | per-instance records, **stride 8**: `[0]` stagger delay, `[1]` growth t |
| +0x14 | the instance mesh array |
| +0x18 | the template mesh |
| +0x1c | float T — the cluster's ACCUMULATED clock |
| +0x20 | byte armed (event `m1`) |

```
T += param_1                          ; param_1 = paramA*dt*0.01  (= 0.001*dt in scene 0)
for inst in 0 .. count-1:
    if (armed) rec[0] -= T            ; NOTE: minus T, the accumulated clock, not param_1
    if (rec[0] < 0.0) {
        rec[1] += T * 0.01                                        [0x418260]
        if (rec[1] <= 1.0) {
            for ring in 0 .. rings-1:
                a  = inst + T*10.0 + ring*0.5      [0x418e5c]=10.0  [0x4170d4]=0.5
                dx = sin(a)        * 1.0 * 5.5     [0x418ef8]=1.0   [0x418f4c]=5.5
                dz = cos(a * 1.37) * 1.0 * 5.5     [0x418f48]=1.37
                if (ring == 0) { dx = 0; dz = 0 }
                for seg in 0 .. segments-1:
                    instanceVert.pos = templateVert.pos + (dx, 0, dz)
            FUN_004045f1(instance)                 ; bounds only — NOT normals
        } else rec[1] = 1.0
        instance.scale = (1.0, rec[1], 1.0)
        rec[0] = 0.0
    }
```

and the generator `FUN_0040bc63`'s per-instance tail (VA 0x40bc63, the
`param_6*8` stride) seeds them:

```
rec[0] = rand01() * 255.0        [0x418268]      <- the STAGGER DELAY
rec[1] = 0
```

Three separate errors in the old port, all of which made the field far too small:

1. **`paramA` was applied twice.**  The caller passes `paramA*dt*0.01`; the port
   then multiplied by `paramA` again.
2. **The ramp is quadratic, not linear.**  `T` accumulates and `rec[1] += T*0.01`,
   so growth accelerates as `t ~ 5e-6 n²` (n = frames).  Full height is reached
   ~447 frames (14.9 s) after `m1`, i.e. by 0x0526 for an undelayed instance;
   the old port reached t = 0.06 by 0x0628.
3. **Every instance has its own stagger delay** `rand01()*255`, counted down by
   `T` each frame.  Instance `k` starts at `0.0005 n² = rec[0]`, so at 0x0628
   (615 frames after `m1(0)` at 0x042a) about 74 % of the 80 instances have
   started and about 35 % are at full height — which is exactly the partly-filled
   field the reference shows.

Plus the part that was missing entirely: **the per-ring lateral wobble**, which is
what curves the blades.  It freezes when the blade finishes growing (the
`else rec[1] = 1.0` arm skips the rebuild), so a mature field is static.

### Scene 0's geometry, for scale

`desc.arrays.A[0]` = `{instanceCount 80, boxCentre (106,40,24), boxExtent (150,0,150),
radius 3.2, heightRatio 160, rings 16, segments 8}`.  `FUN_0040bc63` gives
`dy = radius*heightRatio/rings = 32.0` per ring, so each spire is **3.2 units wide
and 512 units tall** — and the ±5.5 wobble is nearly twice the blade's own width,
which is why the reference's blades are curved ribbons and the port's were straight
needles.

### Ported

`web-sonnet/js/scene7.js`: the array-A build now draws the 80 delays (they are part
of the shared RNG stream), keeps the template vertex array, and `#stepSpires` is the
transcription above.  `reset()` restores delays, `t`, `T` and the template verts.

### Measured — and this is a case where RMSE goes the WRONG WAY

`verify/pair_spire1_0x0628.png`: the port now shows the same frame-filling fan of
curved blades radiating past the sun that the reference does — blade count,
direction, taper, the yellow-green sphere-map sheen and the backlit dark cores all
line up.  Before, the frame was empty sky with five stubs.  It is the largest
visible change any of these seven notes produced.

| pos | before | after |
|---|---|---|
| 0x0628 | 65.72 | **72.88** |

RMSE rises because the frame went from "almost nothing" to "dense high-contrast
structure that is not pixel-aligned with the reference" — the same effect
`LANDSCAPE_ANIM.md` §8 documents for the snow ("the luma and the eye both say this
is the better frame").  An empty frame scores well against a busy one for the wrong
reason.  **Do not revert this on the metric.**

**RNG-stream warning:** the 80 extra draws land inside object 3's build, i.e. before
objects 4..10 are built.  `SCENES_7_10.md` §10.5 shows this port's frames are bimodal
in the shared stream position, so a whole-sweep A/B is mandatory before believing
any per-scene number outside object 3.

---

## 2. Object 4 @ 0x0738 — the shadow bake, `FUN_0040e923`
### (it is SIXTEEN passes, not 32 — see §2b; and it is NOT this note's fault — see §2c)

Consumers of the shadow map (`terrainObj+0x24`, sampled through `FUN_0040e8fb`):
* the ground-texture bake, `S = shadow256[y][x].b / 255` (`SCENES_7_10.md` §2);
* the array-B curtain vertex grey `g = ftol(shadowSample(p.x,p.z)*255)`;
* `MG.buildBillboards`' bottom-vertex `shadowFn`.

All three currently run at the unshadowed limit (map memset to 0xFF).
`desc[0x50] & 1` (flag bit 8, `terrainOpt8`) is set only by scene 8, and
`FUN_0040e058`'s `param_14` forces `S = 1.0` there — so object 10 is exempt and
must stay exempt.

**NOW FULLY TRANSCRIBED — see §2b below (disassembled 0x40e923-0x40ec25).**

---

## 3. Objects 5 and 7 — the trees: **the IMPOSTOR BAKE OVERFLOWS ITS RENDER TARGET**

The owner's two sightings really are one fault, and it is the shared impostor
bake, exactly as suspected.  Both were confirmed by eye:

* **0x1210 (obj 7, one single array-C instance).** `scratchpad/crop_1210_tree.png`
  — the reference has a compact little tree: rounded canopy in the upper middle
  of its quad, a visible trunk, and transparent margin on all four sides.  The
  port draws a **solid rectangle of foliage that bleeds off every edge of the
  quad**.  The quads are the same size on screen, so the fault is entirely in
  what the render target contains.
* **0x0a28 (obj 5, four clusters of 10/5/5/10).** `scratchpad/crop_0a28.png` —
  same thing: the reference's clump is a row of rounded canopies on trunks, the
  port's is a wall of leaf slabs standing on the ground.

### The render target itself

`scratchpad/imp.mjs` dumps every live impostor RT straight out of the GL context
(`scratchpad/imp/*.png`).  Measured on the current tree:

| set | RT | coverage (alpha > 8) | mean alpha |
|---|---|---|---|
| 0 (leafy, 10 passes) | 512² | **50.4 % / 44.0 %** | 122 / 106 |
| 1 (bare, 1 pass) | 512² | 21.6 % / 25.9 % | 55 / 66 |

`imp_s2_0.png` shows it plainly: the canopy runs off the **left, right and bottom**
edges of the 512², so there is no trunk in the texture and no transparent margin
anywhere.  Half the texture is opaque leaf.

### The bake parameters are NOT the fault — all checked against the image

`FUN_0040abed` (sonnet.c:8755) was re-read line by line:

```
FUN_00409d45(tree, scene, terrain=0, pos=(0,0,0), bend=(0,0,0),
             param_10 = 1.0,           ; 0x3f800000
             param_11 = 10.0,          ; [0x418e5c]  branchRadius
             param_12 = 0.75,          ; [0x418eb0]  levelTaper
             param_13 = (param_3 == 0),;             leavesVisible
             param_14 = 2.0)           ; [0x418200]  leafSize
camera->+0xbc = 0x42b40000 (fov 90) ;  camera->+0xc8 = 0x3f800000 (aspect 1)
camera->+0x88 (eye)    = (0, 128, -150) * Ry((k/angleCount)*PI)   [0x418e30]=128 [0x418f30]=-150
camera->+0xac (target) = (0, 128, 0)
passes = (param_1 == 0 && param_3 == 0) ? 10 : 1
pass 0      : branch mesh HIDDEN, leaves only, lit
passes 1..9 : scene ambient = -1, branches shown, leaf mesh matrix =
              Euler(0, rand01()*2PI, 0), leaf material |= 0x1000, and every leaf
              QUAD gets a fresh grey ftol(rand01()*127 + 128)   [0x418e34]=127
```

Every one of those matches `scene7.js`'s `bakeImpostors` and
`js/camera.mjs`'s projection.  Near/far are the camera ctor's 1.0 / 1000.0 and
`FUN_0040abed` never touches them.

So the overflow is **not** in the bake's framing — it is that
`MG.buildTree({branchRadius 10, levelTaper 0.75, leafSize 2.0})` produces a tree
whose canopy is too large for that framing.  Measured bounding boxes:

```
branches  8184 verts  x -116.1 .. 117.9   y   0.0 .. 190.4   z -112.4 .. 109.5
leaves   10536 verts  x -116.9 .. 115.8   y  53.1 .. 191.1   z -114.5 .. 112.9
```

The camera sits at z = −150, so foliage at z = −115 is only 35 units away and is
magnified 150/35 = **4.3×** — that near foliage alone fills and overruns the
frame.  A canopy half-extent nearer 60 would magnify only 1.7× and would leave
the margins the reference shows.

### The arithmetic that says how far out it is

The 10 passes each re-yaw the leaf mesh by `rand01()*2PI`, so the impostor's
silhouette is the canopy **swept around Y** — a cylinder of radius = the canopy's
own radius.  With the camera at z = −150 and a 45° half-angle, a point at
`(R, y, −R)` is `150 − R` away and needs `R ≤ 150 − R`, i.e. **R ≤ 75**, just to
stay on screen at all; leaving the margin the reference shows needs R ≈ 55-60.

`MG.buildTree`'s canopy radius is **117**.  That is the whole fault: at R = 117
the near foliage projects to 117/33 = 3.5× the half-width and the texture is
solid leaf from edge to edge.

### What was checked in `js/meshgen.mjs`'s `buildTree` and found FAITHFUL

Every constant and every structural choice was re-read against `FUN_0040a186`
(sonnet.c:8286) and `FUN_00409d45` (sonnet.c:8091):

| thing | binary | meshgen |
|---|---|---|
| `SEG_LEN` | `[0x418ef4]` = 66.0 | 66.0 |
| leaf half-WIDTH | `_DAT_00478930 = param_13 * [0x418e5c]` = leafSize·10 | same |
| leaf half-LENGTH | `_DAT_00478944 = 0x41a00000` = **20.0, a hardcoded immediate** | 20.0 |
| leaf corners | `(0,0,−W) (2H,ty,−W) (2H,ty,W) (0,0,W)` | same |
| `ty` | `rand01()*[0x418f0c] − [0x418e7c]` = ·16 − 8 | same |
| leaf base radius | `[0x418e5c]` = 10, ×`(1 − t·0.7)` at depth 4 | same |
| leaf tries / gate | loop 16, `rand() < 4000` | 16 / 4000 |
| ring u | `[0x418f20]` = 1/7 | same |
| spread / jitter | `[0x418f00]` 0.6, `[0x418f08]` 0.4, `[0x418f04]` 0.2 | same |
| depth-4 taper | `[0x418f10]` = 0.7 | same |
| branchRadius / levelTaper / meshScale | `param_10 / param_11 / param_9` | same |
| child order | ±Z then ±X, four children, depth < 4 | same |

`FUN_004010dc`, called at the top of every generator, was suspected of being an
`srand` — **it is not**: it is the loading-screen progress bar (clear, draw the
bar, present).  So the tree is a pure function of the shared RNG stream position,
and a 2× canopy radius is not a seeding artefact.

**STATUS: DIAGNOSED PRECISELY, NOT FIXED — a documented dead end.**
The impostor bake, the impostor camera, the billboard quad and every transcribed
constant of the tree generator are right.  Something makes `buildTree`'s canopy
about twice as wide as the original's and it is *not* any of the numbers above.
The two remaining candidates, neither cheap:

1. **`mat4Euler` / the direction accumulation.**  `dir = parent.dir + bend +
   angleOffset` accumulates, so a depth-4 branch points at up to ±2.4 rad (137°)
   from vertical and the outer canopy droops outward.  If the original's
   `FUN_00402280` composes its three rotations in a different order than
   `MG.mat4Euler`, the same angles give a much more compact tree.  `FUN_00402280`
   is `I·Rx(e0)·Ry(e1)·Rz(e2)` post-multiplied — worth disassembling
   `FUN_00402381/4023ed/402459` and checking the sign convention of each, because
   a sign flip on one axis turns "spread outward" into "spread inward".
2. **`FUN_004024c5` vs `FUN_00402a6f`.**  The ring loop composes
   `FUN_004024c5(out, ringMatrix, nodeMatrix)` — a 4×4 multiply whose ARGUMENT
   ORDER meshgen renders as `mat4Mul(mat4Euler(0, u*2PI, 0), M2)`.  If that is
   the wrong way round the rings splay.

Both are exactly the "budget for disassembling a third of what you touch" case
and neither was reached.  Note the ordinary array-E trees use the same code and
`SCENES_7_10.md` §7 grades them a good match at 0x1a00, so whatever it is has to
be something that only becomes visible when the whole tree has to fit in one
frame — which is precisely why the impostor exposes it and the close-up does not.

---

## 4. Object 7 @ 0x1210 — "missing waves": the WATER GLITTER, `desc[0x4f] & 1`

**Found.**  `FUN_00408eef`'s tail, `re/out/sonnet.c` lines 7884-7908, inside the
`waterLevel > 0` branch and immediately after the water surface is drawn:

```
FUN_00402349(0x98, 0)                       ; CLIPPLANEENABLE off
waterMesh(this+0x44).pos.y = desc+0x10 ;  waterMesh->render(0)
if (desc[0x4f] & 1) {                       ; waterGlitter — scene 4 only
    glitter(this+0x40)->+0xac = 1           ; lighting ON for this draw
    glitter->render(0)
    glitter->+0xac = 0
    for k in 0 .. 127:                      ; iVar12 = k*4 over [0,0x200), iVar10 = k*0x20
        s = sinf( this->time(+0x13c) * 10.0 + phases[k] )        [0x418e5c] = 10.0
        *(float*)(glitter->+0xb4 + 0x18 + k*0x20) = (s*0.5 + 0.5) * 96.0 + 32.0
                                                    [0x4170d4]  [0x418e94] [0x418e84]
        *(uint *)(glitter->+0xb4 + 0x1c + k*0x20) = ftol(...) << 24 | 0xffffff
}
```

`this+0x48` is a 0x200-byte array of 128 floats — the per-point phases.

### The generator, `FUN_004080e0` (`re/out/sonnet.c` line 6826) — a POINT-SPRITE cloud

```
this+0x40 = FUN_00404bb8(obj, 0x80, 0)          ; 128 items, a DIFFERENT mesh class
material  = FUN_00401c67(mat, this+0x38, 0, 0x891)      ; this+0x38 = texgen 14 @256x256
this+0x48 = alloc(0x200)                        ; 128 floats
glitter->+0xac = 0                              ; lighting OFF by default
for k in 0 .. 127:                              ; local_8 = k*0x20, local_c = k*4
    v.pos   = flareObj(this+0x3c)->+0xb4[0..2]  ; = the SUN POSITION (desc+0x32)
    v.pos.y = 0                                 ;   with y forced to 0
    r = rand()                                  ; FUN_00404258, 0..0x7fff
    if (r < 0x4000) { b = rand01()*1000 - 1000 ; a = rand01()*40.0 - 20.0 }
    else            { b = rand01()*1000 - 1000 ; a = rand01()*10.0 -  5.0 }
                     [0x418300]=1000  [0x418e64]=40  [0x418e24]=20
                                      [0x418e5c]=10  [0x418e54]=5
    *(vec3*)(vb + 0x0c + k*0x20) = (a, b, 0)
    *(float*)(vb + 0x18 + k*0x20) = 2.0                      [0x418200]
    phases[k] = rand01() * 2 * PI                            [0x418220] = qword PI
```

so the **vertex stride is 0x20 = 32 bytes** and the layout is
`pos(0x00) | vec3(0x0c) | float(0x18) | dword(0x1c)`, i.e.
`D3DFVF_XYZ | D3DFVF_NORMAL | D3DFVF_PSIZE | D3DFVF_DIFFUSE`.  The per-frame
write puts **point size 32 … 128** at +0x18 and an alpha-only diffuse at +0x1c:
these are 128 animated POINT SPRITES textured with the flare texture, sitting on
the water at the sun's XZ — the sun-glitter path across the ocean.  That is what
the owner is seeing as "waves".

Open: the exact meaning of the second vec3 (`(a, b, 0)` written to the normal
slot) and the `ftol` argument for the alpha, both of which need disassembly —
Ghidra drops the operand.  `minid3d8` also has no point-sprite path.

## 4b. Two other things `FUN_00408eef`'s tail does that the port does not

* When `hiResWater` (bit 13) is set the **terrain is hidden from the scene-graph
  pass and drawn explicitly after the flare** (lines 7836-7838 and 7911-7913).
* When `buildB` (bit 2) is set the camera and the array-B curtain mesh are
  **re-rendered a second time** after the terrain (lines 7914-7917).

Both change draw order in object 7 and neither is reproduced.

---

## 5. Object 8 @ 0x1828 — "clouds fluffier"  (NOT STARTED)

## 6. Object 8 @ 0x1b38 — THE LENS DROPLETS, fully transcribed

`verify/pair_base0_0x1b38.png` is unambiguous: the reference is covered in big
soft BRIGHT blobs — mean luma 105.0 against the port's 54.9 — and the port has
none.  It is the largest single error of the seven (RMSE 78.18).

### A correction to `LANDSCAPE_ANIM.md` §8 and `SCENES_7_10.md` §8

Both list `FUN_0040de4e` as "snow accumulation … the 64×64 render target, obj 8
only".  **It is not.  `FUN_0040de4e` is the lens-droplet RENDER**, and the 64×64
render target is the *refraction source* the droplets sample.  ~~Nothing in the
demo accumulates snow.~~

> **THAT LAST SENTENCE IS WRONG — retracted 2026-08-11 (Jasper).** Only the
> *attribution* was wrong. `FUN_0040de4e` is indeed lens droplets, but snow
> accumulation exists elsewhere: `FUN_0040d5c6` (`LANDSCAPE_ANIM.md` §6) carries
> an accumulation map at particle-object `+0x4c` and an accumulate flag at
> `+0x58`, and splats into the map on the ground-collision branch — the very
> branch §6 transcribes as `<snow accumulation splat into +0x4c, skipped>`. **The
> port skips it, so our winter ground never whitens.**
>
> Measured footprint (original-quality sweep, 2026-08-11): across the winter
> scene's second camera the reference is brighter than the port by a margin that
> **grows monotonically** — +7.8 at 0x2020, +8.0 at 0x2100, +10.5 at 0x2200,
> +15.3 at 0x2218, +19.2 at 0x2220, +21.1 at 0x2228 mean luma — while the first
> camera (0x1e00–0x1f38) sits at −1 to −3, i.e. matched. RMSE tracks it (29 → 49
> → 57). Reference frames at 346.9 / 357.3 / 363.8 s show the ground going from
> saturated brown to pale desaturated buff.
>
> PROVENANCE: the growing deficit is **PINNED** (measured). "Snow accumulation is
> the cause" is **INFERRED** — a monotonic ground-brightening with a
> documented-but-unported accumulation splat in the matching scene is a strong
> fit, but the splat body itself has not been disassembled and the late frames
> also gain a sun glow. Falsifier: port the `+0x4c` splat and see whether the
> deficit closes; if it does not, look at the `+0x5c` global-alpha fade instead.
>
> **Jasper, asked directly 2026-08-11: it is snow BUILDING UP ON THE GROUND, not
> a whole-scene wash.** That rules out the `+0x5c` global-alpha-fade alternative
> and makes the `+0x4c` accumulation map the thing to port. Still INFERRED as to
> mechanism (the splat body is not disassembled), but the hypothesis space is now
> one wide. **NEXT ACTION when this is picked up: ndisasm the ground-collision
> branch of `FUN_0040d5c6` — `LANDSCAPE_ANIM.md` §6 marks the exact spot — and
> port the splat plus whatever samples `+0x4c` at ground-draw time.**
>
> **Lesson for this file: a negative claim ("nothing in the demo does X") needs
> more evidence than the positive one it replaces.** This one was collateral
> damage from correcting a real mis-attribution, was never separately checked,
> and stood unchallenged long enough to keep a whole visible feature unbuilt.

### The three pieces

**(a) The 64×64 scene copy.**  `FUN_004082a9` @ 0x40700f:

```
if ((flags & 0x40) != 0 && (flags & 0x80) != 0)      ; buildPrecip && precipRenderTarget
    Landscape+0x30 = FUN_00402b16(alloc, 0x40, 0x40, 0)      ; a 64x64 RENDER TARGET
```

and `FUN_00408eef` fills it every frame, between the water-reflection pass and
the main pass (sonnet.c:7781-7797):

```
saved = DAT_00474790
if ((flags & 0x40) && (flags & 0x80)) {
    if (flags & 0x200) cloudMesh.flags |= 2         ; hide the sky for the copy
    DAT_00474790 = 0                                ; clear colour BLACK
    flare->+0xe5 = 0 ;  flare->+0xac = 0            ; flare off for the copy
    FUN_00402b4f(Landscape+0x30)                    ; push the 64x64 RT, clear
    FUN_00406004(scene, dt)                         ; render the whole scene into it
    flare->+0xac = 1 ;  flare->+0xe5 = 1
    if (flags & 0x200) cloudMesh.flags &= ~2
}
DAT_00474790 = saved
```

**(b) The ring and the emission.**  `FUN_0040d1f1` allocates
`precip+0x34 = alloc(0xb000)` (256 quads × 0xb0 = 4 verts × 44 B),
`precip+0x38 = alloc(0xc00)` (256 × 6 indices), `precip+0x3c = alloc(0x400)`
(256 floats — a BIRTH TIME per droplet), sets every vertex colour to `0x7fffffff`
and both ring counters `+0x2c` (head) and `+0x30` (count) to 0.  The droplet
texture is `precip+0x40` = texgen program **5 at 16×16** (`FUN_00416036(5,0x10,0x10)`).

`FUN_0040d5c6`'s tail, VA 0x40dbd0-0x40dc5a, **disassembled** because Ghidra drops
the multiply:

```
0040DBE7  call 0x402626          ; forward = camera.target - camera.pos
0040DBEF  call 0x40de2a          ; normalize
0040DBFE  call 0x4025b6          ; dot( (0,1,0), forward )
0040DC03  fmul dword [0x41826c]  ; * 32767.0      <-- THE DROPPED MULTIPLY
0040DC09  call 0x404224          ; n = ftol(...)
0040DC10  test esi,esi / jnl     ; if (n < 0) n = 0
0040DC16  call 0x404258          ; r = rand()  (0..0x7fff)
0040DC1B  cmp eax,esi / jnl      ; if (r < n) emit one droplet
```

so **the emission probability is exactly `max(0, dot(up, viewDir))`** — droplets
appear only while the camera is looking UP, which is precisely the shot at
0x1b38 (the camera is craning up into the tree) and why the reference is covered
in them there and clean elsewhere.  Then:

```
birth[head] = precip+0x08          ; the particle clock T
x = rand01()*2 - 1 ;  y = rand01()*2 - 1          ; NDC, uniform over the screen
v0 = (x - 0.12, y + 0.16, 0)       [0x418f90] = 0.12, [0x418f8c] = 0.16
v1 = (x + 0.12, y + 0.16, 0)
v2 = (x + 0.12, y - 0.16, 0)
v3 = (x - 0.12, y - 0.16, 0)
      uv1 (NOT uv0 — float offsets 9 and 10, i.e. the SECOND texcoord set):
uL = (x - 0.16)*0.5 + 0.5   uR = (x + 0.16)*0.5 + 0.5        [0x418f88] = 0.16
vT = (y + 0.2133)*(-0.5) + 0.5   vB = (y - 0.2133)*(-0.5) + 0.5
                                   [0x418f84] = 0.2133, [0x418e1c] = -0.5
v0.uv1 = (uL, vT)  v1.uv1 = (uR, vT)  v2.uv1 = (uR, vB)  v3.uv1 = (uL, vB)
head = (head + 1) % 256 ;  count = min(count + 1, 256)
```

The uv1 rectangle is the droplet's own screen rectangle **widened from ±0.12 to
±0.16 and flipped in v** — i.e. each droplet samples the 64×64 scene copy at its
own position, slightly magnified and inverted.  That is a lens: the blobs in the
reference are little upside-down images of the scene behind them.

**(c) The draw**, `FUN_0040de4e`, gated in `FUN_00408eef`'s tail by
`(flags & 0x40) && (flags & 0x80) && position > 0x1aff` — the same 0x1b00 gate as
the rain itself.  Screen-space (`FUN_00401bd0` sets W = V = P = identity), the
two transforms it will clobber saved and restored, `SetRenderState(0x17, 8)`
(ZFUNC ALWAYS) around the whole thing, and per droplet a
`alpha = clamp(ftol(<dropped by Ghidra>), 0, 255)` written to all four vertices.

Disassembled (0x40de4e-0x40e04f), because Ghidra drops the operand of both
`ftol`s and mangles every device call:

```
if (count == 0) return
save TRANSFORM 2 and 3 ;  FUN_00401bd0()          ; W = V = P = identity
FUN_004019e6(1)                                   ; ADDITIVE (SRCALPHA/ONE), ZWRITE off
SetRenderState(0x17, 8)                           ; D3DRS_ZFUNC = ALWAYS
if (precip+0x44 != 0) {                           ; the 64x64 RT
    SetTexture(0, dropletTex) ;  SetTexture(1, RT64)
    FUN_004019a0(2)                               ; stage-1 COLOROP/ALPHAOP = MODULATE
    FUN_0040191b(1, 0)                            ; stage-1 ADDRESSU/V = CLAMP
    per droplet:  a = clamp(ftol(255.0 - (T - birth)*50.0), 0, 255)
                  ; 0040DEF6 fld [esi+8] / fsub [eax+ebp*4] / fmul [0x418e60]=50
                  ;          / fsubr [0x418268]=255
    DrawIndexedPrimitiveUP(D3DPT_TRIANGLELIST, 0, n*4, n*2, idx, D3DFMT_INDEX16, verts, 0x2c)
    ** TWICE ** (0040DF42 loop, edi = 2)
}
per droplet:  a = clamp(ftol((255.0 - (T - birth)*50.0) * 0.35), 0, 255)   [0x418f9c]
SetTexture(0, dropletTex) ;  SetTexture(1, NULL) ;  FUN_004019a0(0)
FUN_004019e6(2)                                   ; normal ALPHA BLEND
DrawIndexedPrimitiveUP(...)                       ; once
SetRenderState(0x17, 4)                           ; ZFUNC = LESSEQUAL
restore TRANSFORM 2 and 3
```

`FUN_004019e6` / `FUN_004019a0` / `FUN_0040191b` are exactly the shim's
`setBlendMode` / `setStage1Op` / `setAddressMode`, so the port calls those rather
than building a material — the original sets these states by hand and never
makes a material for the droplet quads.

Droplet lifetime is 255/50 = 5.1 units of the precip clock, which advances at
`frameDt*0.01` ≈ 0.01 per frame — about **17 s**, long enough for the ring to
reach its 256 limit while the camera holds its upward tilt.

### PORTED, and measured

`web-sonnet/js/scene7.js`: `#emitDroplet` (the ring), `#drawDroplets` (the two
passes), the 64² render target and its per-frame scene copy, `precip.T`, and the
ring's reset.  `MG.buildLensDroplets()` — which had sat unused in
`js/meshgen.mjs` since it was written — is now its constructor.

| pos | before | after |
|---|---|---|
| 0x1b38 | 78.18 | **69.48** |

`verify/pair_drop1_0x1b38.png`: the port now carries the same field of big soft
bright blobs as the reference, at the same density and the same brightness, and
the frame reads as the same shot.  What is left at that position is the tree
silhouette — §3's unfixed impostor/canopy fault.

---

## 3b. Session 2 — the two §3 candidates, disassembled

### Candidate 1 (`mat4Euler` sign/order) is DEAD — the port is byte-for-byte right

`FUN_00402280` @ 0x402280, disassembled:

```
00402284  call 0x401950            ; this = identity
00402295  call 0x402381 (this, e0) ; Rx
004022A3  call 0x4023ed (this, e1) ; Ry
004022B1  call 0x402459 (this, e2) ; Rz
```

and each of the three is `local_44 = identity; <fill>; this = FUN_004024c5(out, this, local_44)`
(the `rep movsd` at the tail copies 0x10 dwords back over `this`).

`FUN_004024c5(out, A, B)` disassembled @ 0x4024c5-0x402530: triple loop, inner
`fld [pfVar6] ; fmul [pfVar5] ; faddp` with `pfVar6 += 1` (A, along the row) and
`pfVar5 += 4` (B, down the column) — i.e. **`out[i][j] = Σ A[i][k]·B[k][j]`,
plain row-major `A·B`**, exactly `MG.mat4Mul(A, B)`.

So `FUN_00402280` = `((I·Rx)·Ry)·Rz` = `mat4Mul(mat4Mul(Rx,Ry),Rz)` — the same
association AND the same order as `MG.mat4Euler`.

The three axis matrices, read off the ebp-relative stores (`local_44` base is
`ebp-0x40`, so element index = (off + 0x40)/4), with `0x4041ee = cosf` and
`0x4041dd = sinf`:

| fn | stores | elements | meshgen |
|---|---|---|---|
| `FUN_00402381` Rx | `[-0x2c]=cos [-0x28]=sin [-0x1c]=-sin [-0x18]=cos` | 5=c 6=s 9=-s 10=c | `Rx[5]=cx Rx[6]=sx Rx[9]=-sx Rx[10]=cx` ✓ |
| `FUN_004023ed` Ry | `[-0x40]=cos [-0x38]=-sin [-0x20]=sin [-0x18]=cos` | 0=c 2=-s 8=s 10=c | `Ry[0]=cy Ry[2]=-sy Ry[8]=sy Ry[10]=cy` ✓ |
| `FUN_00402459` Rz | `[-0x40]=cos [-0x3c]=sin [-0x30]=-sin [-0x2c]=cos` | 0=c 1=s 4=-s 5=c | `Rz[0]=cz Rz[1]=sz Rz[4]=-sz Rz[5]=cz` ✓ |

**Every sign, every slot, and the composition order all match.  Candidate 1 is
ruled out.**  `FUN_004022bb` is likewise `this = this · diag(v.x, v.y, v.z)` —
`mat4Scale` with a vec3 (the tree passes (s,s,s)).

### Candidate 2 (`FUN_004024c5` argument order in the ring loop) is DEAD too

`FUN_0040a186`'s ring loop, `re/out/sonnet.c`:

```
FUN_0040190f(local_1e4)                                   ; identity
FUN_00402280(local_1e4, (0, u*TWO_PI, 0))                 ; Ry(u*2PI)
FUN_004024c5(local_224, local_1e4, local_fc)              ; out = Ryaw · nodeM
<rep movsd back into local_1e4>
```

and the leaf loop is the same shape, `FUN_004024c5(local_264, local_bc, local_fc)`
= `Ryaw_leaf · nodeM`.  With `FUN_004024c5(out, A, B) = A·B` proven above, both
are exactly `MG.mat4Mul(MG.mat4Euler(0, yaw, 0), M2)` as ported. **Ruled out.**

### Every remaining constant re-read straight out of the image (not from notes)

`0x4170c4`=1.0 `0x4170d0`=1/32767 `0x4170d4`=0.5 `0x418200`=2.0 `0x418e24`=20.0
`0x418e5c`=10.0 `0x418e7c`=8.0 `0x418ef4`=**66.0** `0x418f00`=**0.6** `0x418f04`=**0.2**
`0x418f08`=**0.4** `0x418f0c`=16.0 `0x418f10`=0.7 `0x418f20`=1/7 `0x418eb0`=0.75
`0x418e30`=128.0 `0x418f30`=−150.0 `0x418e34`=127.0, and the **qword** at `0x418f18`
= 6.283185307179586 (Ghidra prints its low half as a bogus float — the ring
angle really is `u · 2π`).  `FUN_00409d45`'s arg map, corrected: `param_9` =
meshScale (=1.0), `param_10` = branchRadius (=10), `param_11` = levelTaper (=0.75),
`param_12` = leavesVisible, `param_13` = leafSize (=2.0, `_DAT_00478930 = 2·10 = 20`).

**So `buildTree` is faithful and the canopy radius of 117 is what the ORIGINAL
generator produces too.  The premise "the tree is 2× too wide" is wrong.**

### The real shape of the fault, from the dumped render targets

`scratchpad/imp/imp_s5_0.png` — the **bare** set (`param_3 = 1`, leaves hidden,
**1 pass**) — is a *perfectly framed tree*: trunk, spreading crown, transparent
margin on all four sides, crown half-width ≈ 0.78 of the RT half-width.  That is
exactly `117/150`, i.e. the R = 117 canopy at z = 0 seen from 150 away.  **The
camera framing and the tree size are both right.**

`scratchpad/imp/imp_s2_0.png` — the **leafy** set (10 passes) — is the blob that
runs off three edges.

Same geometry, same camera; the only difference is the 10-pass loop, and inside
it the one thing that moves geometry: passes 1..9 set the LEAF MESH's matrix at
`leafMesh+8` to `Euler(0, rand01()·2π, 0)`.  Sweeping a R = 117 canopy around Y
puts foliage at z = −117, i.e. 33 units from the camera, magnified 150/33 = 4.5×.
**That is the whole overflow.**  New hypothesis to test: `mesh+8` is not what the
port thinks it is, so in the original the leaves do NOT sweep.

### The bake, disassembled end to end (0x40abed–0x40b05a) — also faithful

`0040AE3A`: `fild [RTindex] / fild [angleCount] / fdivr / fmul qword [0x418220]`
→ `theta = (k/M)·π`.  `0040AECF`: `call 0x401341 (rand01) / fadd st0,st0 /
fmul qword [0x418220]` → `yaw = rand01()·2π`, written into `leafMesh+8` by
`0040AEF5 call 0x402280`.  `0040AF1F`: `rand01 / fmul [0x418e34]=127 /
fadd [0x418e30]=128 / call ftol` → the per-quad grey.  `0040AF65`: eye =
`(0, 128, −150)` through the Ry.  `0040AE89`: `[cam+0xbc] = 90.0`,
`[cam+0xc8] = 1.0`.  `FUN_00405b5d` → `FUN_00405c0c(proj, near, far,
fov · qword[0x4182e0] = DEG2RAD, aspect)`, `h = fov/2`, `m00 = cot h / aspect`,
`m11 = cot h` — a true 45° half-angle both ways.  **Every one of these is what
`bakeImpostors` already does.**

### Measured: the two impostor trees are the same size, so the sweep is the whole difference

Instrumented `bakeImpostors` (`globalThis.__impProbe`) and read the real
bake-time bounding boxes off the running port:

| set | branches | leaves |
|---|---|---|
| 0 (leafy) | x −105.2..99.1  y 0..193.1  z −108.3..115.7 | x −106.3..104.3 y 57.4..197.3 |
| 1 (bare)  | x −116.0..104.7 y 0..191.8  z −106.7..112.1 | x −121.1..107.9 y 53.7..197.0 |

Identical to within the RNG.  Yet coverage is 50.4 % vs 21.6 %, and only set 0
runs off the edges.  Forcing the 9 sweep yaws to zero (`__impNoSweep`) drops set
0 to **24.3 % with zero opaque edge pixels** and produces a clean tree with a
trunk (`scratchpad/imp3/imp_s2_0.png`).  So the overflow is entirely the sweep
magnifying near-side foliage (z = −110 ⇒ 40 units from the eye ⇒ 3.7×), and the
question is why the ORIGINAL's sweep does not blow out.

## 3c. FOUND IT — the leaf material's ALPHA REF is 0xF0, the port uses 0x80

`FUN_00409d45`, last lines:

```
*(undefined1 *)(*(int *)(*(int *)((int)this + 0x14) + 0xc4) + 0x14) = 0xf0;
      leafMesh                        material          alphaRef
```

and `FUN_00401d12` (the material binder) does, for `flags & 0x0100`:

```
DAT_00474794 = material[0x14] ;  FUN_00401b45(1)
   -> SetRenderState(ALPHATESTENABLE 0x0f, 1)
      SetRenderState(ALPHAFUNC     0x19, D3DCMP_GREATEREQUAL)
      SetRenderState(ALPHAREF      0x18, DAT_00474794)
```

The leaf material is `FUN_00401c67(mat, leafTex, 0, 0x300)`, whose ctor default
is `[0x14] = 0x80` — and then `FUN_00409d45` **overwrites it with 0xF0**.

`web-sonnet/js/scene7.js` had `alphaRef: 0x80` on BOTH tree leaf materials —
the impostor bake (line 666) and the array-E trees (line 1032).  At ref 0x80
every texel of the leaf texture with alpha ≥ 128 is drawn, so each 40×40 leaf
quad renders as a fat opaque blob; at 0xF0 only the leaf's solid core survives
and the quads read as leaves.  That is the "solid slab of foliage" and it is
also why the near-side swept foliage smears across the whole target.

### APPLIED — and honestly measured: a real transcription fix, but a SMALL one

`web-sonnet/js/scene7.js`, both leaf materials now `alphaRef: 0xf0`
(line 668, the impostor bake; line 1038, the array-E trees).

Clean A/B, same build, only this byte changed (`--positions=0x0a28,0x1210`,
tags `t3rev` / `t3a`):

| pos | 0x80 (before) | 0xF0 (after) |
|---|---|---|
| 0x0a28 | 24.97 | 25.16 |
| 0x1210 | 42.19 | 42.20 |

and a full sweep (`t3full`, 354 samples): median 26.94 → 27.06, **no single
position moved by more than 1.5**.  So it is metric-neutral.

Impostor render target, set 0: coverage 50.4 %/44.0 % → 48.0 %/41.7 %, opaque
edge runs 24/77/83 px → 9/49/74 px.  By eye
(`scratchpad/ab_before_0a28.png` vs `ab_after_0a28.png`) the canopy silhouette
goes from blocky to feathered; it is a fidelity fix, not the fix for note 3.

**DO NOT credit note 3's improvement to this.**  The dramatic change between the
previous session's `scratchpad/crop_0a28.png` (a wall of leaf slabs) and today's
`verify/pair_t3a_0x0a28.png` (a row of rounded canopies at the reference's size)
happened BEFORE this byte changed — `results_final.json`, captured at 16:14 with
`alphaRef 0x80`, already scores 0x0a28 at 24.97 against the doc's 27.21 baseline.
It came from the concurrent texture-resolution work, not from here.

### WHAT IS ACTUALLY LEFT OF NOTE 3, and why it is not a constant

The residual, visible at both 0x0a28 and 0x1210: the reference shows the canopy
sitting on a clearly separated **trunk**, with sky between the canopy's underside
and the ground.  The port's canopy runs down to the ground.

That is the yaw sweep's near-side foliage.  Foliage at z ≈ −110 is 40 units from
an eye 150 away and magnifies 3.7×; its y range 54..197 projects to NDC y −1.85
.. +1.7, i.e. a full-height smear.  The trunk region of the target is filled by
it.  Everything that could produce that has now been disassembled and matches
the port exactly: `mat4Euler` (§3b), `mat4Mul` argument order (§3b), all sixteen
generator constants (§3b), the arg map of `FUN_00409d45`, the 16-pass loop, the
`rand01()·2π` yaw, the `(k/M)·π` view angle, the `(0,128,−150)` eye, and
`FUN_00405c0c`'s exact 45° half-angle.

**STATUS: note 3/4 — root cause NOT found; every candidate mechanism has now been
eliminated by disassembly.**  The one thing NOT checked is the leaf TEXTURE
itself (`FUN_00416036` program 1 at 256×256): if the port's texgen produces a
leaf with more opaque area than the original's, every leaf quad is fatter and
the swept canopy fills the target — and `alphaRef 0xF0` only trims the soft
edge.  That is the next thing to look at, and it is in `texgenImage`, which was
off-limits this session (a concurrent agent owns it).

---

## 2b. `FUN_0040e923` FULLY TRANSCRIBED (disassembled 0x40e923-0x40ec25)

Ghidra drops the operand of every one of the eleven `ftol`s in this function and
mis-reads the pass count, so this is from `ndisasm`.

**It is SIXTEEN passes, not 32** — `0040E9DD mov dword [ebp-0x18], 0x10`.
(Ghidra prints the float reinterpretation `2.24208e-44` = bit pattern 0x10.)

Terrain fields used: `+0x00/+0x04/+0x08` = world size (x,y,z), `+0x0c`/`+0x14`
= half-extent x/z, `+0x24` = the **shadow map**, 256×256 **dwords**, `+0x2c` =
the **height map**, 256×256 dwords of integer height 0..255.

### Setup

```
inv = (1/size.x, 1/size.y, 1/size.z)
L   = lightVec * inv                                  ; FUN_00405271, componentwise
f   = 2 * half.x
L   = ( (L.x + half.x) / f,  L.y * [0x418284] = 1/256,  (L.z + half.z) / f ) * 256.0
memset(shadowMap, 0xff, 0x40000)                      ; the unshadowed limit
FUN_0040de2a(copyOfL)                                 ; DEAD — the result is never read
```

so `L` ends up in **height-map texel space**, 0..256 in x and z.

### The 16 passes

```
repeat 16:
  FUN_004010dc()                                      ; the loading progress bar
  for y in 0..255: for x in 0..255:
      jx = x + rand01() - 0.5 ;  jy = y + rand01() - 0.5      ; PER-PASS JITTER
      h  = heightMap[ (ftol(jy) << 8) + ftol(jx) ]
      P  = (jx, h, jy)
      D  = normalize(L - P)                                    ; FUN_00402626 then FUN_0040de2a
      if (D.x != 0 || D.z != 0) {
          while (|D.x| < 1.0 && |D.z| < 1.0) D *= 2.0          ; [0x418200] = 2.0
          D *= 0.5                                             ; [0x4170d4]
      }                                                        ; -> one step ~= one texel
      X = ftol(jx*65536) ; Y = ftol(h*65536) ; Z = ftol(jy*65536)     ; [0x418270] = 65536
      dX,dY,dZ = ftol(D.*65536)                                ; 16.16 fixed point
      lit = 0xff
      for step in 0 .. 0xfff:                                  ; at most 4096
          X += dX ; Y += dY ; Z += dZ
          if (X<0 || Z<0 || Y<0 || X>0xff0000 || Z>0xff0000 || Y>0xff0000) break
          if ( heightMap[(Z>>16)*256 + (X>>16)] << 16 > Y ) { lit = 0; break }
      old = (byte)shadowMap[y*256 + x]
      shadowMap[y*256 + x] = ftol( lit * 0.1 + old * 0.9 )      ; [0x418ea4] [0x418fa8]
```

The accumulator is an **exponential moving average with α = 0.1**, run 16 times
from a start of 255, so a permanently-shadowed texel converges to
`255·0.9^16 = 40.6`, not 0 — **the shadow's floor is grey 41/255 ≈ 0.16, never
black**, and 16 jittered samples at α = 0.1 give a soft, heavily-biased-to-lit
penumbra.  That is precisely the owner's "too dark and too coarse" complaint
inverted: whatever the port is drawing there is not this.

`FUN_0040e8fb(terrain, x, z)` = `FUN_0040e6f6(terrain, terrain+0x24, x, z, 0, 0x100)`
× `qword [0x418fa0]` = **× 1/255**, i.e. a bilinear fetch of the byte map
normalised to 0..1.  So the consumers see 0.16..1.0, never 0.

Cost estimate for the port: 16 × 65536 texels × O(100-300) march steps of integer
adds ≈ 2·10^8 iterations per landscape — a load-time bake, not a per-frame one.

### 2c. A COURSE CORRECTION for note 2: the missing shadow bake is the WRONG DIRECTION

`verify/pair_t5_0x0738.png` (fresh, this session).  The owner's words are "the
shadow on the landscape is too dark and too coarse", and that is exactly what
the frame shows: the port's shaded hillside is a flat near-black slab with a
hard boundary, while the reference's is dark but keeps its rock/grass texture
and has a soft edge.  Measured over the same window:

| | mean luma | min | max |
|---|---|---|---|
| ours, shaded hillside | 11.2 | 3 | 109 |
| reference, same       | 16.4 | 0 | 163 |
| ours, lit foreground  | 72.8 | 56 | 96 |
| reference, same       | 64.8 | 48 | 86 |

The lit ground already matches (we are in fact slightly BRIGHTER there); only
the shaded side is wrong, and it is wrong by being too dark and too flat.

**`FUN_0040e923` can only ever darken** — it starts from `memset(0xff)` and its
EMA drives lit texels down towards 40/255.  The port currently runs at that
function's unshadowed limit, `S = 1.0`.  So implementing it would move 0x0738
further in the direction the owner is complaining about.  **Note 2 is not the
missing shadow bake.**

The darkness is the runtime lighting on the terrain, not the ground texture (the
ground bake's only lighting term is `S`, and `S = 1`).  The scene root's ambient
is `0x1f1f1f1f` (port `K.AMBIENT`, matching `sonnet.c:7009`), so a face turned
fully away from the point light should still show 12.2 % of its texture; the
reference behaves like appreciably more than that.  Next steps for whoever picks
this up, in order of cheapness:
1. whether `minid3d8` applies `D3DRS_AMBIENT` × material ambient at all, and
   with what material ambient (D3D's default is (0,0,0), which would crush
   exactly like this);
2. `FUN_00405d13`'s light `Ambient` member (SCENES_7_10 §4 records Diffuse but
   not Ambient);
3. the terrain vertex normals (`FUN_004045f1`) — but note the instruction never
   to normalise them.

That said, §2b's transcription above is complete and correct, and the bake is
still worth having for the *props* (the billboard bottom vertices and the
array-B curtain grey), which currently sit at pure white.

---

## 5b. Note 6, clouds at 0x1828 — first look, and a bigger error alongside it

`verify/pair_t5_0x1828.png`, RMSE 30.00.  Two things, and the second is larger
than the one the owner named:

1. **The clouds.**  The reference's sky carries many soft wispy cloud forms; the
   port's carries two or three faint blobs in the same places.  The composite
   itself is ported and correct (`SCENES_7_10.md` §11) — the alpha-tested blit
   `alphaRef = cloudParam` is a THRESHOLD on the accumulated noise alpha, so the
   number of surviving cloud forms is set by (a) the alpha profile of texgen
   program 7 after the `a -= 0x20` clamp and (b) the additive accumulation of
   `N` scrolled quads at greys `0x3f, 0x7e, 0xbd, …`.  Anything that makes the
   port's program-7 alpha lower than the original's kills forms wholesale at
   this threshold.  That is the same suspect as note 3's residue — the texgen
   alpha profile — and again it lives in `texgenImage`, off-limits this session.
2. **The sun glow is missing entirely.**  The reference has a large bright
   yellow-white glow filling the upper-left of the sky; the port's sky there is
   flat orange.  That is the whole of the doc's luma gap at this position
   (ours 52.3 vs reference 64.4) and it is a bigger error than the clouds.
   Not investigated.

---

## Session 2 closing state, at the owner's six positions

Full sweep `t3full` (354 samples, `--quality=original`), median **27.06**
(baseline 26.70; the leftover `final` run of the same tree measured 26.94, so
this is inside the documented noise).

| pos | doc baseline | now | note |
|---|---|---|---|
| 0x0628 | 65.72 | 72.88 | §1's spire fix — the documented "RMSE goes the wrong way" case |
| 0x0738 | 26.53 | 26.54 | note 2 — diagnosed, redirected (§2c), not fixed |
| 0x0a28 | 27.21 | 25.16 | note 3 — improved, but by the concurrent texture work, not by §3c |
| 0x1210 | 42.22 | 42.20 | note 4 — same fault as note 3 |
| 0x1828 | 30.01 | 30.00 | note 6 — first look only (§5b) |
| 0x1b38 | 78.18 | 67.24 | note 7 — the lens droplets, fixed last session |

Tests: `meshgen_test` 369/369, `minid3d8_test` 116/116, `integration_test`,
`timeline_test`, `text_test` all pass.

---

## 2d. Note 2 (0x0738) MEASURED: the terrain lighting is 97 % BINARY

§2c said the darkness is the runtime lighting, not the missing shadow bake, and
listed three candidates. This is the measurement §2c asked for, taken live at
0x0738 over object 4's terrain (586 sampled vertices, `light.Position` =
scene 1's `sunPosition` (−400, 374, 400), `Attenuation1 = max(haze, 1e-4)` =
1e-4 because scene 1's haze is 0):

| quantity | value |
|---|---|
| vertices with `N·L == 0` (ambient only) | **31.9 %** |
| vertices with `att·N·L ≥ 1` (saturated) | **64.7 %** |
| everything in between | **~3.4 %** |
| mean attenuation multiplier | **15.56×** |

`att = 1 / (A0 + A1·d + A2·d²)` with `A0 = 0` is not a falloff at all — it is a
**gain**, ~15× at this scene's distances, so every face with `N·L > 0.06` clips
to full brightness and every face turned away sits at exactly the ambient floor.
The terminator is therefore a hard edge with no penumbra: precisely the "flat
near-black slab with a hard boundary" the owner reported.

Photometrically, over the same hillside band:

| | mean | median | p90 |
|---|---|---|---|
| ours | 20.9 | 11.1 | 18.7 |
| reference | 30.7 | 4.5 | **92.3** |

The reference is **bimodal** — it goes both darker (median 4.5) and far brighter
(p90 92) than ours, which is a textured, gradated surface. Ours is a single
tight dark mode. **We are missing light on that face, not shadow.**

### Refuted, with numbers: `Attenuation0 = 1.0`

The obvious reading — that `A0` should be 1.0, making `att = 1/(1 + A1·d)` a
gentle falloff that would preserve the `N·L` gradient — was tried and is
**wrong**: 0x0738 RMSE 26.54 → 28.33, 0x1210 → 42.39, and the whole scene dims
(the amplification the port currently gets is load-bearing for the lit
foreground, which already matches the reference at ~70 luma). Reverted.

### What that leaves

The gain is doing work that in the original must come from somewhere else, so
the light-equation parameters are probably not the fault. Remaining candidates,
cheapest first:

1. **The light struct's real layout.** `FUN_00405d13` writes dwords
   0x2b–0x2f, 0x3e, 0x3f, 0x41 and memsets 0x68 bytes; but `scene7.js`'s own
   comment puts `Range` at **+0x118** (dword 0x46), which no single D3DLIGHT8
   placement satisfies. Until the offset of `Attenuation0/1` in that object is
   pinned by disassembly, `max(haze, 1e-4)` is an inference, not a reading.
2. **Terrain vertex normals** (`FUN_004045f1`) — 32 % of vertices at exactly
   `N·L = 0` is a lot; if the original's normals are computed differently (or
   the terrain's Y scale enters them differently) the terminator moves.
3. **Whether the original lights the terrain at all in this scene**, versus
   getting its relief from the ground-texture bake (which would make the
   shadow bake relevant again, but as *texture* detail rather than as vertex
   lighting).

### 2e. The light struct is now PINNED — and the port's parameters are all correct

§2d listed "the light struct's real layout" as the cheapest candidate. Settled,
by disassembly rather than inference:

`FUN_00405d13` memsets **0x68 bytes** from dword 0x2b — and `sizeof(D3DLIGHT8)`
is exactly 26 dwords = 0x68. That pins the struct at **light + 0xac**, which
`FUN_00405da8` then confirms by calling `SetLight(index, param_1 + 0xac)`
(vtbl +0xb0, VA 0x405f?? / sonnet.c:4979).

| field | offset | value | how set |
|---|---|---|---|
| Type | +0x0ac | 1 = POINT | ctor |
| Diffuse | +0x0b0..0x0bc | **white** | ctor sets 1,1,1,1; per frame from the packed ARGB at **+0x114**, whose ctor value is `0xFFFFFFFF` and which the Landscape never overwrites |
| Ambient | +0x0d0..0x0dc | 0 | memset |
| Position | +0x0e0..0x0e8 | node position | per frame from +0x88 |
| Range | +0x0f8 | **1500.0** | per frame from **+0x118**, which the Landscape sets to `0x44bb8000` |
| Falloff | +0x0fc | 1.0 | ctor |
| **Atten0** | +0x100 | **0.0** | memset, never written |
| **Atten1** | +0x104 | `max(((255 − desc[0x3e])/255)³, 1e-4)` | per frame from +0x11c, clamped against `[0x4182f0]` |
| Atten2 | +0x108 | 0 | memset |

**Every one matches the port**, including the cube — `scene_desc.mjs` already
computes `haze = ((255 − hazeDensity)/255)³` and scene7 clamps it with
`K.ATT_MIN = [0x4182f0]`. Note the earlier confusion the offsets resolve: the
port's comment cites "+0x118" for `Range`, and that is right as the *source*
field, but `D3DLIGHT8.Range` itself lives at +0x0f8.

**Consequence — and it inverts §2c a second time.** The original's light
equation is `att = 1/(1e-4·d)` for six of the eight scenes, i.e. the same ~15×
gain the port has. **The original's terrain lighting saturates exactly as ours
does**, so the reference's soft, textured hillside cannot be coming from vertex
lighting in either build. It has to come from the surface itself — the ground
texture, whose only shading term is `S`, the shadow map. Ruled out alongside
it: the bit-17 rise ramp is complete at 0x0738 (`t140 = 1.0`, `scale.y = 0.5`,
overlay alpha 0, max world Y 112.9), so the geometry is at full height.

**So `FUN_0040e923` is back on the table for note 2 after all** — not as vertex
shadow but as the missing *texture* detail, which is also the only mechanism in
the engine that can put relief-shaped variation on a face the point light has
already saturated or abandoned. §2c's "wrong direction" argument holds only for
the mean; it did not account for the reference being bimodal.

### 2f. Fog exonerated; the NORMAL TRANSFORM is a real defect but not a clean fix

Continuing §2e's hunt for where the reference's brightness on that face comes
from. Two candidates tested and settled.

**Fog — exonerated (PINNED by measurement).** Scene 1's fog is linear
400 → 700 over a pale `0xc8c8ff`. The unlit terrain mass sits at a median
**332 units** from the camera (p25 240, p75 484), i.e. *inside* `fogStart`, so
`f = 1` and fog correctly contributes nothing to the near half of the dark
slab. Fog cannot be what lightens the reference there.

**The normal transform — a genuine defect, and it is NOT a clean win.**
`minid3d8`'s vertex shader lights with

```glsl
vec3 N = (uWorld * vec4(aNormal, 0.0)).xyz;
```

but D3D's fixed-function pipeline transforms normals by the **inverse
transpose** of the world matrix. Every scene's terrain carries a non-uniform
`terrainScale` (3, 0.5, 3), and the plain world transform amplifies a normal's
horizontal components **6× relative to its vertical** — the lighting sees a
terrain six times steeper than the one being drawn. That is a mechanism that
predicts all three symptoms at once: 31.9 % of a *heightfield's* vertices
facing away from a light directly overhead (implausible on its face), the hard
terminator, and flat ground still lighting correctly (its normal stays
vertical under the squash).

Measured with `transpose(inverse(mat3(uWorld)))`:

| pos | baseline | inverse transpose | Δ |
|---|---|---|---|
| 0x0738 (the complaint) | 26.54 | **26.02** | −0.52 |
| 0x0710 | 23.63 | 23.63 | 0.00 |
| **0x0900** | 33.16 | **39.42** | **+6.26** |
| 0x1210 | 42.54 | 42.87 | +0.33 |
| 0x1a00 | 32.96 | 32.65 | −0.31 |
| 0x2030 | 26.80 | 27.32 | +0.52 |
| mean | 30.94 | 31.98 | **+1.05** |

It moves the complaint frame the right way and the average the wrong way, so it
is **reverted, not landed**. The 0x0900 regression is the informative part:
that is scene 1's water position, and the reflection pass **negates
`scale.y`** — under an inverse transpose a negated axis inverts rather than
squashes, so the mirrored geometry lights differently. The likely reading is
that the port is currently *right for the wrong reason* in at least one place,
and that the correct normal transform has to land together with whatever the
reflection pass needs, not before it.

**Do not re-run this experiment blind** — it has been measured. The next step
is to establish what D3D8's FF pipeline does with a mirrored (negative-scale)
world matrix, then land both together.

### 2g. SOLVED — note 2 was TWO defects that were cancelling each other

The 0x0738 complaint ("shadow on the landscape too dark and too coarse") is
fixed, and the reason it survived four investigations is that **neither half
helps on its own — measured, each is a regression**:

| | 0x0738 | 0x0900 | 0x1a00 | 0x2030 | mean (6 pos) |
|---|---|---|---|---|---|
| baseline | 26.54 | 33.16 | 32.96 | 26.80 | 30.94 |
| inverse-transpose normals only | 26.02 | **39.42** | 32.65 | 27.32 | **31.98** |
| shadow bake only | 26.78 | 33.54 | — | — | (≈ +0.2) |
| **BOTH** | **17.31** | **30.60** | 32.41 | 29.41 | **29.34** |

**Defect 1 — the normal transform.** `minid3d8` lit with `uWorld * aNormal`;
D3D's FF pipeline uses the **inverse transpose**. With `terrainScale`
(3, 0.5, 3) that amplified horizontal normal components 6× relative to
vertical, so lighting saw a terrain 6× too steep: a hard terminator, 31.9 % of
a *heightfield's* vertices facing away from an overhead light, and flat black
slabs.

**Defect 2 — the missing shadow bake.** `FUN_0040e923` was never ported, so the
ground texture carried no baked relief shading (`S = 1` everywhere).

**Why they hid each other.** The over-steep normals produced darkness in
roughly the places the baked shadow belongs. Fix the normals alone and that
darkness vanishes with nothing to replace it (0x0900 +6.26). Land the shadow
alone and it merely adds to darkness that is already excessive (0x0738 +0.24).
Only together do they separate: soft, texture-shaped shadow from the bake, and
correct gentle vertex lighting on top.

**The bake, ported** (`MG.buildShadowMap` in `js/meshgen.mjs`): 16 passes,
jittered 2 rand01 per texel, 16.16 fixed-point ray march, EMA `0.1/0.9` from
255. Its measured floor is **45** against §2b's predicted `255·0.9¹⁶ = 40.6` —
an independent confirmation of the transcription. **203 ms per landscape** in
Node, so ~1.2 s over the six terrain scenes; the earlier "2·10⁸ iterations,
10–30 s" estimate was pessimistic because most rays leave the map quickly.
Called from inside the terrain build, i.e. **before every array generator**,
consuming 2,097,152 shared-RNG draws exactly where the original consumes them.

**Still open:** 0x2030 (winter) regresses +2.61 and is the one position that
prefers the old pair of bugs — worth a look, but it is one sample against a
9.2-point gain at the frame the owner actually reported.
