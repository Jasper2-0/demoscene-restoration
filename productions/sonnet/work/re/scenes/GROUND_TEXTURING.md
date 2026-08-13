# How the landscape is textured — and why raising the texture resolution barely helps

Written in answer to the project owner's question about scene 1 (object 4):

> "is it picking vertex colors from different textures based on normal? that would
> explain why we're not seeing an increase in resolution"

**Substantially yes**, and that is exactly the reason. The detail you are looking at is
not carried by the texture resolution at all.

## 1. What actually happens

It is **not** a bitmap stretched over a heightmap, and it is **not** per-vertex colour.
It is a **texture baked once at load, by blending two generated textures per texel, using
the terrain's own surface normal as the blend weight.**

`bakeGroundTexture` (scene7.js, a transcription of `FUN_0040e058`, disassembled
0x40e3a6–0x40e5ea) runs once per scene and produces a single 256×256 image:

```
for every output texel (x, y):
    W  = bilinear( normal.y sampled from the N×N terrain vertex grid )
    out = texA · W  +  texB · (1 − W)
```

For scene 1 that is:

| | |
|---|---|
| terrain grid **N** | **64 × 64 vertices** |
| heightmap source | texgen program **23** (128 × 128) |
| `texA` — the *flat* surface | texgen program **19** |
| `texB` — the *steep* surface | texgen program **18** |
| baked result | one 256 × 256 texture (256·S with the remaster) |
| `cell` | `trunc(size / N)` = 4 at 1×, 8 at 2× |

`W` is the interpolated **`normal.y`**: 1 where the ground faces straight up, 0 where it
is vertical. So flat ground shows `texA`, cliffs show `texB`, and everything between is a
cross-fade. That is what paints sand on the flats and rock on the slopes without any
authoring.

Two original quirks are preserved: the samples are taken at `(x+step)/cell`, **not**
`(x/cell)+1` — an off-by-one that makes the weight field piecewise-constant with a
one-texel seam per cell — and the accumulation order copies the x87 sequence at 0x40e4e9.

## 2. Why the remaster does not look sharper

**Two different resolutions are in play, and only one of them scales.**

| what | carries | resolution | scales with the remaster? |
|---|---|---|---|
| `texA` / `texB` | fine grain — sand speckle, rock grain | 256² → 512² | **yes** |
| the blend weight `W` | **which** surface appears where — the large mottled pattern | **64 × 64, always** | **no** |

The mask is derived from the terrain's *vertex normals*, so it has exactly `N × N` = 4096
real values however big the output texture is. At 1× each mask cell covers 4×4 texels; at
2× it covers 8×8. The mask does not gain detail — it just gets **smoother**.

And the mottling your eye reads as "the landscape texture" is *the mask*, not the grain.
So doubling the texture resolution doubles something you can barely see and leaves the
dominant feature untouched. This is also why the owner's earlier note — "the shadow on
the landscape is too dark **and too coarse**" — is only half-addressed by the texture
remaster: the coarseness is the mask.

## 3. The obvious fix is blocked, but there is a better one

**Blocked: raise N.** More terrain vertices would give a finer mask, but tessellation is
ruled out (`re/REMASTER.md` §4, measured): vertex normals here are an *un-normalised*
mean of face normals, so changing the triangle count around a vertex changes `|n|` and
therefore the shading. Worse, `W` *is* `normal.y` — so tessellating would change the
weight field itself, i.e. change which surface appears where. The terrain grid is
explicitly on the do-not-tessellate list.

**Available: decouple the mask from the mesh.** The mask is a *texture-space* quantity.
Nothing requires it to be sampled at the mesh's vertex density — that is simply where the
original happened to have normals lying around.

The information is already there: scene 1's heightmap is texgen program **23 at 128×128**,
sampled down to a **64×64** terrain grid. **The heightmap already carries 4× more detail
than the mask uses**, before the remaster generates it finer still. A normal can be
derived analytically from the heightmap at any resolution — central differences on the
height field — so the mask could be computed at the ground texture's own resolution
without adding a single vertex, without touching the mesh, and therefore without
disturbing the un-normalised vertex normals that the lighting depends on.

That would make the rock/sand boundary as crisp as the grain, which is the change that
would actually read as "higher resolution landscape".

**It is a genuine deviation and belongs on the remaster path only.** The original's mask
really is 64×64, and `?quality=original` must keep it — the one-texel seam from the
`(x+step)/cell` off-by-one is part of the authentic image.

## 4. Recommended, in order

1. **Remaster path: derive `W` from the heightmap at the ground texture's resolution**
   (central differences, matching the mesh's normal convention in *direction* so the
   sand/rock assignment is unchanged — only its sharpness). Gate behind the quality flag.
2. **Verify it changes the right thing.** The rock/sand boundary should sharpen while the
   *placement* of rock and sand stays put. If the boundary moves, the derived normal does
   not match the mesh's and the scene will look re-authored rather than remastered.
3. **Leave the authentic path exactly as it is**, seam included.
4. Only then revisit "the shadow is too dark", which is a separate, still-open question
   (`re/scenes/REVIEW_FIXES.md` §2c) — the ambient-material fix was verified not to be its
   cause.
