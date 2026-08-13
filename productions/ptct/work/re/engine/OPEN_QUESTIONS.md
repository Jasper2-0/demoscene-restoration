# Open questions / uncertainties

Confidence is high on: script format & interpreter, sync chain, effect↔function map,
engine object model, texture index table, overlay formulas, and the timeline decode
(all cross-checked against disassembly). Remaining uncertainties, in rough priority order:

1. **Garbled decompiles of three render bodies.** `FUN_00406280` (credits pixel-spray
   callback), `FUN_00402750` (streak-field callback) and parts of `FUN_00404fb0`
   (marching-squares render) lost register arguments in Ghidra. Structure and constants are
   documented in EFFECTS.md, but a porter should verify quad sizes/positions against the
   disassembly (0x406280, 0x402750, 0x404fb0) or against video capture of the original.

2. **Exact numeric constants in per-effect formulas.** Most `_DAT_0041axxx` constants were
   dumped (see EFFECTS.md), but a few reads through Ghidra's float/double confusion were
   inferred from context (e.g. eff10's bump amplitude ≈2.2·k, eff13 camera factors). Any
   constant marked "≈/?" in EFFECTS.md should be re-read from the binary when porting that
   scene (peread.py helper: scratchpad script; addresses cited).

3. **`FUN_00408610` (cloth-dome generator) and `FUN_004010c0` (cylinder generator)** are
   fully decompiled and portable, but I have not re-derived a closed-form description —
   port the loops verbatim (ptct.c 3025–3238, 1–122).

4. **gluPerspective zNear.** `Mesh::draw` passes (fov, 1.0, 2.0, 32768.0); the frame-level
   projection in `frameFlip` decodes as (90, 1.0, ~0?, 32768) — the frame-level one is only
   active for the 2D overlays' brief moment and is immediately replaced; use near=2 far=32768
   everywhere and 0.1-ish near for the ortho overlays (they use glOrtho anyway).

5. **Opcode 0xFB.** Its extra compare is against a value the position query hard-zeroes,
   so its "always-on when startOrder==0" reading is what the code does today, but the third
   output was probably meant to be something else historically. The shipped script contains
   no 0xFB events — safe to implement as 0xFE.

6. **eff12 flicker RNG and eff13 image-cycle timing** come from `ftol()` of values Ghidra
   dropped; likely `rand31()` and `elapsed/period % 7`. Verify visually.

7. **Effect 0x3D** is registered but its string list is empty (init zeroes it) and the
   script never references it — confirmed dead; no port needed.

8. **The leaked object after script load** (`FUN_00403820` lines 1589–1596, vtable of
   overlay 0x35, never registered) appears to be dead code; ignored.

9. **Windowed/dialog paths** (config dialog, resolution enumeration, TGA texture cache
   toggles) were mapped but not deeply verified — irrelevant for the port.

10. **Music edge cases.** If the IT contains pattern jumps/breaks (Bxx/Cxx) the row-walk in
    the external sync map must follow the player's `FUN_0040a240` semantics (row target
    +0x3210 mechanism, order skip on 0xFE, wrap on 0xFF). Since sync only consumes
    (order,row), generating the map from a tracker-accurate IT player of the converted
    module is the safest route.
