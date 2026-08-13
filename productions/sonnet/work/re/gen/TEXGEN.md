# Sonnet — TEXGEN (structure COMPLETE; handler semantics at mixed confidence)

> ## ⚠ READ `TEXGEN_PORT.md` ALONGSIDE THIS FILE
> The port (`js/texgen.mjs`) **corrected 13 claims below**, several of them
> load-bearing. This document is the RE narrative; **`re/gen/TEXGEN_PORT.md` is the
> authority wherever the two disagree.** The corrections that most often mislead:
>
> | this file says | actually |
> |---|---|
> | flags high byte = a control-op stack selector | it is the **layer index for pixel ops too** |
> | control op 12 = "push with explicit size" | it is a **BROADCAST flag** (`*ctx = argByte` ⇒ apply ops to every layer) |
> | op 17 = "a filter implemented in integer space" | it is the **Win32 GDI FONT-ATLAS renderer** — texture 11 is the font strip |
> | channel nibble bit0 → 0x000000ff | the consumer **reverses** it: bit3 → component 0 (alpha), bit0 → component 3. `0x07` = RGB is right, for the opposite reason |
> | the sampler is bilinear | it is **cosine interpolation with 8-bit-quantised weights** (Ghidra read the qword π at 0x419018 as a float) |
> | op 19 args are bytes | arg0 is a **u16** |
>
> Also established by the port: **three ORIGINAL bugs must be preserved** (root/pushed
> layer width-height swap; op 22 using the width accessor for both loops; op 31's
> divide-by-zero above 256 px), and **op 31's clip grace band makes texture 9 watertight
> only by accident** — see TEXGEN_PORT.md §15.

**Status: the ARCHITECTURE IS COMPLETE.** Archive layout, program format, instruction
encoding, channel masks, execution path, PRNG, the layer-stack model and all 29 opcodes
(21 pixel + 8 control) are accounted for. What remains is confidence-raising on ~10
handler bodies, which the port + reference-video verification will settle.

This file was reconstructed by the coordinator from `js/resources.mjs` (the only artifact
the texgen agent wrote before it was killed by repeated API errors) plus independent
re-derivation from the decompile and disassembly. Everything marked *verified* was
re-checked here; confidence is stated per handler.

## 1. The resource archive — VERIFIED

At **VA 0x4170da**, walked by `FUN_00401c3b(id)`: **52 length-prefixed blocks**, each
`{ u32 len; u8 data[len] }`, chained. Ends at VA 0x4181fc; **4178 bytes of payload
total**.

That number is the whole point of the intro: *4 KB of parameters generates every
texture, every scene and every camera move in the production.*

| ids | contents |
|---|---|
| 0–27 | **texture programs** (28 of them) — the texgen VM's bytecode |
| 28–35 | **scene descriptors** (8, one per effect object 3..10) — 0x3213 B when expanded, decoded by `FUN_00407767`; full header map in `MESHGEN_notes.md` §6 |
| 36–51 | **camera splines** (16) — *not* meshes; bfloat16 keys (u16 = the top half of a float) decoded by `FUN_00405a29` into cubic-Hermite paths (`FUN_00405778`). This corrects the original working assumption. |

## 2. Texture program header — VERIFIED

```
u8  version;    // always 0x01
u16 width;      // little-endian
u16 height;
u8  opCount;
// then opCount operations
```

Decoded across all 28 programs (sizes: 15×256², 5×128², 3×32², 2×16², 1×8², 1×512²,
1×512×2048; op counts 0–27):

| res | size | ops | | res | size | ops |
|---|---|---|---|---|---|---|
| 0 | 256² | 16 | | 14 | 256² | 14 |
| 1 | 256² | 14 | | 15 | 16² | 8 |
| 2 | 256² | 10 | | 16 | 512² | 2 |
| 3 | 32² | 1 | | 17 | 256² | 8 |
| 4 | 32² | 1 | | 18 | 256² | 8 |
| 5 | 16² | 5 | | 19 | 256² | 19 |
| 6 | 8² | 5 | | 20 | 256² | 21 |
| 7 | 256² | 6 | | 21 | 256² | 1 |
| 8 | 256² | 15 | | 22 | 128² | 6 |
| 9 | 256² | 13 | | 23 | 128² | 9 |
| 10 | 256² | 27 | | 24 | 128² | 11 |
| 11 | 512×2048 | 1 | | 25 | 128² | 6 |
| 12 | 32² | 0 | | 26 | 128² | 4 |
| 13 | 256² | 7 | | 27 | 256² | 3 |

Res 12 has **zero** ops (a cleared/solid 32² texture). Res 11's 512×2048 is unusual and
worth re-checking against its consumer — it may be an atlas/strip rather than a texture.

**So the answer to the central question is: the texgen is an OPERATOR/VM system driven by
a bytecode parameter table (the fr-08 family of design), NOT bespoke per-texture
routines.** This is the good case for the remaster: a VM whose ops are resolution-
independent can simply be run at a larger `width`/`height`.

## 2b. The VM's execution path — VERIFIED (coordinator, from the decompile)

```
FUN_00416036(id, w, h, outBuf)      // texture generator entry point, WITH A CACHE
  cache table @ DAT_00478a38, 8 B/entry { u8 valid; void* pixels }, 52 slots,
  zero-initialised on first use (DAT_00479238 guard)
  miss  -> FUN_0041254d(stream, &LAB_00416031)     // stream/reader over the resource
           FUN_00412662(stream, resourcePtr)       // PARSE + EXECUTE the program
           FUN_00415f44(obj, outBuf)               // flatten to the output buffer
           cache w*h*4 bytes
  hit   -> memcpy w*h*4 from the cache
```

**Two architectural facts that matter enormously for the remaster:**

1. **The VM computes in FLOAT RGBA throughout.** `FUN_00415f44` walks a `float[4]`
   canvas (`this+0` = float*, `this+6` = u16 width, `this+8` = u16 height) and packs each
   texel to a 32-bit word via `FUN_00414cf7` only at the very end. So the entire generator
   pipeline is floating point and only quantises once, on output — running it at higher
   resolution requires no precision work at all.
2. **Output is `w*h*4` bytes** and both `w` and `h` are *parameters of the entry point*,
   not constants — `FUN_00416036` takes them from the caller. The plumbing for a
   resolution remaster is therefore already present in the original's own interface.

## 3. Operation encoding — structure VERIFIED, opcode semantics UNRESOLVED

From `FUN_00412662`'s parse loop. Programs whose op-count byte is 0 use an **extended
count**: `u16` at +6, with the op stream starting at +8 instead of +6.

Each op is parsed into a 5-dword node:

```
node[0] = u16 @ +0      // OPCODE
node[1] = argLen        // u8 @ +4  (see escapes below)
node[2] = (u16 @ +2) >> 8      // secondary parameter (high byte of the flags word)
node[3] = expanded channel mask
node[4] = malloc'd copy of argLen bytes taken from +5
// stream advances to argsStart + argLen
```

**Channel mask — VERIFIED.** The low nibble of the `u16` at +2 expands bitwise:
`bit0 → 0x000000ff, bit1 → 0x0000ff00, bit2 → 0x00ff0000, bit3 → 0xff000000`.
So the pervasive `0x07` = three channels and `0x0f` = all four. (`FUN_00415fbb` is the
matching masked write: it stores each component only if its byte in the mask is non-zero.)

**Argument-length escapes — VERIFIED.** `argLen == 0xff` → the real length is the `u16`
at +5, and if *that* is `0xffff` the length is the `u32` at +7, with arguments starting at
+0x0b.

Worked example (res 0, first op) — `0e 00 07 00 04 2f 52 75 00`:
opcode 0x000e, flags 0x0007 (RGB, secondary 0), argLen 4, args = one colour `2f 52 75 00`.

### The res-9 "anomaly" is RESOLVED — there are two opcode classes

`FUN_0041281f` (the executor) branches on `(opcode & 0xff00) == 0xff00`:

* **`0xffNN` = CONTROL opcodes** — they manipulate the VM's buffer stack and current
  state rather than writing pixels. So res 9's `0xff0a` is legitimate: control op 10.
  Its all-zero channel mask is expected, because control ops do not write channels.
* **`0x00NN` = PIXEL opcodes** — dispatched through a function-pointer table (below).

Control opcodes observed in the executor (`sub = opcode & 0xff`):

| sub | handler / effect |
|---|---|
| 3 | `FUN_00412484(ctx)` |
| 4 | arg byte 0 → `FUN_004124a5(ctx)`, else `FUN_00412506(ctx)` |
| 6 | `FUN_00412413(ctx)` |
| 7 | `FUN_00412391(ctx)` |
| 8 | `FUN_00412539(ctx, argByte)` |
| 9 | store arg byte → `ctx+0x0c` |
| 10 | store arg dword → `ctx+0x08` (res 9 passes `ffffffff` — a colour) |
| 12 | `FUN_00412387(ctx, argByte)` |

Each control op is preceded by `FUN_00412a3c(ctx, node[2])`, so the flags word's high byte
is a stack/slot selector.
**CORRECTED by the port: it is the LAYER INDEX, and it applies to pixel ops too — see TEXGEN_PORT.md.**

### The VM is a LAYER STACK — control ops decoded (coordinator)

Context structure (offsets verified from the handlers):

| offset | meaning |
|---|---|
| `ctx+0x04` | **current slot index** (stack pointer) |
| `ctx+0x0c` | **slot count** |
| `ctx+0x10` | **array of slot pointers** |
| `ctx+0x28` | the output/result buffer |

Per-slot fields are reached via `FUN_00412a46(ctx)` (= "current slot"):
`slot+0x04` = a mode byte, `slot+0x08` = a colour dword, `slot+0x0c` = a mode byte.

| sub | operation |
|---|---|
| 3 | **SWAP + POP** — exchange `slot[sp]` with `slot[sp-1]`, then `sp--` |
| 4 | arg 0 → **COMPOSITE/FLATTEN**: scan for the first slot with a non-zero `+8`, copy it to the output at `ctx+0x28`, then merge the rest. arg ≠ 0 → **RESET**: release every slot and set `sp = 0` |
| 6 | **POP / DELETE SLOT** — release `slot[sp]`, shrink the array by one |
| 7 | **PUSH / INSERT SLOT** — grow the array by one, `sp++`, insert a new slot |
| 8 | set the mode byte at `slot+0x04` |
| 9 | set the mode byte at `slot+0x0c` |
| 10 | set the colour dword at `slot+0x08` |
| 12 | `FUN_00412387(ctx, argByte)` — small helper, not yet read |

**So Sonnet's texgen is a layered compositor**: programs push layers, run pixel ops on the
current layer, set per-layer blend mode and colour, and finally flatten the stack to the
output. This is the same family of design as Werkkzeug / fr-08's texture generator, which
is exactly what one would expect from stevie's tooling in 2001.

Two practical consequences for the port:
* `texgen.mjs` should model the stack explicitly (an array of float-RGBA layers plus a
  stack pointer), not try to flatten operations inline.
* Layer count is dynamic, so buffers must be allocated per program rather than fixed.

## 3c. THE OPCODE TABLE — VERIFIED (`FUN_0041254d` @ 0x41254d)

The VM constructor allocates a **0x400-byte (256-entry) function-pointer table**, zeroes
it, then installs **21 pixel-op handlers**. Opcode = table byte-offset / 4:

| op | handler | | op | handler |
|---|---|---|---|---|
| 2 | `FUN_00412a71` | | 19 | `FUN_004138f9` |
| 3 | `FUN_00412c59` | | 21 | `FUN_00413c76` |
| 7 | `LAB_00412f37` | | 22 | `FUN_00413db6` |
| 9 | `FUN_00412f5c` | | 25 | `LAB_00414195` |
| 10 | `FUN_004130b0` | | 26 | `FUN_004142eb` |
| 12 | `FUN_0041310c` | | 28 | `FUN_0041435f` |
| 14 | `FUN_00413330` | | 30 | `FUN_0041446a` |
| 16 | `FUN_0041337e` | | 31 | `FUN_00414535` |
| 17 | `FUN_004136a2` | | 32 | `FUN_00414b1e` |
| 18 | `FUN_0041378d` | | 33 | `FUN_00414dcf` |
| | | | 34 | `FUN_00415012` |

Every opcode seen in the 28 programs falls in this set — the inventory is complete.
Handlers are invoked as `handler(canvas, 0, ctx, argPtr)`, then `FUN_00415e32` composites
the result through the node's expanded channel mask.

### Handlers identified so far (coordinator, first pass)

| op | handler | identification | confidence |
|---|---|---|---|
| 2 | `FUN_00412a71` | scale/reciprocal — `1/(arg0·k)` with a divide-by-zero guard substituting `_DAT_00418e28`; calls `FUN_004141b9(recip, arg1, canvas)` | medium |
| 3 | `FUN_00412c59` | **multi-octave (fBm) noise** — seeds the PRNG from arg0, then loops **8 octaves** doubling frequency (`uVar3 = 1; … uVar3 *= 2`), compositing each octave into the canvas | **high** |
| 10 | `FUN_004130b0` | **INVERT** — `x = 1.0 − x` on all four channels over every texel | **high** |
| 14 | `FUN_00413330` | **FILL** — decodes a colour from the arg (`FUN_00412cde`) and writes it to every texel | **high** |
| 16 | `FUN_0041337e` | randomised op — seeds the PRNG from arg1, scales by arg0, builds colours from a 1.0 base | low |
| 9, 12 | `FUN_00412f5c`, `FUN_0041310c` | per-texel colour maths (both build `CRect`-style float4s) — not yet identified | low |
| 17 | `FUN_004136a2` | **CORRECTED — it is the Win32 GDI FONT-ATLAS renderer** (`FUN_00413479` = CreateFontA("times new roman") + TextOutA); texture 11 is the font strip, baked offline by `js/bake_font.mjs` | **high** |
| 18 | `FUN_0041378d` | **CHANNEL SWIZZLE/SWAP** — `src = arg & 3`, `dst = (arg & 0xf) >> 2`, `arg >> 4` selects swap vs copy | **high** |
| 19 | `FUN_004138f9` | per-texel tone curve — two byte params remapped to signed ranges, then `FUN_004138bb(channel, p)` applied to all four channels (gamma/contrast shape) | medium |
| 21 | `FUN_00413c76` | per-texel colour transform with two params mapped to **[−1, 1]** (`2·arg·k − 1`) — hue/saturation-like | low-medium |
| 22 | `FUN_00413db6` | **spatial op whose params are multiplied by the texture's own height and width** — authored in normalised units | **high** (see §3d) |
| 26 | `FUN_004142eb` | scale → `FUN_00413ed9(canvas, arg0, 0)` → inverse scale; a level/normalise wrapper | low-medium |
| 28 | `FUN_0041435f` | **3×3 CONVOLUTION with a selectable kernel** — `FUN_00415149(k, 3, 3)`, mode = `arg & 7` (modes 3/4 build the ± diagonal = **emboss**), strength = `(arg >> 3)·k` | **high** (see §3d) |
| 30 | `FUN_0041446a` | builds a temp canvas with **width/height swapped** and asserts square — transpose/rotate | medium |
| 31, 33, 34 | `FUN_00414535`, `FUN_00414dcf`, `FUN_00415012` | colour-parameterised ops (all decode a colour argument via `FUN_00412cde`); 34 also reads w/h so it is spatial | low |
| 9 | `FUN_00412f5c` | **stripes / bands** — colour arg, `arg0` = band width, `arg1` = count, `h/count` spacing, inner loop symmetric about `±(width>>1)` | medium |
| 12 | `FUN_0041310c` | **radial gradient / circle** — squared normalised distance from centre (`((x·s)/halfW)²`, `r²+r²`), loops symmetric `−half…+half`, colour arg | medium-high |
| 32 | `FUN_00414b1e` | allocates a **1-byte-per-texel** work buffer pre-filled with `4` — flood-fill / distance-transform / cellular shape | low |

Control op 12 (`FUN_00412387`) is a **PUSH WITH EXPLICIT SIZE**: it increments `sp`,
rebuilds the slot array like op 7, then calls `FUN_0041538d(slot[sp], u16 @ ctx+0x1c, …)`
— i.e. it creates a layer at a dimension held in the context rather than the canvas size.

**The opcode inventory is now complete**: all 21 pixel ops and all 8 control ops are
accounted for, 8 of them at high confidence, the rest identified well enough to port and
then verify against the reference video. No structural unknowns remain in the texgen.

### Ops 7, 25, 26 — resolved by disassembly (Ghidra emitted them as bare `LAB_`s)

**Op 7 @ 0x412f37 — LOAD SLOT.** `if (arg[0] == 0xff) return;` else fetch buffer
`FUN_00412a2f(ctx, arg[0])` and `FUN_00415d61(canvas, buf)` (copy into the canvas).
So `0xff` is the VM's "none" sentinel and op 7 loads a numbered slot.

**Op 25 @ 0x414195 — SEPARABLE BLUR, BOTH AXES.** Two calls:
`FUN_00413ed9(canvas, arg[0], 0)` then `FUN_00413ed9(canvas, arg[0], 1)`.

**Op 26** is the same helper on **one** axis, wrapped in a scale/inverse-scale pair.

### `FUN_00413ed9(canvas, N, axis)` — VERIFIED: a box blur of width N **texels**

```
weight = 1.0 / N                       // local_34
dir    = axis ? (0,1) : (1,0)          // local_24 / local_30
for each texel (x, y):
    acc = 0
    for i in 0 .. N-1:
        acc += sample(canvas, x + i*dir.x, y + i*dir.y)   // FUN_00415a71 takes FLOAT coords
    texel = acc * weight
```

Two consequences:

1. **The blur width comes straight from the bytecode as a texel count** — so this is
   resolution-dependent in exactly the same way as op 28's 3×3 kernel, and it matters
   *more*, because a blur is the workhorse of any procedural texture chain. The kernel-
   scaling decision therefore governs **ops 25, 26, 28 and probably 17**, not just op 28.
2. **The sampler `FUN_00415a71` takes floating-point coordinates**, so the VM already
   samples on a continuous domain rather than by integer indexing. That makes resolution
   scaling structurally natural.

**This strengthens the "scale the radius" decision to something close to provably
correct for the blur ops:** a box blur of width N texels on a W-wide canvas *is* a
discrete approximation of a continuous box of normalised width N/W. Preserving the
normalised width (i.e. using N·S at scale S) reproduces the same continuous operator at
finer sampling — that is the definition of doing it right, and it is precisely what the
scale-consistency round-trip test in `re/REMASTER.md` §3 will confirm. For the box modes
the answer is exact; the 3×3 convolution modes (emboss/edge) still need the experiment,
since those are high-pass and the resampling choice genuinely matters.

## 3d. RESOLUTION DEPENDENCE — the key remaster question, and it splits cleanly

The handlers fall into **two categories**, and the distinction decides how each behaves
when the texture is generated larger:

**(a) Scales naturally — parameters are in normalised units.** Op 22 multiplies its byte
parameters by the canvas's own width and height (`arg·k·h`, `arg·k·w`), so the same
bytecode produces a proportionally identical result at any resolution. Ops that are pure
per-texel functions (10 invert, 14 fill, 18 swizzle, 19 tone curve, 21 colour transform)
are trivially resolution-independent — they touch each texel in isolation.

**(b) Does NOT scale — fixed pixel radius.** Op 28's convolution kernel is **3×3 in
texels**, full stop. On a 256² texture that is a blur/emboss spanning ~1.2% of the image;
run unchanged on a 1024² texture it spans ~0.3%, so a soft blur becomes a hairline and an
emboss becomes a thin scratch. Op 17's integer-space filter is very likely the same shape.

**This is the single most important decision for the texture remaster, and it needs an
explicit choice rather than a default.** The options:
1. Scale the kernel radius with resolution (3×3 → 12×12 at 4×), preserving the *look* but
   not the arithmetic. Visually faithful, numerically divergent.
2. Keep 3×3, preserving the arithmetic but changing the appearance. Numerically faithful
   at the pixel level, visually wrong at the image level.
3. Generate at original resolution through the filter chain, then upsample only the final
   result. Safe but forfeits most of the benefit.

Recommendation: **option 1**, with the kernel resampled rather than naively enlarged, and
with the authentic path (`scale = 1`) continuing to use the literal 3×3 so byte-identity
is preserved. But this must be verified per-texture against the reference video, because
some of these textures are lighting solutions rather than surface detail (see §4) and
those tolerate the change differently.

### The PRNG — VERIFIED, and it is good news for the remaster

`FUN_0040424e(seed)` is **srand**: it stores to `DAT_0041a9b8`. The generator (at
0x40325a-ish, `DAT_0041a9b8 = DAT_0041a9b8 * 0x343fd + 0x269ec3`) is the **MSVC
`rand()` LCG**, `seed = seed·214013 + 2531011`.

**Crucially, texgen operations SEED THE PRNG THEMSELVES from their own bytecode
arguments** (op 3 seeds from arg0, op 16 from arg1). So the texture generator does *not*
share one long global random stream the way the sibling project's scene code did — each
random op is independently, deterministically seeded.

Consequence for the resolution remaster: there is **no global desync risk** from changing
texture resolution. The risk is purely *within* an op — a noise op that draws one value
per texel will consume a different number of values at a different resolution. That is
exactly the case the pinned-lattice rule in `re/REMASTER.md` exists for: draw the lattice
on the original grid and interpolate, rather than drawing per output texel.

**REMAINING WORK on the texgen is now exactly: finish the semantics of these 21 handlers
(6 partly done, 15 to go) plus the 8 control ops.** That is a bounded, enumerable task —
there are no structural unknowns left.

## 3b. Remaining work (unchanged)

Observed op layout (consistent across all programs):

```
u8 op; u8 a; u8 b; u8 c; u8 argLen; u8 args[argLen];
```

Evidence:
- `0e 00 07 00 04 ff ff ff ff` — op 0x0e, argLen 4, args = an RGBA/colour word
- `03 00 07 00 08 71 6a cd cd 5b bf 95 ff` — op 0x03, argLen 8
- `0a ff 00 00 04 ff ff ff ff` — note `a = 0xff` here (0xff plausibly = "current buffer")
- `03 00 0f 00 08 …` (res 19/20) — note `b = 0x0f` where most ops use `0x07`

**Working hypothesis (UNVERIFIED):** `a` = destination buffer index (0xff = current),
`b` = channel mask (**0x07 = RGB, 0x0f = RGBA** — consistent with every observation),
`c` = unknown/flags, then a length-prefixed argument blob. `0xcd` bytes appear frequently
inside args, which is suspicious — `0xcdcdcdcd` is MSVC's debug-heap "clean memory" fill,
so those may be uninitialised-but-unused parameter slots.

**UNRESOLVED — the actual work remaining:**
1. Find and RE the **VM interpreter** (the consumer of these blocks; start from
   `FUN_00401c3b`'s callers and the init chain `FUN_00403dad` / `FUN_00401c1f` /
   `FUN_00401000`). Recover the opcode table.
2. Decode every opcode's semantics and argument layout (~20 distinct opcodes appear).
3. Determine each op's resolution dependence — which are pure functions of normalised
   UV (trivially scalable), which are lattice/noise-based (need pinned lattices per
   `re/REMASTER.md`), and which are pixel-neighbourhood operations such as blur or
   emboss (need kernel radius scaled with resolution).
4. Map each of the 28 programs to its consumer texture slot / scene object.
5. Port to `js/texgen.mjs` and verify against frames from `reference/sonnet_ref.mkv`.

## 4. Cross-references

- Mip chains are **authentic** for 23 of 24 content textures (`Levels=0`, hand-written
  integer box filter) — see `re/engine/D3D8_API.md` §6.1.1 and §6.1.2. Whatever the
  texgen produces must then go through a port of *that* box filter, not
  `gl.generateMipmap`.
- Terrain lighting is **baked into a texture** from `n.y` plus a 32-sample soft shadow
  map (`FUN_0040e923`) — see `MESHGEN_notes.md` §5. So some "textures" are lighting
  solutions, not surface detail, and their resolution scaling has different visual
  consequences.
