// Audio manager for Die Forward (React Native / Expo)
// Uses expo-audio for native, Web Audio API for browser
//
// Audio architecture:
//   masterEnabled  — top-level on/off (AudioToggle [SND]/[MUTE])
//   sfxEnabled     — SFX on/off (separate setting in AudioSettingsSection)
//   ambientVolume  — 0.0–1.0 (maps to 1–10 slider in AudioSettingsSection)
//   suppressAmbient — set by AudiusContext when Audius or 'none' is active

import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Toggle noisy audio debug logs
const AUDIO_DEBUG = false;
const audioLog = (...args: any[]) => {
  if (AUDIO_DEBUG) console.log(...args);
};

// Native audio module (expo-audio) - only loaded on native platforms
// IMPORTANT: AudioPlayer is NOT a top-level export of expo-audio.
// It lives on the NativeAudioModule instance (requireNativeModule('ExpoAudio')).
// Must import from 'expo-audio/build/AudioModule' to get the instance with .AudioPlayer.
let AudioModule: any = null;
let setAudioModeAsync: any = null;

async function loadNativeAudioModule() {
  if (Platform.OS === 'web') return; // Skip on web
  if (AudioModule) return;
  
  try {
    audioLog('[Audio] Loading expo-audio module (native)...');
    // Get NativeAudioModule instance — this has .AudioPlayer as a property
    const audioModMod = await import('expo-audio/build/AudioModule');
    AudioModule = audioModMod.default; // requireNativeModule('ExpoAudio')
    // Get setAudioModeAsync from main package
    const expoAudio = await import('expo-audio');
    setAudioModeAsync = expoAudio.setAudioModeAsync;
    audioLog('[Audio] expo-audio loaded:', !!AudioModule?.AudioPlayer);
  } catch (e) {
    console.warn('[Audio] Failed to load expo-audio:', e);
  }
}

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

// Audio files hosted on production web server (must use www to avoid redirect)
const AUDIO_BASE_URL = 'https://www.dieforward.com/audio';

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

// =============================================================================
// Web Audio Implementation (uses HTML5 Audio API)
// =============================================================================

class WebAudioManager {
  private currentAmbient: HTMLAudioElement | null = null;
  private currentAmbientId: SoundId | null = null;
  private lastRequestedAmbient: SoundId | null = null;
  private masterEnabled: boolean = true;  // [SND]/[MUTE] master switch
  private sfxEnabled: boolean = true;     // SFX on/off (independent)
  private sfxVolume: number = 0.7;
  private ambientVolume: number = 0.3;    // 0.0–1.0 (persisted)
  private preMuteAmbientVolume: number = 0.3;
  private initialized: boolean = false;
  private unlocked: boolean = false;
  private pendingAmbient: SoundId | null = null;
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private fadeInterval: ReturnType<typeof setInterval> | null = null;
  private suppressAmbient: boolean = false;

  async init() {
    if (this.initialized) return;
    
    try {
      // Load saved preferences
      const [master, sfx, vol] = await Promise.all([
        AsyncStorage.getItem('audio-master-enabled'),
        AsyncStorage.getItem('audio-sfx-enabled'),
        AsyncStorage.getItem('audio-ambient-volume'),
      ]);
      this.masterEnabled = master !== 'false';
      this.sfxEnabled = sfx !== 'false';
      if (vol !== null) this.ambientVolume = parseFloat(vol);
      this.preMuteAmbientVolume = this.ambientVolume > 0 ? this.ambientVolume : 0.3;
      this.initialized = true;
      
      audioLog('[Audio/Web] Initialized, setting up unlock listeners');
      
      // Listen for first user interaction to unlock audio
      const unlockAudio = () => {
        audioLog('[Audio/Web] User interaction detected - unlocking audio');
        this.unlocked = true;
        
        // Play a silent audio to fully unlock iOS Safari
        const silentAudio = new Audio();
        silentAudio.volume = 0;
        silentAudio.play().catch(() => {});
        
        // Play pending ambient if any
        if (this.pendingAmbient && this.masterEnabled) {
          audioLog('[Audio/Web] Playing pending ambient:', this.pendingAmbient);
          this.playAmbient(this.pendingAmbient);
          this.pendingAmbient = null;
        }
        
        // Remove listeners after unlock
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      
      window.addEventListener('click', unlockAudio, { once: true });
      window.addEventListener('touchstart', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });
    } catch (e) {
      console.warn('[Audio/Web] Failed to initialize:', e);
    }
  }

  private getOrCreateAudio(url: string): HTMLAudioElement {
    let audio = this.audioCache.get(url);
    if (!audio) {
      audio = new Audio(url);
      audio.preload = 'auto';
      this.audioCache.set(url, audio);
    }
    return audio;
  }

  async playSFX(id: SoundId) {
    audioLog('[Audio/Web] playSFX:', id, { masterEnabled: this.masterEnabled, sfxEnabled: this.sfxEnabled, unlocked: this.unlocked });
    
    if (!this.masterEnabled || !this.sfxEnabled || !this.unlocked) return;
    
    try {
      // Create a new Audio element for SFX (allows overlapping sounds)
      const audio = new Audio(SOUND_PATHS[id]);
      audio.volume = this.sfxVolume;
      
      audio.play().catch(e => {
        console.warn('[Audio/Web] SFX play failed:', id, e);
      });
      
      // Clean up after playback
      audio.onended = () => {
        audio.remove?.();
      };
    } catch (e) {
      console.warn('[Audio/Web] Failed to play SFX:', id, e);
    }
  }

  setSuppressAmbient(suppress: boolean) {
    const wasSupressed = this.suppressAmbient;
    this.suppressAmbient = suppress;

    if (suppress) {
      this.stopAmbient();
      this.pendingAmbient = null;
      return;
    }

    if (wasSupressed && this.lastRequestedAmbient) {
      this.playAmbient(this.lastRequestedAmbient);
    }
  }

  async playAmbient(id: SoundId, crossfade: boolean = true) {
    audioLog('[Audio/Web] playAmbient:', id, { masterEnabled: this.masterEnabled, unlocked: this.unlocked, crossfade, suppressed: this.suppressAmbient });
    
    // Always track what was requested, even if suppressed (for restart)
    this.lastRequestedAmbient = id;
    
    if (!this.masterEnabled) return;
    if (this.suppressAmbient) return;
    
    if (!this.unlocked) {
      audioLog('[Audio/Web] Ambient queued (waiting for unlock):', id);
      this.pendingAmbient = id;
      return;
    }
    
    if (this.currentAmbientId === id) {
      audioLog('[Audio/Web] Ambient already playing:', id);
      return;
    }
    
    try {
      const oldAmbient = this.currentAmbient;
      const fadeDuration = 800; // ms
      const fadeSteps = 20;
      const stepDuration = fadeDuration / fadeSteps;
      
      // Create and configure new ambient
      const audio = new Audio(SOUND_PATHS[id]);
      audio.loop = true;
      
      if (crossfade && oldAmbient) {
        // Start new audio at 0 volume
        audio.volume = 0;
        
        this.currentAmbient = audio;
        this.currentAmbientId = id;
        
        audio.play().catch(e => {
          console.warn('[Audio/Web] Ambient play failed:', id, e);
        });
        
        // Crossfade: fade out old, fade in new
        let step = 0;
        if (this.fadeInterval) clearInterval(this.fadeInterval);
        
        this.fadeInterval = setInterval(() => {
          step++;
          const progress = step / fadeSteps;
          
          // Fade out old
          if (oldAmbient) {
            oldAmbient.volume = Math.max(0, this.ambientVolume * (1 - progress));
          }
          // Fade in new
          audio.volume = Math.min(this.ambientVolume, this.ambientVolume * progress);
          
          if (step >= fadeSteps) {
            if (this.fadeInterval) clearInterval(this.fadeInterval);
            this.fadeInterval = null;
            
            // Clean up old audio
            if (oldAmbient) {
              oldAmbient.pause();
              oldAmbient.currentTime = 0;
            }
          }
        }, stepDuration);
      } else {
        // No crossfade - stop old immediately
        await this.stopAmbient();
        
        audio.volume = this.ambientVolume;
        this.currentAmbient = audio;
        this.currentAmbientId = id;
        
        audio.play().catch(e => {
          console.warn('[Audio/Web] Ambient play failed:', id, e);
        });
      }
      
      audioLog('[Audio/Web] Ambient started:', id);
    } catch (e) {
      console.warn('[Audio/Web] Failed to play ambient:', id, e);
    }
  }

  async stopAmbient() {
    if (this.currentAmbient) {
      try {
        this.currentAmbient.pause();
        this.currentAmbient.currentTime = 0;
      } catch (e) {
        // Ignore
      }
      this.currentAmbient = null;
      this.currentAmbientId = null;
    }
  }

  // ── Master (all audio) ───────────────────────────────────────────────────
  async toggleMaster(): Promise<boolean> {
    const next = !this.masterEnabled;
    await this.setMasterEnabled(next);
    return next;
  }

  isMasterEnabled(): boolean { return this.masterEnabled; }

  async setMasterEnabled(enabled: boolean) {
    this.masterEnabled = enabled;
    await AsyncStorage.setItem('audio-master-enabled', String(enabled));

    if (!enabled) {
      if (this.ambientVolume > 0) this.preMuteAmbientVolume = this.ambientVolume;
      await this.setAmbientVolume(0);
      await this.stopAmbient();
      return;
    }

    if (this.ambientVolume === 0) {
      await this.setAmbientVolume(this.preMuteAmbientVolume > 0 ? this.preMuteAmbientVolume : 0.3);
    }
  }

  // ── SFX (independent) ───────────────────────────────────────────────────
  async toggleSFX(): Promise<boolean> {
    this.sfxEnabled = !this.sfxEnabled;
    await AsyncStorage.setItem('audio-sfx-enabled', String(this.sfxEnabled));
    return this.sfxEnabled;
  }

  isSFXEnabled(): boolean { return this.sfxEnabled; }

  // ── Volume ──────────────────────────────────────────────────────────────
  getAmbientVolume(): number { return this.ambientVolume; }

  async setAmbientVolume(vol: number) {
    this.ambientVolume = Math.max(0, Math.min(1, vol));
    await AsyncStorage.setItem('audio-ambient-volume', String(this.ambientVolume));
    // Apply immediately to playing ambient
    if (this.currentAmbient) this.currentAmbient.volume = this.ambientVolume;
  }

  // ── Legacy shims (keep callers working) ─────────────────────────────────
  async toggle(): Promise<boolean> { return this.toggleMaster(); }
  isEnabled(): boolean { return this.masterEnabled; }
  async setEnabled(enabled: boolean) { return this.setMasterEnabled(enabled); }

  isUnlocked(): boolean { return this.unlocked; }

  async unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    audioLog('[Audio/Web] Unlocked by user interaction');
    if (this.pendingAmbient && this.masterEnabled) {
      const pending = this.pendingAmbient;
      this.pendingAmbient = null;
      setTimeout(() => { this.playAmbient(pending); }, 50);
    }
  }
}

// =============================================================================
// Native Audio Implementation (uses expo-audio)
// =============================================================================

class NativeAudioManager {
  private currentAmbient: any = null;
  private currentAmbientId: SoundId | null = null;
  private lastRequestedAmbient: SoundId | null = null;
  private masterEnabled: boolean = true;
  private sfxEnabled: boolean = true;
  private sfxVolume: number = 0.7;
  private ambientVolume: number = 0.3;
  private preMuteAmbientVolume: number = 0.3;
  private initialized: boolean = false;
  private unlocked: boolean = true;
  private suppressAmbient: boolean = false;

  async init() {
    if (this.initialized) return;
    
    try {
      await loadNativeAudioModule();
      
      if (setAudioModeAsync) {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'duckOthers',
          shouldPlayInBackground: false,
        });
      }
      
      const [master, sfx, vol] = await Promise.all([
        AsyncStorage.getItem('audio-master-enabled'),
        AsyncStorage.getItem('audio-sfx-enabled'),
        AsyncStorage.getItem('audio-ambient-volume'),
      ]);
      this.masterEnabled = master !== 'false';
      this.sfxEnabled = sfx !== 'false';
      if (vol !== null) this.ambientVolume = parseFloat(vol);
      this.preMuteAmbientVolume = this.ambientVolume > 0 ? this.ambientVolume : 0.3;
      this.initialized = true;
      
      audioLog('[Audio/Native] Initialized');
    } catch (e) {
      console.warn('[Audio/Native] Failed to initialize:', e);
    }
  }

  async playSFX(id: SoundId) {
    audioLog('[Audio/Native] playSFX:', id, { masterEnabled: this.masterEnabled, sfxEnabled: this.sfxEnabled });
    
    if (!this.masterEnabled || !this.sfxEnabled) return;
    if (!AudioModule?.AudioPlayer) return;
    
    try {
      const player = new AudioModule.AudioPlayer(
        { uri: SOUND_PATHS[id] },
        100,
        false
      );
      
      player.volume = this.sfxVolume;
      
      player.addListener('playbackStatusUpdate', (status: any) => {
        if (status.didJustFinish || (!status.playing && status.currentTime >= status.duration - 0.1)) {
          player.remove();
        }
      });
      
      player.play();
    } catch (e) {
      console.warn('[Audio/Native] Failed to play SFX:', id, e);
    }
  }

  setSuppressAmbient(suppress: boolean) {
    const wasSupressed = this.suppressAmbient;
    this.suppressAmbient = suppress;

    if (suppress) {
      this.stopAmbient();
      return;
    }

    if (wasSupressed && this.lastRequestedAmbient) {
      this.playAmbient(this.lastRequestedAmbient);
    }
  }

  async playAmbient(id: SoundId, _crossfade: boolean = true) {
    audioLog('[Audio/Native] playAmbient:', id, { masterEnabled: this.masterEnabled, hasModule: !!AudioModule?.AudioPlayer, suppressed: this.suppressAmbient });
    
    this.lastRequestedAmbient = id;
    
    if (!this.masterEnabled) return;
    if (this.suppressAmbient) return;
    if (this.currentAmbientId === id) return;
    if (!AudioModule?.AudioPlayer) return;
    
    try {
      // Hard stop existing player
      await this.stopAmbient();

      // Create new player
      const player = new AudioModule.AudioPlayer(
        { uri: SOUND_PATHS[id] },
        100,
        false
      );
      player.loop = true;
      player.volume = this.ambientVolume;

      this.currentAmbient = player;
      this.currentAmbientId = id;
      player.play();
      
      audioLog('[Audio/Native] Ambient started:', id);
    } catch (e) {
      console.warn('[Audio/Native] Failed to play ambient:', id, e);
    }
  }

  async stopAmbient() {
    if (this.currentAmbient) {
      try {
        this.currentAmbient.pause();
        this.currentAmbient.remove();
      } catch (e) {
        // Ignore
      }
      this.currentAmbient = null;
      this.currentAmbientId = null;
    }
  }

  // ── Master ───────────────────────────────────────────────────────────────
  async toggleMaster(): Promise<boolean> {
    const next = !this.masterEnabled;
    await this.setMasterEnabled(next);
    return next;
  }

  isMasterEnabled(): boolean { return this.masterEnabled; }

  async setMasterEnabled(enabled: boolean) {
    this.masterEnabled = enabled;
    await AsyncStorage.setItem('audio-master-enabled', String(enabled));

    if (!enabled) {
      if (this.ambientVolume > 0) this.preMuteAmbientVolume = this.ambientVolume;
      await this.setAmbientVolume(0);
      await this.stopAmbient();
      return;
    }

    if (this.ambientVolume === 0) {
      await this.setAmbientVolume(this.preMuteAmbientVolume > 0 ? this.preMuteAmbientVolume : 0.3);
    }
  }

  // ── SFX ──────────────────────────────────────────────────────────────────
  async toggleSFX(): Promise<boolean> {
    this.sfxEnabled = !this.sfxEnabled;
    await AsyncStorage.setItem('audio-sfx-enabled', String(this.sfxEnabled));
    return this.sfxEnabled;
  }

  isSFXEnabled(): boolean { return this.sfxEnabled; }

  // ── Volume ───────────────────────────────────────────────────────────────
  getAmbientVolume(): number { return this.ambientVolume; }

  async setAmbientVolume(vol: number) {
    this.ambientVolume = Math.max(0, Math.min(1, vol));
    await AsyncStorage.setItem('audio-ambient-volume', String(this.ambientVolume));
    if (this.currentAmbient) {
      try { this.currentAmbient.volume = this.ambientVolume; } catch {}
    }
  }

  // ── Legacy shims ─────────────────────────────────────────────────────────
  async toggle(): Promise<boolean> { return this.toggleMaster(); }
  isEnabled(): boolean { return this.masterEnabled; }
  async setEnabled(enabled: boolean) { return this.setMasterEnabled(enabled); }

  isUnlocked(): boolean { return this.unlocked; }
  async unlock() { this.unlocked = true; }
}

// =============================================================================
// Unified Interface
// =============================================================================

interface IAudioManager {
  init(): Promise<void>;
  playSFX(id: SoundId): Promise<void>;
  playAmbient(id: SoundId, crossfade?: boolean): Promise<void>;
  stopAmbient(): Promise<void>;
  // Master
  toggleMaster(): Promise<boolean>;
  isMasterEnabled(): boolean;
  setMasterEnabled(enabled: boolean): Promise<void>;
  // SFX
  toggleSFX(): Promise<boolean>;
  isSFXEnabled(): boolean;
  // Volume
  getAmbientVolume(): number;
  setAmbientVolume(vol: number): Promise<void>;
  // Legacy shims
  toggle(): Promise<boolean>;
  isEnabled(): boolean;
  setEnabled(enabled: boolean): Promise<void>;
  isUnlocked(): boolean;
  unlock(): Promise<void>;
  setSuppressAmbient(suppress: boolean): void;
}

// Singleton instance - platform-appropriate
let audioManager: IAudioManager | null = null;

export function getAudioManager(): IAudioManager {
  if (!audioManager) {
    if (Platform.OS === 'web') {
      audioLog('[Audio] Creating WebAudioManager');
      audioManager = new WebAudioManager();
    } else {
      audioLog('[Audio] Creating NativeAudioManager');
      audioManager = new NativeAudioManager();
    }
  }
  return audioManager;
}

// React hook for audio
export function useAudio() {
  const [masterEnabled, setMasterEnabledState] = useState(true);
  const [sfxEnabled, setSFXEnabledState] = useState(true);
  const [ambientVolume, setAmbientVolumeState] = useState(0.3);
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  
  useEffect(() => {
    const manager = getAudioManager();
    manager.init().then(() => {
      setMasterEnabledState(manager.isMasterEnabled());
      setSFXEnabledState(manager.isSFXEnabled());
      setAmbientVolumeState(manager.getAmbientVolume());
      setUnlocked(manager.isUnlocked());
      setReady(true);
    });
  }, []);

  const playSFX = useCallback((id: SoundId) => {
    getAudioManager().playSFX(id);
  }, []);

  const playAmbient = useCallback((id: SoundId, crossfade: boolean = true) => {
    getAudioManager().playAmbient(id, crossfade);
  }, []);

  const stopAmbient = useCallback(() => {
    getAudioManager().stopAmbient();
  }, []);

  // Master toggle ([SND]/[MUTE])
  const toggle = useCallback(async () => {
    const newState = await getAudioManager().toggleMaster();
    setMasterEnabledState(newState);
    return newState;
  }, []);

  // SFX toggle (independent)
  const toggleSFX = useCallback(async () => {
    const newState = await getAudioManager().toggleSFX();
    setSFXEnabledState(newState);
    return newState;
  }, []);

  // Volume (0.0–1.0)
  const setAmbientVolume = useCallback(async (vol: number) => {
    await getAudioManager().setAmbientVolume(vol);
    setAmbientVolumeState(Math.max(0, Math.min(1, vol)));
  }, []);

  const unlock = useCallback(() => {
    getAudioManager().unlock();
    setUnlocked(true);
  }, []);

  return {
    // Master
    enabled: masterEnabled,   // legacy alias
    masterEnabled,
    sfxEnabled,
    ambientVolume,
    ready,
    unlocked,
    // Actions
    playSFX,
    playAmbient,
    stopAmbient,
    toggle,
    toggleSFX,
    setAmbientVolume,
    unlock,
  };
}
