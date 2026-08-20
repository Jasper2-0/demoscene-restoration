"""Recover a Warp3D library's LVO table from the shipped binary itself.

An Amiga RTF_AUTOINIT library carries a Resident (ROMTag) whose rt_Init points at
{dSize, vectors, structure, initFunc}. `vectors` is the function table that
MakeLibrary turns into the jump table: either 32-bit absolute pointers terminated
by -1, or — if the first word is -1 — 16-bit self-relative offsets. Either way it
is in canonical vector order, first entry at LVO -6.

This is the actual library Planet Potion links against, so it settles the
ordering without depending on any reimplementation.
"""
import struct, sys, os
import hunkload

BASE, STRIDE = hunkload.BASE, hunkload.STRIDE


def load(path):
    segs, syms = hunkload.load(path)
    bases, cur = [], BASE
    for s in segs:
        bases.append(cur)
        cur = (cur + max(len(s['data']), 1) + STRIDE - 1) & ~(STRIDE - 1)
    for s in segs:
        for off, tgt in s['relocs']:
            v = struct.unpack_from('>I', s['data'], off)[0]
            struct.pack_into('>I', s['data'], off, (v + bases[tgt]) & 0xFFFFFFFF)
    mem = {}
    for s, b in zip(segs, bases):
        mem[b] = bytes(s['data'])
    return mem, bases, segs, syms


def rd(mem, addr, n):
    for b, d in mem.items():
        if b <= addr < b + len(d):
            return d[addr - b:addr - b + n]
    return None


def u32(mem, a):
    r = rd(mem, a, 4)
    return struct.unpack('>I', r)[0] if r and len(r) == 4 else None


def u16(mem, a):
    r = rd(mem, a, 2)
    return struct.unpack('>H', r)[0] if r and len(r) == 2 else None


def cstr(mem, a, n=64):
    r = rd(mem, a, n)
    if not r: return ''
    return r.split(b'\0')[0].decode('latin1', 'replace')


def main(path):
    mem, bases, segs, syms = load(path)
    print(f'{os.path.basename(path)}: {len(segs)} hunks, {len(syms)} symbols')

    # find the ROMTag: rt_MatchWord 0x4AFC with rt_MatchTag pointing at itself
    tags = []
    for b, d in mem.items():
        for off in range(0, len(d) - 26, 2):
            if d[off] == 0x4A and d[off + 1] == 0xFC:
                addr = b + off
                if u32(mem, addr + 2) == addr:
                    tags.append(addr)
    print(f'  ROMTag(s): {[hex(t) for t in tags] or "none found"}')
    for t in tags:
        flags = rd(mem, t + 10, 1)[0]
        ver = rd(mem, t + 11, 1)[0]
        name = cstr(mem, u32(mem, t + 14))
        idstr = cstr(mem, u32(mem, t + 18), 96)
        init = u32(mem, t + 22)
        print(f'  {t:#010x} flags={flags:#04x} ver={ver} name={name!r}')
        print(f'      id: {idstr!r}')
        if not (flags & 0x80):
            print('      not RTF_AUTOINIT — rt_Init is code, table not directly readable')
            continue
        dsize, vectors, structure, initf = (u32(mem, init + i * 4) for i in range(4))
        print(f'      AUTOINIT dSize={dsize:#x} vectors={vectors:#010x}')
        first = u16(mem, vectors)
        entries = []
        if first == 0xFFFF:                       # 16-bit self-relative table
            p = vectors + 2
            while True:
                w = u16(mem, p)
                if w is None or w == 0xFFFF: break
                off = w - 0x10000 if w & 0x8000 else w
                entries.append((vectors + (p - vectors) + off) & 0xFFFFFFFF)
                p += 2
            kind = '16-bit relative'
        else:                                     # 32-bit absolute pointers
            p = vectors
            while True:
                v = u32(mem, p)
                if v is None or v == 0xFFFFFFFF: break
                entries.append(v); p += 4
            kind = '32-bit absolute'
        print(f'      {kind} table: {len(entries)} vectors')
        print(f'      first library vector (LVO -30) = index 4')
        want = {-30: 'CreateContext', -36: 'DestroyContext', -48: 'SetState',
                -60: 'LockHardware', -66: 'UnLockHardware', -168: 'DrawTriFan',
                -450: 'ClearDrawRegion'}
        print(f'      LVO  idx  target')
        for lvo in sorted(want, reverse=True):
            idx = abs(lvo) // 6 - 1
            tgt = entries[idx] if idx < len(entries) else None
            print(f'      {lvo:5} {idx:4}  {tgt:#010x}' if tgt else f'      {lvo:5} {idx:4}  <past end>')
        return entries
    return None


if __name__ == '__main__':
    main(sys.argv[1])
