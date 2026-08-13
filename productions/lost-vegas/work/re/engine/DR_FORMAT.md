# DR_FORMAT.md — the "DR design generator" (stevie), fully decoded

Target: **Lost Vegas**, threestate, 64k intro, Ambience 2000.
Binary: `work-lv/unpacked/3s-vegas-u.exe`, image base `0x00400000`, `.data`
mapped 1:1 with the file (VA = 0x400000 + file offset).
Port: `work-lv/js/dr.mjs` · Baker: `work-lv/js/bake_dr.mjs` · Output:
`work-lv/baked/dr/`.

---

## 0. Executive summary — what the DR generator actually is

**It is not a procedural opcode interpreter.** Unlike Aardbei's ATG in the
sibling PTCT restoration, "DR" is a **hand-rolled MPEG-1 video I-frame
decoder**. stevie authored the artwork as images; they were encoded to
single-frame MPEG-1 elementary streams by an off-the-shelf encoder at build
time and embedded verbatim in `.data`. The "big-endian MSB-first bitstream"
the earlier pass identified is the MPEG-1 start-code / VLC reader.

There are exactly **four** DR streams, all intra-coded 4:2:0 I-frames:

| VA | bytes | dims | port name | used by |
|----|-------|------|-----------|---------|
| `0x0041ba9c` | 2632 | 256×256 | `dr_256_grid_panels` | `FUN_00409bb0` → `DAT_005101e0` |
| `0x0041c4e8` | 3062 | 64×64 | `dr_64_grid_small` | `FUN_00409bb0` → `DAT_005101c0` |
| `0x0041d0e4` | 3724 | 64×64 | `dr_64_envmap` | `FUN_004087c0`, `FUN_0040bd10`, `FUN_0040c730` |
| `0x0041df74` | 3067 | 64×64 | `dr_64_finale` | `FUN_0040df90` → `DAT_00510370` |

Total ≈ **12.5 KB** of the 64 KB budget. Streams are packed back to back with
≤ 4 bytes of slack; the decoder stops on macroblock count, so there is no
length field and no sequence-end code.

**The yellow angular design overlays are NOT in these streams.** They are
hard-coded screen-space quads (literal float coordinates + a `D3DCOLOR`
diffuse) emitted by the scene code, plus a separate **2-bit bitmap font
sheet**. See §7 (font) and §8 (overlay layer).

### Confidence

Very high. Validated numerically against ffmpeg: decoding the four blobs with
ffmpeg to `yuv420p` and applying *the intro's own* YCbCr→RGB matrix reproduces
this port's output with **99 % of samples bit-identical and a maximum error
of 3/255** (the residual is the intro's coarser fixed-point IDCT). Command
used is in §9.

---

## 1. Bitstream primitives

Global state: `DAT_0050ffe0` = base pointer, `DAT_0050ffdc` = **bit** cursor.

| fn | name | semantics |
|----|------|-----------|
| `FUN_004053f1(n)` | `peek(n)` | `w = bswap32(*(u32*)(base + (bit>>3)))`; return `(w << (bit & 7)) >>> ((32 - n) & 31)` |
| `FUN_00405434(n)` | `read(n)` | `peek(n)`, then `bit += n` |
| `FUN_00405474()` | `read1()` | `(base[bit>>3] >> (7 - (bit & 7))) & 1`, `bit += 1` |
| `FUN_00405429(n)` | `skip(n)` | `bit += n` |
| `FUN_0040549d()` | `seekStartCode()` | `bit = (bit + 7) & ~7`; `while (peek(24) != 1) skip(8)` |

Bit order is **MSB-first within a big-endian 32-bit window**, i.e. plain MPEG
bit order. `n` may be 32 (`(32-32)&31 == 0`, no shift). `peek` always touches
4 bytes, so a buffer must be padded (the port pads by 8).

`seekStartCode` byte-aligns and scans for the 24-bit prefix `00 00 01`.

---

## 2. Header parsing — `FUN_00405a17(streamPtr)`

Resets `bit = 0`, rebuilds the four chroma LUTs (§5), resets the intra quant
matrix to the default, then:

```
read(32)  != 0x000001B3  -> abort            ; sequence_header_code
horizontal_size   = read(12)                 ; -> DAT_0050ffd8
vertical_size     = read(12)                 ; -> DAT_004f4fd0
skip(38)   ; aspect(4) frame_rate(4) bit_rate(18) marker(1) vbv(10) constrained(1)
if (read1())  for i in 0..63: quant[i] = read(8)    ; load_intra_quantiser_matrix
if (read1())  skip(512)                             ; load_non_intra — READ AND DISCARDED
mbW = (horizontal_size + 15) >> 4
mbH = (vertical_size   + 15) >> 4
loop:
  seekStartCode(); code = read(32)
  code == 0x000001B8 -> skip(27)  ; GOP header: time_code(25) closed(1) broken(1)
  code == 0x000001B2 -> continue  ; user_data
  code == 0x00000100 -> picture header, below
  otherwise          -> abort
picture header:
  skip(10)                       ; temporal_reference
  read(3) must == 1              ; picture_coding_type — I-frames ONLY
  n = 16; do { skip(n); n = 8 } while (read1())   ; vbv_delay + extra_bit_picture*
  loop { seekStartCode(); if (peek(32) != 0x000001B2) break; skip(32) }
  totalMb = mbW * mbH
  return with the cursor parked ON the first slice start code
```

Notes / limitations that are real in the binary:
* **Only I-pictures.** P/B would abort.
* Extension start codes (`0x1B5`) are not handled.
* The non-intra quant matrix is parsed and thrown away (never used — every
  block is intra).
* `horizontal_size`/`vertical_size` drive the macroblock counts only. The
  framebuffer stride comes from the *caller's* width argument. In this intro
  they always agree (256×256, 64×64).

---

## 3. Picture decode — `FUN_00405bee(fb, width, height)`

```
addr = 0
loop:
  cur = addr
  if peek(23) == 0:                       ; a start code is next
      if addr >= totalMb: -> deblock, done
      seekStartCode(); code = read(32)
      if code < 0x101 or code > 0x1AF: return (no filtering)
      quantScale = read(5)
      while (read1()) skip(8)             ; extra_slice_information
      addr = cur = (code - 0x101) * mbW   ; slice_vertical_position
      dcPred[0..2] = 0
  if addr >= totalMb: return
  if !read1(): return                     ; macroblock_address_increment: "1" only
  if !read1():                            ; macroblock_type
      if !read1(): return                 ;   "00.." unsupported
      quantScale = read(5)                ;   "01" = Intra + quant
  for cc in 0..5: decode block cc         ; Y0 Y1 Y2 Y3 Cb Cr
  YCbCr -> RGB in place
  blit the 16x16 macroblock to fb at ((cur % mbW)*16, (cur / mbW)*16)
  addr = cur + 1
```

**Only a macroblock_address_increment of exactly 1 is supported** (the
single-bit `1` VLC). Skipped macroblocks would desynchronise. Real streams
produced by a normal encoder for a dense still image never skip in an
I-picture, so this holds.

Any malformed-stream exit returns **without** running the deblock filter;
only the clean `addr >= totalMb` completion path filters. The port preserves
this.

The framebuffer is `VirtualAlloc`'d (zero-filled), so any macroblock never
written stays `0x00000000`.

---

## 4. Block decode — `FUN_004057bc(block, cc, dcPred, quant, quantScale)`

`block` is `int[64]` in raster order. `cc` 0..3 = luma quadrant, 4 = Cb,
5 = Cr. `dcPredIndex = cc < 4 ? 0 : cc - 3`.

### 4.1 DC

`u = peek(10)`, then a two-way table select giving `[size, bits]`:

| predictor | condition | table VA | index |
|-----------|-----------|----------|-------|
| luma | `u < 0x3E0` | `0x0041b7c4` (31 × 2 B) | `u >> 5` |
| luma | `u >= 0x3E0` | `0x0041b804` (16 × 2 B) | `(u >> 1) - 0x1F0` |
| chroma | `u < 0x3E0` | `0x0041b824` (31 × 2 B) | `u >> 5` |
| chroma | `u >= 0x3E0` | `0x0041b864` (32 × 2 B) | `u - 0x3E0` |

`skip(bits)`. If `size == 0`, `diff = 0`; else
`v = read(size); if ((v & (1 << (size-1))) == 0) v += 1 - (1 << size)` — the
standard MPEG signed-differential decode. Then

```
dcPred[i] += diff
block[0]   = dcPred[i] << 3
```

The `<< 3` (not the `<< 8` of a spec decoder) is where the intro's IDCT
scaling convention starts; it pairs with the `>> 3` in the dequantiser below
and the `>>5 / >>10` descales in the IDCT.

### 4.2 AC

Loop with a coefficient cursor `i` starting at 1. `u = peek(16)`, then an
8-way cascade into tables of 3-byte entries `[run, level, bits]`:

| range of `u` | table VA | index |
|---|---|---|
| `>= 0x4000` | `0x0041b8a4` | `(u >> 12) - 4` |
| `>= 0x0400` | `0x0041b8c8` | `(u >> 8) - 4` |
| `>= 0x0200` | `0x0041b97c` | `(u >> 6) - 8` |
| `>= 0x0100` | `0x0041b994` | `(u >> 4) - 0x10` |
| `>= 0x0080` | `0x0041b9c4` | `(u >> 3) - 0x10` |
| `>= 0x0040` | `0x0041b9f4` | `(u >> 2) - 0x10` |
| `>= 0x0020` | `0x0041ba24` | `(u >> 1) - 0x10` |
| `>= 0x0010` | `0x0041ba54` | `u - 0x10` |
| `< 0x0010` | — | abort (15+ leading zeros) |

This is MPEG-1 **table B.14** (intra DCT coefficients), flattened into
direct-index sub-tables. `run == 0x40` is EOB, `run == 0x41` is ESCAPE. The
full contents are transcribed into `dr.mjs` (`AC_T0`…`AC_T7`).

```
skip(bits)
run == 0x40 -> end of block, success
run == 0x41 (escape):
    pos   = i + read(6)
    b     = (int8)read(8)
    b == 0     -> level = read(8)             ; 128..255
    b == -128  -> level = read(8) - 256       ; -256..-129
    else       -> level = b
otherwise:
    level = entry.level ; pos = i + run
    if (read1()) level = -level               ; sign bit
if pos > 63 -> abort
```

### 4.3 Dequantisation

```
neg   = level < 0
a     = |level|
a     = ((quant[pos] * a * quantScale) >> 3) - 1 | 1     ; C precedence: (( ) - 1) | 1
if neg: a = -a
block[ZIGZAG[pos]] = a
i = pos + 1
```

`>> 3` == the spec's `2*level*scale*quant/16`. The `-1 | 1` is MPEG-1
oddification / mismatch control: it forces the magnitude odd, rounding
toward zero.

`quant` is indexed by the **zigzag** position (matching the order in which
`load_intra_quantiser_matrix` filled it); the store is at `ZIGZAG[pos]`.

### 4.4 Tables in `.data`

* Default intra quantiser matrix (zigzag order) — `0x0041b744`, 64 bytes.
  Bit-identical to the MPEG-1 default (`8,16,16,19,16,19,22,…,69,69,83`).
* Zigzag → raster map — `0x0041b784`, 64 bytes. Standard MPEG-1 zigzag.

---

## 5. IDCT and colour

### 5.1 IDCT

Two passes, both classic IJG `jpeg_idct_islow` butterflies with
**CONST_BITS = 12** (constants `0x8a9 = 0.541196`, `0x1d91 = 1.847759`,
`0xc3f = 0.765367`, `0x12d0 = 1.175876`, `0x63e = 0.390181`,
`0x1f62 = 1.961571`, `0x46a`, `0x11c7`, `0x1a9b`, and `0xb5/256 = 0.70703`
for the final rotation):

* `FUN_004054cb(block, c)` — **column** pass, in place, stride 8, rounding
  `+0x10`, descale `>> 5`. Runs for `c = 0..7` first.
* `FUN_0040563b(src, dst)` — **row** pass, rounding `+0x800` on the
  multiplier terms, `+0x200` on the even part, descale `>> 12` / `>> 10`.
  Runs for each of the 8 rows, `src = block + r*8`.

The row pass writes to a destination with a caller-chosen stride, which is
how the four luma blocks are woven into a single 16×16 plane:

| `cc` | dst stride (ints) | dst offset (ints) | meaning |
|---|---|---|---|
| 0 | 16 | 0 | Y top-left |
| 1 | 16 | 8 | Y top-right |
| 2 | 16 | 128 | Y bottom-left |
| 3 | 16 | 136 | Y bottom-right |
| 4 | 8 | 256 (`0x100`) | Cb 8×8 |
| 5 | 8 | 320 (`0x140`) | Cr 8×8 |

**The Cr plane and the coefficient block are the same memory** (`PTR_DAT_0041ba94
+ 0x500`). For `cc == 5` the row IDCT reads and writes the same address; this
is deliberate (and works, because the row pass reads all 8 inputs before
writing).

### 5.2 Macroblock scratch layout (`PTR_DAT_0041ba94` = `0x004fcfd8`)

`int[0x180]`:

| int index | contents |
|---|---|
| `0x000..0x0FF` | luma 16×16, `row*16 + col`; **overwritten in place with packed RGB** |
| `0x100..0x13F` | Cb 8×8 |
| `0x140..0x17F` | Cr 8×8 — aliased with the 64-entry coefficient block |

### 5.3 YCbCr → RGB

Four signed LUTs, built at every `FUN_00405a17` call, index range −512…511
(the pointers at `0x0041ba84`…`0x0041ba90` point at *index 0*, i.e. 512 ints
into each 1024-int array):

| LUT | VA of ptr | formula | ≈ coefficient |
|---|---|---|---|
| Cb→B | `0x0041ba84` → `0x004f5fd8` | `(i * 0x0e2d) >> 11` | +1.77148 |
| Cb→G | `0x0041ba88` → `0x004f7fd8` | `(i * -0x0b) >> 5` | −0.34375 |
| Cr→R | `0x0041ba8c` → `0x004f9fd8` | `(i * 0x2cdd) >> 13` | +1.40197 |
| Cr→G | `0x0041ba90` → `0x004fbfd8` | `(i * -0xb6d) >> 12` | −0.71411 |

These are the **full-range JFIF** coefficients (1.402 / 1.772), not the
limited-range BT.601 ones an MPEG-1 decoder should use. That is authentic
behaviour: the intro's colours are slightly more saturated / higher contrast
than a spec decode of the same stream. **Do not "fix" this** — it is part of
the look.

Per 2×2 luma group (`i`,`j` = 0..7 over the chroma plane):

```
addR = lutCrR[cr]
addG = lutCbG[cb] + lutCrG[cr]
addB = lutCbB[cb]
for each of the 4 luma samples q at (2j,2i), (2j,2i+1), (2j+1,2i), (2j+1,2i+1):
    y = luma[q] + 0x80                        ; the DC level shift
    luma[q] = pack(clamp(y+addR), clamp(y+addG), clamp(y+addB))
```

Chroma is **replicated 2×2**, not interpolated (nearest 4:2:0 upsample).

`FUN_004059cf(r, g, b)` clamps each to 0..255 and packs
`(r << 16) | (g << 8) | b` — so the framebuffer word is **`0x00RRGGBB`,
alpha byte = 0**. The D3D upload path is only ever called with opaque
formats for these textures, so the zero alpha is never read. The port writes
`A = 255` in its `rgba` output (configurable via `opts.alpha`).

### 5.4 Deblock filter (tail of `FUN_00405bee`)

Applied once, after the whole picture, across every 8×8 block boundary.
Per-channel arithmetic using the `>> 1 & 0x7f7f7f` trick to avoid carries
between channels.

**Vertical** (rows 7/8, 15/16, …), symmetric:
```
a = row[k*8]   >> 1 & 0x7f7f7f          ; below the boundary
b = row[k*8-1] >> 1 & 0x7f7f7f          ; above
m = (b + a) >> 1 & 0x7f7f7f
row[k*8-1] = b + m                      ; ≈ 0.75*above + 0.25*below
row[k*8]   = m + a                      ; ≈ 0.25*above + 0.75*below
```

**Horizontal** (columns 8, 16, …), **asymmetric — only the right-hand pixel
is modified**:
```
v = p[0] >> 1 & 0x7f7f7f
p[0] = ((p[-1] >> 1 & 0x7f7f7f) + v >> 1 & 0x7f7f7f) + v
```
This looks like an oversight in the original but it is what ships; the port
reproduces it. Guards: vertical runs only if `height > 8`, horizontal only if
`width > 8`.

---

## 6. Handing a texture to D3D

Two entry points wrap the decoder:

```c
// FUN_0040604d — decode only; caller owns the buffer and may post-process it
uint32 *decodeToBuffer(const void *stream, int width, int height);

// FUN_00405fe6 — decode, upload, free
void decodeAndUpload(TexHandle out[6], const void *stream,
                     int width, int height, uint32 flags);
```

Both `VirtualAlloc(width*height*4)`, call `FUN_00405a17` then `FUN_00405bee`.
`FUN_00405fe6` then calls `FUN_00403bd6(out, pixels, w, h, flags)` (the
ARGB8888 → device-format uploader documented in `D3D7_API.md` §5) and frees
the scratch buffer. The resulting 6-dword texture handle is copied to a
global.

`flags` is 0 for all four DR textures — i.e. the plain opaque format, no
alpha (bit 1), no alternate format (bit 2), no mip/POW2 fixup (bit 3).

### 6.1 Post-processing (`FUN_00409bb0`)

Two textures are grid-lined **after** decoding and **before** upload — black
2-pixel lines on a fixed pitch, turning a marbled surface into tiled panels:

| texture | pitch | effect |
|---|---|---|
| `dr_256_grid_panels` (256²) | 8 px | zeroes `x%8 < 2` and `y%8 < 2` → 32×32 panels |
| `dr_64_grid_small` (64²) | 4 px | zeroes `x%4 < 2` and `y%4 < 2` → 16×16 panels |

Ported as `applyGridLines(img, step)` in `dr.mjs`. `bake_dr.mjs --raw` writes
both the pre- and post-grid PNGs.

The other two textures (`dr_64_envmap`, `dr_64_finale`) are uploaded
untouched.

---

## 7. The typography — a 2 bpp bitmap font sheet (NOT the DR bitstream)

Corroborated externally: sagacity says the type came from **`.pcx` source
art**. There is no PCX decoder in the executable; the PCX was flattened at
build time and the pixels embedded raw. The exact layout below is derived
from the consuming code, not from eyeballing `.data`.

### 7.1 The sheet — `FUN_00404b10`

```
src   = 0x0041a2b8 .. 0x0041b638      (0x1380 = 4992 bytes)
dst   = VirtualAlloc(0x40000)         ; 256*256*4, zero-filled
64 source bytes per row, 4 pixels per byte, MSB pair first:
    for row in 0..77:                 ; 4992/64 = 78 rows
      for i in 0..63:
        b = src[row*64 + i]
        for k in 0..3:
          a = (b >> (6 - 2*k)) & 3
          dst[row*256 + i*4 + k] = a * 0x55000000 + 0x00ffffff
upload via FUN_00403bd6(dst, 256, 256, flags = 2)   ; alpha-capable format
handle -> DAT_004f4f70
```

So: **256 × 256 ARGB texture, white texels (`0xFFFFFF`), 2-bit alpha with
levels `{0x00, 0x55, 0xAA, 0xFF}`, only the top 78 rows written**, the rest
left fully transparent. 6604 texels are non-transparent.

The "1 bpp at 512 px wide" reading that also looks legible is the same data
misinterpreted — 64 bytes/row is 512 bits *or* 256 two-bit pixels, so the row
structure survives either way. The 2 bpp/256 px reading is the one the code
performs, and it is the one with correct aspect and antialiasing.

Colour comes entirely from the vertex diffuse at draw time; the sheet itself
carries no hue. That is why the same glyphs appear yellow on blue in one
scene and near-black on yellow bars in another.

Baked: `baked/dr/font.png` (= `font_atlas.png`), plus
`font_atlas_yellow.png` (tinted preview) and `font_atlas_rects.png` (glyph
boxes drawn on).

### 7.2 Glyph rectangles — `0x0041b638`, 38 × 4 bytes

Four **bytes** per glyph: `x0, y0, x1, y1` — a pixel-space box in the 256×256
sheet, inclusive-exclusive-ish (widths are used directly as `x1-x0`).
Proportional: widths range 2 px (`1`) to 28 px (`v`), heights 14–20 px.
Full table in `baked/dr/font_metrics.json`.

### 7.3 Character mapping — `FUN_00404c30`

```
' '            -> no glyph; advance only
'a'..'z'       -> index c - 0x61        (0..25)
'0'..'9'       -> index c - 0x16        (26..35)
'#'            -> 36
'+'            -> 37
anything else  -> index = the raw character code   ** over-reads the table **
```

The over-read is real and load-bearing. `'*'` (0x2A) → index 42 →
`0x0041b638 + 168 = 0x0041b6e0`, which holds four zero bytes, giving a
zero-size quad: an invisible glyph that still consumes the inter-character
gap. That is exactly how the banner string
`threestate**in***lost***vegas**` gets its wide word spacing. `'.'` (0x2E)
lands on another zero run and behaves the same.

**The alphabet is lowercase-only.** There are no uppercase glyphs; the design
is set entirely in the lowercase forms (matching `reference/contact.png`).

### 7.4 Metrics and layout — `FUN_00404c30` / `FUN_00404f10` / `FUN_00404dd0`

Constants (verified by disassembly, since Ghidra mislabels the qword loads):

| VA | type | value | role |
|---|---|---|---|
| `0x004123b8` | float | `1/255` | pixel → UV and pixel → unit scale |
| `0x00412088` | **double** | `1/256` | unit scale for kern and gap |
| `0x004123c0` | **double** | `16.0` | space width, in 1/256 units |
| `0x004123c8` | **double** | `4.0` | inter-character gap, in 1/256 units |
| `0x004120a8` | **double** | `0.5` | centring factor |
| `0x004123a8/ac/b0/b4` | float | `+2, −2, −1, −4` | per-character kern |
| `0x004120c8` | float | `0.0` | default kern |

`FUN_00404c30(out[7], ch, s)` emits `[u0, u1, v0, v1, w, h, kern]`:

```
w    = (x1 - x0) * (1/255) * s
h    = (y1 - y0) * (1/255) * s
u0,u1,v0,v1 = x0,x1,y0,y1 * (1/255)
kern = kernPx * s * (1/256)
' ':  w = s * (1/256) * 16 ; h = 0 ; kern = 0
```

Per-character kern in atlas pixels (everything not listed is 0):

| chars | kern |
|---|---|
| `a`, `g` | −4 |
| `e` | −1 |
| `c`, `h`, `i` | −2 |
| `k`, `p`, `x`, `z` | +2 |

The kern is a **vertical** offset (it shifts the quad's `y`), not a
horizontal one — it aligns glyphs whose atlas boxes start on different rows
onto a common baseline.

`FUN_00404f10` walks the string emitting one textured quad per glyph via
`FUN_00404a3f` (`DrawPrimitive TRIANGLEFAN`, FVF `0x244`), advancing
`penX += w + s*(1/256)*4`. `FUN_00404dd0` first measures the whole string the
same way and starts at `x - totalWidth * 0.5` — **all intro text is
centred**. `FUN_00404e70` is the same with a different vertical anchor.

Ported as `layoutText()` (geometry, in the exe's own units) and
`renderText()` (a CPU rasteriser for eyeballing) in `dr.mjs`. With
`scale = 255` one output unit equals one atlas pixel, which makes the numbers
directly comparable to the metrics table.

Sample sheet: `baked/dr/text_samples.png` — the intro's own strings, set with
this code, on the capture's sky-blue. Compare with `reference/f_90.png`
("effect of the year") and `reference/f_120.png` ("cheap imitations suck").

### 7.5 The strings (from `.data`)

`threestate`, `lost vegas`, `lost # vegas`,
`threestate**in***lost***vegas**`, `3state # lost vegas`, `sagacity`,
`sarix`, `stevie`, `distance`, `hard facts # we are better`, `design`,
`effect`, `effect of the year`, `imitations`, `cheap`, `mass media`,
`ourselves`, `limit`, `we lost our explosive`, `please return it`,
`amsterdam`, `parnassiaveld ###`.

---

## 8. The yellow overlay bars — hard-coded quads, not data

For completeness, since the brief expected them from the DR generator: the
angular yellow bars, boxes and arrows are **literal geometry in the scene
code**, not decoded from anything. Example, from `FUN_00406520`:

```
vertex positions 534.0, 620.0, 303.0, 331.0, 342.0 …   (screen space, 640x480)
diffuse 0xFFD7B45A                                      (ARGB: R 215 G 180 B 90)
-> FUN_00404a3f()   ; TRIANGLEFAN, FVF 0x244
```

The design palette is just four `D3DCOLOR`s:

| colour | ARGB | use |
|---|---|---|
| design yellow | `0xFFD7B45A` | bars, boxes, arrows |
| sky blue | `0xFF7DAFC8` | background / knockouts |
| black | `0xFF000000` | text on yellow, rules |
| white | `0xFFFFFFFF` | highlights |

So the design layer = hard-coded quads (§8) + centred bitmap type (§7). It is
work for the renderer port, not for the DR decoder.

---

## 9. The port

### `work-lv/js/dr.mjs`

```js
import { runDR, applyGridLines, decodeFontAtlas, parseGlyphRects,
         glyphIndex, layoutText, renderText } from './dr.mjs';

runDR(bitstreamBytes, {
  width,            // default: sequence header horizontal_size
  height,           // default: sequence header vertical_size
  alpha = 255,      // alpha byte written into `rgba` (the exe leaves 0)
  deblock = true,   // false only for comparing against a stock decoder
}) -> {
  width, height,
  rgba,             // Uint8ClampedArray, RGBA
  xrgb,             // Uint32Array, the exe's own 0x00RRGGBB framebuffer
  ok,               // header parsed and an I-picture found
  bytesConsumed,    // where the stream ended — handy for locating the next one
  seqWidth, seqHeight, mbW, mbH,
}
```

All arithmetic is integer, statement-for-statement from the decompilation,
with `Math.imul` / `|0` for 32-bit fidelity. There is no PRNG and no
floating point anywhere in the decoder.

### `work-lv/js/bake_dr.mjs`

```
node work-lv/js/bake_dr.mjs [--exe=PATH] [--out=DIR] [--raw]
```

Maps the PE itself (no dependencies), scans the whole image for `00 00 01 B3`,
decodes every hit, applies the known post-processing, and writes PNGs
(minimal encoder over `node:zlib`) plus the font sheet, the glyph-box overlay,
`font_metrics.json` and `text_samples.png`.

### Validation against ffmpeg

```
# carve a blob, append a sequence-end code
ffmpeg -i dr_64_envmap.m1v -frames:v 1 -pix_fmt yuv420p -f rawvideo out.yuv
# then apply THIS decoder's LUTs (§5.3) to out.yuv and diff against runDR(...,{deblock:false})
```

Result over all four streams: **mean |Δ| ≈ 0.01–0.04, max 3**, ~99 % of
samples exact. Comparing straight to ffmpeg's own `rgb24` output instead
gives mean |Δ| ≈ 6–10 — that gap is entirely §5.3's full-range matrix and is
the intended look.

---

## 10. Open questions / caveats

1. **Chroma LUT range.** The exe indexes the LUTs with the raw IDCT chroma
   output and would read out of bounds for |value| > 512. Real streams stay
   in range; the port masks the index (`& 1023`) instead of faulting.
   Behaviour differs only on a corrupt stream.
2. **Macroblock skipping** is unsupported by the original (§3). If a future
   re-encode of these images is ever attempted, the encoder must not emit
   skipped macroblocks or `macroblock_address_increment > 1`.
3. **`0x0041b638 + 0x98 .. 0x0041b744`** (between the glyph rects and the
   quant matrix) is the DDRAW import descriptor table walked by
   `FUN_00405170`, not font data. It is what `'*'` accidentally indexes into.
4. `bytesConsumed` for `dr_64_finale` is 3067 (ends `0x0041eb6f`), but the
   next known `.data` object is much later. Whatever occupies
   `0x0041eb70..0x00420704` has not been identified here — it is not a DR
   stream (no further `00 00 01 B3`).
5. The `flags` bits of `FUN_00403bd6` beyond "0 = opaque" are documented in
   `D3D7_API.md`; only `0` (DR textures) and `2` (font sheet, alpha) are used
   on the paths covered here.
