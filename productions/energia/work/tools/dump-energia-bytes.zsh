#!/bin/zsh
set -euo pipefail

if (( $# != 2 )); then
  print -u2 "usage: $0 <start-virtual-address> <stop-virtual-address>"
  exit 2
fi

work_root=${0:A:h:h}
start_address=$(( $1 ))
stop_address=$(( $2 ))
image_base=$(( 0x400000 ))
file_image_end=$(( 0x55dd20 ))

if (( start_address < image_base || stop_address <= start_address || stop_address > file_image_end )); then
  print -u2 "range must stay within Energia's file-backed image 0x400000..0x55dd20"
  exit 2
fi

# Energia's PE uses equal 0x1000 file/section alignment and a 0x1000 header,
# so file-backed virtual addresses map to raw offsets at VA - ImageBase.
file_offset=$(( start_address - image_base ))
byte_count=$(( stop_address - start_address ))
exec /usr/bin/xxd -g 1 -s "$file_offset" -l "$byte_count" \
  "$work_root/src/Energia_FIXED.exe"
