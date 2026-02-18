// Audius Context — persistent music player across all screens
// Manages music source preference (game / audius / none) + active playlist
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

  const [musicSource, setMusicSourceState]           = useState<MusicSource>('game');
  const [activePlaylistId, setActivePlaylistIdState] = useState<string>(DEFAULT_PLAYLIST);
  const [prefsLoaded, setPrefsLoaded]                = useState(false);

  // Keep stable refs to player actions so effects always call the live version
  const stopRef         = useRef(player.stop);
  const loadPlaylistRef = useRef(player.loadPlaylist);
  useEffect(() => { stopRef.current = player.stop; }, [player.stop]);
  useEffect(() => { loadPlaylistRef.current = player.loadPlaylist; }, [player.loadPlaylist]);

  // ── Load persisted prefs on mount ──────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then((raw) => {
      if (raw) {
        try {
          const prefs: AudioPrefs = JSON.parse(raw);
          if (prefs.musicSource) setMusicSourceState(prefs.musicSource);
          if (prefs.activePlaylistId) setActivePlaylistIdState(prefs.activePlaylistId);
        } catch (e) {
          // Ignore corrupt prefs
        }
      }
      setPrefsLoaded(true);
    });
  }, []);

  // ── React to musicSource changes ───────────────────────────────────────────
  useEffect(() => {
    if (!prefsLoaded) return;

    const audioManager = getAudioManager();

    if (musicSource === 'audius') {
      audioManager.setSuppressAmbient(true);
      audioManager.stopAmbient();
      loadPlaylistRef.current(activePlaylistId);
    } else if (musicSource === 'none') {
      // Silence everything — suppress game ambient AND stop Audius
      audioManager.setSuppressAmbient(true);
      audioManager.stopAmbient();
      stopRef.current();
    } else {
      // 'game' — let game ambient play normally, stop any Audius
      audioManager.setSuppressAmbient(false);
      stopRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicSource, prefsLoaded]);

  // ── Public setters ─────────────────────────────────────────────────────────
  const savePrefs = useCallback(async (prefs: AudioPrefs) => {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, []);

  const setMusicSource = useCallback(async (source: MusicSource) => {
    setMusicSourceState(source);
    await savePrefs({ musicSource: source, activePlaylistId });
  }, [activePlaylistId, savePrefs]);

  const setActivePlaylist = useCallback(async (id: string) => {
    setActivePlaylistIdState(id);
    await savePrefs({ musicSource, activePlaylistId: id });

    if (musicSource === 'audius') {
      // Switch playlist and start playing
      player.loadPlaylist(id);
    }
  }, [musicSource, savePrefs, player]);

  return (
    <AudiusContext.Provider value={{
      musicSource,
      setMusicSource,
      activePlaylistId,
      setActivePlaylist,
      currentTrack:    player.currentTrack,
      isPlaying:       player.isPlaying,
      isLoading:       player.isLoading,
      togglePlayPause: player.togglePlayPause,
      playNext:        player.playNext,
      playPrev:        player.playPrev,
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
