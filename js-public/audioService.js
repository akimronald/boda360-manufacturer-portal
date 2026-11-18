/**
 * Web Audio API Sound Synthesizer Service
 * Provides zero-dependency procedural audio for:
 * 1. Security siren & tamper alarm (pulsating two-tone alert)
 * 2. Heavy-duty relay click (tactile audio feedback for engine cutoff)
 * 3. Soft UI acknowledgment beeps
 * Boda 360 Fleet Telematics Platform
 */

class AudioService {
  constructor() {
    this.ctx = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.isSirenPlaying = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  // Heavy 12V automotive relay mechanical click (double pulse: coil energize + armature snap)
  playRelayClick(isCutOff = true) {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isCutOff ? 'square' : 'triangle';
      osc.frequency.setValueAtTime(isCutOff ? 120 : 280, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);

      // Second micro snap for contact bounce
      setTimeout(() => {
        if (!this.ctx) return;
        const now2 = this.ctx.currentTime;
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();

        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(220, now2);
        osc2.frequency.exponentialRampToValueAtTime(30, now2 + 0.05);

        gain2.gain.setValueAtTime(0.2, now2);
        gain2.gain.exponentialRampToValueAtTime(0.001, now2 + 0.05);

        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);

        osc2.start(now2);
        osc2.stop(now2 + 0.06);
      }, 40);
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  // Security tamper siren: two-tone alarm for 3 seconds
  playTamperAlarm(durationSeconds = 2.5) {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.18, now);

      // Modulate frequency between 750Hz and 1050Hz like an emergency vehicle
      for (let i = 0; i < durationSeconds * 4; i++) {
        const t = now + i * 0.25;
        const freq = (i % 2 === 0) ? 950 : 650;
        osc.frequency.setValueAtTime(freq, t);
      }

      gain.gain.setValueAtTime(0.18, now + durationSeconds - 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + durationSeconds);
    } catch (e) {
      console.warn('Tamper alarm audio error:', e);
    }
  }

  // Soft ping / chirp for telemetry update / geofence breach
  playChirp(isHigh = false) {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isHigh ? 880 : 520, now);
      osc.frequency.exponentialRampToValueAtTime(isHigh ? 1320 : 260, now + 0.12);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      // Ignored
    }
  }
}

window.bodaAudio = new AudioService();
