# SYNTH — the IXS synthesizer inside PTCT (wnoise.ixx)

MUSIC_PLAYER.md covers the load flow and sync surface and deliberately skipped the synth
internals (0x40b7b0–0x40cd00 + helpers). This file documents those internals, from the
ptct.c decompile plus a parse of the shipped `wnoise.ixx`. Written 2026-08-04 for the
"what synth is this?" question from Pouet.

## Identity (confirmed)

- `wnoise.ixx` = **"World of Noise" by CS (Crystal Score) of The Black Lotus**, in the
  **IXS / iXalance** format (Shortcut's procedural-sample IT format; see
  ptct-restoration memory). PTCT embeds the IXS player library — the synth is **not**
  Aardbei code.
- Byte-level proof: the canonical standalone `world_of_noise.ixs`
  (work/webixs/world_of_noise.ixs) has the *identical* header — same section offsets
  0xAC54 / 0xDC80, same field 0x42E8 — with title `World of Noise (c) CS^TBL` at +24 and
  the body zlib-packed (78 9C). PTCT's `wnoise.ixx` is the same module with the title
  zeroed and the body stored raw (PTCT's own resource pack compresses the outer layer).
- Size: 56,631 bytes raw / 17,184 bytes as the zlib .ixs — the **entire 4:10 soundtrack**.

## What kind of synth is it?

**An offline procedural-sample compiler.** Nothing is synthesized in real time. At load,
every instrument is rendered at 44.1 kHz into a PCM sample, the samples are assembled
into a complete Impulse Tracker module in memory, and playback is a stock (MMX-optimized)
IT player. Architecture per voice: a fixed-topology **6-operator phase-modulation (FM)
chain** with exponential envelopes, followed by a resonant 2-pole filter, drive/clip,
and a randomized multi-tap stereo reverb — plus a built-in **16-step sequencer per
instrument**, so a "sample" can be an entire baked bassline.

## File format (all offsets relative to end of 56-byte header)

```
+0   "IXS!"
+4   u32 songOffset      (0x0000 here)
+8   u32 synthOffset     (0xAC54 → 46 FM instruments)
+12  u32 streamOffset    (0xDC80 → 1 wavetable-score instrument)
+16  u32 (0x42E8)        stored into IT module obj +0x24
+20  u32 field           (0x40000000)
+24  char name[32]       ("World of Noise (c) CS^TBL" in the .ixs; zeroed in PTCT)
```

### Section 1 — song (FUN_0040be10 reader / FUN_0040cdf0 writer, tag format)

A stripped IT module: `'!'` + counts (36 orders, 99 IT instruments, 87 IT samples,
32 patterns) + globals (128, 4, speed 6, tempo 134). Then per record a one-byte tag —
uppercase = data follows, **lowercase = empty record** (`'i' 's' 'p'`): IT instruments
(3 envelopes as count+node lists; note-map flag 0x80 = "identity map, one byte"), sample
headers, packed pattern data. The synthesized PCM is linked to sample headers by name.

### Section 2 — 46 synth instruments, 268 (0x10C) bytes each (FUN_0040b9e0)

Bytes 9..0x10A of each record are **cumulatively delta-coded against the previous
record** (instruments sorted so similar patches nearly vanish under the outer packer).

```
+0    char name[9]      "Seq1", "Openhh", "B1".."B7", "_909sd", "Bd", "Piano2!", ...
+9    u8   params[100]  each byte → float ≈ (b-127.5)/127.5, i.e. -1..+1 (127 = neutral)
+109  i32  note[16]     16-step sequence, MIDI-ish note numbers (36 = C-2 etc.)
+173  u8   slide[16]    per-step legato/slide flag (keeps phases+envelopes running)
+189  f32  vol[16]      per-step volume (accent; e.g. 1.0 / 0.1 patterns)
+253  i32  stepLen      samples per step  == 44100·15/BPM  (4936 @ 134 BPM = one row)
+257  i32  bpm          instrument's tempo (134 for all sequences = song tempo)
+261  i32  stepCount    1..16 steps actually rendered
+265  u8   loopFlag, renderFlag, stereoFlag
```

## The FM voice (FUN_0040e770, per-step init FUN_0040f990)

Six sine operators in a fixed "algorithm": a 4-op modulation stack and a 2-op stack,
summed. Each operator has (ratio, level, decay) from params 0–17; three feedback
amounts from params 18–20. All arithmetic in x87 doubles.

```
op6 → op5 → op4 → op3 ──┐
      ▲            │    ├─(+)── ·stepVol ── 2-pole resonant filter ── ·0.5 ── drive+clip
      └─fb3────────┤    │
            fb2────┘    │
op2 → carrier ──────────┘
 ▲        │  waveform: sine | saw | pulse+PWM   (params 0x5B select, 0x5A width)
 └──fb1───┘  (carrier output feeds back into op2's phase)
```

- **Envelopes:** decay-only, one per operator: byte mapped through `SQRT()` ×9
  (= x^(1/512)) → a per-sample multiplier ≈1.0. Pure exponential decay; attack is faked
  with the fade-in post-param. No ADSR anywhere.
- **Sweeps:** params 50–81 are 32 per-sample *multipliers* applied every sample to the
  operator ratios, levels, feedback amounts and the filter cutoff — exponential
  automation of nearly every knob (this is where kick pitch-drops etc. come from).
- **Pitch:** per step, target = pow(2, note/12'ish) via _CIpow; slide steps glide
  toward it (FUN_0040f800, rate param 0x20) instead of retriggering — TB-303 style.
  Param 0x56 selects whether a new step starts from the previous pitch.
- **Filter** (FUN_0040f6e0): two integrator states, cutoff-as-divisor, resonance-as-
  feedback — a ~4-line "Karlsen-style" resonant 2-pole; LP or +dry mode (param 0x24).
  Cutoff = ((p[0x1B]+1)/2)²·k, swept by table slot 27.
- **Dirt** (FUN_0040f780): every sample ×(1 + drive·noise), hard-clipped to ±1.

### Per-instrument post-processing (tail of FUN_0040e770)

In order: optional buffer **reverse** (param 0x1E); loop-tail wrap with quadratic
crossfade (param 0x53); quadratic **fade-in** (param 0x54); fade-out of last ¼ or all
(param 0x17); **gain + hard clip** distortion (param 0x22); and if stereoFlag —

### Stereo reverb (FUN_0040fd40)

A randomized multi-tap delay network: N taps × 2 channels with **random lengths, random
feedback, random polarity**, shared 96k-sample ring buffer, damping via the same 2-pole
filter, dry/wet + tap-gain params (0x5C–0x62), optional wrap of the reverb tail back
into the loop start. Seeded `srand(0xDEAD - x)` → deterministic, renders identically
every run. Mono instruments (stereoFlag=0) skip it entirely; stereo ones become L/R
sample pairs in the IT (hence 46 synth instruments → 87 IT samples).

## The killer trick: baked sequences + parameter-variant banks

Because each instrument carries a 16-step pattern with accent + slide, whole basslines
and drum loops are rendered as ONE long IT sample (16 × 4936 = 1.79 s at 134 BPM),
looped by the tracker. Realtime filter automation is faked by **rendering the same
patch at N cutoffs and switching samples**:

| bank | patch cutoff bytes (param 0x1B) |
|---|---|
| `2seq1`..`2seq7` | 192, 160, 128, 96, 64, 32, 0 |
| `B1`..`B7` (bass) | 254, 190, 126, 62, 50, 14, 0 |
| `Seq1/1b/2/3/4/4b` | 57, 249, 67, 85, 103, 103 |

Full instrument list (46): Seq4b Seq4 Openhh 10445b 10445a 5691 3git508 2seq2 2seq1
2seq6 2seq5 2seq4 2seq3 Resonzz Ch 2git508 3seq2 3seq1 2seq7 21029 Applaus Applau2
B7 B1 B4 B5 B6 B2 B3 _909sd _crash Horn Bd Piano2! Dj Heavy 37425 _909sd 3seq4 Myst
Seq2 Seq3 Seq1 Seq1b Dloop1 Scream! — drums, claps, "Applaus", a horn, a scream, a
piano; the numeric names (10445, 5691, 21029, 37425) look like sample-CD indices the
patches imitate.

### Section 3 — the second synth (FUN_00410c80/00410500/004107b0)

One instrument: **"Chord"**, 120 bytes. A varint-tagged chunk stream (structure-of-
arrays for packing): tag 1 (5 B) = parametric single-cycle waveform (morphable
triangle↔saw↔sine with fold, FUN_00410400); tag 3 (98 B) = **12 oscillator events**
(start, pitch, L/R gain — 12-bit signed, so phase-invertible — vibrato via per-64-sample
sine pitch update); tag 4 (9 B) = a granular re-smear pass (FUN_004107b0: pitch-shifted
circular re-reads with crossfade) + DC-remove/normalize (FUN_00410a80). Net effect: a
lush detuned stereo pad from 120 bytes of data.

## "Didn't they cheat with real samples?" (checked 2026-08-04)

The IXS player library has a built-in cheat: in `TModule::ReadSample`
(FUN_0040be10, ptct.c 5956–6094) three sample filenames are special-cased —
**`909OH.WAV`, `909SD.WAV`, `CRASH.WAV`** — and loaded as raw PCM from `WAVE`-type
PE resources (IDs 0x320–0x322) instead of from synthesized data. The same three
names sit in Wothke's IXSPlayer 1.20 wasm, so this is a standard IXS mechanism
(presumably used by other CS/TBL modules), not Aardbei code. Bonus string next to
them: `no stereo sams allow`.

**But in PTCT the cheat never fires — both versions are 100 % synthesized:**
- Final `PTCT.exe` carries **no WAVE resources** (only icons, a dialog, RCDATA 102)
  and no RIFF data anywhere.
- All 87 sample headers in `wnoise.ixx` reference synth-rendered virtual files
  (`SEQ1L.WAV`, `B1.WAV`, `_909SDL.WAV`, …) — none matches the three magic names.
- The module instead contains FM patches `Openhh`, `_909sd`, `_crash` — the exact
  three sounds the cheat covers. The `_` prefixes read like renamed replacements:
  CS apparently substituted synthesized recreations for the formerly sampled drums.
- Party version (frame.exe, unpacked 2026-08-04 via `work/re/unpack_upx071.py` —
  UPX 0.71/NRV2B, modern upx refuses it): identical `wnoise.ixx` byte-for-byte,
  and its (earlier, leaner) player build lacks the WAV-resource path and the
  `Itmodule.cpp` string entirely. No RIFF/WAVE data there either.

Party pack has 19 files vs the final's 17: adds `_.atg`, `aard.atg`, and the
credits textures are per-person (`cr_ile/cr_inopia/cr_oyise/cr_rob/cr_snq/cr_cs`).
Extracted to `work/unpacked/party-extracted/`.

## Engineering details worth noting

- **Temp-file cache**: FUN_0040b7b0 hashes the module name (rotate-XOR), makes a
  GetTempFileNameA cache file, and reserializes the fully-rendered module (FUN_0040cdf0
  tag format) — second run of the intro skips all synthesis.
- **Loading bar** = synthesis progress callback (progress 0..1 per instrument).
- Playback: 512 KiB looping waveOut ring, one tracker tick per block, MMX mixer
  (FUN_0040d640 family: pmulhw/paddsw, 8/16-bit, ping-pong loops) — see MUSIC_PLAYER.md.
- Size levers, summed: delta-coded patches + varints + SoA + lowercase-empty-record
  tags + identity-notemap flag + "same patch, different cutoff" banks ⇒ 4:10 of music
  in 17 KB compressed.

## Function map (ptct.c)

| addr | role |
|---|---|
| FUN_0040b7b0 | IXS top: header, temp-cache probe, orchestrates sections |
| FUN_0040b9e0 | per-instrument: delta-decode record, call synth, emit L/R samples |
| FUN_0040e770 | FM voice render (6-op chain, filter, post-FX) |
| FUN_0040f990 | per-step param load (op ratios/levels, decays via SQRT×9) |
| FUN_0040f6e0/f730 | 2-pole resonant filter (L/R instances) |
| FUN_0040f780 | noise-drive + hard clip |
| FUN_0040f800 | pitch glide (slide steps) |
| FUN_0040f910 | linear fade-out/declick of last N samples |
| FUN_0040fd40 | randomized multi-tap stereo reverb (srand 0xDEAD−x) |
| FUN_0040e6b0/e6f0 | saw osc / variable-width pulse osc (carrier alternatives) |
| FUN_00410c80+ | "Chord" stream synth: wavetable score + granular smear |
| FUN_0040be10 / 0040cdf0 | tagged IT-module reader / cache writer |
| FUN_0040d640..e450 | MMX IT mixer channel renderers (playback only) |

Parser used for the data dumps: `work/re/parse_ixs.py`; layout facts above were
verified against the real `wnoise.ixx` bytes.
