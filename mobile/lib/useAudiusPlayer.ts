// Audius music player hook — unified on expo-audio (native) + HTMLAudio (web)
import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';

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
  { id: 'emQa2', name: 'Dungeon Synth', emoji: '🏰', vibe: 'Dark, atmospheric', trackCount: 21 },
  { id: 'DN6Pp', name: 'Gaming Arena', emoji: '🎮', vibe: 'High energy', trackCount: 33 },
  { id: 'nqZmb', name: 'Lo-Fi Nights', emoji: '🌙', vibe: 'Chill', trackCount: 198 },
  { id: '3AA6Z', name: 'Dark Ambient', emoji: '🌑', vibe: 'Moody, intense', trackCount: 9 },
  { id: '5ON2AWX', name: 'Gaming Mix', emoji: '🕹️', vibe: 'Variety', trackCount: 331 },
  { id: 'ebd1O', name: 'Lofi Road Trip', emoji: '🚗', vibe: 'Chill vibes', trackCount: 112 },
] as const;

export type CuratedPlaylistId = typeof CURATED_PLAYLISTS[number]['id'];

const API_BASE = 'https://api.audius.co/v1';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// expo-audio (native only)
let NativeAudioModule: any = null;
let nativeSetAudioModeAsync: any = null;

async function loadNativeAudio() {
  if (Platform.OS === 'web') return;
  if (NativeAudioModule) return;
  // Must use AudioModule directly — AudioPlayer is not a top-level expo-audio export
  const audioModMod = await import('expo-audio/build/AudioModule');
  NativeAudioModule = audioModMod.default; // requireNativeModule('ExpoAudio') — has .AudioPlayer
  const expoAudio = await import('expo-audio');
  nativeSetAudioModeAsync = expoAudio.setAudioModeAsync;
}

type Player = {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  unload: () => Promise<void>;
  setVolume: (v: number) => Promise<void>;
  setOnEnded: (cb: (() => void) | null) => void;
};

export function useAudiusPlayer() {
  const [tracks, setTracks] = useState<AudiusTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<AudiusTrack | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedPlaylistId, setLoadedPlaylistId] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.7);
  const [error, setError] = useState<string | null>(null);

  const soundRef = useRef<Player | null>(null);
  const tracksRef = useRef<AudiusTrack[]>([]);
  const indexRef = useRef(0);
  const volumeRef = useRef(0.7);
  const currentTrackRef = useRef<AudiusTrack | null>(null);
  const actionLockRef = useRef(false);
  const loadRequestIdRef = useRef(0);

  const crossfadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeOutIntervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set());
  const fadingSoundsRef = useRef<Set<Player>>(new Set());

  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { indexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);

  const clearCrossfade = () => {
    if (crossfadeRef.current) {
      clearInterval(crossfadeRef.current);
      crossfadeRef.current = null;
    }
  };

  const clearFadeOuts = () => {
    for (const interval of fadeOutIntervalsRef.current) clearInterval(interval);
    fadeOutIntervalsRef.current.clear();
  };

  const createStreamPlayer = useCallback(async (uri: string, initialVolume: number): Promise<Player> => {
    if (Platform.OS === 'web') {
      const audio = new Audio(uri);
      audio.preload = 'auto';
      audio.volume = initialVolume;
      return {
        play: async () => { try { await audio.play(); } catch {} },
        pause: async () => { audio.pause(); },
        stop: async () => { audio.pause(); audio.currentTime = 0; },
        unload: async () => { audio.pause(); audio.src = ''; },
        setVolume: async (v: number) => { audio.volume = v; },
        setOnEnded: (cb) => { audio.onended = cb; },
      };
    }

    await loadNativeAudio();
    const p = new NativeAudioModule.AudioPlayer({ uri }, 100, false);
    p.loop = false;
    p.volume = initialVolume;

    let sub: any = null;
    return {
      play: async () => { p.play(); },
      pause: async () => { p.pause(); },
      stop: async () => { p.pause(); },
      unload: async () => {
        try { p.pause(); } catch {}
        try { p.remove(); } catch {}
      },
      setVolume: async (v: number) => { p.volume = v; },
      setOnEnded: (cb) => {
        try { sub?.remove?.(); } catch {}
        sub = null;
        if (!cb) return;
        sub = p.addListener?.('playbackStatusUpdate', (status: any) => {
          if (status?.didJustFinish || (!status?.playing && status?.duration && status?.currentTime >= status.duration - 0.05)) {
            cb();
          }
        });
      },
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      loadNativeAudio().then(async () => {
        if (nativeSetAudioModeAsync) {
          await nativeSetAudioModeAsync({
            playsInSilentMode: true,
            interruptionMode: 'duckOthers',
            shouldPlayInBackground: false,
          });
        }
      }).catch(() => {});
    }

    return () => {
      clearCrossfade();
      clearFadeOuts();
      for (const s of fadingSoundsRef.current) {
        try { s.setOnEnded(null); } catch {}
        try { s.stop(); } catch {}
        try { s.unload(); } catch {}
      }
      fadingSoundsRef.current.clear();
      soundRef.current?.setOnEnded(null);
      soundRef.current?.unload();
    };
  }, []);

  const fadeOutAndUnload = (sound: Player, fromVolume: number) => {
    fadingSoundsRef.current.add(sound);
    const steps = 20;
    const stepMs = 500 / steps;
    let step = 0;
    const interval = setInterval(async () => {
      step++;
      await sound.setVolume(Math.max(0, fromVolume * (1 - step / steps)));
      if (step >= steps) {
        clearInterval(interval);
        fadeOutIntervalsRef.current.delete(interval);
        try { sound.setOnEnded(null); } catch {}
        try { await sound.stop(); } catch {}
        try { await sound.unload(); } catch {}
        fadingSoundsRef.current.delete(sound);
      }
    }, stepMs);
    fadeOutIntervalsRef.current.add(interval);
  };

  const fadeIn = (sound: Player, targetVolume: number) => {
    const steps = 20;
    const stepMs = 500 / steps;
    let step = 0;
    clearCrossfade();
    crossfadeRef.current = setInterval(async () => {
      step++;
      await sound.setVolume(Math.min(targetVolume, targetVolume * (step / steps)));
      if (step >= steps) clearCrossfade();
    }, stepMs);
  };

  const playTrackInner = async (
    track: AudiusTrack,
    index: number,
    trackList?: AudiusTrack[],
    options?: { immediateSwitch?: boolean },
  ) => {
    try {
      if (soundRef.current) soundRef.current.setOnEnded(null);
      const oldSound = soundRef.current;
      const oldVolume = volumeRef.current;
      soundRef.current = null;
      clearCrossfade();

      if (options?.immediateSwitch && oldSound) {
        await oldSound.stop();
        await oldSound.unload();
      }

      setCurrentTrack(track);
      setCurrentIndex(index);
      setIsPlaying(true);
      setError(null);

      const streamUrl = `${API_BASE}/tracks/${track.id}/stream`;
      const newSound = await createStreamPlayer(streamUrl, options?.immediateSwitch ? volumeRef.current : 0);
      soundRef.current = newSound;
      await newSound.play();

      if (options?.immediateSwitch) {
        await newSound.setVolume(volumeRef.current);
      } else {
        if (oldSound) fadeOutAndUnload(oldSound, oldVolume);
        fadeIn(newSound, volumeRef.current);
      }

      newSound.setOnEnded(() => {
        const list = trackList ?? tracksRef.current;
        if (list.length === 0) return;
        const next = (index + 1) % list.length;
        playTrackInner(list[next], next, list);
      });
    } catch (e) {
      console.error('[Audius] playTrack error:', e);
      setError('Failed to play track');
      setIsPlaying(false);
    }
  };

  const loadPlaylist = useCallback(async (id: string) => {
    const requestId = ++loadRequestIdRef.current;
    setIsLoading(true);
    setError(null);
    setLoadedPlaylistId(id);

    try {
      const res = await fetch(`${API_BASE}/playlists/${id}/tracks`);
      const { data } = await res.json();
      if (requestId !== loadRequestIdRef.current) return;

      if (!data || data.length === 0) {
        setError('Playlist is empty');
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
      if (requestId === loadRequestIdRef.current) setIsLoading(false);
    }
  }, []);

  const playTrack = useCallback((track: AudiusTrack, index: number) => {
    return playTrackInner(track, index, undefined, { immediateSwitch: true });
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    try {
      if (!soundRef.current) {
        const track = currentTrackRef.current;
        if (track) await playTrackInner(track, indexRef.current);
        return;
      }

      if (isPlaying) {
        await soundRef.current.pause();
        setIsPlaying(false);
      } else {
        await soundRef.current.play();
        setIsPlaying(true);
      }
    } finally {
      actionLockRef.current = false;
    }
  }, [isPlaying]);

  const playNext = useCallback(() => {
    if (tracksRef.current.length === 0) return;
    const next = (indexRef.current + 1) % tracksRef.current.length;
    playTrackInner(tracksRef.current[next], next, undefined, { immediateSwitch: true });
  }, []);

  const playPrev = useCallback(() => {
    if (tracksRef.current.length === 0) return;
    const prev = (indexRef.current - 1 + tracksRef.current.length) % tracksRef.current.length;
    playTrackInner(tracksRef.current[prev], prev, undefined, { immediateSwitch: true });
  }, []);

  const stop = useCallback(async () => {
    loadRequestIdRef.current++;
    const s = soundRef.current;
    soundRef.current = null;

    if (s) {
      try { s.setOnEnded(null); } catch {}
      try { await s.stop(); } catch {}
      try { await s.unload(); } catch {}
    }

    clearCrossfade();
    clearFadeOuts();

    for (const fading of fadingSoundsRef.current) {
      try { fading.setOnEnded(null); } catch {}
      try { await fading.stop(); } catch {}
      try { await fading.unload(); } catch {}
    }
    fadingSoundsRef.current.clear();

    setIsPlaying(false);
  }, []);

  const setVolume = useCallback(async (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    volumeRef.current = clamped;
    if (soundRef.current) await soundRef.current.setVolume(clamped);
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
