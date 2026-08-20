"""Find every scene-stream opcode boundary by MEASURING, not by decoding.

    ./ppcbox.sh python3 scenewalk.py flat/ [scene-index]

`scenegram.py` encodes a grammar read out of the seven handlers and scores 0/29,
and three attempts to fix it have failed. This tool does not decode anything. It
uses the one lever the walk itself provides:

    lhz  r29, 0(r31); addi r31, r31, 2; add r30, r31, r29
    loop: lbz r29, 0(r31); addi r31, r31, 1
          cmpw r31, r30; bgt done

The stream's own u16 LENGTH bounds the walk, and the bound is tested after the
opcode byte is consumed. So if that length is patched to L, the walk stops at
the first opcode lying at or beyond offset L — which makes the node count a STEP
FUNCTION of L whose steps sit exactly on the opcode boundaries.

Bisecting for the smallest L that yields k+1 nodes therefore recovers the byte
offset of every opcode without knowing what any of them consume. The grammar
falls out of the differences, and it is measured rather than argued.

The same trick found why one geometry program faulted, where reading the
disassembly had not.
"""
import struct
import sys
import os
import ppcrun as H
import runscene

FLAT = H.FLAT = runscene.FLAT = (sys.argv[1] if len(sys.argv) > 1 else 'flat')
BASE = 0x10000000
STAGE = 0x21400000          # well clear of every region runscene maps


def segments_of(flat):
    out = {}
    for va, size, fn in H.read_layout(flat):
        if fn is not None:
            out[va] = open(os.path.join(flat, fn), 'rb').read()
    return out


def read_at(segs, addr, n):
    for base, d in segs.items():
        if base <= addr < base + len(d):
            return d[addr - base:addr - base + n]
    return b''


def node_types(out, arena):
    """The opcode*4/4 sequence of the node list the run produced."""
    if len(out) < 4:
        return None
    head = struct.unpack('>I', out[:4])[0]
    a = out[4:]
    seq, node, seen = [], head, set()
    while node and arena <= node < arena + len(a) - 0x40 and node not in seen:
        seen.add(node)
        o = node - arena
        seq.append(struct.unpack_from('>H', a, o + 8)[0] // 4)
        node = struct.unpack_from('>I', a, o + 0x10)[0]
        if len(seq) > 256:
            break
    return seq


def run_with_length(body, length, orig_segments):
    """Run the scene builder over a copy of the stream with a patched length."""
    patched = bytearray(body)
    struct.pack_into('>H', patched, 0, length)
    H.segments = lambda flat: orig_segments(flat) + [
        (STAGE, bytes(patched), len(patched))]
    try:
        out, err = runscene.run(STAGE)
    finally:
        H.segments = orig_segments
    return node_types(out, runscene.ARENA)


def main():
    runscene._need()
    d0 = runscene.d0
    segs = segments_of(FLAT)
    orig_segments = H.segments

    idx = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    disp = runscene.__dict__.get('SCENE_DISPS', None)
    # The same 29 stream pointers arenadump and export_scenes use.
    p1 = [0x25d2, 0x25aa, 0x25ba, 0x25ce, 0x25ae, 0x25b2, 0x25b6, 0x25ca,
          0x25be, 0x25c2, 0x25c6, 0x25da, 0x25d6, 0x25de, 0x25e2, 0x25ea,
          0x25e6, 0x25ee]
    d = p1[idx] if idx < len(p1) else p1[0]
    stream = runscene.g(d)
    header = read_at(segs, stream, 4)
    declared = struct.unpack('>H', header[:2])[0]
    body = read_at(segs, stream, declared + 2)
    print(f'scene disp {d:#06x} stream {stream:#010x} declared length {declared}')
    print(f'  first bytes: {" ".join(f"{b:02x}" for b in body[:24])}')

    full = run_with_length(body, declared, orig_segments)
    if full is None:
        print('  the unpatched run produced nothing — cannot measure')
        return
    print(f'  full walk -> {len(full)} nodes: {full}')

    # For each k, the smallest length that yields at least k+1 nodes.
    bounds = []
    for k in range(1, len(full) + 1):
        lo, hi = 0, declared
        while lo < hi:
            mid = (lo + hi) // 2
            seq = run_with_length(body, mid, orig_segments)
            if seq is not None and len(seq) >= k:
                hi = mid
            else:
                lo = mid + 1
        bounds.append(lo)
        print(f'  node {k - 1} (type {full[k - 1]}) completes at length {lo}')

    print('\n  opcode offsets and what each consumed:')
    prev = 0
    for k, b in enumerate(bounds):
        print(f'    node {k}: type {full[k]}  boundary {b}  consumed {b - prev}')
        prev = b


if __name__ == '__main__':
    main()
