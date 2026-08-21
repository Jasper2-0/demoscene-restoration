# Note 1 re-opened — obj 3 @ 0x0628, "grass is cut off"

Owner re-reviewed after the previous agent marked §1 FIXED (REVIEW_FIXES.md §1).
Working log; appended the moment anything is known.

## Session start
- Baseline claimed: 0x0628 = 72.88 after §1's spire fix; live `?quality=original` median 27.06.
- §1's claim: near plane innocent (ctor near=1.0, nothing rewrites +0xc0), fault was
  `FUN_0040bfc1` mis-port (update fn, quadratic ramp, per-instance stagger, ring wobble).

## Reproduced, 2026-08-05

`--positions=0x0600,0x0610,0x0620,0x0628,0x0630,0x0638 --tag=r0`:
0x0628 = **72.88** (matches §1's post-fix figure exactly — nothing has drifted).
best 13.69 (0x0638), median 66.98.

### Probe (`globalThis.__spireProbe` added to scene7.js render, temporary)
At 0x0628, `?quality=original`:
```
eye    (114.18, 54.50, -19.32)      target (104.15, 307.32, 19.62)
near 1.0   far 800   fov 90 (vertical)   aspect 4/3
cluster T = 0.65950 ; growing = true
```
* **All 80 instances are at t = 1.0, full height.**  §1's arithmetic ("about 74 %
  started, about 35 % full") does NOT describe what the port actually does at
  0x0628 — the ramp overshoots and everything is already grown.
* Instance bases span x −41.4..253.8, y 0..245.2 (terrain-snapped), z −125.7..172.3.
* 39 of the 80 bases are BEHIND the camera (view-space z < 0); nearest base in
  front is 19.7 units away.  So the near-plane region genuinely is populated.

### The projection is CORRECT — proved by overlay
`scratchpad/ov2_ours.png` / `ov2_ref.png`: the 80 blade axes (base→tip, clipped at
z = 1.0) were projected with the probe's own view/proj and drawn over both frames.
**They land on the rendered blades in OURS and on the reference's blades too** —
same vanishing point (~315,190), same radial directions, same set of axes.
So camera path, scatter positions, blade height and the near plane are all right.

### What is actually different: the blades are far too NARROW
Along identical axes the reference's blades are 3-5x wider than ours.  Reference
also shows fewer distinct blades, because its wide ones overlap.  Our frame is a
fan of thin needles; the reference's is a fan of broad ribbons that run off the
frame edges.  "The grass is cut off" = the owner sees the reference's blades
reaching and overflowing the frame edge, and ours stopping short.

## FOUND IT — the array-A scatter is called with `seed = 1` and `snap = FALSE`

Disassembled the three `call 0x4078b6` sites (`ndisasm`, whole image).  All three
push their last two arguments as literal/loop values immediately before the two
`FUN_00408c48` vec3 copies:

| array | VA | pushes | meaning |
|---|---|---|---|
| C | 0x407cf4 | `push 0` ; `push [ebp-0x8]` | snap = 0, seed = cluster index |
| D/E | 0x407dfb | `push 0` ; `push [ebp-0x4]` | snap = 0, seed = cluster index |
| **A** | **0x407f7d** | **`push 0` ; `push 1`** | **snap = 0, seed = LITERAL 1** |

`FUN_004078b6` is `ret 0x28` (10 dwords):
`(out=[ebp+8], centre=[ebp+0xc], count=[ebp+0x18], extent=[ebp+0x1c], seed=[ebp+0x28], snapByte=[ebp+0x2c])`
— cdecl, so the FIRST push is the LAST argument: `push 0` is `snapByte`, `push 1`
is `seed`.  Inside: `fldz / fstp [ebp+0x10]` forces centre.y = 0, and
`cmp byte [ebp+0x2c],0 / jz` skips the single `fst dword [ebx+4]` that would
write the terrain height into the position.  Loop guard constant `[0x418e58]` =
**−5.0** (not a sentinel), `[0x418e54]` = 5.0.

And `FUN_0040bc63`'s per-instance tail (0x40bf49-0x40bf83) copies the scattered
vec3 straight into `instance+0x88` with **no height query of its own**
(`mov esi,[ebp+0x18]` = the walking positions pointer; `add edi,0x88`; three
`movsd`), then `FUN_00401558(&local_30, 1.0, [0x418e28]=0.001, 1.0)` → +0x94.

### So every spire's base sits at y = 0 in the original.

`web-sonnet/js/scene7.js` line ~1101 passed `seed = ci` and `snap = true`:
```
scatterC(rec.instanceCount, rec.boxCentre, rec.boxExtent, desc.waterLevel, hFn, ci, true)
```
The comment above `scatterC` has it exactly backwards ("Array C leaves it clear …
array A sets it").  Both were introduced by the previous session's "merge fix".

**Consequence, and it is precisely the owner's complaint.**  Scene 0's camera at
0x0628 is at y = 54.5.  With `snap = true` the port lifts blade bases onto the
(hidden) terrain, y = 0 … 245 — 39 of the 80 bases end up level with or ABOVE the
camera, so those blades are seen end-on, short and thin, and the ones below start
only a little under the eye.  With `snap = false` every base is at y = 0, i.e.
54 units BELOW the eye and much closer in angle, so the near blades sweep down
past the camera and run off the bottom and sides of the frame.  That is the
reference's "few very wide blades that are cut off by the frame edge" against the
port's "many thin needles that stop short".

`seed = 1` (not 0) additionally puts every blade in a different place.

### Descriptor field map re-derived while there (array A record, stride 0x22)
`+0x53` word count, `+0x55` vec3 CENTRE, `+0x61` vec3 EXTENT, `+0x6d` float
radius, `+0x71` float heightRatio.  Call:
`FUN_0040bc63(cluster, [ebx+0x2c], radius, heightRatio, count, 16, 8, positions)`.
The port's parse already matches (probe: centre (106.2, ·, 23.3), extent ±150).

## Applied — `scatterC(..., seed = 1, snap = false)` (scene7.js, array-A build)

| pos | before (`r0`) | after (`fix1`) | lowRmse | our luma → | ref luma |
|---|---|---|---|---|---|
| 0x0600 | 50.23 | 56.42 | 37.1 → 43.6 | 141.4 → 135.7 | 141.9 |
| 0x0610 | 52.88 | 62.40 | 39.8 → 50.6 | 139.3 → 130.7 | 140.1 |
| 0x0620 | 66.98 | 59.25 | 54.7 → 45.1 | 136.4 → 128.8 | 131.3 |
| **0x0628** | **72.88** | **59.00** | 61.0 → 43.1 | 132.7 → 127.4 | 129.0 |
| 0x0630 | 71.05 | 55.76 | 58.8 → 41.0 | 121.3 → 119.2 | 112.2 |
| 0x0638 | 13.69 | 12.38 | 11.1 → 9.6 | 20.9 → 21.2 | 16.1 |

median 66.98 → 59.00.  Both metrics move the right way at the owner's position and
at its two neighbours; 0x0600/0x0610 get worse (see below).

### FUN_0040bfc1 independently re-checked against the disassembly (0x40bfc1-0x40c1ac)
§1's transcription is CORRECT, instruction for instruction, including:
`T += arg` (0x40bfd2), `rec[0] -= T` under `armed` (0x40bff0), the `>= 0.0` skip
against `[0x4170c8]` = 0.0, `rec[1] += T * [0x418260]=0.01`, the `<= [0x4170c4]=1.0`
gate and its `else rec[1] = 1.0` arm jumping straight to the scale write, the ring
offset `a = (float)i + T*10 + ring*0.5` with `dx = sin(a)*1.0*5.5`,
`dz = cos(a*1.37)*1.0*5.5`, the `ring == 0` zeroing, the y component of the offset
vec3 forced to 0 (`fldz / fstp [ebp-0x2c]`), `FUN_004045f1` (bounds only),
`scale = (1, rec[1], 1)` and `rec[0] = 0.0`.  The caller at 0x4093d9 is
`fld [desc+2] ; fmul [obj+4]=dt ; fmul [0x418260]=0.01` — the port's
`desc.paramA * dt * 0.01`.  **§1's fix was right; it was just incomplete.**

### Confirmed BY EYE
`verify/spire_reopen_0x0628_trio.png` — before / after / reference, crop
x 0..340, y 150..480, 2x.  BEFORE: thin needles that stop in mid-air, an empty
lower-left corner.  AFTER: broad blades sweeping down through the corner and off
the bottom and left edges, at the reference's width, count and taper.  The
REFERENCE panel is the same picture as AFTER.  That is the owner's "cut off".

`meshgen_test` 369/369 (meshgen.mjs untouched).

## The residual at 0x0600/0x0610 — the stagger countdown is FRAME-RATE DEPENDENT

`pair_fix1_0x0600.png`: after the fix our blades are the reference's *width* and
*shape*, but there are roughly twice as many of them.  The reference's field is
still filling in at 0x0600; ours is already complete.

That is not a transcription error — it is a property of `FUN_0040bfc1` itself.
`T` is proportional to elapsed WALL TIME (`T += paramA·dt·0.01`), but the two
things driven by it are applied **once per FRAME**:

```
rec[0] -= T          per frame     -> total consumed = Σ T_n = dtStep·n²/2
rec[1] += T·0.01     per frame
```

With `dtStep ∝ 1/F` and `n = F·t`, `Σ T_n = F·(0.001·paramA)·t²/2` — **linear in
the frame rate**.  Run the original faster and the grass grows sooner.

Measured on the port (probe, `?quality=original`, 60 Hz warm steps):

| pos | T | started | full height |
|---|---|---|---|
| 0x0500 | 0.2525 | 15/80 | 0/80 |
| 0x0600 | 0.5030 | 80/80 | 60/80 |
| 0x0610 | 0.5656 | 80/80 | 80/80 |
| 0x0628 | 0.6595 | 80/80 | 80/80 |

T = 0 at ~41.7 s (= 0x0400, when object 3 starts stepping); dT/dt = 0.0241 s⁻¹,
`dtStep` = 4.017e-4 per 60 Hz frame.  At 0x0600 (20.87 s, 1252 frames)
`Σ T = 315`, comfortably past the 255 maximum stagger delay, so everything has
started.  To leave ~40 % unstarted there (what the reference shows) needs
`Σ T ≈ 100`, i.e. a capture frame rate near **20 fps**, three times slower than
the port's fixed 60 Hz replay.

**Not fixed, and deliberately so:** matching it would mean either tuning a fudge
factor into `#stepSpires` or changing the harness's replay rate, and both would
be a guess at the capture machine's speed.  It costs RMSE only at 0x0600/0x0610
(56.42 / 62.40 against 50.23 / 52.88 before), where the previous, structurally
wrong frame happened to be sparse for the wrong reason.  At the owner's position
and its neighbours the reference is fully grown and the change is a large win.

### Quantified: the reference's fill-in is exactly **sqrt(2)x slower in TIME**, i.e. 2x in Σ

Blade coverage (`green || dark`, letterbox excluded; baseline with no blades is
~1.1 %) across scene 0, from the two full sweeps' own frames:

| pos | before (`t3full`) | after (`fixfull`) | reference |
|---|---|---|---|
| 0x0500 | 1.02 | 0.50 | 1.07 |
| 0x0508 | 2.28 | 6.39 | 1.54 |
| 0x0510 | 4.62 | 12.29 | 2.17 |
| 0x0518 | 8.21 | 14.05 | 2.88 |
| 0x0520 | 12.63 | 18.20 | 4.56 |
| 0x0528 | 16.25 | 23.74 | 7.46 |
| 0x0530 | 20.51 | 34.64 | 12.74 |
| 0x0538 | 27.59 | 38.59 | 15.77 |
| 0x0600 | 30.81 | 43.18 | 17.42 |
| 0x0610 | 36.54 | 42.37 | 22.76 |
| 0x0620 | 39.24 | 41.47 | 33.65 |
| 0x0628 | 42.47 | 41.91 | 35.06 |
| 0x0630 | 48.43 | 41.34 | 39.20 |

Matching each reference level to the port's own curve (baseline subtracted), with
t measured in rows from 0x0400 where T starts accumulating:

| level | t (ours) | t (ref) | ratio |
|---|---|---|---|
| 11 % | 80 | 112 | 1.40 |
| 16-17 % | 96 | 128 | 1.33 |
| 22 % | 104 | 144 | 1.38 |
| 33 % | 112 | 160 | 1.43 |
| 37-38 % | 120 | 176 | 1.47 |

A constant **1.40 ≈ sqrt(2)** in time, i.e. **2.0x in Σ**.  Since
`Σ = paramA · 0.001 · F · t² / 2` is linear in BOTH `paramA` and the frame rate:

* `paramA` is **not** the culprit — `RESOURCES[0x1c]` bytes 2..5 are
  `cd cc cc 3d` = 0.1 exactly, and `+0x53` = 80, `+0x55` = (106,40,24),
  `+0x61` = (150,0,150), `+0x6d` = 3.2, `+0x71` = 160.  The whole record is right.
* So the capture ran at **half the port's step rate** — `main.js`'s
  `WARM_STEP = 1000/60` against an original that was managing ~30 fps.

**Left alone deliberately.**  Every per-frame accumulator in the demo inherits
this, not just the spires; halving it here alone would be a fudge factor with no
support in the binary, and changing `WARM_STEP` is `main.js`'s business and would
move the whole timeline.  Flagged here for whoever owns the harness.

## Closing state

Final targeted sweep (`--positions=0x0600,0x0610,0x0620,0x0628,0x0630,0x0638`,
tag `final1`; identical to `fix1`, so the number is reproducible):

| pos | before (`r0`) | after (`final1`) |
|---|---|---|
| 0x0600 | 50.23 | 56.42 |
| 0x0610 | 52.88 | 62.40 |
| 0x0620 | 66.98 | 59.25 |
| **0x0628** | **72.88** | **59.00** |
| 0x0630 | 71.05 | 55.76 |
| 0x0638 | 13.69 | 12.38 |

Whole sweep (`fixfull`, 354 samples, `--quality=original`): median **27.13**
against `t3full`'s 27.06 — inside the documented noise.  Only 16 of 354 samples
moved by more than 3 RMSE, and only two of those are outside scene 0
(0x0c38 +3.72, 0x0c10 −3.56 — the shared-RNG reseed reaching object 5, and they
cancel).  The `srand(1)` change does not alter the DRAW COUNT (still 80×2 scatter
draws + 80 delay draws), only the stream state, so the §10.5 bimodality warning
does not apply to draw-count shifts here.

Tests: `meshgen_test` 369/369, `minid3d8_test` 116/116, `integration_test`,
`timeline_test`, `text_test` all ALL PASS.

Files touched: `web-sonnet/js/scene7.js` only (the array-A `scatterC` call and the
two comment blocks that described it wrongly).  A temporary `globalThis.__spireProbe`
dump was added to `render()` for the investigation and has been removed; re-add it
just after `const proj = cam.projectionMatrix();` if the camera/instance state is
needed again.

---

## Session 2026-08-08 — the frame-rate dependence is PINNED, and it is the remaining error

Picked up as the first stop of a scene-ordered pass (owner: *"you're jumping
ahead in scene in terms of bugs"*).

### Two stale claims corrected

* **"The blades are far too NARROW (3-5x)" is no longer true.** Measured over
  the picture area at 0x0628: OURS `blades 50.4 %` (green 22.0 / dark 28.3),
  REFERENCE `blades 44.5 %` (green 17.3 / dark 27.2). We now cover **more** than
  the reference, not less. The seed fix in the previous session moved this.
* **The residual is growth OVERSHOOT**, consistent with more coverage and less
  sky (37.2 % vs 42.2 %).

### PINNED: `FUN_0040bfc1` is DOUBLY INTEGRATED, hence frame-rate dependent

Call site (sonnet.c:7725): `FUN_0040bfc1(spire, desc[0x02] * dt * 0.01)` — the
argument IS time-scaled, and the port matches it. The rate dependence is inside:

```
this[0x1c] += arg                       ; T grows with ELAPSED TIME
for each instance:
    if (this[0x20]) delay -= this[0x1c] ; per FRAME, no dt
    if (delay < 0) t += this[0x1c]*0.01 ; per FRAME, no dt
```

`t` accumulates `T` once **per frame**, and `T` itself grows with time, so
`t ∝ Σ T ≈ k·elapsed·frames/2` — **proportional to the frame rate**. §"A constant
1.40 ≈ sqrt(2)" was right about the symptom; this is the mechanism, and it is
read from the code rather than inferred from a curve fit.

### `WARM_STEP = 1000/30` measured — NOT the fix

| pos | 60 fps | 30 fps | Δ |
|---|---|---|---|
| 0x0600 | 56.42 | **46.46** | −9.96 |
| 0x0620 | 59.25 | 69.11 | +9.86 |
| 0x0628 | 59.00 | 65.42 | +6.42 |
| 0x0638 | 12.38 | 13.47 | +1.09 |

Halving the step rate helps the START of the growth and hurts the middle, which
is the signature of a **timing offset**, not a pure rate error — a slower rate
delays everything, so early frames match and later ones lag. Reverted.

**What this means:** the original's appearance here genuinely depended on the
machine it ran on, so "correct" is whatever rate the reference capture's machine
achieved — and it is evidently not a constant 30. Candidates for whoever
continues: fit F per position to see whether a single rate explains all four
(if not, the capture's rate varied and scene 0 has a hard floor); or check
whether `delay` (the per-instance stagger) uses a different clock from `t`.

**Do not "fix" the double integration to be dt-correct** — it is what the binary
does, and every per-frame accumulator in the demo shares the property.

---

## Session 2026-08-11 — fix-loop iteration 1: the rate is TWO-PHASE, and the steady state is registration noise

Worked under re/FIXLOOP.md with the new instruments (warm store, emulator
oracle, `?warmstep=` probe).  Everything below is measured, not inferred.

### Closed by the binary (xray 0x40bfc1-0x40c080)

* **`delay` and `t` use the SAME clock** — both consume the accumulated `T`
  per frame (`fsub [ebx+0x1c]` @0x40BFF0, `fld [ebx+0x1c]; fmul 0.01` @0x40C006).
  The "different clock" candidate from the previous session is dead.
* **`T += arg` is UNCONDITIONAL** (0x40BFD2, before the `growing` test, which
  gates only the delay countdown) — and the port's `#stepSpires` matches.
* The spire material is `material_new(tex2, 0, 0x20)` — `push 0x20` @0x40BF15.
  Lighting ON for blades in the original too; and texgen program 2 contains
  NO dark texels (yellow/green radial), so the black on our mid-growth blades
  is the lit backside of OVER-GROWN blades curling past vertical — a
  consequence of the growth trajectory, not a shading defect.
  `--lighting=legacy` A/B: no change (46.77/62.7/59 vs 46.3/62.7/59).

### The frame-rate fit (`--warmstep=F`, 15 positions x 6 rates)

| pos | 60 | 50 | 45 | 40 | 35 | 30 | best |
|---|---|---|---|---|---|---|---|
| 0x0500 | 12.7 | 11.7 | 11.3 | 10.7 | 10.7 | 11.9 | 35 |
| 0x0508 | 35.2 | 36.1 | 30.3 | 19.1 | 18.7 | 18.1 | 30 |
| 0x0510 | 46.3 | 40.1 | 38.8 | 39.1 | 37.3 | 24.0 | 30 |
| 0x0518 | 39.4 | 38.4 | 38.7 | 37.2 | 37.4 | 38.9 | 40 |
| 0x0520 | 44.6 | 41.0 | 39.6 | 39.3 | 39.5 | 38.0 | 30 |
| 0x0528 | 47.6 | 43.5 | 41.6 | 40.5 | 39.2 | 39.1 | 30 |
| 0x0530 | 56.4 | 49.7 | 46.3 | 44.7 | 44.6 | 44.5 | 30 |
| 0x0538 | 56.1 | 61.4 | 52.7 | 47.8 | 46.4 | 45.1 | 30 |
| 0x0600 | 56.3 | 54.5 | 55.4 | 49.2 | 48.0 | 46.5 | 30 |
| 0x0608 | 62.7 | 62.1 | 61.9 | 62.5 | 57.3 | 49.4 | 30 |
| 0x0610 | 62.4 | 62.4 | 62.8 | 61.2 | 57.1 | 56.5 | 30 |
| 0x0618 | 61.5 | 62.8 | 62.7 | 63.5 | 64.3 | 61.8 | 60 |
| 0x0620 | 59.3 | 63.2 | 64.4 | 65.1 | 65.4 | 69.1 | 60 |
| 0x0628 | 59.0 | 65.0 | 67.1 | 68.4 | 67.7 | 65.5 | 60 |
| 0x0630 | 55.8 | 57.4 | 58.7 | 59.6 | 61.4 | 63.3 | 60 |

**No constant rate exists**: 0x0500-0x0610 fit ~30 fps (0x0510: 46.3 -> 24.0),
0x0618-0x0630 fit 60 fps.  The capture machine's effective rate RAMPED UP
across the scene (consistent with a 2001 machine recovering after playback
start).  Sum over the band: 755 @60 / 672 @30 / ~645 at per-position optimum.

### The steady state (0x0618-0x0630, both fields fully grown, t clamped at 1)

RMSE stays 56-65 with frames that are STRUCTURALLY NEAR-IDENTICAL (same
blade layout, same composition — verified by eye at 0x0628).  The residual is
per-blade REGISTRATION: each blade's wobble phase FREEZES at the frame its
growth completes, so the frozen field is a function of the machine's whole
rate trajectory; and thin high-contrast blades pay double for every few-pixel
offset (the scene-2 metric lesson).  This is a HARD FLOOR for RMSE against
this capture, not a port defect.

### Status: surfaced to Jasper (harness-calibration decision)

Options: (a) document the floor, judge scene 0 by eye, move on — recommended;
(b) fit a 2-parameter rate trajectory as harness calibration — gains ~15% of
scene-0 RMSE, adds a fitted model to the instrument, and perturbs every other
frame-count accumulator demo-wide (would need a full-sweep A/B + rebless).
Constant-30 is refuted (late positions regress).  Per FIXLOOP.md, changing
the instrument is not the loop's call.

## Session 2026-08-21 — answering the surfaced question, and the scope is DEMO-WIDE

The 2026-08-11 session closed with "surfaced to Jasper (harness-calibration
decision)", recommending option (a): document the floor, **judge scene 0 by
eye**, move on.

Jasper judged it by eye. The verdict came back negative — from the inspector at
**0x0606**, filed as issue #46:

> in the reference there are 8 spires visible in ours I count 24

Note the position. Every by-eye check in this file was done at **0x0628**, in
the steady state where all 80 blades are grown. 0x0606 is inside the GROWTH
band — the region §"The frame-rate fit" measured as fitting ~30 fps, not 60.
The eye was pointed somewhere the previous sessions never looked.

### The count reproduces the frame-rate fit, independently

`?pos=0x0606&quality=original&warm=0`, counting instances directly out of
`__sonnetObjects[].spires[].recs`:

| warmstep | armed | grown (t = 1) | partial | mean cluster T |
|---|--:|--:|--:|--:|
| 30 | 49 | **21** | 28 | 0.53 |
| 60 | 80 | **68** | 12 | 0.53 |
| 120 | 80 | **80** | 0 | 0.53 |

**`mean T` is identical at all three rates.** That is the control, and it is
what makes this a measurement rather than an observation: `T` accumulates
`+= dt` where `dt` comes from elapsed MUSIC ms, so it cannot be the clock, the
position or `SPIRE_GROW`. The difference is isolated to the two lines that run
once per TICK rather than once per unit time:

```js
if (c.growing) rec.delay = F(rec.delay - T);     // Σ over ticks, not ∫ dt
rec.t = F(rec.t + F(T * K.SPIRE_GROW));
```

Grown count 21 -> 68 across 30 -> 60 fps is **3.2x**. Jasper counted 8 -> 24,
which is **3x**. An eyeball count and a disassembly-derived rate fit agreeing
to within 7% is much stronger than either alone, and it means the reference
machine was running at roughly HALF our default warm rate through this band —
exactly what §"The frame-rate fit" concluded from RMSE, reached by a completely
different route.

### Why the count is the right instrument and RMSE is not

§"The steady state" hit a floor because thin high-contrast blades are dominated
by sub-pixel registration: a few pixels of offset costs RMSE enormously while
saying nothing about whether the FIELD is right. A count is immune to
registration entirely. This is TODO.md's "silhouette-based timing probe"
argument arriving in practice: whole-frame luma is badly conditioned for
judging animation TIMING, and the fix is to measure the thing that is actually
wrong.

That is why three sessions of RMSE could not settle this and one glance could.

### THE SCOPE IS NOT THE SPIRES — every scene is frame-rate dependent

Render the same music position at two warm rates and diff the pixels. A
frame-rate-independent scene must come back identical.

| position | scene | RMSE (30 vs 60) |
|---|---|--:|
| 0x0200 | title / poem | 0.072 |
| **0x0606** | **scene 0 spires** | **55.77** |
| 0x0900 | scene 1 lakes | 9.33 |
| 0x0c08 | scene 2 trees | 6.35 |
| 0x1000 | scene 3 cloud sea | 4.97 |
| **0x1410** | **scene 4 beach** | **36.09** |
| 0x1a30 | scene 5 autumn | 6.38 |
| **0x2030** | **scene 7 winter** | **21.52** |
| 0x2500 | scene 8 finale | 3.44 |

The title card's **0.072 is the noise floor** — float accumulation over a
different number of smaller steps. Everything above it is a real mechanism.

Put beside the port's own accuracy, this is not a minor axis: the whole-demo
median RMSE is **24.35**, and spires, beach and winter all meet or exceed it.
**Frame rate is one of the largest single error sources in the port**, larger
than most defects the fix loop has chased. The 2026-08-11 session suspected as
much — it warned that option (b) "perturbs every other frame-count accumulator
demo-wide" — but it was never measured until now.

A grep for the spires' double-integration pattern found NOTHING outside
`#stepSpires`, and that grep was wrong: it matched only the mechanism already
known, so it confirmed the expectation instead of testing it. Beach and winter
must therefore have their own per-tick mechanisms (ribbon phase wrap and
precipitation respawn are the obvious suspects) and neither has been read yet.

⚠ **METHOD NOTE, worth more than the finding.** The first version of this
measurement reported all nine scenes IDENTICAL, and that was a broken test:
`toDataURL` was read in a separate `page.evaluate` from the render, so the
drawing buffer had already been cleared and every frame compared was BLANK.
`sweep.mjs:49` documents the requirement — render and read back in ONE
evaluate — and it was not followed. The failure mode is the dangerous kind: a
blank-vs-blank comparison reads as "identical", which was both a plausible
answer and the one being looked for. Only a control — rmse(0x0606, 0x0900),
which MUST be large — caught it. Any diff harness in this repo that can return
"no difference" needs a positive control in the same run.

### What this does NOT settle

`FUN_0040bfc1` really is doubly integrated in the ORIGINAL, so the original was
frame-rate dependent too and looked different on different 2001 machines. There
is no single "correct" appearance to port to.

But the live page ticks per `requestAnimationFrame` (main.js `frame`), while
every harness path uses a fixed `WARM_STEP`. So the PUBLISHED SITE renders a
different demo depending on the viewer's monitor: 68 grown spires at 0x0606 on
a 60 Hz display, all 80 on a 120 Hz one. That is not a capture-matching
question and it is not what any previous session was weighing — it is
non-determinism in the artefact itself, and it now matters because the shipped
default was just changed to publish sonnet as it was (REMASTER.md, 2026-08-21).

Open decision, NOT taken here: pin the per-tick accumulation to a fixed
timestep so the visual state is a function of music position alone. That
diverges from the original's code in order to preserve the original's
appearance — the same trade as the resolution reset, and the same kind of call.
Deciding it needs the beach and winter mechanisms read first, since a fix aimed
only at `#stepSpires` would leave the other two thirds of the error in place.
