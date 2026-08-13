# The autonomous fix loop — protocol

How an agent session (or `/loop`) works Sonnet's phase-1 divergence list
without a human babysitting each step.  Prereqs: the pipeline
(`./run-verify.sh`, tiers in `web-sonnet/test/run_all.mjs`), the warm store
(fast boots), and the emulator oracle (`re/oracle/ORACLE.md`).  A blessed
baseline must exist (`verify/baseline_golden.json`).

## One iteration

1. **Measure.** `./run-verify.sh --full` (add `--quality=remaster` only for
   remaster-path work).  Read `verify/report_<stamp>.md`.  If any tier 0–2
   check fails, THAT is the work item — a broken invariant outranks any RMSE.
2. **Pick the target.** Priority order:
   a. an oracle-confirmed divergence (oracle_test / stream_trace_test —
      these are against the original itself, no judgement involved);
   b. the current scene's worst sweep sample **in timeline order** (Jasper's
      standing instruction: 0 spires → 1 lakes → 2 forest → 3 cloud sea →
      4 beach → 5 autumn → 7 winter → 8 finale) — read that scene's
      current-state doc in `re/scenes/` FIRST;
   c. never an RMSE-only item where metric and frame disagree — when the
      frame looks *more* correct and the metric worse (or vice versa), stop
      and surface it; that call is Jasper's (documented trap, repeatedly).
3. **Investigate oracle-first.**
   a. Can the emulator settle it?  Add/extend a target in
      `re/oracle/targets/` and dump ground truth (new fixture = PINNED).
   b. Else disassemble: `python3 re/tools/xray.py <va> …` (names come from
      `re/oracle/names.json` — extend it only with PINNED identities).
   c. The decompile (`re/out/sonnet.c`) is the LAST resort for anything with
      floats in it — Ghidra drops x87 operands in this binary.
   Provenance discipline (`re/CONVENTIONS.md`) applies to every new constant.
4. **Fix on the authentic path.**  No enhancement code lands during phase 1.
   If the divergence is an ORIGINAL bug (confirmed by capture + evidence),
   do NOT fix silently: sagacity policy (batch questions, Jasper sends them)
   and the draw-time-gate pattern (`?quality=original` reproduces the bug).
5. **Verify.**  `./run-verify.sh --full`.  A fix lands only if:
   * tiers 0–2 all green (incl. every oracle fixture and stream pin), AND
   * the sweep verdict is OK or improved-only, AND
   * for a visual fix: the target frame moved the same way as the metric
     (RMSE and frame agreeing is the signature of a fix vs a fudge).
   Improved-only verdicts: rebless (`./run-verify.sh --bless`) in the same
   iteration, so the next comparison is against the new truth.
6. **Log.**  Append to `re/FIXLOOP_LOG.md`: target, evidence chain (with VAs
   / fixture paths), measurement before/after, verdict, baseline reblessed
   or not.  One entry per iteration, even for failed attempts.

## Instruments built by the loop (use them before inventing new ones)

* `re/oracle/targets/` — the original executing: `texgen.py`, `tree.py`,
  `spline.py` (all 16 camera paths), `scenebuild.py` (whole scene builds with
  an RNG boundary trace).  Adding a target is usually cheaper than another
  round of reading the decompile.
* Inert page knobs (set from a harness, zero cost otherwise): `__propT`,
  `__camTimeOverride`, `__waterDbg` (pass ablation), `__bakeProbe` (stream
  stamps), `?warmstep=F` (capture-machine frame rate).
* **Per-band shift analysis** — cross-correlate ours vs reference for the best
  horizontal shift per screen band (far / mid / music-locked TEXT / the near
  object).  One measurement separates "camera wrong" from "object wrong";
  it retired several sessions' worth of camera hypotheses in scene 2.
* **Fine bowls, matched to the hypothesis.** A ±8-row bowl at 4-row steps
  cannot see a 3-row offset, and a −2..+4 drift search cannot see a 1 s one.
  State the range AND the step beside every negative result.

## Hard stops — surface to Jasper instead of proceeding

* Any REMASTER judgement call (the remaster's goal is his: "shine on a 4k
  screen" — fidelity arguments do not decide remaster questions).
* Any suspected bug in the ORIGINAL (candidate for the batched sagacity list
  in [[sonnet-context-and-sagacity]]) — the ask itself is Jasper's call.
* Any change to a HARNESS or to the verdict rules (the instruments must not
  move while they are measuring; a harness change invalidates comparisons).
* Two consecutive failed attempts on the same divergence (fresh eyes rule:
  the third attempt is a second agent or a human, not attempt #2 again).
* Anything that would edit `?quality=original` behaviour.

## Standing cautions (all learned the hard way — details in
## restoration-methodology)

* State the quality path and warm/cold beside every number you quote.
* A zero-cost measurement usually means the code did not run — check.
* Baselines move only via `--bless`, which refuses warm sweeps.
* Never run two sweeps concurrently; run_all guards, respect it.
* The sweep is blind to integrators (flare) and to time (animation ramps) —
  use `flare_live.mjs` / advancing-clock probes for those.
* Scene 2 is judged on FRAMES, not RMSE (documented metric inversion).
