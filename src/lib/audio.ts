// Audio manager for Die Forward
// Handles SFX and ambient loops with volume control

type SoundId = 
  // Ambient loops
  | 'ambient-explore'
  | 'ambient-combat'
  | 'ambient-title'
  | 'ambient-death'
  | 'ambient-victory'
  // Combat SFX (original)
  | 'sword-slash'
  | 'blunt-hit'
  | 'damage-taken'
  | 'enemy-death'
  // Combat SFX (new)
  | 'boss-intro'
  | 'boss-roar'
  | 'dodge-whoosh'
  | 'brace-impact'
  | 'flee-run'
  | 'flee-fail'
  | 'enemy-growl'
  | 'critical-hit'
  | 'parry-clang'
  | 'attack-miss'
  // Player SFX
  | 'player-death'
  | 'victory'
  | 'heal'
  | 'heartbeat-low'
  | 'stamina-depleted'
  | 'stamina-recover'
  | 'poison-tick'
  // Environment SFX (original)
  | 'footstep'
  | 'item-pickup'
  | 'door-creak'
  | 'water-drip'
  | 'corpse-discover'
  // Environment SFX (new)
  | 'depth-descend'
  | 'water-splash'
  | 'chains-rattle'
  | 'eerie-whispers'
  | 'stone-grinding'
  | 'drip-echo'
  // Rewards SFX
  | 'tip-chime'
  | 'loot-discover'
  | 'victory-fanfare'
  | 'share-click'
  // UI SFX
  | 'ui-click'
  | 'ui-hover'
  | 'menu-open'
  | 'menu-close'
  | 'confirm-action'
  | 'error-buzz';

const SOUND_PATHS: Record<SoundId, string> = {
  // Ambient
  'ambient-explore': '/audio/ambient-explore.mp3',
  'ambient-combat': '/audio/ambient-combat.mp3',
  'ambient-title': '/audio/ambient-title.mp3',
  'ambient-death': '/audio/ambient-death.mp3',
  'ambient-victory': '/audio/ambient-victory.mp3',
  // Combat (original)
  'sword-slash': '/audio/sword-slash.mp3',
  'blunt-hit': '/audio/blunt-hit.mp3',
  'damage-taken': '/audio/damage-taken.mp3',
  'enemy-death': '/audio/enemy-death.mp3',
  // Combat (new)
  'boss-intro': '/audio/boss-intro.mp3',
  'boss-roar': '/audio/boss-roar.mp3',
  'dodge-whoosh': '/audio/dodge-whoosh.mp3',
  'brace-impact': '/audio/brace-impact.mp3',
  'flee-run': '/audio/flee-run.mp3',
  'flee-fail': '/audio/flee-fail.mp3',
  'enemy-growl': '/audio/enemy-growl.mp3',
  'critical-hit': '/audio/critical-hit.mp3',
  'parry-clang': '/audio/parry-clang.mp3',
  'attack-miss': '/audio/attack-miss.mp3',
  // Player
  'player-death': '/audio/player-death.mp3',
  'victory': '/audio/victory.mp3',
  'heal': '/audio/heal.mp3',
  'heartbeat-low': '/audio/heartbeat-low.mp3',
  'stamina-depleted': '/audio/stamina-depleted.mp3',
  'stamina-recover': '/audio/stamina-recover.mp3',
  'poison-tick': '/audio/poison-tick.mp3',
  // Environment (original)
  'footstep': '/audio/footstep.mp3',
  'item-pickup': '/audio/item-pickup.mp3',
  'door-creak': '/audio/door-creak.mp3',
  'water-drip': '/audio/water-drip.mp3',
  'corpse-discover': '/audio/corpse-discover.mp3',
  // Environment (new)
  'depth-descend': '/audio/depth-descend.mp3',
  'water-splash': '/audio/water-splash.mp3',
  'chains-rattle': '/audio/chains-rattle.mp3',
  'eerie-whispers': '/audio/eerie-whispers.mp3',
  'stone-grinding': '/audio/stone-grinding.mp3',
  'drip-echo': '/audio/drip-echo.mp3',
  // Rewards
  'tip-chime': '/audio/tip-chime.mp3',
  'loot-discover': '/audio/loot-discover.mp3',
  'victory-fanfare': '/audio/victory-fanfare.mp3',
  'share-click': '/audio/share-click.mp3',
  // UI
  'ui-click': '/audio/ui-click.mp3',
  'ui-hover': '/audio/ui-hover.mp3',
  'menu-open': '/audio/menu-open.mp3',
  'menu-close': '/audio/menu-close.mp3',
  'confirm-action': '/audio/confirm-action.mp3',
  'error-buzz': '/audio/error-buzz.mp3',
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
  private ambientVolume: number = 0.3; // Lowered from 0.4
  private allAmbientElements: Set<HTMLAudioElement> = new Set(); // Track ALL playing ambient elements

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
    
    // If already playing this ambient, don't restart
    if (this.currentAmbientId === id && this.currentAmbient && !this.currentAmbient.paused) {
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
          this.allAmbientElements.delete(fadeOut);
          clearInterval(fadeOutInterval);
        }
      }, 50);
    }

    // Start new ambient with native looping
    const audio = new Audio(SOUND_PATHS[id]);
    audio.loop = true; // Simple native looping
    audio.volume = 0;
    this.currentAmbient = audio;
    this.currentAmbientId = id;
    
    audio.play().then(() => {
      this.unlocked = true;
      this.allAmbientElements.add(audio); // Track this element
      // Fade in
      const fadeInInterval = setInterval(() => {
        if (!this.enabled) {
          clearInterval(fadeInInterval);
          return;
        }
        if (audio.volume < this.ambientVolume - 0.05) {
          audio.volume += 0.05;
        } else {
          audio.volume = this.ambientVolume;
          clearInterval(fadeInInterval);
        }
      }, 50);
    }).catch(() => {
      // Ambient blocked by autoplay policy - will retry via pendingAmbientId after unlock
    });
  }

  // Stop ambient (keepPending = true keeps the ID so toggle can restart it)
  stopAmbient(keepPending: boolean = false) {
    if (!keepPending) {
      this.pendingAmbientId = null;
    }
    
    // Stop ALL ambient audio elements, not just currentAmbient
    this.allAmbientElements.forEach(audio => {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 0;
      } catch (e) {
        // Ignore errors on already-removed elements
      }
    });
    this.allAmbientElements.clear();
    this.currentAmbient = null;
    this.currentAmbientId = null;
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
