# MUSIC_PLAYER — IXS → IT flow and the accessors that matter

Audio for the port is baked offline; this file documents only what the engine needs from the
player: the load flow (to confirm what the audio *is*) and the position accessors that drive
sync (see SYNC.md for the full chain).

## Load flow (confirmed)

```
FUN_004037b0  loadMusic
  archiveOpenFile("data\wnoise.ixx")
  FUN_00409430(data, LAB_004035f0 /*loading-bar callback*/)
    player = FUN_00409770(waveOutGetNumDevs()!=0xffffffff, 1, 1)   ; FUN_00409530 ctor
    player->vt[0](data,0,0,&out)  →  FUN_0040b760(synthModule, data, ...)
```

`FUN_0040b760` (ptct.c 5302):
- `*(u32*)data == 0x21535849` (`"IXS!"`) → **`FUN_0040b7b0`**: the IXS path. Parses the IXS
  header (three section offsets + 4-byte field + 32-byte name), **synthesizes all sample
  waveforms and assembles a complete IT module image in memory** (progress reported through
  the callback, 0..1 → loading bar). The synthesized IT then goes through the normal IT
  loader below. (The synth section ≈ 0x40b7b0–0x40cd00 — internals not needed for the port.)
- else → **`FUN_0040c500`**: plain IT loader, magic `IMPM` (0x4d504d49) checked at ptct.c 6532
  (and again at 6617 for the free-path). If the passed buffer is not `IMPM` at offset 0 it
  mallocs and re-reads — i.e. the in-memory synthesized IT lands in a malloc'd buffer owned
  by the module object.

Parsed IT module object layout (subset, needed for position semantics):

| offset | content |
|---|---|
| +0x00..0xBF | IT header copy (orders count +0x20, instr count +0x22, sample count +0x24, pattern count +0x26, initial speed +0x32, initial tempo +0x33) |
| +0xC8 | order list (bytes; 0xFE = skip marker, 0xFF = end/wrap) |
| +0xCC | instruments, +0xD0/+0xD4 samples/sample data |
| +0xD8 | pattern headers (8 bytes; +0 dataLen u16, +2 **rows u16**) |
| +0xDC | packed pattern data; `FUN_0040c880(idx)` unpacks to cache +0xE0 |

## Runtime / streaming (context only)

- `playerPlay` (`FUN_00409620` → `FUN_00409bd0`): resets position to (order = DAT_0041f08c
  from `musicPlayFrom`, row 0), spawns a mixer thread (proc 0x409b10, guarded by a critical
  section).
- Mixer thread → `FUN_00409e10`: renders **one tracker tick per block** into a 512 KiB
  looping waveOut buffer (44100 Hz; stereo/16-bit per driver flags DAT_0041f080, rate
  DAT_0041f088). Every block descriptor records the `(order,row)` its audio belongs to.
- waveOut is opened/written in `FUN_0040b040` region (ptct.c 4954–4991); playback cursor via
  `waveOutGetPosition` (`FUN_0040b3e0`).

## Position/row/order accessors (the ONLY sync surface)

| accessor | returns |
|---|---|
| vt[5] = 0x4096d0 → `FUN_0040a760` | `synth+0x3218` = **`(order<<8) | row` of the currently audible block** (latency-compensated through the block ring, `FUN_0040d3e0`) |
| vt[6] = 0x4096e0 → `FUN_0040a770` | seconds of audio played = (playCursorBytes − startBytes) / bytesPerSec — **not used by the demo** |
| vt[7] = 0x4096f0 → `FUN_0040a7d0` | setPosition(order<<8 \| row): row → +0x3216, order → search order table from (hi−1)+1 skipping 0xFE; **used once**, `musicPlayFrom(0)` at startup |
| `FUN_00409500(&order,&row,&zero)` | demo-side wrapper: order=AH, row=AL, third out always 0 |

### Exact mapping for an external sync map

The audible position advances in whole rows: row R of order O becomes current at the moment
the audio block that starts row R crosses the DAC. For the port, generate from the baked
render a table of `[rowStartTimeSeconds, order, row]` for every row actually played (honouring
the same order list, including 0xFE skips and any pattern-break/jump effects the IT contains),
then `musicGetPos(t)` = entry with the greatest start time ≤ t. That reproduces
`FUN_0040a760` exactly (±one mixer-thread scheduling quantum, which the original had too).

The demo never queries pattern number, tick, or channel data — only `(order,row)`.
