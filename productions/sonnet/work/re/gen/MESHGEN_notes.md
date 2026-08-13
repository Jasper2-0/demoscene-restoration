# Sonnet (threestate, Assembly 2001) — MESH GENERATOR notes

Findings agent notes. **Owner of `MESHGEN.md` / `js/meshgen.mjs` should integrate; this file is raw findings.**
All VAs are image VAs (`unpacked/sonnet_img.bin`, VA 0x401000 = file offset 0).

---

## 0. TL;DR — the single most important thing (normals)

`FUN_004045f1 @ 004045f1` is the **only** normal generator in the binary. Every mesh goes
through it. It is a **face-normal average that is divided by the face count and NOT
re-normalised**, and the face normal is **negated** relative to the standard
`cross(v1-v0, v2-v0)`, then negated **again** at the end via a `-1.0` constant.

Net result per vertex:

```
n_v = ( Σ_over_faces_f_touching_v  normalize( cross(v1-v0, v2-v0) ) ) / count(v)
```

* `count(v)` is an **unweighted** integer count (each incident triangle contributes exactly
  `+1.0`, VA 0x4170c4 = 1.0f) — no area weighting, no angle weighting.
* The final scale is `_DAT_004170cc / count` where **`0x4170cc` is `-1.0f`, not `1.0f`**
  (verify: dword at 0x4170cc = `bf800000`). Combined with the negated face normal this
  cancels, so vertex normals come out with the *geometric* `+cross(e1,e2)` orientation.
* The per-face array at `mesh+0xc0` stores the **negated** normal (i.e. `-cross(e1,e2)`),
  opposite in sign to the vertex normals. This asymmetry is real, not a decompiler artifact.
* **There is no final `normalize()`.** `|n_v| = |mean of unit face normals| <= 1`, and it is
  strictly `< 1` at any crease. With `D3DRS_NORMALIZENORMALS` off (per coordinator), the
  shortening **darkens creases** — this is a load-bearing visual property of the demo.
  Any port must reproduce the un-normalised mean, *not* a normalized average.

Structure of `FUN_004045f1` (confidence: **high**, read from decompile + constants verified):

```
// pass 1: zero
for v in 0..vcount-1:  v.nx=v.ny=v.nz=0 ;  count[v]=0        // count[] at mesh+0xbc, 4B/vertex

// pass 2: accumulate
for each tri (i0,i1,i2)  // indices read as u16 triples from mesh+0xb8
    e1 = V[i1] - V[i0]
    e2 = V[i2] - V[i0]
    c  = cross(e1, e2)
    fn = -c / |c|                       //  <-- NEGATED, unit length; 0x418248 is DOUBLE 1.0
    faceNormals[tri] = fn               //  mesh+0xc0, 12 bytes/tri
    for k in (i0,i1,i2):
        V[k].n += fn
        count[k] += 1.0

// pass 3: average, NO renormalise
for v in 0..vcount-1:
    s = -1.0 / count[v]                 //  0x4170cc == -1.0f
    v.n *= s
```

Degenerate faces: `|c|` is **not** guarded against zero — a degenerate triangle produces
inf/NaN in `fn` and poisons all three vertices. See §7 for where that can happen.

Recompute-per-frame: `FUN_00404a10 @ 00404a10` (the mesh render fn) calls `FUN_004045f1`
again every frame **iff `mesh+0xc8 & 1`**, i.e. for deforming meshes.

---

## 1. Answer to (A): parametric primitive library, not a mesh format, not bespoke-per-scene

**Verdict: (a)-leaning hybrid.** There is **no stored vertex/index data anywhere in the file**
and **no general mesh format**. Instead there is:

* one **mesh container class** (ctor `FUN_004042f6 @ 004042f6`, vtable `PTR_FUN_00418290`),
* a **small library of ~10 hard-coded topology generators**, each of which builds one
  primitive family with a *fixed* topology and a handful of float/int parameters,
* driven by **per-scene byte/word parameters** decoded from resources 28..35.

So: the topology of each primitive is bespoke C++ code; the *instancing, counts, sizes,
placements and colours* are data-driven from the scene descriptor. Nothing in the resource
blobs describes geometry directly.

Evidence: every allocation of geometry goes through `FUN_00404380 @ 00404380`
(vertex alloc) and `FUN_004043d2 @ 004043d2` (index alloc), and the complete set of call
sites is (grep `FUN_004042f6|FUN_00404380|FUN_004043d2`):

| VA of caller | generator | verts / tris |
|---|---|---|
| `FUN_00404875 @ 00404875` | **generic grid/plane** | `W*H` / `2*(W-1)*(H-1)` |
| `FUN_00409d45 @ 00409d45` | tree host (2 meshes, over-alloc 0xffff then `FUN_0040449f` shrink) | dynamic |
| `FUN_0040a186 @ 0040a186` | **L-system tree** branches + leaves (writes into the above) | 24/32 per segment, 8/4 per leaf |
| `FUN_0040b0b0 @ 0040b0b0` | **billboard quads** (impostors) | `N*4`/`N*2` (type0) or `N*8`/`N*4` (type1) |
| `FUN_0040bc63 @ 0040bc63` | **surface of revolution** (tapered cylinder) | `16*8` / `2*8*15`, then N instance copies |
| `FUN_0040bfc1 @ 0040bfc1` | **terrain-following ribbon** (river/road) | `4*H*W` / `4*(W-1)*H` |
| `FUN_0040c721 @ 0040c721` | **compound prop** (3 meshes: 0x800/0xc00, 0x4800/0x6000, 0x80/0xf0) | fixed |
| `FUN_0040d1f1 @ 0040d1f1` | **rain/snow particle quads** | `N*4`/`N*2` + 0x400 fixed quads |
| `FUN_0040ec28 @ 0040ec28` | **cloud/flare quads** | `N*4`/`N*2`, plus 4/2 and 4/2 |
| `FUN_0040f42f @ 0040f42f` | **ribbon strip** (16 segments) | 0x20 / 0x1e |
| `FUN_0040f803 @ 0040f803` | **bird** (6-vert double-wing) | 6 / 4 per instance |
| `FUN_00404bb8 @ 00404bb8` | **point-sprite system** (different class, vtable `PTR_FUN_004182ac`) | `N*4`/`N*2` |
| `FUN_0040e058 @ 0040e058` | **terrain** — calls `FUN_00404875` | `N*N` / `2*(N-1)^2` |

Confidence: **high**.

---

## 2. Mesh container class (`FUN_004042f6 @ 004042f6`, vtable `PTR_FUN_00418290`)

Object size 0xcc. Field map (confidence **high**, cross-checked against `FUN_00404a10`):

| off | type | meaning |
|---|---|---|
| 0x00 | ptr | vtable (`PTR_FUN_00418290`) |
| 0x08 | float[16] | local matrix (rot + translation) |
| 0x48 | float[16] | composed world matrix (rebuilt every frame) |
| 0x88 | vec3 | position (translation) |
| 0x94 | vec3 | **scale** |
| 0xa4 | u32 | layer/format id, `8` for meshes, `4` for the sprite/flare class |
| 0xac | int | vertex count |
| 0xb0 | ptr | **vertex array, stride 0x2c (44 B)** |
| 0xb4 | int | triangle count |
| 0xb8 | ptr | **index array, u16, 3 per tri (6 B/tri)** |
| 0xbc | ptr | float[vcount] — per-vertex incident-face counter (normal averaging scratch) |
| 0xc0 | ptr | vec3[tricount] — per-face normals (negated, see §0) |
| 0xc4 | ptr | material (`FUN_00401c67`/`FUN_00401ca8`, 0x2c bytes) |
| 0xc8 | byte flags | bit0 = recompute normals each frame; bit1 = hidden/skip |

`FUN_0040449f @ 0040449f` = "shrink to fit" (realloc vertex/index/normal arrays to the
current `+0xac`/`+0xb4` after an over-allocated generator has finished).

### Vertex format (confidence: **high — confirmed both by stride and by the FVF call**)

`SetVertexShader(0x252)` at **VA 0x4014f2** (`(**(DAT_004747ac + 0x130))(dev, 0x252)`).

```
0x252 = D3DFVF_XYZ(0x002) | D3DFVF_NORMAL(0x010) | D3DFVF_DIFFUSE(0x040) | D3DFVF_TEX2(0x200)
```

| offset | size | attr |
|---|---|---|
| 0x00 | 12 | position   x,y,z |
| 0x0c | 12 | **normal**  nx,ny,nz |
| 0x18 | 4  | D3DCOLOR diffuse (ARGB, `0xFFFFFFFF` default) |
| 0x1c | 8  | texcoord0 u,v |
| 0x24 | 8  | texcoord1 u,v |
| total | **44 = 0x2c** | |

### Draw call — this is **Direct3D 8**, not D3D7

`FUN_00404a10 @ 00404a10`, VA 0x404ac2:
```
push 0x2c            ; VertexStreamZeroStride
push [mesh+0xb0]     ; pVertexStreamZeroData
push 0x65            ; IndexDataFormat = D3DFMT_INDEX16 (101)
push [mesh+0xb8]     ; pIndexData
push [mesh+0xb4]     ; PrimitiveCount  (= triangle count)
push [mesh+0xac]     ; NumVertices
push 0               ; MinVertexIndex
push 4               ; D3DPT_TRIANGLELIST
call [dev_vtbl+0x124]
```
That is `IDirect3DDevice8::DrawIndexedPrimitiveUP` (vtable +0x124), and `0x65 =
D3DFMT_INDEX16` is the giveaway. So: **u16 indices, D3DPT_TRIANGLELIST, no VB/IB, D3D8
fixed function.** Confidence **high**.

World transform assembled per frame in `FUN_00404a10`:
`world = Scale(mesh+0x94) * (Rot|Trans at mesh+0x08 with translation from mesh+0x88)`.

Lighting: `D3DRS_LIGHTING (0x89)` is set **per material** in `FUN_00401d12 @ 00401d12`
(`FUN_00401b45` → `FUN_00402349(0x89, x)`), enabled iff bit0 of the material byte at
`mat+0xd` (= bit8 of the flags word passed to `FUN_00401c67`). Materials seen:
`0x300` (tree leaves), `0x1310` (billboard impostors), `0x1111` → lighting **ON**.
`0x18`, `0x3a`, `0x1891`, `0x1019`, `0x1011`, `0xc018`, `0x1811`, `0x20`, `0x11`, `0`
→ lighting **OFF**. **The terrain (0x18 / 0x3a) is unlit** — it uses baked textures.
Confidence **medium-high** (field offset within the material struct not re-verified).

---

## 3. The primary primitive: `FUN_00404875 @ 00404875` — parametric grid

Signature (recovered by ndisasm at 0x40487b–0x4048a3; Ghidra drops the FPU args):

```
FUN_00404875(mesh,
             dimX, dimY_unused, dimZ,      // param_1..3  vec3, X and Z fild'd to int  -> W, H
             extX, heightScale, extZ,      // param_4..6  vec3, half-extents
             u0Tile, v0Tile, _,            // param_7..9  vec3
             u1Tile, v1Tile, _,            // param_10..12
             int heightArrayOrNull)        // param_13
```

```
W = (int)param_1 ; H = (int)param_3
alloc verts  = W*H                        ; FUN_00404380
alloc tris   = (2*W - 2) * (H - 1)        ; FUN_004043d2

for row r in 0..H-1:
   fv = r / H                             // NOTE: divided by H, not H-1
   for col c in 0..W-1:
      fu = c / W                          // NOTE: divided by W, not W-1
      x  = fu*extX*2 - extX
      y  = (param_13 == 0) ? param_2
                           : heightArray[r*W + c] * (1/255) * heightScale
      z  = -extZ + fv*extZ*2
      color = 0xFFFFFFFF
      uv0 = (u0Tile*fu, v0Tile*fv)
      uv1 = (u1Tile*fu, v1Tile*fv)
      // normals left untouched here

for r in 0..H-2, c in 0..W-2:
   b0 = r*W ; b1 = (r+1)*W
   tri A = (c+b0, c+b1, c+1+b1)
   tri B = (c+1+b1, c+1+b0, c+b0)

FUN_004045f1(mesh)                        // normals
```

**Gotcha for the port:** the division is by `W`/`H`, not `W-1`/`H-1`. The plane therefore
does **not** reach `+extX`/`+extZ` and the last column/row of UVs does not reach 1.0 —
the grid is asymmetric by one cell. Reproduce this exactly or terrain/water alignment
against the baked textures will drift. Constants: `0x418200 = 2.0f`, `0x418298 = 1/255`.

Winding: with that index order, `cross(v1-v0, v2-v0)` for a flat XZ grid comes out `+Y`,
so vertex normals point **up**; the stored face normals point **down**. Confidence **high**.

---

## 4. Terrain (`FUN_0040e058 @ 0040e058`) — the main geometry of the demo

Called from `FUN_00407983 @ 00407983` (VA ~0x4079f4) with:
`(this=Landscape+0x4c, sceneIdx, renderList, gridN=desc[0x4c], hmap128=texprog[desc[0x3f]],
  texA=texprog[desc[0x4d]], texB=texprog[desc[0x4e]], sunColour(vec3), scaleVec=desc+0x40,
  flag_bit24, flag_bit8)`.

Terrain object field map (confidence **high**):

| off | meaning |
|---|---|
| 0x00 | vec3 **scaleVec** (from desc+0x40) — becomes the mesh's `+0x94` scale |
| 0x0c | vec3 `(128.0, 256.0, 128.0)` — fixed local extents (`0x418e30`=128, `0x4182bc`=256) |
| 0x18 | int N (grid resolution, `desc[0x4c]`: 64 or 128) |
| 0x20 | **terrain mesh\*** |
| 0x24 | 256×256 int **soft shadow map** |
| 0x28 | N×N int height array (mesh source) |
| 0x2c | 256×256 int upsampled heightmap |
| 0x38 | baked ground texture |
| 0x44 | 0x100000 scratch (512×512) |

Because `Landscape+0x4c` is the terrain object, the aliases used in `FUN_004082a9` are:
`Landscape+0x64 = terrain+0x18 = N`, `Landscape+0x6c = terrain+0x20 = mesh`,
`Landscape+0x70 = terrain+0x24 = shadow map`. Confirmed consistent. Confidence **high**.

Steps:
1. **Upsample** the 128×128 texture-program heightmap to 256×256 into `+0x2c`, sampling
   `FUN_0040e6f6` at half-texel offsets (2× bilinear).
2. **Downsample** 256×256 → N×N by box-average (block size `step = 256/N`) into `+0x28`.
3. Build the mesh: `FUN_004042f6(0,0,0)` then
   `FUN_00404875(mesh, N,0,N, 128.0, 256.0, 128.0, 1,1,0, 16,16,0, heightArray)`
   → local XZ ∈ ±128, Y = h/255 * 256, uv0 tiled ×1, uv1 tiled ×16
   (`0x418f0c = 16.0`). Then `mesh+0x94 = scaleVec` — so **world extent is
   `±128 * scaleVec.xz` and world height is `256 * scaleVec.y`.**
   Scene 3 has `scaleVec.y = 0.001` → a flat plane (that's the "sea of clouds" shot).
4. `FUN_0040e923 @ 0040e923` — **soft shadow bake**: memset `+0x24` to 255, then
   **32 jittered passes** of a fixed-point ray-march (0x1000 steps max) of the light
   direction across the 256×256 heightmap, averaging into `+0x24`. Called twice
   (unconditionally, plus once more when `flag_bit24 == 0`).
5. Bake the ground texture (256×256, into `+0x44`): blends `texA`/`texB` per texel using
   the fractional position inside a mesh cell **and the terrain vertex normal's Y
   component**, read at `vertexArray[(col/step + (row/step)*N)*0x2c + 0x10]` — i.e.
   `n.y`. This is the *only* use of the generated normals on the terrain.
   The exact fixed-point mixing math is dropped by Ghidra (a chain of `FUN_00404224`
   ftol calls) — **NOT FULLY RESOLVED**, see §9.

`FUN_0040e6f6 @ 0040e6f6` = bilinear sampler on an int array, recovered from ndisasm:
```
x16 = (int)(x * 65536.0)              // 0x418270 = 65536.0
ix  = x16 >> 16 ;  u = (x16 & 0xffff) * (1/65536)   // 0x418f94
(same for z)
h00 = a[iz*W+ix]; h10 = a[iz*W+ix+1] (if ix+1<W); h01 = a[(iz+1)*W+ix] (if iz+1<W); h11
result = bilinear(h00,h10,h01,h11,u,v)
```
`FUN_0040e842 @ 0040e842` = world→heightmap coordinate map, recovered from ndisasm:
```
e = extents(+0x0c) * scaleVec(+0x00)              // = (128*sx, 256*sy, 128*sz)
if (x < -e.x || z < -e.z || x > e.x || z > e.z)  -> x = z = 0
else  x' = (x + e.x)/(2*e.x) * 256 ;  z' = (z + e.z)/(2*e.z) * 256
```
`FUN_0040e8d2 @ 0040e8d2` = terrain height query: `bilinear(+0x28, x, z) * scaleVec.y`.
`FUN_0040e8fb @ 0040e8fb` = shadow query: `bilinear(+0x24, x, z) * (1/255)` (`0x418fa0` is
the **double** 0.00392156862745098). Confidence **high**.

---

## 5. Answer to (C): where lighting actually goes

**Normals ARE generated** for every mesh (§0), are present in the FVF, and *are* used by
fixed-function lighting for a small set of materials (leaves 0x300, impostors 0x1310).
But the dominant look is **baked**:

* **Terrain**: unlit material; light comes from the baked ground texture, which mixes two
  texture-program layers by `n.y` and by the 32-sample soft shadow map. (`FUN_0040e058`,
  `FUN_0040e923`.)
* **Vertex colours are baked, but as an ALPHA FADE, not as lighting.** In
  `FUN_004082a9 @ 004082a9` (VA 0x408647 and 0x408712, recovered from ndisasm because
  Ghidra drops the FPU chain):

```
d = sqrt(v.x*v.x + v.z*v.z)      // FUN_00408c11(v, vec3(0, v.y, 0))  -> radial dist from Y axis
d = d * 0.5                      // 0x4170d4 = 0.5
if (d > 48.0) d = d * 4.0        // 0x418e80 = 48.0 , 0x418230 = 4.0
a = (int)d ;  if (a > 255) a = 255

// loop 1 — terrain mesh (Landscape+0x6c), N*N vertices:
if (a < 0x40) a = 0
if (v.y <= waterLevel /*desc+0x10*/)
     v.color = ((-(a+1)) << 24) | 0x00FFFFFF     // == alpha (255 - a), RGB white

// loop 2 — water plane (Landscape+0x44), 32*32 = 1024 vertices:
     v.color = (a << 24) | 0x003F3F3F            // alpha = a, RGB 0x3f grey
```
So submerged terrain fades **out** with radial distance and the water plane fades **in** —
a soft shoreline blend. `FUN_00408c11 @ 00408c11` is a plain 3-component distance that
leaves its result on the x87 stack (tail-calls `FUN_00404213` = fsqrt);
`FUN_00404224 @ 00404224` is `__ftol` (fstcw/fistp qword), which is why Ghidra shows
argument-less calls everywhere.

* `FUN_0040bfc1` (river ribbon) writes a real baked-light vertex colour:
  `RGB = grey from FUN_0040e8fb (shadow map)`, `A = clamp(FUN_00408c11 radial dist, 0, ..)`.
* `FUN_0040f803` (birds) uses random grey `0x9b + rand()%100` per instance.
* `FUN_0040f5a8` (ribbon strip) uses `(alpha << 24) | 0x6f6f6f`.
* `FUN_00404875` leaves `0xFFFFFFFF`.

Confidence **high** for the two `FUN_004082a9` loops (read from ndisasm), **medium-high**
for the rest.

---

## 6. Scene descriptor (0x3213 bytes) — decoded by `FUN_00407767 @ 00407767`

Allocated in `FUN_004082a9` at `Landscape+0x24`/`+0x28`; constructed by
`FUN_00408c6c @ 00408c6c`; the source resource is `28 + map1[sceneIdx]`,
`map1 = [0,1,2,3,4,5,0,6,7]`. `FUN_00407767` is a **straight structured memcpy** (no
compression), so the resource bytes map 1:1 onto the struct.

### Layout

| desc offset | size | content |
|---|---|---|
| 0x0000 | 0x53 | header (copied verbatim from the head of the resource) |
| 0x0053 | 64 × 0x22 | array **A** — surface-of-revolution clusters (`FUN_0040bc63`) |
| 0x08d3 | 64 × 0x20 | array **B** — `FUN_0040c1b2` |
| 0x10d3 | 64 × 0x22 | array **C** — billboard set, type 0 (`FUN_0040b0b0`) |
| 0x1953 | 64 × 0x1e | array **D** — billboard set, type 1 (`FUN_0040b0b0`) |
| 0x20d3 | 64 × 0x1e | array **E** — trees (`FUN_00409d45`) |
| 0x2853 | 64 × 0x10 | array **F** — compound props (`FUN_0040c721`) |
| 0x2c53 | 64 × 0x17 | array **G** — birds (`FUN_0040f803`) |
| 0x3213 | | end |

Each array is copied only if its count byte is non-zero, and only `count` records are
consumed from the resource stream — so the resource is a packed variable-length blob.
Confidence **high** (the arithmetic closes exactly: 64×0x22 = 0x880, etc.).

### Header (0x53 bytes)

| off | type | meaning | confidence |
|---|---|---|---|
| 0x00 | u8 | camera-path count | high |
| 0x01 | u8 | count of array A | high |
| 0x06 | u8 | count of array B | high |
| 0x07 | u8 | count of array C | high |
| 0x08 | u8 | count of array D | high |
| 0x09 | u8 | count of array E (trees) | high |
| 0x0e | u8 | count of array F | high |
| 0x0f | u8 | count of array G (birds) | high |
| 0x10 | f32 | **water level** (also gates whether a water plane exists at all) | high |
| 0x14 | u16 | rain/snow particle count | med-high |
| 0x16 | u8 | rain/snow type (0 = snow, 1 = rain) | med |
| 0x17 | u32 | cloud quad count | med-high |
| 0x1b | u8 | cloud param | med |
| 0x1c | u32 | cloud colour (ARGB) | med |
| 0x20 | u16 | cloud size | med |
| 0x2e | u16 | flare param 1 (`FUN_00405082` arg 1) | med |
| 0x30 | u16 | flare param 2 (`FUN_00405082` arg 2) | med |
| 0x32 | vec3 | sun / flare world position (`0x36` = the .y, overwritten to 374.0 for scene 1) | high |
| 0x3e | u8 | fog / haze density (`(255-x)*(1/255)`, then cubed — VA ~0x408f?) | med |
| 0x3f | u8 | texture-program id for the 128×128 heightmap | high |
| 0x40 | vec3 | **terrain scale vector** (mesh `+0x94`; also scales the world→map mapping) | high |
| 0x4c | u8 | **terrain grid resolution N** (64 or 128) | high |
| 0x4d | u8 | texture-program id, ground layer A (256×256) | high |
| 0x4e | u8 | texture-program id, ground layer B (256×256) | high |
| 0x4f | u32 | flags (see below) | high |

### Flag bits at desc+0x4f (dword). Verified against all 8 descriptors.

| bit | mask | meaning |
|---|---|---|
| 1 | 0x00000002 | build array A (`FUN_0040bc63`) |
| 2 | 0x00000004 | build array B (`FUN_0040c1b2`) |
| 3 | 0x00000008 | build array E — trees (`FUN_00409d45`) |
| 4 | 0x00000010 | build array C — billboards type 0 |
| 5 | 0x00000020 | build array D — billboards type 1 |
| 6 | 0x00000040 | build rain/snow (`FUN_0040d1f1`) |
| 7 | 0x00000080 | (with bit6) allocate a 64×64 render target at `Landscape+0x30` |
| 8 | 0x00000100 | terrain option flag (`FUN_0040e058` param_13) |
| 10 | 0x00000400 | cloud option (`FUN_0040ec28` arg: `~(f>>10)&1`); also gates the flare offset |
| 11 | 0x00000800 | cloud option (`FUN_0040ec28` last arg) |
| 13 | 0x00002000 | **hi-res water plane** (32×32 + ribbons) vs coarse 4×4 |
| 14 | 0x00004000 | build array G — birds (`FUN_0040f803`) |
| 15 | 0x00008000 | build array F (`FUN_0040c721`) |
| 16 | 0x00010000 | terrain visible (if clear, terrain mesh gets `+0xc8 |= 2` = hidden) |
| 18 | 0x00040000 | `FUN_0040b0b0` type-0 option |
| 23 | 0x00800000 | **autumn leaf colour** — `DAT_0047895c = 0xffff0032` instead of `0xffa4ff9d` |
| 24 | 0x01000000 | terrain option (`FUN_0040e058` param_14 = `~(f>>24)&1`) |

### Decoded descriptors (from `unpacked/sonnet_img.bin`)

```
scene 0 (obj 3, res28): cams=1 A=1 B=0 C=0 D=0 E=0 F=0 G=0
   water=0.00  N=64 hmap=23 texA=19 texB=18  scale=(4.0,1.5,4.0)  flags=00000002
   -> terrain HIDDEN (bit16 clear); only the array-A revolution clusters
scene 1 (obj 4, res29): cams=2 all counts 0
   water=1.00  N=64 hmap=23 texA=19 texB=18  scale=(3.0,0.5,3.0)  flags=01030200
   -> coarse 4x4 water plane (bit13 clear), 3 cloud quads
scene 2 (obj 5, res30): cams=3 C=4 D=1 F=1 G=1
   water=0.00  N=64 hmap=22 texA=19 texB=18  scale=(5.0,1.5,5.0)  flags=0001c030
scene 3 (obj 6, res31): cams=1 G=1
   water=0.00  N=64 hmap=23 texA=19 texB=18  scale=(5.0,0.001,5.0) flags=00004e00
   -> scale.y = 0.001 => FLAT terrain (the cloud-sea shot)
scene 4 (obj 7, res32): cams=3 B=1 C=1 G=1
   water=1.00  N=64 hmap=25 texA=17 texB=18  scale=(3.0,0.5,3.0)  flags=00016015
   -> bit13 set => hi-res 32x32 water plane + 32 ribbon strips
scene 5 (obj 8, res33): cams=2 C=1 E=1
   water=0.00  N=64 hmap=24 texA=20 texB=18  scale=(4.0,1.5,4.0)  flags=008502d8
   -> bit23 set => RED/autumn leaves; rain 768 type 1
scene 7 (obj 10, res34): cams=2 C=1
   water=0.00  N=128 hmap=22 texA=20 texB=18 scale=(3.0,1.6,3.0)  flags=000d0050
   -> snow (4096, type 0)
scene 8 (obj 11, res35): cams=2, all counts 0
   water=0.00  N=128 hmap=26 texA=27 texB=27 scale=(2.0,1.0,2.0)  flags=00010300
```

---

## 7. Resources 36..51 are **camera splines**, NOT meshes

This corrects the working assumption in the brief. `FUN_00405a29 @ 00405a29` decodes
resource `map2[sceneIdx] + 0x24 + i` (`map2 = [0,1,3,6,7,10,0,12,14]`) into the object at
`Landscape+0x18[i]`, which is a **camera** (0x134 bytes, ctor `FUN_004052a5 @ 004052a5`,
vtable `PTR_FUN_004182c0`):

* `blob[2]` = key count; then `count × 7 × u16`, stride 0x0e.
* Each u16 is decoded by `FUN_00401358 @ 00401358` as `(float)bits(u16 << 16)` — i.e.
  **bfloat16**: the u16 is the top half of an IEEE754 float bit pattern.
* Key struct = 0x1c bytes = 7 floats.
* `FUN_0040544c` evaluates the spline; `FUN_00405778 @ 00405778` is a **cubic Hermite**
  basis (`h00 = 2s³-3s²+1`, `h01 = -2s³+3s²`, `h10 = s³-2s²+s`, `h11 = s³-s²`, with
  `0x4182c8 = -2.0`, `0x4182cc = 3.0`).
* `FUN_004058a6 @ 004058a6` builds the view; `FUN_00405b5d @ 00405b5d` builds the
  view matrix (`FUN_00402072` look-at from pos@0x88 to target@0xac, roll at +0xb8) and
  projection (`FUN_00405c0c @ 00405c0c`, fov at +0xbc × deg2rad `0x4182e0` (double
  0.017453292519943295), near +0xc0, far +0xc4, aspect +0xc8).

So **no mesh data is stored in the archive at all**. Confidence **high**.

---

## 8. Answer to (D): scene → object mapping

`FUN_004082a9(this, sceneIdx)` runs at `t = 0xffff` for objects 3..10 with
`sceneIdx = 0,1,2,3,4,5,7,8` (index 6 is a cut scene). From `re/out/timeline.txt`:

| object | sceneIdx | descriptor | camera res | timeline t range | reference video (approx) |
|---|---|---|---|---|---|
| 3 | 0 | res 28 | res 36 | 0x0400–0x0700 | bright white / sun ("shine for me"), **terrain hidden** |
| 4 | 1 | res 29 | res 37 | 0x0700–0x0a00 | dark shot |
| 5 | 2 | res 30 | res 39 | 0x0a00–0x0f00 | **green forest** — trees + billboards + prop + birds |
| 6 | 3 | res 31 | res 42 | 0x0f00–0x1200 | **sea of clouds** (flat terrain, scale.y=0.001) |
| 7 | 4 | res 32 | res 43 | 0x1200–0x1700 | **beach / hi-res water** ("no more beaches") |
| 8 | 5 | res 33 | res 46 | 0x1700–0x1e00 | **autumn** — red leaves (flag bit23), rain |
| 9 | 7 | res 34 | res 48 | 0x1e00–0x2300 | **ice / snow**, N=128, 4096 snow particles |
| 10 | 8 | res 35 | res 50 | 0x2300–0x2b00 | **ice, credits**, N=128 |

The exact video timestamps of the montage I sampled (55/90/130/180/220/270/320/380/430 s)
line up with a tick→second factor of roughly 0.045; treat the "reference video" column as
**medium** confidence on the 0/1 and 3/4 rows, **high** on forest / autumn / ice.

---

## 9. Answer to (E): DO-NOT-TESSELLATE list

Anything whose look depends on the un-normalised averaged normal, on baked per-vertex
alpha, or on deliberate double-sided winding **must not be tessellated**:

1. **Every mesh, globally** — the un-normalised mean-of-face-normals (§0) means any
   change in triangle *count* around a vertex changes `|n|` and therefore the shading.
   Tessellating even a flat region changes `count(v)` and hence brightness. This is the
   single biggest hazard.
2. **Terrain grid** (`FUN_00404875` via `FUN_0040e058`) — the ground texture is baked
   against `n.y` sampled at *this* vertex resolution and against a cell size of
   `256/N`. Re-tessellating desynchronises the bake. Also: the `/W` (not `/(W-1)`) UV
   bug means the last row/column is a *different* size than all the others; a naive
   subdivision will not reproduce it.
3. **Water plane** (`Landscape+0x44`) — the per-vertex alpha is a hand-tuned radial ramp
   with a hard `if (d > 48) d *= 4` **discontinuity** and a hard `if (a < 0x40) a = 0`
   clamp on the terrain side. Subdividing changes where the discontinuity lands.
4. **Submerged terrain vertices** — same radial alpha ramp, and it is applied only where
   `v.y <= waterLevel`, so there is a **hard per-vertex threshold** producing a jagged
   shoreline that is part of the look.
5. **Tree leaves** (`FUN_0040a186`, leaf quads at 0x418edc / 0x418ee4) — each leaf is
   emitted **twice with opposite winding** (two 4-index templates covering the same 8
   vertices) to be double-sided. Any tessellator that welds or re-winds will collapse them.
   These leaves are also one of the few lit materials (0x300).
6. **Billboard quads** (`FUN_0040b0b0`, `FUN_0040ec28`, `FUN_0040d1f1`, `FUN_0040f803`,
   `FUN_00404bb8`) — camera-facing / axis-aligned quads. They are drawn with
   `FUN_004045f1` **never called** for several of them, so their normals are whatever the
   allocator left behind (see §10). Do not touch.
7. **Ribbon strips** (`FUN_0040f42f` / `FUN_0040f5a8`) — 16-segment 2-wide strip with
   per-vertex u = `i * 0.0666` (`0x418fcc`); UVs are position-coupled.
8. **Tree branch rings** (`FUN_0040a186`) — 3 rings × 8 verts stitched by
   `FUN_00409ccd @ 00409ccd` with a `% 8` wraparound. The seam vertex is **duplicated in
   UV but shared in index** (`(j+1) % 8`), so the ring is topologically closed but the
   u coordinate wraps from 7/7 back to 0 — a **hard UV discontinuity at the seam**.
   Same pattern in `FUN_0040bc63` (8 radial segments, `% 8`).
9. Degenerate-triangle hazard: `FUN_004045f1` does **not** guard `|cross| == 0`. In
   `FUN_0040bc63` the tip ring has radius `(1.001 - t³) * 1.0 * height` which reaches
   ~0 at `t = 1` (`0x418f44 = 1.001`, `0x418ef8 = 1.0`), so the top ring is near-degenerate
   and the normals there are numerically unstable. Do not subdivide near the tip.

---

## 10. Explicitly UNRESOLVED

* **Vertex normals of never-lit generators.** `FUN_004042f6` → `FUN_00404380` initialises
  only the diffuse colour (to `0xFFFFFFFF`, at vertex offset 0x18). Whether
  `FUN_004042e0` (the allocator) zeroes memory is **not verified**. Several generators
  (`FUN_0040b0b0`, `FUN_0040ec28`, `FUN_0040d1f1`, `FUN_0040f803`, `FUN_0040f42f`) never
  call `FUN_004045f1`, so their `nx,ny,nz` are either zero or garbage. Two of those
  materials (`0x1310`, `0x1111`) have **lighting enabled**. On real hardware this either
  gives black or gives whatever ambient is set. **Check `FUN_004042e0` before porting.**
* **The exact ground-texture blend math** in `FUN_0040e058` (VA ~0x40e460–0x40e6d0):
  a chain of ~10 `FUN_00404224` ftol calls whose x87 operands Ghidra discards. I did not
  disassemble this loop. It combines `texA`, `texB`, the shadow map `+0x24`, `n.y`, and two
  fractional cell coordinates (`1 - (row%step)/step`, `1 - (col%step)/step`). Result is
  written as `(0xff00 + r)<<16 | g<<8 | b` clamped to 255.
* **`FUN_0040c721`** (compound prop, 3 meshes 0x800/0xc00, 0x4800/0x6000, 0x80/0xf0):
  I identified the sub-mesh at `this+0x00` as a 16-ring × 8-segment cylinder
  (`FUN_00409ccd(..., 3-wide/8-wide, ...)`, radius `0x418f54 = 0.3`), but the two large
  meshes at `this+0x04` / `this+0x08` (built from 3×3 vertex patches, 9 verts / 8 tris
  each) are **not decoded**. This is the biggest remaining gap. Confidence on what it
  renders as: **low** (probably the rock/log/driftwood props in scenes 2 and 4).
* **`FUN_0040c1b2 @ 0040c1b2`** (array B, only used by scene 4, count 1): not read.
* **`FUN_0040bfc1 @ 0040bfc1`** river/road ribbon: topology read (4 verts per station,
  12 indices per pair, vertex colour = shadow-map grey + radial alpha) but its **caller
  and placement** (VA 0x40? inside `FUN_0040bb14`'s neighbourhood, line ~7725 of the
  decompile) were not chased. Confidence **medium**.
* **`FUN_0040abed @ 0040abed`** is an **impostor baker**: it renders the generated tree
  (`FUN_00409d45`) or prop (`FUN_0040c721`) from N angles into render targets stored at
  `&DAT_0047896c + type*4`, which `FUN_0040b0b0` then uses as billboard textures. I did
  not decode the angle count / render-target sizes fully (`0x200` or `0x200-0x180`).
  This matters: **the "trees" you see in the forest shot are mostly billboards of one
  procedurally generated tree**, not thousands of real trees. Confidence **medium-high**.
* Material struct layout (`FUN_00401c67 @ 00401c67`, 0x2c bytes) — I only established that
  the flags word lands at `+0x0c` and that `+0x14` is an alpha/reference byte.
* Whether `D3DRS_NORMALIZENORMALS` is explicitly written anywhere (I did not grep for
  render state 0x6f / 111). The coordinator states it is OFF; my analysis is consistent
  with that (it is what makes the mean-of-normals shortening visible).

---

## 11. Constant table (verified from the image)

| VA | value | note |
|---|---|---|
| 0x4170c0 | 100.0f | |
| 0x4170c4 | 1.0f | normal-accumulator increment |
| 0x4170c8 | 0.0f | |
| 0x4170cc | **-1.0f** | normal averaging scale (see §0) |
| 0x4170d4 | 0.5f | |
| 0x418200 | 2.0f | |
| 0x418220 | **double** 3.141592653589793 | π |
| 0x418230 | 4.0f | |
| 0x418248 | **double** 1.0 | 1/len for face normal |
| 0x418268 | 255.0f | |
| 0x418270 | 65536.0f | bilinear fixed-point |
| 0x418284 | 0.00390625f | 1/256 |
| 0x418298 | 0.003921569f | 1/255 |
| 0x4182a4 | 800.0f | |
| 0x4182a8 | 1600.0f | |
| 0x4182bc | 256.0f | terrain Y extent |
| 0x4182c8 | -2.0f | Hermite |
| 0x4182cc | 3.0f | Hermite |
| 0x4182e0 | **double** 0.017453292519943295 | deg→rad |
| 0x418300 | 1000.0f | |
| 0x418e24 | 20.0f | |
| 0x418e28 | 0.001f | |
| 0x418e30 | 128.0f | terrain XZ half-extent |
| 0x418e54 | 5.0f | |
| 0x418e58 | -5.0f | |
| 0x418e5c | 10.0f | |
| 0x418e60 | 50.0f | |
| 0x418e64 | 40.0f | |
| 0x418e78 | 300.0f | coarse water half-extent |
| 0x418e7c | 8.0f | coarse water uv0 tiling |
| 0x418e80 | 48.0f | radial-alpha knee |
| 0x418e84 | 32.0f | hi-res water grid dim |
| 0x418e88 | 600.0f | hi-res water half-extent |
| 0x418ea4 | 0.1f | |
| 0x418eb0 | 0.75f | |
| 0x418eb8 | 200.0f | |
| 0x418ef4 | 66.0f | tree segment length |
| 0x418ef8 | 1.0f | |
| 0x418efc | 0.1f | |
| 0x418f00 | 0.6f | tree branch angle spread |
| 0x418f04 | 0.2f | |
| 0x418f08 | 0.4f | |
| 0x418f0c | 16.0f | terrain uv1 tiling |
| 0x418f10 | 0.7f | depth-4 taper |
| 0x418f18 | **double** 6.283185307179586 | 2π |
| 0x418f20 | 0.142857149f | 1/7 (tree ring u step) |
| 0x418f2c | -10.0f | |
| 0x418f30 | -150.0f | |
| 0x418f34 | -50.0f | |
| 0x418f38 | -0.1f | |
| 0x418f40 | 1.27f | |
| 0x418f44 | 1.001f | revolution radius bias |
| 0x418f54 | 0.3f | |
| 0x418f58 | 1.5707964f | π/2 |
| 0x418f64 | 0.125f | |
| 0x418f68 | 0.0625f | |
| 0x418f78 | 0.333333343f | 1/3 |
| 0x418f94 | 1.52587890625e-05f | 1/65536 |
| 0x418fa0 | **double** 0.00392156862745098 | 1/255 |
| 0x418fc0 | -0.7f | |
| 0x418fc4 | 90.0f | |
| 0x418fc8 | 36.0f | |
| 0x418fcc | 0.0666667f | ribbon u step |
| 0x418fd4 | -3.0f | |
| 0x418fd8 | 0.01f | |

Index templates (byte arrays, added to a base vertex index by `FUN_00409ca6 @ 00409ca6`,
6 bytes each):

| VA | bytes | use |
|---|---|---|
| 0x418ed4 | `0 1 2 3 2 1` | ribbon strip quad (`FUN_0040f42f`) |
| 0x418edc | `0 1 2 2 3 0` | standard quad (CW) |
| 0x418ee4 | `0 3 2 2 1 0` | standard quad (CCW — the **back face of a leaf**) |
| 0x418eec | `0 2 3 3 1 0` | quad, alternate diagonal |

`FUN_00409ccd @ 00409ccd(dst, base, i, ringWidth, ring)` emits the two triangles of the
quad between ring `ring` and `ring+1`, columns `i` and `(i+1) % ringWidth` — i.e. a
**wrapping** ring stitch.
