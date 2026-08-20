#!/usr/bin/env python3
"""Dump the texture arena AS THE INTRO LEAVES IT, not as each program runs alone.

    ./ppcbox.sh python3 texmemdump.py            # -> out/texmem_p1.bin

`rendertex.py` executes every texture program as a PURE FUNCTION -- program in,
128x128 out -- and `texvmdiff` checks the JS VM against that. Which is the right
way to test a VM and leaves one thing untested: whether running the programs in
sequence, sharing an arena and whatever state the boot leaves, produces the same
pixels as running each one alone. Part one's program 26 provably reads texture
memory, so the question is not hypothetical.

This dumps what is actually in the texture images after a real init, which is
what the draw calls sample. `texmemcheck.mjs` compares it against the JS VM.

THE IMAGE POINTER IS READ, NOT ASSUMED. Each W3D_AllocTexObj tag list carries it
under tag 0x80201000, and the image sits AFTER its tag list -- taglist + 0x30 --
with 65,584 bytes between consecutive textures. Assuming the obvious 64 KB
BEFORE the tag list shifts every texture by one; every one of the 48 then
compares unequal, and the differences look exactly like a real off-by-one in the
port rather than like a bad base address.
"""
import struct, sys, json, os
sys.path.insert(0, '.')
import ppcrun as H, drawlog, export, rungeo, runscene
from drawlog import LOG, LOGSZ, REC, g, run

flat='flat'
H.FLAT = rungeo.FLAT = runscene.FLAT = flat
drawlog.setflat(flat)
d0 = open(os.path.join(flat, next(f for f in os.listdir(flat) if f.startswith('seg0_'))),'rb').read()
H.fix_glyph_scan(d0); H.preload_tables(d0)
sch = json.load(open('out/showorder.json'))
disp, start, dur, fog = next(iter(export.spans(sch['p1']['schedule'])))
# dump the taglists themselves: from the first one, 48 * 65584 bytes covers all
# The image is the value of tag 0x80201000, and it sits AFTER its taglist --
# taglist + 0x30 -- not before it. Read rather than assumed: assuming the
# obvious 64 KB before shifts every texture by one and makes all 48 look wrong.
IMG0, STRIDE, N = 0x101c2d70, 65584, 48
out, err = run(g(disp), frames=(1,), txt_tab=0x2642, obj_tab=0x2706,
               overlay=g(export.P1_OVERLAY), probe=(IMG0, STRIDE * N))
blob = out[-STRIDE * N:]
open('out/texmem_p1.bin','wb').write(b''.join(
    blob[i * STRIDE: i * STRIDE + 65536] for i in range(N)))
print('wrote out/texmem_p1.bin from', hex(IMG0))
