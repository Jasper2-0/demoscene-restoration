#!/bin/zsh
set -euo pipefail

# Keep Ghidra's mutable preferences and caches out of the user's Library so
# this fixed-purpose audit can run inside the workspace sandbox without a
# recurring permission request.
work_root=${0:A:h:h}
repo_root=${work_root:h:h:h}
audit_home=/private/tmp/wonder-ghidra-home
mkdir -p "$audit_home"

export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export JAVA_TOOL_OPTIONS="-Duser.home=$audit_home"

/opt/homebrew/Cellar/ghidra/12.1.2/libexec/support/analyzeHeadless \
  "$work_root/ghidra-project" Wonder \
  -process wONDEr.exe \
  -noanalysis \
  -scriptPath "$repo_root/tools/ghidra" \
  -postScript WonderOracleAudit.java \
  "$work_root/re/oracle-audit.txt" \
  -postScript ExportDecomp.java \
  "$work_root/re/decompiled.c" \
  -postScript ExportDisasm.java \
  "$work_root/re/disasm.asm"

node "$repo_root/tools/x87-audit.mjs" \
  "$work_root/re/decompiled.c" \
  "$work_root/re/disasm.asm" \
  --out "$work_root/re/x87_audit.md"
