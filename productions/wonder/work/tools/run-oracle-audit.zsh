#!/bin/zsh
set -euo pipefail

# Keep Ghidra's mutable preferences and caches out of the user's Library so
# this fixed-purpose audit can run inside the workspace sandbox without a
# recurring permission request.
repo_root=${0:A:h:h:h}
audit_home=/private/tmp/wonder-ghidra-home
mkdir -p "$audit_home"

export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export JAVA_TOOL_OPTIONS="-Duser.home=$audit_home"

exec /opt/homebrew/Cellar/ghidra/12.1.2/libexec/support/analyzeHeadless \
  "$repo_root/work-wonder/ghidra-project" Wonder \
  -process wONDEr.exe \
  -noanalysis \
  -scriptPath "$repo_root/work-wonder/ghidra" \
  -postScript WonderOracleAudit.java \
  "$repo_root/work-wonder/re/oracle-audit.txt"
