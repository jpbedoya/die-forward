import { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../lib/GameContext';
import { useAudio } from '../lib/audio';
import { useGameSettings } from '../lib/instant';

const STAKE_OPTIONS = [0.01, 0.05, 0.1, 0.25];

export default function StakeScreen() {
  const game = useGame();
  const { playSFX, playAmbient } = useAudio();
  const { settings } = useGameSettings();
  const [selectedStake, setSelectedStake] = useState(0.05);
  const [customStake, setCustomStake] = useState('');
  const [staking, setStaking] = useState(false);

  useEffect(() => {
    playAmbient('ambient-title');
  }, []);

  const handleConnect = async () => {
    playSFX('ui-click');
    await game.connect();
  };

  const handleStake = async (demoMode = false) => {
    setStaking(true);
    playSFX('confirm-action');
    
    try {
      await game.startGame(selectedStake, demoMode);
      playSFX('depth-descend');
      router.push('/play');
    } catch (err) {
      console.error('Failed to start game:', err);
      playSFX('error-buzz');
    } finally {
      setStaking(false);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-crypt-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-crypt-border">
        <Pressable onPress={() => router.back()}>
          <Text className="text-bone-muted text-sm font-mono">← BACK</Text>
        </Pressable>
        <Text className="text-amber text-base font-mono font-bold tracking-widest">THE TOLL</Text>
        <View className="w-[60px]" />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-5">
        {/* Error display */}
        {game.error && (
          <Pressable 
            className="bg-blood/20 border border-blood p-3 mb-4"
            onPress={game.clearError}
          >
            <Text className="text-blood-light text-sm font-mono">⚠️ {game.error}</Text>
            <Text className="text-bone-dark text-xs font-mono mt-1">Tap to dismiss</Text>
          </Pressable>
        )}

        {/* Warning */}
        <View className="bg-blood/10 border border-blood-dark p-4 mb-6">
          <Text className="text-blood-light text-sm font-mono leading-5">
            What you offer, the depths will hold. Die, and it's theirs. Escape, and claim more than you risked.
          </Text>
        </View>

        {/* Stake options */}
        <View className="mb-6">
          <Text className="text-bone-dark text-xs font-mono tracking-widest mb-3">CHOOSE YOUR OFFERING</Text>
          <View className="flex-row flex-wrap gap-2">
            {STAKE_OPTIONS.map((amount) => (
              <Pressable
                key={amount}
                className={`py-3 px-5 border ${
                  selectedStake === amount 
                    ? 'border-amber bg-amber/10' 
                    : 'border-crypt-border-light bg-crypt-surface'
                }`}
                onPress={() => {
                  playSFX('ui-click');
                  setSelectedStake(amount);
                  setCustomStake('');
                }}
              >
                <Text className={`font-mono text-base ${
                  selectedStake === amount ? 'text-amber-light' : 'text-bone-muted'
                }`}>
                  {amount}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Custom input */}
          <View className="mt-4">
            <Text className="text-stone-600 text-xs font-mono mb-2 italic">...or name your price</Text>
            <View className="flex-row items-center border border-crypt-border-light bg-crypt-surface px-3">
              <TextInput
                className="flex-1 text-bone text-lg font-mono py-3"
                value={customStake}
                onChangeText={(text) => {
                  setCustomStake(text);
                  const num = parseFloat(text);
                  if (!isNaN(num) && num > 0) {
                    setSelectedStake(num);
                  }
                }}
                placeholder="0.00"
                placeholderTextColor="#57534e"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        {/* Summary */}
        <View className="bg-crypt-surface border border-crypt-border p-4 mb-6">
          <View className="flex-row justify-between mb-2">
            <Text className="text-bone-dark text-sm font-mono">Your Offering</Text>
            <Text className="text-bone-muted text-sm font-mono">{selectedStake}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-bone-dark text-sm font-mono">If You Escape (+{settings.victoryBonusPercent}%)</Text>
            <Text className="text-victory text-sm font-mono">+{(selectedStake * settings.victoryBonusPercent / 100).toFixed(3)}</Text>
          </View>
          <View className="flex-row justify-between border-t border-crypt-border pt-3 mt-1">
            <Text className="text-bone-muted text-sm font-mono font-bold">Should You Survive</Text>
            <Text className="text-amber-light text-base font-mono font-bold">{(selectedStake * (1 + settings.victoryBonusPercent / 100)).toFixed(3)} SOL</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View className="gap-3 mb-4">
          {!game.walletConnected ? (
            <>
              <Pressable 
                className="bg-purple-700 py-5 items-center active:bg-purple-800"
                onPress={handleConnect}
                disabled={game.loading || staking}
              >
                {game.loading && !staking ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-white font-mono font-bold tracking-wider">BIND WALLET</Text>
                )}
              </Pressable>
              
              <Pressable 
                className="border border-crypt-border-light py-4 items-center active:border-amber"
                onPress={() => handleStake(true)}
                disabled={staking}
              >
                {staking ? (
                  <ActivityIndicator color="#a8a29e" />
                ) : (
                  <Text className="text-bone-muted font-mono">EMPTY-HANDED</Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Pressable 
                className={`py-5 items-center ${
                  staking || (game.balance !== null && game.balance < selectedStake)
                    ? 'bg-amber/50'
                    : 'bg-amber active:bg-amber-dark'
                }`}
                onPress={() => handleStake(false)}
                disabled={staking || (game.balance !== null && game.balance < selectedStake)}
              >
                {staking ? (
                  <ActivityIndicator color="#0d0d0d" />
                ) : (
                  <Text className="text-crypt-bg font-mono font-bold tracking-wider">SEAL YOUR FATE</Text>
                )}
              </Pressable>
              
              {game.balance !== null && game.balance < selectedStake && (
                <Text className="text-blood text-xs font-mono text-center">
                  Insufficient balance ({game.balance.toFixed(3)} SOL)
                </Text>
              )}
              
              <Pressable 
                className="border border-crypt-border-light py-4 items-center active:border-amber"
                onPress={() => handleStake(true)}
                disabled={staking}
              >
                <Text className="text-bone-muted font-mono">EMPTY-HANDED</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Wallet status */}
        {game.walletConnected && game.walletAddress && (
          <View className="flex-row items-center justify-center gap-3">
            <Text className="text-victory text-xs font-mono">✓ Connected</Text>
            <Text className="text-bone-dark text-xs font-mono">{formatAddress(game.walletAddress)}</Text>
            {game.balance !== null && (
              <Text className="text-amber-light text-xs font-mono font-bold">{game.balance.toFixed(3)} SOL</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
