// eff_intro.js — the "threestate" / "lost vegas" intro titles (music pos < 0x200).
//
// Ported from the first two `while` blocks of the master loop FUN_0040f285
// (0x0040f2f6 .. 0x0040f53e in the disassembly); the drawing call is
// FUN_00404dd0 = K.drawText (centred).  Ghidra recovered only four of that
// function's five arguments — the fifth is the D3DCOLOR, recovered from the
// disassembly (`push ecx` / `push eax` right before the string push).
//
// Phase 1 (pos < 0x114) — ONE line, centred at (320, 220):
//     scale  = msSinceStart / 20 + 32          (0x4124f0 = 20.0, 0x4123dc = 32.0)
//     alpha  = clamp(round(msSinceBeat / 6))   (0x4127fc = 6.0)
//     colour = (alpha << 24) | 0x00ffffff      -> white, pulsing in after each beat
//     string = pos < 0x20 ? "threestate" : "lost vegas"   (.rdata 0x421630/0x42163c)
//   "msSinceBeat" is reset by a little state machine on the music position:
//   resets happen at rows where (pos & 0xf) reaches 0 (from state 0xc), 6 and 12.
//
// Phase 2 (0x114 <= pos < 0x200) — two lines, scale 256, opaque white:
//     "threestate" @ (320, 190)                    pos >= 0x114   (0x421648)
//     "lost"       @ (320, 250)                    pos == 0x116   (0x421654)
//     "lost vegas" @ (320, 250)                    pos >= 0x117   (0x42165c)
//
// (The `threestate**in***lost***vegas**` string with the zero-width `*` glyphs
// lives at 0x4215e8 and belongs to the FINALE generator FUN_0040df90, which
// bakes one 64x64 texture per character — it is not drawn by the intro.)
//
// Timing note (FRAME_LOOP.md §Timing): the motion comes from timeGetTime, not
// from the music clock.  Rather than trusting whatever `extra.ms` the driver
// hands us (it is a real wall clock during playback but a synthesised one in the
// single-frame debug harness), the clock is ANCHORED to the music position —
// the module runs at a constant 120 ms/row (XM speed 6 @ 125 BPM) — and only
// the sub-row remainder comes from `extra.ms`.  That is exact for a still frame
// and still smooth (per-frame, not per-row) during playback.

const MS_PER_ROW = 120;                       // 2500 / 125 BPM * speed 6
const rawPos = (p) => (p > 0x1ff ? p - 0x200 : p);   // undo timeline.normalizePos
const rowOf = (p) => { const r = rawPos(p); return (r >> 8) * 64 + (r & 0xff); };

const SKY = 0xff7dafc8;                       // DAT_004b4f64 / DAT_0041a2a8

export function makeScene(ctx, variant = 0) {
  const { K, d3d } = ctx;

  // sub-row interpolation: wall-clock ms elapsed since the music position last
  // advanced, clamped to one row.
  let lastPos = -1, lastWall = 0;
  function subRow(pos, extra) {
    // Exact fraction through the current row, measured from the audio clock.
    // The wall-clock reconstruction below is a fallback for the debug path; it
    // re-anchors on pos changes and clamps, which visibly steps during playback.
    if (extra && typeof extra.rowFrac === 'number') return extra.rowFrac * MS_PER_ROW;
    const wall = extra && typeof extra.ms === 'number' ? extra.ms : 0;
    if (pos !== lastPos) { lastPos = pos; lastWall = wall; }
    let f = wall - lastWall;
    if (!(f > 0)) f = 0;
    return f > MS_PER_ROW ? MS_PER_ROW : f;
  }

  return {
    render(pos, extra) {
      // DAT_004b4f64 = 0xff7dafc8 — the sky-blue clear colour the intro sets
      // before its loop.  The frame pump clears with it at the top of the NEXT
      // frame, so prime it (and clear once) when it is not already in force.
      if (d3d.clearColor !== SKY) {
        d3d.clearColor = SKY;
        d3d.Clear(3, SKY, 1.0);
      }

      const frac = subRow(pos, extra);
      const ms = rowOf(pos) * MS_PER_ROW + frac;    // since the intro loop began

      if (pos < 0x114) {
        // FUN_0040f285's beat state machine reduces to "how long since the last
        // row whose low nibble was 0, 6 or 12".
        const k = pos & 0xf;
        const back = k >= 0xc ? k - 0xc : (k >= 6 ? k - 6 : k);
        const sinceBeat = back * MS_PER_ROW + frac;

        const scale = ms / 20.0 + 32.0;
        let a = Math.round(sinceBeat / 6.0);
        if (a > 0xff) a = 0xff;
        if (a < 0) a = 0;
        const color = ((a << 24) + 0xffffff) >>> 0;
        K.drawText(pos < 0x20 ? 'threestate' : 'lost vegas', 320.0, 220.0, scale, color);
      } else {
        if (pos >= 0x114) K.drawText('threestate', 320.0, 190.0, 256.0, 0xffffffff);
        if (pos === 0x116) K.drawText('lost', 320.0, 250.0, 256.0, 0xffffffff);
        if (pos >= 0x117) K.drawText('lost vegas', 320.0, 250.0, 256.0, 0xffffffff);
      }
    },
  };
}
