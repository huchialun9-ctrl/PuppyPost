// Web Audio API Synthesizer for tactile arcade & archaeological excavation SFX

class SoundEffects {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playTap(freq = 520) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.25, ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.07);
    } catch {
      // Ignore audio block errors
    }
  }

  /**
   * Archaeological Excavation SFX #1:
   * Earthy trowel thumps + sandy brush sweep noise bursts while digging open a chest.
   */
  playDigging() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const strokes = [0, 0.14];
      strokes.forEach((offset, idx) => {
        const start = ctx.currentTime + offset;

        // 1. Soft earthen thud
        const thudOsc = ctx.createOscillator();
        const thudGain = ctx.createGain();
        thudOsc.type = 'sine';
        thudOsc.frequency.setValueAtTime(idx === 0 ? 135 : 155, start);
        thudOsc.frequency.exponentialRampToValueAtTime(46, start + 0.09);

        thudGain.gain.setValueAtTime(0.14, start);
        thudGain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);

        thudOsc.connect(thudGain);
        thudGain.connect(ctx.destination);
        thudOsc.start(start);
        thudOsc.stop(start + 0.1);

        // 2. Gritty sand/brush sweep using filtered white noise
        const bufferSize = Math.floor(ctx.sampleRate * 0.11);
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(850, start);
        filter.frequency.exponentialRampToValueAtTime(2200, start + 0.09);
        filter.Q.value = 1.6;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.08, start);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, start + 0.11);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(start);
        noise.stop(start + 0.11);
      });
    } catch {
      // Ignore audio block errors
    }
  }

  /**
   * Archaeological Excavation SFX #2:
   * Crystalline relic fragment discovery chime & warm triumph triad when chest rewards appear.
   */
  playRelicDiscovered(tier: 'daily' | 'bronze' | 'mystic' | 'legendary' = 'daily') {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const baseNotes =
        tier === 'legendary'
          ? [523.25, 659.25, 783.99, 1046.5, 1318.51]
          : tier === 'mystic'
          ? [493.88, 622.25, 739.99, 987.77]
          : [440, 554.37, 659.25, 880];

      baseNotes.forEach((freq, i) => {
        const start = ctx.currentTime + i * 0.055;

        // Warm core chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.09, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.34);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.35);

        // High crystalline fragment shimmer
        const shimmer = ctx.createOscillator();
        const shimmerGain = ctx.createGain();
        shimmer.type = 'sine';
        shimmer.frequency.setValueAtTime(freq * 2, start + 0.015);

        shimmerGain.gain.setValueAtTime(0.035, start + 0.015);
        shimmerGain.gain.exponentialRampToValueAtTime(0.0008, start + 0.28);

        shimmer.connect(shimmerGain);
        shimmerGain.connect(ctx.destination);
        shimmer.start(start + 0.015);
        shimmer.stop(start + 0.29);
      });
    } catch {
      // Ignore audio block errors
    }
  }

  playUnbox(tier: 'daily' | 'bronze' | 'mystic' | 'legendary') {
    this.playDigging();
    window.setTimeout(() => {
      this.playRelicDiscovered(tier);
    }, 220);
  }

  playSuccess() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const t = ctx.currentTime + i * 0.065;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.09, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.22);
      });
    } catch {
      // Ignore
    }
  }
}

export const soundFX = new SoundEffects();
