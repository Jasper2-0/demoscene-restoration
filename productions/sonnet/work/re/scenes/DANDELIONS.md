> **⚠ WORKING RECORD.** Current scene-2 status lives in
> [`SCENE2_TODO.md`](SCENE2_TODO.md). Of this file's "Still open" list, the
> array-F wind updater (`FUN_0040cfed`) is still the one genuinely missing
> system in scene 2.

# Scene 2's dandelions — `FUN_0040c721` + array D, PORTED (2026-08-08)

Jasper, twice: *"in scene 2 the trees look wrong"* → *"the dandelions are also
missing in that scene"*. Both were the same omission at root: the port never
built **array D**, and array D's subject is the compound prop — which is a
**dandelion**, not an abstract "plant". Scene 2's second half is a low camera
flying through a dandelion meadow (video t = 139–155 s); we rendered an empty
lawn.

## Why it was missing

`SCENES_7_10.md` §12.5 deliberately deferred `FUN_0040c721`, justified by *"no
scene in objects 7..10 uses array D"*. That is true and irrelevant: **scene 2
is object 5.** The scope-limited justification became a global one when the
Landscape class was consolidated. Scene 2's descriptor sets `buildBillboards1`
with `D = {count 256, size 1.6, box ±300}` and `buildProps` with one array-F
instance at the origin, scale 0.15.

## What was ported

* **`MG.buildDandelion()`** (`js/meshgen.mjs`) — the §12 transcription made
  real: 8-sided stem (r 0.3, y 0→46.9), 128 randomly-tilted 4-sided tapered
  twigs at y = 50, 16 curved 3×3 leaves per twig (root/tip rotations lerped
  along the length — that is what curves them). Vertex colours 0x5FFFFFFF
  (twigs) / 0x2FFFFFFF (leaves) with additive materials is what makes the head
  read as a translucent white puffball.
  **RNG: exactly 4864 draws**, asserted in the port by running the generator
  and comparing the LCG state against 4864 bare `rand()` calls — the §12.5
  worry ("a wrong count is strictly worse than none") is now a checked
  invariant, not a hope.
* **The 4864 are in TWO GROUPS, split by a barrier** (found 2026-08-11 via
  `/codex:rescue`; predicted states reproduced exactly before the change).
  `FUN_0040c721` runs 4352 geometry draws, *then* texgen program 3 at
  `0x40CDCC` and program 4 at `0x40CE65`, *then* the 128 seed records at
  `0x40CEEC`/`0x40CEFF`/`0x40CF13`/`0x40CF5D` (4 × 128 = 512). Program 3's
  op 3 **self-reseeds**, so it is a stream barrier: the port drew all 4864
  inside `buildDandelion`, which put the 512 records *upstream* of the reseed
  where they were erased, and every consumer after the bake ran 512 draws
  early. Split into `MG.buildDandelion()` + `MG.buildDandelionRecords()`, with
  the caller running both texgens between them.
  **Why the count-based audit could never catch this:** total draws is
  conserved under reordering; stream position across a barrier is not. The
  4864-draw invariant held true throughout the bug's lifetime.
  Verified: post-geometry `0xa57c943d` → post-texgens `0xb67fd936` (the
  barrier constant) → post-records `0x5f95db36`, and the impostor yaws move
  from the old values to 3.203242 / 3.663642 / 3.928070.
  Note the second call site (array F's standalone prop) needs no texgen work:
  `FUN_00416036` caches per program id (`DAT_00478a38[id*8]`, a hit only
  memcpy's the stored pixels), so re-issuing programs 3 and 4 draws nothing.
* **Impostor set 2** (`bakeDandelionSet` in `scene7.js`) — 128² RT, 1 pass,
  lit; subject at y = −50 ([0x418f34]) so the *head* sits at the origin;
  eye Ry(kπ/2)·(0,0,−10) ([0x418f2c]), target origin, fov 90°, aspect 1.
  Dumped and eyeballed: a clean white puffball on a thin stem, head in the top
  80% and stem in the bottom strip — exactly what `BILLBOARD_TYPE1`'s UVs
  (head v 0..0.8, stem u 0.47..0.53 / v 0.85..1.0) expect.
* **Bake ordering fix** — `FUN_0040b0b0`'s `DAT_00478968` guard bakes ALL THREE
  sets (leafy tree, bare tree, dandelion) at the FIRST billboard build. The
  port baked lazily per set, which put every subsequent generator's draws at
  the wrong stream position. `bakeImpostors` now bakes 0, 1, 2 in that order.
* **Array D build + array F instance**, and the sway updater **`FUN_0040bb14`**:
  per instance a phase advances by `dt·0.1` ([0x418ea4]); displacement
  `(sin(phase)·amp, 0, cos(phase·1.27)·amp)`, `amp = size/2`, applied to the
  **rest pose** (not accumulated), moving 6 of 8 verts — the stem base stays
  anchored. `[0x418f40] = 1.27` makes the two axes incommensurate, so the
  wobble never repeats.
* **Scatter seed, from the binary**: array D pushes a **literal 1**
  (`push dword 0x1`, VA 0x407f81) where array C three call sites earlier pushes
  its **loop counter** (`push [ebp-0x4]`, VA 0x407dfd). The port had been
  passing the record index for both. Fixing D to 1 removed two badly-placed
  foreground dandelions and matched the reference's distribution.

## The bug that hid it all (worth remembering)

With everything above in place the field was **still invisible** — and the
symptom was maximally misleading: the meshes were in the draw list, not
hidden, `drawMesh` ran, `gl.getError()` was 0, the index/vertex counts were
right, the texture was bound, and a bbox over the vertex buffer reported sane
world coordinates.

**1536 of 2048 vertices had NaN in x and z** — exactly the 6-of-8 the sway
updater writes. Cause: `const amp = F(g.size * K.HALF)` — **`K` in `scene7.js`
is scene7's own constants table and has no `HALF`** (that is `meshgen.mjs`'s
`K`). `undefined` → NaN → the GPU discards the triangles silently.

Two lessons:
1. **A min/max bbox cannot detect NaN** — every comparison against NaN is
   false, so NaN vertices are skipped and the bbox looks perfectly healthy.
   When geometry "draws" but is invisible, count non-finite components before
   trusting any aggregate.
2. **Two modules with a same-named constants object is a trap.** `K.HALF`
   exists in `meshgen.mjs` and not in `scene7.js`; the reference is legal JS,
   silent at runtime, and fatal to the render.

## Verified

* All suites pass: integration / timeline / text ALL PASS, meshgen 369/369,
  minid3d8 116/116.
* **The feared RNG-stream shift did NOT materialise**: full 354-sample sweep
  (`verify/results_dandelion.json`) shows objects 3, 4, 8, 9 and 10
  **bit-identical** to the pre-dandelion baseline; objects 6 (+1.21) and 7
  (−0.53) sit inside the documented sub-1.5 noise floor. The 4864 draws land
  where the original's land, and the scatter/bake generators that follow
  reseed anyway. Global median 26.51 → 26.81, mean 27.57 → 28.35 — the whole
  move is scene 2's.
* Scene 2's own RMSE goes **up** slightly (median 19.61 → 23.00; 0x0d00
  37.26 → 39.57 → 38.09 after the seed fix). This is the documented
  metric-versus-goal divergence: 256 bright puffballs that the reference has
  and we did not are now drawn, and any residual placement/brightness
  difference is now scored twice (missing here, extra there). Judge by eye —
  `verify/pair_0x0d00.png` — where the field now tracks the reference closely.

## THE ORIGINAL DOES NOT RENDER THE STEMS AT ALL — author-confirmed (2026-08-08)

**sagacity (the demo's own coder) told Jasper that the missing dandelion stems
are a BUG IN THE ORIGINAL.** Independently confirmed from the capture before
acting on it: at 0x0d00 the reference's field dandelions are **stemless white
puffs floating above the grass** (`scratchpad/ref_field.png`), and the big
array-F plant has no stalk either — so the impostor RT's stem strip is empty in
the original too.

`FUN_0040c721` *builds* the stem mesh (the 8-sided cylinder of §12.3) and
`FUN_00405f0e` registers it, so this is a DRAW-time failure in the original, not
a missing generator.

**The author never diagnosed it either** — asked directly, sagacity answered
*"Ja klopt. Had ik geen tijd meer om uit te zoeken."* (yes, correct; I ran out
of time to figure it out). So **do not mount a campaign to find the mechanism**:
nothing depends on it, since the draw-gate below reproduces the behaviour
exactly. The one reason to spend a bounded look is defensive — a draw-state bug
capable of swallowing a whole registered mesh could be silently affecting other
meshes in the original too, and knowing its shape would tell us where else to
check.

**Policy applied — the same one the audio panning fix uses:** the stems are a
REMASTER fix, not a fidelity error.

* `?quality=original` → `scene7.AUTHENTIC` is set and the stem is **not drawn**,
  reproducing the original's bug, in both the set-2 impostor bake and the
  array-F prop.
* default (remaster) → stems drawn.

It is a draw gate, not a build gate, so **the RNG stream is identical on both
paths** and the 4864-draw invariant is untouched. Measured: 0x0d00 36.94 →
36.87, 0x0e30 16.68 → 16.57 (the stems are thin, so the metric barely moves —
but the authentic path is now actually authentic, and the frames match by eye).

## Stems too dark — the normal-vector bug (2026-08-08)

Jasper: *"the dandelion stems are indeed too dark, in the original they're
drawn additively."* The blend half is not what the binary says — the three
materials are, in order (ndisasm 0x40cdc0-0x40ceb0):

| mesh | `this+` | flags | meaning |
|---|---|---|---|
| twigs  | 0x04 | **0x11** | additive, cull none |
| stem   | 0x00 | **0x10** | **opaque**, cull none |
| leaves | 0x08 | **0x11** | additive, cull none |

So the *puffball* is additive and the stem genuinely is not. But the reported
symptom was real and the cause was mine: **`FUN_0040c721` never computes vertex
normals.** `FUN_00409d45` (the tree) calls `FUN_0040449f` twice, once per mesh;
there is no call to it anywhere in `0x40c721..0x40cfed`. Buffers come from
`FUN_004042e0` = `VirtualAlloc(MEM_COMMIT)` and `FUN_00404380` initialises only
the colour dword (`0xFFFFFFFF` at +0x18, stride 0x2c) — so every dandelion
normal is `(0,0,0)` and the whole plant renders **ambient-only, flat and
unshaded**. The port called `computeNormals()`, which gave the stem real
directional shading and turned its far side near-black.

Removing it is faithful and `minid3d8` handles it correctly by design
(`D3DRS_NORMALIZENORMALS` is false and the shader deliberately never
renormalises, so a zero normal yields `N·L = 0` rather than NaN).

**Measured — improves at every dandelion-visible position:** 0x0d00
38.09 → **35.35**, 0x0e00 15.19 → **13.78**, 0x0e30 17.59 → **16.68**
(0x0a28/0x0c08 unchanged — no dandelions in frame). 0x0d00 is now *below* the
pre-dandelion baseline of 37.26, so the field is a metric win as well as a
visual one. The 4864-draw RNG invariant still holds (re-asserted).

**Lesson:** `computeNormals()` is not a harmless finishing touch — whether a
generator calls it is a *rendering decision* the original makes per mesh, and
getting it wrong changes lighting everywhere that mesh appears. Check for the
call site; do not assume.

## Still open
* **`FUN_0040cfed` (array-F wind) unported** — the reference's big dandelion
  sheds seeds that drift right across the frame; ours is static. This is the
  most visible remaining difference at 0x0d00.
* The bake's 1-pass set-2 alpha: RT coverage measures 0.37/0.45 (α>8) —
  plausible but never compared against a ground-truth dump.
