# The emulator oracle — executing the ORIGINAL as ground truth

`re/oracle/` runs functions from the original binary (`unpacked/sonnet_img.bin`,
VA 0x401000 == file offset 0) under unicorn-engine 2.1.4 (QEMU TCG) and dumps
their outputs as fixtures the JS port's suites compare against
(`web-sonnet/test/oracle_test.mjs`). "It's a port — whatever the original does
is the right answer" (Jasper, 2026-08-11); this is the machine that asks it.

## Layout

    .venv/            python venv (unicorn 2.1.4)
    emu.py            SonnetEmu: image mapping, IAT stubs, bump allocator,
                      RNG hooks, call ABI, fixture writer, resource archive
    d3d8fake.py       minimal fake D3D8 COM layer (extend-as-encountered)
    winstubs — the IAT slot map lives in emu.py (from rebuild_pe.py's IMPORTS)
    targets/
      rng_smoke.py    milestone 1 — emulated srand/rand vs the MSVC LCG
      texgen.py       milestone 2 — FUN_00416036 for all 27 pixel programs
      tree.py         milestone 3 — FUN_00409d45 cold-called, 2 chain proofs
    fixtures/<target>/<case>/{manifest.json, *.bin}

Run: `re/oracle/.venv/bin/python re/oracle/targets/<t>.py` from `work-sonnet/`.

## Results so far (2026-08-11)

* **rng_smoke**: 1000 emulated draws == the Python LCG; seed-write hook exact.
* **texgen**: all 27 programs execute (0.01–14 s each); output byte order is
  **BGRA** (ARGB dwords, little-endian). Program 14 vs the port's `runTexgen`:
  **max |Δ| = 1 LSB** over 256², ~33% of texels exactly equal — the first
  *measured* bound on the port's texture accuracy (previously "not claimed
  bit-identical, judged by eye").
* **tree**: two stream-chain proofs against independently recorded constants:
  cold call (inline bark+leaf texgen) lands on `0xa661ec3b` — the port's
  verified pre-pass state; with textures pre-cached it lands on
  `0x35f508ed + 1329×32 steps = 0xdedf2c8d`, confirming BOTH the port's
  buildTree post-state AND that the original keeps the 32-draws-per-leaf
  record tail inside FUN_00409d45 (the port keeps it in the array-E caller —
  SCENE2_TODO.md "THE FIND"). Branch mesh 8184 verts, leaf mesh 10632
  (1329 leaves), bbox x/z equal to Codex's prediction to 3 decimals.

## Later results (2026-08-12)

* **splines**: all 16 camera paths (`FUN_00405a29` load + `FUN_004058a6`
  eval, dense-sampled) match the port EXACTLY — max Δeye 0.0000, worst
  Δtarget 2e-4 (one sin/cos ulp). ⚠ The evaluator gates on the byte at
  `+0x10c` AND the key pointer at `+0x12c`; a zeroed struct silently reuses
  the cached pose at `+0x114` and looks "frozen".
* **scenebuild**: the Landscape ctor + `FUN_004082a9` for scenes 0→1→2 in
  order from image seed 1. Every stream boundary matches the port, which
  CLOSED the historical "512-draw gap" (it was a stale pin: `0xb67fd936` is
  the set-2 bake's post-texgens state, `0x5f95db36` its post-records state
  and the true first-cluster pre-yaw state).  Harness notes: the FACTORY
  installs the vtable (`@0x418e68`), not the ctor; the build tail calls
  reset()+render(0) through it (render stubbed — stream-inert for scenes
  0–2, **not** for the precipitation scenes 5/7); the shadow bake is
  fast-forwarded in closed form (pinned 2·65536·16 draws).
* **d3d8fake corrections**: `SetTexture`/`SetTextureStageState` are vtbl
  **+0xf4/+0xfc** (an earlier +0xe0/+0xe8 miscount aliased
  DeleteStateBlock); Get/SetRenderState and the TSS pairs now keep a real
  state store; unknown vtable slots get self-identifying stubs that name the
  interface+offset and stop, instead of faulting at NULL.

## Floating point — read before comparing anything

* **FPCW = 0x027F.** Windows starts Win32 processes at 53-bit x87 precision
  and this binary has no CRT to change it, so 53-bit is what the original ran
  at. unicorn's FNINIT default is 0x037F (80-bit); `SonnetEmu.call()` sets
  0x027F unless overridden, and every manifest records it.
* **Transcendentals are host-libm doubles.** QEMU computes FSIN/FCOS/F2XM1/…
  by converting to C double and calling the host's libm — not the Pentium's
  CORDIC. Add/sub/mul/div/sqrt chains are softfloat-exact at the CW precision;
  paths through transcendentals need a stated ulp tolerance per fixture.

## Harness facts worth knowing

* Stubs are real `ret imm16` instructions; a code hook supplies EAX and side
  effects, then the ret executes natively — no EIP surgery.
* `FUN_004010dc` (progressTick) is patched to `ret` at map time: it draws
  through the D3D vtable and is reached from texgen's op-table callback
  (a literal `jmp 0x4010dc`), buildTree, and the audio callback.
* VirtualAlloc = zero-filled bump heap (matches MEM_COMMIT semantics the
  binary depends on); every allocation is logged with its call-site EIP.
* Texgen prerequisite is only `FUN_00401c1f()` (archive pointer init). The
  original's buildTree generates texgen programs 0 and 1 INLINE (0x40a035 /
  0x40a087) — pre-generate them to isolate the tree's own draws.
* d3d8fake: vtable offsets/argbytes from re/engine/D3D8_API.md + d3d8.h; an
  offset not in the tables lands on a NULL slot and stops loudly — extend the
  table, re-run. LockRect hands out real zeroed memory so the original's own
  upload/mip code runs and its results are dumpable.
* Unmapped-access details land in `emu.unmapped` (address/EIP) on failure.

## Fixture contract

`manifest.json`: target, case, fn_va, call (convention+args), fpcw,
seed_before/seed_after (hex strings), image sha256, emulator+host provenance,
dumps [{name,file,size,sha256}], rand_writes. Raw dumps are the VM's native
byte order (textures: BGRA); the JS comparison owns the channel mapping.
Fixtures are PINNED by construction — they are the original executing.
