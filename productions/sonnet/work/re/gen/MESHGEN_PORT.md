# Sonnet — MESH GENERATOR port notes

What `js/meshgen.mjs`, `js/scene_desc.mjs` and `js/camera.mjs` confirmed, what they
corrected in `MESHGEN_notes.md`, per-function confidence, and what is still open.

All VAs are image VAs (`unpacked/sonnet_img.bin`, VA `0x401000` = file offset 0).
Every float constant quoted here was read out of the binary with
`struct.unpack` at its VA, never from the decompile.

Test suite: `node js/meshgen_test.mjs` → **369 pass, 0 fail**.

---

## 0. Files

| file | contents |
|---|---|
| `js/meshgen.mjs` | mesh container, normal generator, the parametric primitive library, terrain/water, both tessellators |
| `js/scene_desc.mjs` | resources 28..35 decoded into 8 named objects, flags expanded to booleans |
| `js/camera.mjs` | resources 36..51 → bfloat16 keys → cubic-Hermite paths, `evaluate(t)` |
| `js/meshgen_test.mjs` | the test suite |

Meshes come out in the shim's layout: FVF `0x252`, stride 44, pos@0 / normal@0x0c /
diffuse@0x18 / uv0@0x1c / uv1@0x24, `u16` index triples, `D3DPT_TRIANGLELIST`.
`mesh.toBuffers()` hands them straight to `minid3d8.js`.

---

## 1. The normal generator — `FUN_004045f1` (confidence: **high**, transcribed instruction by instruction)

Disassembled 0x4045f1–0x404874 and ported line for line. **Everything the brief
asserted is confirmed**:

* Face normal is `-cross(e1,e2)` — three explicit `fchs` at 0x4046ea, 0x4046fa, 0x40470f.
* Unit length via `fdivr qword [0x418248]` (the **double** 1.0) — `1.0 / |c|`, no guard.
* The per-vertex accumulator increment is `fld dword [0x4170c4]` = exactly **1.0f**
  (unweighted; no area or angle term anywhere in the loop).
* Pass 3 is `fld dword [0x4170cc]` / `fdiv dword [ecx]`, and `[0x4170cc] = 0xbf800000`
  = **−1.0f**. Confirmed by reading the image.
* **There is no final normalize.** The last three instructions of pass 3 are three
  `fmul`/`fstp` pairs and nothing else.
* The per-face array at `mesh+0xc0` stores the **negated** normal (`movsd`×3 from the
  same scratch that feeds the accumulation, *before* the sign is cancelled).

Ported exactly, with `Math.fround` at every point the original does an `fstp dword`
so the float32 rounding matches. Tests assert:

* a flat XZ triangle in the grid's winding → vertex normal `+Y`, face normal `−Y`;
* a 90° crease → `|n| < 1` (the crease darkening);
* two coplanar triangles of wildly different area → `|n| == 1` exactly (unweighted);
* a collinear triangle → NaN, no guard;
* **a vertex touched by zero triangles → NaN too** (`s = -1.0/0 = -Inf`, `0 * -Inf = NaN`).
  That second NaN source is not in `MESHGEN_notes.md`; it is real and it fires
  whenever a generator over-allocates and forgets to shrink.

### Where degenerate triangles actually occur (the brief asked for this)

| generator | where | effect |
|---|---|---|
| **tree branch rings** (`FUN_0040a186`) | `u = j * (1/7)` over **8** columns, stitched with `(j+1) % 8` → column 7 lands on column 0, so the wrap quad has zero area | **952 of 10912** branch triangles are exactly degenerate; NaN normals on ring columns 0 and 7 only (verified: columns 1–6 are clean). Harmless in practice — the branch material's flags word is `0`, so `D3DRS_LIGHTING` is **off** and branch normals are never read. |
| **surface of revolution** (`FUN_0040bc63`) | tip ring radius `(1.001 − 1³)·radius = 0.001·radius` | thin but **not** degenerate — 0 NaN normals at the real parameters (radius 3.2). §9.9's warning is directionally right but the tip does not actually blow up. |
| **array-B curtains** (`FUN_0040c1b2`) | 4 coincident vertices per station, 2 quads over the same 2 positions | degenerate face pairs → NaN expected; scene 4 only, count 1. Not ported (see §8). |

The port reproduces all of this verbatim. Nothing is guarded.

---

## 2. Corrections to `MESHGEN_notes.md`

| § | note said | actually |
|---|---|---|
| **§10** (open) | "whether `FUN_004042e0` zeroes memory is not verified" | **It does.** `FUN_004042e0 → FUN_004040e5` is `VirtualAlloc(NULL, size, MEM_COMMIT=0x1000, PAGE_READWRITE=4)` (disassembled at 0x4040e5), which is guaranteed zero-filled. So untouched normals/UVs are exactly `(0,0,0)`, **not garbage**. `FUN_00404380` then stamps only the diffuse dword to `0xFFFFFFFF`. This is a genuine correctness item: the never-lit generators are safe to leave at zero. |
| **§7** | camera key's second vec3 is a look-at **target** | It is **Euler angles in radians**. `FUN_004058a6` builds `M = Rx·Ry·Rz` (`FUN_00402280`) and sets `target = pos + (0,0,256)·M` (`[0x4182bc]` = 256.0). Confirmed by the data: `rot.z == 0` in **all 49 keys of all 16 paths**, and `rot.y` runs to 18 rad (multiple turns) — impossible for a target coordinate. |
| **§7** | (roll not described) | Roll is `rot.z` **plus** a π flip: `a = (int)(rot.x · 0.15915494309189535 · 65536) & 0xffff; roll = (a in [0x4000,0x8000..0xc000]) ? 3.14159274f : 0`. Disassembled at 0x40597f–0x4059d4 because Ghidra dropped both FPU operands. `[0x4182d8]` is the **double** 1/(2π), `[0x4182d0]` the **double** 65536. Scene 0 key 0 has `rot.x = −2.625`, which lands inside the flipped half-turn — so the flip is actually exercised. |
| **§4** | `FUN_0040e058`'s vec3 before `scaleVec` is `sunColour` | It is the **sun POSITION** (`desc+0x32`, routed through the flare object's `+0xb4`). |
| **§4** | `(flag_bit24, flag_bit8)` | The order is `param_13 = ~(flags>>24)&1`, `param_14 = (flags & 0x100) != 0`. `param_14 == 0` runs the soft-shadow bake **twice**; otherwise once. |
| **§9.8** | "same [UV seam] pattern in `FUN_0040bc63` (8 radial segments, `% 8`)" | `FUN_0040bc63` writes **no UVs at all** — verified byte-by-byte at 0x40bd74–0x40bdab, only `[esi+0]/[esi+4]/[esi+8]` are stored. There is no seam there. The seam is real in the **tree** rings. |
| **§9.9** | revolution radius `(1.001 − t³) · 1.0 · height` | the multiplier is the **radius** argument, not the height. Total height is `radius · heightRatio · (rings−1)/rings` (the `dy` divisor is `rings`, not `rings−1`). |
| **§9.5** | autumn `DAT_0047895c` is a leaf **vertex colour** | It is a per-texel **texture modulate** on the generated leaf texture: `out.c = (src.c · tint.c) >> 8` for all four ARGB channels (loop at 0x40a0a8). Tree vertex colours are never written and stay `0xFFFFFFFF`. |
| **§1** table | `FUN_0040bfc1` = terrain-following ribbon `4·H·W / 4·(W−1)·H` | `FUN_0040bfc1` is the **per-frame update** for the array-A revolution clusters. The terrain-following generator is **`FUN_0040c1b2`** (array B), and it allocates `8·W·H` verts / `4·W·(H−1)` tris. |
| **§1** table | rain/snow "+ 0x400 fixed quads" | `0x400` is the **vertex** count; it is **256 quads**, and they are screen-space **lens droplets** (NDC-space quads whose `uv1` samples the framebuffer through a 4/3-magnifying refraction), not world particles. |
| **§6 flags** | bits 0, 9, 17, 19 unlisted | bit 0 = the animated water-glitter strip at `Landscape+0x40` (only scene 4, only when `waterLevel > 0`); bit 9 = the cloud-layer object at `Landscape+0xa8` (exactly the four scenes with `cloudCount > 0`) and gates `FUN_00402c72(0)`; bit 17 = the water level is **animated** (0 before tick `0x820`, 1.0 after — scene 1 only); bit 19 = `FUN_0040d1f1`'s last argument (the snow-accumulation stamp). With these added, **no scene sets an unnamed bit** (asserted in the test suite). |

---

## 3. `FUN_00404875` — the parametric grid (confidence: **high**)

Disassembled 0x404875–0x404a0d. `ret 0x34` = 13 dword arguments; Ghidra drops the
FPU ones. Recovered signature:

```
grid(mesh, W_f, flatY, H_f, extX, heightScale, extZ,
     u0Tile, v0Tile, _, u1Tile, v1Tile, _, heightArray|null)
```

All of §3 confirmed, including the `/W` and `/H` (not `/(W−1)`, `/(H−1)`) divisions
and the index template. Two details §3 does not mention:

* `uv1.v` is computed **outside** the column loop (`fst dword [eax-0x4]` at 0x404981
  re-uses the `fv·v1Tile` left on the x87 stack) — same value, but it means `uv1.v`
  is per-row, not per-vertex.
* the height array is loaded with `fild qword [ebp-0x30]` after zero-extending the
  int32 into a 64-bit slot (`mov [ebp-0x2c], 0`), so a **negative int32 height reads
  as a large positive value**. Ported and tested.

Water plane parameters recovered from the two `FUN_00404875` call sites in
`FUN_004082a9`:

| | grid | half-extent | uv0 tiling | uv1 tiling |
|---|---|---|---|---|
| coarse (bit 13 clear) | 4×4 | 300.0 `[0x418e78]` | 8.0 `[0x418e7c]` | 1.0 |
| hi-res (bit 13 set) | 32×32 | 600.0 `[0x418e88]` | **5.0** `[0x418e54]` | 1.0 |

The 5.0 is new — `MESHGEN_notes.md` §11 lists `[0x418e54] = 5.0` without saying what
it is for.

---

## 4. Terrain (confidence: **high** for the mesh, **not ported** for the texture bake)

`upsampleHeightmap` (2× bilinear at half-texel offsets, `FUN_0040e6f6`),
`downsampleHeightmap` (integer box average, block `256/N`), then
`buildGrid(N, 0, N, (128,256,128), uv0 ×1, uv1 ×16, heights)` — all as §4 describes.
`FUN_0040e6f6` and `FUN_0040e842` were disassembled in full; the bilinear is
**unclamped** — out-of-range neighbours are simply not loaded, so they contribute 0
and the sampler fades to zero at the far edge rather than clamping. Tested.

The ground-texture bake (`FUN_0040e058` step 5) and the 32-pass soft shadow bake
(`FUN_0040e923`) are **not ported** — they are texture work, and §10 still lists the
blend math as unresolved. `terrainHeight()` and the shadow-query shape are exposed so
scene code can plug a bake in later.

### The shoreline (confidence: **high**, from the disassembly quoted in §5)

`shorelineAlpha()` + `applyShorelineColours()` reproduce both loops verbatim,
including the hard `d > 48 → d *= 4` knee (`[0x418e80]`), the `a < 0x40 → 0` clamp
**on the terrain side only**, the `v.y <= waterLevel` per-vertex threshold, and the
`alpha = 255 − a` / white vs `alpha = a` / `0x3f3f3f` split.

---

## 5. Scene descriptors — `FUN_00407767` (confidence: **high**)

The strongest single validation in this port: with the header at 0x53 bytes and the
seven array record sizes 0x22 / 0x20 / 0x22 / 0x1e / 0x1e / 0x10 / 0x17 consumed in
struct order, **all eight resources are consumed exactly, to the byte**, with zero
slack (asserted per scene in the test suite):

```
res28 117 = 83 + 1·34            res32 172 = 83 + 1·32 + 1·34 + 1·23
res29  83 = 83                   res33 147 = 83 + 1·34 + 1·30
res30 288 = 83 + 4·34 + 30 + 16 + 23   res34 117 = 83 + 1·34
res31 106 = 83 + 1·23            res35  83 = 83
```

### Header fields recovered beyond §6

| off | field | evidence |
|---|---|---|
| 0x02 | `paramA` f32 | only non-fill in scene 0 (the only scene with array A) = 0.1 |
| 0x0a | f32 | **1.0 in all eight** — consumer not found |
| 0x22 | **fog colour** u32 | `DAT_00474790` → `FUN_00401abf(1, colour, start, end)` |
| 0x26 | **fog start** f32 | `FUN_00401abf` arg 3 |
| 0x2a | **fog end** f32 | `FUN_00401abf` arg 4 **and** the camera far plane (`camera+0xc4`) |

Those three were listed only as "flare param" neighbours before. Their values are
strongly self-consistent: scene 7 (dense snow) 50/300, scene 3 (the huge cloud-sea
scale) 2950/3000, scene 5 (autumn) fog colour `0x00a34701` orange, scene 4 (beach)
`0x0051a2ff` sky blue, scene 7 `0x00c9cdd0` pale ice grey.

`0xCD` is MSVC uninitialised-heap fill; `scene._uninit` lists which named fields are
pure fill in each descriptor, so scene authors do not read garbage.

### Array record layouts (from `FUN_00407983`, the master scene builder)

| array | offsets |
|---|---|
| **A** spires | `0x00` u16 count · `0x02` vec3 scatter centre (y forced to 0) · `0x0e` vec3 half-extent · `0x1a` f32 radius · `0x1e` f32 heightRatio; call site adds rings=16, segments=8 |
| **B** curtains | `0x00` vec3 origin · `0x10` f32 · `0x14` f32 half-length · `0x18` f32 height; call site adds 16 strips |
| **C** billboards t0 | `0x00` u16 count · `0x02` vec3 centre · `0x0e` vec3 extent · `0x1a` f32 size (×50 `[0x418e60]`) · `0x1e` **passed but never read** |
| **D** billboards t1 | same, `0x1a` f32 size (×4 `[0x418230]`), no `0x1e` |
| **E** trees | `0x00` vec3 pos (+= terrain height) · `0x0c` vec3 bend → `DAT_00478950` · `0x18` u8 branch radius · `0x19` u8 taper (÷255) · `0x1a` f32 mesh scale |
| **F** props | `0x00` vec3 pos · `0x0c` f32 |
| **G** birds | `0x00` vec3 flock centre · `0x0c` u16 count · `0x0e` f32 radius · `0x12` f32 banking amp · `0x16` u8 species |

Decoded values sanity-check against the reference video: scene 2 has 4 billboard
clusters (10 + 5 + 5 + 10 trees) plus 256 type-1 ground-cover billboards and
**256 species-0 "birds" at (0,80,0) radius 100** — those are the butterflies visible
at 130 s. Scene 3 has 4 species-1 birds at y = 300 (the cloud-sea shot), scene 4 has
64 species-1 (the beach gulls).

---

## 6. Camera splines (confidence: **high**)

`FUN_00405a29` / `FUN_0040544c` / `FUN_00405778` / `FUN_004058a6` / `FUN_00405b5d` /
`FUN_00405c0c` all ported.

* bfloat16 decode confirmed (`FUN_00401358` = `(float)bits(u16 << 16)`).
* Wire format `blob[0]` = total length, `blob[2]` = key count, 14 bytes per key.
  Asserted for all 16 resources: `3 + 14·keyCount == blob.length`, `blob[0] == blob.length`.
* Key selection in `FUN_0040544c` does **not** assume sorted keys — it scans the whole
  array six times with a converging min/max trick. Ported literally.
* Tangents are `m0 = (P2 − P0)·0.5`, `m1 = (P3 − P1)·0.5`, **not** rescaled by the
  interval. Reproduced as-is.
* Hermite basis matches `[0x4182c8] = −2.0`, `[0x4182cc] = 3.0` exactly.
* `FUN_00405430(x, n)` is integer power by repeated multiply, not `powf`.
* Projection is standard D3D LH: `m11 = cot(fov/2)/aspect`, `m22 = cot(fov/2)`,
  `m33 = far/(far−near)`, `m34 = 1`, `m43 = −near·far/(far−near)`. Defaults from
  `FUN_004052a5`: fov 90°, near 1.0, far 1000.0, aspect 1.3333334.

Decoded data is self-evidently correct: 49 keys across 16 paths, every path starts at
`t = 0`, key times are strictly increasing and land on round numbers
(0/32/48/64/96/128/160/192/256/320), positions are in sensible world coordinates,
`rot.z == 0` everywhere, and `evaluate()` is continuous with the target always
exactly 256 units ahead. All 16 resources are claimed by exactly one scene under
`map2 = [0,1,3,6,7,10,0,12,14]`.

---

## 7. Primitive library — what is ported

| generator | function | confidence | notes |
|---|---|---|---|
| grid / plane | `buildGrid` | **high** | full disassembly |
| terrain | `buildTerrain` | **high** | mesh only; texture bake out of scope |
| water plane | `buildWaterPlane` + `applyShorelineColours` | **high** | |
| surface of revolution | `buildRevolution` / `instanceRevolution` | **high** | 128 verts / 240 tris, height 480, max radius 3.2032 at scene 0's parameters — matches an independent read of the call site |
| L-system tree | `buildTree` | **high** | **341 nodes, 8184 branch verts, 10912 branch tris — exactly `(4^5−1)/3 · 24` and `· 32`**; ~1317 leaves at the measured 4000/32768 emission rate |
| scatter placer | `scatter` (`FUN_004078b6`) | **medium-high** | the rejection test `h + 5.0 < waterLevel` and the y-forced-to-0 are confirmed; the **seed** differs per call site (1 for array A, the record index for C/D) so it is a parameter |
| billboards | `buildBillboards` | **high** | both quad templates, the shadow-grey bottom verts, `M = 2` crossed planes |
| rain / snow | `buildPrecipitation` | **high** | generator writes **only** UVs + indices; positions/colours are per-frame |
| lens droplets | `buildLensDroplets` | **high** | 256 quads, diffuse `0x7FFFFFFF` |
| clouds | `buildCloudNoiseQuads` / `buildCloudBlitQuad` / `buildCloudSky` | **high** | both flag-10 shapes (stacked layers vs 16×16 dome) |
| ribbon strip | `buildRibbon` / `updateRibbon` | **high** | 32/30, 72 units wide, alpha ramp 0→255→0, RGB `0x6f6f6f` |
| birds | `buildBird` / `buildFlock` | **high** | literal index list `0,2,1 2,3,1 0,1,4 1,5,4`; colour `0x9b + rand()%100` per channel from three draws |

Which generators call `FUN_004045f1` (this matters — the others' normals are exactly
zero thanks to `VirtualAlloc`):

* **yes**: grid/terrain/water, revolution (template only, then memcpy'd to instances),
  tree (both meshes, once each, after shrink), billboards, ribbon, array-B curtains.
* **no**: rain/snow, clouds, birds, lens droplets, point sprites.

---

## 8. Not ported

* `FUN_0040c721` — the compound prop (3 meshes: `0x800/0xc00`, `0x4800/0x6000`,
  `0x80/0xf0`). Still the biggest gap, unchanged from §10. Scene 2 only, count 1.
* `FUN_0040c1b2` — array-B terrain-following curtains. Topology is described above at
  **medium** confidence but the argument aliasing on the `vec3` was never
  disassembled. Scene 4 only, count 1.
* `FUN_0040abed` — the impostor baker. `buildBillboards` takes the impostor textures
  as an input; producing them needs a render target and the tree/prop meshes, which is
  scene-layer work.
* `FUN_00404bb8` — the point-sprite class (different vtable, `+0xa4 = 4`).
* The ground-texture bake and the 32-pass soft shadow bake.
* All per-frame animation (`FUN_0040bfc1` spire growth, `FUN_0040a9ad` leaf wind,
  `FUN_0040d5c6` particle integration, `FUN_0040fba1` bird flight). The *initial*
  state each of these needs is produced and exposed.

---

## 9. THE TESSELLATION VERDICT

Two tessellators are implemented. Both satisfy the regression guard: **`tess = 1`
produces byte-identical vertex and index buffers** (asserted with a raw byte compare
in the test suite).

### (a) `tessellate(mesh, tess)` — generic barycentric subdivision

Normals are computed on the original topology and **interpolated**, never recomputed.
New vertices are cached by *original vertex index + integer barycentric weight*, never
by position, so UV seams stay duplicated and the double-wound leaf quads keep both
windings (tested: a 4-vertex quad with `QUAD_CW` + `QUAD_CCW` comes out of `tess=2`
with 8 front-facing and 8 back-facing triangles). Watertight (tested: boundary-edge
count scales by exactly `tess`).

**It is geometrically a no-op on every mesh in this demo, and therefore not worth
shipping.** The terrain is a piecewise-linear heightfield, so linearly interpolated
vertices land *exactly* in the plane of the triangle they came from; the UVs are
linear in `(c/W, r/H)`, so they interpolate exactly too. The silhouette does not
improve by a single pixel. The same argument applies to the flat-faceted tree rings
and spires: subdividing a facet cannot recover the smooth surface the facet
approximates.

Measured shading delta on the real terrain at real camera positions
(`tess=2` and `tess=3`, scenes 2 / 7 / 8): mean **0.22–2.8 / 255**, and the residual is
entirely my debug rasteriser's affine-vs-perspective interpolation error, not a real
change — the analytic argument above says it must be zero.

### (b) `buildTerrainTessellated(hmap, N, scale, tess)` — resampled, pinned lattice

This one does add real geometry. `FUN_0040e058` upsamples the 128×128 texture-program
heightmap to 256×256 and then **box-downsamples it to N×N with N = 64 or 128**,
throwing away 4×–16× of detail that is already computed. Rebuilding the grid at
`N·tess` recovers it.

The pinned-lattice rule is enforced explicitly. Because `fu = c/(W·tess)`, the fine
lattice is a strict superset of the coarse one, and the fine heights at `c = k·tess`
are **forced back to the coarse box average**. Verified for `tess = 2` and `4` on real
scene data:

* original vertex **positions** bit-identical ✅
* original vertex **normals** bit-identical (so every original `|n|` is preserved) ✅
* original vertex **uv0 and uv1** bit-identical ✅
* new vertices carry bilinearly resampled coarse normals; `computeNormals()` is never
  re-run ✅

Added relief at the new vertices (world units, `tess = 2`): scene 2 RMS 1.33 / max
10.5; scene 7 RMS 1.86 / max 19.3; scene 8 RMS 5.50 / max 74.3.

**Verdict: do not ship it either, by default.** Reasons, in order of weight:

1. **The terrain is unlit.** Its material flags are `0x18` / `0x3a`, i.e.
   `D3DRS_LIGHTING` off (§2). The generated normals are consumed *only* by the offline
   ground-texture bake, which happens at the coarse `N × N` cell resolution and which
   this port does not touch. So the "interpolated normals change the shading" worry
   does not even apply to the one mesh big enough to want tessellation — but neither
   does the benefit.
2. **It does visibly change the image.** Side-by-side renders at scene 8 (the ice
   spires, camera res 50, t = 120) show noticeably crisper — and noticeably more
   jagged — spire silhouettes on the tessellated side. That is a change, not clearly
   an improvement: the softness of the coarse mesh is part of how the ice reads.
   Scene 7's horizon line is unchanged; the extra relief there shows up only as
   mid-ground surface noise that the real (textured, unlit) renderer would not show.
3. **It desynchronises the baked ground texture between the pinned vertices.** The
   `texA`/`texB` blend and the 32-sample soft shadow were baked against the coarse
   surface. The pinned vertices still line up; the surface between them no longer
   does.
4. **It moves the shoreline.** New vertices can cross the `v.y <= waterLevel`
   threshold, and that jagged shoreline is on the do-not-touch list.

Both functions are exported and both default to `tess = 1`. My recommendation is to
leave them off and ship the original topology.

### Everything else on §9's list stands and is respected

The terrain's baked `n.y` and its `/W` (not `/(W-1)`) UV quirk, the water plane's
`d > 48 → d *= 4` discontinuity and `a < 0x40 → 0` clamp, the submerged-vertex
threshold, the tree leaves emitted twice with opposite winding, the billboard/particle
quads, the ribbon strips, and the tree ring seam are all reproduced exactly and none
of them is tessellated by anything in this port.

One structural note for anyone who later adds a tessellator: the original is
`D3DFMT_INDEX16`. A 128×128 terrain at `tess ≥ 4` exceeds 65535 vertices and silently
wraps its `u16` indices — this actually happened during development and showed up as a
33/255 mean shading error before it was diagnosed. `Mesh.allocIndices(t, wide)` widens
to `Uint32Array` and `mesh.indexFormat` reports `0x66` (`D3DFMT_INDEX32`) so the shim
can pick the right GL type.

---

## 10. Verification against the reference capture

`reference/sonnet_ref.mkv`, frames extracted with ffmpeg at 30/55/90/130/150/185/220/
275/320/360/395/430 s. I built the real terrain from the real texgen heightmaps
(`runTexgen(prog)` → blue channel, matching `FUN_00407983`'s `& 0xff`), drove it with
the real camera splines, and rasterised it with a debug Lambert shader.

* **Scene 7 (ice/snow, 360 s)** — reference: very low camera, horizon a little above
  mid-frame, gentle low-relief rolling terrain receding to a soft ridge. Generated
  (res 48, t = 0): same low camera, horizon at ~48 % down, same character and same
  relief scale. **Good match** on silhouette and proportion.
* **Scene 2 (forest, 130 s)** — the reference frame is dominated by tree billboards; the
  visible ground is a nearly flat green field. Generated terrain is correspondingly
  near-flat with the horizon at ~45 %, and the camera at x = 473 is close enough to the
  ±640 world edge that the terrain boundary enters frame at the bottom right — which
  is consistent with the descriptor (`scale = (5, 1.5, 5)`, `N = 64`, hmap prog 22 whose
  peak value is only 38/255). **Plausible, but the frame is not a real test of the
  terrain** — you would need the billboards and trees rendered to judge it.
* **Scene 3 (sea of clouds, 185 s)** — `scale.y = 0.001` produces a flat square plate,
  and the render shows exactly the corner silhouette of a 1280×1280 plate seen from
  y = 268. Consistent with the descriptor; the reference frame is dominated by the
  cloud layer, so again not a strong test.
* **Scene 8 (ice, credits)** — dramatic vertical spires, which is what hmap prog 26
  (max 236/255) with `scale = (2,1,2)` should give.

I have **not** compared textures, lighting, or any of the billboard/tree/particle
geometry against the video — none of that is rendered by this port. The honest claim
is: **terrain silhouette, proportion and camera framing match; everything else is
unverified against the capture.**

---

## 11. Still open

* The ground-texture blend math in `FUN_0040e058` (§10 of the notes) — unchanged.
* `FUN_0040c721`, `FUN_0040c1b2` (fully), `FUN_0040abed`'s angle count / RT sizes.
* The header field at `desc+0x0a` (f32 1.0 in every descriptor) — no consumer found.
* `desc+0x02`'s consumer (only meaningful in scene 0).
* Whether `D3DRS_NORMALIZENORMALS` (state 0x6f) is written anywhere — still not
  grepped. Everything in this port is consistent with it being off.
* Which `srand` seed `FUN_004078b6` actually receives at the array-A call site: two
  independent reads disagree (1 vs the record index). It is exposed as a parameter;
  scene 0 is the only user, so it can be settled by eye against the video.
* The material struct layout beyond "flags at `+0x0c`, alpha ref at `+0x14`".
