# LWO inventory — the 50 shipped LightWave objects

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

**UVs live in `VMAP TXUV` keyed by point index** — note LWO's per-point (not
per-polygon-vertex) UV storage, so a point shared between polygons with
different UVs needs splitting at export time. No `VMAD` (discontinuous UV)
chunks ship, so that case does not arise here.

Coordinates are LightWave's: **Y up, left-handed (+Z into the screen)**. The
parser does not convert; conversion is the renderer's decision.
