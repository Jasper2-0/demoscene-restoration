# ATG file format & interpreter notes

ATG ("Aardbei Texture Generator", (c)1999 snq / Aardbei) is the procedural
texture system used by the 64k intro *Please the Cookie Thing* (ptct.exe) and
shipped separately as `atglib` (sys_atg.obj) and the standalone `atg2/atg.exe`
editor.

Sources used for this port:

* `work/re/out/sys_atg.c` — Ghidra decompile of `sys_atg.obj` (atglib,
  1999-11-24) **with full original symbols**. Primary reference.
* `objdump -d -r work/re/sys_atg.obj` — used to recover every piece of FPU
  math that Ghidra garbled (`__ftol()` with lost operands). The MSVC symbol
  names of float constants (`__real@8@3ff9c90fdb…`) encode their 80-bit hex
  value, which pins the exact constants (e.g. float-precision π).
* `work/re/out/ptct.c` — the intro's own build of the same code
  (`FUN_00412ca0` = `ads_loadatg`, `FUN_004133f0` = `ilerand`, …).
  It is byte-for-byte the same algorithms **plus one extra opcode 0x29
  (text)** and an error box for unknown opcodes.

## File format

```
offset 0   3 bytes  magic "ATG" (0x41 0x54 0x47)
offset 3   1 byte   record count N
offset 4   N records
```

Each record is **9 bytes**:

```
byte 0  opcode
byte 1  destination layer (0..3; >=4 => record is skipped entirely)
bytes 2..8  parameters p2..p8 (meaning depends on opcode)
```

Two opcodes carry extra inline data **after** their 9-byte record; the byte
stream continues after the data:

* `0x28 loadbitmap` — 0x2000 bytes (256×256 1bpp bitmap, LSB-first per byte)
* `0x29 text` — 0x80 bytes (NUL-terminated ASCII string; intro build only)

(If such a record has layer ≥ 4 the original does **not** skip the inline
data, desyncing the stream — quirk preserved in `atg.js`.)

All intro/atglib/atg2 sample scripts validate exactly against this layout
(size = 4 + 9·N + 0x80·|text ops| + 0x2000·|bitmap ops|).

## Execution model

One `.atg` script = one 256×256 output texture. Four working layers of
256×256×32-bit pixels, all zeroed at start; **layer 0 is the output**.
Pixel format `0x00RRGGBB`; a "channel" parameter selects a byte via
`shift = ((2 - ch) * 8) & 31` (0 = red, 1 = green, 2 = blue).

Determinism: no wall-clock or hardware randomness. The PRNG is

```c
long ilerand(long x) {           // tempie = 32-bit seed set per generator op
    unsigned u = (x << 13) ^ x;
    return (int)((u*u*0x3d73 + 0xC0AE5) * (tempie + u) + 0x5208DD0D) / 0x3047;
}
```

(All arithmetic wraps at 32 bits; the division is signed C truncation.)
Generator ops set `tempie` from their 4 seed bytes (big-endian) and call
`ilerand(k)` with k = 0,1,2,… local to that op.

A 64 KiB fade table (`ads_fadetab`) drives mix/shade/brightness:

* rows f=0..127: `t[f][i] = (i*f)/127` (integer division) — scale 0..1
* rows f=128..255: `t[f][i] = trunc(255 - (255-i)*(1-(f-128)/127))` — blend to white

All float→int conversions are MSVC `__ftol` = **truncation toward zero**.

## Opcode table

| op | name | params (record bytes) |
|----|------|-----------------------|
| 0x01 | fractalplasma | ch=p2, seed=p4..p7 (p3,p8 unused). 8 octaves of 16.16 fixed-point value noise (`vulmapjefrac`), grids 128,64,…,1, amplitudes 128,64,…,1, cosine interpolation (`costab[i]=trunc((1-cos(iπ/n))·0.5·256)`), summed, `>>16` into channel |
| 0x02 | plasma | ch=**p8**, xf=p2, yf=p3, xo=p4, yo=p5. `trunc((sin((x+xo)·xf·π/128)+sin((y+yo)·yf·π/128))·63+127)` into channel |
| 0x03 | cells | ch=p2, count=p3, dscale=p4, seed=p5..p8. Distance table `trunc(min(255, sqrt((x-128)²+(y-128)²)·dscale·0.0390625))`; for each of `count` random 256×256-wide stamps keep per-pixel minimum (start 255); result into channel |
| 0x04 | envmap | mode=p2, ch=p3, K=p4. `v=clamp(trunc(255-2·f·sqrt((x-128)²+(y-128)²)))`; mode 0: v→RGB (f=1.0), mode 1: v→channel (f=K/256+0.8) |
| 0x05 | subplasma | ch=p2, grid=p3 (power of 2), seed=p4..p7. Float value noise (`vulmapjesub`, cells=(rand&255)·255/256) with cubic-spline interpolation (`spline_inter`), clamped trunc into channel |
| 0x06 | clear | zero the layer |
| 0x0a | sinedistort | yf=p2, xf=p3, xamp=p4, yamp=p5, yph=p6, xph=p7. Bilinear resample at `(x + sin((y+p6)·p2·π/128)·p4, y + p5·cos(p3·(x+p7)·π/128))` |
| 0x0b | offset | xo=p2, yo=p3 (wrapping scroll) |
| 0x0c | twirl | amount=p2. F=(p2-127.5)/32, sign=+1 if F≤0 else −1; r,angle about (127.5,127.5); twist `t=cos((128-r)·F·π/256)·128+128` for r≤128 else 0; resample at `(sin·r+128, cos·r+128)` |
| 0x0e | bump | dist=p2. `max(0, layer[(i+dist·0x101)&0xffff] - layer[i])` per channel |
| 0x0f | blur | times=p2. `(left+right+up+down+4·centre)>>3` per channel, wrapping, repeated `times` times |
| 0x11 | mapdistort | mapA=p2, chA=p3, amtA=p4, mapB=p5, chB=p6, amtB=p7. Resample at `(x + A·amtA/256, y + B·amtB/256)` |
| 0x12 | dirblur | maplayer=p2, ch=p3, len=p4. Per pixel, angle=mapch·π/128; average `len` samples at `(x+j·sin, y+j·cos)`, j=0,2,4,…; then `blur(layer,2)` |
| 0x14 | exchange | chA=p2, layerB=p3, chB=p4 — swap channels between layers |
| 0x15 | torgb | ch=p2 → replicate channel to R,G,B |
| 0x17 | copylayer | dstCh=p2, src=p3, srcCh=p4 |
| 0x18 | mix | src=p2, f=p3. Per byte: `fade[dst, (f&~1)/2] + fade[src, 127-(f&~1)/2]` (fadetab rows; byte 3 untouched) |
| 0x19 | mul | src=p2. `(a*b)>>8` per channel |
| 0x1a | add | src=p2, saturating |
| 0x1b | max | src=p2, per-channel maximum |
| 0x1e | contrast | amount=p2. `clamp(trunc((c-128)·p2/32), ±127)+128` |
| 0x1f | invert | **quirk: only the blue byte** of each pixel is XORed 0xff (`xorb (%esi); add $4,%esi`) |
| 0x20 | shade | src=p2, ch=p3. `fadetab[c + srcCh·256]` per channel (multiply dst by src channel) |
| 0x21 | brightness | f=p2. `fadetab[c + f·256]` per channel |
| 0x22 | sinecolor | ch=p2, freq=p3. `trunc(127 - cos(c·p3·2π/256)·127)` |
| 0x23 | scalecolor | ch=p2, from=p3, to=p4. `trunc(from + c·(to-from)/256)` (d==0 → d=1; no clamp) |
| 0x24 | hsv | hueAdd=p2, satSub=p3. RGB→HSV, `h += p2·1.40625`, `s *= (255-p3)/255`, HSV→RGB (exact port incl. −1 hue for grey and upper-only clamp) |
| 0x25 | colorize | ch=p2, r1=p3, r2=p4, g1=p5, g2=p6, b1=p7, b2=p8. 256-entry palette `trunc(c1 + i·(c2-c1)/256)` indexed by channel, replaces whole pixel |
| 0x26 | mixmap | src=p2, maplayer=p3, ch=p4. `dst + (src-dst)·(255-mapch)/256` per channel |
| 0x27 | emboss | 3×3 kernel, columns weighted −1/0/+1 on all three rows, +128, clamped |
| 0x28 | loadbitmap | colour0=p2..p4 (RRGGBB big-endian), colour1=p5..p7; +0x2000 bytes 1bpp data, LSB-first |
| 0x29 | text | *(intro build only)* font=p2 (0 Arial, 1 Courier New, 2 Times New Roman, 3 Symbol), size=p3 (GDI height 2·p3), style=p4 (weight=(p4&15)·100, italic=p4>>4), x=p5, y=p6, wrap=p7 (also draw at x-256/y-256 offsets); +0x80 bytes NUL-terminated string. White text saturate-**added** per byte onto the layer (`min(dst+text,255)` via a 1 KiB clamp table) |

Unassigned opcodes (0x07–0x09, 0x0d, 0x10, 0x13, 0x16, 0x1c, 0x1d) never
occur in any known script; `atg.js` throws on them. (The atglib build
silently ignores unknown ops; the intro build shows a message box.)

## Known approximations / guesses in the JS port

1. **0x29 text**: the original rasterises via Windows GDI
   (`CreateFontA`/`TextOutA` into a 32bpp DIB). Not reproducible without
   the original font rasteriser, so `atg.js` uses an embedded 5×7 vector
   font scaled to the GDI cell height (2·size), with bold dilation and an
   italic shear. Glyph shapes/metrics therefore differ from Arial; the
   heavy `blur` that every intro script applies after its text op hides
   most of the difference. This affects: `ptct`, `gizmozone2`, `cr_*`.
2. **x87 80-bit vs IEEE double**: trig/interpolation intermediates were
   computed in 80-bit extended precision on x87; JS uses 64-bit doubles
   (`Math.fround` is applied exactly where the original stored 32-bit
   floats). Worst case is an off-by-one after truncation in rare boundary
   cases; all integer/fixed-point paths (PRNG, fadetab, fractalplasma,
   cells, blur, mix, …) are bit-exact.
3. **envmap mode ≥ 2**: the original loads the integer parameter's bits as
   a float (garbage); ported as f=0. No script uses it.
4. **hsv default sector**: `hsv_to_rgb` with h outside 0..5·60 after wrap
   falls into a default that reuses stack garbage for G in the original;
   ported as grey. Unreachable in practice.
5. `atgUseMmx` MMX paths (`mmx_getpixel`) were not ported — the plain
   FPU path (`fpu_getpixel`) is the reference, as in the intro's default.
6. Layer indices in combiner parameters are masked `&3` in the port; the
   original indexes the 4-pointer layer table unmasked (would read OOB for
   invalid scripts). All known scripts use 0..3.

## Validation

`node work/js/bake_textures.mjs` bakes:

* all 15 intro scripts from `work/unpacked/extracted/` →
  `work/baked/textures/<name>.png`
* the 10 known-good scripts embedded in `atgfiles.cpp` (extracted to
  `work/baked/atglib-tests/*.atg`) → `work/baked/textures/atglib_*.png`

All 25 parse with zero unknown opcodes and produce non-degenerate output
(per-channel min/max/mean printed by the baker). The three `atg2`
`sample*.atg` scripts also parse and run.

## Supersampling ("remaster") mode — runAtg(bytes, {scale, textRasterizer})

`scale=1` (default) is the bit-exact reference path (regression-guarded:
re-baking must reproduce the 1x PNGs byte-identically). `scale=S` (power of
two, e.g. 4) renders 256S×256S with the SAME macro pattern: every random
lattice keeps its original index keying (identical `ilerand` sequence and
`tempie` seeds), positions scale by S, and the in-between detail is genuinely
interpolated/rasterised — not post-upscaled. `--scale=N` on
`bake_textures.mjs` writes `work/baked/textures<N>x/` and emits validation
(box-downsample vs 1x MAD + side-by-side panels in `work/baked/compare<N>x/`).

Per-op scaling decisions (S = scale, D = 256·S; "lattice-exact" = S-aligned
pixels carry values bit-identical to the 256 reference):

| op | decision |
|----|----------|
| subplasma / vulmapjesub | lattice points every grid·S px, original values; cubic spline evaluated at t/(grid·S) — lattice-exact (power-of-two scaling keeps t/n bit-identical), spline gives real inter-pixel detail |
| fractalplasma / vulmapjefrac | same; cosine table stretched to grid·S entries (costab[S·j] ≡ original costab[j]); 16.16 range unchanged so no widening needed; octave set unchanged (128..1 original units — the reference is band-limited below original grid 1) |
| plasma, envmap | pure functions of position, evaluated at (x/S, y/S) |
| cells | dot centres = original ilerand coords ×S; distance stamp recomputed at D×D in original units — lattice-exact |
| sinedistort, twirl, mapdistort | phases/geometry in original units (x/S), displacement ×S, bilinear fetch at S× resolution (finer sub-texel sampling) |
| offset | shift ×S (exact) |
| bump | diagonal probe (dist,dist) → (dist·S, dist·S) |
| blur | `times` passes with taps at ±S px (lattice-exact macro shape, kernel arithmetic identical), then S−1 extra ±1 px passes to couple the S² sub-lattices (adds <1 original px of blur; invisible after downsampling) |
| dirblur | len·S samples at 2-px steps (original: len samples at 2-px steps in 256-space) — same averaged segment length, S× denser line integral; trailing blur is the scaled blur op |
| emboss | ±S px taps ×3 rows — derivative amplitude per original pixel preserved, lattice-exact |
| value ops (mix, add, mul, max, shade, brightness, contrast, invert, hsv, colorize, sinecolor, scalecolor, mixmap, torgb, copylayer, exchange) | per-pixel value transforms — unchanged |
| loadbitmap | nearest-neighbour S×S blocks (hard pixels are deliberate) |
| text (0x29) | position ×S, GDI cell height 2·size·S; rasteriser hook re-renders the genuine outlines at S× (gdi_text.mjs: node-canvas + system Arial/Courier New with GDI cell/ascent metrics). Hook contract: `fn({tmap, dim, positions, cellH, weight, italic, fontIndex, str, scale})` |

Wraparound audit: spatial wraps (`&0xff` on coordinates, `&0xffff` on the
bump probe, the `(0x100-grid)&x` lattice floor, blur/emboss edge wraps,
getpixel's 256-wrap) became `&(256S-1)` / D-based; value wraps (colour
`&0xff`, `ilerand()&0xff`, fadetab indexing, channel shifts) are untouched.

4x validation (GDI text, box-downsampled vs 1x, mean abs diff per channel):
cr_* / gizmozone2 / lucht ≈ 0.0–0.5; 13/18/28/29 ≈ 1–5 (dirblur densification
+ blur lane-coupling); ptct 2.7–3.5; snq_steen2 3.9–7.0 (emboss on the
finest fractal octave); 31.atg up to 13.9 R (heaviest dirblur/sinedistort
chain). No misregistration: a ±1 px shift probe never improves the match,
and the comparison panels confirm identical pattern placement.
