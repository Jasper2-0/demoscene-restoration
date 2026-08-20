# Planet Potion — browser restoration

**Self-contained.** This page downloads no recorded draw stream and no
pre-rendered audio. It reads the intro's own bytecode out of three segments and
runs it: the scene graph, the geometry, the three animation passes, the node
walk, the clipper, the projection, both soundtrack modules and all 69 textures.

`engine.js` decodes the scene graph and the geometry out of seg3 and seg4, runs
the three animation passes once per tick with the music's own effect-7 cues
driving the beat sync, walks the nodes, clips and projects, and hands the result
to the same Warp3D shim the recording used to feed. The schedule comes from
`showorder.json` — 11 KB against `draws.json`'s 17 MB, and the richer of the two.

`pipeline.mjs` compares 140 frames and 45,327 primitives of that against the
original's recorded stream — 135 reproduce every primitive exactly, and the five
that do not are one geometry node whose displacement map is specified in
[`PORT_SPEC.md`][spec] §0-bis and not yet reproduced.

**The recording is now the oracle, not an input.** `?oracle=1` and `?scene=N`
still play it; the default path never downloads it.

### The 64k build

[`mashi/`](mashi/) is the same runtime packed into one self-extracting
**60,569-byte** .html, against the original's 65,288. It does not fork the
code — every module under `js/` is compiled exactly as tested — see
[`PORT_SPEC.md`][spec] §0-bis.

## What is here

`js/warp3d.js` implements the intro's 22-call Warp3D surface over WebGL2 — the
specific configuration the program sets up, not a general emulation. Every
constant in it is measured: blend factors, the reversed depth convention,
bilinear-without-mipmaps, `REPEAT` wrapping, texel-space texture coordinates, and
per-vertex linear fog. Provenance for each is in
[`PORT_SPEC.md`][spec] §5.

It consumes the same record shape `work/re/drawlog.py` records from the
original, so the recorded draw stream plays through it directly. That was the
first milestone on purpose — it tested the WebGL2 translation **alone**, with no
reimplemented engine to confuse a difference with — and it is why the engine
could be checked against the recording through a shim already known to be
right.

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

`js/font.js` is PORT_SPEC §1's init stage: `_init_txtgen` expands seg2's
2,048-byte 1bpp mask into the 128x128 glyph atlas, and `_init_scene_generate`
unpacks the 40 glyph records from 200 bytes in seg0. Both reproduce their
exported oracle exactly — `work/re/initcheck.mjs` compares 49,152 colour samples
against `font_atlas.png` and all 40 records against `font.json`, and asserts the
two shipped quirks are preserved rather than tidied away: `'0'` appears twice,
and `'v'` carries `'w'`'s rectangle so the intro renders "v" as "w".

The type-4 node handler consumes both: `engine.js` lays out every text node in a
scene through the glyph table when it builds the graph, so the type on screen
comes from the same 200 bytes of seg0 the original reads.

**Fog is applied.** `setFog` had existed in the shim since it was written and
nothing had ever called it, so four of part one's scenes rendered clear that
should not have. The show script turns `W3D_FOGGING` on and off around four
`SetFogParams` calls, and the four presets are used by exactly four scenes, one
each. `export.py` resolves the effective preset per scene rather than leaving it
sticky, because the page draws scenes out of order and cannot carry state it
never ran through.

One thing the shim cannot settle on its own is the **texture environment**. No
`W3D_SetTexEnv` call exists, so the Warp3D default applies, and the recorded
stream does not pin it down: vertex colours are neither uniformly black nor
uniformly white (20,737 all-black primitives, 9,697 all-white, 9,976 varied).
`?texenv=0|1|2` switches between replace, modulate and decal; replace is the
default and the reasoning is in `js/warp3d.js` and `PORT_SPEC.md` §6.

## Run

Press **Start Intro**. No build step and no runtime dependencies — sixteen ES
modules and the intro's own bytecode. To run it locally, serve this directory
with any static HTTP server; opening `index.html` from the filesystem will not
work, because ES modules and the audio worker both need an origin.

- `?oracle=1` — replay the recorded stream instead of computing
- `?scene=N&t=M` — one recorded frame, deterministically
- `?scene=N&tick=M` — one **computed** frame, deterministically
- `?show=p1|p3&at=SECONDS` — sweep to an absolute show time, for comparing against a capture
- `?inspect=1` — install the shared `window.__demo` adapter and draw nothing on its own
- `?texenv=0|1|2` — texture environment: replace (default), modulate, decal
- `?octave=N` — transpose the soundtrack
- `?nocache=1` — skip the IndexedDB cache of generated textures and modules

Press **§** during the show for a per-frame readout: scene, slot, tick, draw and
triangle counts, and the display rate.

The button is hidden in the single-frame and inspect modes, because it cannot
mean anything in them — each renders one still or nothing at all.

## The soundtrack

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

**It runs in a worker.** Generating a module is about two seconds of
straight-line arithmetic and mixing it is another second, so both live in
`js/audioworker.js` and neither touches the thread that draws. That is not only
so the precalc stops freezing: it means part three is built *while part one
plays*, and the boundary between the two parts costs nothing. `soundcheck.mjs`
presses the button in a real browser and measures the samples that reach the
output — part one's full 289.286 seconds, stereo, and not silence.

Generated textures and modules are cached in IndexedDB between reloads, keyed by
a hash of the segments they were built from and a version that has to be bumped
by hand. `?nocache=1` skips it.

Frames follow the **audio clock** (`AudioContext.currentTime`), not
`requestAnimationFrame`. METHOD.md §8 requires it for anything audio-locked, and
here it is also the only clock that means anything: the show's schedule is
defined by effect-7 signals inside the music, which is how `showorder.py`
recovered the timeline in the first place.

The recorded stream and the exported textures are **not committed**; they are
regenerated by running the original under `qemu-user`. The full recipe, and
where the segment dump comes from, is at the top of [`checkall.sh`][checkall] in
the [monorepo][repo] — this is the published site, and the reverse-engineering
harness stays there.

## The pipeline, stage by stage

Every stage is switchable between the original's recorded output and this port's
own, and `js/stages.js` is where that lives — the list below is the one in that
file. **All seven default to computed**; the recorded side is the oracle.

| stage | computed | recorded |
|---|---|---|
| `tables` | rebuilt from the executable's own float constants | — |
| `textures` | the texture VM over the intro's bytecode | the exported PNGs |
| `geometry` | built from seg3 and seg4 — 181/181 nodes vs `geodump` | `data/draws.json` |
| `scene` | decoded from the stream — 29/29, 395/395 nodes | `data/draws.json` |
| `anim` | all three passes, stepped per tick — 2,783 blocks exact | `data/draws.json` |
| `emit` | the node walk, clipper and projection | `data/draws.json` |
| `raster` | translated to WebGL2 | — |
| `audio` | both modules generated byte-exactly | — |

Any of them can be selected with `?<stage>=computed|recorded`. **Asking for a
side that does not exist is refused and said out loud** — it does not quietly
render the other one, because a sweep that records `anim=computed` against a
recorded frame is worse than no sweep. `window.__demo.state()` reports every
stage's provenance, and `work/re/stagecheck.mjs` asserts all of it.

`textures` is the only stage with two live sides today, so it is the one that
keeps the mechanism honest: `?textures=recorded` loads the exported PNGs
instead of generating them, and stagecheck builds both in the page and compares
them. They agree on **every colour channel of all 69 programs**, checked through
the browser's own PNG decoder rather than the one `texvmdiff` uses.

They do not agree on alpha, and that is a gap in the dataset rather than in
either path: `rendertex.py` writes PNG colour type 2, so the exported textures
carry no alpha at all. **The texture VM's alpha channel has therefore never been
checked against anything** — `texvmdiff` compares three channels of four —
and stagecheck now measures the hole: 485,633 texels where the VM's alpha is not
opaque and the PNGs say nothing.

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
[`NOTES.md`][notes].

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

---

The reverse engineering, the check suites and the build live in the monorepo:
**[Jasper2-0/demoscene-restoration][repo]**.

[repo]: https://github.com/Jasper2-0/demoscene-restoration
[spec]: https://github.com/Jasper2-0/demoscene-restoration/blob/main/productions/planet-potion/work/re/PORT_SPEC.md
[notes]: https://github.com/Jasper2-0/demoscene-restoration/blob/main/productions/planet-potion/work/re/NOTES.md
[checkall]: https://github.com/Jasper2-0/demoscene-restoration/blob/main/productions/planet-potion/work/re/checkall.sh
