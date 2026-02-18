import { View, Pressable, Text } from 'react-native';
import { useAudio, SoundId } from '../lib/audio';

interface AudioToggleProps {
  /** Ambient track to play when toggling audio ON */
  ambientTrack?: SoundId;
  /** Additional className for the outer wrapper */
  className?: string;
  /** If true, renders inline (no absolute positioning) */
  inline?: boolean;
  /** When provided, shows a ⚙ button that calls this handler */
  onSettingsPress?: () => void;
}

/**
 * Reusable audio toggle button ([SND]/[MUTE]).
 * Pass onSettingsPress to show a ⚙ icon that opens audio settings.
 * Default: absolute positioned top-right.
 * Use inline=true for header placement.
 */
export function AudioToggle({ ambientTrack, className = '', inline = false, onSettingsPress }: AudioToggleProps) {
  const { enabled, toggle, unlock, playAmbient } = useAudio();

  const wrapperClass = inline
    ? 'flex-row items-center gap-1'
    : 'absolute top-12 right-4 z-10 flex-row items-center gap-1';

  const handleToggle = async () => {
    unlock();
    const nowEnabled = await toggle();
    if (nowEnabled && ambientTrack) {
      playAmbient(ambientTrack);
    }
  };

  return (
    <View className={`${wrapperClass} ${className}`}>
      <Pressable onPress={handleToggle} className="p-2" hitSlop={8}>
        <Text className={`text-xs font-mono ${enabled ? 'text-amber' : 'text-bone-dark'}`}>
          {enabled ? '[SND]' : '[MUTE]'}
        </Text>
      </Pressable>

      {onSettingsPress && (
        <Pressable onPress={onSettingsPress} className="p-2" hitSlop={8}>
          <Text className="text-bone-dark text-xs font-mono">⚙</Text>
        </Pressable>
      )}
    </View>
  );
}
