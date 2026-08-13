#!/bin/sh
# run-verify.sh — the Sonnet verification pipeline, one command.
#
#   ./run-verify.sh              # --fast: static + browser + oracle tiers
#   ./run-verify.sh --full       # + the 354-sample sweep, verdict vs baseline
#   ./run-verify.sh --bless      # cold sweep; green run -> baseline_golden.json
#   ./run-verify.sh --full --quality=remaster
#
# Everything is delegated to web/test/run_all.mjs (run from the production root); a report lands in
# work/verify/report_<stamp>.md.  See work/re/oracle/ORACLE.md for the oracle tier.
cd "$(dirname "$0")/.." || exit 1
exec node web/test/run_all.mjs "$@"
