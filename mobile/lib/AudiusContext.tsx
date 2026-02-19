// Audius Context — persistent music player across all screens
// Manages music source preference (game / audius / none) + active playlist
// plus master audio state integration (top-right [SND]/[MUTE])
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudiusPlayer, AudiusTrack, CURATED_PLAYLISTS } from './useAudiusPlayer';
import { getAudioManager } from './audio';

export type MusicSource = 'game' | 'audius' | 'none';

interface AudiusContextValue {
  // Preferences
  musicSource: MusicSource;
  setMusicSource: (source: MusicSource) => Promise<void>;
  activePlaylistId: string;
  setActivePlaylist: (id: string) => Promise<void>;

  // Master switch integration ([SND]/[MUTE])
  masterEnabled: boolean;
  setMasterEnabled: (enabled: boolean) => void;

  // Player state
  currentTrack: AudiusTrack | null;
  isPlaying: boolean;
  isLoading: boolean;

  // Controls
  togglePlayPause: () => void;
  playNext: () => void;
  playPrev: () => void;
}

const AudiusContext = createContext<AudiusContextValue | null>(null);

const PREFS_KEY = 'audius-prefs-v1';
const DEFAULT_PLAYLIST = CURATED_PLAYLISTS[0].id; // Dungeon Synth

interface AudioPrefs {
  musicSource: MusicSource;
  activePlaylistId: string;
}

export function AudiusProvider({ children }: { children: React.ReactNode }) {
  const player = useAudiusPlayer();

  const [musicSource, setMusicSourceState] = useState<MusicSource>('game');
  const [activePlaylistId, setActivePlaylistIdState] = useState<string>(DEFAULT_PLAYLIST);
  const [masterEnabled, setMasterEnabledState] = useState(true);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Keep stable refs to player actions so effects always call the live version
  const stopRef = useRef(player.stop);
  const loadPlaylistRef = useRef(player.loadPlaylist);
  useEffect(() => { stopRef.current = player.stop; }, [player.stop]);
  useEffect(() => { loadPlaylistRef.current = player.loadPlaylist; }, [player.loadPlaylist]);

  // ── Load persisted prefs on mount ──────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(PREFS_KEY),
      AsyncStorage.getItem('audio-enabled'),
    ]).then(([prefsRaw, masterRaw]) => {
      if (prefsRaw) {
        try {
          const prefs: AudioPrefs = JSON.parse(prefsRaw);
          if (prefs.musicSource) setMusicSourceState(prefs.musicSource);
          if (prefs.activePlaylistId) setActivePlaylistIdState(prefs.activePlaylistId);
        } catch {
          // Ignore corrupt prefs
        }
      }

      // Keep master state aligned with existing audio manager preference
      setMasterEnabledState(masterRaw !== 'false');
      setPrefsLoaded(true);
    });
  }, []);

  // ── React to source/master changes ─────────────────────────────────────────
  useEffect(() => {
    if (!prefsLoaded) return;

    const audioManager = getAudioManager();

    // Master mute overrides everything, but keeps user preferences intact
    if (!masterEnabled) {
      audioManager.setSuppressAmbient(true);
      audioManager.stopAmbient();
      stopRef.current();
      return;
    }

    if (musicSource === 'audius') {
      audioManager.setSuppressAmbient(true);
      audioManager.stopAmbient();
      loadPlaylistRef.current(activePlaylistId);
    } else if (musicSource === 'none') {
      // Silence music layer, keep SFX governed by the SFX toggle
      audioManager.setSuppressAmbient(true);
      audioManager.stopAmbient();
      stopRef.current();
    } else {
      // 'game' — let game ambient play normally, stop any Audius
      audioManager.setSuppressAmbient(false);
      stopRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicSource, masterEnabled, prefsLoaded]);

  // ── Public setters ─────────────────────────────────────────────────────────
  const savePrefs = useCallback(async (prefs: AudioPrefs) => {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, []);

  const setMasterEnabled = useCallback((enabled: boolean) => {
    setMasterEnabledState(enabled);
    if (!enabled) {
      // Hard stop now; effect also enforces this on next render
      stopRef.current();
      const audioManager = getAudioManager();
      audioManager.setSuppressAmbient(true);
      audioManager.stopAmbient();
    }
  }, []);

  const setMusicSource = useCallback(async (source: MusicSource) => {
    setMusicSourceState(source);
    await savePrefs({ musicSource: source, activePlaylistId });
  }, [activePlaylistId, savePrefs]);

  const setActivePlaylist = useCallback(async (id: string) => {
    setActivePlaylistIdState(id);
    await savePrefs({ musicSource, activePlaylistId: id });

    // Only switch immediately when Audius is active and master is on
    if (musicSource === 'audius' && masterEnabled) {
      loadPlaylistRef.current(id);
    }
  }, [musicSource, masterEnabled, savePrefs]);

  return (
    <AudiusContext.Provider value={{
      musicSource,
      setMusicSource,
      activePlaylistId,
      setActivePlaylist,
      masterEnabled,
      setMasterEnabled,
      currentTrack: player.currentTrack,
      isPlaying: player.isPlaying,
      isLoading: player.isLoading,
      togglePlayPause: player.togglePlayPause,
      playNext: player.playNext,
      playPrev: player.playPrev,
    }}>
      {children}
    </AudiusContext.Provider>
  );
}

export function useAudius(): AudiusContextValue {
  const ctx = useContext(AudiusContext);
  if (!ctx) throw new Error('useAudius must be used within AudiusProvider');
  return ctx;
}
