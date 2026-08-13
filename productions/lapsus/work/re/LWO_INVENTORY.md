# LWO inventory — the 50 shipped LightWave objects

> **This file describes the FORMAT, not the engine.** Everything below was
> read with the published LWO2 spec, so it says what the files contain — not
> what dm2000 does with them, which is the only thing a port may follow
> (METHOD.md, "The binary is the source of truth"). Two consequences worth
> keeping in mind while reading:
>
> - the engine's real chunk vocabulary is whatever `FUN_00424d50` /
>   `FUN_004266a0` / `FUN_00427360` actually read; chunks listed here that it
>   ignores are not part of its format, however prominent in the standard;
> - anything here phrased as *behaviour* — n-gon triangulation, UV
>   projection, smoothing, winding — is a spec-derived expectation awaiting
>   confirmation against the disassembly. The projection section below is the
>   known case where the spec and the capture disagree.

Parsed by `work/js/lwo.mjs`. All 50 are `FORM…LWO2` (LightWave 6.0+), big-endian.
**All 50 parse with zero unknown chunks and zero out-of-range vertex indices.**

| | |
|---|---|
| files | 50 (7.4 MB) |
| points | 226,915 |
| triangles (after fan triangulation) | 409,565 |
| distinct textures referenced | 54, **all present and case-exact on disk** |

Chunk vocabulary actually used (nothing else appears):

- top level — `TAGS LAYR PNTS BBOX POLS PTAG VMAP SURF CLIP ENVL`
- inside `SURF` — `BLOK COLR DIFF SPEC REFL SMAN TRAN ADTR LUMI SIDE RIMG
  RFOP GLOS CLRF BUMP RSAN CLRH SHRP TROP LCOL LSIZ LINE`

Largest objects: `hullukolli.lwo` (40,144 pts / 60,216 tris), `hulluo+.lwo`
(27,193 / 54,432), `Mesh059.lwo` (25,219 / 49,999), `hed2.lwo` (14,015 / 27,834).

## Things a port has to handle

**Polygons are mostly quads, and n-gons go up to 34 vertices.** Distribution:
3v 112,539 · 4v 147,093 · 5v 16 · 6v 234 · 8v 99 · and a long tail out to 34v.
`lwo.mjs`'s `triangulate()` uses a naive fan, which is correct only for convex
polygons. Fixed-function GL has `GL_POLYGON` and the engine may simply hand
n-gons to it — **check `re/RENDER.md` before trusting the fan** on the
concave cases.

**`splinukka.lwo` contains 16 two-vertex polygons.** LWO uses 2-point
"polygons" as lines/curve guides, not faces — the name ("splin…") says
spline. They must not be triangulated into geometry; they are either
invisible or drive something else (candidate: the hair/spline system).

**Texture paths are relative with a subdirectory**, e.g.
`"textures/NebulaMixed2.jpg"`, and every one matches disk **case-exactly** —
verified, so a case-sensitive HTTP server will serve them unchanged. Keep it
that way (the Wonder port has a build-time case-exactness gate for exactly
this reason).

**Surfaces carry real shading parameters** — COLR/DIFF/SPEC/REFL/TRAN/LUMI/
GLOS plus SMAN smoothing angles and `SIDE` (1 = single-sided, 3 =
double-sided). Whether dm2000 honours any of these or bakes its own is a
question for `re/RENDER.md`; `RIMG` (reflection image) and `REFL` on 55
surfaces hint at environment mapping, which pairs with the `envshit1.tga`
texture name.

**Most objects have NO texture UVs at all — corrected.** An earlier note here
said UVs live in `VMAP TXUV`; that is true for only 3 of the 50 files. The
other blocks name a **projection** (`PROJ`) plus an `AXIS`, `SIZE` and
`CNTR`, and the coordinates are computed from the geometry: 60 blocks are UV,
22 planar, 4 cylindrical. Where TXUV does exist, note LWO's per-point (not
per-polygon-vertex) storage, so a point shared between polygons with
different UVs needs splitting. No `VMAD` (discontinuous UV) chunks ship.

Two traps in the projection parameters, both found by rendering:

- **`AXIS` appears twice per block and the two mean different things.** The
  one inside the `IMAP` header / `TMAP` is the texture-space axis; the one at
  `BLOK` level beside `PROJ` is the *projection* axis. Taking the first gives
  every surface axis=Y, which projects a front-facing texture top-down and
  smears it in streaks down the model.
- **Vertical mapping is `0.5 − d/size`, not `0.5 + d/size`.** Image V runs
  downward from the first row while world Y runs up, and rows are not flipped
  at upload (RENDER.md §8). Inverting it samples the black surround of a
  front-projected texture instead of the subject, which looks like "the model
  failed to texture" rather than like a flipped axis.

**Several textures are pre-rendered images of the object itself**, with
lighting baked in and a black surround — e.g. `naamioB.jpg` (512×1024) is a
front view of the hulluolli bust, planar-projected along Z back onto the
geometry. That is why those surfaces carry `LUMI 1.0` and are drawn unlit:
the shading is already in the texture.

Coordinates are LightWave's: **Y up, left-handed (+Z into the screen)**. The
parser does not convert; conversion is the renderer's decision.
