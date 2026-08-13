/**
 * Layered time scheduler. Clips are active on [start, end), receive local time,
 * and retain insertion order within a layer.
 */
export class LayeredTimeline {
  constructor(clips = []) {
    this.clips = [];
    clips.forEach((clip) => this.add(clip));
  }

  add(clip) {
    const normalized = {
      id: String(clip.id),
      start: Number(clip.start),
      end: Number(clip.end),
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
    return this.clips.filter((clip) => time >= clip.start && time < clip.end);
  }

  render(time, context) {
    const active = this.active(time);
    for (const clip of active) {
      if (clip.render) clip.render(time - clip.start, context, clip);
    }
    return active;
  }
}

