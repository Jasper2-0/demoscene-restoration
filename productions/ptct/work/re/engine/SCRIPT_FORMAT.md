# script.as1 — Exact Format & Interpreter Semantics

Derived from the interpreter code, not from pattern-guessing:
- Loader `FUN_00415e60` / `FUN_00415e20` (ptct.c lines 13507–13551)
- Interpreter `FUN_00415ed0` (ptct.c lines 13554–13716)
- Call-site disassembly of `FUN_00409500` at 0x415f15 confirms the three position outputs.

## File layout

```
u32  count            ; 0x97 = 151 in the shipped file
count × 8-byte records (packed, little-endian byte fields)
```

## Record layout (8 bytes)

| off | field | meaning |
|---|---|---|
| 0 | `effectId` | index into effect registry `DAT_004201b8[256]` (registered via `FUN_00415df0`); `0xFF` = none (used by TRESET/END) |
| 1 | `opcode` | 0xFE, 0xFB, 0xFC, 0xFD, 0x12 (others would fall through the switch = ignored) |
| 2 | `startOrder` | song order-list position (IT "order", 0-based) |
| 3 | `startRow` | row within the pattern playing at that order (0..63 here) |
| 4 | `endOrder` | for SHOW: end position; for TRIG: **high byte of 16-bit parameter** |
| 5 | `endRow` | for SHOW: end row; for TRIG: **low byte of parameter** |
| 6 | `layer` | 0..255. Render sort key (ascending; higher layer paints later = on top). Also indexes the per-layer effect-timer table |
| 7 | padding | never read by the interpreter |

In memory each record is stored in a 16-byte slot at `DAT_004206c0 + i*0x10`:
bytes 0..7 = the file record, +8 = int −1, +0xC = 0 (unused by the interpreter).

## Per-frame evaluation (`FUN_00415ed0`, called once per frame from the main loop)

1. `prevLayers[256] = curLayers[256]` (copy 0x800 bytes; entry = `{startTicks:int, effectId:int}`;
   cur = `DAT_00440ed8`, prev = `DAT_004416d8`), then zero every `curLayers[i].effectId`.
2. `now = getTicks()` (`FUN_004119d0`, **1 tick = 0.25 ms**).
3. `musicGetPos(&order, &row, &zero)` → `order = DAT_00441ee0`, `row = DAT_004406c0`,
   and `DAT_004406c8 = 0` (always zero — see 0xFB note).
4. For every record (skip if `effectId != 0xFF` and registry slot is NULL):

   Let `cur = (order,row)`, `start = (b2,b3)`, `end = (b4,b5)`, compared lexicographically.

   - **0xFE "SHOW"**: active iff `start <= cur < end`, i.e.
     `(order > b2 || (order == b2 && row >= b3)) && (order < b4 || (order == b4 && row < b5))`.
     If active, push `(effectId, layer)` onto this frame's display list. If the same effect
     was on this layer last frame, its timer survives (id copied prev→cur before the list pass).
   - **0xFB "SHOW*"**: identical to 0xFE, but first: if `b2 == DAT_004406c8` (which is always 0,
     so in practice "if startOrder == 0") the effect is *additionally* pushed unconditionally.
     The shipped script has **no 0xFB events**; treat as 0xFE.
   - **0xFC "TRIG"**: when `cur >= start` (same ≥ comparison as SHOW's start edge), call
     `effect->trigger((b4<<8) | b5)` once, then overwrite the record's opcode with 0xFF
     (dead) so it never fires again.
   - **0xFD "TRESET"**: when `cur >= start`, set `prevLayers[b6].effectId = 0` and
     `curLayers[b6].effectId = 0`, kill record (opcode 0xFF). Effect of this: the layer's
     effect is treated as newly-shown next frame → **its elapsed-time clock restarts at 0**.
   - **0x12 "END"**: when `cur >= start`, `quitDemo()`. (Not present in the shipped script;
     the demo instead exits from the main loop when the song wraps: once order ≥ 0x20 has been
     seen, order < 10 ⇒ quit — `FUN_00403820` lines 1597–1613.)

5. The display list (max one entry per event, so duplicates of an effect on different layers are
   possible) is bubble-sorted by `layer` ascending.
6. For each entry in order: if `curLayers[layer].effectId != effectId` then
   `curLayers[layer] = {now, effectId}` (timer restart). Then call
   `effect->render(now - curLayers[layer].startTicks)`.

   **The render argument is elapsed time on that layer in 0.25 ms ticks since the effect
   (re)appeared on the layer.** All effect animation is driven by this value (there is no
   global demo clock inside effects, except the few that call `getTicks()` or
   `musicGetPos` themselves).

## Event IDs → effects

See the id table in FUNCTION_MAP.md / EFFECTS.md. Registered ids:
0x0A,0x0C,0x0D,0x10,0x11,0x12,0x13,0x15,0x18,0x19,0x1A,0x1C,0x1D,0x1E,0x1F,0x20,0x21,
0x32–0x38 (2D overlays), 0x3C,0x3D (text flashes), 0x46 (end fade). Any id in a record that
was never registered is simply skipped (slot NULL) unless id==0xFF.

## Decoded timeline

`decode_script.py` (this directory) decodes `work/unpacked/extracted/script.as1`;
its committed output is `TIMELINE.txt`. Summary of the arrangement (order:row):

- 00:00–26:00 `eff3C` armed on layer 99 (renders only flashes triggered later)
- 00:00–10:00 landscape flyover (0x0A, layer 1) under a slowly-lifting black veil (0x35, layer 9)
  - 04:00–08:00 credits pixel-spray (0x13, layer 2) — draws over the landscape
  - 08:00–10:00 title board (0x12, layer 2)
- 10:00–12:00 twin tubes (0x11) · 12:00–14:00 tube-worm (0x15, layer 2 over 0x10)
- 12:00–18:00 radial-wave pool (0x10, layer 1) · 14:00–18:00 marching-squares blob (0x18, layer 2)
- 18:00–22:00 jumping cloth-domes (0x20, layer 1; TRESET at 20:00 restarts its clock)
  + greetings text (0x1D, layer 7)
- 22:00–24:00 lightgrid floor/ceiling (0x0D, layer 1) + pulsating blob (0x21, layer 2)
- 24:00–26:00 tunnel ribbon (0x19); 104 TRIG events fire eff3C "please it" text flashes with
  param cycling 0..0x13 (20 flash slots), accelerating from every 2 rows to ~3 per row
- 26:00–27:127 rotating-rings bounce (0x1E)  (end 27:127 = "until pattern 27 ends")
- 27:63–30:00 triple tubes (0x0C, layer 2) + morphing cylinder (0x1F, layer 3)
- 30:00–32:00 lightgrid (0x0D) + blob flower (0x1A)
- 32:00–end streak field (0x1C) + logo fade (0x46); white/black beat flashes (0x32/0x33/0x34/0x36/0x37)
  are sprinkled at order starts throughout (each lasts 16 rows on layers 90/100/101/104).
