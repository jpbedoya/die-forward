import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, Modal, Animated, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useGame } from '../lib/GameContext';
import { useAudio } from '../lib/audio';
import { getDeathMoment, getFinalWordsIntro, getDepthForRoom } from '../lib/content';
import { DeathCard, ShareCardCapture, useShareCard } from '../lib/shareCard';

export default function DeathScreen() {
  const game = useGame();
  const { playSFX, playAmbient, enabled: audioEnabled, toggle: toggleAudio, unlock: unlockAudio } = useAudio();
  const { viewShotRef, captureAndShare } = useShareCard();
  const params = useLocalSearchParams<{ killedBy?: string }>();
  
  // Dramatic intro state
  const [showDramaticIntro, setShowDramaticIntro] = useState(true);
  const introFade = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0.8)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  
  const [finalWords, setFinalWords] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [deathMoment] = useState(() => getDeathMoment());
  const [finalWordsIntro] = useState(() => getFinalWordsIntro());

  const roomNumber = (game.currentRoom || 0) + 1;
  const depth = getDepthForRoom(roomNumber);
  const isEmptyHanded = game.stakeAmount === 0;
  
  const handleShare = async () => {
    setSharing(true);
    playSFX('share-click');
    await captureAndShare('Die Forward - Death Card', `I died in Die Forward at room ${roomNumber}. ${finalWords}`);
    setSharing(false);
    setShowShareModal(false);
  };

  // Dramatic "YOU DIED" intro animation
  useEffect(() => {
    playAmbient('ambient-death');
    playSFX('player-death');
    
    // Haptic on death
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    
    // Fade in "YOU DIED" text
    Animated.parallel([
      Animated.timing(introFade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(textScale, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
    
    // After 2.5 seconds, transition to main content
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(introFade, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowDramaticIntro(false);
      });
    }, 2500);
    
    return () => clearTimeout(timer);
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

  // ASCII art for "YOU DIED"
  const YOU_DIED_ASCII = `
██    ██  ██████  ██    ██ 
 ██  ██  ██    ██ ██    ██ 
  ████   ██    ██ ██    ██ 
   ██    ██    ██ ██    ██ 
   ██     ██████   ██████  
                           
██████  ██ ███████ ██████  
██   ██ ██ ██      ██   ██ 
██   ██ ██ █████   ██   ██ 
██   ██ ██ ██      ██   ██ 
██████  ██ ███████ ██████  `;

  // Dramatic intro screen
  if (showDramaticIntro) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <Animated.View 
          className="items-center"
          style={{ opacity: introFade }}
        >
          <Animated.View style={{ transform: [{ scale: textScale }] }} className="items-center">
            <Text 
              className="font-mono text-[5px] text-blood text-center leading-[6px] mb-6"
              style={{ textShadowColor: '#991b1b', textShadowRadius: 20 }}
            >
              {YOU_DIED_ASCII}
            </Text>
            {params.killedBy && (
              <Text className="text-bone-muted text-base font-mono text-center mb-2">
                Slain by {params.killedBy}
              </Text>
            )}
            <Text className="text-bone-dark text-sm font-mono text-center">
              {depth.name} — Room {roomNumber}
            </Text>
          </Animated.View>
        </Animated.View>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-crypt-bg">
      {/* Sound Toggle - Top Right */}
      <Pressable 
        className="absolute top-12 right-4 z-10 p-2"
        onPress={async () => {
          unlockAudio();
          const nowEnabled = await toggleAudio();
          if (nowEnabled) {
            playAmbient('ambient-death');
          }
        }}
      >
        <Text className="text-xl">{audioEnabled ? '🔊' : '🔇'}</Text>
      </Pressable>

      <Animated.View style={{ flex: 1, opacity: contentFade }}>
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
            <Text className={`text-sm font-mono ${!isEmptyHanded ? 'text-blood' : 'text-bone-muted'}`}>
              {!isEmptyHanded ? `${game.stakeAmount} LOST` : 'FREE PLAY'}
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
                Your final words have been etched into the crypt
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
          {submitted && (
            <Pressable
              className="bg-ethereal py-4 items-center active:bg-purple-700"
              onPress={() => setShowShareModal(true)}
            >
              <Text className="text-white font-mono font-bold tracking-widest">SHARE DEATH CARD</Text>
            </Pressable>
          )}
          
          <Pressable
            className="bg-amber py-4 items-center active:bg-amber-dark"
            onPress={handlePlayAgain}
          >
            <Text className="text-crypt-bg font-mono font-bold tracking-widest">DESCEND AGAIN</Text>
          </Pressable>
          
          <Pressable
            className="border border-crypt-border-light py-4 items-center active:border-amber"
            onPress={handleHome}
          >
            <Text className="text-bone-muted font-mono">Return to Surface</Text>
          </Pressable>
        </View>
      </ScrollView>
      </Animated.View>
      
      {/* Share Card Modal */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View className="flex-1 bg-black/80 justify-center items-center p-4">
          <View className="bg-crypt-surface border border-crypt-border p-4 w-full max-w-[340px]">
            <Text className="text-amber text-lg font-mono font-bold text-center mb-4">Share Death Card</Text>
            
            {/* Card Preview */}
            <View className="items-center mb-4">
              <ShareCardCapture viewShotRef={viewShotRef}>
                <DeathCard 
                  data={{
                    playerName: game.walletAddress?.slice(0, 8) || 'Anonymous',
                    room: roomNumber,
                    totalRooms: game.dungeon?.length || 12,
                    killedBy: params.killedBy || null,
                    epitaph: finalWords || 'No final words...',
                    stakeLost: game.stakeAmount,
                  }}
                />
              </ShareCardCapture>
            </View>
            
            <Pressable
              className={`py-4 items-center mb-3 ${sharing ? 'bg-ethereal/50' : 'bg-ethereal active:bg-purple-700'}`}
              onPress={handleShare}
              disabled={sharing}
            >
              {sharing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-mono font-bold">SHARE</Text>
              )}
            </Pressable>
            
            <Pressable
              className="py-3 items-center"
              onPress={() => setShowShareModal(false)}
            >
              <Text className="text-bone-muted font-mono">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
