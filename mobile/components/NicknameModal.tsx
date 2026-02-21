import { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, Modal, Platform } from 'react-native';

interface NicknameModalProps {
  visible: boolean;
  onSubmit: (name: string) => void;
  onSkip?: () => void;
  initialValue?: string;
}

export function NicknameModal({ visible, onSubmit, onSkip, initialValue }: NicknameModalProps) {
  const [name, setName] = useState(initialValue || '');

  // Sync initialValue when modal opens
  useEffect(() => {
    if (visible) {
      setName(initialValue || '');
    }
  }, [visible, initialValue]);

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit(name.trim());
      setName('');
    }
  };

  const isEditing = !!initialValue;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSkip}
    >
      <View className="flex-1 bg-black/85 justify-center items-center p-6">
        <View className="bg-crypt-bg border border-amber/30 w-full max-w-sm">
          {/* Header */}
          <View className="border-b border-amber/20 p-4">
            <Text className="text-amber text-lg font-mono font-bold text-center tracking-widest">
              {isEditing ? 'CHANGE YOUR NAME' : 'CHOOSE YOUR NAME'}
            </Text>
          </View>

          {/* Content */}
          <View className="p-5">
            <Text className="text-bone-muted text-sm font-mono text-center mb-6 leading-5">
              {isEditing ? 'The crypt will remember the change.' : 'How shall the crypt remember you?'}
            </Text>

            <TextInput
              className="bg-crypt-surface border border-crypt-border p-4 text-bone font-mono text-base mb-4 text-center"
              placeholder="Enter name..."
              placeholderTextColor="#57534e"
              value={name}
              onChangeText={(text) => setName(text.slice(0, 16))}
              maxLength={16}
              autoFocus={Platform.OS !== 'web'}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text className="text-bone-dark text-xs font-mono text-center mb-6">
              16 characters max
            </Text>

            <Pressable
              className={`py-4 items-center mb-3 ${name.trim() ? 'bg-amber active:bg-amber-dark' : 'bg-crypt-border'}`}
              onPress={handleSubmit}
              disabled={!name.trim()}
            >
              <Text className={`font-mono font-bold tracking-widest ${name.trim() ? 'text-crypt-bg' : 'text-bone-dark'}`}>
                {isEditing ? 'UPDATE' : 'CONFIRM'}
              </Text>
            </Pressable>

            {onSkip && (
              <Pressable
                className="py-3 items-center"
                onPress={onSkip}
              >
                <Text className="text-bone-muted font-mono text-sm">Skip for now</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
