# Planet Potion — recovered structure

**Implementing rather than investigating? Read
[`PORT_SPEC.md`](PORT_SPEC.md).** This file is the notebook — chronological, with
its wrong turns and corrections left in, because they are the evidence for what
is now believed. `PORT_SPEC.md` is the current answer in the order a port needs
it.

Addresses are as laid out by `hunkload.py` (seg *n* at `0x10000000 + n·0x10000`,
rounded up). Narrative and reasoning live in
[`docs/PLANET_POTION_FEASIBILITY.md`](../../../../docs/PLANET_POTION_FEASIBILITY.md);
this file is the address notebook.

## Layout

| seg | kind | size | contents |
|---|---|---|---|
| 0 | CODE | 46,960 | 68K bootstrap, all the PPC code, globals, float pool |
| 1 | DATA | 16,960 | `dbplayer.library 2.0 (16.8.98)` — written to `ram:` by the bootstrap, opened, then deleted |
| 2 | DATA | 2,048 | **the font bitmap** — 128×128 at 1bpp, expanded by `_init_txtgen` |
| 3 | DATA | 12,796 | **part one's** scene / texture / geometry programs |
| 4 | DATA | 52,500 | **part three's** programs (28%) + softsynth data (~72%) |
| 5 | BSS | 513,248 | four lookup tables the **68K bootstrap** fills: sin, atan, 2^x, e^x |
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
| geometry eval | `0x1000a9c4` | 5 | **1 live** | evaluate pass; slots 0 and 4 are `blr`, 1 and 2 belong to unused opcodes |
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
running order, readable straight from the code. With one correction made later:
the first of them, `0x25d2`, goes to `_init_synchro` and is the **overlay** drawn
on top of every scene, not the first scene. The first scene played is `0x25aa`.
`showorder.py` prints the whole sequence with durations.

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

### That family is a 3×3 convolution engine

The handler indexes a table at `r2+0x2462` by `opcode − 0x50`, stride **0x24**,
so each opcode carries **nine floats** — a 3×3 kernel. The table lives in seg 6
and is built at run time; dumping it from a live `_generate` gives 40 records,
**37 of them distinct**.

```
  for the 9 taps:  if (w >= threshold) w -= 256.0     /* signed-byte encoding */
                   sum += w ; store w back
  if (sum == 0) sum = 1.0
  inv = fres(sum)                                     /* normalise by the sum */

  for y in 0..127, x in 0..127, for each non-zero tap:
      sample at ((y + dy) & 0x7f, (x + dx) & 0x7f)    /* WRAPPED — a torus */
```

The `w -= 256.0` is what makes the dumped records readable: `255.0` is **−1** and
`254.0` is **−2**. Decoded that way the kernels are textbook:

| opcode | kernel | sum | what it is |
|---|---|---|---|
| `0x50` | `1 1 1 / 1 0 1 / 1 1 1` | 8 | blur, centre excluded |
| `0x51` | `0 1 0 / 1 2 1 / 0 1 0` | 6 | cross blur |
| `0x52` | `0 −1 0 / −1 4 −1 / 0 −1 0` | 0 → 1 | Laplacian edge |
| `0x53` | `1 1 0 / 1 0 −1 / 0 −1 −1` | 0 → 1 | emboss |
| `0x56` | `2 1 0 / 1 1 −1 / 0 −1 −2` | 1 | directional emboss |

Zero taps are skipped rather than multiplied, so the sparse kernels are cheap.
Wrapped addressing means every filter tiles seamlessly, which is why the
textures can be scrolled without seams.

**Tested, not just decoded.** Running `op9` (noise) then one convolution under
the harness, and applying the decoded kernel to the same baseline in Python:

| opcode | sum | exact | within 1 | max |
|---|---|---|---|---|
| `0x50` blur | 8 | 67.8% | **100%** | 1 |
| `0x51` cross | 6 | 68.6% | **100%** | 1 |
| `0x52` Laplacian | 0 | 47.6% | 65.0% | 255 |
| `0x53` emboss | 0 | 55.7% | 73.8% | 255 |

The positive-sum kernels agree to within one unit everywhere — rounding, so the
shapes and the normalisation are right. The zero-sum ones do not, and trying
wrap-around instead of clamping made it *worse* (10% exact against 47.6%), which
said the model was wrong rather than the kernel.

**Reading further explains it: the working surface is not bytes.** The inner
loop addresses pixels with `slwi r11, 4` — **16 bytes per pixel** — and
accumulates only three channels (`f21`, `f20`, `f19`). So the texture VM works on
a **128×128 float RGBA surface**, 256 KB, and converts to `A8R8G8B8` only at the
end; alpha is not convolved at all.

That is why a byte-domain model reproduces the blur kernels and not the
edge-detect ones: with a positive sum the intermediate never leaves range, but a
zero-sum kernel goes negative in floats and only the conversion decides what that
becomes.

Reading the two pixel routines settles the arithmetic. `0x100006ac` loads four
floats from `r15` **and** four from `r16`; `0x100006d0` clamps each to
`[0, 255]` with a pair of `fsel` and stores to `r16`. So the surface really is in
**0…255 float**, the clamp is two-sided, and only three channels move — the one
at offset 0 is loaded and stored untouched.

**And there is more than one surface.** `r15` and `r16` are different pointers:
the convolution reads neighbours from one buffer and writes to another. The
globals confirm it — `r2+0x2472`, `0x246a`, `0x2466` and `0x246e` hold
`0x100e29f0`, `0x101229f0`, `0x101629f0` and `0x101b29f0`, spaced by
**`0x40000` = 128 × 128 × 16**. So the texture VM has **four float work
surfaces** and ping-pongs between them.

`_generate`'s prologue names them outright:

```
  lwz r30, 0x246a(r2)      ; SOURCE       0x101229f0
  lwz r28, 0x2466(r2)      ; DESTINATION  0x101629f0   (set earlier)
```

Four surfaces sit on `0x40000` centres — `0x2472`, `0x246a`, `0x2466`, `0x2476`
— with a fifth pointer `0x246e` a further `0x10000` on, which is the size of a
128×128 **byte** image rather than a float one.

**With the right pair, the convolution reproduces exactly.** Dumping both
surfaces before and after one opcode, convolving the source with the decoded
kernel and comparing against the destination:

| opcode | sum | mismatches | worst |
|---|---|---|---|
| `0x50` blur | 8 | **0** | 0.00001 |
| `0x52` Laplacian | 0 | **0** | 0.00000 |
| `0x53` emboss | 0 | **0** | 0.00000 |

The reversed pairing gives thousands of mismatches and errors above 57, so the
test discriminates rather than merely agreeing. The zero-sum kernels that the
byte-domain attempt could not reproduce come out **exact** in float.

So the whole family is settled: kernel shapes, the signed-byte weight encoding,
normalise-by-sum with 0 → 1.0, wrapped addressing, the `[0, 255]` clamp, alpha
untouched, and source and destination named. The earlier float-domain failure
was reading the destination as if it were the input, and nothing else.

### All forty, verified — `texconv.py`

`python3 texconv.py flat/ kernels.json` dumps the table, decodes it, runs every
opcode and reproduces each from the source surface. **40 of 40 exact**, worst
error `1e-5` across the family.

The listing shows two halves:

```
  0x50   8.0  [ 1  1  1 / 1  0  1 / 1  1  1]   blur, centre excluded
  0x52   0.0  [ 0 -1  0 /-1  4 -1 / 0 -1  0]   Laplacian
  0x54   0.0  [ 0  1  0 / 0  0 -1 / 0  0  0]   difference
  0x58   2.0  [-2 -2 -2 /-2 18 -2 /-2 -2 -2]   sharpen
  0x5c   0.0  [ 5  5 -5 /10  0 -20/ 5  5 -5]   directional edge
  0x61   0.0  [ 0  0  0 / 0  0  0 / 0  0  0]   a NO-OP kernel
  ...
  0x6c 424.2  [68  0 60 /67 50  0 /43 59 74]   dense weights, one rotating zero
```

Seventeen are small-integer hand-designed filters — blur, Laplacian, emboss,
sharpen, directional edge — and one, `0x61`, is **all zeros**: a kernel that
does nothing, which the sum-0 rule turns into a divide by 1 and a black result.
The remaining twenty-three carry dense weights in the 37–88 range with sums in
the hundreds and a single zero rotating through the nine positions — softening
filters with a directional bias.

#### Three surfaces, and a symmetry blit between them

The convolution's pair is not the whole story. Every operation ends by branching
to `0x10000880`, which is **not** a buffer swap but a **blit through a symmetry**:

```
  r8 = r2 + 0x24e2 + r12          ; four halfwords: x0, y0, xstep, ystep
  for 128 rows, for 128 columns:
      read a pixel sequentially from r20      (the work surface)
      write it to r19 + ((x + y) << 4)        (the current surface)
      x += xstep ;  y += ystep per row
```

The table at `r2+0x24e2` holds **four** records, and they decode exactly:

| | x0 | y0 | xstep | ystep | |
|---|---|---|---|---|---|
| 0 | 0 | 0 | 1 | 128 | identity |
| 1 | 127 | 0 | −1 | 128 | mirror x |
| 2 | 0 | 16256 | 1 | −128 | mirror y |
| 3 | 0 | 127 | 128 | −1 | transpose with a flip |

`16256` is `127 × 128`, so record 2 starts at the last row and walks back. The
convolution path sets `r12 = 0` and gets identity; other handlers take the index
from their operand stream. **So the generator can mirror or transpose the result
of any operation**, which is the standard way a 128×128 tile gets symmetric
structure.

That also corrects a wrong turn. An earlier probe read `r2+0x2466` after ops 12,
10 and 17 and found it identical in all nine cases, and concluded the buffers
"rotate". They do not — `0x2466` is the convolution's *work* surface, and the
blit writes to **`r2+0x2472` = `0x100e29f0`, the current surface**. Reading that
one instead, the operands visibly matter: `op12` with operand `0x20` lifts
63.75 → 111.94 and 48.12 → 108.03, with `0x60` a mild lift and with `0xa0` a
strong fall to 31.62 and 8.18. Three surfaces, each with a role, and no rotation
at all.

#### Reading the handlers beats the behavioural pass

The 20 slots hold **17 distinct handlers** — ops 11 and 12 share `0x10000cfc`,
14 and 15 share `0x10001324`, 0 and 17 share `0x10000acc`. Reading three of
them replaces three guesses from the earlier differential pass.

**`op12` is contrast about 128**, and the handler gives it in closed form:

```c
  k = operand - 128.0;
  if (operand > 128) k += k;          /* the fadd f16, f16, f16 */
  if (operand != 128) k /= 128.0;
  out = in + (in - 128.0) * k;        /* about the midpoint */
```

Nine measured values across three operands, predicted to the last digit:
`63.749 → 111.937` against a measured `111.94`, `48.118 → 8.177` against
`8.18`, and seven more. Derived by reading, then checked against the probe —
not fitted to it.

**`op11` shares the handler** and takes the other branch: `|operand − 128|`,
subtracted from 128, through `frsqrte`, negated when the operand is below 128 —
a reciprocal-square-root curve rather than a linear one.

**`op10` is a channel permutation, not a "darken".** Its operand byte holds four
2-bit fields, unpacked with `rlwinm` into byte offsets, and passed in pairs to
`0x100007f8` — which is five instructions that **exchange two channels** of the
pixel. So op10 applies two transpositions to the RGBA channels. The behavioural
pass had recorded it as darkening, which is what a channel swap looks like on a
coloured noise field when you are only measuring mean luminance.

**`op18` and `op19` set a region.** `op18` reads four operand bytes into
`r2+0x25a6…0x25a9`; `op19` writes `0, 0, 0x80, 0x80` there. `_generate`'s
prologue initialises the same four bytes to `0, 0, 128, 128`, so this is the
**draw rectangle** — set and reset. The behavioural pass filed both under "no
change", which was true of the pixels and missed the point.

**`op14` and `op15` work on the mask, not the colour surface.** They share
`0x10001324` and loop `0x4000` = 16,384 times over `r5` — one float per pixel,
the single-channel buffer at `r2+0x246e`. `op14` adds `128 − operand`; `op15`
scales about 128 by `operand/128`. Both clamp to `[0, 255]`. `op13` fills that
same buffer from a channel of the colour surface. So there is a **mask pipeline
running alongside the colour one**, which is why ops 13, 14 and 15 looked inert
in a probe that only measured the colour output.

| op | read as | the behavioural pass said |
|---|---|---|
| 10 | channel permutation, two swaps | "darken, lum −20" |
| 11 | `frsqrte` curve about 128 | "state setter" |
| 12 | contrast about 128, exact formula | "brighten, lum +34" |
| 13 | copy a channel into the mask | "state setter" |
| 14 | mask: add `128 − operand` | "state setter" |
| 15 | mask: scale about 128 | "state setter" |
| 18 | set the draw rectangle | "state setter" |
| 19 | reset the draw rectangle | "state setter" |

That is the lesson the differential pass could not have reached on its own:
"what does this do to a test image" and "what does this do" are different
questions, and the first only approximates the second. It was still the right
way in — it found which opcodes mattered and got the harness working — but its
labels are hypotheses, and eight of them are now replaced.

**And `0x100008e4` is the noise source.** Shifts, `xor`s and adds over `r14`,
`r11` and `r12`, then `rlwinm` to take a byte and `int2float` — a small
pseudo-random generator, which is what `op9` draws on.

#### `op9` — a lattice reading that the test destroyed

The handler reads a byte at `operands+8`, splits it into nibbles, and builds two
counters that start at 8 and double once per nibble unit. It then calls the PRNG
**four times per iteration**, `fmadd`s each result into one channel, and stores
through the clamp routine at `(r24 << 7) + r25 + r28`.

From that I concluded the counters were X and Y **strides** — that `op9` seeds a
sparse lattice every 16th, 32nd or 64th pixel, and that the blur kernels exist to
interpolate it. It was a tidy story: it explained why seventeen of the forty
kernels are blurs and why the addressing wraps.

**It is wrong.** The reading makes a sharp prediction — operand `0x00` should
light 64 pixels, `0x11` sixteen, `0x22` four — and running `op9` with
`operands[8]` set to `0x00`, `0x11`, `0x22`, `0x33`, `0x40` and `0x44` gives
**16,384 lit pixels with spacing 1 in every case**. The surface comes out fully
populated whatever the nibbles say.

So the nibbles do something else, and the addressing is not what I read either:
`(r24 << 7)` is 128 per unit against a 16-byte pixel, which is 8 pixels, not a
row. Both the stride story and the pixel-index story fail together.

What stands is only what the instructions show: a byte at `+8` split into
nibbles driving two doubling counters, four PRNG draws per iteration `fmadd`ed
into four channels, and a clamped store.

**So measure the operands instead of reading them.** Varying each of the twelve
in turn between `0x00` and `0x80` against a `0x40` baseline, and watching the
per-channel means and the spread:

| operand | effect |
|---|---|
| `[0]` | **global level** — mean 84.3 at `0x00`, 59.9 at `0x40`, 35.4 at `0x80` |
| `[1] [2] [3]` | **per-channel level**, one each: 19.8 → 59.9 → 99.9, linear in the operand |
| `[4]` | **global amplitude** — mean falls and spread rises together |
| `[5] [6] [7]` | **per-channel amplitude**, one each: `[5]` takes channel 1's spread from 16.4 to 104.7 |
| `[8] … [11]` | small but real: spread moves by 3–5, means barely at all |

Twelve operands resolve into four groups, and the structure is legible without
knowing what any instruction does: a level and an amplitude, each once globally
and once per channel, then four parameters that change the *character* of the
noise rather than its level. Alpha stays 0.0 throughout — `op9` does not write it.

That last group is where the nibble byte lives, and its small effect is itself
evidence: a stride would have changed how many pixels were lit, and nothing did.
**What `[8]`–`[11]` control is still open**, but it is not sparsity.

### The whole operand map — `texprobe.py`

The same scan over all twenty opcodes. `.` is no measurable effect, `cN` one
channel, `all` every channel, `~` spread only:

```
  op  0 (  3)  c1 c2 c3
  op  1 ( 20)  .  .  .  .  .  ~  .  .  .  .  .  .  .  .  .  .  .  .  .  .
  op  2 ( 13)  .  .  .  .  all c1 c2 c3 .  .  .  all .
  op  3 ( 12)  all c1 c2 c3 c3 c1 c2 c3 .  .  HANG HANG
  op  5 ( 10)  all c1 c2 c3 all c1 c2 c3 .  .
  op  7 (  9)  ~  ~  ~  ~  ~  ~  ~  ~  ~
  op  8 ( 18)  .  x13 .  .  .  all all all .
  op  9 ( 12)  all c1 c2 c3 all c1 c2 c3 all ~  ~  c3
  op 10 (  1)  all      op 11 (  1)  all      op 12 (  1)  all
  op 13..16, 18, 19      no effect on the colour surface
  op 17 (  3)  c1 c2 c3
```

Three things fall out that no single-label pass could give.

**There is a shared colour-parameter block.** The quadruple `all c1 c2 c3` — one
global followed by three per-channel — appears in ops 2, 3, 5 and 9, twice over
in 5 and 9. So several opcodes take the same parameter shape, and a port
implements that block once.

**Ops 13, 14, 15, 16, 18 and 19 move nothing on the colour surface**, which
matches the handlers read above: two are region state, three are the mask
pipeline. The probe and the reading agree, which is the first time in this
section they have.

**`op3` hangs on two of its operands, and only at zero.** Narrowing it: operands
10 and 11 do not terminate at `0x00` and terminate at every other value tried —
`0x01`, `0x02`, `0x04`, `0x08`, and on up through `0xff`. One is enough, zero is
fatal.

That is the signature of a **loop step or divisor**, and it makes this a second
runaway in the original after the glyph scan — with the same character. Both are
degenerate inputs the shipped data never supplies, so neither ever fires in the
demo, and both would hang a port that translated the loop literally.

It is also only visible because the probe treats a timeout as an answer rather
than an exception. The first run of `texprobe.py` died on this operand with a
`TimeoutExpired` traceback and produced nothing for the remaining seventeen
opcodes; making `texconv.run` return `None` on expiry turned the crash into the
most interesting row in the table.

This is the second interpretation in this session that a test destroyed — the
first being the six silent scenes — and in both cases the test was worth more
than the interpretation. The pattern is the same: a reading that explains a lot
at once, believed because it is satisfying rather than because it was checked.

They are **generated at run time**, not static: `_generate`'s prologue calls
`0x1000067c` with `r31 = r2+0x2516` before anything else, and the table lives in
seg 6. Deterministic, though — the verification runs the opcodes in *separate*
processes from the dump and still matches exactly. A port can ship the forty
kernels (`tex_kernels.json`) instead of reimplementing the generator.

**`0x55` is special-cased** out of the table and is not a convolution at all:
`max(255 − x, 0)` over the surface — **invert**.

So the texture language is 20 table-dispatched opcodes plus 40 named 3×3
filters. For a port that ships the rendered PNGs none of this is needed; for one
that reimplements the generator it is most of the work, and it is ordinary
image processing rather than anything exotic.

**Scenes.** u16 length, then single opcode bytes; bit 7 is a flag stored at
node+0x0e, bits 0–6 the opcode. The first opcode is **implicit and is 7**, which
is why payloads begin `5B FF 0F xx 80 00` and that is *not* a magic number. The
low bits of an operand byte index `param_3`/`param_4`, which are built at
runtime in seg 6 — so scene streams cannot be decoded statically.

`runscene.py` runs the interpreter for real, the way `rungeo.py` did for
geometry. It took three findings to get there, recorded here in the order they
were needed.

*The Warp3D vector stubs have to blanket the region, not sit on 6-byte
centres.* The globals hold **base + 2**, so real fetches land on odd-looking
displacements — `W3D_AllocTexObj` is read at `-0x5e`, `UploadTexture` at
`-0x8e`, `SetFilter` at `-0x76`. Filling only multiples of 6 leaves those reading
zero. The fix is to fill every 2-byte slot below the base with a pointer whose
two halves are **identical** (the stub sits at `0x20402040`), so any aligned
`lwz` returns it. With that, `_alloc_txt` runs.

*`W3D_SetFilter` is called with `(2, 2)`.* That is `W3D_LINEAR` for both
minification and magnification — bilinear, no mipmapping — read straight out of
`_alloc_txt` rather than inferred from driver documentation.

*The scene interpreter needs the font table built first.* `_play_scene_p_end`
calls `_init_txtgen` and `_init_scene_generate` before any scene runs, and scene
handler **[4] at `0x10002e10` is the text renderer**, which walks the 20-byte
glyph records. Without the unpacker having run, that walk never terminates.

**A latent bug in the original, at `0x10002e78`.** The glyph scan reads a table
entry into `r10`, compares it against the sought character in `r26` — and then
tests **`r26`** against `0xFF` for the loop exit, not `r10`. So the terminator
check is against the search key rather than the table sentinel: looking up a
character that is not among the 40 glyphs **scans forever** and walks off memory.
It never bites in the demo because the text only uses characters that exist. Two
consequences: a port must not reproduce it as a hang, and it is independent
evidence that the shipped strings are confined to that 40-glyph set.

**And it is one word, so the harness fixes it.** `ppcrun.fix_glyph_scan` swaps
the compare's `rA` field from r26 to r10 — `0x2c1a00ff` to `0x2c0a00ff` — in the
*mapped image*, never in the archive. `ppcrun.PATCHES` is applied by `load_seg`
at map time, so whether a result came from a patched run is a property of the
run, and anything recorded from one says so (`patches` in `scenes.json` and
`draws.json`).

Two results follow, and the second is what makes the first usable:

* **The two text scenes decode.** `r2+0x25aa` turns out to be the biggest scene
  in the intro — 963 to 988 primitives per frame, the opening titles, one quad
  per glyph. `r2+0x25ee` yields 3 and fades. So the harness now covers
  **28 of 28**.
* **Every scene that already decoded is byte-identical with the patch applied.**
  Hashing the recorded streams of `0x25ba`, `0x25ce`, `0x25ca` and `0x25c6` at
  three frames each gives the same digest either way. That is the control the
  first result needs: the fix only changes the path where the original would
  have hung, so enabling it globally costs nothing.

It also confirms the diagnosis outright. A one-word change to the operand named
as wrong is what turns a hang into a scene.

**And that last point was the whole problem.** `r2+0x25aa` is the first *table
slot* but not the first *scene played*. Every earlier attempt had been feeding
the interpreter the one stream that happens to fail. Running the real order gave
**16 of 18 part-one scenes**, with `0x25aa` and `0x25ee` still faulting — and
those two came in later with the one-word patch above, for **18 of 18**.

### The scene graph, extracted

`_show_scene` dispatches on a halfword at node+8 holding *index × 4*. Reading it
back gives the graph directly. Node sizes are useless for this — the handlers
allocate sub-objects between list nodes, so consecutive nodes are not adjacent.

```
  r2+0x25d2  11 nodes   [7, 3,3,3,3,3,3,3,3,3,3]
  r2+0x25ba   8         [7, 3,3,3,5,3,3,5]
  r2+0x25ce  10         [7, 5,3,3,4,3,3,3,3,3]
  r2+0x25ae   9         [7, 3,3,3,3,3,3,3,5]
  r2+0x25b2   7         [7, 3,3,5,3,3,3]
  r2+0x25b6   8         [7, 3,3,3,3,3,3,5]
  r2+0x25ca   2         [7, 5]
  r2+0x25be   3         [7, 5,5]
  r2+0x25c2   3         [7, 5,5]
  r2+0x25c6   8         [7, 3,3,5,5,3,4,4]
  r2+0x25da   5         [7, 5,5,5,5]
  r2+0x25d6   2         [7, 5]
  r2+0x25de   2         [7, 5]
  r2+0x25e2   7         [7, 5,5,5,5,5,6]
  r2+0x25ea   3         [7, 5,5]
  r2+0x25e6   4         [7, 5,5,5]
```

**Every scene opens with node type 7** — the root, exactly matching the implicit
opcode 7 in the stream format. It is never dispatched; the render table has only
seven slots (0–6), so a stored 7 is the sentinel, not an index.

Frequency across part one: **type 3 ×43, type 5 ×29, type 4 ×3, type 6 ×1**, plus
the 16 roots. So part one uses only **four of the six render handlers**, and the
two thin wrappers at slots 0–2 — the direct `DrawLineStrip` and `DrawTriFan`
calls — are **never reached from part one's scene graph** at all. Whatever drives
those is elsewhere, or belongs to part three.

**Part three decodes 11 of 11**, and its scenes are far larger — 29, 25, 23 and
33 nodes against part one's 2 to 11, matching its 13,268 bytes of scene data
against part one's 6,134.

```
   0. r2+0x277a  29  [7, 3,3,4,4,4,3,3,3,3,3,3,3,3,5,5,3,3,3,3,3,3,3,3,5,5,5,3,3]
   2. r2+0x2782  23  [7, 3,3,2,2,1,3,1,3,1,3,1,3,1,3,1,3,1,3,5,4,4,5]
   3. r2+0x2786  33  [7, 3,3,2,2,2,2,2,2,3,5,5,5,4,4,3,3,3,3,3,4,4,3,4,1,1,1,1,1,3,3,5,5]
   9. r2+0x279e  26  [7, 3,3,3,3,3,3,3,3,3,3,3,1,1,4,4,4,4,4,4,4,4,4,4,4,3]
```

Part three frequency: **3 ×109, 4 ×38, 5 ×18, 1 ×14, 2 ×13, 0 ×1**, plus 11 roots.

**Between them the two parts use every slot in the render table.** Part one
supplies the only use of type 6; part three supplies the only uses of types 0, 1
and 2 — the thin `DrawLineStrip` and `DrawTriFan` wrappers that part one never
reaches. Nothing in the seven-slot table is dead code, which is a good sign the
table bound is right.

That is the timeline for the whole demo: **29 of 29 scenes decoded** — 18 of 18
in part one, 11 of 11 in part three — each an ordered list of typed draw nodes,
with the running order readable from `_play_part_1` and `_play_part_3`.

Two of them took longer than the rest, and both were text scenes dying in the
same place: the loop at `0x10002e44` in scene handler [4], the unterminated glyph
scan described above. Cross-scene state was ruled out first — `runscene.py` takes
a `pre=` list to run earlier scenes in the same process, and `0x25aa` still
failed after `0x25d2`, `0x25ee` after `0x25e6` — which left one identified code
path with a known latent bug rather than two unexplained failures. The one-word
harness patch then closed both.

For a port the lesson is unchanged: the glyph scan is the *renderer's* character
lookup, the text content itself is ordinary scene data, and a port must bound
that scan rather than translate it literally.

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

**And the mesh comes out too, not just the opcode sequence.** The nodes carry the
generated geometry: an `op4` node holds a vertex count at `+0x1a` and a pointer
at `+0x1c` to an array of 20-byte records — `(x, y, z, w)` floats plus a flag
word. Program `0x10030b56` yields two control vertices at `z = ±1024, w = 100`.
So geometry is extractable as data on the same terms as the textures, without
reimplementing a single handler.

## The geometry evaluate pass — one handler, three transforms

The fifth table (`0x1000a9c4`, five slots) turns out to be almost entirely
inert. Slots 0 and 4 both point at a bare `blr`, and slots 1 and 2 belong to the
two geometry opcodes that **never appear in the shipped data**. So exactly one
body ever runs: **slot 3 at `0x10004e64`**.

It is a transform interpreter, and it explains the operand-width rule recorded
earlier for build-op 3 (`3 + 6·(nonzero 2-bit groups)`):

```
  outer = byte[node+0x19]
  repeat outer times:
      sel = byte[node+0x1b]          ; up to FOUR packed 2-bit selectors
      vec = node + 0x1c              ; one 3-float vector each
      while sel:
          switch (sel & 3):
              1 -> translate     0x100041b0
              2 -> rotate        0x100042cc
              3 -> scale         0x100041ec
              0 -> skip
          vec += 12; sel >>= 2
```

All three walk the object's vertex list (`node+4`, chained by `+0x68`) and act on
each vertex's position at `+0x24…+0x2c`:

- **translate** adds the vector;
- **rotate** goes through the `_sinus` table and its quarter-turn cosine offset;
- **scale** first divides the operand by **255.0** (`r2+0x2dee`) — so scale
  factors are authored in 0…255 units, the same convention as the texture VM's
  colour maths — then multiplies, and afterwards rescales the per-vertex normals
  at `+0x3a/+0x3e/+0x42` and renormalises them.

**Two approximations, both deliberate — and both invisible to the harness.**
That renormalisation uses `frsqrte` with **no Newton refinement**, just as the
projection uses `fres` rather than a divide. On the hardware these are low-
precision estimates and the difference from exact maths is systematic. Under
qemu both are computed exactly (measured: the recorded `w` matches `1/z` to
float32 rounding), so the recorded stream shows the *exact* answer and a port
matched against it inherits qemu's precision, not a 604e's. Only a capture can
say whether that is visible.

With this the **five dispatch tables are all read**: texture, scene, geometry
build, geometry evaluate, render.

## Warp3D surface — 22 functions, 29 sites

`vecscan.py` recovers this from the code alone: an AmigaOS call is
`lwz rA, disp(rBase)` where `rBase` came from one of the eight library-base
globals, so tracking which register holds which base and collecting the negative
displacements gives the surface exactly. 22 distinct vectors over 29 sites, plus
two `powerpc.library` vectors and nothing else — no `dos.library`, no
`graphics.library` from the PowerPC side at all.

Names come from ReWarp3DPPC's `VecTable68K[]` (LGPL-3.0, github.com/Sakura-IT),
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
  applies when the framebuffer is 15/16-bit. `documented` — and the screen this
  intro opens is **16-bit** (see the bootstrap section), so it applies here.
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

## The 68K bootstrap, read end to end

606 bytes at `seg0+0x0000`, and after the seg-5 mistake it was worth reading all
of them rather than only the part that had just bitten. The question it answers
is *what else does the harness not do that the PowerPC code depends on* — and
the answer is nothing.

```
  lea.l   $10007ffe.l, a4          ; the small-data base, hence r2
  movea.l $4.w, a6                 ; SysBase
  OpenLibrary x6 -> powerpc, dos, intuition, graphics, Warp3DPPC, cybergraphics
  ... build the four seg-5 tables with the FPU ...
  Open("ram:dbplayer.library", MODE_NEWFILE)
  Write(fh, <seg1>, $4240)         ; 16,960 bytes — seg 1, exactly
  Close(fh)
  OpenLibrary("ram:dbplayer.library") -> _DBMBase
  ... CyberGFX screen and bitmap, pointers into r2+0x2362/0x2366/0x236a ...
  RunPPC(_main)                    ; 0x10001898 pushed as the entry
  ... free the screen, DeleteFile("ram:dbplayer.library") ...
```

### The framebuffer is 16-bit, and the buffer is double-height

The screen the bootstrap opens, from its `OpenScreenTagList` tag list at
`0x10000304`:

```
  0x80000023  640      width
  0x80000024  960      height  — 2 x 480
  0x80000025   16      depth
  0x80000032    0      display ID: any
```

and `_W3D_ContextTag` at `0x1000035c` agrees:

```
  W3D_CC_BITMAP       0   (filled in at run time)
  W3D_CC_YOFFSET      0
  W3D_CC_DRIVERTYPE   2   hardware
  W3D_CC_DOUBLEHEIGHT 1
  W3D_CC_FAST         1
```

**960 = 2 × 480 with `W3D_CC_DOUBLEHEIGHT`** is the double buffer, and it is the
same 480 the 68K frame routine writes into `RyOffset` before `ScrollVPort`. So
buffer swapping is a scroll, not a bitmap switch.

**Depth 16 is the port-relevant one.** The driver notes above record that
`A8R8G8B8` uploads unconverted to a direct-colour target and that *dithering only
applies when the framebuffer is 15/16-bit* — that condition is now resolved, and
it applies. The original composites 32-bit textures into a **16-bit** target with
the Permedia 2's dither, so its output carries banding and a dither pattern that
a WebGL2 port rendering to 8-bit-per-channel RGBA will not reproduce by default.
It is the sort of difference that shows up immediately in a frame diff and is
easy to mistake for a blending error.

**seg 1 is explained.** The embedded `dbplayer.library 2.0` is written out to
`ram:`, opened as a library, and deleted on exit — the period trick for shipping
a library inside a single-file intro. `r2+0x2392` points at `0x10010000` and the
write length is `0x4240`, which is seg 1's base and size to the byte.

**The library is `Warp3DPPC.library`, not `warp3d.library`** — read from the
`OpenLibrary` name at `0x100003b6`, which is the same library `lvo.py` took the
88-vector table from. That agreement was assumed before and is now checked.

So the bootstrap initialises exactly three kinds of thing: library bases, the
four lookup tables, and CyberGFX display resources. The harness stubs the first
and third and now builds the second, and **nothing else it does is read by the
PowerPC subsystems**. There is no second seg 5 waiting.

## seg 5 is four lookup tables, and the 68K bootstrap builds them

This is the correction that invalidated a run of earlier measurements, so it goes
before them.

`_sinus`, `_atan`, `_power` and `_mexp` (`r2+0x2382…0x238e`) point into **seg 5,
which is BSS**. No PowerPC instruction anywhere writes it — the scan for stores
to those pointers comes back empty, and so does the scan for indexed float stores
into the region. The **68K bootstrap** fills them, with the FPU, before it hands
over:

```
  movea.l $2382(a4), a1        ; _sinus
  fmove.s #<0x40490FDA>, fp5   ; float32 pi
  fmove.s #4096.0, fp6
  fdiv    fp6, fp5             ; step = pi/4096
  move.w  #$27ff, d7           ; 10,240 entries
  loop: fsin fp0, fp1 ; fadd fp5, fp0 ; fmove.s fp1, (a1)+
```

| table | entries | contents | bytes |
|---|---|---|---|
| `_sinus` `0x10050000` | 10,240 | `sin(x)`, `x` stepping by float32 π/4096 | 40,960 |
| `_atan` `0x1005c000` | 1,024 | `atan(i/1024)` | 4,096 |
| `_power` `0x1005d000` | 100,000 | `2^x`, `x` from −1 by float32 1e-4 | 400,000 |
| `_mexp` `0x100bea80` | 15,000 | `e^x`, `x` from 0 by float32 1e-3 | 60,000 |

`_mexp` ends at `0x100cd4e0`, which is `0x10050000 + 0x7d4e0` — **seg 5's last
byte**. The four sizes account for the segment exactly, which is the check that
this is what it is for. And 10,240 = 8,192 + 2,048 explains the cosine trick: a
full turn is 8,192 entries and the table carries a quarter turn extra, so
`_sinus + 0x2000` is a cosine table for free.

**What this cost.** A PowerPC-only harness maps BSS as zeros, so every run before
this had `sin = cos = 0`: rotating geometry collapsed to a point, and whole
scenes drew nothing. `ppcrun.build_tables` rebuilds all four from the
bootstrap's own constants and `ppcrun.segments` lays them into the otherwise-BSS
segment. The recovered sine matches `sin(2πi/8192)` to 3e-7 — float32 precision.

The difference at one frame:

| scene | zeroed | with tables |
|---|---|---|
| `0x25ba` | 167 | **393** |
| `0x25ce` | 12 | **137** |
| `0x25da` | 0 | **403** |
| `0x277a` | 31 | **59** |
| `0x279e` | 7 | **12** |

Two to eleven times as much geometry, and the degenerate primitives — fans whose
vertices all landed on one point, noticed early and shrugged off — are gone
entirely. That shrug was the mistake: a collapsed primitive is a *symptom*, and
it was visible from the first recorded frame.

**Which subsystems this touches**, checked one at a time rather than assumed:

| subsystem | reads the tables? | earlier output |
|---|---|---|
| textures (`_generate`) | **no** — 12 programs hash identically | **correct as published** |
| geometry (`_generate_obj`) | yes, `_sinus` at `0x10003a58` | all 10 sampled programs differ — **was wrong** |
| renderer (`_calc_matrix`) | yes, `_sinus` at `0x10004f34` | **was wrong** |
| softsynth (`_generate_samples_part3`) | yes — `_sinus`, `_power`, `_mexp` at `0x10006ef4`–`0x10006efc` | sample waveforms only: regenerating the modules gives a **byte-identical schedule**, both parts, so the timeline never depended on it |
| scene graphs (`_generate_scene`) | not directly | node type lists come from the stream and are unchanged |

The texture result is the useful one to have checked: 69 PNGs are a shipped
artefact for a port, and they did not need redoing.

## The renderer, recorded — `drawlog.py`

The three pure subsystems could be run as functions because they touch no
library. `_show_scene` cannot: it *ends* in library calls. But those calls are
the interesting part, so rather than stub them to nothing, point every Warp3D
vector at a stub that **writes its arguments down** and returns. Run a scene at a
chosen frame and the log is the intro's own draw stream.

```
python3 drawlog.py flat/
  t=  0    10 draws     30 triangles  4 textures
      trifan n=5 tex=5  v0=(320.0,240.0) w=0.0016 uv=(0.00,0.00) a=0.63
```

Three things had to be arranged, and each is a fact about the program:

* **Time is a 50 Hz counter at `r2+0x2862`.** The frame function at `0x10001d9c`
  reads the system clock and reduces it to `secs·50 + micros/20000`. Writing that
  word directly makes the whole renderer a deterministic function of
  `(scene, frame)` — no clock, no OS, reproducible.
* **`W3D_AllocTexObj`'s return value has to be unique.** The generic recorder
  returns *its own log record's address*, so every call gets a distinct non-null
  handle and the draw calls that bind a texture can be tied back to which one.
  Allocation order is table order, so the handle maps straight to a texture
  index — and the counts confirm it is the *identity* mapping: `_alloc_txt`
  issues exactly 48 `AllocTexObj` calls for part one and 21 for part three,
  matching the two texture tables entry for entry. A `texture: 10` in the
  recorded stream is `rendertex.py`'s `p1_10.png`, with nothing in between.
* **The vertex array is one shared buffer, reused every call.** Left alone, only
  the last primitive of the frame survives. The stub advances the pointer past
  the slice it was just handed — in *both* primitive templates, since fans and
  line strips interleave and write into the same array. It also has to point at
  fresh scratch first: the intro's buffer sits `0x500` bytes below the clip-buffer
  pointer arrays, so accumulating in place corrupts them within twenty vertices.

  **And that arena must not be able to fill quietly.** Overflowing it does not
  fault — the vertices simply land past the dumped region and the parser drops
  those slices, which looks exactly like a primitive with no geometry. The
  opening titles came within 4% of the original 0xF0000 budget (14,731 vertices
  over five frames), so it was a matter of sampling one more frame. The arena is
  now 16 MB, the dump length is computed from the shared cursor rather than
  fixed, and a slice landing outside is counted and reported on stderr. Two
  scenes re-recorded across the change hash identically, so the fix is a guard,
  not a change of behaviour.

### The render handlers

The seven-slot table at `0x1000aa20` resolves to six bodies, and between the
emitter and these the whole draw side is accounted for.

| slot | at | what |
|---|---|---|
| 0 | `0x10005de8` | line strip — sets `r15` to the `DrawLineStrip` vector, `r22 = 2` |
| 1, 2 | `0x10005e00` | triangle fan — `r15 = DrawTriFan`, `r22 = 3` (**one body, two slots**) |
| 3 | `0x10005ddc` | picks fan or line strip on `node+0x68`, then falls into them |
| 4 | `0x10005e18` | text: walks `node+0x30` and emits one fan per glyph |
| 5 | `0x100061a0` | meshes — the workhorse |
| 6 | `0x1000644c` | the camera |

**Slot 5 is a two-level walk with per-face state.** Objects hang off `node+0x24`
chained by `+0x60`; faces hang off each object chained by `+0x5c`. And the face
record *is* the emitter's vertex-pointer array — count at `+0`, pointers from
`+4` — which is why the handler can end with `r19 = r17` and call straight into
`0x10006630`.

```
  face +0x00  vertex count          +0x2c  alpha
       +0x04  vertex pointers       +0x30  r, g, b
       +0x10  shading mode          +0x50  intensity scalar
       +0x12  cull flag             +0x54  texture
       +0x58  draw vector           +0x5c  next face
```

`+0x12` non-zero runs a cross product over the first three vertices and tests
its sign, skipping the face when it points the wrong way — **backface culling**,
with `1` and `2` selecting which side.

#### The shading, which is modulate-and-clamp and nothing more

`+0x10` picks between two routines, and both write the source-vertex colour the
emitter later copies. Per vertex, with the face's RGBA in `f24, f5, f4, f3`:

```c
  /* 0x10005eec — modes 0 and 4 */
  v[0x0c] = min(faceA * v[0x40], 1.0);      /* alpha */
  v[0x10] = min(faceR * v[0x44], 1.0);      /* r     */
  v[0x14] = min(faceG * v[0x48], 1.0);
  v[0x18] = min(faceB * v[0x4c], 1.0);

  /* 0x10006014 — mode 3, the same with a per-VERTEX intensity */
  k = fabs(v[0x64]);
  v[0x10] = min(faceR * v[0x44] * k, 1.0);  /* alpha is NOT scaled */
```

and mode 2 is the default routine with the face's own RGB pre-scaled by
`|face[0x50]|`. So the three shading modes are **none**, **flat** (per-face
intensity) and **Gouraud** (per-vertex intensity), over a plain multiply of face
colour by the vertex's own material at `+0x40…+0x4c`.

There is no lighting equation at draw time — the intensities are computed
earlier, from the normals that the evaluate pass renormalises. And the clamp is
one-sided: `fsel` against 1.0 caps the top, nothing catches a negative.

The destinations `+0x0c`, `+0x10`, `+0x14`, `+0x18` are exactly the alpha and RGB
fields of the 36-byte source vertex measured from the emitter side, which is a
free confirmation of that layout from the opposite direction.

**Slot 6 is the camera, and it is gated.** It opens by comparing `node+0x34`
against `r2+0x282e` — the global camera index that `_play_scene_new_camera` sets
— and returns immediately when they differ. That is why type 6 appears exactly
once in part one and never in part three: it is not a drawn object, it is the
node that installs a viewpoint, and part one's camera sequence is the only place
that switches. It optionally clears a region first (`node+0x30`), then loads a
transform from the object at `node+0x2c`.

### The vertex pipeline, in closed form

The emitter at `0x10006630` is the whole of it. Reading it settles the
projection without any fitting against a capture:

```c
  /* per node: cx = node[0x14], cy = node[0x18], scale = node[0x1c] */
  float rz = fres(z);              /* PPC reciprocal ESTIMATE, not 1.0f/z */
  out.x = x * (scale * rz) + cx;
  out.y = y * (scale * rz) + cy;
  out.z = (double)(4.0f * rz);     /* stfd — the depth value, a W3D_Double */
  out.w = rz;
  out.u = u;  out.v = v;           /* copied through untouched */
  out.rgb   = src.rgb;
  out.alpha = firstVertex[0x0c];   /* ONE alpha for the whole primitive */
```

`fres` is a **reciprocal estimate** instruction, not a divide. The PowerPC
architecture only requires it to be within about one part in 256, so on the
603e/604e this intro ran on, the perspective divide is approximate.

### The projection verifies exactly — and the estimate does not survive the harness

With the node snapshots giving stage C's output and the draw log giving stage
D's, the formula can be checked against the program rather than believed. For
every unclipped primitive, walk `srcEnd − 4·count` to the face record, follow its
vertex pointers, and apply the formula to the source positions:

**1,059 vertices across four scenes and two frames each: zero mismatches.**

The example is as clean as it gets — source `(−640, −480, 640)` with
`cx = 320, cy = 240, scale = 320` projects to exactly `(0, 0)`, a full-screen
quad's corner in authored round numbers.

**But the `fres` claim above does not hold for the recording.** Comparing the
recorded `w` against an exact `1/z` gives a relative error of **1.5e-8 median,
5.7e-8 maximum** — float32 rounding, not the ~3.9e-3 a 1/256 estimate would show.
qemu implements `fres` as a correctly-rounded reciprocal, so **the harness does
not reproduce the hardware's approximation**, and neither will a port checked
only against this stream.

That is a limitation of the oracle, not of the intro, and it is worth stating
plainly because an earlier note here claimed the approximation was visible in
what was recorded. It is not. The same applies to the `frsqrte` in the geometry
evaluate pass.

**How much could it matter?** Bounded from the recorded stream itself. A relative
error `e` in `w` moves a vertex by `|screen − centre| · e`, so over the export's
**144,744 vertices**, at the architecture's 1/256:

| | displacement |
|---|---|
| median | 0.39 px |
| 95th percentile | 1.25 px |
| maximum | 2.50 px |
| over half a pixel | 57,381 vertices — **39.6%** |

So it is not negligible: two fifths of the geometry could sit more than half a
pixel from where the harness puts it, and the extremes are two and a half pixels
out at the screen edges, where `|screen − centre|` is largest.

Two qualifications. This is the **architectural bound**, and real 603e/604e
implementations are typically well inside it, so the true figure is likely far
smaller — this is a ceiling, not an estimate. And it is a *displacement* bound,
not an error: whichever way the hardware rounds, it does so consistently, so the
effect is a slight systematic warp toward or away from the projection centre
rather than jitter.

### The projection is per-node, and that is the camera model

`cx`, `cy` and `scale` come from the **node**, not from any global camera, and
recording them alongside each draw shows what they are for. Across a sample of
six scenes — 3,877 draws, 54 distinct triples:

| `(cx, cy, scale)` | draws |
|---|---|
| `(200, 160, 159.0)` | 1,302 |
| `(200, 160, 234.4)` | 1,148 |
| `(640, 180, 120.0)` | 568 |
| `(320, 240, 320.0)` | 538 |
| `(140, 180, 190.0)` | 105 |
| `(160, 350, 100.0)` | 48 |

with `scale` taking 40, 60, 80, 100, 120, 159, 190, 234.4 and 320 across the
sample — a real spread of focal lengths, not one default with exceptions. (An
earlier version of this table was measured before the seg-5 fix and showed
`scale = 320` almost everywhere; that was the collapse, not the design.)

So `(cx, cy)` is a **2D screen placement** and `scale` a focal length, both
animated per node — `(0.77, 300)`, `(5.38, 302)`, `(-1.43, 294)` in consecutive
frames of a moving element. A port does not need a camera matrix for this; it
needs each node's own two numbers, which is a much smaller thing to get right.
`scale = 320` at 640 wide is a 90° horizontal field of view.

**And the transform inverts.** Recording `cx`/`cy`/`scale` with the projected
vertices makes `x = (sx - cx) / (scale · w)` and `z = 1/w` recoverable, which is
how a reimplementation of `_calc_matrix` gets checked: it must produce these
source vertices. Two spot inversions give `(0, 300, 640)` and `(-400, 0, 601.6)`
— authored round numbers, which is the sign the inversion is right.

Clipping is on for almost all fans (2,326 of 2,503 sampled) and `r22` is 3 for
fans and 2 for line strips throughout, as the emitter implies.

This costs no extra machinery. The emitter reaches the draw vector by
`mtctr r15; bctr` — a **tail** branch — so r30 (node), r14 (template), r19
(source cursor) and r22 are all still live when the recording stub runs.

The per-primitive alpha is taken from the first source vertex only, and
`if (alpha <= 0) return;` skips the primitive entirely — which is how elements
fade out of the scene. It is also why a scene's draw count falls over its life:
`r2+0x25d2` submits 10 primitives at t=0, 3 by t=1, 2 by t=26, and none from
t=52.

**Two vertex layouts, both measured.**

| source vertex | | `W3D_Vertex` — 64 bytes | |
|---|---|---|---|
| `+0x00` | `x y z` | `+0x00` | `float x, y` |
| `+0x0c` | `alpha` (primitive-wide) | `+0x08` | `double z` |
| `+0x10` | `r g b` | `+0x10` | `float w` |
| `+0x1c` | `u v` | `+0x14` | `float u, v` |
| `+0x24` | object-space position | `+0x20` | `float r, g, b, a` |
| `+0x3a` | normal (unaligned) | | |
| `+0x40` | the vertex's own RGBA material | | |
| `+0x64` | per-vertex light intensity | | |

The first 36 bytes are what the clipper copies and the emitter reads; the record
itself is longer, and the fields above `+0x24` are what the geometry evaluate and
shading passes work on.

36 is confirmed independently: `_init_scene_show` builds two arrays of 100 clip
vertices on **`0x24`-byte centres**.

`W3D_Triangles` as this program builds it is `{ ULONG count; W3D_Vertex *v;
W3D_Texture *tex; }`, and the line-strip template carries a fourth word holding
`1.0f` — the line width.

**UVs are in texels, not normalised.** Recorded values run `0.0 … 128.0` for a
single tile and reach `5888.0` (46 tiles) where a texture scrolls. The intro
never calls `W3D_SetTexEnv` or `W3D_SetWrapMode`, so a port divides by 128 and
uses `REPEAT`.

### The clipper

`0x10006734`, called twice per primitive when `node[0x0e]` is set. It is
Sutherland–Hodgman in **view space against four planes**, two per call:

```
  call 1:  f4 = +1.0   x + z·(cx/scale) > 0     y + z·(cy/scale) > 0
  call 2:  f4 = -1.0  -x + z·((640-cx)/scale) > 0   -y + z·((480-cy)/scale) > 0
```

640 and 480 come from `r2+0x2e16` and `r2+0x2e0a` as float literals, so the
resolution is in the data, not assumed. Output ping-pongs between the two
`_init_scene_show` arrays, all nine source fields are interpolated, and a
primitive left with fewer than `r22` vertices (3 for fans, 2 for line strips) is
dropped.

### `_calc_matrix` is a keyframe engine, and the music drives it

The per-frame pass was the last unread subsystem. Its first helper
(`0x10004fdc`) is an **animation evaluator over keyframe tracks**, and the shape
is legible even where the details are not yet settled.

Per node:

| field | meaning |
|---|---|
| `+0x08` | head of the keyframe track |
| `+0x6c` | time origin — what `_restore_time` writes |
| `+0x70` | **music trigger value** |
| `+0x02`, `+0x03` | flag bytes; loop mode is bits `0xe0` of `+0x02` |

Local time is `frame - node[0x6c]`, converted with `int2float`. The loop modes
(`0x20`, `0x40`, `0x60`, `0x80`, `0xa0`, `0xe0`) are implemented by subtracting
keyframe spans from that local time before the search — hold, restart, and
multi-key wrap variants.

**The keyframe record, read out of a live track:**

```
  +0x000  u16  time in ticks
  +0x002  u16  flags
  +0x004  f32  the same time as a float
  +0x008  f32  1 / (span to the next key)   — 0 on the last key
  +0x00c  ..   16-byte cubic coefficient blocks, one per animated channel
  +0x0fc  ptr  next        +0x100  ptr  prev
  stride 0x104
```

Dumping the track on `anim 0x109a81c0` gives three keys at ticks 0, 100 and 200
on **260-byte centres**, with `+0xfc` running forward and `+0x100` running back —
a doubly-linked list, which settles the two-pointer question: the search walks
`next`, the loop modes walk `prev`.

`+4` duplicating `+0` as a float is what the evaluator needs (`f15 = localtime -
key[4]`), and `+8` being `0.01` against a 100-tick span shows the cubic parameter
is **normalised segment time**: `u = (t − t₀)/span`. Results land at `anim+0x3c`
and up.

**The polynomial, exactly.** `0x10005944` takes one 16-byte block as
`[c0, c1, c2, c3]` and `u`, `u²`, `u³`:

```c
  value = c0 + c1·u + c2·u³ − c3·u²;        /* keyframe flags == 0 */
  value = c0 − c3·u;                        /* keyframe flags != 0 — linear */
```

Note the ordering: `c2` multiplies **u³** and `c3` multiplies **u²**, and the
squared term is *subtracted* (`fnmsub`). A per-keyframe flag selects the linear
form, which reuses `c3` as the slope. There is a second entry point at
`0x10005970` that evaluates the same two forms and then **clamps to [0, 1]** with
a pair of `fsel` — the channel kind decides which is called, and [0,1] is what
colour and alpha need.

Angles go through `0x100059b4`: `float2int`, mask **`0x7ffc`**, then `lfsx` from
`_sinus` and from `_sinus + 0x2000`. So there is one **8,192-entry table with a
turn of 8,192 units**, and cosine is the same table read a quarter period along.
`_sinus` points into seg 5, which is BSS — the table is built at run time, and by
something not yet found: calling `_init_txtgen` and dumping the region gives
zeros, so it is not that.

**The music trigger is the interesting part.** The evaluator reads
`lhz r3, 0x23bc(r2)` — the value the 68K frame routine stores from
`dbplayer.library` every frame — and compares it against the node's `+0x70`. On
a match it sets `node[0x6c]` to the current frame and restarts the track. So
node animations are **retriggered by the music**, through the same halfword that
carries the scene-advance signal.

That is testable, and it tests true. Driving `r2+0x23bc` directly and recording
one frame:

```
scene 0x25ba   signal 0, 1, 11 -> 327 draws, identical
               signal 2, 3, 4, 10 -> 328 draws, identical to each other
scene 0x277a   signal 2 -> a different frame;  signal 3 -> different again,
               55 draws;  0, 1, 4, 10, 11 -> baseline
```

This one **survived the seg-5 correction unchanged**. Re-run with the lookup
tables present, the absolute counts move but the partition is identical — the
same signals are inert and the same signals are not, in both scenes. Worth
recording, because it is the difference between a result that depended on the
broken state and one that did not.

Which closes the loop with the module data. Effect 7's parameters measured in
the patterns are **0, 1, 2, 3, 4, 10 and 11** — value 1 advances the scene, and
the others are exactly this retrigger vocabulary. Both halves are now measured
rather than assumed: which values the music emits, and what each does to the
picture.

For a port this is the sync model in full. There is no separate beat detection
and no timeline of animation events — one halfword per frame, compared against a
byte per node.

#### Two structs, and the chain between them

`_calc_matrix`'s three helpers are three passes over the same list, and reading
the second and third settles what the first was producing.

There are **two objects per list entry**, not one:

| render node (`r14`, and `r30` in `_show_scene`) | | animation object (`[node+0]`) |
|---|---|---|
| `+0x00` the animation object | | `+0x00` type |
| `+0x04` texture | | `+0x02`, `+0x03` flags |
| `+0x08` render type × 4 | | `+0x04` **parent** |
| `+0x0e` clip enable | | `+0x08` keyframe track |
| `+0x10` next | | `+0x0c…` evaluated channels |
| `+0x14/18/1c` **cx, cy, scale** | | `+0x6c` time origin |
| `+0x24` object | | `+0x70` music trigger |

**Pass 2 (`0x10005394`) is the scene hierarchy.** `[anim+3]` bit 0 is a dirty
flag; the pass reads the **parent** at `[anim+4]`, defers if the parent is itself
still dirty, and otherwise composes — a component-wise `fmul` of the node's four
channels at `+0x48…+0x54` by the parent's, gated by flag bit `0x40`. So nodes
inherit from their parents by multiplication, not by matrix concatenation.

**Pass 3 (`0x10005510`) writes the answers where the renderer reads them.**

```
  lfs f13, 0x54(r31)     ; r31 = anim + 0xc, so anim + 0x60
  stfs f13, 0x14(r14)    ; -> the render node's cx
  ... +0x58 -> +0x18 (cy),  +0x5c -> +0x1c (scale)
```

`+0x14`, `+0x18`, `+0x1c` are exactly the three fields the emitter loads as
`cx`, `cy` and `scale`. That closes the chain end to end: **keyframe →
`anim+0x3c…` → parent composition → `anim+0x60…` → `node+0x14…` → the
projection**. It also explains why the projection is per-node — those numbers are
animated channels, not camera state.

The same pass then dispatches on the render type (`lhz r3, 8(r14)`), skipping
`0x1c` (type 7, the root sentinel) and giving type 6 its own preparation: 24
words copied out of the animation object into the buffer at `[r14+0x2c]` before
a call to `0x10005b34`.

So stage C's structure is: evaluate cubic keyframe tracks, compose down the
parent hierarchy, publish into the render node. Three passes, in that order.

#### And the chain is measured, not just read

`_calc_matrix` updates the graph **in place**, so `drawlog.run(nodes=True)` dumps
the scene arena after every frame and those snapshots are stage C's output — the
exact state the emitter then consumed. `drawlog.node()` reads one back.

Checking the snapshots against the draws recorded in the same run, on three
frames of `r2+0x25ba`: **258 draws, 258 agreements, 0 disagreements** on
`cx`, `cy`, `scale` and the clip flag. And on the example node, `anim+0x60…0x68`
reads `320.0, 240.0, 320.0` — identical to the render node's `cx, cy, scale`.
The link that was read out of pass 3 is now also observed.

Two details the dump adds: a root's parent is the sentinel **`0xFFFFFFFF`**, not
null — and pass 2 dereferences the parent immediately after its dirty-bit test,
so a root must never be dirty (the observed root has `flags[3] = 0x00`).

### Scene length comes from the music — and the schedule comes out whole

Every scene driver — `_play_scene`, `_play_scene_synchro`, `_play_scene_dalej`,
`_play_scene_new_camera`, `_play_scene_p_start/p_end` — has the same loop:
`_calc_matrix`, `_show_scene`, `rmb_mouse`, repeat. `rmb_mouse` exits on the
right mouse button **or** when the halfword at `r2+0x23ba` reads 1, and nothing
in the PowerPC code ever writes 1 there.

The 68K frame routine `__refresh` does (`ppdis.py flat/ 0x1000025e 0x100002bc -m`):

```
  a1->0xa = d5                 ; RyOffset 0 or 480 — the double buffer flip
  jsr -$24c(GfxBase)           ; ScrollVPort
  jsr -$192(GfxBase)
  jsr -$3c(DBMBase)  -> d0     ; dbplayer.library, LVO -60
  if (d0 && d0 != last && d0 == 1)  *0x23ba = 1
  last = d0
```

So **a scene ends when `dbplayer.library` reports signal 1** — the module drives
the timeline, and the previous frame's value is kept so only the transition
counts. Since `_generate_samples_part1/3` already run byte-exactly under the
harness, the timeline is recoverable offline: it is in the generated DBM0's
pattern data, not in the code.

**LVO −60 is a pure getter.** The library is embedded in seg 1, so `lvo.py` reads
its own ROMTag: 11 vectors, 7 library functions, and index 9 (LVO −60) is six
instructions long —

```
  movea.l  $10010040.l, a6      ; the player context
  move.l   $3a(a6), d0          ; return the signal
```

`$3a` is cleared by LVO −30 (play), and written by an effect handler at
`0x100231c6` as `param & 0xFF`. So the *value* is a pattern effect's parameter.

**Which effect, decided by counting.** `_play_part_1` contains 26 calls to the
scene drivers and `_play_part_3` contains 13, each of which waits for one
signal-1. Walking the order lists of the generated modules, **effect 7 with
parameter 1 occurs exactly 26 times in part one and exactly 13 in part three**.
No other (effect, parameter) pair matches either count, and the agreement holds
on both parts independently. Effect 7 is ProTracker's tremolo; here it is
DigiBooster's set-signal, and its other parameter values (0, 2, 3, 4, 10, 11)
are signals the demo reads through `*0x23bc` for other purposes.

**Tempo.** Effect 15 read as ProTracker `Fxx` — below 32 sets ticks-per-row, at
or above sets BPM — gives part one speed 12 at 105 BPM and part three speed 6 at
128 BPM. That reading checks out against the result rather than being assumed:
part three's boundaries land on 15.000, 60.000, 75.000, 90.000 and 135.000
seconds exactly. Part one runs 288.4 s, part three 149.9 s.

`showorder.py` puts the two halves together — the call order from the code, the
durations from the music — and writes the whole schedule. Given only `flat/` it
generates both modules itself through `runsynth.py`, which is the honest default:
they are not data that exists anywhere, they are output of the intro's own
softsynth. (Part one's takes minutes under qemu — it builds 5.3 MB of samples —
so `runsynth.module()` waits properly rather than returning an empty buffer that
fails much later as "not a DBM0 module".)

```
  [ 0] synchro       0x25aa      0.000..  18.429s  (  921 ticks)
  ...
  [10] synchro       0x25da fog@0x25f2   169.286.. 173.857s  (  229 ticks)
  [11] new_camera   (reuse) cam1         173.857.. 178.429s  (  228 ticks)
```

Two things fall out that were previously only inferred. The four fog presets
land on scenes `0x25da`, `0x25d6`, `0x25de` and `0x25ee`, in the table order
`0x25f2`/`0x2606`/`0x261a`/`0x262e` — confirming the setter's four call sites
against the data. And the three `new_camera` triples attach to exactly three of
the six scenes that record nothing on their own, which is where the missing
state for those is most likely to be.

### What the recording covers, and what it does not

All 28 scene spans record, and a full export is **45,332 primitives** at five
samples each, zero failures. Against the same export run with seg 5 zeroed that
is **4.9x** — every scene grew, four of them from nothing, and `r2+0x25d6` went
from 0 to 4,321. Part three is the heaviest — `r2+0x277e` holds 200 to 215
primitives throughout — and `r2+0x25c6` climbs from 3 primitives to 225 over its
life, which is the reason for sampling across a scene's own span rather than a
fixed early window.

**Six part-one scenes recorded nothing of their own, and the reason was the
harness, not the intro.** `0x25da`, `0x25d6`, `0x25de`, `0x25e2`, `0x25ea` and
`0x25e6` produced only the overlay — and an explanation was written here that
tied them to `_generate_scene`'s null-object branch and to the two geometry
programs with no payload. **That explanation was wrong.** It was a correlation
between two things that both happened to be broken, and it did not survive the
next fix: with seg 5's lookup tables present (see below) all six render — 666,
854, 623, 114, 289 and 292 primitives of their own. The two geometry programs are
unchanged by the tables, so they were never the cause.

Worth keeping as a caution. The null-object branch at `0x10002874` is real code
and the two payload-less programs are real; joining them into an explanation was
the mistake, and the joint was never tested.

The running order recorded above also needs a correction. `_play_part_1` loads
`r2+0x25d2` first, but hands it to **`_init_synchro`** — it is the overlay built
once into its own arena (`r2+0x2836`) and drawn on top of every scene, not the
first scene. The first scene *played* is `r2+0x25aa`, and `drawlog.py` takes an
`overlay=` argument so the recorded stream matches what the screen showed.

### `_main`, and why part three is conditional

```
  _main:  bl 0x10001c4c        ; init
          bl _play_part_1
          lwz r3, 0x28a6(r2)
          cmpwi r3, 1
          beq  skip            ; <-- part three only if this is NOT 1
          bl _play_part_3
          bl 0x10001d50        ; teardown
```

`_play_part_1` writes **1** to `r2+0x28a6` on entry and **0** only after its last
scene returns normally. So the flag means *aborted*, and **part three plays only
when part one runs to the end** — press the right mouse button anywhere in part
one and the intro stops there. Uninterrupted, the show is 288.4 s + 149.9 s =
**7 minutes 18 seconds**.

The init at `0x10001c4c` also confirms the render-state table above from the
other direction: `_init_txtgen`, `_init_scene_show`, `_init_scene_generate`, then
`W3D_CreateContext` with the tag list at `_W3D_ContextTag` (`r2-0x7ca2` =
`0x1000035c`), `W3D_SetDrawRegion`, and then exactly the enable/disable sequence
recorded there — `0x100`, `0x200`, `0x400` on; `0x800`, `0x1000`, `4` off;
`0x2000` on; `0x4000` off; `W3D_Hint(0xa, 1)`.

### `_init_txtgen` is a 1-bit bitmap expander, not a generator

The name suggested a texture generator; the code is 15 instructions and does one
thing. Source at `[r2+0x247a]`, destination at `[r2+0x24ce]`, 128 outer × 16
middle × 8 bit iterations = **128 × 128 pixels**, writing one 32-bit word per set
bit and leaving cleared bits untouched. That is the font mask: 2,048 bytes of
1bpp expanded to a 128×128 32-bit image, matching the 128×113 glyph atlas the
font table indexes.

**And the source is seg 2**, the one segment that had stayed unidentified as
"table, entropy 2.99". The pointer at `r2+0x247a` reads `0x1001ffff` — one below
`0x10020000` because the loop uses `lbzu` — so the source is seg 2's 2,048 bytes,
which is 128×128 bits exactly. Expanding it in Python reproduces the harness's
output **byte for byte**, 4,241 set pixels, and rendering it shows the glyph
sheet with `0` visibly appearing twice, matching the quirk the font table
records. `export.py` now writes it as `font_atlas.png`: without it a port has the
letter positions but not the letters.

The word it writes is **`0x00FFFFFF`** — in `W3D_A8R8G8B8` that is alpha 0 with
white RGB, which under a replacing texture environment would be invisible. Since
the intro never calls `W3D_SetTexEnv`, what the default does with alpha is the
open question this raises, and it is worth resolving before a port draws text.

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

Total module sizes: **part 1 = 5,324,378 bytes, part 3 = 3,015,404**. The part-one
figure is confirmed twice over — the chunk walk gives it, and
`_generate_samples_part1` *opens* by loading the immediate `0x513e5a`, which is
5,324,378: the function states the size of the module it is about to build in its
first two instructions.

`DSPE` is DigiBooster Pro 2's DSP-effect chunk (28 and 26 bytes). Roughly 37 KB
of seed data in seg 4 expands to about 3 MB of module per part.

### Sizing the softsynth

Both generators are **straight-line scripts**: a sequence of `bl`s to synth
primitives, each preceded by `addi rNN, r2, disp` setting a parameter-block
pointer into the `r2` data area. So the ~37 KB of "seed data" is those blocks,
and the code is a fixed recipe rather than an interpreter.

| | calls | routines |
|---|---|---|
| `_generate_samples_part1` | 57 | 18 |
| `_generate_samples_part3` | 39 | 19 |
| union | 96 | **32 distinct** |

Only five routines are shared between the two parts. Part one leans on
`0x10009510` (13 calls), `0x10006f38`, `0x10009020` and `0x10009258` (8 each);
part three is dominated by `0x1000742c` (18 calls). The primitives span
`0x10006ef0`–`0x10009a8c`, about **11 KB of PowerPC** — larger than the renderer
and animation put together (6.9 KB) and the biggest single subsystem in the
intro.

`_generate_samples_part1` opens by loading `0x513e5a` = 5,324,378, the size of
the module it is about to build, which is how that figure was confirmed twice
over.

### The audio acceptance test — `synthhash.py`

The generators are pure functions of the binary, so their output is fixed and a
reimplementation either produces the same bytes or does not. `synthhash.py`
records the sizes, the whole-module SHA-256 and a **per-chunk digest**, because
"the module differs" is not a useful failure and "SMPL differs" is.

```
  p1  5,324,378 bytes  sha256 dfd0826755b81fba…
        NAME 44 · INFO 10 · SONG 80 · INST 2800 · VENV 274
        DSPE 28 · PATT 14,574 · SMPL 5,306,496
  p3  3,015,404 bytes  sha256 460939ceb5d2bbbd…
        NAME 44 · INFO 10 · SONG 80 · INST 1900 · VENV 546
        DSPE 26 · PATT 9,978 · SMPL 3,002,748
```

Running it caught a stale number in this file, and the mistake is instructive.
`0x513e5a` is **5,324,378**; the figure `5,324,890` appeared here three times and
is simply the hex converted wrong. It had already been corrected once during the
chunk walk, and then got copied back out of the older paragraphs into
`synthhash.py`'s size constant, where the generator's own prefix disagreed with
it on the first run. The chunk sum settles it independently: 44 + 10 + 80 + 2800
+ 274 + 28 + 14,574 + 5,306,496, plus an 8-byte header and eight 8-byte chunk
headers, is exactly 5,324,378.

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

## Texture opcodes — first and second pass, **superseded**

> These two tables are the differential passes, kept because they are how the
> texture VM was first opened up and because the later readings are corrections
> *of* them. **Eight of their twenty labels are wrong** — see "Reading the
> handlers beats the behavioural pass" above, and `texprobe.py` for the measured
> per-operand map. `op13` does not drive alpha, it fills the mask; `op10` is a
> channel permutation, not a darken; `op14`/`op15` act on the mask, not alpha.
>
> One thing here was right and got rediscovered the hard way: the first-pass note
> that **`op3` loops forever on all-zero operands**. `texprobe.py` found the same
> hang months of work later, and narrowing it to exactly zero was the only new
> part. Worth remembering that the crude pass had already recorded it.

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

**Second pass — `texops2.py`.** A single opcode shows nothing for most of the
table because there is no surface to act on. Running the noise generator `op9`
first and then the opcode under test separates them cleanly. Baseline: `op9`
alone gives 3,607 colours, mean luminance 59, range 37–82.

| class | opcodes | behaviour after `op9` |
|---|---|---|
| **surface writers** | `8`, `16` | wipe the whole surface to black |
| | `17` | fill with a solid colour (uniform luminance 64) |
| | `9` | additive — a second pass lifts mean luminance +22, range 53–108 |
| **modifiers** | `0` | strong darken: 3,607→883 colours, luminance −57, range 0–18 |
| | `2`, `3`, `5` | **identical** effect — compress the range to 57–68. One family |
| | `7` | mild compression, range 45–75 |
| | `10` | darken, luminance −20, range 24–57 |
| | `12` | brighten, luminance +34, range 82–105 |
| **state setters** | `1`, `4`, `6`, `11`, `13`, `14`, `15`, `18`, `19` | no surface change — they set parameters later opcodes consume |

That `2`, `3` and `5` produce byte-identical results despite taking 13, 12 and 10
operands is the most useful single fact here: they are one operation with three
operand encodings, so a port implements it once. It also matches the dispatch
table's shape, where 17 handlers serve 20 slots.

`13`, `14` and `15` show alpha effects when run alone but none after `op9`,
which is consistent — `op9` has already set the alpha channel.

## The exported dataset

`export.py` runs everything above in one pass and writes the whole recovered
production as consumable data:

```
python3 export.py flat/ out/

  out/textures/p{1,3}_NN.png   69 textures, 128x128, plus a contact sheet
  out/meshes.json              38 geometry programs: opcodes and vertex records
  out/scenes.json              29 scenes: ordered typed draw-node lists
  out/font.json                40 glyphs with the shipped quirks recorded
  out/render_state.json        Warp3D configuration, fog presets, port notes
  out/draws.json               the recorded draw stream, sampled per scene
  out/showorder.json           the show schedule, both parts, in ticks and seconds
  out/manifest.json            counts and what failed
```

The draw samples are spread across each scene's **own** span, taken from
`showorder.json`, rather than a fixed early window — part one's shortest scene
is 214 ticks and its longest 1,385, so a fixed window would have measured
sixteen fade-ins and nothing else.

`draws.json` is the one a port is checked against rather than built from: every
primitive the original submits at a given frame, with its texture index and its
screen-space vertices. A reimplementation that produces the same list is right
for reasons that can be pointed at, and one that does not can be diffed
primitive by primitive — without a video capture, and before a single pixel is
rasterised.

About 4.6 MB, dominated by the textures and the draw stream, and **regenerable from the original
archive by this one command** — so it is not committed, per the README's rule for
baked intermediates. The two scene failures and one mesh failure are recorded in
the output rather than silently dropped.

`render_state.json` is written as port guidance rather than raw findings: the
reversed depth convention, the blend factors as WebGL2 names, fog as
per-vertex-interpolated linear, and the note that `W3D_ReadZPixel` is a
synchronous stall needing an occlusion query rather than a literal translation.

### Where capstone stops, and what it cost

`ppdis.py` originally ended a listing at the first undecodable word, which is
capstone's behaviour and not obviously wrong until you notice a routine that
appears to be four instructions long. Sweeping the whole PowerPC range with the
resync in place finds **15 such words**: eight `0x00000000` alignment fills and
**seven `fcmpo`** (op 63, extended opcode 32) that this capstone build does not
know.

All seven are inside the texture VM — `0x10000784`, `0x100007cc`, `0x100009d8`,
`0x10000d0c`, `0x10000fc0`, `0x10000fe4`, `0x10001104`. Checking them against
every routine read so far, none falls inside the emitter, the clipper,
`_calc_matrix`, `_show_scene`, or any of the four synth voices; the only hit is
`0x10000d0c`, in the shared op11/op12 handler, which was read *with* the resync.
So nothing recorded earlier is truncated — but two of the sites sit in the op7
and op8 handlers, which is worth knowing before reading those.

This audit was itself wrong once. The first sweep reported zero undecoded words,
because it ran from the wrong directory and the tool never started; `grep -c` on
a failed command's empty output is a confident-looking `0`. Redirecting stderr
to `/dev/null` is what hid it.

## Tools here

| file | what |
|---|---|
| `hunkload.py` | Hunk parser + relocator → flat images, `symbols.csv`, `layout.txt` |
| `ppcrun.py` | hand-built PPC ELF; runs the pure subsystems under `qemu-ppc-static` |
| `rendertex.py` | every texture program → PNG + contact sheet |
| `rungeo.py` | runs `_generate_obj` with Warp3D stubbed; dumps the decoded node list |
| `texops.py` | one-opcode texture programs, for naming the texture ops |
| `texops2.py` | generator-then-opcode pairs, which separates modifiers from setters |
| `texconv.py` | dumps, decodes and **verifies** the 40 convolution kernels; writes them as JSON |
| `texprobe.py` | per-operand sensitivity for all 20 opcodes, including which operands hang |
| `runscene.py` | runs the scene interpreter; dumps the typed draw-node graph |
| `drawlog.py` | runs `_show_scene` with recording vector stubs; dumps the draw stream and, with `nodes=True`, the per-frame scene graph |
| `runsynth.py` | runs the softsynth; returns the generated DBM0 module |
| — | `export.py` also writes `tex_programs.json`: the 69 texture programs as bytecode, 3,407 payload bytes. Adding the 69 two-byte length prefixes gives 3,545, which is exactly the 2,780 + 765 in the program table above — the table counts the prefix, this export does not |
| `speccheck.py` | re-derives PORT_SPEC's numbers from the binary and greps the doc for superseded ones; exits non-zero on drift |
| `synthhash.py` | pins both modules' size, SHA-256 and per-chunk digests — the audio acceptance test. Slow: minutes per module, so it is not part of `export.py` |
| `dbmpatt.py` | unpacks DBM0 song and pattern data; finds the scene-advance signals |
| `showorder.py` | the show schedule: call order from the code, durations from the music |
| `vecscan.py` | every library vector the code fetches, by tracking the base registers |
| `ppdis.py` | ranged disassembly with symbol names; `-m` for the 68K bootstrap. Resyncs past words capstone cannot decode instead of stopping |
| `lvo.py` | reads a Warp3D library's own vector table from its ROMTag |
| `export.py` | runs all of the above and writes the whole dataset |
| `PORT_SPEC.md` | the current answer, organised for someone implementing it |
| `PPLoad.java` | Ghidra: load segments, apply symbols, decompile the named functions |
| `PPVm.java` | Ghidra: pin `r2`, name the VM handlers, decompile them |

```sh
python3 hunkload.py planet-potion_dcr.exe flat/
python3 rendertex.py flat/ tex/
$GHIDRA/support/analyzeHeadless proj pp -import flat/seg0_CODE_10000000.bin \
    -processor PowerPC:BE:32:default -loader BinaryLoader \
    -loader-baseAddr 0x10000000 -postScript PPVm.java $PWD/flat
```
