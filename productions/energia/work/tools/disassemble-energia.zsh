#!/bin/zsh
set -euo pipefail

if (( $# != 2 )); then
  print -u2 "usage: $0 <start-address> <stop-address>"
  exit 2
fi

work_root=${0:A:h:h}
start_address=$1
stop_address=$2

exec /usr/bin/objdump -d \
  --start-address="$start_address" \
  --stop-address="$stop_address" \
  "$work_root/src/Energia_FIXED.exe"
