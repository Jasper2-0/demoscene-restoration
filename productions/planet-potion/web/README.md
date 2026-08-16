# Planet Potion — browser restoration

Work in progress. **The textures and the Warp3D shim are computed; the engine is
not.** Everything between them — scene build, animation, draw emission — still
comes from the original's recorded stream.

## What is here

`js/warp3d.js` implements the intro's 22-call Warp3D surface over WebGL2 — the
specific configuration the program sets up, not a general emulation. Every
constant in it is measured: blend factors, the reversed depth convention,
bilinear-without-mipmaps, `REPEAT` wrapping, texel-space texture coordinates, and
per-vertex linear fog. Provenance for each is in
[`../work/re/PORT_SPEC.md`](../work/re/PORT_SPEC.md) §5.

It consumes the same record shape `work/re/drawlog.py` records from the original,
so the recorded draw stream plays through it directly. That is the first
milestone on purpose: it tests the WebGL2 translation **alone**, with no
reimplemented engine present to confuse a difference with.

`js/fp.js` holds the two PowerPC floating-point semantics everything else
depends on: `stfs` stores truncate rather than round, and the multiply-adds are
fused. Both were found from output that was wrong by one ulp, both are the
difference between byte-exact and looks-right, and `work/re/fpcheck.mjs` pins
them against references computed a different way — it needs no dataset and no
original binary, so it is the one check that runs anywhere.

`js/texturevm.js` is the intro's procedural texture language, and it is
**byte-exact**: all 69 shipped programs and all 30 opcodes reproduce the
original's own output exactly, checked with `work/re/texvmdiff.mjs` and
`work/re/texopdiff.mjs`. `js/textures.js` runs it at load time and binds the
result, so the textures on screen are generated from the intro's bytecode rather
than loaded from the exported PNGs — those are now only the oracle.

One thing the shim cannot settle on its own is the **texture environment**. No
`W3D_SetTexEnv` call exists, so the Warp3D default applies, and the recorded
stream does not pin it down: vertex colours are neither uniformly black nor
uniformly white (20,737 all-black primitives, 9,697 all-white, 9,976 varied).
`?texenv=0|1|2` switches between replace, modulate and decal; replace is the
default and the reasoning is in `js/warp3d.js` and `PORT_SPEC.md` §6.

## Run

Serve the repository with any static HTTP server and open `productions/planet-potion/web/`.
No build step, no runtime dependencies.

- `?oracle=1` — replay a recorded frame
- `?scene=N&t=M` — one recorded frame, deterministically
- `?inspect=1` — install the shared `window.__demo` adapter and draw nothing on its own
- `?texenv=0|1|2` — texture environment: replace (default), modulate, decal

The recorded stream and textures are **not committed**; they are regenerable:

```sh
cd ../work/re && python3 export.py flat/ out/ && cp -r out/* ../../web/data/
```

## What is not here yet

The engine. In the staged plan (see `PORT_SPEC.md`), the pipeline is switchable
between recorded and computed per stage, and only the last one is computed today:

| stage | state |
|---|---|
| textures | **computed — byte-exact, all 69 programs** |
| scene build | recorded |
| per-frame animation | recorded |
| draw emission | recorded |
| **GL state / raster** | **computed — this file** |

Audio plays, without its dynamics. Two files and two checks:

* `js/dbm.js` reads a DigiBooster Pro 2 module. `work/re/dbmcheck.mjs` holds it
  to every byte being claimed by a chunk, the chunk sizes agreeing with an
  independent Python walk, and the effect-7 scene signals coming out at 26 and
  13 — the counts `showorder.py` derived from the code rather than the music.
* `js/dbmplayer.js` sequences and mixes it, with the DSP echo and its ping-pong
  cross. `work/re/dbmtime.mjs` checks the half that can be checked exactly: the
  sequencer reproduces `showorder.py`'s timeline tick for tick on both parts —
  1,013 rows and 289.286 s with all 26 scene boundaries on the same tick for
  part one, 1,088 rows and 150.000 s with all 13 for part three.

**The effect set is deliberately unimplemented.** DigiBooster's numbering is not
ProTracker's — effect 7 is the scene signal where ProTracker numbering would make
it tremolo — so filling the rest in from ProTracker would be inventing behaviour.
Only 7 and 15 are acted on, and `unhandledEffects()` reports what each module
actually uses, so the gap is a number in the output rather than something noticed
later by ear.

Still missing: those eleven effects, and the two softsynth generators that build
the modules in the first place (`PORT_SPEC.md` §8b–8h). The modules themselves
are currently exported by the harness rather than generated in the browser.
