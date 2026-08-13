# minid3d8 audit — is the difference in the SHIM, not the generators?

Jasper, 2026-08-08: *"if we went through all the code for scene 2 and everything
matches, then that points as the problem being in the directx8.1 shim?"*

**The inference is sound and already evidenced.** All eight of scene 2's
generators are now verified against the disassembly
(`re/scenes/SCENE2_CLEANROOM.md`), so the data going in is right. And the one
genuine bug found this week was a **shim** bug, not a generator bug:
`minid3d8` lit vertex normals with the world matrix where D3D's fixed-function
pipeline uses its **inverse transpose** (`REVIEW_FIXES.md` §2f/§2g).

This file audits the shim behaviours the impostor bake depends on, each against
the binary. Method as elsewhere: read the original with `re/tools/xray.py`,
compare, record the verdict.

## The measurement that started it

The billboard's material tests `alphaRef = 0x80`, but every coverage figure in
the project had been measured at `alpha > 8`. Measured properly, on the live
baked RTs:

| set | size | coverage α>8 | coverage α>0x80 | alpha histogram (32-wide bins) |
|---|---|---|---|---|
| 0 (leafy, 10 passes) | 1024² | 53.9 % | **53.9 %** | 46.1 % at 0-31, 53.9 % at 224-255, **nothing between** |
| 1 (bare, 1 pass) | 1024² | 23.5 % | **23.5 %** | 76.5 % at 0-31, 23.5 % at 224-255 |

**The alpha is purely binary**, so the threshold is irrelevant and that
hypothesis is closed. The reason is the leaf material's own alpha test at
`0xF0`: only near-opaque texels ever survive to write alpha, and they write 1.0.

**53.9 % opaque is now the hard number** to compare against whatever the
original produces.

(RTs are 1024² because `RT_SCALE` follows `?texscale`, which defaults to 2 —
the impostor resolution is a remaster knob, documented in `REMASTER_WIRING.md`.)

## Audit results

| # | behaviour | binary | verdict |
|---|---|---|---|
| 1 | RT creation / pixel format | `FUN_00402b16(obj, w, h, 1)` — alpha channel requested | **matches** |
| 2 | RT set + depth surface | `FUN_00402b4f`: `EndScene` → `GetSurfaceLevel(0)` → `SetRenderTarget(surf, [0x474888])` — the SHARED depth surface, exactly as the shim passes `this.depthSurface` | **matches** |
| 3 | RT clear | same function, when its `bClear` arg is set: `Clear(0, NULL, 3, DAT_00474790, 1.0, 0)` — `TARGET\|ZBUFFER`, fog colour, Z=1 | **matches** `beginRenderTarget` |
| 4 | alpha test enable/func | `FUN_00401b45`: `ALPHATESTENABLE=1`, `ALPHAFUNC=5` (`GREATER`) | **matches** |
| 5 | alpha **reference** | looked like a real find — `FUN_00401b45` reads a GLOBAL byte `[0x474794]`, not the material. But `FUN_00401d12` copies it first: `mov al,[ebp+0x14] ; mov [0x474794],al` at 0x401d8a. The default written by `FUN_0040184c` is the shim's `alphaRefDefault`. | **matches** |
| 6 | blend factors | `SRCBLEND=5` (`SRCALPHA`), `DESTBLEND` = `ONE` when flag bit 0 is set else `INVSRCALPHA`; `ALPHABLENDENABLE=1` | **matches** |
| 7 | Z-write | binary sets `ZWRITEENABLE` explicitly in the material path; the shim delegates it to `setBlendMode` (`0 → 1`, additive/alpha → `0`). Different structure, same result for every flag combination present. | **matches** |
| 8 | Z func | `ZFUNC=8` (`ALWAYS`) under flag `0x0080`, else `4` (`LESSEQUAL`) | **matches** |

**Nothing found yet.** Eight behaviours, all equivalent.

## Two more audited, and a measurement that REFRAMES the whole thing

| # | behaviour | binary | verdict |
|---|---|---|---|
| 9 | mesh draw order in the bake | `FUN_00409d45` registers `push [ebx+0x10]` (branches) then `push [ebx+0x14]` (leaves) at 0x40a009/0x40a011; `FUN_00405f8b` walks children in registration order | **matches** the port's branches-then-leaves |
| 10 | scatter placement | `FUN_004078b6`: `2*rand01()*extent - extent`, symmetric ±extent, **z drawn before x** | **matches** `scatterC` exactly, including RNG order |

### The premise was wrong: total coverage is nearly RIGHT

Measured on the isolated island tree at 0x1210, where the billboard quad is
essentially the tree and nothing overlaps it:

| | ink fraction of the tree box |
|---|---|
| ours | **52.5 %** |
| reference | **48.8 %** |

and our baked RT is 53.9 % opaque. **The original's baked tree is within ~10 %
of ours in coverage — not 2x more compact.** Every earlier reading of "the
reference's RT is a compact tree with margins on all four sides" was inferred
from eyeballed crops; measured, it does not hold.

### What IS different: the DISTRIBUTION, not the amount

At 0x0a28 the current frames show it plainly: the reference's canopies stop
above the ground and sit on **thin visible trunks**; ours reach the ground with
thick branch shapes showing through. The bake simulator's margins said the same
thing numerically and nobody read it that way — `T85 B0`, i.e. a top margin but
**no bottom margin at all**.

Geometrically that is a DEPTH problem, not a width one. The bake camera sits at
`(0,128,-150)` looking at `(0,128,0)`; foliage at `z ≈ -115` is only 35 units
away and projects at `(53-128)/35 ≈ -2.1` in NDC — far below the frame. So the
near-side foliage smears across the bottom of the render target and buries the
trunk that should be visible there.

**The sharpened question is therefore: why does the original's baked tree have
less foliage close to the camera?** Not "why is it narrower" — the ink budget
is right, its placement in depth is not.

### CORRECTION (same session): the "near foliage spills below the frame"
### explanation is WRONG, and what replaces it is stronger

Projecting every tree vertex through the bake camera by hand
(`/tmp/proj.mjs`, `/tmp/yaw.mjs`) refutes it:

* **100 % of the tree's vertices project INSIDE the frame.** Nothing spills off
  any edge. The arithmetic that suggested otherwise multiplied extremes that do
  not co-occur on the same vertex (y = 53 belongs to a different vertex than
  z = −115).
* NDC extents: **leaves y −0.71 .. +0.70**, **branches y −0.91 .. +0.60**.
  The trunk base (0,0,0) lands at NDC y −0.85 — comfortably in frame.
* The per-pass leaf **yaw barely spills**: sweeping 0-315° in 45° steps, the
  worst case is 0.2 % of vertices below the bottom edge (at 90°), min NDC y
  −1.31.
* The billboard quad crops to **v = 0.9** — i.e. it hides the bottom 10 % of the
  RT — and that is **faithful**: 0.9f appears as an immediate twice inside
  `FUN_0040b0b0` (0x40b5e2, 0x40b650).

**So the geometry says our RT should already have a trunk-only band at the
bottom, and the rendered frames say it does not.** That is a contradiction
between what the geometry projects and what the renderer produces — which is
exactly the shape of a shim bug, and it is a much better lead than any of the
geometric explanations tried so far.

Concrete next step: dump the baked RT to PNG and compare the actual ink extent
against the predicted NDC extents above. If ink exists below NDC −0.91 (RT row
489 of 512), something is drawing where no geometry projects.

## Still to audit

* **Cull mode** (`FUN_004018ec`, material bit `0x0010`). Note the API doc flags
  it as *"reversed vs. Lost Vegas"* — a place where a sign convention was
  already found surprising once. Leaves are emitted double-sided, so a culling
  difference changes canopy density directly.
* **Texture stage setup and filtering** inside the bake — `setStage1Op`,
  addressing (`0x0200`/`0x0400`), and which mip level the leaves sample at bake
  resolution.
* The higher flag bits `0x1000` / `0x2000` / `0x4000`, and `unapplyMaterial`'s
  restoration (state leaking between the ten passes would compound).
* **The `FUN_00406004` draw order** — meshes carry scene-graph mask bit 3 and
  draw in registration order; worth confirming the port's branches-then-leaves
  order matches, since with Z-write on, order changes the composite.

---

## 2026-08-10: the port's RNG architecture brought in line with the original

Three changes, in order of discovery, all verified against the binary:

**1. The impostor bake ran at the wrong stream position** (Codex H1) — fixed by
moving the first-call bake inside the array-C loop, after that record's scatter.
See `re/scenes/TREE_IMPOSTOR.md`. 0x0c08 58.62 → 49.26, no regressions.

**2. ONE stream, not two** → new `js/rng.mjs`. `meshgen.mjs` and `texgen.mjs`
each owned a private copy of the LCG — the port even documented it as *"same
algorithm, separate stream"*. The original has a single global seed at
**[0x41a9b8]**, and the texture VM's programs call the **same** `rand`
(op33 at 0x414e71/0x414e8d → 0x404258). Both modules now re-export the shared
stream, so existing callers are unchanged.

**3. Textures are generated LAZILY, in the original's order** — `main.js` no
longer pre-warms them (`?prewarm=1` restores the old behaviour for A/B).
`FUN_00416036` generates on first use and caches, so in the original each
program's draws — and, for the many programs carrying an op33 `srand`, its
**reseed** — land in the stream exactly where the scene build first asks for
that texture. Warming them up front moved every one of those draws before the
first scene built.

**4. Inside the bake, BARK before LEAF.** `FUN_00409d45` calls
`FUN_00416036(0)` at 0x40a035 and `(1)` at 0x40a087; the port had them the other
way round. This is the one that proves the whole chain:

> **The state entering the bake's per-pass yaws is now `0xa661ec3b` — exactly
> the value Codex derived from the binary, independently, before any change.**

Program 1 carries an op33 `srand`, which is why the correct order pins that
state at **any** texture scale (measured: program 1's outgoing state is
identical at 1x and 2x, while most other programs' are not).

### Measured

| | 0x0c08 (worst sample) | obj 5 forest | global median |
|---|---|---|---|
| session start | 58.62 | 22.79 | 26.71 |
| after (1) | 49.26 | 19.94 | 26.16 |
| after (2)-(4) | **43.07** | 19.98 | **26.12** |

**But (2)-(4) regress three scenes** against the bake-order-only state: cloud
sea **+3.27**, winter **+1.28**, beach +0.48, lakes +0.45.

**Those regressions are information, not damage.** Putting texgen back into the
shared stream is provably what the original does; if a scene gets worse for it,
that scene has its own build-order divergence which was previously masked by
texgen being absent from the stream entirely. Cloud sea and winter are the two
most RNG-heavy scenes left (cloud RT composite, precipitation), and they are now
the obvious next targets — with a sharp tool for finding the fault: compare the
stream state at each generator against the binary, as done for the bake.


---

## 2026-08-10: the scene build no longer blocks the loading screen

`buildScenes` was one synchronous block — nine `build()` calls back to back —
so with `?lighting=fixed` its ~200 ms-per-terrain-scene shadow bake (several
times that on Safari's JavaScriptCore) presented as a **hang after the
preloader**, which is why the lighting fix could not be the default.

It is now `async` and awaits a progress callback after each object, so the
loading screen repaints between scenes. **Nothing the demo generates changes:**
the constructors still run in their original order and so do the builds — only
the event loop gets a breath between them. That distinction matters because the
shared RNG stream makes build order part of the spec.

Measured (headless Chrome / V8, page load to `__sonnetReady`):

| path | ready in |
|---|---|
| default (`lighting=legacy`) | 3.9 s |
| `?lighting=fixed` | 6.0 s |

so the bake costs **~2.1 s** across the six terrain scenes, now spent visibly
rather than as a freeze.

**The default is still `legacy`, deliberately.** V8 is not the test that
matters here — the hang was Safari-only, and headless Chrome cannot measure
JavaScriptCore. Flipping the default should follow a real Safari run of
`?lighting=fixed`; `?lighting=legacy` remains the escape hatch either way.


## 2026-08-10 (later): fast pre-warm AND the original's stream order

Removing the pre-warm fixed the stream order but cost the ~28 fine-grained
progress steps — which are what animate the loading screen's lattice, so the
precalc both looked frozen and *felt* slow (reported from Safari). Both can be
had, exactly, because of a property worth writing down:

**Of the 28 texture programs, 20 RESEED and 8 CONSUME NOTHING. None carries
state with draws.** (Measured by running each program from two different seeds
and comparing the outgoing state.) A reseeding program's outgoing state is
independent of the incoming one, so *replaying its stream effect later is
precisely "set the stream to that post-state"*, and a zero-consumer needs
nothing at all.

So the pre-warm now runs with the shared stream **saved and restored** around it
(`scene7.setPrewarming`), recording each program's post-state; the **first real
use** during scene build replays it. Verified:

* the bake's per-pass yaw state is still exactly **`0xa661ec3b`**;
* the sweep is **bit-identical** to the lazy-generation build (+0.00 at every
  sampled position);
* load: legacy 3.8 s, `?lighting=fixed` 5.9 s (V8), with the lattice animating
  throughout.

`?prewarm=0` still forces lazy generation, as an independent check that the two
paths agree.
