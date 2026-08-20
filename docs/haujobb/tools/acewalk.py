#!/usr/bin/env python3
"""Walk embedded ACE archive headers: inventory without decompression."""
import struct, sys, datetime

path = sys.argv[1]
start = int(sys.argv[2], 0)
data = open(path, 'rb').read()

# ACE CRC16 (CRC32 table based, low 16 bits, init 0xFFFFFFFF no final xor)
tab = []
for i in range(256):
    c = i
    for _ in range(8):
        c = (c >> 1) ^ 0xEDB88320 if c & 1 else c >> 1
    tab.append(c)
def acecrc32(buf):
    c = 0xFFFFFFFF
    for b in buf:
        c = tab[(c ^ b) & 0xFF] ^ (c >> 8)
    return c
def acecrc16(buf):
    return acecrc32(buf) & 0xFFFF

pos = start
total_pack = 0
total_orig = 0
nfiles = 0
print(f"{'name':28s} {'packed':>9s} {'orig':>9s} {'ratio':>6s} {'date':16s} {'crc32':>8s} {'m':>2s} {'q':>2s} {'dict':>5s}")
while pos + 4 <= len(data):
    hcrc, hsize = struct.unpack_from('<HH', data, pos)
    if pos + 4 + hsize > len(data): break
    hdr = data[pos+4:pos+4+hsize]
    ok = acecrc16(hdr) == hcrc
    htype = hdr[0]
    hflags = struct.unpack_from('<H', hdr, 1)[0]
    if htype == 0:
        sig = hdr[3:10]
        verx, verc, host, vol = hdr[10], hdr[11], hdr[12], hdr[13]
        t, = struct.unpack_from('<I', hdr, 14)
        adv = hdr[26:]
        print(f"MAIN hdr @ {pos:#x}: sig={sig} crc_ok={ok} flags={hflags:#06x} ver_extract={verx} ver_created={verc} host={host} volume={vol} advert={adv}")
        pos += 4 + hsize
    elif htype == 1:
        psize, osize, ftime, attr, crc32v = struct.unpack_from('<IIIII', hdr, 3)
        tech_type, tech_qual, params, reserved, fnlen = struct.unpack_from('<BBHHH', hdr, 23)
        name = hdr[31:31+fnlen].decode('latin1')
        # dos datetime
        d = ftime >> 16; tm = ftime & 0xFFFF
        try:
            dt = f"{1980+(d>>9):04d}-{(d>>5)&15:02d}-{d&31:02d} {tm>>11:02d}:{(tm>>5)&63:02d}"
        except Exception:
            dt = '?'
        dictsz = 1 << (10 + (params & 15)) if tech_type else 0
        print(f"{name:28s} {psize:9d} {osize:9d} {psize*100//max(osize,1):5d}% {dt:16s} {crc32v:08x} {tech_type:2d} {tech_qual:2d} {dictsz//1024:4d}K" + ("" if ok else " CRC-BAD"))
        total_pack += psize; total_orig += osize; nfiles += 1
        pos += 4 + hsize + psize
    else:
        print(f"hdr type {htype} @ {pos:#x} size={hsize} flags={hflags:#x} crc_ok={ok}")
        pos += 4 + hsize
        # unknown: stop if not ok
        if not ok: break
print(f"\nfiles={nfiles} total_packed={total_pack} total_orig={total_orig} end_of_archive={pos:#x} ({pos})")
print(f"bytes from archive end to end-of-.data-raw(0x882000): {0x882000-pos:#x}")
