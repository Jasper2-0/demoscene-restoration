# Provenance conventions — PINNED vs INFERRED vs GUESS

Jasper, 2026-08-08: *"we need a better way to keep apart values that are based
on inference and values that are pinned to the actual code from the binary we
are restoring."*

This is the single most expensive failure mode in the project. Every value in
the port is one of three things, and once written down they all look equally
authoritative — a decompiled constant and somebody's plausible reconstruction
read exactly the same six months later.

## The three tags

Put one on every non-obvious constant, offset, formula and material flag, in
the code comment and in the RE notes.

| tag | means | must carry |
|---|---|---|
| **PINNED** | read directly out of the binary | the VA, and *how*: `ndisasm`, a decompile line, or a data address (`[0x418ea4]`) |
| **INFERRED** | derived by reasoning from something pinned | what it was derived FROM, and what would falsify it |
| **GUESS** | matched by eye, by measurement, or by convention | what evidence was used, and its confidence |

Rules:

1. **A decompiler reading is not automatically PINNED.** Ghidra drops x87
   operands, mis-types qwords as floats and mis-reads loop counts throughout
   this binary (`FUN_0040e923`'s pass count read as 32 instead of 16;
   `[0x418220]`/`[0x418f70]` read as 3.37e12 instead of π/π‑2). A value is
   PINNED only if someone looked at the instruction or the data bytes.
   ⚠ **The costlier failure is code Ghidra does not print AT ALL** — dropped
   x87 comparisons and the branches built on them, in functions whose decompile
   looks complete (`FUN_0040f5a8`'s fade envelope: ~20 instructions and four
   conditional branches, printed as nothing). This rule tells you to doubt but
   not WHERE; see **`DECOMPILE_GAPS.md`** for the detector and the oracle gap.
2. **Downgrade on doubt, never upgrade on age.** A value does not become
   PINNED because it has survived in the tree for a while.
3. **State the falsifier for every INFERRED value.** "Would be wrong if X" is
   what lets the next person test it in one command instead of re-deriving it.
4. **A GUESS that is measured is still a GUESS.** Matching the reference
   frame proves the *output* plausible, not the mechanism.

## Why — four cases from one day (2026-08-08)

* **INFERRED, and wrong.** Array D's scatter seed was the record index,
  copied from array C's ported behaviour. The binary pushes a **literal 1**
  (`push dword 0x1`, VA 0x407f81) where array C pushes its loop counter
  (`push [ebp-0x4]`, VA 0x407dfd). Two call sites three apart, different
  answers — and the port had generalised from one to the other.
* **INFERRED, and wrong, and invisible.** `MG.buildDandelion` called
  `computeNormals()` because every other generator does. `FUN_0040c721` calls
  the normal routine **zero times** (checked: no call site to 0x40449f in
  0x40c721–0x40cfed), so the original's dandelion is ambient-only and flat.
  The port's version shaded its stem near-black — Jasper's report.
* **INFERRED, and right, but nobody could tell.** `Attenuation1 =
  max(haze, 1e-4)` sat in `scene7.js` looking like a reading. It took a
  disassembly session to confirm it is exactly `max(((255−desc[0x3e])/255)³,
  [0x4182f0])`. Hours spent re-deriving a correct value because its provenance
  was not recorded.
* **A doc's negative claim, unpinned.** `OBJ4_TERRAIN.md` stated "neither
  `FUN_00408eef` nor the event handler ever writes `waterLevel`". It is
  written every frame at VA 0x4091a7. **Negative claims need provenance most
  of all** — they are what stops the next person from looking.

## Format

In code:

```js
const K_SWAY_FREQ2 = 1.2699999809265137;   // PINNED [0x418f40]
const CANOPY_R = 117;                      // INFERRED from buildTree output; falsified by a ground-truth RT dump
const alphaRef = 0x20;                     // PINNED sonnet.c:9169 (material+0x14 = 0x20)
```

In RE notes, prefix the claim:

```
PINNED (ndisasm 0x40cdc0-0x40ceb0): twigs 0x11 additive, stem 0x10 opaque.
INFERRED: the impostor canopy is ~2x too wide — from bbox vs camera framing;
          falsified by dumping the original's RT.
```

## Audit

`node web-sonnet/test/provenance.mjs` lists every constant table entry that
carries no provenance tag or address citation. It is a **reminder, not a
gate** — it cannot know whether a citation is honest, only whether one exists.
