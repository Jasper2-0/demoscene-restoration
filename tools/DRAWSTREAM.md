# The draw-stream contract

A **draw stream** is what one side of a restoration submitted to its graphics API for
one frame: the primitives, in submission order, each with the state in force when it
was submitted. Two sides that agree on their draw streams agree about the demo,
whatever the pixels do afterwards.

This file is the seam. Recorders write it; comparison tools read it and nothing else.
It is the same shape of contract as `tools/inspect/ADAPTER.md`: a production-agnostic
core with one adapter per thing that needs adapting — there, a production; here, an
API.

## Why a contract rather than one tool

Because there is more than one API and there always will be. This repo already needs
OpenGL 1.1 (ptct, wonder, energia, lapsus), Direct3D 7 (lost vegas) and Direct3D 8
(sonnet). A single recorder that "handles all of them" would have to translate them
into each other, and §"Never translate" below is why that is the wrong move.

    ORIGINAL                                    PORT
    opengl32.dll   → apitrace / +opengl  ─┐  ┌─ MiniGL.prototype      wrap
    d3d8.dll       → the emulator's fake ─┼──┼─ MiniD3D8.prototype    wrap
    ddraw / d3d7   → (not yet)           ─┘  └─ MiniD3D7.prototype    wrap
                                  │              │
                                  └── draws.jsonl ┘
                                          │
                          compare · digest · pipeline-diff

## The record

One JSON object per line. One line per frame.

```jsonc
{
  "api":   { "name": "d3d8", "version": 8 },
  "side":  "original" | "port",
  "source": "…how this was recorded, in one line…",
  "at":    { "position": "0x151f", "scene": 4, "songMs": 224266.3 },
  "frame": 0,
  "draws": [
    {
      "i": 0,                            // index within the frame — the identity
      "prim": "TRIANGLEFAN",             // NAMED, never numeric — see below
      "vertexCount": 4,
      "stride": 44,
      "verts": "…base64…",               // optional; `vertsDigest` always present
      "vertsDigest": "sha256:…",
      "indices": "…base64…",             // DrawIndexedPrimitiveUP only
      "textures": { "0": 3, "1": 0 },    // per stage, identity not pointer
      "xform":  { "world": [...], "view": [...], "proj": [...] },
      "state":  { "…": "…" }             // the API's OWN state, verbatim
    }
  ]
}
```

`at` is what makes two recordings comparable. A stream without it can only be diffed
against another recording of the same run.

## Rules

Each of these is here because breaking it already cost this repo something.

### Record at the API the port reimplements, never the transport beneath it

`tools/record-minigl-draws.mjs` states the case: wrapping the WebGL2 context would
report a difference on every frame and mean nothing, because the original submits
immediate-mode primitives while MiniGL batches them into `drawElements`. The two sides
are not supposed to agree there. They agree at the fixed-function API itself, which is
the thing the port reimplements — so wrap `MiniGL.prototype`, not the context.

The same reasoning picks the level on the original's side. For sonnet that is D3D8,
because D3D8 is what `minid3d8.js` reimplements — not the GL that Wine's wined3d would
translate it into.

### Never translate between APIs

Do not map `D3DRS_SRCBLEND` onto `glBlendFunc` so that one comparator can read both.
A translation is code, code has bugs, and a bug in a translation layer arrives looking
exactly like a finding about the port. Keep each API's state in its own vocabulary and
compare like with like. `api` exists so the comparator can *refuse* the mismatch rather
than paper over it.

### Pair by submission ORDER, never by count

From `tools/winebox/compare-draws.mjs`: with three clips live, two different effects
both submitted 4719 vertices. Pairing on that cost three wrong fixes and a −0.14
regression. A vertex count is not an identity. The Nth draw is the Nth draw.

### Names, not numbers

Emit `"TRIANGLEFAN"`, not `6`. The two sides reach the same primitive through different
constants — `minid3d8.js` exports `D3DPT_TRIANGLEFAN = 6`, the emulator sees the raw
argument — and a diff that reports `6 vs "TRIANGLEFAN"` has failed for a reason that
has nothing to do with either renderer. The same goes for texture identity: a
`WebGLTexture` stringifies to `[object WebGLTexture]` for every one of them, so number
them in creation order, which is how the original's handles come out too.

### Observe state, never reconstruct it

`tools/winebox/draw-state.mjs` rebuilt per-unit GL state by replaying a text log and
got it wrong on **40 of 44 draws** — because that means reimplementing the API's own
selector semantics (`glEnable` applies to the active unit, `glClientActiveTexture` is a
different selector, texture matrices need both). `exe-draw-state.sh` replaced it by
asking a real driver.

So: record state where it is already known. In the port, the shim holds it. In the
emulator, the fake device *is* the state machine the original talks to. Never
post-process a log into state.

### A recorder needs a positive control

An empty recording and a perfect match are the same JSON. Any tool built on this
contract must be able to show a difference it *should* find — the standard control is
to diff two deliberately different positions and require a large result. `rate_scope`
reported nine scenes "identical" while comparing blank frames, which was both plausible
and the answer being hoped for; only a control caught it.

## Recorders

| side | api | tool |
|---|---|---|
| port | gl | `tools/record-minigl-draws.mjs` |
| port | d3d8 | `tools/record-minid3d8-draws.mjs` |
| original | gl | `tools/winebox/record-apitrace.sh` + `parse-gl-trace.mjs` |
| original | d3d8 | `productions/sonnet/work/re/oracle/targets/drawstream.py` |

The original's d3d8 recorder is the emulator rather than winebox, and the reason is
specific to sonnet: `oracle-at.sh` addresses an instant by holding
`QueryPerformanceCounter`, which works because QPC is a DLL call. Sonnet's clock is
MiniFMOD's own time table, statically linked into a 65,536-byte binary with nothing to
hook — and its geometry goes through `DrawPrimitiveUP`, whose vertex data is behind a
pointer that a text log prints as a number. Under emulation both problems disappear:
the pointer is readable memory and the clock is a hook.
