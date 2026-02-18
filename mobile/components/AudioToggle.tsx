import { Pressable, Text } from 'react-native';
import { useAudio, SoundId } from '../lib/audio';

interface AudioToggleProps {
  /** Ambient track to play when toggling audio ON */
  ambientTrack?: SoundId;
  /** Additional className for positioning */
  className?: string;
  /** If true, renders inline (no absolute positioning) */
  inline?: boolean;
}

/**
 * Reusable audio toggle button (🔊/🔇)
 * Default: absolute positioned top-right
 * Use inline=true for header placement
 */
export function AudioToggle({ ambientTrack, className = '', inline = false }: AudioToggleProps) {
  const { enabled, toggle, unlock, playAmbient } = useAudio();

  const baseClass = inline 
    ? 'p-2' 
    : 'absolute top-12 right-4 z-10 p-2';

  return (
    <Pressable 
      className={`${baseClass} ${className}`}
      onPress={async () => {
        unlock();
        const nowEnabled = await toggle();
        if (nowEnabled && ambientTrack) {
          playAmbient(ambientTrack);
        }
      }}
    >
      <Text className={`text-xs font-mono ${enabled ? 'text-amber' : 'text-bone-dark'}`}>
        {enabled ? '[SND]' : '[MUTE]'}
      </Text>
    </Pressable>
  );
}
