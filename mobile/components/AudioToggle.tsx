import { Pressable, Text } from 'react-native';
import { useAudio, SoundId } from '../lib/audio';

interface AudioToggleProps {
  /** Ambient track to play when toggling audio ON */
  ambientTrack?: SoundId;
  /** Additional className for positioning */
  className?: string;
}

/**
 * Reusable audio toggle button (🔊/🔇)
 * Place in top-right corner of screens that need audio control
 */
export function AudioToggle({ ambientTrack, className = '' }: AudioToggleProps) {
  const { enabled, toggle, unlock, playAmbient } = useAudio();

  return (
    <Pressable 
      className={`absolute top-12 right-4 z-10 p-2 ${className}`}
      onPress={async () => {
        unlock();
        const nowEnabled = await toggle();
        if (nowEnabled && ambientTrack) {
          playAmbient(ambientTrack);
        }
      }}
    >
      <Text className="text-xl">{enabled ? '🔊' : '🔇'}</Text>
    </Pressable>
  );
}
