# Consolidating the two `Landscape` ports

The original has **exactly one** outdoor-scene class. The class-id array at
`0x41a038` is `[1,2,0,3,3,3,3,3,3,3,3]`, so timeline objects **3..10 are eight
instances of class 3** (ctor `FUN_00402d27` → `new 0x15c` + `FUN_00408251`,
vtable `PTR_FUN_00418e68` = `{init 0x408d72, render 0x408eef, event 0x409acb,
dtor 0x408276}`), differing only by the descriptor index passed to
`FUN_004082a9` by the `m3` init event (res 28..35 ⇒ sceneIdx 0,1,2,3,4,5,7,8).

Two agents ported that class independently and neither imported the other:

| | `web-sonnet/js/scene3.js:137` | `web-sonnet/js/scene7.js:397` |
|---|---|---|
| used by | objects 3,4,5,6 | objects 7,8,9,10 |
| scene indices | 0,1,2,3 | 4,5,7,8 |
| base class | `SceneObjectBase` (text.js) | its own field set |
| textures | baked PNGs from `baked/tex/` (async) | `runTexgen(RESOURCES[id])` (sync) |

The measured consequence was that a later pass added **all** of the per-frame
animation and the billboard impostors to `scene7.js` only, so objects 3..6 were
frozen and treeless. Keyword counts before this work: leaves 0 vs 40, ribbons
0 vs 16, particles 0 vs 16, impostors 0 vs 29, snow 0 vs 13.

---

## 1. What each port had that the other lacked

### Only in `scene3.js` (would have been silently lost by a "keep the bigger file" merge)

| thing | source | disposition |
|---|---|---|
| **array A — the surface-of-revolution spires** (`FUN_0040bc63`, scene 0's 80 grass blades) — build, sphere-map material `0x20` on texgen program 2, and the `m1` growth trigger | `SCENES_2_6.md` §4 | **merged** |
| **`FUN_0040bfc1` spire growth** — y-scale 0.001 → 1 at `desc.paramA * dt * 0.01` | `SCENES_2_6.md` §7.8 | **merged** |
| **the water-level animation, descriptor flag bit 17** — `desc.waterLevel` forced to 0 before music position `0x820` and 1.0 after. Scene 1 is the only descriptor that sets it | `SCENES_2_6.md` §4 | **merged** |
| **`m1` / `m2` / `m10` event cases** | `SCENES_2_6.md` §3 | **merged** (`m2`/`m10` still set only a flag; the array-F prop and the cloud dissolve are unported in both) |
| the `KC.M5_SCALE` = 0.64 `m5` camera-rate override | `SCENES_2_6.md` §2 | already in scene7 (identical literal) |
| the cloud-layer sky | both | **see §2 — the two ports disagreed and scene3's reading is refuted by the decompile** |
| its own always-visible sun sprite (`drawFlare`) | `SCENES_2_6.md` §5 | **dropped** — superseded by `js/flare.js`, which now covers objects 3..6 too |
| the baked-PNG texture loader (`loadRGBA`, `rgbaToARGB`, `heightmapFromImage`, `extraTextureIds`) | — | **dropped** — `texgenImage()` produces the same images synchronously, and it removes an unawaited async build (see §4) |
| its approximate `bakeGroundTexture` (a guessed `lerp(texB, texA, clamp(n.y))`) | `SCENES_2_6.md` §7.1 | **dropped** — scene7's is the disassembled one (`SCENES_7_10.md` §2), including the `(x+1)/cell` off-by-one |
| the camera-height clamp `if (cam.y <= terrainHeight) cam.y = h` | `SCENES_2_6.md` §2 | **dropped** — `SCENES_7_10.md` §0 shows by disassembly that `FUN_004058a6` has already copied `+0x114..0x11c` into `+0x88` before `FUN_00408eef` writes the clamp, and the spline rewrites it every frame, so the clamp can never affect the image. Measured: no change. |

### Only in `scene7.js`

Everything the later animation/impostor pass added, all of which objects 3..6
now inherit: bird flight (`FUN_0040fba1`) incl. the build-time preroll, leaf
sway/fall (`FUN_0040a9ad`), ribbon animation (`FUN_0040f5a8`), the cloud-scroll
clock, particle integration (`FUN_0040d5c6`), the **billboard impostor baker**
(`FUN_0040abed` / `FUN_0040b0b0`), the corrected `scatterC` draw order (Z before
X), the solved ground-texture bake, the sun **point light + `0x1f1f1f1f` scene
ambient** (`FUN_00405d13`), the two fog ramps (`m8` sunset and the autumn
ramp-out), the precipitation music-position gates, the water reflection pass,
the `sceneIdx == 8` sphere-map terrain material (`0x3a`), the
`|= 0x4000` terrain flag in the hi-res-water branch, and per-camera `+0x110`
times.

---

## 2. The one substantive conflict: `FUN_0040ec28`'s `opt10`

`scene3.js` passed the descriptor's bit 10 **directly**; `scene7.js` passed it
**inverted**. `re/out/sonnet.c` @ VA 0x4092xx settles it — the call site is

```c
FUN_0040ec28(this+0x94, root, cloudCount, (float)cloudSize, cloudParam, cloudColour, '\x01',
             ~(byte)(*(uint *)(desc + 0x4f) >> 10) & 1,          /* <- opt10 */
             (*(uint *)(desc + 0x4f) & 0x800) != 0);             /* <- opt11 */
```

`scene_desc.mjs` reads its flags from the same `desc[0x4f]` u32, so there is no
offset ambiguity about which bit is meant. But the argument is only half the
story — **the branch it feeds had to be read too**, and that is where the
disagreement actually lived. `FUN_0040ec28` @ VA 0x40c038 onwards:

```c
if (param_6 != '\0') {
  if (param_7 == '\0') {                    /* <- opt10 == 0 */
      _param_4 = param_2; if (param_8 != '\0') _param_4 = 8;   /* count = 8 or N   */
      ...
      _param_7 = _DAT_004170c4 - (float)_param_6 * _DAT_00418f04;  /* S = 1 - i*0.2 */
      if (param_8 != '\0') _param_7 = 1.0;                          /* opt11 -> S=1 */
      ...                                                    /* == STACKED LAYERS */
  } else { ...16x16 grid... }                                /* == CURVED DOME    */
```

so **param_7 == 0 selects the STACKED LAYERS and non-zero selects the DOME**.
But `js/meshgen.mjs`'s `buildCloudSky` does `if (opt10) { stacked } else { dome }`
— the **opposite polarity**. Its header comment describes the *argument*
correctly (`opt10 = ~(flags>>10)&1`) while its code branches the other way, so
the value the function actually wants is the **raw bit**.

That is exactly what `scene3.js` passed, and why its author could write "rendering
both ways against the reference settles it unambiguously" and be right. It is
also why `scene7.js`, which faithfully computed `~bit10&1` and handed that
straight to `buildCloudSky`, gave every one of its cloud scenes the wrong shape.
`SCENES_2_6.md` §4's "correction to the meshgen contract" stands — and now has a
mechanism rather than an observation behind it.

**The merged class passes the raw bit.** (`js/meshgen.mjs` is not edited: it is
another agent's tested file, 369/369, and only its header comment is misleading.
Flagged for its owner.)

| scene | obj | bit 10 | shape |
|---|---|---|---|
| 1 | 4 | clear | dome |
| 3 | 6 | **set** | stacked layers, `opt11` 8-layer variant |
| 5 | 8 | clear | dome |
| 8 | 10 | clear | dome |

Measured, changing only this: obj 6 `0x0f30` 35.4 → 23.0, `0x1100` 30.6 → 24.1,
and its mean luminance went from 138.6 (reference 160.5) to **159.7** — i.e. the
sea of clouds is now photometrically right rather than 22 levels dark. Obj 4's
`0x0900` went 70.3 → 56.7.

### Two further corrections that fell out of the same function

* **The sky's material.** `FUN_0040ec28`'s tail is
  `if (param_8 == 0) FUN_00401c67(mat, DAT_00478964, 0, 0x1050); else { …0x3091; skyMesh+0xc4→+0x14 = 1; }`
  — keyed on **flag bit 11**, not on the shape. `0x1050` is lighting off | alpha
  blend | cull none; `0x3091` adds the dissolve op and additive blending, and
  only scene 3 sets bit 11. `scene7.js` had **`0x1811`** here, which is
  *additive with fog off*: the cloud layer could only ever brighten the frame and
  was never fogged. `0x1811` is in fact the material of `FUN_0040ec28`'s
  **noise quads** (`LANDSCAPE_ANIM.md` §4) — it had been applied to the wrong
  mesh. This is a direct contributor to `SWEEP.md` item 5, object 10's uniform
  +14 luminance: two white cloud layers were being *added* into its sky.
  scene3.js's `0x1050` / alphaRef `0x20` was closer, and its own procedural
  streak texture is dropped in favour of texgen 7 (neither is right — the
  original textures the sky with the 512×512 render-target composite, which
  remains unported in both ports).
* **The cloud layer's terrain parenting.** `FUN_004082a9`, immediately after the
  `FUN_0040ec28` call:
  ```
  if ((flags & 0x10000) != 0 && (flags & 0x400) == 0) {
      cloudMesh.scale = terrainScale * 2.0;     // FUN_0040268c, [0x418200] = 2.0
      cloudMesh.scale.y *= 0.5;                 // [0x4170d4] = 0.5
  }
  if (sceneIdx == 8) { scale.x *= 2.0; scale.z *= 2.0; }
  ```
  `(float *)(Landscape + 0x4c)` is the inline terrain object, whose first three
  floats are its scale vector (`FUN_0040e8d2` multiplies its height query by
  `terrain + 0x04` = scale.y). scene3.js had `(sx, sy·0.5, sz)` — it kept the
  halving but dropped the ×2 — and neither port had the `sceneIdx == 8` case.
* **The sky's per-frame vertex alpha**, which *neither* port had.
  `FUN_0040f27e`'s tail (`LANDSCAPE_ANIM.md` §4) is
  `if (this[0x1c] == 0) for every sky vertex: diffuse.alpha = this[0] + 1`,
  where `+0x1c` is descriptor flag bit 11 and `+0x00` is the byte
  `FUN_0040ec28` seeds from `cloudParam` (desc+0x1b, its `param_4`). That is
  **120 / 240 / 128** for scenes 1 / 5 / 8, so the port was drawing objects 4,
  8 and 10's cloud layers at alpha 255 where the original draws them at 121,
  241 and 129. The autumn fog ramp then overwrites the same byte with
  `ftol(225 − 225·t154)` (`SCENES_7_10.md` §5), so object 8's cloud layer
  **dissolves** across its window rather than sitting there at full strength —
  which is most of what `verify/SWEEP.md` item 4 was seeing. Object 6 is
  excluded, because it is the only scene with bit 11 set.

  Measured, changing only this: obj 8 `0x1a30` 66.4 → **39.5**, `0x1b00`
  60.9 → **42.8**, `0x1810` 61.0 → 55.4; obj 10 `0x2310` 32.7 → **19.2**,
  `0x2a30` 38.3 → 30.8. Obj 4's `0x0900` went the other way, 57.3 → 78.7 (its
  sky is the water-reflection pass's output showing through a now
  half-transparent cloud layer, and that pass is only graded *medium*).

---

## 3. Deliberately dropped

* `scene3.js`'s own flare (`drawFlare`, `matFlare`, `flareVB`) and its
  early-in-the-frame draw order. `js/flare.js` is a full transcription of
  `FUN_00405082` / `FUN_0040520d` / `FUN_004050ed` / `FUN_004051ac` including the
  4×4 occlusion query, and it now attaches to the merged class, so objects 3..6
  get the authentic late-drawn, occlusion-gated sprite. `SCENES_2_6.md` §5's
  claim that drawing the sprite late "washes the entire frame white" is the
  symptom of the *missing query*, not of the wrong order — `FLARE.md` §2 makes
  exactly this point.
* `scene3.js`'s `MG.srand(1)` before each `MG.buildFlock`. `FUN_004082a9`'s
  array-G loop (the `desc[0x50] & 0x40` block) is `FUN_00408c48` — which only
  unpacks the record's vec3 — followed straight by `FUN_0040f803`, with **no
  intervening `FUN_0040424e` (srand)**; contrast the array A/C/D loops, which do
  reseed via `FUN_004078b6`. So the flock draws from wherever the stream
  already is.
* `scene3.js`'s `SceneObjectBase` inheritance. `scene7.js` inlines the same
  `FUN_00406127` / `FUN_004060db` behaviour; the only difference was naming
  (`enabled`/`active` vs `visible`/`enabled`), and `timeline.js` only requires
  `layer`, `event`, `render`, `reset`, `tick`.
* `scene3.js`'s `worldOf` / `drawMesh` pair. scene7's `worldMatrix` is the same
  Scale·Translate with the added rotation slot `FUN_0040fba1` needs.

## 4. A latent bug the merge removed

`js/scenes.js` set `globalThis.__scenesReady` to a `Promise.all` of the scene
builds — but `main.js` **overwrites** `window.__scenesReady` with a plain status
object a few lines later, so the promise was dropped on the floor. Objects 3..6
built asynchronously (they awaited baked PNG decodes), so their geometry was not
guaranteed to exist for the first rendered frame; `tick()` guarded on
`this.ready` and simply drew nothing. With every scene on the synchronous
`texgenImage()` path the build is complete before `buildScenes` returns and the
race cannot happen.

## 5. Measurements

`node web-sonnet/test/sweep.mjs`, 354 samples, `--quality=original`, same
harness and same cached reference frames throughout. "Before" is a full sweep
run against the tree as it was handed over, *not* the numbers quoted in
`verify/SWEEP.md` — those were 33.76 / 35.88, and the ±0.6 difference is the
render-order dependence that `SWEEP.md` §5.3 documents. Everything below is
before-and-after on the same harness in the same session.

### 5.1 Whole sweep

| | before | after |
|---|---|---|
| median RMSE | 33.12 | **27.49** |
| mean RMSE | 35.37 | **31.89** |
| PSNR (median) | 17.7 dB | **19.35 dB** |
| samples under 10 / 20 / 40 | 40 / 88 / 241 | **43 / 106 / 270** |
| samples at or above 60 | 43 | **39** |
| improved / unchanged / worsened | — | **164 / 127 / 63** |
| worst sample | 113.05 (0x0c08) | 118.93 (0x0710) |

### 5.2 Per object

| obj | scene | n | median before → after | mean before → after | Δluma before → after |
|---|---|---|---|---|---|
| 1 | title / poem / credits | 42 | 6.61 → 6.61 | 7.62 → 7.62 | +1.2 → +1.2 |
| 3 | 0 — spires | 24 | 38.61 → **23.31** | 37.37 → **30.06** | +8.2 → **+3.2** |
| 4 | 1 — lakes | 24 | 66.11 → 73.83 | 61.10 → 63.08 | +6.5 → −32.1 |
| 5 | 2 — trees | 40 | 29.87 → **19.86** | 40.24 → **26.07** | +15.9 → **−3.4** |
| 6 | 3 — cloud sea | 24 | 27.84 → **27.15** | 27.28 → **26.64** | +0.3 → +5.1 |
| 7 | 4 — beach | 40 | 36.25 → **33.81** | 43.91 → 43.61 | +5.8 → +5.3 |
| 8 | 5 — autumn | 56 | 44.94 → **42.86** | 42.47 → 44.00 | −2.6 → −7.4 |
| 9 | 7 — winter | 40 | 31.25 → **30.08** | 30.73 → 30.53 | −0.0 → −0.1 |
| 10 | 8 — finale | 64 | 35.39 → **25.93** | 34.51 → **25.33** | +13.3 → **+5.0** |

Seven of the nine improve or hold. **Object 10 — the demo's longest scene and
`SWEEP.md`'s item 5 — moves 35.4 → 25.9**, and its Δluminance drops from +13.3
to +5.0, so the "uniformly 14 levels too bright" finding is largely closed.

**Object 4 is the one net loss** (66.1 → 73.8) and it is worth being precise
about. Job 1 alone took it to **54.45** — the animated water level, the sun
light and the reflection pass between them removed 40–50 RMSE from its water
frames. The later cloud vertex-alpha fix (§2) then took it back to 73.8, because
object 4 is the **only** scene that is both `cloudLayer` and `hasWater`: with a
cloud layer `FUN_00408eef` never clears the colour buffer, so its sky *is* the
water-reflection pass showing through the cloud layer, and dropping that layer's
alpha from 255 to the descriptor's 121 exposes a reflection pass that is only
graded *medium*. The alpha is what the binary does and it is worth +2.1 on
object 8 (56 samples) and +9.5 on object 10 (64 samples) against −19 on object 4
(24 samples), so it stays — but object 4's sky is now the clearest single lead
for whoever picks this up.

### 5.3 Per position, the changes that did the work

**Object 5 — the impostors (`SWEEP.md` item 2).** The whole of it falls out of
Job 1: `scene3.js` never had `FUN_0040abed`/`FUN_0040b0b0`.

| pos | before | after | Δ |
|---|---|---|---|
| 0x0c10 | 109.2 | **59.8** | −49.4 |
| 0x0c08 | 113.0 | **70.1** | −42.9 (was the worst sample in the demo) |
| 0x0b10 | 71.3 | **30.2** | −41.1 |
| 0x0b08 | 71.6 | **30.5** | −41.1 |
| 0x0b00 | 69.3 | **30.7** | −38.7 |
| 0x0a38 | 66.8 | **29.4** | −37.4 |
| 0x0c00 | 106.7 | **69.2** | −37.4 |

**Object 4 — the water/terrain (`SWEEP.md` item 3).** The animated water level
(descriptor bit 17), the sun light and the reflection pass, all of which one
port had and the other did not.

| pos | before | after | Δ |
|---|---|---|---|
| 0x0810 | 74.0 | **23.8** | −50.2 |
| 0x0910 | 97.3 | **47.9** | −49.4 |
| 0x0900 | 98.3 | **57.3** | −40.9 |
| 0x0908 | 92.8 | **54.5** | −38.3 |
| 0x0808 | 64.7 | **28.0** | −36.7 |
| 0x0710 | 76.5 | 119.1 | **+42.5** |
| 0x0718 | 89.5 | 113.8 | +24.2 |
| 0x0720 | 84.2 | 106.5 | +22.2 |

The five regressions are all in `0x0708`–`0x0730`, the first four seconds of the
scene, and they are the point light: with `0x1f1f1f1f` ambient and a hard
`max(dot(N,L), 0)` terminator the far side of the ridge goes to 12 %, where the
reference has it at ~50 % and carries the soft cloud shadows of the unported
32-pass bake (`FUN_0040e923`). Measured with the light suppressed for scenes
0..3: `0x0730` 47.1 → 34.3, but `0x0900` 57.3 → 72.2 and `0x0930` 65.8 → 70.5,
i.e. the light is a net win and it is what the binary does, so it stays. There
is a second, pre-existing problem in that window — at `0x0710` the reference
shows a flat plain and the port shows the ridge close up, so the camera
disagrees; that is not something this work introduced.

**Object 3 — the spires (`SWEEP.md` item 6).** The array-A scatter now uses
`FUN_004078b6` (`srand(clusterIndex)`, Z drawn before X) instead of
`MG.scatter(seed: 1)`. `0x0600` 48.4 → **39.3**; median 38.6 → **23.3**.

**Objects 6, 8, 10 — the cloud layer.** In three steps, each measured on its own:

| change | obj 6 0x0f30 | obj 8 0x1a30 | obj 10 0x2310 | obj 10 0x2a30 | obj 4 0x0900 |
|---|---|---|---|---|---|
| baseline | 30.6 | 49.8 | 31.4 | 44.3 | 98.3 |
| + `opt10` polarity + material `0x1050`/`0x3091` + parenting scale | **23.1** | 66.4 | 32.7 | 38.3 | **57.3** |
| + `FUN_0040f27e`'s sky vertex alpha (`cloudParam + 1`) | 23.1 | **39.5** | **19.2** | **30.8** | 78.7 |

Object 6 is unaffected by the last step because it is the only scene with flag
bit 11 set, which is exactly the gate the original puts on it.

The parenting scale was A/B'd on its own because object 8 disliked it:
suppressing it gives obj 8 `0x1710` 47.4 → 13.4 and `0x1810` 61.0 → 25.9, but
obj 8 `0x1a30` 66.4 → 80.8, obj 10 `0x2310` 32.7 → 36.0, `0x2a30` 38.3 → 51.8
and obj 4 `0x0900` 57.3 → **120.0**. It is kept: it is read straight off
`FUN_004082a9`, and four of the five measurements want it.

**Object 7 — the array-B curtains (`SWEEP.md` item 1).** Rewritten from the
disassembly; see `SCENES_7_10.md` §10. `0x1410` 106.9 → 103.7 — a real but small
move, and the *geometry* is now verified correct (rendering it opaque fills the
frame exactly as the reference does). The texture's effective coverage is an
unresolved dead end, written up in full in §10.4 there.

## 6. What is still open

> **2026-08-05 — the first, third and fifth bullets are closed.** See
> `SCENES_7_10.md` §11 (the cloud composite, §11.3 correcting this file's sky
> vertex alpha), §12 (the compound prop, transcribed), §10.2/§10.5 (the array-B
> wind updater, ported) and §13 (object 4's camera, diagnosed).
> Whole sweep on the same harness: **median 27.49 → 26.70, mean 31.89 → 28.80**,
> and §5.2's one net loss — **object 4, 73.83 → 46.82** — is closed.

* ~~**The cloud render-target composite**~~ — **PORTED**, `SCENES_7_10.md` §11.
  It was worth 12.5 RMSE on object 8 (56 samples) and 27.0 on object 4 (24
  samples). §2's third bullet is corrected there too: the sky's vertex alpha is
  `255 - cloudParam`, not `cloudParam + 1` (there is a `neg` at 0x40f404 that
  Ghidra renders as a multiply by `-0x1000000`), which is worth a further 7.8 at
  0x1710 and is what makes object 8's cloud layer *thicken* into the storm.
* **The array-B texture coverage** — `SCENES_7_10.md` §10.4, and now **§10.5**,
  which shows the frame is bimodal in the shared RNG stream position (±18 luma,
  ±16 RMSE from a one-draw shift) and that the composite's 18 extra draws are
  what took 0x1410 from 103.7 to 70.5. The optical question is still open; the
  stream question is closed.
* **The 32-pass soft-shadow bake** (`FUN_0040e923`). Note it is *not* a factor
  for object 10: `FUN_0040e058`'s `param_14` is descriptor flag bit 8, which
  only scene 8 sets, and it forces `S = 1.0` — so the port's unshadowed limit is
  exact there and only there.
* **The compound prop** `FUN_0040c721` (object 5's array F, and impostor set 2
  which object 5's array D needs) — now fully **transcribed** in
  `SCENES_7_10.md` §12, deliberately not ported (§12.5: it draws 4864 randoms
  before objects 6..10 build, and §10.5 shows a wrong draw count is worse than
  none).
* ~~**The array-B wind updater** `FUN_0040c674`~~ — **PORTED** (`#stepCurtains`).
  Disassembled rather than trusted: Ghidra mistypes both loop-bound fields. It is
  RMSE-neutral by ablation (0x1520 = 31.75 with and without) but it is what the
  binary does.
* **Object 4's camera in `0x0708`–`0x0730`** — diagnosed in `SCENES_7_10.md` §13.
  It is *not* the camera resource, the active path, the terrain footprint or a
  neighbouring object; the port renders exactly the ridge its terrain contains at
  the position the spline gives. The live leads are the camera-speed model for
  scenes 1 and 2 (their paths do not fit §0's "one traversal per slot" rule) and
  scene 1's `terrainScale.y`.
* **Warm-up cost.** Objects 3..6 now animate, and object 5 flies 256
  butterflies, so `warmTo` is roughly 4× more expensive than before
  (`mat4Mul` self time at 0x1630 went 112 ms → 478 ms in the sweep's profile).
  Live playback is unaffected — `SWEEP.md` §4 already establishes that
  `__sonnetRender` is warm-up, not frame time — but the 354-sample sweep now
  takes several minutes and has twice destabilised headless Chrome near the end
  of a run.
