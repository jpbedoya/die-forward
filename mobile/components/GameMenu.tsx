// GameMenu - In-game menu overlay with audio toggle and abandon run
import { useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { router } from 'expo-router';
import { useAudio } from '../lib/audio';
import { useGame } from '../lib/GameContext';
import { DieForwardLogo } from './DieForwardLogo';

interface GameMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GameMenu({ isOpen, onClose }: GameMenuProps) {
  const [confirmingAbandon, setConfirmingAbandon] = useState(false);
  const { enabled: audioEnabled, toggle: toggleAudio, unlock: unlockAudio } = useAudio();
  const game = useGame();

  const handleAbandon = () => {
    // Reset game state and go to death screen
    onClose();
    setConfirmingAbandon(false);
    router.replace({ 
      pathname: '/death', 
      params: { killedBy: 'Abandonment', abandoned: 'true' } 
    });
  };

  const handleToggleAudio = () => {
    unlockAudio();
    toggleAudio();
  };

  const formatAddress = (addr: string) => {
    if (!addr) return 'Not connected';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center">
        {/* Backdrop */}
        <Pressable 
          className="absolute inset-0 bg-black/80"
          onPress={() => {
            setConfirmingAbandon(false);
            onClose();
          }}
        />
        
        {/* Menu card */}
        <View className="bg-crypt-surface border border-crypt-border w-[85%] max-w-[300px] p-4">
          {/* Header */}
          <View className="items-center mb-4">
            <View className="flex-row items-start justify-between w-full">
              <View className="flex-1" />
              <DieForwardLogo size="tiny" />
              <View className="flex-1 items-end">
                <Pressable onPress={onClose}>
                  <Text className="text-bone-muted font-mono">[X]</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Wallet info */}
          {game.walletConnected && (
            <View className="mb-4">
              <Text className="text-bone-dark text-[10px] font-mono tracking-wider mb-1">CONNECTED</Text>
              <Text className="text-bone-muted text-xs font-mono">
                {formatAddress(game.walletAddress || '')}
              </Text>
            </View>
          )}

          {/* Audio toggle */}
          <Pressable 
            className="bg-crypt-bg border border-crypt-border px-3 py-3 mb-2 flex-row items-center justify-between"
            onPress={handleToggleAudio}
          >
            <Text className="text-bone-muted text-sm font-mono">Audio</Text>
            <Text className={`text-sm font-mono ${audioEnabled ? 'text-victory' : 'text-blood'}`}>
              {audioEnabled ? '♪ ON' : '♪ OFF'}
            </Text>
          </Pressable>

          {/* Abandon Run */}
          {!confirmingAbandon ? (
            <Pressable 
              className="bg-crypt-bg border border-blood/50 px-3 py-3"
              onPress={() => setConfirmingAbandon(true)}
            >
              <Text className="text-blood-light text-sm font-mono">☠ Abandon Run</Text>
            </Pressable>
          ) : (
            <View className="border border-blood/50 bg-blood/10 p-3">
              <Text className="text-bone-muted text-xs font-mono mb-3">
                Abandon run? {game.stakeAmount > 0 
                  ? `Your ${game.stakeAmount} SOL stake will be lost.`
                  : 'Your progress will be lost.'}
              </Text>
              <View className="flex-row gap-2">
                <Pressable 
                  className="flex-1 border border-crypt-border py-2 items-center"
                  onPress={() => setConfirmingAbandon(false)}
                >
                  <Text className="text-bone-muted text-xs font-mono">Nevermind</Text>
                </Pressable>
                <Pressable 
                  className="flex-1 bg-blood/30 border border-blood py-2 items-center"
                  onPress={handleAbandon}
                >
                  <Text className="text-blood-light text-xs font-mono font-bold">Abandon</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// Menu button component for headers
export function MenuButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="p-1">
      <Text className="text-bone-muted font-mono text-base">[≡]</Text>
    </Pressable>
  );
}
