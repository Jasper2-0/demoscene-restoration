#!/usr/bin/env python3
"""Parse the IXS synth sections of wnoise.ixx (PTCT / Aardbei).

Record layout per synth instrument (0x10c = 268 bytes), per FUN_0040b9e0:
  name[9], params[100] (bytes), notes[64], flags[16], vols[64],
  noteLen u32, unk u32, noteCount u32, byte a, byte render, byte stereo
Bytes 9..0x10a are cumulatively delta-coded against the previous record.
"""
import struct, sys

data = open(sys.argv[1] if len(sys.argv) > 1 else
            "/Users/scjas/Developer/xx-sandbox/demoscene-restoration/work/unpacked/extracted/wnoise.ixx",
            "rb").read()

magic, off1, off2, off3, field4 = struct.unpack_from("<4s4i", data, 0)
extra = struct.unpack_from("<i", data, 20)[0]
name = data[24:56].split(b"\0")[0]
print(f"magic={magic} song@{off1:#x} synth@{off2:#x} strsynth@{off3:#x} "
      f"field={field4:#x} extra={extra:#x} name={name!r} filesize={len(data):#x}")

# --- section offsets are relative to the end of the 56-byte header ---
off1 += 56; off2 += 56; off3 += 56
p = off1
assert data[p:p+1] == b"!"
orders, instrs, samples, patterns = struct.unpack_from("<4H", data, p+1)
b = struct.unpack_from("<4B", data, p+9)
print(f"song: orders={orders} IT-instruments={instrs} IT-samples={samples} "
      f"patterns={patterns} hdr-bytes={b}")

# --- synth instrument section ---
p = off2
count = struct.unpack_from("<i", data, p)[0]
p += 4
print(f"\nsynth instruments: {count}")
prev = bytearray(268)
recs = []
for i in range(count):
    rec = bytearray(data[p:p+268])
    p += 268
    for j in range(9, 0x10b):          # cumulative delta decode
        rec[j] = (rec[j] + prev[j]) & 0xFF
    prev = rec
    nm = bytes(rec[0:9]).split(b"\0")[0].decode("latin1")
    params = list(rec[9:109])
    notes = struct.unpack_from("<16f", rec, 109)
    flags = list(rec[109+64:109+64+16])
    vols = struct.unpack_from("<16f", rec, 109+64+16)
    note_len, unk, note_cnt = struct.unpack_from("<3i", rec, 109+64+16+64)
    a, render, stereo = rec[265], rec[266], rec[267]
    recs.append((nm, params, notes, flags, vols, note_len, unk, note_cnt, a, render, stereo))
    dur = note_len * note_cnt / 44100.0
    used = notes[:note_cnt]
    print(f"[{i:2d}] {nm:<9s} notes={note_cnt:2d} x {note_len:5d} smp "
          f"({dur:5.2f}s) stereo={stereo} render={render} a={a} unk={unk}"
          f"  pitches={['%.1f' % n for n in used[:8]]}{'...' if note_cnt > 8 else ''}")

# waveform-select param histogram (param 0x5b) and a few interesting params
print("\nper-instrument key params (byte values 0-255):")
print(f"{'name':<9s} {'wave[0x5b]':>10s} {'pw[0x5a]':>8s} {'tune[0x58]':>10s} "
      f"{'filt[0x1b]':>10s} {'res[0x1c]':>8s} {'drive[0x22]':>10s} {'rev?[0x1e]':>9s} "
      f"{'tail[0x53]':>10s} {'lp?[0x24]':>9s}")
for nm, params, *_ in recs:
    print(f"{nm:<9s} {params[0x5b]:>10d} {params[0x5a]:>8d} {params[0x58]:>10d} "
          f"{params[0x1b]:>10d} {params[0x1c]:>8d} {params[0x22]:>10d} {params[0x1e]:>9d} "
          f"{params[0x53]:>10d} {params[0x24]:>9d}")

# --- stream-synth section ---
p = off3
n = data[p]
p += 1
print(f"\nstream-synth ('wavetable score') entries: {n}")
for i in range(n):
    end = data.index(b"\0", p)
    nm = data[p:end].decode("latin1")
    p = end + 1
    print(f"  entry {i}: name={nm!r} data starts {p:#x}, bytes to EOF/next: {len(data)-p}")
    # dump chunk stream: varint total, then varint count?  (FUN_00410c80)
    def varint(q):
        b0 = data[q]
        if (b0 & 0xC0) != 0xC0:
            return b0, q+1
        b1 = data[q+1]
        v = (b1 & 0x7F) * 0x40 + (b0 & 0x3F)
        if b1 & 0x80:
            v |= struct.unpack_from("<H", data, q+2)[0] << 13
            return v, q+4
        return v, q+2
    v0, q = varint(p)
    print(f"    first varint (0 = data follows inline): {v0}")
    total, q = varint(q)
    print(f"    chunk-stream length: {total}")
    base = q
    while q < base + total:
        tag, q = varint(q)
        size, q = varint(q)
        print(f"    chunk tag={tag} size={size}")
        q += size
