#!/bin/sh
# ppcbox.sh — run one of this directory's oracle tools where qemu-ppc exists.
#
#   ./ppcbox.sh python3 export.py flat/ out/
#   ./ppcbox.sh python3 rendertex.py flat/ tex/
#   ./ppcbox.sh sh -c 'python3 runsynth.py flat/ > mods/part1_full.dbm'
#
# Half the tools here read the binary through a real PowerPC (see
# Dockerfile.ppcbox for why that cannot happen natively on macOS). This wraps
# them instead of porting them: the container sees this directory as /work, so
# flat/, out/ and every relative path a tool already takes keep working, and
# the tools themselves stay unaware they are in a container.
#
# The image is built on first use and then reused; `PPCBOX_REBUILD=1` forces it.
set -eu

IMAGE=${PPCBOX_IMAGE:-pp-ppcbox}
HERE=$(cd "$(dirname "$0")" && pwd)

# Docker Desktop on macOS keeps docker-credential-desktop inside the app
# bundle, and /usr/local/bin/docker alone cannot pull an image without it —
# the failure is "error getting credentials", which reads like an auth problem
# rather than a PATH one. Harmless where the directory does not exist.
DESKTOP_BIN=/Applications/Docker.app/Contents/Resources/bin
if [ -d "$DESKTOP_BIN" ]; then
  case ":$PATH:" in
    *":$DESKTOP_BIN:"*) ;;
    *) PATH="$PATH:$DESKTOP_BIN"; export PATH ;;
  esac
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ppcbox: no docker on PATH." >&2
  echo "ppcbox: on Linux, skip this wrapper — install qemu-user-static and run the tool directly." >&2
  exit 77
fi
if ! docker info >/dev/null 2>&1; then
  echo "ppcbox: docker is installed but the daemon is not running (start Docker Desktop)." >&2
  exit 77
fi

if [ "${PPCBOX_REBUILD:-0}" = "1" ] || ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "ppcbox: building $IMAGE (once) ..." >&2
  docker build -q -t "$IMAGE" -f "$HERE/Dockerfile.ppcbox" "$HERE" >&2
fi

[ "$#" -gt 0 ] || set -- python3 -c 'import sys; print(sys.version)'

# --user keeps output owned by whoever ran this rather than by root: export.py
# writes several thousand files into out/, and a root-owned tree is a nuisance
# to clean up from the host.
exec docker run --rm -i \
  --user "$(id -u):$(id -g)" \
  -v "$HERE:/work" \
  -w /work \
  "$IMAGE" "$@"
