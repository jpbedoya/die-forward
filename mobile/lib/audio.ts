// Audio manager for Die Forward (React Native / Expo)
// Uses expo-av for SFX and ambient loops

import { Audio, AVPlaybackStatus } from 'expo-av';
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SoundId = 
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
  // Environment SFX
  | 'footstep'
  | 'item-pickup'
  | 'door-creak'
  | 'water-drip'
  | 'corpse-discover'
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

// Audio files hosted on production web server
const AUDIO_BASE_URL = 'https://dieforward.com/audio';

const SOUND_PATHS: Record<SoundId, string> = {
  // Ambient
  'ambient-explore': `${AUDIO_BASE_URL}/ambient-explore.mp3`,
  'ambient-combat': `${AUDIO_BASE_URL}/ambient-combat.mp3`,
  'ambient-title': `${AUDIO_BASE_URL}/ambient-title.mp3`,
  'ambient-death': `${AUDIO_BASE_URL}/ambient-death.mp3`,
  'ambient-victory': `${AUDIO_BASE_URL}/ambient-victory.mp3`,
  // Combat
  'sword-slash': `${AUDIO_BASE_URL}/sword-slash.mp3`,
  'blunt-hit': `${AUDIO_BASE_URL}/blunt-hit.mp3`,
  'damage-taken': `${AUDIO_BASE_URL}/damage-taken.mp3`,
  'enemy-death': `${AUDIO_BASE_URL}/enemy-death.mp3`,
  'boss-intro': `${AUDIO_BASE_URL}/boss-intro.mp3`,
  'boss-roar': `${AUDIO_BASE_URL}/boss-roar.mp3`,
  'dodge-whoosh': `${AUDIO_BASE_URL}/dodge-whoosh.mp3`,
  'brace-impact': `${AUDIO_BASE_URL}/brace-impact.mp3`,
  'flee-run': `${AUDIO_BASE_URL}/flee-run.mp3`,
  'flee-fail': `${AUDIO_BASE_URL}/flee-fail.mp3`,
  'enemy-growl': `${AUDIO_BASE_URL}/enemy-growl.mp3`,
  'critical-hit': `${AUDIO_BASE_URL}/critical-hit.mp3`,
  'parry-clang': `${AUDIO_BASE_URL}/parry-clang.mp3`,
  'attack-miss': `${AUDIO_BASE_URL}/attack-miss.mp3`,
  // Player
  'player-death': `${AUDIO_BASE_URL}/player-death.mp3`,
  'victory': `${AUDIO_BASE_URL}/victory.mp3`,
  'heal': `${AUDIO_BASE_URL}/heal.mp3`,
  'heartbeat-low': `${AUDIO_BASE_URL}/heartbeat-low.mp3`,
  'stamina-depleted': `${AUDIO_BASE_URL}/stamina-depleted.mp3`,
  'stamina-recover': `${AUDIO_BASE_URL}/stamina-recover.mp3`,
  'poison-tick': `${AUDIO_BASE_URL}/poison-tick.mp3`,
  // Environment
  'footstep': `${AUDIO_BASE_URL}/footstep.mp3`,
  'item-pickup': `${AUDIO_BASE_URL}/item-pickup.mp3`,
  'door-creak': `${AUDIO_BASE_URL}/door-creak.mp3`,
  'water-drip': `${AUDIO_BASE_URL}/water-drip.mp3`,
  'corpse-discover': `${AUDIO_BASE_URL}/corpse-discover.mp3`,
  'depth-descend': `${AUDIO_BASE_URL}/depth-descend.mp3`,
  'water-splash': `${AUDIO_BASE_URL}/water-splash.mp3`,
  'chains-rattle': `${AUDIO_BASE_URL}/chains-rattle.mp3`,
  'eerie-whispers': `${AUDIO_BASE_URL}/eerie-whispers.mp3`,
  'stone-grinding': `${AUDIO_BASE_URL}/stone-grinding.mp3`,
  'drip-echo': `${AUDIO_BASE_URL}/drip-echo.mp3`,
  // Rewards
  'tip-chime': `${AUDIO_BASE_URL}/tip-chime.mp3`,
  'loot-discover': `${AUDIO_BASE_URL}/loot-discover.mp3`,
  'victory-fanfare': `${AUDIO_BASE_URL}/victory-fanfare.mp3`,
  'share-click': `${AUDIO_BASE_URL}/share-click.mp3`,
  // UI
  'ui-click': `${AUDIO_BASE_URL}/ui-click.mp3`,
  'ui-hover': `${AUDIO_BASE_URL}/ui-hover.mp3`,
  'menu-open': `${AUDIO_BASE_URL}/menu-open.mp3`,
  'menu-close': `${AUDIO_BASE_URL}/menu-close.mp3`,
  'confirm-action': `${AUDIO_BASE_URL}/confirm-action.mp3`,
  'error-buzz': `${AUDIO_BASE_URL}/error-buzz.mp3`,
};

class AudioManager {
  private currentAmbient: Audio.Sound | null = null;
  private currentAmbientId: SoundId | null = null;
  private enabled: boolean = true;
  private sfxVolume: number = 0.7;
  private ambientVolume: number = 0.3;
  private initialized: boolean = false;

  async init() {
    if (this.initialized) return;
    
    try {
      // Configure audio mode for background playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      
      // Load saved preference
      const saved = await AsyncStorage.getItem('audio-enabled');
      this.enabled = saved !== 'false';
      this.initialized = true;
    } catch (e) {
      console.warn('Failed to initialize audio:', e);
    }
  }

  async playSFX(id: SoundId) {
    if (!this.enabled) return;
    
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: SOUND_PATHS[id] },
        { volume: this.sfxVolume }
      );
      
      await sound.playAsync();
      
      // Unload after playing
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (e) {
      // Silent fail for SFX
      console.warn('Failed to play SFX:', id, e);
    }
  }

  async playAmbient(id: SoundId) {
    if (!this.enabled) return;
    if (this.currentAmbientId === id) return;
    
    try {
      // Stop current ambient
      await this.stopAmbient();
      
      // Load and play new ambient
      const { sound } = await Audio.Sound.createAsync(
        { uri: SOUND_PATHS[id] },
        { 
          volume: this.ambientVolume,
          isLooping: true,
        }
      );
      
      this.currentAmbient = sound;
      this.currentAmbientId = id;
      
      await sound.playAsync();
    } catch (e) {
      console.warn('Failed to play ambient:', id, e);
    }
  }

  async stopAmbient() {
    if (this.currentAmbient) {
      try {
        await this.currentAmbient.stopAsync();
        await this.currentAmbient.unloadAsync();
      } catch (e) {
        // Ignore errors
      }
      this.currentAmbient = null;
      this.currentAmbientId = null;
    }
  }

  async toggle(): Promise<boolean> {
    this.enabled = !this.enabled;
    await AsyncStorage.setItem('audio-enabled', String(this.enabled));
    
    if (!this.enabled) {
      await this.stopAmbient();
    }
    
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async setEnabled(enabled: boolean) {
    this.enabled = enabled;
    await AsyncStorage.setItem('audio-enabled', String(this.enabled));
    
    if (!enabled) {
      await this.stopAmbient();
    }
  }
}

// Singleton instance
let audioManager: AudioManager | null = null;

export function getAudioManager(): AudioManager {
  if (!audioManager) {
    audioManager = new AudioManager();
  }
  return audioManager;
}

// React hook for audio
export function useAudio() {
  const [enabled, setEnabled] = useState(true);
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    const manager = getAudioManager();
    manager.init().then(() => {
      setEnabled(manager.isEnabled());
      setReady(true);
    });
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

  const toggle = useCallback(async () => {
    const manager = getAudioManager();
    const newState = await manager.toggle();
    setEnabled(newState);
    return newState;
  }, []);

  return {
    enabled,
    ready,
    playSFX,
    playAmbient,
    stopAmbient,
    toggle,
  };
}
