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

## The port submits geometry the original rejects (2026-08-20)

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

**Two live hypotheses, and they are not distinguished yet:**

1. **Rejection.** The original submits a subset of the same triangles; the port
   submits all of them.
2. **Morphing.** The original submits DIFFERENT geometry per instance and the
   port draws the base mesh unchanged — a missing-animation bug, not a missing-
   culling one.

Both fit 2496 / 2421 / 2346 / 2298 against the port's 3468 four times. The
"identical 3468" that seemed to prove one mesh proves only that THE PORT treats
them as one mesh, which is the thing in question.

**The decidable test**: apitrace records actual `glVertex3fv` VALUES, where
`WINEDEBUG=+opengl` logs only the pointer. Record the four instances and compare
positions — same positions with some absent means rejection; different positions
means morphing. Do this before writing any code.

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
