# `assets/remaster/` — the additive quality layer

Everything here is produced by `work-lv/js/bake_remaster.mjs` (`node
work-lv/js/bake_remaster.mjs`). Nothing here is loaded when the page is opened
with `?quality=original`; that path still reads the byte-identical 1x assets in
`web-lv/assets/`.

Three source families, three techniques. No detail is invented anywhere: every
output is either the same closed-form maths evaluated on a finer lattice, the
band-limited reconstruction of a signal the encoder already stored, or the
original type outlines re-rasterised at the higher size.

---

## Already wired (main.js loads `assets/remaster/<name>.png`, falls back per file)

| file | size | technique |
|---|---|---|
| `dr_256_grid_panels.png` | 1024² | MPEG-1 8x8 DCT blocks zero-padded to 32x32 + 32-point IDCT; the grid-line post-pass (`FUN_00409bb0`) regenerated procedurally at 4x |
| `dr_64_grid_small.png` | 256² | same, grid pitch 4 -> 16 |
| `dr_64_envmap.png` | 256² | same, no post-pass |
| `dr_64_finale.png` | 256² | same, no post-pass |

The authentic full-range JFIF colour coefficients (1.402 / 1.772) are kept, as
is the nearest 2x2 chroma relationship — only the lattice got finer.

---

## Not wired yet — needs a change in `web-lv/js/`, which this bake does not own

These replace textures the effect modules build on the CPU at `init()` time.
The effects are synchronous, so the images have to be loaded in `main.js` and
handed to `buildRegistry` in the same `textures` object the DR textures already
travel in; then each generator becomes
`textures.proc_x ? d3d.createTextureFromImage(textures.proc_x, FLAGS) : <existing generator>`.

| file | size | replaces | call site |
|---|---|---|---|
| `proc_credits_design.png` | 2048² | `mask2bpp(...)` 512² sheet, flags 2 | `eff_credits.js` ~L450 (`FUN_00406160`) |
| `proc_f_logo1.png` | 1024² | `mask1bpp(LOGO1_B64, 56, 36, 7, 256)`, flags 2 | `eff_f.js` L259 (`FUN_00408550`) |
| `proc_f_logo2.png` | 2048² | `mask2bpp(LOGO2_B64, 24, 316, 6, 512)`, flags 2 | `eff_f.js` L260 (`FUN_004086b0`) |
| `proc_d_logo.png` | 1024² | `mask1bpp(...)` 256² sheet, flags 2 | `eff_d.js` L239 (`FUN_0040b630`) |
| `proc_grid16.png` | 1024² | `gridTexture()`, flags 0 | `eff_c.js` L224 (`FUN_00406280` / `FUN_0040aca0`) |
| `proc_radial_k100.png` | 1024² | `radialGlow(1.0)` / `radialGlowPixels()` | `eff_a.js`, `eff_d.js`, `eff_f.js`, `eff_finale.js` (`FUN_0040607f`) |
| `proc_radial_k110.png` | 1024² | `radialGlow(1.1)` | `eff_c.js` L212 |
| `proc_finale_glyphs.png` | 2048x1024 | the 32 64² per-glyph tiles | `eff_finale.js` L291-318 (`FUN_0040df90`) |

`proc_finale_glyphs.png` is an **8 x 4 atlas of 32 tiles, 256² each**, in banner
order (`threestate**in***lost***vegas**`, padded with NUL to 32). Tile `i` is at
`(i % 8) * 256, (i / 8 | 0) * 256`. Each tile is **already rotated 180°**, exactly
as `FUN_0040df90` writes it backwards from the end of its buffer, so it can be
uploaded as-is. Grey = RGB = A = the original's `v * 0x01010101`.

### Recommended alongside the wiring

Pass `D3DTEX_MIPMAP` (`0x100`) when creating any of these, and for the four DR
textures in `main.js`. A 4x texture minified with plain `LINEAR` and no mip
chain will shimmer wherever the surface is small on screen. The shim's default
`MIPFILTER` is already `D3DTFP_POINT`, so the flag alone is enough — no other
state change is needed.

---

## The typography in the two type-bearing sheets

`proc_credits_design.png` and `proc_f_logo2.png` are not upscales. The type in
them was identified and **re-rasterised from the real outlines** at 4x:

| string | face | size | tracking | pen origin (source texels) |
|---|---|---|---|---|
| `legend` | **Verdana Bold** | 16 px | 0 | x 259, baseline 30.025 |
| `domage` | Verdana | 8.5 px | +0.5 px | x 50.75, baseline 71.4 |
| `aarbei` | Verdana | 8.5 px | +0.5 px | x 112.875, baseline 71.4 |
| `acme` | Verdana | 8.5 px | +0.5 px | x 169.75, baseline 71.4 |
| `3state` | Verdana | 8.5 px | +0.5 px | x 225.0, baseline 71.4 |
| `elitegroup` | Verdana | 8.5 px | +0.5 px | x 286.0, baseline 71.4 |
| `<description of effect>:3state patent pending 3s#1` | Verdana | 10 px | +1 px | x 4.125, baseline 8.95 |
| `watch and learn` | Verdana | 10 px | +1 px | x 3.875, baseline 21.0 |

Multiply em / tracking / x / baseline by the bake scale. Tracking is applied as
one `fillText` per character advancing by the glyph's own advance plus the
tracking; `legend` has no tracking and is drawn as a single `fillText` so the
face's kerning applies.

Semantics preserved exactly:

* **`proc_credits_design`** — white RGB, panel opaque, **type knocked out**
  (alpha 0 inside the letters). The panel polygon is upscaled from a signed
  distance field with the two type boxes solidified first, then the fresh type
  coverage is subtracted.
* **`proc_f_logo2`** — **black RGB**, alpha *is* the ink, stored rotated
  (24 wide x 316 tall). The strip is rasterised the way it reads and rotated
  back into the strip's own coordinate space; the scene keeps doing the
  on-screen rotation exactly as before.
* Alpha in all four sheets is re-quantised to the original **2-bit levels**
  (`0 / 0x55 / 0xAA / 0xFF`). Pass `--alpha8` to the baker for smooth 8-bit
  alpha instead.

`proc_f_logo1` (a bracket) and `proc_d_logo` (a bomb) carry **no type** — they
are hard-edged 1-bit masks and are upscaled as vector-style shapes via the same
signed distance field. Both round-trip **exactly** (mean and max |Δalpha| = 0
after box-downsampling back to 1x).
