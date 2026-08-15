# The inspector adapter contract

`tools/inspect/` is deliberately production-agnostic. It knows how to sweep a
timeline against a reference capture, rank what it finds, and draw an
inspector; it knows nothing about any particular demo. Everything specific
lives behind one object the production's page exposes as `window.__demo` when
loaded with `?inspect=1`.

Adding a production to the tooling means implementing this and nothing else.

```js
window.__demo = {
  id: 'lapsus',

  /** Parts in show order. `captureStart` is where the part begins in the
   *  reference video, which is the only thing the tools need in order to line
   *  our frames up against it. */
  schedule() -> [{ name, phase, start, dur, captureStart }],

  /** One entry per instant to compare. The production decides what is worth
   *  sampling — skipping fade ramps, say, where a frame is mostly veil and
   *  scoring it measures the fade table rather than the renderer. */
  plan(stepSeconds) -> [{ part, phase, local, captureTime }],

  /** Draw exactly that sample, deterministically. Must NOT depend on previous
   *  calls: a sweep has to be reproducible and is free to sample out of order.
   *  Returns whatever the production knows about the frame (see below). */
  async render({ part, local }) -> info | null,

  /** What is on screen right now — the inspector's resource panel. */
  state() -> object | null,
};
```

## `render()`'s return value, and `state()`

Both return a free-form object. The tools display whatever is there and only
special-case a few conventional keys, so a production can report as much or as
little as it can cheaply know:

| key | meaning |
|---|---|
| `objects` | count of drawn objects |
| `triangles` | triangles submitted |
| `texturedGroups` | draw groups that bound a texture |
| `camera` | which camera is live |
| `glError` | non-zero is always an issue, whatever the pixels say |

Anything else is shown as-is. Lapsus adds `hairLines`, `particleCount`, `zoom`,
`fovXdeg` and `near`, which is exactly the sort of thing that makes a bad frame
diagnosable without opening a debugger.

## Two clocks

The one genuinely awkward thing a real demo does is run more than one clock.
Lapsus has two MP3s with a load between them, so part-local time and capture
time are related by a per-phase offset rather than a single constant. That is
why a plan entry carries BOTH `local` (what to render) and `captureTime` (what
to compare against) instead of one timestamp: a production with a single clock
just returns `captureTime = offset + local`, and the tools never learn the
difference.

## Where the reference comes from

`prod.json` — `captures[0].path` and `captures[0].trackOffsetsMs`. The tools
read the capture; the adapter owns the offsets, because only the production
knows which track a part belongs to.

A production may also carry `captures[0].visualTrackOffsetsMs`. When an engine
starts its audio and its frame clock at measurably different instants, the two
cannot share one origin: the audio offset is what an amplitude-envelope
correlation measures, and the visual offset is where the *pictures* line up.
Lapsus splits by 40ms in phase 2 because the binary resets its QPC timer only
after the synchronous `FSOUND_PlaySound` returns. Anything comparing frames
takes `visualTrackOffsetsMs ?? trackOffsetsMs`; anything measuring or aligning
audio keeps reading `trackOffsetsMs`, or it would re-measure its own output.

## What the SECOND implementation taught us

Wonder (`productions/wonder/web/js/main.js`, `?inspect=1`) is the contract's
second implementer, and it was chosen precisely because it is not shaped like
Lapsus. It needed **no changes to any tool** — which is the result this contract
was hoping for — but it did expose three things the first implementer had hidden.

**1. "Part" is not always exclusive.** Lapsus parts own the screen one at a
time. Wonder's manager (0x410bf0) runs a LAYERED timeline where several effects
are live at once: a sample at t=37.5s has four clips active. So a per-part score
means "the whole frame while this part was active", and a low score indicts the
frame rather than that part alone. Adapters for layered productions should
expose the full active set in `state()` so the inspector can show what actually
contributed. Do not assume a part is a scene.

**2. `plan()` is boilerplate and should not be.** Both adapters implement the
same sampler — inset from the ends, at least five samples per part however
short. Five is a correctness property, not taste: three cannot show a spread,
and a coarse grid over an uneven part reports the good half and hides the
defect. Because it is copied, it can drift between productions and silently
make two ports incomparable. It belongs in the sweep, defaulted from
`schedule()`, with `plan()` becoming an optional override for productions with a
genuinely irregular timeline.

**3. Capture phase is universal, and both ports found it independently.** Lapsus
needed `visualTrackOffsetsMs` because its QPC timer resets after
`FSOUND_PlaySound`. Wonder's `work/reference/README.md` documents the same class
of split from the other direction: `FSOUND_SetMixAhead(30)` plus visuals driven
from `FMUSIC_GetOrder` make the picture lead audible output by ~30ms, and its
30fps capture adds 0-33ms of frame phase on top. Only the engine's 30ms belongs
in playback; the rest is a comparison-only quantity. **Two independent engines,
the same distinction** — it should be a first-class `prod.json` field rather
than something each production discovers for itself.

Note also that a production may deliberately not retain its capture (Wonder's
is fetched on demand and is explicitly "not a pixel-exact oracle" — 30fps,
recompressed, resolution-converted). `sweep.mjs` fails clean in that case and
names the fetch command, which is the right behaviour: the adapter is still
worth implementing, because the inspector, the schedule and the asset map do
not need a reference.

## Readiness

Set **`window.__demoReady = true`** after `window.__demo` is assigned and the
page can accept `render()` calls. Assign the adapter LAST, so that a harness
waiting on either signal cannot race a half-built object.

This was unspecified until Wonder became the second implementer, and the cost is
worth recording. `sweep.mjs` waited on `window.__lapsusReady` — the first
implementer's PRIVATE flag name — so Wonder, which set `__wonderReady`, never
satisfied it. The wait had a 600s timeout but CDP's own `protocolTimeout` fires
at 180s, so the failure surfaced as `Runtime.callFunctionOn timed out` from deep
inside puppeteer, naming neither the production nor the missing flag. The sweep
now waits on `__demoReady === true || !!window.__demo` and contains no
production name at all.

## Optional: `positionAt(showTime)` — a musical coordinate

Return a SHORT LABEL for where `showTime` sits in the music, or `null`. The
inspector prints it beside the sample and knows nothing about what it means, so
a production can return whatever coordinate it actually thinks in.

Show time is monotonic but says nothing about musical position, and for engines
that drive visuals from the music the two are not interchangeable. Wonder's
executable reads `FMUSIC_GetOrder`, so its own coordinate is the XM ORDER, and
`mystified.env` maps order boundaries to seconds — `positionAt` returns
`"order 11"`. A production with no musical structure omits the method.

## Layered timelines

A "part" is not always exclusive. If several parts can be live at once, the
inspector needs to say so, and it derives that from `schedule()` alone — any
part whose `[captureStart, captureStart + dur)` contains the cursor. No adapter
work is required, but two things follow that are worth knowing when reading a
sweep of a layered production:

- **A per-part score indicts the FRAME, not the part.** The sample is filed
  under one part; the picture is everything live at that instant. The inspector
  now lists the others as "also live".
- **Parts must be drawn in LANES.** Packed into one row they paint over each
  other and only the last drawn survives. The inspector greedily first-fits by
  start time, which degenerates to a single lane exactly when parts never
  overlap, so exclusive productions are unaffected.

Related: the sweep now sorts every sample by capture time before drawing.
`plan()` is built part-by-part, and a layered production's parts are not in
start order — Wonder's clip table begins at 0s, jumps to 9.862s, then back to
0s — so the score trace zigzagged across the canvas and "next sample" jumped
around the show. Sorting is correct for exclusive timelines too, where it is
already the order.

## The one-instant tools

Four tools sit beside the sweep and go through the same adapter, so a spot check
and a sweep sample are the same frame:

```
node tools/inspect/score1.mjs   <prod> <part> <local> [k=v ...]   how close
node tools/inspect/frame.mjs    <prod> <part> <local> [k=v ...]   what differs
node tools/inspect/channels.mjs <prod> <part> <local> [--box=…]   colour/cast
node tools/inspect/phase.mjs    <prod> <part> <local> [span step] wrong time?
```

They were written per-production first, with the schedule compiled in, and that
cost more than duplication: the lapsus copies extracted their reference frame at
full resolution and scaled during comparison, while the sweep scaled at
extraction. The two renditions differ by 0.24 mean luma and correlate at
0.999957 — enough to move a score by ~1e-4, so a tool and the gate never quite
agreed about what "the reference at time T" was. Sharing `demo.mjs` and
`compare.mjs` makes them agree by construction.

`--query=` on the sweep and bare `k=v` arguments on these tools are the same
mechanism: they reach the renderer, so an authenticity path (`?quality=original`)
or a one-variable experiment can be scored rather than only eyeballed.

## `state()` must be pure

`state()` must be a function of the last `render()` argument and nothing else —
no accumulation across calls. `render()` is already required to be repeatable;
this makes the requirement checkable, because a pixel assertion only says
"different" while a `state()` assertion says *which field*.

## `prod.json` capture fields

The comparison tools read `captures[0]`. Four fields carry meaning beyond
"where the file is":

| field | why it exists |
|---|---|
| `path` | gitignored; `tools/fetch/capture.mjs <slug>` rehydrates it |
| `sha256` | pins OUR capture. A mismatch on refetch means the ground truth changed, which is a warning and not routine noise |
| `captureFps` | the capture's own frame rate. A 30fps capture of a 60fps demo carries an irreducible 0–33ms frame phase; a 60fps one does not. Record it so that ambiguity is visible rather than discovered |
| `alignmentOffsetMs` / `trackOffsetsMs` | where the port's clock sits against the capture |

**Audio alignment and VISUAL alignment are different measurements**, and both
ports that looked found the same thing from opposite directions: lapsus's engine
resets its QPC timer *after* `FSOUND_PlaySound` returns (40ms), wonder's calls
`FSOUND_SetMixAhead(30)` and drives visuals from `FMUSIC_GetOrder` (~30ms lead).
So a production may carry `visualTrackOffsetsMs` beside `trackOffsetsMs`, and
anything comparing FRAMES takes `visualTrackOffsetsMs ?? trackOffsetsMs` while
anything measuring or aligning AUDIO keeps reading `trackOffsetsMs` — otherwise
the alignment tool re-measures its own output.

**Never carry an offset across a change of capture.** When wonder's capture was
replaced with a 60fps source, its `alignmentOffsetMs` was reset to null rather
than inherited: the old 0ms pin and its 0.7634 correlation score belonged to the
superseded video and said nothing about the new one. Re-measure, or record null.
