import { XmShowClock } from './shared/audio-clock.js';
import { WONDER_SHOW_END } from './show-data.js';

// wONDEr.exe 0x420f0d calls FSOUND_SetMixAhead(30). FMUSIC_GetOrder therefore
// describes the XM state being mixed about 30 ms ahead of speaker output.
export const WONDER_NATIVE_MIX_AHEAD_SECONDS = 30 / 1000;

/**
 * Wonder exits at 186.5 seconds while the terminal XM F00 is holding its last
 * row for 256 ticks. Keep that release-specific policy out of the generic FT2
 * player, restore FMOD's mixer/audible-output phase, and freeze the browser
 * show at the executable's exit boundary.
 */
export class WonderShowClock extends XmShowClock {
  constructor(audioContext, moduleBytes, orderTimes, options = {}) {
    super(audioContext, moduleBytes, orderTimes, {
      ...options,
      offsetSeconds: (Number(options.offsetSeconds) || 0) + WONDER_NATIVE_MIX_AHEAD_SECONDS,
    });
    this.terminal = false;
  }

  timeSeconds() {
    if (this.terminal) return WONDER_SHOW_END;
    const seconds = super.timeSeconds();
    if (seconds >= WONDER_SHOW_END) {
      this.terminal = true;
      return WONDER_SHOW_END;
    }
    return seconds;
  }

  get ended() { return this.terminal; }
}
