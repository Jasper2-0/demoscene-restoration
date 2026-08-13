#!/usr/bin/env python3
"""Decode Sonnet's text-item table (VA 0x418328) byte-exactly.

Layout (from FUN_004067c0 @ 0x4067c0):
    u16 count                                   @0x418328
    then `count` variable-length records @0x41832a:
        u16 mask
        if mask&0x001: u16 flags      -> item+0x0a
        if mask&0x002: f32 rot        -> item+0x14
        if mask&0x004: f32 x          -> item+0x24
        if mask&0x008: f32 y          -> item+0x28
        if mask&0x010: f32 tracking   -> item+0x2c
        if mask&0x020: f32 lineadv    -> item+0x30
        if mask&0x040: f32 scale      -> item+0x34
        if mask&0x080: u32 color      -> item+0x38   (D3DCOLOR ARGB)
        if mask&0x100: f32 speed      -> item+0x3c
        u8  len
        if mask&0x200: char text[len]      else inherit prev item's text buffer
        if mask&0x400: u8   attr[len]      else inherit prev item's attr+size buffers
    Every field NOT present is inherited from the PREVIOUS item, because the
    parser memcpy()s the whole 0x40-byte previous item over the new one first.

    attr[i] decoding (FUN_004067c0 @0x406990..):
        size[i] = (attr[i] >> 2) / 63.0     -> item+0x20 (per-char size multiplier)
        attr[i] &= 3                        -> item+0x1c
        bit0 = BOLD   (also sets text[i] |= 0x80, selecting the bold atlas rows)
        bit1 = ITALIC (fake, by shearing the glyph quad)
"""
import struct, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
IMG  = open(os.path.join(HERE, '..', '..', 'unpacked', 'sonnet_img.bin'), 'rb').read()
BASE = 0x401000
TBL  = 0x418328

def parse():
    off = TBL - BASE
    count = struct.unpack_from('<H', IMG, off)[0]; off += 2
    items = []
    cur = dict(flags=0, rot=0.0, x=0.0, y=0.0, tracking=0.0, lineadv=0.0,
               scale=0.0, color=0, speed=0.0, text='', attr=[], size=[])
    for n in range(count):
        va = BASE + off
        mask = struct.unpack_from('<H', IMG, off)[0]; off += 2
        it = dict(cur)                       # <- full-struct inheritance
        it['idx'] = n; it['va'] = '0x%x' % va; it['mask'] = '0x%03x' % mask
        def f32():
            nonlocal off
            v = struct.unpack_from('<f', IMG, off)[0]; off += 4; return v
        def u32():
            nonlocal off
            v = struct.unpack_from('<I', IMG, off)[0]; off += 4; return v
        if mask & 0x001:
            it['flags'] = struct.unpack_from('<H', IMG, off)[0]; off += 2
        if mask & 0x002: it['rot']      = f32()
        if mask & 0x004: it['x']        = f32()
        if mask & 0x008: it['y']        = f32()
        if mask & 0x010: it['tracking'] = f32()
        if mask & 0x020: it['lineadv']  = f32()
        if mask & 0x040: it['scale']    = f32()
        if mask & 0x080: it['color']    = u32()
        if mask & 0x100: it['speed']    = f32()
        ln = IMG[off]; off += 1
        it['len'] = ln
        if mask & 0x200:
            it['text'] = IMG[off:off+ln].decode('latin1'); off += ln
        else:
            it['text'] = cur['text'][:ln]          # inherited buffer, truncated by len
        if mask & 0x400:
            raw = list(IMG[off:off+ln]); off += ln
            it['attr'] = [b & 3 for b in raw]
            it['size'] = [(b >> 2) / 63.0 for b in raw]
        else:
            it['attr'] = (cur['attr'] + [0]*ln)[:ln]
            it['size'] = (cur['size'] + [0.0]*ln)[:ln]
        items.append(it)
        cur = it
    return count, items, BASE + off

if __name__ == '__main__':
    count, items, end = parse()
    print('count = %d, table 0x%x .. 0x%x' % (count, TBL, end))
    for it in items:
        style = ''.join('BI'[0] if a & 1 else ('BI'[1] if a & 2 else '.') for a in it['attr'])
        print('%2d %s m=%s  x=%-6g y=%-6g sc=%-5g tr=%-4g sp=%-4g col=%08X fl=%04X  %r'
              % (it['idx'], it['va'], it['mask'], it['x'], it['y'], it['scale'],
                 it['tracking'], it['speed'], it['color'], it['flags'], it['text']))
        print('      style %s' % style)
        print('      size  %s' % ' '.join('%.3g' % s for s in it['size']))

# ---------------------------------------------------------------- JSON dump --
def dump_json(path):
    import json
    count, items, end = parse()
    # timeline events for object 1 (the Font object), event table @0x41a048
    ev = []
    va = 0x41A048
    while va < 0x41A970:
        t, o, m, p = struct.unpack_from('<HBBf', IMG, va - BASE)
        if o == 1:
            ev.append(dict(pos='0x%04x' % t, method=m, param=p))
        va += 8
    show = {}
    for e in ev:
        if e['method'] in (0, 1):
            n = int(round(e['param']))
            show.setdefault(n, []).append((e['method'], e['pos']))
    for it in items:
        it['timeline'] = [dict(action='show' if a == 0 else 'hide', pos=p)
                          for a, p in show.get(it['idx'], [])]
        it['color_argb'] = '#%08X' % it['color']
    out = dict(
        source='sonnet.exe (threestate, Assembly 2001 64k) unpacked image',
        table_va='0x%08x' % TBL,
        table_end_va='0x%08x' % end,
        record_count=count,
        parser='FUN_004067c0 @ 0x004067c0',
        renderer='FUN_00406db7 @ 0x00406db7',
        updater='FUN_004072e9 @ 0x004072e9',
        event_handler='FUN_004076c4 @ 0x004076c4',
        notes=[
            'x,y are 640x480 screen pixels; the line is CENTRED on (x,y).',
            'scale is atlas-pixels -> screen-pixels (1.0 == 1 atlas texel per screen pixel).',
            'tracking multiplies every glyph advance (item+0x2c).',
            'size[] is the per-character SIZE multiplier (attr>>2)/63, NOT a timing.',
            'attr[] bit0 = bold, bit1 = fake italic (quad shear). There is NO typewriter reveal.',
            'speed drives t: dt_per_frame * 0.01 * speed, t clamped to [0,1].',
            'item 0 is never triggered by the timeline - it is drawn by the loading screen '
            '(FUN_004010dc @0x4010dc sets item0.active=1, t=1.0).',
        ],
        items=items)
    json.dump(out, open(path, 'w'), indent=1)
    print('wrote', path, count, 'records')

