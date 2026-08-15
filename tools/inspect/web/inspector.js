// inspector.js — scrub a port against its reference and see what is on screen.
//
// Generalises wonder's web/js/timeline-inspector.js, which did this for one
// demo with its effect list compiled in. Everything production-specific comes
// from the `window.__demo` adapter (tools/inspect/ADAPTER.md) inside the
// iframe, so this file works for any port that implements it.
//
// THE INTEGRATION, and the reason these are one tool rather than two: the
// timeline is drawn from the SWEEP's run.json — every sample it scored, every
// issue it raised — and clicking any of it drives the LIVE demo to that
// instant and shows the reference frame beside it. Sonnet's sweep could tell
// you a number was bad; wonder's inspector could tell you what was on screen.
// Neither could take you from "this part scores 0.54" to "…and here is the
// frame, here is the original, and here is what the renderer thought it was
// drawing" without a human copying timestamps between two tools.
const qs = new URLSearchParams(location.search);
const PROD = qs.get('prod') ?? 'lapsus';
const TAG = qs.get('tag') ?? '';
const BASE = `/productions/${PROD}`;
const RUN = `${BASE}/work/verify/inspect/run${TAG ? `-${TAG}` : ''}.json`;

const $ = (s) => document.querySelector(s);
const demo = $('#demo');

const state = { run: null, schedule: [], samples: [], idx: 0, ready: false,
                tracker: [], notes: [] };

// ---------------------------------------------------------------- boot
$('#title').textContent = PROD;
demo.src = `${BASE}/web/index.html?inspect=1`;

try {
  state.run = await (await fetch(RUN)).json();
} catch {
  $('#meta').textContent = 'no sweep yet — run: node tools/inspect/sweep.mjs ' + PROD;
}
if (state.run) {
  // CHRONOLOGICAL, ALWAYS. The plan is built part-by-part, and for a LAYERED
  // production the parts are not in start order — Wonder's clip table lists
  // effect_4106a0 (start 0), then 9.862, then 0 again. Drawn in array order the
  // score trace zigzags back and forth across the canvas and the "next sample"
  // key jumps around the show. Sorting by capture time costs nothing and is
  // correct for exclusive timelines too, where it is already the order.
  state.samples = [...state.run.samples].sort((a, b) => a.captureTime - b.captureTime);
  $('#meta').textContent =
    `${state.run.samples.length} samples · median r ${state.run.medianR} · ` +
    `${state.run.issues.length} issues · ${new Date(state.run.when).toLocaleString()}`;
}

// The adapter lives inside the iframe; wait for it rather than guessing.
await new Promise((res) => {
  const tick = () => {
    const w = demo.contentWindow;
    if (w && w.__demo) { state.ready = true; res(); }
    else setTimeout(tick, 150);
  };
  demo.addEventListener('load', tick);
  tick();
});
state.schedule = demo.contentWindow.__demo.schedule();
// LANE-PACK THE PART BARS. A production whose parts are exclusive needs one
// lane; a LAYERED one needs as many as its deepest overlap, or the bars paint
// over each other and only the last drawn is visible. Wonder runs four effects
// at once around t=37s. Greedy first-fit by start time: generic, and it
// degenerates to a single lane exactly when parts never overlap.
state.lanes = (() => {
  const ends = [];
  for (const p of [...state.schedule].sort((a, b) => a.captureStart - b.captureStart)) {
    let l = ends.findIndex((e) => e <= p.captureStart + 1e-9);
    if (l < 0) { l = ends.length; ends.push(0); }
    ends[l] = p.captureStart + p.dur;
    p.lane = l;
  }
  return Math.max(1, ends.length);
})();
/** Every part live at a given capture time — "what is under the cursor".
 *  Computed from schedule() alone, so no adapter has to implement it. */
const activeAt = (t) => state.schedule
  .filter((p) => t >= p.captureStart && t < p.captureStart + p.dur)
  .map((p) => p.name);
async function refreshTracker() {
  try {
    const t = await (await fetch('/_inspect/issues')).json();
    state.tracker = t.issues ?? [];
    if (t.error) $('#hint').textContent = `gh: ${t.error}`;
  } catch { state.tracker = []; }
  try { state.notes = await (await fetch('/_inspect/notes')).json(); } catch { state.notes = []; }
}
await refreshTracker();
if (!state.samples.length) {
  // No sweep on disk: still usable as a scrubber, just without scores.
  state.samples = demo.contentWindow.__demo.plan(2)
    .sort((a, b) => a.captureTime - b.captureTime);
}

// ---------------------------------------------------------------- timeline
const cv = document.createElement('canvas');
$('#timeline').append(cv);
const ctx = cv.getContext('2d');

function layout() {
  const r = $('#timeline').getBoundingClientRect();
  cv.width = Math.max(600, Math.floor(r.width * devicePixelRatio));
  cv.height = Math.floor(116 * devicePixelRatio);
  cv.style.width = '100%';
  draw();
}
const tSpan = () => {
  const a = Math.min(...state.samples.map((s) => s.captureTime));
  const b = Math.max(...state.samples.map((s) => s.captureTime));
  return [a, b];
};
const xOf = (t) => { const [a, b] = tSpan(); return 8 + (t - a) / ((b - a) || 1) * (cv.width - 16); };

function draw() {
  const D = devicePixelRatio;
  ctx.clearRect(0, 0, cv.width, cv.height);
  // Lanes share the same 16px band a single-lane production used, so an
  // exclusive timeline looks exactly as before and a layered one gets thinner
  // stacked bars rather than bars painted over each other.
  const barY = 6 * D, bandH = 16 * D;
  const partLaneH = bandH / state.lanes;
  const plotY = 30 * D, plotH = 60 * D;

  // part bars, alternating so boundaries read at a glance
  state.schedule.forEach((p, i) => {
    const x0 = xOf(p.captureStart), x1 = xOf(p.captureStart + p.dur);
    const y = barY + (p.lane ?? 0) * partLaneH;
    ctx.fillStyle = i % 2 ? '#1d242b' : '#232b34';
    ctx.fillRect(x0, y, Math.max(1, x1 - x0), Math.max(1, partLaneH - D));
    // colour the bar by the part's median score when we have one
    const ps = state.run?.parts?.find((x) => x.name === p.name);
    if (ps) {
      ctx.fillStyle = ps.medianR >= 0.75 ? '#46b36b' : ps.medianR >= 0.55 ? '#d1a13a' : '#d6503f';
      ctx.fillRect(x0, y + partLaneH - 3 * D, Math.max(1, x1 - x0), 2 * D);
    }
    // Only label when the lane is tall enough to read; with many lanes the
    // hover readout carries the names instead.
    if (x1 - x0 > 40 * D && partLaneH > 9 * D) {
      ctx.fillStyle = '#8d97a2';
      ctx.font = `${9 * D}px ui-monospace, monospace`;
      ctx.fillText(p.name, x0 + 3 * D, y + partLaneH - 4 * D);
    }
  });

  // score trace
  if (state.samples[0]?.r !== undefined) {
    ctx.strokeStyle = '#2b333c'; ctx.lineWidth = 1 * D;
    for (const g of [0.55, 0.75]) {
      const y = plotY + plotH - g * plotH;
      ctx.beginPath(); ctx.moveTo(8 * D, y); ctx.lineTo(cv.width - 8 * D, y); ctx.stroke();
    }
    ctx.beginPath();
    state.samples.forEach((s, i) => {
      const x = xOf(s.captureTime), y = plotY + plotH - Math.max(0, s.r) * plotH;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.strokeStyle = '#5aa9e6'; ctx.lineWidth = 1.5 * D; ctx.stroke();

    if ($('#showIssues').checked) {
      for (const s of state.samples) {
        if (s.r >= 0.55) continue;
        ctx.fillStyle = '#d6503f';
        ctx.beginPath();
        ctx.arc(xOf(s.captureTime), plotY + plotH - Math.max(0, s.r) * plotH, 3 * D, 0, 7);
        ctx.fill();
      }
    }
  }

  // ---- ISSUE LANE. Issues are only useful on a timeline if they are ON it.
  // The two kinds know their place differently: a sweep issue names a PART, so
  // it spans that part's window; a note names an INSTANT, so it pins there.
  const laneY = plotY + plotH + 6 * D, laneH = 8 * D;
  for (const it of state.tracker) {
    if (it.state !== 'OPEN' && !$('#showIssues').checked) continue;
    const open = it.state === 'OPEN';
    ctx.globalAlpha = open ? 1 : 0.28;
    // note-backed issues are drawn from state.notes below, so skip them here
    if (it.kind === 'note') { ctx.globalAlpha = 1; continue; }
    if (it.from != null) {
      const x0 = xOf(it.from), x1 = xOf(it.to);
      ctx.fillStyle = it.sev === 'major' || it.sev === 'error' ? '#d6503f' : '#d1a13a';
      ctx.fillRect(x0, laneY + (open ? 0 : 2 * D), Math.max(2 * D, x1 - x0),
        open ? laneH : laneH - 4 * D);
    }
    ctx.globalAlpha = 1;
  }

  // Notes pin at their own instant, whether or not they were filed — an
  // observation is worth seeing on the timeline the moment it is made, and
  // waiting for a round trip to GitHub to show it would be backwards.
  for (const n of state.notes) {
    if (n.captureTime == null) continue;
    const x = xOf(n.captureTime);
    ctx.fillStyle = n.status === 'done' ? '#4a4a5e' : '#9a6ce6';
    ctx.beginPath();
    ctx.moveTo(x, laneY - 3 * D); ctx.lineTo(x + 4 * D, laneY + laneH);
    ctx.lineTo(x - 4 * D, laneY + laneH); ctx.closePath(); ctx.fill();
  }

  // playhead
  const cur = state.samples[state.idx];
  if (cur) {
    const x = xOf(cur.captureTime);
    ctx.strokeStyle = '#e8eef5'; ctx.lineWidth = 1 * D;
    ctx.beginPath(); ctx.moveTo(x, 2 * D); ctx.lineTo(x, cv.height - 2 * D); ctx.stroke();
  }
}
addEventListener('resize', layout);

$('#timeline').addEventListener('click', (e) => {
  const r = cv.getBoundingClientRect();
  const t = (() => {
    const [a, b] = tSpan();
    return a + ((e.clientX - r.left) / r.width) * (b - a);
  })();
  // nearest sample, so scrubbing always lands on something we can score
  let best = 0, bd = Infinity;
  state.samples.forEach((s, i) => {
    const d = Math.abs(s.captureTime - t);
    if (d < bd) { bd = d; best = i; }
  });
  go(best);
});

// ---------------------------------------------------------------- panels
const fmt = (v) => typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(3)) : String(v);

async function go(i) {
  state.idx = Math.max(0, Math.min(state.samples.length - 1, i));
  const s = state.samples[state.idx];
  const info = await demo.contentWindow.__demo.render({ part: s.part, local: s.local });

  // WHAT IS UNDER THE CURSOR. On a layered timeline the sample is filed under
  // one part but the FRAME is everything live at that instant, so a low score
  // does not indict the part it is filed under. Name the others.
  const live = activeAt(s.captureTime).filter((n) => n !== s.part);
  const pos = demo.contentWindow.__demo.positionAt?.(s.captureTime);
  $('#where').innerHTML =
    `<b>${s.part}</b> <span>local ${s.local.toFixed?.(2) ?? s.local}s · show ${s.captureTime.toFixed(2)}s` +
    (pos ? ` · ${pos}` : '') +
    (s.r !== undefined ? ` · r ${s.r.toFixed(3)} · rmse ${s.rmse?.toFixed?.(1) ?? '—'}` : '') +
    (live.length ? `<br>also live: ${live.join(', ')}` : '') + '</span>';

  const rows = Object.entries(info ?? {})
    .filter(([k]) => k !== 'probe' && k !== 'scene' && k !== 't')
    .map(([k, v]) => `<tr><td>${k}</td><td${k === 'glError' && v ? ' style="color:#d6503f"' : ''}>${fmt(v)}</td></tr>`);
  $('#info').innerHTML = rows.join('') || '<tr><td>no info</td><td></td></tr>';

  // resources: whatever the adapter reports, plus the part's own assets if it
  // offers them. Kept generic — a production that knows its textures can say so.
  const assets = (demo.contentWindow.__demo.assets?.(s.part)) ?? null;
  $('#assets').innerHTML = assets?.length
    ? assets.map((a) => `<div>${a}</div>`).join('')
    : '<div>—</div>';

  // reference frame: the sweep caches one per sample, so no video decoding here
  const ref = `${BASE}/work/verify/inspect/frames/ref_${s.captureTime.toFixed(3)}.png`;
  $('#ref').src = ref;

  // Everything filed against this part: the tracker where we have it (so an
  // issue number is one click away) and the sweep's own findings otherwise.
  const tracked = state.tracker.filter((x) => x.part === s.part);
  const here = (state.run?.issues ?? []).filter((x) => x.part === s.part);
  $('#issuesHere').innerHTML = tracked.length
    ? tracked.map((x) => `<div><i class="sev ${x.sev ?? 'minor'}"></i>` +
        `<a href="${x.url}" target="_blank">#${x.number}</a> ${x.title}` +
        `${x.state !== 'OPEN' ? ' <span style="color:var(--dim)">(closed)</span>' : ''}</div>`).join('')
    : here.length
      ? here.map((x) => `<div><i class="sev ${x.sev}"></i>${x.text}</div>`).join('')
      : '<div style="color:var(--dim)">none for this part</div>';

  const mine = state.notes.filter((n) => n.part === s.part);
  $('#noteList').innerHTML = mine.length
    ? mine.slice(0, 6).map((n) => `<div><b>${n.local}s</b> ${n.text.split('\n')[0]}` +
        `${n.issue?.number ? ` · #${n.issue.number}` : ''}</div>`).join('')
    : '';

  draw();
}

// ---- recording an observation.
//
// The point is not the text — it is that the text arrives with the frame
// already attached. Everything the tool knows about this instant goes with it,
// including the rendered pixels, so whoever picks it up is not re-deriving a
// timestamp and hoping they land on the same frame.
$('#noteSend').onclick = async () => {
  const text = $('#noteText').value.trim();
  const st = $('#noteStatus');
  if (!text) { st.className = 'err'; st.textContent = 'say what is wrong first'; return; }
  const s = state.samples[state.idx];
  st.className = ''; st.textContent = 'recording…';
  // Grab the canvas as it stands, in the iframe, before anything re-renders.
  let ourPng = null;
  try {
    ourPng = demo.contentWindow.document.querySelector('canvas').toDataURL('image/png');
  } catch { /* tainted or gone; the note is still worth having */ }
  try {
    const r = await fetch('/_inspect/note', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        part: s.part, local: s.local, captureTime: s.captureTime,
        r: s.r ?? null, rmse: s.rmse ?? null, text,
        info: await demo.contentWindow.__demo.state?.() ?? null,
        assets: demo.contentWindow.__demo.assets?.(s.part) ?? null,
        ourPng, file: $('#noteFile').checked,
      }),
    });
    const out = await r.json();
    if (out.error) throw new Error(out.error);
    st.className = 'ok';
    st.textContent = out.issue
      ? (out.issue.action === 'comment' ? `recorded · commented on #${out.issue.number}`
                                        : `recorded · opened ${out.issue.url}`)
      : `recorded${out.issueError ? ` (github: ${out.issueError})` : ''}`;
    $('#noteText').value = '';
    await refreshTracker();
    await go(state.idx);
  } catch (e) {
    st.className = 'err'; st.textContent = String(e.message ?? e);
  }
};
// cmd/ctrl-enter sends, because a textarea swallows plain enter
$('#noteText').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) $('#noteSend').click();
});

$('#prev').onclick = () => go(state.idx - 1);
$('#next').onclick = () => go(state.idx + 1);
addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') go(state.idx - 1);
  if (e.key === 'ArrowRight') go(state.idx + 1);
});
$('#showIssues').onchange = draw;
$('#showRef').onchange = () => $('#stage').classList.toggle('solo', !$('#showRef').checked);

layout();
await go(0);
