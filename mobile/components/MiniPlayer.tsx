// MiniPlayer — fixed bottom bar showing now-playing Audius track
// Renders only when musicSource === 'audius' and a track is loaded
import { View, Text, Pressable } from 'react-native';
import { useAudius } from '../lib/AudiusContext';

export function MiniPlayer() {
  const { currentTrack, isPlaying, isLoading, togglePlayPause, playNext, musicSource } = useAudius();

  if (musicSource !== 'audius') return null;

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-stone-950 border-t border-stone-700 px-4 py-2 flex-row items-center">
      <View className="flex-1 mr-2">
        {isLoading && !currentTrack ? (
          <Text className="text-stone-500 font-mono text-xs">Loading playlist...</Text>
        ) : currentTrack ? (
          <>
            <Text className="text-amber-100 font-mono text-xs" numberOfLines={1}>
              🎵 {currentTrack.title}
            </Text>
            <Text className="text-stone-500 font-mono text-xs" numberOfLines={1}>
              {currentTrack.user.name}
            </Text>
          </>
        ) : (
          <Text className="text-stone-600 font-mono text-xs">No track loaded</Text>
        )}
      </View>

      <Pressable onPress={togglePlayPause} className="p-2 mr-1" hitSlop={8}>
        <Text className="text-base">{isPlaying ? '⏸️' : '▶️'}</Text>
      </Pressable>
      <Pressable onPress={playNext} className="p-2" hitSlop={8}>
        <Text className="text-base">⏭️</Text>
      </Pressable>
    </View>
  );
}
