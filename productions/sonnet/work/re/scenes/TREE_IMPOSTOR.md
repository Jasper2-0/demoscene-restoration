> **⚠ WORKING RECORD, not a status page. For what is still open in scene 2 see
> [`SCENE2_TODO.md`](SCENE2_TODO.md).** The "width knot" and "Candidate next
> steps" sections at the end of this file were written BEFORE the fix below and
> are kept only as a record of what was ruled out — do not read them as open
> questions.

# The tree impostor — SOLVED (2026-08-10): the BAKE RAN AT THE WRONG RNG STREAM POSITION

**The generator was never wrong. The build ORDER was.**

`FUN_004078b6` (scatter) is called at VA 0x407d44, and `FUN_0040b0b0` at
0x407d98 — so the original scatters the FIRST array-C cluster, and only then
does `FUN_0040b0b0`'s `DAT_00478968` first-call guard run the three impostor
bakes (0x40b0fd/0x40b112/0x40b127), with the per-instance yaws after that
(0x40b208). The port baked BEFORE the loop.

The tree's branch jitter and leaf emission draw from the SHARED stream, so
entering `buildTree` at a different stream position builds **a different
stochastic tree**:

| entry state | leaves | near-camera leaves (depth < 75) |
|---|---|---|
| isolated port (seed 1) | 1317 | 123.2 |
| port's normal path (`0xcad439f8`) | 1315 | 94.3 |
| **original (`0xb9583054`)** | 1329 | **63.0** |

Same leaf COUNT, **one third fewer near the bake camera** — exactly the "same
ink, different depth" signature measured in `re/SHIM_AUDIT.md`.

**Why it survived ~28 verifications and a full clean-room re-derivation:** every
check asked "is this formula/constant right?" and every answer was yes. Nobody
asked "does this run at the same point in the RNG stream?" — and the one time
stream position WAS tested, the measurement used canopy *radius* (118 → 114/109,
3-8 %, dismissed) instead of near-camera leaf *density*, which moves by a third.

**Found by Codex** (`/codex:rescue`, 27 min) after the generators and ten shim
behaviours had been cleared. Its prediction was verified before any change:
forcing `srand(0xb9583054)` before `buildTree` reproduces 10632 leaf verts /
1329 leaves, bbox x −105.860..113.665, y 54.488..195.874, z −108.336..108.464
and post-build state `0x35f508ed` — all exact, and the live bake reproduces them
after the reorder.

**Fix:** `scene7.js` now runs the first-call bake inside the array-C loop, after
that record's scatter and before its yaws — the original's position.

**Measured:** 0x0c08 (the demo's worst sample) 58.62 → **49.26**, 0x0a28
26.51 → **21.53**, 0x0d00 36.87 → 35.31. And unlike the `SPREAD = 0.3` fudge,
**RMSE moves the same way as the frame** — the trees now render as distinct
rounded canopies on visible trunks, matching the reference's composition.

**Still open from the same root cause** (see `re/SHIM_AUDIT.md`): the original
uses ONE global RNG for mesh generation, texgen, bake passes and billboard yaw;
the port keeps meshgen and texgen on separate streams and pre-warms texgen out
of binary order, so the per-pass yaws still start from the wrong state
(H2 — expected first-angle yaws are 4.145134, 1.139591, 0.134419, 1.516003,
0.162799, 3.023760, 5.738989, 1.792320, 4.705246).

---

# (historical) The investigation before the cause was found

Status 2026-08-06: **root cause NOT yet found.** This file exists so nobody
re-verifies what is already settled. Everything below was checked at
instruction level (ndisasm) or measured, this session.

## The symptom

Scene 2 (obj 5) has **no real trees** — array E is empty; the whole forest is
billboard impostors. At 0x0a28 the reference shows rounded canopies on short
trunks with gaps between trees; ours are straight-edged slabs (the quad borders
are visible as straight lines ⇒ the RT content inks its own edges), foliage to
the ground, and thick orange branch "arms". At 0x1210 (distant single quad) the
silhouette top-profile matches the reference within ~2 px — distance hides the
fault; the near clusters expose it.

## Verified EQUAL (do not re-check)

| thing | how settled |
|---|---|
| `FUN_00402280` = identity-reset (`FUN_00401950`, full identity incl. translation) then Rx(e0)·Ry(e1)·Rz(e2) | ndisasm 0x402280/401950 |
| axis rotations: element layout and signs == `MG.mat4Euler` | ndisasm 0x402381/4023ed/402459 |
| `FUN_004024c5(dst,A,B)` = row-major A·B == `MG.mat4Mul(A,B)` | ndisasm 0x4024c5 |
| `FUN_0040523d`/`FUN_00405271` = plain vec add / componentwise mul (no clamp) | decompile, trivial bodies |
| child dir = parentDir + bend + offset; offsets z∓0.6, x∓0.6, jitter rand01·0.4−0.2, depth-first, RNG order | decompile + constants dumped |
| child pos = parentPos + Euler(parentDir)·scale · (0,66,0) — no dropped x87 | ndisasm 0x40a25c–0x40a2c2 |
| leaf gate `ring != 0 && depth != 0` (leaves at ALL depths 1–4) | decompile 8469 |
| `rand01` = rand()·(1/32767) | decompile 0x401341 + [0x4170d0] |
| bake tree params: radius 10, taper 0.75, leafSize 2.0, bend (0,0,0), meshScale 1.0 | host signature (param_9..13) + call at 0x40ab? (decompile 8838) |
| bake camera: eye Ry(kπ/2)·(0,128,−150), target (0,128,0), fov 90° @+0xbc, aspect 1.0 @+0xc8; look-at proven (`FUN_00402072`) | ndisasm 0x40af65–0x40afd1; camera field map = fovDeg/near/far/aspect @+0xbc/c0/c4/c8 |
| angle count = 2 (param_5 at both `FUN_0040b0b0` call sites) | decompile 6717/6741 |
| pass structure: one clear; p0 leaves-only lit ambient 0x3f3f3f3f; p1..9 branches + leaf mesh re-yawed rand01·2π + fresh per-quad greys `ftol(rand01·127+128)`, **unlit** (`FUN_00406004` skips BOTH bracket ends when ambient==-1, so pass 0's closing state — lighting OFF, ambient white — persists; port's reading is right) | decompile 5108 + 8864–8953 |
| grey colour = 0xFF g g g (A=FF) | ndisasm 0x40af35–0x40af4a |
| leaf-tint at bake = 0xffa4ff9d GREEN — **proven by sequencing, not assumption**: every scene build writes `[0x47895c] = 0xffa4ff9d` (or `0xffff0032` under flag bit 23 = autumn) at VA 0x407a61/0x407a74, after its terrain and before its tree/billboard blocks; scene 0 builds first, so scene 2's bake sees green. The image-static value IS 0 (BSS-like zero page), but it is written before first use. | ndisasm 0x407a40–0x407a7e |
| modulate = (src·tint)>>8 per ARGB channel, UNCONDITIONAL, 256² fixed | ndisasm 0x40a096–0x40a108 |
| billboard quads: UV 0..1 full RT, ±sz × 2sz, V=0 at top; material 0x1310, leaf material 0x300 (alpha test+blend+clamp), alphaRef 0xF0 | decompile 9198+ / flag map minid3d8 |

## The sharp contradiction

`web-sonnet/tools/assets.html` → "impostor bake SIMULATION" reproduces the
port's live RT numbers (54% coverage vs the live dump's 50.4%; margins L0 R0
T85 B0). Geometry: the canopy spans x ±117, z −114..112; the camera sits at
z −150, so near foliage is ~35 units from the eye and smears across the frame
— **with the verified camera and the verified tree, edge-bleed is
geometrically inescapable**. Yet the reference's RT content (forest crops
0x0a28, single quad 0x1210) is a compact dome with margins on all four sides.
For that, the canopy's near-extent must be ≲75 units — ~35% smaller radially
than what the verified generator produces.

## Jasper's "rendered from the wrong angle" hunch — audited (2026-08-06)

The billboards are FIXED crossed quads: per cluster, two meshes (yaw
k·90° + per-instance random yaw), each textured with the RT baked from the
matching azimuth; **both draw every frame — there is no runtime angle
selection to get wrong.** The quad rotation in `MG.buildBillboards`
(`x' = x·c + z·s, z' = −x·s + z·c`) is the same row-vector Ry as the bake
orbit — signs consistent. Array C selects the LEAFY set (bit 18 of desc+0x4f
chooses bare vs leafy — `(desc[0x4f] & 0x40000)` at call site 6722); array D
(type 1) uses the UNPORTED compound-prop set at 128². The "wrong angle" look
is most plausibly the edge-bled RT content making the crossing planes visible
as slabs.

## Reverse parameter search result (the actionable lead)

With the simulator, `TREE.SPREAD` swept at fixed everything-else:

| spread | coverage | margins L/R/T/B px |
|---|---|---|
| 0.6 (binary-verified) | 54.0% | 0 / 0 / 85 / 0 |
| 0.5 | 42.0% | 0 / 0 / 81 / 22 |
| 0.4 | 33.2% | 6 / 12 / 71 / 22 |
| **0.3** | **25.7%** | **47 / 61 / 77 / 22** |

**Effective spread ≈ 0.3 (HALF the literal constant) reproduces the
reference's look** — compact dome, margins on all four sides, and the bark
arms collapse to small flecks for free (denser leaf packing covers the
branches). `SEG_LEN` reductions were also tried and give the wrong shape
(tree sinks low in frame). So the discrepancy behaves exactly like a ×0.5 on
the branch-spread accumulation — but the constant 0.6 and its `fsub/fadd`
application are instruction-verified, so the halving must be structural
(something about how the original turns accumulated Euler offsets into
geometry that the ported model misses), or the reference content is shaped by
a stage we have not identified. Mixed-axis Euler composition damping was
considered and rejected: it applies identically to both implementations.

## Video ground truth (2026-08-06, Jasper's suggestion — dump the capture)

`reference/sonnet_ref.mkv` at 960×720 IS usable ground truth wherever the
camera nears a billboard. Extracted: t=123 s (scene 2 canopy flythrough — a
trunk fills the left edge, mid-ground forest row shows canopies on thin
distinct trunks with sky gaps) and t=192.9 s (= 0x1210's video time; the
island tree at full res: compact DENSE round canopy; its trunk is occluded by
the island crest so it cannot settle trunk proportions). Extraction recipe:
`pos → seconds = rows(pos)·0.16304`, video t = seconds + 2.43..2.51.

## Second verification wave (all EQUAL again)

* `FUN_0040a952` forwards the child offsets VERBATIM (by-value stack copy,
  parent appended) — ndisasm 0x40a952.
* **`this.dir = parent.dir + bend + offset` — the ACCUMULATION is
  instruction-verified** (ndisasm 0x40a1da–0x40a22e). The
  non-accumulating-offsets hypothesis (which would predict canopy half-width
  ≈76 ≈ the reference) is REFUTED as a reading of the code, despite
  predicting the observed content better. Unresolved tension.
* Set-1 polarity false alarm: scene 2 does NOT set bit 18 (`billboard0Opt`)
  — an earlier read of a debug dump confused key names with values. Scene 2
  uses set 0 (10-pass leafy) in both original and port. Light `+0x114` =
  packed diffuse, ctor default 0xffffffff, zeroed for set 1 — port's
  Diffuse-black reading confirmed.
* 10-pass union ≈ 1-pass in WIDTH (rigid rotation about the tree's own axis
  cannot exceed the cloud's max radius; the passes fill azimuthal gaps =
  density, not width) — sim confirms (1-pass content 487 px wide vs 511).
  So the width anomaly is in the TREE, and the tree is verified. The knot.

## NEW CONFIRMED GAP (separate from the width knot): scene 2's array D

Scene 2 sets `buildBillboards1` and has **array D = 256 instances, size 1.6
(≈3-unit quads), scattered over ±300** — the forest-floor undergrowth, baked
from the COMPOUND PROP (`FUN_0040c721`, set 2, 128²). The port builds array D
NOWHERE (the not-ported decision was justified by "no scene in objects 7..10
uses array D" — scene 2 is OBJECT 5). 256 missing ground plants in the
forest. Porting them needs `FUN_0040c721` (fully transcribed in
SCENES_7_10.md §12, never landed) + the type-1 bake + `buildBillboards`
type-1 path (template already in meshgen.mjs).

## Candidate next steps

1. **Ground truth**: run the original under Wine (or a Windows VM w/ dgVoodoo)
   and dump the impostor RTs — one screenshot of the bake output settles
   whether the original's RT really is compact or whether the visible
   difference comes from a later stage.
2. Parameter search with the simulator: find what spread/taper/leaf-size
   REPRODUCES the reference content, then hunt that value's origin in the
   binary (reverse direction: from target to code).
3. Audit `FUN_00406004`'s full render path for per-mesh state the direct
   drawMesh pair misses (fog? texture stage setup from `FUN_00401ca8` ctor?).
4. The billboard DRAW side: RT sampled without mips (original) vs port; check
   `createRenderTargetTexture` filtering — affects speckle, not shape.

## Tools

- `web-sonnet/tools/assets.html` — texture browser, mesh orbit viewer with
  per-mesh bboxes, "impostor bake camera" preset, and the bake simulator with
  passes / leafSize / alphaRef / seed ablation controls.
- Reference crops this session: scratchpad `ref_tree_crop.png`,
  `forest_ref.png` / `forest_ours.png`, sim shot `sim10.png`.

---

## Jasper's canopy/flare observation (2026-08-11) — a NEW instrument on the old knot

*"In the original the canopy of the trees is set up in such a way that the
pulses of the sun coincide with leaves moving in front of it; our impostor has
leaves in other places and as such there is no canopy for the sun to shine
through."*

**This is independent evidence for the width/placement knot, arriving through a
completely different channel — and it is a sharper instrument than RMSE.** The
flare's occlusion `fraction` is a direct, quantitative read on *where the leaves
are*, sampled exactly at the sun's screen position. RMSE averages the whole
frame and cannot distinguish "leaves in the right places" from "the same amount
of leaf in the wrong places"; the flare can.

### What is confirmed

* **The bake's density is authentic.** `passes = (opt == 0) ? 10 : 1` is PINNED
  — `0x40ADFA mov [ebp-0x14],1` / `0x40AE09 mov [ebp-0x14],0xa`. Ten overlapping
  copies is what the original does.
* **The horizon trees now match well** — distinct rounded canopies on visible
  trunks with sky between them, at 0x0c08. The old "wall of foliage" is gone
  (that was the RNG stream-position fix).
* **The foreground canopy does not.** At 0x0c08 the reference's canopy covers
  the sun; ours has a gap and the sun blazes through. Same trees, different
  leaf placement — exactly what Jasper describes.
* Our baked impostor (dumped from the live RT): a dense mushroom canopy at
  **37.1% coverage**, and the leaves visibly reach the RT's left and right
  edges — the documented overflow, now confirmed by eye rather than inferred.

### The mechanism, and where it diverges

Each billboard is a crossed-quad pair textured with the two baked angles and
rotated by a **per-instance random yaw**. A wrong yaw does not change how much
leaf there is — it changes *where the leaf is*, which is precisely the reported
symptom. Those yaws are Codex's open **H3**.

New instrument: `bakeTreeSet` / `bakeDandelionSet` now stamp the shared RNG
state at every boundary when `globalThis.__bakeProbe` is an array (inert
otherwise). Measured:

```
set0 pre-buildTree       0xb9583054
set0 post-buildTree      0xdedf2c8d
set0 post-passes         0x577c5291
set1 pre-buildTree       0x577c5291
set1 post-buildTree      0x3316173d
set1 post-passes         0x3316173d      <- set 1's single pass draws NO RNG
set2 pre-buildDandelion  0x3316173d
set2 post-buildDandelion 0xf1bfee3d
first-cluster preYaw     0xb67fd936      (Codex derived 0x5f95db36)
```

**`set1 post-passes == set1 post-buildTree` is CORRECT and worth recording**:
pass 0 draws no RNG (branches hidden, leaves only, lit), and only passes 1–9
re-yaw and re-grey. With one pass there is nothing to draw.

**The remaining gap is between `set2 post-buildDandelion` and the first yaw.**
Note also that the texgens inside `buildTree`/`buildDandelion` RESEED, so each
`post-buildX` state is an anchor independent of everything before it — which
makes this chain far easier to bisect than a single end-to-end number.

### Next step

Get per-boundary expected values (from the binary, or by asking `/codex:rescue`
for the same stamps it used to derive `0x5f95db36`) and compare. The first
boundary that disagrees localises H3 to one function. **Do not tune the canopy
geometry to make the sun pulse** — the L-system constants are clean-room
verified, and the 0.3 taper experiment already showed that matching the picture
by an unjustified constant is how this scene gets re-broken.

### Codex H3 after the exit-state fix: a clean 512-draw gap, cause NOT yet found

With op 3's exit state pinned, the first-cluster pre-yaw state is now stable at
`0xb67fd936` on BOTH quality paths (it was `0xed8e6b2f` on the default before).
That is `srand(26475) + 21845` — exactly op 3's eight octaves.

Codex's derived value, `0x5f95db36`, is `srand(26475) + 22357`: **512 draws
later, precisely.**

Two candidates checked and eliminated:

* **The water glitter** (4 draws x 128 records = 512 — a tempting exact match).
  Wrong scene and wrong order: `FUN_004080e0` lives in `FUN_004082a9` and runs
  AFTER `FUN_00407983`, which is where the arrays and their yaws are built; and
  scene 2 does not set `waterGlitter` at all.
* **A missing set-2 pass loop.** The pass count is a THREE-condition branch, not
  two: `0040ADF7 cmp [ebp+8],edi / jnz` then `0040AE03 cmp byte [ebp+0x10],0 /
  jnz` then `mov [ebp-0x14],0xa` — so `passes = 10` only when
  **`type == 0` AND `opt == 0`**. Set 2 passes `type = 1`, so ONE pass is
  correct and `bakeDandelionSet` already matches. (Worth recording: the port's
  comment said "ONE pass" and the two-condition reading of the formula said 10.
  The comment was right.)

So the gap is a real, precisely-sized unknown: **512 draws consumed between op
3's exit and the first cluster's yaws that this port does not make.** 512 = 2^9,
and 128 x 4 — but neither known consumer fits. Next step is to enumerate every
call between `FUN_0040abed`'s set-2 return and `0x40b208` (the yaw loop) and
count their draws, rather than pattern-match on the number.


### The 512 hunt: one wrong "fix", caught by the sweep (2026-08-11)

Enumerating every call between `FUN_0040abed`'s set-2 return and the yaw loop
found **two** `rand01() * 2PI` loops in `FUN_0040b0b0`, at 0x40B1BB and
0x40B208, both running `ebx` = instanceCount times. Our port draws both for
array D (the sway phases) and only the second for array C — which looked like a
missing per-record draw and a direct cause of wrong tree rotations.

**It was not.** The first loop sits inside a block guarded 26 bytes earlier:

```
0040B137  cmp edi,0x1
0040B13A  jnz 0x40b1d5        <- skips the ENTIRE block, that loop included
```

so it runs for **type 1 only**. Array C takes the jump. The port was right.

I had read the loop's inner guard (`test ebx,ebx`) and missed the outer one. The
sweep caught it immediately — forest **22.56 → 23.91**, median 25.31 → 25.53 —
and re-reading the disassembly confirmed the port rather than the change.
Reverted; both numbers returned exactly (median 25.31, forest 22.56).

**Two things worth keeping:**

* **A loop's guard may not be adjacent to it.** Reading from the loop outward
  found `test ebx,ebx` and stopped. The type test was a separate branch that
  jumps over the whole block. When a loop looks ungated, walk back to the
  nearest label that jumps PAST it, not just to the nearest test.
* **This is the case where RMSE is the right instrument.** Jasper's flare
  observation beat RMSE for leaf PLACEMENT, but a change that alters the RNG
  stream shifts every instance at once, and the sweep sees that immediately.
  Use the pointwise instrument for placement questions and the aggregate for
  stream questions — they are not competitors.

**The 512-draw gap to Codex's `0x5f95db36` remains open**, and both obvious
candidates (the glitter, a missing pass loop) plus this one are now eliminated.
