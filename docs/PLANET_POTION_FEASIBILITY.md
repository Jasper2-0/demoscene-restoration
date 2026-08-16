# Planet Potion (Potion, 2002) — port feasibility

An evidence study, not a plan of record. Everything below was measured from the
release archive in a single session; nothing is inferred from what the intro
looks like, because nobody in this session has seen it run.

**Verdict up front: this is a substantially easier target than Wonder or
Energia, and the reason is that the shipped binary still has its symbol table.**
The framing of "software archaeology" is the right instinct for a 2002 PPC/RTG
64K, but it is wrong for *this* one. The decrunched executable names 38 of its
own functions, and those names describe the whole architecture. The expensive
part of a restoration — working out what the parts *are* — is largely already
done by the author's own linker.

## Provenance

```
potionplanet_potion.lha   afe6b6eb985b69ee9b0b12d209f86e3247412411e5f7b9e053ddb1303c73b253
  planet-potion.exe        65,288  6140e5d773be67cf720d4daa3ee3133230842bb7ce700dc9750426fa559da48b
  planet-potion.txt           445  31fb33197d5a6f3715edc0d6371654a8f5467541b8de63391923bcfd8fdb49a9
  planet-potion_dcr.exe   138,280  51e62978e6d472a5c6c84f28ffd51239ed888bbd3e04ab40597a9bdc62ac1c99
```

`planet-potion.txt` credits main code to *mavey*, gfx *nelson*, music
*skipp604*, 3d *rem*, additional code *diamond*, and states the requirement:
"an Amiga with PowerPC and accelerated graphics card".

Work all of it from `_dcr.exe`. The 65K release is a 68K depacker plus one
blob; the cruncher is a distraction and can stay unsolved forever.

## What the binary actually is

Both files are AmigaOS Hunk (`HUNK_HEADER`, `0x000003F3`) — **not** ELF. That
single fact settles the runtime: PowerUP loads PPC ELF objects through
`ppc.library`, and this opens **`powerpc.library`**. So it is **WarpOS**, and
the RE tooling has to follow that fork.

`hunktool` reads it directly; the seven segments, all `MEMF_FAST`:

| seg | kind | size | note |
|---|---|---|---|
| 0 | CODE | 46,960 | 68K bootstrap + **all** the PPC code + constants |
| 1 | DATA | 16,960 | an entire embedded AmigaOS library (below) |
| 2 | DATA | 2,048 | low entropy (2.99) — a table |
| 3 | DATA | 12,796 | entropy 4.69 |
| 4 | DATA | 52,500 | entropy 5.25 — the bulk of the baked data |
| 5 | BSS | 513,248 | |
| 6 | BSS | 17,766,496 | ~17 MB of runtime scratch |

252 `HUNK_RELOC32` fixups, all in seg 0. **327 `HUNK_SYMBOL` entries.**

A 100-line Python hunk loader that lays the segments at fixed bases and applies
the relocs is a better investment than fighting a generic Hunk importer — it
took minutes to write and it feeds Ghidra a flat image plus a symbol CSV. That
loader exists now and is the concrete day-one deliverable.

### The ISA split

A word-by-word decode says exactly where the boundary is:

```
seg0 + 0x0000 .. 0x0350   68K bootstrap — LEA $7FFE,A4; ExecBase; OpenLibrary xN
seg0 + 0x035c             _W3D_ContextTag (data, a Warp3D TagItem list)
seg0 + 0x0404 .. 0xa334   PowerPC — 40,752 bytes (39.8 KB)
seg0 + 0xa334 .. 0xb770   globals, then a float-literal constant pool
```

**Correction.** An earlier pass here put the code at "0x0404..~0x7000, ~27 KB".
That was wrong, and the way it was wrong is worth recording because the same
mistake is easy to repeat: the figure came from a *linear* capstone sweep, which
stops at the first word that is not a valid instruction, and the stopping point
was read as the end of the code. Decoding each word independently instead shows
every 2 KB block from `0x0800` to `0x9fff` valid at 99–100%, and the highest `bl`
target in the binary is `0xa2f0` — just under `_SysBase`. The real figure is
**40 KB**, and 12,852 bytes had gone unscanned.

Everything derived from the short range was re-run over the full one. The Warp3D
surface is **unchanged** — still 22 distinct functions over 29 sites, with no W3D
call anywhere in the missed region. The global counts were understated and are
corrected below.

Every PPC function opens with the same compiler prologue
(`mflr r0; stw r0,8(r1); mfcr r0; stw r0,4(r1); stw r13,-4(r1); addi r13,r1,-4`),
and 195 of the 327 symbols are auto-named float literals (`__0_70710678`,
`__pi`, `__0_0083333`). This is **compiled C, not hand-written assembly** — the
constants are handed over verbatim, and the compiler even tells you which ones
mattered.

**40 KB of compiled PPC C is the entire intro**, and a third of that is the
softsynth (below). That is the number that decides feasibility.

### The small-data base, and why it matters

The 68K stub opens `LEA $00007FFE,A4` — the classic Amiga small-data base, at
`+0x7FFE` rather than `+0x8000`. The PPC side mirrors it in `r2`. Testing
`r2 = seg0+0x7FFE` against the symbol table hits **4 of 4** probes exactly
(`_context`, `timer`, `__exit`, `_next_effect`), where `+0x8000` hits 0 of 4.

That one constant turns every `r2 + disp` in the decompilation into a named
global: **1,138 references over 482 distinct displacements, 260 of them landing
exactly on a recovered name**. The remaining 222 are un-named BSS and are the
natural first naming backlog.

## The architecture, from the names and the decompiler

Ghidra imports the relocated image as `PowerPC:BE:32` and decompiles it
readably. Four functions tell the story.

```c
void _main(void) {
    init();  _play_part_1();
    if (__exit != 1) _play_part_3();
    cleanup();
}

void _play_scene(void) {                       // and _play_scene_dalej, the "next" variant
    sync();
    _next_effect = 0;
    buf   = set_alloc_buffer(...);
    scene = _generate_scene(buf, ...);
    do {
        sync();
        _calc_matrix(timer, scene);
        _show_scene(scene);
        rmb_mouse();                           // right mouse button exits
    } while (!done);
}
```

That is precisely the

```
procedural generator → scene state → transform → rasterise → framebuffer
```

shape, confirmed rather than hoped for, and the loop is four calls wide.
(`dalej` is Polish for "onward" — consistent with Potion being a Polish group.)

### There is a scene VM, and it is tiny

`_generate_obj` is the find. Cleaned up, it is a **bytecode interpreter**:

```c
int _generate_obj(ushort *prog) {
    end  = (byte*)(prog + 1) + *prog;          // length-prefixed opcode stream
    node = 0;
    while (1) {
        op = *pc++;                            // one-byte opcode
        if (end < pc) break;
        n = alloc_mem(size_table[op]);         // per-opcode node size
        if (node) node->next = n;              // build a linked list
        n->op = op * 4;
        (*build_table[op])();                  // dispatch #1: construct
        node = n;
    }
    for (n = head; n; n = n->next)
        (*eval_table[n->op])(x);               // dispatch #2: evaluate
    return head;
}
```

Two dispatch tables, `0x14` bytes apart in the small-data area. **The tables have
now been read, and the language is bounded at exactly five opcodes** — not
inferred from the gap but from the data either side of it: `build[5]` is
byte-identical to `eval[0]` because the tables abut, and `eval[5]` reads as
`0x1c40204c`, which is the first four bytes of the size table (28, 64, 32, 76)
misread as a pointer.

```
build table @ 0x1000a9b0   eval table @ 0x1000a9c4   size table @ 0x1000a9d8
  op  node size   build handler        eval handler
   0     28       0x100048b8  676 B    0x10004d8c    4 B   (return;)
   1     64       0x10004b5c  200 B    0x10004d90   80 B
   2     32       0x10004c24   64 B    0x10004de0  132 B
   3     76       0x10004c64  136 B    0x10004e64  168 B
   4     32       0x10004cec  160 B    0x10004d8c    4 B   (return;)
```

**The entire geometry language is 1,620 bytes of PPC code.** Two of the five
opcodes have no evaluate phase at all — their eval slot points at a bare `blr`.
One opcode, `op0`, is two fifths of the whole thing.

None of these nine functions is in the symbol table; they are file-local statics
between `_generate_obj` and `_calc_matrix` that the linker did not export.

#### A trick that pays for itself

Ghidra shows the tables as `PTR_vm_build_op0_1000a9b0` and resolves
`alloc_mem((&DAT_1000a9d8)[op])` **only if `r2` is pinned**. Setting the register
context to `0x10007FFE` across the code range before analysis turns every
`unaff_r2 + disp` into a real address, and the dispatch reads decompile as array
indexing instead of arithmetic on an unknown. It is one `setValue` call and it
changes how much of the output is legible.

#### What op0 actually generates

The largest handler is a **parametric grid/shell generator**, and its parameter
encoding is pure size-coding:

```c
iVar4 = (w & 0x1f) + 1;          // 1..32   subdivisions, axis 1
iVar3 = (w >> 5 & 0x1f) + 1;     // 1..32   subdivisions, axis 2
iVar2 = (w >> 10) + 1;           // 1..64   subdivisions, axis 3
```

— three counts packed **5:5:6 into one 16-bit word**. Two further words carry
dimensions, and their *sign bits* select one of four modes (`cVar8` 0..3), each
mode routing to a different setup routine. The emit loop is triply nested over
the three counts, and its inner test skips any point that is interior on both
axes at once, so it walks the **boundary** of the volume rather than filling it.

That is a box/grid *shell*, which is exactly the kind of primitive a 64K intro
builds everything from — and it is consistent with the renderer only ever
drawing triangle fans.

#### And there is a second level above it

`_generate_scene` is a separate interpreter with its **own** node-size table at
`0x1000a8c8`, 16-bit entries, running `[44, 48, 52, 108, 212, 44, 56, 60]` and
then zero — **8 scene-level opcodes**.

It has a handler table too, at **`0x1000a8a8`, 7 entries**, terminated by
`0xffffffff`. (An earlier pass here claimed there was no such table, on the
grounds that `_generate_scene` contains no `bctr` in its 520 bytes. That was
scanning the wrong range: the named body ends at `0x23a8`, the handlers live at
`0x10002a54`–`0x10002f24`, and everything between is unnamed statics. Seven
handlers for eight opcodes is consistent — opcode 7 is the root/terminator that
consumes no operand and needs none.)

### And a fifth table: the texture generator has 20 operations

Sweeping the whole small-data area for runs of consecutive code pointers — rather
than chasing one table at a time — turns up the last one, and it is the biggest.

**`0x1000a47c` (r2+0x247e), 20 slots, 17 distinct handlers**, every entry
pointing inside `_generate` — the 3,992-byte function at `0x10000404` that is the
largest in the binary and the first symbol in it. It is read from
`_generate+0x150` and from `_init_txtgen`. Three slots are shared: 0 and 17, 11
and 12, 14 and 15.

`_generate` is therefore the **procedural texture VM**. Its prologue and main
loop read cleanly, and they settle the two things a port needs first:

```asm
  lfs   f29, __255(r2)       ; 255.0
  lfs   f28, __128(r2)       ; 128.0
  fdiv  f30, f29, f29        ; 1.0
  fsub  f31, f29, f29        ; 0.0        <- normalised colour math
  fdiv  f27, f28, f29        ; 128/255
  ...
  li    r12, 0 ; mtctr 0x38000 ; stwu r12,4(r14) ; bdnz     ; zero a ~900 KB buffer
  li    r11, 0 ; li r10, 0x80
  stb   r11, 0x25a6(r2) ; stb r11, 0x25a7(r2)                ; x=0, y=0
  stb   r10, 0x25a8(r2) ; stb r10, 0x25a9(r2)                ; w=128, h=128
  lhz   r21, 0(r31)          ; u16 length, bit 15 a flag
  andi. r4,  r21, 0x8000
  andi. r21, r21, 0x7fff
  addi  r31, r31, 2
  add   r26, r31, r21        ; end = pc + length
  ...
  cmpwi r14, 0x80 ; blt …    ; inner loop to 128
  cmpwi r12, 0x80 ; blt …    ; outer loop to 128
  lbz   r21, 0(r31) ; addi r31, r31, 1     ; fetch one opcode byte
```

**Textures are 128×128.** Both nested loops count to `0x80`, and the working
rectangle is written as `(0, 0, 128, 128)`. The stream is the same shape as the
other two languages — a `u16` length, here with **bit 15 carrying a flag**, then
single opcode bytes.

The dispatch has one structural surprise. Opcodes are compared against `0x50`
and `0x78`, and **every opcode in `[0x50, 0x78]` — 41 values — is routed to a
single handler** (`0x10000f58`, 340 bytes, 23 floating-point instructions, 7
loops). That is one routine parameterised by its own opcode number: a family of
related per-pixel operations, not 41 separate ones. Only the low opcodes index
the 20-entry table.

Alongside it, a **byte table at `r2+0x2502`** is indexed by the same opcode. Its
first nineteen entries read

```
  3, 20, 13, 12, 1, 10, 12, 9, 18, 12, 1, 1, 1, 1, 1, 1, 127, 3, 4
```

with `127` special-cased to `1` in the dispatch — the per-opcode operand count.

### The complete engine, in five tables

| table | at | slots | handlers | language |
|---|---|---|---|---|
| texture | `0x1000a47c` | 20 | 17 | procedural texture ops, inside `_generate` |
| scene | `0x1000a8a8` | 7 | 7 | scene ops 0–6 (7 is the inline root) |
| geometry build | `0x1000a9b0` | 5 | 5 | construct pass |
| geometry eval | `0x1000a9c4` | 5 | 5 | evaluate pass |
| render | `0x1000aa20` | 7 | 6 | draw-node types |

That is the whole intro: **20 texture operations, 8 scene operations, 5 geometry
operations, 7 render node types.** The hope going in was "a 15-operation
renderer, a 20-operation scene language, and 10 generators" — which turns out to
be a good estimate of the total and a misallocation of where it sits. The scene
language is small; the *texture* language is the twenty-operation one.

#### The streams are located, and they are the demo's running order

Following the pointers rather than pattern-matching the data found them
immediately. Two tables sit in the small-data area, and each belongs to one of
the two parts `_main` runs:

| table | at | entries | targets | consumed by |
|---|---|---|---|---|
| part 1 | `0x1000a5a8` (r2+0x25aa) | **18 contiguous** | seg 3 | `_play_part_1` |
| part 3 | `0x1000a778` (r2+0x277a) | 32 contiguous | seg 4 | `_play_part_3` |

`_play_part_1` loads **exactly 18 distinct slots** from its table — the whole
run, nothing spare — and it loads them **out of order**: `0x25d2`, `0x25aa`,
`0x25ba`, `0x25ce`, `0x25ae`, `0x25b2`, … That sequence *is* part one's running
order, sitting in the code as a straight-line list of loads. Reading it off gives
the demo's structure without running anything.

So seg 3 (12.8 KB) is part one's scene data and seg 4 (52.5 KB) is part three's,
which matches both their sizes and the fact that part three is skipped when
`__exit` is set.

The call graph closes too: `_generate_scene` has **five** call sites —
`_play_scene`, `_play_scene_synchro`, `_init_synchro`, `_play_scene_p_start`,
`_play_scene_p_end`, i.e. five scene-playing modes — while `_generate_obj` has
exactly **one**, from `_calculate_obj`.

#### Scene stream format, as far as it is decoded

```
  u16   total length in BYTES of what follows
  ...   opcode stream; the first opcode is IMPLICIT and is 7
  each opcode byte:  bit 7    = a flag, stored at node+0x0e
                     bits 0-6 = the opcode (0..7)
```

Nodes are chained through `node[4]` (+0x10). The operand byte's sign bit becomes
`1` or `2` at `node+0x0d`. Opcode 7 consumes no further byte — it is the root /
terminator, which is why it is also the implicit first. Opcode 6 is special-cased,
and opcode 5 indexes the *fourth* argument of `_generate_scene` where the others
index the third — both of those arguments are lookup tables passed in from
`_play_scene` (globals at `r2+0x288e` and `r2+0x2896`), with 8-byte and 4-byte
entries respectively.

This also explains a false start: the payloads all begin `5B FF 0F xx 80 00`,
which looked like a magic number and is not — the first opcode being implicit
means those bytes are the root node's operands, not a header.

#### Operand widths, measured

The handlers share the stream pointer in `r31`, so their loads and their
self-increments give the layout without any guessing:

| op | node | reads from `r31` | consumes |
|---|---|---|---|
| 0 | 28 | half@0, half@2 | **6 or 8** bytes (+4, then +2, then +2 on one path) |
| 1 | 64 | byte@0, byte@1, half@2, half@4 | **2 + 6n** (three separate +6 sites) |
| 2 | 32 | byte@0, half@1 | **3** |
| 3 | 76 | byte@0, byte@1, byte@2, half@4 | **3 or 9** |
| 4 | 32 | byte@0, byte@1, half@2, half@4, half@6 | **2 or 10** |

`op2` reads a halfword at `r31+1` — an **unaligned** 16-bit read. That closes an
earlier loose end: the stream pointers in the tables are frequently odd
(`+0x20b1`, `+0x2243`, `+0x2857`), which looked wrong for a `ushort*` and is
simply what a byte-packed stream with unaligned halfword operands produces. On
68K/PPC big-endian Amiga this is fine and it saves a byte per record.

The scene level is simpler still: in all 520 bytes of `_generate_scene` there are
exactly **three** stream reads — `lhz` for the length, then two `lbz`, each
followed by `addi r31,r31,1`. No multi-byte operands at all.

#### Where static analysis stops paying

The obvious next move — walk the 18 part-one streams as opcode tokens — **does
not work, and it is worth knowing why before trying it.** If every byte were a
token with the opcode in bits 0-6, every byte would satisfy `(b & 0x7f) <= 7`.
Across all 6,098 bytes of part one's streams, only **60%** do.

The decompilation explains it: after reading the operand byte, `_generate_scene`
does not use its low bits as the next opcode — it uses them as an *index*, and
takes the next state from `param_3[i]` or (for opcode 5) `param_4[i]`. Those two
arguments come from globals at `r2+0x288e` and `r2+0x2896`, whose static values
are `0x101c29f0` and `0x10514120` — both inside **seg 6, the 17 MB BSS hunk** —
and which no PPC instruction ever writes, only reads (9 and 6 read sites
respectively, including from `_calculate_obj`, `_calculate_txt`, `_alloc_txt`).

So the scene graph is table-driven through structures that are **built at runtime
in BSS**. Decoding the streams statically means first reversing whatever
populates those tables; the alternative is to dump them from a running instance.
**This is the precise point at which the dynamic trace stops being a nice-to-have
and starts being the cheaper path** — and it strengthens the case for the stub
`Warp3DPPC.library`, since running the intro is what produces those tables.

#### seg 3 is now fully accounted for

Part one's 18 scene streams cover 6,134 bytes — 47% of seg 3 — and the remainder
is **one contiguous block at the front, `0x0000..0x1a05`, 6,661 bytes**.

The texture VM has exactly one caller (`_calculate_txt+0xa4`), and that block is
its data. Tiling it with the same container format the other languages use — a
`u16` length whose bit 15 is a flag, then a payload — gives **76 programs
consuming 6,661 bytes exactly**, with nothing left over. A wrong hypothesis does
not tile 6,661 bytes across 76 records.

```
seg 3 = 6,661 bytes of texture programs (76)  +  6,134 bytes of scene streams (18)
      = 12,795 of 12,796                       (1 byte of padding)
```

The flag splits them into two visibly different populations: programs 0–47 are
mostly flag=1 and littered with `255,255,255` triples, programs 48–75 are flag=0
with `128,160,128`-style mid-greys. Those are RGB parameters either way.

**The inner decode is only partial, and this is the honest state of it.** Walking
each program with the operand-count table at `r2+0x2502` lands exactly on the end
for **37 of 76**. Broken down by first opcode, programs beginning with op 2, 11,
16 or 18 decode at 100% and op 9 at 68%, while ops 0 and 4 — the flag=0
population — almost always overrun. Re-testing that population against the
*geometry* VM's widths instead does no better (21%), so it is not simply the
object streams misfiled.

That guess was wrong, and the real answer was in the dispatch rather than in the
handlers. The texture handlers never touch the stream pointer at all; the loop
advances it once, unconditionally:

```asm
  add   r31, r31, r23        ; r31 = pc, r23 = operand count
  b     loop
```

`r23` normally comes from the byte table — but the special path for the shared
`0x50..0x78` range sets `li r23, 0` before jumping there. **Those 41 opcodes take
no operands at all**, whatever the table says.

That rule took the decode from 37/76 to 50/76, split so cleanly along bit 15 of
the length word that an earlier draft here concluded "bit 15 selects the
language". **That was wrong**, and following the pointers settled it properly.

#### Three tables, three languages

All 76 program starts are pointed at from seg 0, and **76 of 76 land exactly on a
program boundary** — a third independent confirmation of the container format,
after the exact tiling and the clean decode. Those pointers form **two**
contiguous tables, and `_play_part_1` reads them four instructions apart:

```asm
  addi r31, r2, 0x2642      ; 48-entry table
  bl   _calculate_txt       ;   -> _generate      (textures)
  bl   _alloc_txt           ;   -> W3D_AllocTexObj/UploadTexture/SetFilter
  addi r31, r2, 0x2706      ; 28-entry table
  bl   _calculate_obj       ;   -> _generate_obj  (geometry)
```

So the **table** selects the language, not the flag:

| table | at | programs | consumer | language |
|---|---|---|---|---|
| textures | `0x1000a640` | 48 | `_calculate_txt` → `_generate` | 20-op texture VM |
| geometry | `0x1000a704` | 28 | `_calculate_obj` → `_generate_obj` | 5-op geometry VM |
| scenes | `0x1000a5a8` | 18 | `_play_scene*` → `_generate_scene` | 8-op scene VM |

Re-run against the correct populations, **all 48 texture programs decode with an
overrun of exactly 0** — including the four flag=0 ones that had been miscounted
as a second language. Bit 15 is a per-program option bit (44 set, 4 clear), not a
language selector.

**The texture language is therefore fully decoded across its entire population**:
48 programs, every one landing exactly on its boundary, 1 to 13 operations each.

The 28 geometry programs are all flag=0 and **every one starts with opcode 0 or
4** — 14 each — which is exactly what the five-opcode VM requires.

Their widths took one more step. The five build handlers give
`op0` 6-or-8 by two sign bits, `op1` `2+6·popcount(b1&7)`, `op2` fixed 3,
`op3` `3+6·`(nonzero 2-bit groups), `op4` `2+8n` — all confirmed against the
disassembly — and they still accepted only 6%. The missing piece is that **`op0`
and `op4` both call a shared prologue first**, `FUN_100030f8`, and that prologue
consumes stream:

```asm
  lbz  r23, 0(r31)      ; flags: bits 0-2 and 4-6 both tested
  lbz  r3,  1(r31)      ; indexes the BSS table passed in r28
  lbz  r3,  2(r31) ; lbz r3, 3(r31)
  lhz  r25, 4(r31) ; lhz r24, 6(r31)
  addi r31, r31, 8
```

Adding those 8 bytes to `op0` and `op4` brings two programs to an exact landing
and two more to within 6. But the prologue has **seven** `addi r31,r31,n` sites
(8, 4, 6, 6, 6, 2, 2) selected by that flags byte, so it consumes anywhere from 8
to 34 bytes. Finishing the geometry decode means walking the control flow of one
536-byte function — well-defined, bounded, and the last thing standing between
the static analysis and fully readable object data.

### The complete data map

Both parts have the same three-table shape, and `_play_part_3` mirrors
`_play_part_1` instruction for instruction:

| part | kind | table | n | bytes | consumer |
|---|---|---|---|---|---|
| 1 | scenes | `r2+0x25aa` | 18 | 6,134 | `_generate_scene` (8 ops) |
| 1 | textures | `r2+0x2642` | 48 | 2,780 | `_generate` (20 ops) |
| 1 | geometry | `r2+0x2706` | 28 | 3,881 | `_generate_obj` (5 ops) |
| 3 | scenes | `r2+0x277a` | 11 | 13,268 | `_generate_scene` |
| 3 | textures | `r2+0x27a6` | 21 | 765 | `_generate` |
| 3 | geometry | `r2+0x27fe` | 11 | 680 | `_generate_obj` |

Every table is `0xFFFFFFFF`-terminated. **seg 3 is 99% accounted for** —
12,795 of 12,796 bytes, one byte of padding.

**seg 4 is only 28% accounted for by the visual data**, and the remainder is the
softsynth's: three further tables (`r2+0x2f02`, `r2+0x2f0e`, `r2+0x372a`) point
into it and are read by `_generate_samples_part1` and `_generate_samples_part3`.
So roughly **37 KB of seg 4 — the single largest block of data in the intro — is
audio**, which is consistent with the softsynth also being the largest block of
code. Part three is the longer part with far less geometry and texture data
(765 + 680 bytes against part one's 6,661), so most of its 13 KB of scene data is
sequencing rather than content.

That gives a complete picture of what the intro *is*, by weight:

```
  audio        ~14 KB code  + ~37 KB data
  scenes                      19,402 bytes over 29 streams
  geometry     1.6 KB code  +  4,561 bytes over 39 programs
  textures       4 KB code  +  3,545 bytes over 69 programs
  renderer     ~3 KB code   +  22 Warp3D calls
  font                         2,248 bytes, fully recovered
```

#### The texture language, disassembled

Program 16 in full, as the decoder emits it:

```
  op 18 [0, 0, 64, 64]                          set rect
  op  8 [0,0,0, 0,0,0, 0,255,0, 0,0,34, 32,32,12, 22,30,1]
  op 18 [0, 64, 128, 128]                       set rect
  op  2 [0,0,0, 255,0,0, 0,0, 64,64, 10, 85, 4]
  op 18 [64, 0, 70, 128]                        set rect
  op  2 [0,0,0, 255,0,0, 0,0, 64,64, 10, 85, 8]
  op 18 [70, 0, 128, 63]                        set rect
  op  9 [0,0,0, 198, 0,0,0, 34, 0,111,255, 120]
  op  2 [255,0,0, 0,0,0, 0,0, 98,32,15,49, 0]
  op 19 []
  op 13 [4]
  op 17 [0, 0, 0]
```

**`op 18` takes four operands and they are a rectangle.** `(0,0,64,64)`,
`(0,64,128,128)`, `(64,0,70,128)`, `(70,0,128,63)` — all inside the 128×128
texture, and they alternate strictly with the operations that follow them. That
is confirmed rather than inferred: the main loop reads its pixel bounds from the
four bytes at `r2+0x25a6..0x25a9`, which the prologue initialises to
`(0, 0, 128, 128)`, and `op 18` is the only thing that could be writing them.

So the control structure is **set-rect, apply-operation, set-rect,
apply-operation** — a 128×128 canvas with a scissor. The 3-, 12- and 18-operand
opcodes carry RGB triples (`255,0,0`, `0,255,0`, `0,111,255`), so most of the
vocabulary is coloured fills, gradients and blends over a sub-rectangle.

The 32 flag=0 programs remain undecoded. Their opcodes are all in `0..4`, which
is exactly the geometry VM's range, and their overruns are mostly small (1, 2, 6,
7 bytes), so they are close to a variable-width geometry read — but the widths
measured from those five handlers only get 21% of them, so something there is
still incomplete. That is the next thread, and it is now the *only* undecoded
container in seg 3.

By contrast seg 4 is 63% covered by its 32 streams with no gap over 64 bytes, so
its remainder is interstitial rather than a second block.

#### One structure fully cracked: the font

`_init_scene_generate` is 96 bytes and decodes completely. It is a `0xFF`-
terminated unpacker turning 5-byte records into 20-byte ones, running each of
four bytes through `int2float`:

```asm
loop:  lbz  r24,0(r26)      ; tag
       stw  r24,0(r25)
       cmpwi r24,0xff       ; terminator
       beq  done
       lbz  r3,1(r26) ; bl int2float ; stfs f0,4(r25)
       lbz  r3,2(r26) ; bl int2float ; stfs f0,8(r25)
       lbz  r3,3(r26) ; bl int2float ; stfs f0,0xc(r25)
       lbz  r3,4(r26) ; bl int2float ; stfs f0,0x10(r25)
       addi r26,r26,5       ; src += 5
       addi r25,r25,0x14    ; dst += 20
       b    loop
```

Its source is static, at `seg0+0xa8e4`, and the records read
`(code, x, y, w, h)`. The tags are ASCII. **It is a 40-glyph proportional bitmap
font atlas**, 200 bytes packed, in a 128×113 region:

```
 '0' (0,0,19,18)   '1' (20,0,13,18)   '2' (34,0,19,18)  …  'i' (116,0,8,18)
 'm' and 'w' 28 wide, 'l' 10, ':' 10, '1' 13 — proportional, one row per 19px
 charset: 0123456789 a-z " ? :
```

Two curiosities worth keeping: `'0'` appears **twice** (indices 0 and 11), and
`'v'` and `'w'` share the **identical** rectangle `(95,76,28,18)` — so `v` is
drawn as `w`. Whether that is a size-saving shortcut or a bug that shipped, the
port has to reproduce it, and it is exactly the sort of thing a pixel diff would
otherwise flag as a porting error.

The caller is `_play_scene_p_end`, so this is the text in the closing scene.

**And the glyphs themselves are seg 2.** That 2,048-byte block, flagged early as
"low entropy (2.99) — a table" and left alone, is a **128×128 one-bit bitmap**,
16 bytes per row — the same 128 as the texture VM's output. Rendered, its first
two rows read `0 1 2 3 4 5 i` then `6 7 8 9 0 a`, which is the descriptor's
row-0 and row-19 order exactly.

Cross-validating the two against each other closes it: **all 40 descriptor rects
contain ink**, none spills past its right edge, and the bitmap's inked rows run
3..111 inside the descriptor's 0..113 extent. The 200-byte table in seg 0 and
the 2,048-byte bitmap in seg 2 are a matched pair.

So the font is **fully recovered, 2,248 bytes for 40 proportional glyphs**, and
it needs no emulator, no trace and no further reversing — it can be lifted
straight out and shipped. It is the first asset in this study that is simply
*done*.

That also explains the duplicate `'0'` and the shared `'v'`/`'w'` rectangle:
there is no `v` in the bitmap at all, so drawing `v` as `w` was the only option
once the atlas was full. A deliberate economy, not a bug.

### The 3D is a bounded, documented API

Not a bespoke software rasteriser. `Warp3DPPC.library` is opened, `_Warp3DBase`
is the most-referenced library base in the code (13 sites), and every 3D call
goes through one four-instruction thunk:

```asm
_run_w3d:           mtctr r3              ; r3 = the W3D function pointer
                    lwz   r3, _context(r2); inject the W3D_Context* as arg 1
                    bctr                  ; tail call
_run_w3d_setstate:  lwz r3, -0x2e(r31) ; b _run_w3d
_lock:              lwz r3, -0x3a(r31) ; b _run_w3d
_unlock:            lwz r3, -0x40(r31) ; b _run_w3d
```

`r31` is `Warp3DBase + 2` (the same `-2` bias as the small-data base), so those
displacements are real library vectors at **-48, -60, -66** — and the author's
own names for the three thunks, *setstate / lock / unlock*, line up with
`W3D_SetState`, `W3D_LockHardware`, `W3D_UnLockHardware`. Two independent
sources agreeing is as good as this gets without running the thing.

Sweeping the vector fetches gives the surface. `r31` carries the base in most
functions, but **not all — `r30` does in the texture code**, and an early sweep
that only looked at `r31` reported 18 entry points and, conspicuously, no
texture calls at all despite `_init_txtgen` and `_alloc_txt` existing. Scanning
every base register fixes it.

Naming them needs the library's vector order, which **ReWarp3DPPC**'s
`VecTable68K[]` supplies (LGPL-3.0, github.com/Sakura-IT). Index 4 is
`W3D_CreateContext` at LVO -30, so `LVO = -6 × (index + 1)`. Against that table
every single one of the 18 `r31` displacements lands on a real function — a hit
rate that is not chance — and the author's own thunk names (*setstate*, *lock*,
*unlock*) fall on `W3D_SetState`, `W3D_LockHardware`, `W3D_UnLockHardware`
exactly.

**The complete surface is 22 of the library's 85 functions, over 29 call sites:**

| group | functions |
|---|---|
| context | `CreateContext` `DestroyContext` `SetDrawRegion`×2 `ClearDrawRegion` `LockHardware` `UnLockHardware` `WaitIdle` `Hint` |
| state | `SetState` `SetBlendMode` `SetFogParams`×2 `SetZCompareMode` |
| z-buffer | `AllocZBuffer` `FreeZBuffer` `ClearZBuffer`×2 `ReadZPixel` |
| texture | `AllocTexObj` `UploadTexture` `SetFilter` `FreeTexObj` |
| draw | **`DrawTriFan`×4, `DrawLineStrip`×2 — and nothing else** |

`_W3D_ContextTag` is a plain TagItem list against `W3D_TAG_BASE = 0x80200000`
(tags 0, 1, 2, 6, 7).

Two things fall out of that table. The texture lifecycle is
alloc → upload → filter → free with **no `SetTexEnv` and no `SetWrapMode`**, so
texture environment and wrap mode are left at their defaults — one less unknown
to reverse. And more sharply: **every polygon in the intro is a triangle fan.**
No `DrawTriangle`, no `DrawTriStrip`, no `DrawArray`, no `DrawElements`. That is
a hard constraint on what `_generate_obj`'s VM can be emitting, and it collapses
the primitive-assembly question in the WebGL2 port to a single path.

#### Where those calls actually sit

Mapping every call site to its enclosing function has to be read with one
caveat: attribution by nearest *exported* symbol is coarse, because the binary is
full of unnamed file-local statics. Where a function's true extent is known the
attribution is exact, and those cases are the informative ones:

- **`_alloc_txt`** (0x202c–0x20c4) contains `AllocTexObj`, `UploadTexture`,
  `SetFilter` — the entire texture upload path, in one 152-byte function.
- **`_dealloc_txt`** (0x20c4–0x2120) contains `FreeTexObj`. That is the whole
  texture lifecycle, in two functions.
- The **context lifecycle** — `CreateContext`, `AllocZBuffer`, `Hint`,
  `SetZCompareMode`, `SetBlendMode`, `SetFogParams`, then `FreeZBuffer`,
  `DestroyContext`, plus `SetDrawRegion` twice, `ClearDrawRegion` and
  `ClearZBuffer` — is **12 of the 29 call sites clustered in one region**
  (0x1c80–0x1e40). Setup and teardown live together, and the per-frame path
  touches almost nothing else.
- **`_show_scene`** holds the rest: `DrawLineStrip`, `DrawTriFan` ×3,
  `ReadZPixel`, `WaitIdle`, `ClearZBuffer`.

`_zet` is loaded immediately before the `ClearZBuffer` at 0x6488, so that global
is the depth-clear value.

#### A fourth dispatch table — the renderer is table-driven too

`_show_scene` dispatches through `PTR_LAB_1000aa20` indexed by a halfword at
node+8. Bounding it the same way as the others — the word after the last entry
is zero, and the next symbol is the float pool at `0x1000aa6c` — gives **7 slots
over 6 distinct handlers**:

| slot | handler | note |
|---|---|---|
| 0 | `0x10005de8` | ~24 B — a thin wrapper around `W3D_DrawLineStrip` |
| 1, 2 | `0x10005e00` | ~24 B — a thin wrapper around `W3D_DrawTriFan` (shared) |
| 3 | `0x10005ddc` | ~12 B — smaller still |
| 4 | `0x10005e18` | the bounds-test + `ReadZPixel` + `DrawTriFan` handler |
| 5 | `0x100061a0` | |
| 6 | `0x1000644c` | the largest; owns the `ClearZBuffer` |

So the renderer is the fifth of the engine's five dispatch tables: 8 scene ops feed 5 geometry
build and 5 eval ops, which feed these 7 render node types. Three of the seven
render handlers are ~24 bytes or less — they are literally "call this W3D
primitive".

#### The one readback in the whole intro

Slot 4's handler is the only place anything is read *back* from the hardware. It
performs a four-way float comparison — two values tested against two lower and
two upper bounds — and, if that passes, calls `W3D_ReadZPixel` before a
`DrawTriFan`.

Project a point, check it is on screen, sample the depth buffer there, and draw
only if nothing is in front: that is the shape of an **occlusion-tested
screen-space element**, the standard construction for a lens flare or a
visibility-gated sprite. Stated as the reading of the evidence rather than a
fact — the bounds arrive in float registers from the caller, so they could not
be tied to the named `__clip_x` / `__clip_y` / `__border*` globals from here.

It matters for the port regardless of what it draws: `W3D_ReadZPixel` is a
synchronous single-pixel depth read, and the naive WebGL2 equivalent
(`readPixels` on a depth attachment) stalls the pipeline. This is the one call in
the surface that does not map cleanly, and it wants an occlusion-query or
deferred-readback design rather than a literal translation.

**Porting the renderer therefore means implementing 22 Warp3D calls on WebGL2**,
not reverse-engineering a triangle loop. Warp3D of this era is essentially
fixed-function — state flags, a texture unit, gouraud, fog, z-buffer — which maps
onto a small GLSL program set. The resolution constants sitting in the pool
(`__320`, `__240`, `__640`, `__480`, and `__32768` for 15-bit colour) say what
the target buffer looks like.

### The audio is not a bespoke synth

seg 1 begins `00 00 03 F3` — it is **another complete Hunk executable embedded in
the data**, four hunks, and its strings identify it: **`dbplayer.library 2.0
(16.8.98)`**, requiring `utility.library`. That is the DigiBooster Pro player,
which the intro writes to `ram:` and opens back (hence the literal
`ram:dbplayer.library` path string, and `_DBMBase`).

So the music is **a DigiBooster module played by a known, self-contained
replayer**, and the bespoke part is narrow: `_generate_samples_part1` and
`_generate_samples_part3` synthesise the instrument samples at runtime, with
`_module` and `_music_buffer` as the handoff.

That reframes the audio job — but **not** in the direction first written here.
An earlier pass called it "narrow: two named functions", which was an artifact of
the short scan range. Those two functions are small drivers
(`_generate_samples_part1` is 564 bytes and almost pure call sequence, 57 calls
with 2 floating-point instructions), and they sit on top of the **12.8 KB of
synthesis helpers** that had gone unscanned. Every one of the 259 calls into that
region comes from the audio code.

`_generate_samples_part3` is where the DSP is: 864 bytes, 70 floating-point
instructions, and it is the only code in the intro that touches `_sinus`,
`_power` and `_mexp`. Its constants are a giveaway — `0.9997`, `0.99996`,
`0.999985` are per-sample decay/feedback coefficients, and `32768` is the
sample scale.

So the softsynth is roughly **14 KB of the 40 KB — the single largest subsystem
in the intro**, larger than the texture VM, the geometry VM and the renderer put
together. It is still a better position than a bespoke format, because the
*playback* side is a documented DigiBooster module through a self-contained
replayer, and only the instrument synthesis has to be recovered. But it is not
the cheap part, and planning it as an afterthought would be a mistake.

### 68K interop

No PPC code calls a 68K library directly. `_run68k` builds a struct on the stack
(zeroing four consecutive fields — the shape of WarpOS `PPCArgs`) and calls
`PowerPCBase` at a fixed vector. Everything that must touch `intuition`,
`cybergraphics`, `dos` or `graphics` funnels through that one function, which
makes the 68K boundary trivially enumerable, and irrelevant to the port beyond
"open a window, get a bitmap, lock it".

## Where this leaves your plan

Most of it stands. Four changes.

**1. Symbols first; WinUAE later.** You put a custom instrumented WinUAE build at
step 4 and called it the biggest productivity win. It is still the right tool for
ground truth, but its *entry cost* is the thing that changed: the symbol table
already tells you where to trace before you trace anything. `_generate_obj`,
`_calculate_txt`, `_show_scene`, `_generate_samples_part1` — the trace points are
named. Do the static pass first; it costs a day and it tells the dynamic pass
where to look.

Be aware of what the emulator step really costs, because it is the one genuinely
hard acquisition in this project: WinUAE's PPC support runs through a QEMU PPC
core and wants a **CyberStorm PPC ROM image**, plus a working RTG and Warp3D
driver stack under emulation, plus `dbplayer.library` behaving. That is the piece
most likely to eat a week, and it is a sourcing problem, not a coding one. Worth
attempting early precisely because it is the risk.

See **[the ROM appendix](#appendix--the-cyberstorm-ppc-rom)**: the Aminet flash
updater is a good route and it de-risks this considerably, with one version
label to correct.

**2. The "is it software-rendered?" question is answered: no.** Contemporary
pouët commentary suggested software rendering; the binary says hardware Warp3D
with an 18-call surface. What *is* software is the **generation** side — textures
(`_init_txtgen`, `_calculate_txt`, `_alloc_txt`) and geometry (the `_generate_obj`
VM). So the split you should plan around is: procedural generators on the CPU
(JS or WASM) feeding 22 Warp3D operations re-expressed as WebGL2, all geometry
 arriving as triangle fans.

**3. Your WASM differential-testing loop is right, and now it has natural
units.** You framed it as `generate_blob_mesh(seed,time,vertices)`. The real
units are better than that: one VM build op, one VM eval op, one texture
generator, one sample generator — each individually named and independently
comparable against a memory dump. That is a much tighter loop than
whole-effect comparison.

**4. Don't build the validation tooling.** You described capturing the original
to an image sequence and building an original / port / difference scrubber with
image metrics. **That already exists in this repo** — `tools/inspect/sweep.mjs`
scores every sample on correlation *and* RMSE, `tools/inspect/serve.mjs` is the
scrubber, and `tools/inspect/ADAPTER.md` is the contract. Planet Potion would be
its third adopter after lapsus and wonder, and adopting it means implementing
`window.__demo.plan()` / `.render()` and nothing else. Building a second one
would be the most wasteful thing on the list.

On the browser side, agreed on raw WebGL2 over Three.js, and for a stronger
reason than "thin is better": you are emulating a fixed-function API with 18
entry points and explicit state flags. Three.js's material model would actively
fight that mapping. Note also that this repo's existing restorations ship
**dependency-free plain JS + WebGL2 from static files** — no bundler, no
TypeScript, no WASM in the shipped artifact. Vite/TS are fine as authoring
tools, and WASM is fine as a *verification* instrument, but shipping either
would break the property that the deployed code is the code under review.

## Risks worth naming

- **Warp3D semantics are a fidelity trap.** Knowing which 22 functions are called
  is not knowing what a 2002 Permedia/Voodoo driver did with them. Blending, fog
  curves and texture filtering are exactly the class of thing METHOD.md §8 warns
  about: a backend disagreement is a hypothesis, not a verdict.
- **The 17 MB BSS hunk** implies large runtime buffers — texture pools, z-buffer,
  mesh arena. Worth mapping early; it constrains the WebGL2 memory design.
- **No reference capture yet.** Nothing here can be scored until there is a video
  and an audio-alignment offset, and the sweep is what turns opinion into a
  number.
- **162 unnamed globals.** The named 57 are a gift; the rest is ordinary work.

## If it goes ahead

The natural first milestone is the one you named — a full-frame trace — but the
static side can be pushed much further first, cheaply:

1. commit the hunk loader + Ghidra import as `work/re/` tooling;
2. ~~dispatch tables~~, ~~opcode streams~~, ~~operand widths~~ — done; the scene
   graph needs its BSS tables, which is a dynamic-trace job, not a static one;
3. the 22 Warp3D vectors are now named against ReWarp3DPPC — write
   down the state flags actually used;
4. only then stand up WinUAE for dynamic confirmation.

Steps 1–3 need no emulator, no ROM, and no network, and they would leave the
project with a documented `prod.json`, an addressed function map and a bounded
renderer spec — which is most of what this repo means by "recover how the
original works".

---

### Environment note

Everything above was produced in a Claude Code cloud session. `lhasa`, `amitools`
(`hunktool`), `capstone` and Ghidra 11.3.2 all install and run here, and Ghidra's
headless PowerPC analysis worked first try. What does **not** work here is the
provenance half: scene.org, pouët, demozoo and YouTube are all blocked by network
policy (see `CLOUD_ENVIRONMENT.md`), so archive rehydration and reference capture
have to happen on a local machine. Static binary archaeology on an
already-supplied file is a good fit for a cloud session; verification against a
reference is not.

The original binaries and everything extracted from them stayed outside the
repository, per the policy in the README.

---

## Appendix — the CyberStorm PPC ROM

The hardest acquisition in this project is the CSPPC flash image, and deriving
it by running the original Phase5/Ralph Schmidt updater inside the emulator is
the right answer. It replaces "find this ROM somewhere" with a documented
derivation from a publicly archived, permission-uploaded original — which is
the same standard the rest of this repo holds itself to for `originals/`.

Measured from `FlashUpdates-26042002.lha`
(`bad227908bfc69c6b599917f6f2e6955fea0474c31fff8e3bcb726aae127d7a1`), 13 files:

| file | bytes | for |
|---|---|---|
| `PPCUpdate` | 140,816 | **CyberStorm PPC, 128 KB flash** — the one we want |
| `MK3Update` | 140,244 | CyberStorm MK3 (no PPC) |
| `BlizzPPC040Update` / `...060Update` | 354,612 / 354,608 | Blizzard PPC |
| `Cybppc.notes` | 11,925 | CSPPC firmware release notes |
| `FlashBIOS.doc`, `HOW_TO_INSTALL_THE_FLASH.txt`, `ReadMeFirst.txt` | | procedure |

`HOW_TO_INSTALL_THE_FLASH.txt` is unambiguous: *"for a CyberstormPPC with a
128KB Flash use PPCUpdate"*.

### The version label is not what the archive says — verify by hash, not by name

`Cybppc.notes` carries the firmware changelog, and its versions run:

```
V44.60 … V44.66  V44.67  V44.68  V44.69  V45.70  V45.71
```

It rolls **44.69 → 45.70**. The string `44.71` does not appear in any file in
the archive. The newest CSPPC firmware here is **V45.71** ("Added PCI BootMenu
info").

**But `4471` is a real label elsewhere.** FS-UAE's ROM lookup, seen live in its
own log, is:

```
[ROM] Did not find cyberstormppc.rom
[ROM] Trying ralphschmidt-cyberstorm-ppc-4471.rom
```

So the emulator/Amiga Forever side genuinely uses `4471` as a filename. The two
facts do not contradict each other, because `Cybppc.notes` is a changelog of
**`cybppc.device`** behaviour — SCSI units, CDROM quirks, mount gadgets, PCI
BootMenu info — and the device driver's version is not necessarily the flash
BIOS version, even though the driver ships inside the flash.

What can be said without guessing: **the archive never claims 44.71 anywhere,
and the newest thing it documents is 45.71.** So do not trust the version label
on either side. Verify the image the updater actually produces by its SHA-1, and
treat the filename as a filename. That is what the plan already does, so nothing
about the approach changes — only the confidence in the name.

### The image cannot be lifted out statically — the emulator round-trip is real

Worth ruling out before spending a week on emulation, so it was:

- `PPCUpdate` is a valid AmigaOS Hunk executable, 4 hunks, CODE 132,912 bytes.
  (`hunktool` rejects it with *"Invalid hunk type 141/8d"* — that is a gap in
  `hunktool`, not a damaged file: it does not handle the `0xC0000000` "memory
  flags follow" encoding in the header size table, which this file uses for all
  four hunks. Parse it by hand and it is clean.)
- Entropy across the payload is **7.99 over ~114 KB** — compressed or encoded,
  not a raw ROM. A CSPPC image full of 68K code, PPC code and strings would sit
  around 6.
- The only strings in the file are the FlashTool's own (`CyberstormPPC 128KB
  FlashTool V1.6`, `No CyberstormPPC installed`, `Oops..you're in deep trouble
  now.`) and a table of flash part numbers (`28F010A`, `29F040`, `29F016`, …).
  **No firmware strings at all** — no device name, no copyright, no version.
- A sliding SHA-1 search for a 131,072-byte window matching the target: 9,745
  windows in `PPCUpdate`, plus the same over `MK3Update` and both Blizzard
  updaters, under five encodings (verbatim, 16- and 32-bit byte swap, 8- and
  16-bit de-interleave). **No match.**

So the payload only becomes a ROM by being decompressed and programmed by the
tool itself. Run the updater under emulation, exactly as planned.

Note `V1.6` is the **FlashTool** version, not the firmware version — the two are
easy to conflate, and only the changelog names the firmware.

### Two practical traps

- The tool aborts with `No CyberstormPPC installed` if it cannot find
  `CyberstormPPC.IDTag`. The emulated board has to be configured and detected
  *before* the updater will do anything — a zero-byte writable
  `cyberstormppc.rom` alone is not sufficient.
- It probes the flash chip against that part-number table. An emulated flash
  that does not answer with a recognised device ID is a plausible failure mode,
  and it will look like a tool bug rather than a configuration problem.

The install notes also insist on booting without the startup-sequence with all
HD volumes disabled — worth honouring under emulation rather than assuming it
only matters on real hardware.

### One inconsistency in the archive

`HOW_TO_INSTALL_THE_FLASH.txt` directs 512 KB DCE boards to `BigPPC040Update` /
`BigPPC060Update`. Neither file is in this archive. Irrelevant for our purposes —
we want the 128 KB `PPCUpdate` — but it means the documentation is shared across
releases and does not describe this archive's contents exactly. Do not treat it
as a manifest.

### The roundtrip was run, and it does not bootstrap from a blank flash

The emulation side works, and works better than expected — but the recipe as
usually described ("make an empty `cyberstormppc.rom`, run the updater") does
**not** produce a ROM, for a reason that is in the updater's own code.

What ran, all of it inside a headless Linux container:

```
fs-uae 3.1.66        (Ubuntu noble/universe)      + Xvfb
amiga_model          = A4000/040
accelerator          = cyberstorm-ppc
cpuboard_flash_file  = cyberstormppc.rom          (131,072 bytes of 0xFF)
hard_drive_0         = hd0/                       (a host directory)
hd0/s/Startup-Sequence -> PPCUpdate >DH0:out.txt
```

FS-UAE logged `CPUBoard 'CyberStorm PPC' flash file './cyberstormppc.rom'
loaded, RW.`, mapped `CPUBoard F00000` and `CPUBoard MAPROM`, booted, mounted
the directory, ran the startup-sequence, executed the 2001 68K binary, and its
output came back to the host filesystem:

```
	CyberstormPPC 128KB FlashTool V1.6

No CyberstormPPC installed
```

The flash file was still 131,072 bytes of `0xFF` afterwards — zero bytes
changed.

**No Kickstart ROM was needed.** FS-UAE has an AROS Kickstart replacement built
in (`AROS KS ROM (built-in)`), and it booted far enough to mount a filesystem
and run a program. That removes what looked like the first blocker entirely.

#### Why it refuses — from the updater's own 68K

Disassembling `PPCUpdate` around the failure string gives the whole check:

```asm
    move.l  a6,-(a7)
    lea     "CyberstormPPC.IDTag"(pc),a1
    movea.l $4.w,a6                  ; ExecBase
    jsr     -$60(a6)                 ; OpenResource()
    tst.l   d0
    bne.b   ok                       ; found -> proceed to flash
    lea     "CyberstormMK3.IDTag"(pc),a1
    jsr     -$60(a6)                 ; OpenResource()
    tst.l   d0
    bne.b   ok
    lea     "No CyberstormPPC installed"(pc),a0
    move.l  a0,d1
    movea.l $188.l,a6                ; DOSBase
    jsr     -$3ba(a6)                ; PutStr()
    moveq   #0,d0
    bra     exit
```

It requires an **exec resource** named `CyberstormPPC.IDTag` to already exist.
Nothing in the updater creates that resource — on real hardware it is published
by the board's own firmware during early boot. With a blank flash there is no
firmware, so there is no resource, so the tool exits before touching anything.

**The flash updater upgrades a CyberStorm PPC; it cannot create one.** The seed
problem is not removed by this route, only moved: you still need *some* working
CSPPC image to start from, after which the updater will roll it forward and
FS-UAE will write the result back to `cpuboard_flash_file`. That is still
worth doing — it is how you get a *known, reproducibly derived* image rather
than a mystery dump — but it is not a bootstrap from nothing.

One caveat stated plainly: this run used AROS rather than Kickstart 3.1, and
separating "blank flash" from "AROS" as the cause would need a valid CSPPC ROM —
the exact thing being sought. The disassembly makes the blank-flash explanation
much the likelier of the two, since the requirement is a resource and resources
come from firmware, but it has not been isolated experimentally.

#### What this harness is good for anyway

Independent of the ROM question, the container can now **boot an Amiga and run
period 68K binaries headlessly, with stdout captured back to the host**, needing
no Kickstart and no license. For this project that is a real instrument: it will
run 68K Amiga tools, unpackers and the many small utilities that show up in
restoration work, and it costs one `apt-get install`.

It will **not** run Planet Potion. The PPC CPU in FS-UAE is supplied by the
`qemu-uae` plugin (`PPC CPU was started but qemu-uae plugin was not found`),
which Ubuntu does not package — so PPC execution, and therefore any dynamic
tracing of the intro, still needs that plugin built or a WinUAE setup elsewhere.

---

## What is actually needed to start porting

The shopping list below was written before the subsystems were traced. Tracing
them changes the answer, because **most of this intro does not need an Amiga at
all.**

Taking each subsystem's transitive call closure and asking whether it touches a
library base or `_run68k`:

| subsystem | functions | libraries | verdict |
|---|---|---|---|
| textures (`_generate`) | 23 | none | **pure computation** |
| scenes (`_generate_scene`) | 13 | none | **pure computation** |
| audio (`_generate_samples_*`) | 38 | none | **pure computation** |
| geometry (`_generate_obj`) | 26 | `_Warp3DBase` ×16 | needs the 3D API |
| renderer (`_show_scene`) | 14 | `_Warp3DBase` ×1 | needs the 3D API |

**Three of the five are pure functions over memory.** They take a buffer and a
program and produce output, with no OS calls, no library bases, no 68K
round-trips. That means they can be executed under a bare PowerPC emulator —
qemu-user, or a few hundred lines of interpreter — with **no Kickstart, no
AmigaOS, no CyberStorm ROM, no Warp3D, and no emulator acquisition of any kind.**
Set up memory, point `r2` at the small-data base, point `r3` at a program, run,
read the buffer out.

That is byte-exact ground truth for differential testing, available today, for:

- **the texture VM** — whose language is already fully decoded (48 programs,
  100%), so programs in and 128×128 images out;
- **the softsynth** — the largest subsystem in the intro by both code and data,
  and previously the biggest unknown;
- **the scene interpreter** — which also sidesteps the BSS-table wall, because
  running the code *is* how those tables get built.

### So, three tiers

**Tier 1 — start now, needs nothing.** Commit the hunk loader and Ghidra scripts
as `work/re/`, write `prod.json`, extract the font (2,248 bytes, already
recovered and shippable), and stand up a PPC harness for the three pure
subsystems. The texture VM is the natural first target: decoded language, pure
execution, and an image you can diff.

**Tier 2 — static work, still no purchases.** Finish the geometry operand widths
(one 536-byte function's control flow), and name the 20 texture opcodes by
reading their 17 handlers — or, better, by differential experiment against the
Tier 1 harness, which is cheaper than reading assembly.

**Tier 3 — needs the outside world.** Only the renderer genuinely does: 22 Warp3D
calls whose *semantics* need a reference. That is where the WinUAE-Warp3D
question, the CSPPC seed ROM and the stub-library idea belong — and it is one
subsystem out of five, not the gate on the project.

### The one true gate

**A reference capture.** Nothing can be *scored* against the original without a
video and an audio-alignment offset, and that is the standard this repo holds
its restorations to. It gates verification, not construction — and it needs a
local machine, since scene.org, pouët, demozoo and YouTube are all blocked from a
cloud session.

Everything in Tier 1 and Tier 2 can proceed in parallel with obtaining it.

## Shopping list

### 0. The free check that decides everything else — do it first

The core tested here (WinUAE 3300b2, via FS-UAE 3.1.66) emulates **Zorro 2D RTG
boards only** — Picasso II/IV, Piccolo, Spectrum. There is **no CyberVision PPC
or BlizzardVision PPC, and no Warp3D emulation of any kind**: a grep for
`warp3d`, `w3d_`, `permedia` or `voodoo` in the binary returns nothing.

Planet Potion opens `Warp3DPPC.library` and makes 22 distinct W3D calls. So on this core
it cannot run *even with* a CyberStorm ROM and the PPC plugin — the ROM was
never the real blocker, the 3D card is.

**So: install current WinUAE (free) and find out whether a modern build emulates
a Permedia 2 board with working Warp3D.** That question gates every purchase
below. I could not settle it from here — the packaged core is from 2016 and
fetching current WinUAE sources is outside this session's repo scope.

### 1. Buy — one item, ~$40

**Amiga Forever Plus.** It is the only thing on this list that costs money, and
it covers three separate needs at once:

- **Kickstart ROMs** — not needed for the flash roundtrip (AROS sufficed) but
  needed for a real AmigaOS 3.x with Picasso96/CGX and Warp3D.
- **AmigaOS 3.X install** — the environment the intro actually expects.
- **`ralphschmidt-cyberstorm-ppc-4471.rom`** — the seed CSPPC image. This is the
  thing that breaks the chicken-and-egg: the flash updater provably cannot
  bootstrap from a blank flash (it needs an exec resource only existing firmware
  publishes), so it can only *upgrade* an image you already have.

Two cautions, the first of which **has now been hit in practice**: a copy of
`ralphschmidt-cyberstorm-ppc-4471.rom` supplied to this session was **0 bytes**
(`da39a3ee5e6b4b0d3255bfef95601890afd80709`, the SHA-1 of the empty string). The
FS-UAE docs warn about exactly this "especially from Amiga Forever", and it is
the placeholder state, not a usable image — the real file is 131,072 bytes and
must be materialised by running the Amiga Forever *Amiga 4000 PPC* configuration
once before it is copied out. Second: `4471` is a filename, not a verified
version — hash whatever you end up with and record it.

**Check the size before doing anything else with such a file.** A zero-byte ROM
fails in the same way a blank flash does — the board contributes nothing at
boot, no `CyberstormPPC.IDTag` resource is published, and the flash updater
exits with `No CyberstormPPC installed`. The two failures are indistinguishable
from the log, which is a good way to lose an afternoon.

### 2. Build — free, but real work

- **`qemu-uae` plugin**, only if staying on FS-UAE/Linux. It supplies the PPC
  CPU (`PPC CPU was started but qemu-uae plugin was not found`) and Ubuntu does
  not package it. Running WinUAE on Windows avoids this entirely.
- **A stub `Warp3DPPC.library`** — *the interesting option, and possibly the
  whole answer.* If no emulator gives real Warp3D, note that we do not actually
  want 3D acceleration: we want **the call log**. A WarpOS PPC library exporting
  the 22 vectors, logging arguments and returning success would let the intro run
  to completion and hand over exactly the trace the port needs — camera
  matrices, vertex buffers, texture handles, state flags, per frame. It sidesteps
  the graphics-card problem completely, and 22 entry points is a small surface —
  and ReWarp3DPPC already provides the exact signatures and vector order.
  This is the highest-leverage build on the list.

### 3. Acquire — free, but not from a cloud session

- **A reference capture** of the intro running, plus its audio-alignment offset.
  Nothing can be *scored* until this exists. scene.org, pouët, demozoo and
  YouTube are all blocked by network policy here, so this step belongs on a local
  machine (see `CLOUD_ENVIRONMENT.md`).

### 4. Only if emulation genuinely cannot run it

**Real hardware**: an A4000 or A1200 with a CyberStorm PPC (or Blizzard PPC) and
a CyberVision/BlizzardVision PPC. Prices for phase5 accelerators have gone the
way of all vintage Amiga hardware, and you would still need a capture path off
the machine. Treat this as the fallback it is, not the plan.

### 5. Buy nothing at all for the port itself

Everything on the reconstruction side is free and already verified working in a
container: `lhasa`, `amitools`, `capstone`, Ghidra 11.3.2 with PowerPC, the hunk
loader, and this repo's own `tools/inspect` verification harness. The shipped
restoration is plain JS + WebGL2 from static files with no runtime dependencies,
as with every other production here.

### The order that wastes least money

```
current WinUAE, does Warp3D work?  ── no ──> write the stub W3D library
            │                                        │
           yes                                       │
            ▼                                        ▼
   buy Amiga Forever Plus  ─────────────> CSPPC seed ROM + AmigaOS
            │                                        │
            └────────────────┬───────────────────────┘
                             ▼
                    run the intro, capture the trace
```

Static work — the hunk loader, the VM dispatch tables, the now-named Warp3D
vectors — needs none of it and can start today.
