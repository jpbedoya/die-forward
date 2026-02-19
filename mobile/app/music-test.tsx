// Music Test — dev screen for testing Audius integration
// Uses AudiusContext (same player as the rest of the game)
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAudius } from '../lib/AudiusContext';
import { useAudiusPlayer, CURATED_PLAYLISTS, AudiusTrack } from '../lib/useAudiusPlayer';
import { CRTOverlay } from '../components/CRTOverlay';

function TrackRow({
  track,
  index,
  isActive,
  onPress,
}: {
  track: AudiusTrack;
  index: number;
  isActive: boolean;
  onPress: () => void;
}) {
  const mins = Math.floor(track.duration / 60);
  const secs = String(track.duration % 60).padStart(2, '0');
  return (
    <Pressable
      className={`flex-row items-center py-2 px-3 mb-1 border-l-2 ${
        isActive ? 'border-amber bg-amber/10' : 'border-transparent active:border-crypt-border'
      }`}
      onPress={onPress}
    >
      <Text className={`text-xs font-mono mr-3 ${isActive ? 'text-amber' : 'text-bone-dark'}`}>
        {String(index + 1).padStart(2, '0')}
      </Text>
      <View className="flex-1">
        <Text
          className={`text-sm font-mono ${isActive ? 'text-amber' : 'text-bone'}`}
          numberOfLines={1}
        >
          {track.title}
        </Text>
        <Text className="text-bone-dark text-xs font-mono" numberOfLines={1}>
          {track.user.name}
        </Text>
      </View>
      <Text className="text-bone-dark text-xs font-mono ml-2">
        {mins}:{secs}
      </Text>
      {isActive && (
        <Text className="text-amber text-xs font-mono ml-2">♪</Text>
      )}
    </Pressable>
  );
}

export default function MusicTestScreen() {
  const audius = useAudius();
  // Own player instance for full track list + playlist loading
  const player = useAudiusPlayer();
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  const handleLoadPlaylist = async (id: string) => {
    setActivePlaylistId(id);
    await player.loadPlaylist(id);
  };

  const currentTrack = player.currentTrack ?? audius.currentTrack;
  const isPlaying = player.isPlaying || audius.isPlaying;

  return (
    <View
      style={
        Platform.OS === 'web'
          ? { height: '100dvh', maxHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
          : { flex: 1 }
      }
      className="bg-crypt-bg"
    >
      <SafeAreaView style={{ flex: 1, flexDirection: 'column', backgroundColor: '#0c0a09' }} edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-3 py-2 border-b border-amber/30">
          <Pressable onPress={() => router.back()} className="active:opacity-60">
            <Text className="text-amber font-mono text-sm">[← BACK]</Text>
          </Pressable>
          <Text className="text-amber font-mono text-xs tracking-widest">♪ MUSIC TEST</Text>
          <Text className="text-bone-dark font-mono text-xs">DEV</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* Now Playing */}
          <View className="bg-crypt-surface border border-crypt-border p-4 mb-6">
            <Text className="text-bone-dark text-xs font-mono tracking-widest mb-3">NOW PLAYING</Text>
            <View className="flex-row items-center gap-4">
              {currentTrack?.artwork?.['480x480'] ? (
                <Image
                  source={{ uri: currentTrack.artwork['480x480'] }}
                  style={{ width: 64, height: 64 }}
                  className="border border-crypt-border"
                />
              ) : (
                <View className="w-16 h-16 bg-crypt-bg border border-crypt-border items-center justify-center">
                  <Text className="text-2xl">🎵</Text>
                </View>
              )}
              <View className="flex-1">
                {currentTrack ? (
                  <>
                    <Text className="text-amber font-mono text-sm font-bold" numberOfLines={2}>
                      {currentTrack.title}
                    </Text>
                    <Text className="text-bone-muted font-mono text-xs mt-1">
                      {currentTrack.user.name}
                    </Text>
                    <Text className="text-bone-dark font-mono text-xs mt-1">
                      {Math.floor(currentTrack.duration / 60)}:{String(currentTrack.duration % 60).padStart(2, '0')}
                    </Text>
                  </>
                ) : (
                  <Text className="text-bone-dark font-mono text-sm italic">No track loaded</Text>
                )}
              </View>
            </View>

            {/* Controls */}
            <View className="flex-row items-center justify-center gap-4 mt-4">
              <Pressable
                className="border border-crypt-border py-2 px-4 active:border-amber active:bg-amber/10"
                onPress={player.playPrev}
              >
                <Text className="text-bone font-mono">|◄</Text>
              </Pressable>

              <Pressable
                className="border border-amber py-2 px-6 active:bg-amber/10"
                onPress={player.togglePlayPause}
                disabled={player.isLoading}
              >
                {player.isLoading ? (
                  <ActivityIndicator size="small" color="#f59e0b" />
                ) : (
                  <Text className="text-amber font-mono font-bold">
                    {player.isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
                  </Text>
                )}
              </Pressable>

              <Pressable
                className="border border-crypt-border py-2 px-4 active:border-amber active:bg-amber/10"
                onPress={player.playNext}
              >
                <Text className="text-bone font-mono">►|</Text>
              </Pressable>

              <Pressable
                className="border border-crypt-border py-2 px-4 active:border-blood active:bg-blood/10"
                onPress={player.stop}
              >
                <Text className="text-blood-light font-mono">■</Text>
              </Pressable>
            </View>

            {/* Volume */}
            <View className="flex-row items-center gap-3 mt-4">
              <Text className="text-bone-dark text-xs font-mono">VOL</Text>
              {[0.2, 0.4, 0.6, 0.8, 1.0].map((v) => (
                <Pressable
                  key={v}
                  className={`py-1 px-2 border ${
                    Math.abs(player.volume - v) < 0.05
                      ? 'border-amber bg-amber/20'
                      : 'border-crypt-border active:border-amber'
                  }`}
                  onPress={() => player.setVolume(v)}
                >
                  <Text className={`text-xs font-mono ${Math.abs(player.volume - v) < 0.05 ? 'text-amber' : 'text-bone-dark'}`}>
                    {Math.round(v * 100)}%
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Error */}
            {player.error && (
              <View className="mt-3 bg-blood/20 border border-blood p-2">
                <Text className="text-blood text-xs font-mono">⚠ {player.error}</Text>
              </View>
            )}
          </View>

          {/* Playlist picker */}
          <Text className="text-bone-dark text-xs font-mono tracking-widest mb-3">PLAYLISTS</Text>
          <View className="mb-6">
            {CURATED_PLAYLISTS.map((pl) => {
              const isActive = activePlaylistId === pl.id;
              return (
                <Pressable
                  key={pl.id}
                  className={`flex-row items-center justify-between border p-3 mb-2 ${
                    isActive ? 'border-amber bg-amber/10' : 'border-crypt-border active:border-amber active:bg-amber/5'
                  }`}
                  onPress={() => handleLoadPlaylist(pl.id)}
                  disabled={player.isLoading && isActive}
                >
                  <View className="flex-row items-center gap-3">
                    <Text className="text-xl">{pl.emoji}</Text>
                    <View>
                      <Text className={`font-mono text-sm ${isActive ? 'text-amber font-bold' : 'text-bone'}`}>
                        {pl.name}
                      </Text>
                      <Text className="text-bone-dark text-xs font-mono">
                        {pl.vibe} · {pl.trackCount} tracks
                      </Text>
                    </View>
                  </View>
                  {player.isLoading && isActive ? (
                    <ActivityIndicator size="small" color="#f59e0b" />
                  ) : isActive ? (
                    <Text className="text-amber text-xs font-mono">▶ ACTIVE</Text>
                  ) : (
                    <Text className="text-bone-dark text-xs font-mono">[load]</Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Track List */}
          {player.tracks.length > 0 && (
            <>
              <Text className="text-bone-dark text-xs font-mono tracking-widest mb-3">
                TRACK LIST ({player.tracks.length})
              </Text>
              <View className="bg-crypt-surface border border-crypt-border p-2 mb-6">
                {player.tracks.map((track, i) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={i}
                    isActive={player.currentIndex === i && player.isPlaying}
                    onPress={() => player.playTrack(track, i)}
                  />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
      <CRTOverlay />
    </View>
  );
}
