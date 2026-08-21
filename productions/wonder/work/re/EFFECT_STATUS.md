# Wonder effect-port status

The schedule and constructor asset associations are exact. `Recovered scene
pass` means the class-specific frame clock and renderer state are translated;
`recovered procedural pass` additionally includes its immediate-mode or
generated geometry. Neither status implies reference sign-off.

Recovery requires both decompilation and raw disassembly. The decompiler is
used to map objects and control flow; instruction bytes are checked for exact
constants, float width/rounding, comparisons, and x87 stack order. See
`ORACLE_WORKFLOW.md`.

The paired 954-function export also closes the ENV parameter audit. Native
loaders `0x404760`/`0x404a00` accept scalar/vector values with optional T/C/B;
omitted fields are zero-initialized, every shipped ENV omits them, and all
parsed fields are stored as float32. Segment searches `0x404f70`/`0x405960`
keep equality on the preceding segment, preserving Wonder's duplicate-time
`70.557` pulse step.

| class | interval | principal retained data | implementation |
|---:|---:|---|---|
| `0x4106a0` | 0–22 | `beginning.exp`, alpha/exit ENV | recovered procedural pass |
| `0x40d790` | 9.862–13.5 | `DarkHorizonOfDreams1__.jpg` | recovered procedural pass |
| `0x40de00` | 0–20 | three RGB/alpha composites, three ENV curves | recovered procedural pass |
| `0x40c760` | 35.5–47 | `boxical.exp` | recovered scene pass |
| `0x40d060` | 26.9–44.5 | `max_t4.jpg` | recovered procedural pass |
| `0x40f8e0` | 26.5–44 | `bubblebath.exp`, `vsz_d2.jpg` | recovered scene pass |
| `0x4138a0` | 20.341–35.5 | `introductionpoem1.jpg` | recovered procedural pass |
| `0x408ca0` | 18.341–40.4 | `y1.jpg`, `bubble.env` | recovered procedural pass |
| `0x40ec40` | 44.4–60 | `shite1.exp`, `design_bw2.exp`, three maps | recovered scene/procedural pass |
| `0x40f2f0` | 44.4–60 | `vsz_d2.jpg` (`scene.exp` is loaded but unused) | recovered procedural pass |
| `0x410100` | 53–59 | `spherical.exp` | recovered scene pass |
| `0x40cea0` | 58.9–69.753 | `boxical4.exp` | recovered scene pass |
| `0x40ccc0` | 59.302–69.753 | `check.exp` | recovered scene pass |
| `0x40fe10` | 58.9–69.753 | `backg.jpg` (`stars.exp`/`speedy.exp` are unused) | recovered procedural pass |
| `0x40dab0` | 69.753–103.5 | `DustOnYourEyes__.jpg` | recovered procedural pass |
| `0x410300` | 69.753–104 | `woah3.exp`, pulse ENV (raw masks are unused preloads) | recovered scene/procedural pass |
| `0x40fa30` | 104–138.5 | `credits.exp`, `design_bw.exp` | recovered scene pass |
| `0x40fc00` | 104–138.5 | `clock.exp` | recovered scene pass |
| `0x40c990` | 138.302–159.44 | two faceted scenes, pulse ENV | recovered scene pass |
| `0x40b040` | 155.44–172.578 | two design maps, ENV, three surface maps | recovered procedural pass |
| `0x40bfa0` | 172–185.035 | bump pair, `end.exp` (three constructor maps are unused) | recovered scene/procedural pass |
| `0x40ea30` | 176–195 (cut at 186.5) | `energy.exp` | recovered scene pass |

All 22 scheduled classes now have address-derived implementations. None of the
rows is reference-signed-off yet; aligned capture and difference review remain
the next Wonder milestone.

---

## The port draws the wrong geometry for four objects (2026-08-20)

**Read the CORRECTION at the end of this section first — the culling reading
below was wrong, and is kept because the sequence of measurements is the point.**

Found by diffing the port's draw stream against the original's, recorded from
`wONDEr.exe` under `tools/winebox/` with the module order pinned by the FSOUND
stub. Not by pixel correlation — the sweep's median r of 0.648 says a frame is
wrong without saying what is wrong with it.

**Measured**, original vs port vertices at seven orders:

| order | 2 | 5 | 8 | 11 | 14 | 17 | 20 |
|---|---|---|---|---|---|---|---|
| original | 15530 | 9131 | 13948 | 20140 | 9168 | 9528 | 6488 |
| port | 22520 | 10718 | 14608 | 28102 | 9924 | 10284 | 6488 |

The port is never short and is over by up to 1.45x. Order 11 isolates it: the 16
`QUADS:4` overlays and both `1944` draws match EXACTLY, and the whole difference
is in the meshes — the original draws 6627 where the port draws 10278, and
2496 / 2421 / 2346 / 2298 where the port draws 3468 four times.

**The port's own output proves those four are one mesh** (3468, four times,
identical), so the original is reducing the same geometry by a different amount
per instance — 66% to 72% surviving. `GL_CULL_FACE` is DISABLED in every frame
sampled, so this is not the driver. Confirming detail: the original emits
`TRIANGLES:0` draws, i.e. `glBegin`/`glEnd` pairs with nothing between them,
which is what a per-triangle reject loop produces when a whole batch fails.

### The test, exactly — 0x004076cf

```
  MOV DL, byte ptr [ECX + 0x94]   ; material override
  TEST DL,DL
  JNZ  draw                       ; material set -> draw unconditionally
  MOV BL, byte ptr [ECX + 0x4c]   ; vertex 0 flag
  MOV DL, byte ptr [EDX + 0x4c]   ; vertex 1 flag
  OR   DL, BL
  OR   DL, byte ptr [ECX + 0x4c]  ; vertex 2 flag
  JZ   skip                       ; ALL THREE ZERO -> triangle not submitted
  INC  dword ptr [0x00485e08]     ; drawn-triangle counter
  CALL dword ptr [EDX + 0xcc]     ; per-triangle handler
```

So a triangle is submitted iff **any of its three vertices carries a non-zero
byte at vertex+0x4c**, unless the material's byte at +0x94 overrides. A material
holds two handlers, selected by a jump table at 0x4081d0: `+0xcc` per triangle,
`+0xd0` per batch.

### The vertex layout, recovered

`FUN_00406d20` is the vertex setter, and the x87 audit flags it **DROPPED**
(12 x87 instructions, zero float evidence in the C) — so it was read as assembly,
per METHOD.md §3, not from the decompilation.

```
  LEA EAX,[EDX*8]  /  SUB EAX,EDX  /  LEA EAX,[EDX + EAX*4]  /  SHL EAX,2
      => byte offset = 116 * index          vertex stride 0x74
  FSTP [EDX+EAX+0x30] / +0x34 / +0x38       position (what glVertex3fv reads)
  FSTP [EDX+EAX+0x1c] / +0x20               a second 2-vector
  MOV  dword [ECX+EAX+0x10], 0xff           the byte the shaded handler sums
```

So the vertex is 116 bytes: position at +0x30, colour at +0x10, flag at +0x4c.

### Open — do not implement culling until this is answered

**Where vertex+0x4c is WRITTEN is still not located**, and that write is the
actual visibility criterion. We know triangles are filtered by a per-vertex flag;
we do not know what the flag means, and a guess would be an empirical fit of
exactly the kind METHOD.md warns produces convincing wrong answers.

Searched and NOT found in `disasm.asm`: any byte or dword store to `+0x4c` on a
116-byte-strided base, plain or indexed. The candidates that do exist
(`0x004063a7`, `0x004069f4`) belong to other structures — one is a 4x4 identity
matrix init, recognisable by `0x3f800000` at +0x70.

**The export was in fact incomplete, and that has now been fixed** —
`tools/ghidra/ForceDisasm.java`, run before the exporters, disassembles executable
bytes the analyser left undefined and promotes them to functions so
`ExportDisasm`/`ExportDecomp` (which iterate FUNCTIONS) can see them:

```
undefined bytes in executable blocks: 141809
disassembly attempted at 132085 addresses, 1573 produced code
instructions 62574 -> 70205  (+7631)
functions    1077 -> 1279  (+202)
```

Validated on the known gap: 0x408140-0x4081bf went from 1 line to 18 and now
matches what capstone produced by hand. The x87 audit was re-run over the larger
export and flags 91 of 1152 functions, up from 61 of 954.

**The write to vertex+0x4c is STILL not located**, now searched against the
complete export. Eliminated by inspection rather than by absence of a grep hit:
the `0x4c` sites at 0x409660/0x409680 are a doubly-linked list's prev/next pair,
0x004069f4 is a 4x4 identity-matrix init, and `param_1[0x4c] = 1` in FUN_00415d30
is libjpeg (`param_1` is `int*`, so byte offset 0x130).

No byte-sized store to +0x4c exists anywhere in the binary.

### +0x4c is a POINTER, not a flag — and that undermines the culling reading

At 0x0040a4a2, in a structurally analogous array (92-byte stride at `[obj+0x40]`,
same +0x30 position field):

```
  MOV ECX,[EAX + EBP + 0x4c]   ; read +0x4c
  ADD EAX,EBP                  ; this element's address
  CMP ECX,EDX                  ; EDX = 0
  JZ  use_self
  MOV EAX,ECX                  ; non-null -> follow it
  FLD [ESI] / FADD [EAX+0x30]  ; ...and take POSITION from there instead
```

So +0x4c means "this element's real data lives over there" — an alias/redirect
checked against null. If the vertex field is the same kind, then the draw test at
0x004076cf is a null-pointer test on an alias pointer, reading only its low byte,
and "draw the triangle if any vertex is aliased" is a strange rule for culling.

**RESOLVED 2026-08-20 — it is rejection. Morphing is ruled out.**

Recorded order 11 through apitrace with the order pinned by the FSOUND stub, and
compared actual `glVertex3fv` VALUES between two instances of the object in the
SAME frame:

```
  positions in the 2496 draw:                       561 unique
  bit-identical to the 2421 draw's:                 553   (98.6%)
  differing:                                          8
  their distance to the other set: median 0.125 on an object of extent 4.7
```

A morph would move most vertices; this moves none — 98.6% are bit-identical, not
merely close. The geometry is static.

The 8 that differ are the confirmation rather than an exception. If the TRIANGLE
set varies per instance then the VERTEX set follows, because a vertex is
submitted only if some triangle using it survives. Different triangles surviving
in different instances therefore gives vertex sets that overlap heavily and are
NOT nested — which is what the subset test found, and what rejection predicts.
Nesting was the naive expectation and its failure supports the conclusion. At
2.6% of the object's extent the differing vertices sit at the silhouette, where
the boundary moves as the object turns.

The two hypotheses that were open, for the record:

1. **Rejection.** The original submits a subset of the same triangles; the port
   submits all of them.
2. **Morphing.** The original submits DIFFERENT geometry per instance and the
   port draws the base mesh unchanged — a missing-animation bug, not a missing-
   culling one.

Both fit 2496 / 2421 / 2346 / 2298 against the port's 3468 four times. The
"identical 3468" that seemed to prove one mesh proves only that THE PORT treats
them as one mesh, which is the thing in question.

That test has now been run (above) and settles it. `WINEDEBUG=+opengl` could not
have answered it: it logs only the pointer for `glVertex3fv`, so both hypotheses
look identical in that log. This is what apitrace was added for.

**Still open**: the criterion itself. We know triangles are rejected
view-dependently and that the gate at 0x004076cf reads a per-vertex field which
is an alias POINTER elsewhere in the engine. We do not know what sets it, so we
still cannot say backface vs near-plane. A port must not guess: the visible
consequence differs, and `GL_BLEND` is on with depth off in these frames.

### Layout recovered

* vertices: 116 bytes, array at `[obj+0x80]`; position +0x30, colour byte +0x10
  (`0xff` from FUN_00406d20), alias/redirect +0x4c
* triangles: 88 bytes, array at `[obj+0x88]` (FUN_00406c00); first three dwords
  are vertex POINTERS
* materials: two handlers, +0xcc per triangle and +0xd0 per batch

Two observations for whoever picks this up:

* Survival across four instances of ONE mesh at order 11 is 72%, 70%, 68%, 66%
  — smooth and monotone as the object turns. Consistent with a per-vertex
  geometric test; not obviously consistent with all-or-nothing frustum rejection.
* A global at 0x00485e08 counts surviving triangles, so the engine's own tally is
  available to compare against, and `tools/winebox/` can already read the effect
  of any hypothesis by re-recording.

**Why it matters visually**: `GL_BLEND` is enabled and depth is off for part of
these frames, so the surplus triangles the port submits are drawn and do
composite. This is not a performance difference.


---

## CORRECTION — there is no runtime culling. The counts are fixed.

Everything above builds toward "the original rejects triangles view-dependently".
That is **wrong**, and the measurement that killed it is simple.

Re-recorded order 11 through apitrace with the order pinned but the performance
counter ADVANCING, so animation runs inside the part:

```
  57 frames, 2 count-signatures — 56 of them [1944,1944,2298,2346,2421,2496,6627]
  the 6627 draw, frame 39 vs frame 151:
    first vertex   [0.0054,-0.6648,-0.28]  ==  [0.0054,-0.6648,-0.28]
    positions      identical, 1392/1392 shared
```

The counts do not move across 112 frames. These objects are RIGID — vertices are
submitted in object space and animated by the modelview matrix, which is why the
positions are constant — but a view-dependent rejection would still change the
COUNTS as the matrix turns, and nothing changes.

So the four draws are **four fixed, slightly different meshes**: 98.6% shared
positions, each carrying a handful of its own, at 2496 / 2421 / 2346 / 2298. The
port draws 3468 for all four because it treats them as one mesh instanced four
times.

**The defect is therefore in what the port LOADS or GENERATES, not in what it
culls.** The next question is why the port produces one 3468-vertex mesh where
the original has four variants — a question for the EXP/KEXP scene data and the
generator, not for the renderer.

### What the earlier steps did establish, and which still stands

* the draw-stream diff itself, and the per-order vertex totals
* the gate at 0x004076cf and the material's two handlers (+0xcc, +0xd0)
* the vertex layout: 116 bytes at `[obj+0x80]` — +0x10 lighting intensity,
  +0x14/+0x18 sphere-map texcoords, +0x30 position, +0x3c/+0x40/+0x44 NORMAL,
  +0x4c an alias pointer; triangles 88 bytes at `[obj+0x88]`
* FUN_004070d0 is the per-vertex pass: transform, lighting (normalised
  light vector dotted with the normal, result to +0x10), then sphere-map texgen
  (+0x14/+0x18). It never writes +0x4c, which is consistent with +0x4c being
  static rather than a per-frame visibility flag.

### The methodological note worth keeping

This finding was revised three times — "the original culls", then "culling or
morphing?", then "rejection, morphing ruled out", then this. Every revision came
from a measurement, and every earlier version would have produced a confident,
wrong fix. The port implements nothing from any of them, which is the only reason
none of it cost anything.

---

## Issue #31's anti-correlation: one clip, and it runs past its animation end

**#31 attributes the five negative samples to "the frame, not either clip", because
two clips are live over capture 100.2-102.8 s. That is wrong — it is ONE clip.**
Isolating layers with `?only=` at the worst sample (capture 102.305 s):

| layers rendered | luma ours | ref | r |
|---|--:|--:|--:|
| all | 88.6 | 6.6 | -0.245 |
| only `effect_40dab0` | **0.0** | 6.6 | — |
| only `effect_410300` | **88.6** | 6.6 | **-0.245** |

`effect_40dab0` (the dust tunnel) is **innocent**: it fades correctly to black.
`dust-tunnel.js` has `EXIT_START = 29.991` on a clip starting at 69.753, i.e. show
99.744 s over 1 s, which matches the reference's own falloff. It is filed in #31
only because a whole-frame comparison indicts every clip that is live.

Every bit of the error is `effect_410300` / `woah3.js`.

### What the frames show

Side-by-side at capture 102.305 s (`work/verify/frames/effect_40dab0_t32.552_sbs.png`):
the reference is near-black with the LWO "bone" objects lit and correctly placed;
ours has the same objects plus a **full-frame bright blue caustics backdrop** and
visible translucent QuadPatch planes. The objects match; the backdrop does not.

Correlation is comparing structure, and ours is dominated by a large bright field
that is simply not in the reference frame — which is why r goes NEGATIVE rather than
merely low.

### The mechanism: the scene runs past its animation end, and we clamp

`woah3.js` drives the scene with `OBJECT_RATE = 15`, so `objectFrame = localTime*15`.
`woah3.exp` declares **`frameEnd 400`**.

```
  objectFrame reaches 400 at localTime 26.667  =  show 96.420s
  localTime 32.552 (the worst sample)          =  objectFrame 488.3
```

The reference's luma falls off a cliff immediately after that boundary:

| capture | 96.03 | 98.12 | 100.21 | 102.31 |
|---|--:|--:|--:|--:|
| ref | 194.6 | 148.9 | 51.0 | **6.6** |
| ours | 144.8 | 165.6 | 113.4 | **88.6** |

`sampleScene` (`shared/sunflower/js/scene.js:16`) **clamps**:
`if (frame > keys[last].time) return { index: last - 1, t: 1 }` — it holds the final
pose forever. So the port freezes the backdrop in place and keeps drawing it lit,
while the original evidently does something else once the animation is over.

**Hypothesis, NOT yet confirmed**: the original EXTRAPOLATES past the last key rather
than clamping, so the animated scale/translation carries the textured layers out of
frame. `Original` has a scale key of 53.07 and the `B2.LWO0n` records carry scale
keys of 65-170, so an extrapolating scale track would move a great deal in the six
seconds after the boundary. The camera is unaffected — `CAMERA_RATE = 10` puts
`cameraFrame` at 325 of 400 at the same instant, still inside its range, which fits
the reference keeping the objects framed while the backdrop leaves.

**DISPROVEN, 2026-08-20 — the native clamps exactly as the port does.** Two errors
of mine are corrected here.

First, the citation: I attributed the evaluator to `FUN_00410770`. **That address
does not exist in wONDEr.exe** — it is from Moments.exe, a different binary in the
Haujobb work. Wonder's segment search is `FUN_00404f70` / `FUN_00405960`, with the
vector evaluators at 0x4051f0/0x4053c0 and scalar at 0x405790/0x405820, exactly as
`shared/sunflower/js/scene.js:71` already records.

Second, the hypothesis. `FUN_00404f70` past the last key:

```
  00404f99  FCOMP [EDI + EAX*4]     ; frame vs keys[last].time
  00404f9e  TEST AH,0x41 / JNZ      ; if frame <= last -> normal search
  00404fa3  FLD  [0x433258]         ; else: load 1.0
  00404fa9  DEC  EDX                ;       index = nkeys-1
  00404faa  MOV  [ECX+4],EDX
  00404fad  RET                     ;       return u = 1.0
```

That is `{ index: last - 1, t: 1 }` — identical to `findSegment` in `scene.js:16`.
It also clamps the low end (`frame < const` -> `frame = 0`). **Extrapolation is not
the difference**, and changing the interpolator would have altered every Sunflower
production to fix nothing.

### Ruled out

* **Timing.** `phase.mjs wonder effect_410300 30.914` scans +/-0.8 s and finds r
  NEGATIVE at every offset, best -0.044. The tool's own verdict: "NOT a timing
  offset: the part draws a different picture at every time in the scan."
* **The pulse envelope.** `napierdalanie.env` gates only the four LWO alphas
  (`inversePulse * scale`), matching the original's `_DAT_004360c4` global-alpha
  writes in `forced_00410410`, which are reset to 1.0 afterwards. The QuadPatches and
  `Original` are drawn at full alpha in BOTH, so alpha is not the difference.
* **Repeatability.** `repeatability.mjs wonder` passes all four assertions (ORDER,
  STATE, REPEAT, ISOLATION), so the baseline scores are of frames a viewer would see.
  Wonder does NOT have lapsus's defect (#36).


---

## Correction: the surviving counts are NOT fixed. The earlier test froze the clock.

Recording order 12 (show 95.5-104.1 s, which contains the whole anti-correlation
window) with the module order pinned and the performance counter ADVANCING:

```
  frame  prims    verts   distinct per-object counts
     40     35    20560   6519, 2565, 2559, 2499, 2466, 1944, 4
     44     35    20551   6534, 2562, 2550, 2487, 2466, 1944, 4
     48     35    20533   6528, 2562, 2544, 2481, 2466, 1944, 4
     52     35    20542   6516, 2565, 2547, 2481,       1944, 4
     56     25     3952                                 1944, 4
```

The counts **move frame to frame**. The earlier entry above concluded "the counts are
fixed, so there is no runtime rejection" from a run with the clock FROZEN — the one
condition under which fixed counts prove nothing. That conclusion is withdrawn.

Also visible: near the end of the window the original **stops drawing the large
meshes altogether**, falling to 25 primitives and 3,952 vertices with only the
1944-vertex QuadPatches and the 4-vertex quads left.

### Still open, and NOT to be guessed

There is no frame-to-show-time mapping for these recordings yet, so it cannot be said
whether that drop coincides with the reference's fade (which begins just after
capture 96.4 s and reaches luma 6.6 by 102.3 s) or happens later, after the clip ends
at 104.0 s. Without that mapping the observation is real but unplaced.

Getting it is the next step, and it is a measurement, not an inference: the engine's
own frame counter is available in the recording, and `SUNF_QPC` / `SUNF_QPC_STEP`
control the clock the engine reads. Establishing what show time a recorded frame
corresponds to makes every future comparison in this window decidable.

### Method note — Sunflower layers

These productions run a layered timeline: a sample is filed under one clip while the
frame is everything active. Any diagnosis here must isolate EVERY live layer with
`?only=`, not just the part the sweep names. That is what showed #31's `effect_40dab0`
to be innocent, and it should be the first step on every part, not an afterthought.

---

## The engine's clock, and addressing a show time in the original

Read out of the frame handler (the `FMUSIC_GetOrder` / `QueryPerformanceCounter`
block around `decompiled.c:14803-14840`), constants at 0x4337b0 = **1000** and
0x4337a8 = **0.001** as doubles, which cancel:

```
  if (order != lastOrder) {
      QueryPerformanceCounter(&orderStartQpc);
      orderStartSeconds = orderTable[min(order, maxOrder)];   // stride 0x1c
  }
  showTime = orderStartSeconds + (QPC_now - orderStartQpc) / frequency
```

`_DAT_004337a0 = 186.5` is the end-of-demo threshold, matching the 186.75 s capture.
`_DAT_00433258 = 1.0` is the value the segment search returns past the last key,
independently confirming the clamp read above.

**Why every frozen recording gave the order boundary.** A constant counter is latched
and then compared against itself, so elapsed is identically zero and the show sits
exactly on `orderTable[order]`. A freely stepping counter advances, but lands wherever
the call count happens to put it, which is not addressable either.

`SUNF_QPC_HOLD` (added to the FSOUND stub) fixes that: the counter reports 0 for the
first `SUNF_QPC_LATCH` calls — long enough for the order-change branch to latch at
zero — then `HOLD * frequency` forever. Elapsed is exactly `HOLD`, so the original
freezes at `orderTable[order] + HOLD`, repeatable and nameable in show time.

```sh
SUNF_QPC_HOLD=6.805 sh /work/sunf-probe.sh 12 /out/hold102 45   # order 12 -> show 102.305s
```

## What the original submits at show 102.305 s

35 primitives, 20,137 vertices — objects 6525, 2502, 2439, 2391, 2328, 1944, 4.
**It draws the same object set the port does.** The difference is in the colour.

The per-triangle handler `forced_004084b0` issues
`glColor4f(I, I, I, globalAlpha * materialAlpha)` where `I` is the **sum of the three
vertices' lighting byte at +0x10**, so the submitted RGB *is* the shading result.

| show time | reference | RGB values submitted |
|---|---|---|
| 86.9 s | bright | `255` only |
| 102.3 s | near-black | `0` at alpha 0.280813 / 0.200581 / 0.140406 / 0.080232, plus `1` at alpha 0 |

`rgb 1, alpha 0` is the dust tunnel at its `EXIT_START`, confirming that layer is
correct in both.

**The four black alphas are in the exact ratio 3.5 : 2.5 : 1.75 : 1**, which is
`LWO_ALPHA_SCALES = [0.7, 0.5, 0.35, 0.2]` from `woah3.js`. So the LWO path matches
structurally and the show-time addressing is landing where intended — the four
objects are recognisably the four LWO copies with their pulse-scaled alphas.

### Open

The original's trace at this instant ALSO carries `rgb 255` at alpha 1 and 0.7 — a
bright backdrop — while the reference frame is near-black (luma 6.6). Those two facts
are not yet reconciled, and until they are, the cause of the darkness is not
established. Candidates, none tested:

* the addressed instant is not exactly capture 102.305 s (the `orderTable` value for
  order 12 was taken from the PORT's `positionAt`, not read from the executable's own
  table at `DAT_00485de8`);
* the bright draws are geometry that is off-screen or occluded at this instant;
* a layer the port does not render at all contributes, or a black veil is composited
  after the draws recorded here.

Read `orderTable[12]` out of the binary before trusting the addressing to the
millisecond. The Sunflower timeline is layered, so the layer inventory at this instant
must be established on BOTH sides before any of this is acted on.

---

## #31 and the geometry gap are the SAME defect

With both sides addressable in show time, the comparison at show 102.26 s
(order 12 start 95.456 s from `mystified.env` key 12, + `SUNF_QPC_HOLD=6.805`):

| object | original | port |
|---|--:|--:|
| QuadPatch | 1944 x2 | 1944 x2 |
| dust tunnel cards | 4 x16 | 4 x16 |
| big mesh (`Original`) | **6525** | **10278** |
| LWO copies | **2502 / 2439 / 2391 / 2328** | **3468 x4** |
| **total** | **20,137 in 23 draws** | **28,102 in 23 draws** |

Same objects, same number of draws, same order, and **every layer that is not a
rejected mesh matches exactly** — both QuadPatches and all sixteen dust cards are
identical. The whole difference is the five meshes' vertex counts.

**So there is no separate "missing fade".** The original submits 65-72% of each
mesh's triangles; the gaps show the black background through, and the port draws the
meshes solid. That is why ours is a bright field where the reference is near-black,
and why correlation goes negative rather than merely low.

Issue #31 and the geometry gap are one defect, and the triangle rejection is the
critical path for both.

### What the colour data adds

Weighting each draw by its vertices and the `glColor4f` in force:

| instant | reference | rgb 255 a1.0 | rgb 255 a0.7 | rgb 0 a0.0 | rgb 1 a0.19 |
|---|---|--:|--:|--:|--:|
| 86.9 s | bright | 47.5% | 42.6% | — | 10.0% |
| 102.26 s | near-black | 12.5% | 41.2% | **36.5%** | 9.7% |

36.5% of vertices are submitted at **alpha 0** at the dark instant, where the same
group was `rgb 255, alpha 1.0` when the reference was bright. The `rgb 1, alpha 0.19`
band is the dust tunnel and is stable across both, matching `drawAlpha = alpha * 0.19`
in `dust-tunnel.js`.

### Ruled out this round

* **Clamp vs extrapolate** — `FUN_00404f70` returns `{last-1, u=1.0}` past the last
  key, identical to `findSegment`. (Previous commit.)
* **The order-table offset** — order 12 starts at 95.456 s, read from
  `mystified.env` key 12, which is what the engine's `orderTable[order]` (stride 0x1c,
  first float) resolves to. The earlier 95.5 s from `positionAt` was 44 ms out.
* **apitrace replay** as a way to render the original's own frames — `glretrace`
  segfaults under `qemu-i386`. The reference capture remains the only pixel ground
  truth.

### The rejection is at DRAW time, not load time — and the criterion is still unread

The loader `FUN_00401b20` (547 instructions) reads faces in a plain loop and stores
every one of them via `FUN_00406c20`; there is no rejection there, and the triangle
array holds all 1156. The draw loop at 0x004076aa iterates `[obj+0xdc]` — the full
count — and the gate at 0x004076cf decides per triangle, incrementing the survivor
counter at 0x00485e08. So the reduction is a draw-time test, as first read.

**But no write to `vertex+0x4c` exists anywhere in the binary.** Searched, over the
force-disassembled export (+7,631 instructions): byte stores, dword stores, indexed
forms, `LEA`-computed addresses, and float stores. Every non-stack `+0x4c` site
belongs to another structure — a doubly-linked list's prev/next, a 4x4 identity
matrix init, libjpeg's `int*` at byte offset 0x130, or CRT code above 0x430000.

That leaves an unresolved contradiction worth stating rather than papering over:

* if `+0x4c` is never written it stays 0, the `OR` of three zeros is zero, and the
  gate would skip EVERY triangle — but triangles are plainly drawn;
* so either the material override at `+0x94` is non-zero for these meshes, making the
  `+0x4c` test irrelevant and the real reduction something else entirely, or the
  write exists somewhere the export still does not reach.

**Both branches are testable and neither is guessable.** The decisive one is cheap:
read `material+0x94` for woah3's materials. If it is non-zero, this gate is a red
herring and the search restarts from the survivor counter at 0x00485e08 — find who
else writes it, or trace back from `[EDX+0xcc]`, the per-triangle handler.

A second option now exists that did not before: the FSOUND stub runs **inside the
process**, so it can read the engine's memory directly. Walking the vertex array at
`[obj+0x80]` and printing `+0x4c` for a known object would settle in one run what
static search has not settled in several. That is a bigger change than it sounds —
the stub would need the object pointer — but it is the direction with a guaranteed
answer.

**Status: Phase 4 of the plan is BLOCKED on this, and Phase 1 depends on Phase 4**
because they are the same defect. Phases 2, 3 and 5 remain open and independent.

---

## Phase 2 complete — the six major parts, classified

Every part measured at a mid-part order, original recorded through `tools/winebox/`
and port through `tools/record-minigl-draws.mjs`. **Orders 2 and 11 each carry TWO
overlapping clips**, so their figure is the combined frame; the layered timeline means
a per-part figure does not exist there.

| part | median r | order | geometry | verdict |
|---|--:|--:|---|---|
| effect_40c990 | 0.265 | 18 | **EXACT** (10 draws, 360 v) | **shading** |
| effect_410300 | 0.328 | 11 | differs x1.40 (shared frame) | geometry |
| effect_40dab0 | 0.359 | 11 | differs x1.40 (shared frame) | geometry |
| effect_40b040 | 0.427 | 20 | **EXACT** (6488 = 6488) | **shading** |
| effect_40de00 | 0.430 | 2 | differs x1.45 (shared frame) | geometry |
| effect_4106a0 | 0.476 | 2 | differs x1.45 (shared frame) | geometry |

Layer isolation at order 2 (`?only=`): all layers r 0.4285 with luma 20.4 vs 20.7 —
**the level is right there and the structure is wrong**, so `effect_40de00` and
`effect_4106a0` are not brightness faults despite sitting in the major band. Neither
layer alone exceeds r 0.30; they only score together.

## Phase 3 — the two geometry-exact parts have DIFFERENT shading faults

Issue #32 proposed "one missing or under-valued additive contribution rather than four
independent bugs". Measured on the only two parts where geometry is proven exact, so
any residual must be shading, that is **not** what is there.

### effect_40c990 (order 18) — a constant alpha factor of 3.82

| group | port alpha | original alpha | ratio |
|---|--:|--:|--:|
| texture 1, 5 draws x36 v | 0.183 | 0.0479 | **3.820** |
| texture 3, 5 draws x36 v | 0.379 | 0.0993 | **3.816** |

RGB matches (white on both sides after GL's clamp); only alpha differs, by the same
factor in both groups. A single shared constant, which is what makes it worth finding
rather than tuning: `1 - (1 - 0.0479)^4 = 0.178`, close to 0.183, so **four
accumulated passes** is a candidate reading — the port may be collapsing a repeated
draw into one and pre-combining its alpha.

### effect_40b040 (order 20) — a lost per-instance brightness ramp

| | original | port |
|---|---|---|
| draws | ~15 x 432 verts | 3 x 2160 verts |
| colour | rgb **0.062, 0.125, 0.188, 0.25, 0.312, 0.375, 0.438, 0.5 ...** at alpha 0.3 | `0.938` x2, `1.0`, `1.0` |
| total | 6488 | 6488 |

**RETRACTED — this was a recorder artifact, not a port defect.** The recorder latched
colour at `begin()`, so it reported the FIRST colour of a 2160-vertex batch as though
it were the whole batch. Tracking colour changes *inside* a primitive shows the port's
draw as:

```
prim TRIANGLES:2160:t1 c1426x[0,0,0,0.67 .. 0.938,0.938,0.938,0.67]
```

**1,426 distinct colours**, ramping black to 0.938 within the one draw. The ramp is
present; it is per-vertex where the original's is per-draw, which is a difference in
batching and not in output. `design-tunnel.js` calls `mgl.color4()` per vertex at
line 345, which is what prompted the re-check — the source disagreed with the
measurement and the source was right.

What IS different at order 20, and is narrower than claimed:

| | original | port |
|---|---|---|
| alpha | 0.3 | **0.67** |
| rgb range | 0.062 .. 0.5 | 0 .. 0.938 |

**Lesson for the tool, recorded because it nearly cost a wrong fix**: an immediate-mode
API lets colour change per vertex, so any recorder that samples state at `begin()`
reports batched geometry as flat-shaded. Check the port's source before believing the
recorder about a difference in shading.

### Phase 4 — narrowed, criterion still unread

Wonder's materials are stored by the port as **opaque bytes** (0xae = 174 for SUNF),
so the runtime field the gate reads, `material+0x94`, can be inspected directly from
the asset — subject to the caveat below.

| material | bytes 0x90..0x98 | float @0x91 | meshes | rejected? |
|---|---|--:|---|---|
| 0 | `61,206,204,76,62,142,141,13,63` | 0.200 | `Original` | **YES** (10278 -> 6525) |
| 1 | `61,138,137,9,63,202,200,72,62` | 0.537 | `QuadPatch01/02` | no (1944 = 1944) |
| 2 | `61,0,0,0,0,0,0,0,0` | 0.000 | `B2.LWO01-05` | **YES** (3468 -> ~2400) |

`faceted.exp` and `faceted2.exp`, whose meshes are geometry-EXACT, both carry
`0x94 = 63` with float @0x91 = 1.0.

**Material 2 is all zeros and its meshes are rejected**, which fits the gate exactly.
**Material 0 is non-zero and its mesh is rejected anyway**, which does not. So
`material+0x94` alone is not the criterion, and the correlation is suggestive rather
than decisive.

Two caveats that must be resolved before anyone builds on this:

* **The blob is not the runtime struct.** Floats in the file blob begin at 0x91, not
  0x90, so the runtime layout is offset by some amount relative to the file, and the
  runtime struct is larger (its handler pointers live at +0xcc/+0xd0, past the file
  blob's 174 bytes). Reading file byte 0x94 as runtime `+0x94` assumes an identity
  mapping that has not been established.
* **The port never decodes these fields at all** — `readMaterial` for the `wonder`
  variant copies `MATERIAL_BYTES.wonder` bytes verbatim and extracts only strings. So
  no existing port behaviour depends on any interpretation of them, and none should
  be invented here.

**Phase 4 remains blocked.** The plan's own rule applies: the criterion is to be read,
not fitted, and a threshold on a float that happens to separate three samples is
exactly the kind of convincing wrong answer METHOD.md warns about.

### The runtime material struct, read from inside the process

The FSOUND stub is loaded into the engine's address space and these PEs have no
ASLR, so `SUNF_PEEK_PTR=43f474:c0` dereferences `DAT_0043f474` — the current
material pointer — and dumps the struct it points at. Measured at show 102.26 s:

```
  [0x43f474] -> 0x4785720
  +000  ff ff ff ff ff ff ff ff  02 03 00 00  03 03 00 00
  +010  "Material #2"
  +090  03 00 00 00 | 00 80 41 00 | 00 00 00 00 | 00 00 00 3f
```

`+008 = 0x302` and `+00c = 0x303` are `GL_SRC_ALPHA` / `GL_ONE_MINUS_SRC_ALPHA`,
exactly what `forced_00408550` writes to `[EBX+8]` / `[EBX+0xc]` — so this is
confirmed to be the material struct the draw path consumes, not a lookalike.

**The byte the gate tests, runtime `material+0x94`, is `0x00`** for `"Material #2"`
— woah3's material 2, the one the `B2.LWO0n` meshes use, and the one whose triangles
are measurably rejected (3468 -> ~2400).

**RETRACTED — that inference was one sample wide.** Dumping the material
neighbourhood (stride **0xe0**) reads two of woah3's three materials:

| address | name | `+0x94` | blend `+08/+0c` | mesh | rejected? |
|---|---|--:|---|---|---|
| 0x4785720 | Material #2 | **0** | 0x302 / 0x303 | `B2.LWO0n` | **YES** |
| 0x4785800 | Material #1 | **0** | 0x302 / 0x0001 | `QuadPatch01/02` | **no** |

Both are zero. So `material+0x94` does **not** discriminate: the gate is uniformly
ACTIVE, and QuadPatch keeps all 1944 vertices while the LWOs lose ~30% anyway.

Two consequences, both important:

* **The file blob does NOT map to the runtime struct at 0x94.** The asset bytes read
  62 / 63 / 0 for materials 0 / 1 / 2; the runtime reads 0 / 0 / ?. Material 2
  agreeing was coincidence. **The asset-side correlation table above is meaningless
  and must not be used** — including as the basis for any threshold.
* **The criterion is the per-vertex `+0x4c`, confirmed.** It is not a material
  property, not a scale threshold on a material float, and not an override. Two
  meshes under materials with identical `+0x94` behave differently, so the
  discrimination is per vertex, exactly as the gate reads it.

**Still unexplained**: material 0 (`Original`) has a non-zero 0x94 yet its mesh is
also reduced, 10278 -> 6525. Either the runtime material order differs from the file
order, or `Original`'s reduction comes from somewhere other than this gate. The peek
can settle that too — it needs the pointer captured while material 0 is bound rather
than material 2, which is a matter of when the peek fires, not of whether the method
works.

Practical note for anyone using the peek: trigger it from `FMUSIC_GetOrder`, not from
the QPC hook. The engine calls GetOrder about **three times over an entire run**, not
once per frame as the clock code suggests, so any threshold above that never fires.

### Finding the object: not adjacent to the materials

The draw function is `__fastcall`/thiscall — `MOV ESI,ECX` at 0x00407659 — so the
object is the `this` pointer and is in no global. It can be found by signature
instead: `+0xd4` vertex count, `+0xdc` triangle count, `+0xe0` material pointer,
`+0x80` vertex array, `+0x88` triangle array.

Dumping **24 KB around the materials** (0x4782720 onward) finds **none of it**. Not
one of woah3's counts — 1156, 3426, 648, 631, 1766 — appears anywhere in that window.
The objects are allocated well away from the materials, so reaching them means
scanning memory rather than stepping to a neighbour, and that is not bounded.

**Reading `vertex+0x4c` therefore remains the open item**, and with it Phase 4 of the
plan, and with Phase 4 the fixes that Phases 1 and 5 depend on.

The instrument is sound and now correct — it just needs to be pointed at an address
nobody has yet. The bounded ways to get one:

* hook a GL entry point the draw path calls per object (the engine resolves them via
  `wglGetProcAddress`, which the stub could interpose) and read `ECX`/`ESI` at that
  moment;
* or find the container that owns the objects — `[obj+0xe0]` points AT a material, so
  a scan for a dword equal to a known material address yields an object minus 0xe0,
  given a wide enough window to scan.

### faceted.js is VERIFIED CORRECT against the binary

Chasing the 3.82x alpha discrepancy on `effect_40c990` led to `faceted.js`'s
`ENVELOPE_TIME_ORIGIN = 69.753`, which looks wrong — the clip starts at 138.302, and
69.753 is *woah3's* start, present in `woah3.js` with the same name. It reads exactly
like a copy-paste bug.

**It is not.** `forced_0040cb20` (faceted) samples its envelope with
`FUN_004058b0(env, localTime + _DAT_004333c8)`, and `forced_00410410` (woah3) uses
**the same constant**. `_DAT_004333c8` is a double equal to **69.753**, so the origin
is genuinely shared between the two effects in the original.

The rest of the effect's scalars check out too:

| original | value | port |
|---|--:|---|
| `_DAT_00433238` | 1.0 | `firstAlpha = 1 - pulse * 0.8` |
| `_DAT_004334e0` | 0.8 | ^ |
| `_DAT_004334d0` | 15.138 | `SECOND_FADE_START = 15.138` |
| `_DAT_004334c8` | 0.6 | `fade = min(1, (time - START) * 0.6)` |

`_DAT_004360c4 = _DAT_00433238 - env * _DAT_004334e0` is the original's global-alpha
write, and it is `1 - pulse * 0.8` exactly.

**So the 3.82x discrepancy is not in this effect's alpha logic.** It is either a
measurement artefact — the two sides may not have been at the same instant, since the
port sample came from `--order 18` via `positionAt` while the original came from a
frozen-clock recording — or it is in the material opacity that multiplies it, which
the port takes from the EXP and which has not been checked.

**Do not "fix" faceted.js.** Four of its constants are now confirmed against the
binary.

---

## Phase 5 — re-measured, no regression, findings filed

`node tools/inspect/sweep.mjs wonder --tag=verify`, compared against the baseline
pinned before any work started:

```
  baseline  medianR 0.6481  medianRmse 49.69  191 samples
  verify    medianR 0.6481  medianRmse 49.69  191 samples
  delta     +0.0000        22 of 22 parts identical, 0 moved
  still below 0.55: effect_40c990 0.265, effect_410300 0.328, effect_40dab0 0.359,
                    effect_40b040 0.427, effect_40de00 0.430, effect_4106a0 0.476
```

Exactly as expected: this work changed `tools/`, `docs/` and these notes, and **no
runtime code**. The re-sweep is a control confirming that, not an improvement.

Findings filed to the tracker: the corrected diagnosis on **#31** (one clip, not two;
it is the geometry defect; timing, fades, the pulse envelope and clamp-vs-extrapolate
each ruled out by measurement) and on **#32** (no shared additive term; four of the
six are geometry-bound; both shading candidates dissolved; `effect_40de00` and
`effect_4106a0` are structure faults with correct level, so the issue's framing does
not apply to them).

### Why no fix landed, stated plainly

Three separate times a well-evidenced defect turned out to be correct code or a faulty
instrument:

| suspected | reality |
|---|---|
| `scene.js` clamps where the original extrapolates | `FUN_00404f70` clamps identically |
| `design-tunnel.js` batches away a per-instance ramp | the ramp is there; the recorder latched colour at `begin()` |
| `faceted.js` has a copy-pasted envelope origin | both effects share `_DAT_004333c8` = 69.753 in the original |

Each would have damaged verified-correct code to chase a number. The rule that caught
all three is worth keeping: **when a measurement says the port is wrong, check the port
against the binary before believing the measurement.**

The remaining defect is real and is one unread value away: `vertex+0x4c`, the gate at
0x004076cf. Five approaches are documented above.

### The vertex array is reachable — found by content, not by pointer

The object lives only in `ECX` at the draw site, so it cannot be read from a global.
But a vertex's position sits at `+0x30` and its values come straight from the EXP, so
scanning for a known position locates the struct. `B2.LWO01`'s first vertex is
`[0.005361628, -0.664826393, -0.280026942]` = bytes `98b0af3b10322abfb15f8fbe`, which
also matches what apitrace observed the original submitting.

`SUNF_SCAN=98b0af3b10322abfb15f8fbe SUNF_SCAN_LO=4400000 SUNF_SCAN_HI=4c00000` finds
two distinct groups:

| group | spacing | `+0x10` | `+0x4c` | identification |
|---|---|---|---|---|
| 5 hits from 0x441e298 | ~0xd49c | `0x277` = **631** | float -0.77 | the loaded EXP data — 631 is `B2.LWO0n`'s vertex count |
| 6 hits from 0x4460bb4 | ~0x30000 | `0xff` = **255** | **0** | the RUNTIME vertex structs |

`+0x10 = 0xff` is the lighting byte written by `FUN_004070d0`'s unlit branch, which is
what identifies the second group as live vertices rather than source data. Six of them
matches `Original` plus the five `B2.LWO0n` copies.

**The first vertex of each has `+0x4c = 0`**, consistent with its triangles being
rejected, and consistent with the gate.

### What remains

Dump `+0x4c` across a whole array at stride 116 and correlate the non-zero entries
against which triangles survive. Both halves are now available: the array base comes
from the scan, and the survivor set comes from the draw stream. That turns the
criterion from a search into a comparison.

---

## The criterion, characterised: `vertex+0x4c` is a per-vertex FACING flag

Reached by reading the engine's own memory rather than by finding the writing code.
The scanner locates the live vertex arrays by content, walks them at the 116-byte
stride, and reports `+0x4c` for every vertex.

**It is a boolean.** The non-zero value is exactly `0x1` — never a pointer. The
alias-pointer reading at 0x0040a4a2 belongs to some other structure and does not
apply here.

**Density falls with scale**, across six live arrays of 631 vertices:

| array | flags set | measured triangle survival |
|---|--:|--:|
| `Original` | 317 (50%) | — |
| `B2.LWO01` | 312 (49%) | 72% |
| `B2.LWO02` | 309 (48%) | 70% |
| `B2.LWO03` | 294 (46%) | 68% |
| `B2.LWO04` | 286 (45%) | 66% |

~48% of vertices yielding ~68% of triangles is consistent with the gate, which
submits a triangle iff **any** of its three vertices is flagged.

**The rule is a facing test.** Correlating the bitmap against vertex normals and
searching for the direction that best separates set from clear:

| bitmap | accuracy | direction | threshold |
|---|--:|---|--:|
| `B2.LWO01` | **95.7%** | (0.519, 0.773, -0.366) | +0.020 |
| `B2.LWO02` | **95.6%** | (0.515, 0.792, -0.328) | +0.060 |

Two instances that share geometry byte-for-byte converge on the same direction. So:

```
  vertex[i].flag = dot(normal[i], D) > threshold      // computed once, at load
  triangle drawn = flag[v0] | flag[v1] | flag[v2]     // the gate at 0x004076cf
```

That reconciles every earlier observation: boolean, ~48% set, spatially clustered
(facing is continuous over a surface), fixed per instance across frames, and varying
slightly between instances whose only difference is scale.

**This is a characterisation at ~95%, NOT the formula — and that has now been tested
the obvious way.** The stub dumps the engine's OWN normals from `+0x3c/+0x40/+0x44`
alongside each flag, so the rule can be checked against the data the engine actually
used rather than against the port's recomputation:

| normals used | array | best facing split | direction |
|---|---|--:|---|
| port's `buildWonderVertexNormals` | LWO01 | 95.7% | (0.519, 0.773, -0.366) |
| **engine's own** | LWO01 | **95.56%** | (-0.5645, -0.7175, +0.4082) |
| **engine's own** | LWO02 | **94.45%** | (-0.5645, -0.7175, +0.4082) |

(The sign flip is the search's convention; the axis is the same.)

**It plateaus at ~95% either way**, and both arrays agree on ONE fixed direction. That
is decisive in an unwelcome direction: a pure `dot(n, D) > t` fed the engine's own
normals would score 100%, and it does not. So the rule is *approximately* a
fixed-direction facing test and something else supplies the residual ~5%.

One detail that may bear on it: **some normals are exactly zero length**, which no
facing test classifies meaningfully — degenerate vertices that the real rule must
handle some other way.

Implementing the 95% model would be an empirical fit of exactly the kind METHOD.md
warns about. It would look convincing and be wrong at the silhouette, which is
precisely where the difference shows.

**What it does buy** is a target for reading the code. The search is no longer "what
writes `+0x4c`" with no constraints; it is "find the load-time pass that computes a
dot product against a fixed direction and stores a boolean at `+0x4c`", and the
direction is known to within a few percent. `FUN_00406e20` — the normal-accumulation
pass, which already walks the vertex array at stride 116 — is the obvious place to
look next.

### Three model forms tested; the per-vertex facing model is the best and caps at 96%

| model | best accuracy |
|---|--:|
| per-vertex normal, `dot(n, D) > t`, 300-restart optimiser | **96.04%** |
| same, using the ENGINE's own normals from `+0x3c` | 95.56% |
| per-FACE facing, vertex flagged if ANY adjacent face faces D | **70.52%** |
| "normal is non-degenerate" alone | 50.55% |

The per-face form is decisively worse, so the flag is a property of the **vertex
normal**, not of adjacent faces. Zero-length normals (7 of 631) are all unflagged,
consistent with `dot = 0` failing `> 0`, and excluding them changes nothing (95.51%).

The 28 mismatches sit at the boundary — median |dot| 0.135 against 0.528 overall —
which initially looked like an imprecise direction estimate. It is not: a
300-restart optimiser over direction *and* threshold still caps at 96.04%. **The
plateau is real**, so a single fixed direction does not fully determine the flag and
some term remains unidentified.

### Where this stops, and why nothing was implemented

The criterion is characterised but not derived:

```
  vertex+0x4c  = boolean, value 0x1, written once at load
               ~ dot(vertexNormal, D) > t   with D ~ (-0.504, -0.802, +0.321)
               = 96% of observed bits; the residual 4% is unexplained
  triangle drawn = flag[v0] | flag[v1] | flag[v2]     (gate at 0x004076cf)
```

Static search for the writing code is exhausted — byte, dword, float, indexed,
LEA-computed and pre-advanced-pointer stores, all over the force-disassembled export.
`FUN_00406e20` (the normal pass) was checked and is not it.

A 96% model is not implementable here. It would be wrong at the silhouette, which is
exactly where the difference is visible, and it would be indistinguishable from
correct in the sweep score — the worst combination available. METHOD.md's rule
applies directly: an empirical fit is acceptable only as an explicitly marked
placeholder, and is most dangerous when it looks convincing.

### The fit as a marked placeholder — and what it proves it cannot do

METHOD.md permits an empirical fit "only as an explicitly marked placeholder".
`shared/sunflower/js/mesh-geometry.js` now carries one: `WONDER_FACING_FIT`,
`wonderFacingFlags()` and `wonderSurvivingFaces()`, **off by default, wired into no
render path, and documented as a fit rather than the recovered rule**.

Its purpose is to test the hypothesis, and it does — against the original's own
recorded draw stream rather than against a pixel score:

| mesh | faces | model keeps | verts | original measured | error |
|---|--:|--:|--:|--:|--:|
| `Original` | 3426 | 2155 | 6465 | 6525 | **-0.9%** |
| `B2.LWO01` | 1156 | 802 | 2406 | 2502 | -3.8% |
| `B2.LWO02` | 1156 | 802 | 2406 | 2439 | -1.4% |
| `B2.LWO03` | 1156 | 802 | 2406 | 2391 | +0.6% |
| `B2.LWO04` | 1156 | 802 | 2406 | 2328 | +3.4% |

Within 4% everywhere, which is a real result for a model derived only from memory
reads. **But note the middle column: the model gives all four LWO copies the SAME
count**, because it is an object-space test and those four share byte-identical
geometry. The original's counts *decrease monotonically with scale* — 2502, 2439,
2391, 2328.

**So the missing 4% is not noise; it is the per-instance scale dependence**, which an
object-space facing test cannot express by construction. The real rule involves the
instance transform — most plausibly a threshold that scales, since a uniform scale
cannot rotate a normal.

That is a sharper statement of the remaining unknown than "96% accurate": the facing
term is essentially right, and what is missing is specifically **how scale enters**.

## The facing fit, scored (2026-08-20)

The `vertex+0x4c` rejection was characterised but not derived, so it was wired in as
an **experimental, default-off flag** (`?cull=facing`) rather than implemented as
authentic. The point was to make the hypothesis testable: if the model is right the
sweep moves, if it is wrong it does not. Both runs are against `run-baseline.json`
(medianR 0.6481).

**Run 1 — fit applied to every mesh in every scene** (`run-cullfit.json`):

    medianR 0.6481 -> 0.5998     5 parts improved, 14 degraded

**Run 2 — fit applied only to `woah3.exp`, where it was measured**
(`run-cullwoah3.json`):

    medianR 0.6481 -> 0.6608     2 parts improved, 0 degraded, 20 bit-unchanged

| part | baseline | woah3-only | delta |
|---|--:|--:|--:|
| effect_410300 | 0.328 | 0.588 | **+0.260** |
| effect_40dab0 | 0.359 | 0.566 | **+0.207** |

Major parts (r < 0.55): **6 -> 4**. The two worst parts in the production both clear
the bar. Remaining: effect_4106a0, effect_40de00, effect_40c990, effect_40b040.

### What this establishes

1. **The rejection is real and geometric.** A change that only removes triangles —
   touching no colour, blend or envelope — lifts these two parts by 0.21-0.26. That
   is not something a shading defect can do, and it closes out the alternative
   readings of issue #31 as well: `effect_40dab0` carries no mesh of its own, so its
   entire gain comes from the layered `woah3.exp` underneath it. One defect, two
   parts, consistent with `only=effect_40dab0` -> luma 0.0 measured earlier.
2. **The fit is local, not the engine rule.** Applying it globally cost 14 parts and
   0.048 of median. A fixed world-space direction `D` and threshold `t` cannot be an
   engine-wide constant; whatever the executable computes must derive `D` per scene
   or per object. This is the strongest available hint about where to look next, and
   it came out of the failure, not the success.
3. **It still is not the rule.** 96% agreement on one mesh, and the known residual is
   per-instance scale dependence the object-space model cannot express: the model
   gives all four `B2.LWO0*` copies 2406 vertices where the original's decrease
   monotonically (2502 / 2439 / 2391 / 2328). Measured at order 11 against the
   recorded original.

### Status

`?cull=facing` is **off in every default path**, is scoped to `woah3.exp` in
`main.js`, and is marked EXPERIMENTAL at its definition. Per METHOD.md it must not be
enabled in a build claiming authenticity until the code that writes `+0x4c` is read,
or until the user explicitly decides to accept a marked empirical fit. Phase 1 of the
plan stays gated on that decision.

### Issue #31 is the same defect, and "the missing fade" was wrong

The plan's Phase 1 read the 100.2-102.8 s window as **a fade the port does not
perform**: the reference drops to near-black while the port sits at ~115 luma. That
hypothesis is now disproved. Enabling the geometry cull — which touches no opacity,
no envelope and no blend state — collapses the port's luma on its own:

| part | baseline r | cull r | ours (base) | ours (cull) | reference |
|---|--:|--:|--:|--:|--:|
| effect_40dab0 | -0.153 | +0.392 | 113.4 | 27.6 | 51.0 |
| effect_40dab0 | -0.245 | +0.259 | 88.6 | 4.5 | 6.6 |
| effect_410300 | -0.493 | +0.283 | 113.1 | 9.0 | 22.5 |
| effect_410300 | -0.462 | +0.269 | 115.9 | 6.0 | 25.7 |
| effect_40c990 | -0.030 | -0.030 | 168.4 | 168.4 | 201.3 |

**4 of the 5 anti-correlating samples stop anti-correlating.** The mechanism is
additive: those draws are `c0,0,0,0.059` through `c0,0,0,0.017` — near-transparent
passes where brightness is the sum over submitted triangles. Drawing 3468 vertices
where the original draws ~2400 does not make the image slightly wrong, it makes it
44% brighter, and no fade is missing anywhere. The port was already fading; it was
fading too much geometry.

The cull now slightly **overshoots** (27.6 vs 51.0, 6.0 vs 25.7) — consistent with a
model that gets the population roughly right but the per-instance split wrong, which
is exactly the known residual. Correlation still improves by 0.5-0.75 per sample
because the structure is right even where the level is not.

The fifth sample, `effect_40c990`, is untouched (-0.030 either way) and belongs to a
different defect. It remains one of the four major parts.

**Consequence for the plan:** Phase 1 as written should not be attempted. There is no
missing fade to find in `show-data.js` or `woah3.js`, and time spent there would have
been spent instrumenting a correct code path. Issue #31 should be re-filed against
the `+0x4c` rejection, or closed into it.

## Phase 5 — re-measure and file (2026-08-20)

**Re-measure: done.** Four tagged sweeps now exist under
`productions/wonder/work/verify/inspect/`, all comparable:

| tag | what it is | medianR | medianRMSE |
|---|---|--:|--:|
| `baseline` | pinned starting point | 0.6481 | 49.69 |
| `cullfit` | fit applied to every scene | 0.5998 | 52.67 |
| `cullwoah3` | fit scoped to `woah3.exp` | 0.6608 | 46.16 |
| `defaultcheck` | default path after the refactor | 0.6481 | 49.69 |

`defaultcheck` is bit-identical to `baseline` across all 191 samples
(max `|dr|` = 0.00e+0), which is the regression gate on the emit-loop rewrite:
with the flag off, `buildMeshGeometry` produces the same geometry it always did.

**File: blocked, and the plan's method for it does not exist.** Phase 5 specified
updating #31 and #32 "in place via their `sweep-key`". Neither issue has one — both
were opened by hand, and `issues.mjs` matches only on that key precisely so it can
never touch a human's issue. So the tool cannot update them, and running `--apply`
would instead CREATE 27 auto-issues, six of which restate #32 and two of which
restate #31. That was not run.

What the sweep would file against the default build, for the record:

    6 x structure  (effect_40b040, 40c990, 40dab0, 40de00, 410300, 4106a0)
    ...            plus 21 lower-severity structure/unstable findings

Note these are findings against the **default** build, which is the correct target:
`?cull=facing` is off in everything that ships, so #31 and #32 both describe defects
that are still present. **Neither should be closed.** #31's diagnosis is now known to
be wrong (see above) while its symptom is still real — it wants a rewritten body, not
a close, and that is a human edit to a human issue.

### Correction: the "duplicate" part pairs are not duplicates

The plan records three part pairs reporting byte-identical statistics
(`effect_40fa30`/`effect_40fc00`, `effect_40cea0`/`effect_40fe10`,
`effect_40ec40`/`effect_40f2f0`) as "layered clips with identical `start`/`dur`
filed twice. A tooling artefact." That is wrong. They are **different effects with
different assets** that happen to share a window:

| window | parts | assets |
|---|---|---|
| 44.4-60 s | effect_40ec40 | `shite1.exp`, `design_bw2.exp`, `MAX_T5.JPG`, `Water2.jpg`, `MAX_t3.jpg` |
| | effect_40f2f0 | `scene.exp`, `vsz_d2.jpg` |
| 58.9-69.75 s | effect_40cea0 | `boxical4.exp` |
| | effect_40fe10 | `stars.exp`, `speedy.exp`, `backg.jpg` |
| 104-138.5 s | effect_40fa30 | `credits.exp`, `design_bw.exp` |
| | effect_40fc00 | `clock.exp` |

Their statistics are identical because the sweep scores the **composited frame**, and
in a shared window both clips contribute to the same frame. So one number is being
attributed to two parts — which does double-count those samples, but the parts
themselves are real and neither may be dropped.

The practical consequence is the one that governs this whole production: a part that
scores badly does not identify the effect at fault. `effect_40dab0` scoring 0.359
turned out to be `woah3.exp` beneath it, carrying the entire error; layer isolation
(`only=<part>`) is what separates them, not the parts table.

**The sweep is deliberately left as it is.** Collapsing these pairs would change the
parts table and the median, and break comparability with the four tagged runs above
while an investigation is live. Instrument changes belong between investigations.

## Decision taken (2026-08-20): the fit ships as a marked placeholder

Two decisions were referred to the user and both were made.

**1. The fit is enabled by default, for `woah3.exp` only, as an explicitly marked
placeholder** — the one form METHOD.md admits an empirical fit in. The marking is in
three places so it cannot be lost: the definition in `mesh-geometry.js`, the
enabling site in `main.js`, and a machine-readable `placeholders` entry in
`prod.json` (`wonder/facing-cull`) carrying what it models, what is not derived, and
what is known wrong. `?cull=off` restores the previous behaviour exactly.

    default build   medianR 0.6608   medianRMSE 46.16    major parts: 4
    ?cull=off       medianR 0.6481   medianRMSE 49.69    major parts: 6
                    (all 191 samples bit-identical to run-baseline.json)

**2. Filed as comments on #31 and #32; nothing closed, no auto-issues created.**
Both issues describe defects that are still real. #31's *diagnosis* was wrong and now
says so; #32's *population* shrank from six parts to four and now says so, including
that `effect_4106a0` is level-matched and `effect_40de00` is brighter, so the four
are not one phenomenon.

### Gates, after all edits

    test:shared            62 pass / 1 fail   (pre-existing Energia failure, unchanged)
    build-wonder.sh        exit 0
    repeatability.mjs      exit 0
    ?cull=off vs baseline  0/191 samples differ

`status.web` stays `engineering`. A placeholder in the render path is a reason to
keep it there, not a step toward publishing.

### What the next investigation should do first

Find where `D` comes from. The global run is the lead: a fixed world-space direction
cannot be an engine constant, so the executable derives it per scene or per object —
from a light, a camera, or the object's own pivot/rotation. That is a much smaller
search than "somewhere at load time", and it is the thing that would turn this
placeholder into a port.

Remaining major parts: `effect_40c990` (0.265), `effect_40b040` (0.427),
`effect_40de00` (0.487), `effect_4106a0` (0.508). `effect_40b040` is the clean
shading isolate — geometry vertex-exact, unmoved by the geometry fix.

## The plan's target is met (2026-08-20)

    baseline   medianR 0.6481   6 parts below 0.55
    final      medianR 0.7741   0 parts below 0.55

Two findings did it, and neither was in the plan.

### 1. The capture alignment was measured with the wrong samples

`prod.json` adopted `alignmentOffsetMs` 0 on 2026-08-15, from "six well-matching
samples spread across the demo". That measurement selected against itself. A
well-matching sample is one whose phase scan is **flat** — its score barely moves as
the reference is shifted — so the six samples chosen as most trustworthy were the six
least able to see an offset. The samples that CAN measure alignment are the ones that
score badly, because they sit where the picture changes fastest.

Re-measured on samples with sharp scans, spread from capture 1.2 s to 183.8 s:

    all EIGHTEEN peak at a POSITIVE offset; median +0.08s; none negative

Under a true zero with symmetric noise that is 2^-18, about one in 260,000. Three
further things say it is a real constant rather than a score-grab:

* the sweep median is **single-peaked** in the offset — 0.727 at 50 ms, 0.762 at
  75 ms, 0.767 at 80–85 ms, 0.732 at 100 ms. An optimum, not a slope.
* 80 ms and 85 ms score identically, because `ffmpeg -ss` snaps to a frame and both
  land on frame 5. The quantity is an integer number of capture frames — which is
  what a capture START offset physically is. **+83.3 ms = 5 frames at 60 fps.**
* it is constant across 180 seconds. A clock-RATE error would grow with time.

Adopted in `captureOffsetMs` (`main.js`), the slot that already existed for exactly
this and was documented as "comparison-only". Nothing but `__demo.schedule()`'s
`captureStart` reads it, so **playback cannot be affected** — this changes which
reference frame each sample is compared against, not what the port draws.
`?capoff=<ms>` overrides it; `?capoff=0` restores the old alignment.

The phase is still somewhat variable, as the superseded note said: three parts
(`effect_40cea0`, `effect_40fe10`, `effect_40ccc0`) prefer a smaller offset and lose
about 0.09. This is the best single constant, not an exact description.

### 2. The faceted effect's two clocks were split by 30 SECONDS, not 30 frames

`effect_40c990` was the worst part in the production and no offset rescued it — its
scans peaked near zero at r 0.21–0.52, the signature of a wrong picture. Read from
the binary rather than fitted:

| what | address | binary | port | agrees |
|---|---|--:|--:|:-:|
| U scroll rate | 0x004334d8 | 1.5 | 1.5 | yes |
| second U addend | 0x004334c0 | 8.0 | 8 | yes |
| pulse gain | 0x004334e0 | 0.8 | 0.8 | yes |
| alpha base | 0x00433238 | 1.0 | 1 | yes |
| fade rate | 0x004334c8 | 0.6 | 0.6 | yes |
| envelope origin | 0x004333c8 | 69.753 | 69.753 | yes |
| frame rate | 0x00433444 | 10.0 | 10 | yes |
| second fade start | 0x004334d0 | 15.137999534606934 | same | yes |
| **second frame addend** | **0x004334b8** | **30.0, added to time×10** | **30, added to time** | **NO** |

`0x0040cbcb` multiplies the time by 10.0 into the first renderer's frame;
`0x0040cc68` loads **that** and adds the float 30.0. The port added 30 to the *time*,
so the second layer trailed the first by `9 × time` frames — at local 9.528 s it was
at frame 39.5 where the executable is at 125.3. Every other constant in the effect
was already exact, which is why this survived: the layer was drawn, with the right
opacity, the right blend and the right scroll, at the wrong point in its animation.

    effect_40c990   0.265 (baseline) -> 0.501 (aligned) -> 0.842 (fixed)

The existing test asserted `secondFrame === 30` at t = 0 — where `0*10+30` and `0+30`
are both 30, so it could not fail. A case at t = 9.528 now pins both clocks and their
constant 30-frame separation.

### Final parts table

Every part is above the bar; 19 of 22 improved, 3 lost ~0.09 to the variable phase.

| part | baseline | final | delta |
|---|--:|--:|--:|
| effect_40c990 | 0.265 | 0.842 | +0.577 |
| effect_40b040 | 0.427 | 0.891 | +0.464 |
| effect_40de00 | 0.430 | 0.764 | +0.335 |
| effect_410300 | 0.328 | 0.603 | +0.275 |
| effect_40dab0 | 0.359 | 0.607 | +0.248 |
| effect_4106a0 | 0.476 | 0.684 | +0.207 |
| effect_40fa30 / effect_40fc00 | 0.675 | 0.798 | +0.122 |
| effect_40d790 | 0.661 | 0.767 | +0.106 |
| effect_40bfa0 | 0.584 | 0.669 | +0.085 |
| effect_40ec40 / effect_40f2f0 | 0.748 | 0.793 | +0.045 |
| effect_410100 | 0.736 | 0.775 | +0.039 |
| effect_408ca0 | 0.858 | 0.882 | +0.024 |
| effect_4138a0 | 0.863 | 0.883 | +0.020 |
| effect_40ea30 | 0.753 | 0.762 | +0.010 |
| effect_40c760 | 0.930 | 0.939 | +0.009 |
| effect_40f8e0 | 0.914 | 0.922 | +0.007 |
| effect_40d060 | 0.906 | 0.902 | -0.005 |
| effect_40ccc0 | 0.743 | 0.655 | -0.088 |
| effect_40cea0 / effect_40fe10 | 0.688 | 0.597 | -0.090 |

### Gates

    test:shared            62 pass / 1 fail  (Energia #34, verified pre-existing by
                                              re-running with these changes stashed)
    build-wonder.sh        exit 0
    repeatability.mjs      exit 0
    ?capoff=0              medianR 0.6608, reproducing the pre-alignment run

### Note: the Win32 oracle is currently down

`sunf-probe.sh` now fails at every order (11 and 18 both) with `Unhandled illegal
instruction at 7BC5C165` inside Wine, after the stub attaches and patches QPC
successfully. Adding `MESA_GL_VERSION_OVERRIDE=2.1` did not help. The executable also
has to be reassembled first: `work/unpacked/won_der` holds only the 78 files inside
`WON.DER`, while `wONDEr.exe` and the original `FSOUND.DLL` live in `work/src`, so the
mounted demo directory must combine both. Neither finding above needed the oracle —
one came from phase scans, one from the disassembly — but the geometry/shading split
for any future part does.

### Is the placeholder still load-bearing after the alignment fix? Yes.

Worth asking, because if correcting the alignment had absorbed the geometry error
then the marked fit could simply be deleted, which is strictly better than shipping
it. It does not:

    with the placeholder      medianR 0.7741    0 parts below 0.55
    ?cull=off                 medianR 0.7694    2 parts below 0.55

| part | with | without | delta |
|---|--:|--:|--:|
| effect_40dab0 | 0.607 | 0.359 | -0.248 |
| effect_410300 | 0.603 | 0.408 | -0.196 |

So `wonder/facing-cull` stays, and the "no part below 0.55" result depends on it. That
is a reason to keep deriving the real criterion, not a reason to be comfortable: the
production currently meets its bar partly on the strength of a fit, and `prod.json`
records exactly that under `placeholders`.

## Implementing the derived rule, and why it is not in yet (2026-08-20)

The writer of `vertex+0x4c` was found and I verified both halves against
`disasm.asm` directly rather than trusting the report:

```asm
0040732d  LEA   ECX,[EDX + 0x34]          ; ECX = vertex + 0x34
00407332  FLD   [ECX+0x4]  FSUB [ESP+0x20]  FMUL [ECX+0x10]   ; (P.z-C.z)*N.z
0040733c  FLD   [ECX-0x4]  FSUB [ESP+0x18]  FMUL [ECX+0x8]    ; (P.x-C.x)*N.x
00407348  FLD   [ECX]      FSUB [ESP+0x1c]  FMUL [ECX+0xc]    ; (P.y-C.y)*N.y
00407353  FCOMP [0x0043325c]              ; vs float32 0.0
0040735b  TEST  AH,0x1                    ; C0 = "less than"
00407360  MOV   byte [ECX+0x18],0x0       ; +0x34+0x18 = +0x4c
00407366  MOV   byte [ECX+0x18],DL        ; DL = 1
00407370  ADD   ECX,0x74                  ; next vertex
```

and the consumer at `0x004076c5` is exactly `material[+0x94] != 0 || (v0|v1|v2)[+0x4c]`.

**Three things are now settled.**

1. **`vertex+0x4c` = `dot(P - Clocal, N) < 0`, computed per frame.** Not written once
   at load, as this document previously claimed. The earlier claim that
   `FUN_004070d0` never writes `+0x4c` was wrong: the store is `[ECX+0x18]` against a
   pointer pre-biased by `LEA ECX,[EDX+0x34]`, so every literal `+0x4c` search came
   back clean on code sitting in plain sight.
2. **`[ESP+0x18/0x1c/0x20]` really is `inverse(objectMatrix) * cameraWorld`.** Read
   from `0x004072b6-0x00407323`: `[EBP+0x34]` (the mesh object's own matrix — the
   same `EBP` whose `+0x80` is the vertex array and `+0xd4` the vertex count) is
   copied to `[ESP+0x24]`, inverted in place by `CALL 0x004024a0`, then multiplied by
   the three floats at `[[ESP+0xbc]]`, in the same row-major form as the port's
   `transformPoint`.
3. **Independent confirmation that this is the right quantity.** The best fixed
   direction fitted to the ENGINE'S OWN dumped normals is `(-0.5645, -0.7175,
   +0.4082)`. Computing `normalize(inverse(objectMatrix) * cameraWorld)` from the
   port's own scene data reproduces it at **dot = 0.9938** — provided the camera and
   the object are sampled on their SEPARATE clocks, which Wonder does and which an
   earlier probe of mine got wrong by using one frame for both.

**And yet implementing it faithfully scores worse than the fit it was meant to
replace.** Measured, all against the same alignment:

| build | medianR | effect_410300 | effect_40dab0 |
|---|--:|--:|--:|
| no cull at all | 0.6481 | 0.408 | 0.359 |
| **marked placeholder (fit)** | **0.7741** | **0.603** | **0.607** |
| derived rule, FUN_00406e20 normals | 0.6468 | — | — |
| derived rule, normals negated | 0.7665 | 0.363 | 0.376 |

The unnegated form culls about 20% of triangles and moves the score to the *unculled*
baseline, meaning it removes triangles that were already invisible. The negated form
reproduces the original's per-instance count trend — 2463/2460/2340/2241 falling
against the original's 2502/2439/2391/2328, where the fit gives 2406 four times — and
still renders a worse picture than the fit.

**So the count trend was a red herring, and I nearly shipped on it.** Those original
counts were recorded with a FROZEN clock, so comparing them against a port rendering
at its own moving time is not a valid comparison of the same instant; matching their
trend proves less than it appears to. The fit, by contrast, was validated at ~96%
against the flags actually read out of the running executable, per vertex. Any correct
implementation has to beat that, not merely look plausible.

**Status: the placeholder stays**, and `prod.json` keeps its `placeholders` entry. The
rule is derived, but my implementation of it does not reproduce the measured flags, so
one of its inputs is still wrong — candidates, in order: which normals the facing loop
reads at `+0x3c` at the moment it runs (`FUN_004070d0` negates eight matrix elements
at `0x00407225-0x004072a7` before the loop, so in-place re-signing is plausible),
whether `P` at `+0x30` is still the raw load-time position by then, and whether the
port's `sampledMesh.matrix` is the same matrix as `[EBP+0x34]` at that instant.

**What settles it is the peek, not the sweep.** The stub can already dump `+0x4c`
alongside `+0x3c` per vertex; the derived rule should then be checked per vertex
against those bits, not per part against pixels. That needs the winebox, which is
currently down.

## The oracle was never broken, and the facing rule is now PROVEN (2026-08-20)

### The winebox failure was my own demo directory

`sunf-probe.sh` had been failing at every order with `Unhandled illegal instruction at
7BC5C165`, read as a Wine/emulation fault. It was not. Splitting the possibilities
with one cheap test — `wine notepad` in the same image — showed Wine itself running
perfectly. The demo then ran too, with and without the stub. What actually happened:

**`wONDEr.exe` opens `WON.DER` at runtime.** The directory I had assembled held the
78 files unpacked OUT of `WON.DER`, and not the archive itself, so the demo put up a
`File systema error` dialog; dismissing it killed the process, which looked exactly
like a crash. The correct mount is the original distribution — `work/src`, holding
`wONDEr.exe`, `FSOUND.DLL` and `WON.DER` together. With that, order 11 records
**848,923 GL calls across 55 frames.**

`sunf-probe.sh` now **exits non-zero** when a run records no GL calls, and says what
to check. It previously printed `calls=0 frames=0` and exited 0, so a broken mount
was indistinguishable from a demo that legitimately drew nothing — METHOD.md's "a
check that cannot exit non-zero is a report", in the tool built to check things.

### `vertex+0x4c` is exactly `dot(P - C, N) < 0`

With the oracle back, the stub dumped `+0x3c` normals and `+0x4c` flags per vertex for
all six live arrays. **Solving for the single point `C` that satisfies the inequality
reproduces 100.00% of the flags** on three separate `B2.LWO0n` instances:

| array | vertices | flagged | best single-point accuracy | solved C |
|---|--:|--:|--:|---|
| 1 | 624 | 299 | **100.00%** | [-1.839, +1.375, -1.841] |
| 2 | 624 | 281 | **100.00%** | [-1.521, +0.990, -1.508] |
| 3 | 624 | 270 | **100.00%** | [-1.259, +0.671, -1.331] |

The fixed-direction model plateaued at 96.04% and no optimiser could beat it. **That
plateau was the far-field approximation of a point, and the unexplained residual 4%
was parallax.** The solved points shrink monotonically across instances that differ
only in scale — exactly what `inverse(objectMatrix)` does — which is the per-instance
dependence no object-space model could express.

### The port's normals are the engine's, negated

Measured against the dumped `+0x3c` values: `dot(Nengine, Nport) = -1.0000` for
**100%** of vertices in all three arrays. So `buildWonderVertexNormals` returns
exactly `-Nengine`, and with port normals the comparison is `> 0`.

This is why two earlier attempts both failed. There are **two** independent sign
errors — the normals, and a Z-convention difference in `Clocal` — and fixing either
one alone scores worse than fixing neither. That is a trap worth naming: a two-sign
bug punishes partial correctness, so single-variable experiments read as refutations
of a correct hypothesis.

### What is still not landed

Rendering with the proven rule scores **0.7739** against the fit's **0.7741**, and on
the two woah3 parts it is clearly worse (0.340 / 0.488 against 0.603 / 0.607). Two
things remain:

1. **The `Clocal` convention at render time.** Matching the solved points suggests
   negating Z; matching the dumped flags per vertex suggests negating Y and Z, and
   reaches 98.40% — above the fit's 96.04% but short of the 100% the solved point
   achieves. Convention and frame are confounded in that search, and both estimates
   put the object frame at the edge of the scanned range. Resolve by dumping `+0x30`
   positions alongside the flags and comparing per vertex at a known instant, rather
   than searching frames.
2. **`material[+0x94]`.** The consumer skips rejection entirely when it is non-zero.
   No port field is known to correspond to that runtime offset, and applying rejection
   to every scene costs parts that evidently bypass it — `effect_40c760` 0.939 ->
   0.565, `effect_40f8e0` 0.922 -> 0.812, `effect_40d060` 0.902 -> 0.809. Until it is
   identified, rejection stays scoped to `woah3.exp`.

**Shipping state:** the fit remains the default (`?cull=fitted`, medianR 0.7741),
because it still renders woah3 better than the unfinished integration of the correct
rule. `?cull=proven` selects the derived path (0.7739), `?cull=off` disables rejection
(0.7694). The fit is now marked SUPERSEDED rather than merely EXPERIMENTAL: the
criterion is known, and what remains is a convention and one unread material field.

## Sample times now land on capture frames (2026-08-20)

`defaultPlan` chose sample times on an arbitrary continuous grid, and `refFrame`
fetched the reference with `ffmpeg -ss t`, which returns whichever FRAME contains
`t`. So the port rendered a continuous instant and was scored against a frame taken
up to a whole frame period away — invisible on slow content, brutal on fast content.

Measured directly against the capture rather than assumed:

    -ss 59.984 .. -ss 60.000  -> the same frame (the one at 59.983)
    -ss 60.004 .. -ss 60.016  -> the next frame

so a frame's span is **inclusive at its top edge**. Snapping to exactly `k/fps`
therefore lands on a boundary and fetches the PREVIOUS frame — the first version of
this change did exactly that and scored slightly worse for that reason alone.
Snapping MID-frame, `(k + 0.5)/fps`, names the frame unambiguously.

    unsnapped        medianR 0.7741
    snapped to k/60  medianR 0.7674     <- lands on the boundary, fetches k-1
    snapped mid      medianR 0.7807

The alignment constant re-measured on the new grid is still single-peaked at the same
place (0.7733 at 75ms, **0.7807 at 83.3ms**, 0.7598 at 92ms), so the two corrections
are independent rather than trading off.

**This is an instrument fix, not a port fix**, and it changes the sample grid — so
`plan.mjs`'s own warning applies to it: a grid change moves which defects are visible.
The tagged runs before it are not directly comparable sample-for-sample.

## The onset defect is real, and it is NOT frame quantisation

Binned by local time, the first two seconds of every clip still score far worse after
snapping:

| local | before snap | after snap |
|---|--:|--:|
| **0-2 s** | **0.603** | **0.611** |
| 2-5 s | 0.751 | 0.773 |
| 5-10 s | 0.793 | 0.783 |
| 10-40 s | 0.826 | 0.822 |

so the quantisation error was not what made onsets bad. Phase scans on the ten parts
whose first sample is their worst split three ways:

| part | aligned r | best r | at | reading |
|---|--:|--:|--:|---|
| effect_40b040 | 0.571 | **0.979** | +0.03s | timing, ~2 frames |
| effect_4106a0 | 0.467 | **0.952** | -0.03s | timing, ~2 frames |
| effect_40de00 | 0.560 | 0.815 | -0.03s | timing, ~2 frames |
| effect_40cea0 | 0.369 | 0.707 | -0.13s | timing, larger |
| effect_40ccc0 | 0.437 | 0.604 | -0.10s | timing, larger |
| effect_40bfa0 | 0.417 | 0.520 | -0.37s | weak |
| effect_40ec40 | 0.291 | 0.291 | +0.00s | **wrong picture** |
| effect_408ca0 | 0.460 | 0.460 | +0.00s | **wrong picture** |

The ~2-frame group is not a constant per-clip offset: scanning `effect_40b040` along
its whole span gives +0.03, +0.03, +0.00, +0.03, +0.00, and the two zeros are sharp
peaks rather than flat scans, so they genuinely prefer zero. A single clip-start
correction cannot satisfy both, and per-sample corrections would be fitting the
instrument to the port. The remaining candidate is that the ORIGINAL advances some
state on a 30Hz tick — `FSOUND_SetUpdateRate(30)` is in the stub's own log — while the
port advances continuously, which would put the port up to one tick out at some
instants and exactly right at others. The port quantises nothing today; a search for
`Math.floor`/`Math.round` on time across the effects and `scene.js` finds none.

**Not yet investigated:** whether the original's visual clock is stepped. That is now
answerable, because the oracle works.

## The 45.7s cluster: one defect, three parts, and a method caution

`effect_40c760`, `effect_40ec40` and `effect_40f2f0` all score ~0.27-0.29 at capture
45.73-45.81 and recover to 0.774 at 47.91, as soon as `effect_40c760` ends. Layer
isolation at 45.73 (`?only=`):

| layers | r | luma (ref 43.9) |
|---|--:|--:|
| all three | 0.291 | 33.0 |
| effect_40c760 | 0.022 | 39.1 |
| effect_40ec40 | -0.109 | 13.1 |
| **effect_40f2f0** | **0.499** | 6.9 |
| effect_40c760 + effect_40f2f0 | 0.334 | 30.1 |

`effect_40f2f0` alone correlates best while contributing almost no light, and adding
the other two makes it worse — so the composite is wrong, not any single layer's
brightness. A wide phase scan (+-2.5s) finds no offset that helps, confirming the
picture rather than the timing.

**A caution on the oracle comparison attempted here.** A probe was run at order 6 with
`SUNF_QPC` set to place the instant at 45.73, and it appeared to show the original
drawing ~136 vertices where the port draws ~4200. That number is NOT reliable: the run
produced 23 distinct frames rather than a held instant, because `SUNF_QPC_HOLD` — the
two-phase hold that actually addresses a show time — was not set. Addressing an
instant needs the hold, not just a frozen counter. Re-run with it before trusting any
per-instant comparison.

## Per-mesh comparison, because r cannot attribute in a layered show

Jasper's point, and it is the right one: `r` is measured on the COMPOSITED frame, so
in a production whose effects overlap it cannot attribute anything. At capture 45.73
three clips are live and all three score 0.29 — three names for one picture. Fixing
one while another is still wrong produces no visible gain, so a correct change and a
useless change look identical.

Layer isolation does not rescue it either: rendering one clip alone leaves nothing to
compare against, since the reference is composited. Isolating `effect_40f2f0` gives
mean luma 6.9 against a reference of 43.9.

`tools/winebox/compare-draws.mjs` sidesteps both. Each mesh submits its own vertices,
the original's submission is recorded per frame by the (now working) oracle, and the
comparison is per mesh whatever else is on screen. Groups are matched by SIZE, not by
texture name — GL names are assigned in upload order and do not correspond between the
two, but a mesh that submits 2592 vertices submits 2592 in both.

**This should be the primary signal for per-effect work, with `r` demoted to a
whole-frame acceptance test.**

First results, at two held instants:

| capture | groups matching exactly | the exception |
|---|---|---|
| 45.73 | 4 of 5 (2592, 288, 192, 72) | 576 original vs **1080** port |
| 41.30 | **19 of 20** | 3177 original vs **4827** port (+51.9%) |

Both exceptions are single meshes over-drawing by roughly the facing-rejection
fraction, on scenes the cull does not currently touch. Enabling the proven per-frame
rule takes 45.73's 1080 to 636 (original 576) and 41.30's 4827 to **3207 (original
3177, +0.9%)** — while leaving every already-exact group untouched. That is strong,
layering-independent evidence that the rejection applies well beyond `woah3.exp`.

## `material[+0x94]` is the record's `+0x84`, and one effect overrides it

The gate at `0x004076cd` skips rejection when `material[+0x94] != 0`. That byte is not
a mystery runtime value:

```asm
004015c0  MOV CL, byte ptr [EBX + 0x84]     ; the material RECORD's byte
004015c6  MOV byte ptr [EAX + 0x94], CL     ; the runtime material's +0x94
```

so it is loaded straight from record byte `+0x84` — **the same byte `exp.js:278`
already reads as `doubleSided`**. The port's exemption is therefore the gate's own
field rather than a proxy for it, and the code now says so.

Separately, `FUN_0040bfa0` — the end effect, `effect_40bfa0` — walks its object's
material array at `0x0040c258-0x0040c28e` and writes `+0x94 = 1` to every one, next to
scaling `+0x9c`. So **an effect can turn rejection off at runtime for its own scene**,
exactly as `FacetedEffect` already overrides `+0x9c` in the port. The port models no
such override today.

### The remaining contradiction, stated so it is not lost

Removing the `doubleSided` exemption is what fixed 41.30's mesh (4827 -> 3207), which
implies that mesh's material has `+0x84 != 0` and so should have BYPASSED rejection —
yet the original rejects it. And `bubblebath.exp`'s material 1 and `woah3.exp`'s
`B2.LWO01` material are **byte-identical across all 174 bytes**, so they cannot differ
in `+0x84` at all, while one clearly needs rejection and the other clearly does not.

Both facts cannot hold at once, so one of these is wrong:

* the port's `bytes[0x84]` is not the byte the executable reads at `[EBX+0x84]` — the
  record layout the port parses may be offset from the struct the loader copies from;
* or the meshes were misidentified from their vertex counts alone (the 351-vertex
  group was matched to `bubblebath.exp Line01` by face count, and bubblebath may not
  even be live at capture 41.30);
* or a runtime override like `FUN_0040bfa0`'s is in play for one of them.

Resolve by dumping the runtime material struct at the draw call — `SUNF_PEEK_PTR`
already dereferences the current material pointer — and reading `+0x94` directly for a
mesh known to be rejected and one known not to be. That is one probe, and it settles
which of the three it is.

## The facing rule is now DERIVED, verified per mesh, and shipping (2026-08-20)

### The convention, settled against the oracle

Two earlier attempts adopted a Z (then a YZ) flip on `Clocal` because they searched
over GUESSED frame numbers. Computing the frames from woah3's own clocks —
`cameraFrame = local * 10`, `objectFrame = local * 15` from `0x00433444` / `0x00433448`
— removes that freedom, and then **no sign correction is needed at all**. At capture
102.88 the executable submits:

| mesh | original | port |
|---|--:|--:|
| Original | 6408 | **6408** |
| B2.LWO01 | 2499 | **2499** |
| B2.LWO02 | 2472 | **2472** |
| B2.LWO03 | 2439 | **2439** |
| B2.LWO04 | 2388 | **2388** |
| QuadPatch01-03 | 1944 | **1944** |

**0.00% error on all eight meshes**, with

```
Clocal = inverse(objectMatrix) * cameraWorld        (no flip)
flag   = dot(P - Clocal, Nport) > 0                 (port normals; engine's are negated)
draw   = material[+0x94] != 0 || (v0|v1|v2) flagged
```

The fit cannot express this: it gives all four `B2.LWO0n` the same 2406, and culls
`QuadPatch` to 825 where the executable rejects none of it.

### The runtime bypass, and the one effect that uses it

`material[+0x94]` is loaded from the record's `+0x84` at `0x004015c0`, which is the
byte `exp.js` already reads as `doubleSided` — so the port had the field all along.
But `FUN_0040bfa0` (the end effect) walks its material array at
`0x0040c258-0x0040c28e` and writes `+0x94 = 1` to every one, beside the `+0x9c`
scaling the port already models. `bypassFacing` now carries that, and
`effect_40bfa0` recovers the 0.015 it lost to being culled.

### Shipping: derived everywhere except woah3

    default ('mixed')   medianR 0.7807   medianRMSE 39.01
    fitted everywhere   medianR 0.7807   medianRMSE 40.22

Same median, better RMSE, and five parts up (`effect_40cea0`/`effect_40fe10` +0.022,
`effect_40ccc0` +0.017, `effect_40fa30`/`effect_40fc00` +0.015) with none down.

**woah3 keeps the fit**, and that is a measurement rather than a preference. With the
derived rule its geometry is right and its picture is worse, because the fit was
masking a separate defect by deleting geometry. At capture 102.88 the executable
emits black-quad alphas `0.118770 / 0.084836 / 0.059385 / 0.033934` and the port emits
`0.319 / 0.228 / 0.159 / 0.091` — a consistent **2.68x** across all four. These are
black quads under SRC_ALPHA/ONE_MINUS_SRC_ALPHA, so they DARKEN: too little alpha is
too bright, which is why the port renders luma 125 against a reference of 25.
`napierdalanie.env` is a spike train falling at 5 per second here, so a ~57ms error in
envelope time produces exactly this. Shipping the derived rule on woah3 today would
trade a verified-correct geometry for a worse picture, so it waits on that defect.

**A caution I nearly published.** An offline calculation made the port's `inversePulse`
look like exactly twice the executable's, at two instants, to five figures — and the
relation `pulse_orig = (1 + pulse_port) / 2` fit both. It is wrong: the port's LIVE
render is at a slightly different time than the offline calculation, and against the
actually-emitted alphas the ratio is 2.68, not 2. Halving the scales made the picture
BRIGHTER, which is what exposed it. An exact-looking fit across two points is not
evidence when both points were computed rather than measured.

### Per-mesh triage (Phase 3), first pass

`tools/winebox/compare-draws.mjs` against held instants, worst parts first:

| part | capture | groups exact | the exception |
|---|--:|---|---|
| effect_40bfa0 | 173.31 | **8/8** | none — geometry is perfect, its defect is shading |
| effect_4106a0 | 7.84 | 6/8 | two meshes 10278 vs 6447/6426 (+59%) |
| effect_40cea0 | 60.19 | 3/5 | 4998 vs 4719/4671 (+6-7%) |
| effect_40ccc0 | 60.56 | 3/5 | 4998 vs 4704/4662 (+6-7%) |
| effect_40dab0 | 102.39 | — | B2 within 3%, QuadPatch 825 vs 1944 (fit over-culls) |
| effect_410300 | 102.88 | — | same |

`effect_40bfa0` at 8/8 is the cleanest shading target in the production: nothing about
its geometry is wrong, so anything that moves it is a shading fix.

## Correction, and the finding it produced: the draws are EXACT; the pixels are not

**First, a method error of mine that invalidated two conclusions.**
`tools/record-minigl-draws.mjs --time` takes a SHOW time, while the sweep's
`captureTime` is show + the 83.3ms alignment. Every draw-stream comparison above was
therefore made 83ms apart. Vertex counts survived it — geometry changes slowly — but
ALPHAS did not, because they ride fades.

Two conclusions built on that error are withdrawn:

* "the port's `inversePulse` is exactly twice the executable's, so woah3 is missing a
  0.5 factor". It is not. That relation came from an offline calculation at one time
  compared against measurements at another.
* "the fit masks an alpha defect on woah3". It does not.

**Compared at the SAME show time, the port is exact.** At show 102.7967 with the
derived rule:

| | vertices | alpha |
|---|--:|--:|
| Original | 6408 = 6408 | 1.0 = 1.0 |
| B2.LWO01 | 2499 = 2499 | 0.119 = 0.118770 |
| B2.LWO02 | 2472 = 2472 | 0.085 = 0.084836 |
| B2.LWO03 | 2439 = 2439 | 0.059 = 0.059385 |
| B2.LWO04 | 2388 = 2388 | 0.034 = 0.033934 |
| QuadPatch x2 | 1944 = 1944 | 0.7 = 0.7 |

and at show 173.2267 `effect_40bfa0` matches on all eight groups AND all five colours
(0.613350 / 0.466146 / 0.282141 / 0.257607, plus the grey 0.5 card).

(The executable emits RGB as `255.0` rather than `1.0` — the recorded `glColor4f`
quirk. GL 1.x clamps at specification time, so it is white either way, and the port's
normalised `1,1,1` is equivalent.)

### So the remaining defect is in the SHADING PIPELINE, not in the effects

For both parts the port issues the same primitives, in the same order, with the same
vertex counts and the same colours as `wONDEr.exe` — and the pixels still disagree
badly: woah3 renders luma 125 against a reference of 25, and `effect_40bfa0` scores
0.672 while being command-for-command identical.

That relocates every remaining question. It is not the effects, not the schedule, not
the geometry, and not the alphas. It is what `shared/sunflower/js/minigl.js` does with
those commands — texture content and filtering, the COMBINE4 / NV-combiner emulation
`effect_40bfa0`'s bump card depends on, blend behaviour, or the texture bound to a
given draw (`compare-draws.mjs` matches groups by SIZE, so a mesh drawn with the wrong
texture still reads as an exact match).

**This is the single most valuable thing established today**, and it is only visible
because the draw stream can be compared independently of compositing.

### Shipping decision

`mixed` stays the default: the derived rule everywhere except woah3.

    mixed    medianR 0.7807   RMSE 39.01     <- shipped
    proven   medianR 0.7787   RMSE 39.55     woah3 on the derived rule too

Shipping `proven` on woah3 is the more CORRECT build — its draw stream is exact — but
it scores 0.224/0.247 worse on those two parts because the fit happens to compensate
for the shading-pipeline error by deleting geometry. That is precisely the trap
METHOD.md describes, so it is recorded rather than resolved by preference: **the fit
is knowingly masking a shading defect, and `?cull=proven` is the correct build**. Once
the pipeline defect is fixed, `proven` should become the default and the fit deleted.

### Narrowed further: it is GL STATE, not the primitives

A wide phase scan under `?cull=proven` settles what remains. At `effect_410300`
local 33.036, scanning +-3.0s finds **no offset that matches anywhere** — best r 0.073
against -0.514 aligned, scan median -0.121. So the port's picture at that instant is
not the capture's picture at any nearby instant, while its draw stream is exactly the
executable's. Timing is excluded.

**Matching primitives is not matching state, and `compare-draws.mjs` only compares
primitives.** It matches groups by vertex count and I spot-checked colours; it says
nothing about blend mode, depth state, texture binding or texture environment. One
such difference is already visible in the trace:

```
original, held frame:   glBlendFunc sfactor 770, dfactor 1     = SRC_ALPHA, ONE
```

while woah3's four LWO passes in the port pass no `blendFuncOverride` at all and fall
through to the renderer's default source-alpha blend. With the LWO material's black
colour those two are drastically different: under SRC_ALPHA/ONE black contributes
nothing, under SRC_ALPHA/ONE_MINUS_SRC_ALPHA it darkens.

That also explains the otherwise contradictory luma readings, which are worth writing
down because they mislead in the obvious direction:

| build | QuadPatch drawn | luma | reference |
|---|--:|--:|--:|
| fit | 825 | 6.0 | 25.2 |
| derived | 1944 (= original) | 125.4 | 25.2 |

The fit looks better only because culling `QuadPatch` — a BRIGHT textured pass at
alpha 0.7 — removes light. It is compensating for a state error with a geometry
error, in the opposite direction, and the two happen to cross near the reference.

**Next step is state, not geometry**: extend `compare-draws.mjs` to diff the GL state
in force at each draw (blend func, depth test/mask, texture bindings and texenv) as
well as the primitive sizes, then work the differences. The oracle log already carries
all of it; nothing new needs recording.

### What the SHIPPED build actually does through woah3's fade

Worth recording, because it reframes the woah3 problem once more. Under the shipped
build the port tracks the reference's fade closely in SHAPE while sitting consistently
low in LEVEL:

| capture | reference | ours | ratio | r |
|--:|--:|--:|--:|--:|
| 96.13 | 196.7 | 128.1 | 0.65 | 0.589 |
| 96.51 | 194.0 | 118.3 | 0.61 | 0.662 |
| 98.21 | 148.3 | 119.3 | 0.80 | 0.823 |
| 98.64 | 130.0 | 97.6 | 0.75 | 0.875 |
| 100.31 | 32.2 | 27.1 | 0.84 | 0.547 |
| 100.76 | 10.5 | 8.2 | 0.78 | 0.401 |
| 102.39 | 8.8 | 4.6 | 0.52 | 0.415 |

So the fade itself is right — the port follows 197 -> 9 as the reference does — and
what remains is a level deficit of roughly a third. That is issue #32's original
"renders too dark" reading, still standing for these parts after everything else has
been explained away.

**And it is the strongest remaining argument that the defect is in the shading
pipeline rather than the effects.** A port that reproduces the executable's draw
stream vertex-for-vertex and alpha-for-alpha, and tracks a five-second fade in shape,
but delivers two thirds of the light, is not getting the drawing wrong. It is getting
the accumulation wrong — which is blend, texture, or texenv.

## The environment-map normals were negated, and that was the shading defect

The "same commands, different pixels" gap has a cause, and it is in the port.

`0x004075e4` reads the normal for the environment-coordinate projection from the
VERTEX at `+0x3c/+0x40/+0x44` — the ENGINE's smooth normal. The port fed
`buildWonderVertexNormals`, which was independently measured to return exactly its
negation (`dot = -1.0000` on 100% of vertices, against normals dumped out of the
running executable). Negating U and V about the 0.5 bias samples the mirrored part of
the second texture, and since that unit modulates the first, the error appears as a
large brightness excess rather than as visible skew.

Negating at the call site (the function stays faithful to the disassembly, which is
what its test pins) with the derived facing rule enabled:

    effect_410300 @ local 33.036   r -0.5144 -> 0.8299    luma 125.4 -> 25.3  (ref 25.2)
                                   RMSE 125.67 -> 18.28

**Run-level, eight parts up and none down:**

| part | before | after |
|---|--:|--:|
| effect_40dab0 | 0.600 | **0.932** |
| effect_410300 | 0.611 | **0.931** |
| effect_40bfa0 | 0.672 | **0.960** |
| effect_40d790 | 0.737 | **0.966** |
| effect_4106a0 | 0.679 | 0.855 |
| effect_40ea30 | 0.762 | 0.913 |
| effect_40de00 | 0.781 | 0.830 |
| effect_40c990 | 0.885 | 0.905 |

    medianR 0.7807 -> 0.8548    medianRMSE 39.01 -> 33.02    below 0.9: 18 -> 12

**The derived facing rule is now the default**, because with this fixed it is
decisively better than the fit (0.830 against 0.458 at the sample above) rather than
worse. `?cull=fitted` still selects the superseded placeholder, `?cull=off` disables
rejection.

### Also derived here

* `wonderEnvironmentTexcoords` divides each matrix ROW by twice ITS OWN scale
  (`0x0040755f-0x004075d0`: `[ESP+0x64]` doubled divides m0 and m1, `[ESP+0x68]`
  divides m4 and m5, `[ESP+0x6c]` divides m8 and m9), not each COLUMN by one scale.
  The two agree only for uniform scale; every env-mapped mesh in Wonder happens to be
  uniformly scaled, so the corrected form moves no part today. Kept because it is what
  the executable does.
* The U/V bias at `0x004332c0` is 0.5 and V is negated at `0x00407628` (`FCHS`),
  both matching the port.

### Remaining, with levels now close

Luma ratios are 0.96-0.98 for almost every part, so what is left is structure rather
than brightness. Worst three: `effect_40cea0`/`effect_40fe10` (0.597) and
`effect_40ccc0` (0.666), which share the 58.9-69.75s window. Their geometry is
essentially exact — at capture 60.19 the per-mesh diff is 4/5 groups exact with the
one difference at +0.2% — so they are the next instance of the same "commands right,
pixels wrong" pattern that the environment-normal fix has just resolved elsewhere.

### One more hypothesis tested and rejected

`effect_40ccc0`'s `MATERIAL_OPACITY` (0.4239659905433655) looked misplaced: at capture
60.19 the port draws two meshes at alpha 0.424 while the original's held frame shows
draws at 1.0 and at 0.3, with nothing at 0.424. Removing the override makes those
parts markedly WORSE — `effect_40cea0`/`effect_40fe10` 0.597 -> 0.457 and
`effect_40ccc0` 0.666 -> 0.551 — so the override is right and the reading was wrong:
the alpha-1.0 draws in that frame belong to some other layer, not to `check`.

Recorded because the inference looked sound and was not: matching a port draw to an
original draw by ALPHA is unreliable when several layers are live, in the same way
matching by texture name is. `compare-draws.mjs` matches by vertex count for exactly
that reason, and per-draw alpha needs the same discipline — pair the draws first, then
compare their state.

### The pairing problem, stated precisely, because it is the actual blocker

`tools/record-minigl-draws.mjs` now records the GL state in force at each port draw
(blend enable, blend function, depth test, depth mask) alongside its vertex count and
colour, so the two sides CAN be compared on state. Joining them still fails, and the
reason is worth stating exactly:

At capture 60.19 the port issues

    elems 2304:t1 c1,1,1,0.3    [blend=true SRC_ALPHA,ONE_MINUS_SRC_ALPHA depth=false]
    elems 2304:t1 c1,1,1,0.3    [blend=true SRC_ALPHA,ONE_MINUS_SRC_ALPHA depth=false]
    elems 4719:t2 c1,1,1,0.424  [blend=true SRC_ALPHA,ONE                 depth=false]
    elems 4680:t2 c1,1,1,0.424  [blend=true SRC_ALPHA,ONE                 depth=false]

and the executable's held frame issues four real draws: two at colour alpha 1.0 under
SRC_ALPHA/ONE_MINUS_SRC_ALPHA, and two at 0.3 under the same. The 2304 pair matches on
BOTH count and state. Pairing the remaining 4719/4680 against the original's
4719/4671 then implies `check` should draw at alpha 1.0 — and making that change,
with or without the matching blend, costs 0.14 on `effect_40cea0`/`effect_40fe10` and
0.115 on `effect_40ccc0`.

So the pairing is wrong: three clips are live in that window and the original's
4719-vertex draw belongs to a different one than the port's. **Matching by vertex
count is not injective across layers**, exactly as matching by texture name is not.

(The blend half of that experiment changed nothing measurable, which is itself
informative: where `check` draws over a cleared background dst is zero, and additive
and source-alpha blending both reduce to src*alpha. Blend differences are only
observable where something has already been drawn.)

**What the join needs** is a per-draw identity that survives several live layers —
the object's transform is the obvious candidate, since `compare-draws` already sees
the original's `glTranslatef`/`glRotatef` stream and the port records `tr`/`rot`.
Pair on (vertex count, transform), not on vertex count alone. Until then, per-draw
state comparison produces confident wrong answers on exactly the parts that still
need it.

### The pairing is now checked rather than assumed — and it reports UNPROVEN

`compare-draws.mjs` pairs in three passes: exact size AND identical transform first,
then exact size, then nearest size; and it prints which pass made each pair plus a
count of how many were transform-confirmed. On the ambiguous window it says:

    4/5 groups match exactly
    0/5 pairs confirmed by TRANSFORM as well as size — treat the rest as unproven

That is the honest answer, and it is what would have stopped three wrong changes.

**Why zero.** The port places these meshes with `multMatrix`, not `glTranslatef`, so
it records no `tr`/`rot` for them — and the executable's side cannot supply matrices
either, because Wine's `+opengl` channel logs

    glLoadMatrixf m 041F72FC

the POINTER, not the sixteen floats. This is the same limitation that made
`glVertex3fv` useless for comparing positions and is exactly why
`tools/winebox/sunf-apitrace-probe.sh` exists: apitrace serialises pointed-at data.

**So transform-keyed pairing needs an apitrace recording of the held instant**, and
the port recorder needs to emit the modelview matrix at each draw (it already wraps
`MiniGL.prototype`, and `loadMatrix`/`multMatrix` at minigl.js:680-681 are the hooks).
Both halves are small; neither is guesswork. Until then, per-draw state comparison in
a multi-layer window must be treated as unproven, which the tool now says out loud.

### Order pairing works, and it exonerates the port in the worst remaining window

The pairing problem was smaller than I made it. Both sides submit the frame's draws in
the SAME ORDER, so the sequence itself is the key:

| # | original | port |
|--:|---|---|
| 1 | TRIANGLES:2304:t26 | elems 2304:t1 |
| 2 | TRIANGLES:2304:t26 | elems 2304:t1 |
| 3 | TRIANGLES:4719:t12 | elems 4719:t2 |
| 4 | TRIANGLES:4671:t12 | elems 4680:t2 |
| 5 | QUADS:4:t27 | prim QUADS:4:t3 |

with the textures corresponding t26<->t1, t12<->t2, t27<->t3.

Reading the original's colour per texture in that frame:

    tex=26  alpha=0.300000      port: 0.3      match
    tex=12  alpha=0.423966      port: 0.424    match
    tex=27  alpha=1.000000      port: 1.0      match

**So `MATERIAL_OPACITY = 0.4239659905433655` is exactly right**, and the earlier
reading that the executable drew those meshes at 1.0 was wrong — `draw-state.mjs`'s
per-unit tracking mis-attributed which colour belonged to which draw. That is the
fourth conclusion this document has had to withdraw, and all four came from pairing
draws by a key that was not unique.

**Everything observable in the `+opengl` trace now matches for this window**: draw
count, submission order, vertex counts (4 of 5 exact, the fifth +0.2% from the facing
rule), texture correspondence, and per-draw colour and alpha. `effect_40cea0` and
`effect_40fe10` nevertheless score 0.597 and `effect_40ccc0` 0.666.

### What that leaves, and it is not shading state

Two things are invisible in this trace and are now the only candidates:

1. **The matrices.** Wine logs `glLoadMatrixf m 041F72FC` — the pointer. If the port's
   camera or object matrices differ, identical geometry lands in different SCREEN
   positions: a structurally different picture with almost identical luma, which is
   exactly the signature here (luma ratios 0.96-0.98, r 0.60).
2. **Texture content.** Group sizes and GL names correspond, but nothing checked that
   texture 12's pixels are the port's `t2` pixels.

Both need apitrace, which serialises pointed-at data; `sunf-apitrace-probe.sh` already
exists for precisely this. The camera hypothesis is testable more cheaply first —
render the port at the same instant with the camera forced to the EXP camera at
several nearby frames and see whether the structure locks on.

### Five inferences from this one window, five rejected by measurement

Recorded as a group, because the pattern is the finding.

| # | inference | source | result |
|--:|---|---|---|
| 1 | check's blend should be additive | FUN_0040ccc0 sets +8/+0xc | no measurable change |
| 2 | MATERIAL_OPACITY 0.424 is misplaced | original's frame shows 1.0 and 0.3 | **-0.14 / -0.115** |
| 3 | as 2, plus matching blend | both together | identical regression |
| 4 | the executable draws tex 12 at alpha 1.0 | draw-state per-unit tracking | **false** — it is 0.423966, matching the port |
| 5 | check's clock runs 0.28s fast | original's frustum implies frames 2.78/6.97 | **-0.20 / -0.24** |

Every one came from attributing something in the recorded frame — a colour, an alpha,
a frustum — to a particular EFFECT, when three clips are live and the trace does not
say which layer issued which call. Draw ORDER pairs the primitives correctly (proven:
the 2304/2304/4719/4671/QUADS sequence matches the port's exactly, textures and all),
but order alone does not attribute the surrounding STATE calls, which is where every
one of these five went wrong.

**Nothing further should be changed in this window without per-layer attribution.**
The `?only=` flag renders one clip at a time in the PORT; the equivalent on the
executable's side is to pin the show time inside a window where only one clip is live,
which the order table makes possible for some parts and not for others. That, or an
apitrace recording where the matrix and texture data are serialised and each draw can
be identified by its content rather than by its neighbours.

The port's draws in this window are, as far as the `+opengl` trace can show, correct:
count, order, texture correspondence, colour and alpha all match. Whatever costs
`effect_40cea0`, `effect_40fe10` and `effect_40ccc0` their 0.3 of correlation is not
visible in it.

### Attribution solved, and the port is verified correct in this window

`?only=` gives per-layer attribution on the PORT side, and because draw order matches
between port and executable, it transfers to the executable's side by position:

| clip | port draws | executable |
|---|---|---|
| effect_40cea0 (boxical4) | 2304 x2, alpha 0.3, SRC_ALPHA/ONE_MINUS_SRC_ALPHA | tex 26, alpha 0.300000, blend 770,771 |
| effect_40ccc0 (check) | 4719/4680, alpha 0.424, SRC_ALPHA/ONE | tex 12, alpha 0.423966, blend 770,1 |
| effect_40fe10 (backdrop) | QUADS:4, alpha 1.0, SRC_ALPHA/ONE | tex 27, alpha 1.000000, blend 770,1 |

**Every attribute matches**: draw count, submission order, vertex counts (4 of 5 exact,
the fifth +0.2%), texture correspondence, per-draw colour, per-draw alpha, and now
per-draw blend function. `MATERIAL_OPACITY = 0.4239659905433655` and check's additive
blend are both confirmed against the executable.

So the port is correct in this window on everything the `+opengl` trace can show, and
`effect_40cea0` / `effect_40fe10` (0.597) and `effect_40ccc0` (0.666) are limited by
something the trace cannot express — the matrices (logged as pointers) or the texture
CONTENT. Those need apitrace.

**Two tool cautions, both of which cost real work here.**

1. `draw-state.mjs` mis-assigns per-draw state. It reported every draw in this frame
   under SRC_ALPHA/ONE_MINUS_SRC_ALPHA; pairing `glBindTexture` -> `glBlendFunc` ->
   `glEnd` directly shows 770,771 for tex 26 and 770,1 for tex 12. Two of the five
   withdrawn inferences came from trusting it. Use the direct pairing until it is
   fixed.
2. `check.js` already contained `blendFuncOverride: [SRC_ALPHA, ONE]` further down the
   same object literal. Three experiments that "changed nothing" were silently
   overridden by that duplicate key rather than being genuinely inert — a reminder to
   verify an experiment took effect (record the draw stream) before reading its score
   as evidence.

## apitrace closes the last gap: it is the CAMERA, and probably the fov track

The `+opengl` channel logs `glLoadMatrixf m 041F72FC` — a pointer — so matrices were
invisible. apitrace serialises them. Recording the held instant at capture 60.19
(order 7, hold 7.4947) with `SUNF_QPC_HOLD` gives a 37 MB trace and the real values:

    executable glFrustum half-widths:  1.450316   2.031891   7.294902
    port:                              1.543636   2.153201   7.294902

**boxical4's projection matches to all seven digits (7.294902).** `check`'s does not.
So the remaining error in this window is `effect_40ccc0`'s CAMERA, not its geometry,
colour, alpha or blend — all of which were verified identical above.

### And it is not a frame offset

The executable's half-widths correspond to port frames ~2.75 and ~6.97 where the port
renders 3.62 and 7.62. The deltas are -0.87 and -0.65 — not constant, so no single
shift explains both. Two experiments confirm it directly:

| experiment | effect_40cea0 / effect_40fe10 | effect_40ccc0 |
|---|--:|--:|
| shift check's whole clock -0.28s | -0.202 | -0.241 |
| shift only the CAMERA frame -0.84 | -0.152 | -0.147 |

Both regress. And `frames[1] = frame + 4` is confirmed from the executable
(`0x004333ac` = 4.0, `0x004332f4` = 3.0), yet the executable's two frustums sit ~4.22
frames apart on the port's fov curve. A frame error cannot produce that; a different
INTERPOLATION of the fov track can, since the two samples land on different parts of
the curve and would be displaced by different amounts.

**Next step, precisely.** Read how the native samples a camera fov track — whether it
interpolates linearly as `scene.js` does, or with the TCB/spline form 3ds Max exports.
`check.exp`'s camera has `position`, `fov` and `roll` tracks; the port's sampled fov at
frames 3.62 and 7.62 is 1.991909 and 2.272023, and the values that reproduce the
executable are 1.93454 and 2.22454. Two known input/output pairs on a known track is a
strong constraint on the interpolation form.

This is the first remaining defect in Wonder that is fully localised: one effect, one
quantity, two exact target values, and an oracle recording that can confirm any
proposed formula without touching the sweep.

### Proof that it is the fov SAMPLER, not the frame

`check.exp`'s camera fov track is TCB-keyed with three keys:

    time  0   value 1.752116084098816   T=C=B=0
    time 20   value 2.938939809799194   T=C=B=0
    time 40   value 2.816766977310181   T=C=B=0

`frames[1] = frames[0] + 4` is confirmed from the executable (`0x004333ac` = 4.0,
`0x004332f4` = 3.0), so the two frustums must come from two frames exactly 4 apart.
Searching every frame under that constraint:

    best f = 2.975  ->  half-widths 1.471108 and 2.031906
    executable                      1.450316 and 2.031891
    residual 0.0208, and it cannot be driven to zero

The second target is reachable (2.031906 vs 2.031891) but the first is not, at any
frame. **No frame offset can satisfy both**, which rules out every timing explanation
and leaves the interpolation itself. That also explains why both timing experiments
regressed: they were adjusting the one thing that could not be the cause.

The constraint for whoever picks this up is unusually tight — three known keys, two
known outputs at frames exactly 4 apart, and an oracle recording that confirms any
candidate formula without running the sweep:

    port's linear-ish sampler at f=3.62 -> fov 1.991909  (needs 1.93454)
    port's linear-ish sampler at f=7.62 -> fov 2.272023  (needs 2.22454)

Given the keys carry tension/continuity/bias fields, the native is very likely
evaluating a Kochanek-Bartels/TCB spline where `scene.js` interpolates linearly. That
is a shared-runtime change, so it would affect every Sunflower production's camera and
should be verified against more than this one pair before it lands.

## The scalar first-tangent bias: a shared-runtime bug found through Wonder's camera

The camera trail led to a real engine defect, and not one specific to Wonder.

`sampleHermite` was never linear — it already evaluated TCB tangents. The error was in
ONE endpoint equation. The closing equation already carried a scalar/vector asymmetry
(`lastTimeBias`, 0.5 scalar / 0.75 vector, derived from the executable). The OPENING
equation did not, and it should:

```asm
004057d1  FLD  [third.time]  FSUB [first.time]  FADD ST0,ST0   ; 2 * span0
004057e1  FDIVP                                                ; ratio
004057e3  FSUBR double [0x004332e8]                            ; 0.25 - ratio
```

with `0x004332e8` = **0.25**. The port computed `-ratio`. So the first segment of every
SCALAR track was slightly wrong, everywhere, in every production.

**Verified against the executable, not the score.** With the bias applied, the two
frustum half-widths apitrace recorded at capture 60.19 become simultaneously
satisfiable at one frame, with the `+4` spacing the binary requires:

    before:  best residual 0.0208   (could not be driven to zero at any frame)
    after:   best residual 3.2e-5   at f = 2.414

**And it improves a second, independent production.** That is the check a shared-runtime
change has to pass:

    wonder   medianR 0.8548 -> 0.8612   8 parts up, none down
    lapsus   medianR 0.9499 -> 0.9548

Wonder's movers: `effect_40cea0`/`effect_40fe10` +0.081, `effect_40c990` +0.035,
`effect_40c760` +0.028, `effect_40ccc0` +0.027, `effect_40fa30`/`effect_40fc00` +0.010,
`effect_40f8e0` +0.005. `test:shared` unchanged at 62 pass / 1 fail.

**One thing remains open on the same camera.** The port renders check's two passes at
frames 3.62 and 7.62 for capture 60.19, while the executable's frustums correspond to
2.414 and 6.414 — the sampler now agrees, but the FRAME does not, by about 0.4s of
local time. That is a separate question from the interpolation and should be measured
the same way: it is one effect, one quantity, and apitrace can read the answer.

## The opening bias is symmetric — and that closed the last geometry gap

Correction to the section above: the 0.25 belongs on BOTH track kinds, not just
scalars. The vector equation at `0x0040523a` and the scalar one at `0x004057e3` both do
`FSUBR double [0x004332e8]` with that constant = 0.25. Only the CLOSING equations are
asymmetric (vector 0.75 vs scalar 0.5, the `lastTimeBias` already in the port).

Applying it to vector tracks as well fixes the camera POSITION, and the result is
exact rather than close. At capture 60.19, per-draw modelview translations:

| draw | port | executable | distance |
|--:|---|---|--:|
| 2304 | -3.837, -21.379, -15.421 | -3.837, -21.379, -15.421 | **0.000** |
| 2304 | -5.773, -20.548, -15.675 | -5.773, -20.548, -15.675 | **0.000** |
| 4719 | -10.172, -67.097, -3.324 | -10.172, -67.097, -3.324 | **0.000** |
| 4671 | -183.028, -14.730, -26.110 | -183.028, -14.730, -26.110 | **0.000** |

and because the facing rule reads the camera through `inverse(objectMatrix)`, the last
draw went from 4680 to **4671**, matching the executable. That window is now **5/5
groups exact** — geometry, colour, alpha, blend, camera and object transforms all
identical.

    effect_40cea0 / effect_40fe10   0.677 -> 0.725
    effect_40ccc0                   0.693 -> 0.751
    effect_410300                   0.931 -> 0.957

    wonder  medianR 0.8612 -> 0.8617   medianRMSE 32.40 -> 31.25
    lapsus  medianR 0.9548 (unchanged)   test:shared 62/1 (unchanged)

**No part is below 0.70 any more** (was 12 at baseline, 3 before this fix).

### A note on the earlier "check camera is 0.4s out"

That was my arithmetic, not a defect. `effect_40ccc0` starts at 59.302, not 58.900, so
check's local time at show 60.107 is 0.805 and its frames are 2.414 / 6.414 — exactly
what the executable's frustums imply. I had computed the local time from the
NEIGHBOURING clip's start. Recorded because the mistake is easy to repeat in a window
where several clips overlap and the sample is labelled with only one of them.

### Pairing confirmation still cannot fire, and that is correct

`compare-draws.mjs` now prefers the modelview translation as a draw's identity when
the recorder carries one, since meshes placed by `multMatrix` emit no `tr`/`rot`. It
still reports `0/5 confirmed by TRANSFORM`, because the executable's side comes from
the `+opengl` log, which has no matrices. That is the safe failure: two draws with
EMPTY transforms would otherwise "match" and falsely confirm. Wiring the original side
to an apitrace dump is what makes confirmation possible.

## `oracle-at.sh` was comparing the two sides 83.3ms apart

The driver held the oracle at show time (capture - alignment) but passed the CAPTURE
time to `record-minigl-draws --time`, which takes a SHOW time. Fixed. It had produced
a convincing false defect: at capture 54.96 the port appeared to draw `spherical.exp`'s
four spheres at alpha 0.135 where the executable used 0.004981 — 27x too bright.

It is not a defect. `wonderSphericalState` gives `sin^2(clamp((t-1)*2,0,2)*0.5*3.664)`,
which at show 54.877 is 0.00514 (the executable's 0.004981) and at 54.96 is 0.1345
(the 0.135). The port was right; the comparison was 83ms out. That is the same units
error as before, now fixed at the source rather than remembered.

Compared correctly, `spherical` matches: 4 x 672 @ 0.005, 3 x 864 @ 0.2, 32 x 6 @ 0.3,
1 x 4 @ 0.41, 1 x 4 @ 0.9 — all exact. A second false alarm in the same pass came from
an alpha-extraction regex that only matched single-colour draws and missed the
`c129x[...]` batched form, making two present draws look absent.

### What is actually left there: one mesh, 615 vs 519

    43/44 groups exact; the exception is 519 (executable) vs 615 (port), +18.5%

The mesh is `shite1.exp`'s `Sphere02` — 1080 vertices unculled, material 1,
`doubleSided=false` so the facing gate applies. The port's rule culls it to 615 and the
executable to 519, so the rule is running but its inputs differ for this scene, where
they are exact for `woah3.exp` (0.00% on all eight meshes). The obvious next check is
whether this scene's camera and object matrices match, exactly as was done for
capture 60.19 — apitrace at this instant plus the port's `mv=` output answers it in one
comparison.

### shite1's Sphere02: camera exonerated, modifier hypothesis tested and neutral

apitrace at show 54.8767 gives the executable's modelview for the mismatched draw as
`(-104.2785, 16.6955, -2770.874)`; the port's is `(-104.2785, 16.6955, -2770.8743)`.
**The matrix is exact**, so the facing rule's camera and object inputs are right and
the 615-vs-519 difference is in the vertex data it reads.

Two candidates were tested:

* **Smoothing groups** — ruled out by measurement. Every mesh involved, in both
  `woah3.exp` (where the rule is exact) and `shite1.exp` (where it is not), has a
  single distinct smoothing flag, so `buildWonderVertexNormals` ignoring groups cannot
  be what separates them.
* **The runtime vertex modifier** — `0x40e490` is attached to shite1's first four
  meshes and "restores its saved source vertices, applies its current object-frame
  phases, then regenerates the mesh normals", so the executable's facing test reads
  geometry that has been rewritten. The facing test now reads the CURRENT geometry
  buffers (`wonderFacingIndicesFromGeometry`) rather than the mesh data captured at
  construction — architecturally right either way — but it changes nothing today,
  because the port builds `buildWonderShiteGeometry` once in the constructor and does
  not re-run the modifier per frame. Neutral across the whole sweep, kept because it
  is correct and because it is the hook the modifier will need.

So the remaining lead is narrower than "the facing rule is wrong outside woah3": it is
that **the port does not apply the per-frame shite modifier at all**, while the
executable's facing flags are computed after it runs. `work/re/shite-modifier-decompiled.c`
is already exported. That is one effect, one callback, and the count to hit is 519.

### shite1's Sphere02: camera exonerated; the lead is the missing vertex modifier

apitrace at show 54.8767 gives the executable's modelview for the mismatched draw as
`(-104.2785, 16.6955, -2770.874)`; the port's is `(-104.2785, 16.6955, -2770.8743)`.
**Exact** — so the facing rule's camera and object inputs are right, and the 615-vs-519
difference is in the vertex data it reads.

* **Smoothing groups**: ruled out. Every mesh involved, in both `woah3.exp` (rule
  exact) and `shite1.exp` (rule not exact), has a single distinct smoothing flag.
* **The runtime modifier**: `0x40e490` is attached to shite1's first four meshes and
  "restores its saved source vertices, applies its current object-frame phases, then
  regenerates the mesh normals", so the executable's flags are computed AFTER it runs.
  The facing test now reads the current geometry buffers
  (`wonderFacingIndicesFromGeometry`) instead of construction-time mesh data —
  architecturally right, and neutral across the whole sweep today, because the port
  builds `buildWonderShiteGeometry` once in the constructor and never re-runs the
  modifier per frame.

**That lead is also wrong, and is withdrawn.** `shite-design.js` already rebuilds
geometries 0-3 with `buildWonderShiteGeometry(mesh, state.shiteObjectFrame)` every
frame, at the top of `render()`. The constructor call is only the initial build. The
modifier IS applied per frame, on the current object clock.

So for `shite1.exp`'s Sphere02 the port has: the correct modelview (exact to four
decimals against apitrace), a single smoothing group, the per-frame modifier applied,
and the facing rule reading the current geometry buffers — and still submits 615
vertices where the executable submits 519. Nothing checked so far accounts for it.

The next thing to check is the one input not yet compared directly: the vertex
POSITIONS and NORMALS themselves. apitrace serialises `glVertex3fv`/`glNormal3fv`
data, so the executable's actual post-modifier vertices can be read and diffed against
`buildWonderShiteGeometry`'s output vertex by vertex. That answers whether the
modifier's formula is right, which is the last assumption standing.

### Sphere02, measured at the vertex level: the surviving SET is mirrored in Y

apitrace serialises `glVertex3fv`, so the executable's actual submitted vertices can be
read. At show 54.8767 its Sphere02 draw carries 519 vertices, and **0 of 519** match
any position in the port's deformed mesh at 3-decimal precision.

The ranges say what happened:

    port, deformed Sphere02 (all 1080)   x [-1076.267, 1085.405]  y [-1201.383, 1221.884]  z [-469.124, 469.134]
    executable, the 519 it submits       x [ -342.394, 1145.282]  y [-1221.792, 1199.559]  z [-442.815, 469.134]

`z` agrees exactly at the top (469.134) and the magnitudes are the same, so the
DEFORMATION is right — `buildWonderShiteGeometry` is producing the correct mesh. But
the executable's surviving y-range reaches -1221.792 where the port's whole mesh only
reaches -1201.383, and the port's +1221.884 is what the executable's -1221.792 mirrors.
The two sides are keeping **opposite halves** of the same deformed sphere.

So this is a facing-SIGN problem specific to this mesh, not a geometry or timing one —
which is consistent with everything else already ruled out here (modelview exact to
four decimals, single smoothing group, modifier applied per frame, facing reading the
current buffers).

Why the sign would differ here and not on `woah3.exp`, where the same rule is exact on
all eight meshes, is the open question. The likely candidates, in order: the
regenerated normals `buildWonderShiteGeometry` writes (it copies `nativeNormals` into
`normals`, so both paths see the modifier's normals — but their ORIENTATION relative to
`FUN_00406e20` has not been checked for the deformed mesh), and the winding of the
deformed triangles, which a non-uniform per-axis scale can invert.

**That is one measurable check**: dump the executable's `glNormal3fv` alongside its
vertices from the same apitrace block and compare orientation directly, exactly as was
done for `+0x3c` on woah3 where the answer was a clean `dot = -1.0000`.

### And the sign flip is not it either — the mirrored range was a red herring

Testing the obvious reading of the mirrored y-range: inverting the facing comparison
for the deformed mesh gives **639**, not the executable's 519, and it culls
`spherical.exp`'s four spheres away entirely (the 4 x 672 draws vanish). So neither
sense produces the executable's count:

    port, dot > 0   615
    port, dot < 0   639
    executable      519

Both are wrong, so the executable's flags for this mesh are not reproducible from the
port's regenerated normals under either sign. The mirrored y-range is a consequence of
whatever the real difference is, not a diagnosis of it.

**The remaining method is the one that settled woah3 definitively**: the stub's
`SUNF_SCAN` reads the live vertex array by content and dumps `+0x3c` (the engine's own
normals) beside `+0x4c` (the flags), so the rule can be checked against the data the
engine actually used rather than against the port's recomputation. On woah3 that gave
100.00% and an unambiguous `dot(Nengine, Nport) = -1.0000`. Doing the same for
`shite1.exp`'s Sphere02 needs a scan pattern from one of its DEFORMED vertex positions
— which apitrace has now recorded, e.g. `0.5056038, 0.006791068, 469.1339` — since the
modifier rewrites the array the gate reads.

That is a well-specified next step with a known method, a known target (519), and the
scan key already in hand.

### The scan route to Sphere02's flags did not work as-is

Scanning for a DEFORMED Sphere02 position (`406f013f9b87de3b2491ea43`, the bytes of
`0.5056038, 0.006791068, 469.1339` recorded by apitrace) over `0x1000000..0x8000000`
found **no hits**, so `+0x3c`/`+0x4c` could not be dumped for this mesh the way they
were for `B2.LWO01`.

Why it differs from the woah3 case: that scan keyed on a position straight out of the
EXP, which is present in the loaded data AND in the runtime vertex structs. Here the
modifier rewrites the array every frame, so a deformed position only exists in memory
at the instant it was written — and the scan fires from `FMUSIC_GetOrder`, which is not
that instant. The key would have to be a value the modifier does NOT change: `z` is
untouched by `buildWonderShiteGeometry` (it copies `mesh.positions[offset + 2]`
through), so scanning on the RAW x/y plus the known z, or on a z-only pattern with a
wider count, is the variant to try.

Recorded so the next attempt does not repeat this one.

Scanning for the RAW Sphere02 vertex (`0062703ede6c373b2491ea43` =
`0.23474884, 0.0027988474, 469.13391`) over the same range also returns **no hits**, so
the failure is not that the deformed value is transient. The scan simply is not
locating `shite1.exp`'s vertex array at order 7 / hold 2.2647, while the same mechanism
found `B2.LWO01`'s at order 11. Both scans used bounds that cover the region where the
woah3 arrays were found (`0x4400000..0x4c00000`).

Widening the bounds to `0x400000..0x20000000` (4 MB to 512 MB, far past anything the
process uses) still returns **no hits**, so it is not the window. The pattern is simply
not in memory when the scan fires, which points at TIMING: the scan runs from
`FMUSIC_GetOrder`, and shite1's vertex structs either do not exist yet at that call or
are rebuilt in a form the raw EXP bytes no longer match — plausible, since the modifier
regenerates the array every frame rather than deforming a stable copy.

**Three scans, all negative** (deformed key, raw key, wide bounds). The approach that
worked for `B2.LWO01` does not transfer to a mesh behind a per-frame modifier, and the
next attempt needs a different hook — triggering the dump from the DRAW path rather
than from `FMUSIC_GetOrder`, so it fires while the array is live. That is a stub
change, not another scan parameter.

## Walking the whole pipeline instead of chasing symptoms

Jasper's suggestion, and it is the right shape for this problem. The fixed-function
pipeline is a CLOSED SET — transform (modelview / projection / texture), the vertex
attributes, per-unit texture state, and the raster gates — so if both sides emit the
same canonical record per draw, a divergence names itself instead of being guessed at.
Every wrong conclusion in this document came from guessing which piece of state a
symptom implied.

`tools/winebox/pipeline-diff.mjs` does it:

* the executable's side replays a reduced apitrace dump as a GL state machine
  (apitrace, not `+opengl`, because Wine logs POINTERS for `glLoadMatrixf` and the *v
  entry points);
* the port's side comes from `record-minigl-draws.mjs`, which now emits a `states`
  array — the same record taken from inside minigl;
* draws pair by SUBMISSION ORDER, which both sides share, with the vertex-count
  sequence printed so a mispairing is visible rather than silent;
* texture ids are normalised to "n-th distinct texture this frame", because GL names
  do not correspond between the two;
* the executable's EMPTY `glBegin`/`glEnd` pairs are dropped — 46 of 90 in the frame
  this was built on, and leaving them in shifts every pair by one.

First run, at show 54.8767, 44 draws compared:

    40  unit0.enabled
    39  unit0.matrix
    12  unit1.texture
    11  unit0.texture
     4  depthMask
     1  n            <- the 615-vs-519 defect that took most of a session to find
     1  blendFunc

**The one-line summary of a day's work appears as a single row.** That is the point of
the tool.

### First real finding from it: the design pass scrolls its texture by the wrong amount

    draw 0 (n=6): unit0.matrix uv-offset  exe [0, 0]  vs  port [10.4767, 0]

The port applies `designTextureOffsets: [time, time + 16]` (shite-design.js:55) as a
TEXTURE MATRIX translation, giving U = 10.4767 at this instant. The executable's
texture matrix is identity — it never calls `glMatrixMode(GL_TEXTURE)` anywhere in the
trace — and its texcoords carry a U offset of about **-0.0005**, in a normal
[-0.06, 1] range. Wrapped, the port samples roughly half a texture away from the
executable on all 32 design draws.

### Two cautions on reading that table

* `unit0.enabled` (40) is SUSPECT. The replayer tracks `GL_TEXTURE_2D` enable against
  whichever unit was last selected, which is the same per-unit tracking that made
  `draw-state.mjs` mis-report blend earlier. Verify against the raw calls before
  acting on it.
* `unit0.texture` / `unit1.texture` slot mismatches may be ordering artefacts of the
  normalisation rather than real binding differences.

The matrix rows are trustworthy: apitrace serialises them in full, and identity versus
a 10.48 translation is not an artefact of anything.

### The texture-offset finding needs PER-DRAW texcoords to confirm

Zeroing `designTextureOffsets` scores slightly WORSE (-0.005 on `effect_40ec40` /
`effect_40f2f0`, -0.003 on `effect_410100`), so the port's scroll is not simply
spurious.

The `-0.0005` figure quoted above is not trustworthy: it came from the last 4000
`glTexCoord2f` calls in the whole trace, which belong to whichever draws happened to be
last, not to the design pass. Same attribution mistake as the earlier ones — a value
read from the right frame but the wrong draw.

**What the tool needs next is exactly this**: vertex attributes captured PER DRAW on
both sides, so a texcoord can be attributed to a paired draw rather than to a frame.
The pairing already works; the attribute stream is the missing column. That closes the
last gap between "the state matches" and "the pixels match", since after transform and
raster state, the only remaining inputs are the per-vertex attributes themselves.

Until then, the `unit0.matrix` row is a genuine difference in MECHANISM — the port
scrolls through the texture matrix, the executable never touches it — but what the
executable's equivalent offset actually is remains unmeasured.

## Driver-sourced state: the false-positive rate collapses

A Fable design review of `pipeline-diff.mjs` named one change above all others: stop
replaying the trace with a hand-rolled state machine and ask `glretrace -D <call>`
what the GL state actually was. `tools/winebox/exe-draw-state.sh` does that — one
retrace per draw of the held frame, ~30s each because every `-D` replays the trace
from the start, so a 44-draw frame is about 20 minutes and is paid once per instant.

Result on the same frame:

| field | regex replay | driver-sourced |
|---|--:|--:|
| unit0.enabled | 40 | **0** |
| unit0.matrix | 39 | **0** |
| uv | 5 | **0** |
| unit1.texture | 12 | 12 |
| unit0.texture | 11 | 11 |
| depthMask | 4 | 4 |
| n | 1 | 1 |
| blendFunc | 1 | 1 |

**74 reported differences became 29, and 23 of those are a known artefact.**

Three separate causes, all removed:

* `unit0.enabled` (40) was my replay mis-implementing GL's selector semantics —
  `glEnable(GL_TEXTURE_2D)` applies to the server's active unit. The driver dump does
  not carry per-unit enables at all, and it does not matter: whether a unit is switched
  on is mechanism, what changes pixels is which texture is bound. The field is gone
  from the comparison.
* `unit0.matrix` (39) was comparing MECHANISM. Wonder bakes its texture scroll into
  texcoords; the port applies a texture-matrix translation. Identical sampling,
  different implementation. Comparing EFFECTIVE UV — texcoord through the texture
  matrix — collapses all 39 to zero, and confirms the port's design and spherical
  offsets are exactly right (`u[0.37534, 1.37534] v[0, 1]` on both sides, per-material
  pattern and all).
* Two bugs were caught in the extractor before they could produce findings: glretrace
  reports GL booleans as the STRINGS `"GL_TRUE"`/`"GL_FALSE"`, so `bool()` makes every
  flag true; and `GL_TEXTURE0.GL_TEXTURE_2D` is the bound texture OBJECT's parameter
  dict, not an enable flag.

### What is left, and it is small

    12  unit1.texture   normalisation artefact (see below)
    11  unit0.texture   normalisation artefact
     4  depthMask       exe true, port false — draws 36-39
     1  n               519 vs 615, the known facing defect
     1  blendFunc       exe SRC_ALPHA,SRC_COLOR vs port SRC_ALPHA,ZERO — draw 38

The texture rows are the "n-th distinct texture seen this frame" normalisation, which
is order-sensitive; the design's fix is identity by CONTENT HASH of the uploaded texel
payload, which deletes the category rather than tuning it.

`depthMask` and `blendFunc` are new, concrete and trustworthy — the first findings
from this tool that are neither artefacts nor already known.

### Both new findings resolved, and the frame is now clean but for one draw

**`blendFunc` — real, fixed.** `?only=` attributes draws 36-39 to `effect_40f2f0`
(`scene-mask.js`). The driver reports `GL_BLEND_SRC=GL_SRC_ALPHA,
GL_BLEND_DST=GL_SRC_COLOR` for its third pass; the port had `SRC_ALPHA, ZERO`. Those
are not close — ZERO erases the destination, SRC_COLOR keeps it modulated by the
source. Corrected at `scene-mask.js:108`:

    effect_40ec40 / effect_40f2f0   0.797 -> 0.802

**`depthMask` — real difference, no effect.** The executable has it TRUE on those four
draws and the port FALSE, but `depthTest` is FALSE on both sides, and GL writes no
depth for a draw with the test disabled. The mask cannot reach a pixel there.

That lesson is now encoded rather than remembered: `pipeline-diff.mjs` only reports
`depthMask` when the depth test is enabled on at least one side. It is the design's
"impact" ranking in miniature — a field is a finding only where the pipeline can act
on it.

**The frame now diffs to almost nothing:**

    12  unit1.texture   known normalisation artefact
    11  unit0.texture   known normalisation artefact
     1  n               519 vs 615, the facing defect

From 74 reported differences to 24, of which 23 are one known artefact and the last is
the one genuine open defect. The tool's verdict on this instant is now: **the port
matches the executable on every comparable field of every draw except one vertex
count.** That is a statement worth having, and it took four rounds of removing things
the tool was wrong about to be able to make it.

### Texture identity by size: half-landed, and why

The remaining 23 differences are all the order-sensitive "n-th distinct texture seen
this frame" key. The fix is to identify a texture by something intrinsic. `glretrace`
supplies `GL_TEXTURE_WIDTH`/`GL_TEXTURE_HEIGHT` for the bound texture, so the
executable's side is done.

The port's side is not, and the reason is structural: its textures are created during
page setup, BEFORE the recorder installs itself (it waits for `__demoReady`), so
wrapping `createTextureFromImage`/`createTextureFromData` stamps nothing. WebGL2 has no
`glGetTexLevelParameteriv`, so the dimensions cannot be recovered from a live texture
afterwards either.

Two ways out, neither done here:

* install the prototype wrapper via `evaluateOnNewDocument` so it is in place before
  any page script runs — the recorder would then see every texture created;
* or have `minigl` remember the dimensions it uploads, which is a small port change
  but a port change, and this recorder has so far kept to the rule that it modifies
  nothing.

The differ degrades cleanly: it uses size only when both sides supply it, otherwise the
old scheme, so nothing regressed. The 23 artefacts remain until the port can stamp.

## The closing TCB endpoint: 0.75 for both kinds, not 0.5 for scalars

**Withdrawn:** "the closing equations are asymmetric — vector carries an extra 0.25
over scalar (0.75 vs 0.5)". That claim was in `scene.js`, and a unit test
(`Wonder TCB final endpoint preserves the native vector/scalar split`) asserted it with
a hand-computed 20.9375. Both were wrong, and the test made the error look verified.

The two routines reach the same 0.75 by different arithmetic, which is what sold the
asymmetry:

```
FUN_004053c0 (vector)  0x40540a  FSUBR float  [0x004332f0]   ; 0.25 - ratio
                       0x405410  FADD  float  [0x004332e4]   ; + 0.5      -> 0.75 - ratio
FUN_00405820 (scalar)  0x405872  FSUBR double [0x004332e8]   ; 0.25 - ratio
                       0x40588e  FADDP ST2,ST0               ; + delta20*0.5
```

The scalar routine adds its 0.5 term as a **separate addend after the 1.5 term**,
rather than folding it into the bias, so reading the `FSUBR` alone gives 0.25 and
reading the stored result gives 0.75. Only a full stack trace of `0x405850-0x40589d`
distinguishes them. Constants read from `wONDEr.exe`: `0x4332e0`=1.5, `0x4332e4`=0.5,
`0x4332e8`=0.25 (double), `0x4332f0`=0.25, `0x433258`=1.0.

### How it was found, and why the sweep could not have found it

`effect_40cea0` decayed across its own clip (0.725 at the first sample, 0.597 at the
last). Against the executable's draw stream at order 8 the port's modelviews were a
**pure rotation about the eye Z axis** — magnitudes preserved to four decimals, row 2
identical, all four columns sharing one angle:

| local | frame | draw 0 | draw 1 | draw 2 | draw 3 |
|--:|--:|--:|--:|--:|--:|
| 3.32 s | 30.6 | 0.00° | 0.00° | 0.00° | 0.00° |
| 9.66 s | 89.0 | -12.17° | -13.19° | -2.03° | -3.14° |

`boxical4.exp`'s `Box01` is static (one key on every track); the only animated scalar is
the camera **roll**, keyed at frames 0/50/100. Frame 30.6 is in the first segment and
frame 89 in the last, so the error is confined to the segment governed by the closing
endpoint tangent. Different scenes are live at once with different cameras, which is
why the four draws showed four different angles and why this looked like a per-object
bug rather than one shared engine defect.

After the fix all four draws match at **0.00°**.

Two false leads were closed on the way, both recorded because they cost time:

* **Texture filtering.** The executable sets `GL_NEAREST` on 5 textures and `GL_LINEAR`
  on 70, and the port hardcodes `LINEAR` — but only one of the five is bound in the
  frame, on 1 draw of 44. It never uses mipmapping (no `*_MIPMAP_*` filter anywhere in
  the trace, `GL_TEXTURE_MAX_LEVEL=0` on 13 textures), and Wonder's call sites already
  pass `mipmap=false`. Not the residual.
* **A phantom geometry difference.** `extract-prims.py` reported 4674/4662 vertices
  where `gl.log` and the port both said 4632/4614. `exe-draw-state.sh` over the *same
  trace* gives 4632/4614, so the extractor miscounts; there is no geometry defect. Two
  recorders disagreeing is not evidence against the port.

### Effect on scores

Wonder, per-part medians: 8 parts up, 0 down. `effect_40d060` 0.907 -> 0.980,
`effect_40cea0`/`effect_40fe10` 0.725 -> 0.776, `effect_40f8e0` 0.928 -> 0.955,
`effect_40ccc0` 0.751 -> 0.778. Median over parts unmoved at 0.8832 and still 12 parts
below 0.9 — the gains did not land on the distribution's middle.

Lapsus (engine-wide, so it is the regression check): median over parts 0.9483 ->
0.9538, with `silli` +0.061, `rad_out` +0.021, `viherio` +0.017 against nine
regressions of 0.019 or less. Net positive, but the regressions are real and
unexplained; they are the reason to keep `run-tcb075` as the comparison point.

Caveat worth stating: 0.75 was derived from `wONDEr.exe`. Lapsus is a different
executable and its own constants have not been read. The shared engine has always used
Wonder-derived TCB constants for every production, so this is not a new assumption —
but it is still an assumption.

## The shite deform ran on mirrored normals

`buildWonderVertexNormals` returns the engine's normals negated — already measured
(`dot = -1.0000` on 100% of vertices) and already documented in `mesh-geometry.js`.
Every consumer compensates: the environment UVs negate per mesh, and `wonderFacingFlags`
flips its comparison to `> 0`. `buildWonderShiteGeometry` did neither, so callback
0x40e490's input normal field was mirrored and the sphere was squashed in the wrong
places.

The disassembly agrees independently. `FUN_00406e20`'s face record holds A/B/C as three
pointers at +0x00/+0x04/+0x08 (`EAX`, `ESI`, `EDI` at 0x00406e45-0x00406e53), and the
cross product at 0x00406e76 forms `(B-A) x (C-A)` — the conventional order. The port
forms `(C-A) x (B-A)`. The comment in `mesh-geometry.js` claiming the executable used
the reversed order is wrong; the *result* it describes (negated normals) is right.

The modifier itself was re-derived from `0x0040e8d9-0x0040e991` and the port already had
it exactly: `x *= sin^4(n.x*3.2 + f*0.2)*1.3 + 1.5`, `y *= cos^4(n.y*3.2 + f*0.32 + 1.2)
+ 1.5`, z untouched. Constants read from the executable: 0.2, 0.32, 3.2, 1.3, 1.5, 1.2,
and the object clock at 0x0040effd is `fmod(local*10, 200)` with the 10 at 0x00433444 —
all matching the port. Only the normal's sign was wrong.

Note `0x0040e96c` is `FMUL ST1`, not `FMULP`: it leaves `c^2` on the stack, which
0x0040e97b discards. Reading it as a pop makes the exponent come out wrong.

### Evidence

At capture 54.958 the executable's own vertex data for `shite1.exp`'s Sphere02 (the
only draw of 44 that disagreed) fits the deform with total absolute error **0.066**
across six coordinates using the negated normals, and **3.33** without — and no frame
whatsoever satisfies the x and y equations simultaneously under the un-negated field.
Independently, the facing test then keeps **174** triangles, exactly the executable's
count, against 205 before. The z coordinate is untouched by the deform, which is what
made the source vertices identifiable in the first place.

All 44 draws at that instant now match the executable exactly, 6282 vertices to 6282.

Two dead ends worth keeping: searching for the frame that reproduces the executable's
174 is underdetermined — dozens of frames in [0,200) give exactly 174 — and the object
clock was never wrong anyway. And the per-object multipliers 0.6/0.7/0.3 at
0x004334c8/0x004333c0/0x004335d8 are texture offsets written to `+0xa0`, the same field
that receives `time + 16`; they are not per-object frame rates.

### Effect on scores

`effect_40ec40`/`effect_40f2f0` 0.802 -> 0.860, `effect_410100` 0.776 -> 0.840. No part
regressed. Median over parts unmoved at 0.8832, still 12 parts below 0.9.

## Two hypotheses killed by measurement, both of which looked obvious

**"The capture is zoomed relative to our render."** Three unrelated parts
(`effect_4106a0` at 18.69, `effect_4138a0` at 32.26, `effect_40cea0` at 68.64) all
*looked*, side by side, as though the reference were scaled up 10-15%: bigger text,
bigger geometry, composition pushed outward. Three parts sharing one signature is
normally the shape of a single global defect, and a global capture/render scale
mismatch would cap every score in the production.

It is not real. Resampling our frame about its centre and re-correlating gives a best
scale of exactly **1.00** for `effect_4138a0` (r 0.7793, against 0.7803 unscaled) and
exactly **1.00** for `effect_40cea0` (0.7750). Only `effect_4106a0` has a genuine scale
component, and a modest one: 1.06 lifts it from 0.448 to 0.516, so scale is part of that
part's error and none of the others'. The side-by-side image is simply not a reliable
instrument for judging scale by eye.

**"The 0.4 sample of `effect_40ec40` is a defect."** It is not: `contrast.mjs` reports
sd 2.5 against the reference's 2.6 on a mean luma of 254. That is a flat white frame
with nothing to correlate, and r is noise there. Its ceiling is what should be read.

Also settled: the 4674/4662-vertex counts that disagreed with `gl.log`'s 4632/4614 are
not a miscount in `extract-prims.py`. They come from the trace's first frames, before
the layers settle — 4632 appears in 73 frames of the recording and 4674 in five, all
early. Any comparison must use a settled frame, which is what `exe-draw-state.sh`
selects and `prims.json` does not.

## A fifth dead end: the "2/3 V scale" that was my own truncated scan

Comparing `effect_4106a0`'s QuadPatch draw at capture 18.692, the executable's unit-0
V range came out as [-8.9950 .. -2.3350], span 6.66, against the port's [-8.995 ..
0.995], span 9.99 — a ratio of exactly 1.5, with U matching to the last digit. A clean
V-only scale error on the one part with a measured scale component is about as
convincing as a lead gets, and it was entirely an artefact of the measurement.

The draw is 1944 vertices, so about 5832 trace calls, and the range I dumped started
1900 calls in. For a row-major UV grid that covers every U value and only the last
two-thirds of the V values, which manufactures precisely the 2/3 that looked like a
finding. Re-scanning the full range gives 1944 vertices and V [-8.9950 .. 0.9950],
span 9.99 — identical to the port.

Confirmed per vertex rather than by range, which is the check that should have come
first: the executable's vertex at (-393.8175, -286.7985, 279.0603) carries unit-0
(26.61217, -2.335). That grid point is (0.56, 3.335) in `beginning.exp`, and the port's
transform — U plus the material offset 26.0522, V flipped as `1 - V` per FUN_00406db0
at 0x4064af — gives (26.6122, -2.335). Exact.

Also checked and clean: the material names `nebulamultip1.jpg`, which is present in the
assets, so no fallback substitution is happening.

**Rule this cost enough to write down: when a range comparison shows a pure scale on
one axis, check the scan covered the whole primitive before believing it.** Two of the
five dead ends this session were the measurement, not the port.

## Where Wonder's remaining error is NOT

Three instants were probed exhaustively against the executable — 18.692 (`4106a0`),
54.958 (`40ec40`/`40f2f0`/`410100`) and 68.642 (`40cea0`/`40ccc0`/`40fe10`), chosen as
the worst samples of the three highest-headroom windows. At all three the port now
agrees with the executable on:

* draw counts, per draw and in total (44/44 and 6282 vertices at 54.958; 20378 at
  18.692; 5 groups and 13858 vertices at 68.642)
* modelview matrices (max element difference 1e-4, zero rotation on every column)
* projection matrices (3e-5)
* per-draw colour and alpha, blend enable and both blend factors, depth test and mask
* texture coordinates, per unit, by range on all draws and per vertex where checked
* texture bindings, including that all 300 batched primitives at 18.692 share one
  matrix and one texture pair, so the port's batching into 2x2700 is legitimate
* per-vertex colour arrays (the port emits 1421 distinct colours where the executable
  emits per-vertex `glColor4f`)

`effect_4106a0` still scores 0.448 at that instant. The residual is therefore BELOW the
fixed-function command stream: texture CONTENT, or per-vertex data values that share a
range with the port's. Neither is reachable with the current tools — and note texture
identity by size cannot settle it, because ids are reused: the trace uploads to id 1 at
both 4x4 and 256x256, to id 3 at 4x1 and 256x256, and so on for 74 uploads.

The next tool is a per-vertex and per-texel comparison, not another state differ.

## Texture content is now checkable, and it is correct

`glretrace -D <call>` carries the bound texture itself, not just its parameters: each
entry under `textures` has `__width__`, `__height__`, `__format__` and `__data__`, the
last being a base64 PNG. That closes the gap the pipeline diff could not — texture
identity by size is hopeless here anyway, since ids are reused (74 uploads across ids
that appear at both 4x1 and 256x256, 4x4 and 256x256, and so on).

**Read the rows in reverse.** The dump emits bottom-up, so every extracted texture
appears vertically mirrored. The control that establishes this is the WONDER text
overlay at capture 68.642 (512x256, texture 27), which comes out upside down; without
it, the first comparison below reads as a clean V-flip defect. That would have been the
sixth false lead of the session.

Compared with the rows reversed, `effect_4106a0`'s QuadPatch draw at capture 18.692
matches its assets: unit 0 against `nebulamultip1.jpg` at **1.06** mean absolute
difference per channel, unit 1 against `MAX_t3.jpg` at **0.84**, on a scale where
unrelated images sit near 80. That is JPEG decoder disagreement, not a difference. The
port binds the right images with the right content.

## Wonder's GL state is INHERITED, and the port sets it

At capture 18.692 the executable draws all three of `effect_4106a0`'s scene primitives
with `GL_SRC_ALPHA/GL_ONE`, while the port used `GL_SRC_ALPHA/GL_ONE_MINUS_SRC_ALPHA`
for two of them — `beginning.exp`'s Material #2 is blendMode 0, and `exp-renderer` maps
that to alpha blending. Forcing the effect additive made all eight non-petal draws match
the executable exactly.

**It also made the scores worse**: `effect_4106a0` 0.855 -> 0.838, `effect_40d790`
0.966 -> 0.931, `effect_40de00` 0.830 -> 0.827. Reverted.

The reason is the interesting part. The frame's LAST draw is one of `effect_408ca0`'s
300 petals, every one of them `GL_SRC_ALPHA/GL_ONE`, and the frame's FIRST draw is
`GL_SRC_ALPHA/GL_ONE`. `0x4106a0` never sets a blend function at all — it inherits
whatever the previous draw left. At capture 18.692 that is additive because
`effect_408ca0` is running (it starts at 18.341); earlier in the same clip it is not,
which is exactly why a blanket override helped at one instant and hurt across the sweep.

That the material does not decide this is settled independently by counter-example:
`boxical4.exp`'s material is also blendMode 0, and at capture 68.642 the executable
draws it `GL_SRC_ALPHA/GL_ONE_MINUS_SRC_ALPHA`, which the per-material rule already
reproduces. Same blendMode, two different blend functions, two different effects.

**Consequence for the port.** `exp-renderer` sets blend state per material on every
draw; the executable sets it far more rarely and lets it persist across effects and
across frames. Wherever the inherited value differs from the material's, the port draws
the right geometry with the wrong compositing — right levels, wrong picture, and nothing
in a per-draw state comparison at a single instant will show it, because at THAT instant
the port can be made to match. Reproducing this faithfully means modelling which calls
the executable actually issues, not which state it ends up in. That is a larger change
than a constant, and it is the next real piece of work on this production.

## The bar strip's outer edge was opaque (issue #41)

`effect_40f2f0`'s 64-bar strip fades each bar across its four corners. The two inner
alphas were 1, drawing the far edge FULLY OPAQUE under SRC_ALPHA/ONE_MINUS_SRC_ALPHA and
hiding what the strip exists to reveal. The executable pushes 0.0:

```
0040f5ce  PUSH 0x3f39999a          -> glColor4f(1,1,1,0.725) @ 0040f60a
0040f635  PUSH 0x0 + 0x3f800000 x3 -> glColor4f(1,1,1,0.0)   @ 0040f646
0040f67a  PUSH 0x0 + 0x3f800000 x3 -> glColor4f(1,1,1,0.0)   @ 0040f68b
0040f6a8  PUSH 0x3f39999a          -> glColor4f(1,1,1,0.725)
```

cdecl pushes right to left, so the first PUSH is the alpha argument.

Two characters, and it is the largest single gain of the campaign — because the strip
overlays the whole 44-60s window and was corrupting three parts at once:

| part | before | after |
|---|--:|--:|
| `effect_40ec40` | 0.860 | **0.975** |
| `effect_40f2f0` | 0.860 | **0.975** |
| `effect_410100` | 0.840 | **0.967** |

Median over parts 0.8832 -> **0.9365**; parts below 0.9 from 12 to 9. The observed
sample itself went 0.218 -> 0.682.

Worth noting how it was found: the inspector's layer panel attributed the symptom to
`effect_40f2f0` while the sample was filed under `effect_40ec40`. A composited score
cannot make that attribution, and the fix was in neither part's obvious suspect —
`scene.exp` is loaded by the native constructor and never drawn.

## Wonder never mipmaps — including the raw composite path

`raw-assets.js` passed no `mipmap` option, and BOTH upload helpers default it to **true**,
so every raw texture and composite carried a mip chain. The executable uploads level 0 and
sets only GL_LINEAR/GL_LINEAR, and an apitrace of the whole show contains no `*_MIPMAP_*`
filter anywhere (70 GL_LINEAR + 5 GL_NEAREST across 75 filter calls). Now `mipmap: false`.

**Correcting an earlier entry in this file.** During the draw-stream campaign I checked
`createTextureFromImage` call sites, found `mipmap=false` everywhere, and recorded that
mipmapping was not a Wonder defect. That was incomplete — I never checked the raw
composite path, which is a different function with a different default.

Score effect: none measurable. Kept because it is what the executable does.

## Issue #45 (`effect_40bfa0`, bump card) — everything checkable matches; still open

The symptom is large and obvious: the original's card is white and opaque, ours shows
`bump.jpg`'s photograph through it. Everything that can be compared has been, and all of
it agrees:

* **texEnv enums** — every one of the ~20 `glTexEnvi` calls in `FUN_0040bce0` read out of
  the disassembly and matched against `end.js` token by token, including
  `0x8590 <- 0x300` (SRC_COLOR) and `0x8571 <- 0x2100` (MODULATE).
* **constants** — BUMP_RATE 3.14159275 (0x433470), BUMP_RADIUS 0.005 (0x433468),
  sceneFrame `t*15 + 60` (0x433448/0x433460), all read from `wONDEr.exe`.
* **per-draw state at show 173.2257** (order 21, hold 0.6477) — colour
  (0.5,0.5,0.5,0.6129) vs the port's 0.613, blend SRC_ALPHA/ONE_MINUS_SRC_ALPHA, depth
  off, mask off, lighting off, both units bound to the same 512x256 texture.
* **draw counts** — `[4, 36, 36, 576, 36, 36, 36, 192]` on BOTH sides, exactly.
* **texture data** — the executable's own bound texture, extracted with
  `scratch/extract-exe-texture.sh`, means RGB 104.6/104.6/88.5 and alpha 55.1 against the
  asset's 105.8/104.6/89.6 and `bump.raw`'s mean 55.7. Same image, same height map.

Two hypotheses died on the way:

* **mipmapping.** Plausible — a blurred mip would collapse the emboss difference — but
  the card fills the screen under `ortho(-0.95, 0.95, -1.5, 1.5)`, so the texture is
  MAGNIFIED and mip levels are never sampled. Fixing the mipmap default changed r by
  0.0005.
* **minigl's combine4.** `combine4Rgb` falls through to the 3-source path for MODULATE,
  which looks like a bug but is not: NV_texture_env_combine4 defines MODULATE as
  `Arg0*Arg1`, and the four-term form applies to ADD/ADD_SIGNED. The constant term is
  zero anyway — the executable never sets GL_TEXTURE_ENV_COLOR, so it keeps GL's
  (0,0,0,0) default and `c*d` vanishes.

So the residual is below the command stream, in how the combiner result is actually
rasterised. The reference is a capture of real 1999 NV hardware; our oracle is Mesa
llvmpipe under Wine, which can report STATE faithfully but is not evidence about what an
NV combiner produced. Next step is to compare the executable's own framebuffer at this
instant rather than its command stream — `glretrace` can dump colour buffers, which would
say whether the white is the card or the `end.exp` geometry drawn over it.

## The global fade DAT_004360c4 is NOT the cause of #42/#43

The leading hypothesis was that this process-global alpha multiplier carries across
effects while the port resets `opacityScale` to 1 per render. It does carry — but it is
restored.

Effects that use it save, set per draw, and store 1.0 back: woah3 sets
`1.0 - x` times a constant at 0x00410593/0x004105b8/0x004105dd/0x00410602 and then
`MOV dword ptr [0x004360c4], 0x3f800000` at 0x00410615, unconditionally. The same
restore-to-1 pattern appears at 0x0040c740, 0x0040c977, 0x0040cfce, 0x0040d1c2,
0x0040f1b1 and 0x00410bcb.

woah3 (`effect_410300`) ends at 104.000, exactly where `effect_40fa30` begins, and
nothing between 0x40f2f0 and 0x40fe10 writes the global. So it is 1.0 at both
113.29s (#42) and 131.41s (#43), and the port already matches. Do not build a
state-carrying mechanism for this.

## Issue #40 (bubble env coordinates) — the derivation is right, a per-vertex transform is not

The observation is correct and the target arithmetic is now derived, but the obvious
implementation makes the score WORSE and was reverted. Both facts are worth keeping.

**What the executable does.** `FUN_004097f0` fetches the live modelview
(`glGetFloatv(0xba6)`) and passes it to `FUN_0040a280`, whose tail transforms the
accumulated normal, normalises, and biases into [0,1]. Verified in the assembly, not
just the decompiler:

```
0040a596  FMUL [EAX]      / [EAX+4]    / [EAX+8]    -> x
0040a566  FMUL [EAX+0x10] / [EAX+0x14] / [EAX+0x18] -> y
0040a57a  FMUL [EAX+0x20] / [EAX+0x24] / [EAX+0x28] -> z
0040a5a2  CALL 0x0040a610                            -> normalise
0040a5ad  FADD [0x00433258]  (1.0)
0040a5b8  FMUL [0x004332e4]  (0.5)
```

The byte offsets are consecutive WITHIN each column, so it multiplies by the matrix
columns — the transpose of the 3x3.

**Why a per-vertex version fails.** The two sides build the surface differently, and the
env coordinate is generated at a different stage:

* the executable computes the env UV at each CONTROL POINT — `FUN_0040a280` fills slots
  [3..5] of the 12-float control record, accumulating adjacent face normals first — and
  then `FUN_004098a0` (decompiled.c:7538-7548) **Catmull-Rom interpolates slots 3 and 4**
  across the surface, alongside position (0,1,2) and diffuse UV (6,7). Slot 5 is never
  interpolated, which is why only normal XY is a texcoord.
* the port's `vertex.normal` is a per-vertex GEOMETRIC normal, a normalised cross product
  of finite-difference tangents taken on the ALREADY-interpolated surface
  (`bubble.js:88-103`). It is not the same quantity, and transforming it per vertex
  interpolates a normalised direction rather than interpolating the UV.

Measured on `effect_408ca0`'s own instants (local 1.25 / 5.5 / 11.0 / 17.0 / 21.0):

| variant | mean r |
|---|--:|
| baseline, raw object-space normal | **0.9117** |
| derived, `n . col_k` (transpose) | 0.8968 |
| alternative, `M . n` (rows) | 0.9010 |

Both derived forms are worse than doing nothing, at every instant where the bubble is
visible. (17.0 and 21.0 are identical across all three — the bubble contributes nothing
there.) The composited sample in issue #40 agrees: 0.8164 baseline, 0.7749 and 0.7878.

**So the fix is not one line.** Reproducing this means computing the accumulated normal
at each control point, transforming/normalising/biasing it there, and interpolating the
resulting UV as a fifth channel — a change to `buildWonderBubbleSurface`, not to the draw
loop. Until that is done the raw normal stays, which is wrong but scores better, and it
is marked here rather than silently left as if it were right.

### #40 continued — the executable's own texcoords, measured

Six attempts, every one of them scoring WORSE than doing nothing. The tree is back at
baseline. What the campaign did produce is ground truth for the next attempt, which is
worth more than another guess.

**Measured from the executable's own draw stream** (apt18, capture 18.692 = local 0.268
of `effect_408ca0`; the bubble is the 300 primitives of 18 vertices, 2 x 2700, matching
the port's two passes of 2700):

| pass | s | t |
|---|---|---|
| diffuse (odd primitives) | [0.00000 .. 1.00000] | [0.00000 .. **0.83333**] |
| environment (even primitives) | [0.21476 .. 0.98938] | [**-0.02923** .. 1.02673] |

**CORRECTED 2026-08-21.** An earlier version of this table split the 300 primitives as
"first 150 / last 150" and reported the diffuse V reaching 1.02673. That was wrong: the
two passes **INTERLEAVE per primitive**, so both of those ranges were mixtures. Split by
parity, the diffuse V maxes at 0.83333 — exactly the `5 * float32(1/6)` the instructions
predict — and 1.02673 belongs to the ENVIRONMENT pass.

The consequence matters: the port's diffuse V was correct all along, which is why
stretching it to reach 1.0 was the worst-scoring attempt of the six (-0.1638). A range
taken over the wrong grouping is not a measurement, and this one sent a whole attempt in
the wrong direction. The same lesson as the truncated UV scan, in a new disguise: state
how the population was partitioned, and check the partition.

Two things follow, and they are facts rather than readings:

1. **The env pass is in [0,1], not [-1,1].** The port passes the raw object-space normal,
   so this half of the issue is real and confirmed independently of any disassembly. The
   small over/undershoot on both axes is Catmull-Rom ringing — the signature of
   INTERPOLATING already-biased UVs rather than transforming per vertex.
2. **The diffuse V reaches ~1.0, where the port reaches 5/6 = 0.833.** The port computes
   the vertex UV directly as `(row + rowFraction) * ONE_SIXTH`; the executable
   interpolates control slots [6],[7] (0x004098a0), and its V spans the full range.

**And yet every correction regresses.** Measured on `effect_408ca0`'s own instants
(local 1.2507 / 5.5 / 11.0), summed delta against baseline:

| change | sum delta |
|---|--:|
| per-vertex env transform, `n . col_k` | -0.0447 |
| per-vertex env transform, `M . n` | -0.0400 |
| control-point env UV, interpolated, transpose | -0.0706 |
| control-point env UV, interpolated, rows | -0.0808 |
| control-point env UV, interpolated, negated | -0.0668 |
| diffuse V stretched to [0,1] | -0.1638 |

That paradox is the finding. Making the port's coordinates match the executable's
measured ranges makes the picture score worse, which means the port has compensating
errors elsewhere in this effect, or these samples are dominated by the other layers live
at those instants (`effect_4106a0` to 22s, `effect_4138a0` from 20.341s) and are not a
clean instrument for judging the bubble.

**What is still not derived,** and would be needed before trying again:

* the per-cell face normals at +0x30/+0x3c and which neighbour each of +0x4c/+0x50/+0x54
  denotes. `controlNormals()` in the attempts above summed both triangles of all four
  adjacent quads, which is INFERRED, not derived.
* the conditional negation pass at decompiled.c:7938-7944, which flips those normals
  before accumulation under a condition I did not establish.
* how the executable's diffuse V reaches 1.0 — its control values, not just its range.

The env flag is not the obstacle: `FUN_00409040` sets `+0x198 = 1` (decompiled.c:7121)
before `FUN_004092c0`/`FUN_004097f0`, so the generation definitely runs.

**Recommendation: leave the port as it is until the accumulation is derived rather than
inferred.** A change that is more faithful in one respect and worse in every measurement
is not an improvement, and shipping it would trade a measurable regression for a
narrative one.

### #40 RESOLVED as far as the binary can take it — the face operator is not a cross product

Codex's derivation (session 01a02450) broke the deadlock, and the decisive claim is one I
verified myself at 0x0040a340-0x0040a3a3: **every term is `FMUL .. FMUL .. FADDP`, never
`FSUBP`.** The face records at +0x30/+0x3c are built with a SYMMETRIC additive operator,
not a cross product:

```
B(q, e) = [ -(q.y*e.z + q.z*e.y),  -(q.x*e.z + q.z*e.x),  q.x*e.y + q.y*e.x ]
F3c = B(Q-P, R-P)      F30 = B(Q-P, D-P)
```

Because B is symmetric, swapping operand order cannot flip its sign — winding is
irrelevant here. The sign comes from four UNCONDITIONAL negations at
0x0040a3a6-0x0040a3e2 on X and Y of both records; Z is untouched. The "conditional
negation" I read into decompiled.c:7938-7944 does not exist.

That is why all five earlier environment attempts regressed: they fed conventional
triangle cross products into a path that never used one.

The accumulation is six terms, with self-substitution wherever a lattice pointer is null
(+0x58 next column wrapped, +0x54 previous column, +0x50 next row null on row 5, +0x4c
previous row null on row 0):

```
N(r,c) = F30(r,c) + F3c(r,c) + F30(U) + F3c(D) + F30(UL) + F3c(UL)
U = (max(r-1,0), c)    D = (min(r+1,5), c)    UL = (max(r-1,0), (c-1) mod 6)
```

**Confirmed by measurement, not by reading.** Implemented, the env S range reproduces the
executable's EXACTLY — [0.21476 .. 0.98938], both bounds to five decimals — and the
diffuse range matches exactly too. A variant search over the accumulation terms is
decisive: every alternative reading (4th term from the left column, UL pair on the same
row, 3rd term from the row below) breaks S; only this one holds it.

Remaining gap: env T is [-0.02057 .. 1.01769] against the measured [-0.02923 .. 1.02673],
short by ~0.009 at both ends. Not precision — storing the face records and the
accumulator as float32, as the executable does, changes nothing. Since S is exact and T
is not, the residual is specific rather than general, and it is small enough that it is
the last open detail rather than a blocker.

**Score effect: essentially neutral** — `effect_408ca0` 0.870 -> 0.865, `effect_4138a0`
0.883 -> 0.882, production medianR unchanged at 0.9365 and parts below 0.9 unchanged at
9. Issue #40's own sample improves, 0.8164 -> 0.8296.

Kept, on the rule that the binary is the source of truth: this replaces a demonstrably
wrong quantity — the raw object-space normal in [-1,1], which has no counterpart in the
original at all — with one that reproduces the executable's own submitted coordinates to
five decimals. Three earlier instants suggested -0.15, but they were unrepresentative of
the part, let alone the production.
