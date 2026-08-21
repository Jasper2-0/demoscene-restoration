#!/bin/sh
# oracle-at.sh <production> <captureSeconds> [outdir]
#
# MODE:       REPORT — prints the per-mesh comparison; exits non-zero only when the
#             probe recorded nothing, which is an invocation failure, not a verdict.
# OBSERVABLE: vertex counts per submitted draw group, original vs port.
# UNITS:      the argument is CAPTURE seconds. It is converted to SHOW seconds, then
#             to (order, hold) — passing show time here silently compares the two
#             sides 83.3ms apart, which produced a fully-formed false defect once.
#
# Record the ORIGINAL at one addressable capture instant and diff its draw stream
# against the port's, per mesh.
#
# Everything this wraps was learned the hard way and is easy to get wrong:
#
#  * /demo must be the ORIGINAL DISTRIBUTION. wONDEr.exe opens WON.DER at runtime,
#    so mounting the files unpacked out of it produces a "File systema error"
#    dialog whose dismissal kills the process — which reads as a Wine crash.
#  * Addressing an instant needs SUNF_QPC_HOLD, not a frozen counter. A frozen
#    counter latches and compares against itself, so elapsed is always zero and
#    every recording lands on the order boundary.
#  * The hold is measured in SHOW time, and the capture is offset from it by the
#    measured alignment, so capture -> show -> order -> hold has to be computed
#    rather than guessed.
#
# Prints the per-mesh comparison. Exits non-zero if the probe recorded nothing.
set -eu
PROD=$1; CAP=$2; OUT=${3:-$(mktemp -d)}
REPO=$(cd "$(dirname "$0")/../.." && pwd)
cd "$REPO"

# capture -> show -> (order, hold), from the production's own order envelope and
# the alignment constant its adapter applies.
CONV=$(node --no-warnings - "$PROD" "$CAP" <<'JS'
import fs from 'node:fs';
// The SHARED source, not a vendored per-production copy. Importing
// productions/wonder/.../envelope.js is what made this tool look general while only
// working for Wonder.
import { parseEnvelope, envelopeTimes } from './shared/sunflower/js/envelope.js';
const [prod, capArg] = process.argv.slice(2);
const cap = Number(capArg);
const metaPath = `productions/${prod}/prod.json`;
if (!fs.existsSync(metaPath)) {                 // 2 = invocation error, not a measurement
  process.stderr.write(`no such production: ${prod}\n`);
  process.exit(2);
}
const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
const oracle = meta.oracle;
// 77 = the oracle is absent for this production, not a failure of the measurement.
if (!oracle?.orderEnvelope) {
  process.stderr.write(`${prod} declares no "oracle" block in prod.json — no order `
    + `envelope, so a capture time cannot be turned into an addressable instant.\n`);
  process.exit(77);
}
const offMs = meta.captures?.[0]?.alignmentOffsetMs ?? 0;
// Some ports apply the comparison offset in main.js rather than prod.json; prod.json
// says where to look, so the tool need not know which production this is.
let off = offMs / 1000;
if (oracle.captureOffsetFrom) {
  const src = fs.readFileSync(`productions/${prod}/${oracle.captureOffsetFrom}`, 'utf8');
  const m = /captureOffsetMs = parameters\.has\('capoff'\).*?: ([\d.]+)/s.exec(src);
  if (m) off = Number(m[1]) / 1000;
}
const envPath = `productions/${prod}/${oracle.orderEnvelope}`;
const t = envelopeTimes(parseEnvelope(fs.readFileSync(envPath, 'utf8'), oracle.orderEnvelope));
const show = cap - off;
let o = 0;
for (let i = 0; i < t.length; i++) if (t[i] <= show) o = i;
process.stdout.write(`ORDER=${o}\nHOLD=${(show - t[o]).toFixed(4)}\nSHOW=${show.toFixed(4)}\n`);
JS
)
# Propagate the node exit status. `eval "$(...)"` discards it, so a production with no
# oracle block exited 1 from a later step instead of 77 -- "the oracle is absent here"
# read as "the measurement failed", which is the distinction 77 exists to make.
RC=$?
[ "$RC" -eq 0 ] || exit "$RC"
eval "$CONV"
echo "capture ${CAP}s -> show ${SHOW}s -> order ${ORDER} hold ${HOLD}s"

DEMO=${SUNF_DEMO:-}
[ -n "$DEMO" ] || { echo "set SUNF_DEMO to the original distribution directory" >&2; exit 2; }
mkdir -p "$OUT"
docker run --rm --platform linux/386 -e SUNF_QPC_HOLD="$HOLD" \
  -v "$DEMO:/demo:ro" -v "$REPO/tools/winebox:/work" -v "$OUT:/out" \
  haujobb-winebox:latest sh /work/sunf-probe.sh "$ORDER" /out 45 >"$OUT/probe.log" 2>&1 || {
    echo "probe failed:" >&2; tail -5 "$OUT/probe.log" >&2; exit 1; }
grep -E "order=" "$OUT/probe.log" | sed 's/^/  /'

# SHOW time, not capture time. record-minigl-draws --time takes a SHOW time while
# the oracle is held at show = capture - alignment; passing $CAP here compares the
# two sides 83.3ms apart. Vertex counts survive that, alphas riding a fade do not,
# and it produced two false "defects" before it was caught.
node tools/record-minigl-draws.mjs "$PROD" --time "$SHOW" ${SUNF_QUERY:+--query "$SUNF_QUERY"} \
  --out "$OUT/port.jsonl" >/dev/null 2>&1
node tools/winebox/compare-draws.mjs "$OUT/gl.log" "$OUT/port.jsonl"
