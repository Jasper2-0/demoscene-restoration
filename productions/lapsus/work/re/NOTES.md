# Lapsus (Mature Furk, Assembly 2000) — reverse-engineering notes

- demozoo: https://demozoo.org/productions/24439/
- pouet: https://www.pouet.net/prod.php?which=130
- original: originals/maturefurk/lapsus_by_maturefurk.zip (pinned in prod.json;
  the second scene.org variant `lapsus_b.zip` is info-files only: readme +
  zepoinfo.txt)
- readme: "jesus, they're back." — "100% hobby production made in 3 days".
  code petri mikko · 2d timo · 3d janne eetu juha · music radix (mikko mix).
  "opengl. geforce or something like that. 500-700mhz strongly recommended."

## Triage (2026-08-13) — first pass, asset access CONFIRMED

Release contents: `Lapsus.exe` (430,080 B, **plain PE32 — not packed**),
`Lapsus.dat` (10,087,965 B), `fmod.dll` (UPX), `glut32.dll`, readme, scene.org.

**`Lapsus.dat` is an ordinary ZIP** (`PK\x03\x04` at offset 0). 196 files,
14.9 MB uncompressed, all standard formats. Repeatable extraction:
`node productions/lapsus/work/unpack.mjs` → `unpacked/lapsus_dat/` +
`MANIFEST.sha256` (`--verify` to re-check).

| what | count | notes |
|---|---|---|
| `data/*.lws` | 23 | LightWave Scene **v3, text** — full keyframe envelopes, per-channel keys, `LoadObjectLayer` refs into `lwo/` |
| `data/lwo/*.lwo` | 50 | LightWave Object (binary IFF) |
| `data/lwo/textures/*` + `data/pics/` | 98 jpg + 9 tga | textures |
| `data/particles/tauno/epes000..041.jpg` | 42 | 32×32 sprite-animation frames |
| `data/hairs/*.txt` | 6 | text data (hair/strand definitions — to parse) |
| `data/mjuusik/*.mp3` | 2 | the soundtrack |

## What the exe tells us (strings only so far — no Ghidra yet)

- Imports: KERNEL32, USER32, OPENGL32, `glut32.dll`, `fmod.dll`. Fixed-function
  **OpenGL 1.x via GLUT** — same API family as ptct, so the minigl shim line
  of work applies directly.
- FMOD surface is tiny: `FSOUND_Init/SetBufferSize/Sample_LoadMpegMemory/
  PlaySound/StopSound/Close`. It loads the MP3 **from memory** and plays it —
  in a browser this is one `<audio>` element; timeline sync rides the audio
  clock as usual (METHOD.md §7).
- The exe carries the show's part list as literal `data/<Name>.lws` strings:
  Diskojea, Hairball, Hedi, HigherBiing, Hulluolli, Kaivoalieni, Kartonki,
  Kieku, Krediili, Kuubiotekniikka, Made, Mela, … — cross-reference against
  the 23 .lws files and recover the play order + per-part effect code next.

## Why this one is different

Everything previous was procedural 64k reconstruction. Lapsus is an
asset-driven demo: the recoverable unknowns are the **player** — LWS
interpretation (which envelope channels, what interpolation), per-part GL
state/effects, particle behavior (tauno sprites), the hair system, and the
part sequencing/sync. The assets themselves need no reconstruction, only
parsers: LWO/IFF and LWS are publicly documented formats; JPG/TGA/MP3 are
browser-native (TGA needs a tiny loader).

## Ghidra pass (2026-08-13)

Ghidra 12.1.2 headless (install: `~/tools/ghidra_12.1.2_PUBLIC`, JDK 21 at
`~/tools/jdk-21*`): 2,062 functions → `re/decompiled.c` + paired
`re/disasm.asm` (canonical scripts in `tools/ghidra/`).

- `re/x87_audit.md`: **42 functions flagged** by `tools/x87-audit.mjs` — the
  automated "decompiler dropped the float math" cross-check. Verified real on
  `FUN_0043fcd0`: C shows `"%f %f %f %f"` calls with NO arguments; the asm
  FLD/FSTPs four floats per call. Treat DROPPED entries as un-ported until
  their asm is read. (Some flags are MSVC CRT float helpers — known noise.)
- The engine calls itself **dm2000** (fake argv in `FUN_0040b050`, the
  window/init class at 0x40b050). GLUT callbacks: display `0x40b820`,
  reshape `0x40b870`, idle `0x40b8a0`. Fullscreen via
  `glutGameModeString("%dx%d:%d@%d")` + `glutEnterGameMode`.
- `GL_ARB_multitexture` resolved via `wglGetProcAddress` (glMultiTexCoord*).
- **One C++ class per part**: each part function `operator_new`'s its object
  (e.g. 0x100 bytes for Diskojea) and builds a std::string of its
  `data/<Name>.lws` path. The part table / sequencing that instantiates them
  in order is the next target.

## Engine recovered (2026-08-13) — see `re/ENGINE.md`

The whole sequencing model is out, and the exe ships **full MSVC RTTI** (108
mangled class names), so every class has its real name: `Demo`, `DemoPart`,
`Part_<Name>`, `Music`, `Timer`, `FadeIn/FadeOut/RandomFadeIn/RandomFadeOut`,
`LW::Scene`, `LW::TextureManager`. That is an enormous head start — no
guessing at class boundaries.

- **Timeline is hardcoded**, not scripted: `Demo::loadPhase` (0x402860)
  builds two literal schedules of 0x20-byte entries
  `{partIndex, start, duration, localTime, fadeIn*, fadeInDur, fadeOut*,
  fadeOutDur}`. Full play order + fades in ENGINE.md §5.
- **Clock is QPC wall time**, reset right after each `FSOUND_PlaySound`; FMOD
  is never queried for position. Per-phase time ≈ time since that half's MP3
  started — which is exactly what the capture alignment measured.
- **Independent confirmation**: the hard exit constant at 0x45a324 is
  **112.0 s**, and the capture gives 219.1 − 106.96 = **112.14 s**. Static
  analysis and the audio-aligned capture agree without either being fitted to
  the other.
- **Mid-demo loader**: `Part_LoadPart2` (draws pics/loading2.jpg) stays
  current past its 1.5 s duration; at localTime 2.5 it calls `loadPhase(2)`,
  which destroys phase-1 parts + the TextureManager, loads the phase-2 scenes
  (~5 s, screen frozen, mp3#1 still playing), then StopSound → play mp3#2 →
  reset clock. Matches the two-halves structure Jasper described.
- **Dead content**: `Part_Mela`, `Part_Sittis`, `Part_Kieku`,
  `Part_StartPart2` are registered but never scheduled — so `mela.lws`,
  `sittis.lws`, `kieku.lws` ship unused. (Resolves the 23-scenes-vs-21-
  factories discrepancy from LWS_INVENTORY.md; `pehko` is scheduled and
  `flu2` is its own part.)
- The 0x45c688 records were **MSVC RTTI**, not a part registry — hypothesis
  killed. Nothing sequencing-related runs at CRT init.

## First static frame (2026-08-13) — transform chain VERIFIED

`node productions/lapsus/work/verify/frame.mjs hulluolli 4.8` renders one
frame and montages it against the capture. The jester statue matches the
reference in **silhouette, framing, scale, orientation and pose**, which
validates the whole transform chain at once:

- `fovX = 2·atan(1/zoom)` with `fovY = 0.75·fovX` **as an angle** (34.7° here)
- `local = T · Ry(h) · Rx(p) · Rz(b)`, `world = local · parentWorld`
- `modelview = Scale(1,1,−1) · inverse(cameraWorld) · objectWorld` with
  `frontFace(CW)`
- near = 1.0, far = 100.0

**Textures added the same day** and the frame now matches the capture closely:
statue, background colonnade, tone and framing all read correctly. Texture
coordinates are *computed*, not read — see `LWO_INVENTORY.md`: most objects
carry no TXUV map, only a projection + axis + size + centre. Surfaces with
`LUMI 1.0` are drawn unlit per RENDER.md §8, which is right because several
textures are pre-rendered views of the object with the lighting already baked
in.

### Background mapping — SOLVED 2026-08-13, see `RENDER.md` §10

The texgen was read out of the asm (`FUN_0042b0c0` @0x42b0c0 dispatches a jump
table at 0x42b128 to four x87 workers). dm2000 **does** implement cylindrical,
but its U is the **negative** of LightWave's and phased on the projection
axis' +Z rather than the texture centre:

```
PROJ 1, AXIS 1:  u = −WRPW · atan2(x − CNTR.x, z − CNTR.z) / (2π)
                 v = 0.5 − (y − CNTR.y) / SIZE.y
```

Mirror + half-texture shift — which is precisely a shape change no wrap
multiplier can undo. Verified against the capture: predicted column positions
land within 5 px of the reference's, background-profile correlation **0.971**
(the textbook formula scores **−0.443**), and no extra U offset improves it.
Full per-mode formulas, the `BLOK` field layout and the uv1 answer are in
`RENDER.md` §10. The measurements below stand as the record of *how* it was
cornered — note in particular that the "top 110 px" strip used there is **not**
pure background in this frame (the jester's hat fills it), which is why that
correlation ceiling sat at 0.75.

### Background mapping is NOT solved — measured, not guessed (superseded)

Jasper flagged the backdrop tiling. Quantified by cross-correlating the
horizontal intensity profile of the top 110 px (pure background) of our frame
against the reference:

- best fit under a pure scale+shift is **×1.11 and 14 px**, and even there the
  correlation only reaches **0.754**;
- sweeping the cylindrical wrap multiplier gives 0.348 / 0.540 / 0.647 /
  0.668 / **0.710** / 0.698 for 1.80 / 1.91 / 2.00 / 2.02 / 2.14 / 2.25
  repeats across the backdrop.

So the correlation plateaus near 0.70 for *every* wrap value: **no tiling
factor fixes it**, and the tempting round number (exactly 2.0 repeats) is
actually worse than what we ship. The mapping's shape is wrong, not its
scale.

**The LWO data is complete and does not explain it.** Every projection
parameter was dumped with values (`naamiotaus.lwo`, sole BLOK):

| chunk | value | meaning |
|---|---|---|
| `PROJ` | 1 | cylindrical |
| `AXIS` | 1 | about Y |
| `CNTR` | (0, 5, −100) | projection centre |
| `SIZE` | (125, 100, 15.74) | projection extent |
| `ROTA` | (0, 0, 0) | **no** projection rotation |
| `CSYS` | 0 | **object** coordinates, not world |
| `WRAP` | Repeat / Repeat | tiles on both axes |
| `WRPW` / `WRPH` | 5 / 1 | wrap counts |

Nothing is missing or ambiguous, and nothing there is a hidden shape
parameter: `ROTA` is zero so the projection is unrotated, `CSYS` is object
space which is what we use, and `WRAP` is Repeat which is what we bind.
(Watch out: dumping `WRAP`'s 4 bytes through a float formatter prints
"0.0000" and reads as `Reset` — it is two u16s, and it is `1/1`.)

Conclusion: rendering the data faithfully by LightWave's own cylindrical
rules does **not** reproduce the capture, so **dm2000 does not implement
LightWave cylindrical projection faithfully**. That makes this a question
about the engine, not about the assets, and it is only answerable by reading
its texgen — which RENDER.md lists as unread. The origin-pivot currently in
`main.js` is an empirical stand-in that looks closer; it is not derived and
should be replaced by whatever the disassembly says.

`?wmul=` on the renderer scales the cylindrical wrap for sweeps like this one.

### RESOLVED — it was never a timing offset (2026-08-13)

The apparent lead was an **interpolation bug**, not a clock difference. See
`work/js/lws.mjs`: endpoint tangents were halved by substituting the key
itself for the missing neighbour, turning a straight ramp into an
ease-in/ease-out S-curve. Running slow early and catching up late presents as
an offset that *varies with time*, which is what made it so convincing.

`pene`'s heading is a single two-key span, 0 → 6.283185 over 12 s with
tension/continuity/bias all zero — a constant 30 °/s, derivable from the file
in one line. With the full chord at both endpoints the Hermite basis
degenerates to exactly linear and the heading is 0/60/120/180/240° at
t=0/2/4/6/8.

Verified three ways: the silhouette probe now reports **+0.00 s at all three**
sample times (was +0.60/+0.40/+0.00), with both statistics agreeing at t=4
and t=6; and the whole-frame peak moved onto the nominal time (t=4.0 went
0.906 → 0.9545 while t=4.4 went 0.948 → 0.9078).

**Frame correlations after the fix:**

| frame | before | after | MAD |
|---|---:|---:|---:|
| `hulluolli` t=4.8 | 0.998 | **0.998** | 2.4/255 |
| `pene` t=4 | 0.906 | **0.954** | 7.7/255 |
| `kuubiotekniikka` t=6 | 0.754 | **0.941** | 7.0/255 |

kuubiotekniikka gaining 0.19 shows the bug was never pene-specific — that
scene animates 32 parented cubes, every one of them on a wrong curve. Any
two-key envelope in any of the 23 scenes was affected.

Remaining on `pene`: mean level now *overshoots* (41.7 vs 36.9), consistent
with the material notes below — specular is specified in RENDER.md §4.5 and
is still not implemented.

### Superseded: "the reference leads our render, but not by a constant"

Jasper spotted that the object's rotation in `pene` is slightly ahead in the
capture. Confirmed by sweeping our render time against a fixed reference
frame and correlating whole-frame luma:

| nominal local t | best-matching render t | offset | corr at peak |
|---:|---:|---:|---:|
| 2.0 | 2.6 | **+0.60** | 0.962 |
| 4.0 | 4.4 | **+0.40** | 0.953 |
| 6.0 | 6.0 | **+0.00** | 0.964 |

(at t=4 the peak is pronounced: 0.907 at +0.0 rising to 0.953 at +0.4.)

So there IS a discrepancy, but it is **not a constant clock offset** — and it
is not drift either: ENGINE.md's independent check has phase 2 running
112.14 s in the capture against the binary's hardcoded 112.0 s exit, i.e. the
two clocks agree to 0.12 % over 112 seconds. A rate error large enough to
explain 0.6 s over a few seconds would have shown up there as many seconds.

**Update — the silhouette probe is built** (`work/verify/timing.mjs`). It
removes the background from both sides before comparing: ours exactly, by
rendering twice with `?objects=0`; the reference by per-pixel *median* across
frames spanning the part (median, so a bright object crossing a pixel cannot
drag the estimate). It reports two statistics that fail differently —
correlation and centroid distance — plus the peak-to-trough spread of each,
because the argmin of a flat curve is noise wearing the costume of a
measurement.

It is far better conditioned than whole-frame luma: peak-to-trough 0.18–0.22
in r, against 0.04 before. Results on `pene`:

| nominal t | correlation says | centroid says | verdict |
|---:|---|---|---|
| 2.0 | +0.60s | +0.40s | both informative, **disagree** |
| 4.0 | +0.40s | +0.40s | both informative, **agree — real** |
| 6.0 | +0.00s | +0.80s | both informative, **disagree** |

So **+0.40s at t=4 is confirmed** by two independent statistics, and the
other two moments remain genuinely undecided rather than falsely confident.

Ruled out as causes: **frame extraction** (the capture is 60 fps with dense
keyframes, and `-ss` before vs after `-i` produce byte-identical frames, so
fast seeking is not skewing the reference) and **frame quantisation**
(1/60 s = 0.017 s, two orders of magnitude too small).

Leading remaining hypothesis: `pene`'s object motion may be non-monotonic
over the sweep window, so several render times match a given reference frame
about equally well and the two statistics latch onto different ones. Testing
that needs the object's own envelopes plotted over the part, not more
correlation.

Candidates, in the order worth testing:

1. **The estimator is noisy for this content.** `pene` is a semi-transparent
   object over a static backdrop that dominates the frame, so whole-frame
   luma correlation is mostly measuring the (time-invariant) backdrop and
   only weakly the rotation. A sharper probe — silhouette centroid or edge
   position, measured on the object region only, with the backdrop masked
   out — would give a far better-conditioned peak.
2. **Frame quantisation in the capture.** The demo free-runs (idle callback
   re-renders continuously) while the capture is a fixed-rate video, so any
   single reference frame is the demo's state at an arbitrary sub-frame
   instant.
3. **A genuine per-part time origin difference**, e.g. a part whose local
   clock does not start exactly at its scheduled boundary.

Do not "fix" this by adding a fudge to the frame harness: an offset that
varies with t cannot be a constant, and fitting one would hide whichever of
the above is real.

### Material path: applied from RENDER.md, but measurement is confounded

Implemented from RENDER.md §4.5 rather than by eye: reflection added
**unscaled** (`REFL` is a threshold — mask bit 0x80 is cleared unless
reflectivity > 0.95 — not a coefficient), and material diffuse is a
**neutral grey** when a COLR texture is present rather than surfaceColour ×
diffuseLevel. Archive-wide, reflectivity is effectively binary: 35 surfaces
> 0.95, **0 surfaces between 0 and 0.95**, 38 at zero — which independently
supports reading it as a threshold.

Neither changed the correlation, and that is the useful result: pene sits at
0.906 whether the object is too dark (mean 36.1) or too bright (38.1), so
**brightness is not what limits this frame**. Re-running the time sweep with
the material fixes in place:

| render t | corr |
|---:|---:|
| 4.0 (nominal) | 0.906 |
| 4.3 | 0.947 |
| **4.4** | **0.948** |
| 4.5 | 0.920 |

The timing offset is worth ~0.04 of correlation — more than any material term
touched so far. **Do not tune materials further until the timing probe is
sound**, or the fitting target is a mistimed frame. Note also that at the
best-matching time the material changes moved 0.9525 → 0.9482, i.e. very
slightly worse with the mean overshooting, which points at a remaining term
(specular is specified in RENDER.md §4.5 and is not implemented) rather than
at the two rules above, both of which are engine-derived. Candidates
are a sub-frame time offset (the demo is free-running, so the capture's frame
is not exactly at t=4.8), and the fact that no lighting, fog or fader is
implemented yet. Worth settling with a small time sweep before assuming a
transform error.

Two format facts cost a debugging round each and are now in
`LWS_INVENTORY.md`: **cameras carry 6 motion channels, not 9**, and
**`ParentItem` is a hex item ID**. Both fail *silently* into something that
looks like a different bug.

Also: the schedule in `ENGINE.md` was independently confirmed against the
capture with ffmpeg scene detection. Detected cuts at 61.43 / 70.95 / 99.53 s
match predicted part boundaries at 61.41 / 70.94 / 99.53, and 147.97 matches
HigherBiing's internal camera cut at 148.16. The boundaries that went
undetected are precisely those with slow black fades rather than the fast
white ones — so the schedule, the 6.41 s audio alignment and the fade table
all corroborate each other.

## All-parts report card (`work/verify/allparts.mjs`)

Renders every scheduled part at its midpoint and scores it against the
capture. Building it immediately found that **11 of the 21 parts were not
rendering at all** — invisible while iterating on three hand-picked frames.
Cause: object paths come in the same three shapes as texture refs (84
archive-relative, **49 a bare filename**, 18 absolute from a third artist's
machine, `H:Lapsus/…`). Basename resolution fixes all of them; 136 of 151
references resolve and the 15 that do not belong entirely to
kieku/mela/sittis — the three scenes the engine never schedules.

**Hair binding, recovered from the scene files:** `AddNullObject Hair_<name>`
binds that null to `data/hairs/<name>.txt`. The five distinct `Hair_` names
map 1:1 onto the five hair files:

| scene | nulls | file |
|---|---|---|
| `hairball` | `Hair_furball` ×2, `Hair_furball2` | furball.txt, furball2.txt |
| `krediili` | `Hair_furballkr1`, `Hair_furballkr2` | furballkr1.txt, furballkr2.txt |
| `pehko` | `Hair_ruoksa` | ruoksa.txt |

So `krediili`'s golden plume is **hair**, not geometry — its seven quads are
just the credit-name sprites (`CredEetu1.jpg`, `CredJanne1.jpg`, …), which
carry TRAN ≈ 1.0 with LUMI 1.

Every part scoring 0.000 is now explained: `hairball`, `krediili` and `pehko`
need the hair system; `empt` has **no `.lws` at all** (its content is drawn
entirely by its custom vf2); `silli` is a frame-feedback part.

## Standing (2026-08-13) — `node work/verify/allparts.mjs`

| r | part | note |
|---:|---|---|
| 0.999 | hulluolli | |
| 0.995 | kuubiotekniikka | remainder is its loading2.jpg cross-dissolve |
| 0.959 | pene | |
| 0.865 | made | |
| 0.827 | turska | |
| 0.733 | diskojea | |
| 0.688 | flu2 | |
| 0.547 | paleksi | |
| 0.515 | syrjakyla | |
| 0.488 | viherio | strobe gates the CLEAR — needs a frame loop |
| 0.324 | hedi | |
| 0.319 | kartonki | |
| 0.290 | morko | |
| 0.278 | rad_out | mask-7 surfaces, over-bright |
| 0.229 | kaivoalieni | mask-7 surfaces, over-bright |
| 0.114 | higherbiing | mask-7 surfaces (hirbiRadBack) |
| 0.000 | empt, krediili, pehko, hairball | hair system / no scene |
| −0.114 | silli | frame feedback |

### Hair: WORKING (2026-08-13)

Three bugs, all found by reading `FUN_0042d220`'s pseudocode rather than
tuning: **`T` starts as the strand direction, not zero**; **node[0] IS the
root anchor and is never integrated**; and the loop runs `1 .. N-1`. With
`T = 0` the stiffness term vanishes on the first segment, each strand loses
its directional memory, and after ~480 steps gravity drags all 500 strands to
the same equilibrium — they rendered as ONE vertical line.

Fixed, krediili's plume renders with its full fibrous structure and correct
colour. hairball 0.000 → **0.560**, krediili 0.000 → **0.523**, pehko
0.000 → **0.100**; median across all parts 0.324 → **0.515**.

Remaining on these: the plume's position/orientation still differ (the
`Hair_` null's animated transform), and pehko additionally needs its particle
system and its frame feedback.

### (superseded) Hair: parsed and bound, integration NOT right

`work/js/hair.mjs` implements RENDER.md §11. Verified: all five
`data/hairs/*.txt` parse with **zero unknown tokens**; the
`AddNullObject Hair_<name>` binding resolves; strand construction uses MSVC
`rand()` from the CRT's initial seed of 1 (the engine never calls `srand`, so
the shape is deterministic); and the draw path renders 10,000 line segments
for krediili additively with culling off.

**But the integration collapses.** Stepping
`pos_i = P + normalize((pos_i + dt·g − P) + T·(dt·stiff_i))·segLen_i` at
1/60 s from rest to t=8 s drives every strand to the same equilibrium —
straight down — so 500 strands render as ONE vertical line where the capture
shows a spread plume. Gravity (−4.81 as a displacement rate) dominates over
~480 steps.

Candidates: the step rate is wrong (the original free-ran, and this
integrator is explicitly dt-dependent, so the equilibrium depends on the
frame rate it ran at); the initial tangent `T` per strand should be the
strand direction rather than zero; or the strand should not be simulated from
rest at all at part entry. Settle it against `FUN_0042d220` rather than by
tuning dt until it looks bushy.

### Tauno particles — specified, not yet implemented

`data/particles/tauno/tauno.txt` is read and understood; only the renderer
side is missing. Note it **does** have comment syntax (`;`), unlike the hair
format which silently drops unknown tokens — so its several commented-out
`LifeTime` lines are genuinely inert, and the live value is 1.6772206.

Shipped parameters: `FPS 10`, `MaxParticles 10`, `EmitInterval 0.1`,
`InitialSize 1.6`, `InitialPosition 0,0,0 ± 0.55/0.30/0.55`,
`InitialVelocity 0,1,0 ± 0.16/0.56/0.16`, `InitialZRotation 0 ± 1.0`,
`VelocityMultiplier 0.0`, `Friction 0.5`, `ZRotVelocity ∈ [−1, 1]`,
`Grow −1.0`, `AlphaFadeSpeed 0.5`.

Update rule (RENDER.md §11): `age += dt; zRot += dt·zRotVel; pos += dt·vel;
vel *= (1 − dt·Friction); size *= (1 + dt·Grow)`; dies on `size ≤ 0.1`,
`alpha < 0` (`alpha -= dt·AlphaFadeSpeed`) or `age > LifeTime`. **No
gravity.** Frame is `min(floor(age·FPS), 39)` — **clamped, not looped** — so
with LifeTime 1.677 only frames 0–16 of the 40 JPEGs are ever displayed.
Draw: `GL_QUADS` billboards, additive, depth test on with `depthMask(FALSE)`.

Only `Part_Pehko` uses it, cloning **one system per hair node**: ruoksa's
8 strands × 10 nodes = 80 systems, ≤ 800 sprites. The generic
`Particle_<name>` LWS path exists but no shipped scene uses it.

Two cautions recorded by the RE pass: the tint computes to only ~1.5 %
additive contribution per sprite (unambiguous in the bytes but worth a
capture check), and `prevPosition` is only written in the "finished" branch
so emitter velocity is nonsense — harmless solely because
`VelocityMultiplier` is 0, and it should be ported as zero rather than
"fixed".

### FINAL STANDING (all 21 parts render)

hulluolli 0.999 · kuubiotekniikka 0.995 · pene 0.959 · made 0.865 ·
turska 0.827 · diskojea 0.733 · flu2 0.688 · hairball 0.560 · paleksi 0.547 ·
krediili 0.523 · syrjakyla 0.515 · viherio 0.488 · pehko 0.410 · hedi 0.324 ·
kartonki 0.319 · morko 0.290 · kaivoalieni 0.231 · rad_out 0.203 · empt 0.000 ·
higherbiing −0.003 · silli −0.147. **Median 0.515**, up from 0.324 at the
start of the closing pass and from "11 of 21 not rendering at all" before it.

Everything specified is now implemented: texgen, materials, multi-texturing
including the mask-7 second pass, specular, linear fog, depth sorting, the
blend/depth mode table, faders, backdrops, TGA decoding, animated camera
zoom, per-part camera cuts and perturbations, hair, particles, and frame
feedback (as a replayed decay window, since the default framebuffer persists
across draw calls — no FBO required).

### What is genuinely left

1. **Mask-7 surfaces are over-bright** — kaivoalieni 0.231, rad_out 0.203,
   higherbiing −0.003, all drawing `*RadOut`/`hirbiRadBack` objects. Ordering
   has been ruled out empirically (both assignments score within noise), and
   the textures now load, so the fault is in the **unlit path**: every one of
   these surfaces carries LUMI 1.0 and is drawn fullbright via `glColor4f`,
   and how that composes with a modulating unit-1 texture is not covered by
   the notes. Read the unlit branch at 0x42ca0f and `FUN_0040c060` @0x40c5b0.
2. **`silli` renders the right object from the wrong viewpoint** — visible in
   its side-by-side. Its camera is wrong *before* feedback enters into it, so
   chase the camera, not the trail.
3. **`Part_Empt` has no scene at all**; its content is the stamping routine in
   its own vf2 (RENDER.md §12: three phases over 1.3 + 8.0 + 3.7 = 13.0 s,
   `design1.tga` stamped in a jittered fan with `rand()`-driven alpha).
4. hedi / kartonki / morko sit at ~0.3 with no single identified cause.

### The two remaining structural gaps

**1. Frame feedback needs a real frame loop.** Silli (depth-only clear, 20 %
black quad), Pehko (no clear, 5 %), Part_Empt (clears exactly once in the
whole process) and Viherio (its strobe gates the *clear*, so frames
accumulate ~0.12 s per hit) all depend on what was in the buffer previously.
A single-frame renderer has no history, so these cannot be scored fairly by
`allparts.mjs` and their numbers should be read as "not applicable" rather
than "wrong". Needs a ping-pong FBO and a driven clock.

**2b. Mask-7 texture ORDERING is not the fault — both readings tested.**
With the TGA decoder in place, the two candidate assignments were measured:
DIFF on unit 1 with LUMI additive (RENDER.md's literal reading) gives
kaivoalieni 0.231 / rad_out 0.203 / higherbiing −0.003; LUMI on unit 1 with
DIFF additive (textures filling units in slot order) gives 0.212 / 0.206 /
0.033. Both are within noise of each other, so the remaining fault lies
elsewhere — most likely in the **unlit path**, since every one of these
surfaces carries LUMI 1.0 and is therefore drawn fullbright via `glColor4f`,
where the interaction between "unlit" and a modulating second texture is
unspecified in the notes. Read 0x42ca0f and the unlit branch of the material
apply before touching the texture assignment again.

**2. Mask-7 surfaces render too bright.** `kaivoalieni`, `rad_out` and
`higherbiing` all score low and all draw `*RadOut`/`hirbiRadBack` objects
whose surfaces are COLR+LUMI+DIFF **with LUMI 1.0**, i.e. unlit *and*
carrying an additive third pass. Visually the geometry, camera and
composition match well (see the kaivoalieni side-by-side) — only the tunnel
walls are wrong: ours bright grey-white where the capture is warm brown.
The combination "unlit + modulated DIFF + additive LUMI" is where to look,
and it should be settled by reading the material apply
(`FUN_0040c060` @0x40c5b0 and the mask dispatch at 0x42ca0f) rather than by
adjusting coefficients until it looks right.

## Next steps

1. Textures + materials: LWO `SURF`/`BLOK` → GL state per `RENDER.md` §8
   (RGBA8, REPEAT, `LINEAR_MIPMAP_NEAREST`, no row flip, alpha from the
   separate `_a` image, unit-1 env `GL_ADD`).
2. Per-part draw functions (the `vf2` of each factory) and `LW::Scene`
   rendering internals — several sit near x87-audit SUSPECT entries, so read
   `disasm.asm` for those rather than the C.
2. LWO (binary IFF) parser — `work/js/lws.mjs` already covers the scenes.
3. Fader material modes 1/3 blend semantics (ENGINE.md §6).
4. `data/hairs/*.txt` + the tauno particle system formats.
2. LWS parser first (text; small), render one scene's camera + object motion
   against a stub renderer; LWO parser second.
3. ~~Reference capture~~ DONE: youtube oP3lrBNVKBs pinned (219.1 s). Jasper:
   **the two MP3s play in order; there is a loading part in the middle.**
   10 ms log-energy correlation against the capture: mp3#1 starts at
   **6.41 s** (score 0.81), mp3#2 at **106.96 s** (score 0.88). mp3#1 is cut
   before its natural end (would reach 117.4 s) — consistent with
   `FSOUND_StopSound` in the imports; the capture ends at 219.1 s, ~7 s
   before mp3#2 would finish. Part 1 ≈ 0–107 s, part 2 ≈ 107–219 s.
4. Hair `.txt` + `epes` particle sprites: parse formats after the Ghidra pass
   shows the consuming code.

## Mask-7 "over-brightness" — SOLVED 2026-08-13, see `RENDER.md` §13

Not the unlit path. `FUN_0040c060`'s unlit branch (0x40c1e0–0x40c224) is a
pure `glColor4f(diffuse/255, 1−transparency)` + `glDisable(GL_LIGHTING)`
substitution: it falls through to 0x40c225 and shares the unit-0/unit-1/
blend/depth/fog/cull code with the lit branch byte for byte. Both units stay
enabled, the env modes are unchanged, the second pass is still drawn (the pass
count `FUN_0040c050` @0x40c050 reads only `material[+0x3c]`), and there is no
texture-env colour anywhere in `.text`. For these three surfaces
(`COLR (1,1,1) · DIFF 1 · LUMI 1 · TRAN 0`) the unlit colour is plain white.

The actual fault: all three objects — and **only** these three in the whole
archive (`PROJ` histogram over 49 LWOs: `{0: 25, 5: 60, 1: 4}`) — use
**`PROJ 5`, UV mapping**, with a `TXUV` `VMAP` per surface per channel family.
The engine implements it (`FUN_0042b0c0`'s jump table at 0x42b128 has six
entries; index 5 → `FUN_0042b720`, `u = uv.u`, `v = 1 − uv.v`), and
`RENDER.md` §10.3 already documented it. `web/js/main.js`'s `projectUV` has no
`case 5`, so every UV block falls into `default:` = planar. All three textures
on all three objects are therefore sampled at the wrong coordinates.

That also explains the score history: pre-TGA the DIFF/LUMI channels simply
did not load and the surfaces drew as `white × COLR` — blown out. With the TGA
decoder they modulate, but by strip textures (`diffuse0001kaivoalieni.tga` is
256×32, mean 40/255) fetched planar, so `kaivoalieni` at t=6.75 is now
near-black with radial streaks. And it explains why swapping the two
texture-order hypotheses moved nothing: both read from the wrong UVs.

Next: implement `PROJ 5` per §10.3, keep §10.4's slot routing (COLR → uv0,
DIFF → uv1, LUMI → the pass-1 side array), and give the pass-1 draw its own UV
buffer instead of reusing uv1. §13.4 lists four smaller pass-1 deviations
(pass 1 modulates by `glColor`, is fogged, writes depth, uses the third UV
set).

## §14 Part diagnostics — silli / hedi / kartonki / morko (2026-08-14)

(Numbered §14 because `RENDER.md` already carries a §13.)

Baseline at the start of this pass — `node work/verify/allparts.mjs`,
median **0.515**: silli **−0.147**, morko **0.290**, kartonki **0.319**,
hedi **0.324**. After the two fixes below, median **0.580**:
silli **0.580**, morko 0.346, kartonki **0.691**, hedi 0.458.

Two causes account for all four parts, and both are rules the disassembly
already settles. Neither was found by looking at the four parts in isolation —
each one, once read out of the binary, turned out to hit a third of the archive.

### §14.1 silli — CAUSE: `LW_MorphMixer` displacement is never applied

The camera was ruled out first, as instructed, and it is innocent on every
count: `silli.lws` has **one** `AddCamera`, it has **no** `ParentItem`, and
`Part_Silli::vf2` @0x407e30 (RENDER.md §12.6) contains no camera manipulation
at all — it is depth-clear, `fader.draw(0.8)`, `tick`, `render(getCamera(0))`.
The zoom envelope is a single key (1.562) and was already parsed correctly.

What is wrong is the **geometry**. `silli.lws` carries, inside its object
block, a

```
Plugin DisplacementHandler 1 LW_MorphMixer
4
1
{ Group  4  "Miscellaneous" }
{ MorfForm "blo1" 1 { Envelope … } }   … blo2, blo3, blo4
EndPlugin
```

and `YourOrdinaryDemoObuSecondEdition.lwo` carries the matching
`VMAP MORF blo1..blo4`, 5136 entries each. **The engine implements this.**
`Lapsus.exe` contains the strings `LW_MorphMixer`, `DisplacementHandler`,
`Morph map `, `LWException_MorphMapNotFound` and `Broken morph mixer in file `;
the LWS-side parser is `FUN_0041c080` @0x41c080 (dispatched from the scene
reader's `Plugin` branch at ~0x4188xx after matching both `DisplacementHandler`
and `LW_MorphMixer`), the delta cache is built by `FUN_0041ba90` and the
per-frame apply is `FUN_0041be60`.

`work/js/lws.mjs` was dropping the whole block into `scene.unhandled`, so the
renderer drew the **base mesh**. That is not a subtle error here: the four
morph targets have a *mean* displacement of **7.8–8.5 units** (max 17.3) on an
object whose bounding box is 64 × 39 × 39, and `blo1` is at full weight at
t = 0 while `blo4` peaks at t = 5. A shape change that large reads exactly like
"the right object from the wrong viewpoint", which is why the camera looked
guilty.

**Semantics, from the asm** (`FUN_0041be60`, on the DROPPED list, so read from
`disasm.asm`):

- weight = the `MorfForm` envelope sampled at localTime, used **raw** (not /100);
- a target is dropped unless **|w| > 0.01** — 0x41beb4 `FCOM [0x45ace0]`
  (= −0.01) / `FCOM [0x45acdc]` (= +0.01);
- composition is **additive over relative deltas**: 0x41bfd6–0x41c015 walks
  `out = base + Σ w_i·delta_i`, one pointer per active target, striding
  `numMorphs·12` bytes per vertex (allocation at 0x41bc1f is
  `numMorphs · nVerts · 3` floats);
- UVs are **not** recomputed — the engine bakes them at load from the raw
  `PNTS` (RENDER.md §10.1), so they stay on the unmorphed positions.

**Fix applied.** `work/js/lws.mjs` gained `parseMorphMixer()` (transcribed from
FUN_0041c080's token order) + `MORPH_EPSILON`; `web/js/main.js`'s
`meshFromLayer` collects the layer's `MORF` VMAPs and exposes `applyMorph()`,
which rebuilds positions, re-accumulates normals and re-uploads both buffers;
the render loop evaluates each item's morph envelopes once per frame. silli
**−0.147 → 0.580**, and the side-by-side at t=4 now matches in silhouette,
pose, tone and framing.

**15 `LW_MorphMixer` blocks ship, across five scenes** — kaivoalieni, made,
higherbiing, silli, turska — over six objects with `MORF` maps
(`HigherBeingMM`, `YourOrdinaryDemoObu`, `YourOrdinaryDemoObuSecondEdition`,
`elioelimetYksiMedMM`, `jakkaraMM`, `kekkuli2`). turska 0.898 → 0.914 and
made 0.889 → 0.894 came from the same change.

### §14.2 hedi / kartonki / morko — CAUSE: mask 0x80 puts the reflection on unit 0, where it MODULATES

All three drew the right geometry from the right viewpoint and were simply
**blown out white** (morko's side-by-side was structurally identical to the
capture, just white instead of near-black). Every over-bright surface has the
same shape: `REFL 1.0` + an `RIMG` clip and **no `BLOK` at all** —
`nivel1/nivel1paaB/luppakorva` (`mechaenv.jpg`), `kartonki_01(_w)`
(`Humans.jpg`), hedi's `metalli`/`linssi` (`CorridorTex.jpg`).

That is texture **mask 0x80**, and RENDER.md §4.5/§13.2 already record what the
engine does with it — the port just never implemented it. From the mask
dispatch at **0x42bd1e**:

```
0042be1c  CALL 0x40c020(mat, 1)      ; mat[+0x3c] = 1        texture count
0042be30  CALL 0x40c030(mat, 0, tex) ; mat[+0x40] = refl     UNIT 0
0042be3f  CALL 0x40c040(mat, 0, 1)   ; mat[+0x4c] = 1        SPHERE_MAP texgen
```

and unit 0's env mode is unconditionally `GL_MODULATE` (§4.4 @0x40c231). So on
these surfaces the sphere map **multiplies** the lit colour. `main.js` was
instead treating every `REFL > 0.95` surface as the *unit-1* case (mask 0x81),
adding an unscaled full-brightness texel on top of an already-white base — the
one reading that cannot be undone by any coefficient.

**26 of the archive's 73 surfaces are mask 0x80** (only 9 are the 0x81 form),
so this was never a three-part problem.

**Fix applied** (`main.js`): a reflection image with no other block binds to
unit 0 with a `uTexGen0` sphere-map lookup and modulates; `envTex` (the
additive unit-1 path) is suppressed for those surfaces. hedi 0.324 → 0.453,
kartonki 0.319 → **0.705**, morko 0.290 → 0.346, and as a side effect
diskojea 0.733 → 0.951, syrjakyla 0.515 → 0.747, turska 0.827 → 0.898,
kaivoalieni 0.231 → 0.377, higherbiing −0.003 → 0.084.

### §14.3 Found while measuring the above: `GL_AMBIENT` is (1,1,1), and lighting comes BEFORE the texture

RENDER.md §13.2 rule 1 says the surface's `K` goes to `GL_DIFFUSE` only, "with
`GL_AMBIENT = (1,1,1)` unconditionally". Verified in the bytes: the `SURF`
builder stores `0x437f0000` = 255.0 into `material[+0x04/+0x08/+0x0c]` at
**0x42b90b–0x42b937** with no condition, and `GL_EMISSION` (+0x10..0x18) is
never written at all. So the lit primary colour is

```
Cf = 1·lightModelAmbient + K·Σ max(N·L,0)·lightColour
```

and the texture stages modulate **Cf**, ambient included. `main.js` was
computing `K·(ambient + Σ)·tex`, i.e. attenuating the light-model ambient by
the surface colour. Corrected in the fragment shader (primary colour first,
then unit 0, then unit 1). Only affects scenes with `AmbientIntensity > 0`,
but there it is large: kaivoalieni 0.377 → **0.704**, rad_out 0.175 → **0.536**,
higherbiing 0.084 → **0.525**, viherio 0.479 → 0.558.

### §14.4 What is left on these four, and what was excluded

**Phase 2 renders ~0.2 s early — this caps every phase-2 part.** Sweeping our
render time against a *fixed* reference frame (`scratchpad/sweep.mjs`, whole-
frame luma) gives a sharp, consistent peak off nominal for **every** phase-2
part tested and **none** for phase 1:

| part | phase | r at nominal | best r | at |
|---|---|---:|---:|---:|
| hulluolli | 1 | **0.9987** | 0.9987 | +0.00 |
| silli | 1 | **0.5802** | 0.5802 | +0.00 (±0.15 → ≈0.0) |
| diskojea | 2 | 0.951 | 0.966 | +0.15 |
| hedi | 2 | 0.459 | **0.793** | +0.15 |
| morko | 2 | 0.346 | **0.512** | +0.25 |
| kartonki | 2 | 0.691 | **0.837** | +0.30 |
| turska | 2 | 0.914 | 0.939 | ≥+0.30 |

Phase 1 peaks *exactly* on nominal at both ends of its quality range, so the
transform chain and the envelope evaluation are not at fault. This is a
**clock-origin error in phase 2**, common to all of its parts — most likely the
gap between `FSOUND_StopSound` → `PlaySound(mp3#2)` → clock reset in
`loadPhase(2)`, or a ~0.2 s error in the measured 106.96 s audio alignment.
Deliberately **not** patched: NOTES.md's earlier `pene` episode is the standing
warning against fudging the harness, and the right move is to re-measure the
mp3#2 onset (the 10 ms log-energy correlation scored 0.88 there, so 20 bins of
error is plausible) rather than to add a constant. Note the offset here is
*constant across parts*, which is exactly what the `pene` offset was not.

**hedi** — after the offset, 0.793. Residual mean level matches the capture
(7.6 vs 7.9 at t=1.5), so brightness is now right. Also worth knowing when
reading its score: hedi's slot is 3.0 s with a **2.0 s black fade-out**
(ENGINE.md §5), so 2/3 of the part is inside a fade that `allparts.mjs` does
not apply; correlation is scale-invariant so this does not change `r`, but it
does mean the reference frame is heavily quantised and the estimator is noisy
there. Ruled out for hedi: camera count (one), camera parenting (none — the
`Null_Cam` *is* parented to camera 0 but nothing parents to the null, so it is
inert), and object parenting (7 parented items, all resolving).

**kartonki** — after the offset, 0.837. The remaining defect is brightness:
mean 95.7 against the capture's 48.1, i.e. still **2× too bright**, and the
capture shows a coloured (red-rimmed) disc where ours saturates to white. The
suspect is **specular**, and two things about it are unverified rather than
wrong-by-proof:
  * `main.js` uses `shininess = GLOS × 128`, explicitly flagged as an
    ASSUMPTION in its own comment; RENDER.md §4.5 reads the engine as
    `shininess = surface[+0x30]` = raw `GLOS` (0.36/0.565 here), which in GL is
    a legal but almost flat exponent;
  * the engine's specular is **per-vertex** (fixed function) on 1813 triangles;
    ours is per-pixel Blinn-Phong, which on blades that big is a much larger
    highlight.
  The specular *gate* was checked and ours is right — but note RENDER.md §4.5
  mis-states it: the bytes at 0x42ca1b–0x42ca30 are
  `lit AND (specularity > 0 **OR** surface[+0x48] != 0) AND |colour| > 0`, an
  OR, not an AND (`surface[+0x48]` is the `SPEC` subchunk's envelope reference,
  written at 0x427181, and is null for every shipped surface).
  Excluded for kartonki: texture resolution (`Humans.jpg` resolves by basename
  and binds — `texturedGroups` 2), object parenting (one parent link,
  resolving), camera (single, unparented, static zoom 2.858).

**morko** — after the offset, 0.512, and the side-by-side is now structurally
indistinguishable from the capture. `r` stays low because the frame is ~95 %
black, so the statistic is dominated by fine specular detail. Residual mean
13.5 vs 10.6. Excluded: camera selection (three cameras, but `Part_Morko` uses
the generic `vf2` and therefore `getCamera(0)`; `CurrentCamera 2` in the LWS is
a LightWave *UI* field the engine never reads), camera parenting (none of the
three has a `ParentItem`), and the 26 parented objects (all resolve; the
geometry lines up).

**silli** — 0.580 with the morph in. It is a frame-feedback part (depth-only
clear + a 20 % black quad), and the single-frame harness replays a 0.5 s
window rather than owning a real frame loop, so the trail is approximate by
construction. Mean 39.6 vs 34.0; the capture is slightly greener, consistent
with the `GreenMess1.jpg` sphere map.

### §14.5 Regressions to look at

`flu2` 0.688 → **0.639** and `paleksi` 0.547 → **0.518** both moved down with
the mask-0x80 change, and both are built from mask-0x80 objects (`Mesh059`,
`pallo_01`). flu2 is now visibly *darker* than the capture where it used to be
brighter. The rule itself is read straight from 0x42bd1e and should not be
reverted; the likely remainder is the same specular question as kartonki
(`Mesh059` is `SPEC 0.105 / GLOS 0.525`, `pallo_01` `SPEC 0.205–0.785`), so
settle `GLOS → GL_SHININESS` before touching anything else here.
**`empt` is not reproducible and its number should not be quoted.** Two
consecutive `allparts.mjs` runs with no code change between them gave
**−0.013** and **0.850**. It has no `.lws` and no mask-0x80 surface, so nothing
in this pass can have touched it; the swing is in the part itself. Its content
is `Part_Empt::vf2`'s `rand()`-driven stamping replayed over a feedback window,
so the suspect is the MSVC `rand()` stream being consumed a different number of
times per run (the replay loop calls `renderAt` repeatedly and each call draws
N stamps from the *shared* generator, so any variation in how many frames the
harness lets through changes the whole pattern). Give it a per-frame seed
derived from the frame index rather than one running stream, then re-score.
Because of this, quote the median from the run in which the target parts were
measured: **0.580** with `empt` at −0.013, or 0.639 with `empt` at 0.850. The
four diagnosed parts were bit-identical across both runs (silli 0.580,
kartonki 0.691, hedi 0.458, morko 0.346).

---

## §15 Standing (2026-08-14) — median r 0.840, all 21 parts rendering

`node work/verify/allparts.mjs`. Each part rendered at its midpoint and
whole-frame luma-correlated against the capture. Use it to rank work, never to
certify a frame.

| r | phase | part | | r | phase | part |
|---|---|---|---|---|---|---|
| 0.999 | 1 | hulluolli       | | 0.754 | 1 | syrjakyla |
| 0.993 | 1 | pene            | | 0.737 | 2 | higherbiing |
| 0.979 | 2 | kuubiotekniikka | | 0.732 | 2 | morko |
| 0.971 | 2 | diskojea        | | 0.714 | 2 | hedi |
| 0.954 | 2 | made            | | 0.709 | 1 | paleksi |
| 0.937 | 2 | turska          | | 0.690 | 2 | kaivoalieni |
| 0.912 | 1 | krediili        | | 0.669 | 2 | hairball |
| 0.886 | 1 | silli           | | 0.648 | 1 | flu2 |
| 0.853 | 2 | rad_out         | | 0.462 | 1 | pehko |
| 0.845 | 2 | viherio         | |       |   | |
| 0.840 | 2 | kartonki        | |       |   | |
| 0.838 | 1 | empt (noisy)    | |       |   | |

Median 0.515 -> **0.840** over this pass. What moved it, in order of size:

1. **The hair root moves.** Simulating with the root pinned where the null ends
   up converges to a fixed point that has no `dt` in it, so the strands settle
   and stop. Found because RENDER.md §11.1 says "same dt => different hair" and
   a dt sweep returned byte-identical frames — the notes described a property
   our port did not have. krediili 0.531 -> 0.901.
2. **mp3#2 alignment re-measured**, 106.96s -> 106.720s (§15.1 below).
   Whole phase-2 tail.
3. **Fixed-function light-model defaults** — infinite viewer, no back-face
   normal flip. Both established by what the binary never calls.
4. **PROJ 5 UV mapping**, **LW_MorphMixer**, **texture mask 0x80 on unit 0**,
   **Pehko suppresses the hair pass**, **Picture quads are not V-flipped**.

### §15.1 The phase-2 clock

Every phase-2 part rendered 0.15-0.30s early and no phase-1 part did — a clock
ORIGIN error, and phase 2's origin is one number. `work/verify/align.mjs`
re-measures it with an onset-correlator (1ms amplitude envelope, 200ms moving
mean subtracted so the score is driven by transients rather than loudness):

    mp3#1   6.401 / 6.399 / 6.397   mean 6.399   (pinned 6.410, delta -0.011)
    mp3#2 106.722 /106.720 /106.718 mean 106.720 (pinned 106.960, delta -0.240)

Three disjoint 30s excerpts per track agreeing to 3ms. mp3#1 is the control:
the same instrument reproduces the known-good phase-1 pin, so the 240ms belongs
to track 2 and is not estimator bias. The old pin came from a 10ms log-energy
correlation — log-energy is a compressive nonlinearity applied before the
correlation, which weights quiet lead-in like the downbeat.

### §15.2 Open — measured, not guessed

* ~~Hair step size.~~ **BOUNDED 2026-08-14 — dt is in [1/60, 1/40] and 1/60
  stands.** `work/verify/hairdt.mjs` sweeps dt across both hair parts on the
  argument that one shared physical quantity (the capture machine's frame
  period) cannot fit two independent scenes by accident.

  The first two runs reported disagreement, and both times the fault was the
  probe's verdict rule rather than the data:

  1. Scoring each dt by its WORST time across the part let the noisiest sample
     decide. krediili's t=11s peaks at r=0.55 — at that score the residual is
     dominated by something that is not dt, and the peak of a nearly flat
     curve is just where the noise sat. Fixed by taking the verdict from the
     STRONGEST time and printing the weaker ones without voting them.
  2. Reporting argmax then turned a **0.0005** gap between 1/60 and 1/50 into
     "krediili 1/60, hairball 1/50". That is a claim about the fourth decimal
     of a luma correlation. A sweep like this BOUNDS a parameter; it does not
     resolve it. Fixed by reporting every dt within 0.005 of the peak and
     intersecting the two parts' sets.

  Result: both parts admit **1/60, 1/50, 1/40** and nothing slower, and
  krediili's curve is monotone decreasing across the whole sweep. Our 1/60 is
  inside the bound and is krediili's peak. Within that set the frames differ
  by less than the metric can see, so no finer answer is available from the
  capture — and none is needed.
* ~~Lighting is per-fragment; the engine's is per-vertex.~~ **FIXED
  2026-08-14.** `glShadeModel` is never called, so shading is GL_SMOOTH and
  fixed-function lights each vertex, emits a primary and a secondary colour and
  Gouraud-interpolates both — generating sphere-map coordinates per vertex as
  well. Moving both to VS gave paleksi 0.521 -> 0.709 and viherio 0.686 ->
  0.845. Worth recording WHY it survived: per-fragment lighting is strictly
  "better" and errs toward looking too clean, so nothing about the output
  looked broken.
* ~~GL_SHININESS > 128.~~ **SETTLED 2026-08-14 — the reference hardware
  CLAMPED.** 9 of the archive's 27 GLOS-bearing surfaces map above GL's
  ceiling, and the engine really does hand them to GL:
  `glMaterialf(GL_FRONT_AND_BACK, GL_SHININESS, material[+0x34])` at
  0x40c19b-0x40c1a0. Both branches of FUN_0040c060 reach that same call site
  (0x40c196) — `material[+0x69]` set takes 0x40c192 and passes the surface's
  exponent, clear takes 0x40c1d9 which pushes 1.0f and jumps in — so a
  non-specular surface RESETS the state to 1.0 rather than leaving it alone.
  By the spec, an out-of-range value is GL_INVALID_VALUE, the state is
  untouched, and the surface inherits whatever stands.

  That model was implemented in full — persistent state, draw-order carry,
  1.0 reset — and measured:

  |  | syrjakyla | hedi | turska | flu2 |
  |---|---|---|---|---|
  | clamp to 128 | 0.754 | 0.714 | 0.937 | 0.648 |
  | reject-and-carry | 0.379 | 0.453 | 0.806 | 0.620 |

  Four independent parts, all worse, by large margins. The capture is the
  source of truth, so the driver these frames were rendered on clamped into
  range instead of rejecting — which is what plenty of 2000-era GL drivers
  did with this call. Clamping is not an approximation of the behaviour, it
  IS the observed behaviour; here the OpenGL spec is the external document
  that loses to the demo. The persistent-state machinery is deleted, since
  under clamping every surface's exponent takes effect on its own.
* **pehko (0.462) and flu2 (0.648)** are the two weakest. higherbiing was one
  of them and is now **0.737** — an EMPTY BLOK (no CHAN, no IMAG, no PROJ; 3 of
  the archive's 89) was being counted as a colour texture, flipping
  HigherBeingMM surface 0 from mask 0x80 to 0x81 and so routing its RIMG from
  unit 0 GL_MODULATE to unit 1 GL_ADD. Modulating darkens the figure's cloak to
  about a fifth; adding it unscaled made it bright iridescent chrome across a
  third of the frame.

  **flu2** is diagnosed, not fixed. Geometry, camera, shard placement and the
  title overlay all match. Its shards (`Mesh059.lwo`, mask 0x80, reflection
  modulating by `NebulaMixed2.jpg`) render DARKER and more saturated than the
  capture's bright near-white metal — the same regression the mask-0x80 fix
  introduced (0.688 -> 0.639), never since recovered. So it is the mask-0x80
  MODULATE path that wants re-reading, not flu2 specifically.

  Narrowed further, and one earlier reading of mine was WRONG: by eye I called
  our overlay "too bright", but measured by region it is the opposite. Mean
  luma by region at t=4.5:

      shards  (left 380px)   ours 41.3   capture 61.3
      overlay (right 260px)  ours 11.1   capture 19.2

  The overlay region contains shard content too, so this is one defect, not
  two: the SHARDS are ~1.5x too dark and they bleed into both crops. Controls
  rule out anything global — kartonki renders at 1.07x the capture and pene at
  1.14x, i.e. slightly BRIGHTER, so nothing scene-independent is dimming us.

  Verified from the bytes and eliminated as causes:
  - The mask-0x80 dispatch is exactly as implemented. 0x42bd1e-0x42be44 does
    FUN_0042cf90(RIMG name, empty temp, 1) -> setTexCount(1) at 0x42be1a ->
    setTexture(unit 0) at 0x42be30 -> setTexGen(unit 0, SPHERE_MAP) at
    0x42be3f. It jumps to 0x42ca0f rather than 0x42ca01 purely to skip the
    shared `setTexture(0, tex)` it has already done itself.
  - `dezz` is mask **0x41** (COLR + TRAN), which has its own branch at
    0x42c8bc — one texture on unit 0, opaque. Its FUN_0042cf90 call at
    0x42c9d9 does pass a real pointer as alphaName (`PUSH ESI`) rather than
    the empty temp the 0x80 branch passes, but ESI is `LEA ESI,[EBP+0x140]`
    (0x42b99b) — the slot 2 / DIFF name — which is EMPTY for mask 0x41. So no
    alpha is loaded and drawing it opaque is right. (Worth noting for later:
    on mask 5, COLR + DIFF, that same slot is NOT empty, so the engine would
    hand the DIFF image in as the colour texture's alpha.)
  - K is correct: with a COLR block present the material takes the neutral
    grey `diffuseLevel` (1.0 here), not dezz's 0.784 surface colour, and
    main.js already does this.
  - Lights parse correctly (two distant, intensity 2.0 and 0.5,
    `AmbientIntensity 0`), fog is off (`FogType 0`), no fade is active at the
    midpoint, and both objects are single-layer.

  So the residual is the mask-0x80 lit-and-modulated path being about a third
  too dark on this scene specifically, and it is NOT the texgen, the mask
  classification, the material colour, the lights, fog or a fade. UNRESOLVED.

  Measured, so the next person starts from numbers: whole-frame mean luma is
  **29.0 for ours against 44.2 for the capture** at t=4.5 — we are at 66%.
  `NebulaMixed2.jpg` has mean luma **46.6/255 = 0.18**, and flu2 lights the
  scene with two distant lights of intensity 2.0 and 0.5 and
  `AmbientIntensity 0`. So the modulate path tops out around 2.5 x 0.18 = 0.45
  on fully-lit faces, which is roughly what we draw and visibly less than the
  capture's near-white metal. `texGen0` is correctly wired (`texGen0: mask80`),
  so the sphere map IS being sampled — the question is the combiner or the
  light path, not the texgen. Note also that fixed-function GL clamps the
  primary colour to [0,1] BEFORE the texture stage, which would make the
  result darker still, not brighter: so whatever explains the capture, it is
  not something we are failing to clamp. Its overlay
  (`dezz.lwo`, luminosity 1.0 hence unlit, COLR + TRAN) sits ~15-20px left of
  the capture's.

  Confirmed NOT flu2's cause: the transparency IMAGE is correctly never
  loaded. FUN_0042cf90 forwards (surface, &colourName, &alphaName, filterMode)
  to TextureManager::get and the alpha name is always the empty temp, so a
  SURFACE never receives a separate alpha image — only Pictures do, via
  drawPicture's explicit alpha. dezz's `LapsusDezign1_a2.jpg` is not missing
  from our render; the engine ignores it too. A TTEX changes the BLEND CLASS
  and nothing else (mode 3 + depth mode 2, material[+0x38] forced to 0); that
  arm was missing and has been added — correct per §4.5, measurably inert.

  pehko was assumed to need a real frame loop / ping-pong FBO. **That is not
  the defect.** `?fb=0` renders a feedback part as a single frame, which
  separates "the per-frame content is wrong" from "the accumulation is
  wrong" — the composite image cannot tell them apart. The single frame
  contains exactly **800** sprites, the 80 systems x pool of 10 that §11.2.2
  predicts, and they are spread over far more of the screen than the
  capture's, dimly. So the per-frame CONTENT is wrong and the accumulation is
  a red herring.

  Eliminated so far, each by reading rather than by trying:
  - The black veil is right. `FadeIn::draw(v)` mode 3 writes
    `material.transparency = v` giving GL alpha `1 - v` (§6), so
    `part[+0x20]->vf1(0.95f)` really is a 5% veil, not 95%.
  - The replay order is right: fader first, then content, matching
    0x40781b -> 0x40782b -> 0x40783e.
  - The sprite count is exactly right (800).
  - Segment length is right: `node[i].len = HairLength / NodesPerHair` =
    10/10 = 1.0, so a strand reaches 9.0 units at node 9.
  - Sprite size is right: §11.2.4's corners are P +/- U +/- V with
    |U| = sizeX/2, so a quad spans `InitialSize` = 1.6 units.
  - Particle travel is small: `InitialVelocity` 1.0 with `Friction 0.5` over
    `LifeTime 1.677` integrates to ~1.1 units, against a 9-unit hair.

  `?probe=1` then measures the geometry itself rather than inferring it from
  pixels — camera position, emitter bounding box, and the fraction of the
  frame the cloud subtends:

      emitters 80   extent 12.8 x 14.5 x 13.6   centre (1.12,-1.01,-0.53)
      camera (14.56,-4.95,-2.14)   distance 14.1   frameFraction 1.205

  I read that as "the cloud subtends 120% of the frame where the capture's is
  roughly 70%". **That was WRONG — I eyeballed the capture instead of
  measuring it.** Measured coverage at t=4.766:

  | threshold | ours | capture |
  |---|---|---|
  | >= 64 (bright core) | 6.0% | 5.9% |
  | >= 32 | 20.9% | 15.6% |
  | >= 16 (faint haze) | 40.6% | 29.5% |

  The bright structure matches almost exactly and BOTH bounding boxes span the
  frame. The entire error is a faint LOW-LEVEL FLOOR:

      ours     pure-black(<4)  7.1%   median 12   p90 49   mean 22.9
      capture  pure-black(<4) 54.8%   median  1   p90 45   mean 15.5

  Same p90, wildly different median — we spread the same energy across the
  whole frame where the capture concentrates it and leaves half of it at true
  zero. It is purely an accumulation artifact (a single frame, `?fb=0`, has
  only 0.2% of pixels >= 16) and it scales exactly with the replay window:

      0.25s -> black 48.8%, p90 31        1.00s -> black 15.9%, p90 48
      0.50s -> black 32.3%, p90 42        1.50s -> black  7.1%, p90 49

  No window satisfies both — short gets the black fraction right and the
  highlights too dim, long gets the highlights right and builds the floor — so
  this is wrong in KIND, not degree.

  The mechanism is QUANTISATION. A black quad at alpha 0.05 gives steady state
  `F = A / 0.05 = 20A` for a per-frame addition A, and our floor of ~12 is
  exactly that fixed point. The capture's floor of ~1 means the original's
  per-frame contribution to those pixels fell below half an LSB and quantised
  to ZERO in the 8-bit back buffer, never accumulating at all; ours sits just
  above the threshold and integrates up. Ruled out: MSAA — rendering with
  `antialias: false` is identical (black 7.1%, median 12, p90 49), so our
  accumulation really is 8-bit.

  Left, and now specific: why our sprites put more energy into their faint
  outer region than the original's. Prime suspect is the HALF-TEXEL INSET —
  §11.2.4 samples `(W-1)/TW` from a `+0.5/TW` origin, i.e. the engine crops
  the outermost half-texel of every tile, while we sample the full [0,1] range
  and so pull in the edge texels of a 32x32 sprite magnified to ~100px.

  Superseded below, but the measurements are sound and worth keeping. Two more
  eliminations:
  - The CAMERA IS RIGHT. Evaluating pehko.lws's camera envelopes directly at
    t=4.766 gives (14.56, -4.95, -2.14), matching the renderer's world matrix
    exactly. One camera, no ParentItem, static `ZoomFactor 2.410001`.
  - The NULL IS RIGHT and nearly still: its X channel oscillates within
    +/-0.45 over the part and all three scale channels are a flat 1.0, so the
    tuft is a near-static radial burst, which is what we draw.

  That leaves the cloud's own size. `HairLength 10` / `NodesPerHair 10` gives
  `len = 1.0` and a tip 9.0 units from the root, so with the camera 15.5 units
  away the NEAR edge of the cloud is only ~6.5 units out and projects
  enormously — a 1.6-unit sprite there subtends ~14 deg, a third of the 45 deg
  fov. The suspect is therefore the sprite scale or the strand length at this
  distance, not the frame loop, the camera or the emitter count. **That
  conclusion is superseded by the coverage measurements above: the cloud size
  is right and the defect is the accumulation floor.**
* **empt is not reproducible run-to-run** (0.838 / 0.850 / -0.013 observed) —
  its stamping draws from the shared MSVC stream, so anything that consumes a
  rand() before it shifts every stamp. Do not read small empt deltas as signal.
