# Planet Potion — browser restoration

Work in progress. **The textures, the soundtrack and the Warp3D shim are
computed; the engine is not.** Everything between them — scene build, animation,
draw emission — still comes from the original's recorded stream.

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

Press **Start with sound** for the show: the real soundtrack, with the recorded
frames stepping in time with it. Everything else is a single still.

- `?oracle=1` — replay a recorded frame
- `?scene=N&t=M` — one recorded frame, deterministically
- `?inspect=1` — install the shared `window.__demo` adapter and draw nothing on its own
- `?texenv=0|1|2` — texture environment: replace (default), modulate, decal

The button is hidden in those four modes, because it cannot mean anything in
them — each renders one still or nothing at all.

## What "Start with sound" is, and is not

The **audio is a port all the way down**, and as of the softsynth it is
generated rather than loaded. `js/synth.js` runs all 32 of the original's
generator primitives over its own seed data and builds both DigiBooster modules
in the page — 8.3 MB of samples out of 99 KB of segments — and then `dbm.js`
reads what it built and `dbmplayer.js` sequences and mixes it with the DSP echo.

The modules are **byte-identical** to the ones the original produces:
`work/re/synthdiff.mjs` checks all 94 samples individually against slices of the
reference and both whole-module SHA-256 digests against `audio.json`, which
`synthhash.py` wrote independently.

    part 1   5,324,378 B   dfd0826755b81fba…
    part 3   3,015,404 B   460939ceb5d2bbbd…

It costs about 1.6 seconds for part one and 1.1 for part three, taken when each
part starts rather than up front. `work/re/soundcheck.mjs` presses the button in
a real browser and measures the samples that reach the output — part one's full
289.286 seconds, stereo, and not silence.

The **visuals are still recorded**, and sampled sparsely: five frames per scene,
140 in all. So the show is stills changing in time with the music, not
animation. Real playback would need 21,915 frames — `draws.json` is already
19 MB for 140 — which is the clearest statement of why the engine, not a bigger
export, is the remaining work.

Frames follow the **audio clock** (`AudioContext.currentTime`), not
`requestAnimationFrame`. METHOD.md §8 requires it for anything audio-locked, and
here it is also the only clock that means anything: the show's schedule is
defined by effect-7 signals inside the music, which is how `showorder.py`
recovered the timeline in the first place.

The recorded stream and textures are **not committed**; they are regenerable:

```sh
cd ../work/re && ./ppcbox.sh python3 export.py flat/ out/ && cp -r out/* ../../web/data/
```

`synthdump.py` is no longer part of the recipe: the page generates the modules
rather than loading them, and `export.py` writes the two segments it needs. The
harness still builds the .dbm files under `mods/` because `dbmcheck`, `dbmtime`,
`dbmdiff` and `synthref` all want a reference module to compare against.

`ppcbox.sh` is there because both tools generate their data by running the
original under `qemu-user`, which does not exist on macOS. The full recipe,
including where `flat/` comes from, is at the top of `../work/re/checkall.sh`.

## What is not here yet

The engine. In the staged plan (see `PORT_SPEC.md`), the pipeline is switchable
between recorded and computed per stage, and only the last one is computed today:

| stage | state |
|---|---|
| lookup tables | **computed — byte-exact** |
| textures | **computed — byte-exact, all 69 programs** |
| **softsynth** | **computed — byte-exact, all 94 samples** |
| scene build | recorded |
| per-frame animation | recorded |
| draw emission | recorded |
| **GL state / raster** | **computed — this file** |

Audio plays **in the page**, not only in the harness. Two files and four checks:

* `js/dbm.js` reads a DigiBooster Pro 2 module. `work/re/dbmcheck.mjs` holds it
  to every byte being claimed by a chunk, the chunk sizes agreeing with an
  independent Python walk, and the effect-7 scene signals coming out at 26 and
  13 — the counts `showorder.py` derived from the code rather than the music.
* `js/dbmplayer.js` sequences and mixes it, with the DSP echo and its ping-pong
  cross. `work/re/dbmtime.mjs` checks the half that can be checked exactly: the
  sequencer reproduces `showorder.py`'s timeline tick for tick on both parts —
  1,013 rows and 289.286 s with all 26 scene boundaries on the same tick for
  part one, 1,088 rows and 156.563 s with all 13 for part three. That second
  figure was 150.000 until `0xEE` pattern delay was implemented — the Python
  timeline in `showorder.py` had the same hole, so the two agreed with each
  other and the check stayed green while both were wrong.
* `work/re/soundcheck.mjs` covers what neither of those can: that the **page**
  calls them. Both were green the whole time `main.js` imported neither, and
  "Start with sound" was a button with no click handler — visible, by an
  inverted `hidden`, in exactly the modes where it could not work.

**The effects are read out of the player, not guessed.** DigiBooster's numbering
is not ProTracker's, so every one of them comes from the handler in
`dbplayer.library` — which is embedded in the intro as seg1, and disassembles as
68K. `unhandledEffects()` reports coverage as a number, and `dbmcheck` asserts
it: **100% of the effect commands either module uses are acted on.**

| effect | what the handler does | at |
|---|---|---|
| 1 / 2 | portamento up / down, period ∓ param×4 per tick | `0x10022be4`, `0x10022c44` |
| 3 | tone portamento toward the note's period | `0x10022e6c` |
| 7 | writes the scene signal — six instructions, no sound | `0x100231c6` |
| 8 / 25 | set panning / pan slide, on a 0..255 field | `0x100227f8`, `0x10022804` |
| 9 | sample offset, `param << 8` | `0x100227b8` |
| 10 / 12 | volume slide / set volume, 8.8 fixed, ceiling 0x4000 | `0x10022d38`, `0x10022d2e` |
| 15 | speed below 32, BPM at or above | `0x1002283c` |
| 0xE1 / 0xE2 | fine portamento up / down, once per row | `0x10022dfc`, `0x10022dd0` |
| 0xE9 | retrigger the sample every n ticks | `0x10022a80` |
| 0xEA / 0xEB | fine volume slide up / down | `0x10022e28`, `0x10022e4c` |
| 0xED | note delay by n ticks | `0x10022ade` |
| 0xE3 | play backwards — done in the mixer, not the dispatch | `0x10021b96` |
| 0xEE | pattern delay: the row lasts (1 + n) rows | `0x10022722` |

That required the mixer to run a **tick loop** rather than filling a row at a
time, since most of these move something once per tick — the player draws the
same distinction with a flag at `0x10021666` that every handler tests.

**Coverage is 100% of the effect commands either module uses**, `0xE3` (play
backwards) and the volume envelopes included. The envelopes matter more than
their count suggests: part one has two for 56 instruments, but **164 of its 176
key offs land on those two**, so they are the sustained voices and both shapes
end at silence.

The player is checked against **libdigibooster3**, the format author's own
replayer — `work/re/oracle.sh` builds it, `work/re/dbmsuite.mjs` diffs one
generated module per behaviour, and `work/re/dbmdiff.mjs` diffs the real
modules. **All 37 behaviours match**, and with the echo parameters aligned the
whole of part one matches the reference at **0.9955** on the amplitude envelope
and **0.9858** on the waveform; part three at 0.9951 and 0.9772.

The alignment is needed because of a difference that is the reference's rather
than ours: **it ignores a module's echo settings.** Its "old" echo type never
pushes DSPE into the DSP object, so it plays every DBM at delay 0x40 and
feedback 0x80 — a generated module declaring 40 ms, which its own dbminfo
prints as 40 ms, renders with taps 128 ms apart. These modules say 430 ms and
have echo on 12 of 18 tracks. We keep the module's own values, so as the page
actually plays it the figures are 0.97 and 0.91. Both are checked.

The note base was also settled by ear rather than by measurement: the two
references disagreed by two octaves, correlation preferred one and the
disassembly the other, and only listening could say which was the intro. See
`../work/re/NOTES.md`.

Still missing:

* **The final level is a stopgap and says so in the source.** The channel sum is
  divided by `nch / 4`, which left part one peaking at 1.4 against Web Audio's
  1.0 clamp — audible as crackle on the busiest passages. The finished buffer is
  now scaled by 1/peak, which removes the clipping without touching the balance,
  but the original's own mixing law has not been read yet.
* **Exact resampler arithmetic.** Ours interpolates linearly in floating
  point; the reference does the same in 16.16 fixed point with an eight-sample
  lead-in, which is one sample of latency and a hair of shape. Worth the last
  0.014 on a held note.
