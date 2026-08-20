# Decompiles

Targeted Ghidra decompiles taken during triage, kept because the claims in the
study cite them. Each is a handful of functions, not a whole-program export —
the multi-megabyte full dumps and disassembly listings were deliberately left
out, as were the Ghidra project databases (they embed the analyzed originals;
see the root README's "what is deliberately not in this repository").

Regenerate with `tools/ghidra/ExportDecomp.java` / `DecompileAt.java`; the
working invocation is `productions/wonder/work/tools/run-oracle-audit.zsh`.
Ghidra is not on `$PATH` — it lives at
`/opt/homebrew/Cellar/ghidra/<ver>/libexec/support/analyzeHeadless` and needs
`JAVA_HOME` pointed at openjdk@21.

| file | subject |
|---|---|
| `parser.c` | Genoaux script.txt section parser + dispatcher |
| `effects.c` | the effect-name registry and its switch |
| `hjb.c`, `nodes.c`, `read.c` | .HJB file reader and record tree |
| `mesh.c`, `mat.c`, `morph.c`, `light.c` | mesh bodies, material table, morph tracks, omni lights |
| `tracks.c`, `keys.c`, `evals.c`, `evals2.c` | controller tracks, key layout, TCB tangent precompute and the runtime evaluator |
| `frame.c`, `base.c`, `t35.c` | playback clock and frame timing |
| `elem.c` | Elements-specific notes |
