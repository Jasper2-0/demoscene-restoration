#!/bin/zsh
set -euo pipefail

work_root=${0:A:h:h}
repo_root=${work_root:h:h:h}
audit_home=/private/tmp/energia-ghidra-home
mkdir -p "$audit_home"

export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export JAVA_TOOL_OPTIONS="-Duser.home=$audit_home"

/opt/homebrew/Cellar/ghidra/12.1.2/libexec/support/analyzeHeadless \
  "$work_root/ghidra-project" Energia \
  -process Energia_FIXED.exe \
  -noanalysis \
  -scriptPath "$repo_root/tools/ghidra" \
  -postScript EnergiaOracleAudit.java \
  "$work_root/re/oracle-audit.txt" \
  -postScript ExportDecomp.java \
  "$work_root/re/decompiled.c" \
  -postScript ExportDisasm.java \
  "$work_root/re/disasm.asm"

node "$repo_root/tools/x87-audit.mjs" \
  "$work_root/re/decompiled.c" \
  "$work_root/re/disasm.asm" \
  --out "$work_root/re/x87_audit.md"
