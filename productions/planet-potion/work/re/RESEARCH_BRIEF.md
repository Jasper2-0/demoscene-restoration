# Research brief — Warp3D constants and driver behaviour

A prompt for a research agent. Everything below is what a browser can settle and
static analysis cannot. Copy from the horizontal rule down.

---

## Task

I am reverse-engineering **Planet Potion** (Potion, 2002), an Amiga PPC/RTG 64K
intro, to re-implement it in JavaScript + WebGL2. The binary has been fully
mapped; what remains is understanding the **Warp3D** graphics API it calls, and
what the hardware and drivers of the era actually did with those calls.

Warp3D was the 3D API for Amiga graphics boards (Haage & Partner / phase5,
late 1990s–2000s). This intro uses `Warp3DPPC.library`, the WarpOS-native
build, on a CyberStorm PPC with an accelerated RTG card — most likely a
CyberVision PPC / BlizzardVision PPC (Permedia 2).

I do **not** need help reverse-engineering. I need documentation.

## Part 1 — resolve these constants (highest value)

The intro's complete render-state configuration has been recovered as raw
numbers. I need their symbolic names and meanings from the Warp3D SDK headers
(`warp3d.h` and friends), the Warp3D developer documentation, or the
ReWarp / ReWarp3DPPC sources (github.com/Sakura-IT).

**`W3D_SetState(context, state, action)`** — called with `action` 1 and 2,
which I believe are `W3D_ENABLE` / `W3D_DISABLE`; please confirm. The `state`
argument takes these eight values, all powers of two, so presumably a flag enum:

| value | hex | name? | what it controls? |
|---|---|---|---|
| 4 | 0x0004 | | |
| 256 | 0x0100 | | |
| 512 | 0x0200 | | |
| 1024 | 0x0400 | | |
| 2048 | 0x0800 | | |
| 4096 | 0x1000 | | |
| 8192 | 0x2000 | | |
| 16384 | 0x4000 | | |

For context on which matter most: the intro **enables** 256, 512, 1024, 8192
and **disables** 4, 2048, 4096, 16384 at context creation, then toggles 2048 and
4096 inside its per-frame render loop and 16384 around two specific scenes.

**Other calls, with their literal arguments:**

| call | arguments used | need |
|---|---|---|
| `W3D_SetBlendMode(ctx, srcfunc, dstfunc)` | `srcfunc=7`, `dstfunc=8` | which `W3D_SRC_*` / `W3D_DST_*` these name |
| `W3D_SetZCompareMode(ctx, mode)` | `mode=3` | which comparison function |
| `W3D_SetFogParams(ctx, fog, fogmode)` | `fogmode=1`, fog struct `{density=0.0, start=0.0, end=1.0, colour=black}` | which fog mode; and the `W3D_Fog` struct layout, to confirm my field order |
| `W3D_Hint(ctx, hint, value)` | `hint=0x0a`, `value=1` | which hint |
| `W3D_SetFilter(ctx, tex, min, mag)` | (values not yet extracted) | the `W3D_TEXFILTER_*` enum |
| `W3D_AllocTexObj(ctx, err, tags)` | tags `0x80201000`–`0x80201003`, one carrying **format 6** | the `W3D_ATO_*` tag ids, and which pixel format 6 is |

The tag base appears to be `W3D_TAG_BASE = TAG_USER + 0x200000 = 0x80200000`;
please confirm and give the `W3D_ATO_*` and `W3D_CC_*` tag lists. Context
creation uses `W3D_CC_*` tags 0, 1, 2, 6 and 7.

Also useful: the **full LVO table** for `warp3d.library`, i.e. the ordered list
of functions from −30 downward. I have derived one from ReWarp3DPPC's
`VecTable68K[]`; an independent source would let me cross-check it.

## Part 2 — driver and hardware behaviour (harder, lower confidence expected)

These decide whether a port *looks* right, and they are the questions
documentation often does not answer. Please distinguish clearly between
documented behaviour and community report.

1. **Texture filtering.** What did `W3D_SetFilter` actually do on Permedia 2
   under Warp3D? Was bilinear real or approximated? Any mipmap policy?
2. **Fog.** Is Warp3D's fog per-vertex or per-pixel, and what curve does each
   fog mode use? With `start=0.0, end=1.0`, is that a normalised depth range?
3. **Blending.** Did Permedia 2 clamp or wrap on overflow? Were all
   src/dst factor combinations actually supported, or silently substituted?
4. **Rasterisation.** Fill rules, edge tie-breaking, subpixel precision for
   `W3D_DrawTriFan`. Anything known about how Warp3D drivers handled the
   top-left rule or lack of one.
5. **`W3D_ReadZPixel`.** What did it return — a normalised float, a raw depth
   value, a driver-specific encoding? Was it a synchronous stall?
6. **Pixel format 6** — its byte layout and whether the hardware converted or
   dithered on upload.

## Part 3 — provenance leads (nice to have)

- Any surviving Warp3D SDK, developer docs, or `warp3d.h` that can be cited by
  URL.
- Anything written by the authors of Planet Potion — *mavey*, *nelson*,
  *skipp604*, *rem*, *diamond* of **Potion** — about how it was made.
- The intro's pouët page is https://www.pouet.net/prod.php?which=5633; comments
  there may describe how it looked on real hardware, which is evidence about
  the driver even when it is only anecdote.

## What to return

A single markdown document with:

1. **A filled-in constant table** for Part 1 — value, symbolic name, meaning,
   and a citation for each. This is the part I most need.
2. **Answers to Part 2**, each explicitly labelled `documented`, `inferred` or
   `unknown`. I would much rather have "unknown" than a plausible guess.
3. **Sources**, as URLs, with a note on how authoritative each is (official SDK
   vs. reimplementation source vs. forum post).
4. **Anything you found that contradicts the above** — for instance if the state
   flag values do not match a power-of-two enum, that tells me my extraction is
   wrong and I want to know.

Do not speculate to fill gaps. An honest gap is directly useful to me: it tells
me which behaviours I have to settle by capturing the original running on real
hardware instead.
