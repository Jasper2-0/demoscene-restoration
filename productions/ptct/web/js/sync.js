// Music position lookup: audio time (seconds) -> (order, row), reproducing the
// original player's latency-compensated (order<<8)|row (see work/re/engine/SYNC.md).
// sync_map.json: {"rows": [[tSeconds, order, row], ...], "totalSeconds": ...}

export class SyncMap {
  constructor(json) {
    this.rows = json.rows;
    this.total = json.totalSeconds;
    this._i = 0;
  }
  pos(t) {
    const rows = this.rows;
    // monotonic playback: advance cursor; also handle seeks backwards
    if (this._i >= rows.length || rows[this._i][0] > t) this._i = 0;
    while (this._i + 1 < rows.length && rows[this._i + 1][0] <= t) this._i++;
    const r = rows[this._i];
    return { order: r[1], row: r[2] };
  }

  /**
   * Seconds at a music position — the inverse of pos().
   *
   * The script's SHOW spans are in (order, row), and the inspector schedule is
   * in seconds, so this is what bridges them. Returns the time of the first
   * mapped row at or after the position; past the end, the show's total.
   */
  secondsAt(order, row) {
    for (const [t, o, r] of this.rows) {
      if (o > order || (o === order && r >= row)) return t;
    }
    return this.total;
  }
}
