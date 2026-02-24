import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { BlurView } from 'expo-blur';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { CryptBackground } from '../components/CryptBackground';
import { router } from 'expo-router';
import { useAudio } from '../lib/audio';

// Animated gradient button decoration - constantly flows inward
function AnimatedDescendButton() {
  const { playSFX } = useAudio();
  const [frame, setFrame] = useState(0);
  
  const leftFrames = [
    '░░▒▒▓▓', '░░░▒▒▓', '░░░░▒▒', '░░░░░▒',
    '░░░░░░', '▒░░░░░', '▓▒░░░░', '▓▓▒░░░',
    '▓▓▓▒░░', '▓▓▓▓▒░',
  ];
  const rightFrames = [
    '▓▓▒▒░░', '▓▒▒░░░', '▒▒░░░░', '▒░░░░░',
    '░░░░░░', '░░░░░▒', '░░░░▒▓', '░░░▒▓▓',
    '░░▒▓▓▓', '░▒▓▓▓▓',
  ];
  
  useEffect(() => {
    const interval = setInterval(() => setFrame(f => (f + 1) % leftFrames.length), 120);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Pressable 
      className="flex-row items-center py-3 active:opacity-80"
      onPress={() => { playSFX('depth-descend'); router.push('/stake'); }}
    >
      <Text className="text-amber font-mono text-sm">{leftFrames[frame]}</Text>
      <Text className="text-amber text-lg font-bold font-mono tracking-widest mx-2">DESCEND</Text>
      <Text className="text-amber font-mono text-sm">{rightFrames[frame]}</Text>
    </Pressable>
  );
}

import { SafeAreaView } from 'react-native-safe-area-context';
import { useDeathFeed, useGameSettings } from '../lib/instant';
import { useGame } from '../lib/GameContext';
import { DieForwardLogo } from '../components/DieForwardLogo';
import { AudioToggle } from '../components/AudioToggle';
import { AudioSettingsModal } from '../components/AudioSettingsModal';
import { CRTOverlay } from '../components/CRTOverlay';
import * as api from '../lib/api';

// ─── Colors (raw values for inline styles in sheet) ──────────────────────────
const C = {
  bg:         '#0a0806',   // sheet base
  border:     '#2a2520',   // separator
  ethereal:   '#a78bfa',   // death glyph / echo name
  bone:       '#d4b896',   // primary text
  boneDark:   '#78716c',   // secondary text
  boneMuted:  '#57534e',   // tertiary / final message
  amber:      '#f59e0b',   // depth number
  victory:    '#86efac',   // victor name
};

// ─── Sheet bottom panel with native swipe gestures ───────────────────────────
function EchoSheet({
  visible,
  onClose,
  recentDeaths,
  walletAddress,
}: {
  visible: boolean;
  onClose: () => void;
  recentDeaths: any[];
  walletAddress?: string | null;
}) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '75%'], []);
  // Track liked deaths (optimistic, per-session)
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  const handleLike = async (death: any) => {
    if (!walletAddress || liked.has(death.id)) return;
    // Optimistic update
    setLiked(prev => new Set(prev).add(death.id));
    setLikeCounts(prev => ({ ...prev, [death.id]: (prev[death.id] ?? death.likeCount ?? 0) + 1 }));
    try {
      await api.likeDeath(death.id, walletAddress);
    } catch {
      // Revert on failure
      setLiked(prev => { const s = new Set(prev); s.delete(death.id); return s; });
      setLikeCounts(prev => ({ ...prev, [death.id]: Math.max(0, (prev[death.id] ?? 1) - 1) }));
    }
  };

  // Open/close the sheet based on visibility
  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: C.border, width: 36 }}
      backgroundStyle={{
        backgroundColor: 'rgba(10, 8, 6, 0.95)',
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: C.border,
      }}
      style={Platform.OS === 'web' ? { maxWidth: 500, alignSelf: 'center', width: '100%' } : undefined}
    >
      {/* Header */}
      <View style={{
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderColor: C.border,
        paddingHorizontal: 16,
      }}>
        <Text style={{
          fontFamily: 'monospace',
          fontSize: 13,
          letterSpacing: 2,
          color: C.ethereal,
        }}>
          † ECHOES OF THE FALLEN
        </Text>
      </View>

      {/* Scrollable list — BottomSheetScrollView integrates with sheet gestures */}
      <BottomSheetScrollView style={{ paddingHorizontal: 20 }}>
        {recentDeaths.length > 0 ? recentDeaths.map((death, i) => {
          const count = likeCounts[death.id] ?? death.likeCount ?? 0;
          const hasLiked = liked.has(death.id);
          const canLike = !!walletAddress && !hasLiked;
          return (
          <View key={death.id || i} style={{
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderColor: C.border,
            alignItems: 'center',
          }}>
            <Text style={{ fontFamily: 'monospace', fontSize: 14, textAlign: 'center' }} numberOfLines={1}>
              <Text style={{ color: C.ethereal }}>†</Text>
              <Text style={{ color: C.bone, fontWeight: '600' }}> {(death.playerName || 'Unknown').toUpperCase()}</Text>
              <Text style={{ color: C.boneDark }}> · </Text>
              <Text style={{ color: C.boneDark }}>depth </Text>
              <Text style={{ color: C.amber, fontWeight: '600' }}>{death.room || '?'}</Text>
            </Text>
            {death.finalMessage ? (
              <Text style={{
                fontFamily: 'monospace',
                fontSize: 13,
                color: C.boneDark,
                fontStyle: 'italic',
                marginTop: 6,
                lineHeight: 19,
                textAlign: 'center',
              }} numberOfLines={2}>
                "{death.finalMessage}"
              </Text>
            ) : null}
            {/* 🕯️ Light a candle */}
            <Pressable
              onPress={() => handleLike(death)}
              disabled={!canLike}
              style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4, opacity: !walletAddress ? 0.3 : 1 }}
            >
              <Text style={{ fontSize: 13 }}>{hasLiked ? '🕯️' : '🕯'}</Text>
              {count > 0 && (
                <Text style={{ fontFamily: 'monospace', fontSize: 11, color: hasLiked ? C.amber : C.boneMuted }}>
                  {count}
                </Text>
              )}
            </Pressable>
          </View>
          );
        }) : (
          <Text style={{ fontFamily: 'monospace', fontSize: 12, color: C.boneMuted, textAlign: 'center', paddingVertical: 32, fontStyle: 'italic' }}>
            No echoes yet... be the first to fall.
          </Text>
        )}
        <View style={{ height: 32 }} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [showAllSheet, setShowAllSheet] = useState(false);
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);

  const game = useGame();
  const { deaths: recentDeaths } = useDeathFeed(50);
  const { playAmbient, ready: audioReady } = useAudio();
  const { settings } = useGameSettings();

  useEffect(() => {
    if (audioReady) playAmbient('ambient-title');
  }, [audioReady]);

  const displayedDeaths = recentDeaths.slice(0, 5);

  const openSheet = useCallback(() => {
    setShowAllSheet(true);
  }, []);

  return (
    <CryptBackground screen="home">
    <SafeAreaView className="flex-1" edges={['top', 'left', 'right', 'bottom']}>
      <CRTOverlay />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2">
        {settings.showLeaderboardLink ? (
          <Pressable onPress={() => router.push('/leaderboard')} className="active:opacity-70">
            <Text className="text-amber font-mono text-xs tracking-wider">◈ RANKS</Text>
          </Pressable>
        ) : (
          <View className="w-16" />
        )}
        <AudioToggle ambientTrack="ambient-title" inline onSettingsPress={() => setAudioSettingsOpen(true)} />
      </View>
      <AudioSettingsModal visible={audioSettingsOpen} onClose={() => setAudioSettingsOpen(false)} />

      <View className="flex-1 px-4" style={Platform.OS === 'web' ? { paddingBottom: 20 } : undefined}>
        
        <View className="flex-[3]" />

        {/* Logo + Tagline + CTA */}
        <View className="items-center">
          <DieForwardLogo size="large" showGlow glowColor="#f59e0b" />
          <Text className="text-bone font-mono text-center italic mt-6 mb-12">
            Your death feeds the depths
          </Text>
          <AnimatedDescendButton />
        </View>

        <View className="flex-[2]" />

        {/* Echoes Section — whole area tappable */}
        <Pressable className="mb-4" onPress={openSheet}>
          {/* Title */}
          <View className="items-center mb-3">
            <Text className="font-mono text-base tracking-widest text-ethereal">
              † ECHOES
            </Text>
          </View>

          {/* Preview content */}
          <View className="px-2 items-center" style={{ minHeight: 120 }}>
            <View className="items-center w-full" style={{ maxWidth: 280 }}>
              {displayedDeaths.length > 0 ? (
                displayedDeaths.map((death, i) => (
                  <View key={death.id || i} className="py-1">
                    <Text className="text-xs text-bone-muted font-mono text-center" numberOfLines={1}>
                      <Text className="text-ethereal">{death.playerName}</Text>
                      <Text className="text-bone-dark"> fell at </Text>
                      <Text className="text-bone-muted">Depth {death.room || '?'}</Text>
                    </Text>
                  </View>
                ))
              ) : (
                <Text className="text-xs text-bone-dark font-mono italic text-center">
                  No echoes yet... be the first to fall.
                </Text>
              )}
            </View>
          </View>

          {/* Tap hint + decoration */}
          <Text className="text-crypt-border-light font-mono text-xs text-center mt-3">
            ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░
          </Text>
          <Text style={{
            fontFamily: 'monospace', fontSize: 9, color: C.boneMuted,
            textAlign: 'center', marginTop: 4, letterSpacing: 1,
          }}>
            tap to open
          </Text>
        </Pressable>
      </View>

      {/* Version badge */}
      <Text
        style={{
          position: 'absolute', bottom: 6, right: 10,
          fontSize: 9, fontFamily: 'monospace', color: '#3a3632', letterSpacing: 0.5,
        }}
        pointerEvents="none"
      >
        v{Constants.expoConfig?.version}
      </Text>

      {/* Echo Sheet */}
      <EchoSheet
        visible={showAllSheet}
        onClose={() => setShowAllSheet(false)}
        recentDeaths={recentDeaths}
        walletAddress={game.walletAddress}
      />
    </SafeAreaView>
    </CryptBackground>
  );
}
