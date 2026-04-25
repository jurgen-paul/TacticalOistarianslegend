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
};

class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = false;

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
    // Resume AudioContext if needed (browser requirement)
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  play(name: keyof typeof SOUND_URLS, volume: number = 0.5, loop: boolean = false) {
    if (!this.enabled) return;
    
    const sound = this.sounds.get(name);
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
}

export const soundManager = new SoundManager();
