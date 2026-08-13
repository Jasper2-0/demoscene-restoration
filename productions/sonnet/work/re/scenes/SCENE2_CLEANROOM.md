> **⚠ WORKING RECORD.** Current scene-2 status lives in
> [`SCENE2_TODO.md`](SCENE2_TODO.md). Everything in the progress table below
> came back **matching the port** — the value of this file is the negative
> result (a long list of things that are NOT worth re-deriving) plus the two
> findings at the end: `bend` is provably zero, and RMSE is the wrong arbiter
> for this scene.

# Scene 2 — clean-room re-derivation

Jasper, 2026-08-08: *"what if we go back to the source for scene 2 and
re-implement it from scratch, based on a close analysis, so disassembly for
proper values, no inference based on ghidra etc?"* Scope agreed: **all of scene
2's generators** (not the shared `Landscape` build/render).

## Why this is the right instinct

The tree impostor has survived ~28 independent verifications and still does not
match the reference. When every checked fact agrees and the result does not, the
error is in a **shared assumption nobody wrote down** — which re-reading cannot
find, because each re-read inherits the assumption.

## Method

**Derive, then diff — do not derive and replace.** A rewrite alone would give a
second unverified implementation with no way to tell which is right. Every
finding below is derived from the binary first and compared to the port second;
agreements raise confidence, disagreements are located bugs.

`re/tools/xray.py` was built for this. It disassembles a range with **every data
reference resolved** — `[0x418f00]` is printed with its float value, `fld qword`
gets the double reading too, calls are annotated with known names, and float
literals pushed as `push dword 0xNNNN` are decoded. No step of a derivation
should depend on eyeballing an address:

```
python3 re/tools/xray.py 0x40a186 0x40a952          # resolved listing
python3 re/tools/xray.py 0x40a186 0x40a952 --calls  # call graph only
```

Provenance tags per `re/CONVENTIONS.md`: everything below is **PINNED** unless
marked otherwise.

## Progress

| function | what | verdict |
|---|---|---|
| `FUN_0040a186` L-system | complete constant inventory + structure | **matches the port** |
| `FUN_0040b0b0` billboards | size multipliers, `param_8` | **matches the port** |
| `FUN_00409d45` tree host | call-site args recovered independently | **matches the port** |
| `FUN_0040abed` impostor bake | complete call inventory; makes NO render-state calls | **matches the port** |
| `FUN_0040c721` dandelion | — | done 2026-08-08, see DANDELIONS.md |
| `FUN_0040bb14` sway | — | done 2026-08-08 |
| `FUN_0040f803` birds | record layout, scale formula, arg list | **matches the port** |
| `FUN_0040e058` terrain + ground bake | complete constant inventory | **matches the port** |

### `FUN_0040a186` — the L-system: COMPLETE constant inventory

Every data reference in `0x40a186..0x40a952`, resolved (this is the whole list —
there are no others):

| address | value | role | port |
|---|---|---|---|
| `0x4170c4` | 1.0 | — | ✓ |
| `0x4170d4` | 0.5 | ring `t` step | ✓ `K.HALF` |
| `0x418220` | π (**qword**) | leaf yaw | ✓ |
| `0x418e5c` | 10.0 | leaf radius | ✓ `TREE.LEAF_R` |
| `0x418e7c` | 8.0 | `ty` bias | ✓ |
| `0x418ef4` | 66.0 | segment length | ✓ `TREE.SEG_LEN` |
| `0x418f00` | 0.6 | spread | ✓ `TREE.SPREAD` |
| `0x418f04` | 0.2 | jitter offset | ✓ |
| `0x418f08` | 0.4 | jitter span | ✓ `TREE.JITTER` |
| `0x418f0c` | 16.0 | `ty` span | ✓ |
| `0x418f10` | 0.7 | depth-4 taper | ✓ `TREE.DEPTH4_TAPER` |
| `0x418f18` | 2π (**qword**) | ring/leaf angle | ✓ `K.TWO_PI` |
| `0x418f20` | 1/7 | ring u | ✓ `TREE.RING_U` |
| runtime | `0x478930/34/44/48` | leafHalfWidth / branchRadius / 20.0 / levelTaper | ✓ |

**Structure, also PINNED:** `cmp dword [ebx+0x18],0x4 / jnl` at 0x40a81b — depth
0..3 spawn, depth 4 is terminal — and exactly **four** `call 0x40a952` at
0x40a866/8AF/8F8/941. So 341 nodes over 5 levels, as ported. The RNG order is
one `rand` (the leaf gate) then three `rand01` (0x40a519, 0x40a565/584/598), as
ported.

**Verdict: the tree generator is not the fault.** This is now an exhaustive
result rather than a sampled one — there is no constant and no structural choice
left for a discrepancy to hide in.

### `FUN_0040b0b0` — the billboard sizes, and a decoded dead argument

| array | call site | size | type | angleCount |
|---|---|---|---|---|
| C (trees) | 0x407d44 scatter → 0x407d6f | `rec[+0x1a] * 50.0` (`[0x418e60]`) | 0 | 2 |
| D (plants) | 0x407e4b scatter → 0x407e6a | `rec[+0x1a] * 4.0` (`[0x418230]`) | 1 | 2 |

Both match the port. One thing worth writing down because it *looked* like a
find: array C passes a **per-record field** (`[eax+0x10f1]`, record +0x1e) as
`param_8` where array D passes the literal 10.0 — but `[ebp+0x24]` is **never
read anywhere in `0x40b0b0..0x40bb14`**. The port's `unusedParam: 10.0` label is
correct; the record field is passed and discarded.

### `FUN_0040f803` — the birds, and what Ghidra loses

Ghidra types this `(this, param_1, param_2)`. **Four of the six arguments are
missing** — this binary passes floats as `push ecx` (reserve) + `fstp [esp]`, and
the decompiler drops them. Recovered from the call site at 0x408040-0x4080a1:

| stack | source | meaning |
|---|---|---|
| `[ebp+0x08]` | `[ebx+0x2c]` | scene root |
| `[ebp+0x0c]` | `rec+0x2c5f` u16 | count |
| `[ebp+0x10..18]` | `rec+0x2c53` | centre vec3 |
| `[ebp+0x1c]` | `rec+0x2c61` f32 | radius / speed scale |
| `[ebp+0x20]` | `rec+0x2c65` f32 | banking amplitude |
| `[ebp+0x24]` | `rec+0x2c69` u8 | species |

Which confirms `decodeG`'s array-G layout exactly (`centre[3], count@0x0c,
f32@0x0e, f32@0x12, u8@0x16` over the 0x17-byte record).

**A second trap, same family: `[ebp+0x23]` looks like an argument byte and is a
LOCAL.** The species branch WRITES it before anything reads it —
`species != 0 → texgen(9); [ebp+0x23] = 3` / `species == 0 → texgen(10);
[ebp+0x23] = 1` (0x40f842-0x40f856) — and it is read back as the wing
multiplier: `xL = -Wf*3, xR = +Wf*3`. That is exactly the port's
`Wf = species ? 3 : 1`. Read as an argument it decodes as the *exponent byte of
the amp float*, which nearly sent this investigation after a phantom "original
bug". **Before treating a stack slot as an argument, check whether the function
writes it first.**

**A trap worth recording: `[ebp+0x20]` is BOTH an argument and a local.** It is
read once at 0x40f819 into `this[+8]`, and thereafter reused as the per-bird
byte offset (`add edi,[ebp+0x20]`). Optimised code recycles argument slots, so
"this stack slot is argument N" is only true until its value is consumed.

**The scale formula looked like a missing factor and is not.** At 0x40f943 the
sequence is `rand01() ; +0.5 ; *[edi+0xc] ; *[ebp+0x1c] ; *0.01` — two operands
where the port has one. But `[edi+0xc]` is set to **1.0** three instructions
earlier (`fld1 ; fstp [edi+0xc]` at 0x40f92b), so it is a multiply by one and the
result is `(rand01()+0.5) * rec[+0x0e] * 0.01`, as ported. Constants all match:
`0x4170d4`=0.5, `0x418fd8`=0.01, `0x4170c0`=100 (phase), `0x418fd0`=500
(preroll).

### `FUN_0040e058` — terrain + ground bake: complete constant inventory

Every data reference in `0x40e058..0x40e923`, resolved — the whole list:

| address | value | port |
|---|---|---|
| `0x4170d4` | 0.5 | ✓ `K.HALF` |
| `0x418270` | 65536.0 | ✓ `K.F65536` |
| `0x418298` | 1/255 (**float32**) | ✓ `K.INV255_F` |
| `0x4182bc` | 256.0 | ✓ `TERRAIN_EXTENTS[1]` (height scale) |
| `0x418e30` | 128.0 | ✓ `TERRAIN_EXTENTS[0]`/`[2]` (half extent) |
| `0x418f0c` | 16.0 | ✓ |
| `0x418f94` | 1/65536 | ✓ `K.INV65536` |
| `0x418fa0` | 1/255 (**double**) | ✓ `K.INV255_D` |
| `0x478978` | — | the shared 512² detail texture global |

Note the project keeps **both** 1/255 constants separately — a float32 and a
double — because the binary does, and they differ in the last bits.

**A free cross-check:** these are the same constants the shadow bake's setup
reads for its half-extents. `FUN_0040e923` maps the light into height-map texel
space with `half = ([0x418e30], [0x4182bc], [0x418e30]) = (128, 256, 128)`,
which is exactly `TERRAIN_EXTENTS`. Two independent derivations, done days
apart, agree — which is the sort of confirmation the PINNED discipline is meant
to produce.

### `FUN_00409d45` tree host — arguments recovered from the call site

Ghidra's 14-parameter signature is right, but it was worth rebuilding from the
bake's call site at 0x40acd0-0x40ad2c independently (given how many arguments it
lost on the birds). Stack, reconstructed:

`(root=[ebx+0x1c], terrain=0, pos=(0,0,0), bend=(0,0,0), meshScale=1.0,
branchRadius=10.0 [0x418e5c], levelTaper=0.75 [0x418eb0],
leavesVisible=(param_3==0), leafSize=2.0 [0x418200])`

Consumed as `_DAT_00478930 = leafSize*10 = 20` (leaf half-width),
`_DAT_00478934 = 10` (branch radius), `_DAT_00478948 = 0.75` (taper),
`_DAT_00478944 = 20.0` hardcoded. **Exactly `IMPOSTOR.TREE` in the port.**

### `FUN_0040abed` — the bake sets NO render state

Complete call inventory (all 23 call sites, named and unnamed): allocation,
`FUN_00402b16` (create RT), `FUN_00402b4f` (push RT), `FUN_00406004` (draw the
scene graph), `FUN_00402c72` (clear), `FUN_0040b094` (tear down), the two
generators, two `rand01`, `mat4_euler`/`vec3_transform` for the camera.

**There is not one `SetRenderState`, fog or lighting call in the whole
function.** The bake runs on default state plus each mesh's own material, which
is what the port does. Hypothesis (1) below is therefore weak, not strong.

## Where that leaves the impostor mystery — a SHARP contradiction

Everything is now verified: the generator exhaustively (constants + structure),
the tree host's arguments from the call site, the bake's camera, passes, RT
sizes and state, the billboard quad UVs and sizes. And the canopy is **genuinely
broad** — the radial distribution of leaf vertices is 3.7 / 9.6 / 14.0 / 25.8 /
36.6 / 10.2 % in 20-unit bins out to 120, i.e. **nearly half the foliage lies
beyond r = 80**. It is a dense shell, not a compact core with a few outliers, so
the wide bounding box is not a measurement artefact.

The contradiction, stated plainly:

* The instruction stream says the branch direction **accumulates**:
  `this.dir = parent.dir + bend + offset`, confirmed four separate times, most
  recently at 0x40a1da-0x40a22c (copy parent.dir, `vec3_add` bend, `vec3_add`
  offset). Accumulation over 4 levels of ±0.6 rad gives the canopy we build,
  r ≈ 117.
* The **only** hypothesis that predicts the reference's compact tree
  (r ≈ 75) is the non-accumulating one — and that is exactly what the code does
  not do.

When the sole hypothesis that fits the evidence is contradicted by the
instruction stream, one of two things is true: either the reference's
compactness has a cause nobody has conceived of yet, or an assumption shared by
every reading so far is wrong. This is the strongest candidate in the project
for a **batched question to sagacity** (see [[sonnet-context-and-sagacity]]) —
one sentence from him could replace another week of this.

### END-TO-END TEST: the compact tree is VISUALLY right and METRICALLY worse

The diagnosis was tested directly rather than argued about — the impostor tree
was baked with `TREE.SPREAD = 0.3` (the value the bake simulator said reproduces
the reference's margins) and the whole scene re-rendered. `SPREAD` is added
after the jitter draw, so the RNG stream is untouched and this is a clean A/B.

| pos | as-shipped | compact tree | Δ |
|---|---|---|---|
| 0x0a28 | 26.51 | 31.47 | **+4.96** |
| 0x0c08 | 58.62 | 68.65 | **+10.03** |
| 0x1210 | 42.54 | 42.28 | −0.26 |
| 0x1a00 | 32.96 | 32.96 | 0.00 |
| 0x2030 | 26.80 | 26.80 | 0.00 |

**RMSE says clearly worse. The frame says clearly better.** With the compact
tree, 0x0a28 renders distinct rounded canopies on visible trunks with sky
between them and the dandelion field showing through — which is the reference's
composition. As shipped it is a wall of foliage to the ground with no trunks.

This is the sharpest metric-versus-goal divergence in the project so far, and it
matters beyond this scene: **the RMSE sweep has been actively misleading on
scene 2.** A dense slab overlaps the reference's dense canopies well in a
pixel-average sense; distinct trees pay for every mis-registered edge twice
(missing where the reference has one, extra where it does not). Any future
judgement here must be made on the frames.

Reverted — 0.3 cannot be justified from the binary, and shipping an unexplained
fudge would trade a known-wrong-but-honest port for an unknown-right one. The
finding stands as evidence, not as a change.

### Also PINNED this round: `bend` really is (0,0,0)

`DAT_00478938..40` is referenced at eleven sites (0x409c64, 0x409e85, 0x409f61,
0x40a2c6, 0x40acf9, 0x40aff2, 0x40b35b, 0x40c2a6, 0x40cf52, 0x40f1ce, 0x40f93f)
and **every one loads the address as a `movsd` source**. There is no write
anywhere in the image, so it is BSS zero: the tree's root position and its bend
are both (0,0,0), as ported. That closes the last variable that could have
narrowed the canopy without changing the code.

Remaining port-side candidate, cheap and not yet done: **what the reference
frame actually shows** — every comparison assumes the forest at 0x0a28 is array
C. Worth confirming nothing else contributes.
