# EFFECTS — per-scene reimplementation spec

Decompiled sources: `re/out/ptct.c` (init functions, engine), `re/out/renderfuncs.c` and
`re/out/renderfuncs2.c` (render/trigger functions). Formulas below are from those files;
where a decompile is garbled the file/line to port from is cited. `t` = the effect's
elapsed time argument in **ticks (0.25 ms)** unless stated otherwise.

## Global conventions (apply to every scene)

- Fullscreen, letterboxed: `glScissor(0, h/12, w, 5h/6)` + `GL_SCISSOR_TEST` enabled once at
  startup. Rendering happens with **aspect = 1.0** projections onto a 4:3 screen — the
  original image is intentionally stretched; reproduce by rendering square and displaying 4:3.
- Each frame ends with `frameFlip` (`FUN_004121f0`): glFinish, swap, then
  `glClearColor(0,0,0,1); glClear(COLOR|DEPTH)` with scissor temporarily disabled, then
  MODELVIEW ← identity·translate(0,0,−0.1), fog off, `GL_COLOR_MATERIAL` on.
- 3D scenes each call `Mesh::draw` which sets `gluPerspective(camera.fov, 1.0, 2.0, 32768.0)`
  and `gluLookAt(pos → target, up=(0,1,0))` (up=(1,1,1) when the scene "tilted" flag is set —
  only eff1E), plus `glRotatef(−roll, 0,0,1)` before the lookat.
- 2D overlays draw a quad in `glOrtho(0,1,0,1,−1,1)` space (`FUN_004124a0(x,y,w,h)`; NOTE its
  vertex order is (x,y+h),(x+w,y+h),(x+w,y),(x,y) with uv (0,0),(1,0),(1,1),(0,1) — v is
  flipped).
- Textures: 256×256 RGBA from the ATG generator, GL_LINEAR min+mag, **no mipmaps**, wrap
  REPEAT. 16-bpp mode uses RGBA4 internal format.
- Lighting: no GL lights. `Scene::computeVertexLighting` bakes `ambient + Σ max(0,1−d/radius)·lightRGB`
  into per-vertex RGBA colors; the main pass emits `glColor4fv` per vertex.
- Detail/lightmap pass (`texFxMask&1`): second texture (default = procedural 128×128 radial
  spot, `DAT_00481f18`) applied with eye-linear texgen (S and T = eye X/Y), either via
  ARB_multitexture + EXT_texture_env_combine(ADD) in one pass, or as an additive second pass.
  In WebGL: a second UV set computed from eye-space x,y and additive blending.

## Texture index table (`DAT_0041d938[i]` = GL id; raw pixels kept for 7–12)

| i | file | i | file |
|---|---|---|---|
| 0 | 31.atg | 8 | cr_rob.atg (raw) |
| 1 | 13.atg | 9 | cr_inopia.atg (raw) |
| 2 | gizmozone2.atg | 10 | cr_oyise.atg (raw) |
| 3 | snq_steen2.atg | 11 | cr_snq.atg (raw) |
| 4 | 28.atg | 12 | cr_cs.atg (raw) |
| 5 | 18.atg | 13 | lucht.atg |
| 6 | 29.atg | 14 | ptct.atg |
| 7 | cr_ile.atg (raw) | | |

---

## eff0A — landscape flyover (00:00→10:00, layer 1)

init `FUN_00401490`, render `FUN_004016e0` (renderfuncs.c 78).
- Geometry: `genGrid(30, 3000, tex snq_steen2)` heightfield; per-vertex random stepped
  heights (`y = rand % (h/3/2+1) + (h/3)*2` with h halved below 400 — blocky city-like
  terrain; port loop at ptct.c 184–201). Face UVs ×8. Detail pass on (mask 1, detail = 31.atg).
  Fog dist 800, fog color 0xff0000 (red haze). Sky: `genSphere(13, 5500, tex lucht)`,
  cull inverted, UVs ×6.
- Camera: `r = 500 + 50·sin(t/9000)`, `a = t·0.000125`;
  target `(−sin a·r, 200, −cos a·r)`, pos `(sin a·r, r·√2·0.8, cos a·r)`, fov 130,
  roll `13·sin(t·0.0001)`. Sky sphere rotY = `t·0.00333` deg.

## eff12 — title board "please the cookie thing" (08:00→10:00, layer 2)

init `FUN_004091b0`, render `FUN_004092a0` (renderfuncs.c 1441), trigger `FUN_00409410`.
- `genGrid(3, 600, tex ptct.atg)` (4×4 verts flat board), cull off.
- Render: `glClear(DEPTH)`; board flat-colored white-ish with **per-frame random flicker**
  `v=rand&…` → color `v<<16|v<<8|v`, additive blend, flat-color mask (+0x44=4).
  Board rotation = `(−30 sin θ, 90+30 cos(1.123θ+2), −30 cos(1.123θ+2))` deg with
  `θ=(getTicks()−t0)·0.000157`; camera pos (10,−70,10), target (0,0,0), fov 160, roll 45.
  `t0` latches on first call; trigger resets it (not used by shipped script).

## eff13 — credits pixel-spray (04:00→08:00, layer 2)

init `FUN_00406140`, render `FUN_00406660` (renderfuncs.c 953) + custom draw callback
`FUN_00406280` (renderfuncs2.c 80, drawMode 0x10).
- Init: plasma image via `FUN_00401ca0(buf256², 0x2d, 4)` (radial exp-falloff plasma with
  value-noise angle modulation — port ptct.c 408–495) → GL texture `DAT_0041e968`.
- Render: store elapsed in `DAT_0041e964`; camera pos
  `(60·cos(t·5.26e−5)·? , 30·sin(t·6.57e−5), 10·cos(t·5.55e−5)−120)` (see 953–973),
  target (5,0,0); then Scene::render runs the callback:
- Callback (garbled decompile — port from renderfuncs2.c 80–231 + the raw-image sampling
  idea): binds the plasma texture, depth test OFF, additive blend; selects credit image
  `idx = (int)(…time…) % 7 + 7` (7..13; 13 ⇒ NULL/black — a "blank" slot in the rotation);
  loops i = 0..10999: pseudo-random screen-ish position from `sin/cos(i·stuff + t·3.03e−5)`
  scaled by the startup random table; samples the 256×256 **raw ARGB pixels** of the current
  (and previous — crossfade) credit image at that position; if nonzero draws a small textured
  quad (size ~1×1 units at z, uv full) colored by the average of the two images' texels.
  Net effect: a swarm of glowing plasma-textured quads that form each credit picture in turn.

## eff11 — twin warped tri-tubes (10:00→12:00, layer 1)

init `FUN_00405e70`, render `FUN_00405f80` (renderfuncs.c 885).
- Two `genTube(26, 3, 300, 5000, tex 31.atg)`; obj0 visible: cull=1, fog 600, detail pass
  (31.atg); obj1 = hidden source copy (drawMode 0). obj0 re-added so scene = [obj0,obj1,obj0].
- Per frame with `T = t·1.7`: camera target
  `(100·sin(T·0.000125), 100·sin(T·1.11e−4), 100·cos(T·7.69e−5))`, pos = −target,
  roll `−T·0.00588`; obj0 UV = obj1 UV·4 − `t·0.0005`;
  obj0 verts: `x' = x·(1+0.35·sin(z/120+x/130+φ))`, `z' = z·(1+0.35·sin(x/170+z/100+φ))`
  with `φ = t·0.0005` (exact coefficients in renderfuncs.c 940–946).

## eff10 — radial-wave pool (12:00→18:00, layer 1)

init `FUN_00407780` (ptct.c 2616), render `FUN_004078d0` (renderfuncs.c 1107),
trigger `FUN_004078b0` (texture switch, unused by shipped script).
- `genGrid(9, 10000, tex 28.atg)` with baked bump `y = A·(1−cos(√(x²+z²)·6.28e−4))`
  (A ≈ 2.2 scale, see ptct.c 2649–2659) + hidden UV-source copy. Two lights (radius 7000 and
  3000) at origin; vertex lighting baked at init.
- Per frame: camera pos (0, 5000, 0) (looking straight down at default target (0,0,0)),
  roll `t·0.0111`; UVs = source + `(t·6.67e−5, t·6.17e−5)`.

## eff15 — swinging tube-worm (12:00→14:00, layer 2)

init `FUN_00407bf0` (ptct.c 2876), render `FUN_00407e40` (renderfuncs.c 1156).
- 23 short tubes `genTube(5, 20, 70, 1000, tex 28.atg)` (UVs ×3 on v), one small sphere
  `genSphere(20, 1.4, …)` (additive head), camera at z=100 initially; 2 lights radius 40
  (white, pink).
- Per frame (`T = t/4`): the chain is re-posed head-to-tail: accumulated Euler angles
  `ax += 5·sin(−phase·8.33e−4)`, `ay += 5·cos(phase·6.67e−4)`, `az += 5·sin(phase·5e−4)`
  with `phase = T·0.6 − 300·segIdx − 43467·chainIdx`; each ring of 5 verts is placed via
  `eulerMatrix(ax°,ay°,az°)` (port renderfuncs.c 1183–1228 verbatim). Camera pos = last
  segment centroid ×0.833; light0 orbits (20 sin(T·0.001), 31.25, 20 cos(T·0.001));
  camera target `(6 cos(T·0.00025), 5 sin(T·0.00025), 6 cos(−T·1.85e−4))`; per-frame vertex
  lighting (`computeVertexLighting(0)`); fov 70.

## eff18 — 6-face marching-squares blob shells (14:00→18:00, layer 2)

init `FUN_004041a0` (ptct.c 1632), render `FUN_00404fb0` (renderfuncs.c 467),
field `FUN_00404d30` (ptct.c 2049), tessellator `FUN_00404550` (ptct.c 1787).
- One big dynamic mesh (69360 verts / 34680 faces cap, tex 31.atg, drawMode 5 =
  textured + wireframe overlay, cull off). Scratch: 17×17 scalar field (`DAT_0041e94c`),
  vertex-dedup maps.
- Per frame: iso threshold `DAT_0041d280 = max(0.1, 4 − t·3.33e−4)` (blob grows);
  `φ = t·8.33e−5`. For each of 6 cube faces (selector 0..5): fill field(u,v) = sum of six
  traveling sines of the normalized direction vector (port `FUN_00404d30` — it maps (u,v) to
  a point on a ±300 cube face, normalizes, then sums 6 sin terms with frequencies
  0.868–1.72 and phase φ); run **marching squares** per cell (`FUN_00404550`): cell corners
  ≥ iso emit corner verts, sign changes emit interpolated edge verts, fan-triangulate; then
  duplicate the whole vert/face batch (shell copy) and stitch **side walls** between shell A
  and B along contour edges. After each face: shell A verts are normalized and scaled to
  radius 550 (first half) / 800 (second half) with per-face axis swizzles — result: two
  concentric blobby shells connected by walls. UVs = vertex x,y ×0.00125.
- Blend: `musicGetPos` → if order < 16 normal, else **additive** (beat change at 16:00).
- Camera: dir = normalize(sin/cos waves ·200), pos = dir·950, target 0, fov 130; 3 light-ring
  verts rotate at radius 800. Scene rendered **twice** (double brightness).

## eff20 — jumping cloth-domes + ground (18:00→22:00, layer 1; clock restart at 20:00)

init `FUN_00408da0` (ptct.c 3243), render `FUN_00408f30` (renderfuncs.c 1354),
dome generator `FUN_00408610` (ptct.c 3025).
- 16 dynamic meshes (10×10 grid each, tex 28.atg, additive? no: drawMode 4, texFx flat? —
  `+0x40=4, +0x44=2` envmap pass, cull off, dynamic) at random positions
  `x = (i>>2)·3000−5000+rand%2000`, `z = (i&3)·3000−5000+rand%2000`, phase `rand%50`;
  ground `genGrid(10, 80000, tex snq_steen2)`.
- Per frame (`s = t/60`): dome i regenerated by `FUN_00408610(mesh, |cos((phase_i+s)·0.0314)|,
  flip = rand&1, x_i, z_i)` — a squashed hemisphere with rim skirt whose height/warp follow
  the squash parameter (port 408610 verbatim; it also builds two triangle-fan cap rows).
  Ground scrolls: world moves `z += 12·s`; ground UVs recomputed from vertex world coords
  ×4e−5. Camera: target (0,0,12s); pos = normalize(150·(sin s/72, cos s/85, sin s/90))
  ·(len+5000) + (0, 8000, 12s); fov 60.

## eff1D — greetings typewriter (18:00→22:00, layer 7)

init `FUN_004017e0` (ptct.c 230), render `FUN_004019eb` (ptct.c 325).
- 17 lines: "The Aardbei Machine marches on", "Greeting the following cookie-things:", "",
  3state, domage, haujobb, inf, infuse project, nosferatu, nostalgia, rash, replay, sub97,
  the black lotus, total eclipse, tpolm, twilight.
- Init: font Courier New 16px (`createFont(1,16,false,0)`); each line → 512×16 alpha buffer
  (`textToAlphaBuffer(str, buf, 0,0, 512,16, left)`) → GL texture; store `len[i] = strlen`.
- Render: 2D ortho, additive blend. `chars = t / 600` (1 char per 150 ms). For each line i:
  if `chars > 0` draw quad at x=0.05, y = `0.78 − i·0.04`, height 0.045, width
  `chars·0.015625` with u ∈ [0, chars·0.015625/0.05?]. Exactly: `drawTextQuad` uses
  `u_max = chars·(1/64)` and width = same ×(screen scale) — port `FUN_0040192c`+`FUN_004019eb`
  (uv u == width value; the 512px texture holds 64 char cells of 8px). Then
  `chars -= len[i]` before the next line — a sequential typewriter down the list.

## eff0D — lightgrid floor + ceiling (22:00→24:00 and 30:00→32:00, layer 1)

init `FUN_004066f0` (ptct.c 2260), render `FUN_004069c0` (renderfuncs.c 1001),
trigger `FUN_00406960` (texture/speed switch — not used by shipped script).
- Two `genGrid(15, 600, tex 18.atg)` at y = −20 (floor) and +20 (ceiling), cull off, UVs ×6;
  plus two hidden UV-source grids. All vertex colors white; **9 lights** radius 60 at origin;
  speed constant `this+4 = 5000.0`.
- Per frame: floor UV = source + `(t/(speed·1.5), t/(speed·0.66))`, ceiling likewise from its
  source; camera pos `(−4 sin θ, −4 cos(θ+2), −4 cos θ)`, target ×(−25) of that
  (`θ = t/speed`), fov 140, roll `t·0.005·(0.25)`… (`fVar5·0.005` with t in ticks —
  see renderfuncs.c 1063–1073); light ring: 9 lights at radius `(rand_i&0x7f)+10`,
  `y = 20·sin`, orbiting with `t·6.67e−4`; **per-frame vertex lighting** (ambient 0) —
  this is the classic moving-lights-on-grid look. `glClear(DEPTH)` after.

## eff21 — pulsating cos-blob sphere (22:00→24:00, layer 2)

init `FUN_00401a80` (ptct.c 356), render `FUN_00401b70` (renderfuncs.c 112).
- `genSphere(35, 100, tex 31.atg)` + detail pass (31.atg), dynamic; base verts saved.
- Per frame: `R = 30+20·sin(t·1e−4)`, `φ = t·3.33e−4`;
  scale_i = `0.6·(1.5 + 0.7317·(cos(x/R+φ)+cos(y/R+φ)+cos(z/R+φ)))` per vertex (xyz = saved
  base); rotation `(t·0.0167, t·0.02, t·0.0111)` deg; camera pos (0,0,225), target 0.

## eff19 — Lissajous tunnel ribbon (24:00→26:00, layer 1)

init `FUN_00402ec0` (ptct.c 830), render `FUN_00403410` (ptct.c 1042),
mesh `FUN_004030b0` (ptct.c 925), path `FUN_00402f90`/`FUN_00403020` (tangent) at 877/901.
- Dynamic mesh (1000 verts / 2000 faces? — 800 verts, 760 faces used, tex 28.atg), fog 200
  color 0x3f0000, light radius 420 at origin; `+0x44=2` envmap pass, cull=1?? (see init).
- Path `P(u) = (400·sin(2·0.0785u) + 100·cos(0.4·0.0785u), 400·cos(3·0.0785u) +
  100·sin(0.7·0.0785u), 0)`; per frame the tube is rebuilt: 20 rings at `u = i + t/600`,
  40 verts/ring, ring radius `40·(0.9 + 0.4·sin(ringIdx·0.55))·(sin lattitude)` oriented by
  the path tangent (port 4030b0). Camera: eye `P(s+3)`, target `P(s+4)`, light `P(s+5)` with
  `s = t·0.0025`; fov = 60 + t·0.001; per-frame lighting; `glClear(DEPTH)` first.

## eff1E — rotating-rings bounce (26:00→27:end, layer 1)

init `FUN_00407470` (ptct.c 2561), render `FUN_00407570` (renderfuncs2.c 7).
- 12 spheres `genSphere(5, r)` with radius 500,650,…,2150 (step 150), alternating textures
  18.atg / 31.atg, **additive**, colors 0x01f1f1f5 / 0x5f5f5f5f, texFxMask=4 (flat color);
  scene "tilted" flag set → gluLookAt up=(1,1,1).
- Per frame: camera pos (0, 4200, 0) (looking down), roll `t·0.0143`;
  ring i rotation° = `(250·sin⁴s, 208·cos⁴s(signed), 331·(cos s)³·|cos s|)` with
  `s = (t + 200·i)·1e−4` (signed 4th powers: `sin³·|sin|`);
  brightness `v = max(100, |…|)` → all ring colors = grey v (port lines 27–74);
  beat: `musicGetPos` — while order 26 rows 0–15 (and again rows 32–47 via `(row&0x1f)<0x10`)
  and order 27 rows 0–15, camera y += `(v·5−100)·10` — the whole tunnel slams downward on
  each half-pattern.

## eff0C — triple-tube flight (27:63→30:00, layer 2)

init `FUN_00408120` (ptct.c 2966), render `FUN_00408300` (renderfuncs.c 1254).
- Tubes along Y (length 6000, at y=3000): [0] `genTube(21,3,300, 28.atg)` cull=1;
  [1] `genTube(19,3,100, 29.atg)` additive, cull off; hidden UV sources [2],[3];
  [4] `genTube(19,3,270, 29.atg)` additive?, cull=1. 4 lights radius 900 at y=−10000
  (baked white). Fog dist 800 set on [0]/[1] in render.
- Per frame (`T = t·0.8`): `glClearColor(fogColor of obj0)` + full clear;
  camera pos `(170 sin(T·5e−4), 3000, 170 cos(T·5e−4))`, target = pos −
  `300·(sin(T·5.84e−5), cos(…)+? , cos(T·5.84e−5))` at y 3000−300·cos → gentle look-ahead;
  fov 120, roll `t·0.0143`; UV v = source·5 − `t·3.33e−4` on both visible tube pairs;
  16 lights streaming: `z = 6000 − ((t+rand_i·0x51)/6 mod 6000)`, x/y = 300·sin/cos
  (port renderfuncs.c 1327–1342 — these write scene light positions).

## eff1F — morphing cylinder (27:63→30:00, layer 3, drawn over eff0C)

init `FUN_00401000` (renderfuncs.c 3), render `FUN_004013d0` (renderfuncs.c 51),
mesh `FUN_004010c0` (ptct.c 6).
- Dynamic mesh (1000 verts/2000 faces, tex 31.atg, detail 13.atg, drawMode 4, texFx detail=1,
  cull=0(front)); regenerated per frame by `FUN_004010c0(mesh, k, t)`:
  25 rings (z −180…+195 step 15) × 40 verts; ring center wobbles
  `(20 sin(c), 20 cos(c))` with `c = 0.157·(ring·(1/3?) + t·0.0025·k…)` and ring radius
  `r = (|sin((vert+φ)·0.2356)|+1)·0.5·(sin/cos vert·0.157)` — port 4010c0 verbatim
  (`k = 8 + 2·sin(t·0.0005)` passed from render). UV grid 0.1/unit.
- Render: `glClear(DEPTH)` (so it always draws over the tubes); mesh rotation
  (90,0,0); camera pos (−100,0,300), target (−100,0,0), fov 60.

## eff1A — spiky blob flower (30:00→32:00, layer 2)

init `FUN_00402a90` (ptct.c 661), render `FUN_00402de0` (renderfuncs.c 434),
mesh `FUN_00402b50` (ptct.c 707).
- Dynamic mesh (4000 verts / 8000 faces, tex 28.atg, drawMode 4, texFx envmap=2, cull=1).
- Per frame: `FUN_00402b50(mesh, 8+2·sin(t·5e−4), t·5e−4)` rebuilds a radial "flower":
  50 petal rows × 25 verts, radius modulated by `sin` products with amplitude
  `0.99+…·sin(θ)·0.2`, petals attached at ±120/72 lattice (port 402b50); mesh rotation =
  `(1.5, 1.9, 1.212)·t·0.005·(0.25?)` — `fVar3 = t·0.005` then ×1.5/1.9/1.212 (degrees);
  camera pos (255,255,255)·? — `FUN_00416ee0(cam, 0x437f0000=255…)`, target (10,10,10),
  fov 60; `glClear(DEPTH)` first (draws over eff0D).

## eff1C — streak field (32:00→end, layer 3)

init `FUN_004025c0` (ptct.c 591), render `FUN_00402a50` (renderfuncs.c 419) + custom draw
`FUN_00402750` (renderfuncs2.c 236, drawMode 0x20).
- Init: empty mesh (drawMode 0x20 = callback), cull off; random tables: 64 xy pairs
  `DAT_0041d730/DAT_0041d830 ∈ (−500..500)·0.05`, 4 streak params `{x%240, y%240,
  0.5+rand·5e−4·1000}²` at `DAT_0041d5f0`.
- Render: camera pos (0,0,200), target 0; callback draws (additive, no depth, plasma texture
  `DAT_0041e968`): 4 groups × 64 quads; group g, quad i at
  `x = X_i·A_g·sin((T+g·φ)·0.0021123)·sin((i·7+w)·f_g·0.002) − off_g` (similar for y with
  cos and 0.0026123/0.002443), where `T = getTicks()·0.1`, `w = 5+2·sin(T·0.001)`;
  color bluish ramp `(i·0.0119+c_g, i·0.0119+0.2, i·0.01+0.5)·k`; quad size ~grows with i.
  Port from renderfuncs2.c 236–325 (decompile is register-garbled; keep structure: 4 layers
  of 64 additively-blended textured quads swirling around the center).

## eff3C — "p l e a s e   i t" flashes (armed 00:00→26:00 layer 99; TRIGs at 24:00–25:63)

init `FUN_00402330` (renderfuncs.c 282), render `FUN_00402490` (renderfuncs.c 372),
trigger `FUN_004021f0` (ptct.c 576).
- Init: 40 slots (4×10) all with the string `"   p l e a s e   i t"`; font Arial 32
  (`createFont(0,0x20,false,0)`); each slot: 256×32 alpha buffer → `textToAlphaBuffer(str,
  buf, 0, −4, 256, 32, left)` → `blurGrayscale` → GL texture. Random positions per slot:
  `x,y = 0.25 + (rand&0xff)/512` (0.25..0.75).
- Trigger(param): `flashTime[param] = getTicks()` (param 0..0x13 in the script — only the
  first 20 slots ever flash).
- Render (every frame while armed): additive blend; for each slot with `flashTime != 0`:
  `age = (now − flashTime)·2`; envelope `e = 1 − age·1.25e−4`; if e ≤ 0 clear slot; else
  `b = 0.5 − 0.5·cos(2π·e)` (smooth in-out), `s = 800/(age+8)` (shrinks fast);
  draw the text texture at `(x−2s, y−0.35s)` size `(4s, 0.7s)`, color grey `b`.

## eff46 — end logo fade (32:00→end, layer 4)

render `FUN_00405d70` (renderfuncs.c 850), trigger `FUN_00405e60` (stores a byte, unused).
- `b = 1 − 2·(t·2e−5 − 0.5)` = `2 − t·4e−5` (starts saturated white, reaches 0 at
  t=50000 ticks = 12.5 s); if b ≥ 0: additive blend, bind **gizmozone2** texture, color
  (b,b,b), draw full-screen quad **twice** (double exposure).

## 2D overlays 0x32–0x38 (`renderfuncs.c` 724–845 + disasm)

All: `glDisable(TEXTURE_2D)`, depth test off, blend SRC_ALPHA/ONE_MINUS_SRC_ALPHA,
full-screen quad; skip when alpha ≤ 0. t in ticks:

| id | color | alpha |
|---|---|---|
| 0x32 (405840) | white | `1.0 − 0.0002·t` (1.25 s flash) |
| 0x33 (405980) | black | `1.0 − 0.0002·t` (fade-in from black) |
| 0x35 (405a10) | black | `1.0 − 0.00001·t` (25 s veil over the intro) |
| 0x36 (405aa0) | black | `0.7 − 0.0002·t` |
| 0x37 (4058e0) | white | `0.7 − 0.0002·t` |
| 0x38 | — | no-op |

0x34 (`FUN_00405b30`, renderfuncs.c 786): builds once a 32×32 texture: black with one
horizontal + one vertical line of 0xafafafaf every … (grid cross); then **additive** blend;
3 layers `L=0..2`: brightness `(1 − t·3.75e−4)/1.5^L` (stop when ≤0), rotation
`θ = t·2.5e−4`, draws a rotated quad via `FUN_004125b0` with corners at angle
θ, θ+π/2, θ+π, θ+3π/2 (spinning, zooming grid flash). `t` decreases 200/layer.

## Loading screen (before the script runs)

`FUN_00406c40` + `FUN_00406d80`: 25 flat-shaded cubes (half-size 100, color 0x1f1f1f,
drawMode 2) in a row (rotation x = i·14.4°), plus per-cube random point offsets; progress p
(0..1 across music synth + texture generation callbacks, then a 2.5 s minimum wait) shows
cube i iff `i ≤ p·25`; camera pos (300, 0, p·k−600), target (0,0,p·k), roll 90.

---

## CORRECTIONS (found during JS port, verified against binary/disassembly)

- **Texgen passes (global)**: glTexGeni mode is 0x2402 = **GL_SPHERE_MAP** (not eye-linear);
  the draw path emits per-vertex normals (mesh+0x20). Both detail (mask 1) and envmap
  (mask 2) passes sphere-map. Fog is GL_EXP with density = 1/fogDist (see scene.js).
- **eff0A**: height formula (from disasm 0x4015b9): `h = trunc(sqrt(x²+z²)); if (h<400)
  h/=2; y = rand31() % (h/3/2+1) + (h/3)*2`.
- **eff10**: bump amplitude is **2500.0** (not ≈2.2 — that constant belongs to eff20's
  dome generator); init ambient = 0x3f3f3f grey.
- **eff0C**: 4 streaming lights (0x41f834..0x41f844), not 16; visually inert (no vertex
  lighting baked in this effect). Clear color: obj0 fog color = black (+0x54 never written).
- **eff20**: `jump = trunc((phase+s)·0.01)` → z += jump·1200; `flip = trunc((phase+s)·0.02)&1`;
  rand31 order per dome: x, z, phase.
- **0x34 overlay**: texture is 16×16 (0x400 bytes), row 0 + column 0 = 0xAFAFAFAF.
