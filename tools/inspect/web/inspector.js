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

const state = { run: null, schedule: [], samples: [], idx: 0, ready: false };

// ---------------------------------------------------------------- boot
$('#title').textContent = PROD;
demo.src = `${BASE}/web/index.html?inspect=1`;

try {
  state.run = await (await fetch(RUN)).json();
} catch {
  $('#meta').textContent = 'no sweep yet — run: node tools/inspect/sweep.mjs ' + PROD;
}
if (state.run) {
  state.samples = state.run.samples;
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
if (!state.samples.length) {
  // No sweep on disk: still usable as a scrubber, just without scores.
  state.samples = demo.contentWindow.__demo.plan(2);
}

// ---------------------------------------------------------------- timeline
const cv = document.createElement('canvas');
$('#timeline').append(cv);
const ctx = cv.getContext('2d');

function layout() {
  const r = $('#timeline').getBoundingClientRect();
  cv.width = Math.max(600, Math.floor(r.width * devicePixelRatio));
  cv.height = Math.floor(92 * devicePixelRatio);
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
  const barY = 6 * D, barH = 16 * D, plotY = 30 * D, plotH = 54 * D;

  // part bars, alternating so boundaries read at a glance
  state.schedule.forEach((p, i) => {
    const x0 = xOf(p.captureStart), x1 = xOf(p.captureStart + p.dur);
    ctx.fillStyle = i % 2 ? '#1d242b' : '#232b34';
    ctx.fillRect(x0, barY, Math.max(1, x1 - x0), barH);
    // colour the bar by the part's median score when we have one
    const ps = state.run?.parts?.find((x) => x.name === p.name);
    if (ps) {
      ctx.fillStyle = ps.medianR >= 0.75 ? '#46b36b' : ps.medianR >= 0.55 ? '#d1a13a' : '#d6503f';
      ctx.fillRect(x0, barY + barH - 3 * D, Math.max(1, x1 - x0), 3 * D);
    }
    if (x1 - x0 > 40 * D) {
      ctx.fillStyle = '#8d97a2';
      ctx.font = `${9 * D}px ui-monospace, monospace`;
      ctx.fillText(p.name, x0 + 3 * D, barY + 11 * D);
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

  $('#where').innerHTML =
    `<b>${s.part}</b> <span>local ${s.local.toFixed?.(2) ?? s.local}s · show ${s.captureTime.toFixed(2)}s` +
    (s.r !== undefined ? ` · r ${s.r.toFixed(3)} · rmse ${s.rmse?.toFixed?.(1) ?? '—'}` : '') + '</span>';

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

  const here = (state.run?.issues ?? []).filter((x) => x.part === s.part);
  $('#issuesHere').innerHTML = here.length
    ? here.map((x) => `<div><i class="sev ${x.sev}"></i>${x.text}</div>`).join('')
    : '<div style="color:var(--dim)">none for this part</div>';

  draw();
}

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
