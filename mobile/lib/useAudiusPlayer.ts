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
  { id: 'emQa2',   name: 'Dungeon Synth',  emoji: '🏰', vibe: 'Dark, atmospheric', trackCount: 21 },
  { id: 'DN6Pp',   name: 'Gaming Arena',   emoji: '🎮', vibe: 'High energy',        trackCount: 33 },
  { id: 'nqZmb',   name: 'Lo-Fi Nights',  emoji: '🌙', vibe: 'Chill',              trackCount: 198 },
  { id: '3AA6Z',   name: 'Dark Ambient',  emoji: '🌑', vibe: 'Moody, intense',     trackCount: 9 },
  { id: '5ON2AWX', name: 'Gaming Mix',    emoji: '🕹️', vibe: 'Variety',            trackCount: 331 },
  { id: 'ebd1O',   name: 'Lofi Road Trip', emoji: '🚗', vibe: 'Chill vibes',       trackCount: 112 },
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
  const loadRequestIdRef = useRef(0); // cancels stale async playlist loads

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
      clearFadeOuts();
      for (const sound of fadingSoundsRef.current) {
        try { sound.setOnPlaybackStatusUpdate(null); } catch {}
        try { sound.stopAsync(); } catch {}
        try { sound.unloadAsync(); } catch {}
      }
      fadingSoundsRef.current.clear();
      soundRef.current?.unloadAsync();
    };
  }, []);

  // ── Crossfade helpers ────────────────────────────────────────────────────────
  const CROSSFADE_MS   = 1500;
  const CROSSFADE_STEPS = 20;

  const crossfadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeOutIntervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set());
  const fadingSoundsRef = useRef<Set<Audio.Sound>>(new Set());

  const clearCrossfade = () => {
    if (crossfadeRef.current) {
      clearInterval(crossfadeRef.current);
      crossfadeRef.current = null;
    }
  };

  const clearFadeOuts = () => {
    for (const interval of fadeOutIntervalsRef.current) {
      clearInterval(interval);
    }
    fadeOutIntervalsRef.current.clear();
  };

  // Fade out + unload a sound we're done with
  const fadeOutAndUnload = (sound: Audio.Sound, fromVolume: number) => {
    fadingSoundsRef.current.add(sound);
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
        fadeOutIntervalsRef.current.delete(interval);
        try { sound.setOnPlaybackStatusUpdate(null); } catch {}
        try { await sound.stopAsync(); } catch {}
        try { await sound.unloadAsync(); } catch {}
        fadingSoundsRef.current.delete(sound);
      }
    }, stepMs);
    fadeOutIntervalsRef.current.add(interval);
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
      // Silence the old sound's callback FIRST — prevents it from spawning
      // another playTrackInner call while crossfade is in progress
      if (soundRef.current) {
        soundRef.current.setOnPlaybackStatusUpdate(null);
      }

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
    const requestId = ++loadRequestIdRef.current;
    setIsLoading(true);
    setError(null);
    setLoadedPlaylistId(id);

    try {
      const res = await fetch(`${API_BASE}/playlists/${id}/tracks`);
      const { data } = await res.json();

      // Ignore stale async responses (e.g. source switched to game/none)
      if (requestId !== loadRequestIdRef.current) return;

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
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsLoading(false);
      }
    }
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
    // Cancel any in-flight playlist load so stale fetches can't restart audio
    loadRequestIdRef.current++;

    const sound = soundRef.current;
    soundRef.current = null; // clear immediately so nothing else touches it
    if (sound) {
      try { sound.setOnPlaybackStatusUpdate(null); } catch (_) {}
      try { await sound.stopAsync(); } catch (_) { /* already stopped */ }
      try { await sound.unloadAsync(); } catch (_) { /* already unloaded */ }
    }

    clearCrossfade();
    clearFadeOuts();

    for (const fadingSound of fadingSoundsRef.current) {
      try { fadingSound.setOnPlaybackStatusUpdate(null); } catch (_) {}
      try { await fadingSound.stopAsync(); } catch (_) {}
      try { await fadingSound.unloadAsync(); } catch (_) {}
    }
    fadingSoundsRef.current.clear();

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
