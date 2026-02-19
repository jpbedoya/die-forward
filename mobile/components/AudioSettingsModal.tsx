// AudioSettingsModal — lightweight music settings overlay for non-game screens
import { View, Text, Pressable } from 'react-native';
import { CryptModal } from './CryptModal';
import { AudioSettingsSection } from './AudioSettingsSection';

interface AudioSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AudioSettingsModal({ visible, onClose }: AudioSettingsModalProps) {
  return (
    <CryptModal visible={visible} onClose={onClose} showCloseButton={false} maxWidth={360}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-bone-muted font-mono text-sm tracking-widest flex-1 mr-2" numberOfLines={1}>AUDIO</Text>
        <Pressable onPress={onClose} className="p-1">
          <Text className="text-bone-muted font-mono">[×]</Text>
        </Pressable>
      </View>

      <AudioSettingsSection />
    </CryptModal>
  );
}
