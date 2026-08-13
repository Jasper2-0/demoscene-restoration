# Lapsus (dm2000) — the RENDER pipeline

Companion to `re/ENGINE.md` (sequencing) and `re/LWS_INVENTORY.md` (envelopes).
Everything here is read out of `re/decompiled.c` / `re/disasm.asm` / raw `.rdata`
of `work/src/Lapsus.exe` (sections identity-mapped, file offset = VA − 0x400000).
Two new targeted decompiles were produced for vtable-only functions:
`re/targeted2.c` (custom part `vf2`s) and `re/targeted3.c` (light `vf2`/`vf3`).

Claims are cited by VA. Anything marked ***inference*** is not byte-verified.

Rule followed throughout: every function that the x87 audit flags, and every
function whose Ghidra output looked structurally wrong (dropped float args,
`unaff_retaddr`, bogus `(int)` casts), was re-read in `disasm.asm`.

---

## 0. One-paragraph summary

`LW::Scene::render(camera)` (`FUN_004151e0`) draws the optional backdrop
`Picture`, publishes the scene's fog/ambient globals, sets `GL_PROJECTION` from
the camera (`FUN_00410100`, a `glFrustum` built from a LightWave ZoomFactor),
then builds an array of `{object*, cameraSpaceZ}` pairs, insertion-sorts it
**near→far**, and walks it twice: forward for opaque surface groups, backward
for blended ones. Per object it re-selects the 8 strongest lights and sets
`GL_MODELVIEW = Scale(1,1,−1) · inverse(cameraWorld) · objectWorld`
(`FUN_0040fff0`) — one `glMultMatrixf`, no `glRotatef`/`glTranslatef` anywhere.
Geometry is drawn from interleaved 48-byte vertex arrays with
`glDrawElements(GL_TRIANGLES, …, GL_UNSIGNED_INT, …)`, two `ARB_multitexture`
units, and optionally a second additive pass for a third texture. Lighting is
fixed-function GL lighting with per-surface materials converted from the LWO
`SURF` chunks. Finally the scene's hair meshes are drawn as `GL_LINES`.
Faders and pictures are full-screen quads in a 640×480 y-down ortho space.

---

## 1. Coordinate system & matrices

### 1.1 Item storage

Every `LW::Item` (objects, cameras, lights, nulls) carries:

| off | field |
|---|---|
| +0x28 … +0x54 | **local** matrix, 12 floats (see layout below); +0x28..+0x48 rotation, +0x4c/50/54 = position |
| +0x58 | **uniform** scale (single float) |
| +0x5c … +0x88 | **world** matrix (local→world), 12 floats |
| +0x8c … +0xb8 | **inverse world** matrix (world→local), 12 floats |
| +0xbc | "matrix valid" byte (see §3) |
| +0xc0 | parent `Item*` (0 = root) |
| +0xd0 … +0xdc | subclass payload — object: bounding-sphere centre + radius; camera: fovX, fovY, near, far; light: colour, range |

**Matrix layout** (verified at `FUN_00410390` @0x410390 and the depth-key math
at 0x4153dc–0x41545e): 12 floats = 4 rows of 3, row-vector convention.
Rows 0/1/2 are the images of local X/Y/Z; row 3 is the translation.
Transform is `v' = v.x·R0 + v.y·R1 + v.z·R2 + T`.

This layout maps **directly** onto a GL column-major 4×4 by inserting 0 at
indices 3, 7, 11 and 1.0 at index 15 — which is exactly what `FUN_0040fff0`
does at 0x410065–0x4100e2. So the engine's 3×4 is the GL matrix; no transpose.

### 1.2 Euler convention — `FUN_0043fdf0` @0x43fdf0

`FUN_00424b70` (per-item motion apply) evaluates the 9 motion channels and calls

```
FUN_0043fdf0(item+0x28, -pitch, -heading, -bank, 4)
```

Argument order verified in asm at 0x424bd6–0x424c21 (chan 3 = h → param_2,
chan 4 = p → param_1, chan 5 = b → param_3, each `FCHS`-negated). Note this is
`(-p, -h, -b)`, **not** `(-h, -p, -b)`.

Case 4 of `FUN_0043fdf0` with (A,B,C) = (−p, −h, −b) expands to the row-vector
product `R = R_bank · R_pitch · R_heading` — i.e. plain LightWave HPB. Verified
by expanding row 2 (image of local +Z):

```
R2 = ( sin h · cos p , −sin p , cos h · cos p )
```

which is LightWave's forward vector for heading h / pitch p in its Y-up
left-handed frame. Rows 0 and 1 match `R_bank·R_pitch·R_heading` term for term.

**For a port** (column-vector / GL convention), the object's 3×3 is

```
M3 = Ry(h) · Rx(p) · Rz(b)
Ry(h) = [[ cos h, 0, sin h],[0,1,0],[−sin h, 0, cos h]]
Rx(p) = [[1,0,0],[0, cos p, −sin p],[0, sin p, cos p]]
Rz(b) = [[ cos b, −sin b, 0],[ sin b, cos b, 0],[0,0,1]]
```

with GL `col0/col1/col2` = engine `R0/R1/R2` and `col3` = position.
Angles come straight from the envelopes in radians (LWS stores radians).

### 1.3 Scale — a genuine engine limitation

`FUN_00424b70` @0x424c41+ writes

```
item[+0x58] = (sx + sy + sz) * (1/3)      // _DAT_0045ad08 = 0.3333333432674408
```

**LightWave per-axis scale is collapsed to its arithmetic mean.** Only a single
uniform scale exists. `FUN_00440360` @0x440360 multiplies the 3×3 of the *world*
matrix (not the translation) by it, in `FUN_0040f9f0` @0x40fb8c, i.e. after the
parent concatenation — so a parent's scale does propagate to children (it is
already baked into the parent's world matrix).

**This is live, not academic.** Scanning all 228 items of the 23 shipped scenes
with `work/js/lws.mjs`: 19 items animate scale away from 1, and **two are
genuinely non-uniform** — a light in `hulluolli.lws` (harmless; GL normalises
light directions) and **`kuubio.lwo` in `kuubiotekniikka.lws`**, which is real
geometry in the opening part of phase 2. A port that implements correct per-axis
scale will render that object *differently from the original*. Average the three
channels.

### 1.4 Inverse — an off-by-scale bug that is preserved

`FUN_0043fb70` @0x43fb70 computes the "inverse" as
`R' = transpose(R)` (`FUN_00440330` @0x440330 is a bare 3×3 transpose) and
`T' = −(T · R')`. That is the *orthonormal* inverse. It is applied to the
already-scaled world matrix, so whenever `item[+0x58] ≠ 1` the stored inverse is
wrong by a factor of s².

**Verified latent.** A `.text`-wide grep for numeric reads of `+0x8c…+0xb8`
finds exactly three consumers — `FUN_0040fff0` (0x410038), `FUN_004105c0`
(0x41067a–0x4106d4) and the depth key in `FUN_004151e0` (0x415438–0x415456) —
and all three are passed the **camera**. No camera in the 23 shipped scenes has
a scale key ≠ 1 (checked with `work/js/lws.mjs`). So the bug never fires; a port
may use a correct inverse. Keep the check if scenes are ever edited.

### 1.5 The modelview — `FUN_0040fff0` @0x40fff0

Signature (from asm): `__fastcall(ECX = camera Item*, stack = float* modelMatrix12)`,
`RET 4`.

```
glMatrixMode(GL_MODELVIEW);                 // 0x1700, @0x40fff8
glLoadIdentity();                           // @0x410005
glScalef(1.0f, 1.0f, -1.0f);                // @0x41000b–0x41001a
ensureMatrix(camera);                       // FUN_0040f9f0
R = concat(modelMatrix, camera->inverseWorld /* +0x8c */);   // FUN_00410390
glMultMatrixf(expand4x4(R));                // @0x4100ea
```

`FUN_00410390(ECX = C, out, in = M)` computes `out = M ∘ C` in the row-vector
sense = "apply M, then C" = GL `C_gl · M_gl`. So:

```
GL_MODELVIEW = Scale(1,1,−1) · View · Model
```

**`glScalef(1,1,−1)` is the handedness flip**: LightWave camera space is
left-handed with +Z forward; GL eye space is right-handed with −Z forward.
There is no other flip anywhere.

Call sites:
- `FUN_00443a10` @0x443f2f — `FUN_0040fff0(camera, object+0x5c)`: the per-object
  modelview, set once per object right before its surface groups are drawn.
- `FUN_00443a10` @0x443ab5 and `FUN_004151e0` @0x41566a — `FUN_0040fff0(camera,
  identity)`: view-only, used while positioning lights and while drawing hair.

Consequence: **geometry is submitted in object-local space**; there is no CPU
vertex transform.

### 1.6 Winding

`Scale(1,1,−1)` has determinant −1, so it reverses triangle winding. The engine
compensates in the material apply: `FUN_0040c060` @0x40c5b0 issues
`glFrontFace(GL_CW)` (0x900) whenever culling is enabled. `glCullFace` is never
called → default `GL_BACK`.

The 2D overlay quads are wound so that this still works: screen (0,0)→(640,0)→
(640,480)→(0,480) in the y-down ortho maps to clockwise in NDC, i.e.
front-facing under `GL_CW`.

### 1.7 The 2D / overlay space — `FUN_0040b740` @0x40b740

```
glMatrixMode(GL_PROJECTION); glLoadIdentity();
glMatrixMode(GL_MODELVIEW);  glLoadIdentity();
glScalef(1/320.0f, -1/240.0f, 1.0f);   // 0x3b4ccccd, 0xbb888889
glTranslatef(-320.0f, -240.0f, 0.0f);  // 0xc3a00000, 0xc3700000
```

There is **no `glOrtho`** — the projection is identity and the modelview does
the mapping. Result: a virtual 640×480 framebuffer, **origin top-left, y down**,
and everything drawn at z = 0 lands at NDC z = 0 (depth 0.5). Overlay geometry
that must not be depth-tested therefore relies on its material's depth mode
(§4.4), and the fader materials set depth mode 0 (test off) — `FUN_00404840`
@0x404840 writes `material[+0x64] = 0`.

Note the virtual resolution is hardcoded 640×480 regardless of the actual mode;
`glViewport(0,0,w,h)` from the reshape callback (0x40b870) does the stretching.

---

## 2. Camera & projection

### 2.1 ZoomFactor → field of view — `LW::Scene::tick` @0x4150e7

Raw x87 (Ghidra's C was unusable here):

```
CALL FUN_0041ab80              ; ST0 = zoom envelope value at t
FDIVR [0x0045a310]             ; ST0 = 1.0 / zoom      (0x45a310 = 1.0f)
FLD1
FPATAN                         ; ST0 = atan((1/zoom) / 1)
FADD ST0,ST0                   ; ×2
FSTP [camera+0xd0]
```

> **fovX = 2 · atan(1 / ZoomFactor)**, radians, horizontal.

This is LightWave's standard relation. It is recomputed every tick from the
camera's zoom envelope, so zoom is animatable.

### 2.2 Projection — `FUN_00410100` @0x410100

```
fovY  = fovX * 0.75f                         ; _DAT_0045a624 = 0.75
top   = tanf(fovY * 0.5f) * near
right = tanf(fovX * 0.5f) * near             ; _DAT_0045a330 = 0.5
glMatrixMode(GL_PROJECTION); glLoadIdentity();
glFrustum(-right, right, -top, top, near, far);
```

**Aspect quirk a port must reproduce exactly**: the vertical FOV is
`0.75 × fovX` *as an angle*, not as a tangent ratio. The resulting frustum
aspect is `tan(fovX/2) / tan(0.375·fovX)`, which is 4:3 only in the small-angle
limit. At fovX = 60° it is 1.353, not 1.3333. Do **not** substitute a standard
`perspective(fovY, 4/3, …)`. Aspect is also completely independent of the actual
window/viewport size.

### 2.3 Near / far

Set in the `Camera` ctor `FUN_0040ff40` @0x40ff40:

| field | off | default |
|---|---|---|
| fovX | +0xd0 | `0x3fc90fdb` = π/2 (90°) — overwritten every tick from the zoom envelope |
| fovY | +0xd4 | 0, recomputed |
| **near** | +0xd8 | **1.0** |
| **far** | +0xdc | **100.0** |

Two parts override the near plane on camera 0 at create time:

- `Part_Diskojea::create` `FUN_004053e0` @0x4054da/0x4054f2 → near **0.01**, far 100.0
- `Part_Kaivoalieni::create` `FUN_00406330` @0x40642a/0x406442 → near **0.01**, far 100.0

Everything else runs with **near = 1.0 metre**. That is aggressive — anything
within a metre of the camera is clipped — and it is load-bearing for the look of
several parts. A grep of the whole `.text` found no other writes to camera
`+0xd8`/`+0xdc`.

`.lws` files carry no near/far; these are engine constants.

### 2.4 Frustum planes (CPU culling)

`FUN_00410100` also fills six `vec4` planes at camera `+0xe0` … `+0x13c`, in
LightWave camera space (+Z forward):

| off | plane |
|---|---|
| +0xe0 | ( 0, 0, 1, −near ) — near |
| +0xf0 | ( 0, 0, −1, far ) — far |
| +0x100 | ( cos(fovX/2), 0, sin(fovX/2), 0 ) — left |
| +0x110 | ( −cos(fovX/2), 0, sin(fovX/2), 0 ) — right |
| +0x120 | ( 0, −cos(fovY/2), sin(fovY/2), 0 ) — top |
| +0x130 | ( 0, cos(fovY/2), sin(fovY/2), 0 ) — bottom |

`FUN_004105c0` @0x4105c0 tests an object's bounding sphere against all six and
returns 0 (skip) on the first failure. The radius test is
`dot(plane, centre_worldToCamera) < −(radius × scaleFactor)` where the scale
factor comes from `FUN_004107f0` (x87-audit SUSPECT — read its asm before
relying on the exact number). A port may safely skip culling entirely: it is a
pure performance optimisation, no visual effect. *(inference — but the two
render passes iterate the same array either way, and a culled object simply
stores a null pair.)*

---

## 3. Parenting

`FUN_0040f9f0` @0x40f9f0 = `Item::updateMatrix`:

```
if (item->parent == 0)                       // +0xc0
    src = item->localMatrix                  // +0x28
else {
    if (!parent->matrixValid) updateMatrix(parent);      // RECURSIVE, @0x40fa13
    src = concat(item->localMatrix, parent->worldMatrix) // "local then parent"
}
item->worldMatrix (+0x5c) = src
scaleRotation(item->worldMatrix, item->uniformScale)     // FUN_00440360
item->inverseWorld (+0x8c) = invert(item->worldMatrix)   // FUN_0043fb70
```

So the hierarchy is composed **lazily and recursively at query time**, not
precomputed in a topological pass. Every consumer follows the same idiom:

```
if (item->matrixValid == 0) FUN_0040f9f0(item);
```

**`item+0xbc` is never set back to 1.** Verified: the only write of 1 to any
`+0xbc` in the whole `.text` is to stack slots, and `FUN_0040f9f0`'s asm
(0x40f9f0–0x40fbb0) contains no store to `+0xbc` at all. `FUN_00424b70` clears
it to 0 (0x424c26, 0x424c5b). Consequently the "cache" never caches: the world
matrix and its inverse are rebuilt from the root every single time anyone asks,
several times per object per frame. Purely a performance bug — there is no
stale-matrix hazard, and a port is free to do one topological pass per frame.

Concatenation order confirmed by expanding the twelve arguments to
`FUN_0040feb0` at 0x40fa3c–0x40fb69: argument *k* is
`row(k mod 4) · column(k div 4)` of `local ∘ parentWorld`, with the translation
row picking up `parentWorld[+0x80/0x84/0x88]`.

---

## 4. The draw path

### 4.1 `LW::Scene::render(camera)` — `FUN_004151e0` @0x4151e0

Step by step (VAs in the asm listing):

1. **Backdrop picture**: `if (scene+0xfc) FUN_0040ab50(scene+0xfc)` — a 2D
   `Picture` drawn in the 640×480 ortho before anything else.
2. `FUN_00410100(camera)` — projection (§2.2).
3. Publish scene render globals:
   - `DAT_004a8f74 = scene[+0xdc]` — fog type (0 = off, 1 = linear)
   - fog colour → `_DAT_004a8f68/6c/70`, taken from `scene[+0xe0..0xe8]`
     normally, or from `scene[+0xc0..0xc8]` (the backdrop colour) when
     `scene[+0xf4] != 0`. *(inference: `+0xf4` is LWS `BackdropFog`.)*
   - `DAT_004a8f78 = scene[+0xec]` (fog min distance),
     `DAT_00464330 = scene[+0xf0]` (fog max distance)
4. `FUN_00444670(ambient)` @0x444670 →
   `glLightModelfv(GL_LIGHT_MODEL_AMBIENT, scene[+0xcc..0xd4] * scene[+0xd8] / 255)`
   — ambient colour (0..255) × ambient intensity.
5. **Build the sort array**: `operator new(nObjects * 8)`, one
   `{ Item* renderable; float depth; }` pair per object of `scene[+0x08..0x0c]`.
   - `renderable = FUN_0041f1a0(obj)` @0x41f1a0 — resolves/creates `obj+0x84`.
   - `FUN_004105c0(...)` frustum test; if it fails the pair is `{0, 0}`.
   - otherwise `depth = ((sphereCentre · objWorld) · camInverseWorld).z`
     — computed inline at 0x4153a0–0x41545e, stored with `FSTP float [EAX+4]`
     (Ghidra's `(int)` cast is wrong; the key is a **float**).
6. **Sort** `FUN_0041a410` @0x41a410 — insertion/intro sort; the comparator is
   `FLD key(i); FCOMP key(i-1); TEST AH,1` = "less-than" → **ascending**,
   i.e. **nearest first**.
7. **Opaque pass** — walk the array **forward**. For each object, for each of its
   surface groups (`FUN_004439e0` = count from `+0xe4/+0xe8`,
   `FUN_00443a00` = indexed get), draw those whose
   `group->material[+0x58] == 0` (blend mode "none").
8. **Blended pass** — walk the array **backward** (far→near), drawing groups
   whose `material[+0x58] != 0`.
   In both passes, the first group actually drawn for an object triggers
   `FUN_00443a10(object, camera, scene+0x44)` — light selection + modelview
   (§4.2). An object with both opaque and blended surfaces therefore runs it
   twice.
9. **Particle / sprite systems**: `scene[+0x58..0x5c]`, each `obj->vf1(camera)`.
10. **Hair**: unless `DAT_004a900c` is set, `FUN_0040fff0(camera, identity)`
    then `FUN_00424150(hair)` for every entry of `scene[+0x68..0x6c]` (§4.6).

### 4.2 Per-object light selection & modelview — `FUN_00443a10` @0x443a10

`__fastcall(ECX = object, arg1 = camera, arg2 = &scene.lights)`.

1. `FUN_0040fff0(camera, identity)` @0x443ab5 — modelview = view only, so light
   positions submitted next are interpreted as world-space.
2. Walk the scene light list. `__RTDynamicCast` (`FUN_00456d0e`) separates
   `LW::DirectionalLight` (TD 0x467cf0) from `LW::PointLight` (TD 0x467cb8),
   both deriving from `LW::Light` (TD 0x467cd8).
   - Directional: importance = `vf3()` = `|colour|` (`forced_0x4447f0`).
   - Point: skipped entirely unless
     `distance(light, object) < light.range(+0xe8) + object.radius(+0xdc)`;
     importance = `range·|colour| − distance` (`forced_0x444970`).
3. The two lists are merged into a 16-slot ranked array and the best entries
   applied via `light->vf2(i)` for `i = 0..7`; **directional lights are applied
   first**, so with more than 8 candidates the directionals win.
4. `glDisable(GL_LIGHT0 + i)` for every remaining unit up to `GL_LIGHT7`
   (0x443efd–0x443f0a).
5. `FUN_0040fff0(camera, object+0x5c)` @0x443f30 — the object's modelview.

**`glLightfv(GL_POSITION)` is issued while the modelview is view-only**, which is
the correct fixed-function idiom; a port must place lights in view space by hand.

Light application (`re/targeted3.c`):

- `LW::Light::apply` `FUN_004445b0` @0x4445b0 (shared):
  `glEnable(GL_LIGHT0+i)`, `glLightfv(GL_DIFFUSE, colour[+0xd0..0xd8]/255, 1)`,
  `glLightfv(GL_SPECULAR, colour2[+0xdc..0xe4]/255, 1)`. **`GL_AMBIENT` is never
  set** for individual lights → GL default (0,0,0,1).
- `DirectionalLight::apply` @0x444760: constant/linear/quadratic attenuation set,
  then `glLightfv(GL_POSITION, (−m[6], −m[7], −m[8], 0.0))` where `m[6..8]` is
  world-matrix row 2 = the light item's local +Z in world space. A LightWave
  light shines down its +Z, so the GL direction-to-light is its negation.
- `PointLight::apply` @0x4448b0: `glLightfv(GL_POSITION, (m[9], m[10], m[11], 1))`
  (world position), `GL_LINEAR_ATTENUATION = 0.1 / (range · 0.5) = 0.2/range`
  (`_DAT_0045b790 = 0.1`), `GL_QUADRATIC_ATTENUATION = 0.04` (`0x3d23d70a`).
- `glEnable(GL_NORMALIZE)` is set once globally at Display init
  (`FUN_0040b050` @0x40b61a, `PUSH 0xba1`).
- `glLightModeli(GL_LIGHT_MODEL_COLOR_CONTROL, GL_SEPARATE_SPECULAR_COLOR)`
  (0x81f8 / 0x81fa) at `FUN_0040b050` @0x40b5e4 — specular is added *after*
  texturing. A WebGL port that folds specular into the pre-texture colour will
  look visibly duller.

### 4.3 Geometry submission — `FUN_00443170` @0x443170

`FUN_0040c050` @0x40c050 returns the pass count:
`1` if `material[+0x3c] <= 2`, `2` if `material[+0x3c] > 2` (three textures).

**Pass 0** — immediate arrays (or a display list if `group[+0x34] != 0`):

```
glEnableClientState(GL_VERTEX_ARRAY);
glVertexPointer  (3, GL_FLOAT, 0x30, base + 0x00);
glEnableClientState(GL_NORMAL_ARRAY);
glNormalPointer  (   GL_FLOAT, 0x30, base + 0x10);
glClientActiveTextureARB(GL_TEXTURE0_ARB);
glEnableClientState(GL_TEXTURE_COORD_ARRAY);
glTexCoordPointer(2, GL_FLOAT, 0x30, base + 0x20);
glClientActiveTextureARB(GL_TEXTURE1_ARB);
glEnableClientState(GL_TEXTURE_COORD_ARRAY);
glTexCoordPointer(2, GL_FLOAT, 0x30, base + 0x28);
glDrawElements(GL_TRIANGLES, (end-begin)/4, GL_UNSIGNED_INT, indices);
```

> **Interleaved vertex, stride 0x30 = 48 bytes**: position at +0x00 (vec3),
> normal at +0x10 (vec3), UV0 at +0x20 (vec2), UV1 at +0x28 (vec2).
> Bytes +0x0c and +0x18..0x1f are padding. Indices are **32-bit**.

Surface-group struct: `+0x04` vertex base, `+0x14/+0x18` index vector
(begin/end), `+0x24` a *second* UV array (vec2, stride 8) used only by pass 1,
`+0x30` `Material*`, `+0x34` display-list base (0 = none).

**Pass 1** (only when the surface has 3 textures) — `FUN_0040c060(material, 1)`
then the same vertex/normal arrays but

```
glClientActiveTextureARB(GL_TEXTURE0_ARB);
glTexCoordPointer(2, GL_FLOAT, 8, group[+0x24]);   // the alternate UV set
glDrawElements(GL_TRIANGLES, …);
```

i.e. a second, additively blended pass with its own UVs. Unit 1 is switched off
by the pass-1 branch of the material apply.

**Display lists** exist (`FUN_00442eb0` @0x442eb0 builds two lists with
`glGenLists(2)` and immediate-mode `glMultiTexCoord2fvARB`/`glNormal3fv`/
`glVertex3fv`; `FUN_00443150` @0x443150 deletes them). The only caller of
`FUN_00442eb0` is inside the scene loader `FUN_004156b0` @0x415c5e, so lists are
built at load time when enabled. Functionally identical to the array path — a
port only needs the array path.

Edge case preserved at 0x443400-ish: in pass 1, if the index vector is empty the
code still calls `glDrawElements(GL_TRIANGLES, 0, GL_UNSIGNED_INT, NULL)`.

### 4.4 Material → GL state — `FUN_0040c060` @0x40c060

`__fastcall(ECX = Material*, stack = pass)`, `RET 4`. All colour components are
stored **0..255** and multiplied by `_DAT_0045a5d4 = 1/255` on the way to GL.

Material layout (0x6c bytes; defaults from `FUN_0040bef0` @0x40bef0):

| off | meaning | default |
|---|---|---|
| +0x04..0x0c | ambient RGB | 255,255,255 |
| +0x10..0x18 | emission RGB | 0,0,0 |
| +0x1c..0x24 | diffuse RGB | 255,255,255 |
| +0x28..0x30 | specular RGB | 255,255,255 |
| +0x34 | shininess | 4.0 |
| +0x38 | **transparency** (GL alpha = 1 − this) | 0 |
| +0x3c | texture count (0..3) | 0 |
| +0x40/0x44/0x48 | `Texture*` for unit0 / unit1 / pass-1 | 0 |
| +0x4c/0x50/0x54 | texgen mode for unit0 / unit1 / pass-1 | 0 |
| +0x58 | **blend mode** | 0 |
| +0x5c / +0x60 | tex-env mode for unit1 / pass-1 | 0 |
| +0x64 | **depth mode** | 3 |
| +0x68 | lit flag (0 ⇒ unlit) | 0 |
| +0x69 | specular enable | 0 |
| +0x6a | fog enable | 1 |
| +0x6b | **disable culling** (double-sided) | 0 |

Pass 0 (`stack arg == 0`):

- **Lit** (`+0x68 != 0`, @0x40c079): `glEnable(GL_LIGHTING)`;
  `glMaterialfv(GL_FRONT_AND_BACK, GL_AMBIENT, rgb/255, 1)`;
  `… GL_EMISSION …`;
  `… GL_DIFFUSE, rgb/255, 1 − transparency`;
  if `+0x69` → `GL_SPECULAR = rgb/255, 1` and `GL_SHININESS = +0x34`,
  else `GL_SPECULAR = (0,0,0,1)` and `GL_SHININESS = 1.0` (@0x40c1a8).
- **Unlit** (@0x40c1e0): `glColor4f(diffuse/255, 1 − transparency)`;
  `glDisable(GL_LIGHTING)`.

- **Unit 0** (@0x40c231): if texture count ≥ 1 →
  `glEnable(GL_TEXTURE_2D)`, `glBindTexture`,
  `glTexEnvi(GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_MODULATE)`;
  texgen `+0x4c == 1` → `glEnable(GL_TEXTURE_GEN_S/T)` +
  `glTexGeni(GL_S/GL_T, GL_TEXTURE_GEN_MODE, GL_SPHERE_MAP)`, else both disabled.
  Texture count 0 → `glDisable(GL_TEXTURE_2D)`.
- **Unit 1** (@0x40c2c3): same, except the env mode is
  `+0x5c == 0` → `GL_MODULATE`; `+0x5c == 1` → `GL_ADD` (0x104) **if the
  `GL_ARB_texture_env_add` extension was found** (`Display[+0x10]`), otherwise it
  silently falls back to `GL_MODULATE` (@0x40c2f2). The engine prints
  *"WARNING: GL_ARB_texture_env_add not found (may cause impaired visuals)"* at
  startup. A port must use ADD.
- **Blend** `+0x58` (jump table @0x40c5c4):

  | mode | GL |
  |---|---|
  | 0 | `glDisable(GL_BLEND)` |
  | 1 | `glBlendFunc(GL_ONE, GL_ONE)` — **additive** |
  | 2 | `glBlendFunc(GL_DST_COLOR, GL_ZERO)` — **multiplicative** |
  | 3 | `glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)` — **alpha** |

  > This **corrects `ENGINE.md` §6**, which inferred "mode 3 = multiplicative,
  > mode 1 = additive". Mode 3 is ordinary alpha blending; mode 2 is the
  > multiplicative one and is never used by a fader.

Pass 1 (`stack arg == 1`, @0x40c3de): unit 1 texture off, unit 0 bound to
`+0x48`, `glEnable(GL_BLEND)` with `+0x60 == 0` → `(GL_DST_COLOR, GL_ZERO)` or
`+0x60 == 1` → `(GL_ONE, GL_ONE)`; texgen from `+0x54`. Note pass 1 does **not**
re-issue material colours or depth/fog/cull — it inherits pass 0's.

Shared tail (both passes):

- **Depth** `+0x64` (jump table @0x40c5d4):

  | mode | GL |
  |---|---|
  | 0 | `glDisable(GL_DEPTH_TEST)` |
  | 1 | enable, `glDepthMask(GL_TRUE)`, `glDepthFunc(GL_ALWAYS)` (0x207) |
  | 2 | enable, `glDepthMask(GL_FALSE)`, `glDepthFunc(GL_LEQUAL)` (0x203) |
  | 3 | enable, `glDepthMask(GL_TRUE)`, `glDepthFunc(GL_LEQUAL)` |

  Mode 1 (write depth, always pass) is unusual but is what the bytes say
  (0x40c4ab–0x40c4bf). Default is 3.
- **Fog** `+0x6a` and the global fog type: if both non-zero →
  `glEnable(GL_FOG)`, `glFogfv(GL_FOG_COLOR, colour/255, 1.0)`, and for fog type
  1 `glFogi(GL_FOG_MODE, GL_LINEAR)`, `glFogf(GL_FOG_START, min)`,
  `glFogf(GL_FOG_END, max)`. Otherwise `glDisable(GL_FOG)`.
  > **Fog is `GL_LINEAR`, not `GL_EXP`** — the METHOD.md trap is resolved.
  > `GL_FOG_DENSITY` is never set. LWS `FogMinAmount`/`FogMaxAmount` are ignored:
  > the fog factor always runs the full 0→1 over [min, max].
- **Cull** `+0x6b`: 0 → `glEnable(GL_CULL_FACE); glFrontFace(GL_CW)`;
  non-zero → `glDisable(GL_CULL_FACE)`.

### 4.5 LWO `SURF` → Material — `FUN_0042b8a0` @0x42b8a0

The surface record holds 8 texture-name slots at `+0x98, +0xec, +0x140, +0x194,
+0x1e8, +0x23c, +0x290` (stride 0x54; the resolved `Texture*` sits at slot+0x1c)
plus one at `+0x2b0`. A bitmask is built at `+0x2c8` from which slots have a
non-empty filename (bit 1, 2, 4, 8, 0x10, 0x20, 0x40, 0x80 respectively).
Bit 0x80 is cleared unless `surface[+0x34]` (reflectivity) > 0.95
(`_DAT_0045ad34`). Mapping to LWOB subchunks is ***inference*** from the order:
CTEX, DTEX, STEX, RTEX, TTEX, LTEX, BTEX, + reflection image.

Only these masks are supported — anything else throws
`LWException_UnsupportedTextureCombination` ("Unsupported texture combination in
material "):

| mask | result |
|---|---|
| 0 | untextured |
| 1 | 1 texture on unit 0 |
| 4 | 1 texture on unit 0 |
| 0x80 | 1 texture on unit 0 with **`GL_SPHERE_MAP` texgen** (`FUN_0040c040(mat,0,1)` @0x42cbb2) |
| 3 | 2 textures; unit 1 env = **`GL_ADD`** (`mat[+0x5c] = 1`) |
| 5 | 2 textures; unit 1 env = `GL_MODULATE` (`mat[+0x5c] = 0`) |
| 0x81 | 2 textures; unit 1 sphere-mapped, env = `GL_ADD` |
| 7 | **3 textures / 2 passes**; units 0+1 modulate, pass-1 texture additive (`mat[+0x60] = 1`) |

Other surface fields (tail of the function, 0x42ca0f onwards):

- `material[+0x68]` (lit) `= surface[+0x28] (luminosity) <= 0.95`.
  **Luminosity > 0.95 ⇒ the surface is drawn unlit with `glColor4f`** — the
  engine's "fullbright" path.
- specular: enabled only if lit, `surface[+0x2c]` (specularity) > 0,
  `surface[+0x48] != 0`, and the surface colour is non-black; then
  `specular RGB = specularity × 255` (grey) and `shininess = surface[+0x30]`.
- `surface[+0x3c] > 0.95` ⇒ blend mode 1 (additive) + depth mode 2.
- `surface[+0x38]` (transparency) > 0 **or** a TTEX present ⇒ blend mode 3 +
  depth mode 2. Combining this with additive throws
  *"Unsupported transparency combination … Additive and normal transparency"*.
- `surface[+0x2d0] > 0.95` ⇒ blend mode 2 (multiplicative).
- diffuse: **no CTEX** ⇒ `surfaceColour × diffuseLevel`; **CTEX present** ⇒
  a neutral grey `diffuseLevel × 255` in all three channels (the texture
  supplies the colour).
- `material[+0x38] = surface[+0x38]` unless a TTEX is present, in which case 0.
- `material[+0x6b] = surface[+0x5c]` — LWO double-sided flag.
- The loader prints *"WARNING! Source materials not supported!"*
  (`FUN_00426a90` @0x426b46) for LWO surfaces using shaders/procedurals.

### 4.6 Hair — `FUN_00424150` @0x424150

Drawn at the very end of `Scene::render` for every entry of `scene[+0x68..0x6c]`,
with the modelview set to view-only:

```
lights[0]->vf2(0);                                  // exactly ONE light, GL_LIGHT0
FUN_0040c060(hair->material /* +0xd0 */, 0);
glLineWidth(3.0f);                                   // 0x40400000
glVertexPointer(3, GL_FLOAT, 0x20, base);            // stride 32
glNormalPointer(   GL_FLOAT, 0x20, base + 0x10);
glEnableClientState(GL_VERTEX_ARRAY | GL_NORMAL_ARRAY);
glDrawElements(GL_LINES, (end-begin)/2, GL_UNSIGNED_SHORT, indices);
```

> Hair vertices are a **different** 32-byte format (pos +0, normal +0x10) and use
> **16-bit** indices, `GL_LINES`, line width 3.

`DAT_004a900c` gates this block. There is exactly one read of it
(`FUN_004151e0` @0x4155e6) and two writes, both in `Part_Pehko::vf2`
(`forced_0x407800`, sets 1 before its own render and 0 after) — Pehko draws the
hair instances itself, everyone else lets `Scene::render` do it. So the block is
**live** in the shipped build, not dead debug code.

---

## 5. Textures

### 5.1 Loading — `LW::TextureManager::get` `FUN_00414420` @0x414420

`get(colorName, alphaName, filterMode)`. Prefixes both with
`"data/lwo/textures/"` (0x4659b0) and caches on the triple
(colour path, alpha path, filter mode) in a vector; returns the existing
`Texture` if all three match. Otherwise `new Texture(0x34 bytes)` via
`FUN_0040e8c0` @0x40e8c0.

The manager is destroyed and recreated wholesale at each `loadPhase`
(ENGINE.md §7), taking all GL texture names with it.

### 5.2 Decoding

- **JPEG**: statically linked **IJG libjpeg** (its full error-message table is in
  `.rdata`: "Corrupt JPEG data: bad Huffman code", "Unsupported JPEG process:
  SOF type 0x%02x", …). Browser-native `createImageBitmap` is equivalent.
- **TGA**: hand-rolled ("Colormapped TGA image has no palette.").
- Row order is **top-down**: `Picture::draw` maps `t = 0` to the top edge of the
  quad in the y-down ortho space (§5.5), so images appear upright without a flip.
  A WebGL port must therefore **not** set `UNPACK_FLIP_Y_WEBGL` for these.

### 5.3 Alpha channel — the `_a` companion image

`FUN_0040ec70` @0x40ec70: when an alpha path is supplied, a second image is
decoded and its **(R + G + B)/3** is written into the RGBA alpha byte of the
colour image (0x40ed30-ish). Dimensions must match or it throws
*"Color texture and alpha texture have different dimensions."*.
This is why the archive ships pairs like `design1.tga` / `design1_a.tga` and
`eDezign.jpg` / `eDezign_a.jpg`.

### 5.4 Upload — `FUN_0040f0b0` @0x40f0b0

```
if (!created) { glGenTextures(1, &name); created = 1; }
glBindTexture(GL_TEXTURE_2D, name);
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_REPEAT);   // 0x2901
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_REPEAT);
switch (filterMode /* tex+0x30 */) {
  case 0: MIN = GL_NEAREST_MIPMAP_NEAREST (0x2700); MAG = GL_NEAREST (0x2600); break;
  case 1: MIN = GL_LINEAR_MIPMAP_NEAREST  (0x2701); MAG = GL_LINEAR  (0x2601); break;
  default: filters left untouched;
}
for (level = 0; ; ++level) {
    glTexImage2D(GL_TEXTURE_2D, level, GL_RGBA8, w, h, 0, GL_RGBA, GL_UNSIGNED_BYTE, pixels);
    if (w == 1 && h == 1) break;
    FUN_0043d360(image);                 // halve in place
}
```

- **Full mipmap chain, generated on the CPU** by repeated halving. No
  `gluBuild2DMipmaps`, no `GL_GENERATE_MIPMAP`.
- Minification is `*_MIPMAP_NEAREST` — **no trilinear filtering**. Mip level
  transitions are visible; a port using `LINEAR_MIPMAP_LINEAR` will look
  different (smoother).
- Internal format is always `GL_RGBA8`, even for opaque textures.
- Filter mode default is 1 (bilinear) — set in `FUN_0040ef70` @0x40ef70.
- **Power-of-two only**: the caller checks `popcount(w) == 1 && popcount(h) == 1`
  and throws *"Texture %s has invalid size %dx%d."* otherwise.
- `glBindTexture` at draw time is `FUN_0040f090` @0x40f090 (binds `tex+0x04`,
  no-op if 0).
- Texture size is cached at `tex+0x28` (w) / `tex+0x2c` (h) and used by
  `Picture::draw`.

### 5.5 `Picture::draw` — `FUN_0040ab50` @0x40ab50

A `Picture` is a list of 12-byte tiles `{ Texture* tex; int x; int y; }`. For each:

```
material.texture0 = tile.tex;  FUN_0040c060(material, 0);
x0 = picture[+0x14] + tile.x;   y0 = picture[+0x18] + tile.y;
w  = tex[+0x28];                h  = tex[+0x2c];
glBegin(GL_QUADS);
  glTexCoord2i(0,0); glVertex2i(x0,     y0);
  glTexCoord2i(1,0); glVertex2i(x0 + w, y0);
  glTexCoord2i(1,1); glVertex2i(x0 + w, y0 + h);
  glTexCoord2i(0,1); glVertex2i(x0,     y0 + h);
glEnd();
```

(asm 0x40ab8f–0x40ac0b; Ghidra's C for this function is garbage.) Tiling is how
a 640×480 JPEG is displayed given the power-of-two constraint — it is cut into
POT tiles at load time.

---

## 6. Faders / transitions

Six shared fader objects live on `Demo` (ENGINE.md §6). Each is
`{ vtable, Material* (0x6c bytes), float r, g, b }`; the ctor `FUN_00404840`
@0x404840 allocates the material via `FUN_0040bef0` and then sets
`material[+0x64] = 0` — **depth test disabled** for the fade quad. Everything
else is the material default: unlit (`+0x68 = 0`, so `glColor4f` + no lighting),
fog enabled (`+0x6a = 1` — but fog is disabled anyway when the scene fog type is
0), culling on with `GL_FRONT_FACE = GL_CW`, no textures.

`FadeIn::draw(v)` `FUN_00404970` @0x404970 and `FadeOut::draw(v)`
`FUN_00404a60` @0x404a60:

```
FUN_0040b740();                              // 640x480 y-down ortho
if (FadeIn  && v >= 1.0) return;             // already finished
if (FadeOut && v <= 0.0) return;             // not started
if (FadeIn  && mode == 1) v = 1.0 - v;
if (FadeOut && mode == 3) v = 1.0 - v;
v = clamp(v, 0, 1);
if (mode == 3) material.transparency (+0x38) = v;
else           material.diffuse (+0x1c..0x24) = v * (fader.r, fader.g, fader.b);
FUN_0040c060(material, 0);
glBegin(GL_QUADS);
  glVertex2i(0,   0);
  glVertex2i(640, 0);
  glVertex2i(640, 480);
  glVertex2i(0,   480);
glEnd();
```

Combined with §4.4 this gives the exact blend:

- **mode 3, colour black** (the "black N" fades): `glBlendFunc(GL_SRC_ALPHA,
  GL_ONE_MINUS_SRC_ALPHA)`, `glColor4f(0, 0, 0, 1 − transparency)`.
  - FadeIn writes `transparency = v` ⇒ GL alpha `1 − v`: opaque black at v=0,
    invisible at v=1. Fade **in from black**. ✔
  - FadeOut writes `transparency = 1 − v` ⇒ GL alpha `v`: fade **to black**. ✔
- **mode 1, colour white (255,255,255)** (the "white 0.5" flashes):
  `glBlendFunc(GL_ONE, GL_ONE)`, `glColor4f(v'·255/255 …, alpha 1)`.
  - FadeIn scales the colour by `1 − v` ⇒ a full-white additive flash decaying to
    nothing. ✔

`RandomFadeIn`/`RandomFadeOut` (`0x401e00` / `0x401ea0`) wrap the above:
`if (rand()/32767 <= v) draw(1.0) else draw(v)` — per-frame flicker.

Colour components are stored 0..255 and divided by 255 in `FUN_0040c060`.

---

## 7. Frame setup, clears, and surprises a port must reproduce

### 7.1 Window / context

`Display` ctor `FUN_0040b050` @0x40b050:

- `glutInitDisplayMode(GLUT_DOUBLE | GLUT_DEPTH)` (0x12) — **no alpha channel,
  no stencil**.
- 640×480, `glutGameModeString("%dx%d:%d@%d", 640, 480, 32, 60)` +
  `glutEnterGameMode`.
- Requires `GL_ARB_multitexture` and `glGetIntegerv(GL_MAX_TEXTURE_UNITS_ARB) >= 2`
  ("Dual texturing not supported!").
- `glLightModeli(GL_LIGHT_MODEL_COLOR_CONTROL, GL_SEPARATE_SPECULAR_COLOR)`.
- Warns (but continues) if `GL_ARB_texture_env_add` is missing.
- `glEnable(GL_NORMALIZE)`.

### 7.2 Clear

`FUN_0040b790` @0x40b790, called by the generic part `vf2` `FUN_00406e50` as
`FUN_0040b790(scene + 0xc0)` — the **scene's backdrop colour**:

```
glDepthMask(GL_TRUE);
glClearColor(bg.r/255, bg.g/255, bg.b/255, 0.0f);
glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
```

`FUN_0040b7e0` @0x40b7e0 is the depth-only variant:
`glDepthMask(GL_TRUE); glClear(GL_DEPTH_BUFFER_BIT);`

### 7.3 Things that will bite a port

1. **`Part_Silli` is a frame-feedback / trail effect.** `forced` @0x407e30:
   it calls `FUN_0040b7e0` (**depth clear only — the colour buffer is never
   cleared**), then draws its own private black `FadeIn` (mode 3, colour 0,0,0,
   created at `FUN_00407ca0` @0x40740c-ish) at v = 0.7, i.e. a full-screen black
   quad at 30 % alpha, and *then* renders the scene on top. The previous frame's
   colour survives, darkened by 30 % per frame → motion trails. With GLUT double
   buffering the surviving content is the frame *before last*, so the trail is
   two-frame-strided on the original hardware. A WebGL2 port needs an explicit
   ping-pong FBO (or `preserveDrawingBuffer` plus care) to match.
2. **`Part_Pehko` does the same** (`forced_0x407800`): no clear at all, its own
   fader drawn at 0.95, plus `DAT_004a900c = 1` to suppress `Scene::render`'s
   hair block while it drives the hair instances itself.
3. **Near plane = 1.0 m for 18 of the 20 scheduled parts** (§2.3). Diskojea and
   Kaivoalieni get 0.01. Geometry closer than a metre is *supposed* to clip.
4. **fovY = 0.75 × fovX as an angle** (§2.2) — not a tangent-space 4:3 aspect,
   and never derived from the viewport.
5. **Non-uniform LightWave scale is averaged into one number** (§1.3) — and
   `kuubio.lwo` in `kuubiotekniikka.lws` actually uses non-uniform scale, so
   getting this "right" would be wrong.
6. **`glScalef(1,1,−1)` + `glFrontFace(GL_CW)`** — both, or neither.
7. **Minification is `*_MIPMAP_NEAREST`** — no trilinear. Visible mip popping is
   original.
8. **`GL_SEPARATE_SPECULAR_COLOR`** — specular is applied after texturing.
9. **Depth sorting is per-object, by bounding-sphere centre only.** No
   per-triangle sorting, no depth pre-pass. Objects with transparent surfaces
   will self-sort wrongly exactly as they did in 2000.
10. **The `matrixValid` flag is never set** (§3) — a pure perf bug, but it means
    the engine is guaranteed to see fresh matrices; there is no ordering
    subtlety to replicate.
11. **The world-matrix inverse ignores scale** (§1.4).
12. **`GL_ARB_texture_env_add` fallback**: if the extension were missing, `GL_ADD`
    silently became `GL_MODULATE`. Reference captures were made on hardware that
    had it; use `GL_ADD`.
13. `Part_HigherBiing` (`FUN_004060b0` @0x4060b0) **cuts between three cameras**
    *and* overrides the scene fog range per shot:
    t < 4.5 → camera 0, fog (7.5, 13.0); 4.5 ≤ t < 10.6 → camera 1, fog
    (15.0, 30.0); t ≥ 10.6 → camera 2, fog (9.5, 18.0).
    (`_DAT_0045a414 = 4.5`, `_DAT_0045a410 = 10.6`.)
14. `Part_Kuubiotekniikka` (`FUN_00406b20` @0x406b20) draws the scene, then for
    the first second overlays a `Picture` whose material transparency is set to
    the local time — i.e. a full-opacity image that dissolves out over 1 s.
15. Several parts perturb camera 0's **position** after `tick` and before
    `render` — `Part_Syrjakyla` @0x4081f0, `Part_Turska` @0x408460 (a decaying
    spring/impulse shake, `x += impulse·…`, reset when a period constant
    elapses), `Part_Paleksi` @0x4072b0 (a sine wobble on X). They also set
    `camera[+0xbc] = 0` afterwards so the shaken matrix is used.

---

## 8. Porting checklist (WebGL2)

**Matrices**

- [ ] Item local matrix: `M = T(px,py,pz) · Ry(h) · Rx(p) · Rz(b)`, columns
      stored as the engine's rows (§1.2). Angles from envelopes, in radians,
      evaluated at part-local time with clamped TCB (see `LWS_INVENTORY.md`).
- [ ] Uniform scale `s = (sx+sy+sz)/3`; multiply the **world** matrix's 3×3 by
      `s` after concatenating with the parent.
- [ ] `world = local · parentWorld` (apply local first), recursively to the root.
- [ ] `modelview = Scale(1,1,−1) · inverse(cameraWorld) · objectWorld`.
- [ ] `frontFace(GL_CW)`, `cullFace(GL_BACK)`, culling on unless the surface is
      double-sided.
- [ ] `GL_NORMALIZE` equivalent: renormalize normals in the vertex shader.

**Projection**

- [ ] `fovX = 2·atan(1/zoom)` from the camera's zoom envelope, per frame.
- [ ] `right = tan(fovX/2)·near`, `top = tan(0.375·fovX)·near`,
      `frustum(−right, right, −top, top, near, far)`.
- [ ] `near = 1.0`, `far = 100.0`; `near = 0.01` for Diskojea and Kaivoalieni.
- [ ] Viewport = full canvas; do not derive aspect from it.

**Frame**

- [ ] Clear colour = scene backdrop colour / 255, alpha 0; clear colour+depth,
      depth mask on. Except: Silli (depth only + 30 % black quad) and Pehko
      (no clear + 5 % black quad).
- [ ] Draw order: backdrop picture → 3D → particles → hair → fader overlay.

**3D draw**

- [ ] Sort objects by camera-space Z of the bounding-sphere centre, ascending.
      Opaque groups front→back, blended groups back→front.
- [ ] Vertex format: stride 48; pos@0, normal@16, uv0@32, uv1@40. 32-bit indices,
      `TRIANGLES`.
- [ ] Second UV set (stride 8) for the 3-texture second pass, blended
      `(ONE, ONE)` (or `(DST_COLOR, ZERO)` when `material[+0x60] == 0`).
- [ ] Fixed-function-equivalent lighting: ambient/diffuse/emission/specular
      material, `GL_SEPARATE_SPECULAR_COLOR` (add specular after the texture),
      per-light diffuse+specular only (no per-light ambient), 8 lights max,
      chosen per object by the ranking in §4.2.
- [ ] Light-model ambient = scene ambient colour × intensity / 255.
- [ ] Point-light attenuation: `constant`, `linear = 0.2/range`,
      `quadratic = 0.04`. Directional: direction = −(object's world +Z).
- [ ] Blend modes: 0 off, 1 `(ONE,ONE)`, 2 `(DST_COLOR,ZERO)`,
      3 `(SRC_ALPHA,ONE_MINUS_SRC_ALPHA)`.
- [ ] Depth modes: 0 off; 1 write+ALWAYS; 2 no-write+LEQUAL; 3 write+LEQUAL.
- [ ] Fog: `GL_LINEAR` between `FogMinDist` and `FogMaxDist`, colour from
      `FogColor` or `BackdropColor` per the `BackdropFog` flag; ignore
      Fog{Min,Max}Amount.
- [ ] Texture unit 0 env = MODULATE; unit 1 env = MODULATE or **ADD**.
- [ ] Sphere-map texgen (`GL_SPHERE_MAP`) where the surface asks for it:
      `s = nx/m + 0.5, t = ny/m + 0.5` with
      `m = 2·sqrt(nx² + ny² + (nz+1)²)` on the eye-space reflection vector.

**Textures**

- [ ] `RGBA8`, `REPEAT`/`REPEAT`, `LINEAR` mag, `LINEAR_MIPMAP_NEAREST` min,
      full mip chain by box halving. POT only.
- [ ] Alpha comes from a separate `_a` image as `(R+G+B)/3`.
- [ ] Do **not** flip rows.

**2D**

- [ ] Virtual 640×480, origin top-left, y down; overlay quads at z = 0 with
      depth test off.
- [ ] Faders: mode 3 = alpha-blended solid colour with alpha `1 − transparency`;
      mode 1 = additive with the colour scaled. FadeIn/FadeOut ramp directions
      per §6. `RandomFade*` flicker with `rand()/32767 <= v`.

**Hair**

- [ ] `LINES`, 16-bit indices, stride-32 vertices (pos, normal), line width 3,
      exactly one light (the scene's first) enabled.

---

## 9. What could not be answered from static analysis

- ~~**The `.lwo` mesh loader's UV conventions**~~ — **answered in §10**:
  coordinates are generated at load by `FUN_0042b0c0` @0x42b0c0 from the `BLOK`
  projection parameters, the second UV set at `group[+0x24]` is the third
  textured channel's own projection, and V is flipped only for `PROJ 5`
  (explicit `VMAP`). Still open here: the **normal** convention, and how LWO
  polygons are triangulated and split into surface groups inside
  `FUN_0041df70` @0x41df70.
- **`FUN_004107f0`** (the scale factor used in the frustum-cull radius test) is
  x87-audit SUSPECT and was not read in asm. It only affects culling, so it
  cannot change the image — but do not transcribe Ghidra's C for it.
- **The hair (`data/hairs/*.txt`) and tauno particle (`particles/tauno/tauno.txt`)
  file formats** — the draw side is now fully known (§4.6, `FUN_0040c620`
  @0x40c620 parses `ColorTexture`/`AlphaTexture` keys and builds a
  depth-mode-2 / additive-or-alpha material), but the geometry generators were
  not traced.
- **`Picture` mode argument** (0 for loading screens, 3 for part pictures) — the
  tiling/atlas logic behind it was not chased.
- **`Part_Empt` (`forced_0x4057b0`, in `targeted1.c`), `Part_Viherio`
  (`forced_0x4087a0`), `Part_Morko`, `Part_Radiosity`** were only skimmed.
  Viherio in particular runs a table-driven strobe (`DAT_00463c2c`…`0x463c64`,
  threshold `_DAT_0045a598`) that gates whether the scene is drawn at all in a
  given frame — worth a dedicated read before porting that part.
- The exact per-frame behaviour of the double-buffered feedback in Silli/Pehko
  depends on driver semantics of the 2000-era back buffer and cannot be
  determined from the binary; match it against the capture.

---

## 10. Texture coordinate generation

Recovered from asm (`disasm.asm`), not from Ghidra's C: the dispatcher
`FUN_0042b0c0` is a jump table Ghidra renders as a `switch`, and all four
per-mode workers are pure x87 that the decompiler renders as float-free
integer moves. `FUN_00427360` (the `BLOK` parser) is on the **x87-audit DROPPED
list** — its `WRPW`/`WRPH` stores are invisible in the C.

### 10.1 Where UVs are produced — **at load, baked into the vertex buffer**

`FUN_0041df70` @0x41df70 is the LWO→renderable builder: it splits the object
into per-surface groups, fills the stride-0x30 vertex array with positions
(from `FUN_0041d6e0` @0x41d6e0 = `&PNTS[i*3]`, **raw object-space points**, no
pivot and no scale) and indices, then at 0x41ed9a/0x41eda4 calls

```
FUN_00442c20(group);      // normals
FUN_0042b0c0(surface, group);   // ← texgen
```

It runs **once per object**, either eagerly from the scene loader
`FUN_004156b0` @0x416f87 or lazily on first use via `FUN_0041f1a0` @0x41f1ad
(`if (obj[+0x84] == 0) build()`). There is **no per-frame texgen** and **no
`GL_TEXTURE` matrix anywhere** (`glMatrixMode(0x1702)` appears zero times in
`.text`). Sphere-map is the only runtime-computed coordinate, and GL does it.

`FUN_0042b0c0` @0x42b0c0 loops the surface's **7 texture channels**
(`EBP = surface + 0xb0`, step 0x54, `ESI = 0..6`):

```
if (chan[+0xb0] < 0)            continue;             // 0x42b0d5 — not bound
mode = chan[+0x64] - 1;                               // 0x42b0d9/0x42b0dc
if ((unsigned)mode > 5)         continue;             // 0x42b0dd
jump  [0x42b128 + mode*4](surface, chanIndex, group, chan[+0xb0]);
```

Jump table at **0x42b128** (read from the image, `.rdata`):

| `PROJ` | LightWave name | worker | implemented? |
|---:|---|---|---|
| 0 | Planar | `FUN_0042b140` @0x42b140 | yes |
| 1 | Cylindrical | `FUN_0042b500` @0x42b500 | **yes** |
| 2 | Spherical | `FUN_0042b2b0` @0x42b2b0 | yes |
| 3 | Cubic | → 0x42b117 | **no — silently skipped** |
| 4 | Front | → 0x42b117 | **no — silently skipped** |
| 5 | UV | `FUN_0042b720` @0x42b720 | yes (reads the `VMAP`) |

> So the answer to "does dm2000 implement cylindrical at all" is **yes, and
> faithfully in shape** — but with a **negated U** and a different phase origin
> from the textbook formula. That single sign is the whole bug (§10.5).

### 10.2 The `BLOK` record — `FUN_00427360` @0x427360, `FUN_00427900` @0x427900

Surface record is 0x2d4 bytes (`operator new` at 0x4267fe). The 7 channels are
an array at `surface + 0x64`, **stride 0x54**, constructed by `FUN_0042ab80`
@0x42ab80 (array-ctor helper `0x431d7f(base=surf+0x64, size=0x54, n=7, …)` at
0x42ad60). Per-channel layout and defaults:

| off (from surf) | rel | field | chunk | ctor default |
|---|---|---|---|---|
| +0x64 | +0x00 | `PROJ + 1` | `PROJ` (u16, `INC` at 0x4275fb) | 0 → **overwritten to 1** |
| +0x68 | +0x04 | `AXIS` | `AXIS` (u16) | 0 (X) |
| +0x6c | +0x08 | `SIZE` vec3 | `TMAP/SIZE` (0x427993) | (1,1,1) |
| +0x78 | +0x14 | `CNTR` vec3 | `TMAP/CNTR` (0x427a4a) | (0,0,0) |
| +0x84 | +0x20 | `ROTA` vec3 | `TMAP/ROTA` (0x4279ef) | (0,0,0) |
| +0x90 | +0x2c | `WRPW` f32 | `WRPW` (0x4276c8) | 1.0 |
| +0x94 | +0x30 | `WRPH` f32 | `WRPH` (0x42767f) | 1.0 |
| +0x98 | +0x34 | image filename (`std::string`) | `IMAG` → `CLIP` (0x42753c) | "" |
| +0xa8 | +0x44 | `PIXB & 1` (u8) | `PIXB` (0x4275aa) | 1 |
| +0xac | +0x48 | `VMAP` handle | `VMAP` (0x427625) | 0 |
| +0xb0 | +0x4c | **UV slot** 0/1/2 | — (written by §4.5) | **−1** |
| +0xb4 | +0x50 | `Texture*` | — | 0 |

Channel index comes from `CHAN` (0x427483):
**`COLR`=0, `LUMI`=1, `DIFF`=2, `SPEC`=3, `REFL`=5, `TRAN`=6** (4 and 7 unused).

> **Corrects §4.5**: the eight name slots at +0x98/+0xec/+0x140/… are *not*
> LWOB's CTEX/DTEX/STEX/RTEX/TTEX/LTEX/BTEX. The surface parser
> `FUN_00426a90` compares only LWO2 tags (`COLR DIFF LUMI SPEC REFL TRAN GLOS
> CLRF ADTR SIDE SMAN RIMG BLOK`) — there is no LWOB path at all. So mask bit 1
> = COLR, 2 = LUMI, 4 = DIFF, 8 = SPEC, 0x20 = REFL, 0x40 = TRAN, and bit 0x80
> is the separate `RIMG` slot at +0x2b0. The material table in §4.5 is still
> right, but "mask 3" means **COLR + LUMI** (colour × glow, hence `GL_ADD`) and
> "mask 5" means **COLR + DIFF**.

Just before parsing a `SURF`'s subchunks the loader **presets all 7 channels to
`PROJ = 0` (planar)** — 0x426bc9: `EAX = surf+0x64; ECX = 7; do { *EAX = 1;
EAX += 0x54; } while (--ECX)`. A `BLOK` with no `PROJ` chunk is therefore
planar, not "skip".

**Not parsed, therefore ignored:** `WRAP` (so wrapping is always the GL default
the texture loader sets — REPEAT, §5.4), `CSYS` (object space is the only
behaviour; a `CSYS 1` world-space projection is silently treated as object
space), `OREF`, `NEGA`, `OPAC`, `ENAB`, `TMAP/OREF`, `TMAP/FALL`.
`ROTA` **is parsed but never read** — a `.text`-wide grep for float reads of
`+0x84/0x88/0x8c` on a surface record finds none, and none of the four texgen
workers touches it. Projection rotation is unimplemented.

### 10.3 The formulas

Common preamble in all three procedural workers (0x42b1c6, 0x42b336, 0x42b57e):

```
d = P_object − CNTR            // P is the raw PNTS position
axis = chan[AXIS]              // 0 = X, 1 = Y, 2 = Z; anything else ⇒ u = v = 0
```

Constants, read from `.rdata`: `0x45a30c = 0.0f`, `0x45a330 = 0.5f`,
`0x45a624 = 0.75f`, `0x45ad24 = 1/π`, `0x45ad28 = 0.25f`, `0x45ad2c = 1/(2π)`,
`0x45ad30 = π/2`.

The engine has no `atan2`; it builds one out of `FPATAN` plus an `FCOMP` of the
*denominator* against 0, adding `+π/2` when the denominator is > 0 and `−π/2`
otherwise (0x42b63e etc.). Written as real arithmetic, with
`A(n, d) = atan2(n, d) + π/2` (the ±2π branch jump is harmless: it is scaled by
`WRPW/(2π)` and then multiplied by `WRPW`, so for integer `WRPW` it lands on an
exact texture repeat):

**`PROJ = 0` — planar (`FUN_0042b140`). `WRPW`/`WRPH` are NOT applied.**

```
axis 0 (X):  u = 0.5 + d.z / SIZE.z      v = 0.5 − d.y / SIZE.y
axis 1 (Y):  u = 0.5 + d.x / SIZE.x      v = 0.5 − d.z / SIZE.z
axis 2 (Z):  u = 0.5 + d.x / SIZE.x      v = 0.5 − d.y / SIZE.y
```

**`PROJ = 1` — cylindrical (`FUN_0042b500`). Only `WRPW` is applied.**

```
axis 0 (X):  u = −WRPW · ( A(d.z, d.y)/(2π) + 0.75 )   v = 0.5 − d.x / SIZE.x
axis 1 (Y):  u = −WRPW · ( A(d.x, d.z)/(2π) + 0.75 )   v = 0.5 − d.y / SIZE.y
axis 2 (Z):  u = +WRPW · ( A(d.x, d.y)/(2π) + 0.25 )   v = 0.5 − d.z / SIZE.z
```

Note the axis-2 row genuinely differs — `FADD 0.25` (0x45ad28) and **no**
`FCHS` at 0x42b5d4-0x42b60f, against `FADD 0.75` (0x45a624) + `FCHS` on the
other two. Also note axis 0 tests `TEST AH,0x01` (0x42b683, C0 only) where the
other two test `AH,0x41` (C0|C3), i.e. `d.y == 0` picks the opposite branch.
These are literal transcriptions, not tidied.

Because `A(n,d) = atan2(n,d) + π/2`, the axis-1 row simplifies to the form a
port should implement:

```
u = −WRPW · ( atan2(d.x, d.z) / (2π) + 1 )
  ≡ −WRPW · atan2(d.x, d.z) / (2π)          (mod WRPW, i.e. mod 1 texture)
v = 0.5 − d.y / SIZE.y
```

**`PROJ = 2` — spherical (`FUN_0042b2b0`). Both `WRPW` and `WRPH` applied.**

```
axis 0 (X):  u = −WRPW·( A(d.z,d.y)/(2π) + 0.75 )
             v =  WRPH·( 0.5 − atan( d.x / hypot(d.z, d.y) ) / π )
axis 1 (Y):  u = −WRPW·( A(d.x,d.z)/(2π) + 0.75 )
             v =  WRPH·( 0.5 − atan( d.y / hypot(d.x, d.z) ) / π )
axis 2 (Z):  u = +WRPW·( A(d.x,d.y)/(2π) + 0.25 )
             v =  WRPH·( 0.5 − atan( d.z / hypot(d.x, d.y) ) / π )
```

`SIZE` is unused in spherical (it never appears in `FUN_0042b2b0`).

**`PROJ = 3` (cubic) and `PROJ = 4` (front): nothing is written.** The vertex
keeps whatever the buffer was zero-filled with. No warning is printed.

**`PROJ = 5` — UV (`FUN_0042b720`)**: looks the `VMAP` handle at `chan[+0xac]`
up by name, finds the matching per-point UV pair and writes

```
u = uv.u        v = 1.0 − uv.v          // 0x45a310 = 1.0f, FSUB at 0x42b841
```

i.e. **V is flipped for explicit UV maps** (and only for those — the procedural
modes already produce a top-down V). Points with no entry in the map get
`(0,0)` from the static fallback at `0x4a9988`.

### 10.4 Where the coordinates land — and the second UV set

The 4th argument to each worker is `chan[+0xb0]`, the **UV slot**, written by
the `SURF`→Material builder `FUN_0042b8a0` (0x42bbed, 0x42c17d, 0x42c4ca,
0x42c60d …) for exactly those channels that get a texture unit:

| slot | destination | consumer |
|---:|---|---|
| 0 | `vertex[+0x20]` (uv0) | `GL_TEXTURE0` (§4.3) |
| 1 | `vertex[+0x28]` (uv1) | `GL_TEXTURE1` (§4.3) |
| 2 (or any ≥2 / <0) | `group[+0x24][i]`, the stride-8 side array | pass 1 (§4.3) |

Store sites: 0x42b262/0x42b26e (planar), 0x42b6d2/0x42b6da (cyl),
0x42b4af/0x42b4bb (sph), 0x42b85b/0x42b863 (UV); side-array sites
0x42b284, 0x42b6f0, 0x42b4d1, 0x42b87a.

> **This answers §9's first open item.** `uv1` is not derived from `uv0` and is
> not a lightmap channel: it is the **second textured channel's own `BLOK`
> projection**, with its own `PROJ`/`AXIS`/`CNTR`/`SIZE`/`WRPW`. For mask 3 that
> is the `LUMI` block, for mask 5 the `DIFF` block; for mask 7 `DIFF` → uv1 and
> `LUMI` → the pass-1 side array. Nothing generates reflection coordinates on
> the CPU — the `RIMG` slot (mask 0x80) sets `GL_SPHERE_MAP` texgen on the
> material (§4.5) and GL computes it per-vertex from the eye-space normal.

### 10.5 Worked check — `naamiotaus.lwo` in `hulluolli.lws`

Data (sole `BLOK`, `COLR` channel): `PROJ 1`, `AXIS 1`, `CNTR (0, 5, −100)`,
`SIZE (125, 100, 15.74)`, `WRPW 5`, `WRPH 1`, `ROTA 0`, `CSYS 0`,
`WRAP Repeat/Repeat`, image `textures/naamiotaus1.jpg` (512×512).
16 points, x = ±62.5, y ∈ {−45, 55}, z ∈ [3.923, 19.664].

Apply §10.3 axis-1 cylindrical. `d.z = z + 100 ∈ [103.92, 119.66]`, always > 0,
so the branch is the simple one.

| object x | z | `atan2(d.x,d.z)` | u (engine) | u mod 1 | u (textbook LW) |
|---:|---:|---:|---:|---:|---:|
| +62.5 | 3.923 | +30.996° | −5.4309 | 0.5691 | 0.9309 |
| +25.0 | 17.401 | +12.024° | −5.1670 | 0.8330 | 0.6670 |
| 0 | 19.664 | 0° | −5.0000 | 0.0000 | 0.5000 |
| −25.0 | 17.401 | −12.024° | −4.8330 | 0.1670 | 0.3330 |
| −62.5 | 3.923 | −30.996° | −4.5691 | 0.4309 | 0.0691 |

- The backdrop subtends **61.99°** about `CNTR`, so the full 125-unit width
  carries `5 × 61.99/360 = ` **0.861 texture repeats** — the *same* number under
  both formulas. Confirms the NOTES.md finding that this is not a scale error.
- **U runs the other way.** `du/dx < 0` for the engine, `> 0` for the textbook
  formula. And the engine's phase origin is `u ≡ 0` at object x = 0 (the `−5`
  is an exact integer number of repeats and vanishes under REPEAT), where the
  textbook formula puts `u = 0.5`. Net: **a horizontal mirror plus a half-
  texture shift** — a shape change, which is exactly why sweeping `wmul`
  plateaued at ~0.70 for every value.
- Camera at part-local t = 4.8 s (`hulluolli.lws`, camera parented to the Null,
  evaluated with `work/js/lws.mjs`): world position (0.279, −5.721, −29.042),
  world heading ≈ 0.01°, `fovX = 34.71°`. Ray-casting the frustum edges against
  the backdrop gives visible object-x **−32.1 … +37.9**, i.e. **56.0 % of the
  backdrop width** and **0.471 texture repeats** — consistent with the ~49 %
  in NOTES.md (the exact figure depends on the sub-frame time).
- `naamiotaus1.jpg` has its two column highlights at **u = 0.121 and u = 0.873**
  (column-mean peaks over rows 0–300) and the statue niche at u ≈ 0.5.

  | | u visible across the frame | columns | niche |
  |---|---|---|---|
  | engine (§10.3) | 0.216 → 1/0 → 0.745 (decreasing) | **both**, at NDC x −0.589 and +0.442 | out of frame |
  | textbook LW | 0.285 → 0.755 (increasing) | neither | at NDC x −0.085 |

  Measured on the reference capture (`verify/frames/hulluolli_t4.8_ref.png`,
  column means over rows 150–300): bright column peaks at NDC x **−0.62** and
  **+0.458**. The recovered formula predicts −0.589 / +0.442 — within 5 px and
  3 px of 640. Correlating a predicted background profile against the capture
  over the two clean background bands (px 40–190 and 425–570, rows 150–300):
  **r = 0.971** for the recovered formula, **r = −0.443** for the textbook one,
  and sweeping an extra U offset on top of the recovered formula finds its
  optimum at exactly one whole repeat, i.e. **no offset improves it**.

So the mismatch is fully explained: the engine's cylindrical U is the negative
of LightWave's, phased so that `u = 0` sits on the projection axis' `+Z`
direction rather than at the texture's centre. Both courtyard columns belong in
frame; the current port shows the niche instead.

### 10.6 Does anything come from outside the LWO?

**No.** The inputs are exactly: the raw `PNTS` position, and `CNTR`, `SIZE`,
`AXIS`, `WRPW`, `WRPH`, `PROJ` from the channel's own `BLOK`. There is no
bounding box (the `BBOX` chunk is parsed for culling only), no layer pivot
(`FUN_0041d6e0` returns `&PNTS[i*3]` unmodified; `naamiotaus`'s `LAYR` pivot is
0 anyway), no scene-level override, and **no dependence on the item's LWS
position/rotation/scale** — `naamiotaus` is scaled 0.5 in the scene and that
does not touch its UVs.

### 10.7 Checklist deltas for §8

- [ ] uv0/uv1/side-array are **baked at load** by `FUN_0042b0c0`; a port
      computes them in its LWO loader, never in a shader.
- [ ] Cylindrical U is **negated**: `u = −WRPW · atan2(d.x, d.z) / (2π)` for
      `AXIS 1`. Do not use LightWave's `+0.5 + atan2(…)/(2π)` form.
- [ ] `WRPW` applies to cylindrical and spherical U only; `WRPH` to spherical V
      only. Planar ignores both.
- [ ] `PROJ 3` (cubic) and `PROJ 4` (front) produce **(0,0)** — reproduce the
      omission rather than implementing them.
- [ ] `PROJ 5` (UV map) flips V (`v = 1 − v_map`); the procedural modes do not.
- [ ] `WRAP`, `CSYS` and `ROTA` are ignored by the engine — do not honour them.
- [ ] §4.5's channel-slot names are LWO2 `COLR/LUMI/DIFF/SPEC/–/REFL/TRAN`, not
      LWOB's `CTEX/DTEX/…`.

---

## 12. Per-part draw functions

The nine parts that do **not** use the generic `vf2` `FUN_00406e50`
(clear → `scene->tick(localTime, dt)` → `render(getCamera(0))`, ENGINE.md §5).

**Provenance.** Five of the nine (`0x4057b0`, `0x4072b0`, `0x407800`,
`0x408460`, `0x4087a0`) are vtable-only and are *absent from
`re/disasm.asm`* — Ghidra never made functions of them. They were disassembled
directly out of `work/src/Lapsus.exe` with `ndisasm -b32` at the identity
mapping (file offset = VA − 0x400000, spot-checked at 0x60b0). The other four
(`0x4060b0`, `0x406b20`, `0x407e30`, `0x4081f0`) are read from `disasm.asm`.
**Every float below is decoded from the raw image**, not from Ghidra's C; all
nine are x87-heavy and `re/targeted2.c` drops or mangles most of the arithmetic
(it renders `0.8` as `0x3f4ccccd`, loses whole FPU stack slots, and invents
`unaff_retaddr` for the `localTime` argument).

### 12.0 Shared CRT helpers used by these functions

Identified from asm, since the x87 audit flags several of them:

| VA | function | evidence |
|---|---|---|
| `0x4306a2` | `rand()` — MSVC LCG, returns `(seed>>16) & 0x7fff`, i.e. **0…32767** | 0x4306aa `imul 0x343fd`, 0x4306b0 `add 0x269ec3` |
| `0x430ac8` | `__ftol` — **truncate toward zero** | 0x430ad7 `or ah,0x0c` sets x87 RC = 11 before `FISTP` |
| `0x430aef` | `floor(double)` | 0x4345ec sets the CW from `[0x466750] = 0x173f` (RC = 01, round-down), `FRNDINT` at 0x434481, CW restored at 0x430b8c |
| `0x430bc0` | `_CIpow(base = ST1, exp = ST0)` | 0x430bc3 `fxch`, base→`[esp]`, exp→`[esp+8]`, core 0x430be2; descriptor at 0x466750 literally spells `"pow"` |
| `0x430dea` | `_CIfmod(ST1 mod ST0)` | `jmp 0x434de0` with `edx = 0x466770`, whose descriptor spells `"fmod"`; the `FPREM` loop is at 0x430df4–0x430e11 |

`rand01` below always means `rand() * _DAT_0045a308` where
`0x45a308 = 0x38000100 = 3.0518509447574615e-05 = 1/32767` — so
`rand01 ∈ [0, 1]` inclusive.

`Picture` fields (§5.5): `+0x14` = x, `+0x18` = y, `+0x1c` = `Material*`.
Camera/item fields (§1.1): `+0x4c/0x50/0x54` = position, `+0xbc` = matrixValid.

**Resolved while doing this — `Picture`'s `mode` argument** (§9 open item).
`FUN_0040a700` @0x40a994–0x40a9db allocates the picture's `Material` and writes
`material[+0x64] = 0` (**depth test off**), `material[+0x58] = mode`
(**the blend mode of §4.4**), `FUN_0040c020(material, 1)` → `material[+0x3c] = 1`
(one texture), `material[+0x6b] = 1` (**culling disabled**). Everything else is
the `FUN_0040bef0` default: unlit, diffuse white, transparency 0. So `mode 3`
(all part pictures) = ordinary alpha blending with `alpha = 1 − transparency`,
and `mode 0` (loading screens) = opaque.

---

### 12.1 `Part_Empt::vf2` — `forced_0x4057b0` @0x4057b0

Factory layout (ctor `FUN_00405550` zeroes `+4…+0x18`; create `FUN_00405570`):
`+0x08` = `Picture("data/pics/design1.tga", alpha "data/pics/design1_a.tga",
mode 3)` (x/y not set at create), `+0x18` = a **private black `FadeIn`**
(`operator new(0x14)`, `FUN_00404840`, vtable `0x45a2d0`, `material[+0x58] = 3`,
diffuse and fader RGB all 0). `+0x0c/+0x10/+0x14` are three phase timers.
There is **no `LW::Scene`** — this part is pure 2D.

**The clear happens exactly once in the whole process.** @0x4057b0–0x4057e9:

```
if (DAT_00468f1c == 0) { clear(black /* three zero floats on the stack */); DAT_00468f1c = 1; }
```

`DAT_00468f1c` is written nowhere else in `.text` (2 references total, both in
this function). So from frame 2 of Part_Empt onward **nothing is ever cleared** —
Part_Empt is a full frame-feedback part, a third one alongside Silli and Pehko
(§7.3 does not mention it; see §12.10).

Three mutually exclusive phases, gated on the timers. Constants:
`0x45a3cc = 1.2999999523162842`, `0x45a3c8 = 8.0`, `0x45a3c4 = 2.0`,
`0x45a3c0 = 50.0`, `0x45a3bc = 180.0`, `0x45a3b8 = 5.759998321533203`,
`0x45a3b4 = 0.05`, `0x45a3b0 = 0.9`, `0x45a39c = 1.5`,
`0x45a398 = 2.094395160675049 (2π/3)`, `0x45a394 = 0.7853981852531433 (π/4)`,
`0x45a390 = 0.1`, `0x45a32c = 3.0`, `0x45a330 = 0.5`,
doubles `0x45a3a8 = 2.0`, `0x45a3a0 = 3.5`, `0x45a388 = 50.0`, `0x45a380 = 180.0`.

**Phase A — `t0 = this[+0x0c] < 1.3`** (@0x4057f3–0x4058eb):

```
fader.draw(0.9)                       // black FadeIn, mode 3 → alpha 0.1
X  = 8*t0 - 8                          // t0 read BEFORE the increment
this[+0x0c] += dt
N  = max(1, trunc((X - 2.0) * 3.0))
A  = X * X
repeat N times:
    picture.x = trunc((rand01 - 0.5) * A + 50.0)
    picture.y = trunc((rand01 - 0.5) * A + 180.0)
    picture.material.blendMode  = 3
    picture.material.transparency = rand01          // fresh rand()
    Picture::draw(picture)
```

`N` is 1 for the entire phase (`X ≤ 2.4` ⇒ `(X−2)·3 ≤ 1.2`). `A` is the jitter
box in virtual pixels: 64 at `t0 = 0`, **0 at `t0 = 1.0`**, 5.76 at `t0 = 1.3`.

**Phase B — `t0 ≥ 1.3` and `t1 = this[+0x10] < 8.0`** (@0x4058fa–0x4059bb):

```
fader.draw(0.9)
this[+0x10] += dt
picture.x = trunc((rand01 - 0.5) * 5.759998321533203 + 50.0)
picture.y = trunc((rand01 - 0.5) * 5.759998321533203 + 180.0)
picture.material.blendMode  = 3
picture.material.transparency = rand01
Picture::draw(picture)                 // exactly one copy
```

5.759998 is `X²` at `t0 = 1.3`, i.e. the jitter is continuous across the A→B
seam.

**Phase C — `t1 ≥ 8.0`** (@0x4059be–0x405b21):

```
d = this[+0x14]
fader.draw(0.9 - 0.05*d)               // veil deepens: alpha 0.1 → 0.285 at d=3.7
this[+0x14] += dt
Y  = 8*(d + 1.3) - 8                   // = 8d + 2.4
N  = max(1, trunc((Y - 2.0) * 3.5))    // = trunc(28d + 1.4)
A2 = 1.5 * Y*Y
B2 = 0.05 * Y
repeat N times:
    ang = 0.7853981852531433 + 2.094395160675049 * (rand01 - 0.5)   // 45° ± 60°
    r   = (rand01 - 0.1) * A2
    picture.x = trunc(50.0  + r*cos(ang))
    picture.y = trunc(180.0 - r*sin(ang))          // note the MINUS (y is down)
    picture.material.blendMode = 3
    if (rand01 + B2 <= 0.0) picture.material.transparency = 0.0
    else                    picture.material.transparency = rand01' + B2   // a SECOND rand() call
    Picture::draw(picture)
```

The double `rand()` in the transparency branch is literal (0x405ab6 for the
test, 0x405ada for the value) — the test call's value is discarded. Since
`Y > 0` always, the `0.0` branch is unreachable, but the **extra `rand()` call
still happens** and shifts the sequence; a bit-exact port must call `rand()`
twice here.

`transparency` exceeds 1 as `d` grows (`B2 = 0.4d + 0.12`), so `alpha =
1 − transparency` goes negative and GL clamps it to 0 — the slides thin out as
the spray widens (`A2` = 8.6 px at `d = 0`, ~1536 px at `d = 3.7`).

Phase lengths **1.3 + 8.0 + 3.7 = 13.0 s** = Part_Empt's scheduled duration
(ENGINE.md §5). Independent confirmation that the three timers simply track
`localTime`.

GL-state delta vs. the generic path: no `glClear` at all after frame 1; the only
state comes from the fader and picture materials (both unlit, depth test off,
culling off, `SRC_ALPHA/ONE_MINUS_SRC_ALPHA`).

---

### 12.2 `Part_HigherBiing::vf2` — `FUN_004060b0` @0x4060b0

**§7.3.13 is correct as written; the constants are byte-confirmed** —
`_DAT_0045a414 = 4.5` (`0x40900000`), `_DAT_0045a410 = 10.600000381469727`
(`0x4129999a`).

```
clear(scene + 0xc0);                                // backdrop colour, §7.2
if (localTime < 4.5) {                              // 0x4060c7 FLD/FCOMP/TEST AH,1
    scene[+0xec] = 7.5f;  scene[+0xf0] = 13.0f;     // 0x40f00000 / 0x41500000
    scene->tick(localTime, dt);   cam = 0;
} else if (localTime < 10.6) {
    scene[+0xec] = 15.0f; scene[+0xf0] = 30.0f;     // 0x41700000 / 0x41f00000
    scene->tick(localTime, dt);   cam = 1;
} else {
    scene[+0xec] = 9.5f;  scene[+0xf0] = 18.0f;     // 0x41180000 / 0x41900000
    scene->tick(localTime, dt);   cam = 2;
}
scene->render(scene->getCamera(cam));
```

`scene+0xec` / `+0xf0` are fog min / max distance (§4.1 step 3).
The override is written **before** `tick` — that is safe: `LW::Scene::tick`
(`FUN_004150b0`, read end-to-end at 0x4150b0–0x4151db) never writes `+0xec` or
`+0xf0`; it only touches item motions, camera zoom→fov, lights, particle
systems and hair. Fog min/max are load-time LWS values that nothing else
animates.

`higherbiing.lws` carries 3 cameras (`LWS_INVENTORY.md`), so the indices are
real. Nothing else is perturbed — no camera offset, no overlay, no extra clear.

---

### 12.3 `Part_Kuubiotekniikka::vf2` — `FUN_00406b20` @0x406b20

**§7.3.14 confirmed**, plus the identity of the image.

```
clear(scene + 0xc0);
scene->tick(localTime, dt);
scene->render(scene->getCamera(0));
if (localTime < 1.0f) {                     // 0x406b5c, _DAT_0045a310 = 1.0
    picture.material.transparency = localTime;   // raw float store, 0x406b77
    Picture::draw(picture);                      // 0x406b7d
}
```

`picture` is `this+0x08`, built by `FUN_004068e0` @0x406a76 as
`Picture("data/pics/loading2.jpg", alpha "" /* DAT_00468f0c, an all-zero byte */,
mode 3)` with x = y = 0. **It is the phase-2 loading screen** — the same JPEG
that was frozen on screen during the ~5 s `loadPhase(2)` (ENGINE.md §7.4).
So phase 2 opens by cross-dissolving the still loading screen into the first 3D
scene over exactly one second: `alpha = 1 − localTime`, opaque at t = 0,
gone at t = 1.

No blend mode is set per-frame — it comes from the `mode 3` ctor argument
(§12.0). Fog: the overlay quad sits at eye-z 0 in the 640×480 ortho, so even
though `material[+0x6a] = 1` and `kuubiotekniikka.lws` has `FogType 1`, the
`GL_LINEAR` factor at distance 0 clamps to 1 and the quad is unfogged.

---

### 12.4 `Part_Paleksi::vf2` — `forced_0x4072b0` @0x4072b0

Factory: `+0x04` scene `data/Paleksi.lws`, `+0x08`
`Picture("data/pics/eDezign.jpg", alpha "data/pics/eDezign_a.jpg", mode 3)` with
**x = 0x80 = 128, y = 0xe0 = 224** set at create (`FUN_00407050` @0x407245/0x40724c).
(`vf1` @0x407270 also writes `this[+0x14] = 30.0f`; `vf2` never reads it — dead.)

Constants: doubles `0x45a4f0 = 1.1924489795918367` (**period P**),
`0x45a4f8 = 0.8386103029265788` (= 1/P), `0x45a4e8 = 1.0`, `0x45a4e0 = 5.0`,
`0x45a4d0 = 1.5`, `0x45a4c8 = 128.0`, `0x45a4c0 = 10.5`, `0x45a4b8 = 224.0`;
floats `0x45a4d8 = 40.0`, `0x45a32c = 3.0`, `0x45a330 = 0.5`.

```
A     = floor(localTime * (1/P)) * P            // 0x4072c7 floor, 0x4072cc
phase = localTime - A                           // time since the last impulse
env   = pow(1.0 - phase*(1/P), 5.0)             // 0x4072f7 _CIpow
if (A < P) env *= 3.0                           // 0x407300..0x40730d — FIRST period only
S     = env * sin(phase * 40.0)                 // 0x407320 FSIN

picture.x = trunc(S * 1.5  + 128.0)             // 0x40733a
picture.y = trunc(S * 10.5 + 224.0)             // 0x407352

clear(scene + 0xc0);                            // 0x407369
scene->tick(localTime, dt);                     // 0x40737b
cam = getCamera(0);
cam.position.x += S * 0.5;                      // 0x407384 / 0x40739f — ADDITIVE, post-tick
cam.position.y, .z unchanged;  cam[+0xbc] = 0;
scene->render(getCamera(0));                    // 0x4073ea
Picture::draw(picture);                         // 0x4073f2 — overlay LAST
```

So it is not a plain sine wobble: it is a **1.19245 s-periodic decaying burst**,
`(1 − phase/P)^5 · sin(40·phase)` — ≈ 7.6 oscillations per impulse, amplitude
decaying to zero by the end of each period, and **tripled during the very first
period** (`localTime < P`). The same scalar drives three things at three gains:
camera X (×0.5), overlay X (×1.5), overlay Y (×10.5) — the `eDezign` logo mostly
bounces vertically.

The camera write is *additive on top of the tick result*, so `paleksi.lws`'s
camera animation is preserved (contrast Turska, §12.8).

---

### 12.5 `Part_Pehko::vf2` — `forced_0x407800` @0x407800

**§7.3.2 confirmed** (no clear, fader at 0.95, `DAT_004a900c` gating), and the
particle loop is now decoded.

Factory (create `FUN_00407490`): `+0x04` scene `data/pehko.lws` (`DAT_00463af4`),
`+0x0c` particle-system **template** parsed from
`data/particles/tauno/tauno.txt` by `FUN_0040c620` (0x180 bytes),
`+0x10/+0x14/+0x18` a `vector<ParticleSystem*>` (object / begin / end),
`+0x20` a private black `FadeIn` (mode 3, RGB 0).

```
DAT_004a900c = 1;                       // 0x407806 — suppress Scene::render's hair block (§4.6)
fader.draw(0.95f);                      // 0x407812 PUSH 0x3f733333 → alpha 0.05
                                        //   *** no glClear of any kind ***
scene->tick(localTime, dt);             // 0x40782b
scene->render(scene->getCamera(0));     // 0x40783e
h = scene[+0x68][0];                    // the FIRST hair mesh only (0x407843–0x407866)
for (s = 0; s < ((h[+0xdc] - h[+0xd8]) >> 2); ++s) {
    strand = ((void**)h[+0xd8])[s];
    n = (strand[+0x1c] - strand[+0x18]) / 0x14;        // 20-byte records
    for (p = 0; p < n; ++p) {
        ps = vectorBegin[n * s + p];                   // FLAT index, assumes equal n
        rec = strand[+0x18] + p*0x14;
        ps.position (+0x4c,+0x50,+0x54) = rec[0..2];   // 3 floats, absolute
        ps[+0xbc] = 0;
        FUN_0040d440(ps, dt);                          // particle-system update(dt)
        ps->vf1(scene->getCamera(0));                  // draw (same slot Scene::render uses, §4.1.9)
    }
}
DAT_004a900c = 0;
```

One `ParticleSystem` instance is cloned from the tauno template per 20-byte
record at create time (`FUN_00407490` @0x407437–0x407446), in the same nested
order — so the flat index `n*s + p` matches, provided every strand has the same
record count. That assumption is baked in; a port should just keep a
per-strand list of instances.

Draw order per frame: **black 5 % quad → 3D scene → particles**, on top of
whatever was in the colour *and depth* buffers from the previous swap.

---

### 12.6 `Part_Silli::vf2` — `FUN_00407e30` @0x407e30

```
FUN_0040b7e0(display);           // 0x407e39 — DEPTH-ONLY clear (§7.2). Colour survives.
fader.draw(0.8f);                // 0x407e43 PUSH 0x3f4ccccd
scene->tick(localTime, dt);      // 0x407e58
scene->render(scene->getCamera(0));
```

`this+0x08` is a private black `FadeIn` created by `FUN_00407ca0`
(vtable `0x45a2d0`, `material[+0x58] = 3`, diffuse and fader RGB = 0).
Per §6, mode 3 `FadeIn::draw(v)` writes `transparency = v`, and §4.4 gives
`glColor4f(0,0,0, 1 − transparency)`.

> **`0x3f4ccccd` is 0.8, not 0.7.** The black quad is therefore drawn at
> **alpha 0.20**, i.e. the previous frame survives at 80 % per frame — not the
> 30 %/70 % stated in §7.3.1 and §8. See §12.10.

No camera manipulation, no overlay, no parameter overrides.

---

### 12.7 `Part_Syrjakyla::vf2` — `FUN_004081f0` @0x4081f0

**This part does not touch the camera. §7.3.15 is wrong about it.**

```
clear(scene + 0xc0);                      // 0x408202
scene->tick(localTime, dt);               // 0x408214
scene->render(scene->getCamera(0));       // 0x408227   <-- render happens HERE

// ...and only then, an oscillator whose state nothing ever reads:
v  = this[+0x14];  x = this[+0x10];  T = this[+0x0c];
v' = v - x/dt;              this[+0x14] = v';          // 0x40822c–0x408238
x' = x + v'*dt;             this[+0x10] = x';          // 0x40823b–0x408242  (== v*dt)
v''= v' - dt*v'*40.0;       this[+0x14] = v'';         // 0x408245–0x408255, _DAT_0045a4d8 = 40.0
T += dt;                    this[+0x0c] = T;
if (T >= 2.3848979591836734) { this[+0x14] = 50.0f; this[+0x0c] = T - 2.3848979591836734; }
                                                        // double at 0x45a560; 0x42480000 = 50.0
```

`this[+0x0c/+0x10/+0x14]` are read by nothing else — a `.text` scan finds
no other consumer, and the function returns immediately after the store at
0x40827c/0x408285. The oscillator is **dead code**.

`Part_Syrjakyla::create` (`FUN_00408050`) additionally builds a private
**white additive `FadeOut`** at `this+0x08` (vtable `0x45a2c4`,
`material[+0x58] = 1`, diffuse and fader RGB = `0x437f0000` = 255.0) — and
`vf2` never draws it either. Two abandoned effects; the part renders exactly
like the generic path. Its period, 2.38489796 s, is precisely 2× Paleksi's.

**A port should implement `Part_Syrjakyla` as the plain generic `vf2`.**
(The white flash that *is* visible at its start comes from the schedule's
`white 0.5` FadeIn, ENGINE.md §5, not from this object.)

---

### 12.8 `Part_Turska::vf2` — `forced_0x408460` @0x408460

Factory: `+0x04` scene, `+0x08` period accumulator, `+0x0c` displacement `x`,
`+0x10` velocity `v`, `+0x14/0x18/0x1c` **base position**, `+0x20/0x24/0x28`
**direction vector**.

`Part_Turska::create` `FUN_004082f0` @0x4083e2–0x40840c ends with
`scene->tick(0.0f, 0.0f); p = getCamera(0)->position; this[+0x14..0x1c] = p;` —
the base is camera 0's position at scene time 0. **`this[+0x20..0x28] is never
written`** — not by the ctor (`FUN_004082c0` zeroes it), not by create, not by
`vf1` (`FUN_00408430` only clears `+4…+0x10`). The direction is permanently
`(0,0,0)`.

```
clear(scene + 0xc0);                       // 0x408475
scene->tick(localTime, dt);                // 0x408487

v' = v - x/dt;   this[+0x10] = v';         // 0x40848c–0x408498
x' = x + v'*dt;  this[+0x0c] = x';         // 0x40849b–0x4084a2   (== v*dt, old v)
v''= v' - dt*v'*10.0;  this[+0x10] = v'';  // _DAT_0045a580 = 10.0
T += dt;  this[+0x08] = T;
if (T >= 0.8863520408163266) {             // double at 0x45a578
    this[+0x10] = 50.0f;                   // 0x42480000
    this[+0x0c] =  2.0f;                   // 0x40000000
    this[+0x08] = T - 0.8863520408163266;
}

x = this[+0x0c];
cam = getCamera(0);
cam.position = ( base.x + 0.1*x*dir.x,
                 base.y + 0.1*x*dir.y,
                 base.z + 0.1*x*dir.z + x );     // _DAT_0045a390 = 0.1; the extra +x is z-only
cam[+0xbc] = 0;
scene->render(getCamera(0));
```

With `dir = (0,0,0)` this collapses to

> **`camera0.position = (base.x, base.y, base.z + x)`** — a pure Z (dolly) shake,
> re-kicked every **0.8863520408163266 s** with `v = 50, x = 2`, damped at
> `v *= (1 − 10·dt)`.

Two things a port must not get wrong:

1. The write is an **absolute overwrite**, not an offset — every frame camera 0's
   position is reset to its create-time snapshot. Harmless for the shipped
   `turska.lws` (its camera has a single key per channel: position
   `(11.78975, 48.05761, −54.49221)`, constant), but if the scene is ever edited
   the animation would be discarded.
2. The recurrence is **frame-rate dependent**. Substituting `x = v·dt` gives
   `v_{n+1} = (v_n − v_{n−1}·dt_{n−1}/dt_n)·(1 − 10·dt_n)`; at a fixed dt the
   roots are complex with `|z| = sqrt(1 − 10·dt)` and argument ≈ 1.10 rad, i.e.
   an oscillation with a period of **≈ 5.5–5.7 *frames*** whatever the frame
   rate (≈ 95 ms at 60 fps, ≈ 180 ms at 30 fps). Reproduce it literally at a
   fixed 60 Hz step; do not "fix" it into a time-based spring.

---

### 12.9 `Part_Viherio::vf2` — `forced_0x4087a0` @0x4087a0

**The strobe does not gate the scene draw — it gates the *clear*.** §9's
description ("gates whether its scene draws at all in a given frame") is wrong;
`tick` and `render` run unconditionally every frame. See §12.10.

Two globals, both used only here (verified: 5 references to `0x463c64` and 4 to
`0x468f24` in the whole image, all inside this function):

| VA | meaning | initial value |
|---|---|---|
| `DAT_00463c64` | seconds since the current strobe started | **1000000.0** (`0x49742400`, a static initialiser in `.data`) |
| `DAT_00468f24` | strobe-active flag (byte) | 0 (`.bss`) |

Constants: double `0x45a5a0 = 7.090816326530613` (cycle length),
double `0x45a598 = 0.1` (both the window width **and** the strobe duration),
`0x45a30c = 0.0`.

#### The table — fully decoded

`ECX = 0x463c2c` at 0x4087c3; the loop advances by 4 and runs while
`ECX < 0x463c64` (0x4087fb). So it is **14 contiguous `float`s at
`0x463c2c … 0x463c60` inclusive**, immediately following the string
`"data/Turska.lws"` (0x463c1c–0x463c2b) and immediately preceding the
accumulator at 0x463c64. Entry 0 shares the string's tail padding but is a
genuine array element.

| # | VA | raw | value (s) | Δ from previous | Δ / 0.11079401 |
|---:|---|---|---:|---:|---:|
| 0 | 0x463c2c | `0x00000000` | 0.000000000 | — | — |
| 1 | 0x463c30 | `0x3f62e7f8` | 0.886352062 | 0.886352 | 8 |
| 2 | 0x463c34 | `0x3f9bff7a` | 1.218734026 | 0.332382 | 3 |
| 3 | 0x463c38 | `0x3fc68af9` | 1.551116109 | 0.332382 | 3 |
| 4 | 0x463c3c | `0x3fff44f7` | 1.994292140 | 0.443176 | 4 |
| 5 | 0x463c40 | `0x402a2dfa` | 2.659056187 | 0.664764 | 6 |
| 6 | 0x463c44 | `0x403f73b9` | 2.991438150 | 0.332382 | 3 |
| 7 | 0x463c48 | `0x4054b978` | 3.323820114 | 0.332382 | 3 |
| 8 | 0x463c4c | `0x40711677` | 3.766996145 | 0.443176 | 4 |
| 9 | 0x463c50 | `0x408dd0fb` | 4.431760311 | 0.664764 | 6 |
| 10 | 0x463c54 | `0x409873da` | 4.764142036 | 0.332382 | 3 |
| 11 | 0x463c58 | `0x40a316ba` | 5.096524239 | 0.332382 | 3 |
| 12 | 0x463c5c | `0x40b14539` | 5.539700031 | 0.443176 | 4 |
| 13 | 0x463c60 | `0x40cda238` | 6.426052094 | 0.886352 | 8 |

Every entry is an exact multiple of **u = 0.110794005 s**
(= 0.8863520408163266 / 8, i.e. Turska's impulse period over 8), and the cycle
length 7.090816326530613 s = **64 u** = 8 × Turska's period. In units of `u` the
onsets are `0, 8, 11, 14, 18, 24, 27, 30, 34, 40, 43, 46, 50, 58` out of 64 —
a 16th-note rhythm figure that repeats every two bars. (*inference*: the
musical reading; the arithmetic itself is exact.)

#### The algorithm (byte-exact)

```
T = fmod(localTime, 7.090816326530613);        // 0x4087a6/0x4087ae
acc  = DAT_00463c64;                           // 0x4087bd
flag = DAT_00468f24;                           // 0x4087b7

for (i = 0; i < 14; ++i) {                     // 0x4087c8–0x408801
    e = table[i];
    if (T >= e && T < e + 0.1 && flag == 0) {  // 0x4087cc / 0x4087db / 0x4087ea
        flag = 1;
        acc  = 0.0;                            // 0x4087f2
    }
}
DAT_00463c64 = acc;                            // 0x408803
DAT_00468f24 = flag;                           // 0x408809
if (acc > 0.1) DAT_00468f24 = 0;               // 0x40880f–0x40881c

scene->tick(localTime, dt);                    // 0x408830  — ALWAYS
if (DAT_00468f24 == 0) clear(scene + 0xc0);    // 0x408835–0x40884e — clear is SKIPPED while strobing
scene->render(scene->getCamera(0));            // 0x408861  — ALWAYS
DAT_00463c64 += dt;                            // 0x408866–0x408871
```

Semantics for a port:

- The strobe **arms** on the first frame whose `T` falls inside any window
  `[e, e+0.1)`; the `flag == 0` guard means it fires once per window even though
  the window spans several frames.
- It stays armed until the accumulator exceeds 0.1 s. `acc` is set to 0 on the
  arming frame and incremented by `dt` at the *end* of every frame, and the
  test is `acc > 0.1` (strictly greater), so the un-cleared run is the arming
  frame plus every frame while `acc ≤ 0.1` — **7 frames ≈ 0.117 s at 60 fps**.
- While armed, `glClear` is not issued: neither colour **nor depth**. The scene
  is re-rendered on top of the retained buffer, so successive frames pile up
  (and the stale depth buffer rejects fragments behind the previous frame's
  geometry). With GLUT double buffering the retained content is the frame
  *before last* (same caveat as §7.3.1/2).
- The clear is issued **after** `tick` and **before** `render` — irrelevant to
  the result, but note the clear colour is the scene backdrop, read fresh.
- `DAT_00463c64` starts at 1 000 000, so the flag is forced off on the first
  frame and the first table hit (entry 0 = 0.0, i.e. `localTime = 0`) arms
  immediately. Neither global is reset by create/destroy, but nothing else
  touches them.
- Viherio's slot is 10.46 s (ENGINE.md §5) and the cycle is 7.0908 s, so the
  table plays through once and then restarts, reaching entry 7 (`3.3238 s`,
  the last onset ≤ 10.46 − 7.0908 = 3.369) before the part ends:
  **14 + 8 = 22 strobes** in total.

`Part_Viherio::create` (`FUN_004085f0`) also allocates a private black `FadeIn`
at `this+0x0c` (mode 3, RGB 0) which `vf2` **never draws** — dead, like
Syrjakyla's. `this+0x08` is allocated by nothing and freed by `vf1`
(`FUN_00408750`) as a null.

---

### 12.10 Corrections to §7 / §8 / §9

1. **§7.3.1 and §8 "Frame" — Silli's black quad is `0.8`, not `0.7`.**
   `PUSH 0x3f666666` (0.9) is Part_Empt's constant; Silli pushes
   `0x3f4ccccd` = **0.8** at 0x407e43. Mode-3 `FadeIn` ⇒ `alpha = 1 − v`, so the
   quad is drawn at **20 % alpha and the previous frame survives at 80 %**, not
   the "30 % / 70 %" in §7.3.1 and the "30 % black quad" in the §8 checklist.
   (Pehko's 0.95 → 5 % is correct.)

2. **§7.3.15 — `Part_Syrjakyla` does *not* perturb the camera.** It renders
   before it updates its oscillator, and no code anywhere reads that state
   (§12.7). Its private white additive `FadeOut` is never drawn either. Port it
   as the generic `vf2`.

3. **§7.3.15 — `Part_Turska` does not do `x += impulse`; it *overwrites*
   camera 0's position** with a create-time snapshot plus a **Z-only** offset,
   because the direction vector at `this+0x20..0x28` is never initialised
   (§12.8). And the oscillator is frame-rate-, not time-, parameterised.

4. **§7.3.15 — `Part_Paleksi` is not "a sine wobble on X".** It is a
   `pow(1 − phase/P, 5)`-enveloped 40 rad/s sine burst re-armed every
   1.19244898 s (tripled in the first period), driving camera X (×0.5) *and*
   the `eDezign` overlay picture's X (×1.5) and Y (×10.5) (§12.4).

5. **§7.3.15 — "They also set `camera[+0xbc] = 0` afterwards so the shaken
   matrix is used"** is a true byte-fact but a no-op: §3 established that
   `+0xbc` is never set back to 1 anywhere in `.text`, so the world matrix is
   rebuilt on every query regardless. Nothing depends on that store.

6. **§9 — Viherio's table-driven strobe does not gate the scene draw.**
   `tick` and `render` are unconditional; the strobe suppresses the **colour +
   depth clear** for ~0.1 s per hit (§12.9). Table fully decoded above.

7. **§7.3 and §8 — there is a *third* frame-feedback part: `Part_Empt`.**
   It clears exactly once in the whole process (guarded by `DAT_00468f1c`,
   0x4057b0/0x4057e9) and never again; every subsequent frame composites a
   black quad at alpha 0.1 (0.285 by the end) plus N stamped copies of
   `design1.tga` over the retained buffer (§12.1). The §8 "Frame" checklist item
   needs a third exception.

8. **§9 — `Picture`'s `mode` argument is resolved**: it is the material blend
   mode (`material[+0x58]`, written at 0x40a9c4), and the picture ctor also
   forces depth mode 0, texture count 1 and culling off (§12.0).

9. **§7.3.13 (HigherBiing) and §7.3.14 (Kuubiotekniikka) are confirmed**, with
   two additions: the fog write precedes `tick` and survives because
   `Scene::tick` never writes `+0xec/+0xf0`; and Kuubiotekniikka's overlay image
   is `data/pics/loading2.jpg`, i.e. the phase-2 loading screen dissolving into
   the demo.

10. *(ENGINE.md §5 footnote)* `Part_Empt`'s `vf1` is **`0x405760`**, not the
    shared default `0x407fe0` — vtable `0x45a374 = {0x405570, 0x405760,
    0x4057b0}`.

### 12.11 Summary table

| part | vf2 | clear | camera | overlay | time gating |
|---|---|---|---|---|---|
| Part_Empt | 0x4057b0 | **once ever**, black | — (no scene) | design1.tga ×N + black quad 0.9→0.715 | 1.3 s / 8.0 s / rest |
| Part_HigherBiing | 0x4060b0 | backdrop | **cuts 0→1→2** | — | 4.5 s, 10.6 s + fog (7.5,13)/(15,30)/(9.5,18) |
| Part_Kuubiotekniikka | 0x406b20 | backdrop | 0 | loading2.jpg, `transparency = t` | `t < 1.0` |
| Part_Paleksi | 0x4072b0 | backdrop | 0, `x += 0.5·S` | eDezign.jpg at (128,224)+(1.5,10.5)·S | period 1.19244898 s, ×3 first period |
| Part_Pehko | 0x407800 | **none** | 0 | black quad 0.95 + hand-drawn particles | — |
| Part_Silli | 0x407e30 | **depth only** | 0 | black quad **0.8** | — |
| Part_Syrjakyla | 0x4081f0 | backdrop | 0, **unmodified** | — | (dead 2.38489796 s oscillator) |
| Part_Turska | 0x408460 | backdrop | 0, **pos = base, z += x** | — | period 0.88635204 s |
| Part_Viherio | 0x4087a0 | **skipped while strobing** | 0 | — | 14-entry table mod 7.090816327 s, 0.1 s windows |
