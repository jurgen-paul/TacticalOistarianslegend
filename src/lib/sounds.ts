/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const SOUND_URLS = {
  shoot: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  hit: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  damage: 'https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3', // Glitchy impact
  enemy_death: 'https://assets.mixkit.co/active_storage/sfx/2567/2567-preview.mp3',
  spawn: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3',
  alert: 'https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3',
  hover: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3', // Subtle hum
  dash: 'https://assets.mixkit.co/active_storage/sfx/2577/2577-preview.mp3', // Quick whoosh
  emp: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3', // Energy blast
  objective: 'https://assets.mixkit.co/active_storage/sfx/2580/2580-preview.mp3', // Success chime
  ready: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3', // Subtle beep/hover
  // Ambient layers
  siren: 'https://assets.mixkit.co/active_storage/sfx/1110/1110-preview.mp3',
  crowd: 'https://assets.mixkit.co/active_storage/sfx/97/97-preview.mp3',
  rain: 'https://assets.mixkit.co/active_storage/sfx/2418/2418-preview.mp3',
};

class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private ambientPlayers: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = false;
  private audioCtx: AudioContext | null = null;

  constructor() {
    // Preload sounds
    Object.entries(SOUND_URLS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      this.sounds.set(key, audio);
    });
  }

  enable() {
    this.enabled = true;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  synthesizeDash(volume: number = 0.5) {
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      
      const ctx = this.audioCtx;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // 1. Oscillators for cybertech energetic swoosh charging sound
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      
      // Start pitch high, drop exponentially to low chest-vibrating impact
      osc1.frequency.setValueAtTime(800, now);
      osc1.frequency.exponentialRampToValueAtTime(100, now + 0.25);
      
      osc2.frequency.setValueAtTime(400, now);
      osc2.frequency.exponentialRampToValueAtTime(50, now + 0.3);
      
      // Detune oscs slightly to get thickness
      osc1.detune.setValueAtTime(5, now);
      osc2.detune.setValueAtTime(-5, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1500, now);
      filter.frequency.exponentialRampToValueAtTime(150, now + 0.25);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.01, now);
      oscGain.gain.exponentialRampToValueAtTime(0.3, now + 0.05);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(oscGain);

      // 2. High-performance clean noise for modern aero dynamic atmospheric movement whoosh
      const bufferSize = ctx.sampleRate * 0.35; // 350ms
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.Q.setValueAtTime(2.5, now);
      noiseFilter.frequency.setValueAtTime(3000, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 0.3);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.4, now + 0.06);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);

      // Stereo Panner node for 3D dynamic horizontal movement feeling!
      const panner = (ctx as any).createStereoPanner ? (ctx as any).createStereoPanner() : null;
      if (panner) {
        // Swing fast from left to right center
        panner.pan.setValueAtTime(-0.8, now);
        panner.pan.linearRampToValueAtTime(0.8, now + 0.3);
        
        // Connect to destination through panner
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(volume * 0.8, now);
        
        oscGain.connect(panner);
        noiseGain.connect(panner);
        panner.connect(masterGain);
        masterGain.connect(ctx.destination);
      } else {
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(volume * 0.8, now);
        
        oscGain.connect(masterGain);
        noiseGain.connect(masterGain);
        masterGain.connect(ctx.destination);
      }

      noiseSource.start(now);
      osc1.start(now);
      osc2.start(now);

      noiseSource.stop(now + 0.45);
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);

    } catch (e) {
      console.error('Error during dash sound synthesis:', e);
    }
  }

  synthesizeVictory(volume: number = 0.5) {
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      
      const ctx = this.audioCtx;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // Synthesize an uplifting cinematic major chord arpeggio with high tech cyber vibes
      // Notes: G4 (392.00 Hz), B4 (493.88 Hz), D5 (587.33 Hz), G5 (783.99 Hz)
      const notes = [392.00, 493.88, 587.33, 783.99];
      const noteDelay = 0.12; // Arpeggio delay

      notes.forEach((freq, idx) => {
        const noteTime = now + idx * noteDelay;
        
        // Main synth tone
        const osc = ctx.createOscillator();
        const subOsc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc.type = 'sine';
        subOsc.type = 'triangle';
        
        osc.frequency.setValueAtTime(freq, noteTime);
        subOsc.frequency.setValueAtTime(freq / 2, noteTime); // rich low octave
        
        // Gentle vibrato
        osc.detune.setValueAtTime(0, noteTime);
        osc.detune.linearRampToValueAtTime(10, noteTime + 1.2);
        
        // High quality resonance sweep filter
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(100, noteTime);
        filter.frequency.exponentialRampToValueAtTime(2200, noteTime + 0.35);
        filter.frequency.exponentialRampToValueAtTime(800, noteTime + 1.5);
        filter.Q.setValueAtTime(4.0, noteTime);

        // Sound volume envelope
        oscGain.gain.setValueAtTime(0, noteTime);
        oscGain.gain.linearRampToValueAtTime(0.35 * volume, noteTime + 0.08);
        oscGain.gain.exponentialRampToValueAtTime(0.2 * volume, noteTime + 0.4);
        oscGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 2.0); // long chime trail
        
        // Connections
        osc.connect(filter);
        subOsc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(ctx.destination);
        
        osc.start(noteTime);
        subOsc.start(noteTime);
        
        osc.stop(noteTime + 2.1);
        subOsc.stop(noteTime + 2.1);
      });
      
      // Add a sparkling clean noise pulse at start of chime to sound energetic
      const whiteNoiseBufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, whiteNoiseBufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < whiteNoiseBufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.08 * volume, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(2500, now);
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      
      noise.start(now);
      noise.stop(now + 0.2);

    } catch (e) {
      console.error('Error during victory fanfare synthesis:', e);
    }
  }

  play(name: keyof typeof SOUND_URLS | 'victory', volume: number = 0.5, loop: boolean = false) {
    if (!this.enabled) return;

    if (name === 'dash') {
      this.synthesizeDash(volume);
    }
    if (name === 'victory') {
      this.synthesizeVictory(volume);
      return;
    }
    
    const sound = this.sounds.get(name as keyof typeof SOUND_URLS);
    if (sound) {
      // For overlapping sounds like shooting, we clone the node
      const s = sound.cloneNode() as HTMLAudioElement;
      // Clamp volume between 0 and 1 to prevent IndexSizeError
      s.volume = Math.max(0, Math.min(1, volume));
      s.loop = loop;
      s.play().catch(() => {
        // Ignore play errors (usually due to user interaction requirement)
      });
      return s;
    }
  }

  playAmbient(name: keyof typeof SOUND_URLS, volume: number = 0.3) {
    if (!this.enabled) return;

    // Check if already playing
    if (this.ambientPlayers.has(name)) return;

    const sound = this.sounds.get(name);
    if (sound) {
      const player = sound.cloneNode() as HTMLAudioElement;
      player.volume = Math.max(0, Math.min(1, volume));
      player.loop = true;
      player.play().catch(() => {});
      this.ambientPlayers.set(name, player);
    }
  }

  stopAmbient(name: keyof typeof SOUND_URLS) {
    const player = this.ambientPlayers.get(name);
    if (player) {
      player.pause();
      player.currentTime = 0;
      this.ambientPlayers.delete(name);
    }
  }

  toggleAmbient(name: keyof typeof SOUND_URLS, enabled: boolean, volume: number = 0.3) {
    if (enabled) {
      this.playAmbient(name, volume);
    } else {
      this.stopAmbient(name);
    }
  }
}

export const soundManager = new SoundManager();
