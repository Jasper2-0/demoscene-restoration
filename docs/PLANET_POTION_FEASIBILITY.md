# Planet Potion (Potion, 2002) — port feasibility

An evidence study, not a plan of record. Everything below was measured from the
release archive in a single session; nothing is inferred from what the intro
looks like, because nobody in this session has seen it run.

**Verdict up front: this is a substantially easier target than Wonder or
Energia, and the reason is that the shipped binary still has its symbol table.**
The framing of "software archaeology" is the right instinct for a 2002 PPC/RTG
64K, but it is wrong for *this* one. The decrunched executable names 38 of its
own functions, and those names describe the whole architecture. The expensive
part of a restoration — working out what the parts *are* — is largely already
done by the author's own linker.

## Provenance

```
potionplanet_potion.lha   afe6b6eb985b69ee9b0b12d209f86e3247412411e5f7b9e053ddb1303c73b253
  planet-potion.exe        65,288  6140e5d773be67cf720d4daa3ee3133230842bb7ce700dc9750426fa559da48b
  planet-potion.txt           445  31fb33197d5a6f3715edc0d6371654a8f5467541b8de63391923bcfd8fdb49a9
  planet-potion_dcr.exe   138,280  51e62978e6d472a5c6c84f28ffd51239ed888bbd3e04ab40597a9bdc62ac1c99
```

`planet-potion.txt` credits main code to *mavey*, gfx *nelson*, music
*skipp604*, 3d *rem*, additional code *diamond*, and states the requirement:
"an Amiga with PowerPC and accelerated graphics card".

Work all of it from `_dcr.exe`. The 65K release is a 68K depacker plus one
blob; the cruncher is a distraction and can stay unsolved forever.

## What the binary actually is

Both files are AmigaOS Hunk (`HUNK_HEADER`, `0x000003F3`) — **not** ELF. That
single fact settles the runtime: PowerUP loads PPC ELF objects through
`ppc.library`, and this opens **`powerpc.library`**. So it is **WarpOS**, and
the RE tooling has to follow that fork.

`hunktool` reads it directly; the seven segments, all `MEMF_FAST`:

| seg | kind | size | note |
|---|---|---|---|
| 0 | CODE | 46,960 | 68K bootstrap + **all** the PPC code + constants |
| 1 | DATA | 16,960 | an entire embedded AmigaOS library (below) |
| 2 | DATA | 2,048 | low entropy (2.99) — a table |
| 3 | DATA | 12,796 | entropy 4.69 |
| 4 | DATA | 52,500 | entropy 5.25 — the bulk of the baked data |
| 5 | BSS | 513,248 | |
| 6 | BSS | 17,766,496 | ~17 MB of runtime scratch |

252 `HUNK_RELOC32` fixups, all in seg 0. **327 `HUNK_SYMBOL` entries.**

A 100-line Python hunk loader that lays the segments at fixed bases and applies
the relocs is a better investment than fighting a generic Hunk importer — it
took minutes to write and it feeds Ghidra a flat image plus a symbol CSV. That
loader exists now and is the concrete day-one deliverable.

### The ISA split

A word-by-word decode says exactly where the boundary is:

```
seg0 + 0x0000 .. 0x0350   68K bootstrap — LEA $7FFE,A4; ExecBase; OpenLibrary xN
seg0 + 0x035c             _W3D_ContextTag (data, a Warp3D TagItem list)
seg0 + 0x0404 .. ~0x7000  PowerPC, ~27 KB, 100% clean linear decode
seg0 + 0xa334 .. 0xb770   globals, then a float-literal constant pool
```

Every PPC function opens with the same compiler prologue
(`mflr r0; stw r0,8(r1); mfcr r0; stw r0,4(r1); stw r13,-4(r1); addi r13,r1,-4`),
and 195 of the 327 symbols are auto-named float literals (`__0_70710678`,
`__pi`, `__0_0083333`). This is **compiled C, not hand-written assembly** — the
constants are handed over verbatim, and the compiler even tells you which ones
mattered.

**27 KB of compiled PPC C is the entire intro.** That is the number that decides
feasibility.

### The small-data base, and why it matters

The 68K stub opens `LEA $00007FFE,A4` — the classic Amiga small-data base, at
`+0x7FFE` rather than `+0x8000`. The PPC side mirrors it in `r2`. Testing
`r2 = seg0+0x7FFE` against the symbol table hits **4 of 4** probes exactly
(`_context`, `timer`, `__exit`, `_next_effect`), where `+0x8000` hits 0 of 4.

That one constant turns every `r2 + disp` in the decompilation into a named
global: 411 references, 57 of them landing exactly on a recovered name. The
remaining 162 displacements are un-named BSS and are the natural first
naming backlog.

## The architecture, from the names and the decompiler

Ghidra imports the relocated image as `PowerPC:BE:32` and decompiles it
readably. Four functions tell the story.

```c
void _main(void) {
    init();  _play_part_1();
    if (__exit != 1) _play_part_3();
    cleanup();
}

void _play_scene(void) {                       // and _play_scene_dalej, the "next" variant
    sync();
    _next_effect = 0;
    buf   = set_alloc_buffer(...);
    scene = _generate_scene(buf, ...);
    do {
        sync();
        _calc_matrix(timer, scene);
        _show_scene(scene);
        rmb_mouse();                           // right mouse button exits
    } while (!done);
}
```

That is precisely the

```
procedural generator → scene state → transform → rasterise → framebuffer
```

shape, confirmed rather than hoped for, and the loop is four calls wide.
(`dalej` is Polish for "onward" — consistent with Potion being a Polish group.)

### There is a scene VM, and it is tiny

`_generate_obj` is the find. Cleaned up, it is a **bytecode interpreter**:

```c
int _generate_obj(ushort *prog) {
    end  = (byte*)(prog + 1) + *prog;          // length-prefixed opcode stream
    node = 0;
    while (1) {
        op = *pc++;                            // one-byte opcode
        if (end < pc) break;
        n = alloc_mem(size_table[op]);         // per-opcode node size
        if (node) node->next = n;              // build a linked list
        n->op = op * 4;
        (*build_table[op])();                  // dispatch #1: construct
        node = n;
    }
    for (n = head; n; n = n->next)
        (*eval_table[n->op])(x);               // dispatch #2: evaluate
    return head;
}
```

Two dispatch tables, `0x14` bytes apart in the small-data area — **five entries
each**. A length-prefixed byte stream, a per-opcode size table, a build pass and
an evaluate pass over a linked list of nodes.

This is the "compact data-driven system" worth hunting for, and it is at the
small end of the plausible range. Recovering five build ops and five eval ops,
plus the opcode streams baked into seg 3 / seg 4, plausibly recovers all the
geometry in the intro.

### The 3D is a bounded, documented API

Not a bespoke software rasteriser. `Warp3DPPC.library` is opened, `_Warp3DBase`
is the most-referenced library base in the code (13 sites), and every 3D call
goes through one four-instruction thunk:

```asm
_run_w3d:           mtctr r3              ; r3 = the W3D function pointer
                    lwz   r3, _context(r2); inject the W3D_Context* as arg 1
                    bctr                  ; tail call
_run_w3d_setstate:  lwz r3, -0x2e(r31) ; b _run_w3d
_lock:              lwz r3, -0x3a(r31) ; b _run_w3d
_unlock:            lwz r3, -0x40(r31) ; b _run_w3d
```

`r31` is `Warp3DBase + 2` (the same `-2` bias as the small-data base), so those
displacements are real library vectors at **-48, -60, -66** — and the author's
own names for the three thunks, *setstate / lock / unlock*, line up with
`W3D_SetState`, `W3D_LockHardware`, `W3D_UnLockHardware`. Two independent
sources agreeing is as good as this gets without running the thing.

Sweeping every `lwz rX, -N(r31)` gives the **complete 3D surface: 18 distinct
Warp3D entry points across 23 call sites**, every displacement an exact multiple
of 6 from -30. `_W3D_ContextTag` is a plain TagItem list against
`W3D_TAG_BASE = 0x80200000` (tags 0, 1, 2, 6, 7).

**Porting the renderer therefore means implementing 18 Warp3D calls on WebGL2**,
not reverse-engineering a triangle loop. Warp3D of this era is essentially
fixed-function — state flags, a texture unit, gouraud, fog, z-buffer — which maps
onto a small GLSL program set. The resolution constants sitting in the pool
(`__320`, `__240`, `__640`, `__480`, and `__32768` for 15-bit colour) say what
the target buffer looks like.

### The audio is not a bespoke synth

seg 1 begins `00 00 03 F3` — it is **another complete Hunk executable embedded in
the data**, four hunks, and its strings identify it: **`dbplayer.library 2.0
(16.8.98)`**, requiring `utility.library`. That is the DigiBooster Pro player,
which the intro writes to `ram:` and opens back (hence the literal
`ram:dbplayer.library` path string, and `_DBMBase`).

So the music is **a DigiBooster module played by a known, self-contained
replayer**, and the bespoke part is narrow: `_generate_samples_part1` and
`_generate_samples_part3` synthesise the instrument samples at runtime, with
`_module` and `_music_buffer` as the handoff.

That reframes the audio job completely. It is not "reverse a vocoder". It is
"port two named sample-generator functions, and drive a documented module format
through an existing replayer". The vocoder character the pouët comments describe
is a *result* of those two functions, and they are 27 KB of C away.

### 68K interop

No PPC code calls a 68K library directly. `_run68k` builds a struct on the stack
(zeroing four consecutive fields — the shape of WarpOS `PPCArgs`) and calls
`PowerPCBase` at a fixed vector. Everything that must touch `intuition`,
`cybergraphics`, `dos` or `graphics` funnels through that one function, which
makes the 68K boundary trivially enumerable, and irrelevant to the port beyond
"open a window, get a bitmap, lock it".

## Where this leaves your plan

Most of it stands. Four changes.

**1. Symbols first; WinUAE later.** You put a custom instrumented WinUAE build at
step 4 and called it the biggest productivity win. It is still the right tool for
ground truth, but its *entry cost* is the thing that changed: the symbol table
already tells you where to trace before you trace anything. `_generate_obj`,
`_calculate_txt`, `_show_scene`, `_generate_samples_part1` — the trace points are
named. Do the static pass first; it costs a day and it tells the dynamic pass
where to look.

Be aware of what the emulator step really costs, because it is the one genuinely
hard acquisition in this project: WinUAE's PPC support runs through a QEMU PPC
core and wants a **CyberStorm PPC ROM image**, plus a working RTG and Warp3D
driver stack under emulation, plus `dbplayer.library` behaving. That is the piece
most likely to eat a week, and it is a sourcing problem, not a coding one. Worth
attempting early precisely because it is the risk.

See **[the ROM appendix](#appendix--the-cyberstorm-ppc-rom)**: the Aminet flash
updater is a good route and it de-risks this considerably, with one version
label to correct.

**2. The "is it software-rendered?" question is answered: no.** Contemporary
pouët commentary suggested software rendering; the binary says hardware Warp3D
with an 18-call surface. What *is* software is the **generation** side — textures
(`_init_txtgen`, `_calculate_txt`, `_alloc_txt`) and geometry (the `_generate_obj`
VM). So the split you should plan around is: procedural generators on the CPU
(JS or WASM) feeding 18 Warp3D operations re-expressed as WebGL2.

**3. Your WASM differential-testing loop is right, and now it has natural
units.** You framed it as `generate_blob_mesh(seed,time,vertices)`. The real
units are better than that: one VM build op, one VM eval op, one texture
generator, one sample generator — each individually named and independently
comparable against a memory dump. That is a much tighter loop than
whole-effect comparison.

**4. Don't build the validation tooling.** You described capturing the original
to an image sequence and building an original / port / difference scrubber with
image metrics. **That already exists in this repo** — `tools/inspect/sweep.mjs`
scores every sample on correlation *and* RMSE, `tools/inspect/serve.mjs` is the
scrubber, and `tools/inspect/ADAPTER.md` is the contract. Planet Potion would be
its third adopter after lapsus and wonder, and adopting it means implementing
`window.__demo.plan()` / `.render()` and nothing else. Building a second one
would be the most wasteful thing on the list.

On the browser side, agreed on raw WebGL2 over Three.js, and for a stronger
reason than "thin is better": you are emulating a fixed-function API with 18
entry points and explicit state flags. Three.js's material model would actively
fight that mapping. Note also that this repo's existing restorations ship
**dependency-free plain JS + WebGL2 from static files** — no bundler, no
TypeScript, no WASM in the shipped artifact. Vite/TS are fine as authoring
tools, and WASM is fine as a *verification* instrument, but shipping either
would break the property that the deployed code is the code under review.

## Risks worth naming

- **Warp3D semantics are a fidelity trap.** Knowing which 18 functions are called
  is not knowing what a 2002 Permedia/Voodoo driver did with them. Blending, fog
  curves and texture filtering are exactly the class of thing METHOD.md §8 warns
  about: a backend disagreement is a hypothesis, not a verdict.
- **The 17 MB BSS hunk** implies large runtime buffers — texture pools, z-buffer,
  mesh arena. Worth mapping early; it constrains the WebGL2 memory design.
- **No reference capture yet.** Nothing here can be scored until there is a video
  and an audio-alignment offset, and the sweep is what turns opinion into a
  number.
- **162 unnamed globals.** The named 57 are a gift; the rest is ordinary work.

## If it goes ahead

The natural first milestone is the one you named — a full-frame trace — but the
static side can be pushed much further first, cheaply:

1. commit the hunk loader + Ghidra import as `work/re/` tooling;
2. resolve the two five-entry VM dispatch tables to five build and five eval
   functions, and locate the opcode streams in seg 3 / seg 4;
3. name the 18 Warp3D vectors against the `warp3d.library` FD file and write
   down the state flags actually used;
4. only then stand up WinUAE for dynamic confirmation.

Steps 1–3 need no emulator, no ROM, and no network, and they would leave the
project with a documented `prod.json`, an addressed function map and a bounded
renderer spec — which is most of what this repo means by "recover how the
original works".

---

### Environment note

Everything above was produced in a Claude Code cloud session. `lhasa`, `amitools`
(`hunktool`), `capstone` and Ghidra 11.3.2 all install and run here, and Ghidra's
headless PowerPC analysis worked first try. What does **not** work here is the
provenance half: scene.org, pouët, demozoo and YouTube are all blocked by network
policy (see `CLOUD_ENVIRONMENT.md`), so archive rehydration and reference capture
have to happen on a local machine. Static binary archaeology on an
already-supplied file is a good fit for a cloud session; verification against a
reference is not.

The original binaries and everything extracted from them stayed outside the
repository, per the policy in the README.

---

## Appendix — the CyberStorm PPC ROM

The hardest acquisition in this project is the CSPPC flash image, and deriving
it by running the original Phase5/Ralph Schmidt updater inside the emulator is
the right answer. It replaces "find this ROM somewhere" with a documented
derivation from a publicly archived, permission-uploaded original — which is
the same standard the rest of this repo holds itself to for `originals/`.

Measured from `FlashUpdates-26042002.lha`
(`bad227908bfc69c6b599917f6f2e6955fea0474c31fff8e3bcb726aae127d7a1`), 13 files:

| file | bytes | for |
|---|---|---|
| `PPCUpdate` | 140,816 | **CyberStorm PPC, 128 KB flash** — the one we want |
| `MK3Update` | 140,244 | CyberStorm MK3 (no PPC) |
| `BlizzPPC040Update` / `...060Update` | 354,612 / 354,608 | Blizzard PPC |
| `Cybppc.notes` | 11,925 | CSPPC firmware release notes |
| `FlashBIOS.doc`, `HOW_TO_INSTALL_THE_FLASH.txt`, `ReadMeFirst.txt` | | procedure |

`HOW_TO_INSTALL_THE_FLASH.txt` is unambiguous: *"for a CyberstormPPC with a
128KB Flash use PPCUpdate"*.

### The version label is not what the archive says — verify by hash, not by name

`Cybppc.notes` carries the firmware changelog, and its versions run:

```
V44.60 … V44.66  V44.67  V44.68  V44.69  V45.70  V45.71
```

It rolls **44.69 → 45.70**. The string `44.71` does not appear in any file in
the archive. The newest CSPPC firmware here is **V45.71** ("Added PCI BootMenu
info").

**But `4471` is a real label elsewhere.** FS-UAE's ROM lookup, seen live in its
own log, is:

```
[ROM] Did not find cyberstormppc.rom
[ROM] Trying ralphschmidt-cyberstorm-ppc-4471.rom
```

So the emulator/Amiga Forever side genuinely uses `4471` as a filename. The two
facts do not contradict each other, because `Cybppc.notes` is a changelog of
**`cybppc.device`** behaviour — SCSI units, CDROM quirks, mount gadgets, PCI
BootMenu info — and the device driver's version is not necessarily the flash
BIOS version, even though the driver ships inside the flash.

What can be said without guessing: **the archive never claims 44.71 anywhere,
and the newest thing it documents is 45.71.** So do not trust the version label
on either side. Verify the image the updater actually produces by its SHA-1, and
treat the filename as a filename. That is what the plan already does, so nothing
about the approach changes — only the confidence in the name.

### The image cannot be lifted out statically — the emulator round-trip is real

Worth ruling out before spending a week on emulation, so it was:

- `PPCUpdate` is a valid AmigaOS Hunk executable, 4 hunks, CODE 132,912 bytes.
  (`hunktool` rejects it with *"Invalid hunk type 141/8d"* — that is a gap in
  `hunktool`, not a damaged file: it does not handle the `0xC0000000` "memory
  flags follow" encoding in the header size table, which this file uses for all
  four hunks. Parse it by hand and it is clean.)
- Entropy across the payload is **7.99 over ~114 KB** — compressed or encoded,
  not a raw ROM. A CSPPC image full of 68K code, PPC code and strings would sit
  around 6.
- The only strings in the file are the FlashTool's own (`CyberstormPPC 128KB
  FlashTool V1.6`, `No CyberstormPPC installed`, `Oops..you're in deep trouble
  now.`) and a table of flash part numbers (`28F010A`, `29F040`, `29F016`, …).
  **No firmware strings at all** — no device name, no copyright, no version.
- A sliding SHA-1 search for a 131,072-byte window matching the target: 9,745
  windows in `PPCUpdate`, plus the same over `MK3Update` and both Blizzard
  updaters, under five encodings (verbatim, 16- and 32-bit byte swap, 8- and
  16-bit de-interleave). **No match.**

So the payload only becomes a ROM by being decompressed and programmed by the
tool itself. Run the updater under emulation, exactly as planned.

Note `V1.6` is the **FlashTool** version, not the firmware version — the two are
easy to conflate, and only the changelog names the firmware.

### Two practical traps

- The tool aborts with `No CyberstormPPC installed` if it cannot find
  `CyberstormPPC.IDTag`. The emulated board has to be configured and detected
  *before* the updater will do anything — a zero-byte writable
  `cyberstormppc.rom` alone is not sufficient.
- It probes the flash chip against that part-number table. An emulated flash
  that does not answer with a recognised device ID is a plausible failure mode,
  and it will look like a tool bug rather than a configuration problem.

The install notes also insist on booting without the startup-sequence with all
HD volumes disabled — worth honouring under emulation rather than assuming it
only matters on real hardware.

### One inconsistency in the archive

`HOW_TO_INSTALL_THE_FLASH.txt` directs 512 KB DCE boards to `BigPPC040Update` /
`BigPPC060Update`. Neither file is in this archive. Irrelevant for our purposes —
we want the 128 KB `PPCUpdate` — but it means the documentation is shared across
releases and does not describe this archive's contents exactly. Do not treat it
as a manifest.

### The roundtrip was run, and it does not bootstrap from a blank flash

The emulation side works, and works better than expected — but the recipe as
usually described ("make an empty `cyberstormppc.rom`, run the updater") does
**not** produce a ROM, for a reason that is in the updater's own code.

What ran, all of it inside a headless Linux container:

```
fs-uae 3.1.66        (Ubuntu noble/universe)      + Xvfb
amiga_model          = A4000/040
accelerator          = cyberstorm-ppc
cpuboard_flash_file  = cyberstormppc.rom          (131,072 bytes of 0xFF)
hard_drive_0         = hd0/                       (a host directory)
hd0/s/Startup-Sequence -> PPCUpdate >DH0:out.txt
```

FS-UAE logged `CPUBoard 'CyberStorm PPC' flash file './cyberstormppc.rom'
loaded, RW.`, mapped `CPUBoard F00000` and `CPUBoard MAPROM`, booted, mounted
the directory, ran the startup-sequence, executed the 2001 68K binary, and its
output came back to the host filesystem:

```
	CyberstormPPC 128KB FlashTool V1.6

No CyberstormPPC installed
```

The flash file was still 131,072 bytes of `0xFF` afterwards — zero bytes
changed.

**No Kickstart ROM was needed.** FS-UAE has an AROS Kickstart replacement built
in (`AROS KS ROM (built-in)`), and it booted far enough to mount a filesystem
and run a program. That removes what looked like the first blocker entirely.

#### Why it refuses — from the updater's own 68K

Disassembling `PPCUpdate` around the failure string gives the whole check:

```asm
    move.l  a6,-(a7)
    lea     "CyberstormPPC.IDTag"(pc),a1
    movea.l $4.w,a6                  ; ExecBase
    jsr     -$60(a6)                 ; OpenResource()
    tst.l   d0
    bne.b   ok                       ; found -> proceed to flash
    lea     "CyberstormMK3.IDTag"(pc),a1
    jsr     -$60(a6)                 ; OpenResource()
    tst.l   d0
    bne.b   ok
    lea     "No CyberstormPPC installed"(pc),a0
    move.l  a0,d1
    movea.l $188.l,a6                ; DOSBase
    jsr     -$3ba(a6)                ; PutStr()
    moveq   #0,d0
    bra     exit
```

It requires an **exec resource** named `CyberstormPPC.IDTag` to already exist.
Nothing in the updater creates that resource — on real hardware it is published
by the board's own firmware during early boot. With a blank flash there is no
firmware, so there is no resource, so the tool exits before touching anything.

**The flash updater upgrades a CyberStorm PPC; it cannot create one.** The seed
problem is not removed by this route, only moved: you still need *some* working
CSPPC image to start from, after which the updater will roll it forward and
FS-UAE will write the result back to `cpuboard_flash_file`. That is still
worth doing — it is how you get a *known, reproducibly derived* image rather
than a mystery dump — but it is not a bootstrap from nothing.

One caveat stated plainly: this run used AROS rather than Kickstart 3.1, and
separating "blank flash" from "AROS" as the cause would need a valid CSPPC ROM —
the exact thing being sought. The disassembly makes the blank-flash explanation
much the likelier of the two, since the requirement is a resource and resources
come from firmware, but it has not been isolated experimentally.

#### What this harness is good for anyway

Independent of the ROM question, the container can now **boot an Amiga and run
period 68K binaries headlessly, with stdout captured back to the host**, needing
no Kickstart and no license. For this project that is a real instrument: it will
run 68K Amiga tools, unpackers and the many small utilities that show up in
restoration work, and it costs one `apt-get install`.

It will **not** run Planet Potion. The PPC CPU in FS-UAE is supplied by the
`qemu-uae` plugin (`PPC CPU was started but qemu-uae plugin was not found`),
which Ubuntu does not package — so PPC execution, and therefore any dynamic
tracing of the intro, still needs that plugin built or a WinUAE setup elsewhere.
