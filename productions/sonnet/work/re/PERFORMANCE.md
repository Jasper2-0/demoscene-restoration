# Sonnet — performance plan (precalc and runtime)

Project owner's requirement: **"we need this thing to fly, both in its precalc as well as
during its run."** Two separate problems with different answers.

## 0. The rule, before anything else

**Measure first.** This project's own history is the argument: on the sibling restoration
the bottleneck was misdiagnosed **four times**, the conventionally-recommended fix
measured *worse* than the naive one, and three separate timing numbers were simply wrong
because of how they were taken. Nothing below should be implemented before it is
measured.

Measurement discipline (from `restoration-methodology`, non-negotiable):
- `gl.finish()` immediately before starting AND before stopping the clock, after warm-up.
- **A blocking GL call is charged to JS/CPU time** — a `performance.now()` bracket around
  a stalling GL call reports "CPU-bound" and sends you hunting for allocation churn that
  does not exist. Use a real sampler (CDP) for attribution.
- Assert frame content **and** `gl.getError() === 0` in the same task as the timing;
  silent buffer overruns look like spectacular speedups.

## 1. Runtime — MEASURED 2026-08-05. Verdict: it already flies.

**A live frame is 0.08–3.9 ms** against a 16.6 ms budget at 60 Hz. There is no runtime
performance problem to solve.

**The async-readback question is answered: do not build the PBO path.** The 4×4 occlusion
readback costs **~65 µs** with the pipeline drained, rising to **3.1 ms** only when it must
wait for queued GPU work (80% of a 3.9 ms frame at 0x1630; unmeasurable at 0x1a00). Worst
case it is 3.9 ms of a 16.6 ms budget, and the fidelity cost of going async is a 1–2 frame
lag in the flare's occlusion response. Not worth it.

### Read the profiler numbers correctly — they are NOT per-frame

The CDP self-time table looks alarming:

| function | ms | |
|---|---|---|
| `#stepLeaves` | 262.25 | at 0x1a00 |
| `updateRibbon` | 100–103 | |
| `mat4Euler` | 53–57 | |
| `bilinearSample` | 35.17 | |
| `readPixels` | 3.13 | |

**These are totals accumulated across the harness's `warmTo` replay, not the cost of one
frame.** `warmTo` replays the timeline from the beginning so scene state (fades, timers,
accumulated positions) is correct before a capture — for a position late in the demo that
is thousands of ticks. 97–99% of `__sonnetRender` is `warmTo`, which is why the totals are
large while live frames are sub-4 ms.

So: **`#stepLeaves` is not a runtime hot spot; it is a seek/verification cost.** It affects
(a) how long the 354-sample sweep takes (~90 s) and (b) how long a `?pos=` debug jump
takes. It does **not** affect playback. Do not "optimise" the animation steppers for the
shipped demo — and specifically do not make them take coarser timesteps during warm-up,
because leaves would then settle in different places and the warmed state would no longer
match live playback, which is the whole point of warming up.

### Remaining runtime candidates, if a problem ever appears

| candidate | why it might matter | why it might not |
|---|---|---|
| **the flare's occlusion readback** | `gl.readPixels` is a full pipeline stall; mid-frame that can be several ms of a 16.6 ms budget | it is 4×4 pixels, at most once per frame |
| **per-draw geometry upload** | the single biggest win on the sibling project (320 ms → 8 ms/frame) | the shim already uses `bufferData` orphaning, the measured-fastest strategy — do NOT "optimise" this into `bufferSubData` or a streaming arena, both measured worse |
| **terrain/particle draw volume** | N=128 terrains, 4096 snow particles | draw-call count is usually *not* the problem; measure before batching |
| **the text engine's per-glyph work** | the poem is on screen for most of the demo | small quad counts |

**The async readback question** (owner asked directly): `readPixels` → PBO + `fenceSync`,
reading the result a frame or two later, converts the stall into 16–33 ms of latency on
the flare's occlusion response. Given how slowly this demo's cameras move that is very
likely imperceptible — so it is a legitimate **remaster-path** option, gated like
everything else: `?quality=original` keeps the faithful synchronous stall (its timing is
part of the original's behaviour), the remaster path may go async.
**Structured for it now; not built until the measurement justifies it.**

## 2. Precalc / load

This is the more interesting half, because of the decision in `re/PRELOADER.md`: ship the
**generators**, not the baked assets (4 KB of bytecode versus 4.2 MB of PNG+XM). That
trades download time for generation time, and generation time is what the original's
progress-tick preloader was built to display.

Measured so far: the texgen runs a program in **0–108 ms**, so 28 textures ≈ 2 s
single-threaded. Meshes and audio synthesis are on top and unmeasured.

Options, cheapest first:
1. **Measure the real in-browser total** before optimising anything. Node timings are not
   browser timings.
2. **Web Workers** — texture programs are independent (each seeds its own PRNG; there is
   no shared stream), so they parallelise trivially. This is the obvious big win if
   generation dominates.
3. **Generate lazily by scene** — the timeline tells us exactly when each asset is first
   needed. Scene 3's textures are needed at 0x0400; scene 10's not until 0x2300, which is
   ~370 s later. We could start the demo after generating only what the first scene needs
   and continue in the background. The original could not do this (it precalculated
   everything up front) so it is a **remaster-path** behaviour, but it turns a 2 s wait
   into a near-instant start.
4. **Keep the bake as a fallback** (`?assets=baked`) for slow devices, and as the
   regression corpus that proves the in-browser generator still matches.

## 3. What the 64k build changes

Nothing about runtime cost, but note that a PAQ-class packer (Mashi) trades decompression
time for size. If the packed build takes noticeably longer to start, that is a real
tradeoff to measure — and it argues for the two-distribution plan
(`re/PRELOADER.md` §3b): a readable build and a 64k build, not one compromise.
