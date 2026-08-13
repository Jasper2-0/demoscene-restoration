# Scene 2 (forest, obj 5, 0x0a00–0x0f00) — what is still missing

**This is the current-state entry point for scene 2.** The other scene-2 docs
(`TREE_IMPOSTOR.md`, `SCENE2_CLEANROOM.md`, `DANDELIONS.md`) are working
records — they contain hypotheses that were tested and dropped, and reading
them front-to-back gives a misleading picture of what is still open. Start
here; go there for the derivations.

Generated 2026-08-10 from two authorities, both the binary and neither our
notes:

* the **descriptor** (`RESOURCES[0x1c + DESC_RES_MAP[2]]`) — what the scene
  asks for. Flags on: `buildBillboards0, buildBillboards1, buildBirds,
  buildProps, terrainVisible`. Arrays: C=4 records/20 instances, D=1/256,
  F=1, G=1/256.
* the **call graph** (`re/tools/callgraph.py`, new) — every function reachable
  from those flag-authorised generators, cross-checked against every VA the
  port cites.

Provenance per `re/CONVENTIONS.md`.

---

## 1. Missing behaviour inside functions we *have* ported

**This is the category that matters, and it is invisible to `INVENTORY.md`** —
that table asks "is the system built?", and for all of these the answer is yes.

### 1.1 ★ `FUN_00409d45`'s leaf-record tail is absent from the impostor bake path — 42,144 RNG draws per bake

**PINNED** (ndisasm 0x409f00–0x409fc5; function bounds 0x409d45..0x40a186 from
the Ghidra function list; `FUN_0040abed` → `FUN_00409d45` is a direct call).

`FUN_00409d45`'s tail builds one animation record per physical leaf:

```
00409F05  test dword [ecx+0xac],0xfffffff8   ; leafVertexCount & ~7  (whole leaves)
00409F21  mov dword [ebp+0xc],0x8            ; inner loop = 8 VERTICES per leaf
00409F58  call rand01                        ; -> [eax+0x7c]  settle   (r+r)
00409F70  call rand01                        ; -> vel.z              (r+r-1)
00409F81  call rand01                        ; -> vel.y              (r+r-1)
00409F92  call rand01                        ; -> vel.x              (r+r-1)
00409FC1  mov byte [eax+0x78],0x1            ; falling = 1
00409FC5  jnz 0x409f28                       ; 8 iterations
```

⇒ **4 randoms × 8 vertices = 32 draws per leaf**, drawn *inside* `FUN_00409d45`.

The port put that loop in the **array-E caller** (`scene7.js:1565–1598`, which
is correct and complete there) instead of inside `MG.buildTree`. So the path
that does *not* go through the array-E caller — **`bakeTreeSet`
(`scene7.js:923`), which calls `MG.buildTree` directly** — never draws them.

**Measured (my run, `IMPOSTOR.TREE` = `{branchRadius 10, levelTaper 0.75,
leafSize 2.0}`): 10,536 leaf vertices ⇒ 1,317 leaves ⇒ 42,144 missing draws per
`bakeTreeSet` call, and it is called twice (set 0 and set 1) ⇒ 84,288 in
total.**

**FIXED 2026-08-10** — the loop now lives in `MG.buildTree` (`meshgen.mjs`),
where `FUN_00409d45` has it, and the array-E caller consumes `t.leafRecords`
instead of recomputing them. Nothing draws between `buildTree` and the old
call site, so the array-E stream order is untouched; measured in the browser,
`bakeTreeSet` set 0 now consumes **57,735** draws (1,329 leaves × 32 = 42,528
records + 15,207 for the geometry) and set 1 **57,980**.

### ⚠ …and it did NOT fix the yaws. My "prime suspect for H3" claim was wrong, and the measurement is why we know.

The prediction I wrote here was: consuming those draws should move the
post-bake state to Codex's `0x5f95db36`. **It did not move it at all** — the
state before the first cluster's yaws is `0xed8e6b2f` both before and after the
fix, byte-identical.

The reason is structural and was **already written in `bakeTreeSet`'s own
comment**, which I had read: *"Program 1 carries an op33 `srand`, which is why
the correct order pins the yaw state to `0xa661ec3b` at ANY texture scale."*
Of the 28 texgen programs **20 RESEED**, so a texture generation is a **stream
barrier** — everything downstream of it is independent of how many draws
happened upstream. `bakeTreeSet` generates the bark and leaf textures *after*
`buildTree` and *before* the per-pass yaws, so no change to the tree
generator's draw count can ever reach them.

Confirmed numerically rather than by argument: there is **no LCG path** from
set 0's post-state `0xdedf2c8d` to set 1's pre-state `0x577c5291` within 4 M
steps (`web-sonnet/test/scene2_stream.mjs` + a step-count search). A missing
path *is* a reseed.

**Two things worth keeping from this:**

* **The fix stands on its own merits** — it makes the port structurally
  faithful to `FUN_00409d45` and removes a real 42 k-draw divergence — but it
  is **provably inert downstream**, and the byte-identical post-bake state is
  the regression guard proving it. A correct change with no visible effect is
  still worth landing; it is not evidence the analysis was right.
* **A reseeding generator invalidates "the stream position is wrong" reasoning
  across it.** Before blaming a stream-position defect for a downstream
  symptom, check whether a reseeding op sits between cause and effect — if one
  does, the hypothesis is dead on arrival regardless of how real the upstream
  defect is. Codex H3 therefore needs a cause on the *yaw side* of program 1's
  `srand`: the 10 per-pass draws, the set-1 bake, or the dandelion set's 4,864.

### 1.2 The shadow bake is ported, but two of its three consumers ignore it

**PINNED** (`FUN_0040b0b0` calls the shadow sampler `FUN_0040e8fb` directly —
depth-1 callee, confirmed by `callgraph.py`).

`FUN_0040e923` shipped on 2026-08-10 (`MG.buildShadowMap`, default on via
`?lighting=fixed`). The ground-texture bake samples it. These do not:

| consumer | site | current |
|---|---|---|
| array C billboards (the trees) | `scene7.js:1434` | `shadowFn: null` |
| array D billboards (ground cover) | `scene7.js:1481` | `shadowFn: null` |
| array B curtain (scene 4, not scene 2) | `scene7.js:2270` | `g = 255` |

Each was correct when written — the bake genuinely was unported — and each
comment said so, which is why nobody revisited them after it landed.

**WIRED 2026-08-10**, all three, through `worldToMap` + `MG.shadowAt` exactly
as `FUN_0040e8fb` does (`worldToMap` *is* `FUN_0040e842`, the function the
binary's sampler calls). On `?lighting=legacy` `this.shadow` is null and every
site falls back to g = 255 — the same expression's unshadowed limit, not a
second code path.

### The honest result: correct, and very nearly invisible

A/B sweep, shadow sampling on vs off, 354 samples: **identical to two decimals
in every scene** (median 26.13, mean 28.38, and each per-scene median
unchanged). Instrumenting the sampler shows why:

| scene | shadow map mean | sampler calls | returned range |
|---|---|---|---|
| 2 forest | 253.3 | 572 | **255 – 255** |
| 4 beach | 181.7 | 2 | 255 – 255 |
| 5 autumn | 213.8 | 10 | 211.7 – 255 |
| 7 winter | 249.1 | 40 | 213.5 – 255 |

**Scene 2's terrain is nearly flat** — its heightmap (texgen program 22) peaks
at 38/255 — so it barely self-shadows, and all 572 of its billboard samples
come back at the unshadowed limit. Only scenes 5 and 7 see any darkening at
all, on 10 and 40 vertices, at ~0.83 of full brightness.

**So the earlier claim that the bake's "real value is the props" is not
supported by measurement.** It was a reasonable inference — the props were
visibly pure white — but the props stand on ground that is itself unshadowed.
Landing this was still right (it removes a divergence and a stale comment), and
it should be reported as a correctness fix with no visual effect, not as an
improvement.

**⚠ It does not touch "shadow too dark"** (`REVIEW_FIXES.md` §2c) — that moves
in the *same* direction as the complaint.

---

## 2. `FUN_0040cfed` — the array-F prop wind/seed updater — **PORTED 2026-08-10**

This was the one system scene 2's descriptor asked for that the port did not
build. All constants PINNED (ndisasm 0x40cfed–0x40d1ee; every float read from
the image, none from the decompile). `#stepProps` in `scene7.js`.

**Three parts:**

1. **The stem is rebuilt from scratch every frame, not offset.** 16 rings × 8
   verts; ring *i* sits at `y = i·0.0625·50` on a radius of 0.3 and is
   displaced by a wind vector growing with the **square** of normalised
   height — base pinned, tip whipping:
   `SX = sin(T)·A²·20`, `SZ = cos(T·2.37)·A²·20`, `A = i·0.0625`.
   The 2.37 on Z is what stops the tip tracing a circle — the two axes are
   deliberately incommensurate, the same trick `#stepBillboards1` uses.
2. **The seeds**: 128 records of 0x1c bytes that match `buildDandelion`'s
   `{jitter, rest, phase}` **field for field** — velocity at +0x00, current
   offset at +0x0c, lifetime at +0x18. Every frame `offset += velocity·(dt·1.4)`;
   then **while `lifetime >= 0` the offset is overwritten with the stem-tip wind
   vector `(SX, 0, SZ)`**, so an attached seed rides the tip and its integrated
   velocity is thrown away. When the lifetime goes negative the overwrite stops
   and the seed drifts off on the velocity it has been accumulating all along.
   **That is the entire detach mechanism — there is no "released" flag.**
3. The offset is added to the **rest pose** of 16 twig verts and 144 leaf verts
   per record (`0x2c0 = 16·44`, `0x18c0 = 144·44`, terminating at
   `0x16000 = 128·0x2c0`).

**`propArmed` is now read.** The lifetime only counts down when `prop+0x10` is
set (0x40d143) — that byte is what the timeline's `m2(0)` arms at 0x0c20.
Before the event the seeds hang on the head indefinitely. The flag that had
been set-and-never-read for months is exactly this gate.

**MEASURED — a clean win with no collateral.** Isolated A/B over the 354-sample
sweep: **19 samples changed, all 19 improved, none worsened**, net −29.44 RMSE.
Every changed sample lies in 0x0c28–0x0e38, the dandelion half of scene 2.
Scene 2's median **20.01 → 18.66**; every other scene byte-identical.
Biggest movers 0x0d08 −3.52, 0x0d00 −2.98, 0x0d18 −1.90 — 0x0d00 being the
exact position `DANDELIONS.md` named as the most visible remaining difference.

Also added, and **not** in the original: `phase0` on each record and a props
branch in `#resetAnim`. `#stepProps` integrates `rest`, counts `phase` down and
rewrites the stem from `T`, so a second warm-up would otherwise start with the
seeds already shed — the order-dependence trap of `SCENES_7_10.md` §6.

### ~~RESIDUAL: our seed field thins out too fast~~ — CLOSED by §6, it was the brightness bug

Originally logged here as a live residual: at 0x0d18 ours and the reference
agreed, but by **0x0d30** the reference showed a dense field and ours had
"nearly emptied". **That symptom was the missing-normals bug of §6, not a
dispersal fault.** Post-fix at 0x0d30 we measure **474 whitish / 240 bright**
against the reference's **401 / 164** — i.e. slightly MORE seed material than
the capture, not less. The field was always there; it was ~8x too dim to
register. Kept, struck through, because the reasoning below (measuring the
record state instead of trusting the arithmetic) is what led to §6.

### ~~My "sheds in ~0.6 s" arithmetic was wrong~~ — RETRACTED, measured 2026-08-10

I wrote that `phase = rand01()·8` decremented by `dt·0.01·1.4` means every seed
detaches within ~0.6 s of arming. **Instrumenting the actual record state
refutes that** — the shed is gradual, over the whole scene:

| position | attached (of 128) | prop clock T | max drift |
|---|---|---|---|
| 0x0c28 | 117 | 8.25 | 25.6 |
| 0x0d00 | 98 | 9.42 | 40.4 |
| 0x0d18 | 68 | 10.59 | 58.9 |
| 0x0d30 | 37 | 11.77 | 80.6 |

So the shed RATE is not the fault, and **"the field empties" was the wrong
description of the symptom.** At 0x0d30 thirty-seven seeds are still attached
to the head and the head is still nominally in frame — they are simply not
bright enough to register.

### What the difference actually is: brightness, not count (verified 2026-08-10)

Jasper: *"the seeds are a bit indistinct compared to the capture"*. Measured on
the 640×480 comparison frames, counting whitish pixels (`r,b > 110`):

| position | ours whitish px | ref whitish px | ours lum>200 | ref lum>200 |
|---|---|---|---|---|
| 0x0d18 | 433 | 2013 | 156 | 1226 |
| 0x0d00 | 5135 | 9516 | 915 | 3903 |
| 0x0d30 | 0 (peak lum 161) | 401 | 0 | 164 |

**4–8× less bright seed material**, and at 0x0d30 nothing clears the threshold
at all. Side-by-side crops (`scratchpad/seeds_0d18.png`) show the reference's
seeds as crisp bright filament crowns with a visible teardrop body, ours as
pale soft stars.

**Five candidate causes checked and RULED OUT, each against the binary:**

1. **Geometry missing** — no. Hiding each mesh and diffing: twigs 13,578 px,
   leaves 18,583 px, stem 1,232 px. All three reach the screen.
2. **Wrong textures** — no. `FUN_0040c721` calls `texgen(3)` for the twigs/stem
   and `texgen(4)` for the crown (0x40CDCA, 0x40CE63); the port uses exactly
   those.
3. **Texgen program 4 is broken** — no, though it looks it. It bakes as pure
   uniform white, alpha 255, and its whole bytecode is a **single op 14 FILL
   with mask 0x0007 (RGB)**. Its siblings (precip programs 15 and 6) *do* build
   an alpha shape, which is why flat white looked wrong — but program 4 has no
   such ops. Flat white is authentic; the seed shape is geometry, not texture.
4. **Wrong blend** — no. Material flags are `0x11` for twigs and crown, `0x10`
   for the stem (0x40CE03/0x40CE49/0x40CE9A), and the shim decodes bit 0 to
   `DESTBLEND = ONE` (additive) and bit 4 to cull NONE. Correct.
5. **Wrong vertex alpha** — no, and this was the best candidate. PINNED:
   `0040C8E9 mov dword [eax+0x18],0x5fffffff` (twigs) and
   `0040CB3D mov dword [eax+0x18],0x2fffffff` (crown). The port writes exactly
   those.

Five more, checked after those:

6. **Crown geometry wrong** — no. 16 filaments per seed of a 3×3 grid each,
   `a,b = rand01()·PI − PI/2`, tilts ×0.75 (top) and ×1.25 (root), radius 0.1,
   `+5.0`, `+50.0`, row/col step 0.5 — every constant PINNED (0x40C98F–0x40CB34),
   and the `0x9`-per-filament / `0x18c0`-per-record strides confirm 16.
7. **Placement wrong** — no. `FUN_00408c48` is a bare vec3 copy; the snap
   happens inside `FUN_0040c721` as `y += terrainHeight(x, z)` (sonnet.c:10370),
   and all three meshes get the same position and scale (10375–10398). The port
   matches, with `pos = (0,0,0)`, `scale = 0.15`.
8. **Z-write killing the additive build-up** — no. `setBlendMode(1)` sets
   `ZWRITEENABLE = 0`, so filament layers do accumulate.
9. **The prop is occluded by the terrain** — no. Measured by hiding the prop
   meshes with the terrain still drawn: the prop's marginal contribution is
   **436 whitish / 422 bright pixels** at 880×660. It is drawn, not hidden.
10. **Our ground is too dark, so additive seeds read dimmer** — a real effect
    but **far too small**, and I tested it rather than asserting it. Our ground
    is consistently ~15% darker than the reference (55.0/57.4/57.3 vs
    64.7/66.0/66.3). Simulating a +10 luminance lift moves the whitish count
    from 433 → 499 against the reference's 2013. **Refuted as the explanation**
    (it remains a separate, real difference — see `REVIEW_FIXES.md` §2c).

**Everything that determines how a seed looks matches the binary, and the seeds
look RIGHT when composited over sky.** With the terrain hidden, the prop renders
as a bright saturated head at bottom-right — the same composition as the
reference — with seeds showing clear teardrop bodies and filament crowns, at a
comparable on-screen size (head 0.257 of frame width vs the reference's 0.217).

### ~~Leading hypothesis: the head THINS because seeds detach too early~~ — SUPERSEDED by §6

This was the best hypothesis available *before* the missing normals were found,
and it was wrong: the brightness deficit was ~8x on every filament, not a
shortfall in filament COUNT. Retained because the `dt` question it raises is
still unverified in its own right (see below), just no longer load-bearing.

The head's brightness is the additive sum of its attached filaments, so head
brightness is a direct function of how many seeds are still attached. Measured
attachment (above) falls 117 → 98 → 68 → **37 by 0x0d30**, while the reference
still shows a dense, brilliant head at that position. A head holding ~120 seeds
is several filament-layers deeper than one holding 37 — which is exactly the
kind of multiplier that turns 46 levels per layer into saturated white.

The specific unknown to chase: **the `dt` handed to `#stepProps`.** The port
passes `dt · K.TIME_RATE`, matching the call site's
`this[4] · _DAT_00418260`. But the adjacent leaf-fall call scales by a
**descriptor field** (`desc.unknown0a`) first, and no equivalent per-descriptor
scale has been looked for on the prop path. If one exists, it would slow the
shed without touching any of the ten PINNED facts above.

**Do not "fix" this by tuning a constant.** All eight `#stepProps` constants,
both vertex colours, both texture ids and both material flags are PINNED.

---

## 3. Call-graph audit — the functions nobody has looked at

137 functions are reachable (depth ≤ 3) from scene 2's flag-authorised roots.
87 are cited by VA somewhere in the port, 42 are named utilities, 20 are texgen
VM internals. **21 are cited nowhere.** I disassembled all 21:

| verdict | count | what they are |
|---|---|---|
| C++ plumbing | 19 | constructors zeroing vec3/mat4 fields, destructors, refcount inc/dec pairs (`inc/dec dword [ecx+N]` + conditional release), and MSVC's vector-iteration thunk `0x40103f`. Nothing to port — JS has no equivalent. |
| worth a look | 2 | `0x405f8b`, `0x40abcd` — below. |

* **`0x405f8b`** (depth 1 from `FUN_00406004`, the scene render) — a traversal
  over an object list testing `[obj+0xa4]` against a caller-supplied **mask**,
  then branching on `al & 4 / 1 / 2` and a mode byte to call `0x40520d`,
  `0x4050ed`, or a vtable slot. **INFERRED**: a flag-filtered per-object update
  dispatch. Falsifier: if its callees turn out to be flare-only helpers
  (`0x405082` is the flare and these are adjacent), it is already covered by
  `js/flare.js` and this row can be closed.
* **`0x40abcd`** (depth 1 from `FUN_0040b0b0`) — sets `[ecx+0x18]` to 0, 1 or 2
  from two arguments, `ret 8`. **INFERRED**: the impostor-set selector, i.e.
  the thing the port expresses as `bakeImpostors(d3d, 0|1|2)`. Probably already
  covered; listed so the claim is on the record rather than assumed.

**The headline from this audit is a negative result, and it is worth stating
plainly: at function granularity scene 2 is essentially complete.** Nineteen of
the twenty-one unexamined functions are C++ runtime plumbing. The remaining
work in this scene is *not* missing functions — it is missing **behaviour
inside functions we have already ported** (§1), which is exactly the class of
defect a function-level inventory cannot surface. Keep both instruments.

---

## 4. Explicitly NOT open — do not re-investigate

Recorded so the working docs' dead ends do not get re-run:

* **The tree impostor width/shape.** SOLVED 2026-08-10 (bake ran at the wrong
  RNG stream position; 0x0c08 58.62 → 43.07). `TREE_IMPOSTOR.md`'s "the knot"
  section predates the fix.
* **`bend` is (0,0,0).** PINNED — `DAT_00478938..40` is read at eleven sites
  and written at none, so it is BSS zero.
* **The L-system, billboard size multipliers, the tree host's call-site args,
  the impostor bake's call inventory, the sway, the birds, the terrain and
  ground bake.** All independently re-derived from disassembly in the
  clean-room pass and all **match the port**. See `SCENE2_CLEANROOM.md`'s
  progress table.
* **The 0.3 canopy taper.** Reproduced the reference frame; reverted, because
  it cannot be justified from the binary. Evidence, not a change.
* **RMSE as the arbiter for this scene.** `SCENE2_CLEANROOM.md` established
  that a dense foliage slab *scores better* than correctly-registered distinct
  trees. Judge scene 2 on frames.

---

## 5. Pre-existing failure found while validating (NOT caused by this work)

`node web-sonnet/test/warm_equiv_test.mjs` **fails** — 7 positions consistently
(0x1210, 0x1c00, 0x1c30, 0x1d00, 0x2000, 0x2100, 0x2200) plus 0x0a30
intermittently. Proven pre-existing by A/B: with `#stepProps`'s dispatch
disabled the **same** failures appear, and every consistent failure is in a
scene that has no array-F prop at all (only scene 2 sets `buildProps`).

It matters because it is a guard on `__sonnetRenderSeq`, the incremental
warm-up. Its own verdict — *"incremental warm-up is NOT equivalent, do not use
it"* — is the operative instruction: **every RMSE number quoted in this
document was produced on the cold path**, which is also why
`re/scenes/…`/memory say never to use `--seq` for a reported number.

Most likely introduced by the `lighting=fixed` default flip (the shadow bake
integrates per-scene state), but that is a guess and has not been bisected.

---

## 6. ★ ROOT CAUSE OF THE INDISTINCT SEEDS — FIXED: the original DOES compute the dandelion's normals

Jasper, 2026-08-10: *"could there be a difference between our webgl/directx8.1
shim and native directx8.1?"* — the right question, and it pointed at the right
layer (lighting), though the fault turned out to be in our mesh generator, not
the shim. And his second remark framed it exactly: sagacity's *"most of it is
hardcoded; they just worked on the code until they had to ship"* predicts
**inconsistent internal conventions**, which is precisely what bit us.

### The bug

`buildDandelion` deliberately did **not** compute normals, on this reasoning
(verbatim from the old comment):

> NO computeNormals — and that is the point, not an omission. […] `FUN_0040c721`
> calls it ZERO times (checked: no call site to `0x40449f` anywhere in
> `0x40c721-0x40cfed`).

**The grep was correct and the conclusion was wrong: `0x40449f` is not the
normal generator.** It is an allocation helper — its callees are `VirtualAlloc`
and friends. THE normal generator is **`0x4045f1`** (13 call sites image-wide),
and `FUN_0040c721` calls it three times, on all three meshes:

```
0040CCFA  call 0x4045f1     ; *(this+0)  stem
0040CD02  call 0x4045f1     ; *(this+4)  twigs
0040CD0A  call 0x4045f1     ; *(this+8)  leaves     (sonnet.c:10367-10369)
```

**Why the wrong address was grepped: `re/tools/xray.py` had BOTH `0x40449f` and
`0x4045f1` labelled "mesh_computeNormals".** Our own tooling's mislabel
propagated into a port decision and then into a confident comment. Both are now
corrected.

### Why it mattered so much

With zero normals `N·L = 0` for every light, so the whole plant rendered on the
ambient term alone — `0x1f1f1f1f` = **0.122**. The seed materials blend
**additively**, so that scaled every filament's contribution by ~1/8 and turned
the reference's brilliant white burst into a pale smudge. The terrain was
almost unaffected by the same ambient because it has real normals and earns most
of its brightness from the diffuse term — which is why this presented as "the
seeds are indistinct" rather than "the scene is dark".

### Measured — brightness now matches

| position | before | after | reference |
|---|---|---|---|
| 0x0d18 whitish / lum>200 | 433 / 156 | **2548 / 1831** | 2013 / 1226 |
| 0x0d00 | 5135 / 915 | **8101 / 3233** | 9516 / 3903 |
| 0x0d30 | 0 / 0 | **474 / 240** | 401 / 164 |

Mean luminance of whitish pixels is now 215/201/202 against the reference's
211/202/199. Ink-mask IoU at 0x0d18 rose 0.385 → 0.463. Before the fix we were
4–8× short; now we straddle the reference within ±30%.

### ⚠ RMSE went UP and that is the documented trap, not a regression

Scene 2's median moved 18.66 → **19.94**, worst 43.08 → 50.63 (0x0c38). Looking
at 0x0c38: our head and the reference's are the **same size, brightness and
structure** — ours sits ~200 px further left. A dim blob costs little when
mis-registered; a bright, correctly-formed one costs twice (missing where the
reference has it, extra where it does not). This is exactly what
`SCENE2_CLEANROOM.md` established: **judge scene 2 on frames.** The residual is
a camera/timing offset, not an appearance fault, and it is a pre-existing
open item.

### Two corrections to earlier claims in this very document

1. **My "the prop's node ambient is -1, never overwritten" claim was WRONG.**
   `Landscape+0x2c` *is* the scene root, and sonnet.c:7002-7009 constructs it
   and immediately writes `0x1f1f1f1f` — the ctor's -1 is overwritten one line
   later. The port's `K.AMBIENT` was right all along. I had matched a node
   pointer to the wrong node.
2. The earlier "seeds are fewer AND dimmer" framing was half wrong: the count
   was fine (measured attachment 117→98→68→37); only the brightness was off.

### The stem: LIT FLAT ON THE REMASTER PATH (Jasper's call, 2026-08-10) — done

Computing normals raised a second question: the stem renders as a near-black
wire. **Jasper: "light it flatter on the remaster path."**

**First, a correction to how this was previously understood.** The earlier
session removed `computeNormals` to fix the dark stem, believing directional
shading was the cause. It was not, and could not have been: `FUN_0040c721`
**never writes a stem vertex colour** — its only two colour writes are
`0040C8E9` (twigs, `0x5fffffff`) and `0040CB3D` (leaves, `0x2fffffff`) — so the
stem's diffuse is the zero-filled buffer, i.e. **black**. The lit model
multiplies the directional term by that diffuse, so the stem can only ever
reach the ambient term (`0x1f1f1f1f` = 0.122) whatever its normals are.
Removing the normals never helped the stem; it only broke the seeds.

**Why this is a free choice rather than a fidelity question:** the original
never DRAWS the stem at all (the missing-stem bug sagacity confirmed), so there
is no reference frame to match and `?quality=original` skips it entirely. On
the remaster path we own its appearance.

**Implemented** in both places the stem reaches the screen, gated on
`!AUTHENTIC`, no RNG touched:

* the array-F prop (`scene7.js`, the big foreground dandelion), and
* **`bakeDandelionSet`** — the array-D impostor, which bakes the stem into the
  texture used by all 256 ground-cover instances. Without this the foreground
  stem was fixed while every background dandelion kept a black wire under it.

Both get a white vertex diffuse and material flag `0x1000` (lighting off), so
the bark texture (`texgen` program 3) shows evenly. Result: pale green stalks
instead of black wires, in the foreground and across the ground cover.

**Measured — and the first attempt at this measurement was WORTHLESS, which is
the important part.** I first reported "sweep unchanged, therefore no cost".
The sweep was unchanged because **`sweep.mjs` defaults to
`--quality=original`** (`sweep.mjs:78`), so it was running the AUTHENTIC path,
where this code is gated off and `?quality=original` does not draw the stem at
all. The instrument could not see the change by construction.

Re-run as a true A/B on the path the change actually lives on
(`--quality=remaster`, flattening on vs off):

| | median | mean | scene 2 median | scene 2 worst |
|---|---|---|---|---|
| flat stem (shipped) | 25.42 | 28.36 | 22.72 | 53.34 |
| lit stem | 25.42 | 28.36 | 22.72 | 53.32 |

**Cost is 0.02 RMSE at the single worst sample, nil everywhere else** — the
stem is thin geometry, so the visual difference (black wire vs pale stalk) is
worth far more than the metric moves.

⚠ **Do not "fix" any future stem complaint by removing the normals.** That
re-breaks the seeds by a factor of ~8 (§6 above), and it was never the stem's
problem in the first place.

### Method note: NaN normals are AUTHENTIC here, and they broke my regression check

Verifying the stem gate, a same-seed A/B of `buildDandelion` reported every
mesh as *differing*. It was not nondeterminism: **`computeNormals` emits NaN
normals on degenerate (zero-area) triangles**, and `NaN !== NaN`, so a
float-by-float comparison calls two identical buffers different. Comparing the
**raw bytes** shows all three meshes byte-identical across builds, with the RNG
state matching at `0xd9d74701`.

The NaNs themselves are **authentic and pre-existing**: the original's
`FUN_004045f1` divides by the face-normal length with **no zero guard**
(`00404736  fdivr qword [0x418248]`, the constant 1.0), so x87 yields ±Inf and
then `Inf x 0 = NaN` exactly as the port does. The tree has carried the same
thing since it was ported (12,921 non-finite floats in `branches`, 10,536 in
`leaves`) and ships fine — a NaN *normal* renders unlit, unlike a NaN
*position*, which silently kills the triangle.

Two rules worth keeping:
* **Compare geometry buffers as bytes, not as floats** — any mesh whose
  generator can produce a degenerate triangle will otherwise fail a
  determinism check that it actually passes.
* The existing methodology note says "check for NaN FIRST" when geometry is
  invisible. The complement is also true: **NaN in a buffer is not by itself a
  bug** — check which FIELD it is in, because the consequences differ
  completely between position and normal.

---

## 7. ⚠⚠ THE TWO HARNESSES DEFAULT TO DIFFERENT QUALITY PATHS

Found while verifying §6's stem gate, and it invalidates comparisons made
across the two tools:

| harness | default | path exercised |
|---|---|---|
| `test/sweep.mjs` | `--quality=original` (`sweep.mjs:78`) | **AUTHENTIC** |
| `test/capture.mjs` | no `quality` param at all | **REMASTER** (main.js:41) |

So a session that eyeballs `capture.mjs` frames and then quotes `sweep.mjs`
RMSE — which is exactly what this session did for hours — is **looking at one
build and scoring another.** Every remaster-only change (`?texscale`,
`?fontscale`, the dandelion stems, the ground-mask decoupling) is invisible to
the default sweep, and a "no regression" result from it is vacuous for that
class of change.

**Both paths, measured today, so the numbers exist side by side:**

| path | median | mean | worst | scene 2 |
|---|---|---|---|---|
| `--quality=original` | 26.16 | 28.50 | 109.72 | 19.94 |
| `--quality=remaster` | 25.42 | 28.36 | 114.48 | 22.72 |

Scene 2 scores *worse* on the remaster path for a known and accepted reason:
the remaster draws the dandelion stems, and **the reference has no stems** —
that is the original bug sagacity confirmed. Drawing them cannot help RMSE and
was never expected to.

**Rules:** state the quality path next to every RMSE number; A/B a
remaster-only change with `--quality=remaster` on BOTH sides, never against an
authentic-path baseline; and when a change measures as exactly zero, check that
the harness actually runs the code before concluding it is free.


---

## 8. THE FIVE OPEN POINTS, WORKED (2026-08-11)

### 8.1 `0x405f8b` — IDENTIFIED, already covered

The layer-masked scene-graph child traversal. `FUN_00406004` calls it four
times with masks 1, 4, 2, 0xc; it filters children on `[obj+0xa4] & mask` and
branches on `al & 4/1/2`. The `&4` branch calls `FUN_004050ed` →
`FUN_00402907` (the flare's software occlusion query) or `FUN_0040520d` →
`FUN_00402788`. So it is the render walker plus the flare hook — both already
implemented (`js/flare.js` + the port's layer render). **Closed, nothing to
port.**

### 8.2 `0x40abcd` — IDENTIFIED, matches the port exactly

`(arg0, arg1) -> [ecx+0x18] = arg0 ? 2 : (arg1 ? 1 : 0)`, `ret 8` — the
impostor SET selector. Maps 1:1 onto the port's `bakeImpostors(d3d, 0|1|2)`:
array C passes `billboard0Opt ? 1 : 0`, array D passes 2. **Closed.**

### 8.3 `#stepProps` dt — VERIFIED CORRECT at instruction level

The open question was whether the prop updater takes a per-descriptor scale the
way the adjacent leaf-fall call does. It does not, and the two call sites sit
19 bytes apart so the asymmetry is unmistakable:

```
leaf fall  0x409340  fmul dword [esi+0x4]        ; dt
           0x40934C  fmul dword [0x418260]       ; * 0.01     -> desc[10]*dt*0.01
           0x409355  call 0x40a9ad
prop       0x40937C  fld  dword [esi+0x4]        ; dt
           0x40937F  fmul dword [0x418260]       ; * 0.01     -> dt*0.01  (ONE fmul)
           0x409391  call 0x40cfed
```

The port passes `F(dt * K.TIME_RATE)`. **Correct. Closed.**

### 8.4 `warm_equiv_test` — bisected, root-caused, and a REAL bug fixed

**Bisect:** `--lighting=legacy` drops 8 failures to 6. The two that depend on
the shadow bake are 0x1210 and (intermittently) 0x0a30. The persistent six —
0x1c00/0x1c30/0x1d00 and 0x2000/0x2100/0x2200 — are exactly the test's own
"rain window" and "snow window", i.e. **scenes 5 and 7, the only two with
`buildPrecip`.**

**Mechanism:** `#stepPrecip` runs INSIDE `render()` (scene7.js, after the camera
is evaluated, because the respawn centre is the camera's XZ). It integrates
every particle and draws 3 randoms per respawn. `__sonnetRenderSeq` restored the
RNG but left the mutated particle buffer behind.

**Then the measurement contradicted the obvious next step.** Snapshotting the
particle state made the seq path deterministic but did NOT fix the test —
because instrumenting both paths showed **`coldStable: false`**: two consecutive
COLD renders at the same position disagreed, drifting in `dropHead` (94 → 101)
and particle X/Z. The baseline was moving.

**The real bug: `warmTo` never restored the global RNG.** Each cold render
replayed the warm from wherever the previous render left the shared stream, so
every sweep sample after the first precip scene inherited its predecessor's
state. Fixed with an `RNG_AT_BOOT` snapshot restored at the top of `warmTo`.
Now `coldStable: true` and `seqStable: true`.

**Sweep blast radius, measured before keeping it:** median 26.16 → **26.16**,
worst 109.72 → **109.72**, every per-scene median identical except winter
**29.94 → 29.55**. So cold renders are now provably reproducible at no metric
cost, and the one scene that moved is a precipitation scene, as predicted.

**Still open:** `coldVsSeq` remains false — the two paths are each deterministic
but disagree. That is a smaller, better-defined problem than before, and the
test's verdict ("do not use incremental warm-up") still stands. Not scene 2.

### 8.5 The "camera/timing offset" — MY FRAMING WAS WRONG; the cause is proximity amplification

**Timing is PROVEN correct.** Rendering ours at ±4…±24 row offsets and scoring
each against the reference frame gives a clean bowl with the minimum at **0**
at every position tested:

| position | −8 | −4 | **0** | +4 | +8 |
|---|---|---|---|---|---|
| 0x0c38 | 63.02 | 53.81 | **50.63** | 57.48 | 64.24 |
| 0x0c30 | 51.67 | 48.84 | **41.80** | 57.14 | 62.27 |
| 0x0b38 | 46.87 | 44.82 | **40.12** | 44.71 | 50.34 |
| 0x0c08 | 52.87 | 46.96 | **43.09** | 45.71 | 45.69 |

**And the frame agrees:** at 0x0c38 the tree trunks, horizon, poem text and the
256 array-D ground-cover dandelions all align. Only the big array-F prop is
displaced (~164 px: our bright centroid x=276, the reference's ≈440).

**Why that is not a contradiction — and why "everything else aligns" proves
less than it looks.** Probing the camera at that position:

```
camEye    (3.15, 9.48, -1.93)      camTime 25.574 on path 2
propPos   (0, terrainHeight, 0)    scale 0.15
```

**The camera is standing on top of the dandelion** — 3.7 units away
horizontally, 9.5 up, with the prop only ~7.5 units tall. At that range the
head's screen position is hypersensitive to camera translation, while the
trunks near the horizon barely move. **A sub-unit camera error yields a
100+ px swing on the prop and nothing visible anywhere else.** So the aligned
trunks never validated the camera's position — only, roughly, its orientation.

**Narrowed to:** the camera-path evaluation for scene 2's path 2 (resource 41)
around camTime ≈ 25.5. Next step is a clean-room check of the spline
evaluator (`FUN_00405a29` / `FUN_00405778`, bfloat16 keys → cubic Hermite)
against the binary at that time value — NOT another look at the prop, whose
position `(0,0,0)` and scale `0.15` both match the descriptor and the
generator's call site.
