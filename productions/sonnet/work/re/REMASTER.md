# Sonnet — remaster brief (project owner's decision, 2026-08-04)

Same philosophy as [PTCT] and [Lost Vegas]: **the authentic path is sacred, the remaster
is strictly additive and opt-out-able.** Runtime switch `?quality=original` selects the
byte-exact original; the default is the remaster.

## Decisions

1. **Stereo-panning bug: reproduce by default, FIX BEHIND THE REMASTER FLAG.**
   The party version has a documented panning defect (complained about on pouet; the
   promised final that would have fixed it was never released). It is authentic to the
   only version that exists, so `?quality=original` must reproduce it exactly. The
   remaster path fixes it. Requires: a precise root-cause diagnosis, not a cosmetic
   patch — we must be able to say *what* was wrong.

2. **Texture resolution + mesh tessellation remaster**, as done on PTCT and Lost Vegas.
   Sonnet is the best candidate of the three: sagacity confirms a real texgen and a
   probable meshgen, so quality scales by **re-evaluating the generators at higher
   resolution** rather than by upscaling baked artifacts. That is the honest kind of
   remaster — more genuine detail, not invented detail.

## Non-negotiable engineering rules (learned the hard way on the two prior ports)

- **`scale=1` / `tess=1` must be BYTE-IDENTICAL to the original.** Ship a regression
  guard that asserts this (sha256 over baked assets, pixel-diff over rendered frames).
  On Lost Vegas this caught real defects and made every later change safe.
- **Pinned lattices.** When a generator is evaluated at scale S, sample so that the
  original texel *p* is reproduced exactly at X = S·p (e.g. sample at `X/S − centre`,
  put interpolation nodes AT texel centres). Verify with an odd scale (S=3) — if the
  reconstruction is exact at original sample points, mean error should be ~0.01, not ~1.
- **Never change PRNG draw count or order.** Shared LCG streams mean any extra draw
  desynchronises everything downstream. Keep random draws on the COARSE grid and let
  fine vertices/texels interpolate the same noise.
- **Discontinuities stay coarse.** A step in a height field (or any `if (d < k)`
  flattening) sampled finer becomes a visible cliff. Carry such things as a 0/1 field
  interpolated on the coarse grid so the feature stays exactly one cell wide.
- **Some artifacts ARE the look — do not "fix" them by tessellating.** On Lost Vegas,
  subdividing a tube's cross-section destroyed the chrome appearance, because the look
  came from near-cancelling averaged normals at alternating-wound column boundaries.
  Before tessellating anything, ask what the shading actually depends on.
- **u16 index limit** caps practical subdivision — `D3DFMT_INDEX16` on every indexed
  draw = 65536 verts/call. The shim should accept `Uint32Array` indices so the remaster
  path can exceed it with no other change (per D3D8_API.md §9.5).
- **CORRECTION (2026-08-05, from the D3D8 RE) — mipmaps are AUTHENTIC here, not a
  remaster feature.** This is the reverse of the Lost Vegas situation. 23 of 24 content
  texture sites pass `Levels = 0` (full chain) and the original fills every level with
  its own hand-written integer box filter, with `MIPFILTER = LINEAR` on both stages. So:
  mips must be **ON** for those textures on the authentic path, generated with a port of
  the original box filter (`buildMipsD3D8Box` — `gl.generateMipmap` is NOT bit-identical),
  and **OFF** for the one single-level texture (`FUN_0040d1f1`) and all four render
  targets. See D3D8_API.md §6.1.1 for the per-site truth table.
- **Honest gain assessment.** Report where tessellation genuinely helps and where it is
  literally zero-diff. **NOTE — the gain here should be materially larger than on Lost
  Vegas**: that port had lighting OFF (all shading baked into vertex colours), so
  tessellation only bought silhouettes. Sonnet uses **real fixed-function lighting**
  (point lights, materials, ambient, normals in the FVF) evaluated PER VERTEX in
  software, so finer geometry genuinely improves shading, not just outlines. Gouraud
  banding on coarse meshes is a real artifact that tessellation actually fixes.

## 3. Convolution kernel scaling — DECIDED (owner, 2026-08-05), test first

The texgen's convolution op (opcode 28) uses a **3×3 kernel measured in texels**, so it
does not scale with resolution: unchanged at 4×, a soft blur becomes a hairline and an
emboss becomes a scratch (see `re/gen/TEXGEN_partial.md` §3d).

**Decision: scale the kernel radius with resolution** — preserve the *spatial extent* of
the operator, not its texel count. The authentic path (`scale = 1`) keeps the literal 3×3
so byte-identity is unaffected.

**Run an experiment first to choose HOW to resample the kernel.** Candidates:
1. **Nearest / naive enlargement** — replicate taps on the finer grid (blocky, expect
   aliasing artifacts; the cheap baseline to beat).
2. **Bilinear-resampled kernel** — treat the 3×3 taps as samples of a continuous kernel
   and re-sample it at the finer spacing.
3. **Continuous-reconstruction** — fit the kernel's implied continuous operator (for the
   symmetric blur/sharpen modes this is analytic) and re-derive taps at the new spacing.
4. **Separable approximation** where the kernel factorises — cheaper, and for the
   symmetric modes it is exact.

### The objective criterion (use this, don't eyeball it)

**Scale-consistency round-trip.** A correct resolution-independent implementation must
satisfy: *generate the texture at scale S, box-downsample the result back to 1×, and it
should closely match the authentic 1× output.* Report mean and max absolute error per
candidate. This is the same class of test as the pinned-lattice odd-scale check
(S = 3, mean error ~0.01) that validated the sibling project's DCT upsampler — an
operator that is genuinely the "same operator at finer sampling" round-trips; one that
is not, does not.

Test at **S = 2, 3 and 4** (an odd scale is essential — it catches implementations that
only work when taps land on even boundaries), and run it **per kernel mode** (`arg & 7`),
because emboss/edge-detect modes are high-pass and will behave very differently from the
blur modes. Also run it on **real programs**, not just synthetic input: several of the 28
textures are baked lighting solutions rather than surface detail and will tolerate error
differently.

Deliverable: `work-sonnet/js/kernel_scaling_test.mjs` + a short findings note, then wire
the winner into `texgen.mjs`.

## 4. Mesh tessellation — MUCH harder here than on the sibling projects

`re/gen/MESHGEN_notes.md` §9 establishes the blocker: vertex normals are an
**un-normalised** mean of face normals, so **changing the triangle count around a vertex
changes `|n|`, and with `NORMALIZENORMALS = FALSE` that changes the brightness.**
Tessellating even a flat region alters shading. On PTCT and Lost Vegas lighting was off
and tessellation was essentially free; here it is not.

**The way out is the direct analogue of the pinned-lattice rule used for textures:
compute normals on the ORIGINAL topology, then INTERPOLATE them onto the new vertices.**
Original vertices keep their exact `|n|`, so shading is unchanged where it was defined;
new vertices get interpolated normals; silhouettes improve. `tess = 1` must produce
byte-identical vertex and index buffers.

Even with that, §9's specific exclusions still stand and must not be tessellated:
the terrain grid (its texture is baked against `n.y` at a fixed vertex resolution, and
its `/W` rather than `/(W-1)` UV quirk makes the last row/column a different size), the
water plane (hard `d > 48 → d *= 4` discontinuity and `a < 0x40 → 0` clamp), submerged
terrain vertices (a hard per-vertex threshold produces the jagged shoreline that is part
of the look), and tree leaves (each emitted **twice with opposite winding** to be
double-sided — any tessellator that welds or re-winds collapses them).

**Ship no tessellation rather than a subtly wrong image.** The texture-resolution half of
the remaster is unaffected and is where the real gain lives.

## Deliverable shape

Generators take a `scale` / `tess` parameter; bake scripts emit both an authentic set and
a remastered set; the runtime picks per-asset with fallback (load
`assets/remaster/<name>.png` if present, else `assets/<name>.png`).
