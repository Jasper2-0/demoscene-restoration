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

The ramp is exact multiples of **1/16** — a per-instance depth fade over ~15 copies.
The port's 2160 is exactly `5 x 432`, so the geometry is right and five instances are
being **batched into one draw, discarding the per-instance colour**. Vertex-exactness
hid this completely; only the colour channel exposes it.

**This is why the draw-stream oracle needed colour.** Geometry alone reported
`effect_40b040` as perfect.
