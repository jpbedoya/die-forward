// MiniPlayer — inline single-line row for game screen footers
// Drop inside any footer view; renders nothing when Audius is off
import { View, Text, Pressable } from 'react-native';
import { useAudius } from '../lib/AudiusContext';
import { AsciiLoader } from './AsciiLoader';

export function MiniPlayer() {
  const { currentTrack, isPlaying, isLoading, togglePlayPause, playNext, musicSource } = useAudius();

  if (musicSource !== 'audius') return null;

  return (
    <View className="flex-row items-center border-t border-crypt-border pt-2 mt-1">
      <Text className="text-amber text-xs font-mono mr-2">♪</Text>
      <View className="flex-1 mr-2">
        {isLoading && !currentTrack ? (
          <AsciiLoader variant="pulse" color="#57534e" style={{ fontSize: 12 }} />
        ) : currentTrack ? (
          <Text className="text-bone-muted font-mono text-xs" numberOfLines={1}>
            {currentTrack.title}
            <Text className="text-stone-600"> · {currentTrack.user.name}</Text>
          </Text>
        ) : (
          <Text className="text-stone-600 font-mono text-xs">No track</Text>
        )}
      </View>
      <Pressable
        onPress={togglePlayPause}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 8 }}
        style={{ paddingHorizontal: 12, height: 28, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontSize: 14, lineHeight: 16, color: '#a8a29e' }}>
          {isPlaying ? '⏸' : '▶'}
        </Text>
      </Pressable>
      <Pressable
        onPress={playNext}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
        style={{ paddingHorizontal: 12, height: 28, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontSize: 14, lineHeight: 16, color: '#a8a29e' }}>⏭</Text>
      </Pressable>
    </View>
  );
}
