# Energia sequencing and data separation

## Conclusion

Energia is a hybrid. It does not contain an embedded standalone script file or
script bytecode. It has:

1. a regular compiled effect manager containing four timed `.exp` scene
   instances; and
2. additional master compositing/cut logic written as compiled time-range
   tests in the frame function.

The important recovery boundary still survives:

```text
MP3 playback + performance counter -> current seconds
                                      /             \
                          four-entry manager    compiled phase gates
                                  |                    |
                          external .exp tracks    effect functions
                                  \                    /
                                    textures/raw maps
```

Geometry, materials, cameras, and scene keyframes remain external in `.exp`.
The show-level edit and more of the secondary effect automation are linked into
`Energia_FIXED.exe`, making Energia less data-driven than Wonder but not
monolithic.

## Clock

Energia starts the MP3 through BASS and uses `QueryPerformanceCounter` for show
time. Its imports include BASS stream creation/playback operations but no
playback-position query, so elapsed wall-clock time is the master clock rather
than a music-row or external sync stream.

Relevant executable locations:

- `0x40e66c` and `0x40e67c`: initialize performance-counter timing
- `0x40e6cd`: start `RinneRadio-Helsinki_[Crankshaft.mix].mp3`
- approximately `0x40eaaa`: update current time
- `0x55a1ac`: current time in seconds
- `0x40ebe9`: invoke the regular effect manager

Energia has no `.env` assets corresponding to Wonder's retained sync and
parameter curves.

Waveform correlation establishes the visual-reference mapping as show/media
time = capture time + 3.023 seconds, with no measurable drift. The executable
and browser both start the MP3 at media time zero; this offset belongs only to
capture comparison. See `../reference/README.md`.

## Regular scene-effect manager

The manager at VA `0x4031a0` has the same machine-level design as Wonder: it
checks the current time against the start/end floats stored in each effect
object, then invokes the object's virtual render method with local time.

Startup registers four scene objects between VAs `0x40db0c` and `0x40dfdb`:

| # | start (s) | end (s) | external scene | object vtable |
|---:|---:|---:|---|---:|
| 1 | 56.000 | 82.000 | `kurwa2_.exp` | `0x43765c` |
| 2 | 82.000 | 122.000 | `kurwa.exp` | `0x43765c` |
| 3 | 136.000 | 157.000 | `scene6.exp` | `0x437658` |
| 4 | 56.000 | 82.000 | `freak.exp` | `0x43765c` |

The overlapping 56--82 entries are intentional layers, not duplicate archive
entries. `nowheretorun.exp` is also explicitly loaded by separately constructed
code around VA `0x413342`; it is not part of this four-entry manager.

## Hardcoded master phase gates

The frame callback beginning around VA `0x40eb50` contains a sequence of
floating-point interval tests and direct effect/compositor calls. These are
compiled equivalents of timeline clips. Representative recovered ranges are:

| range (s) | observed compiled action |
|---:|---|
| 0--56 | early renderer/compositor calls (`0x411e10`, `0x410470`) |
| 56--157 | call effect function `0x410f90` |
| 233--290 | combine `0x410f90` and `0x410470` |
| 12--19 | select texture `D2_3.jpg` |
| 19--31.5 | select texture `D4_4.jpg` |
| 31.5--44 | select texture `D2_2.jpg` |
| 44--56 | select texture `D4_1.jpg` |
| 44--82 | compositor/effect mode 2 |
| 0--56 | timed call to `0x40f070(t, kalju3512.jpg, 4.0)` |
| 0--56 | call `0x40c6f0(t-6)`, then compiled logo overlay `0x412750(t)` |
| 82--136 | reuse `0x411e10(0)` and `0x410470` |
| 122--132 | timed call to `0x40f070(t, sc2.jpg, 122.0)` |
| 132--157 | compositor/effect mode 4 |
| 156--182 | timed overlay through `0x413050` |
| 182--233 | effect `0x410f90`, mode 3, and timed overlay |
| 233--290 | timed call to effect function `0x40f570` |

These ranges overlap because they control independent visual layers. They
should not be flattened into one mutually exclusive scene list. Exact boundary
constants live in the executable's read-only data near VAs `0x437608` through
`0x437640`; the dispatch code identifies which function or texture each range
controls.

## Recovered 0–56 second renderer

Ghidra's indirect-call recovery drops several OpenGL arguments in this code,
so the first browser pass was transcribed from the x86 instruction stream and
checked against the decompilation:

- frame dispatch `0x40eb76–0x40eb83` calls `0x411e10` with 82.0, then
  `0x410470`, while current time is in the 0–56 gate;
- initializer `0x4119e0` binds `dust.jpg`, `back_gradient.jpg`, and
  `wave1.raw`; `0x411ba0` constructs the displaced grid;
- the two grid dimensions are `round(sin(t*.853)*14+24)` by
  `round(sin(t*.9854)*14+24)`, then
  `round(sin(t*2.853)*10+40)` by
  `round(sin(t*2.9854)*10+40)`;
- the camera interpolation boundaries are 0, 6, 7, 12, 45, 46, and 66
  seconds after subtracting the 82-second function parameter. Its two keyed
  channels and sinusoidal offsets are retained in
  `web-energia/js/effects/wave-field.js`;
- initializer `0x410220` creates a 25-by-25-by-25 lattice. Renderer `0x410470`
  evaluates four compiled sinusoidal radial sources, subtracts 2, and draws a
  `dot.jpg` quad when `round(field*.1) > .21`; the quad half-size is
  `field*.1`;
- startup `0x40d9e1–0x40da55` establishes the direct filename/global map for
  the four design cuts. `0x410080` renders the selected full-screen texture
  with `glBlendFunc(GL_ONE_MINUS_SRC_COLOR, GL_SRC_COLOR)`, visible as the
  literal pushes at `0x41013a–0x410144`.

The renderer is therefore no longer backed by the `nowheretorun.exp`
diagnostic during 0–56 seconds. It is address-derived but not yet
reference-signed-off.

## Recovered compositor mode 2

Raw dispatch at `0x40eccf–0x40ece9` proves that mode 2 is invoked only for
`44 <= t < 82`. The mode dispatcher at `0x406dc0` selects vtable `0x4372ec`;
that class is a standalone particle system, not an EXP scene:

- `0x408400` allocates a 4,000-particle pool and two emitters with masses 1
  and 2;
- both emitters use the exact `0.00400000019` interval (250 particles/second),
  initial template position `(10,10,10)`, and velocity `(-10,0,0)`;
- `0x408680` gives emitted particles a five-second lifetime and radial
  velocity `(-50*cos(pi*t*8), 0, -50*sin(pi*t*8))`, where `t` is each
  individual absolute emission timestamp;
- force objects retain center `(50,50,50)`, strength `-50000`, an origin
  steering force of 1, and a 1,000-unit kill bound;
- `0x4071e0` stores `0x3d2aaaab` (`1/12`) as a maximum integration step;
  shorter display intervals are integrated directly rather than accumulated
  into a fixed-rate clock;
- `0x408740` rotates the force center by 10 degrees per displayed frame before
  advancing the particle system, making the original trajectory frame-rate
  dependent;
- `0x4087a0` submits consecutive particle vertices as paired `GL_LINES` in
  three additive passes with line widths 1, 4, and 12. Particles with at least
  one second remaining are
  `(0.8,0.8,0.8,0.161)`; the final second fades through
  `(0.8,0.28,0.18,lifetime*0.161)`;
- camera data at `0x43e908` is seven keys from local seconds 0 through 30.
  `0x406ed0` applies those six channels as translation, X/Y rotation, and a
  final Z translation under a 90-degree, 1-to-2,000 projection.

`web-energia/js/effects/mode2-particles.js` translates the class and reconstructs
the supplied reference capture's 30 fps display cadence for deterministic
seeking (all 30 encoded frames in the inspected section are distinct). Because
WebGL often clamps native line width to one pixel, the renderer clips and
expands the three native widths into screen-space quads while preserving
endpoint colors.
The layer is executable-derived but still awaits reference-difference signoff.

## Recovered compositor mode 4

Raw dispatch at `0x40eee8` selects mode 4 for `132 <= t < 157`. Dispatcher
`0x406dc0` enters vtable `0x437314`; constructor `0x409240` builds a second
standalone particle system and loads `sotku2.jpg` plus `water2.jpg`:

- the emitter is at `(0,-50,0)`, has interval `0.10000000149`, is capped at
  80 live particles, and gives each particle lifetime 5, mass 10, and velocity
  `(-50*cos(pi*t*8),0,-50*sin(pi*t*8))`;
- gravity contributes acceleration `(0,-150,0)`. Collision bounds are
  `+/-80` with restitution `.7`; a bottom collision after the `.25`-second
  clock adds 120 to Y and a compiled repeating kick-table value times 3 to X
  and Z. The increment-before-index behavior includes the eleventh float at
  `0x43f1a8` before wrapping;
- the generic `1/12` maximum physics step and the executable's
  position-before-velocity integration order are retained. Deterministic
  seeking reconstructs the reference capture's 30 fps display calls;
- seven TCB `.25` camera keys at `0x43eef0` cover local seconds 0 through 24.
  `0x406ed0` applies translation, X/Y rotation, and Z distance 120 after the
  compositor-wide `glScaled(1,1,-1)`. The same missing Z reflection was also
  restored to mode 2 after tracing the raw call at `0x406f67`;
- `0x404610` evaluates a 32-cubed field over `-115..115`. Particles inside
  squared radius 1024 contribute `1-distanceSquared/1024`, and the surface is
  extracted at `.5`; field-weighted outward normals are normalized;
- normalized field vectors double as three-component texture coordinates.
  The texture matrix is
  `T(.5,.5,0) * S(.7400000095) * Rx(cameraX) * Ry(cameraY)`;
- the surface renderer uses the dark `sotku2` GL_ADD pass, repeats the same
  triangle index stream as opaque black `GL_LINES`, then binds `water2` but
  disables texturing and draws a black shell under a model-view scale of
  `2.0999999046`. The unusual dark body, sparse highlights, triangle lines,
  and displaced black masses all survive in the aligned 720p reference.

`web-energia/js/effects/mode4-metaballs.js` ports those constants and states.
The native 256-by-16 signed marching-cubes triangle table survives at
`0x43a5e0`; its standard cube corner/edge numbering matches the eight case
tests at `0x404d00`. `FUN_004043e0` emits each table triple as edges 0,2,1,
giving inward object-space winding which the compositor's `glScaled(1,1,-1)`
reverses before default back-face culling. The opaque line pass feeds this same
index stream to `GL_LINES`, pairing consecutive indices rather than outlining
all three triangle edges. The checked extractor
`tools/extract-energia-mode4-table.mjs` reproduces the browser table from the
preserved executable; its packed signed-byte SHA-256 is
`19bf7699e214903d72c94c296546f2e31337d637a1e4b118c3108a0f428e809b`.
Camera, simulation snapshots, exact topology/winding, GL state, and the
complete 300-frame show sweep are covered by tests.

## Recovered main triangle effect `0x410f90`

The common base called during 56–157, 182–233, and 233–290 is generated wholly
in code. `0x410f90` invokes `0x410cf0` twice; each invocation resets MSVCRT
`rand()` to seed 1 and emits 150 indexed triangles. The two halves span
`(-300,-360,0)` to the origin and the origin to `(300,360,0)`, with a compiled
`(0,0,1)` direction. Their endpoints use
`sin(i*.04+t)*400+100` and `sin(t*4+i*.2)*500`, while the third vertex adds the
exact `((sin(t*.3)*15)+40)*(rand/32767-.5)` width term.

The renderer uses `glFrustum(-.5,.5,-height/width*.5,height/width*.5,1,5000)`.
Its eye is `(sin(t*.12)*180,0,sin(t*.12*.58)*100-360)`, looking at
`(0,-30,0)` with roll `t*.12`, followed by translation `(0,-100,0)` and an
X rotation of `t*.12*30` degrees. The roll-capable matrix convention is the
helper at `0x401050`, translated directly rather than approximated with an EXP
camera.

Six identical alpha-blended passes are drawn after another `srand(1)`. The
resulting native CRT sequence makes the first pass
`(0.7411765,0.3137255,0.1137255,fade)` and the remaining five black at alpha
`0.51`. Fade is `clamp((t-56)*.15)` and is multiplied by `.21` only for
`157 < t < 194.5`. `web-energia/js/effects/main-triangles.js` preserves those
constants, the 300-triangle topology, and native gate reuse.

## Recovered `0x413050` and compositor mode 3

The late overlay runs from 156 through 233 seconds in two modes. Its managed
scene is not a conventional timeline instance: initializer `0x4133e0`
constructs a 16-by-16 array of all 256 `Box` meshes from
`nowheretorun.exp`, supplies a custom matrix to each animation controller, and
multiplies that matrix by the sampled mesh transform. Mode 1 uses
`yellowshitred.jpg`, local time `t-156`, opacity `.243`, and frame
`local*10`; mode 3 restarts local time at 182, substitutes `sc2.jpg`, and uses
opacity `.343`. Both retain disabled depth writes, the material U animation,
and the centered texture-matrix rotation of 24 degrees per absolute show
second.

The subsequent helper beginning at `0x413db0` builds 32 independent line
strands. Each strand evaluates five compiled sinusoidal control points through
a zero-TCB, five-key Hermite track and emits 34 segments with the native
64-entry orange-to-blue gradient, alternating color entries, and MSVCRT jitter
stream. The executable submits one 6,528-vertex, width-three additive
`GL_LINE_STRIP`; the WebGL port clips and expands it to three-pixel quads where
the implementation exposes only one-pixel native lines. Mode 1 and mode 3 use
the original `.243` and `.343` scene opacity scales while the line alpha
remains `.1`.

Mode 3 itself is vtable `0x437300`, initialized at `0x4089f0` and rendered by
`0x4090a0`. It is a standalone 2,197-particle deformation, not script or EXP
animation:

- `0x408ca0` lays out a 13-by-13-by-13 grid over the native sequence beginning
  at `(-300,300,-300)` with step `600/13`;
- modifier `0x408880` applies
  `(rest-position)*100 - velocity*20`. Two `0x407a80` radial fields follow it:
  the first has dynamic strength `sin(t*1.11)*6000+18400` and center
  `(sin(t*1.234)*200, cos(t*.32456)*200, sin(t*.874)*200)`; the second keeps
  strength `-8400` and center
  `(sin(t*1.7)*-40, cos(t*.7)*-75, sin(t*.34)*69)`;
- the generic particle system's `1/12` maximum step and
  position-before-velocity Euler order are retained. Field positions update
  once per display call, so deterministic seeking reconstructs the aligned
  capture's 30 fps cadence;
- ten `.25`-TCB camera keys at `0x43eb78` cover local seconds 0 through 36 and
  feed the same compositor-wide 1-to-2,000 frustum and Z reflection as modes 2
  and 4;
- `0x408da0` walks the grid as 169 thirteen-vertex `GL_QUAD_STRIP` rows and
  another 169 `GL_TRIANGLE_STRIP` columns. The last radial distance cuts a
  transparent hole below field `.04`; visible vertices are additive orange at
  alpha `.2`/`.25`, restored after a hole at alpha `.5`;
- `0x408f60` adds eleven 24-vertex triangle strips from the first Z slice,
  using raw cross-product normals. `0x4090a0` enables S/T sphere-map texgen and
  `GL_NORMALIZE`, binds `skymap.jpg`, culls front faces, and draws the sheet at
  white alpha `.9` before disabling texgen again.

`web-energia/js/effects/mode3-lattice.js` translates the camera, float32
simulation, both native strip families, the pool-allocation-dependent surface
normal, and fixed-function state. It is drawn after `0x410f90` and before the
box/line overlay, matching the native master-frame order. Camera/simulation
snapshots, exact expanded triangle counts, MiniGL normalization, and full-show
browser sweeps are covered by tests. Reference difference/signoff remains
open because the surviving capture has strong glow and motion smear.

## Recovered repeated cylinder effect `0x40f070`

Raw call-site stack layout resolves the three arguments as current absolute
time, a texture object, and a phase-start time. The same function is called in
two disjoint gates: with `kalju3512.jpg` and start 4 during 0--56 seconds, then
with `sc2.jpg` and start 122 during 122--132 seconds. The 82--136 dispatch is
not this function; it is a second call to the already recovered wave/dot pair.

The constructor builds a 150-by-150 cylinder through `0x4031f0`: 150 axial
rings, 150 radial segments plus a duplicated seam, radius 80 and nominal
length 500. Its 22,650 vertices and 44,700 triangles are linked through two
height-map modifiers. `wave1.raw` scrolls by `(t*42,t*63)` at UV scales `(2,1)`
with amplitude 223; `twirlB.raw` then applies UV scales `(4,3)` and amplitude
64. `0x403a30` samples both 256-square maps bilinearly using the executable's
255-period indexing and displaces each vertex radially.

`0x40f070` draws the deformed mesh five times at each of three compiled
placements. Each copy is scaled by `.9` and receives three time-varying
rotations before the next copy. The passes retain the native additive
`SRC_ALPHA, ONE` blend, alpha `0.1589999944`, disabled depth writes, enabled
depth test/culling, and the executable's 1-to-5,000 frustum. The browser keeps
the deformed vertex buffer and static normals/UV/index buffers resident so the
15 native draws do not re-upload 670,500 triangles per frame.

`web-energia/js/effects/hardcoded-cylinder.js` is instruction-derived and
covered by mesh, modifier, placement, and timeline tests. It still awaits
reference-difference signoff together with the other 0--56 overlay calls.

## Recovered Sunflower logo overlay `0x412750`

The 0--56 opening dispatch calls this overlay after `0x40c6f0`. Its effective
envelope makes it visible from 6 through 18 seconds. The sharp `s.raw` and
blurred `sb.raw` 512-by-128 RGB images are centered in an orthographic pass
with additive `SRC_ALPHA, ONE` blending. From local time `t-6`, the mix clamps
at `(local-5)*.4`: the quad contracts from 800 by 100 to 420 by 75 while the
blur contribution falls away. Alpha is
`clamp((local-5)*.054) * clamp(local*.5) * (1-clamp(local-11))`.

`web-energia/js/effects/sunflower-logo.js` preserves the draw order (sharp,
then blur), dimensions, envelope, and disabled depth/cull state. Exact state
snapshots at the envelope and mix boundaries are covered by runtime tests.

## Recovered opening dot design `0x40c6f0`

The master calls this function with `t-6` after the opening cylinder and before
the logo. Raw x86 is necessary here: the indirect OpenGL calls make Ghidra
lose the live x87 values and report color bytes as coordinates. The actual pass
uses `dot.jpg` with exact `glOrtho(0,1024,768,0,-1,1)` top-left design
coordinates, disabled depth/culling, and the unusual additive
`SRC_COLOR, ONE` blend. The reversed bottom/top pair is local to this 2D pass;
it is not a managed-scene or MiniGL-wide screen-axis convention.

One native `GL_QUADS` block contains 43 textured marks. Five 64-unit marks are
centered at x=320 and y=88, 164, 240, 315, and 391, with a one-sixth sinusoidal
size modulation. Eight instruction-identical loops then form paired columns:
five marks at each of x=247/389, five at x=193/444, six at x=155/482, and three
at x=130/508. Their centers, steps, sinusoid rates, phases 1234/7654 (and
11234/17654), byte colors, and half-sizes are transcribed in
`web-energia/js/effects/opening-dots.js`.

The layer begins fading after show time 18 through five compiled clamp channels
with rates .5, .45, .4, .35, and .3; the last visible byte colors disappear a
little after 21 seconds. The native empty second quad pass is omitted as
geometry but its final blend/depth-write state is retained. Layout and fade
boundary snapshots are covered by runtime tests.

## Recovered late cylinder effect `0x40f570`

The 233--290 gate calls this layer after the common `0x410f90`/`0x410470`
pair. Startup associates it with `kalju3512.jpg`, `DISP2.raw`, and
`wave1.raw`. Its generalized cylinder builder is invoked with 40 axial and 40
radial segments; linked modifiers therefore share the same 1,640-vertex,
3,120-triangle topology.

The first modifier samples `DISP2.raw` with absolute scales
`10*sin(t*.1)` and `3*cos(t*.16)`, scrolls by `(t*32,t*53)`, and has amplitude
64. The second samples `wave1.raw` with the scales exchanged, the same scroll,
and amplitude 114. Both retain the executable's bilinear 255-period sampling.
The squared normalized wave sample is also written into the fourth vertex
channel consumed by the native per-corner colors.

`0x40f570` translates by -700 on Z, rotates by `t*32` degrees around
`(0,1,1)`, applies the native 180-degree X basis turn, and submits six
`SRC_ALPHA, ONE` draws separated by 30-degree Y rotations. The three repeated
corner channels use alpha `.9`, `.31`, and `.531`, with the third brightness
halved. `web-energia/js/effects/late-cylinder.js` translates these instructions
directly; state/topology tests and fixed-time browser captures cover the full
gate, although the surviving reference video ends during it.

## External versus compiled data

External and recoverable without decompiling effect code:

- `.exp` object meshes, materials, cameras, hierarchy, and keyframe tracks;
- JPEG textures and headerless raw auxiliary maps;
- the MP3 soundtrack.

Compiled into the executable:

- the four-entry top-level scene schedule;
- the overlapping phase/cut/compositor intervals above;
- procedural effect implementations and their literal parameters;
- associations made directly by filename strings in constructors.

No evidence was found for a second packed script inside `demo.dat` or the PE
resources. Restoration will require translating the interval ladder into a
declarative timeline, but the constants and call boundaries make that
translation mechanical before individual effects are fully understood.

The recovered ladder and managed scenes are encoded in
`web-energia/js/show-data.js`; `EFFECT_STATUS.md` records which layers currently
have scene/texture scaffolds and which still need their compiled procedures.

## Lead from the Tesla source bundle

The later source snapshot's `Demo/Smasher/EffManage.cpp` and `Smasher.cpp`
provide source-level examples of this design: `AddEffect` stores an effect plus
literal start/end values, and `PlayEffects` calls active effects. They help
interpret Energia's manager, while the additional frame-level gates remain an
Energia-specific complication. This is structural guidance, not evidence that
Tesla's shipped Yoghurt engine shares Energia's runtime lineage.
