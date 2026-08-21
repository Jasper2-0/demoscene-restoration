#!/usr/bin/env python3
"""Draw-stream oracle — what the ORIGINAL submits to Direct3D 8, per frame.

MODE:       REPORT — prints the stream and writes a fixture. Exits 1 only when
            nothing was recorded, which is an invocation failure, not a verdict.
OBSERVABLE: the ORDERED list of primitives the original submits for one frame,
            with the D3D8 state in force at each. State is OBSERVED — the fake
            device is the state machine the binary talks to — never reconstructed.
UNITS:      `vertexCount` is vertices, never triangles. `stride` is bytes.
            `--ms` is MUSIC milliseconds; one simulation step is 1000/30 ms.

  .venv/bin/python targets/drawstream.py --scenes 0,1,2,3,4 --render 4
  .venv/bin/python targets/drawstream.py --scenes 4 --render 4 --frames 2   # smoke

Writes the tools/DRAWSTREAM.md envelope, so the PORT's side — recorded by an
entirely different machine (tools/record-minid3d8-draws.mjs) — is diffable
against it, draw for draw, in submission order.

WHY THIS AND NOT WINEBOX. Two properties of sonnet specifically:

  * Its geometry is DrawPrimitiveUP / DrawIndexedPrimitiveUP only
    (re/engine/D3D8_API.md) — the USER-POINTER variants. A text log records the
    pointer, so Wine's +d3d8 channel is blind to every vertex, exactly as
    +opengl was blind to Wonder's 84% submitted through glVertex3fv. Here the
    pointer is an address in a memory we own.
  * winebox addresses an instant by holding QueryPerformanceCounter
    (tools/winebox/oracle-at.sh), which works because QPC is a DLL call. Sonnet's
    clock is MiniFMOD's own time table, statically linked into a 65,536-byte
    binary with nothing to hook. Under emulation the clock is not a problem to
    work around — it is an input (see CLOCK_VA below).

THE RNG STREAM IS SEQUENTIAL AND SHARED. Scene 4's build state only exists
after scenes 0-3 have drawn their numbers, so `--scenes` builds in object order
from the image seed exactly as the timeline's init pass does. `--scenes 4`
alone is a MACHINERY SMOKE TEST and its geometry is not the original's.
"""

import argparse
import base64
import json
import pathlib
import struct
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from emu import SonnetEmu, INIT_VA, fixture_dir  # noqa: E402
import d3d8fake  # noqa: E402

CTOR_VA = 0x408d72      # __fastcall(this)
BUILD_VA = 0x4082a9     # __thiscall(this, sceneIdx)
VTBL_PTRS = 0x418e68    # PTR array the FACTORY installs: reset/render/event/dtor
CLOCK_VA = 0x402f01     # returns "now" in ms — FUN_004060c9 calls it for lastMs
INIT_POSITION = 0xffff  # the script's setup sentinel (js/timeline.js)
TIMELINE = pathlib.Path(__file__).resolve().parents[4] / 'web' / 'assets' / 'timeline.json'

SHADOW_DRAWS = 2 * 65536 * 16   # PINNED, as in scenebuild.py
STEP_MS = 1000.0 / 30.0         # one simulation step: FRAME_BASE / rate, rate=30


# scene index -> timeline OBJECT index, from js/timeline.js's SCENE_BANDS. They
# are not the same number: scene 4 (beach) is object 7.
OBJ_FOR_SCENE = {0: 3, 1: 4, 2: 5, 3: 6, 4: 7, 5: 8, 7: 9, 8: 10}


def lcg_advance(seed, n):
    for _ in range(n):
        seed = (seed * 214013 + 2531011) & 0xffffffff
    return seed


def set_clock(emu, ms):
    """Make time an INPUT: patch the ms source to `mov eax, imm32; ret`.

    Strictly better than winebox's SUNF_QPC_HOLD — no binary patch ships, no
    environment variable, and the value is exact rather than a held counter that
    the demo samples whenever it happens to look."""
    emu.write(CLOCK_VA, b'\xb8' + struct.pack('<I', int(ms) & 0xffffffff) + b'\xc3')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--scenes', default='0,1,2,3,4')
    ap.add_argument('--render', type=int, default=4, help='which built scene to render')
    ap.add_argument('--frames', type=int, default=48,
                    help='frames to advance before the one that is kept')
    ap.add_argument('--ms', type=float, default=None,
                    help='music ms of the LAST frame (default: frames * one step)')
    ap.add_argument('--layer', type=int, default=None,
                    help='default: the layer the script assigns (event m252)')
    ap.add_argument('--pos', default=None,
                    help='music position, e.g. 0x151f — replays the script up to it')
    ap.add_argument('--verts', action='store_true', help='keep vertex bytes in the fixture')
    args = ap.parse_args()
    scenes = [int(x) for x in args.scenes.split(',') if x != '']
    if args.render not in scenes:
        print(f'--render {args.render} is not among --scenes {scenes}', file=sys.stderr)
        return 2

    emu = SonnetEmu(heap_mb=1024)
    d3d = d3d8fake.install(emu)
    emu.call(INIT_VA)
    assert emu.seed == 1

    # Fast-forward the shadow bake exactly as scenebuild.py does: its ~10^9
    # instruction ray march is minutes each under TCG and its only STREAM effect
    # is SHADOW_DRAWS unconditional draws.
    emu.write(0x40e923, b'\xc2\x0c\x00')
    from unicorn import UC_HOOK_CODE
    from unicorn.x86_const import UC_X86_REG_ECX

    def on_bake(uc, address, size, user):
        this = uc.reg_read(UC_X86_REG_ECX)
        buf = emu.u32(this + 0x24)
        if buf:
            emu.write(buf, b'\xff' * 0x10000)
        emu.seed = lcg_advance(emu.seed, SHADOW_DRAWS)
    emu.uc.hook_add(UC_HOOK_CODE, on_bake, begin=0x40e923, end=0x40e923)

    # THE REAL RENDER, which is the whole difference from scenebuild.py — that
    # target deliberately stubs slot 1 because it only wants the build stream.
    render_va = emu.u32(VTBL_PTRS + 4)
    vt = emu.alloc(0x10)
    for i in range(4):
        emu.set_u32(vt + i * 4, emu.u32(VTBL_PTRS + i * 4))

    set_clock(emu, 0)
    objs = {}
    for idx in scenes:
        this = emu.alloc(0x2000)
        emu.set_u32(this, vt)
        emu.call(CTOR_VA, this=this)
        print(f'scene {idx}: build …', flush=True)
        try:
            emu.call(BUILD_VA, idx, this=this, timeout_s=3600)
        except Exception as e:
            print(f'scene {idx}: FAIL {e}')
            print(f'  unknown D3D method: {d3d.unknown_hit}')
            print(f'  unmapped: {emu.unmapped}')
            print(f'  api tail: {emu.api_log[-6:]}')
            raise
        objs[idx] = this
        print(f'scene {idx}: built, seed {emu.seed:#010x} '
              f'({emu.last_call_seconds:.0f} s)', flush=True)

    this = objs[args.render]

    # REPLAY THE SCRIPT, or the object never draws. reset() clears `visible`
    # (+0x15) and the build tail calls it, so a freshly built Landscape renders
    # NOTHING — which is what the first run of this target reported, and it
    # reads exactly like a broken recorder.
    #
    # The events come from web/assets/timeline.json, which is extracted from
    # this same binary, so replaying it is not a second source of truth. Order
    # is the port's (js/timeline.js): every t == 0xffff setup event first, then
    # the rest in script order up to the position.
    obj_index = OBJ_FOR_SCENE.get(args.render, args.render)
    events = json.loads(TIMELINE.read_text())
    events = events.get('events', events) if isinstance(events, dict) else events
    mine = [e for e in events if e.get('obj') == obj_index]
    pos = int(args.pos, 16) if args.pos else None
    event_va = emu.u32(VTBL_PTRS + 8)

    def fire(e):
        # __thiscall event(method, float param, u32 raw) — the float is passed
        # by its BITS, which is what the script stores in `u32`.
        emu.call(event_va, e['m'], e.get('u32', 0), this=this)

    fired = []
    for e in mine:
        if e['t'] == INIT_POSITION:
            fire(e); fired.append(e)
    for e in mine:
        if e['t'] != INIT_POSITION and (pos is None or e['t'] <= pos):
            fire(e); fired.append(e)
    print(f'replayed {len(fired)} script events for obj {obj_index}'
          f'{f" up to {args.pos}" if pos is not None else ""}: '
          f'{[e["m"] for e in fired]}', flush=True)

    layer = args.layer if args.layer is not None else 0
    last_ms = args.ms if args.ms is not None else args.frames * STEP_MS

    # ADVANCE IN WHOLE SIMULATION STEPS, the same grid the port now steps
    # (web/js/scene7.js #stepsDue). Both sides on one grid means a difference
    # between them is a difference in the demo rather than in the cadence.
    d3d.recording = True
    d3d.frames = 0
    n = max(1, args.frames)
    try:
        for k in range(n):
            set_clock(emu, last_ms - (n - 1 - k) * STEP_MS)
            # Keep only the LAST frame: the fake device clears on Present, and
            # nothing calls Present here, so clear explicitly per frame.
            d3d.draws = []
            d3d.frames += 1
            emu.call(render_va, layer, this=this, timeout_s=3600)
        partial = None
    except Exception as e:
        # KEEP WHAT WAS RECORDED. The frame stops where the emulator runs out of
        # implemented surface, and the draws before that point are real — the
        # extend-as-encountered contract is meant to leave evidence, not to
        # discard it. The fixture is MARKED partial so nothing downstream can
        # mistake a truncated frame for a short one.
        partial = {'error': str(e), 'unknownD3D': d3d.unknown_hit,
                   'unmapped': emu.unmapped, 'apiTail': emu.api_log[-8:],
                   'drawsBefore': len(d3d.draws)}
        print(f'render: STOPPED after {len(d3d.draws)} draws — {e}')
        print(f'  unknown D3D method: {d3d.unknown_hit}')
        print(f'  unmapped: {emu.unmapped}')
        print(f'  api tail: {emu.api_log[-8:]}')
    d3d.recording = False

    draws = d3d.draws
    for d in draws:
        d['vertsDigest'] = 'sha256:' + __import__('hashlib').sha256(
            d['verts'].encode()).hexdigest()[:16]
        if not args.verts:
            d.pop('verts', None)
            d.pop('indices', None)

    record = {
        'api': {'name': 'd3d8', 'version': 8},
        'side': 'original',
        'source': f'oracle/targets/drawstream.py --scenes {args.scenes} '
                  f'--render {args.render} --frames {args.frames}',
        'at': {'position': None, 'scene': args.render, 'songMs': last_ms},
        'frame': d3d.frames - 1,
        'partial': partial,
        'draws': draws,
    }

    print(f'\nscene {args.render} @ {last_ms:.1f} ms  '
          f'{len(draws)} draws, {sum(d["vertexCount"] for d in draws)} vertices  '
          f'(last of {d3d.frames} rendered frames)')
    for d in draws[:8]:
        print(f'  {d["i"]:3}  {d["prim"]:<14} {d["vertexCount"]:6}v  '
              f'stride {d["stride"]}  tex {d["textures"]}')
    if len(draws) > 8:
        print(f'  … {len(draws) - 8} more')

    out = fixture_dir('drawstream', f'scene{args.render}_{int(last_ms)}ms')
    (out / 'draws.jsonl').write_text(json.dumps(record) + '\n')
    print(f'wrote {out}/draws.jsonl')

    if not draws:
        print('FAIL: the original submitted nothing. An empty stream and a perfect\n'
              '      match are the same JSON, so this is loud rather than written out\n'
              '      as a clean diff.', file=sys.stderr)
        return 1
    if partial:
        print(f'PARTIAL: the frame stopped early — {partial["drawsBefore"]} draws are\n'
              f'         real, the rest of the frame is missing. Not a comparison.',
              file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
