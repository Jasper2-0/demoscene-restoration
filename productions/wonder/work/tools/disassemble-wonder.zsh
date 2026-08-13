#!/bin/zsh
set -euo pipefail

if (( $# != 2 )); then
  print -u2 "usage: $0 <start-address> <stop-address>"
  exit 2
fi

repo_root=${0:A:h:h:h}
start_address=$1
stop_address=$2

# Keep the executable target fixed. Address arguments are passed as individual
# objdump values, so they cannot be interpreted as shell source.
exec /usr/bin/objdump -d \
  --start-address="$start_address" \
  --stop-address="$stop_address" \
  "$repo_root/work-wonder/src/wONDEr.exe"
