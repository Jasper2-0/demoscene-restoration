# Energia oracle workflow

`Energia_FIXED.exe`, `demo.dat`, and the released soundtrack define the port's
behavior. The aligned capture is pixel/timing evidence, but compressed glow,
motion smear, and its approximately 255-second endpoint do not override the
executable or assets.

Every audit pairs Ghidra's decompilation with raw disassembly. The former
recovers ownership and broad control flow; the latter is authoritative for x87
stack behavior, comparisons, float width, constants, and indirect-call
arguments.

Run the complete structural audit from the repository root:

```sh
/bin/zsh productions/energia/work/tools/run-oracle-audit.zsh
```

The runner discovers callbacks stored in the `0x437000` pointer-table region
and executable addresses stored directly by constructors. It then refreshes
`oracle-audit.txt`, paired `decompiled.c`/`disasm.asm` exports, and
`x87_audit.md` in one pass.

Inspect a narrow instruction or literal range without launching Ghidra:

```sh
/bin/zsh productions/energia/work/tools/disassemble-energia.zsh 0x408680 0x408720
/bin/zsh productions/energia/work/tools/dump-energia-bytes.zsh 0x437608 0x437648
```

Browser code changes only after a native divergence is demonstrated. A test
then pins the recovered behavior. Address-derived implementation and visual
sign-off remain separate statuses, especially after the reference capture
ends while Energia's executable timeline continues.
