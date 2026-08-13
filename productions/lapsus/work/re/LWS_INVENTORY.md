# LWS inventory — what the 23 shipped scenes actually use

## The engine's real vocabulary

Of the **101 distinct keywords the 23 scenes use, only 31 exist anywhere in
`Lapsus.exe`.** Determined by testing each keyword as a NUL- or
space-delimited literal against the binary; the other 70 appear nowhere, so
the engine cannot be reading them (METHOD.md, "the binary is the source of
truth").

**Parsed** — `LWSC` `FirstFrame` `LastFrame` `FramesPerSecond`
`LoadObjectLayer` `AddNullObject` `AddLight` `AddCamera` `ObjectMotion`
`LightMotion` `CameraMotion` `NumChannels` `Channel` `ParentItem`
`LightName` `LightType` `LightColor` `LightIntensity` `CameraName`
`ZoomFactor` `AmbientColor` `AmbientIntensity` `BackdropColor`
`BackdropFog` `BGImage` `FogType` `FogColor` `FogMinDist` `FogMaxDist`
`Plugin` `EndPlugin`.

**Absent from the binary** — all 70 others, including everything about the
LightWave *editor* view (`ViewMode` `ViewZoomFactor` `ViewAimpoint`
`GridSize` `ShowObject` `ShowLight` `ShowCamera` `ShowMotionPath` …), the
renderer settings (`RenderMode` `Antialiasing` `RayTraceEffects`
`MotionBlur` `FieldRendering` `ResolutionMultiplier` `PixelAspect`
`FrameSize` …), the IK/joint system (`HController` `BController`
`*JointStiffness` `*Limits` `GoalObject` `FullTimeIK` …), and the whole
gradient backdrop (`SolidBackdrop` `ZenithColor` `SkyColor` `GroundColor`
`NadirColor`).

Consequences that bite a port:

- **`BackdropColor` is the clear colour** — and the fog colour when
  `BackdropFog 1` is set. Three scenes carry a non-black value
  (`higherbiing`, `kuubiotekniikka`, `silli`, all three of them fog scenes),
  so ignoring it clears them to black incorrectly. There is **no gradient
  backdrop** at all: `SolidBackdrop` and the four sky/ground colours are not
  in the binary.
- **`FogMinAmount` / `FogMaxAmount` are absent**, independently confirming
  RENDER.md §8's instruction to ignore them.
- **`ShowObject` is absent**, so per-item visibility flags do nothing.
- `BGImage` appears in six scenes but always bare, with no filename, so no
  background image is ever loaded despite the keyword being supported.

### Correction to an earlier claim in this file

The note below originally said the `FirstFrame`/`LastFrame`/`Preview*`
headers are authoring metadata "the engine never reads". That is right for
`FrameStep`, `CurrentFrame` and the three `Preview*` keywords — genuinely
absent — but **`FirstFrame` and `LastFrame` *are* parsed**. The behavioural
conclusion is unchanged and still rests on the evaluator's own code
(`FUN_0041ab80`: absolute seconds, clamped, no scaling), not on the headers'
absence. Parsed is not the same as used.

Parsed by `work/js/lws.mjs` (run the table below via the snippet in its
header). All scenes are **LWSC version 3, text, 30 fps**. Every envelope key
is spantype 0 = TCB (Kochanek-Bartels) except a handful of spantype 3
(Linear) in `rad_out.lws`; every envelope ends `Behaviors 1 1` (Reset).
Motion channels: **objects and lights carry 9** (`px py pz  h p b  sx sy sz`,
meters / radians); **cameras carry 6** — no scale. Across the 23 scenes that
is 201 nine-channel motions and 27 six-channel ones, and 27 is exactly the
camera count. A renderer that requires 9 channels silently falls back to
identity for every camera, i.e. puts the viewer at the world origin inside
the geometry — which reads as a broken projection rather than as a missing
transform, and cost a debugging round on the first static frame.

`ParentItem` values are **hex item IDs without an `0x` prefix**: the top
nibble is the type (1 object, 2 light, 3 camera, 4 bone) and the remainder is
that type's 0-based index, so `10000002` is object #2. Parsing it as decimal
resolves every parent to nothing and looks like "this scene has no
parenting". All 79 parents across the archive resolve once decoded properly.

**RESOLVED — do not derive timing from `LastFrame`.** The `FirstFrame`/
`LastFrame`/`Preview*` headers are LightWave *authoring* metadata and the
engine never reads them. Envelope key times are **absolute seconds**, and the
keys run far past the nominal 2 s range (paleksi, kartonki, viherio, rad_out
all key out to 20 s). Verified two ways:

1. In the evaluator `FUN_0041ab80` (read from `disasm.asm` — the decompiler
   dropped its math, x87-audit **SUSPECT**, 118 x87 instrs): keys are a
   24-byte stride array (`ADD EBX,0x18`; the `0x2aaaaaab`+`SAR 2` magic is
   division by 24), the search compares the query time against `key[i].t` at
   offset 0, and the TCB 4-point stencil (k-2,k-1,k,k+1) **clamps** its
   indices. There is no modulo, no wrap, no scaling anywhere in the function.
2. Cross-check against the recovered schedule (`re/ENGINE.md` §5): 19 of 20
   scheduled scenes have `maxKeyTime >= partDuration`. The single exception,
   `kuubiotekniikka` (12.0 s of keys in a 13.8 s slot), is consistent with
   clamping — it holds its final pose for the last 1.8 s.

So a part's animation is simply "evaluate every envelope at the part's
localTime, in seconds, clamped at both ends".

| scene | frames | objects | nulls | lights | cameras | keys | fog |
|---|---|---:|---:|---:|---:|---:|---:|
| diskojea.lws | 1-60 | 4 | 0 | 2 | 1 | 233 | 0 |
| flu2.lws | 1-60 | 2 | 0 | 2 | 1 | 54 | 0 |
| hairball.lws | 1-60 | 0 | 4 | 1 | 1 | 166 | 0 |
| hedi.lws | 1-60 | 5 | 3 | 1 | 1 | 475 | 0 |
| higherbiing.lws | 1-60 | 13 | 0 | 2 | 3 | 349 | 1 |
| hulluolli.lws | 1-60 | 2 | 1 | 1 | 1 | 57 | 0 |
| kaivoalieni.lws | 1-60 | 15 | 0 | 2 | 1 | 326 | 0 |
| kartonki.lws | 1-60 | 2 | 0 | 1 | 1 | 72 | 0 |
| kieku.lws | 1-60 | 6 | 0 | 2 | 1 | 132 | 0 |
| krediili.lws | 1-120 | 7 | 2 | 1 | 1 | 456 | 0 |
| kuubiotekniikka.lws | 1-60 | 32 | 1 | 1 | 1 | 609 | 1 |
| made.lws | 1-60 | 5 | 0 | 1 | 1 | 73 | 0 |
| mela.lws | 1-60 | 6 | 2 | 2 | 1 | 816 | 0 |
| morko.lws | 1-30 | 27 | 2 | 3 | 3 | 2727 | 0 |
| paleksi.lws | 1-60 | 3 | 1 | 1 | 1 | 150 | 1 |
| pehko.lws | 1-60 | 0 | 1 | 1 | 1 | 165 | 0 |
| pene.lws | 1-60 | 1 | 0 | 1 | 1 | 33 | 0 |
| rad_out.lws | 1-60 | 3 | 0 | 1 | 1 | 219 | 0 |
| silli.lws | 1-60 | 1 | 0 | 2 | 1 | 45 | 1 |
| sittis.lws | 1-60 | 8 | 0 | 1 | 1 | 303 | 0 |
| syrjakyla.lws | 1-60 | 1 | 0 | 1 | 1 | 39 | 0 |
| turska.lws | 1-60 | 3 | 0 | 2 | 1 | 78 | 0 |
| viherio.lws | 1-60 | 5 | 0 | 1 | 1 | 213 | 1 |

Totals: **228 items, 7,790 keys.**

Notes:
- `hairball.lws` and `pehko.lws` have **zero mesh objects** — only animated
  nulls + camera. These are the hair-system parts; geometry comes from
  `data/hairs/*.txt` at runtime, presumably attached to the nulls. Neither
  name is in the exe's 21-factory list — `Hairball` is (factory
  FUN_00405cd0), `Pehko` is not: pehko.lws must be loaded by another part
  (candidate: same hair engine, second use).
- 23 .lws files vs 21 factories: `pehko.lws` and one factory (`flu2`) pair
  up unevenly — cross-check against the sequencer's play order when known.
- `ParentItem` hierarchies are heavily used (kuubiotekniikka parents all 32
  objects, morko 26 of 27+2) — transform composition order matters.
- Plugin blocks are empty `.BRDF` MasterHandler stubs (authoring residue) —
  22 across 6 scenes, no payload.
- `higherbiing.lws` and `morko.lws` carry **multiple cameras** (3 each) —
  the engine picks/cuts between them somehow.
- Fog on in 5 scenes (`FogType 1`): higherbiing, kuubiotekniikka, paleksi,
  silli, viherio. Remember the GL_EXP-vs-linear trap (METHOD.md §3).
