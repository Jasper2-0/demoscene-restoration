# Sonnet — frame-rate dependence, demo-wide

Started 2026-08-21, out of issue #46 ("8 spires in the reference, 24 in ours").
`SPIRE_REOPEN.md` has the route in; this file is the inventory and the
mechanisms, because the scope turned out not to be the spires.

Tool: `web/test/rate_scope.mjs`.

## 0. The question, and why it is decidable

`dt` comes from elapsed **music** ms (`scene7 #tickClock`:
`dt = (ms - lastMs) / (FRAME_BASE / rate)`, `rate = 30.0` from the binary's
`FUN_00402e4e`). So a scene whose state is a proper integral of `dt` **must**
render identically however many ticks that music interval was cut into.

Render the same position at two step rates, diff the pixels: identical or not.
No threshold, no judgement.

This matters beyond matching the capture. The harnesses step a fixed
`WARM_STEP`, but the **live page ticks per `requestAnimationFrame`** — so
anything that fails this check renders differently on the viewer's monitor.

## 1. The inventory — 40 samples, 30 fps vs 60 fps

| scene | samples | max | median |
|---|--:|--:|--:|
| scene 4 — beach / sunset | 5 | **68.01** | 3.81 |
| scene 5 — autumn forest | 6 | **57.26** | **16.96** |
| scene 0 — spires | 2 | 55.13 | 55.13 |
| scene 7 — winter | 5 | 23.42 | 12.02 |
| scene 8 — finale | 7 | 10.93 | 3.31 |
| scene 2 — trees/butterflies | 5 | 5.23 | 3.31 |
| scene 1 — lakes | 3 | 4.81 | 0.75 |
| scene 3 — cloud sea | 2 | 2.83 | 2.83 |
| title / poem only | 4 | **0** | 0 |
| credits | 1 | **0** | 0 |

**The floor is EXACTLY ZERO.** Title/poem and credits are bit-identical at
every sample — they are text and fades with no accumulators at all. So there is
no float-noise band to excuse anything: every non-zero number above is a
mechanism, and exact independence is achievable rather than aspirational.

For scale, the whole-demo median RMSE against the reference is **24.35**.
Beach, autumn forest and spires all meet or exceed it. **Frame rate is one of
the largest single error sources in the port.**

**Read the shape, not just the ranking.** High-max/low-median and high-median
are different diseases:

* **beach** 68.01 max but 3.81 median — episodic. Something occasionally lands
  badly. (§3: a wrap at a tick boundary.)
* **autumn 16.96 median, winter 12.02** — *every frame* is wrong. (§4: the
  shared RNG stream has drifted.)

## 2. Spires — Σ over ticks where the original integrates

`#stepSpires`, and the mechanism `SPIRE_REOPEN.md` §2026-08-21 measures:

```js
if (c.growing) rec.delay = F(rec.delay - T);   // once per TICK, T is a clock
rec.t = F(rec.t + F(T * K.SPIRE_GROW));
```

`T` accumulates `+= dt` and is rate-independent (measured: mean cluster T is
0.53 at 30, 60 and 120 alike). Subtracting it once per tick is not. Grown
count at 0x0606: **21 / 68 / 80** at 30 / 60 / 120.

## 3. Beach — the ribbon wrap keeps its overshoot

`MG.updateRibbon`:

```js
st.phase = F(st.phase + F(dt * st.phaseRate));   // dt-scaled: fine in exact arithmetic
...
if (st.phase >= 2.0) st.phase = F(st.phase - 2.0);   // fires at a TICK BOUNDARY
```

The increment is properly scaled, so this is *not* the spires' bug. But the
wrap fires when a tick happens to find `phase >= 2`, so the post-wrap value
keeps that tick's **overshoot** — and mean overshoot is half a step. Bigger
steps, higher phase.

PREDICTED from the seeding constants, then measured. `buildRibbon` seeds
`phaseRate: F(rand01() + 1.0)`, uniform in [1, 2). At 30 fps `dt = 1.0`, the
step is `0.01 * phaseRate`, so half a step is **[0.0050, 0.0100)**.

Measured at 0x141d, first six ribbons, `phase@30 − phase@60`:

| 1 | 2 | 3 | 4 | 5 | 6 |
|--:|--:|--:|--:|--:|--:|
| 0.0097 | 0.0087 | 0.0067 | 0.0050 | 0.0062 | 0.0079 |

Every value inside the predicted interval, all positive (30 fps runs ahead, as
a larger overshoot must), and the spread across ribbons explained by each one's
own `phaseRate`. The phase then feeds
`cos(freqB*phase) * sin(freqA*phase)`, which turns a 0.5 % phase error into a
visibly different strip — hence a big *max* while the median stays low.

## 4. Autumn forest — THE SHARED RNG STREAM DESYNCHRONISES

The one with consequences beyond its own scene.

`objects[8]` (sceneIdx 5) is live with `trees: 1`, **`precip: 768`**,
`cloudSky`. `#stepPrecip` has three per-tick behaviours:

```js
this.snowFrames = Math.min(16, (this.snowFrames|0) + 1);  // per TICK; gates snow deposit
...
const rz2 = F(F(F(MG.rand01() * box[2]) * 2.0) - box[2]); // respawn: THREE rand01 draws
const rx2 = F(F(F(MG.rand01() * box[0]) * 2.0) - box[0]); // (per particle that lands)
...
this.#emitDroplet(target, eye);                            // "one lens droplet per frame"
```

The respawn draws are the serious one: **how many numbers are pulled from the
shared stream depends on how many ticks happened.**

Measured — `MG.randState()` at the same position, 30 fps vs 60 fps:

| position | scene | @30 | @60 | |
|---|---|---|---|---|
| 0x0200 | title / poem | `0x0f75e8db` | `0x0f75e8db` | identical |
| 0x0606 | scene 0 spires | `0x0f75e8db` | `0x0f75e8db` | identical |
| 0x0900 | scene 1 lakes | `0x0f75e8db` | `0x0f75e8db` | identical |
| 0x0c08 | scene 2 trees | `0x0f75e8db` | `0x0f75e8db` | identical |
| 0x1000 | scene 3 cloud sea | `0x0f75e8db` | `0x0f75e8db` | identical |
| 0x1410 | scene 4 beach | `0x0f75e8db` | `0x0f75e8db` | identical |
| **0x1c0c** | **scene 5 autumn** | `0x72cbaaad` | `0xc80969c3` | **DESYNCHRONISED** |
| 0x2027 | scene 7 winter | `0x9b9947a5` | `0xf24728b0` | desynchronised |
| 0x2500 | scene 8 finale | `0xabea91c1` | `0x564f3104` | desynchronised |

**Precipitation is the ONLY per-frame RNG consumer in the demo, and scene 5 is
where it first runs.** Everything before it leaves the stream at its boot value
— `0x0f75e8db`, the same constant `generate_test` asserts warm-vs-cold. From
autumn forest onward the stream position is a function of cumulative tick
count, and every scene after it inherits that.

`precip.T` meanwhile is IDENTICAL across rates (3.7436 at 0x1c0c, 7.2165 at
0x1d13). So the clock is right and the draw *count* is wrong — which is what
makes this a diagnosis rather than an observation.

### Why this probably matters to an OPEN defect

Scene 5 is the worst part in the inspector sweep — median r **0.659**, three of
the twelve worst samples — and it has no diagnosis on file. Three sessions
hunted it as shading and geometry. It now also has the highest median
rate-sensitivity of any scene.

`SWEEP.md`'s "it was the cloud layer, not the precipitation" is not
contradicted: that was about BRIGHTNESS. For timing it is the precipitation.

## 5. Consequence: matching the capture is not achievable

`FUN_0040bfc1` is doubly integrated in the ORIGINAL, so the original was
frame-rate dependent too and looked different on different 2001 machines. There
is no single correct appearance to port to.

The 2026-08-11 fit found the capture machine's effective rate RAMPED across
scene 0 (~30 fps early, 60 late), so no constant rate matches it. §4 closes the
question: since the RNG stream position depends on **cumulative tick count
since boot**, matching the capture would require reproducing the 2001 machine's
exact frame count at every instant — not its average rate, its every frame.
That is not calibration and it cannot be done.

So the capture is an oracle for what the demo LOOKED LIKE, not a specification
of what it IS. Fitting to it would also spend the one piece of independent
evidence available for checking any rate we choose.

## 6. What follows — determinism first, correctness separately

Two different jobs, and they should not be conflated.

**Determinism — one change.** All four mechanisms depend only on the tick grid,
not on the wall clock. Pinning the simulation tick to a fixed step (30 Hz, the
binary's own `rate`, which makes `dt` exactly 1.0 per tick — the unit every
constant in here was tuned in) makes all of them a pure function of music
position. Every viewer sees the same demo whatever their monitor. The pass
criterion is decidable: **`rate_scope` must read 0.000 everywhere**, the same
exact zero title/poem already achieves.

Note the tick rate is a per-object field (`+0x0c`) that timeline event **254**
can rewrite, so a pin has to respect that rather than hard-code 30 globally.

**Correctness — three separate repairs.** Even pinned, §2's Σ-vs-∫, §3's
tick-boundary wrap and §4's per-tick draws are still wrong against the
disassembly. Each needs its own reading and its own evidence. None of it blocks
publication; determinism does.

Landing the pin will move every accumulator, so it needs a full-sweep A/B and
almost certainly a re-bless: `baseline_golden.json` was recorded at
`WARM_FPS = 60`.
