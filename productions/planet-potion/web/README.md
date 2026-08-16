# Planet Potion — browser restoration

Work in progress. **The Warp3D shim exists and is verified; the engine does not.**

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

## Run

Serve the repository with any static HTTP server and open `productions/planet-potion/web/`.
No build step, no runtime dependencies.

- `?oracle=1` — replay a recorded frame
- `?scene=N&t=M` — one recorded frame, deterministically
- `?inspect=1` — install the shared `window.__demo` adapter and draw nothing on its own

The recorded stream and textures are **not committed**; they are regenerable:

```sh
cd ../work/re && python3 export.py flat/ out/ && cp -r out/* ../../web/data/
```

## What is not here yet

The engine. In the staged plan (see `PORT_SPEC.md`), the pipeline is switchable
between recorded and computed per stage, and only the last one is computed today:

| stage | state |
|---|---|
| textures | recorded (PNG) — the 20-opcode VM is read but not written |
| scene build | recorded |
| per-frame animation | recorded |
| draw emission | recorded |
| **GL state / raster** | **computed — this file** |

Audio is absent: it needs the two softsynth generators and a DigiBooster replayer
with its DSP echo, all specified in `PORT_SPEC.md` §8 and none written.
