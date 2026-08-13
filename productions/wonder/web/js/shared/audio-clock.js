import { XmPlayer } from './xm.js';

export class StaticShowClock {
  constructor(seconds = 0) { this.value = Number(seconds) || 0; }
  async start() {}
  async pause() {}
  async seek(seconds) { this.value = Math.max(0, Number(seconds) || 0); }
  timeSeconds() { return this.value; }
  get ended() { return false; }
}

/** Native-media clock used by Energia. */
export class MediaShowClock {
  constructor(media, { offsetSeconds = 0, audioContext = null } = {}) {
    this.media = media;
    this.offsetSeconds = Number(offsetSeconds) || 0;
    this.audioContext = audioContext;
  }

  async start() {
    if (this.audioContext?.state === 'suspended') await this.audioContext.resume();
    await this.media.play();
  }
  pause() { this.media.pause(); }
  async seek(seconds) {
    const target = Math.max(0, (Number(seconds) || 0) - this.offsetSeconds);
    if (this.media.readyState < 1) {
      await new Promise((resolve, reject) => {
        const ready = () => { cleanup(); resolve(); };
        const failed = () => { cleanup(); reject(this.media.error ?? new Error('media load failed')); };
        const cleanup = () => {
          this.media.removeEventListener('loadedmetadata', ready);
          this.media.removeEventListener('error', failed);
        };
        this.media.addEventListener('loadedmetadata', ready, { once: true });
        this.media.addEventListener('error', failed, { once: true });
      });
    }
    this.media.currentTime = Math.min(target, Number.isFinite(this.media.duration)
      ? this.media.duration : target);
  }
  timeSeconds() { return Math.max(0, this.media.currentTime + this.offsetSeconds); }
  get ended() { return this.media.ended; }
}

/**
 * Live XM clock used by Wonder. Rendered blocks are tagged with the order at
 * which they will become audible. Between order transitions the original demo
 * advanced with a high-resolution counter, so time remains continuous here.
 */
export class XmShowClock {
  constructor(audioContext, moduleBytes, orderTimes, options = {}) {
    if (!audioContext?.createScriptProcessor) {
      throw new Error('XmShowClock requires a Web Audio AudioContext');
    }
    if (!Array.isArray(orderTimes) || !orderTimes.length
        || orderTimes.some((time) => !Number.isFinite(time))) {
      throw new Error('XmShowClock requires finite order boundary times');
    }
    this.context = audioContext;
    this.moduleBytes = moduleBytes instanceof Uint8Array
      ? moduleBytes : new Uint8Array(moduleBytes);
    this.orderTimes = orderTimes.slice();
    this.offsetSeconds = Number(options.offsetSeconds) || 0;
    this.chunkFrames = options.chunkFrames ?? 1024;
    this.bufferFrames = options.bufferFrames ?? 4096;
    this.tags = [];
    this.lastAudibleTag = null;
    this.lastTaggedOrder = -1;
    this.pendingSeekTime = null;
    this.connected = false;
    this._createPlayerAndNode();
  }

  _createPlayerAndNode() {
    this.player = new XmPlayer(this.moduleBytes, this.context.sampleRate);
    this.node = this.context.createScriptProcessor(this.bufferFrames, 0, 2);
    this.node.onaudioprocess = (event) => {
      const left = event.outputBuffer.getChannelData(0);
      const right = event.outputBuffer.getChannelData(1);
      const base = Number.isFinite(event.playbackTime) && event.playbackTime > 0
        ? event.playbackTime : this.context.currentTime;
      for (let offset = 0; offset < left.length; offset += this.chunkFrames) {
        const length = Math.min(this.chunkFrames, left.length - offset);
        const order = this.player.position;
        if (this.lastTaggedOrder !== order) {
          const showTime = this.pendingSeekTime ??
            this.orderTimes[Math.min(order, this.orderTimes.length - 1)];
          this.tags.push({
            time: base + offset / this.context.sampleRate,
            order,
            row: this.player.row,
            showTime,
          });
          this.lastTaggedOrder = order;
          this.pendingSeekTime = null;
        }
        this.player.render(left.subarray(offset, offset + length),
          right.subarray(offset, offset + length), length);
      }
    };
  }

  async start() {
    if (!this.connected) {
      this.node.connect(this.context.destination);
      this.connected = true;
    }
    await this.context.resume();
  }

  async pause() { await this.context.suspend(); }

  async seek(seconds) {
    const target = Math.max(0, Number(seconds) || 0);
    const reconnect = this.connected;
    if (this.connected) this.node.disconnect();
    this.node.onaudioprocess = null;
    this.tags.length = 0;
    this.lastAudibleTag = null;
    this.lastTaggedOrder = -1;
    this.pendingSeekTime = target;
    this.connected = false;
    this._createPlayerAndNode();
    this.player.skip(Math.floor(target * this.context.sampleRate));
    if (reconnect) {
      this.node.connect(this.context.destination);
      this.connected = true;
    }
  }

  _audibleTag() {
    const now = this.context.currentTime;
    while (this.tags.length && this.tags[0].time <= now) {
      this.lastAudibleTag = this.tags.shift();
    }
    return this.lastAudibleTag;
  }

  timeSeconds() {
    const tag = this._audibleTag();
    if (!tag) return Math.max(0, this.offsetSeconds);
    return Math.max(0, tag.showTime + (this.context.currentTime - tag.time) + this.offsetSeconds);
  }

  get ended() { return this.player.loops > 0; }
}
