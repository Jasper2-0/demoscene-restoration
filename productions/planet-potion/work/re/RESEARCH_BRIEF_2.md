# Research brief 2 — feedback, one correction, and the audio format

Follow-up to `RESEARCH_BRIEF.md`. Copy from the horizontal rule down.

---

## Feedback on the previous round

That was a strong result and most of it is now wired into the project. Three
things in particular landed:

- **You found the genuine 1998 `warp3d.h`** rather than reconstructing an enum.
  Every Part 1 constant is resolved and the whole render state now reads in
  names.
- **The reversed-depth convention** — Z in w-space, 1.0 front, 0.0 back — was
  the single most valuable thing in the report. `W3D_Z_GEQUAL` looked like a bug
  in my notes and is in fact required. I would have "fixed" it into a real bug.
- **Format 6 = `W3D_A8R8G8B8` cross-checked independently.** I can execute this
  intro's texture generator under emulation, and its first pixel reads
  `ff616161` — A=0xff, R=G=B=0x61. Your answer and my measurement agree without
  either informing the other.

Labelling Part 2 `documented` / `inferred` / `unknown` was exactly right, and the
three items you left as `unknown` are now my capture shot-list.

### One correction, and it is a method note worth having

You flagged a contradiction on the `W3D_Fog` field order — correctly, the header
says `start, end, density, colour`, and my brief had density first. But you then
resolved it by **assuming my reported values were right and relabelling them**,
concluding "the values still match (start=0.0, end=1.0, density=0.0)".

They do not. My values were a raw memory dump, `{0.0, 0.0, 1.0, 0, 0, 0}`. Read
under the correct header order that is `start=0.0, end=0.0, density=1.0` — which
is degenerate for linear fog, since `f = (end−c)/(end−start)` divides by zero.
That degeneracy was the signal, and it was visible in the data you were given.

What was actually going on: those static bytes are placeholders. The struct is
filled at run time by a setter that writes `+0x00`, `+0x04`, then **skips to
`+0x0c`** — stepping over exactly the slot where `density` lives, because linear
fog does not use it. The skipped word is what proves the field order, and it
confirms your header independently.

**The generalisable point:** when an authoritative source contradicts the
requester's framing, the requester's *derived labels* are suspect but so are
their *values*. Reconciling by relabelling silently converts my error into a
confident wrong answer. The better move is to say "under the correct layout your
values read as X, which looks degenerate — re-check the extraction." I would have
gone straight to the right place. This cost nothing in the end because I verified
against the binary, but it is the failure mode to watch for.

## Still open from round 1

**The `warp3d.library` LVO table.** You flagged this as an honest gap and
recommended the AROS `workbench/libs/warp3d/warp3d.conf` functionlist, which
defines vectors in canonical order. That is still the one thing in this project
resting on a single source: my table comes from ReWarp3DPPC's `VecTable68K[]`,
and every function name I have attached to a call site depends on it being in the
right order. If it is wrong, the entire renderer analysis is wrong in a way that
would not show up until very late.

Please try again for a **numeric offset → name table**, ideally from AROS's
`warp3d.conf`, a `.fd` file, an SDK `warp3d_lib.fd`, or Wazp3D. I only need
enough to spot-check: if `-30 = W3D_CreateContext`, `-36 = W3D_DestroyContext`,
`-48 = W3D_SetState`, `-60 = W3D_LockHardware`, `-66 = W3D_UnLockHardware`,
`-168 = W3D_DrawTriFan` and `-450 = W3D_ClearDrawRegion` all check out, I will
consider it confirmed.

## New: the audio format

Since the last brief I have established what the intro's music actually is, and
it changes what I need. The two generator functions do not produce raw samples —
they **build a complete DigiBooster module in memory** and hand it to an embedded
`dbplayer.library 2.0 (16.8.98)`. I have extracted both:

```
          name      instruments  patterns  channels   module size
 part 1  "part1"        56          19        18      ~5,324,890 bytes
 part 3  "part3"        38          17        16       3,015,404 bytes
```

Chunks present in both: `NAME`, `INFO`, `SONG`, `INST`, `VENV`, `DSPE`, `PATT`,
`SMPL`. Magic is `DBM0` four bytes in.

A port needs to replay these. Questions, most useful first:

1. **Is there a documented specification for the DBM0 / DigiBooster Pro 2 module
   format?** I need chunk-level detail: `INST` instrument records, `VENV`
   envelope encoding, `PATT` pattern packing, and the `SMPL` sample header
   (flags word and length — I need to know whether length counts frames or bytes
   and how 8- versus 16-bit is signalled).
2. **What is in the `DSPE` chunk?** It is 26–28 bytes here. DigiBooster Pro 2 had
   DSP effects (an echo, as I understand it). Its parameter layout and the exact
   algorithm matter, because if it is audible I have to reproduce it.
3. **Which open-source replayers handle DBM0 correctly?** libopenmpt, XMP,
   DigiBooster's own released sources, anything else — and are there known
   accuracy caveats, particularly around DigiBooster Pro 2 features that the
   generic tracker replayers approximate?
4. **`dbplayer.library 2.0 (16.8.98)`** — is this a publicly documented library
   with a known provenance, and does its replay differ from DigiBooster Pro 2's
   own player in any way that would change the output?
5. The intro reportedly requires **AHI**. Does that imply a particular mixing
   rate or output format that would affect what the original sounded like?

## What to return

Same format as before, which worked well: a markdown document, every Part 2-style
behavioural claim labelled `documented` / `inferred` / `unknown`, sources as URLs
with a note on authority, and **anything that contradicts what I have stated
above**. On that last point specifically — if my chunk list or instrument counts
look wrong for a DBM0 module, say so, because that would mean my extraction has a
problem and I would rather find out from you than from a port that plays garbage.

An honest `unknown` remains more useful to me than a plausible guess.
