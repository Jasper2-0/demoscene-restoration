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
