import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, Animated, Platform, ScrollView, Modal } from 'react-native';
import { CryptBackground } from '../components/CryptBackground';
import { router } from 'expo-router';
import { useAudio } from '../lib/audio';

// Animated gradient button decoration - constantly flows inward
function AnimatedDescendButton() {
  const { playSFX } = useAudio();
  const [frame, setFrame] = useState(0);
  
  // Gradient frames that continuously flow toward center (no reverse)
  const leftFrames = [
    '░░▒▒▓▓',
    '░░░▒▒▓',
    '░░░░▒▒',
    '░░░░░▒',
    '░░░░░░',
    '▒░░░░░',
    '▓▒░░░░',
    '▓▓▒░░░',
    '▓▓▓▒░░',
    '▓▓▓▓▒░',
  ];
  const rightFrames = [
    '▓▓▒▒░░',
    '▓▒▒░░░',
    '▒▒░░░░',
    '▒░░░░░',
    '░░░░░░',
    '░░░░░▒',
    '░░░░▒▓',
    '░░░▒▓▓',
    '░░▒▓▓▓',
    '░▒▓▓▓▓',
  ];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % leftFrames.length);
    }, 120);
    return () => clearInterval(interval);
  }, []);
  
  const handleDescend = () => {
    playSFX('depth-descend');
    router.push('/stake');
  };

  return (
    <Pressable 
      className="flex-row items-center py-3 active:opacity-80"
      onPress={handleDescend}
    >
      <Text className="text-amber font-mono text-sm">{leftFrames[frame]}</Text>
      <Text className="text-amber text-lg font-bold font-mono tracking-widest mx-2">
        DESCEND
      </Text>
      <Text className="text-amber font-mono text-sm">{rightFrames[frame]}</Text>
    </Pressable>
  );
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePoolStats, useDeathFeed, useLeaderboard, useGameSettings } from '../lib/instant';
import { DieForwardLogo } from '../components/DieForwardLogo';
import { AudioToggle } from '../components/AudioToggle';
import { AudioSettingsModal } from '../components/AudioSettingsModal';

import { CRTOverlay } from '../components/CRTOverlay';

export default function HomeScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<'echoes' | 'victors'>('echoes');
  const [showAllSheet, setShowAllSheet] = useState(false);
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Data hooks
  const { totalDeaths, isLoading: statsLoading } = usePoolStats();
  const { deaths: recentDeaths } = useDeathFeed(20);
  const { leaderboard: rawLeaderboard } = useLeaderboard(20);
  const { playAmbient, unlock: unlockAudio, ready: audioReady } = useAudio();
  const { settings } = useGameSettings();

  // Filter out empty leaderboard entries
  const leaderboard = rawLeaderboard.filter(p => p.name && p.name.trim() !== '');

  // Play title ambient once audio module is ready
  useEffect(() => {
    if (audioReady) {
      playAmbient('ambient-title');
    }
  }, [audioReady]);

  // Splash intro animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 2.5,
              duration: 350,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 350,
              useNativeDriver: true,
            }),
          ]).start(() => setShowSplash(false));
        }, 300);
      });
    });
  }, []);

  if (showSplash) {
    return (
      <CryptBackground screen="splash" noOverlay>
      <Pressable 
        className="flex-1"
        onPress={unlockAudio}
      >
        <CRTOverlay />
        <View className="flex-1 justify-center items-center">
          <Animated.View 
            style={{ 
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            }}
          >
            <DieForwardLogo size="large" showGlow glowColor="#f59e0b" />
          </Animated.View>
          <Text className="text-stone-600 text-xs font-mono mt-8">tap to enable sound</Text>
        </View>
      </Pressable>
      </CryptBackground>
    );
  }

  const displayedDeaths = recentDeaths.slice(0, 5);
  const displayedVictors = leaderboard.slice(0, 5);

  return (
    <CryptBackground screen="home">
    <SafeAreaView className="flex-1" edges={['top', 'left', 'right', 'bottom']}>
      <CRTOverlay />
      
      {/* Header with audio toggle */}
      <View className="flex-row items-center justify-end px-4 py-2">
        <AudioToggle ambientTrack="ambient-title" inline onSettingsPress={() => setAudioSettingsOpen(true)} />
      </View>
      <AudioSettingsModal visible={audioSettingsOpen} onClose={() => setAudioSettingsOpen(false)} />

      <View className="flex-1 px-4" style={Platform.OS === 'web' ? { paddingBottom: 20 } : undefined}>
        
        {/* Top spacer - pushes content down more */}
        <View className="flex-[3]" />

        {/* Main content: Logo + Tagline + CTA */}
        <View className="items-center">
          {/* Logo */}
          <DieForwardLogo size="large" showGlow glowColor="#f59e0b" />

          {/* Tagline */}
          <Text className="text-bone font-mono text-center italic mt-6 mb-12">
            Your death feeds the depths
          </Text>

          {/* Main CTA - animated gradient */}
          <AnimatedDescendButton />
        </View>

        {/* Spacer between CTA and Echoes */}
        <View className="flex-[2]" />

        {/* Echoes Section - anchored to bottom */}
        <View className="mb-4">
          {/* Header with tabs - no top decoration */}
          <View className="items-center mb-3">
            <View className="flex-row items-center gap-4">
              <Pressable onPress={() => setActiveTab('echoes')}>
                <Text className={`font-mono text-base tracking-widest ${
                  activeTab === 'echoes' ? 'text-ethereal' : 'text-bone-dark'
                }`}>
                  ECHOES
                </Text>
              </Pressable>
              {settings.showVictorsFeed && (
                <>
                  <Text className="text-crypt-border-light font-mono">◆</Text>
                  <Pressable onPress={() => setActiveTab('victors')}>
                    <Text className={`font-mono text-base tracking-widest ${
                      activeTab === 'victors' ? 'text-victory' : 'text-bone-dark'
                    }`}>
                      VICTORS
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>

          {/* Content - fixed height, centered */}
          <View className="px-2 items-center" style={{ minHeight: 130 }}>
            {activeTab === 'echoes' ? (
              // Echoes (Deaths)
              <View className="items-center">
                {displayedDeaths.length > 0 ? (
                  displayedDeaths.map((death, i) => (
                    <View key={death.id || i} className="py-1">
                      <Text className="text-xs text-bone-muted font-mono text-center" numberOfLines={1}>
                        <Text className="text-ethereal">@{death.playerName}</Text>
                        <Text className="text-bone-dark"> fell in </Text>
                        <Text className="text-bone-muted">{death.zone}</Text>
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-xs text-bone-dark font-mono italic text-center">
                    No echoes yet... be the first to fall.
                  </Text>
                )}
                {recentDeaths.length > 5 && (
                  <Pressable 
                    className="mt-2 py-1"
                    onPress={() => setShowAllSheet(true)}
                  >
                    <Text className="text-ethereal text-xs font-mono text-center">
                      [ listen deeper ]
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : (
              // Victors (Leaderboard)
              <View className="items-center w-full" style={{ maxWidth: 200 }}>
                {displayedVictors.length > 0 ? (
                  displayedVictors.map((player, i) => (
                    <View key={player.id || i} className="py-1 flex-row justify-between w-full">
                      <Text className="text-xs font-mono" numberOfLines={1}>
                        <Text className="text-victory">@{player.name}</Text>
                      </Text>
                      <Text className="text-xs font-mono text-amber">
                        D:{player.maxRoom || 0}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-xs text-bone-dark font-mono italic text-center">
                    None have escaped... yet.
                  </Text>
                )}
                {leaderboard.length > 5 && (
                  <Pressable 
                    className="mt-2 py-1"
                    onPress={() => setShowAllSheet(true)}
                  >
                    <Text className="text-victory text-xs font-mono text-center">
                      [ witness all ]
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* Bottom decoration */}
          <Text className="text-crypt-border-light font-mono text-xs text-center mt-3">░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░</Text>
        </View>
      </View>

      {/* "See All" Bottom Sheet */}
      <Modal
        visible={showAllSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAllSheet(false)}
      >
        <View className="flex-1 justify-end items-center">
          <Pressable 
            className="flex-1 w-full" 
            onPress={() => setShowAllSheet(false)} 
          />
          {/* Constrained width container */}
          <View 
            className="bg-crypt-surface border-t border-l border-r border-crypt-border rounded-t-xl w-full"
            style={{ 
              maxWidth: Platform.OS === 'web' ? 500 : undefined,
              maxHeight: '70%',
            }}
          >
            {/* Handle */}
            <View className="items-center py-3">
              <View className="w-10 h-1 bg-crypt-border-light rounded-full" />
            </View>
            
            {/* Header */}
            <View className="px-4 pb-2 border-b border-crypt-border">
              <Text className="text-bone font-mono font-bold text-center">
                {activeTab === 'echoes' ? '░▒▓ ECHOES ▓▒░' : '░▒▓ VICTORS ▓▒░'}
              </Text>
            </View>
            
            {/* Scrollable content */}
            <ScrollView className="px-4 py-2" style={{ maxHeight: 400 }}>
              {activeTab === 'echoes' ? (
                recentDeaths.map((death, i) => (
                  <View key={death.id || i} className="py-2 border-b border-crypt-border">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-ethereal text-sm font-mono">@{death.playerName}</Text>
                      <Text className="text-bone-dark text-xs font-mono">Room {death.room}</Text>
                    </View>
                    <Text className="text-bone-muted text-xs font-mono">
                      fell in {death.zone}
                    </Text>
                    {death.finalMessage && (
                      <Text className="text-bone-dark text-xs font-mono italic mt-1">
                        "{death.finalMessage}"
                      </Text>
                    )}
                  </View>
                ))
              ) : (
                leaderboard.map((player, i) => (
                  <View key={player.id || i} className="py-2 border-b border-crypt-border flex-row justify-between items-center">
                    <View>
                      <Text className="text-victory text-sm font-mono">@{player.name}</Text>
                      <Text className="text-bone-dark text-xs font-mono">
                        {player.wins || 0} escapes
                      </Text>
                    </View>
                    <Text className="text-amber font-mono font-bold">
                      D:{player.maxRoom || 0}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
            
            {/* Close button */}
            <Pressable 
              className="m-4 py-3 border border-crypt-border items-center"
              onPress={() => setShowAllSheet(false)}
            >
              <Text className="text-bone-muted font-mono">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </CryptBackground>
  );
}
