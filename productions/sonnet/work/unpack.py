#!/usr/bin/env python3
"""Static unpacker for sonnet.exe (threestate, ASM 2001).

The exe is packed with ryg's aPLib-style packer (sections "rygs and"/"packer. ").
Depacker stub at VA 0x486ac0 (file 0xfcc0), transcribed 1:1:
  - bitstream: MSB-first tag bytes (dl marker), first output byte copied raw
  - codes: 0=literal, 10=gamma offset/length match, 110=short match (byte),
           111=4-bit offset single byte
  - gamma-2 on the '10' path == reuse last offset (unconditional, no LWM)
  - end marker: short-match offset byte >> 1 == 0
  - post-filter: 0x851 E8/E9 rel32 fixups (big-endian absolute -> relative)
Output image: VA 0x401000..0x477000 (0x76000 bytes max).
Import metadata for the runtime resolver: descriptors at VA 0x485000
(pairs: dllname-ptr, IAT-ptr), ASCII import names at VA 0x487000+rva.
"""
import struct, sys, os

SRC = os.path.join(os.path.dirname(__file__), '..', 'originals', '3s-sonnet', 'sonnet.exe')
data = open(SRC, 'rb').read()

# packed section: vaddr 0x77000, raw 0x200. depack source = VA 0x477000 -> file 0x200
src = data[0x200:0xfcc0]

class Bits:
    def __init__(self, buf):
        self.buf = buf; self.i = 0; self.tag = 0; self.n = 0
    def byte(self):
        b = self.buf[self.i]; self.i += 1; return b
    def bit(self):
        if self.n == 0:
            self.tag = self.byte(); self.n = 8
        self.n -= 1
        b = (self.tag >> 7) & 1
        self.tag = (self.tag << 1) & 0xff
        return b
    def gamma(self, start=0):
        # stub: [xor ecx,ecx]; inc ecx; { adc ecx,ecx via bit; while next bit }
        n = start
        while True:
            n += 1                      # inc ecx
            n = (n << 1) | self.bit()   # call ebx; adc ecx,ecx
            if not self.bit():          # call ebx; jc loop
                return n
            n -= 1                      # loop re-enters at inc ecx; net: n = n*2+bit each round
    # NOTE: careful transcription below in depack() instead; gamma() here mirrors
    # the stub exactly: entry at 0x486b4a does inc;adc;test-loop with re-entry at inc.

def gamma(bs, ecx0=0):
    ecx = ecx0
    while True:
        ecx += 1              # inc ecx
        ecx = (ecx << 1) | bs.bit()  # adc ecx,ecx after call
        if not bs.bit():
            return ecx
        # jc loops back to the inc ecx? no: jc jumps to 0x486b4b which is INC ecx?
        # 0x486b4a: inc ecx / 0x486b4b: call getbit / adc ecx,ecx / call getbit / jc 0x486b4b
        # so re-entry is AFTER the inc -> plain shift-in loop
        break_out = False
    return ecx

def gamma_exact(bs, skip_clear=False):
    # 0x486b48: xor ecx,ecx
    # 0x486b4a: inc ecx
    # 0x486b4b: call getbit; adc ecx,ecx; call getbit; jc 0x486b4b; ret
    ecx = 0 if not skip_clear else None
    raise SystemExit('unused')

def depack(src):
    bs = Bits(src)
    out = bytearray()
    out.append(bs.byte())          # movsb before first flag
    R0 = None
    def g(init):
        # exact: ecx=init; ecx+=1 once; then loop { ecx=ecx*2+bit; if !bit: done }
        ecx = init + 1
        while True:
            ecx = (ecx << 1) | bs.bit()
            if not bs.bit():
                return ecx
    while True:
        if not bs.bit():           # 0 -> literal
            out.append(bs.byte())
            continue
        if not bs.bit():           # 10 -> gamma match / repeat offset
            ecx = g(0)             # gamma, starts at ecx=0 (call skips xor)
            ecx -= 1               # dec ecx
            ecx -= 1               # loop decrements
            if ecx == 0:           # gamma was 2 -> reuse last offset
                length = g(0)      # fresh gamma (with xor)
                offs = R0
            else:
                eax = ecx - 1      # dec eax  (= gamma-3)
                offs = (eax << 8) | bs.byte()
                length = g(0)
                if offs >= 0x7d00: length += 2
                elif offs >= 0x500: length += 1
                elif offs <= 0x7f: length += 2
                R0 = offs
            for _ in range(length):
                out.append(out[-offs])
            continue
        if not bs.bit():           # 110 -> short match
            b = bs.byte()
            offs = b >> 1
            if offs == 0:
                break              # end of stream
            length = 2 + (b & 1)
            R0 = offs
            for _ in range(length):
                out.append(out[-offs])
            continue
        # 111 -> 4-bit offset, single byte (or zero byte)
        offs = 0
        for _ in range(4):
            offs = (offs << 1) | bs.bit()
        if offs:
            out.append(out[-offs])
        else:
            out.append(0)
    return out

img = depack(src)
print(f'depacked {len(img)} bytes (0x{len(img):x}), src consumed ~{len(src)}')

# E8/E9 fixup: 0x851 fixups, scan from image start
# stub: al=[edi++]; if (al-0xE8)>1 continue; if [edi]!=5 continue;
#   eax=[edi] (LE dword); bl=[edi+4]; ax>>=8; rol eax,16; xchg al,ah  == byteswap32 keeping marker out
#   eax -= edi(VA); eax += esi(0x401000)?? -> actually: sub eax,edi; add eax,esi with esi=imgbase
#   [edi]=eax; edi+=5; next opcode = bl
img = bytearray(img)
BASE = 0x401000
count = 0x851
i = 0
n = 0
while n < count and i < len(img):
    op = img[i]; i += 1
    if op not in (0xe8, 0xe9):
        continue
    if i >= len(img) or img[i] != 0x05:
        continue
    dw = struct.unpack_from('<I', img, i)[0]
    b4 = img[i+4]
    # stub: shr ax,8 ; rol eax,16 ; xchg al,ah
    eax = dw
    eax = (eax & 0xffff0000) | ((eax & 0xffff) >> 8)
    eax = ((eax << 16) | (eax >> 16)) & 0xffffffff
    eax = (eax & 0xffff0000) | ((eax & 0xff) << 8) | ((eax >> 8) & 0xff)
    edi_va = BASE + i
    rel = (eax - edi_va + BASE) & 0xffffffff
    struct.pack_into('<I', img, i, rel)
    i += 5
    n += 1
    # next opcode byte the stub takes from bl = b4 (it re-checks b4-0xE8)
    # our linear scan naturally handles it since we advanced past the dword+1?
    # careful: stub consumes 5 bytes AFTER opcode (dword + the byte it saved).
    # It treats b4 as the NEXT opcode: so total consumed = opcode+4, and b4 is
    # at position i-1 after our i+=5... replicate exactly:
    i -= 1  # b4 position; loop will read it as opcode
print(f'applied {n} E8/E9 fixups (expected 0x851={0x851})')

out = os.path.join(os.path.dirname(__file__), 'unpacked', 'sonnet_img.bin')
open(out, 'wb').write(img)
print('wrote', out)

# runtime memory is zero-filled to section vsize; pad so table walks terminate
img += bytes(0x86000 - len(img))

# ---- runtime import table (stub loop at 0x486b8e..0x486bd6) ----
# at VA 0x485000: { u32 dllname_off (VA 0x487000+off, lives in packed file's
# .rsrc = file 0xfe00), u32 iat_off (VA 0x401000+off), then C-string function
# names, empty string ends the DLL } ... until dllname_off dword == 0.
# OEP: jmp 0x4042d3
print('\nOEP = 0x4042d3')
print('---- runtime import table ----')
rsrc = data[0xfe00:0x10000]  # VA 0x487000+
off = 0x485000 - BASE
imports = {}
while True:
    name_off, iat_off = struct.unpack_from('<II', img, off)
    if name_off == 0:
        break
    dll = rsrc[name_off:rsrc.index(b'\x00', name_off)].decode(errors='replace')
    off += 8
    fns = []
    while img[off] != 0:
        s = img[off:img.index(b'\x00', off)].decode(errors='replace')
        fns.append(s)
        off += len(s) + 1
    off += 1
    imports[dll] = (0x401000 + iat_off, fns)
    print(f'{dll}  IAT@{hex(0x401000+iat_off)}')
    for f in fns:
        print('   ', f)
