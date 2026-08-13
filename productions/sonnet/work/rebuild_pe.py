#!/usr/bin/env python3
"""Rebuild a loadable/analysable PE from the depacked Sonnet image.

Input : unpacked/sonnet_img.bin  (runtime image, VA 0x401000 .. 0x485273)
Output: unpacked/sonnet_u.exe

Layout of the rebuilt file:
  .text   RVA 0x1000, vsize 0x85000  -> the depacked image verbatim
  .idata  RVA 0x86000               -> synthetic import descriptors + name table

The original resolves imports itself into a PRIVATE IAT at fixed addresses
(GDI32@0x417000, KERNEL32@0x417034, USER32@0x417054, WINMM@0x417088,
d3d8@0x4170a8 -- read from the stub's table at VA 0x485000). We point a real
PE import directory at those SAME addresses, so the Windows loader (and
Ghidra's analyser) populate exactly the slots the code already dereferences.
Call sites then decompile as named API calls instead of indirect jumps.

Entry point = the stub's final jmp target, VA 0x4042d3.
"""
import struct, os

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = open(os.path.join(HERE, 'unpacked', 'sonnet_img.bin'), 'rb').read()
OUT = os.path.join(HERE, 'unpacked', 'sonnet_u.exe')

BASE      = 0x400000
IMG_VA    = 0x401000
ENTRY_VA  = 0x4042d3
TEXT_RVA  = 0x1000
TEXT_VSZ  = 0x85000          # covers 0x401000..0x486000
IDATA_RVA = 0x86000
FILEALIGN = 0x200
SECTALIGN = 0x1000

# ---- import table recovered by unpack.py (VA of each DLL's first IAT slot) ----
IMPORTS = [
    ('GDI32.dll',    0x417000, ['TextOutA', 'GetDIBits', 'CreateFontA',
                                'CreateCompatibleDC', 'SelectObject', 'SetBkMode',
                                'DeleteDC', 'DeleteObject', 'CreateCompatibleBitmap',
                                'SetTextAlign', 'SetDIBits', 'SetTextColor']),
    ('KERNEL32.DLL', 0x417034, ['VirtualFree', 'VirtualAlloc', 'ExitProcess',
                                'SetThreadPriority', 'CreateThread', 'Sleep',
                                'GetModuleHandleA']),
    ('USER32.dll',   0x417054, ['DefWindowProcA', 'ValidateRect', 'SetCursor',
                                'UpdateWindow', 'AdjustWindowRect', 'CreateWindowExA',
                                'RegisterClassA', 'DispatchMessageA', 'TranslateMessage',
                                'GetMessageA', 'PeekMessageA', 'GetDC']),
    ('WINMM.dll',    0x417088, ['waveOutOpen', 'waveOutGetPosition', 'waveOutReset',
                                'waveOutClose', 'waveOutWrite', 'waveOutUnprepareHeader',
                                'waveOutPrepareHeader']),
    ('d3d8.dll',     0x4170a8, ['Direct3DCreate8']),
]

# sanity: each IAT run must fit before the next one starts
for i, (dll, iat, fns) in enumerate(IMPORTS):
    need = (len(fns) + 1) * 4          # + null terminator slot
    nxt = min((x[1] for x in IMPORTS if x[1] > iat), default=iat + need)
    assert iat + need <= nxt, f'{dll} IAT run overlaps next table ({hex(iat)}+{need:#x} > {nxt:#x})'

# ---- build .idata: descriptors, ILTs, hint/name strings ----------------------
# The IATs live inside .text (they are part of the depacked image), so .idata
# only holds the descriptor array, the ILTs, and the name strings.
idata = bytearray()
def place(b):
    off = len(idata); idata.extend(b); return IDATA_RVA + off

ndesc = len(IMPORTS) + 1
desc_rva = IDATA_RVA
idata.extend(b'\x00' * (ndesc * 20))       # reserve descriptor array

entries = []
for dll, iat_va, fns in IMPORTS:
    name_rvas = []
    for fn in fns:
        if len(idata) & 1:                  # hint/name entries must be word-aligned
            idata.append(0)
        name_rvas.append(place(struct.pack('<H', 0) + fn.encode() + b'\x00'))
    dll_rva = place(dll.encode() + b'\x00')
    if len(idata) & 3:
        idata.extend(b'\x00' * (4 - (len(idata) & 3)))
    ilt_rva = place(struct.pack(f'<{len(name_rvas)+1}I', *name_rvas, 0))
    entries.append((ilt_rva, dll_rva, iat_va - BASE))

for i, (ilt, name, iat) in enumerate(entries):
    struct.pack_into('<IIIII', idata, i * 20, ilt, 0, 0, name, iat)

IDATA_VSZ = len(idata)

# ---- assemble the image ------------------------------------------------------
text = bytearray(IMG)
text.extend(b'\x00' * (TEXT_VSZ - len(text)))   # zero-fill BSS tail (music buffers etc.)

# The depacked image already contains the resolved-at-runtime IAT area as zeros;
# the loader will fill it. Nothing to patch.

def align(n, a):
    return (n + a - 1) & ~(a - 1)

text_raw  = align(len(text), FILEALIGN)
idata_raw = align(IDATA_VSZ, FILEALIGN)

hdr = bytearray(0x400)
# DOS
hdr[0:2] = b'MZ'
struct.pack_into('<I', hdr, 0x3c, 0x80)
hdr[0x80:0x84] = b'PE\x00\x00'
# COFF
struct.pack_into('<HHIIIHH', hdr, 0x84,
                 0x014c,        # i386
                 2,             # 2 sections
                 0x3B67F16F,    # timestamp (original link date 2001-08-01)
                 0, 0,
                 0xE0,          # optional header size
                 0x0102)        # EXECUTABLE_IMAGE | 32BIT_MACHINE
o = 0x84 + 20
# optional header (PE32)
struct.pack_into('<HBBIIIIII', hdr, o,
                 0x010b, 6, 0,
                 text_raw, 0, 0,
                 ENTRY_VA - BASE,
                 TEXT_RVA, IDATA_RVA)
struct.pack_into('<IIIHHHHHHIIIIHH', hdr, o + 28,
                 BASE, SECTALIGN, FILEALIGN,
                 4, 0, 0, 0, 4, 0,
                 0,
                 align(IDATA_RVA + IDATA_VSZ, SECTALIGN),   # SizeOfImage
                 0x400,                                     # SizeOfHeaders
                 0,
                 2,                                         # GUI subsystem
                 0)
struct.pack_into('<IIIIII', hdr, o + 72,
                 0x100000, 0x1000, 0x100000, 0x1000, 0, 16) # stack/heap, 16 dirs
# data directory 1 = import
struct.pack_into('<II', hdr, o + 96 + 8, desc_rva, ndesc * 20)

so = 0x84 + 20 + 0xE0
for name, vsz, rva, rawsz, rawoff, flags in [
        (b'.text',  TEXT_VSZ,  TEXT_RVA,  text_raw,  0x400,             0xE0000060),
        (b'.idata', IDATA_VSZ, IDATA_RVA, idata_raw, 0x400 + text_raw,  0xC0000040)]:
    hdr[so:so+8] = name.ljust(8, b'\x00')
    struct.pack_into('<IIIIIIHHI', hdr, so + 8,
                     vsz, rva, rawsz, rawoff, 0, 0, 0, 0, flags)
    so += 40

with open(OUT, 'wb') as f:
    f.write(hdr)
    f.write(text.ljust(text_raw, b'\x00'))
    f.write(bytes(idata).ljust(idata_raw, b'\x00'))

print(f'wrote {OUT} ({os.path.getsize(OUT)} bytes)')
print(f'  entry     VA {ENTRY_VA:#x} (RVA {ENTRY_VA-BASE:#x})')
print(f'  .text     VA {BASE+TEXT_RVA:#x} vsize {TEXT_VSZ:#x}')
print(f'  .idata    VA {BASE+IDATA_RVA:#x} vsize {IDATA_VSZ:#x}, {len(IMPORTS)} DLLs, '
      f'{sum(len(f) for _,_,f in IMPORTS)} functions')
