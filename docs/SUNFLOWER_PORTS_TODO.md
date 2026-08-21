# Wonder + Energia WebGL ports

This is the canonical, dependency-ordered checklist for the faithful browser
restorations of **Wonder** (1999) and **Energia** (2001) by Sunflower.

Status convention:

- `[ ]` not started or not yet demonstrated
- `[~]` in progress
- `[x]` implemented and verified
- `[!]` blocked, with the blocking evidence written beside the item

The first release target is the original 4:3 presentation. Remaster work starts
only after both authentic ports have been signed off against their captures.

## 0. Preservation and reference baseline

- [x] Preserve the release files under `productions/wonder/work/src/` and
  `productions/energia/work/src/`; runtime work uses extracted or copied data.
- [x] Provide repeatable unpackers for `WON.DER` and `demo.dat`.
- [x] Identify the loose image, audio, envelope, and EXP/KEXP formats at a
  high level.
- [x] Recover the top-level timing structure for both executables.
- [x] Generate SHA-256 manifests for original and unpacked files.
- [x] Record the two YouTube reference captures and metadata under each
  `work-*/reference/` directory without distributing the videos.
- [x] Waveform-align Wonder's capture to `mystified.xm` and Energia's capture
  to the original MP3.
- [x] Produce contact sheets at every effect boundary and representative
  midpoint.

References:

- Wonder: <https://www.youtube.com/watch?v=G3XLu10_140> (1440x1080 at 60fps, the
  capture `prod.json` pins; supersedes 7MnD4Ugco1g, whose 30fps resampling made
  frame boundaries ambiguous)
- Energia: <https://www.youtube.com/watch?v=JJ3TVjBjat4>

## 1. Shared Sunflower runtime

### Packaging

- [x] Establish `shared/sunflower/js/` as the canonical source for modules
  shared by the two ports.
- [x] Establish standalone `productions/wonder/web/` and
  `productions/energia/web/` sites.
- [x] Add a checked sync tool which vendors the canonical modules into each
  site and fails when a vendored copy has drifted.
- [x] Add static-server smoke tests for both standalone sites.
- [x] Add case-sensitive asset-path verification once the runtime asset
  manifests are populated.

### MiniGL

- [x] Promote the latest PTCT MiniGL and math library as the baseline.
- [x] Keep PTCT's existing MiniGL tests and rendering behavior green after
  extraction.
- [x] Add two texture units, per-unit enable/binding/texture matrices, and two
  immediate-mode UV streams.
- [x] Implement the Wonder texture-environment combine modes actually observed
  in the executable.
- [x] Add immediate normals for Energia.
- [x] Add sphere-map texture-coordinate generation with original GL semantics.
- [x] Add the per-pass `GL_NORMALIZE` state used by Energia's mode-3
  skymap surface.
- [x] Add line width and viewport state.
- [x] Treat compiled vertex-array lock/unlock calls as documented no-ops.
- [ ] Replace display lists locally in their consuming effects; do not build a
  general display-list interpreter.

### Common data/runtime services

- [x] Implement checked `.env` scalar/vector parsing and interpolation.
- [x] Implement deterministic headerless RGB, alpha, mask, bump, and auxiliary
  texture decoding.
- [x] Define and implement the common show-clock contract:
  `start()`, `pause()`, `seek(seconds)`, `timeSeconds()`, and `ended`.
- [x] Implement a layered, declarative timeline whose clips receive local time.
- [x] Add deterministic `?t=SECONDS&debug` rendering support to both sites.

## 2. EXP/KEXP scene runtime

- [x] Encode a bounds-checked reader for the typed record stream beginning at
  byte 8.
- [x] Fully determine the material record, including the SUNF trailing byte.
- [x] Fully determine mesh vertices, faces, UVs, material assignments, pivot,
  local transform, and hierarchy identifiers.
- [x] Fully determine camera, light, target/helper, and animation-track records.
- [x] Determine track interpolation and any tension/continuity/bias fields from
  executable evidence.
- [x] Implement `parseExp(bytes, { variant: 'wonder' | 'energia' })` over one
  common scene model.
- [x] Implement `sampleScene(scene, frame)` with hierarchy, pivots, cameras,
  targets, roll, FOV, and lights.
- [~] Validate the native Energia camera/object basis composition at
  `0x417720`/`0x41b720` against aligned managed-scene frames. Keep any required
  conversion in the EXP adapter; generic MiniGL remains standard OpenGL.
- [x] Validate exact stream consumption, names, counts, indices, and track
  bounds for all 19 Wonder and seven Energia scenes.
- [x] Snapshot parser summaries so format changes fail loudly.

## 3. Wonder port

### Audio and clock

- [x] Confirm the existing BSD-licensed XM player renders the complete module
  without unsupported effects.
- [x] Vendor the XM player without changing its generic FT2 behavior.
- [x] Implement audible buffer tagging and the `mystified.env` order-to-seconds
  mapping.
- [x] Reproduce the terminal `F00` behavior from module/executable evidence in
  a Wonder-only adapter.
- [ ] Verify order boundaries and continuous motion against the aligned capture.

### Rendering and sequencing

- [x] Decode and upload Wonder's composite RGB/alpha and RAW assets.
- [x] Render one animated EXP scene with camera, material, envelope, and
  multitexture combine as a vertical slice.
- [x] Encode the recovered 22-entry effect schedule as declarative data.
- [x] Recover constructor parameters and asset associations for all 22 effect
  classes.
- [~] Port and sign off each effect in chronological order.
- [x] Match the executable's 186.5-second final cut and terminal `F00` hold.

## 4. Energia port

### Audio and clock

- [x] Implement native MP3 playback through an `HTMLAudioElement` connected to
  Web Audio.
- [x] Use media time as the authoritative clock, with gesture startup, pause,
  seek, and a calibratable reference offset.
- [x] Resolve the 255-second capture, 261.46-second soundtrack, and later
  compiled time gates using waveform alignment and executable evidence.

### Rendering and sequencing

- [~] Decode RGB and single-channel RAW assets according to their confirmed
  consumers.
- [x] Render one animated SUNF scene exercising arrays, normals, lighting, and
  sphere mapping as a vertical slice.
- [x] Encode the four managed scene instances as independent timeline layers.
- [~] Recover the complete overlapping master phase-gate ladder.
- [~] Recover constructor parameters and direct filename associations.
- [~] Port and sign off effects chronologically, including feedback,
  compositing, displacement, overlays, and the late section.
  - [x] Port the 0–56 wave/dot renderer, four design cuts, opening dot/logo
    overlays, and repeated `0x40f070` cylinder from executable instructions.
  - [x] Port compositor mode 2, including camera TCB, particle forces,
    display-dependent stepping, and WebGL-safe wide-line expansion.
  - [x] Port the reused 82–136 wave/dot gate and 122–132 cylinder call.
  - [x] Port the common `0x410f90` six-pass deterministic triangle layer.
  - [x] Port compositor mode 4's camera, bouncing particle simulation,
    32-cubed scalar field, texture mapping, wire pass, and black shell.
  - [x] Replace mode 4's marching-tetrahedra substitute with the executable's
    exact 256-by-16 marching-cubes lookup topology, native inward winding,
    compositor Z reflection, and paired-index `GL_LINES` pass.
  - [x] Port the 156–182 `0x413050` overlay: the custom
    `nowheretorun.exp` 256-box controller, material animation, and procedural
    additive line bundle.
  - [x] Port compositor mode 3 and its 182–233 overlay interaction, including
    the ten-key camera, 13-cubed spring lattice, moving radial fields, native
    strip topology, and normalized `skymap.jpg` sphere mapping.
  - [x] Port the late `0x40f570` layer, including its 40-by-40 linked
    `DISP2.raw`/`wave1.raw` cylinder and six additive passes. The complete
    233–290 gate is browser-tested; reference signoff beyond the capture's
    approximately 255-second endpoint is necessarily unavailable.

## 5. Verification and release

- [x] Unit-test EXP/KEXP parsing, envelopes, hierarchy transforms, camera
  sampling, texture decoding, and timeline activation.
- [x] Unit-test MiniGL multitexture, independent UVs, immediate normals, sphere
  mapping, blending, fog, and indexed arrays.
- [x] Run full-playback browser smoke tests with no missing assets, uncaught
  errors, invalid GL operations, or clock regressions.
- [ ] Capture boundary and midpoint frames and produce reference/port/difference
  montages.
- [ ] Document every deviation that cannot be settled from executable evidence
  or the compressed 30-fps captures.
- [x] Add README, methodology, provenance, licensing, and original credits to
  each standalone site.
- [ ] Add independent distribution and publication entries.
- [ ] Sign off the authentic 4:3 Wonder port.
- [ ] Sign off the authentic 4:3 Energia port.
- [ ] Only then open a separate remaster checklist.

## Repo gates

`npm run verify:repo` runs the mechanical gates that are green: `lint:tools`
(METHOD.md's tool protocol) and `check:shared-runtime` (vendored runtime drift).
It is deliberately kept passing — a gate that fails permanently stops being read.

`npm run verify:all` adds `test:shared`, which currently exits 1 on one tracked
Energia failure. Fold `test:shared` back into `verify:repo` once that is fixed.
