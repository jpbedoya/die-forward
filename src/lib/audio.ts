// Audio manager for Die Forward
// Handles SFX and ambient loops with volume control

type SoundId = 
  // Ambient loops
  | 'ambient-explore'
  | 'ambient-combat'
  | 'ambient-title'
  | 'ambient-death'
  | 'ambient-victory'
  // Combat SFX
  | 'sword-slash'
  | 'blunt-hit'
  | 'damage-taken'
  | 'enemy-death'
  // Player SFX
  | 'player-death'
  | 'victory'
  | 'heal'
  // Environment SFX
  | 'footstep'
  | 'item-pickup'
  | 'door-creak'
  | 'water-drip'
  | 'corpse-discover'
  // UI SFX
  | 'ui-click'
  | 'ui-hover';

const SOUND_PATHS: Record<SoundId, string> = {
  'ambient-explore': '/audio/ambient-explore.mp3',
  'ambient-combat': '/audio/ambient-combat.mp3',
  'ambient-title': '/audio/ambient-title.mp3',
  'ambient-death': '/audio/ambient-death.mp3',
  'ambient-victory': '/audio/ambient-victory.mp3',
  'sword-slash': '/audio/sword-slash.mp3',
  'blunt-hit': '/audio/blunt-hit.mp3',
  'damage-taken': '/audio/damage-taken.mp3',
  'enemy-death': '/audio/enemy-death.mp3',
  'player-death': '/audio/player-death.mp3',
  'victory': '/audio/victory.mp3',
  'heal': '/audio/heal.mp3',
  'footstep': '/audio/footstep.mp3',
  'item-pickup': '/audio/item-pickup.mp3',
  'door-creak': '/audio/door-creak.mp3',
  'water-drip': '/audio/water-drip.mp3',
  'corpse-discover': '/audio/corpse-discover.mp3',
  'ui-click': '/audio/ui-click.mp3',
  'ui-hover': '/audio/ui-hover.mp3',
};

// Singleton audio manager
class AudioManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private currentAmbient: HTMLAudioElement | null = null;
  private currentAmbientId: SoundId | null = null;
  private enabled: boolean = true;
  private sfxVolume: number = 0.7;
  private ambientVolume: number = 0.4;

  constructor() {
    // Load enabled state from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('audio-enabled');
      this.enabled = saved !== 'false';
    }
  }

  // Preload a sound
  private getSound(id: SoundId): HTMLAudioElement {
    if (!this.sounds.has(id)) {
      const audio = new Audio(SOUND_PATHS[id]);
      audio.preload = 'auto';
      this.sounds.set(id, audio);
    }
    return this.sounds.get(id)!;
  }

  // Play a one-shot SFX
  playSFX(id: SoundId) {
    if (!this.enabled || typeof window === 'undefined') return;
    
    // Create new audio instance for overlapping sounds
    const audio = new Audio(SOUND_PATHS[id]);
    audio.volume = this.sfxVolume;
    audio.play().catch(() => {
      // Ignore autoplay errors
    });
  }

  // Play ambient loop (crossfade from current)
  playAmbient(id: SoundId) {
    if (typeof window === 'undefined') return;
    if (this.currentAmbientId === id) return; // Already playing

    // Fade out current ambient
    if (this.currentAmbient) {
      const fadeOut = this.currentAmbient;
      const fadeOutInterval = setInterval(() => {
        if (fadeOut.volume > 0.05) {
          fadeOut.volume -= 0.05;
        } else {
          fadeOut.pause();
          clearInterval(fadeOutInterval);
        }
      }, 50);
    }

    // Start new ambient
    if (this.enabled) {
      const audio = new Audio(SOUND_PATHS[id]);
      audio.loop = true;
      audio.volume = 0;
      this.currentAmbient = audio;
      this.currentAmbientId = id;
      
      audio.play().then(() => {
        // Fade in
        const fadeInInterval = setInterval(() => {
          if (audio.volume < this.ambientVolume - 0.05) {
            audio.volume += 0.05;
          } else {
            audio.volume = this.ambientVolume;
            clearInterval(fadeInInterval);
          }
        }, 50);
      }).catch(() => {
        // Ignore autoplay errors
      });
    }
  }

  // Stop ambient
  stopAmbient() {
    if (this.currentAmbient) {
      const fadeOut = this.currentAmbient;
      const fadeOutInterval = setInterval(() => {
        if (fadeOut.volume > 0.05) {
          fadeOut.volume -= 0.05;
        } else {
          fadeOut.pause();
          clearInterval(fadeOutInterval);
        }
      }, 50);
      this.currentAmbient = null;
      this.currentAmbientId = null;
    }
  }

  // Toggle audio on/off
  toggle(): boolean {
    this.enabled = !this.enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('audio-enabled', String(this.enabled));
    }
    
    if (!this.enabled) {
      this.stopAmbient();
    }
    
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('audio-enabled', String(this.enabled));
    }
    if (!enabled) {
      this.stopAmbient();
    }
  }
}

// Singleton instance
let audioManager: AudioManager | null = null;

export function getAudioManager(): AudioManager {
  if (!audioManager && typeof window !== 'undefined') {
    audioManager = new AudioManager();
  }
  return audioManager || new AudioManager();
}

// React hook for audio
import { useEffect, useState, useCallback } from 'react';

export function useAudio() {
  const [enabled, setEnabled] = useState(true);
  
  useEffect(() => {
    const manager = getAudioManager();
    setEnabled(manager.isEnabled());
  }, []);

  const playSFX = useCallback((id: SoundId) => {
    getAudioManager().playSFX(id);
  }, []);

  const playAmbient = useCallback((id: SoundId) => {
    getAudioManager().playAmbient(id);
  }, []);

  const stopAmbient = useCallback(() => {
    getAudioManager().stopAmbient();
  }, []);

  const toggle = useCallback(() => {
    const manager = getAudioManager();
    const newState = manager.toggle();
    setEnabled(newState);
    return newState;
  }, []);

  return {
    enabled,
    playSFX,
    playAmbient,
    stopAmbient,
    toggle,
  };
}
