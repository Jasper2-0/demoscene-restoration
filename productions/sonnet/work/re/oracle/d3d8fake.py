"""d3d8fake.py — a minimal fake D3D8 COM layer for scene-depth emulation.

The binary reaches the device through the global `DAT_004747ac` and calls a
KNOWN set of vtable offsets (the complete per-call-site inventory is
re/engine/D3D8_API.md).  Each method here is a `ret imm16` stub (emu.add_stub)
with the argbyte count from the d3d8.h signature — an offset the demo uses
that is NOT in these tables lands on an unregistered vtable slot and stops
emulation loudly, which is the extend-as-encountered contract.

What actually does something:
  * CreateTexture      — fabricates a fake texture object, real backing store
  * LockRect/UnlockRect (texture + surface) — hand out real zeroed memory with
    the natural pitch, so the original's own upload/mip-filter code RUNS and
    its output is dumpable (tex.levels[n] after the call)
  * GetLevelCount/GetLevelDesc/GetSurfaceLevel — consistent with CreateTexture
Everything else logs and returns D3D_OK.  GPU rasterisation does not exist
here — draw calls are no-ops — so render-target CONTENT is out of scope by
design; the CPU-side inputs to every pass are what the oracle dumps.
"""

import struct

D3D_OK = 0

# (offset, name, argbytes incl. this, handler-key or None)
DEVICE_VTBL = [
    (0x00, 'QueryInterface', 12, None), (0x04, 'AddRef', 4, None),
    (0x08, 'Release', 4, None),
    (0x1c, 'GetDeviceCaps', 8, None),
    (0x3c, 'Present', 20, None),
    (0x40, 'GetBackBuffer', 16, 'get_backbuffer'),
    (0x50, 'CreateTexture', 32, 'create_texture'),
    (0x68, 'CreateDepthStencilSurface', 24, 'create_surface_out5'),
    (0x6c, 'CreateImageSurface', 20, 'create_surface_out4'),
    (0x70, 'CopyRects', 24, None),
    (0x7c, 'SetRenderTarget', 12, None),
    (0x80, 'GetRenderTarget', 8, 'get_rendertarget'),
    (0x88, 'BeginScene', 4, None), (0x8c, 'EndScene', 4, None),
    (0x90, 'Clear', 28, None),
    (0x94, 'SetTransform', 12, None),
    (0xa0, 'SetViewport', 8, None),
    (0xa8, 'SetMaterial', 8, None),
    (0xb0, 'SetLight', 12, None), (0xb8, 'LightEnable', 12, None),
    (0xc0, 'SetClipPlane', 12, None),
    (0xc8, 'SetRenderState', 12, 'set_render_state'),
    (0xcc, 'GetRenderState', 12, 'get_render_state'),
    # d3d8.h order: 0xd0..0xe4 are the state-block methods, 0xe8/0xec clip
    # status, then GetTexture 0xf0, SetTexture 0xf4, Get/SetTextureStageState
    # 0xf8/0xfc — NOT 0xe0/0xe8 (a miscount that aliased DeleteStateBlock;
    # caught by the self-identifying unknown-slot stub at +0xfc).
    (0xf0, 'GetTexture', 12, 'get_texture'),
    (0xf4, 'SetTexture', 12, 'set_texture'),
    (0xf8, 'GetTextureStageState', 16, 'get_tss'),
    (0xfc, 'SetTextureStageState', 16, 'set_tss'),
    (0x118, 'DrawPrimitive', 16, None),
    (0x11c, 'DrawIndexedPrimitive', 24, None),
    (0x120, 'DrawPrimitiveUP', 20, None),
    (0x124, 'DrawIndexedPrimitiveUP', 36, None),
    (0x130, 'SetVertexShader', 8, None),
]

TEXTURE_VTBL = [
    (0x00, 'Tex.QueryInterface', 12, None), (0x04, 'Tex.AddRef', 4, None),
    (0x08, 'Tex.Release', 4, None),
    (0x34, 'Tex.GetLevelCount', 4, 'tex_get_level_count'),
    (0x38, 'Tex.GetLevelDesc', 12, 'tex_get_level_desc'),
    (0x3c, 'Tex.GetSurfaceLevel', 12, 'tex_get_surface_level'),
    (0x40, 'Tex.LockRect', 20, 'tex_lock_rect'),
    (0x44, 'Tex.UnlockRect', 8, 'tex_unlock_rect'),
]

SURFACE_VTBL = [
    (0x00, 'Surf.QueryInterface', 12, None), (0x04, 'Surf.AddRef', 4, None),
    (0x08, 'Surf.Release', 4, None),
    (0x24, 'Surf.LockRect', 16, 'surf_lock_rect'),
    (0x28, 'Surf.UnlockRect', 4, None),
]

DEVICE_GLOBAL = 0x4747ac      # DAT_004747ac — the device pointer the code reads


class FakeD3D8:
    def __init__(self, emu):
        self.emu = emu
        self.textures = {}        # obj_va -> {'w','h','levels','bufs':{level: va}}
        self.surfaces = {}        # obj_va -> {'w','h','buf'}
        self.calls = []           # (name, args tuple) — the method log
        self.unknown_hit = None   # set by the self-identifying unknown-slot stubs
        self.render_state = {}    # state id -> value (Set/GetRenderState pairs)
        self.tss = {}             # (stage, type) -> value

        self.vt_device = self._build_vtbl(DEVICE_VTBL)
        self.vt_texture = self._build_vtbl(TEXTURE_VTBL)
        self.vt_surface = self._build_vtbl(SURFACE_VTBL)

        dev = emu.alloc(0x10)
        emu.set_u32(dev, self.vt_device)
        emu.set_u32(DEVICE_GLOBAL, dev)
        self.device = dev

    def _build_vtbl(self, table, span=0x140):
        emu = self.emu
        vt = emu.alloc(span)
        # every slot filled: unregistered offsets get a SELF-IDENTIFYING stub
        # that records which interface+offset was called and stops emulation —
        # "extend the table, re-run" with the answer in hand instead of a bare
        # fetch-at-0.
        known = {off: (name, argbytes, key) for off, name, argbytes, key in table}
        iface = table[1][1].split('.')[0] if '.' in table[1][1] else 'Device'
        for off in range(0, span, 4):
            if off in known:
                name, argbytes, key = known[off]
                handler = getattr(self, '_h_' + key) if key else None
                emu.set_u32(vt + off, emu.add_stub(name, argbytes, handler))
            else:
                def make_unknown(o):
                    def h(e, args):
                        self.unknown_hit = f'{iface} vtbl+{o:#x} — add it to d3d8fake'
                        e.uc.emu_stop()
                    return h
                emu.set_u32(vt + off, emu.add_stub(f'{iface}+{off:#x}?', 0,
                                                   make_unknown(off)))
        return vt

    def _new_obj(self, vtbl):
        va = self.emu.alloc(0x10)
        self.emu.set_u32(va, vtbl)
        return va

    @staticmethod
    def _levels_for(w, h, levels):
        if levels:
            return levels
        n = 1
        while (w > 1) or (h > 1):
            w, h, n = max(1, w >> 1), max(1, h >> 1), n + 1
        return n

    # ---- device methods -----------------------------------------------------
    def _h_set_render_state(self, emu, args):
        _this, state, value = args(3)
        self.render_state[state] = value
        return D3D_OK

    def _h_get_render_state(self, emu, args):
        _this, state, pvalue = args(3)
        emu.set_u32(pvalue, self.render_state.get(state, 0))
        return D3D_OK

    def _h_set_texture(self, emu, args):
        _this, stage, tex = args(3)
        self.tss[('tex', stage)] = tex
        return D3D_OK

    def _h_get_texture(self, emu, args):
        _this, stage, pp = args(3)
        emu.set_u32(pp, self.tss.get(('tex', stage), 0))
        return D3D_OK

    def _h_set_tss(self, emu, args):
        _this, stage, ttype, value = args(4)
        self.tss[(stage, ttype)] = value
        return D3D_OK

    def _h_get_tss(self, emu, args):
        _this, stage, ttype, pvalue = args(4)
        emu.set_u32(pvalue, self.tss.get((stage, ttype), 0))
        return D3D_OK

    def _h_create_texture(self, emu, args):
        _this, w, h, levels, _usage, _fmt, _pool, pp = args(8)
        tex = self._new_obj(self.vt_texture)
        self.textures[tex] = {'w': w, 'h': h,
                              'levels': self._levels_for(w, h, levels), 'bufs': {}}
        emu.set_u32(pp, tex)
        self.calls.append(('CreateTexture', (w, h, levels)))
        return D3D_OK

    def _make_surface(self, w, h):
        surf = self._new_obj(self.vt_surface)
        self.surfaces[surf] = {'w': w, 'h': h, 'buf': self.emu.alloc(w * h * 4)}
        return surf

    def _h_create_surface_out4(self, emu, args):    # CreateImageSurface(w,h,fmt,pp)
        _this, w, h, _fmt, pp = args(5)
        emu.set_u32(pp, self._make_surface(w, h))
        return D3D_OK

    def _h_create_surface_out5(self, emu, args):    # CreateDepthStencilSurface
        _this, w, h, _fmt, _ms, pp = args(6)
        emu.set_u32(pp, self._make_surface(w, h))
        return D3D_OK

    def _h_get_backbuffer(self, emu, args):
        _this, _idx, _type, pp = args(4)
        emu.set_u32(pp, self._make_surface(640, 480))
        return D3D_OK

    def _h_get_rendertarget(self, emu, args):
        _this, pp = args(2)
        emu.set_u32(pp, self._make_surface(640, 480))
        return D3D_OK

    # ---- texture methods ----------------------------------------------------
    def _tex(self, args, n):
        vals = args(n)
        return self.textures[vals[0]], vals

    def _h_tex_get_level_count(self, emu, args):
        t, _ = self._tex(args, 1)
        return t['levels']

    def _h_tex_get_level_desc(self, emu, args):
        t, (_this, level, pdesc) = self._tex(args, 3)
        w = max(1, t['w'] >> level)
        h = max(1, t['h'] >> level)
        emu.set_u32(pdesc + 0x18, w)      # desc.Width  (D3D8_API.md §6.1)
        emu.set_u32(pdesc + 0x1c, h)      # desc.Height
        return D3D_OK

    def _level_buf(self, t, level):
        if level not in t['bufs']:
            w = max(1, t['w'] >> level)
            h = max(1, t['h'] >> level)
            t['bufs'][level] = self.emu.alloc(w * h * 4)
        return t['bufs'][level]

    def _h_tex_lock_rect(self, emu, args):
        t, (_this, level, plocked, _prect, _flags) = self._tex(args, 5)
        w = max(1, t['w'] >> level)
        emu.set_u32(plocked, w * 4)                      # D3DLOCKED_RECT.Pitch
        emu.set_u32(plocked + 4, self._level_buf(t, level))   # .pBits
        return D3D_OK

    def _h_tex_unlock_rect(self, emu, args):
        return D3D_OK

    def _h_tex_get_surface_level(self, emu, args):
        t, (_this, level, pp) = self._tex(args, 3)
        surf = self._new_obj(self.vt_surface)
        w = max(1, t['w'] >> level)
        h = max(1, t['h'] >> level)
        self.surfaces[surf] = {'w': w, 'h': h, 'buf': self._level_buf(t, level)}
        emu.set_u32(pp, surf)
        return D3D_OK

    # ---- surface methods ----------------------------------------------------
    def _h_surf_lock_rect(self, emu, args):
        _this, plocked, _prect, _flags = args(4)
        s = self.surfaces[_this]
        emu.set_u32(plocked, s['w'] * 4)
        emu.set_u32(plocked + 4, s['buf'])
        return D3D_OK

    # ---- fixture helpers ----------------------------------------------------
    def texture_level_bytes(self, tex_va, level=0):
        t = self.textures[tex_va]
        w = max(1, t['w'] >> level)
        h = max(1, t['h'] >> level)
        return self.emu.read(self._level_buf(t, level), w * h * 4)


def install(emu):
    return FakeD3D8(emu)
