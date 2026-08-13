#!/usr/bin/env python3
"""Unpack PTCT party version frame.exe (UPX 0.71, NRV2B_LE32 — too old for modern upx).

Recovers the in-memory UPX0 image (not a runnable PE) and extracts the RCDATA 101
data pack (u32 count + entries{name[128], u32 size, u32 offset}).

Found stream start by scanning: 0x7b9 (right after the UPX! PackHeader at 0x79d).
RCDATA 101 leaf points at RVA 0x7d060; image base VA 0x1000.
"""
import struct, sys, os

def nrv2b_le32(src, start, max_out=0x100000):
    out = bytearray()
    pos = start; bc = 0; bw = 0; last = 1
    def getbit():
        nonlocal bc, bw, pos
        if bc == 0:
            bw = int.from_bytes(src[pos:pos+4], "little"); pos += 4; bc = 32
        bc -= 1
        return (bw >> bc) & 1
    while len(out) < max_out:
        while getbit():
            out.append(src[pos]); pos += 1
        m_off = 1
        while True:
            m_off = m_off*2 + getbit()
            if getbit(): break
        if m_off == 2:
            m_off = last
        else:
            m_off = (m_off-3)*256 + src[pos]; pos += 1
            if m_off == 0xffffffff: break
            m_off += 1
            last = m_off
        m_len = getbit()*2 + getbit()
        if m_len == 0:
            m_len = 1
            while True:
                m_len = m_len*2 + getbit()
                if getbit(): break
            m_len += 2
        m_len += 1 + (1 if m_off > 0xd00 else 0)
        for _ in range(m_len):
            out.append(out[-m_off])
    return bytes(out)

here = os.path.dirname(os.path.abspath(__file__))
exe = os.path.join(here, "..", "unpacked", "frame.exe")
img = nrv2b_le32(open(exe, "rb").read(), 0x7b9)
outdir = os.path.join(here, "..", "unpacked", "party-extracted")
os.makedirs(outdir, exist_ok=True)
open(os.path.join(outdir, "frame_upx0_image.bin"), "wb").write(img)
print(f"image: {len(img)} bytes")

off = 0x7d060 - 0x1000
cnt = struct.unpack_from("<I", img, off)[0]
p = off + 4
entries = []
for _ in range(cnt):
    name = img[p:p+128].split(b"\0")[0].decode(); p += 128
    size, ofs = struct.unpack_from("<2I", img, p); p += 8
    entries.append((name, size, ofs))
base = p
for name, size, ofs in entries:
    fn = os.path.join(outdir, name.replace("data\\", ""))
    open(fn, "wb").write(img[base+ofs: base+ofs+size])
    print(f"  {name:<20s} {size:>7d} -> {fn}")
