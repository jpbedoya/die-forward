import { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../lib/GameContext';
import { useAudio } from '../lib/audio';
import { getDeathMoment, getFinalWordsIntro, getDepthForRoom } from '../lib/content';

export default function DeathScreen() {
  const game = useGame();
  const { playSFX, playAmbient } = useAudio();
  const params = useLocalSearchParams<{ killedBy?: string }>();
  
  const [finalWords, setFinalWords] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deathMoment] = useState(() => getDeathMoment());
  const [finalWordsIntro] = useState(() => getFinalWordsIntro());

  const roomNumber = (game.currentRoom || 0) + 1;
  const depth = getDepthForRoom(roomNumber);

  useEffect(() => {
    playAmbient('ambient-death');
    playSFX('player-death');
  }, []);

  const handleSubmit = async () => {
    if (!finalWords.trim() || submitting) return;
    
    setSubmitting(true);
    playSFX('confirm-action');
    
    try {
      await game.recordDeath(finalWords.trim(), params.killedBy);
      setSubmitted(true);
    } catch (e) {
      console.error('Failed to record death:', e);
      setSubmitted(true); // Still mark as submitted to allow continuing
    } finally {
      setSubmitting(false);
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
        {/* Death Header */}
        <View className="items-center mb-8">
          <Text className="text-6xl mb-4">💀</Text>
          <Text className="text-blood text-2xl font-mono font-bold tracking-widest">YOU DIED</Text>
          {params.killedBy && (
            <Text className="text-bone-muted text-sm font-mono mt-2">
              Slain by {params.killedBy}
            </Text>
          )}
        </View>

        {/* Death Stats */}
        <View className="bg-crypt-surface border border-crypt-border p-4 mb-6">
          <View className="flex-row justify-between mb-2">
            <Text className="text-bone-dark text-sm font-mono">Depth Reached</Text>
            <Text className="text-ethereal text-sm font-mono">{depth.name}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-bone-dark text-sm font-mono">Room</Text>
            <Text className="text-bone text-sm font-mono">{roomNumber}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-bone-dark text-sm font-mono">SOL Staked</Text>
            <Text className={`text-sm font-mono ${game.stakeAmount > 0 ? 'text-blood' : 'text-bone-muted'}`}>
              {game.stakeAmount > 0 ? `◎ ${game.stakeAmount} LOST` : 'FREE PLAY'}
            </Text>
          </View>
        </View>

        {/* Death Moment */}
        <View className="mb-6">
          <Text className="text-bone text-base font-mono italic leading-6 text-center">
            "{deathMoment}"
          </Text>
        </View>

        {/* Final Words Input */}
        {!submitted ? (
          <View className="mb-6">
            <Text className="text-bone-muted text-sm font-mono mb-3 text-center">
              {finalWordsIntro}
            </Text>
            <TextInput
              className="bg-crypt-surface border border-crypt-border p-4 text-bone font-mono text-base mb-4"
              placeholder="Your final words..."
              placeholderTextColor="#57534e"
              value={finalWords}
              onChangeText={setFinalWords}
              multiline
              maxLength={140}
              autoFocus
            />
            <Pressable
              className={`py-4 items-center ${finalWords.trim() ? 'bg-blood active:bg-blood-dark' : 'bg-crypt-border'}`}
              onPress={handleSubmit}
              disabled={!finalWords.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className={`font-mono font-bold ${finalWords.trim() ? 'text-white' : 'text-bone-dark'}`}>
                  LEAVE YOUR MARK
                </Text>
              )}
            </Pressable>
            <Text className="text-bone-dark text-xs font-mono text-center mt-2">
              Your words will be found by other explorers
            </Text>
          </View>
        ) : (
          <View className="mb-6">
            <View className="bg-ethereal/20 border border-ethereal p-4 mb-4">
              <Text className="text-ethereal text-sm font-mono text-center">
                ✓ Your final words have been etched into the crypt
              </Text>
            </View>
            <View className="bg-crypt-surface border-l-2 border-ethereal p-4">
              <Text className="text-bone font-mono italic">"{finalWords}"</Text>
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
            <Text className="text-crypt-bg font-mono font-bold tracking-widest">↻ DESCEND AGAIN</Text>
          </Pressable>
          
          <Pressable
            className="border border-crypt-border-light py-4 items-center active:border-amber"
            onPress={handleHome}
          >
            <Text className="text-bone-muted font-mono">Return to Surface</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
