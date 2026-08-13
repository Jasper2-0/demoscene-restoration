# Energia effect-port status

The top-level gates below overlap and must remain independent. `Scene scaffold`
means the exact SUNF scene renders on a normalized local frame span; original
constructor frame scaling and compositor behavior still require recovery.

| interval | recovered layer | implementation |
|---:|---|---|
| 0–56 | early renderer `0x411e10` + `0x410470` | executable-derived procedural pass |
| 0–56 | overlay `0x40c6f0`, `dot.jpg` | executable-derived 2D dot-design pass |
| 6–18 | overlay `0x412750`, `s.raw` + `sb.raw` | executable-derived Sunflower logo pass |
| 12–19 | `D2_3.jpg` design cut | exact `0x410080` compositor pass |
| 19–31.5 | `D4_4.jpg` design cut | exact `0x410080` compositor pass |
| 31.5–44 | `D2_2.jpg` design cut | exact `0x410080` compositor pass |
| 44–56 | `D4_1.jpg` design cut | exact `0x410080` compositor pass |
| 44–82 | compositor mode 2 | executable-derived particle-system pass |
| 0–56 | effect `0x40f070`, `kalju3512.jpg` | executable-derived repeated displaced cylinder |
| 56–82 | `kurwa2_.exp` + `freak.exp` | two independent scene scaffolds |
| 56–157 | effect `0x410f90` | executable-derived deterministic triangle pass |
| 82–122 | `kurwa.exp` | scene scaffold |
| 82–136 | reused `0x411e10` + `0x410470` wave/dot pair | executable-derived procedural pass |
| 122–132 | effect `0x40f070`, `sc2.jpg` | executable-derived repeated displaced cylinder |
| 132–157 | compositor mode 4 | executable-derived particle/metaball pass with native marching-cubes topology |
| 136–157 | `scene6.EXP` | scene scaffold |
| 156–182 | overlay `0x413050` | executable-derived 256-box scene and procedural line pass |
| 182–233 | effect `0x410f90`, mode 3, overlay | executable-derived triangle, spring-lattice, box-scene, and line passes |
| 233–290 | late pair + effect `0x40f570` | executable-derived triangle/dot pair and linked DISP2/wave cylinder; capture ends during interval |

No row is reference-signed-off yet. The early pass now contains the recovered
dynamic wave grids, camera, four-source dot volume, textures, and blend state;
capture/difference review can still correct interpretation errors. Compositor
mode 2 now contains its recovered camera keys, absolute emission clock,
display-driven/max-step force integration, lifetimes, colors, and three paired
line-width passes. Effect `0x410f90` now contains
its two deterministic 150-triangle generators, original camera matrix,
perspective frustum, fade gates, and six alpha-blended passes. All direct
opening calls after the first `0x40f070` are now translated. Compositor mode 4
now retains its particle simulation, camera, scalar field, normal/texture
mapping, exact marching-cubes lookup topology, and three native surface
passes. The `0x413050` scene/line overlay and mode-3 spring lattice are
also instruction-derived, including their original draw order and 30 fps
deterministic simulation. The late `0x40f570` layer now retains its native
40-by-40 topology, two linked raw-map modifiers, per-corner color channels,
and six additive radial draws. All currently identified Energia procedural
layers now have executable-derived implementations; reference-difference
review and EXP camera/material signoff remain open.
