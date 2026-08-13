# Finding what Ghidra silently DROPS — an open tooling gap

**Status: OPEN. Jasper's note, 2026-08-12: "we need to come up with a better way
to diagnose whatever ghidra drops... we're spending days now on getting sonnet
into shape because of this."**

`CONVENTIONS.md` rule 1 already says a decompiler reading is not automatically
PINNED. That rule tells you to doubt. It does not tell you **where** to doubt,
and that is the whole problem: the expensive failures in this project are not
values Ghidra got wrong, they are code Ghidra did not print AT ALL, in functions
whose decompile looks complete and reads fine.

## What it has cost

* **The ribbon fade envelope** (`FUN_0040f5a8`, VA 0x40f5f3-0x40f642 —
  FIXLOOP_LOG #14.5). A triangular fade over the phase, ~20 instructions, four
  conditional branches. Ghidra printed **nothing**: it is pure x87 through
  `[ebp+8]`, the `dt` argument's own stack slot, reused after dt is consumed at
  0x40f5ae. The port shipped without it, the strips were ~2x too bright with no
  structure, and it took a full fix-loop iteration plus a WRONG root-cause
  ("~8x overdraw") and a proposal to build an unnecessary fake-D3D8 render
  oracle. Jasper found it by eye, from the video, in one sentence.
* **The doubled `ftol` in the same function** (0x40f6f8 + 0x40f706). Ghidra
  DID print both calls — collapsing both results into one variable, which is
  nonsense on its face. It was noted in #13 and not chased.
* **`stepWaterGlitter`** (`FUN_00409900`): Ghidra dropped the alpha's `ftol`
  argument; the expression had to come from ndisasm.
* **`FUN_0040e923`**'s pass count read as 32 instead of 16;
  `[0x418220]`/`[0x418f70]` read as 3.37e12 instead of pi / pi-2.

The common shape: **x87 arithmetic and the control flow built on top of it**
(`fcom`/`fcomp` + `fnstsw ax` + `sahf` + `j*`). Ghidra's x86 model handles the
FPU stack poorly, and when it cannot lift a comparison it drops the branch
rather than flagging it.

## A cheap mechanical detector — CONTROL-FLOW SHORTFALL

Do not try to verify the decompile's *meaning*. Just count things that must
match, per function, and rank by the shortfall. Verified against the ribbon
case, which is the one that cost the most:

| | disassembly | Ghidra decompile |
|---|---|---|
| conditional branches | **5** (2 `jnc`, 1 `jna`, 1 `ja`, 1 `jl` loop back-edge) | **1** `if` + 1 loop |
| `ftol` (`0x404224`) calls | 2 | 2, both assigned to one variable |

Three unexplained branches in a 100-line function. That fires loudly, and it
would have pointed at `FUN_0040f5a8` on day one instead of day N.

Signals worth counting, cheapest first:

1. **Conditional branches vs `if`/`?:`/`&&`/`||`/loop conditions.** The
   strongest single signal, and the one that catches dropped x87 comparisons.
2. **`fcom`/`fcomp`/`fcomi`/`ftst` count vs float comparisons printed.** More
   specific than (1) and points straight at the FPU cases.
3. **Distinct float constants referenced** (`[0x41xxxx]` operands — `xray.py`
   already resolves these) **vs `_DAT_` symbols appearing in the body.** A
   constant the disassembly loads and the decompile never mentions is code that
   vanished.
4. **Repeated calls to the same helper whose results collapse into one
   variable** — the doubled-`ftol` tell.
5. **Writes to a stack slot that is also a parameter slot** (`[ebp+8]`,
   `[ebp+0xc]`...). This is the exact mechanism that hid the fade; a
   parameter slot being written is Ghidra's blind spot by construction.

The infrastructure already exists: `re/tools/xray.py` disassembles and resolves
float constants, `re/oracle/names.json` is the VA→name→JS-symbol port map, and
`web-sonnet/test/provenance.mjs` is the precedent for a report-only auditor that
ranks rather than gates. `re/tools/decompile_audit.py` should produce one line
per ported function, sorted by shortfall, and tier 0 of `run-verify.sh` should
print the top N. It is a REMINDER, not a gate — same contract as `provenance`.

## The real fix — ORACLE THE UPDATERS, NOT JUST THE BUILDERS

The detector is triage. The thing that would have made this bug impossible is
differential testing, and we already have the machinery: `re/oracle/` runs the
original under unicorn with a fake D3D8.

**The oracle's coverage has a hole exactly where the bugs are.** Every existing
target is a BUILD-time generator — `texgen.py`, `tree.py`, `spline.py`,
`scenebuild.py`, `cloudsky.py`, `curtain.py`. Not one PER-FRAME UPDATE function
is covered. Both defects in FIXLOOP_LOG #14 were in the per-frame path
(`FUN_0040f5a8`'s fade, and the render tail's inherited lighting state), and #13
and #12 were too. We oracle the part of the code that runs once and eyeball the
part that runs sixty times a second.

`FUN_0040f5a8` is a soft target for this and should be the pilot: it is a
`__thiscall` on a 0x68-byte record with a known layout, its only outputs are the
32 vertices and the mutated phase, and it needs no D3D at all. Call it with a
sweep of phases across the whole [0, 2) cycle plus the [2, 4) seed range, dump
the vertex block, and diff against `MG.updateRibbon`. The fade would have shown
up as an alpha mismatch on the very first sample, with no video and no argument.

Generalised, the rule is: **any function the port calls per frame deserves an
oracle target, and a phase/time sweep is the input generator.** Static pins
prove the build; only a sweep proves the animation.

## Interim rule until the tooling exists

When transcribing any function that touches x87:

* Read the **ndisasm** output for the whole function before writing the port,
  not just for the expression currently in doubt. `xray.py <start> <end>`.
* Count the conditional branches yourself and account for every one.
* Treat a decompile with fewer branches than the disassembly as **unread**,
  regardless of how complete its body looks.
* A repeated helper call whose results collapse into one variable means the
  expression was mis-lifted — go to the disassembly.
