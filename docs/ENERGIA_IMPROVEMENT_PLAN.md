# Improving Energia across the board

> **Status: PARKED 2026-08-20.** Researched and written, then set aside to finish
> Wonder. Nothing in it has been executed. Phase 0 (the capture survey) IS complete
> and its result is recorded below — that work does not need repeating.

## Context

`productions/energia` is at `status.web: "engineering"` with the worst score in the
repo. Its only sweep (2026-08-15, tag `unaligned`) reports:

```
medianR 0.1419   medianRMSE 77.45   353 samples   21 parts   0 glError
below 0.55: 21 of 21
```

**The port is not the obvious suspect.** `work/re/EFFECT_STATUS.md` states that "all
currently identified Energia procedural layers now have executable-derived
implementations" — 13 effects in `web/js/effects/`, each traced to an address — and
that "no row is reference-signed-off yet" because "reference-difference review and
EXP camera/material signoff remain open."

So the bottleneck is the **measurement instrument**, and the capture note says so
outright: alignment was *attempted and abandoned*, `alignmentOffsetMs` is `null`, and
"the first sweep therefore runs UNALIGNED … and its absolute numbers are NOT a
fidelity claim." Five probes scanned −5…+4 s and produced argmaxes disagreeing by
2.6 s (−3.3, −2.2, −4.8, −4.8, −2.2), a best mean correlation of 0.4298, and one
probe negatively correlated at *every* offset.

That is a deadlock the note names precisely: **"Alignment is only resolvable where
the picture already broadly matches, and it does not here."** Breaking it needs a
signal that does not depend on the rendering being right.

This is the same shape as the win on Wonder yesterday, where a capture offset had
been measured from the six *best-matching* samples — the six whose phase scans are
flat and therefore blindest to an offset — and correcting it was worth +0.113 median.
Energia's version is worse: there, the picture matched well enough to scan; here it
does not.

**Goal:** an instrument whose numbers mean something, then a scored improvement
against it. Success criteria are set at the Phase 5 checkpoint, not now — see
*Success criteria* below for why, and for the provisional bar.

---

## Phase 0 — Capture survey (COMPLETE, done during planning)

You asked whether a better capture exists. It does not.

| video | uploader | duration | best video | fps | verdict |
|---|---|--:|---|--:|---|
| **JJ3TVjBjat4** | Annikras | 255 s | 1440×1080 | 30 | **current — keep** |
| J6SM8MZ0pho | DemosceneVids | 258 s | 1440×1080 | **60** | renders the demo *with bugs* (watched, 2026-08-15) |
| xd5vc7Irtts | elaq23net | 256 s | 854×478 | 25 | worse in every dimension |
| 5MT61NDHuQE | AssemblyTV | 15 s | — | — | stub, not the demo |

Demozoo (prod 9842) and Pouët (prod 3290) each list only `JJ3TVjBjat4`. The retro-PC
channel that produced Wonder's good 2160p60 capture has Pulse, Zilog, Wonder, Mosaik
— **no Energia**. The Assembly 2001 official playlist has only the 15 s stub.

So the 30 fps limit is irreducible, and with it the 0–33 ms frame phase.

**This also kills a hypothesis before it costs anything.** The capture note observes
that the MP3 is 261.459 s against a 255.068 s capture and wonders whether "a fixed
offset may not be the right model at all". The arithmetic is tempting —
261.459 − 255.068 = 6.391 s, and the abandoned probe argmaxes all sat negative near
the −5 s scan edge. But **three independent captures are 255, 256 and 258 s**. They
cannot all be missing the same 6 s of opening. The demo simply ends around 256 s
while the music runs to 261.5 s. The duration gap says nothing about a start offset,
and `ENERGIA_SHOW_END = 290` is beyond what any capture can verify.

**Optional, not planned:** `J6SM8MZ0pho` is 60 fps and buggy. If its bugs turn out to
be confined to a few effects, it could serve as a higher-rate reference for the parts
where it agrees with `JJ3TVjBjat4`. Worth remembering; not worth building until the
30 fps instrument is trusted.

---

## Phase 1 — Make the page run the code that is tested

**The page is running a stale runtime.** Five vendored files under
`productions/energia/web/js/shared/` have diverged from `shared/sunflower/js/`:

| file | divergence |
|---|---|
| `timeline.js` | **pre-options version** — `constructor(clips = [])`, `active()` is a flat `time >= start && time < end`. Every per-clip `inclusiveStart`/`inclusiveEnd` flag in `show-data.js` is ignored, as is `float32Time`. |
| `scene.js` | envelope key selection differs (`frame >= keys[last].time` vs `>`, `<=` vs `<`) and lacks `lastTimeBias` |
| `envelope.js` | lacks `Math.fround` on times and payloads (the native loaders scan into 32-bit floats) |
| `exp-renderer.js` | `wonderEnvironmentTexcoords` lacks the `scale` parameter |
| `mesh-geometry.js` | lacks `buildWonderVertexNormals` and the newer helpers |

`git log` shows the vendored copies were last touched in Energia's initial
`engineering build` commit and never again, while `shared/` moved twice. This is
**accidental drift, not a deliberate pin** — and `tools/sync-shared-runtime.mjs`
already lists `productions/energia/web/js/shared` as a target.

Four of the five differences affect EXP scene rendering (`kurwa2_.exp`, `kurwa.exp`,
`scene6.EXP`, `freak.exp`), which is four of Energia's 21 parts.

Steps:

- `node tools/sync-shared-runtime.mjs`, then confirm only Energia's tree changed.
- Sweep before and after under distinct tags. **The delta is evidence, not just
  hygiene**: a runtime change that moves scene parts and nothing else is expected; a
  change that moves procedural parts means something else is coupled.
- Diagnosing a port whose shipped runtime differs from the tested runtime is not
  possible, so this precedes every measurement below.

---

## Phase 2 — Settle the interval semantics, and with it the red test

`test:shared` has one failure, and it is Energia's:

```
not ok 34 - recovered master schedules retain compiled intervals and overlaps
  Expected: ['early_renderer_411e10_410470', 'effect_40f070_opening', …]
  Actual:   []
```

Three sources contradict each other about the same address:

- `web/js/show-data.js` sets `inclusiveStart: false` on all 17 phase clips, commented
  *"Every paired x87 comparison in master frame 0x40eb50 rejects equality."*
- `work/re/TIMELINE.md` documents the same gates as `44 <= t < 82` and
  `132 <= t < 157` — **inclusive start**.
- The test asserts inclusive start, and its own comment claims it was "re-derived
  from the compiled gate table in TIMELINE.md … the DATA is the authority here and
  the test was the drift." That claim is false: the data says the opposite, which is
  exactly why `active(0)` returns `[]`.
- The **page** does inclusive start regardless, because its stale `timeline.js`
  ignores the flags (Phase 1).

One read of `work/re/disasm.asm` around `0x40eb50` settles all four. Look for the
paired `FCOM`/`FCOMP` + `FNSTSW`/`TEST AH` sequences on each gate and record whether
equality is accepted at the start, the end, both, or neither.

Then make the three agree: correct whichever of `show-data.js` and `TIMELINE.md` is
wrong, fix the test's expectations *and its comment*, and delete the false claim
about which source was authoritative.

**Do not expect this to move the score.** No sweep sample lands on a gate boundary —
there are zero samples at `local === 0`. This is a correctness and consistency fix
that removes a standing red test and a wrong claim about the binary. Its value is
that the schedule is currently described three incompatible ways, and every later
phase reasons about which clips are live.

---

## Phase 3 — Measure the alignment from AUDIO

The deadlock is that alignment needs a matching picture. **Audio does not care what
is on screen.**

Both halves are already on disk:

- the capture carries an Opus audio stream (`ffprobe` confirms stream 1)
- `work/src/RinneRadio-Helsinki_[Crankshaft.mix].mp3` is the released soundtrack, and
  `web/assets/energia.mp3` ships with the port (261.459 s)

Steps:

- Decode both to mono PCM at a common rate (`ffmpeg -f s16le`), take the envelope
  (rectify + low-pass, or an onset/energy curve — robust to Opus/MP3 codec
  differences in a way raw samples are not), and cross-correlate.
- **Do it in several independent windows** across the show, not once. That is the
  step that distinguishes the two competing models the capture note could not choose
  between: a constant lag means a fixed offset; a lag that grows linearly means a
  rate mismatch and a fixed offset is the wrong model entirely.
- A correct result should show a **sharp, unambiguous peak**, unlike the flat 0.4298
  the picture-based probes produced. If it does not, say so and stop — a weak audio
  peak means the capture's audio is not the same master, which is itself a finding.
- Cross-check against the other two captures' audio. Three recordings of one
  soundtrack should agree about where the music starts relative to the video.

Adopting the result:

- **Fixed offset:** set `captures[0].alignmentOffsetMs` in `prod.json`. `main.js:292`
  already reads it — no code change (deliberately, per its comment).
- **Rate mismatch:** needs a linear map, a real change at `main.js:288–300` and a new
  `prod.json` field. Do not fake it with an offset.

Fallback if audio fails: detect hard cuts in the capture (frame-to-frame luma
discontinuity) and match them to the gate boundaries in `TIMELINE.md` — 56, 82, 122,
132, 136, 157, 182, 233. Cut *timing* survives rendering errors that cut *content*
does not.

---

## Phase 4 — Layer isolation

Energia's adapter has **no `?only=`**, while the recorded `active` lists routinely
carry 4–6 simultaneous clips — e.g. `texture_D2_3` renders alongside
`early_renderer_411e10_410470`, `effect_40f070_opening`, `opening_dots_40c6f0` and
`opening_logo_412750`.

Per the standing rule for these overlapping-effect productions, a bad frame cannot be
attributed to a part without isolating the layers. On Wonder this was what proved
`effect_40dab0`'s entire error belonged to `woah3.exp` underneath it.

Port Wonder's implementation directly — `productions/wonder/web/js/main.js:64`
(parse `?only=`, comma-splittable, repeatable) and `:255` (filter `activeClips`) — into
Energia's `renderAt`. Same parameter name, so `tools/inspect/` usage transfers
unchanged.

---

## Phase 5 — Re-baseline, triage, and SET THE TARGET

- `node tools/inspect/sweep.mjs energia --tag=aligned`, compared against
  `run-unaligned.json`.
- Per-part table with `tools/inspect/compare.mjs`'s `classify()` verdict
  (level / structure / ok) for each of the 21 parts.
- `productions/wonder/work/tools/frame-contrast.mjs` (written yesterday) prints each
  frame's standard deviation next to its r — it separates "we draw the wrong thing"
  from "there is almost nothing to draw". Generalise it to take a production argument
  rather than copying it.
- **Set the numeric goal here**, from what the re-baseline shows is reachable, and
  record it in the plan and in `prod.json`.

---

## Phase 6 — The level deficit

The port renders **darker than the reference in 17 of 21 parts**, and brighter in
four:

| ratio ours/ref | parts |
|---|---|
| 0.23–0.35 | `compositor_mode_4`, `scene6_scene`, `transition_wave_dot`, `effect_40f070`, `kurwa_scene`, `overlay_413050`, `texture_D2_2` |
| 0.36–0.59 | `texture_D2_3`, `early_renderer_411e10_410470`, `opening_dots_40c6f0`, `opening_logo_412750`, `main_effect_mode_3_overlay`, `texture_D4_4`, `effect_40f070_opening`, `texture_D4_1`, `main_effect_410f90`, `kurwa2_scene` |
| 1.15–1.43 | `compositor_mode_2`, `freak_scene`, `late_effect_pair_410f90_410470`, `effect_40f570` |

A consistent 0.3–0.5× across most of a show is not what misalignment alone looks
like. But **this phase runs after Phase 3, deliberately**: comparing against
systematically wrong frames can manufacture a level error where there is none, and on
Wonder a confident "the port renders too dark" story turned out to be *geometry* seen
through additive blending, where luma is essentially a triangle count.

Once aligned, with isolation available (Phase 4):

- Re-measure the ratios. Whatever survives is real.
- The four *brighter* parts are the lever, as they were on Wonder: a global exposure,
  gamma or transfer-function error cannot make some parts brighter and others darker.
  Whatever is left has to explain both signs.
- Check the comparison chain itself for a colour-transfer mismatch — `grayOf()` in
  `tools/inspect/compare.mjs` runs `format=gray` on both sides, so any difference has
  to come from the capture's own encoding, not the tooling.

---

## Phase 7 — Oracle repair (timeboxed, non-blocking)

Energia ships `work/src/Energia_FIXED.exe` and `bass.dll`, and `tools/winebox/bassstub`
already exists — so Energia has a working oracle path *in principle*. The winebox is
currently broken for both productions: the stub attaches and patches QPC, then Wine
dies with `Unhandled illegal instruction at 7BC5C165` before a single GL call, at
every order tried.

- **One diagnostic first:** run something trivial in the same image (`wine notepad`).
  If it faults at the same address the fault is environmental and the reconstructed
  demo directory is exonerated; if it runs, the problem is in what gets mounted.
- Note for whoever runs it: `work/unpacked/` holds only the archive's contents. The
  executable lives in `work/src/`, so the mounted demo directory must combine both —
  this cost an hour on Wonder.
- **Timeboxed and non-blocking.** Nothing above depends on it. If it comes back, it
  settles geometry-vs-shading questions far faster than pixel correlation can.

---

## Verification

1. **Red test cleared**: `npm run test:shared` reaches **63 pass / 0 fail**. It is
   62/1 today and that one failure is Energia's, so this is a real gate, not a report.
2. **Runtime parity**: no file under `productions/energia/web/js/shared/` differs from
   its `shared/sunflower/js/` counterpart.
3. **Alignment defensible**: either `alignmentOffsetMs` (or a rate model) is set with
   a recorded sharp cross-correlation peak reproducible in several windows, **or**
   `prod.json` records why audio alignment failed. Adopting a weak argmax is the
   failure mode this plan exists to avoid.
4. **Isolation works**: `?only=<clip>` renders exactly that clip; `?only=` with two
   ids renders both. Prove it by isolating a part whose `active` list has 5 entries.
5. **Score**: `node tools/inspect/sweep.mjs energia --tag=final` beats the target set
   in Phase 5, with the per-part table showing which parts moved and why.
6. **No regression elsewhere**: `./scripts/build-wonder.sh` still exits 0 and Wonder's
   sweep still reports medianR 0.7741 with no part below 0.55 — Phase 1 touches
   `shared/sunflower/js`'s consumers, and Wonder is one.
7. **Nothing published**: `status.web` stays `engineering`.

## Success criteria

Deliberately **not** a number chosen today. The instrument is a 30 fps capture with an
unresolved time base that ends at ~256 s against a 290 s show; committing to a target
against it now risks optimising toward a mis-scaled reference. Phase 5 sets the target
once the numbers mean something.

Provisional bar, to be confirmed or revised at that checkpoint: **medianR ≥ 0.55 with
no part below 0.35**, over the capture's covered range only. Samples past ~255 s are
excluded from any claim — no capture covers them.

## Notes and loose ends

- `ENERGIA_SHOW_END = 290` is unverifiable: every capture stops near 256 s. Either the
  executable's timeline runs past the visible end, or 290 is wrong. Worth resolving
  from `0x40eb50`'s gate table while Phase 2 is already reading it.
- `late_effect_pair_410f90_410470` and `effect_40f570` report **identical** statistics
  (both 0.067, both luma 73.5/51.3). They share the interval 233–290 exactly, so the
  sweep scores one composited frame and attributes it to both. Same artefact as
  Wonder's three "duplicate" pairs — real distinct parts, double-counted samples.
  Document it; do not change the instrument mid-investigation.
- The capture note records the soundtrack "still needs waveform alignment to the
  original 261.459 s MP3". Phase 3 does exactly that, so update the note rather than
  leaving the open item duplicated.
- `prod.json` has `pagesRepo: null` — unlike Wonder's `wonder-webgl`. Not needed while
  `status.web` is `engineering`, but it is what publishing would require.
