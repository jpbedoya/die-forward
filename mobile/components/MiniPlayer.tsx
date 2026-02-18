// MiniPlayer — inline single-line row for game screen footers
// Drop inside any footer view; renders nothing when Audius is off
import { View, Text, Pressable } from 'react-native';
import { useAudius } from '../lib/AudiusContext';

export function MiniPlayer() {
  const { currentTrack, isPlaying, isLoading, togglePlayPause, playNext, musicSource } = useAudius();

  if (musicSource !== 'audius') return null;

  return (
    <View className="flex-row items-center border-t border-crypt-border pt-2 mt-1">
      <Text className="text-amber text-xs font-mono mr-2">♪</Text>
      <View className="flex-1 mr-2">
        {isLoading && !currentTrack ? (
          <Text className="text-stone-600 font-mono text-xs">Loading...</Text>
        ) : currentTrack ? (
          <Text className="text-bone-muted font-mono text-xs" numberOfLines={1}>
            {currentTrack.title}
            <Text className="text-stone-600"> · {currentTrack.user.name}</Text>
          </Text>
        ) : (
          <Text className="text-stone-600 font-mono text-xs">No track</Text>
        )}
      </View>
      <Pressable onPress={togglePlayPause} className="px-2" hitSlop={8}>
        <Text className="text-bone-dark font-mono text-xs">{isPlaying ? '[⏸]' : '[▶]'}</Text>
      </Pressable>
      <Pressable onPress={playNext} className="px-1" hitSlop={8}>
        <Text className="text-bone-dark font-mono text-xs">[⏭]</Text>
      </Pressable>
    </View>
  );
}
