import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../lib/GameContext';
import { useAudio } from '../lib/audio';
import { useGameSettings } from '../lib/instant';

export default function VictoryScreen() {
  const game = useGame();
  const { playSFX, playAmbient } = useAudio();
  const { settings } = useGameSettings();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  // Use victory bonus from admin settings
  const bonusPercent = settings.victoryBonusPercent / 100;
  const victoryBonus = game.stakeAmount * bonusPercent;
  const totalReward = game.stakeAmount + victoryBonus;

  useEffect(() => {
    playAmbient('ambient-victory');
    playSFX('victory-fanfare');
  }, []);

  const handleClaim = async () => {
    if (claiming || claimed) return;
    
    setClaiming(true);
    playSFX('confirm-action');
    
    try {
      await game.claimVictory();
      setClaimed(true);
      playSFX('tip-chime');
      // TODO: Get actual signature from claimVictory response
    } catch (e) {
      console.error('Failed to claim victory:', e);
    } finally {
      setClaiming(false);
    }
  };

  const handlePlayAgain = () => {
    playSFX('ui-click');
    router.replace('/stake');
  };

  const handleHome = () => {
    playSFX('ui-click');
    router.replace('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-crypt-bg">
      <ScrollView className="flex-1" contentContainerClassName="p-6">
        {/* Victory Header */}
        <View className="items-center mb-8">
          <Text className="text-6xl mb-4">🏆</Text>
          <Text className="text-victory text-2xl font-mono font-bold tracking-widest">VICTORY!</Text>
          <Text className="text-bone-muted text-sm font-mono mt-2">
            You escaped the depths
          </Text>
        </View>

        {/* Victory Stats */}
        <View className="bg-crypt-surface border border-victory/30 p-4 mb-6">
          <View className="flex-row justify-between mb-2">
            <Text className="text-bone-dark text-sm font-mono">Rooms Cleared</Text>
            <Text className="text-bone text-sm font-mono">{game.dungeon?.length || 12}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-bone-dark text-sm font-mono">Health Remaining</Text>
            <Text className={`text-sm font-mono ${game.health > 50 ? 'text-victory' : 'text-amber'}`}>
              {game.health}%
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-bone-dark text-sm font-mono">Items Found</Text>
            <Text className="text-ethereal text-sm font-mono">{game.inventory.length}</Text>
          </View>
        </View>

        {/* Reward Section */}
        {game.stakeAmount > 0 ? (
          <View className="bg-victory/10 border-2 border-victory p-4 mb-6">
            <Text className="text-victory-light text-xs font-mono tracking-widest mb-4 text-center">
              YOUR REWARD
            </Text>
            
            <View className="items-center mb-4">
              <View className="flex-row items-baseline">
                <Text className="text-victory text-4xl font-mono font-bold">◎ {totalReward.toFixed(3)}</Text>
              </View>
              <Text className="text-victory-light text-sm font-mono mt-1">SOL</Text>
            </View>
            
            <View className="bg-black/20 p-3 mb-4">
              <View className="flex-row justify-between mb-1">
                <Text className="text-bone-dark text-xs font-mono">Original Stake</Text>
                <Text className="text-bone text-xs font-mono">◎ {game.stakeAmount}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-bone-dark text-xs font-mono">Victory Bonus ({settings.victoryBonusPercent}%)</Text>
                <Text className="text-victory text-xs font-mono">+◎ {victoryBonus.toFixed(3)}</Text>
              </View>
            </View>

            {!claimed ? (
              <Pressable
                className={`py-4 items-center ${claiming ? 'bg-victory/50' : 'bg-victory active:bg-victory/80'}`}
                onPress={handleClaim}
                disabled={claiming}
              >
                {claiming ? (
                  <ActivityIndicator color="#0d0d0d" />
                ) : (
                  <Text className="text-crypt-bg font-mono font-bold">CLAIM REWARD</Text>
                )}
              </Pressable>
            ) : (
              <View className="bg-victory/20 py-4 items-center">
                <Text className="text-victory font-mono font-bold">✓ REWARD CLAIMED</Text>
                {signature && (
                  <Text className="text-victory-light text-xs font-mono mt-2">
                    TX: {signature.slice(0, 8)}...
                  </Text>
                )}
              </View>
            )}
          </View>
        ) : (
          <View className="bg-crypt-surface border border-crypt-border p-4 mb-6">
            <Text className="text-bone-muted text-sm font-mono text-center">
              Free play - no SOL at stake
            </Text>
            <Text className="text-amber text-sm font-mono text-center mt-2">
              Stake SOL next time to earn rewards!
            </Text>
          </View>
        )}

        {/* Inventory */}
        {game.inventory.length > 0 && (
          <View className="bg-crypt-surface border border-crypt-border p-4 mb-6">
            <Text className="text-bone-dark text-xs font-mono tracking-widest mb-3">ITEMS COLLECTED</Text>
            <View className="flex-row flex-wrap gap-2">
              {game.inventory.map((item) => (
                <View key={item.id} className="bg-crypt-bg border border-crypt-border-light py-1 px-2">
                  <Text className="text-bone text-xs font-mono">{item.emoji} {item.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Divider */}
        <Text className="text-crypt-border-light text-xs font-mono text-center mb-6">────────────────────────</Text>

        {/* Action Buttons */}
        <View className="gap-3">
          <Pressable
            className="bg-amber py-4 items-center active:bg-amber-dark"
            onPress={handlePlayAgain}
          >
            <Text className="text-crypt-bg font-mono font-bold tracking-widest">↻ PLAY AGAIN</Text>
          </Pressable>
          
          <Pressable
            className="border border-crypt-border-light py-4 items-center active:border-amber"
            onPress={handleHome}
          >
            <Text className="text-bone-muted font-mono">Return Home</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
