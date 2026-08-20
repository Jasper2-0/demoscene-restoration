# BASS.DLL stub — COMPLETE

Goal: make the show clock an **input**, so a frame is addressed by position
rather than sampled from a moving show. The current oracle seeks via
`Script.txt`'s `[mp3]` offset, which works and is verified, but it samples a
real-time run; a stub makes sampling frame-exact and out-of-order.

Genoaux imports **11** BASS entry points:

```
BASS_Init  BASS_Free  BASS_Start  BASS_GetVersion
BASS_StreamCreateFile  BASS_StreamPlay
BASS_MusicLoad  BASS_MusicPlayEx  BASS_MusicSetPositionScaler
BASS_ChannelGetPosition  BASS_ChannelSetPosition
```

## Exports are undecorated, with ordinals

The shipped `BASS.DLL` exports **80** names, all undecorated (`BASS_Init`, not
`_BASS_Init@20`), each with a stable ordinal. The stub can therefore export by
plain name via a `.def` file. Ordinals for the 11 above:

| export | ord | | export | ord |
|---|---|---|---|---|
| `BASS_ChannelGetPosition` | 13 | | `BASS_MusicPlayEx` | 47 |
| `BASS_ChannelSetPosition` | 24 | | `BASS_MusicSetPositionScaler` | 50 |
| `BASS_Free` | 28 | | `BASS_Start` | 73 |
| `BASS_GetVersion` | 39 | | `BASS_StreamCreateFile` | 76 |
| `BASS_Init` | 41 | | `BASS_StreamPlay` | 80 |
| `BASS_MusicLoad` | 45 | | | |

## Argument widths — measured from the caller

These are **stdcall**, so the callee cleans the stack and a wrong count corrupts
the caller. Reading them from the real DLL's `ret N` epilogues **does not work:
BASS.DLL is packed** (entropy 7.99, nameless sections, `0x3d000` virtual against
`0x159f4` raw, entry point in a small second section, and the export RVAs are
zero-filled on disk — the code exists only after the unpacker runs).

So they were taken from the **caller**, which METHOD.md makes the authority
anyway: resolve each MSVC jump thunk (`jmp dword [IAT slot]`) to its import, find
every `call thunk`, and count the pushes in the preceding block. All 11 came back
unanimous — a single push-count at every site — and all 11 then agreed with
published BASS 1.x prototypes. **The agreement is a result, not the assumption
the work started from.**

| import | sites | args | | import | sites | args |
|---|---|---|---|---|---|---|
| `BASS_Init` | 1 | 4 | | `BASS_MusicPlayEx` | 1 | 4 |
| `BASS_GetVersion` | 1 | 0 | | `BASS_MusicSetPositionScaler` | 1 | 2 |
| `BASS_Start` | 1 | 0 | | `BASS_ChannelGetPosition` | 2 | 1 |
| `BASS_Free` | 2 | 0 | | `BASS_ChannelSetPosition` | 1 | 2 |
| `BASS_StreamCreateFile` | 1 | 5 | | `BASS_StreamPlay` | 1 | 3 |
| `BASS_MusicLoad` | 1 | 5 | | | | |

The same scan read the version gate straight out of the call site:
`call BASS_GetVersion; cmp eax, 0x80000` — **Genoaux demands BASS 0.8**, matching
the Mikrostrange nfo's "ian luck for bass v0.8" and the byte-identical DLL those
four productions share. Liquid wants 1.6, so the returned version is an input.

## Behaviour the stub must implement

- `BASS_GetVersion` — **version-gated per production.** Genoaux/Channel 5 ship
  the Feb-2000 DLL; Liquid checks for exactly 1.6 (`cmp eax,0x00060001`) and
  prints "bass 1.6 not found" otherwise. Make the returned version settable.
- `BASS_ChannelGetPosition` — the whole point. Return a scripted byte position
  read from the environment (e.g. `HJB_POS_BYTES`) or a control file, so the
  renderer becomes a deterministic function of `(script, position)`.
  Genoaux converts with `position / 176.4` to ms, so the caller's units are
  bytes at 44.1 kHz stereo 16-bit.
- `BASS_Init` / `BASS_Start` / `BASS_StreamCreateFile` / `BASS_MusicLoad` —
  succeed, return distinct non-zero handles. Per METHOD.md's recorder lesson,
  give each creating call a **distinct** handle so later binds are attributable.
- `BASS_ChannelSetPosition` — record the requested position and let it seed what
  `BASS_ChannelGetPosition` returns.
- `BASS_StreamPlay` / `BASS_MusicPlayEx` / `BASS_MusicSetPositionScaler` /
  `BASS_Free` — succeed and do nothing.

## Build

`gcc-mingw-w64-i686` in the winebox image; `-shared` with a `.def` listing the
undecorated names. Drop the result in beside the exe (Wine prefers the local
DLL) — no `WINEDLLOVERRIDES` needed since the demo loads `BASS.DLL` from its own
directory.

## The second clock

Pinning the BASS position froze part scheduling but **not the show**: at a fixed
position the trace still varied frame to frame. Genoaux also imports
**`GetTickCount`** (Moments leans on it harder still — its timeline is a
hardcoded table on a GetTickCount clock). Freezing one clock and declaring the
program deterministic would have been exactly the kind of confident, wrong
measurement METHOD.md §8 collects.

The stub takes that clock too, by patching the **main module's IAT** entry for
`GetTickCount` from `DllMain` — walking the import descriptors by name, since a
thunk's position is a build detail while its name is the contract. Nothing on
disk changes; the original executable is untouched and the patch lives only in
the running process.

## Verified

With both clocks pinned (`HJB_POS_MS=20000 HJB_TICKS=20000`, steps 0), two
independent runs of `Genoaux.exe` produced:

- **161,833 GL calls and 29 frames — identical in both runs**
- **the full frame-digest sequence identical**
- **byte-identical GL streams** after stripping Wine thread ids and
  `glTexImage2D`'s host `pixels` pointer
- a steady frame of 3,482 ops / 480 display lists

Position discriminates as it should: `HJB_POS_MS=150000` (part 2, `Black.hjb` +
fullscreen overlay) yields ~185 k calls against ~584 k at 20 000, and repeat runs
at 150 000 share 11/11 frame digests and the same dominant frame.

**One bug this found in itself.** The first version honoured
`BASS_ChannelSetPosition`, and the engine promptly called it with 0 from an
offset-0 script — silently resetting the clock just set, so runs at 20 s and
150 s both rendered t=0 and *looked* like plausible different runs. A forced
clock is an override, not a default.

**Status: complete.** `make` in this directory builds `BASS.DLL`; drop it beside
the exe (a local DLL wins) and drive it with the environment variables above.
