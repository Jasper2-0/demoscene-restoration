# EFFECTS_OVERVIEW.md — visual structure & effect-porting plan

All assets are **procedural** (`.data` is BSS, ~1 MB virtual / 60 KB raw). There is
no external asset file and **no separate script table** — the demo is sequenced
directly by **music position** (`FUN_004051ef`, see FRAME_LOOP.md). The "script" is
the ladder of `while (pos < T)` blocks in `FUN_0040f285`.

## Two data-generation subsystems

### 1. The "DR design generator" — procedural bitstream (stevie)
A **big-endian MSB-first bitstream reader** over a buffer
(`DAT_0050ffe0` = base, `DAT_0050ffdc` = bit cursor):
- `FUN_004053f1(n)` peek n bits · `FUN_00405434(n)` read n bits · `FUN_00405474`
  read 1 bit · `FUN_00405429(n)` skip · `FUN_0040549d` align+seek marker.
- Consumers `FUN_004054cb`, `FUN_0040563b`, `FUN_004057bc`, `FUN_004059cf`,
  `FUN_00405a17`, `FUN_00405bee`, `FUN_0040604d`, `FUN_0040607f` decode this stream
  into RGBA texture bitmaps / pattern maps. This is the generator that builds the
  logo, fonts and decorative textures.
- `FUN_00404b10` seeds the base font/logo texture from `DAT_0041a2b8` and calls the
  texture uploader.

### 2. Runtime math generators
- **Textures** → `FUN_00403bd6` (§D3D7_API.md §5): every texture is synthesized
  CPU-side into ARGB8888 then uploaded. Sizes 64²/256²/512². ~13 call sites.
- **Meshes** → `FUN_00402040` (generic mesh alloc, 32-byte XYZ|DIFFUSE|TEX2 verts),
  `FUN_004031b0` (**geodesic sphere**, icosahedral 5-fold symmetry, 14 subdivisions,
  spherical atan2 UV mapping), `FUN_00402990` (**particle/billboard mesh**, up to
  0x800 = 2048 quads), `FUN_004022a0`/`FUN_00402d00`/`FUN_00402f40` (face/edge/vertex
  builders).

## Draw primitives (shared render kernel)
- `FUN_00402180` — draw a mesh object: rotate/translate → `SetTransform(WORLD)` →
  `DrawIndexedPrimitive(TRIANGLELIST, FVF 0x242)`.
- `FUN_00402a60` — draw billboard particles: `DrawIndexedPrimitive(TRIANGLELIST,
  0x242)` with camera-facing quads.
- `FUN_00402760` — set the per-scene **VIEW** matrix; `FUN_00402860` sets
  PROJECTION+VIEW+WORLD.
- `FUN_004049f5` / `FUN_00404a3f` — 2D screen-space quads (FVF 0x244) for overlays.
- `FUN_00404dd0` / `FUN_00404e70` / `FUN_00404f10` + `FUN_00404c30` — **text engine**:
  render a string as textured quads (per-glyph via the font texture), centered/scaled.

## Scene timeline (music-position driven)

| pos `<` | init (once, up front) | per-frame | content |
|---------|------------------------|-----------|---------|
| `0x114`–`0x200` | — | `FUN_00404dd0` | **Intro titles**: "threestate" / "lost vegas" scrolling text |
| `0x600` | `FUN_00407880` | `FUN_004078a0` | Scene A |
| `0x800` | `FUN_0040ccd0` | `FUN_0040cce0` | Scene B |
| `0xa00` | `FUN_0040af60` | `FUN_0040af80` | Scene C (uses `FUN_0040aba0/ac70` color setup) |
| `0xc00` | `FUN_0040bf50`,`FUN_00409d8d` | `FUN_0040bf80` | Scene D — fade-controlled (`_DAT_005101bc` ∈ [0,1]) |
| `0xe00` | — | `FUN_00409da6(0)` | Scene E — **geodesic sphere** (`FUN_004031b0`→`DAT_0051026c`) + billboards (`DAT_00510290`) |
| `0x1200` | `FUN_00408cc0` | `FUN_00408e90` | Scene F (uses `FUN_00408ce0`, `FUN_004086b0`, `FUN_00408550`) |
| `0x1400` | `FUN_00409d8d` (re) | `FUN_00409da6(1)` | Scene E variant |
| `0x1600` | `FUN_00406500` | `FUN_00406520` | Scene G — credits/text scroller (many 2D quads) |
| `0x1a20` | `FUN_0040e940` | `FUN_0040eb90` | Scene H — finale (`FUN_0040e960/ea00/ead0`) |

**Up-front generators** (called before the loop): `FUN_0040df90`, `FUN_004087c0`,
`FUN_0040bd10`, `FUN_00409bb0`, `FUN_00407380`, `FUN_0040c730`, `FUN_00406280`,
`FUN_0040aca0` — these pre-build the meshes/textures for the scenes above.

## On-screen text (from `.rdata`, drawn by the text engine)
Titles: `threestate`, `lost vegas`, `threestate**in***lost***vegas**`.
Credits: `sagacity`, `sarix`, `stevie`, `distance`.
Greetings/slogans: `hard facts # we are better`, `effect of the year`,
`design`, `effect`, `imitations`, `cheap`, `mass media`, `ourselves`, `limit`,
`we lost our explosive`, `please return it`, `parnassiaveld ###`, `amsterdam`.

## Porting plan implications
- **8 3D scenes + intro/credits text**, all sharing one render kernel
  (mesh draw + billboard particles + 2D quad + text) over the 2-stage combiner.
- Priorities for the port: (1) `minid3d7.js` per D3D7_API.md; (2) the mesh draw
  kernel (`FUN_00402180`/`FUN_00402a60`) and text engine; (3) the geodesic sphere
  and billboard generators; (4) the DR-design bitstream decoder for the textures —
  this is the largest reverse-engineering chunk still open (the bitstream *format*
  itself is not yet decoded).

---

## CORRECTIONS (found while porting, verified against the reference capture)

- **The scene table above mis-assigns scene E.** The geodesic sphere +
  billboards belong to **scene D** (`FUN_0040bd10` is what calls
  `FUN_004031b0`/`FUN_00402990`), which is the white crystal starburst
  ("we lost our explosive / please return it"). **Scene E is a 2D moiré**:
  32 concentric screen-space textured squares, radius +45 per ring, each
  rotated by `sin(phase_i)` about a wandering centre, additive `0x1f1f1f1f`.
- **Scene D and E overlap in the original**: the `pos < 0xc00` block calls
  `FUN_0040bf80` and, once `pos >= 0xb38`, `FUN_00409da6(0)` on top (fade
  pinned to 0 below 0xb38). Our registry allows one module per range, so the
  variant-0 ring code is duplicated inside `eff_d.js`.
- **`FUN_00409da6`'s parameter** = "second half" flag; it switches four things:
  stage-0 texture (256² grid-panels → 64² small-grid), ring radius step ×1.5,
  a second brighter flash channel on music rows 4/6/7 (decay 0xe0 ms, clamp
  0xff not 0x1f), and it draws the yellow+black design overlay with
  "cheap / imitations / suck". Variant 0 draws only the rings.
- **`FUN_0040484a(4,1)` is not just FOGENABLE** — it tail-calls `FUN_004047f9`,
  which also sets FOGCOLOR `0xff7dafc8` and FOGDENSITY `0.003`.
- **`FUN_0040607f` ignores its input entirely** — it is a purely procedural
  256² radial falloff; both call sites (flags 8 and 0) yield identical pixels.
- **Scene F's index buffer alternates winding per column**, so with
  `D3DCULL_CCW` every second longitudinal strip is culled. That is the
  slotted/see-through tube seen in the capture — not a bug.
- **Ghidra emits the stack copies for 3-vertex draw calls in REVERSE argument
  order** (last listed = arg0). Verified against `rep movsd`/`esp` in the
  disassembly. Also: every `FUN_0040406d` (SetTextureHandle) call site lost its
  2nd argument, and bare `(**vtbl+0x50)()` calls are `SetRenderState` with
  dropped args — recover both from disassembly.
- **Shared RNG**: a Borland LCG (`seed*0x015A4E35+1`, seed `0xabf828c9`) is
  shared by all generators, so each scene advances it past its predecessors
  (`FUN_0040df90` draws 32·64·64 + 16·16 = 131328; scene F then burns 8192).
