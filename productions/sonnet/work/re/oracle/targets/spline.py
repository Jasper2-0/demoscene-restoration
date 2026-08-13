#!/usr/bin/env python3
"""Camera-spline oracle — the ORIGINAL's own path evaluation, dense-sampled.

Per camera resource 36..51:
  this = zeroed 0x200
  FUN_00405a29(this | thiscall, packedVA)      ; loader (bfloat16 keys ->
                                               ;  arc-length resample, calls
                                               ;  FUN_004058a6 twice itself)
  for t in 0..duration:  f32 t -> this+0x110 ; FUN_004058a6(this | fastcall)
  read eye @this+0x88, target @this+0xac       ; (FUN_00402072's inputs)

Fixture: per-resource f32 records (t, eye.xyz, target.xyz) — compared against
js/camera.mjs CameraPath.evaluate by test/oracle_test.mjs.  Directly attacks
scene 1's end-of-path composition drift (0x0928-0x0930) and scene 2's open
camera question near camTime 25.5 (resource 41).

  .venv/bin/python targets/spline.py           # all 16
  .venv/bin/python targets/spline.py 38 41     # a subset
"""

import pathlib
import struct
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from emu import SonnetEmu, write_fixture, ARCHIVE_VA, ARCHIVE_END  # noqa: E402

SPLINE_LOAD = 0x405a29    # __thiscall(this, packedPtr)
SPLINE_EVAL = 0x4058a6    # __fastcall(this); time is f32 @this+0x110
EYE_OFF, TARGET_OFF, TIME_OFF = 0x88, 0xac, 0x110
SAMPLES = 64


def archive_vas(emu):
    """VA of each block's DATA (the pointer FUN_00401c3b returns)."""
    vas = []
    va = ARCHIVE_VA
    while va < ARCHIVE_END:
        ln = emu.u32(va)
        vas.append((va + 4, ln))
        va += 4 + ln
    return vas


def bf16(u):
    return struct.unpack('<f', struct.pack('<I', (u << 16) & 0xffffffff))[0]


def main():
    ids = [int(a) for a in sys.argv[1:]] or list(range(36, 52))
    emu = SonnetEmu(heap_mb=64)
    vas = archive_vas(emu)

    failures = 0
    for rid in ids:
        data_va, ln = vas[rid]
        blob = emu.read(data_va, ln)
        key_count = blob[2]
        duration = max(bf16(blob[3 + i * 14] | (blob[4 + i * 14] << 8))
                       for i in range(key_count))
        cam = emu.alloc(0x200)
        try:
            emu.call(SPLINE_LOAD, data_va, this=cam, timeout_s=60)
        except Exception as e:
            print(f'res {rid}: LOAD FAIL {e} (unmapped: {emu.unmapped})')
            failures += 1
            continue
        # FUN_004058a6 only re-evaluates when the enable byte @+0x10c is set
        # AND the key pointer @+0x12c is non-null (else it reuses the cached
        # pose @+0x114) — the engine sets the byte when the path goes live.
        emu.write(cam + 0x10c, b'\x01')
        rec = bytearray()
        for i in range(SAMPLES + 1):
            t = duration * i / SAMPLES
            emu.write(cam + TIME_OFF, struct.pack('<f', t))
            emu.call(SPLINE_EVAL, this=cam, timeout_s=60)
            rec += struct.pack('<f', t)
            rec += emu.read(cam + EYE_OFF, 12)
            rec += emu.read(cam + TARGET_OFF, 12)
        d = write_fixture('spline', f'res{rid}', fn_va=SPLINE_EVAL,
                          call={'convention': 'fastcall',
                                'loader': hex(SPLINE_LOAD),
                                'resource': rid, 'data_va': hex(data_va)},
                          emu=emu, dumps=[('samples', bytes(rec))],
                          extra={'keyCount': key_count, 'duration': duration,
                                 'samples': SAMPLES + 1,
                                 'record': 'f32 x7: t, eye.xyz, target.xyz'})
        print(f'res {rid}: {key_count} keys, duration {duration:.2f} -> {d.name}')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
