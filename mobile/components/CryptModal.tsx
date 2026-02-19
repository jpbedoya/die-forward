// CryptModal - Reusable modal component with consistent dark theme styling
import React from 'react';
import { View, Text, Pressable, Modal, ScrollView, Platform } from 'react-native';

interface CryptModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  closeButtonText?: string;
  maxWidth?: number;
}

export function CryptModal({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  closeButtonText = 'Close',
  maxWidth = 300,
}: CryptModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center">
        {/* Backdrop */}
        <Pressable 
          className="absolute inset-0 bg-black/80"
          onPress={onClose}
        />
        
        {/* Modal card */}
        <View 
          className="bg-crypt-surface border border-crypt-border p-4"
          style={{ 
            width: '85%', 
            maxWidth,
            maxHeight: '80%',
          }}
        >
          {/* Header */}
          {title && (
            <View className="flex-row items-center justify-between mb-4 pb-2 border-b border-crypt-border">
              <Text className="text-amber font-mono text-sm tracking-wider">{title}</Text>
              <Pressable onPress={onClose}>
                <Text className="text-bone-muted font-mono">[×]</Text>
              </Pressable>
            </View>
          )}

          {/* Content */}
          <ScrollView 
            style={{ maxHeight: Platform.OS === 'web' ? 400 : undefined }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {/* Close button */}
          {showCloseButton && (
            <Pressable 
              className="mt-4 py-3 border border-crypt-border items-center active:border-amber"
              onPress={onClose}
            >
              <Text className="text-bone-muted font-mono">{closeButtonText}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

// Preset for item details
interface ItemModalProps {
  visible: boolean;
  onClose: () => void;
  item: {
    name: string;
    emoji: string;
    description?: string;
    effect?: string;
  } | null;
}

export function ItemModal({ visible, onClose, item }: ItemModalProps) {
  if (!item) return null;
  
  return (
    <CryptModal
      visible={visible}
      onClose={onClose}
      title={`${item.emoji} ${item.name}`}
      showCloseButton={false}
    >
      <View>
        {/* Description */}
        {item.description && (
          <Text className="text-bone font-mono text-sm italic leading-5 mb-4">
            "{item.description}"
          </Text>
        )}
        
        {/* Effect */}
        {item.effect && (
          <View className="bg-crypt-bg border border-crypt-border p-3">
            <Text className="text-bone-dark font-mono text-xs tracking-wider mb-1">EFFECT</Text>
            <Text className="text-amber font-mono text-sm">{item.effect}</Text>
          </View>
        )}
      </View>
    </CryptModal>
  );
}
