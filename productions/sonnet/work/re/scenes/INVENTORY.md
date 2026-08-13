# Per-scene system inventory

**Generated — do not hand-edit the table.** `node web-sonnet/test/inventory.mjs`
(add `--md` for this format). Jasper, 2026-08-08: *"perhaps first we should
build a general inventory of whether all objects and systems are present in
each scene?"*

The **descriptor is the authority**: every column below is decoded from the
scene's own resource (flag bits + array counts), so a system cannot be
forgotten by oversight — which is exactly how the dandelions were lost (array D
was deferred with the justification *"no scene in objects 7..10 uses it"*; the
forest is object 5). The port column is a map from each system to the call site
that implements it, grep-checked at run time, so it rots loudly instead of
silently.

**The checker checks itself — and it has now been wrong three times.** (The
third is written up at the bottom of this file; read it before trusting a ❌.)
(1) It reported the water glitter, the shadow bake and the lens flare as
PRESENT: all three matched prose in comments *about* the unported feature. It
now strips comments before matching and searches every port file
(`scene7/scenes/flare/scene3/main/meshgen`). A checker a comment can fool is
worse than none — anchor patterns to CODE (a call, a field), never a word.
(2) It iterated scene indices `0..7`, but **there is no scene 6**
(`DESC_RES_MAP[6]` aliases scene 0's resource) and the FINALE is scene 8 — so
it inventoried a phantom scene and skipped the finale entirely. It now walks
`ACTIVE_SCENES` (`[0,1,2,3,4,5,7,8]`). Both bugs were caught only because the
table prints its own column headers with the object number derived
independently: the phantom column came out as "obj NaN". **Make a generated
table restate its inputs; that redundancy is what exposes the generator.**

| system | generator | 0 spires (obj 3) | 1 lakes (obj 4) | 2 forest (obj 5) | 3 clouds (obj 6) | 4 beach (obj 7) | 5 autumn (obj 8) | 7 winter (obj 9) | 8 finale (obj 10) |
|---|---|---|---|---|---|---|---|---|---|
| terrain mesh | `FUN_0040e058` | · | ✅ | ✅ | · | ✅ | ✅ | ✅ | ✅ |
| ground texture bake | `FUN_0040e058 step 5` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| water plane | `FUN_004082a9` | · | ✅ | · | · | ✅ | · | · | · |
| water reflection pass | `FUN_00408dfc` | · | ✅ | · | · | ✅ | · | · | · |
| water glitter strip | `FUN_004080e0` | · | · | · | · | ❌ | · | · | · |
| array A — spires | `FUN_0040bc63` | ✅ | · | · | · | · | · | · | · |
| array B — curtains | `FUN_0040c1b2` | · | · | · | · | ✅ | · | · | · |
| array C — tree impostors | `FUN_0040b0b0 t0` | · | · | ✅ | · | ✅ | ✅ | ✅ | · |
| array D — plant impostors | `FUN_0040b0b0 t1` | · | · | ✅ | · | · | · | · | · |
| array E — real trees | `FUN_00409d45` | · | · | · | · | · | ✅ | · | · |
| array F — compound props | `FUN_0040c721` | · | · | ✅ | · | · | · | · | · |
| array G — birds | `FUN_0040f803` | · | · | ✅ | ✅ | ✅ | · | · | · |
| precipitation | `FUN_0040d1f1` | · | · | · | · | · | ✅ | ✅ | · |
| precip 64x64 refraction RT | `FUN_00408eef tail` | · | · | · | · | · | ✅ | · | · |
| lens droplets | `FUN_0040de4e` | · | · | · | · | · | ✅ | · | · |
| cloud layer + RT composite | `FUN_0040ec28/f27e` | · | ✅ | · | ✅ | · | ✅ | · | ✅ |
| ribbon strips | `FUN_0040f5a8` | · | · | · | · | ✅ | · | · | · |
| terrain cross-fade overlay | `FUN_0040e058 tail` | · | ✅ | · | · | · | · | · | · |
| terrain rise + water step | `FUN_00408eef` | · | ✅ | · | · | · | · | · | · |
| lens flare | `FUN_00405082` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| terrain shadow bake | `FUN_0040e923` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Legend: ✅ built (and animated where the original animates it) · ⚠️ built but its per-frame updater is unported · ❌ the descriptor asks for it and the port does not build it · `·` not requested by this descriptor.

| updater | generator | ported |
|---|---|---|
| leaf fall | `FUN_0040a9ad` | ✅ |
| bird flight | `FUN_0040fba1` | ✅ |
| spire growth | `FUN_0040bfc1` | ✅ |
| curtain wind | `FUN_0040c674` | ✅ |
| plant sway | `FUN_0040bb14` | ✅ |
| prop wind/seeds | `FUN_0040cfed` | ✅ |

## What the table says today (2026-08-10, after the scene-2 pass)

**One system requested-but-absent, none built-but-static:**

1. **water glitter strip** (`FUN_004080e0`) — scene 4 only; identified in
   `REVIEW_FIXES.md` §4 as the "missing waves on the ocean" note, never ported.
   **This is now the only ❌ in the whole table**, and it is not in scene 2.

`FUN_0040cfed` (the array-F prop wind/seeds) was ported on 2026-08-10 — see
`SCENE2_TODO.md` §2. **Scene 2 now builds and animates every system its
descriptor asks for.**

**Everything else the descriptors ask for is built**, including the systems most
recently landed: array D (plant impostors, scene 2) and its sway
(`FUN_0040bb14`), the water reflection + clip-plane pass, the cloud RT
composite, the terrain rise/water step, and the flare.

### ⚠ THIRD SELF-CHECK FAILURE — the checker was lying in the OTHER direction (2026-08-10)

The two entries deleted from the list above — **terrain shadow bake** and **lens
droplets** — were reported ❌ here for weeks *after they had shipped*. Both
patterns had been written against names the implementation never ended up
using (`shadowBake` vs `MG.buildShadowMap`, `dropletMesh|#stepDroplets` vs
`MG.buildLensDroplets|#emitDroplet`). Nothing re-checked them, because a ❌ in
this table reads as a decision already taken rather than as a claim to verify.

**The lesson is not the same as the first two failures.** Those were false
POSITIVES, and a false positive at least gets caught the moment someone looks
for the feature and it isn't there. A false NEGATIVE is worse: it is quietly
self-confirming. It sends readers to write the thing that already exists, and —
as happened here — it propagates into source comments (`"the shadow bake is
unported, so g = 255"`) that then justify leaving real consumers unwired.

Two rules that follow:

* **A pattern must be re-verified against the port when the feature lands, not
  only when it is written.** The pattern and the implementation are authored at
  different times by different hands; matching names is a coincidence, not a
  guarantee.
* **Prefer patterns that name an EXPORTED symbol** (`MG.buildShadowMap`) over
  private methods or invented nouns — an exported name is a contract that
  something else already depends on, so it cannot drift silently.

Also tightened in the same pass: `crossfade` matched the bare word
`terrainOverlay`, which `this.terrainOverlay = null` satisfies, and `riseRamp`
matched a flag TEST rather than the ramp. Both would have stayed green with the
feature gutted. They now match the line that produces the effect.

## How to read a column

A scene's column is its descriptor's shopping list. `·` means *this scene never
asks for it* — not that it is missing. So scene 3 (clouds) legitimately has no
terrain: it is a sky-only scene whose terrain flag is clear.

## Maintenance

Add a row whenever RE turns up a system, **before** porting it — an unported
row showing ❌ is the point. When you port it, the pattern flips the cell on
its own. Keep patterns anchored to code that cannot appear in a comment.

**And when you port it, OPEN THIS FILE and confirm the cell actually flipped.**
The pattern was written before the implementation existed; it names a symbol
that was guessed, not one that was agreed. That single check is what the
shadow-bake and lens-droplet failures above cost us for want of.
