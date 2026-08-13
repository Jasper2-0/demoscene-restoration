#!/bin/zsh
set -euo pipefail

if (( $# != 2 )); then
  print -u2 "usage: $0 <start-virtual-address> <stop-virtual-address>"
  exit 2
fi

repo_root=${0:A:h:h:h}
start_address=$(( $1 ))
stop_address=$(( $2 ))
image_base=$(( 0x400000 ))
image_end=$(( 0x49ea40 ))

if (( start_address < image_base || stop_address <= start_address || stop_address > image_end )); then
  print -u2 "range must stay within Wonder image 0x400000..0x49ea40"
  exit 2
fi

# wONDEr.exe has equal 0x1000 file/section alignment and 0x1000 header size,
# so a mapped VA's raw-file offset is VA - ImageBase. `xxd` preserves the
# literal byte payload needed to decode compiler constants exactly.
file_offset=$(( start_address - image_base ))
byte_count=$(( stop_address - start_address ))
exec /usr/bin/xxd -g 1 -s "$file_offset" -l "$byte_count" \
  "$repo_root/work-wonder/src/wONDEr.exe"
