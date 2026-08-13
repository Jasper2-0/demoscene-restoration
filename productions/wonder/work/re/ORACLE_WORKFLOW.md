# Wonder oracle workflow

The shipped `wONDEr.exe` and its unpacked assets define the restoration target.
The reference capture is validation evidence for the resulting pixels and
timing, but it cannot override behavior established by the executable or asset
bytes. Capture gamma, codec loss, driver behavior, and recording alignment are
treated as possible measurement effects, never as reasons to invent behavior.

Every native-to-browser audit uses both views of the original code:

1. **Decompiler:** recover class ownership, control flow, calls, data
   structures, and broad expressions.
2. **Disassembly and raw bytes:** verify instruction order, x87 stack behavior,
   float width, rounding points, comparison direction, literal addresses, and
   exact constants. When the decompiler and instructions disagree or the
   decompiler simplifies an expression, the instructions win.

The repeatable structural audit is:

```sh
/bin/zsh work-wonder/tools/run-oracle-audit.zsh
```

It keeps Ghidra's mutable home under `/private/tmp`, so it runs within the
workspace permission boundary. An instruction range can be inspected without a
Ghidra launch:

```sh
/bin/zsh work-wonder/tools/disassemble-wonder.zsh 0x4107d0 0x410900
```

Constants referenced by those instructions can be read as literal file bytes:

```sh
/bin/zsh work-wonder/tools/dump-wonder-bytes.zsh 0x4334f8 0x433500
```

Ghidra can omit functions reached only through stored callback pointers. Force
discovery and decompile one or more exact addresses with:

```sh
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
  /opt/homebrew/Cellar/ghidra/12.1.2/libexec/support/analyzeHeadless \
  work-wonder/ghidra-project Wonder -process wONDEr.exe \
  -scriptPath work-wonder/ghidra \
  -postScript DecompileAt.java /private/tmp/wonder-targeted.c \
  0040e490 0040e9d0
```

That output restores control-flow context; exact constants and x87 evaluation
still come from disassembly and literal bytes.

Browser code is changed only after a native divergence is demonstrated. Tests
then pin the recovered numeric behavior, and the timeline/reference view is
used for pixel-level sign-off. “Address-derived implementation” and “visually
signed off” remain separate statuses.

For matrix conventions, an address-derived multiplication order is not enough
by itself: the native storage layout and the final OpenGL-visible basis must
also be followed through the complete call chain. Targeted A/B captures across
several roll-heavy scenes are used to reject a transposition or sign
interpretation before it becomes a shared-runtime convention.

With a temporary local copy of the aligned reference video, the repeatable
pixel comparison captures every indexed boundary/midpoint, computes SSIM, and
writes reference/port/amplified-difference montages plus a worst-first report:

```sh
node work-wonder/tools/compare-reference.mjs /path/to/wonder-reference.mp4
```

Pass `--times=10,11.681` (or set `WONDER_COMPARE_TIMES`) for a quick targeted
pass. Reference frames are resolved to their actual packet presentation
timestamps before the browser time is chosen, avoiding up to one false frame
of lag from fractional seeking into a 30-fps capture. The default browser lead
is the executable-backed 30 ms from `FSOUND_SetMixAhead(30)`; pass
`--port-offsets=0,.03,.0667` to measure alternatives without changing playback.
`--only=effect_40dab0` forwards the viewer's debug-only effect filter,
which is useful for isolating one layer while retaining the aligned native
frame beside it. For the procedural tunnel, `--design-parts=surface` or
`--design-parts=overlays` isolates the generated mesh from its two full-screen
crossfade cards without changing its show clock. `--design-passes=0`, `1`, or
`2` further isolates a native surface material pass. The default
output directory is `/private/tmp/wonder-reference-comparison`, so copyrighted
reference frames are never added to the restoration tree.

## Permission boundary

Routine reads, edits, disassembly, Ghidra audits, and tests stay inside the
workspace sandbox. `.codex/rules/sunflower.rules` allowlists only the exact
loopback static-server command. Browser/GUI launches, public network access,
destructive operations, and commands outside this repository remain subject to
approval.
