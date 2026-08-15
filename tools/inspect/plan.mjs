// plan.mjs — the sample grid, once, for every production.
//
// This was copy-pasted into each adapter's `plan()`. That is a bad place for it,
// because the SAMPLE COUNT IS A CORRECTNESS PROPERTY and a copy can drift
// silently:
//
//   Three samples per part is an anecdote when a part is UNEVEN. Lapsus's silli
//   scored 0.846 off three samples while the five-sample gate measured 0.798
//   with a spread of 0.433 — a 2s step over an 8s part can land entirely in its
//   good half. That gap made the tracker sync propose CLOSING a real, open
//   defect, twice, before the floor was raised.
//
// With one copy per production, two ports can disagree about how worst-part is
// even defined, and nothing detects it. So it lives here, `plan()` becomes an
// optional override for productions with a genuinely irregular timeline, and
// tools/inspect/plan-identity.mjs asserts this reproduces what the hand-written
// copies produced.
//
// A NOTE ON THE OPPOSITE FAILURE, because raising the floor is not free: moving
// the grid moves which defects are visible. Raising Lapsus's floor from 3 to 5
// stepped OVER paleksi's worst instant — its measured worst "improved" from
// r 0.172 to 0.759 with nothing about the port changing. A narrow defect can
// hide between samples at any fixed step. Do not read a grid change as progress.

/**
 * Sample plan for a production, from its `schedule()`.
 *
 * `schedule()` already carries the only two things needed — `dur` and
 * `captureStart` — so this works for a single-clock production and a
 * multi-clock one identically: whatever offset arithmetic a production does to
 * produce `captureStart`, the samples inherit.
 *
 * @param {Array<{name:string, phase?:number, dur:number, captureStart:number}>} schedule
 * @param {number} step  target seconds between samples
 */
export function defaultPlan(schedule, step = 2) {
  const out = [];
  for (const p of schedule) {
    // At least five, however short the part is.
    const n = Math.max(5, Math.floor((p.dur - 0.5) / step));
    for (let i = 0; i < n; i++) {
      // Inset from both ends by a quarter of a slot so a sample is never taken
      // exactly on a part boundary, where a one-frame timing difference decides
      // which part is on screen at all.
      const local = +((i + 0.5) / n * (p.dur - 0.3) + 0.15).toFixed(3);
      out.push({
        part: p.name,
        phase: p.phase ?? 1,
        local,
        captureTime: +(p.captureStart + local).toFixed(3),
      });
    }
  }
  return out;
}

/**
 * A part name safe to put in a FILENAME.
 *
 * Part names are human-facing and a production may use whatever reads best:
 * sonnet's are prose ("title / poem only", "scene 2 — trees/butterflies"). The
 * sweep writes one PNG per sample named after the part, so a slash silently
 * became a directory separator and the write failed with ENOENT several hundred
 * renders in. lapsus and wonder never exposed it because their names are
 * identifier-like (flu2, effect_40c760) — a third adopter with readable names
 * was needed to find it.
 *
 * Collapses anything outside [A-Za-z0-9._-] so two different names cannot
 * collide on the same file.
 */
export const safePart = (name) => String(name)
  .replace(/[^\w.-]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 80) || 'part';
