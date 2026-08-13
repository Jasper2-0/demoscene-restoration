// script.as1 interpreter — faithful port of FUN_00415ed0 (see work/re/engine/SCRIPT_FORMAT.md).
// Time base: 1 tick = 0.25 ms (engine clock was (timeGetTime()-t0)*4).

export const OP_SHOW = 0xfe;
export const OP_SHOW2 = 0xfb; // treated as SHOW; unused by the shipped script
export const OP_TRIG = 0xfc;
export const OP_TRESET = 0xfd;
export const OP_END = 0x12;

export function parseScript(buf) {
  const dv = new DataView(buf);
  const count = dv.getUint32(0, true);
  const events = [];
  for (let i = 0; i < count; i++) {
    const o = 4 + i * 8;
    events.push({
      effectId: dv.getUint8(o),
      opcode: dv.getUint8(o + 1),
      startOrder: dv.getUint8(o + 2),
      startRow: dv.getUint8(o + 3),
      b4: dv.getUint8(o + 4), // endOrder for SHOW, param hi for TRIG
      b5: dv.getUint8(o + 5), // endRow for SHOW, param lo for TRIG
      layer: dv.getUint8(o + 6),
      dead: false,
    });
  }
  return events;
}

const cmpPos = (o1, r1, o2, r2) => (o1 !== o2 ? o1 - o2 : r1 - r2);

export class Timeline {
  constructor(events, registry) {
    this.events = events;
    this.registry = registry; // Map effectId -> effect object {init?, render(t,ticks), trigger?(param)}
    // per-layer timers: {startTicks, effectId}; prev copy gives timer survival semantics
    this.cur = Array.from({ length: 256 }, () => ({ start: 0, id: 0 }));
    this.prev = Array.from({ length: 256 }, () => ({ start: 0, id: 0 }));
    this.quit = false;
  }

  // Returns draw list: [{effect, layer, elapsedTicks}] sorted by layer ascending.
  tick(nowTicks, order, row) {
    for (let i = 0; i < 256; i++) {
      this.prev[i].start = this.cur[i].start;
      this.prev[i].id = this.cur[i].id;
      this.cur[i].id = 0;
    }
    const list = [];
    for (const ev of this.events) {
      if (ev.dead) continue;
      const eff = ev.effectId === 0xff ? null : this.registry.get(ev.effectId);
      if (ev.effectId !== 0xff && !eff) continue;
      switch (ev.opcode) {
        case OP_SHOW:
        case OP_SHOW2: {
          const active =
            cmpPos(order, row, ev.startOrder, ev.startRow) >= 0 &&
            cmpPos(order, row, ev.b4, ev.b5) < 0;
          if (active) list.push({ effect: eff, id: ev.effectId, layer: ev.layer });
          break;
        }
        case OP_TRIG:
          if (cmpPos(order, row, ev.startOrder, ev.startRow) >= 0) {
            if (eff && eff.trigger) eff.trigger((ev.b4 << 8) | ev.b5);
            ev.dead = true;
          }
          break;
        case OP_TRESET:
          if (cmpPos(order, row, ev.startOrder, ev.startRow) >= 0) {
            this.prev[ev.layer].id = 0;
            this.cur[ev.layer].id = 0;
            ev.dead = true;
          }
          break;
        case OP_END:
          if (cmpPos(order, row, ev.startOrder, ev.startRow) >= 0) this.quit = true;
          break;
      }
    }
    // layer timers: effect keeps its clock if it was on the same layer last frame
    for (const d of list) {
      const c = this.cur[d.layer];
      c.id = d.id;
      c.start = this.prev[d.layer].id === d.id ? this.prev[d.layer].start : nowTicks;
      d.elapsed = nowTicks - c.start;
    }
    list.sort((a, b) => a.layer - b.layer);
    return list;
  }
}
