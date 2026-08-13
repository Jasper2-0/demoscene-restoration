/**
 * Layered time scheduler. Clips receive local time and retain insertion order
 * within a layer; callers may opt into a native inclusive/float32 interval.
 */
export class LayeredTimeline {
  constructor(clips = [], { inclusiveEnd = false, float32Time = false } = {}) {
    this.clips = [];
    this.inclusiveEnd = inclusiveEnd;
    this.float32Time = float32Time;
    clips.forEach((clip) => this.add(clip));
  }

  add(clip) {
    const normalized = {
      id: String(clip.id),
      start: this.float32Time ? Math.fround(clip.start) : Number(clip.start),
      end: this.float32Time ? Math.fround(clip.end) : Number(clip.end),
      layer: Number(clip.layer ?? 0),
      render: clip.render ?? null,
      data: clip.data ?? null,
      insertion: this.clips.length,
    };
    if (!normalized.id) throw new Error('timeline clip requires an id');
    if (!Number.isFinite(normalized.start) || !Number.isFinite(normalized.end)
        || normalized.end <= normalized.start) {
      throw new Error(`invalid interval for timeline clip ${normalized.id}`);
    }
    if (!Number.isFinite(normalized.layer)) {
      throw new Error(`invalid layer for timeline clip ${normalized.id}`);
    }
    this.clips.push(Object.freeze(normalized));
    this.clips.sort((a, b) => a.layer - b.layer || a.insertion - b.insertion);
    return normalized;
  }

  active(time) {
    const current = this.float32Time ? Math.fround(time) : time;
    return this.clips.filter((clip) => current >= clip.start
      && (this.inclusiveEnd ? current <= clip.end : current < clip.end));
  }

  render(time, context) {
    const active = this.active(time);
    const current = this.float32Time ? Math.fround(time) : time;
    for (const clip of active) {
      if (clip.render) {
        const local = this.float32Time ? Math.fround(current - clip.start) : current - clip.start;
        clip.render(local, context, clip);
      }
    }
    return active;
  }
}
