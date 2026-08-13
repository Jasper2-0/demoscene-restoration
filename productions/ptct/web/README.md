# please the cookie thing — web restoration

A JavaScript/WebGL restoration of **"Please the Cookie Thing" by Aardbei**
(64k intro, 1st place 64k @ Ambience 2000, NL) — reconstructed from the
original binary as part of Dutch demoscene immaterial-heritage preservation.

- **Live: https://jasper2-0.github.io/ptct-webgl/**
- Original: [Pouet](https://www.pouet.net/prod.php?which=232) ·
  [Demozoo](https://demozoo.org/productions/25088/)
- Original credits: Oyise (textures), Inopia (3D), Snq (system/effects),
  Ile (effects), Rob (effects), Crystal Score/TBL (music "World of Noise"),
  Balance/TBL (player)

## Running

Serve this directory with any static web server and open `index.html`.
No build step, no WASM, no external dependencies at runtime.

URL options:

| param | effect |
|---|---|
| *(none)* | remastered: 4x textures, supersampled geometry, widescreen band |
| `?quality=original` | authentic: bit-exact 256 textures, original tessellation |
| `?aspect=classic` | full 4:3 frame with the original letterbox bars |
| `?tess=N` | geometry supersampling multiplier (default 4) |
| `?lead=SECONDS` | audio-visual sync lead (default 0.4485; ArrowUp/Down live) |
| `?t=SECONDS` / `?debug` | boot paused at a music time (no audio) |

## Restoration notes

- Engine, 28 effects, timeline (`script.as1`) and sync semantics were
  reverse-engineered from the final executable (Ghidra + disassembly);
  procedural textures are regenerated from the original ATG opcode scripts
  with a bit-exact port of Aardbei's ATGLIB texture generator.
- Music is the original IXS ("World of Noise (c) CS^TBL", Shortcut's
  procedural-sample Impulse Tracker format), rendered offline via
  Jürgen Wothke's webIXS — itself a reverse-engineered revival of
  IXSPlayer 1.20 (https://www.wothke.ch/webIXS/). Canonical .ixs preserved
  on Modland.
- Text is pre-rasterized offline from genuine Arial/Courier New with
  GDI-faithful metrics (no fonts are distributed; only rendered pixels).
- The remaster layer (supersampled textures/geometry, widescreen crop) is
  strictly additive: `?quality=original&aspect=classic` is the faithful
  reconstruction. Known deviations are documented in the source headers.

## Provenance & reuse

Nothing here is Aardbei's source. It is a reconstruction from the shipped 2000
binary — see `METHOD.md` for how, and for what was inferred rather than proven.

- `js/` is reconstruction code written for this port (`minigl.js` comes from
  the author's earlier `we-aint-real-webgl`).
- `assets/` is **derived from the original executable**: the timeline, the ATG
  texture scripts and the textures baked from them are Aardbei's work, decoded
  and regenerated here, not authored here. The soundtrack is Crystal Score's
  *World of Noise*, rendered offline from the original IXS module through Jürgen
  Wothke's `webIXS` — no webIXS code ships in this repository.
- The intro itself — design, code, music, artwork — remains the work of
  **Aardbei** and **TBL**. It is reproduced for preservation. Questions about
  reusing *their* work go to them, not to this repository.

There is no build step: what you see in `js/` is what runs.

**Licence:** MIT, covering the reconstruction source in `js/` — see `LICENSE`.
It does not extend to `assets/`, for the reasons above.

Restoration: coat / solar, 2026, with Claude (Anthropic).
All original artwork, code, design and music remain the work — and the
credit — of Aardbei and TBL. Made with admiration. Aardbei out.
