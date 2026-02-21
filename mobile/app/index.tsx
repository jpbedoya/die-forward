import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, Platform, ScrollView, Modal, Animated, PanResponder, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { BlurView } from 'expo-blur';
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
import { useDeathFeed, useLeaderboard, useGameSettings } from '../lib/instant';
import { DieForwardLogo } from '../components/DieForwardLogo';
import { AudioToggle } from '../components/AudioToggle';
import { AudioSettingsModal } from '../components/AudioSettingsModal';
import { CRTOverlay } from '../components/CRTOverlay';

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

// ─── Sheet bottom panel with swipe-to-dismiss ────────────────────────────────
function EchoSheet({
  visible,
  onClose,
  activeTab,
  setActiveTab,
  recentDeaths,
  leaderboard,
  showVictors,
}: {
  visible: boolean;
  onClose: () => void;
  activeTab: 'echoes' | 'victors';
  setActiveTab: (t: 'echoes' | 'victors') => void;
  recentDeaths: any[];
  leaderboard: any[];
  showVictors: boolean;
}) {
  const translateY = useRef(new Animated.Value(700)).current;

  // Slide up on open
  useEffect(() => {
    if (visible) {
      translateY.setValue(700);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 3,
        speed: 14,
      }).start();
    }
  }, [visible]);

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: 700,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      translateY.setValue(700);
    });
  }, [translateY, onClose]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 90 || g.vy > 0.6) {
          Animated.timing(translateY, {
            toValue: 700,
            duration: 240,
            useNativeDriver: true,
          }).start(() => {
            onClose();
            translateY.setValue(700);
          });
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss}>
      {/* Blurred backdrop */}
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} />
        </BlurView>
      </Pressable>

      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '75%',
          backgroundColor: 'rgba(10, 8, 6, 0.55)',
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: C.border,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          transform: [{ translateY }],
          ...(Platform.OS === 'web' ? { maxWidth: 500, alignSelf: 'center', width: '100%' } : {}),
        }}
      >
        {/* Swipeable header area (handle + tabs) */}
        <View {...panResponder.panHandlers}>
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.border }} />
          </View>

          {/* Tab header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 24,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderColor: C.border,
            paddingHorizontal: 16,
          }}>
          <Pressable onPress={() => setActiveTab('echoes')}>
            <Text style={{
              fontFamily: 'monospace',
              fontSize: 13,
              letterSpacing: 2,
              color: activeTab === 'echoes' ? C.ethereal : C.boneMuted,
            }}>
              † ECHOES
            </Text>
          </Pressable>
          {showVictors && (
            <>
              <Text style={{ color: C.border, fontFamily: 'monospace' }}>◆</Text>
              <Pressable onPress={() => setActiveTab('victors')}>
                <Text style={{
                  fontFamily: 'monospace',
                  fontSize: 13,
                  letterSpacing: 2,
                  color: activeTab === 'victors' ? C.victory : C.boneMuted,
                }}>
                  ★ VICTORS
                </Text>
              </Pressable>
            </>
          )}
          </View>
        </View>

        {/* List */}
        <ScrollView style={{ paddingHorizontal: 20 }}>
          {activeTab === 'echoes' ? (
            recentDeaths.length > 0 ? recentDeaths.map((death, i) => (
              <View key={death.id || i} style={{
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderColor: C.border,
                alignItems: 'center',
              }}>
                {/* † PLAYERNAME · depth 7 */}
                <Text style={{ fontFamily: 'monospace', fontSize: 14, textAlign: 'center' }} numberOfLines={1}>
                  <Text style={{ color: C.ethereal }}>†</Text>
                  <Text style={{ color: C.bone, fontWeight: '600' }}> {(death.playerName || 'Unknown').toUpperCase()}</Text>
                  <Text style={{ color: C.boneDark }}> · </Text>
                  <Text style={{ color: C.boneDark }}>depth </Text>
                  <Text style={{ color: C.amber, fontWeight: '600' }}>{death.room || '?'}</Text>
                </Text>
                {/* "their dying words here..." */}
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
              </View>
            )) : (
              <Text style={{ fontFamily: 'monospace', fontSize: 12, color: C.boneMuted, textAlign: 'center', paddingVertical: 32, fontStyle: 'italic' }}>
                No echoes yet... be the first to fall.
              </Text>
            )
          ) : (
            leaderboard.length > 0 ? leaderboard.map((player, i) => (
              <View key={player.id || i} style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: C.border,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <View>
                  <Text style={{ fontFamily: 'monospace', fontSize: 13, color: C.victory }}>
                    {'★ @'}{player.nickname}
                  </Text>
                  <Text style={{ fontFamily: 'monospace', fontSize: 11, color: C.boneMuted, marginTop: 2, paddingLeft: 14 }}>
                    {player.totalClears || 0} escape{player.totalClears !== 1 ? 's' : ''} from the depths
                  </Text>
                </View>
                <Text style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold', color: C.amber }}>
                  D:{player.highestRoom || 0}
                </Text>
              </View>
            )) : (
              <Text style={{ fontFamily: 'monospace', fontSize: 12, color: C.boneMuted, textAlign: 'center', paddingVertical: 32, fontStyle: 'italic' }}>
                None have escaped... yet.
              </Text>
            )
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<'echoes' | 'victors'>('echoes');
  const [showAllSheet, setShowAllSheet] = useState(false);
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);

  const { deaths: recentDeaths } = useDeathFeed(50);
  const { leaderboard: rawLeaderboard } = useLeaderboard(20);
  const { playAmbient, ready: audioReady } = useAudio();
  const { settings } = useGameSettings();

  const leaderboard = rawLeaderboard.filter(p => p.nickname && p.nickname.trim() !== '');

  useEffect(() => {
    if (audioReady) playAmbient('ambient-title');
  }, [audioReady]);

  const displayedDeaths = recentDeaths.slice(0, 5);
  const displayedVictors = leaderboard.slice(0, 5);

  const openSheet = useCallback((tab?: 'echoes' | 'victors') => {
    if (tab) setActiveTab(tab);
    setShowAllSheet(true);
  }, []);

  return (
    <CryptBackground screen="home">
    <SafeAreaView className="flex-1" edges={['top', 'left', 'right', 'bottom']}>
      <CRTOverlay />
      
      {/* Header */}
      <View className="flex-row items-center justify-end px-4 py-2">
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
        <Pressable className="mb-4" onPress={() => openSheet()}>
          {/* Tab row */}
          <View className="items-center mb-3">
            <View className="flex-row items-center gap-4">
              <Pressable onPress={() => openSheet('echoes')}>
                <Text className={`font-mono text-base tracking-widest ${
                  activeTab === 'echoes' ? 'text-ethereal' : 'text-bone-dark'
                }`}>
                  ECHOES
                </Text>
              </Pressable>
              {settings.showVictorsFeed && (
                <>
                  <Text className="text-crypt-border-light font-mono">◆</Text>
                  <Pressable onPress={() => openSheet('victors')}>
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

          {/* Preview content */}
          <View className="px-2 items-center" style={{ minHeight: 120 }}>
            {activeTab === 'echoes' ? (
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
            ) : (
              <View className="items-center w-full" style={{ maxWidth: 280 }}>
                {displayedVictors.length > 0 ? (
                  displayedVictors.map((player, i) => (
                    <View key={player.id || i} className="py-1">
                      <Text className="text-xs text-bone-muted font-mono text-center" numberOfLines={1}>
                        <Text className="text-victory">@{player.nickname}</Text>
                        <Text className="text-bone-dark"> escaped </Text>
                        <Text className="text-bone-muted">Depth {player.highestRoom || 0}</Text>
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-xs text-bone-dark font-mono italic text-center">
                    None have escaped... yet.
                  </Text>
                )}
              </View>
            )}
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
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        recentDeaths={recentDeaths}
        leaderboard={leaderboard}
        showVictors={settings.showVictorsFeed}
      />
    </SafeAreaView>
    </CryptBackground>
  );
}
