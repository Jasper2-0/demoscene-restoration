# SYNC — how PTCT couples visuals to music

## The two clocks

1. **Engine ticks** — `FUN_004119d0`: `(timeGetTime() - t0) * 4`, i.e. **1 tick = 0.25 ms**,
   t0 latched at first call. Every effect `render()` receives *layer-local* elapsed ticks
   (see SCRIPT_FORMAT.md §6). A handful of effects also call `FUN_004119d0()` directly
   (eff3C/3D flash ages, eff12 title timer, eff1C streaks).
   For a JS port: `ticks = (performance.now() - t0) * 4`.

2. **Music position** — a pair `(order, row)` from the IT player, **latency-compensated to
   what is audible right now**, not what the mixer has produced.

## Position query chain

```
FUN_00409500(&order, &row, &zero)          ; the only sync API used by the demo
  └ player->vt[5] (0x4096d0)
      └ FUN_0040a760: return synth+0x3218  ; u32, (order<<8)|row
```

`synth+0x3218` is maintained by the mixer thread (`FUN_00409b10` → `FUN_00409e10`):

- The synth mixes audio **one tracker tick per block** into a 512 KiB circular waveOut buffer.
- Each block gets a descriptor `{inUse, startByte, lengthBytes, order, row}` (`FUN_0040d4f0`
  stores it; `order`/`row` are the tracker position *of that block's audio*).
- On every mixer-thread pass, the current playback byte position (waveOutGetPosition,
  `FUN_0040b3e0`) is mapped back through the descriptor ring: the newest block whose
  `startByte < playCursor` wins → `synth+0x3218 = (block.order<<8)|block.row`
  (`FUN_0040d3e0`, ptct.c 7268–7299).

So `(order,row)` advances row-by-row exactly when that row becomes audible, regardless of how
far ahead the mixer has rendered. Row granularity ≈ one tracker row; there is no intra-row
interpolation anywhere in the demo.

Internal position fields (synth object): `+0x3214` current pattern, `+0x3215` current order
index, `+0x3216` current row, `+0x320e` tick countdown; order table at `module+0xC8`
(0xFE entries skipped, 0xFF wraps to 0 — `FUN_0040a7d0`/`FUN_0040a240`).

## Who consumes the position

- **Script interpreter** (`FUN_00415ed0`): reads `(order,row)` once per frame into
  `DAT_00441ee0` / `DAT_004406c0`; all SHOW/TRIG windows are (order,row) comparisons.
  Third output `DAT_004406c8` is hard-set to 0 each query (vestigial).
- **Main loop** (`FUN_00403820`): after each frame re-queries order; once order ≥ 0x20 has
  been observed, order < 10 ⇒ song looped ⇒ `quitDemo()`.
- **Effects that peek at the music directly** (all via `FUN_00409500`):
  - `eff18` (marching-squares blob, 404fb0): `order < 0x10` → normal blend; `order >= 0x10`
    (i.e. orders 16,17 of its 14→18 window) → additive blend. (Beat-drop state change.)
  - `eff1E` (rings, 407570): `(row & 0xF) == 0` latches a phase base; during order 0x1A rows
    0–15 with `(row&0x1F)<0x10`, and order 0x1B rows <16, the camera Y gets a bounce offset —
    camera "slams" with the kick pattern.
- **Everything else** is driven purely by the per-layer elapsed ticks, which restart when the
  script (re)shows an effect on a layer — that is how per-scene animations are implicitly
  music-aligned (they start exactly on an (order,row) boundary), and TRESET (0xFD) events
  restart a running effect's clock mid-scene (used at 11:56, 11:60 for flash retiming and at
  20:00 to re-kick eff20's camera).

## Port guidance (external sync map)

The port only needs, per audio frame: `order` (song position) and `row`. Build a
`time → (order,row)` table offline from the baked audio (each row's start time), then:

```js
function musicGetPos(tAudioSeconds) {   // replicates FUN_00409500
  const e = table.lastRowStartingBefore(tAudioSeconds);
  return { order: e.order, row: e.row };
}
```

Feed that into a 1:1 reimplementation of the interpreter loop. Use *audio clock* for the
position and *performance.now()-based ticks* for `getTicks()`; the original also used two
unlocked clocks (timeGetTime vs waveOutGetPosition), so drift semantics match.
Rows are 0..63 in 64-row patterns except the final pattern window "27:127" trick where an
end-row of 127 simply means "past the end of pattern 27" (pattern lengths come from the IT
pattern headers; the comparison is purely numeric so 127 works as +∞ within the order).

## Sync map generation (from IXS song data)

Since the port's audio backend (webIXS) never materialises the IT image, the map is derived
directly from the IXS **song section** by `work/js/ixs_timing.mjs`, which parses the format
of `FUN_0040be10` and simulates `FUN_0040a240`. Output:
`work/baked/audio/sync_map.json` — `{rows:[[tSeconds,order,row],…], orders, totalSeconds}`.

### File/side facts established from the binary

- Container (`FUN_0040b7b0`): `"IXS!"`, u32 ×3 section offsets (relative to the byte after
  the 56-byte header), u32, 4 bytes, 26-byte name padded to 32. `world_of_noise.ixs` =
  same 56-byte header + **zlib** payload; `wnoise.ixx` = header + raw payload. Song section
  offset = first offset = 0 → payload starts with the song section.
- Song section (`FUN_0040be10`): `'!'`, u16 orders/instruments/samples/patterns counts,
  bytes globalVol, mixVol, **initialSpeed**, **initialTempo**, 26-byte name, 2×64-byte
  channel tables, order list bytes, then instruments (tag `'i'`=empty), samples (tag
  `'s'`=empty; header only — waveforms are synth patches referenced by name), patterns
  (tag `'p'`=empty; else u16 dataLen, u16 rows, IT-packed data as consumed by
  `FUN_0040c880`).
- **Timing commands actually implemented by the player** (`FUN_0040ab20` switch): only
  `3 = Cxx` pattern break affects flow. `4=Dxx, 5/6=Exx/Fxx, 7=Gxx, 8=Hxx, 15=Oxx,
  19=Sxx(SDx note-delay only)` don't affect timing, and **Axx (1), Bxx (2), Txx (20) are
  not handled at all** — speed and tempo are fixed by the header for the whole song.
  `speedCounter` reloads to `initialSpeed` every row; `samplesPerTick =
  floor(44100 · 2.5 / tempo)` (`FUN_0040d360`, constant 2.5 at 0x41aab8).
- Order walk: skip 0xFE, wrap to 0 at 0xFF/end (the demo quits at wrap).

### World of Noise numbers (validation)

- header: speed **6**, tempo **134**. Samples/tick is **floored** (ftol in `FUN_0040d360`):
  `floor(44100·2.5/134) = 822` samples → tick = 18.639 ms, **row = 4932 samples =
  111.837 ms**, pattern (64 rows) = 7.158 s. The webIXS wasm floors identically — the baked
  FLAC length (249.992 s = 11,024,664 samples) is an exact multiple of 822 (13,412 ticks),
  so the sync map uses the sample-exact tick and is drift-free against the baked audio.
- order list (36 entries): `0..27, 12, 13, 16, 28, 29, 30, 31, FF` → **35 orders played
  (0..34)**, 32 patterns, no 0xFE, no Cxx fired in practice (all orders run 64 rows),
  zero Axx/Bxx/Txx anywhere → **2240 rows**.
- **totalSeconds = 250.514 s** (wrap point) vs baked FLAC **249.992 s**: the render stops
  ~28 ticks (≈4.7 rows, 0.52 s) short of the wrap-detection row — an end-of-song trim in
  the renderer, not a rate mismatch (rates are sample-identical). The demo would quit at
  the wrap anyway; the last visual event runs to the end of audio either way.
- TIMELINE cross-check: order 33 exists (236.199 s); beat-sync anchors: order 16 → 114.521 s
  (mid-song blend switch, halfway), order 26 → 186.096 s, order 27 → 193.254 s (rings
  bounce). Other anchors: 8:00 → 57.260 s, 10:00 → 71.576 s, 24:00 → 171.781 s,
  32:00 → 229.042 s.

### Fidelity notes (original player quirks)

The JSON lists *musical* row starts (`t = globalRow · 0.111940 s`). The original tag stream
(`synth+0x3218`) differs in two benign ways, documented in case bit-exact parity is wanted:

1. **Mix pre-roll**: the mixer runs `speed−1` per-tick blocks before the first row is
   processed, so audio (and every subsequent row) is offset ~5 ticks (93 ms) later than the
   nominal grid; webIXS renders row 0 at t=0, so use the JSON as-is and calibrate any
   constant offset against the baked WAV once.
2. **Tag leads by one row**: `FUN_0040a240` increments the row counter *after* processing,
   and blocks are tagged afterwards — during row R's audio the tag reads R+1 (row 0 of an
   order never appears as a tag; the last 5 ticks of an order are tagged row 64). Net
   effect in the original: script conditions on `(order, row)` fired one row (≈112 ms)
   later than nominal. If you want to replicate that exactly, evaluate the interpreter
   against `pos(t − rowSeconds + tickSeconds)` shifted forward one row; for practical
   purposes a single global latency constant tuned by eye is equivalent.
