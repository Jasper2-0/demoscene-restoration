// script.js — reader for the Haujobb show script (script.txt / Script.txt).
//
// The grammar is the one read out of Genoaux's parser (FUN_00405830), not
// inferred from the files. Sections are matched by SUBSTRING on the lowercased
// line, and unrecognised or blank lines are skipped, which is why stray text in
// these files is harmless.
//
// TWO GENERATIONS, and the difference is one line:
//
//   2000 (moments, mosaik)  [part] = 5 lines, no texture flags, fmod
//   2002 (elements onward)  [part] = 6 lines, texture flags, [parameter]/[module]
//
// The extra 2002 line is an integer added to the scene's animation clock. It is
// detected rather than configured: in a 6-line block the third line is numeric
// ("0"), in a 5-line block it is a camera or texture name ("standard"). That is a
// local, decidable test, which beats asking the caller to know.
//
// A WARNING THE FILES DO NOT CARRY. In Moments the [part] number is PARSED AND
// NEVER READ BACK — the real timing is a hardcoded table of absolute seconds in
// the executable. Art and Mikrostrange keep their whole sequence in code too.
// Driving those three from the script alone yields a plausible, wrong show.
// See docs/HAUJOBB_PORT_STUDY.md.

export class ScriptFormatError extends Error {
  constructor(message) { super(message); this.name = 'ScriptFormatError'; }
}

const SECTIONS = ['[module]', '[mp3]', '[textures]', '[scenes]',
                  '[parameter]', '[part]', '[addpart]', '[addeffect]'];
const TEXTURE_FLAGS = new Set(['fullscreen', 'nomipmap', 'grayscale']);
const isNumeric = (s) => /^-?\d+$/.test(String(s).trim());

// The engine's effect registry, recovered from Genoaux's dispatch switch. The id
// is the value the engine switches on; ids 16-19 are unassigned.
export const EFFECTS = Object.freeze({
  droid1: 1, droid2: 2, droid3: 3, tunnel: 4, oscope: 5, render2texture: 6,
  gridplane: 7, gridtunnel2: 8, gridtunnel: 9, gridinterf: 10,
  griddistord1: 11, griddistord2: 12, griddistord3: 13, griddistord4: 14,
  griddistord5: 15, gridvemputus1: 20,
});

export function parseScript(text, { source = '<script>' } = {}) {
  const raw = String(text).split(/\r?\n/);
  const out = {
    music: null, textures: [], scenes: [], parts: [],
    parameters: [], generation: null, warnings: [],
  };
  let i = 0;
  const next = () => (i < raw.length ? raw[i++] : null);
  const peek = (k = 0) => (i + k < raw.length ? raw[i + k] : null);
  const untilBlank = () => {
    const items = [];
    for (;;) {
      const l = peek();
      if (l === null) break;
      if (l.trim() === '' || l.trim().startsWith('[')) break;
      items.push(next().trim());
    }
    return items;
  };
  let current = null;   // the [part] that later [addpart]/[addeffect] attach to

  while (i < raw.length) {
    const line = next();
    if (line === null) break;
    const lower = line.toLowerCase();
    const sec = SECTIONS.find((s) => lower.includes(s));
    if (!sec) continue;

    switch (sec) {
      case '[mp3]':
      case '[module]': {
        const file = (next() ?? '').trim();
        // The offset line is optional in the wild; only consume it if numeric.
        let start = 0;
        if (peek() !== null && isNumeric(peek())) start = Number(next().trim());
        out.music = { kind: sec === '[mp3]' ? 'mp3' : 'module', file,
                      startSeconds: start, silent: file.toLowerCase() === 'nosound' };
        break;
      }
      case '[textures]':
        for (const t of untilBlank()) {
          const [name, ...rest] = t.split(/\s+/);
          const flags = rest.filter((f) => TEXTURE_FLAGS.has(f.toLowerCase()))
                            .map((f) => f.toLowerCase());
          const unknown = rest.filter((f) => !TEXTURE_FLAGS.has(f.toLowerCase()));
          if (unknown.length) {
            out.warnings.push(`${source}: unknown texture flag(s) on ${name}: ${unknown.join(' ')}`);
          }
          out.textures.push({ name, flags });
        }
        break;
      case '[scenes]':
        out.scenes.push(...untilBlank());
        break;
      case '[parameter]':
        out.parameters.push((next() ?? '').trim());
        break;
      case '[part]': {
        const scene = (next() ?? '').trim();
        const endMs = Number((next() ?? '0').trim());
        // Generation probe, per the header note: numeric third line => 2002.
        const six = peek() !== null && isNumeric(peek());
        const param = six ? Number(next().trim()) : 0;
        const camera = (next() ?? '').trim();
        const overlayBefore = (next() ?? '').trim();
        const overlayAfter = (next() ?? '').trim();
        const gen = six ? 2002 : 2000;
        if (out.generation === null) out.generation = gen;
        else if (out.generation !== gen) {
          out.warnings.push(`${source}: [part] arity changes mid-file (${out.generation} then ${gen})`);
        }
        current = { scene, endMs, param, camera, overlayBefore, overlayAfter,
                    addParts: [], effects: [] };
        out.parts.push(current);
        break;
      }
      case '[addpart]': {
        const p = { scene: (next() ?? '').trim(),
                    param: Number((next() ?? '0').trim()),
                    camera: (next() ?? '').trim() };
        if (!current) { out.warnings.push(`${source}: [addpart] before any [part]`); break; }
        current.addParts.push(p);
        break;
      }
      case '[addeffect]': {
        const name = (next() ?? '').trim();
        const e = {
          name, id: EFFECTS[name.toLowerCase()] ?? null,
          texture: (next() ?? '').trim(),
          offsetMs: Number((next() ?? '0').trim()),
          speed: Number((next() ?? '0').trim()),
          p3: Number((next() ?? '0').trim()),
        };
        if (e.id === null) out.warnings.push(`${source}: unknown effect "${name}"`);
        if (!current) { out.warnings.push(`${source}: [addeffect] before any [part]`); break; }
        current.effects.push(e);
        break;
      }
    }
  }
  if (!out.parts.length) throw new ScriptFormatError(`${source}: no [part] blocks`);
  return out;
}

/** Effect phase, as the engine computes it: (offset + t) * speed / 30. */
export const effectPhase = (effect, tMs) => (effect.offsetMs + tMs) * effect.speed / 30;
