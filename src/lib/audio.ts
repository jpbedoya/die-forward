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
  private pendingAmbientId: SoundId | null = null;
  private enabled: boolean = true;
  private unlocked: boolean = false;
  private sfxVolume: number = 0.7;
  private ambientVolume: number = 0.4;

  constructor() {
    if (typeof window !== 'undefined') {
      // Load enabled state from localStorage
      const saved = localStorage.getItem('audio-enabled');
      this.enabled = saved !== 'false';
      
      // Set up unlock listener for autoplay policy
      const unlock = () => {
        if (!this.unlocked) {
          this.unlocked = true;
          // Try to play pending ambient
          if (this.pendingAmbientId && this.enabled) {
            this.playAmbient(this.pendingAmbientId);
          }
        }
      };
      
      // Listen for first interaction
      document.addEventListener('click', unlock, { once: false });
      document.addEventListener('touchstart', unlock, { once: false });
      document.addEventListener('keydown', unlock, { once: false });
    }
  }

  // Play a one-shot SFX
  playSFX(id: SoundId) {
    if (!this.enabled || typeof window === 'undefined') return;
    
    const audio = new Audio(SOUND_PATHS[id]);
    audio.volume = this.sfxVolume;
    audio.play().catch(() => {
      // SFX blocked by autoplay policy - silent fail
    });
  }

  // Play ambient loop (crossfade from current, gapless looping)
  playAmbient(id: SoundId) {
    if (typeof window === 'undefined') return;
    
    // If already playing this ambient (or it's pending), don't restart
    if (this.currentAmbientId === id) {
      // Check if it's actually playing
      if (this.currentAmbient && !this.currentAmbient.paused) {
        return; // Already playing
      }
      // If paused but same track, try to resume instead of restart
      if (this.currentAmbient && this.currentAmbient.paused) {
        this.currentAmbient.play().catch(() => {});
        return;
      }
    }
    
    // If this is already the pending ambient, don't re-queue
    if (this.pendingAmbientId === id && !this.currentAmbient) {
      return;
    }

    // Store as pending in case we're not unlocked yet
    this.pendingAmbientId = id;

    if (!this.enabled) return;

    // Fade out current ambient
    if (this.currentAmbient) {
      const fadeOut = this.currentAmbient;
      const fadeOutInterval = setInterval(() => {
        if (fadeOut.volume > 0.05) {
          fadeOut.volume -= 0.05;
        } else {
          fadeOut.pause();
          fadeOut.currentTime = 0;
          clearInterval(fadeOutInterval);
        }
      }, 50);
    }

    // Start new ambient with gapless crossfade looping
    const audio = new Audio(SOUND_PATHS[id]);
    audio.loop = false; // We handle looping manually for gapless
    audio.volume = 0;
    this.currentAmbient = audio;
    this.currentAmbientId = id;
    
    // Gapless loop: start next instance before current ends, crossfade
    const setupGaplessLoop = () => {
      const CROSSFADE_TIME = 1.5; // Start crossfade 1.5s before end
      
      const checkLoop = () => {
        if (!this.currentAmbient || this.currentAmbientId !== id) return;
        
        const timeLeft = audio.duration - audio.currentTime;
        if (timeLeft <= CROSSFADE_TIME && timeLeft > 0) {
          // Start next loop with crossfade
          const nextAudio = new Audio(SOUND_PATHS[id]);
          nextAudio.loop = false;
          nextAudio.volume = 0;
          
          nextAudio.play().then(() => {
            // Crossfade: fade out current, fade in next
            const crossfadeInterval = setInterval(() => {
              if (audio.volume > 0.02) {
                audio.volume -= 0.02;
              }
              if (nextAudio.volume < this.ambientVolume - 0.02) {
                nextAudio.volume += 0.02;
              } else {
                nextAudio.volume = this.ambientVolume;
                audio.pause();
                clearInterval(crossfadeInterval);
              }
            }, 30);
            
            // Set up looping for the new audio
            this.currentAmbient = nextAudio;
            setupGaplessLoop();
          }).catch(() => {});
        } else if (this.currentAmbient === audio && !audio.paused) {
          requestAnimationFrame(checkLoop);
        }
      };
      
      // Wait for metadata to know duration
      if (audio.duration) {
        requestAnimationFrame(checkLoop);
      } else {
        audio.addEventListener('loadedmetadata', () => {
          requestAnimationFrame(checkLoop);
        }, { once: true });
      }
    };
    
    audio.play().then(() => {
      this.unlocked = true;
      // Fade in
      const fadeInInterval = setInterval(() => {
        if (audio.volume < this.ambientVolume - 0.05) {
          audio.volume += 0.05;
        } else {
          audio.volume = this.ambientVolume;
          clearInterval(fadeInInterval);
        }
      }, 50);
      
      // Set up gapless looping
      setupGaplessLoop();
    }).catch(() => {
      // Ambient blocked (waiting for interaction) - will retry via pendingAmbientId
    });
  }

  // Stop ambient (keepPending = true keeps the ID so toggle can restart it)
  stopAmbient(keepPending: boolean = false) {
    if (!keepPending) {
      this.pendingAmbientId = null;
    }
    if (this.currentAmbient) {
      const fadeOut = this.currentAmbient;
      const fadeOutInterval = setInterval(() => {
        if (fadeOut.volume > 0.05) {
          fadeOut.volume -= 0.05;
        } else {
          fadeOut.pause();
          fadeOut.currentTime = 0;
          clearInterval(fadeOutInterval);
        }
      }, 50);
      this.currentAmbient = null;
      this.currentAmbientId = null;
    }
  }

  // Resume current ambient (call after user interaction)
  tryResume() {
    if (this.pendingAmbientId && this.enabled) {
      this.playAmbient(this.pendingAmbientId);
    }
  }

  // Toggle audio on/off
  toggle(): boolean {
    this.enabled = !this.enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('audio-enabled', String(this.enabled));
    }
    
    if (!this.enabled) {
      // Remember what was playing so we can restart it
      if (this.currentAmbientId) {
        this.pendingAmbientId = this.currentAmbientId;
      }
      this.stopAmbient(true); // keepPending = true
    } else if (this.pendingAmbientId) {
      // Re-enable: restart the ambient that was playing
      this.playAmbient(this.pendingAmbientId);
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
