import { useRef } from 'react';
import { View, Pressable, Text } from 'react-native';
import { useAudio, SoundId } from '../lib/audio';
import { useAudius } from '../lib/AudiusContext';

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
 * - Acts as a MASTER switch (all audio on/off)
 * - Keeps menu selections (SFX/music source) as preferences
 * - Pass onSettingsPress to show a ⚙ icon that opens audio settings
 */
export function AudioToggle({ ambientTrack, className = '', inline = false, onSettingsPress }: AudioToggleProps) {
  const { masterEnabled, ambientVolume, setAmbientVolume, toggle, unlock, playAmbient } = useAudio();
  const { setMasterEnabled } = useAudius();
  const preMuteVolumeRef = useRef(ambientVolume > 0 ? ambientVolume : 0.3);

  const wrapperClass = inline
    ? 'flex-row items-center gap-1'
    : 'absolute top-12 right-4 z-10 flex-row items-center gap-1';

  const handleToggle = async () => {
    unlock();

    // Mute should force game ambient volume to 0; unmute restores previous level.
    if (masterEnabled) {
      if (ambientVolume > 0) preMuteVolumeRef.current = ambientVolume;
      await setAmbientVolume(0);
    }

    const nowEnabled = await toggle();
    setMasterEnabled(nowEnabled);

    if (nowEnabled) {
      const restore = preMuteVolumeRef.current > 0 ? preMuteVolumeRef.current : 0.3;
      await setAmbientVolume(restore);
      if (ambientTrack) playAmbient(ambientTrack);
    }
  };

  return (
    <View className={`${wrapperClass} ${className}`}>
      <Pressable onPress={handleToggle} className="py-2 pl-2 pr-1" hitSlop={8}>
        <Text className={`text-xs font-mono text-center w-14 ${masterEnabled ? 'text-amber' : 'text-bone-dark'}`}>
          {masterEnabled ? '[SND]' : '[MUTE]'}
        </Text>
      </Pressable>

      {onSettingsPress && (
        <Pressable onPress={onSettingsPress} className="py-2 pl-0 pr-2" hitSlop={8}>
          <Text className="text-bone-dark text-xs font-mono">⚙</Text>
        </Pressable>
      )}
    </View>
  );
}
