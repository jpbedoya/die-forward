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
  onUse?: () => void;
  item: {
    name: string;
    emoji: string;
    description?: string;
    effect?: string;
    type?: 'consumable' | 'weapon' | 'artifact';
  } | null;
}

interface CreatureModalProps {
  visible: boolean;
  onClose: () => void;
  creature: {
    name: string;
    emoji: string;
    tier: 1 | 2 | 3;
    health: { min: number; max: number };
    behaviors: string[];
    description: string;
  } | null;
}

export function ItemModal({ visible, onClose, onUse, item }: ItemModalProps) {
  if (!item) return null;
  const isConsumable = item.type === 'consumable';

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
          <Text className="text-amber font-mono text-sm mb-4">{item.effect}</Text>
        )}

        {/* USE button for consumables */}
        {isConsumable && onUse && (
          <Pressable
            className="bg-victory active:bg-green-600 py-3 items-center mt-2"
            onPress={() => { onUse(); onClose(); }}
          >
            <Text className="text-crypt-bg font-mono font-bold text-sm">USE</Text>
          </Pressable>
        )}
      </View>
    </CryptModal>
  );
}

export function CreatureModal({ visible, onClose, creature }: CreatureModalProps) {
  if (!creature) return null;

  return (
    <CryptModal
      visible={visible}
      onClose={onClose}
      title={`${creature.emoji} ${creature.name}`}
      showCloseButton={false}
    >
      <View className="bg-crypt-bg border border-crypt-border p-4">
        {/* Tier + HP on one line */}
        <View className="flex-row gap-6 mb-3">
          <View>
            <Text className="text-bone-dark font-mono text-xs tracking-wider mb-1">TIER</Text>
            <Text className="text-amber font-mono text-sm">{creature.tier}</Text>
          </View>
          <View>
            <Text className="text-bone-dark font-mono text-xs tracking-wider mb-1">HP</Text>
            <Text className="text-blood-light font-mono text-sm">{creature.health.min}–{creature.health.max}</Text>
          </View>
        </View>

        {/* Divider */}
        <View className="border-t border-crypt-border mb-3" />

        {/* Traits */}
        <View className="flex-row flex-wrap mb-3">
          {creature.behaviors.map((b) => (
            <View key={b} className="border border-crypt-border px-2 py-1 mr-2 mb-2">
              <Text className="text-ethereal text-xs font-mono">{b}</Text>
            </View>
          ))}
        </View>

        {/* Description */}
        <Text className="text-bone font-mono text-sm italic leading-5">{creature.description}</Text>
      </View>
    </CryptModal>
  );
}
