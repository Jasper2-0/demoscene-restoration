# LWO inventory — the 50 shipped LightWave objects

> **The sections below describe the FORMAT.** What dm2000 actually consumes
> is narrower, and that — not the spec — is what a port must follow
> (METHOD.md, "The binary is the source of truth"). The engine's real
> vocabulary is recovered immediately below; read it first and treat the
> format listing as background.

## The engine's real vocabulary

Every 4-byte chunk id compared anywhere in `.text`, recovered by scanning the
disassembly for printable immediates and attributing them to their enclosing
function. **A chunk the engine never compares is not part of its format**,
however prominent in the standard or however many files carry it.

| parser | VA | ids it compares |
|---|---|---|
| container check | `FUN_0041d9c0` | `FORM` `LWO2` |
| top level | `FUN_00424d50` | `TAGS` `PNTS` `POLS` `PTAG` `VMAP` `SURF` `CLIP` `ENVL` |
| POLS type | `FUN_00425650` | `FACE` |
| CLIP sub-chunk | `FUN_00426230` | `STIL` |
| envelope | `FUN_00425a40` | `KEY ` `SPAN` `TCB ` `LINE` |
| SURF | `FUN_00426a90` | `BLOK` `COLR` `DIFF` `SPEC` `REFL` `TRAN` `LUMI` `GLOS` `SIDE` `SMAN` `ADTR` `CLRF` `RIMG` |
| BLOK | `FUN_00427360` | `IMAP` `TMAP` `CHAN` `PROJ` `AXIS` `IMAG` `VMAP` `WRPW` `WRPH` `PIXB` |
| TMAP | `FUN_00427900` | `CNTR` `SIZE` `ROTA` |

### Present in the files, never read

Confirmed absent from `.text` — searched by big-endian id, zero hits each:

- **top level: `LAYR`, `BBOX`** — in all 50 files and both ignored. So there
  is no layer pivot and no file-supplied bounding box; the engine derives its
  own bounds, and texgen reads raw `PNTS` (RENDER.md §10).
- **SURF: `RFOP` `BUMP` `RSAN` `CLRH` `SHRP` `TROP` `LCOL` `LSIZ`** — the
  reflection/refraction options, bump intensity and line-render settings are
  authoring residue as far as this program is concerned.
- **BLOK: `ENAB` `WRAP` `CSYS` `OREF` `NEGA` `OPAC` `FALL` `AAST` `STCK`
  `TAMP`** — note especially:
  - `ENAB` — a "disabled" texture layer **is still drawn**. No shipped BLOK
    has `ENAB=0`, so this is latent, but a port must not filter on it.
  - `WRAP` — wrap mode comes from the engine's own GL state (REPEAT), never
    from the asset. Earlier analysis here treated it as meaningful; it is not.
  - `CSYS` / `OREF` — no world-space or reference-object projection exists.
  - `OPAC` — per-layer opacity is not honoured.
- **`ROTA` is compared but never consumed**: `FUN_00427900` matches the id and
  stores at +0x84, and no float is ever read back. Parsed ≠ used.
- **VMAP types are never checked.** `TXUV` appears nowhere in `.text`, nor do
  `MORF`, `PICK` or `VMAD`. The engine takes `VMAP` chunks without validating
  what kind they are, selecting by *name* via the BLOK's `VMAP` sub-chunk. The
  archive ships 40 TXUV, 20 MORF, 3 PICK and 1 MNVW map, so morph and
  selection maps are as eligible as UV maps here.

### What this changes for a port

Only these surface fields can affect the image: `COLR` `DIFF` `SPEC` `REFL`
`TRAN` `LUMI` `GLOS` `SIDE` `SMAN` `ADTR` `CLRF` `RIMG`, plus the `BLOK`
projection set. Anything else in the format listing below is inert, and
implementing it would be a deviation — the reverse of the usual failure, but a
deviation all the same.

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
