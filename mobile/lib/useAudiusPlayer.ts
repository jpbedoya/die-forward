// Audius music player hook — streaming from Audius API using expo-av
import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

export interface AudiusTrack {
  id: string;
  title: string;
  duration: number;
  play_count: number;
  user: {
    name: string;
    handle: string;
  };
  artwork?: {
    '150x150'?: string;
    '480x480'?: string;
  };
}

export const CURATED_PLAYLISTS = [
  { id: 'emQa2', name: 'Dungeon Synth', emoji: '🏰', vibe: 'Dark, atmospheric' },
  { id: 'DN6Pp', name: 'Gaming Arena',   emoji: '🎮', vibe: 'High energy' },
  { id: 'nqZmb', name: 'Lo-Fi Nights',  emoji: '🌙', vibe: 'Chill' },
  { id: '3AA6Z', name: 'Dark Ambient',  emoji: '🌑', vibe: 'Moody, intense' },
  { id: '5ON2AWX', name: 'Gaming Mix',  emoji: '🕹️', vibe: '331 tracks' },
  { id: 'ebd1O', name: 'Lofi Road Trip', emoji: '🚗', vibe: 'Chill vibes' },
] as const;

export type CuratedPlaylistId = typeof CURATED_PLAYLISTS[number]['id'];

const API_BASE = 'https://api.audius.co/v1';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function useAudiusPlayer() {
  const [tracks, setTracks]             = useState<AudiusTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<AudiusTrack | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [loadedPlaylistId, setLoadedPlaylistId] = useState<string | null>(null);
  const [volume, setVolumeState]        = useState(0.7);
  const [error, setError]               = useState<string | null>(null);

  const soundRef        = useRef<Audio.Sound | null>(null);
  const tracksRef       = useRef<AudiusTrack[]>([]);
  const indexRef        = useRef(0);
  const volumeRef       = useRef(0.7);
  const currentTrackRef = useRef<AudiusTrack | null>(null);
  const actionLockRef   = useRef(false); // prevents overlapping async calls

  // Keep refs in sync so callbacks always see latest values
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { indexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);

  // Configure audio mode for background streaming
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    return () => {
      clearCrossfade();
      soundRef.current?.unloadAsync();
    };
  }, []);

  // ── Crossfade helpers ────────────────────────────────────────────────────────
  const CROSSFADE_MS   = 1500;
  const CROSSFADE_STEPS = 20;

  const crossfadeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCrossfade = () => {
    if (crossfadeRef.current) {
      clearInterval(crossfadeRef.current);
      crossfadeRef.current = null;
    }
  };

  // Fade out + unload a sound we're done with
  const fadeOutAndUnload = (sound: Audio.Sound, fromVolume: number) => {
    const steps = CROSSFADE_STEPS;
    const stepMs = CROSSFADE_MS / steps;
    let step = 0;
    const interval = setInterval(async () => {
      step++;
      try {
        await sound.setVolumeAsync(Math.max(0, fromVolume * (1 - step / steps)));
      } catch { /* sound may already be unloaded */ }
      if (step >= steps) {
        clearInterval(interval);
        try { await sound.stopAsync(); } catch {}
        try { await sound.unloadAsync(); } catch {}
      }
    }, stepMs);
  };

  // Fade a sound in from 0 to target volume
  const fadeIn = (sound: Audio.Sound, targetVolume: number) => {
    const steps = CROSSFADE_STEPS;
    const stepMs = CROSSFADE_MS / steps;
    let step = 0;
    clearCrossfade();
    crossfadeRef.current = setInterval(async () => {
      step++;
      try {
        await sound.setVolumeAsync(Math.min(targetVolume, targetVolume * (step / steps)));
      } catch { /* sound may have changed */ }
      if (step >= steps) clearCrossfade();
    }, stepMs);
  };

  // ── Internal play ───────────────────────────────────────────────────────────
  const playTrackInner = async (
    track: AudiusTrack,
    index: number,
    trackList?: AudiusTrack[],
  ) => {
    try {
      // Hold onto old sound for crossfade — don't unload yet
      const oldSound  = soundRef.current;
      const oldVolume = volumeRef.current;
      soundRef.current = null;
      clearCrossfade();

      setCurrentTrack(track);
      setCurrentIndex(index);
      setIsPlaying(true);
      setError(null);

      // Start new sound at 0 so we can fade it in
      const { sound } = await Audio.Sound.createAsync(
        { uri: `${API_BASE}/tracks/${track.id}/stream` },
        { shouldPlay: true, volume: 0 },
      );
      soundRef.current = sound;

      // Kick off crossfade: new fades in, old fades out simultaneously
      if (oldSound) {
        fadeOutAndUnload(oldSound, oldVolume);
      }
      fadeIn(sound, volumeRef.current);

      // Auto-advance on track end
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          const list = trackList ?? tracksRef.current;
          if (list.length === 0) return;
          const next = (index + 1) % list.length;
          playTrackInner(list[next], next, list);
        }
      });
    } catch (e) {
      console.error('[Audius] playTrack error:', e);
      setError('Failed to play track');
      setIsPlaying(false);
    }
  };

  // ── Public API ──────────────────────────────────────────────────────────────

  const loadPlaylist = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    setLoadedPlaylistId(id);

    try {
      const res = await fetch(`${API_BASE}/playlists/${id}/tracks`);
      const { data } = await res.json();

      if (!data || data.length === 0) {
        setError('Playlist is empty');
        setIsLoading(false);
        return;
      }

      const shuffled = shuffle(data as AudiusTrack[]);
      setTracks(shuffled);
      tracksRef.current = shuffled;
      await playTrackInner(shuffled[0], 0, shuffled);
    } catch (e) {
      console.error('[Audius] loadPlaylist error:', e);
      setError('Failed to load playlist');
    }

    setIsLoading(false);
  }, []);

  const playTrack = useCallback((track: AudiusTrack, index: number) => {
    return playTrackInner(track, index);
  }, []);

  const togglePlayPause = useCallback(async () => {
    // Prevent overlapping calls (e.g. tapping rapidly while track is loading)
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    try {
      if (!soundRef.current) {
        const track = currentTrackRef.current;
        if (track) await playTrackInner(track, indexRef.current);
        return;
      }
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setIsPlaying(true);
        }
      }
    } finally {
      actionLockRef.current = false;
    }
  }, []); // stable — reads everything via refs

  const playNext = useCallback(() => {
    if (tracksRef.current.length === 0) return;
    const next = (indexRef.current + 1) % tracksRef.current.length;
    playTrackInner(tracksRef.current[next], next);
  }, []);

  const playPrev = useCallback(() => {
    if (tracksRef.current.length === 0) return;
    const prev = (indexRef.current - 1 + tracksRef.current.length) % tracksRef.current.length;
    playTrackInner(tracksRef.current[prev], prev);
  }, []);

  const stop = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null; // clear immediately so nothing else touches it
    if (sound) {
      try {
        await sound.stopAsync();
      } catch (_) { /* already stopped */ }
      try {
        await sound.unloadAsync();
      } catch (_) { /* already unloaded */ }
    }
    setIsPlaying(false);
  }, []);

  const setVolume = useCallback(async (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    volumeRef.current = clamped;
    if (soundRef.current) await soundRef.current.setVolumeAsync(clamped);
  }, []);

  return {
    tracks,
    currentTrack,
    currentIndex,
    isPlaying,
    isLoading,
    loadedPlaylistId,
    volume,
    error,
    loadPlaylist,
    playTrack,
    togglePlayPause,
    playNext,
    playPrev,
    stop,
    setVolume,
  };
}
