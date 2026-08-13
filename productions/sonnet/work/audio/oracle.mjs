// Reader for reference/sonnet.xm — vic's original module, released via
// scene.org's "demodulate" compilation. Its instrument names read
// "ripped by Humpal / demodulate.scene.org", so the PCM in it was dumped out of
// this very intro: it is ground truth for the synth, not merely a related work.

import { readFileSync } from 'node:fs';

export function readOracle(path) {
  const b = readFileSync(path);
  const headerSize = b.readUInt32LE(60);
  const header = {
    songLength: b.readUInt16LE(64),
    restart: b.readUInt16LE(66),
    numChannels: b.readUInt16LE(68),
    numPatterns: b.readUInt16LE(70),
    numInstruments: b.readUInt16LE(72),
    flags: b.readUInt16LE(74),
    defaultSpeed: b.readUInt16LE(76),
    defaultBpm: b.readUInt16LE(78),
    order: Array.from(b.subarray(80, 80 + b.readUInt16LE(64))),
  };

  let at = 60 + headerSize;
  const patterns = [];
  for (let p = 0; p < header.numPatterns; p++) {
    const hlen = b.readUInt32LE(at);
    const rows = b.readUInt16LE(at + 5);
    const packed = b.readUInt16LE(at + 7);
    const d = b.subarray(at + hlen, at + hlen + packed);
    at += hlen + packed;
    const cells = new Uint8Array(rows * header.numChannels * 5);
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < header.numChannels; c++) {
        const o = (r * header.numChannels + c) * 5;
        if (i >= d.length) continue;
        const flag = d[i++];
        if (flag & 0x80) {
          for (let k = 0; k < 5; k++) if (flag & (1 << k)) cells[o + k] = d[i++];
        } else {
          cells[o] = flag;
          for (let k = 1; k < 5; k++) cells[o + k] = d[i++];
        }
      }
    }
    patterns.push({ rows, cells });
  }

  const instruments = [];
  for (let i = 0; i < header.numInstruments; i++) {
    const ihdr = b.readUInt32LE(at);
    const name = b.subarray(at + 4, at + 26).toString('latin1').replace(/\0+$/, '');
    const numSamples = b.readUInt16LE(at + 27);
    const inst = { name, numSamples, samples: [] };
    if (numSamples > 0) {
      const shdr = b.readUInt32LE(at + 29);
      inst.keymap = Buffer.from(b.subarray(at + 33, at + 129));
      inst.volEnv = Buffer.from(b.subarray(at + 129, at + 177));
      inst.panEnv = Buffer.from(b.subarray(at + 177, at + 225));
      inst.tail = Buffer.from(b.subarray(at + 225, at + 241));
      let sat = at + ihdr;
      for (let s = 0; s < numSamples; s++) {
        inst.samples.push({
          length: b.readUInt32LE(sat),
          loopStart: b.readUInt32LE(sat + 4),
          loopLength: b.readUInt32LE(sat + 8),
          volume: b[sat + 12],
          finetune: b.readInt8(sat + 13),
          type: b[sat + 14],
          panning: b[sat + 15],
          relativeNote: b.readInt8(sat + 16),
          name: b.subarray(sat + 18, sat + 40).toString('latin1').replace(/\0+$/, ''),
        });
        sat += shdr;
      }
      for (const s of inst.samples) {
        // XM sample data is stored delta-encoded.
        if (s.type & 0x10) {
          const n = s.length >> 1;
          const pcm = new Int16Array(n);
          let acc = 0;
          for (let k = 0; k < n; k++) {
            acc = (acc + b.readInt16LE(sat + k * 2)) & 0xffff;
            pcm[k] = (acc << 16) >> 16;
          }
          s.pcm = pcm;
          s.bits = 16;
        } else {
          const pcm = new Int16Array(s.length);
          let acc = 0;
          for (let k = 0; k < s.length; k++) {
            acc = (acc + b.readInt8(sat + k)) & 0xff;
            pcm[k] = (((acc << 24) >> 24) << 8);
          }
          s.pcm = pcm;
          s.bits = 8;
        }
        sat += s.length;
      }
      at = sat;
    } else {
      at += ihdr;
    }
    instruments.push(inst);
  }
  return { buf: b, header, patterns, instruments };
}

/** Normalised cross-correlation at zero lag, on mean-removed signals. */
export function ncc(a, b) {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma, y = b[i] - mb;
    num += x * y; da += x * x; db += y * y;
  }
  if (da === 0 || db === 0) return da === db ? 1 : 0;
  return num / Math.sqrt(da * db);
}
