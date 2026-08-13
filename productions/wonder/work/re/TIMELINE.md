# Wonder sequencing and data separation

## Conclusion

Wonder does not contain an embedded bytecode or text script that can simply be
unpacked from the executable. Its master effect list is C++ data compiled into
the executable: startup constructs 22 effect objects with literal start/end
times, and the frame loop dispatches the active objects.

This is considerably better than one monolithic render function. The original
runtime already separates the restoration problem into:

```text
mystified.xm order + performance-counter fraction
                    |
                    v
          mystified.env -> current seconds
                              |
                              v
             compiled effect manager
              /        |         \
      effect class   .env curves   .exp scene/keyframes
                                      + image assets
```

In other words, effect implementations and their top-level schedule are linked
into `wONDEr.exe`, but scene geometry, materials, object/camera animation,
parameter envelopes, textures, and music are external assets.

Wonder also has distinct compiled endpoint-tangent routines for vector and
scalar EXP tracks. The final vector routine at `0x4053c0` computes its time
factor from the float `0.25` at `0x4332f0` plus the float `0.5` at `0x4332e4`,
minus the final-key time ratio (`0x40540a`–`0x405410`). The scalar routine at
`0x405820` instead uses the double zero at `0x4332e8` and a separate half-delta
term, giving an effective `0.5 - ratio`. The port preserves this original
vector/scalar split; sharing the scalar formula changes camera position and
target motion throughout their final key segment.

## Clock and music synchronization

Wonder imports `FMUSIC_GetOrder` and `FMUSIC_SetOrder`, but no tracker-row
query. During each frame it combines the current XM pattern order with elapsed
high-resolution-counter time inside that order. `mystified.env` supplies the
order-to-seconds table; its 23 boundaries run from 0.000 through 181.035
seconds.

Audio initialization at `0x420ef0` calls `FSOUND_SetUpdateRate(30)` and
`FSOUND_SetMixAhead(30)` before `FSOUND_Init(44100, 32)`. The frame loop reads
`FMUSIC_GetOrder`, which reflects the XM state being prepared by the mixer,
while the Web Audio clock deliberately tracks blocks when they become audible.
Wonder's live browser clock consequently restores the native 30 ms visual lead.
Fixed `?t=` renders and the timeline inspector remain in executable show-time
coordinates and do not apply an output-device phase. Raw disassembly of the
bundled FSOUND 2.25 DLL confirms the unit: its initialization computes
`mixAhead * outputRate * 4 / 1000` bytes.

The module contains one `F00` at order 21/pattern 13/row 63/channel 3. FT2's
zero parameter produces a 256-tick terminal row, holding the order while the
performance-counter component continues. The frame callback compares show time
against the double at VA `0x4337a0`, exactly 186.5, then exits. This explains
why the final registered effect extends to 195 seconds but the release never
reaches that endpoint.

This is strong evidence that `mystified.env` is not merely an effect curve. It
is the retained music synchronization map. Several compiled effect boundaries
match it exactly, including 18.341, 138.302, 155.440, and 172.578 seconds.

Relevant executable locations:

- approximately `0x414023`: derive current time from XM order and counter
- `0x485de8`: loaded synchronization-envelope object
- `0x485e14`: current time in seconds
- approximately `0x4140ea`: invoke the effect manager

## Compiled effect list

The initializer beginning at VA `0x414860` registers the following 22 objects
through the vector helper at `0x410c40`. The temporary effect IDs below are
constructor virtual addresses; semantic names can be assigned as each class is
recovered.

| # | effect constructor | start (s) | end (s) | visible constructor asset arguments |
|---:|---:|---:|---:|---|
| 1 | `0x4106a0` | 0.000 | 22.000 | |
| 2 | `0x40d790` | 9.862 | 13.500 | |
| 3 | `0x40de00` | 0.000 | 20.000 | |
| 4 | `0x40c760` | 35.500 | 47.000 | |
| 5 | `0x40d060` | 26.900 | 44.500 | `max_t4.jpg` |
| 6 | `0x40f8e0` | 26.500 | 44.000 | |
| 7 | `0x4138a0` | 20.341 | 35.500 | |
| 8 | `0x408ca0` | 18.341 | 40.400 | `y1.jpg` |
| 9 | `0x40ec40` | 44.400 | 60.000 | |
| 10 | `0x40f2f0` | 44.400 | 60.000 | |
| 11 | `0x410100` | 53.000 | 59.000 | |
| 12 | `0x40cea0` | 58.900 | 69.753 | |
| 13 | `0x40ccc0` | 59.302 | 69.753 | |
| 14 | `0x40fe10` | 58.900 | 69.753 | |
| 15 | `0x40dab0` | 69.753 | 103.500 | |
| 16 | `0x410300` | 69.753 | 104.000 | |
| 17 | `0x40fa30` | 104.000 | 138.500 | |
| 18 | `0x40fc00` | 104.000 | 138.500 | |
| 19 | `0x40c990` | 138.302 | 159.440 | |
| 20 | `0x40b040` | 155.440 | 172.578 | `NebulaMultiCrater1.jpg`, `WaterGreenWorld.jpg`, `y3.jpg` |
| 21 | `0x40bfa0` | 172.000 | 185.035 | `y4.jpg`, `MAX_t1.jpg` |
| 22 | `0x40ea30` | 176.000 | 195.000 | `energy.exp` (release cuts at 186.5) |

All constructor-local and caller-supplied filename associations are encoded in
`web-wonder/js/show-data.js` and validated case-exactly against the asset
manifest. `EFFECT_STATUS.md` tracks the implementation boundary for every row.

The manager at VA `0x410bf0` iterates this list. Each registered object has a
vtable pointer at offset 0, start time at offset 4, and end time at offset 8.
When the current time falls in the interval, it calls the object's render
method with local time (`current - start`). The schedule is therefore regular
and can be moved into a future declarative timeline without first understanding
every effect instruction.

Raw comparisons at `0x410bff` and `0x410c10` operate on 32-bit floats and call
the effect when `start <= current <= end`; the end is inclusive. At a shared
boundary such as 69.753 seconds, both the outgoing and incoming classes render
in registration order. The browser scheduler rounds time and interval fields
to float32 and preserves that one-frame overlap.

## Translated effect classes

All 22 scheduled classes now have address-derived browser passes:

- `0x4106a0` renders `beginning.exp` with separate camera and object clocks.
  The camera clock is `t*15 + 60/(t+1)*pulse`, the object clock is `t*20`, and
  the retained mesh order is 1, 0, 4. The two material offsets and overtake
  crossfade are translated in `web-wonder/js/effects/beginning.js`. Its two
  textured paths use the native white 0xff vertex intensity; the green/red
  editor diffuse swatches retained by `beginning.exp` do not tint the maps.
  Both materials' second, environment-slot maps use the software coordinates
  generated by the mesh update at `0x40752a–0x40762a`, not OpenGL
  `GL_SPHERE_MAP`: the model-view basis is scale-normalized, normal X/Y are
  mapped to half range, and V is negated. Animated material offsets affect
  only ordinary unit-zero UVs. Those coordinates use the single shared-vertex
  normals generated by `FUN_00406e20`: it adds every incident face normal and
  ignores the EXP smoothing flags before normalizing with the `1.0` constant
  at `0x4360a0`. The class common alpha reaches both material
  paths. Raw state calls at `0x410840–0x410966` draw `QuadPatch01` with depth
  testing disabled, then enable depth for `B2.LWO` and `B2.LWO01`; culling
  stays disabled. Native material callbacks at `0x408410` then select the
  material states: the 0.7-opacity nebula plane uses its exported
  source-alpha/additive blend, while the opaque foreground disables blending.
  The global class alpha multiplies vertex alpha but does not decide whether
  blending is enabled.
- `0x40de00` uses the original fixed frustum, 200-by-200 cards at `z=-500`,
  title/face transforms, pulse-scaled circle, alpha blending, and the draw-order
  flip at 9.33 seconds.
- `0x40d790` is the recovered eight-plane additive tunnel. Raw instructions
  give it a 90-unit sinusoidal Z sweep, 90–180-degree X tilt, 25-degree/second
  Z rotation, 26-degree/second pivot rotation, and a 16-degree plane phase
  step. Its temporary `t*.5` stack store is doubled back to the original time
  before the pivot rotation; time does not compound between planes.
- `0x4138a0` uses the compiled full-screen card opacity
  `sin(min(t * 0.07321179658174515 * 3.14, 3.14))`.
- `0x408ca0` samples the first two channels of `bubble.env`, applies the
  executable's `[-.5,.5] x [-.375,.375]` frustum and transform stack, and
  regenerates the cyclic 6-by-6 mode-one control lattice from `0x4092c0`.
  The 4-by-6 spline subdivision uses the Catmull-Rom polynomial at `0x40a650`.
  The two `y1.jpg` descriptors are separate additive passes: regular UVs and
  the generated surface-normal XY coordinates. They are not two simultaneous
  modulation stages.
- `0x40f8e0` enables depth, disables culling, and renders `bubblebath.exp` at
  the single-precision frame `fmod(localTime * 1.53, 64)`, as shown by
  `0x40f9a0–0x40f9e0`. This replaces the earlier clip-normalized scene clock.
- `0x40d060`'s constructed mode-zero path is the two-strand additive card
  tunnel at `0x40d120`: eight cards per strand, a 70-unit strand separation,
  a -100-unit depth origin with 80-unit depth steps, 16-degree phase steps,
  `t*0.9` motion, and the compiled one-second entry and 16.1-second exit fades.
  Raw stack offsets at `0x40d2be-0x40d2d9` prove that the active mode-zero Z
  accumulator is the value initialized to -100 and decremented by 80. The
  separate 34-unit decrement is not consumed by this branch.
- `0x40c760` draws `boxical.exp` twice per browser frame at
  `fmod(t*8,100)` and `fmod(t*8+4,100)`, with a `-t*3.6` texture offset,
  0.7 material opacity, `SRC_ALPHA/SRC_ALPHA` blending, and the exact
  `1-min(t*.063,1)`/10.5-second exit envelope from `0x40c870`. The first
  clock store at `0x40c931-0x40c937` overwrites the method's float argument;
  the second draw reloads that slot at `0x40c951` before adding four.
- `0x40ec40` keeps the `design_bw2.exp` and `shite1.exp` clocks separate.
  It draws two `Qua` passes at frame zero with texture offsets `t` and `t+16`,
  applying the second pass's `-10` shift to the already shifted and tilted
  projection matrix at `0x40ef38–0x40ef4c`, not to model-view,
  then samples the shite camera at `sin(t*.62)*63.5+64` and objects at
  `fmod(t*10,200)`. Raw instructions recover the 200/3000-unit projection
  sweeps, 16-degree design tilt, four-node order, per-node scrolls, material
  opacity multiplier, and all three runtime map replacements. The four
  `0x40e490` modifiers restore their saved vertices on every update, apply the
  time-varying squash `x *= sin(nx*3.2 + frame*.2)^4*1.3 + 1.5` and
  `y *= cos(ny*3.2 + frame*.32 + 1.2)^4 + 1.5`, then regenerate normals.
  Their apparent second time input is the caller's saved camera-pointer
  register, not a declared argument. Wonder's
  texture upload paths set only minification/magnification filters and leave
  OpenGL's default `GL_REPEAT` wrapping intact. That repeat state is essential
  for the multi-tile material scrolls here.
- `0x40f2f0` loads `scene.exp`, but render method `0x40f3b0` never reads the
  retained scene pointer. The visible pass is immediate-mode only: a sliding
  orthographic window, the `vsz_d2.jpg` background, 64 waveform bars, a
  vertical alpha mask, and six texture strips. Their projection cap, phase
  steps, blend functions, alpha values, and float-rounded coordinates are
  translated directly from the instruction stream. Raw instructions at
  `0x40f7b8–0x40f8ad` place strip `i` at
  `sin(t + i*0.3213)^5 + [1.91,2.2]`; `i*0.25012` supplies the separate
  texture/alpha phase. Using `t+[1.91,2.2]` as screen coordinates makes every
  strip disappear after the first few seconds and is not the native motion.
- `0x410100` renders `spherical.exp` at `fmod(t*8,100)`. Its constructor
  changes every material to 0.9999 opacity with `SRC_ALPHA/ONE` blending; the
  renderer applies `sin(clamp(t-1,0,1)*3.664)^2` globally and scrolls the
  three maps by `(+.2t,0)`, `(0,-.2t)`, and `(-.3t,0)`. Raw material dispatch
  also confirms that Wonder's textured paths modulate maps with a white
  0xff vertex intensity rather than the exported diffuse-color swatch.
- `0x40cea0` renders `boxical4.exp` twice at `fmod(t*8,100)` and four frames
  later, with a `-.2t` U scroll, 0.3 constructor opacity, conventional alpha
  blending, and a one-second global entry ramp.
- `0x40ccc0` renders `check.exp` twice at frames `3t` and `3t+4`, with a
  `+1.5t` U scroll and the constructor's exact 0.42396599 additive opacity.
- `0x40fe10` loads `stars.exp` and `speedy.exp`, but `0x40ff40` never reads
  either scene pointer or its time argument. It draws only `backg.jpg` as a
  white, full-screen, additive orthographic quad; this is the centered
  “WONDER” layer visible over the radial scene stack.
- `0x40dab0` draws sixteen additive `DustOnYourEyes__.jpg` cards as two
  eight-card strands. The cards share the exact `sin(min(.5t,1.57))^2*90+90`
  pitch and `25t+16i` roll; their Z spacing is respectively 80 and 34 units,
  and the class fades during its final second from 29.991 local seconds. It is
  a first-class manager layer even though it owns no EXP file; compositor
  traversal must therefore follow effect records rather than infer layers
  from scene assets.
- `0x410300` evaluates `napierdalanie.env` at `t+69.753`, advances the
  `woah3.exp` camera at `10t` and objects at `15t`, and scrolls both textured
  materials at `1.4t`. Its native linked-list traversal draws only the first
  two `QuadPatch` nodes, `Original`, and `LWO01`–`LWO04`; the four LWO passes
  retain material 2's ordinary source-alpha blend and multiply its exported
  0.5 opacity by `(1-envelope)` scales of .7, .5, .35, and .2. Forcing these
  black meshes through an additive blend makes them effectively disappear.
  The two
  `unrd*.raw` composite texture IDs written by the constructor have no reads
  anywhere else in the executable and are retained only as preload evidence.
- `0x40fa30` draws `design_bw.exp` at `10t` followed by `credits.exp` at
  `15t`, with the credits material-six V coordinate scrolling at `4t` and the
  class's depth/cull-disabled white textured paths.
- `0x40fc00` draws `clock.exp` six times at `13t`, `17t+15`, `21t+45`,
  `35t+65`, `fmod(500-13t,500)`, and `fmod(500-(19t+54),500)`. Raw x87
  disassembly confirms the last two operations are C `fmod`, preserving the
  negative remainder after their clocks cross 500.
- `0x40c990` samples `napierdalanie2.env` at `t+69.753`, renders
  `faceted.exp` at `10t`, and renders `faceted2.exp` at `t+30`. Their first
  maps scroll at `1.5t` and `1.5t+8`; the second pass exits from local
  15.138 seconds at `.6` alpha units per second. Constructor loops at
  `0x40ca4c` and `0x40ca9e` replace the runtime opacity of every material in
  the respective scenes with `0.23965999` and `0.49660000`; only the texture
  offset write in `0x40cba1`/`0x40cc4a` is restricted to material zero.
- `0x40b040` rebuilds a cyclic 16-by-6 tunnel lattice every frame from four
  executable oscillators. Its native Catmull-Rom subdivision takes five
  samples across each cyclic-column segment and two along each depth-row
  segment. Wonder's call order and the matching released tessellator source
  identify `+0x190` as seed U and `+0x194` as seed V. The renderer uses the
  top-right/bottom-left diagonal for each generated quad.
  Its Y-radius wave uses the double `0.25` at `0x4332e8`, not the adjacent
  float `1.5`; raw operand width is required to distinguish those constants.
  The reverse center path, `-1.17t` V motion, three additive material passes,
  pulse ENV alpha, and `d1.jpg`/`d1_.jpg` sine crossfade are translated in
  `effects/design-tunnel.js`. The flag-2 descriptor stores a `-t` offset, but
  the native flag-2 draw helper never reads that field. Its UVs come from the
  executable's `0x40a280` control-point face-vector accumulator and are then
  Catmull-Rom interpolated with the rest of the 48-byte surface vertex. The
  original `GenerateNormals` binds its destination reference before updating
  the vertex index, rotating the generated UVs backward by one control point;
  Wonder's disassembly and the surviving source both preserve that bug.
- Wonder's JPEG upload path sets `GL_LINEAR` for both texture filters and does
  not create mip levels. Procedural and EXP image textures therefore retain
  the native non-mipmapped minification path and default `GL_REPEAT` wrap.
- Wonder's JPEG decoder at `0x408270` writes libjpeg scanlines into increasing
  row addresses, and `0x407ea0` passes that buffer directly to `glTexImage2D`.
  Separately, the EXP loader at `0x4064af` computes `1.0-exportedV` before
  calling texture-vertex setter `0x406db0`; the callback at `0x4084b0` later
  passes that converted pair directly to `glTexCoord2fv`. The port therefore
  retains both the top-down upload and the loader's explicit V conversion.
- Wonder leaves `GL_LIGHTING` disabled after initialization at `0x414398` and
  never enables it in any scheduled class. In particular, the Omni record in
  `boxical.exp` is retained scene data, not authorization to turn browser
  lighting on; all Wonder EXP renderers use the native unlit callbacks.
- Wonder's shared-vertex normal builder `0x406e20` deliberately evaluates
  `(vertex2-vertex0) x (vertex1-vertex0)`, the reverse of the conventional
  triangle cross product. Those signed normals drive both generated
  environment coordinates and the `0x40e490` shite deformation, so replacing
  them with conventional normals changes UV placement and animated geometry.
- The environment-coordinate block at `0x407547` divides the entire first
  model-view row by twice the mesh's sampled X scale and the second row by
  twice its sampled Y scale before applying the half-range bias. Normalizing
  individual matrix columns produces a different result for rotated,
  non-uniformly scaled meshes.
- Camera update `0x403460` composes its intermediate matrices through
  `0x403c60`. The final stored basis applies exported roll as
  `right'=cos(r)*right+sin(r)*up` and
  `up'=cos(r)*up-sin(r)*right`. Interpreting the intermediate Z matrix as a
  conventional column-vector premultiplication reverses the visible roll;
  the error is especially large in `credits.exp` and the roughly 97-degree
  opening camera of `end.exp`.
- `0x40bfa0` draws the two-unit `bump.jpg`/`bump.raw` emboss card before
  `end.exp`. The card and scene share the compiled two-second entrance, full
  opacity through local second 5, and two-second exit; the scene clock is
  `15t+60`. Raw texture-environment setup at `0x40bce0` selects
  `GL_COMBINE4_NV`: unit zero retains half-intensity base RGB while its alpha
  computes `0.5 + height0 - height1`; unit one applies signed add with scale
  two, producing `baseRGB + 2*(height0-height1)`, and replaces alpha with the
  primary fade. Its
  `Secret.jpg`, `y4.jpg`, and `MAX_t1.jpg` constructor objects have no reads in
  render method `0x40c380`, while `end.exp` consumes the retained left/right
  raw Secret textures.
- `0x40ea30` is the final `energy.exp` pass: depth and culling are disabled,
  the scene runs at `10t`, material zero scrolls by `+.6t`, and its global
  alpha falls at `.3` per second after local second 7. The registered endpoint
  remains 195 seconds, but the executable cuts the show at 186.5.

These translations are implementation milestones, not visual sign-off. The
executable and external asset bytes are the oracle. The aligned capture is
secondary validation evidence for framing, timing, blending, and final pixels;
capture gamma, codec, driver, and alignment effects must be accounted for.

The common Wonder scene adapter also retains the native unlit textured-triangle
colour path at `0x4084b0`: a grayscale vertex intensity is sent to all three
colour channels and saturates to white for the supplied textured meshes. The
red/green editor diffuse swatches in EXP are therefore not multiplied into
unlit texture maps. Untextured callbacks, lit scenes, and Energia's animated
material revision keep their sampled material colours.

## External animation data

The assets preserve most of the authored motion:

- Nineteen `.exp` files contain scene objects, materials, camera/object
  animation tracks, and frame spans.
- Seven `.env` files contain scalar/vector parameter curves or synchronization
  points. In particular, `alpha_circle.env`, `wondertext_pos.env`,
  `napierdalanie.env`, and `napierdalanie2.env` contain dense authored timing.
- `mystified.xm` is the original music and pattern-order clock source.

The `.env` files are parsed at runtime; their values are not duplicate inert
source material. For example, the 69.753-second compiled boundary agrees with
the first pulse in both `napierdalanie` envelopes.

## What remains authoritative in code

The executable remains the provenance for:

- which effect classes are active in each interval;
- constructor parameters that are not filenames or external envelopes;
- procedural drawing, compositing, and state transitions inside each class;
- the association between individual effect classes and all scene/envelope
  assets they load.

The browser restoration now implements that boundary as a data-driven 22-entry
show timeline feeding separate effect classes and the external scene/envelope
loaders. Remaining work is visual calibration and reference sign-off rather
than discovery of another embedded script layer.

## Lead from the Tesla source bundle

The later source snapshot is not Wonder source, but it documents the same
Sunflower-era programming convention. `Demo/Smasher/Smasher.cpp` registers
effects with literal start/end seconds, while `EffManage.cpp` loops over those
ranges and calls the active effect object. That source is a semantic reference
for naming the recovered Wonder manager, not evidence that the shipped Tesla
binary and Wonder are one engine.
