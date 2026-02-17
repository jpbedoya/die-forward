import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Modal, Animated, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useGame } from '../lib/GameContext';
import { useAudio } from '../lib/audio';
import { useGameSettings } from '../lib/instant';
import { VictoryCard, ShareCardCapture, useShareCard } from '../lib/shareCard';
import { AudioToggle } from '../components/AudioToggle';

// ASCII sparkle component
const AsciiSparkle = ({ delay, x, y }: { delay: number; x: number; y: number }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const chars = ['+', '*', '·', '∙', '◇', '◆'];
  const [char] = useState(() => chars[Math.floor(Math.random() * chars.length)]);
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.2, duration: 500, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.8, duration: 400, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
          Animated.delay(Math.random() * 1000),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, []);
  
  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: x,
        top: y,
        color: '#f59e0b',
        fontSize: 14 + Math.random() * 10,
        opacity,
        fontFamily: 'monospace',
      }}
    >
      {char}
    </Animated.Text>
  );
};

// ASCII art for ESCAPED
const ESCAPED_ASCII = `
███████ ███████  ██████  █████  ██████  ███████ ██████  
██      ██      ██      ██   ██ ██   ██ ██      ██   ██ 
█████   ███████ ██      ███████ ██████  █████   ██   ██ 
██           ██ ██      ██   ██ ██      ██      ██   ██ 
███████ ███████  ██████ ██   ██ ██      ███████ ██████  `;

export default function VictoryScreen() {
  const game = useGame();
  const { playSFX, playAmbient } = useAudio();
  const { settings } = useGameSettings();
  const { viewShotRef, captureAndShare } = useShareCard();
  
  // Dramatic intro state
  const [showDramaticIntro, setShowDramaticIntro] = useState(true);
  const introFade = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0.5)).current;
  const glowPulse = useRef(new Animated.Value(1)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Use victory bonus from admin settings
  const bonusPercent = settings.victoryBonusPercent / 100;
  const victoryBonus = game.stakeAmount * bonusPercent;
  const totalReward = game.stakeAmount + victoryBonus;
  const isEmptyHanded = game.stakeAmount === 0;
  
  const handleShare = async () => {
    setSharing(true);
    playSFX('share-click');
    const shareMessage = isEmptyHanded 
      ? `I escaped Die Forward! No stake, just glory.`
      : `I escaped Die Forward and won ${totalReward.toFixed(3)} SOL!`;
    const success = await captureAndShare('Die Forward - Victory!', shareMessage);
    setSharing(false);
    if (success) {
      setShowShareModal(false);
    }
  };

  // Dramatic victory intro animation
  useEffect(() => {
    playAmbient('ambient-victory');
    playSFX('victory-fanfare');
    
    // Haptic celebration
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Double haptic for extra celebration
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300);
    }
    
    // Epic intro animation
    Animated.parallel([
      Animated.timing(introFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(textScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Pulsing glow effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
    
    // Transition to main content after 3 seconds
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
    }, 3000);
    
    return () => clearTimeout(timer);
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

  // Generate ASCII sparkles
  const sparkles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    delay: Math.random() * 2000,
    x: Math.random() * 350,
    y: Math.random() * 700,
  }));

  // Dramatic victory intro screen
  if (showDramaticIntro) {
    return (
      <View className="flex-1 bg-black justify-center items-center overflow-hidden">
        {/* ASCII Sparkles */}
        {sparkles.map(s => (
          <AsciiSparkle key={s.id} delay={s.delay} x={s.x} y={s.y} />
        ))}
        
        <Animated.View 
          className="items-center"
          style={{ opacity: introFade }}
        >
          <Animated.View style={{ transform: [{ scale: Animated.multiply(textScale, glowPulse) }] }} className="items-center">
            <Text className="text-amber font-mono text-xs mb-4 text-center">
              · · ◆ · ◆ · ◆ · ·
            </Text>
            <Text 
              className="font-mono text-[5px] text-victory text-center leading-[6px] mb-4"
              style={{ textShadowColor: '#22c55e', textShadowRadius: 15 }}
            >
              {ESCAPED_ASCII}
            </Text>
            <Text className="text-amber font-mono text-xs mb-6 text-center">
              · · ◆ · ◆ · ◆ · ·
            </Text>
            <Text className="text-bone text-base font-mono text-center mb-2">
              You conquered the depths!
            </Text>
            {!isEmptyHanded && (
              <Text className="text-amber-bright text-xl font-mono text-center font-bold">
                {totalReward.toFixed(3)} SOL
              </Text>
            )}
          </Animated.View>
        </Animated.View>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-crypt-bg">
      {/* Header with audio toggle */}
      <View className="flex-row items-center justify-end px-4 py-2">
        <AudioToggle ambientTrack="ambient-victory" inline />
      </View>

      <Animated.View style={{ flex: 1, opacity: contentFade }}>
      <ScrollView className="flex-1" contentContainerClassName="p-6">
        {/* Victory Header */}
        <View className="items-center mb-8">
          <Text className="text-6xl mb-4">🏆</Text>
          <Text className="text-victory text-2xl font-mono font-bold tracking-widest">ESCAPED</Text>
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
        {!isEmptyHanded ? (
          <View className="bg-victory/10 border-2 border-victory p-4 mb-6">
            <Text className="text-victory-light text-xs font-mono tracking-widest mb-4 text-center">
              YOUR REWARD
            </Text>
            
            <View className="items-center mb-4">
              <View className="flex-row items-baseline">
                <Text className="text-victory text-4xl font-mono font-bold">{totalReward.toFixed(3)}</Text>
              </View>
              <Text className="text-victory-light text-sm font-mono mt-1">SOL</Text>
            </View>
            
            <View className="bg-black/20 p-3 mb-4">
              <View className="flex-row justify-between mb-1">
                <Text className="text-bone-dark text-xs font-mono">Original Stake</Text>
                <Text className="text-bone text-xs font-mono">{game.stakeAmount}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-bone-dark text-xs font-mono">Victory Bonus ({settings.victoryBonusPercent}%)</Text>
                <Text className="text-victory text-xs font-mono">+{victoryBonus.toFixed(3)}</Text>
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
                <Text className="text-victory font-mono font-bold">REWARD CLAIMED</Text>
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
            className="bg-victory py-4 items-center active:bg-green-600"
            onPress={() => setShowShareModal(true)}
          >
            <Text className="text-crypt-bg font-mono font-bold tracking-widest">SHARE VICTORY</Text>
          </Pressable>
          
          <Pressable
            className="bg-amber py-4 items-center active:bg-amber-dark"
            onPress={handlePlayAgain}
          >
            <Text className="text-crypt-bg font-mono font-bold tracking-widest">PLAY AGAIN</Text>
          </Pressable>
          
          <Pressable
            className="border border-crypt-border-light py-4 items-center active:border-amber"
            onPress={handleHome}
          >
            <Text className="text-bone-muted font-mono">Return Home</Text>
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
            <Text className="text-victory text-lg font-mono font-bold text-center mb-4">Share Victory Card</Text>
            
            {/* Card Preview */}
            <View className="items-center mb-4">
              <ShareCardCapture viewShotRef={viewShotRef}>
                <VictoryCard 
                  data={{
                    playerName: game.walletAddress?.slice(0, 8) || 'Champion',
                    roomsCleared: game.dungeon?.length || 12,
                    stakeWon: totalReward,
                    enemiesDefeated: 4, // TODO: Track actual kills
                  }}
                />
              </ShareCardCapture>
            </View>
            
            <Pressable
              className={`py-4 items-center mb-3 ${sharing ? 'bg-victory/50' : 'bg-victory active:bg-green-600'}`}
              onPress={handleShare}
              disabled={sharing}
            >
              {sharing ? (
                <ActivityIndicator color="#0d0d0d" />
              ) : (
                <Text className="text-crypt-bg font-mono font-bold">SHARE</Text>
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
