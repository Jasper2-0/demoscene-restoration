# Lapsus should be on minigl — gap analysis

## The mistake

`productions/lapsus/web/js/main.js` hand-rolls fixed-function OpenGL 1.x over
WebGL2 inline. That is minigl's job, and the monorepo plan says so explicitly:
*"the opengl / direct3d7 / direct3d8 / xm.js replayer should have a single
shared source, so work on them is shared across restaurations."*

The cost is not hypothetical. Every one of these was re-derived from the
binary, got wrong at least once, and cost a measurable regression before it
was right — in a file no other production can benefit from:

* per-vertex lighting rather than per-fragment
* the infinite-viewer default (`GL_LIGHT_MODEL_LOCAL_VIEWER` never set)
* `GL_LIGHT_MODEL_TWO_SIDE` never set, so no back-face normal flip
* `GL_SEPARATE_SPECULAR_COLOR` — specular added after texturing
* sphere-map texgen from the eye-space normal
* unit-0 `GL_MODULATE` vs unit-1 `GL_ADD`
* the `GL_SHININESS` [0,128] clamp
* `_a` companion images folded into the colour texture's alpha

minigl already had the first, the fifth and the sixth.

## What minigl covers today

| | |
|---|---|
| per-vertex lighting, in the VS | ✅ — the same model, correctly |
| sphere-map texgen, per unit | ✅ — the same formula |
| two texture units + texEnv combiners | ✅ |
| `GL_NORMALIZE`, fog, texture matrices, line width | ✅ |
| lights: position (positional/directional), diffuse, spot | ✅ |

## What it lacks, and lapsus needs

1. **A material model.** minigl assumes `GL_COLOR_MATERIAL` with its default
   `GL_AMBIENT_AND_DIFFUSE`, so `glColor` drives both terms. Lapsus drives
   explicit `glMaterialfv` for ambient / diffuse / specular / shininess
   (RENDER.md §4.4), including the "GL_AMBIENT is (1,1,1) for every surface"
   quirk.
2. **Specular, at all.** minigl's own header: *"material specular is never
   set, so there is no specular term at all."* Lapsus needs the specular AND
   `GL_SEPARATE_SPECULAR_COLOR` — added after texturing, not modulated by it.
3. **Light-model ambient.** minigl hardcodes `vec3 lit = vec3(0.2)`, GL's
   default. Lapsus writes it per scene from `AmbientIntensity`, which is 0 in
   most parts — so the constant is wrong for essentially every lapsus frame.
4. **Per-light ambient/specular colours**, and the documented "no per-light
   ambient" behaviour.
5. **Flat vs smooth shading** — driven by the mesh (one vertex per polygon
   corner where a surface has no SMAN), so this belongs in the caller, not the
   shim. Noted so nobody moves it.

## Why this is the same work as the open reflection bug

RENDER.md §10.8 measures flu2's reflection cast down to the specular term:
broadening the highlight moves both the colour cast and the lit area
monotonically toward the capture. **The fault is in the fixed-function
specular** — which is item 2 above. Fixing it in bespoke lapsus code fixes it
once; fixing it in minigl fixes it for every OpenGL restoration and puts the
verified behaviour where the next port will find it.

## Sequencing note

`shared/sunflower/js/{envelope,scene,timeline}.js` are currently modified in
the working tree by other in-flight work. `minigl.js` is clean. Coordinate
before touching the rest of that tree.

---

# Outcome

The mesh path is on the shim. `productions/lapsus/web/js/main.js` no longer
contains a fixed-function program: lighting, materials, specular, sphere-map
texgen, the two texture units and their env modes, fog and the blend/depth/cull
state all go through `minigl`. Net −92 lines, median r unchanged at **0.884**,
21/21 parts rendering and every part matching its previous score
(higherbiing 0.748 → 0.749).

## What the migration cost the shim, and what it bought

Everything below was a defect in `minigl` that no existing consumer could
expose, because wonder, energia and ptct all render *entirely* through it and
all create their own context. Lapsus is the first port to do neither.

| defect | how it showed | 
|---|---|
| `GL_ADD` added the alpha channel as well as the colour | pene, a translucent cube with a reflection on unit 1, rendered **opaque**: 0.993 → 0.833 |
| the constructor seized global GL state (blend on and additive, depth/cull off, clear colour) | kuubiotekniikka's backdrop washed to near-white: 0.998 → **0.117** |
| uniforms written from setters, program bound once at construction | latent; would have put lights and fog into whichever of Lapsus's five other programs was current |
| `loadMatrix` took a `Mat4` but `glLoadMatrixf` takes a float array | — |
| `GL_LINEAR` fog multiplied toward black, with no `GL_FOG_COLOR` | — |

The first two are the argument for the shim in one line: they are *ordinary*
fixed-function bugs, they were invisible for three productions, and they were
found in an afternoon by making a fourth one share the code. Both are now
pinned by pixel tests (`addAlpha`, and the state fix by kuubiotekniikka's own
score).

## A hypothesis that measurement killed

minigl gates the specular term on `N·L > 0`, which is what the GL spec
requires; Lapsus's shader did not gate it at all. pene has a single distant
light and zero ambient, so it looked like the obvious explanation for its
regression. Measured both ways: **0.8332 either way**, identical to four
decimal places — pene's surfaces carry no specular, and the gate is irrelevant
to it. It was the `GL_ADD` alpha the whole time.

Recorded because the reasoning was sound and the conclusion was still wrong.
The gate stays, spec-correct and unexercised by anything measured so far.

## Deliberately NOT moved

* **hair, particles, the feedback accumulator** — engine behaviour, not GL
  emulation. Their shaders are this demo's own.
* **flat vs smooth shading** — driven by the mesh (one vertex per polygon
  corner where a surface has no SMAN), so it belongs in the caller.
* **the third sampler** — deleted rather than moved. The engine has two texture
  units and no surface in the archive needs a third (RENDER.md §14).

## Still open

The 2D passes — backdrop, pictures and fades — still use their own programs.
The engine drew them with fixed-function GL (an ortho projection, a textured
quad, a blend mode), so they *could* go through minigl's immediate mode, and
they are the last part of Lapsus's GL that is a reimplementation rather than
an effect.
