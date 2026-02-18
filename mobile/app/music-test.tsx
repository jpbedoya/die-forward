import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { router } from 'expo-router';

// Types
interface AudiusTrack {
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

interface AudiusPlaylist {
  id: string;
  playlist_name: string;
  track_count: number;
  total_play_count: number;
  user: {
    name: string;
    handle: string;
  };
  artwork?: {
    '150x150'?: string;
    '480x480'?: string;
  };
}

// Curated playlists for gaming
const CURATED_PLAYLISTS = [
  { id: 'emQa2', name: 'Dungeon Synth', emoji: '🏰', vibe: 'Dark, atmospheric' },
  { id: 'DN6Pp', name: 'Gaming Arena', emoji: '🎮', vibe: 'High energy' },
  { id: 'nqZmb', name: 'Lo-Fi Nights', emoji: '🌙', vibe: 'Chill, 198 tracks' },
  { id: '3AA6Z', name: 'Dark Ambient', emoji: '🌑', vibe: 'Moody, intense' },
  { id: '5ON2AWX', name: 'Gaming Mix', emoji: '🕹️', vibe: '331 tracks' },
  { id: 'ebd1O', name: 'Lofi Road Trip', emoji: '🚗', vibe: 'Chill vibes' },
];

const API_BASE = 'https://api.audius.co/v1';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatPlays(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export default function MusicTestScreen() {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AudiusPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<AudiusPlaylist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<AudiusTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<AudiusTrack | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [error, setError] = useState<string | null>(null);
  
  const soundRef = useRef<Audio.Sound | null>(null);
  const positionInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Audio setup
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (positionInterval.current) {
        clearInterval(positionInterval.current);
      }
    };
  }, []);

  // Search playlists
  const searchPlaylists = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/playlists/search?query=${encodeURIComponent(searchQuery)}`);
      const { data } = await res.json();
      setSearchResults(data || []);
    } catch (e) {
      setError('Search failed');
      console.error(e);
    }
    setIsLoading(false);
  };

  // Load playlist tracks
  const loadPlaylist = async (playlist: AudiusPlaylist) => {
    setSelectedPlaylist(playlist);
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/playlists/${playlist.id}/tracks`);
      const { data } = await res.json();
      setPlaylistTracks(data || []);
      setCurrentIndex(0);
      if (data?.length > 0) {
        setCurrentTrack(data[0]);
      }
    } catch (e) {
      setError('Failed to load playlist');
      console.error(e);
    }
    setIsLoading(false);
  };

  // Load curated playlist by ID
  const loadCuratedPlaylist = async (id: string, name: string) => {
    const fakePlaylist: AudiusPlaylist = {
      id,
      playlist_name: name,
      track_count: 0,
      total_play_count: 0,
      user: { name: '', handle: '' },
    };
    await loadPlaylist(fakePlaylist);
  };

  // Play a track
  const playTrack = async (track: AudiusTrack, index: number) => {
    try {
      // Stop current sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      if (positionInterval.current) {
        clearInterval(positionInterval.current);
      }

      setCurrentTrack(track);
      setCurrentIndex(index);
      setIsPlaying(true);
      setPlaybackPosition(0);
      setError(null);

      const streamUrl = `${API_BASE}/tracks/${track.id}/stream`;
      console.log('Streaming:', streamUrl);

      const { sound } = await Audio.Sound.createAsync(
        { uri: streamUrl },
        { shouldPlay: true, volume }
      );
      soundRef.current = sound;

      // Track position
      positionInterval.current = setInterval(async () => {
        if (soundRef.current) {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            setPlaybackPosition(status.positionMillis / 1000);
            setPlaybackDuration(status.durationMillis ? status.durationMillis / 1000 : track.duration);
          }
        }
      }, 500);

      // Handle track end
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          playNext();
        }
      });
    } catch (e) {
      setError('Failed to play track');
      console.error('Play error:', e);
      setIsPlaying(false);
    }
  };

  // Play/Pause toggle
  const togglePlayPause = async () => {
    if (!soundRef.current) {
      if (currentTrack) {
        await playTrack(currentTrack, currentIndex);
      }
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
  };

  // Next track
  const playNext = () => {
    if (playlistTracks.length === 0) return;
    const nextIndex = (currentIndex + 1) % playlistTracks.length;
    playTrack(playlistTracks[nextIndex], nextIndex);
  };

  // Previous track
  const playPrev = () => {
    if (playlistTracks.length === 0) return;
    const prevIndex = (currentIndex - 1 + playlistTracks.length) % playlistTracks.length;
    playTrack(playlistTracks[prevIndex], prevIndex);
  };

  // Volume control
  const adjustVolume = async (delta: number) => {
    const newVol = Math.max(0, Math.min(1, volume + delta));
    setVolume(newVol);
    if (soundRef.current) {
      await soundRef.current.setVolumeAsync(newVol);
    }
  };

  // Shuffle playlist
  const shufflePlaylist = () => {
    const shuffled = [...playlistTracks].sort(() => Math.random() - 0.5);
    setPlaylistTracks(shuffled);
    if (shuffled.length > 0) {
      setCurrentTrack(shuffled[0]);
      setCurrentIndex(0);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0d0d0d' }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-stone-800">
        <Pressable onPress={() => router.back()}>
          <Text className="text-amber-500 font-mono">← BACK</Text>
        </Pressable>
        <Text className="text-amber-100 font-mono text-lg tracking-widest">🎵 AUDIUS TEST</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Search */}
        <View className="mt-4 mb-4">
          <Text className="text-stone-500 font-mono text-xs mb-2">SEARCH PLAYLISTS</Text>
          <View className="flex-row gap-2">
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="gaming, ambient, lofi..."
              placeholderTextColor="#666"
              onSubmitEditing={searchPlaylists}
              className="flex-1 bg-stone-900 border border-stone-700 px-3 py-2 text-amber-100 font-mono"
            />
            <Pressable
              onPress={searchPlaylists}
              className="bg-amber-600 px-4 py-2 justify-center"
            >
              <Text className="text-black font-mono font-bold">🔍</Text>
            </Pressable>
          </View>
        </View>

        {/* Curated Playlists */}
        <View className="mb-4">
          <Text className="text-stone-500 font-mono text-xs mb-2">CURATED FOR GAMING</Text>
          <View className="flex-row flex-wrap gap-2">
            {CURATED_PLAYLISTS.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => loadCuratedPlaylist(p.id, p.name)}
                className={`px-3 py-2 border ${
                  selectedPlaylist?.id === p.id
                    ? 'bg-amber-600 border-amber-500'
                    : 'bg-stone-900 border-stone-700'
                }`}
              >
                <Text className={`font-mono text-sm ${
                  selectedPlaylist?.id === p.id ? 'text-black' : 'text-amber-100'
                }`}>
                  {p.emoji} {p.name}
                </Text>
                <Text className="text-stone-500 font-mono text-xs">{p.vibe}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View className="mb-4">
            <Text className="text-stone-500 font-mono text-xs mb-2">SEARCH RESULTS</Text>
            {searchResults.slice(0, 5).map((playlist) => (
              <Pressable
                key={playlist.id}
                onPress={() => loadPlaylist(playlist)}
                className={`p-3 mb-2 border ${
                  selectedPlaylist?.id === playlist.id
                    ? 'bg-stone-800 border-amber-500'
                    : 'bg-stone-900 border-stone-700'
                }`}
              >
                <Text className="text-amber-100 font-mono">{playlist.playlist_name}</Text>
                <Text className="text-stone-500 font-mono text-xs">
                  {playlist.track_count} tracks • {formatPlays(playlist.total_play_count)} plays • @{playlist.user.handle}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Loading */}
        {isLoading && (
          <View className="py-8 items-center">
            <ActivityIndicator color="#f59e0b" />
            <Text className="text-stone-500 font-mono mt-2">Loading...</Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View className="bg-red-900/30 border border-red-700 p-3 mb-4">
            <Text className="text-red-400 font-mono text-sm">{error}</Text>
          </View>
        )}

        {/* Now Playing */}
        {currentTrack && (
          <View className="mb-4 bg-stone-900 border border-stone-700 p-4">
            <Text className="text-stone-500 font-mono text-xs mb-2">NOW PLAYING</Text>
            
            <View className="flex-row items-center gap-3 mb-3">
              {currentTrack.artwork?.['150x150'] && (
                <Image
                  source={{ uri: currentTrack.artwork['150x150'] }}
                  style={{ width: 60, height: 60 }}
                  className="bg-stone-800"
                />
              )}
              <View className="flex-1">
                <Text className="text-amber-100 font-mono text-lg" numberOfLines={1}>
                  {currentTrack.title}
                </Text>
                <Text className="text-stone-400 font-mono text-sm">
                  {currentTrack.user.name}
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <View className="mb-3">
              <View className="h-1 bg-stone-700 rounded-full overflow-hidden">
                <View
                  className="h-full bg-amber-500"
                  style={{
                    width: `${playbackDuration > 0 ? (playbackPosition / playbackDuration) * 100 : 0}%`,
                  }}
                />
              </View>
              <View className="flex-row justify-between mt-1">
                <Text className="text-stone-500 font-mono text-xs">
                  {formatDuration(Math.floor(playbackPosition))}
                </Text>
                <Text className="text-stone-500 font-mono text-xs">
                  {formatDuration(Math.floor(playbackDuration || currentTrack.duration))}
                </Text>
              </View>
            </View>

            {/* Controls */}
            <View className="flex-row items-center justify-center gap-4">
              <Pressable onPress={playPrev} className="p-3">
                <Text className="text-2xl">⏮️</Text>
              </Pressable>
              <Pressable
                onPress={togglePlayPause}
                className="bg-amber-600 w-16 h-16 rounded-full items-center justify-center"
              >
                <Text className="text-3xl">{isPlaying ? '⏸️' : '▶️'}</Text>
              </Pressable>
              <Pressable onPress={playNext} className="p-3">
                <Text className="text-2xl">⏭️</Text>
              </Pressable>
            </View>

            {/* Volume */}
            <View className="flex-row items-center justify-center gap-3 mt-4">
              <Pressable onPress={() => adjustVolume(-0.1)} className="p-2">
                <Text className="text-xl">🔉</Text>
              </Pressable>
              <View className="w-32 h-2 bg-stone-700 rounded-full overflow-hidden">
                <View
                  className="h-full bg-amber-500"
                  style={{ width: `${volume * 100}%` }}
                />
              </View>
              <Pressable onPress={() => adjustVolume(0.1)} className="p-2">
                <Text className="text-xl">🔊</Text>
              </Pressable>
              <Text className="text-stone-500 font-mono text-xs w-12">
                {Math.round(volume * 100)}%
              </Text>
            </View>
          </View>
        )}

        {/* Playlist Tracks */}
        {playlistTracks.length > 0 && (
          <View className="mb-8">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-stone-500 font-mono text-xs">
                TRACKS ({playlistTracks.length})
              </Text>
              <Pressable onPress={shufflePlaylist}>
                <Text className="text-amber-500 font-mono text-xs">🔀 SHUFFLE</Text>
              </Pressable>
            </View>
            
            {playlistTracks.map((track, index) => (
              <Pressable
                key={`${track.id}-${index}`}
                onPress={() => playTrack(track, index)}
                className={`flex-row items-center p-3 mb-1 border ${
                  currentTrack?.id === track.id && currentIndex === index
                    ? 'bg-amber-900/30 border-amber-600'
                    : 'bg-stone-900 border-stone-800'
                }`}
              >
                <Text className="text-stone-600 font-mono text-xs w-8">
                  {currentTrack?.id === track.id && currentIndex === index && isPlaying
                    ? '▶'
                    : String(index + 1).padStart(2, '0')}
                </Text>
                {track.artwork?.['150x150'] && (
                  <Image
                    source={{ uri: track.artwork['150x150'] }}
                    style={{ width: 40, height: 40 }}
                    className="bg-stone-800 mr-3"
                  />
                )}
                <View className="flex-1 mr-2">
                  <Text
                    className={`font-mono text-sm ${
                      currentTrack?.id === track.id ? 'text-amber-400' : 'text-amber-100'
                    }`}
                    numberOfLines={1}
                  >
                    {track.title}
                  </Text>
                  <Text className="text-stone-500 font-mono text-xs" numberOfLines={1}>
                    {track.user.name}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-stone-600 font-mono text-xs">
                    {formatDuration(track.duration)}
                  </Text>
                  <Text className="text-stone-700 font-mono text-xs">
                    {formatPlays(track.play_count)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Empty state */}
        {!isLoading && !selectedPlaylist && searchResults.length === 0 && (
          <View className="py-8 items-center">
            <Text className="text-4xl mb-4">🎧</Text>
            <Text className="text-stone-500 font-mono text-center">
              Select a playlist above or search{'\n'}to start sampling music
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Mini Player (fixed at bottom) */}
      {currentTrack && (
        <View className="absolute bottom-0 left-0 right-0 bg-stone-900 border-t border-stone-700 px-4 py-3 flex-row items-center">
          {currentTrack.artwork?.['150x150'] && (
            <Image
              source={{ uri: currentTrack.artwork['150x150'] }}
              style={{ width: 44, height: 44 }}
              className="bg-stone-800 mr-3"
            />
          )}
          <View className="flex-1 mr-3">
            <Text className="text-amber-100 font-mono text-sm" numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text className="text-stone-500 font-mono text-xs" numberOfLines={1}>
              {currentTrack.user.name}
            </Text>
          </View>
          <Pressable onPress={playPrev} className="p-2">
            <Text className="text-lg">⏮️</Text>
          </Pressable>
          <Pressable onPress={togglePlayPause} className="p-2 mx-1">
            <Text className="text-2xl">{isPlaying ? '⏸️' : '▶️'}</Text>
          </Pressable>
          <Pressable onPress={playNext} className="p-2">
            <Text className="text-lg">⏭️</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
