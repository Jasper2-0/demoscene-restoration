# Fix-loop log

One entry per iteration (re/FIXLOOP.md).  Newest last.

## #1 — 2026-08-11 — scene 0 (spires): growth trajectory root-caused to the capture machine; HARD STOP surfaced

* **Target**: obj 3, worst scene median in the demo (44.57; band 0x0508-0x0630
  at 35-63 RMSE, lowRmse≈rmse = structural).
* **Evidence chain**: frames at 0x0608/0x0628 (over-grown blades with lit
  undersides vs sparser uniform reference; steady state structurally
  near-identical) → binary xray 0x40bfc1 (delay/t same clock — candidate
  CLOSED; `T +=` unconditional — port matches) → material `push 0x20`
  @0x40BF15 + texgen 2 has no dark texels + `--lighting=legacy` null ⇒ the
  black is over-growth, not shading → `?warmstep=` rate scan, 15 positions ×
  6 rates: **two-phase fit (early ≈30 fps, late =60 fps), no constant rate
  exists**; steady-state residual = frozen-wobble-phase registration = hard
  floor vs this capture.
* **Landed**: `?warmstep=` probe param (main.js WARM_FPS, sweep `--warmstep=`
  pass-through; defaults unchanged), SPIRE_REOPEN.md session record.
  No port-code change — nothing in the port was wrong.
* **Verdict**: measurement, not regression; baseline untouched.
* **Surfaced to Jasper (hard stop: harness calibration)**: accept the floor
  and judge scene 0 by eye (recommended) vs fit a rate-trajectory model into
  the warm-up. Awaiting his call before touching the instrument.
  * **Decision (Jasper, 2026-08-11): accept the floor.** Scene 0 is judged by
    eye from here; harness stays un-fitted; loop moves to scene 1.

## #2 — 2026-08-11 — scene 1 (lakes): camera SPLINES exonerated by the oracle; spike localised to 0x0928-0x0930

* **Target**: obj 4's only spike (0x0928 52.9 / 0x0930 56.7 vs scene median
  18.8; ours 9-18 luminance BRIGHTER, structural).  Frames: composition
  shifted (our camera lower/closer than the reference's) + our mid-left water
  a bright textured teal with red speckles where the reference is dark.
* **Evidence chain**: new oracle target `re/oracle/targets/spline.py`
  (FUN_00405a29 load + FUN_004058a6 eval; the eval GATE is byte +0x10c AND
  key-ptr +0x12c — a zeroed struct silently reuses the cached pose, worth
  remembering) → **all 16 camera paths dense-sampled: the port's
  CameraPath.evaluate is EXACT vs the original executing** (max Δeye 0.0000,
  worst Δtarget 2e-4 = one sin/cos ulp, res 41).  Landed as a permanent
  oracle_test section.
* **Consequences**: (a) scene 1's composition drift is NOT the spline — next
  suspects are the TIME driving it (camera clock near path end) and the water
  rendering (teal + red speckle vs dark reference); (b) **the scene-2 open
  item "path-2 resource 41 spline evaluation near camTime 25.5" is CLOSED as
  a suspect** — res 41's eval is exact there; the scene-2 lead moves to the
  driving time as well.
* **Status**: iteration closed with the oracle result landed; the clock/water
  investigation is the next iteration's target (bowl test at ±rows on 0x0930,
  then the water pass draw state).
  * **Bowl test (±rows vs ref@0x0930): minimum exactly at 0** (62.7 / 56.7 /
    103.9 around it) — the CLOCK is right too, same conclusion as scene 2's
    bowl.  With spline AND clock exact, the spike is the WATER COMPOSITE'S
    LOOK: ours +18 mean luminance in the shot, and the water region carries
    scattered red-brown texels (terrain-through-clip-plane suspected — same
    family as the old "bark-red speckle" note at 0x1210; texture 13 itself
    contains NO red, verified).  Next iteration: decode material 0x1019's
    draw state against the binary, audit the reflection/clip pass's state at
    this camera, and find the red texels' source (readback which texture the
    speckled fragments sample).

## #3 — 2026-08-11 — scene 1's spike ATTRIBUTED: capture-side local A/V drift; water composite exonerated; two of my own reads retracted

* **Water composite (0x0930)**: new debug ablation knob `globalThis.__waterDbg`
  ('noreflect'|'noclip'|'nosurface', faithful when unset — kept as a
  verification aid).  ALL ablations WORSEN the region (base 62.9 vs 97.5 /
  68.1 / 74.5) and the water region's mean RGB matches the reference within
  3/255 (ours 91,102,94 vs ref 88,101,99).  **RETRACTED: my "red speckles"
  and "+18 brighter water" reads** — census finds zero red texels in either
  image; both were artifacts of eyeballing an upscaled crop.  The +18 was the
  whole frame, dominated by composition shift.
* **The composition/timing drift**: fine bowl (±1..6 rows, single-ref) has a
  deep clean minimum at **−3 rows (35.4 vs 56.7 at 0)** at 0x0930, −2 at
  0x0920, ~0 at 0x0838/0x0900/0x0730 — grows late in path 2 only.  Port
  camera exonerated COMPLETELY: spline eval oracle-exact (iter 2), advance
  expression identical to the binary (sonnet.c:7626 `camTime += camSpeed *
  dt`, time-true; the original evaluates THEN advances — worth 0.1 rows,
  negligible).  **Attribution: the CAPTURE's local video-behind-audio drift
  (~0.49 s around t≈104 s)** — decisive evidence: the reference's music-locked
  TEXT REVEAL also lags ours at the same position ("…conceived durin" vs
  "…during spring"), and the bowl minimum is deep and clean, i.e. text +
  camera + water all match best at the SAME −3 — the signature of the video
  stream lagging the audio it was aligned by, not of any single system.
* **Two instrument lessons**: (a) a ±8-row bowl cannot see a −3-row offset —
  match bowl granularity to the hypothesis; (b) position arithmetic: rows are
  0..63, `0x0900 - 1` is NOT a valid position (the "98 RMSE cliff" was my own
  invalid-position render, not data).
* **Implication for the sweep**: the constant 2.43 s offset model under-fits
  locally; frames near capture drift carry inflated RMSE as MEASUREMENT
  error.  Option (Jasper's call, harness change): per-position offset search
  (bounded ±4 rows, like the flare A/B's per-window lag search) reported as a
  separate `refDrift` column — or accept and annotate.  Scene 1 has no
  port-side work left at its spike.
  * **Decision (Jasper): refDrift column added to sweep.mjs.**  For samples
    with rmse > 20, our frame is also scored against reference frames at
    -2..+4 ROW time offsets (extractions cached as refd_*.png); refDrift +
    driftRmse land in samplesDetail, a driftSummary in the payload, and the
    console flags samples whose error is substantially capture drift.  Base
    metric untouched (history comparable).  Validated: 0x0920/0x0928 flag at
    +2 rows (30.5->12.9, 52.9->26.3); spires/dandelion controls stay
    unflagged; near fades the ref-side search understates the recovery (sign
    is the signal, magnitude a lower bound — comment in sweep.mjs).

## #4 — 2026-08-12 — scene 2: WHOLE-BUILD EMULATION LANDED; H3 closed with proof; the prop displacement cornered to the per-frame updater

* **New oracle target `targets/scenebuild.py`**: emulates Landscape ctor +
  build (FUN_004082a9) for scenes 0,1,2 IN ORDER from image seed 1 — the
  original's own build code end to end under the fake D3D.  Harness facts
  learned: the FACTORY installs the vtable (@0x418e68), not the ctor; the
  build tail calls reset()+render(0) through it (render stubbed — stream-
  inert for scenes 0-2, CAVEAT for precip scenes 5/7); the shadow bake is
  fast-forwarded in closed form (pinned 2·65536·16 draws); d3d8fake gained a
  render-state/TSS store, corrected SetTexture/SetTextureStageState offsets
  (0xf4/0xfc — my miscount aliased DeleteStateBlock, caught by the new
  self-identifying unknown-slot stubs), and GetRenderState pairs.
* **⭐ EVERY boundary matches the port exactly** (trace.json vs __bakeProbe):
  set0 0xb9583054→ret 0xa661ec3b (inline texgen inside buildTree, as the
  tree oracle proved) → set1 0x577c5291→0x3316173d → set2 dandelion entry
  0x3316173d → **first-cluster yaw 0x5f95db36** → … → **array-F entry
  0x5e3e2400**.  **H3 CLOSED**: 0xb67fd936 was set-2 post-texgens;
  0x5f95db36 = post-records = the true pre-yaw state, in original and port
  alike; the "512-draw gap" was the set-2 record draws, already correctly
  placed.  stream_pins.json rewritten with emulator statuses.
* **Prop head displacement (0x0c38, ~175 px)**: still present, and now
  cornered — eliminated this iteration: capture drift (fine bowl shallow,
  min −1 Δ0.77), frame-rate coupling (warmstep 30 vs 60: Δ0.02), stream
  entry (emulator-proven identical).  Previously eliminated: spline (oracle
  exact), camera clock (binary-identical advance), prop transform (pinned).
  **The only unverified layer left is FUN_0040cfed's per-frame wind/offset
  arithmetic (amplitude/sign/phase of the stem-tip vector the head rides).**
  Next iteration: time-step the ORIGINAL's updater on the emulated scene-2
  object and dump the 128 record offsets + stem verts vs #stepProps at the
  same t.

## #5 — 2026-08-12 — scene 2's prop head: EVERY layer proven correct except the wind clock, which leads by ~1 s

Instruments landed (both inert unless set, in kind with `?flare=0`):
`globalThis.__propT` (force the prop wind clock) and `__camTimeOverride`
(force this frame's camera-path time).  Verified inert: 3-position sweep
byte-identical RMSE to the baseline run.

**Proven equal to the ORIGINAL, executing** (emulated scene-2 build, fixture
`scenebuild/scenes_0_1_2`):
* prop placement `(0,0,0)` and scale `0.15` — read out of the emulated
  object's node (`stem+0x88` / `+0x94`).  The terrain snap IS in both
  (`if (terrain) y = terrainHeight(x,z) + y`, 0x40CD0F-0x40CD2C) and
  contributes exactly 0 here.
* prop geometry: stem/twig/leaf bboxes agree; 128 records agree field for
  field (velocities and lifetimes to 5 decimals).
* `FUN_0040cfed` transcription: re-read line by line against the port —
  ring loop, `(SX,0,SZ)` from the LAST ring, the lifetime overwrite, the
  16-twig / 144-leaf application, all match.
* gating: the original early-outs on the visible byte (`00408EFF cmp
  byte [esi+0x15],0`) AFTER its clock call — exactly the port's `#tickClock`
  then `if (!this.visible) return`.  Rate 30.0 is the factory default and
  object 5 receives NO m254, so the clock scale matches too.
* the m4 handler only swaps the root's camera pointer (0x409BB9-0x409BD3) —
  a fresh path starts at its own zeroed time, as the port's comment says.

**The fault is isolated to the wind clock, and the camera is exonerated by
measurement**: per-band horizontal shift at 0x0c38 — trees/sky (far) +6 px,
horizon/field (mid) +2 px, **text (music-locked) +1 px**, head band (3.2
units from the eye) ≥40 px.  Sweeping `__propT` against the reference gives
**dT = −0.300 at BOTH 0x0c34 and 0x0c3a** (head-band SAD 43.05 → 15.80 and
36.06 → 23.64), i.e. our prop clock LEADS by ≈0.3 T-units ≈ 1 s of scene
time, constant across those 6 rows and growing from ~0x0c10 (where ours and
the reference agree to 1 px).

**Refuted by measurement, so do not retry**: capture drift (whole-frame RMSE
rises monotonically 49.9 → 63.8 over 0..+10 rows, and the text is aligned);
the `min(dt,4)` clamp / capture frame rate (warm rates 12/8/6/5 fps all make
0x0c34 and 0x0c3a WORSE, 49.9 → 61.6); stream position (emulator-identical);
spline and camera time (iteration 2 + the band analysis above).

**NOT FIXED, deliberately.** Subtracting 0.3 from T would reproduce the
reference without a mechanism — the same trade the project rejected for
`TREE.SPREAD = 0.3`.  Next iteration's one question: what makes the
ORIGINAL's prop clock accumulate ~1 s less between 0x0a00 and 0x0c34?  The
cheap decisive test is to emulate `FUN_00408eef` on the built scene-2 object
for a scripted ms sequence and read `prop+0x0c` directly — the same
executable-oracle move, one layer up.

Harness change: `refDrift`'s search window widened to −4..+6 rows (was
−2..+4) — it could not have seen a ~1 s offset, and a window must cover what
you are willing to declare absent.

Harness robustness (same iteration): a full sweep died mid-run with
puppeteer's `detached Frame` — the long-documented "budget for one retry"
crash after a few hundred cold warm-ups.  That was acceptable when a human
launched sweeps; the pipeline runs unattended, so `sweep.mjs` now RELAUNCHES
the browser and retries the sample (up to 3 times) on the transient renderer
deaths only (`detached Frame|Target closed|Session closed|Protocol error|
Connection closed`), recording `browserRelaunches` in results.json.  Not a
correctness compromise: every sample is a cold boot anyway, which is exactly
what a relaunch produces.  Verified behaviour-neutral (3 positions,
byte-identical RMSE, 0 relaunches needed).

Second robustness pass (the first was incomplete and the pipeline said so):
relaunching the browser inside the SAMPLE loop was not enough — the transient
renderer death moved to the PROFILE and FLARE-COST phases, which run last on
a renderer that has already served 354 cold warm-ups, and killed a run whose
354 samples were all valid.  Those phases are diagnostics, not data, so they
are now individually caught: the failure is recorded as `profileError` /
`flareCostError` in results.json (and the browser relaunched) instead of
discarding the run.  `run_all.mjs` also keeps the FIRST error line beside the
stack tail — the truncated report had hidden the actual message behind ten
lines of puppeteer internals, which is why the first fix aimed at the wrong
phase.

**Session close (2026-08-12): `./run-verify.sh --full` = 13/13 PASS**, sweep
443 s with 0 relaunches, verdict "OK — within noise of the baseline".  The
port itself is UNCHANGED by iterations 3–5 (only inert instruments and
harness robustness landed) — every divergence chased in those rounds was
either measurement error or remains an honestly-open item with its mechanism
un-found.

## #6 — 2026-08-12 — the CLOCK read at last: two pinned port defects FIXED (they were masking each other)

Chasing the prop clock's ~0.32 lead forced a full disassembly of
`FUN_004060db` (0x4060db-0x406124) — the base frame-delta clock, and the one
function in the chain nobody had ever read.  Two deviations, both PINNED,
both now corrected in `#tickClock`, and they had to land TOGETHER:

* **`Math.min(dt, 4)` is not in the binary.** There is no comparison against
  4.0 anywhere in the function; the only `fcomp` is the bias test against 0
  (`0x406106`).  The original's clock is time-true at any frame rate — a slow
  frame advances the animation by the full elapsed time.  (This also kills,
  with a reading rather than an inference, the "the capture machine's slow
  frames lost animation time" theory that iteration 5 had already refuted by
  measurement.)
* **`lastMs` must be seeded with the CURRENT ms, not 0.**  The base ctor does
  `call 0x402f01 / mov [esi+0x10],eax` (`FUN_004060c9` @0x4060d1), so the
  first frame after a reset has a delta of ~0.  The port seeded 0, which made
  the first tick after any mid-demo reset compute a delta of the entire
  elapsed song — the spike the invented clamp was silently absorbing.

Removing the clamp alone would have let that spike through as a
multi-thousand-unit dt; fixing `lastMs` alone would have left a clamp the
original does not have.  Kept deliberately: the `d > 0` guard, which is NOT
in the binary — the original's counter is a monotonic table read
(`FUN_004100db`), while the port's clock can be re-anchored by a scene jump,
so it is a port-only hazard needing a port-only guard.

Verified: T at 0x0c34 unchanged (8.8333) — the cold warm-up never clamped
(0 of 8027 ticks) and always saw ms from 0, so both fixes are inert on the
capture path by construction; sweep spot-check byte-identical at 4 positions;
`live_test` ALL PASS (live playback is where the clamp actually bit).

**The 0.32 lead itself is NOT explained by the clock**, and the clock is now
read rather than modelled, so that avenue is closed honestly:
* our accumulation is time-true and was measured as such (8027 ticks,
  dtSum 4013.5, mean dt 0.4999 at 60 fps; T = 0.3 x elapsed exactly);
* the original's code is time-true too (no clamp; its double read of the ms
  counter loses only the gap between two adjacent reads of the SAME
  per-block table entry — `FUN_004100db` is a bare memory read, so ~0, not
  the ~1 ms/frame the deficit would need).
⇒ Both implementations should produce the same T at the same music position.
The reference's head nonetheless implies 0.32 less, with placement,
geometry, records, formula, rate (factory writes 30.0f @0x402E8C), gating and
stream all emulator-proven equal, and with drift/frame-rate refuted.  That is
where it stands: a fully-instrumented, fully-eliminated residual whose only
remaining explanation is the 2001 runtime itself — the same class as scene
0's verdict, reached this time by reading every line rather than by
exhaustion.

## #7 — 2026-08-12 — scene 4 (beach): the KNOWN, UNDONE harness fix landed — the metric was over-reporting the demo's worst band by ~30 RMSE

`re/scenes/FLARE.md` had recorded, and nobody had built, the fix for a
measurement fault: the warm-up ticks WITHOUT device calls, so the lens
flare's occlusion query cannot run and `updateOffline` assumes the sun is
visible; the flare is an INTEGRATOR (~40 frames of memory), so a
warm-then-capture arrives with `cur` pinned at max and one rendered frame can
only decay it a step.  Confirmed exactly in the baseline: at 0x1400-0x1420
the query reports `visible:false, fraction:0` while `cur` is 791-798 of 800,
and we sit +30..46 luminance over the reference with `lowRmse ~ rmse`.

Landed `?flareburst=N` (main.js `warmToBurst`, sweep `--flareburst=N`): the
warm loop stops N steps short and those N frames are replayed as REAL renders,
so the query runs and the integrator settles honestly; the last render lands
exactly on the intended capture ms.  Costs N live frames (0.08-3.9 ms each),
not N warm-ups.

MEASURED at N=48 on the beach's worst band: 0x1400 70.8 -> 41.5, 0x1410
75.2 -> 47.9, 0x1420 78.1 -> 49.4, 0x1430 77.3 -> 45.3 (flare `cur` 794 ->
314).  0x1428 is UNCHANGED at 81.5 because there the query legitimately
reports the sun visible (fraction 0.125) — and the frames show why: the
reference at 0x1428 is INSIDE a frame-filling wall of array-B strands that
occludes the sun completely, while ours is sparse enough to see the horizon.
So the flare artifact and the curtain-density defect were stacked on the same
samples, and removing the first exposes the second cleanly.

**Burst landed as the default (48 frames).**  Two implementation faults were
found and fixed by measurement before it could be trusted, both of which had
made the first full sweep WORSE (global median 25.49 -> 28.07):
* **Double draw.**  The burst rendered a frame at the capture ms and then
  `renderWarmed` rendered the same frame again.  A second draw is not free —
  alpha-blended content composites over itself (the original's own loading
  screen depends on exactly that, re/PRELOADER.md).  Text-only frames, which
  contain no flare at all, regressed 7.2 -> 20.0; that impossibility is what
  exposed it.  The burst now stops one frame short.
* **Events fired early.**  `warmStep` ended with an unconditional
  `dispatchUpTo(pos)`, so when the warm loop stopped short every event of the
  skipped span fired before the burst frames rendered — text fades and camera
  cuts triggered ~0.8 s early.  Now conditional on the loop actually reaching
  `endMs`.

Full-sweep result after both fixes: **5 beach samples -27..-29 each**
(0x1400-0x1420), 2 autumn -13..-15 (0x1728/0x1730), 0x0c08 -4.1; against 3
beach +5.2..+6.5 (0x1328-0x1338) and 2 autumn +2 where the now-honest query
CLOSES a sun the reference shows — a real difference the pinned-open flare
had been masking, not a new fault.  Net -155 RMSE; mean 27.29 -> 26.91,
median unchanged (the wins are tail samples).  `?flareburst=0` restores the
old behaviour; `warm_equiv_test`'s documented failure count moves 6 -> 8
because the cold path now differs further from `--seq`, which is exactly what
that test exists to demonstrate.

## #8 — 2026-08-12 — scene 3 (cloud sea): cloud-layer geometry CONFIRMED against the original

New target `targets/cloudsky.py` dumps the original's cloud-layer mesh
(`Landscape+0xa8`, the node `FUN_00408eef` hides/shows at 0x409605).  Scene 3
built in order 0..3: **32 verts, y 204..232, vertex alphas 255/223/191/159/127
with counts 4/8/8/8/4 — the port's mesh matches every one of those exactly**.
The RGB differs only because the emulation stubs the render (build-time white
0xffffff vs the port's post-frame 0x1f1f1f), which is the per-frame grey the
port already implements — NOT a divergence.  So the 8-layer stack is right and
SCENE3_CLOUDSEA.md's "look at the layers' vertex alphas" line of enquiry is
CLOSED; the remaining contrast deficit is in the composite's rendering, not
its geometry.

⚠ `targets/curtain.py` (scene 4 textures) is NOT trustworthy yet and its
output must not be quoted: the array-B mesh offset guess (`Landscape+0x130`)
produced nothing, and all 18 dumped 256x256 textures report identical
coverage, which smells like the fake LockRect handing back one buffer rather
than 18 genuinely identical images.  Fix the offset and prove two textures
differ before drawing any conclusion from it.

## #9 — 2026-08-12 — scene 7 (winter): "missing detail" REFUTED, the real defect measured instead

Two premises died to measurement before any work was done on them:
* **"The ground is smooth mush where the reference has fine detail" — FALSE.**
  High-frequency energy (mean |laplacian|) over the ground band: ours 5.62 vs
  reference 5.84 (upper band 6.52 vs 6.33).  The reference's apparent "grass
  detail" is largely video-compression noise.  Measure the premise.
* **"The stage-1 detail map never reaches the screen" — FALSE.**  The shim
  routes stage 1 through `aUV1` (`genTexcoord`, defaults `TEXCOORDINDEX =
  stage`), the terrain's uv1 tiles 0..15.875 as designed, and ablating
  `material.texture1` changes the frame.

What IS wrong is colour, and it is confined to the terrain: at 0x2228 the
**sky matches to a point** (ours [208.0, 210.3, 211.5] vs ref
[208.1, 211.2, 212.1]) while the **ground is half as bright and far more
saturated** — ours [94.8, 81.3, 37.7] vs ref [154.9, 144.2, 115.4].
Fog was verified applied and correct (mode LINEAR via
`D3DRS_FOGVERTEXMODE`, range fog on, 50->300 from the descriptor; ablation:
fog-off ground [80.1, 64.0, 13.4] -> fog-on [94.7, 81.3, 37.6], an f~0.88
consistent with near-ground distances).

**The measured lead**: winter's two ground textures are progA 20 =
[109.2, 83.5, 1.9] (olive, essentially NO blue) and progB 18 =
[123.1, 111.5, 101.9] (grey).  The reference ground's blue is 115 — i.e.
**B-dominant** — while our mean terrain normal.y is 0.908, so
`out = A*W + B*(1-W)` gives us **91% A**.  A flipped mix would give
[122, 109, 92], much closer in hue, though still ~1.5x short of the
reference's brightness, so there is a second factor as well.  Next: check the
blend weight's polarity and the object-space normal derivation for this
terrain against the binary (autumn shares the same A/B pair and IS
A-dominant in the reference, so the descriptor pair is not simply swapped —
the weight itself must differ).  No change shipped: an unjustified flip would
be a fudge, and the brightness gap says the story is not yet complete.

## #10 — 2026-08-12 — scene 4 (beach): flare artifact FIXED; curtain verified component-by-component; stream-position theory RETIRED

The beach's worst band had TWO faults stacked on the same samples.  The first
is fixed (entry #7: the flare burst, 5 samples -27..-29).  The second — the
array-B curtain reading sparse where the reference is a dense wall — was
attacked with the disassembly and the emulator, and every component came back
EXACT:

* **Texture generator** (0x40C5AC-0x40C60A, read instruction by instruction):
  per column `keep = ftol(rand01()*128) >= 0x60` giving alpha **255 or 0** (a
  BINARY mask, not graded), `start = ftol(rand01()*64)` rows transparent from
  the top, texel RGB 0x7f40, row stride 0x400.  `buildCurtainTexture()`
  matches line for line.
* **Vertex alpha** = `ftol(255 - 2*d)` with `d = |origin - (px, 0, pz)|` via
  `FUN_00408c11` (a plain 3-D distance, 0x40C46F-0x40C47C) — the port's
  `dx = org[0]-px, dy = org[1], dz = org[2]-pz` is the same expression.
* **Vertex RGB** = `ftol(shadowAt(x,z) * 255)` (0x40C430) — matches, shadow wired.
* Strip count 128, origin (50,0,-100), material 0x1050, alphaRef 32 — match.
* Array-B lives at `Landscape+300 (0x12c)`, 0x14-byte records (+0x130 is array A).

**The stream-position theory is RETIRED.**  `targets/scenebuild.py` now records
boundaries at the curtain builder and its texture loop, giving the number that
was never obtainable before: the ORIGINAL enters the curtain texture loop at
stream state **0x64d5ad2c** (2048 geometry draws after `curtain.entry`
0xe929e52c, then exactly 2 draws per column x 256).  Generating our texture
from THAT state keeps **75 of 256 columns**, versus 70 from arbitrary states —
stream position selects WHICH columns, not HOW MANY.  Density is a ~25%
Bernoulli process by construction, so SCENES_7_10 §10.4/§10.5's bimodality is
a which-columns effect worth a few RMSE and cannot explain "ours sparse,
reference a wall".  The residual is placement/coverage relative to the camera
(origin (50,0,-100) vs camera (-23.9, 131.2, -71.3) at 0x1428) — where the
next iteration should start, not the texture and not the stream.

**0x1428 residual — two more candidates eliminated by ablation (do not retry):**
* **Curtain alpha is not it.** Forcing every curtain vertex to alpha 255 moves
  the frame only 85.3 -> 81.0; tripling alpha gives 81.4.  The strands being
  semi-transparent costs ~4 RMSE, not 40.
* **Strand height is not it.** Scaling the curtain's Y about its base by
  2/3/5x makes it monotonically WORSE (85.3 -> 102.7 -> 103.5 -> 104.2), so
  our strands are not too short — despite the camera (y 131.2) sitting near
  the top of the curtain's y-span (73.3..140.5).

So for 0x1428 specifically: texture (exact), stream position (retired),
vertex alpha (~4 RMSE), strand height (refuted), geometry/material/origin
(all match the binary).  Its neighbours 0x1400-0x1420 ARE fixed (70-78 ->
41-49 via the flare burst).  Note `refDrift` flags 0x1428 at +4 rows
(81.5 -> 72.7), so part of what remains there is measurement.  The next
candidate is the composition itself — which curtain patch/camera the frame is
looking through — not any property of the strands.

**⚠ A BUG IN MY OWN CHANGE, caught by re-reading the blessed baseline: the
burst default never applied.**  `Number(params.get('flareburst'))` yields **0**
for an ABSENT param (`Number(null) === 0`), and 0 passes a `>= 0 && <= 240`
range check — so the "default 48" silently resolved to 0 and the baseline was
blessed WITHOUT the burst (0x1400 sat at 70.83 with flare `cur` 794, the
pinned value).  The full-sweep numbers reported earlier were measured with an
explicit `--flareburst=48` and are correct; only the default was dead.  Fixed
by testing for the param's presence before converting.  Verified: 0x1400
70.83 -> 41.53 with `cur` 314, text frames unchanged.  **Lesson: reading an
absent query param through `Number()` and range-checking it defeats the
default — and a "default on" change must be verified by reading a value out of
the artifact it produces, not by trusting the edit.**  (`WARM_FPS` has the
same shape but is safe by luck: its `>= 5` test rejects the 0.)

**Scene 7 (winter) — further candidates eliminated, still no shippable fix:**
* **Particle size**: the binary picks `local_1c = 5.0` (rain) / `1.0` (snow) at
  0x40D8xx and uses it as the quad's Y half-extent; the port already has
  `hh = isRain ? 5.0 : 1.0` with the same corner set.  Match.
* **Particle count / alpha**: descriptor asks 4096, the port builds 4096
  (16384 mesh verts), quadScale [1,1,1], `precipAlpha` 256 (full).  Match.
* **Ground bake inputs**: progA 20 mean [109.2, 83.5, 1.9], progB 18 mean
  [123.1, 111.5, 101.9] — both emulator-verified textures; our bake means
  [108.0, 84.2, 11.2] with normal.y in 0.181..1.0, mean 0.908.
* Autumn (same A/B pair) has mean normal.y **0.649** vs winter's **0.908**,
  which is why autumn reads warm and winter reads olive in our render — the
  weight is the difference, and it follows from each scene's own heightmap.

⚠ `targets/curtain.py`'s texture dump is still NOT validated — scene 7's
dumped 256x256 means come out at ~26-29% of the corresponding texgen
programs' means, which smells like a partially-written LockRect buffer rather
than the original's real pixels.  It must be validated against a known
texture before ANY conclusion is drawn from it.  Nothing in this entry relies
on it.

**Position on shipping**: every winter component reachable by measurement
matches the binary, so there is no divergence to correct — only an unexplained
ground-luminance gap.  Shipping a blend flip or a brightness factor to close
it would be exactly the `TREE.SPREAD = 0.3` trade the project rejected, and
the same judgement Jasper endorsed for scene 0's floor.  The lead stays
recorded and unshipped.

**Harness, third robustness pass (the burst made the renderer work harder):**
a full sweep died with a `ProtocolError` my retry did not recognise — puppeteer
reports a protocol TIMEOUT as a ProtocolError whose message says "timed out",
not "Target closed".  With the burst, one capture call warms the whole script
AND renders 48 real frames, so a slow late sample can cross the default 180 s
per-call deadline.  Three fixes: the crash test now also matches "timed out" /
the ProtocolError class, `protocolTimeout` is raised to 600 s at launch, and
the RECOVERY path (relaunch + re-boot) is itself wrapped so a failure there
cannot escape the retry it exists to serve.  Pipeline green afterwards
(13/13, sweep 378.9 s).

## #11 — 2026-08-12 — JASPER'S FOUR VIDEO OBSERVATIONS: one FIXED, one mechanism found, two open

His eye beat the metrics again — two of the four point at unported code that
no RMSE sample had isolated.

**(4) "a weird shadow on the ice mountains that is not visible in the video" —
FIXED, one line, PINNED.**  `FUN_0040e058`'s ground bake tests the descriptor's
flag bit 8 and, when it is SET, keeps S = 1.0 and skips the shadow-map read
entirely:

    0040E3F1  cmp byte [ebp+0x3c],0    ; param_14 = terrainOpt8
    0040E3F5  fld1                     ; S = 1.0
    0040E3F7  jnz 0x40e41a             ; SET -> skip the lookup
    0040E3F9  mov edx,[ebx+0x24]       ; else read the shadow map
    0040E412  fmul [0x418298]          ;   S = shadow / 255

Scene 8 (the ice finale) is the ONLY descriptor with bit 8 set — and the port
passed the baked shadow map to every scene, painting a shadow the original
never draws.  MEASURED across the finale: 0x2830 **55.36 -> 31.68 (-23.7)**,
0x2630 39.8 -> 29.5, every sampled position improved, mean -5.5; obj 10 median
26.33 -> 24.18, **global median 25.49 -> 24.80, mean 26.91 -> 25.89**.  RNG
stream untouched (only the bake's argument changed), stream_trace still exact,
13/13 green, baseline reblessed.

**(3) "in the snow scene the ground gets progressively whiter, as if snow is
accumulating" — MECHANISM FOUND, unported, not yet built.**  Winter is the ONLY
scene setting flag bit 19 (`precipOpt`, `desc[0x4f] & 0x80000`), which
`FUN_0040d1f1` stores at `precip+0x58`.  Two consumers, both unported:
* `FUN_0040d5c6` @ sonnet.c:10943 — on a particle's GROUND CONTACT, gated
  `precip+0x58 != 0 && precip+0x60 > 15`: `FUN_0040e842` (worldToMap) converts
  the landing point, bounds-checks it against 0..255, computes FOUR bilinear
  weights scaled by [0x418f50] = 64.0, then walks the **alpha byte** of a
  256-wide RGBA buffer at `precip+0x4c` (`+ (X*0x100 + Z)*4 + 3`) and ADDS,
  clamped to 255 — i.e. each landing flake deposits whiteness into an
  accumulation map.
* @ sonnet.c:11141 — gated `precip+0x48 != 0 && precip+0x58 != 0`, calls
  `FUN_00403e48` (the texture UPLOAD routine) on `precip+0x50` **every frame**,
  so the accumulation map is re-uploaded as a live texture.
This also explains the winter ground gap iteration #9 could not close: ours
[94.8, 81.3, 37.7] vs reference [154.9, 144.2, 115.4] — the reference has
accumulated snow, and no static blend could ever match it.  ⇒ iteration #9's
"B-dominant blend" lead is SUPERSEDED; do not chase it.

**(1) "the waves (ribbons) move in a radial motion towards the island" and
(2) "birds are rendered over the grass (behind in the video)" — still open.**
For (2), note the earlier "ordering REFUTED" analysis concluded birds paint
over grass in BOTH builds (curtain 0x1050 = blend mode 2 = no Z-write, built
first; birds 0x1310 = Z-write on, built second).  The video contradicts that
conclusion, so one of its premises is wrong — the most likely candidates are
the draw ORDER (is the bird flock really registered after the curtain?) and
whether the curtain truly leaves Z-write off in the original's state chain.

## #12 — 2026-08-12 — SNOW ACCUMULATION PORTED (Jasper's observation #3)

Implemented from the disassembly, three parts:
* **Build** (`FUN_0040d1f1` tail): gated `terrain != 0 && flagBit19`, a
  256x256 buffer filled `0x00ffffff` — white with ZERO alpha, so it starts
  invisible — wrapped in a mipped texture with a material of flags **0x50**
  (blend mode 2, cull off).  Bit 19 is set by WINTER ALONE.
* **Deposit** (`FUN_0040d5c6` ground-contact branch, disassembled
  0x40D740-0x40D873 because Ghidra dropped the whole x87 chain): worldToMap
  the landing point, bounds-check `0 <= X,Z < 255`, take the fractional parts
  via `(ftol(v * 65536) & 0xffff) / 65536`, form the four bilinear weights
  scaled by **64.0**, then add them into the ALPHA byte at
  `(ftol(Z) << 8) + ftol(X)`, each `ftol(cur + w)` clamped to 255.
  ⚠ **The 2x2 walk is the original's own quirk and is reproduced verbatim**:
  the pointer advances +4, +0x400, +4, so the texels written are (X,Z)
  (X+1,Z) (X+1,Z+1) (X+2,Z+1) — the bottom row is one texel too far right
  because the second advance never subtracts the first.  Gate `precip+0x60 >
  15` (a counter saturating at 16) keeps the build-time particle placement
  from dumping snow everywhere on frame one.
* **Draw** (`FUN_00408eef` @ LAB_004097d4): between the main scene pass and
  the cross-fade overlay, swap the terrain mesh's material for the
  accumulation material, draw the terrain AGAIN, restore.  Lighting is off,
  inherited from FUN_00406004's own bracket.
Plus a port-only addition, flagged as such: `reset()` clears the map, because
it INTEGRATES and the harness replays warm-ups (same reason `phase0` and the
terrain scale are restored).  No RNG is consumed, so the stream is untouched.

MEASURED: 0x2228 **56.9 -> 46.9**, and the luminance now tracks the reference
almost exactly (103 -> 123 against ref 125; 0x2200 96 -> 110 vs 106; 0x2100
105 -> 116 vs 113).  Winter median 29.64 -> 28.62; global median 24.80 ->
24.56, mean 25.89 -> 25.67.  13/13 green, baseline reblessed.

**This closes iteration #9's open winter item**: the ground was never a blend
or lighting error, it was an entire unported system, and no static mix could
have matched a surface that whitens over time.

**Observation #2 (birds over grass) — the ordering premise re-verified, and
it is NOT the ordering.**  Build order: curtain (`FUN_0040c1b2` @ sonnet.c
6688) before birds (`FUN_0040f803` @ 6804) — the port pushes them into
`this.meshes` in the same order.  Materials: curtain **0x1050** (PINNED, the
`push 0x1050` at 0x40C63E) and bird **0x1310** (`push 0x1310` at 0x40F88C).
Blend mode 2 sets `ZWRITEENABLE = 0` in the ORIGINAL too — disassembled
`FUN_004019e6`: mode 0 -> ALPHABLENDENABLE 0, ZWRITE **1**; mode 1 ->
SRCALPHA/ONE, ZWRITE 0; mode 2 -> SRCALPHA/INVSRCALPHA, ZWRITE **0**
(0x401A26-0x401A37).  So in both builds the grass writes no depth and the
birds are drawn after it.  ⇒ the difference cannot be order or depth state;
the likeliest remaining explanation is that the reference's grass is dense
enough to hide birds that ours lets show through, which ties this observation
to the SAME unresolved curtain-coverage question as 0x1428 rather than being
an independent defect.  Not shipped.

## #13 — 2026-08-12 — BIRDS BEHIND THE GRASS: the curtain is NOT a scene-graph child (Jasper's observation #2, FIXED)

Jasper pushed back on the "it cannot be the ordering" conclusion and named the
layer to look at ("could also be a shim issue").  He was right that the answer
was in the engine layer, and the earlier analysis had verified everything
EXCEPT how the curtain reaches the screen.

* `FUN_0040c1b2` contains **ZERO** calls to `FUN_00405f0e` (scene_addChild)
  over its whole range — the grass is never registered as a child at all.
* It is drawn by ONE explicit call in the render tail (`FUN_00408eef`,
  sonnet.c:7913-7916), gated on the same `desc[0x4f] & 4` (buildB) that built
  it, immediately after the water plane:
      if (desc[0x4f] & 4) { water->vtbl[1](0); arrayB[0].mesh->vtbl[1](0); }
* That is AFTER the whole layer-masked scene pass — and the birds are ordinary
  mask-8 children (`mesh_new` writes `[esi+0xa4] = 8` @0x404322; neither
  builder overrides it, and the traversal `FUN_00405f8b` runs masks 1, 4, 2,
  0xc in that order).

So the original paints the grass OVER the birds, which is exactly what the
video shows — and no depth trick is involved, which is why every check of
order, materials and Z-state came back "identical" while the picture stayed
wrong.  The port had pushed the curtain into `this.meshes`, drawing it in the
scene pass BEFORE the birds.

Fix: drop it from `this.meshes` and draw it from the render tail, at the
original's position (right after the water surface).  MEASURED: 0x1428 (the
demo's WORST sample) **81.5 -> 78.3**, 0x1430 77.9 -> 75.9, 0x1420 -0.9,
0x1400 -0.4; every beach sample improved, mean -1.1.  Confirmed visually: the
gulls now read as shapes seen THROUGH the strands instead of crisp cut-outs
lying on top.

**Everything verified along the way and NOT at fault** (do not re-check):
material decode `FUN_00401d12` (0x0040 -> blend mode 2 with ZWRITE left 0;
0x4000 -> mode 2 then ZWRITE 1 + ZFUNC LESSEQUAL — our shim matches both),
`FUN_004019e6`'s three modes, the mask default of 8, and the build order.

**Observation #1 (radial waves) — every ribbon input verified against the
binary, no divergence found.**  Build draws (speed/phase/phaseRate/freqA/
freqB/yaw), the yaw range (measured -1.794..0.27 rad, a 118-degree fan), the
animation gate (`hiResWater` true, 32 ribbons), and crucially the TRANSFORM
ORDER: the original does `vec3_set -> vec3_add -> vec3_transform`
(0x40F73B-0x40F74F), i.e. the offset is added BEFORE the rotation, so each
ribbon sweeps along its own rotated axis — a ray through the origin.  The port
does exactly that (`mat4Transform([X + off[0], off[1], W + zoff + off[2]], M)`).
Nothing shipped: the motion model already matches, so the remaining
difference is not in the ribbon system's inputs.

**Observation #1 (radial waves) — the ribbon system is now verified END TO
END against the binary, with the MOTION measured rather than argued:**
* build draws (speed, phase, phaseRate, freqA, freqB, yaw) — match;
* material **0x11** (`push 0x11` @0x40F4BB) with texgen program 8 — match;
* transform order `vec3_set -> vec3_add -> vec3_transform`
  (0x40F73B-0x40F74F): the offset is added BEFORE the rotation, so each strip
  sweeps along its own rotated axis — a ray through the origin — and the port
  does the same;
* update gate `desc[0x50] & 0x20`, the `flags |= 2` hide, and the tail draw
  gated `desc[0x4f] & 0x2000` as the LAST thing in the render — the port keeps
  them out of `this.meshes` and draws them last, equivalently;
* the water plane is static in BOTH (its only per-frame write is
  `waterMesh->pos.y = desc[0x10]`, sonnet.c:7886);
* **measured motion**: ribbon centres travel |r| 213 -> 112, 131 -> 52,
  134 -> 122 — i.e. TOWARD the origin (the island), with the expected phase
  wrap, across a 118-degree yaw fan.
Nothing shipped for #1: the waves already move radially toward the island by
measurement, and every input matches.  NOTE that #13's curtain fix materially
changes this scene's composition (the grass now paints over the water and the
ribbons, as the original does), so the wave READING in the beach shots is not
the same picture Jasper was describing when he reported it.

---

## #14 — the ribbons are in the wrong PLACE, and that hid a lighting-state bug

Jasper, with two reference stills at 03:11/03:12 (music 0x1204/0x120a): *"can you
check the shim for the ribbons? I'm seeing them in a different position in the
video than in our version."*  He was right on both counts — there IS a
positional bug, and the second half of it IS in the shim.

### 14.1  The strips had no node transform at all  (SHIPPED, binary-proven)

`FUN_0040f42f` is only HALF the ribbon spec.  It builds the strip in LOCAL
space; the BUILD LOOP in `FUN_004082a9` writes the node transform after it
returns, and the port transcribed only the generator:

```
00408814  mov eax,[ebx+0x134]        ; the ribbon array
00408821  mov edi,[esi+eax+0x64]     ; rec+0x64 = the strip's mesh
00408825  lea esi,[ebx+0x4c]         ; src = Landscape+0x4c  == terrainScale
00408828  add edi,0x94               ; dst = mesh+0x94, the node SCALE triple
00408831  movsd / movsd / movsd      ; 12 bytes — the WHOLE vec3
0040883E  fld dword [eax+0x10]       ; desc+0x10 = waterLevel
00408847  fadd dword [0x4170d4]      ; + 0.5   (xray resolves the constant)
00408851  fstp dword [eax+0x8c]      ; -> mesh+0x8c = pos.Y
```

`mesh+0x94..0x9c` is the same scale triple `FUN_004082a9` copies onto the water
plane 130 lines earlier (`puVar5[0x25..0x27]`, sonnet.c:7100) — the port already
documented that offset as the node SCALE in `#stepWater`'s note, so the reading
is corroborated, not new.  Scene 4's terrainScale is **(3, 0.5, 3)** and its
waterLevel is 1.

MEASURED before: every strip sat at scale 1 at the world origin — a field with
|r| 110..296 and y 0.2..3.3, i.e. lying ON the island's beach terrace, where the
additive material blew the sand out to WHITE (the port's terrace read pure white
where the reference is tan sand).  A ribbons-on/ribbons-off diff showed the
strips painting a 345x50 blob in the exact shape of the terrace and **not one
pixel of open water**.  After: scale (3,0.5,3), pos.y 1.5, screen footprint
x 57..795 y 288..568 — the sea, which is where the reference has them.

Fix: `m.scale = desc.terrainScale.slice(); m.pos = [0, F(desc.waterLevel + 0.5), 0]`.
Only pos.Y is written by the original, so X and Z stay at the origin.

### 14.2  ...which exposed that the tail draws inherit the WRONG lighting state  (SHIPPED, binary-proven)

With the strips finally over the sea they blew the whole sea out to white
(0x120a 34.1 -> 42.1).  The cause is NOT the strips: **a single strip measured a
peak additive contribution of +146 when its own 0x6f6f6f diffuse caps it at
+98** — physically impossible, so the vertex colour was not reaching the
rasteriser.

It wasn't.  The main pass is `call 0x406004` at VA **0x4097cf**, and
`FUN_00406004` owns its lighting:

```c
if (root[0x14] != -1) FUN_00401b86(1, root[0x14]);   // on  + scene ambient
FUN_00405f8b(root, 2,   t, 0);                        // the LIT passes
FUN_00405f8b(root, 0xc, t, 1);
if (root[0x14] != -1) FUN_00401b86(0, 0xffffffff);   // OFF + white
FUN_00405f8b(root, 2, 0.0, 0);                        // trailing, unlit
FUN_00405f8b(root, 4,   t, 2);
```

so it RETURNS with lighting disabled, and everything after it in `FUN_00408eef`
— overlay, glitter, water surface, curtains, precipitation and the ribbon tail —
inherits "off".  `#drawAll` collapses the four masked passes into one traversal
and never closed the bracket, so the tail inherited "on".  The ribbons are the
material that shows it: flags 0x11 carry no 0x1000, so they never switch
lighting off themselves, and the scene's single point light has
**attenuation1 = 1e-4, i.e. att = 1e4/d ~= 7..33 at these distances** — every
strip saturated to white.

⚠ THE PORT ALREADY KNEW THIS.  The overlay pass's own comment says *"UNLIT, and
that is not a guess … FUN_00406004 … RETURNS with lighting disabled"* — but it
implemented that as a LOCAL save/restore around two individual draws (overlay,
snow) instead of leaving lighting off.  Every other downstream draw kept
inheriting "on".  Fix: close the bracket once, where the original does.

Discriminator that settled it (open water, band left of the island, p99-p50 —
how far the streaks rise above the sea):

| | p50 | p99-p50 |
|---|---|---|
| ribbons off | 175 | 7 |
| ribbons, lit (before) | 253 | **2** — saturated, NO streak structure |
| ribbons, unlit (after) | 222 | 18 |
| REFERENCE | 208 | **13** |

The lit version destroys the streak texture the reference plainly has; the unlit
version is in the right regime and physically consistent (peak +66 <= +98).

### 14.3  Result — MIXED, baseline deliberately NOT re-blessed

Jasper's two stills, both improved: **0x1204 15.85 -> 14.39**, **0x120a
34.1 -> 27.9**.  Every scene except the beach is BIT-IDENTICAL (obj 3,4,5,6,8,9,
10 and both text objects unchanged) — the change is fully contained.  Whole-demo
median 24.56 -> 24.37.

But the beach as a whole is worse: **median 32.32 -> 35.49** (drift-corrected
31.64 -> 33.70), 13 samples worse vs 8 improved.  `run-verify.sh --full`
therefore FAILS its verdict, and that is left standing on purpose.

The two changes are COUPLED and must not be judged apart — measured with the
lighting bracket disabled, the transform fix alone is far worse than either the
baseline or the pair (median 42.14, worst 58.4).

### 14.4  The residual — the strips are still too BRIGHT (open, needs Jasper)

Worst case is the SUNSET, 0x1630 (24.0 -> 35.5): the reference shows a narrow
vertical sun column on the water, ours a wide radial bloom, because 32 strips
covering 33% of the frame at mean +160 wash it out.  On open water at 0x120a we
add +45.6 where the reference adds +31.7 — about **1.4x too strong**, and the
streak contrast is 18 vs the reference's 13.

**Eliminated, do not re-check:** texgen program 8 (oracle-verified byte-exact
like all 28 programs; it is near-white with a shaped ALPHA, mean 82/255, so the
alpha carries the whole look); the vertex colour and its triangular alpha ramp
(0 31 63 … 255 … 31, matches); the material decode (0x11 = cull NONE + blend
mode 1 = SRCALPHA/ONE, ZWRITE 0); the blend mode itself; fog (enabled at the
tail, LINEAR 600->1000, so it IS reaching them); the transform order and motion
(#13); the water plane's Z behaviour (blend mode 1, ZWRITE 0, so it cannot
occlude them in EITHER build).

**The remaining suspect is overdraw**: 32 strips of 600x216 world units over a
sea roughly 800x800 in view is ~8x coverage, which is inherently a wash no
matter how faithful one strip is.  The untried tool is the one that settled the
splines and the scene-2 stream chain — extend the fake-D3D8 oracle
(`re/oracle/d3d8fake.py`) to capture the original's actual DrawIndexedPrimitive
sequence for the render tail: how many strips it really submits, with what
render states and what world matrix.  That is the only way left to arbitrate
brightness against the binary rather than against a lossy 2001 capture.

Diagnostic knobs left in place, both inert by default and both draw-time only
(they perturb no RNG and no integrator): `__noRibbons` skips the tail
rasterisation; `__noLightBracket` skips 14.2's closing bracket for A/B work.

### 14.5  THE MISSING FADE — Jasper called it, and it closes 14.4

Jasper: *"the ribbons fade as they get closer to the center; see if theres a
variable you missed, with alpha or something similar."*  There is, and it is the
whole of 14.4's residual brightness.

`FUN_0040f5a8` computes a **triangular fade envelope over the phase** that the
port never had.  Ghidra drops all of it: it is pure x87 through a reused stack
slot — `[ebp+8]`, the dt argument's OWN slot, which is safe because dt is
consumed at 0x40f5ae before anything overwrites it.  VA 0x40f5f3-0x40f642:

```
0040F5F3  fld1                        ; fade = 1.0
0040F5FA  fld [ebx+0x4c] ; fcomp 1.0 ; jnc   -> skip when phase >= 1
0040F60B    fld [ebx+0x4c]            ;   fade = phase           (fade IN)
0040F611  fld [ebx+0x4c] ; fcomp 1.0 ; fld 2.0 ; jna -> skip when phase <= 1
0040F625    fld st0 ; fsub [ebx+0x4c] ; fmul [ebp+8]
                                      ;   fade = (2 - phase)*fade (fade OUT)
0040F630  fld [ebp+8] ; fcomp 0.0 ; jnc
0040F63E    fldz                      ;   fade = 0
```

⚠ The `fnstsw`/`sahf` at 0x40f620 reads the status word left by the `fcomp` at
0x40f614 — the intervening `fld 2.0` does not disturb it — so BOTH tests are
against the phase, not against 2.0.  Exactly 1.0 takes neither branch.

Since `off.z = 300 - phase*speed`, a rising phase IS travel toward the island, so
each strip fades up as it appears at the far edge and back out as it arrives —
precisely Jasper's description.  The clamp at 0 is load-bearing: `buildRibbon`
seeds phase in [2, 4), so the BUILD-time call gets a negative (2 - phase) and
every strip starts invisible, with the wrap staggering it into [0, 2).

And the alpha uses **TWO `ftol`s, not one** (0x40f6f8 and 0x40f706):

```
alpha = ftol( ftol(255 - |(i-8)*0.125| * 255) * fade )
```

the station ramp is quantised to an integer FIRST and only then scaled by the
fade and quantised again.  (The two `FUN_00404224` calls were visible in the
Ghidra output all along — noted in #13 and not chased.  A doubled ftol is a
signal, not noise.)  No clamp is needed: the ramp is in [0, 255] by construction
and the fade in [0, 1].

**MEASURED (beach, obj 7):** median **32.32 -> 30.77**, now BETTER than the
pre-#14 baseline rather than 3.2 worse.  10 samples improved by >1.5 against 4
worse; 340 of 354 samples across the demo are unchanged.  0x1210 41.5 -> 28.0,
0x1610 32.3 -> 23.3, 0x1228 37.8 -> 30.1, 0x1218 33.2 -> 26.7, 0x1208 29.5 ->
22.7, and the two frames Jasper screenshotted 15.85 -> 13.46 and 34.1 -> 26.31.
Whole-demo median 24.56 -> 24.35, mean 25.64 -> 25.49.  BASELINE RE-BLESSED.

The sea now reads as discrete streaks instead of a wash, which is what the
p99-p50 discriminator in 14.2 was pointing at all along.

**14.4 is CLOSED** — the "1.4x too bright / ~8x overdraw" residual was never
overdraw.  A triangular envelope averages 0.5 over the cycle and, crucially,
makes the coverage SPARSE rather than uniform: a strip is only near full alpha
for a short part of its travel.  The fake-D3D8 render-path oracle proposed there
is NOT needed and should not be built for this.

**Still open at the beach, and NOT a ribbon problem:** 0x1518/0x1528/0x1530 stay
3-6 worse.  The pair at 0x1528 shows a COLOUR CAST — ours is uniformly pink where
the reference has a golden/yellow cast across the water — i.e. the sunset
fog/water colour ramp, which the brighter strips merely make more visible.  That
is the next divergence to chase in this scene.  0x1630's +5.2 is capture drift:
drift-corrected it is 24.0 -> 24.2, i.e. neutral.
