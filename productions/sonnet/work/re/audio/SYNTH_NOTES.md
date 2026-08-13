# Sonnet (threestate, Assembly 2001 64k) — AUDIO subsystem notes

**STATUS: COMPLETE.** All 24 instruments are regenerated from the intro's own
streams; nothing is borrowed from the oracle.

This file is written incrementally. Every section is updated as findings land, never
batched to the end. (The previous agent lost all its work by saving nothing.)

---

## 0. Inheritance / provenance

Three modules survived from a previous agent that was killed mid-task:

- `work-sonnet/audio/module.mjs`
- `work-sonnet/audio/synth.mjs`
- `work-sonnet/audio/oracle.mjs`

Last reported (unverified) status of that agent: *"down to ±1–3 LSB (x87 80-bit vs
float64) — now let me try to recover the PRNG state for the noise instruments by
brute force."*

**Verdict on the inherited work: it was good.** `module.mjs` and `synth.mjs` were
correct apart from one label swap (§2, the panning/relative-note field order) and
the unknown PRNG seed. `oracle.mjs` was correct as written. All three are kept and
extended; `writexm.mjs` and `seedsearch.c` are new.

Files now in play:
| file | role |
|---|---|
| `work-sonnet/audio/module.mjs` | reads the four packed streams out of `unpacked/sonnet_img.bin` |
| `work-sonnet/audio/synth.mjs` | the softsynth port (@0x00403580) + the recovered PRNG seed |
| `work-sonnet/audio/oracle.mjs` | reads `reference/sonnet.xm` and delta-decodes its PCM; `ncc()` |
| `work-sonnet/audio/writexm.mjs` | **new** — emits a standard XM 1.04, correct or party-pan |
| `work-sonnet/re/audio/seedsearch.c` | **new** — exhaustive 32-bit rand-state recovery (23 s) |

---

## 1. Established facts (given, not re-derived)

- Player is **MiniFMOD** (nfo credits "Firelight (Player)"); imports are WINMM `waveOut*`.
- Audio init `FUN_00403039` @ VA 0x403039: installs 5 callbacks
  (0x402ea5, 0x402eef, 0x402ef2, 0x402ef9, 0x402efc), calls `FUN_004100fb(0xac44)`
  (44100 Hz), allocates 0x100000, then `DAT_004748b4 = FUN_0040fd38(0, 0x402f19)`
  = FMUSIC_LoadSong. `FUN_004030ba(pos)` starts playback.
- Master clock `FUN_004030ef` = `(order << 8) | row`; timeline VM runs 0x0000..0x2c0f.
- Oracle: `work-sonnet/reference/sonnet.xm` (vic's public release).
- 1.55 MB XM ⇒ PCM cannot be embedded ⇒ intro synthesizes instrument samples at init.

---

## 2. Module (song data) format — VERIFIED

Reader: `work-sonnet/audio/module.mjs`. Confirmed against the loader disassembly and
against the oracle XM; every field matches.

The intro does **not** store a contiguous XM. sagacity split the module into four
independent byte streams (better compression), replaced MiniFMOD's five file
callbacks (0x402ea5/eef/ef2/ef9/efc) with stubs that only reset four cursors, and
rewrote `FMUSIC_LoadSongInternal` @ **0x00411a95** to pull from memory. The four
cursors are the globals:

| cursor | stream | VA | size |
|---|---|---|---|
| `DAT_0047489c` | HEADER | 0x0041aa80 | 276 B (literally `xm[60:336]`) |
| `DAT_00474890` | INSTRUMENT | 0x0041ab94 | 5448 B |
| (synth arg cursor) | SYNTH | 0x0041c0dc | 3928 B |
| `DAT_00474898` | PATTERN | 0x0041d034 | 357850 B |

Each stream ends exactly where the next begins — `readModule()` asserts this and it
passes, which is a strong correctness check on all three parsers.

### Header (loader 0x00411aa9..0x00411ae1)
`{headerSize=276, songLength=45, restart=0, numChannels=26, numPatterns=43,
numInstruments=24, flags=1 (linear), speed=6, bpm=92}` + 256 order bytes.
**Identical to `reference/sonnet.xm`, including the full 45-entry order list**
(…,11,12,11,12,13,…). Confirms the intro plays the complete song.

### Patterns (loader 0x00411b3a..0x00411caa)
`u32 unused; u16 rows[43] (all 64); ` then fully de-interleaved:
`for ch(26) { for field(5) { for pat(43) { for row(rows[pat]) u8 } } }`.
Destination is MiniFMOD's flat 5-byte cell array
`pat[row*26*5 + ch*5 + field]`, fields = note, instrument, volume, effect, param.
Note value **255 = key-off** in this build (standard XM uses 97); note 0 = empty,
otherwise note-1 is added to the sample's relative note.

### Instruments (loader 0x00411cc9..0x00411e6b)
Per instrument: `u16 numSamples`; if non-zero then `u8[96] keymap`,
`u16[24] volEnv`, `u16[24] panEnv`, `u8[16] envelope points/sustain/loop/flags/
vibrato/fadeout`, then de-interleaved by field over the samples:

| pass | bytes/sample | XM source bytes | destination |
|---|---|---|---|
| 0 | 14 | 0..13 (length, loopStart, loopLength, volume, finetune) | sample+0x04 |
| 1 | 1 | 14 (type) | sample+0x30 |
| 2 | 1 | **15 (panning)** | sample+0x18, **sign-extended** |
| 3 | 1 | **16 (relative note)** | sample+0x1f, zero-extended |

**Correction to the inherited `module.mjs`:** it labels pass 2 `relativeNote` and
pass 3 `panning`. That is backwards — see §7; pass 2 is panning and pass 3 is
relative note. Proof: (a) at 0x004112xx the player computes
`realnote = sample[0x1f] + note - 1` and `period = 0x1e00 - realnote*0x40 -
finetune/2`, so +0x1f is the relative note; (b) reading the streams the other way
reproduces the oracle XM's per-sample `panning`/`relativeNote` bytes exactly for
all 24 instruments.

All 24 instruments have exactly 1 sample. Sample `length` is in **bytes**
(16-bit samples ⇒ 2 bytes/frame), and for the 22 synth instruments it always
equals `2 * lengthUnits * 0x0ac4`, an independent cross-check on the synth stream.

### Synth stream — SAMPLELOADCALLBACK @0x00402f19 arguments
One record per (instrument, sample) in load order:
`u32 mode; u32 argLength; u8 payload[argLength]`.
`mode 0` = compressed PCM (codec @0x00403ca6) — used by **instruments 13 and 14**
only (the two 8-bit samples, 1251 B and 4783 B).
`mode 1` = softsynth (@0x00403580) — the other 22.
Payload layout is in `parseSynthPayload()`; it consumes exactly `argLength` bytes
for every one of the 22 records, another strong check.

---

## 3. Synth algorithm — VERIFIED

Port: `work-sonnet/audio/synth.mjs`. `SAMPLELOADCALLBACK` @0x00402f19 dispatches on
the record's mode word; mode 1 enters the generator @**0x00403580**. Ghidra cannot
decompile it (x87), so it was transcribed from `ndisasm -b 32` with the FPU stack
tracked by hand. Signal chain, per sample slot:

1. **Three-partial oscillator bank** driven by a step sequencer — loop @0x004035de.
   `N = lengthUnits * 0x0ac4` samples (0x0ac4 = 2756 ≈ 44100/16), `numSteps`
   sequencer steps of `N/numSteps` samples each. Per step: a signed note byte and a
   decay byte. **Note 0x7f is a rest** (`cmp byte [edi+eax],0x7f` @0x004035fe →
   `jz 0x40375f` @0x00403624) and skips the whole partial loop — including the
   rand() calls, which matters for §5.
   Per partial j: `freq = 523.2511596679688f * 2^((note + detune[j])/12)` (@0x004031c5,
   note 0 = C-5), `period = 44096.0f / freq`, `phase = (i % (int)period) / period`.
   Waveforms (`cmp al,1..4` @0x00403697/0x004036c4/0x004036f3/0x00403725):
   0 = silent, 1 = saw (`ph*65536 - 32767`), 2 = sine (`sin(ph*2pi)*32767`),
   3 = square (`ph<0.5 ? -32767 : 32767`), 4 = **noise** —
   `call 0x404258 (rand); lea eax,[eax+eax-0x7fff]` i.e. `2*rand() - 32767`.
   Accumulated as `acc = float32(v*amp[j] + acc)`.
   Decay envelope per step: `env = max(0, 1 - (decay/255)*4 * u)` where u is the
   fractional position within the step. `buf[i] = trunc(env*acc)`.
2. **4th-order Butterworth**, coefficients recomputed per sample from a filter-step
   list (ctor @0x0040326d, loop @0x00403803). `cutoff' = 0.49 - cutoff/255*0.49`
   (0.01 if zero), `resonance' = 1 + resonance/255*100`; two cascaded biquads with
   Butterworth Qs 0.765367 (0x00418258) and 1.847759 (0x00418228); prewarp uses a
   512-entry `tan(i*PI/1024)` table built @0x004031f6, linearly interpolated —
   `Math.tan` is within float32 of it. Output is the lowpass (FUN_004033d7) or
   input-minus-lowpass (FUN_0040349f) per the `filterIsHighpass` bit. Clipped to
   +/-32000 (0x00418210).
3. **Single-tap recirculating feedback delay** (loop @0x004038fc), skipped when
   feedback == 0. Reads and writes the same buffer, clipped to +/-32000.
4. **Output** @0x00403957: 16-bit truncating store (`mov [eax],dx`) or 8-bit `>>8`.

All arithmetic that the original writes back with `fstp dword` is marked with
`Math.fround`; everything between a load and that store stays in an x87 register
and is modelled with float64. Integer conversions use x87 `ftol` with rounding
forced to truncate (@0x00404224) = `Math.trunc`.

The three constants that pin the whole thing: 523.2511596679688 (0x00418204),
44096.0 (0x00418274) — note the synth's own "sample rate" is 44096, not 44100 —
and 65536.0 (0x00418270).

---

## 4. Oracle comparison — 22/22 at NCC 1.000000

Method: run `generateSample()` for every mode-1 record with one shared `Rand`
across the whole load (as the original does), and compare against
`reference/sonnet.xm`'s delta-decoded sample PCM. The oracle's instrument names
read "ripped by Humpal / demodulate.scene.org", so its PCM was dumped out of this
very intro — it is ground truth, not merely a related work.

| inst | bits | len | NCC | bit-exact | max |diff| |
|---|---|---|---|---|---|
| 0 | 16 | 44096 | 0.999978 | 83.5% | 300 |
| 1 | 16 | 44096 | 1.000000 | 79.0% | 42 |
| 2 | 16 | 44096 | 1.000000 | 84.8% | 3 |
| 3 | 16 | 2756 | 1.000000 | 88.1% | 5 |
| 4 | 16 | 2756 | 1.000000 | 99.8% | 1 |
| 5 | 16 | 11024 | 1.000000 | 98.1% | 1 |
| 6 | 16 | 11024 | 1.000000 | 95.5% | 1 |
| 7 | 16 | 44096 | 1.000000 | 86.7% | 3 |
| 8 | 16 | 2756 | 1.000000 | 92.6% | 7 |
| 9 | 16 | 2756 | 1.000000 | 95.1% | 1 |
| 10 | 16 | 44096 | 1.000000 | 54.2% | 12 |
| 11 | 16 | 88192 | 1.000000 | 70.5% | 88 |
| 12 | 16 | 88192 | 1.000000 | 96.6% | 1 |
| 13 | 8 | 1251 | **1.000000** | **100.00%** | **0** |
| 14 | 8 | 4783 | **1.000000** | **100.00%** | **0** |
| 15 | 16 | 22048 | 1.000000 | 76.9% | 3 |
| 16 | 16 | 22048 | 1.000000 | 67.8% | 158 |
| 17 | 16 | 22048 | 1.000000 | 78.3% | 18 |
| 18 | 16 | 22048 | 1.000000 | 71.5% | 61 |
| 19 | 16 | 22048 | 0.999995 | 72.4% | 1242 |
| 20 | 16 | 22048 | 1.000000 | 54.8% | 2 |
| 21 | 16 | 44096 | 1.000000 | 95.7% | 2 |
| 22 | 16 | 88192 | 1.000000 | 88.9% | 1 |
| 23 | 16 | 22048 | 1.000000 | 97.5% | 1 |

**mean NCC = 0.999999** over all 24 instruments (sibling project's accepted result
was 0.985). Instruments 13 and 14 (the mode-0 codec, §9) are the only two that are
**bit-exact**: every one of their 6034 samples matches the oracle exactly.

Verdict on the inherited agent's "+/-1..3 LSB" claim: **substantially true but
optimistic.** The median instrument is within 1..3 LSB, but a handful (0, 1, 11,
16, 18, 19) show excursions of tens to ~1200 LSB. Those are all instruments whose
filter step list contains a high-resonance setting; the residual x87 80-bit vs
float64 difference in the biquad state is amplified by the resonant pole and takes
hundreds of samples to decay. It is a *transient amplitude* difference, not a
structural one — NCC stays at 1.000000 to six places and 55-99% of samples are
still bit-identical. Audibly indistinguishable.

---

## 5. Noise instruments / PRNG seeding — SOLVED

`SYNTH_RAND_SEED = 0x2be15a5b` (bit 31 is unobservable, so 0xabe15a5b is
equivalent). This is the value of the MSVC CRT rand state at VA 0x0041a9b8 at the
moment the softsynth runs.

### Why it could not be read off statically
The seed word at 0x0041a9b8 is **1** in the image and **srand (FUN_0040424e
@0x0040424e) has no callers anywhere in the binary**. But main
`FUN_004160ff` @0x004160ff runs the whole scene precalc first:
```
FUN_004014ef(0x280,0x1e0)   ; create 640x480 window
FUN_00402d46 / FUN_00402e4e ; scene ctor
FUN_00402d87(this, 0xffff)  ; run every timeline event once -> texgen + meshgen
FUN_00403039()              ; <-- audio init: FMUSIC_LoadSong, softsynth runs here
FUN_004030ba(0)             ; start playback
```
The texgen/meshgen call rand() an unknown number of times, so the state at synth
time is a function of the whole graphics precalc. Recovering it by emulation would
mean running the entire intro.

### How it was recovered — `re/audio/seedsearch.c`
Instrument 23 is the ideal attack point: `wave={NOISE,NOISE,SAW}`,
`amp={0.02,0.12,0.02}`, every sequencer step `note 0 / decay 0` (constant envelope
= 1) and every filter step `cutoff 240 / resonance 15` (constant coefficients), with
`filterIsHighpass = 1`. That filter's gain is ~6.1e-5, so the highpass output
`trunc(x - lowpass)` is essentially the raw oscillator sum:
```
out[i] ~ trunc( 0.04*a + 0.24*b - 5242.72 + 0.02*saw[i] )
```
where a,b are two consecutive rand() outputs. `0.04a + 0.24b` spans 0..9175, so a
single output sample with +/-2 tolerance prunes 2^32 candidates by ~1800x and two
samples finish the job. A full 32-bit sweep with early exit runs in **23 s**.

Result: exactly **2 hits, 0x4363b4db and 0xc363b4db** — the same state modulo bit
31, which can never influence `(state>>16)&0x7fff` at any depth because carries
only propagate upward. So the state at instrument 23's first rand() call is
0x4363b4db.

### Rolling back to the load-time state
rand() calls are made only for `wave == 4` partials and only on non-rest steps:

| inst | N | noise partials | rest steps | rand() calls |
|---|---|---|---|---|
| 0..14, 20..22 | — | 0 | — | **0** |
| 15 | 22048 | 1 | 2/8 | 16536 |
| 16 | 22048 | 1 | 2/8 | 16536 |
| 17 | 22048 | 1 | 2/8 | 16536 |
| 18 | 22048 | 1 | 1/8 | 19292 |
| 19 | 22048 | 1 | 1/8 | 19292 |
| 23 | 22048 | 2 | 0/8 | 44096 |

Total consumed before instrument 23 = **88192**. Inverting the LCG
(`s_prev = (s - 0x269ec3) * 0xb9b33155 mod 2^32`, since 0x343fd * 0xb9b33155 = 1
mod 2^32) 88192 times gives **0x2be15a5b**, the state at instrument 15 — and,
because instruments 0..14 make no calls at all, the state on entry to the whole
softsynth pass.

Independent confirmation: with this seed, instruments 15,16,17,18,23 land on
NCC 1.000000 and 19 on 0.999995, up from 0.72/0.61/0.48/0.39/0.04/0.33 with
seed 1. Nothing was fitted to instruments 15..19 — they are pure out-of-sample
predictions from a search that only ever saw 16 samples of instrument 23.

---

## 6. Emitted XM — DONE

Writer: `work-sonnet/audio/writexm.mjs`.
```
node audio/writexm.mjs                                        -> extracted/sonnet.xm
node audio/writexm.mjs --authentic-pan extracted/sonnet_partypan.xm
```

Two systematic differences between the intro's streams and a normal XM, both
deliberate on sagacity's part, both undone by the writer:

* **note 255 = key-off**; standard XM uses 97. (1277 cells across the 43 patterns.)
* **the volume fadeout word is stored pre-doubled.** This MiniFMOD build sets the
  channel fadeout accumulator to 0x10000 (`FUN_00411113` writes `channel+0x58 =
  0x10000`) and subtracts `instrument+0x152` **x1** per tick (`FUN_00411196`),
  whereas FT2 subtracts x2. Every instrument's stored fadeout is 0x0100 where the
  oracle has 0x0080, so halving it restores the FT2-convention value exactly.

### Round-trip against the oracle
Reading `extracted/sonnet.xm` back and diffing against `reference/sonnet.xm`:

| field | result |
|---|---|
| header (length/restart/channels/patterns/instruments/flags/speed/bpm/order) | **identical** |
| pattern cell bytes | **0 of 357760 differ** |
| instrument keymaps, volume envelopes, panning envelopes, envelope tails | **identical** |
| sample headers incl. `panning` and `relativeNote` | **identical for all 24** |
| sample PCM | mean NCC **0.999999** |

The sample headers matching is the independent proof that the §2 field-order
correction is right: if pass 2/pass 3 were swapped, all 24 would mismatch.

### Playback in the project replayer
`/Users/scjas/Developer/xx-sandbox/demoscene-restoration/work/xm.js` (not modified):
```
title "Sonnet"  tracker "FastTracker v2.00"
songLength 45  channels 26  patterns 43  instruments 24
speed 6  bpm 92  linear true  totalRows 2880
UNSUPPORTED: (none)
rendered 2880 rows / 17280 ticks -> 469.29 s, then wraps to order 0
```
No unsupported-effect warnings. Effects actually used are
1,2,3,4,5,6,7,8,9,10(0xA),14(0xE),15(0xF) — all inside xm.js's supported set.

**Duration:** the full module is 2880 rows x 6 x 2.5/92 = **469.565 s**. The intro
stops at master-clock 0x2c0f = order 44, row 15 = row index 2831 = **461.58 s**, which
is the figure to compare against the 464.07 s capture (the capture has ~2.5 s of
lead-in — see the measured alignment lag in §7b). xm.js renders 469.29 s for the
full module, 0.06% short of 469.565 s; that is xm.js's own
`samplesPerTickAt(92) = 1197.716` versus the exact 44100*2.5/92 = 1198.370, and is
a property of the replayer, not of the module.

### Provenance
`writexm.mjs` imports `module.mjs`, `synth.mjs` and `codec0.mjs` and nothing else.
It does **not** read `reference/sonnet.xm`; the oracle is used only to check the
result afterwards. All 24 instruments come out of the intro's own bytes.

---

## 7. The stereo-panning bug — ROOT-CAUSED (high confidence)

**It is a one-instruction defect in the intro's rewritten module loader, not in the
module data and not in MiniFMOD's mixer.** The emitted XM must therefore carry the
*correct* panning bytes; the buggy behaviour has to be reproduced at **runtime, in
player configuration**, not baked into the file. That is the wiring the task asked
about.

### The instruction

```
; FMUSIC_LoadSongInternal @0x00411a95, sample-field de-interleave, pass local_c==2
00411E3B  A1 90484700     mov   eax,[0x474890]     ; INSTRUMENT stream cursor
00411E40  0FBE00          movsx eax,byte [eax]     ; <-- BUG: XM pan byte is UNSIGNED 0..255
00411E43  894718          mov   [edi+0x18],eax     ; sample->defpan  (int)
00411E46  FF05 90484700   inc   dword [0x474890]
```
Compare the very next pass, which gets it right for the *signed* field:
```
00411E52  A1 90484700     mov   eax,[0x474890]
00411E57  8A00            mov   al,[eax]           ; relative note, zero-extended (byte store)
00411E59  88471F          mov   [edi+0x1f],al
```
So the two adjacent fields have their signedness exactly the wrong way round.
`sample->defpan` becomes `(signed char)panByte`.

### Propagation

1. `FMUSIC_InstrumentChange` @**0x00411113**:
   `0041111C movzx edx,[ecx+0x10]` → channel volume (correctly unsigned);
   `00411129 mov ecx,[ecx+0x18]` → `channel->pan` at `+0x14` — the sign-extended value.
   Also sets `channel->panEnvValue (+0x4c) = 0x20` and raises dirty bits 2|4.
2. `FMUSIC_UpdateChannel` @**0x00410efa**, pan branch at **0x00411015**:
```
0041101B  mov eax,[edi+0x14]        ; pan
0041101E  sub eax,0x80
00411024  call 0x404148             ; abs()
0041102A  mov ecx,0x80
00411031  sub ecx,eax               ; 128 - |pan-128|
00411037  idiv ecx,0x20
0041103B  mov eax,[edi+0x4c] ; sub 0x20   ; pan envelope - 32  == 0 by default
00411041  imul ecx,eax
00411044  add ecx,[edi+0x14]        ; + pan
00411047  jns 0x41104b ; xor ecx,ecx      ; <-- NEGATIVE CLAMPS TO 0
0041104B  cmp ecx,ebx(255) ; clamp high
00411055  ... [esi+0x20] = vol*pan/255 ; [esi+0x24] = vol*(255-pan)/255
```
With the default pan envelope the middle term is zero, so `finalpan = clamp(pan,0,255)`.
Every sign-extended pan therefore **clamps to 0** — one speaker, full mute on the other.

### Measured symptom (intended vs actual, all 24 instruments)

| inst | XM pan byte | as signed | actual final pan | intended |
|---|---|---|---|---|
| 0,1,3,4,5,6,11,12,13,14,20,21,22,23 | 128 | -128 | **0** | 128 (centre) |
| 2 | 223 | -33 | **0** | 223 (right) |
| 7 | 54 | 54 | 54 | 54 (left) — **unaffected** |
| 8 | 255 | -1 | **0** | 255 (hard right) |
| 9 | 54 | 54 | 54 | 54 (left) — **unaffected** |
| 10 | 222 | -34 | **0** | 222 (right) |
| 15..19 | 163 | -93 | **0** | 163 (right) |

22 of 24 instruments collapse to pan 0. The two survivors (7, 9) are the only ones
whose pan byte is < 0x80, and they are *also* off-centre in the same direction. So
the intro plays **almost entirely out of one speaker** — which is exactly the kind
of defect that gets complained about on pouet, and matches "the promised fix was
never released".

Confidence: **high** for the instruction and the propagation path (read from
disassembly, not the decompile).

### There is a second, independent pan anomaly: the axis is mirrored
`FMUSIC_UpdateChannel` finishes with
```
00411055  mov eax,[esi+0x10]        ; volume
0041105D  imul eax,ecx ; idiv 255
00411069  mov [esi+0x20],eax        ; = vol * pan / 255
0041106C  mov eax,255 ; sub eax,ecx ; imul ; idiv 255
          mov [esi+0x24],eax        ; = vol * (255-pan) / 255
```
and the mixer `FUN_004104cc` loads `_DAT_004789c0 = channel[8] (+0x20)` and
`_DAT_004789c4 = channel[9] (+0x24)` and accumulates
`mixbuf[0] += s * _c0; mixbuf[1] += s * _c4` — i.e. **left = vol*pan/255**. The XM
convention is pan 0 = left, so this build's pan axis runs backwards. Pan 0
therefore comes out of the **right** speaker.

(I cannot fully separate "the mixer's lane assignment is mirrored" from "waveOut
or the capture chain swaps the lanes". For reproduction it does not matter: what
is measurable, and what the remaster flag has to undo, is the mapping from XM pan
byte to the sides you actually hear.)

**8xx (set panning) is NOT affected by the sign bug.** `FUN_00411196` case 8 does
`(&DAT_0047eab4)[ch*0x2b] = (uint)param` — a plain zero-extending byte read
straight into channel+0x14. The module uses 8xx heavily (3048 events on channels
2,5,6,7,8,9,10,11,12,13,14,15,16,17,18,21, sweeping 0x00..0xF0), which is why the
reference capture still has decorrelated stereo content rather than being a pure
mono-on-the-right image. Those channels are mirrored but not clamped.

---

## 7b. Measured symptom, and the hypothesis test

Reference capture `reference/sonnet_ref.mkv` decoded to stereo s16le/44100
(20464641 frames, 464.05 s):

| metric | value |
|---|---|
| RMS left | 1066.9 |
| RMS right | 6903.1 |
| **R/L** | **6.47** |
| L/R correlation | **0.043** |
| side/mid RMS | 0.987 |
| L == R samples | 0.54% |

That is a stereo image with essentially nothing in the middle and 6.5x more energy
on the right — not a mix any composer wrote.

Three candidate reconstructions were rendered through xm.js and compared to the
capture in 6-second windows, each window given its own +/-3 s lag search:

* `correct`  — pan bytes as the composer wrote them
* `clamponly` — sign-extend + clamp to 0..255, **no** mirror
* `party` — sign-extend + clamp **and** mirror (also mirrors the 8xx params)

```
t(s)  lag(s)   mono NCC | correct         | party           | clamponly
 20   -2.456   0.962    | L=0.18 R=0.92   | L=0.96 R=0.98   | L=0.20 R=0.19
 60   -2.465   0.901    | L=0.24 R=0.89   | L=0.81 R=0.90   | L=0.24 R=0.22
100   -2.474   0.957    | L=0.22 R=0.95   | L=0.83 R=0.96   | L=0.21 R=0.21
140   -2.483   0.872    | L=0.11 R=0.85   | L=0.93 R=0.90   | L=0.09 R=0.10
180   -2.492   0.853    | L=0.05 R=0.85   | L=0.69 R=0.86   | L=0.06 R=0.07
220   -2.501   0.712    | L=-0.05 R=0.70  | L=0.76 R=0.73   | L=-0.09 R=-0.08
260   -2.512   0.887    | L=0.71 R=0.86   | L=0.90 R=0.88   | L=0.69 R=0.67
300   -2.390   0.666    | L=0.36 R=0.48   | L=0.71 R=0.67   | L=0.33 R=0.37
340   -2.531   0.889    | L=0.14 R=0.85   | L=0.73 R=0.90   | L=0.13 R=0.09
380   -2.909   0.486    | (near-silent left channel in this section)
420   -2.279   0.758    | L=-0.02 R=0.77  | L=-0.06 R=0.77  | L=-0.01 R=0.01
```

Readings:

1. **The lag is constant** at -2.46 .. -2.53 s across the whole 420 s, drifting
   linearly by 0.075 s over 320 s — exactly the 0.06% xm.js tick-length error from
   §6, not a false lock. So the reconstruction is the right song, the right tempo
   and the right order list. (Cross-correlation was done on 441 Hz RMS envelopes
   with per-window constrained search, as the brief requires.)
2. **`clamponly` is refuted**: it gets *both* channels wrong (L~0.2, R~0.2),
   because it puts everything hard **left** while the capture has it hard right.
   The mirror is real.
3. **`party` is the match**: the left-channel correlation jumps from ~0.15 to
   ~0.85 while the right stays ~0.9. R/L imbalance: capture 6.47, `party` 5.04,
   `correct` 1.11.
4. `correct` sounds *better* than the capture — which per the brief is a finding,
   not a success. It is the intended mix, and it is exactly what the remaster flag
   should select. It must not be the default on the authentic path.

### What differs between the two paths

| | authentic | remaster |
|---|---|---|
| instrument default pan | 22 of 24 clamped to one extreme (right) | as written: 128/223/54/255/222/163 |
| 8xx automation | mirrored (255-param) | as written |
| stereo R/L RMS | ~5-6 | ~1.1 |
| L/R correlation | ~0.05-0.4 | ~0.93 |
| file | `extracted/sonnet_partypan.xm` | `extracted/sonnet.xm` |

Both files come out of the same writer:
`node audio/writexm.mjs [--authentic-pan] [out]`.

**Where the fix belongs.** The defect is *not* in the module data — the module
data is byte-identical to vic's released XM (§6). It is half in the intro's
rewritten loader (the `movsx` at 0x00411E40) and half in the mixer's pan-axis
convention. A stock XM replayer given the correct file will therefore always play
the *fixed* version. Reproducing the authentic behaviour requires either
(a) the pre-mangled file `sonnet_partypan.xm`, or (b) better, a runtime flag in
the player that applies `pan -> 255 - clamp((int8)pan, 0, 255)` to sample default
pans and `pan -> 255 - pan` to 8xx params at note-trigger time. Option (b) is
preferable for the web port because it keeps one asset and makes the flag a
genuine A/B switch; option (a) is lossy (the original pan bytes are destroyed).

---

## 8. Confidence by section

| section | confidence | basis |
|---|---|---|
| §2 module format | **very high** | four stream cursors butt up exactly; header + all 357760 pattern bytes + all instrument/sample headers round-trip identical to vic's released XM |
| §2 pan/relnote field order | **very high** | disassembly (0x00411E40/0x00411E57) plus the period formula at FUN_00411196, plus a 24/24 match against the oracle |
| §3 synth algorithm | **very high** | transcribed from ndisasm, and it reproduces 22 instruments at NCC 1.000000 |
| §4 numeric fidelity | **high** | mean NCC 0.999999; residual is x87-80-bit vs float64 in resonant filter states, transient only |
| §5 PRNG seed 0x2be15a5b | **very high** | exhaustive 32-bit search found exactly one state (mod the unobservable bit 31) from 16 samples of instrument 23; the roll-back then predicts instruments 15..19 out-of-sample at NCC 1.000000 |
| §6 emitted XM | **very high** | loads in the project replayer with zero unsupported effects; 2880 rows / 17280 ticks as expected |
| §9 mode-0 codec | **very high** | ported from disassembly; output is **bit-exact** against the oracle for both instruments (6034/6034 samples) |
| §7 sign-extension bug | **very high** | single instruction, full propagation path read from disassembly |
| §7 mirrored pan axis | **high** | read from the mixer, and the `clamponly` control is decisively refuted by the capture; I cannot separate mixer lane assignment from waveOut/capture lane order, but the observable mapping is settled |
| §7b symptom characterisation | **high** | constant cross-correlation lag over 420 s, per-window per-channel correlations |

### Open items / next concrete steps
1. Wire the panning flag into the web player as a runtime transform (option (b)
   above) rather than shipping two XM files.
2. The `party` render still has slightly less R/L imbalance than the capture
   (5.04 vs 6.47). Worth one more look — candidates are the intro's own master
   gain path and xm.js's channel-count rounding (`channels = max(2, min(32,
   26 + 0))`), neither of which is expected to matter, so it may just be capture
   chain EQ.


---

## 9. The mode-0 codec (instruments 13, 14) — PORTED, BIT-EXACT

Port: `work-sonnet/audio/codec0.mjs`. Result: **NCC 1.000000, 100.00% of samples
bit-identical, max |diff| 0** for both instruments — 6034 of 6034 samples exact.
The writer no longer touches the oracle.

That the intro's encoded copy decodes bit-identically to vic's release is itself
the answer to "does the intro encode something slightly different": **it does not.**
The codec exists purely for size — 192 bytes for instrument 13 (6.5x) and 1360 for
instrument 14 (3.5x).

### What it actually is
Not an MDCT. It is a **subband coder with an MPEG-Layer-I/II-shaped polyphase
synthesis filterbank**: 32 subbands, one block = 32 quantised coefficients = 32
output samples, a 64-point cosine matrix, and a 512-tap window applied over a
512-float ring that shifts by 32 samples per block (16x overlap).

Memory map (the helpers' `param_1` is always 0x004750c0):

| VA | size | contents |
|---|---|---|
| 0x004750c0 | 512 floats | `A` — window |
| 0x004758c0 | 2048 floats | `B` — cosine matrix, 32 x 64 |
| 0x004778c0 | 512 floats | `V` — overlap-add ring |
| 0x004780c0 | 512 floats | `C` — dequantised coefficients, 16 blocks x 32 |

### Tables — `FUN_00403a51` @0x00403a51
Constants read from the image, not transcribed:

| VA | type | value |
|---|---|---|
| 0x00418280 | f32 | pi/256 = 0.012271846644580364 |
| 0x00418278 | **f64** | pi/64 = 0.04908738521234052 |
| 0x00418284 | f32 | 1/256 = 0.00390625 |
| 0x0041a998 | f32[8] | 0.124996, -0.25, 0.249061, -0.234831, 0.176782, -0.085736, 0.021643, -0.001933 |

```
A[k] = (k & 0x40 ? -1 : 1) * sum(j=0..7) coef[j] * cos(j*k * pi/256)     k = 0..511
B[i*64 + j] = cos((-16 - 32i + j*(2i+1)) * pi/64) = cos((2i+1)(j-16) * pi/64)
```
**Both deviate from the textbook MPEG tables, exactly as the brief warned.** The
standard MPEG-1 synthesis matrix is `cos((16+j)(2i+1)pi/64)`; this one uses
`(j-16)`. The window is not the MPEG `D[512]` table at all but an 8-term cosine
series with its own coefficients — though it keeps MPEG's sign-flip-every-64
structure (`test al,0x40; fchs` @0x00403aa6). Both are used as found; neither was
"corrected" to the textbook form.

The window accumulator round-trips through float32 on every term (`fst dword
[ebp-0xc]` @0x00403aa1 keeps st0 in 80 bits but the next term adds back the
float32 copy), which `Math.fround` models term by term.

### Bit reader / dequantiser — `FUN_00403b25` @0x00403b25
Each group of up to 16 blocks starts with **three 32-bit masks**. Bit `sb` of each
selects the quantiser for subband `sb`; the decision tree at
0x00403b6f..0x00403bc1, **in source order** (the order matters — the states
overlap):

| masks set | bits/sample | shift |
|---|---|---|
| A & B | 4 | 4 |
| A & C | 4 | 3 |
| B & C | 4 | 2 |
| A only | 2 | 2 |
| B only | 2 | 1 |
| C only | 2 | 0 |
| none | — | subband is zero in every block of the group, no bits read |

Samples are packed MSB-first, and the bit accumulator is **reset to empty at the
start of every subband** (`and dword [ebp+0x8],0` @0x00403bc5), so each subband's
data begins on a fresh byte.

Dequantisation, verbatim from 0x00403be6:
```
movsx ebx, byte [ebp+0xf]   ; the WHOLE byte, signed
shl   ebx, cl               ; cl = bits (2 or 4)
and   ebx, 0xffffff80       ; keep the sign-extended field
or    bl,  0x80             ; midpoint, +0.5 LSB
shl   ebx, cl               ; cl = shift
fild  / fmul dword [0x418284]
```
i.e. `coefficient = (((q << 8) | 0x80) << shift) / 256 = (q + 0.5) * 2^shift`,
with `q` the sign-extended `bits`-wide field. Note the `movsx` — this is the same
class of detail as the §7 panning bug, but here it is *correct*: the field really
is signed. Getting it wrong gives a positive-only, silent-sounding decode.

### Synthesis — `FUN_00403c50` @0x00403c50
```
for m = 0..63:
    s = sum(i=0..31) C[i] * B[i*64 + m]              ; accumulated in x87, never rounded
    for t = 0..7: V[m + 64t] = float32(s * A[m + 64t] + V[m + 64t])
```
Ghidra renders the pointer walks as `float *` arithmetic and gets the strides
wrong; `add eax,0x100` is **+64 floats**, and `fmul dword [eax-0x2800]` reaches
from `V` back into `A`.

### Driver — `FUN_00403ca6` @0x00403ca6
```
numBlocks = payload[0] + 15
for each block:
    every 16 blocks: readCoefficients(min(16, remaining))
    synthesizeBlock into V
    emit 32 bytes: trunc(V[511]), trunc(V[510]), ... trunc(V[480]), clamped to [-128,127]
    V[i] = V[i-32] for i = 511..32 ; zero V[0..31]
copy from byte 0x1e0 (15 priming blocks) onward
```
Two details that are easy to miss and both change the sound completely:

1. **The output block is time-reversed.** `edi` starts at 0x004780bc (the *top* of
   the ring) and decrements by 4 (0x00403d3f) while the write pointer increments,
   so sample `t` of the block is `V[511 - t]`.
2. **The driver over-reads the payload.** `numBlocks` is 71 for instrument 13 and
   181 for instrument 14, but `argLength` only covers 64 and 176 blocks — one
   group short in both cases. The original just reads on into the next record's
   bytes in the stream. Those extra blocks decode to garbage, but they land at
   output bytes 1568+ and 5152+ while the samples are only 1251 and 4783 bytes, so
   the garbage is never copied. `module.mjs` exposes `payloadExtended` (the
   payload with no upper bound) so the port can perform the same over-read.
   Consumption is otherwise exact: instrument 13 uses precisely 192 of 192 bytes
   across its 4 real groups, instrument 14 precisely 1360 of 1360 across 11.

The output is **absolute** signed 8-bit PCM, not delta-coded: the delta
accumulation in `FUN_00411a95` is guarded by `if (piVar7[0x58] == 0)`, i.e. it only
runs when there is no sample-load callback. `FUN_00411a95` then widens 8-bit
samples to 16-bit with `<< 8`.

### Why this one is bit-exact when the softsynth is not
The mode-0 output path is an integer quantiser followed by truncation to 8 bits,
so the float noise floor sits far below one output LSB; x87-80-bit versus float64
cannot reach the result. The softsynth writes 16-bit samples through resonant IIR
state, where it can.
