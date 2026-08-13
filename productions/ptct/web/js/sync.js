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
}
