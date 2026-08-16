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

**Geometry.** Opcode byte, then operands. Widths from the handlers:
`op0` 6 or 8 (8 when both leading halfwords have bit 15 clear), `op1`
`2+6·popcount(b1&7)`, `op2` fixed 3 (with an *unaligned* halfword at `r31+1`,
which is why stream pointers are often odd), `op3` `3+6·`(nonzero 2-bit groups),
`op4` `2+8n`. **`op0` and `op4` additionally call a shared prologue**
`FUN_100030f8` which consumes 8 more bytes minimum — it has seven `addi r31,r31,n`
sites (8, 4, 6, 6, 6, 2, 2) selected by its flags byte, so 8–34 total. Modelling
that prologue's control flow is the one thing still standing between here and a
full geometry decode.

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

## Tools here

| file | what |
|---|---|
| `hunkload.py` | Hunk parser + relocator → flat images, `symbols.csv`, `layout.txt` |
| `ppcrun.py` | hand-built PPC ELF; runs the pure subsystems under `qemu-ppc-static` |
| `rendertex.py` | every texture program → PNG + contact sheet |
| `PPLoad.java` | Ghidra: load segments, apply symbols, decompile the named functions |
| `PPVm.java` | Ghidra: pin `r2`, name the VM handlers, decompile them |

```sh
python3 hunkload.py planet-potion_dcr.exe flat/
python3 rendertex.py flat/ tex/
$GHIDRA/support/analyzeHeadless proj pp -import flat/seg0_CODE_10000000.bin \
    -processor PowerPC:BE:32:default -loader BinaryLoader \
    -loader-baseAddr 0x10000000 -postScript PPVm.java $PWD/flat
```
