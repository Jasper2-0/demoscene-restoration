#!/usr/bin/env python3
"""Decode data/script.as1 from "Please the Cookie Thing" (Aardbei, 2000).

Record layout (8 bytes each, after a u32 LE count), derived from the
script interpreter at FUN_00415ed0 / FUN_00415e20 in PTCT_unpacked.exe:

  byte 0  effect ID   (index into effect registry DAT_004201b8; 0xFF = none)
  byte 1  opcode      0xFE show / 0xFB show(+always-on if startOrd==0)
                      0xFC one-shot trigger, 0xFD layer-timer reset, 0x12 end demo
  byte 2  start order (music order-list position, IT "order")
  byte 3  start row   (row within pattern, 0..63)
  byte 4  end order   (for 0xFC/0xFD: high byte of 16-bit trigger param)
  byte 5  end row     (for 0xFC/0xFD: low byte of 16-bit trigger param)
  byte 6  layer       (0..255; render sort key, higher = drawn later/on top;
                       also indexes the per-layer effect-start-time table)
  byte 7  padding     (unused by the interpreter)

Active condition for 0xFE/0xFB (cur = (order,row) from the music player,
delay-compensated to the audible position):
    (start <= cur) && (cur < end)     [lexicographic on (order,row)]
Effect render method is called each frame with
    elapsed_ticks = getTicks() - layer_start_time[layer]     (1 tick = 0.25 ms)
where layer_start_time resets whenever the effect ID shown on that layer changes.
"""
import struct, sys, os

EFFECT_NAMES = {
    0x0a: "landscape_flyover        (init 401490, rend 4016e0)",
    0x0c: "triple_tube_flight       (init 408120, rend 408300)",
    0x0d: "lightgrid_floor_ceiling  (init 4066f0, rend 4069c0, trig 406960)",
    0x10: "radial_wave_pool         (init 407780, rend 4078d0, trig 4078b0)",
    0x11: "twin_warped_tubes        (init 405e70, rend 405f80)",
    0x12: "title_board_ptct         (init 4091b0, rend 4092a0, trig 409410)",
    0x13: "credits_pixel_spray      (init 406140, rend 406660+406280)",
    0x15: "tube_worm                (init 407bf0, rend 407e40)",
    0x18: "marching_squares_blob    (init 4041a0, rend 404fb0)",
    0x19: "lissajous_tunnel_ribbon  (init 402ec0, rend 403410)",
    0x1a: "spiky_blob_flower        (init 402a90, rend 402de0)",
    0x1c: "streak_field             (init 4025c0, rend 402a50+402750)",
    0x1d: "greetings_typewriter     (init 4017e0, rend 4019eb)",
    0x1e: "rotating_rings_bounce    (init 407470, rend 407570)",
    0x1f: "morphing_cylinder        (init 401000, rend 4013d0)",
    0x20: "jumping_cloth_domes      (init 408da0, rend 408f30)",
    0x21: "pulsating_blob_sphere    (init 401a80, rend 401b70)",
    0x32: "ovl_white_flash_1s       (405840)",
    0x33: "ovl_black_fadein         (405980)",
    0x34: "ovl_grid_zoom_flash      (405b30)",
    0x35: "ovl_black_slow_veil      (405a10)",
    0x36: "ovl_black_flash_07       (405aa0)",
    0x37: "ovl_white_flash_07       (4058e0)",
    0x38: "ovl_noop",
    0x3c: "please_it_text_flashes   (init 402330, rend 402490, trig 4021f0)",
    0x3d: "text_flash_unused        (init 4020d0, rend 402210, trig 4021f0)",
    0x46: "end_logo_fade            (rend 405d70, trig 405e60)",
}

OPCODES = {
    0xfe: "SHOW",
    0xfb: "SHOW*",   # additionally always-on while startOrder == 0 (cmp vs constant 0)
    0xfc: "TRIG",    # one-shot: effect->trigger((b4<<8)|b5) when (order,row) reached
    0xfd: "TRESET",  # reset layer timer for layer b6 when (order,row) reached
    0x12: "END",     # quit demo when (order,row) reached
}

def decode(path):
    data = open(path, "rb").read()
    (count,) = struct.unpack_from("<I", data, 0)
    recs = []
    for i in range(count):
        b = struct.unpack_from("8B", data, 4 + i * 8)
        recs.append(b)
    return recs

def fmt(recs):
    out = []
    out.append("# idx  op      effect                        start      end        layer")
    for i, b in enumerate(recs):
        eid, op, so, sr, eo, er, layer, pad = b
        opn = OPCODES.get(op, "op%02X" % op)
        en = EFFECT_NAMES.get(eid, "effect_%02X" % eid) if eid != 0xFF else "-"
        if op == 0xfc:
            detail = "at %02d:%02d  param=0x%04X" % (so, sr, (eo << 8) | er)
        elif op == 0xfd:
            detail = "at %02d:%02d" % (so, sr)
        elif op == 0x12:
            detail = "at %02d:%02d" % (so, sr)
        else:
            detail = "%02d:%02d -> %02d:%02d" % (so, sr, eo, er)
        out.append("%4d  %-7s id=%02X %-42s %s  layer=%3d%s"
                   % (i, opn, eid, en, detail, layer,
                      ("  pad=%02X" % pad) if pad else ""))
    return "\n".join(out)

if __name__ == "__main__":
    p = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "../../unpacked/extracted/script.as1")
    print(fmt(decode(p)))
