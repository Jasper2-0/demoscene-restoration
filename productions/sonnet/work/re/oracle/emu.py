#!/usr/bin/env python3
"""emu.py — execute functions from the ORIGINAL Sonnet binary under unicorn.

The oracle substrate is `unpacked/sonnet_img.bin` (VA 0x401000 == file offset
0, verified).  This harness maps it, plays PE loader for the private IAT
(slot map from rebuild_pe.py), gives the code a stack, a zero-filled bump
allocator standing in for VirtualAlloc (MEM_COMMIT semantics — the binary has
no CRT and FUN_004042e0 depends on zero fill), and calls individual functions
with a sentinel return address.  Dumped buffers and RNG stream traces become
fixtures the JS port's suites compare against (test/oracle_test.mjs).

Two floating-point facts govern comparability (re/oracle/ORACLE.md):

  * FPCW — Windows starts Win32 processes with the x87 control word at 0x027F
    (53-bit precision); this binary has no CRT to change it, so THAT is the
    precision the original ran at.  unicorn's FNINIT default is 0x037F
    (80-bit).  Every call here sets 0x027F unless the caller overrides.
  * Transcendentals — QEMU computes FSIN/FCOS/F2XM1/… via the HOST's libm in
    double precision, not the Pentium's CORDIC microcode.  Bit-exactness
    claims therefore hold for add/sub/mul/div/sqrt chains (softfloat 80-bit,
    CW-honouring) but paths through transcendentals carry an ulp tolerance,
    recorded per fixture.

Usage: the target scripts in re/oracle/targets/*.py; see ORACLE.md.
"""

import json
import hashlib
import pathlib
import struct
import time

from unicorn import (Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE,
                     UC_HOOK_MEM_WRITE, UC_HOOK_MEM_UNMAPPED)
from unicorn.x86_const import (UC_X86_REG_EAX, UC_X86_REG_ECX, UC_X86_REG_EDX,
                               UC_X86_REG_ESP, UC_X86_REG_EBP, UC_X86_REG_EIP,
                               UC_X86_REG_FPCW)

HERE = pathlib.Path(__file__).resolve().parent
WORK = HERE.parent.parent
IMG_PATH = WORK / 'unpacked' / 'sonnet_img.bin'

BASE = 0x400000          # zero "header" page; GetModuleHandleA returns this
IMAGE_VA = 0x401000      # file offset 0 maps here (verified: VA == off + 0x401000)
TEXT_END = 0x486000      # rebuild_pe.py TEXT_VSZ 0x85000 — zero BSS tail beyond image
HEAP_BASE = 0x10000000
STUB_BASE = 0x0ff00000   # one slot per stubbed API
SENTINEL = 0x0ffff000    # return address for harness-initiated calls
STACK_BASE = 0x7fe00000
STACK_SIZE = 0x00100000
ESP0 = 0x7fef0000

RAND_SEED_VA = 0x41a9b8  # the ONE global LCG word ([0x41a9b8]) — js/rng.mjs
RAND_VA = 0x404258
SRAND_VA = 0x40424e
PROGRESS_TICK_VA = 0x4010dc   # void(void); draws via D3D — patched to `ret`

# The private IAT, exactly as rebuild_pe.py documents it (slot order == list order).
IAT = [
    (0x417000, 'GDI32.dll', ['TextOutA', 'GetDIBits', 'CreateFontA',
                             'CreateCompatibleDC', 'SelectObject', 'SetBkMode',
                             'DeleteDC', 'DeleteObject', 'CreateCompatibleBitmap',
                             'SetTextAlign', 'SetDIBits', 'SetTextColor']),
    (0x417034, 'KERNEL32.DLL', ['VirtualFree', 'VirtualAlloc', 'ExitProcess',
                                'SetThreadPriority', 'CreateThread', 'Sleep',
                                'GetModuleHandleA']),
    (0x417054, 'USER32.dll', ['DefWindowProcA', 'ValidateRect', 'SetCursor',
                              'UpdateWindow', 'AdjustWindowRect', 'CreateWindowExA',
                              'RegisterClassA', 'DispatchMessageA', 'TranslateMessage',
                              'GetMessageA', 'PeekMessageA', 'GetDC']),
    (0x417088, 'WINMM.dll', ['waveOutOpen', 'waveOutGetPosition', 'waveOutReset',
                             'waveOutClose', 'waveOutWrite', 'waveOutUnprepareHeader',
                             'waveOutPrepareHeader']),
    (0x4170a8, 'd3d8.dll', ['Direct3DCreate8']),
]

# stdcall argument byte counts for the stubs that must clean the stack.  Any
# API not listed defaults to 0 args (bare ret) — extend as targets need them.
STDCALL_ARGBYTES = {
    'VirtualAlloc': 16, 'VirtualFree': 12, 'ExitProcess': 4,
    'SetThreadPriority': 8, 'CreateThread': 24, 'Sleep': 4, 'GetModuleHandleA': 4,
    'Direct3DCreate8': 4,
    'waveOutOpen': 24, 'waveOutGetPosition': 12, 'waveOutReset': 4,
    'waveOutClose': 4, 'waveOutWrite': 12, 'waveOutUnprepareHeader': 12,
    'waveOutPrepareHeader': 12,
    'TextOutA': 20, 'GetDIBits': 28, 'CreateFontA': 56, 'CreateCompatibleDC': 4,
    'SelectObject': 8, 'SetBkMode': 8, 'DeleteDC': 4, 'DeleteObject': 4,
    'CreateCompatibleBitmap': 12, 'SetTextAlign': 8, 'SetDIBits': 28,
    'SetTextColor': 8,
    'DefWindowProcA': 16, 'ValidateRect': 8, 'SetCursor': 4, 'UpdateWindow': 4,
    'AdjustWindowRect': 12, 'CreateWindowExA': 48, 'RegisterClassA': 4,
    'DispatchMessageA': 4, 'TranslateMessage': 4, 'GetMessageA': 16,
    'PeekMessageA': 20, 'GetDC': 4,
}


class SonnetEmu:
    def __init__(self, heap_mb=64, trace_rand=False):
        self.uc = Uc(UC_ARCH_X86, UC_MODE_32)
        uc = self.uc

        img = IMG_PATH.read_bytes()
        self.image_sha256 = hashlib.sha256(img).hexdigest()
        uc.mem_map(BASE, TEXT_END - BASE)          # header page + image + BSS tail
        uc.mem_write(IMAGE_VA, img)

        uc.mem_map(HEAP_BASE, heap_mb << 20)
        self.heap_top = HEAP_BASE
        self.heap_end = HEAP_BASE + (heap_mb << 20)
        self.allocations = []                       # {eip, va, size}

        uc.mem_map(STACK_BASE, STACK_SIZE)
        uc.mem_map(SENTINEL & ~0xfff, 0x1000)
        uc.mem_write(SENTINEL, b'\xf4')             # hlt — never actually executed

        # ---- API stubs: each stub is a real `ret imm16` instruction so control
        # flow needs no EIP surgery — the code hook that fires on it supplies
        # EAX and side effects, then the ret executes natively.  The same
        # machinery serves the IAT and the fake D3D8 COM layer (d3d8fake.py).
        uc.mem_map(STUB_BASE, 0x8000)
        self.stub_by_addr = {}                      # addr -> (name, handler|None)
        self.api_log = []                           # (name, eip_of_callsite)
        self._stub_next = STUB_BASE
        for iat_va, _dll, fns in IAT:
            for i, fn in enumerate(fns):
                addr = self.add_stub(fn, STDCALL_ARGBYTES.get(fn, 0), None)
                uc.mem_write(iat_va + i * 4, struct.pack('<I', addr))
        uc.hook_add(UC_HOOK_CODE, self._on_stub,
                    begin=STUB_BASE, end=STUB_BASE + 0x8000)

        # progressTick renders the loading screen through the D3D vtable and is
        # reached from texgen's op-table callback (jmp 0x4010dc), buildTree AND
        # the audio callback — neutralised at the source.  void(void) => `ret`.
        uc.mem_write(PROGRESS_TICK_VA, b'\xc3')

        # ---- RNG stream: trace writes to the one global seed word
        self.rand_writes = 0
        self.rand_trace = [] if trace_rand else None
        uc.hook_add(UC_HOOK_MEM_WRITE, self._on_seed_write,
                    begin=RAND_SEED_VA, end=RAND_SEED_VA + 3)

        self.unmapped = None
        uc.hook_add(UC_HOOK_MEM_UNMAPPED, self._on_unmapped)

        self.exit_process = None

    # ------------------------------------------------------------------ stubs
    def add_stub(self, name, argbytes, handler):
        """Reserve a stub slot: a real `ret imm16` (or bare `ret`) at a unique
        address.  `handler(emu, args)` — args reads the stack — may return an
        EAX value; None keeps the default 0."""
        addr = self._stub_next
        if addr + 16 > STUB_BASE + 0x8000:
            raise RuntimeError('stub page exhausted')
        self._stub_next += 16
        self.uc.mem_write(addr, b'\xc2' + struct.pack('<H', argbytes)
                          if argbytes else b'\xc3')
        self.stub_by_addr[addr] = (name, handler)
        return addr

    # ------------------------------------------------------------------ hooks
    def _on_stub(self, uc, address, size, user):
        entry = self.stub_by_addr.get(address)
        if entry is None:
            raise RuntimeError(f'execution reached unregistered stub {address:#x}')
        name, handler = entry
        esp = uc.reg_read(UC_X86_REG_ESP)
        ret = struct.unpack('<I', uc.mem_read(esp, 4))[0]
        args = lambda n: struct.unpack(f'<{n}I', uc.mem_read(esp + 4, 4 * n))
        self.api_log.append((name, ret))
        if handler is not None:
            eax = handler(self, args)
            uc.reg_write(UC_X86_REG_EAX, 0 if eax is None else eax & 0xffffffff)
            return
        eax = 0
        if name == 'VirtualAlloc':
            _addr, sz, _type, _prot = args(4)
            eax = self._bump_alloc(sz, ret)
        elif name == 'VirtualFree':
            eax = 1
        elif name == 'GetModuleHandleA':
            eax = BASE
        elif name in ('SetThreadPriority', 'SelectObject'):
            eax = 1
        elif name == 'CreateThread':
            eax = 0x1234                      # recorded, never scheduled
        elif name == 'ExitProcess':
            self.exit_process = args(1)[0]
            uc.emu_stop()
            return
        # everything else: log + return 0
        uc.reg_write(UC_X86_REG_EAX, eax)

    def _bump_alloc(self, size, eip=0):
        va = self.heap_top
        size_aligned = (size + 0xfff) & ~0xfff
        if va + size_aligned > self.heap_end:
            raise MemoryError(f'oracle heap exhausted ({size} B requested)')
        self.heap_top += size_aligned
        self.allocations.append({'eip': hex(eip), 'va': hex(va), 'size': size})
        return va

    def _on_seed_write(self, uc, access, address, size, value, user):
        self.rand_writes += 1
        if self.rand_trace is not None:
            # EIP identifies rand (0x40426c) vs srand vs a direct poke; the
            # caller is one level up the stack for rand/srand (no prologue).
            eip = uc.reg_read(UC_X86_REG_EIP)
            esp = uc.reg_read(UC_X86_REG_ESP)
            caller = struct.unpack('<I', uc.mem_read(esp, 4))[0]
            self.rand_trace.append((eip, caller, value & 0xffffffff))

    def _on_unmapped(self, uc, access, address, size, value, user):
        self.unmapped = {'access': access, 'address': hex(address), 'size': size,
                         'eip': hex(uc.reg_read(UC_X86_REG_EIP))}
        return False

    # ------------------------------------------------------------- primitives
    def read(self, va, size):
        return bytes(self.uc.mem_read(va, size))

    def write(self, va, data):
        self.uc.mem_write(va, bytes(data))

    def u32(self, va):
        return struct.unpack('<I', self.read(va, 4))[0]

    def set_u32(self, va, v):
        self.write(va, struct.pack('<I', v & 0xffffffff))

    @property
    def seed(self):
        return self.u32(RAND_SEED_VA)

    @seed.setter
    def seed(self, v):
        self.set_u32(RAND_SEED_VA, v)

    def alloc(self, size):
        """Harness-side allocation from the same zeroed bump heap."""
        return self._bump_alloc(size)

    # ------------------------------------------------------------------ calls
    def call(self, va, *args, this=None, fpcw=0x027F, timeout_s=120,
             convention='cdecl'):
        """Call `va` and run to the sentinel return.  cdecl/stdcall push args
        right-to-left; thiscall additionally puts `this` in ECX.  Returns EAX.
        """
        uc = self.uc
        esp = ESP0
        for a in reversed(args):
            esp -= 4
            uc.mem_write(esp, struct.pack('<I', a & 0xffffffff))
        esp -= 4
        uc.mem_write(esp, struct.pack('<I', SENTINEL))
        uc.reg_write(UC_X86_REG_ESP, esp)
        uc.reg_write(UC_X86_REG_EBP, ESP0 + 0x100)
        if this is not None:
            uc.reg_write(UC_X86_REG_ECX, this & 0xffffffff)
        uc.reg_write(UC_X86_REG_FPCW, fpcw)
        self.unmapped = None
        t0 = time.time()
        uc.emu_start(va, SENTINEL, timeout=int(timeout_s * 1_000_000))
        self.last_call_seconds = time.time() - t0
        eip = uc.reg_read(UC_X86_REG_EIP)
        if self.exit_process is not None:
            raise RuntimeError(f'ExitProcess({self.exit_process}) during call')
        if eip != SENTINEL:
            raise RuntimeError(
                f'call to {va:#x} stopped at {eip:#x}, not the sentinel'
                + (f' — unmapped access {self.unmapped}' if self.unmapped else
                   ' (timeout?)'))
        return uc.reg_read(UC_X86_REG_EAX)


# ------------------------------------------------------------------- resources
INIT_VA = 0x401c1f       # FUN_00401c1f: points DAT_004747b8 at the archive —
                         # REQUIRED before texgen (FUN_00416036) or anything
                         # that generates textures inline (buildTree does)
TEXGEN_VA = 0x416036     # FUN_00416036(id, w, h, out) cdecl
ARCHIVE_VA = 0x4170da    # 52 length-prefixed blocks {u32 len; u8 data[len]}
ARCHIVE_END = 0x4181fc


def read_archive(emu):
    """The resource archive, exactly as FUN_00401c3b walks it."""
    blocks = []
    va = ARCHIVE_VA
    while va < ARCHIVE_END:
        ln = emu.u32(va)
        blocks.append(bytes(emu.read(va + 4, ln)))
        va += 4 + ln
    assert va == ARCHIVE_END, f'archive walk ended at {va:#x}'
    assert len(blocks) == 52, f'{len(blocks)} blocks, expected 52'
    return blocks


def texprog_size(blocks, pid):
    import struct as _s
    w, h = _s.unpack_from('<HH', blocks[pid], 1)
    return w, h


# --------------------------------------------------------------------- fixtures
def fixture_dir(target, case):
    d = HERE / 'fixtures' / target / case
    d.mkdir(parents=True, exist_ok=True)
    return d


def write_fixture(target, case, *, fn_va, call, emu, dumps, extra=None,
                  fpcw=0x027F, seed_before=None, seed_after=None):
    """dumps: list of (name, bytes).  Writes <name>.bin files + manifest.json."""
    d = fixture_dir(target, case)
    entries = []
    for name, data in dumps:
        (d / f'{name}.bin').write_bytes(data)
        entries.append({'name': name, 'file': f'{name}.bin', 'size': len(data),
                        'sha256': hashlib.sha256(data).hexdigest()})
    manifest = {
        'target': target, 'case': case, 'fn_va': hex(fn_va), 'call': call,
        'fpcw': hex(fpcw),
        'seed_before': None if seed_before is None else hex(seed_before),
        'seed_after': None if seed_after is None else hex(seed_after),
        'image': {'path': 'unpacked/sonnet_img.bin', 'sha256': emu.image_sha256},
        'emulator': {'unicorn': __import__('unicorn').__version__,
                     'host': 'darwin-arm64',
                     'note': 'x87 arithmetic softfloat-80 honouring FPCW; '
                             'transcendentals via host libm double'},
        'dumps': entries,
        'rand_writes': emu.rand_writes,
    }
    if extra:
        manifest.update(extra)
    (d / 'manifest.json').write_text(json.dumps(manifest, indent=1))
    return d
