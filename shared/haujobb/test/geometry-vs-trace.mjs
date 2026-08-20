#!/usr/bin/env node
// geometry-vs-trace.mjs — check the .HJB reader against the RUNNING ORIGINAL.
//
//   node geometry-vs-trace.mjs <lists.json> <data-dir>
//
// where lists.json comes from:
//   node tools/winebox/extract-lists.mjs <gl.log> --out lists.json
//
// The .HJB reader is already cross-checked against an independently written Python
// parser (hjb-vs-oracle.mjs). That proves the two agree; it cannot prove either
// matches the executable. This does.
//
// The engines compile every mesh into a GL display list at load, and the Wine
// +opengl trace records that compilation. So the original tells us, for each list
// it built, how many face corners it submitted and the highest vertex index it
// referenced. Those are exactly the quantities the reader derives from the .HJB
// file, arrived at by a completely different route.
//
// THE CHECK IS AN ACCOUNTING, NOT A RESEMBLANCE. Every list must be claimed by a
// mesh and every mesh must claim its lists, at a fixed lists-per-mesh ratio.
// METHOD.md: counting how many of each KIND match is the weak test and leaves
// ambiguity wherever two producers share a value — three meshes here have 2004
// corners each, so "2004 appears in both" proves nothing. A total bijection does.
//
// Exit: 0 accounted for · 1 mismatch · 77 no trace data (absent)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseHjb } from '../js/hjb.js';

const [listsPath, dataDir] = process.argv.slice(2);
if (!listsPath || !dataDir) {
  console.error('usage: geometry-vs-trace.mjs <lists.json> <data-dir>');
  process.exit(2);
}
if (!existsSync(listsPath)) {
  console.error(`no ${listsPath} — run tools/winebox/extract-lists.mjs first (absent)`);
  process.exit(77);
}
if (!existsSync(dataDir)) {
  console.error(`no ${dataDir} — rehydrate the original first (absent)`);
  process.exit(77);
}

const lists = JSON.parse(readFileSync(listsPath, 'utf8'));
const arrayLists = lists.filter((l) => l.path === 'array');
if (!arrayLists.length) {
  console.error(`${listsPath}: no array-drawn lists — nothing to account for (absent)`);
  process.exit(77);
}

// Every mesh in every scene, in file then tree order.
const meshes = [];
for (const f of readdirSync(dataDir).filter((x) => /\.hjb$/i.test(x)).sort()) {
  const scene = parseHjb(readFileSync(join(dataDir, f)), { source: f });
  (function walk(ns) {
    for (const n of ns) {
      if (n.kind === 'mesh') meshes.push({ scene: f, name: n.name, nv: n.nv, corners: n.faces.length * 3 });
      walk(n.children);
    }
  })(scene.nodes);
}
if (!meshes.length) { console.error(`${dataDir}: no meshes found`); process.exit(1); }

// Group both sides by (corners, maxVertexIndex). The index bound is the second
// signal and it is what separates two meshes that happen to share a corner count.
const key = (corners, nv) => `${corners}/${nv}`;
const byMesh = new Map();
for (const m of meshes) {
  const k = key(m.corners, m.nv);
  if (!byMesh.has(k)) byMesh.set(k, []);
  byMesh.get(k).push(m);
}
const byList = new Map();
for (const l of arrayLists) {
  // maxIndex is the highest index REFERENCED, so the vertex count is one more.
  const k = key(l.ncorners, l.maxIndex + 1);
  if (!byList.has(k)) byList.set(k, []);
  byList.get(k).push(l);
}

const problems = [];
const ratios = new Set();
for (const [k, ms] of byMesh) {
  const ls = byList.get(k) ?? [];
  if (!ls.length) { problems.push(`no display list for ${ms.length} mesh(es) with ${k} (corners/verts): ${ms.map((m) => m.scene + ':' + m.name.split(' ')[0]).join(', ')}`); continue; }
  if (ls.length % ms.length !== 0) {
    problems.push(`${k}: ${ls.length} list(s) for ${ms.length} mesh(es) — not a whole ratio`);
    continue;
  }
  ratios.add(ls.length / ms.length);
}
for (const [k, ls] of byList) {
  if (!byMesh.has(k)) problems.push(`${ls.length} display list(s) with ${k} claimed by no mesh`);
}
// A single consistent lists-per-mesh ratio is the thing that makes this an
// accounting. If it varies, something is unexplained even though every bucket
// happened to be non-empty.
if (ratios.size > 1) problems.push(`lists-per-mesh ratio is not constant: ${[...ratios].sort().join(', ')}`);

const ratio = [...ratios][0];
console.log(`geometry-vs-trace: ${meshes.length} meshes, ${arrayLists.length} array display lists`);
console.log(`  ${byMesh.size} distinct (corners/verts) signatures, ${ratio ?? '?'} list(s) per mesh`);
console.log(`  corners: ${meshes.reduce((n, m) => n + m.corners, 0)} parsed vs ` +
            `${arrayLists.reduce((n, l) => n + l.ncorners, 0)} compiled ` +
            `(x${ratio ?? '?'} = ${(meshes.reduce((n, m) => n + m.corners, 0)) * (ratio ?? 0)})`);

if (problems.length) {
  console.error(`\nFAIL: ${problems.length} unaccounted`);
  for (const p of problems.slice(0, 20)) console.error('  ' + p);
  process.exit(1);
}
console.log('  every list is claimed by a mesh and every mesh by its lists');
