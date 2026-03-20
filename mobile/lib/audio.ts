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
  // Ambient loops — generic
  | 'ambient-explore'
  | 'ambient-combat'
  | 'ambient-title'
  | 'ambient-death'
  | 'ambient-victory'
  // Ambient loops — zone-specific
  | 'zone-living-tomb-explore'
  | 'zone-living-tomb-combat'
  | 'zone-frozen-gallery-explore'
  | 'zone-frozen-gallery-combat'
  | 'zone-ashen-crypts-explore'
  | 'zone-ashen-crypts-combat'
  | 'zone-void-beyond-explore'
  | 'zone-void-beyond-combat'
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
  // Zone combat SFX
  | 'zone-living-tomb-boss-intro'
  | 'zone-living-tomb-boss-roar'
  | 'zone-frozen-gallery-boss-intro'
  | 'zone-frozen-gallery-boss-roar'
  | 'zone-ashen-crypts-boss-intro'
  | 'zone-ashen-crypts-boss-roar'
  | 'zone-void-beyond-boss-intro'
  | 'zone-void-beyond-boss-roar'
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
  // Atmospheric triggers — universal
  | 'water-drop-single'
  | 'distant-splash'
  | 'distant-growl-far'
  | 'something-moves'
  | 'far-rumble'
  | 'whispers-word'
  | 'drip-pool-echo'
  | 'distant-scream'
  // Atmospheric triggers — Living Tomb
  | 'tomb-heartbeat'
  | 'tomb-breathing'
  | 'tomb-drip-warm'
  | 'tomb-growth'
  | 'tomb-peristalsis'
  | 'distant-pulse'
  // Atmospheric triggers — Frozen Gallery
  | 'glacier-groan'
  | 'ice-crack'
  | 'cold-wind-tunnel'
  | 'ice-settle'
  | 'wraith-presence'
  // Atmospheric triggers — Ashen Crypts
  | 'embers-crackle'
  | 'ash-fall'
  | 'distant-fire'
  | 'bone-crumble'
  // Atmospheric triggers — Void Beyond
  | 'void-static'
  | 'bleed-through'
  | 'void-silence'
  | 'reality-shift'
  | 'your-voice-wrong'
  // Mechanic SFX — Living Tomb
  | 'infection-gain'
  | 'infection-purge'
  | 'item-consumed'
  | 'crawler-skitter'
  | 'crawler-inject'
  | 'crawler-death'
  | 'incorporated-reach'
  | 'incorporated-death'
  | 'bloom-drift'
  | 'spore-burst'
  | 'guardian-breathe'
  | 'guardian-seal'
  // Mechanic SFX — Frozen Gallery
  | 'chill-gain'
  | 'freeze-trigger'
  | 'thermal-flask'
  | 'temperature-drop'
  | 'preserved-creak'
  | 'preserved-arrest'
  | 'sentinel-move'
  | 'sentinel-death'
  | 'shattered-scrape'
  | 'shattered-split'
  // Mechanic SFX — Ashen Crypts
  | 'burn-gain'
  | 'burn-tick'
  | 'ember-flask'
  | 'fire-whoosh'
  | 'stone-crack'
  // Mechanic SFX — Void Beyond
  | 'flux-trigger'
  | 'echo-double-appear'
  | 'void-creature-move'
  | 'dimensional-tear'
  | 'clarity-restore'
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

const ZONE_BASE = `${AUDIO_BASE_URL}/zones`;

const SOUND_PATHS: Record<SoundId, string> = {
  // Ambient — generic
  'ambient-explore': `${AUDIO_BASE_URL}/ambient-explore.mp3`,
  'ambient-combat': `${AUDIO_BASE_URL}/ambient-combat.mp3`,
  'ambient-title': `${AUDIO_BASE_URL}/ambient-title.mp3`,
  'ambient-death': `${AUDIO_BASE_URL}/ambient-death.mp3`,
  'ambient-victory': `${AUDIO_BASE_URL}/ambient-victory.mp3`,
  // Ambient — zone-specific
  'zone-living-tomb-explore': `${ZONE_BASE}/living-tomb/ambient-explore.mp3`,
  'zone-living-tomb-combat': `${ZONE_BASE}/living-tomb/ambient-combat.mp3`,
  'zone-frozen-gallery-explore': `${ZONE_BASE}/frozen-gallery/ambient-explore.mp3`,
  'zone-frozen-gallery-combat': `${ZONE_BASE}/frozen-gallery/ambient-combat.mp3`,
  'zone-ashen-crypts-explore': `${ZONE_BASE}/ashen-crypts/ambient-explore.mp3`,
  'zone-ashen-crypts-combat': `${ZONE_BASE}/ashen-crypts/ambient-combat.mp3`,
  'zone-void-beyond-explore': `${ZONE_BASE}/void-beyond/ambient-explore.mp3`,
  'zone-void-beyond-combat': `${ZONE_BASE}/void-beyond/ambient-combat.mp3`,
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
  // Atmospheric triggers — universal
  'water-drop-single': `${AUDIO_BASE_URL}/water-drop-single.mp3`,
  'distant-splash': `${ZONE_BASE}/atmospheric/distant-splash.mp3`,
  'distant-growl-far': `${ZONE_BASE}/atmospheric/distant-growl-far.mp3`,
  'something-moves': `${ZONE_BASE}/atmospheric/something-moves.mp3`,
  'far-rumble': `${ZONE_BASE}/atmospheric/far-rumble.mp3`,
  'whispers-word': `${ZONE_BASE}/atmospheric/whispers-word.mp3`,
  'drip-pool-echo': `${ZONE_BASE}/atmospheric/drip-pool-echo.mp3`,
  'distant-scream': `${ZONE_BASE}/atmospheric/distant-scream.mp3`,
  // Atmospheric triggers — Living Tomb
  'tomb-heartbeat': `${ZONE_BASE}/living-tomb/tomb-heartbeat.mp3`,
  'tomb-breathing': `${ZONE_BASE}/living-tomb/tomb-breathing.mp3`,
  'tomb-drip-warm': `${ZONE_BASE}/living-tomb/wet-drip.mp3`,
  'tomb-growth': `${ZONE_BASE}/living-tomb/tomb-growth.mp3`,
  'tomb-peristalsis': `${ZONE_BASE}/living-tomb/tomb-peristalsis.mp3`,
  'distant-pulse': `${ZONE_BASE}/living-tomb/distant-pulse.mp3`,
  // Atmospheric triggers — Frozen Gallery
  'glacier-groan': `${ZONE_BASE}/frozen-gallery/glacier-groan.mp3`,
  'ice-crack': `${ZONE_BASE}/frozen-gallery/ice-crack.mp3`,
  'cold-wind-tunnel': `${ZONE_BASE}/frozen-gallery/wind-tunnel.mp3`,
  'ice-settle': `${ZONE_BASE}/frozen-gallery/deep-silence.mp3`,
  'wraith-presence': `${ZONE_BASE}/frozen-gallery/wraith-presence.mp3`,
  // Atmospheric triggers — Ashen Crypts
  'embers-crackle': `${ZONE_BASE}/ashen-crypts/fire-crackle.mp3`,
  'ash-fall': `${ZONE_BASE}/ashen-crypts/ash-fall.mp3`,
  'distant-fire': `${ZONE_BASE}/ashen-crypts/distant-roar.mp3`,
  'bone-crumble': `${ZONE_BASE}/ashen-crypts/bone-crumble.mp3`,
  // Atmospheric triggers — Void Beyond
  'void-static': `${ZONE_BASE}/void-beyond/void-static.mp3`,
  'bleed-through': `${ZONE_BASE}/void-beyond/bleed-through.mp3`,
  'void-silence': `${ZONE_BASE}/void-beyond/silence-wrong.mp3`,
  'reality-shift': `${ZONE_BASE}/void-beyond/reality-shift.mp3`,
  'your-voice-wrong': `${ZONE_BASE}/void-beyond/your-voice-wrong.mp3`,
  // Zone boss combat SFX
  'zone-living-tomb-boss-intro': `${ZONE_BASE}/living-tomb/boss-intro.mp3`,
  'zone-living-tomb-boss-roar': `${ZONE_BASE}/living-tomb/boss-roar.mp3`,
  'zone-frozen-gallery-boss-intro': `${ZONE_BASE}/frozen-gallery/boss-intro.mp3`,
  'zone-frozen-gallery-boss-roar': `${ZONE_BASE}/frozen-gallery/boss-roar.mp3`,
  'zone-ashen-crypts-boss-intro': `${ZONE_BASE}/ashen-crypts/boss-intro.mp3`,
  'zone-ashen-crypts-boss-roar': `${ZONE_BASE}/ashen-crypts/boss-roar.mp3`,
  'zone-void-beyond-boss-intro': `${ZONE_BASE}/void-beyond/boss-intro.mp3`,
  'zone-void-beyond-boss-roar': `${ZONE_BASE}/void-beyond/boss-roar.mp3`,
  // Mechanic SFX — Living Tomb
  'infection-gain': `${ZONE_BASE}/living-tomb/infection-gain.mp3`,
  'infection-purge': `${ZONE_BASE}/living-tomb/infection-purge.mp3`,
  'item-consumed': `${ZONE_BASE}/living-tomb/item-consumed.mp3`,
  'crawler-skitter': `${ZONE_BASE}/living-tomb/crawler-skitter.mp3`,
  'crawler-inject': `${ZONE_BASE}/living-tomb/crawler-inject.mp3`,
  'crawler-death': `${ZONE_BASE}/living-tomb/crawler-death.mp3`,
  'incorporated-reach': `${ZONE_BASE}/living-tomb/incorporated-reach.mp3`,
  'incorporated-death': `${ZONE_BASE}/living-tomb/incorporated-death.mp3`,
  'bloom-drift': `${ZONE_BASE}/living-tomb/bloom-drift.mp3`,
  'spore-burst': `${ZONE_BASE}/living-tomb/spore-burst.mp3`,
  'guardian-breathe': `${ZONE_BASE}/living-tomb/guardian-breathe.mp3`,
  'guardian-seal': `${ZONE_BASE}/living-tomb/guardian-seal.mp3`,
  // Mechanic SFX — Frozen Gallery
  'chill-gain': `${ZONE_BASE}/frozen-gallery/chill-gain.mp3`,
  'freeze-trigger': `${ZONE_BASE}/frozen-gallery/freeze-trigger.mp3`,
  'thermal-flask': `${ZONE_BASE}/frozen-gallery/thermal-flask.mp3`,
  'temperature-drop': `${ZONE_BASE}/frozen-gallery/temperature-drop.mp3`,
  'preserved-creak': `${ZONE_BASE}/frozen-gallery/preserved-creak.mp3`,
  'preserved-arrest': `${ZONE_BASE}/frozen-gallery/preserved-arrest.mp3`,
  'sentinel-move': `${ZONE_BASE}/frozen-gallery/sentinel-move.mp3`,
  'sentinel-death': `${ZONE_BASE}/frozen-gallery/sentinel-death.mp3`,
  'shattered-scrape': `${ZONE_BASE}/frozen-gallery/shattered-scrape.mp3`,
  'shattered-split': `${ZONE_BASE}/frozen-gallery/shattered-split.mp3`,
  // Mechanic SFX — Ashen Crypts
  'burn-gain': `${ZONE_BASE}/ashen-crypts/burn-gain.mp3`,
  'burn-tick': `${ZONE_BASE}/ashen-crypts/burn-tick.mp3`,
  'ember-flask': `${ZONE_BASE}/ashen-crypts/ember-flask.mp3`,
  'fire-whoosh': `${ZONE_BASE}/ashen-crypts/fire-whoosh.mp3`,
  'stone-crack': `${ZONE_BASE}/ashen-crypts/stone-crack.mp3`,
  // Mechanic SFX — Void Beyond
  'flux-trigger': `${ZONE_BASE}/void-beyond/flux-trigger.mp3`,
  'echo-double-appear': `${ZONE_BASE}/void-beyond/echo-double-appear.mp3`,
  'void-creature-move': `${ZONE_BASE}/void-beyond/void-creature-move.mp3`,
  'dimensional-tear': `${ZONE_BASE}/void-beyond/dimensional-tear.mp3`,
  'clarity-restore': `${ZONE_BASE}/void-beyond/clarity-restore.mp3`,
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
  private sfxVolume: number = 0.3;
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
      this.sfxVolume = this.ambientVolume;
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
    this.sfxVolume = this.ambientVolume;
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
  private sfxVolume: number = 0.3;
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
      this.sfxVolume = this.ambientVolume;
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
    this.sfxVolume = this.ambientVolume;
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
    const manager = getAudioManager();
    const newState = await manager.toggleMaster();
    setMasterEnabledState(newState);
    setAmbientVolumeState(manager.getAmbientVolume());
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

// =============================================================================
// Zone Audio Helpers
// =============================================================================

/** Map a zoneId + screen to the appropriate ambient SoundId */
export function getZoneAmbient(zoneId: string, screen: 'explore' | 'combat'): SoundId {
  const map: Record<string, { explore: SoundId; combat: SoundId }> = {
    'living-tomb':    { explore: 'zone-living-tomb-explore',    combat: 'zone-living-tomb-combat' },
    'frozen-gallery': { explore: 'zone-frozen-gallery-explore', combat: 'zone-frozen-gallery-combat' },
    'ashen-crypts':   { explore: 'zone-ashen-crypts-explore',   combat: 'zone-ashen-crypts-combat' },
    'void-beyond':    { explore: 'zone-void-beyond-explore',    combat: 'zone-void-beyond-combat' },
  };
  return map[zoneId]?.[screen] ?? (screen === 'explore' ? 'ambient-explore' : 'ambient-combat');
}

/** Map a zoneId to zone-specific boss-intro / boss-roar SoundIds */
export function getZoneBossSFX(zoneId: string): { intro: SoundId; roar: SoundId } {
  const map: Record<string, { intro: SoundId; roar: SoundId }> = {
    'living-tomb':    { intro: 'zone-living-tomb-boss-intro',    roar: 'zone-living-tomb-boss-roar' },
    'frozen-gallery': { intro: 'zone-frozen-gallery-boss-intro', roar: 'zone-frozen-gallery-boss-roar' },
    'ashen-crypts':   { intro: 'zone-ashen-crypts-boss-intro',   roar: 'zone-ashen-crypts-boss-roar' },
    'void-beyond':    { intro: 'zone-void-beyond-boss-intro',    roar: 'zone-void-beyond-boss-roar' },
  };
  return map[zoneId] ?? { intro: 'boss-intro', roar: 'boss-roar' };
}

// =============================================================================
// Atmospheric Triggers Hook
// =============================================================================

// Zone-specific atmospheric sound pools (fired on random timer during exploration)
const ZONE_ATMOSPHERIC: Record<string, SoundId[]> = {
  'sunken-crypt': [
    'water-drop-single', 'distant-splash', 'drip-pool-echo',
    'something-moves', 'far-rumble', 'eerie-whispers',
  ],
  'living-tomb': [
    'tomb-heartbeat', 'tomb-breathing', 'tomb-drip-warm',
    'tomb-growth', 'tomb-peristalsis', 'distant-pulse',
  ],
  'frozen-gallery': [
    'glacier-groan', 'ice-crack', 'cold-wind-tunnel',
    'ice-settle', 'wraith-presence',
  ],
  'ashen-crypts': [
    'embers-crackle', 'ash-fall', 'distant-fire', 'bone-crumble',
  ],
  'void-beyond': [
    'void-static', 'bleed-through', 'void-silence',
    'reality-shift', 'your-voice-wrong',
  ],
};

// Rare sounds that can fire in any zone (low probability)
const RARE_ATMOSPHERIC: SoundId[] = [
  'distant-growl-far', 'far-rumble', 'distant-scream', 'whispers-word',
];

const TRIGGER_MIN_MS = 20_000; // 20s minimum between triggers
const TRIGGER_MAX_MS = 45_000; // 45s maximum between triggers
const RARE_CHANCE = 0.15;       // 15% chance to pick from rare pool instead

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// =============================================================================
// Creature SFX Mapping
// =============================================================================

interface CreatureSFX {
  idle: SoundId;       // plays on enemy turn / intent reveal
  attack: SoundId;     // plays when enemy hits player
  death: SoundId;      // plays when enemy dies
}

const CREATURE_SFX: Record<string, CreatureSFX> = {
  // Living Tomb
  'Mycelium Crawlers': { idle: 'crawler-skitter', attack: 'crawler-inject', death: 'crawler-death' },
  'The Incorporated':  { idle: 'incorporated-reach', attack: 'incorporated-reach', death: 'incorporated-death' },
  'Membrane Guardian': { idle: 'guardian-breathe', attack: 'guardian-seal', death: 'spore-burst' },
  'The Bloom':         { idle: 'bloom-drift', attack: 'infection-gain', death: 'spore-burst' },
  'The Root':          { idle: 'tomb-heartbeat', attack: 'tomb-peristalsis', death: 'tomb-growth' },
  // Frozen Gallery
  'The Preserved':         { idle: 'preserved-creak', attack: 'preserved-creak', death: 'preserved-arrest' },
  'Ice Wraiths':           { idle: 'wraith-presence', attack: 'chill-gain', death: 'freeze-trigger' },
  'Frost Sentinels':       { idle: 'sentinel-move', attack: 'temperature-drop', death: 'sentinel-death' },
  'The Shattered':         { idle: 'shattered-scrape', attack: 'shattered-split', death: 'ice-crack' },
  'The Glacial Sovereign': { idle: 'glacier-groan', attack: 'temperature-drop', death: 'sentinel-death' },
  // Ashen Crypts
  'Ember Husks':        { idle: 'embers-crackle', attack: 'burn-gain', death: 'ash-fall' },
  'Cinder Priests':     { idle: 'embers-crackle', attack: 'fire-whoosh', death: 'ash-fall' },
  'The Scorched':       { idle: 'distant-fire', attack: 'burn-gain', death: 'bone-crumble' },
  'Flame Weavers':      { idle: 'fire-whoosh', attack: 'burn-tick', death: 'ash-fall' },
  'Ashen Congregation': { idle: 'embers-crackle', attack: 'burn-gain', death: 'ash-fall' },
  'The Scorched Veteran': { idle: 'distant-fire', attack: 'fire-whoosh', death: 'bone-crumble' },
  'Senior Flame Weaver':  { idle: 'fire-whoosh', attack: 'burn-tick', death: 'ash-fall' },
  'The Pyre Keeper':      { idle: 'zone-ashen-crypts-boss-intro', attack: 'zone-ashen-crypts-boss-roar', death: 'stone-crack' },
  // Void Beyond
  'Probability Shade': { idle: 'void-creature-move', attack: 'flux-trigger', death: 'void-static' },
  'Echo Double':       { idle: 'echo-double-appear', attack: 'dimensional-tear', death: 'clarity-restore' },
  'Void Architect':    { idle: 'void-static', attack: 'reality-shift', death: 'bleed-through' },
  'The Unanchored':    { idle: 'bleed-through', attack: 'dimensional-tear', death: 'void-static' },
  'The Unwritten':     { idle: 'zone-void-beyond-boss-intro', attack: 'zone-void-beyond-boss-roar', death: 'clarity-restore' },
};

/** Get creature-specific SFX, falling back to generic sounds */
export function getCreatureSFX(creatureName: string): CreatureSFX {
  return CREATURE_SFX[creatureName] ?? {
    idle: 'enemy-growl',
    attack: 'damage-taken',
    death: 'enemy-death',
  };
}

// =============================================================================
// Zone Mechanic SFX Helpers
// =============================================================================

/**
 * Call when a mechanic stack is gained (infection/chill/burn).
 * Pass the zone's mechanic type and the playSFX function.
 */
export function playMechanicGainSFX(mechanic: string | null, playSFX: (id: SoundId) => void) {
  switch (mechanic) {
    case 'INFECTION': playSFX('infection-gain'); break;
    case 'CHILL':     playSFX('chill-gain'); break;
    case 'BURN':      playSFX('burn-gain'); break;
    case 'FLUX':      playSFX('flux-trigger'); break;
  }
}

/**
 * Call when a mechanic stack is purged / item used to cleanse.
 */
export function playMechanicPurgeSFX(mechanic: string | null, playSFX: (id: SoundId) => void) {
  switch (mechanic) {
    case 'INFECTION': playSFX('infection-purge'); break;
    case 'CHILL':     playSFX('thermal-flask'); break;
    case 'BURN':      playSFX('ember-flask'); break;
    case 'FLUX':      playSFX('clarity-restore'); break;
  }
}

/**
 * Call on per-turn mechanic damage tick.
 */
export function playMechanicTickSFX(mechanic: string | null, playSFX: (id: SoundId) => void) {
  switch (mechanic) {
    case 'BURN':      playSFX('burn-tick'); break;
    case 'INFECTION': playSFX('infection-gain'); break;
  }
}

/**
 * Hook that fires random atmospheric SFX during exploration.
 * Call in the explore screen component. Pass `active=false` to pause (e.g. during combat).
 */
export function useAtmosphericTriggers(zoneId: string, active: boolean = true) {
  const { playSFX, masterEnabled } = useAudio();

  useEffect(() => {
    if (!active || !masterEnabled) return;

    const pool = ZONE_ATMOSPHERIC[zoneId] ?? ZONE_ATMOSPHERIC['sunken-crypt'];

    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      const delay = TRIGGER_MIN_MS + Math.random() * (TRIGGER_MAX_MS - TRIGGER_MIN_MS);
      timeoutId = setTimeout(() => {
        const useRare = Math.random() < RARE_CHANCE;
        const sound = useRare ? pickRandom(RARE_ATMOSPHERIC) : pickRandom(pool);
        playSFX(sound);
        scheduleNext();
      }, delay);
    };

    // Initial delay before first trigger (don't fire immediately on mount)
    const initialDelay = TRIGGER_MIN_MS + Math.random() * 10_000;
    timeoutId = setTimeout(() => {
      const sound = pickRandom(pool);
      playSFX(sound);
      scheduleNext();
    }, initialDelay);

    return () => clearTimeout(timeoutId);
  }, [zoneId, active, masterEnabled, playSFX]);
}
