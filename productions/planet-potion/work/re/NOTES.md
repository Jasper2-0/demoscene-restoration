# Planet Potion — recovered structure

Addresses are as laid out by `hunkload.py` (seg *n* at `0x10000000 + n·0x10000`,
rounded up). Narrative and reasoning live in
[`docs/PLANET_POTION_FEASIBILITY.md`](../../../../docs/PLANET_POTION_FEASIBILITY.md);
this file is the address notebook.

## Layout

| seg | kind | size | contents |
|---|---|---|---|
| 0 | CODE | 46,960 | 68K bootstrap, all the PPC code, globals, float pool |
| 1 | DATA | 16,960 | an embedded Hunk executable: `dbplayer.library 2.0 (16.8.98)` |
| 2 | DATA | 2,048 | table, entropy 2.99 |
| 3 | DATA | 12,796 | **part one's** scene / texture / geometry programs |
| 4 | DATA | 52,500 | **part three's** programs (28%) + softsynth data (~72%) |
| 5 | BSS | 513,248 | |
| 6 | BSS | 17,766,496 | runtime arenas; the texture buffers live here |

```
seg0 + 0x0000 .. 0x0350   68K bootstrap (LEA $7FFE,A4; OpenLibrary xN)
seg0 + 0x035c             _W3D_ContextTag — Warp3D TagItem list
seg0 + 0x0404 .. 0xa334   PowerPC, 40,752 bytes
seg0 + 0xa334 .. 0xb770   globals, then a float-literal constant pool
```

**`r2 = seg0 + 0x7FFE`** — the small-data base, biased by −2 exactly as the 68K
stub's `LEA $00007FFE,A4`. Pin it in Ghidra (`ProgramContext.setValue`) before
analysis or half the output stays unreadable. 1,138 references over 482
displacements, 260 landing on a recovered symbol.

`_Warp3DBase + 2` is likewise held in `r30`/`r31`, so a vector fetch
`lwz rX, -N(r31)` means LVO `N-2`.

## The five dispatch tables

| table | at | slots | handlers | language |
|---|---|---|---|---|
| texture | `0x1000a47c` | 20 | 17 | ops inside `_generate` |
| scene | `0x1000a8a8` | 7 | 7 | ops 0–6; op 7 is the inline root |
| geometry build | `0x1000a9b0` | 5 | 5 | construct pass |
| geometry eval | `0x1000a9c4` | 5 | 5 | evaluate pass |
| render | `0x1000aa20` | 7 | 6 | draw-node types |

Supporting tables: scene node sizes `0x1000a8c8` (u16 ×8), geometry node sizes
`0x1000a9d8` (u8: 28, 64, 32, 76, 32), texture operand counts `0x1000a500`
(u8; first 19 are 3, 20, 13, 12, 1, 10, 12, 9, 18, 12, 1, 1, 1, 1, 1, 1, 127,
3, 4 — 127 is special-cased to 1).

## Program tables (all `0xFFFFFFFF`-terminated)

| part | kind | table | n | bytes | consumer |
|---|---|---|---|---|---|
| 1 | scenes | `r2+0x25aa` | 18 | 6,134 | `_generate_scene` |
| 1 | textures | `r2+0x2642` | 48 | 2,780 | `_generate` |
| 1 | geometry | `r2+0x2706` | 28 | 3,881 | `_generate_obj` |
| 3 | scenes | `r2+0x277a` | 11 | 13,268 | `_generate_scene` |
| 3 | textures | `r2+0x27a6` | 21 | 765 | `_generate` |
| 3 | geometry | `r2+0x27fe` | 11 | 680 | `_generate_obj` |

seg 3 is 99% accounted for (12,795 of 12,796). The rest of seg 4 is audio,
reached from `r2+0x2f02`, `r2+0x2f0e` and `r2+0x372a`.

`_play_part_1` loads its 18 scene slots **out of order** — `0x25d2`, `0x25aa`,
`0x25ba`, `0x25ce`, `0x25ae`, `0x25b2`, … — and that sequence is part one's
running order, readable straight from the code.

## Container format

Every program in every language:

```
  u16  length in BYTES of what follows   (bit 15 = a flag; 76/76 of part one's
                                          programs tile seg3 back-to-back with
                                          no gaps using this rule)
  ...  opcode stream
```

**Textures.** 128×128, ARGB, Warp3D format 6. Opcode byte, then operands.
`0x50..0x78` (41 values) all route to one handler at `0x10000f58` — a family
parameterised by opcode, not 41 routines. Colour math is normalised: the
prologue builds 1.0 as 255/255, 0.0 as 255−255, and 128/255.

**Scenes.** u16 length, then single opcode bytes; bit 7 is a flag stored at
node+0x0e, bits 0–6 the opcode. The first opcode is **implicit and is 7**, which
is why payloads begin `5B FF 0F xx 80 00` and that is *not* a magic number. The
low bits of an operand byte index `param_3`/`param_4`, which are built at
runtime in seg 6 — so scene streams cannot be decoded statically.

**Geometry.** Opcode byte, then operands — but **do not try to model the
widths**. Three attempts failed and the reason is instructive:

* the five build handlers' own reads give `op0` 6-or-8, `op1` `2+6·popcount`,
  `op2` fixed 3 (with an *unaligned* halfword at `r31+1`, which is why stream
  pointers are often odd), `op3` `3+6·`(nonzero 2-bit groups), `op4` `2+8n`;
* `op0` and `op4` additionally call a shared prologue `FUN_100030f8` with seven
  conditional `addi r31,r31,n` sites;
* that prologue indexes a table in **BSS, built at runtime**, so its consumption
  is not a function of the stream alone. Measured on synthetic input it consumes
  26–32 bytes; on real streams, 12–18 — and the same flags byte gives different
  answers in different programs.

`rungeo.py` sidesteps all of it. Run `_generate_obj` itself under qemu with
`_Warp3DBase` pointed at a table of no-op vectors, and read back the linked list
it builds — opcode·4 at node+0x10, next at node+0x14. **38 of the 39 programs
decode this way.** Measurement beats modelling here, and the harness makes it
cheap.

Result: opcode counts across the shipped data are **op0 ×62, op3 ×56, op4 ×24 —
and opcodes 1 and 2 are never used at all.** 17 distinct shapes; the commonest
are `[4]`, `[0]`, `[4,3,3]`, `[0,0]`. A port needs three of the five handlers.

## Warp3D surface — 22 functions, 29 sites

Named against ReWarp3DPPC's `VecTable68K[]` (LGPL-3.0, github.com/Sakura-IT),
where index 4 is `W3D_CreateContext` at LVO −30, so `LVO = −6·(index+1)`.

| group | functions |
|---|---|
| context | `CreateContext` `DestroyContext` `SetDrawRegion`×2 `ClearDrawRegion` `LockHardware` `UnLockHardware` `WaitIdle` `Hint` |
| state | `SetState` `SetBlendMode` `SetFogParams`×2 `SetZCompareMode` |
| z-buffer | `AllocZBuffer` `FreeZBuffer` `ClearZBuffer`×2 `ReadZPixel` |
| texture | `AllocTexObj` `UploadTexture` `SetFilter` `FreeTexObj` |
| draw | **`DrawTriFan`×4, `DrawLineStrip`×2 — nothing else** |

### The render state, resolved

Every argument is an immediate, and every constant is now named against the
original `warp3d.h` (©1998 Sam Jordan / Hans-Jörg & Thomas Frieden, `$VER 1.0
20.05.98`), mirrored at github.com/RobDangerous/QuarkTex, plus the Warp3D
autodocs at wiki.amigaos.net.

`W3D_SetState(ctx, state, action)` — `action` 1 = `W3D_ENABLE`, 2 = `W3D_DISABLE`:

| bit | name | at init | during |
|---|---|---|---|
| 4 | `W3D_SYNCHRON` | disabled | |
| 256 | `W3D_TEXMAPPING` | **enabled** | |
| 512 | `W3D_PERSPECTIVE` | **enabled** | |
| 1024 | `W3D_GOURAUD` | **enabled** | |
| 2048 | `W3D_ZBUFFER` | disabled | toggled per frame by `_show_scene` |
| 4096 | `W3D_ZBUFFERUPDATE` | disabled | toggled per frame by `_show_scene` |
| 8192 | `W3D_BLENDING` | **enabled** | |
| 16384 | `W3D_FOGGING` | disabled | toggled per scene by `_play_part_1` |

```
  W3D_SetBlendMode    (ctx, W3D_SRC_ALPHA, W3D_ONE_MINUS_SRC_ALPHA)  -- 7, 8
  W3D_SetZCompareMode (ctx, W3D_Z_GEQUAL)                            -- 3
  W3D_SetFogParams    (ctx, &_fog, W3D_FOG_LINEAR)                   -- 1
  W3D_Hint            (ctx, W3D_H_ZBUFFER, W3D_H_FAST)               -- 10, 1
```

`W3D_Z_GEQUAL` is not a mistake: Warp3D's depth is **reversed** — the autodocs
put Z in w-space with **1.0 at the front plane and 0.0 at the back**, so "greater
or equal" means "nearer". In WebGL2 that is `gl.depthFunc(gl.GEQUAL)` with a
reversed depth range and clear, or invert the values.

Texture creation: `W3D_ATO_TAGS = TAG_USER+0x201000` = `0x80201000`, so the four
tags observed are `W3D_ATO_IMAGE`, `W3D_ATO_FORMAT`, `W3D_ATO_WIDTH`,
`W3D_ATO_HEIGHT`. **Format 6 is `W3D_A8R8G8B8`** — which independently confirms
the harness output, whose first pixel reads `ff616161`: A=0xff, R=G=B=0x61.

Context creation: `W3D_CC_TAGS = TAG_USER+0x200000` = `0x80200000`; tags 0, 1, 2,
6, 7 are `W3D_CC_BITMAP`, `W3D_CC_YOFFSET`, `W3D_CC_DRIVERTYPE`,
`W3D_CC_DOUBLEHEIGHT`, `W3D_CC_FAST`.

### Fog is per-scene data, not a constant — and the struct order matters

`W3D_Fog` is **24 bytes, ordered `start, end, density, colour[3]`** — not
density-first. That correction came from the header, and the binary then settled
it independently and corrected *both* earlier readings.

The static bytes at `_fog` (`0x1000a848`) are `{0, 0, 1.0, 0, 0, 0}`, which under
the true order is `start=0, end=0, density=1.0` — degenerate for linear fog, and
a clue that they are placeholders. They are: a setter at `0x100016e8` writes the
struct at run time from a 5-float record —

```c
void set_fog(float *p) {          /* p = 5 floats */
    _fog.start = p[0];            /* +0x00 */
    _fog.end   = p[1];            /* +0x04 */
    /*  +0x08 = density: NEVER written, stays 1.0, unused by LINEAR fog  */
    _fog.r     = p[2];            /* +0x0c */
    _fog.g     = p[3];            /* +0x10 */
    _fog.b     = p[4];            /* +0x14 */
    W3D_SetFogParams(ctx, &_fog, W3D_FOG_LINEAR);
}
```

**The skipped word is the proof.** The setter writes `+0x00`, `+0x04`, then jumps
to `+0x0c` — skipping exactly the slot where `density` sits, because
`W3D_FOG_LINEAR` does not use it. Under the other field order the gap would fall
in the wrong place.

`_play_part_1` calls it four times with four presets, 20 bytes apart:

| preset | at | start | end | colour |
|---|---|---|---|---|
| 0 | `r2+0x25f2` | 0.001111 | 0.0007692 | black |
| 1 | `r2+0x2606` | 0.001667 | 0.001 | **(0.2, 0.5, 1.0)** — blue |
| 2 | `r2+0x261a` | 0.0002857 | 0.00025 | black |
| 3 | `r2+0x262e` | 0.0002857 | 0.00025 | black |

`start > end` in all four, which is what the reversed w-space convention
requires. Preset 1's blue fog matches the blue-tinted texture set.

### Driver behaviour, for the port

From Permedia 2 / GLINT documentation and the Hyperion Permedia2 driver notes:

- **Bilinear is real.** Permedia 2 has a genuine bilinear filter (unlike the
  original Permedia, whose "bilinear" was a crossfade fake). `documented`
- **No mipmapping in this path.** The silicon can mip, slowly, but the Warp3D
  Permedia2 driver exposed only `W3D_LINEAR`. `documented`
- **Fog is per-vertex, interpolated across the primitive** — not per-pixel
  exponential. The driver fakes linear fogging through interpolation. This is the
  single most port-relevant item here. `documented`
- **A8R8G8B8 uploads unconverted** to a direct-colour target; dithering only
  applies when the framebuffer is 15/16-bit. `documented`
- **`W3D_ReadZPixel` returns a `W3D_Double` normalised to [0..1]**, requires the
  hardware to be locked, and the autodoc says outright it "is slow and should
  normally not be called" — a synchronous stall, as suspected. `documented`

Still `unknown`, and only a capture will settle them: the triangle fill /
top-left tie-break rule, whether the blender clamps or wraps on overflow, and the
raw Z read-back encoding before the driver normalises it.

No `SetTexEnv`, no `SetWrapMode`: both left at defaults. Every polygon is a
triangle fan. `ReadZPixel` appears once, in render slot 4's handler, after a
four-way float bounds test and before a `DrawTriFan` — an occlusion-tested
screen-space element. It is the only readback in the intro and the only call
that does not map cleanly onto WebGL2.

## Fully decoded

**The font.** `_init_scene_generate` (96 bytes) is a `0xFF`-terminated unpacker
turning 5-byte records into 20-byte ones with `int2float` on four fields. Source
at `seg0+0xa8e4`: 40 glyphs of `(ASCII, x, y, w, h)` in a 128×113 atlas,
proportional (`m`/`w` 28 wide, `i` 8, `l` 10, `1` 13). Two shipped quirks the
port must reproduce: `'0'` appears **twice**, and `'v'` shares `'w'`'s exact
rectangle, so `v` renders as `w`.

**All 69 textures**, byte-exactly, via `ppcrun.py` + `rendertex.py`. 66 carry
varied content; 3 are a single uniform colour.

**All 38 decodable geometry programs**, via `rungeo.py`.

**Both music modules**, via `runsynth.py`. The generators take their destination
in **r5** (`_music_buffer`); miss that and they segfault in a way that looks like
a missing dependency. What they emit is not raw sample data but a complete
**DBM0 (DigiBooster Pro 2) module** — magic four bytes in, then `NAME`, `INFO`,
`SONG`, `INST`, `VENV`, `DSPE`, `PATT`, `SMPL`. Afterwards the demo points
`_module` at the same buffer and hands it to `dbplayer.library` through
`_run68k`.

| | name | instruments | patterns | channels | INST | VENV | PATT | SMPL |
|---|---|---|---|---|---|---|---|---|
| part 1 | `"part1"` | 56 | 19 | 18 | 2,800 | 274 | 14,574 | 5,306,496 |
| part 3 | `"part3"` | 38 | 17 | 16 | 1,900 | 546 | 9,978 | 3,002,748 |

Total module sizes: **part 1 ≈ 5,324,890 bytes, part 3 = 3,015,404**. The part-one
figure is confirmed twice over — the chunk walk gives it, and
`_generate_samples_part1` *opens* by loading the immediate `0x513e5a`, which is
5,324,890: the function states the size of the module it is about to build in its
first two instructions.

`DSPE` is DigiBooster Pro 2's DSP-effect chunk (28 and 26 bytes). Roughly 37 KB
of seed data in seg 4 expands to about 3 MB of module per part.

**A port therefore needs a DBM0 replayer plus these two generators** — and the
generators now run byte-exactly without an Amiga.

### DBM0 details, measured against the official spec

The format is documented — "DBM0 Format Specification 1.4", digibooster.de — and
the generated modules answer several things the spec leaves to the file.

**The four bytes before `DBM0` are the generator's own framing, not the format.**
`DBM0` sits at offset 0 *of the module*, exactly as the spec says. What precedes
it is a **u32 length prefix carrying the module size**: `0x513e5a` = 5,324,378
for part 1, `0x2e02ec` = 3,015,404 for part 3 — and the part-1 value is precisely
the immediate `_generate_samples_part1` loads in its first two instructions. So
the buffer layout is `[u32 size][DBM0 module]`. Do not build a parser around
`DBM0` at offset 4.

**Header:** version/revision reads `0x0221` — BCD **2.21**, which is the version
DigiBooster Pro 2 development stopped at. The reserved word is `0xfc18` rather
than 0; the spec says DigiBooster 3 always writes 0 there, so this is either a
DBPro-2-era artifact or the generator not clearing it. Harmless, but a parser
should not assert on it.

**Chunk order is `NAME, INFO, SONG, INST, VENV, DSPE, PATT, SMPL`** — not the
traditional save order, but legal: the loader only requires `INFO` before
`SONG`/`INST`/`PATT`/`SMPL`. Key off chunk IDs, never position.

**No `PENV` in either module.** The generator emits no panning envelopes, so the
DBPro2-vs-DBPro3 panning-range difference (0…64 vs −128…128) does not arise here.

**Samples are 8-bit.** Walking part 3's `SMPL`: **36 of 38 samples are one byte
per frame**, two are empty. DigiBooster 3 converts everything to 16-bit on load,
so it would have been easy to assume 16 — these are genuine DBPro-2-era 8-bit
samples. Length fields count **frames**, not bytes.

### The DSPE chunk — layout confirmed, parameters read

Predicted layout `2 + N + 8` bytes (channel count, per-channel enables, four
global u16s) matches both modules exactly, and the contents confirm it:

| | size | channels | per-channel enables | delay | feedback | wet/dry | cross |
|---|---|---|---|---|---|---|---|
| part 1 | 28 | 18 | `010100000000000000000101000000000101` | 215 | 120 | 128 | 255 |
| part 3 | 26 | 16 | `00010101010000000000000000000101` | 235 | 96 | 105 | 255 |

Two things fall out. The echo is **not global** — it is enabled on a handful of
channels per module, in bursts. And **cross-echo is 255 in both**, which per the
OpenMPT documentation is full left/right ping-pong. That is an audible, specific
character, not a subtle tail, so **the DSP echo is mandatory for the port**, not
deferrable.

Reproduce the documented original bug with it: a delay parameter of 0 yields
~334 ms rather than the minimum. Neither module uses 0 (215 and 235), so it does
not bite here — but a port that reimplements the parameter mapping should still
get the curve right.

The reference implementation to port from is libopenmpt's `Load_dbm.cpp` plus its
DigiBooster Pro Echo plugin (BSD). UADE running the real `dbplayer` is the
byte-exact ground truth if an A/B is ever needed.

### The LVO table — CONFIRMED against the shipped library

This was the project's last single-sourced dependency: every Warp3D name here
rested on ReWarp3DPPC's `VecTable68K[]`, and a scrambled ordering would not have
surfaced until very late. Two rounds of research could not find an independent
numeric table. The Aminet Warp3D **user distributions** settle it instead — not
via a header, but from the real `Warp3DPPC.library` itself, which is the exact
library Planet Potion links against.

`lvo.py` recovers it. An `RTF_AUTOINIT` library carries a Resident whose
`rt_Init` points at `{dSize, vectors, structure, initFunc}`; `vectors` is the
table `MakeLibrary` turns into the jump table, in canonical order from LVO −6.

```
Warp3DPPC.library 4.2 (13-Jul-01)   ROMTag @ +0x04, RTF_AUTOINIT   88 vectors
Warp3D.library    4.2               88 vectors
Warp3DPPC.library 4.0 (01-Apr-01)   88 vectors
Warp3D.library    4.0               88 vectors
```

**88 across all four builds**, and ReWarp3DPPC's table is 88 entries plus a
`(CONST_APTR)-1` sentinel. The counts agree.

The ordering is confirmed behaviourally, which is stronger. The library has no
symbols and embeds no function-name strings, so names cannot be read out —
but Warp3D has **exactly four functions that take TagItem lists**
(`CreateContext`, `AllocTexObj`, `RequestMode`, `BestModeID`), and scanning all
88 vectors for `lis rX, 0x8020` — how PPC materialises the `TAG_USER+0x20xxxx`
tag bases — hits **exactly four**:

| idx | LVO | ReWarp3DPPC's name | takes tags |
|---|---|---|---|
| 4 | −30 | `W3D_CreateContext` | `W3D_CC_*` |
| 15 | −96 | `W3D_AllocTexObj` | `W3D_ATO_*` |
| 69 | −420 | `W3D_RequestMode` | `W3D_SMR_*` |
| 80 | −486 | `W3D_BestModeID` | `W3D_BMI_*` |

Four for four, from indices near the start, the middle and the end of the table,
derived from the real binary with no reference to the reimplementation. A
scrambled ordering that happened to place all four tag-taking functions on
exactly the four tag-using vectors is not a plausible coincidence.

Together with the count match and the intro's own coherence — the author's thunk
names *setstate*/*lock*/*unlock* landing on `SetState`/`LockHardware`/
`UnLockHardware`, and the texture calls clustering in `_alloc_txt` — **the seven
spot-check offsets and the table they come from are confirmed.** The 22 renderer
names in this document are no longer provisional.

The Warp3D archives are copyrighted redistributables and stay out of this
repository; only `lvo.py` and this note are committed. Their hashes:

```
Warp3D-4.0.lha   a1da7fd863dd69c667f7d1f1bd07a4c80df985f600741acb505732cb30183df7
Warp3D-4.2a.lha  68a18bc7b20f0b47b1401855c0e0021604e0be18a4cbf9b86780fbf9d692ff77
```

## Texture opcodes — first pass

`texops.py` synthesises one-opcode programs (`[u16 len][op][operands]`, operand
count from the table at `0x1000a500`) and renders each with operands all `0x00`
and all `0x40`. Eight of the twenty show observable behaviour from a single call;
the rest need state a prior opcode would have set.

| op | operands | observed with a single call |
|---|---|---|
| 1 | 20 | two colours — a pattern generator |
| 2, 3, 5, 17 | 13, 12, 10, 3 | uniform fill, value tracking the operands (`op3` loops forever on all-zero operands) |
| 6 | 12 | two colours — a pattern generator |
| **9** | 12 | **noise / turbulence — 3,607 distinct colours, vertical banding.** The only op that fills the surface with detail on its own |
| 12 | 1 | uniform grey; `0x00`→`0x80`, `0x40`→`0x40`, i.e. `128 − operand` |
| 13 | 1 | drives **alpha** to 0 |
| 14, 15 | 1 | set **alpha** = `127 + operand`; the two behave identically |
| 0, 4, 7, 8, 10, 11, 16, 18, 19 | | no visible effect alone |

`op19` takes zero operands. `op16`'s table entry is `127`, special-cased to 1 in
the dispatch. Opcodes `0x50..0x78` are outside this table entirely and all route
to the single parameterised handler at `0x10000f58`.

## Tools here

| file | what |
|---|---|
| `hunkload.py` | Hunk parser + relocator → flat images, `symbols.csv`, `layout.txt` |
| `ppcrun.py` | hand-built PPC ELF; runs the pure subsystems under `qemu-ppc-static` |
| `rendertex.py` | every texture program → PNG + contact sheet |
| `rungeo.py` | runs `_generate_obj` with Warp3D stubbed; dumps the decoded node list |
| `texops.py` | one-opcode texture programs, for naming the texture ops |
| `PPLoad.java` | Ghidra: load segments, apply symbols, decompile the named functions |
| `PPVm.java` | Ghidra: pin `r2`, name the VM handlers, decompile them |

```sh
python3 hunkload.py planet-potion_dcr.exe flat/
python3 rendertex.py flat/ tex/
$GHIDRA/support/analyzeHeadless proj pp -import flat/seg0_CODE_10000000.bin \
    -processor PowerPC:BE:32:default -loader BinaryLoader \
    -loader-baseAddr 0x10000000 -postScript PPVm.java $PWD/flat
```
