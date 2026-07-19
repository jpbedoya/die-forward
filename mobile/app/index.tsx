import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { BlurView } from 'expo-blur';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { CryptBackground } from '../components/CryptBackground';
import { router, useFocusEffect } from 'expo-router';
import { useAudio } from '../lib/audio';
import { dlog, exportDebugLogs } from '../lib/debug-log';
import { t } from '../lib/i18n';
import { getDailyShift, utcDayKey, fetchCommunityShift, mergeShift, type CommunityShift } from '../lib/world-shift';
import { renderDispatch } from '../lib/dispatch';
import { containsBlockedContent } from '../lib/moderation';

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
  
  // Only animate while the home screen is focused. expo-router keeps backgrounded
  // screens mounted in the stack, so a plain useEffect interval would keep ticking
  // (and re-rendering) on every leaked/stacked HomeScreen forever. useFocusEffect
  // starts the timer on focus and clears it on blur.
  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => setFrame(f => (f + 1) % leftFrames.length), 120);
      return () => clearInterval(interval);
    }, []),
  );
  
  return (
    <Pressable 
      className="flex-row items-center py-3 active:opacity-80"
      onPress={() => { router.push('/zone-select'); playSFX('depth-descend'); }}
    >
      <Text className="text-amber font-mono text-sm">{leftFrames[frame]}</Text>
      <Text className="text-amber text-lg font-bold font-mono tracking-widest mx-2">{t('index.descend')}</Text>
      <Text className="text-amber font-mono text-sm">{rightFrames[frame]}</Text>
    </Pressable>
  );
}

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDeathFeed, useGameSettings } from '../lib/instant';
import { useGame } from '../lib/GameContext';
import { usePlayer } from '../lib/instant';
import { DieForwardLogoImage } from '../components/DieForwardLogoImage';
import { AudioToggle } from '../components/AudioToggle';
import { SettingsModal } from '../components/SettingsModal';
import { NicknameModal } from '../components/NicknameModal';
import { AudiusLogo } from '../components/AudiusLogo';
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

const ECHOES_CACHE_KEY = 'die-forward-echoes-cache-v1';

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
          {t('index.echoesOfFallenTitle')}
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
              <Text style={{ color: C.bone, fontWeight: '600' }}> {(death.playerName || t('index.unknownPlayer')).toUpperCase()}</Text>
              <Text style={{ color: C.boneDark }}> · </Text>
              <Text style={{ color: C.boneDark }}>{t('index.depthLabel')}</Text>
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
                "{containsBlockedContent(death.finalMessage) ? t('corpse.redacted') : death.finalMessage}"
              </Text>
            ) : null}
            {/* 🕯️ Light a candle */}
            <Pressable
              onPress={() => handleLike(death)}
              disabled={!canLike}
              hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
              style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 8, opacity: !walletAddress ? 0.3 : 1 }}
            >
              <Text style={{ fontSize: 16 }}>{hasLiked ? '🕯️' : '🕯'}</Text>
              {count > 0 && (
                <Text style={{ fontFamily: 'monospace', fontSize: 12, color: hasLiked ? C.amber : C.boneMuted }}>
                  {count}
                </Text>
              )}
            </Pressable>
          </View>
          );
        }) : (
          <Text style={{ fontFamily: 'monospace', fontSize: 12, color: C.boneMuted, textAlign: 'center', paddingVertical: 32, fontStyle: 'italic' }}>
            {t('index.noEchoesYet')}
          </Text>
        )}
        <View style={{ height: 32 }} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [showAllSheet, setShowAllSheet] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cachedPreviewDeaths, setCachedPreviewDeaths] = useState<any[]>([]);

  const game = useGame();
  const { player: walletPlayer } = usePlayer(game.walletAddress);
  const { deaths: recentDeaths, isLoading: feedLoading } = useDeathFeed(50);
  const { playAmbient, playSFX, ready: audioReady } = useAudio();
  const { settings } = useGameSettings();
  const [walletConnecting, setWalletConnecting] = useState(false);

  // Home has no "current zone" concept, so the shift panel shows the pool for
  // sunken-crypt — the always-unlocked anchor zone every player has access to
  // from day one. Per-zone shift detail (sealed doors, etc.) lives on zone
  // select where a concrete zoneId exists.
  const dayKey = utcDayKey();
  const HOME_ZONE = 'sunken-crypt';
  const [homeCommunity, setHomeCommunity] = useState<CommunityShift | null>(null);
  useEffect(() => {
    if (!settings.dailyShiftEnabled) return;
    let alive = true;
    fetchCommunityShift(HOME_ZONE, dayKey).then((c) => { if (alive) setHomeCommunity(c); }).catch(() => {});
    return () => { alive = false; };
  }, [dayKey, settings.dailyShiftEnabled]);

  const dispatch = useMemo(() => {
    if (!settings.dailyShiftEnabled) return null;
    const world = mergeShift(getDailyShift(HOME_ZONE, dayKey), homeCommunity);
    return renderDispatch(world);
  }, [dayKey, settings.dailyShiftEnabled, homeCommunity]);

  useEffect(() => {
    dlog('Home', 'HomeScreen mounted');
    return () => dlog('Home', 'HomeScreen UNMOUNTED');
  }, []);

  useEffect(() => {
    dlog('Home', `state: auth=${game.isAuthenticated}, type=${game.authType}, feed=${feedLoading}, deaths=${recentDeaths.length}`);
  }, [game.isAuthenticated, game.authType, feedLoading, recentDeaths.length]);

  // Load cached echoes preview immediately on startup to avoid loading/flicker jump.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ECHOES_CACHE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setCachedPreviewDeaths(parsed.slice(0, 5));
          }
        } catch {
          // ignore malformed cache
        }
      })
      .catch(() => {
        // ignore cache read errors
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Refresh cache once live feed arrives.
  useEffect(() => {
    if (!recentDeaths.length) return;
    const top = recentDeaths.slice(0, 5);
    setCachedPreviewDeaths(top);
    AsyncStorage.setItem(ECHOES_CACHE_KEY, JSON.stringify(top)).catch(() => {
      // ignore cache write errors
    });
  }, [recentDeaths]);

  useEffect(() => {
    if (audioReady) playAmbient('ambient-title');
  }, [audioReady, playAmbient]);

  const displayedDeaths = (feedLoading && cachedPreviewDeaths.length > 0
    ? cachedPreviewDeaths
    : recentDeaths
  ).slice(0, 5);

  const handleWalletConnect = useCallback(async () => {
    if (game.walletConnected) return;
    playSFX('ui-click');
    setWalletConnecting(true);
    try {
      await game.connect();
    } catch {
      // user cancelled or error — ignore
    } finally {
      setWalletConnecting(false);
    }
  }, [game.walletConnected, game.connect, playSFX]);

  // Display name: nickname > truncated wallet > null
  const displayName = game.nickname
    || walletPlayer?.nickname
    || (game.walletAddress ? `${game.walletAddress.slice(0, 4)}...${game.walletAddress.slice(-4)}` : null);

  const openSheet = useCallback(() => {
    setShowAllSheet(true);
  }, []);

  return (
    <CryptBackground screen="home">
    <SafeAreaView className="flex-1" edges={['left', 'right', 'bottom']}>
      <CRTOverlay />
      
      {/* Header row 1: Identity pill (left) + Audio toggle (right) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: insets.top + 10, paddingBottom: 4 }}>
        <View style={{ flexShrink: 0 }}>
          {game.walletConnected && displayName ? (
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 10, paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)',
              gap: 5,
            }}>
              <Text style={{ fontSize: 12 }}>💀</Text>
              <Text style={{
                fontFamily: 'monospace', fontSize: 11, fontWeight: '700',
                color: '#f59e0b', letterSpacing: 0.5,
                maxWidth: 120,
              }} numberOfLines={1}>
                {displayName}
              </Text>
            </View>
          ) : (
            <Pressable onPress={handleWalletConnect} disabled={walletConnecting}>
              {({ pressed }) => (
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 10, paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: pressed ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.08)',
                  borderWidth: 1, borderColor: pressed ? 'rgba(245, 158, 11, 0.5)' : 'rgba(245, 158, 11, 0.25)',
                  gap: 5,
                  opacity: walletConnecting ? 0.5 : 1,
                }}>
                  <Text style={{ fontSize: 12 }}>👛</Text>
                  <Text style={{
                    fontFamily: 'monospace', fontSize: 10, fontWeight: '700',
                    color: '#f59e0b', letterSpacing: 0.5,
                  }}>
                    {walletConnecting ? t('index.connecting') : t('index.connect')}
                  </Text>
                </View>
              )}
            </Pressable>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <AudioToggle ambientTrack="ambient-title" inline onSettingsPress={() => setSettingsOpen(true)} />
        </View>
      </View>

      {/* Header row 2: Nav links (left) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, flexShrink: 1, marginLeft: -12 }}>
          {settings.showLeaderboardLink && (
            <Pressable onPress={() => router.push('/leaderboard')} style={{ paddingVertical: 6, paddingHorizontal: 10 }}>
              {({ pressed }) => (
                <Text style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: 1, color: pressed ? '#fff' : '#f59e0b', backgroundColor: pressed ? 'rgba(245,158,11,0.15)' : 'transparent' }}>{t('index.ranksNav')}</Text>
              )}
            </Pressable>
          )}
          <Pressable onPress={() => router.push('/bestiary')} style={{ paddingVertical: 6, paddingHorizontal: 10 }}>
            {({ pressed }) => (
              <Text style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: 1, color: pressed ? '#fff' : '#f59e0b', backgroundColor: pressed ? 'rgba(245,158,11,0.15)' : 'transparent' }}>{t('index.bestiaryNav')}</Text>
            )}
          </Pressable>
          <Pressable onPress={() => router.push('/codex')} style={{ paddingVertical: 6, paddingHorizontal: 10 }}>
            {({ pressed }) => (
              <Text style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: 1, color: pressed ? '#fff' : '#f59e0b', backgroundColor: pressed ? 'rgba(245,158,11,0.15)' : 'transparent' }}>{t('index.codexNav')}</Text>
            )}
          </Pressable>
        </View>
      </View>

      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <NicknameModal
        visible={game.showNicknameModal}
        onSubmit={(name) => game.setNickname(name)}
        onSkip={() => game.dismissNicknameModal()}
      />

      <View className="flex-1 px-4" style={Platform.OS === 'web' ? { paddingBottom: 20 } : undefined}>

        {/* PROMO AREA — top-right, below header. Swap content here for promotions/partnerships. */}
        <View style={{ alignItems: 'flex-end', marginBottom: 4 }}>
          <Pressable onPress={() => setSettingsOpen(true)} hitSlop={4}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, gap: 4, backgroundColor: 'rgba(168, 85, 247, 0.15)', borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)' }}>
              <AudiusLogo width={60} height={12} color="#a855f7" />
              <Text style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: '700', color: '#a855f7', letterSpacing: 0.5 }}>{t('index.soundtrack')}</Text>
            </View>
          </Pressable>
        </View>
        
        <View className="flex-[3]" />

        {/* Logo + Tagline + CTA */}
        <View className="items-center">
          <DieForwardLogoImage variant="vertical" size="large" showGlow glowColor="#f59e0b" />
          <Text className="text-bone font-mono text-center italic mt-6 mb-12">
            {t('index.tagline')}
          </Text>
          <AnimatedDescendButton />
        </View>

        <View className="flex-[2]" />

        {/* Daily World Shift — Cartographer-voice dispatch, hidden when disabled */}
        {settings.dailyShiftEnabled && dispatch && (
          <View className="items-center mb-4">
            <Text className="text-amber-dark font-mono text-xs tracking-widest">
              {t('shift.header')}
            </Text>
            {dispatch.lines.map((line, i) => (
              <Text
                key={i}
                className={`font-mono text-xs text-center mt-1 ${dispatch.level === 'banner' ? 'text-bone-dark italic' : 'text-bone-muted'}`}
              >
                {t(line.key, line.params)}
              </Text>
            ))}
          </View>
        )}

        {/* Echoes Section — whole area tappable */}
        <Pressable className="mb-4" onPress={openSheet}>
          {/* Title */}
          <View className="items-center mb-3">
            <Text className="font-mono text-base tracking-widest text-ethereal">
              {t('index.echoesTitle')}
            </Text>
          </View>

          {/* Preview content */}
          <View className="px-2 items-center" style={{ height: 120, overflow: 'hidden' }}>
            <View className="items-center w-full" style={{ maxWidth: 280 }}>
              {feedLoading && cachedPreviewDeaths.length === 0 ? (
                <Text className="text-xs text-bone-dark font-mono italic text-center">
                  {t('index.listeningForEchoes')}
                </Text>
              ) : displayedDeaths.length > 0 ? (
                displayedDeaths.map((death, i) => (
                  <View key={death.id || i} className="py-1">
                    <Text className="text-xs text-bone-muted font-mono text-center" numberOfLines={1}>
                      <Text className="text-ethereal">{death.playerName}</Text>
                      <Text className="text-bone-dark">{t('index.fellAt')}</Text>
                      <Text className="text-bone-muted">{t('index.depthValue', { room: death.room || '?' })}</Text>
                    </Text>
                  </View>
                ))
              ) : (
                <Text className="text-xs text-bone-dark font-mono italic text-center">
                  {t('index.noEchoesYet')}
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
            {t('index.tapToOpen')}
          </Text>
        </Pressable>
      </View>

      {/* Version badge */}
      <Pressable
        style={{ position: 'absolute', bottom: 6, right: 28 }}
        onPress={() => exportDebugLogs()}
      >
        <Text
          style={{
            fontSize: 9, fontFamily: 'monospace', color: '#6b6460', letterSpacing: 0.5,
          }}
        >
          {t('index.versionBadge', { version: Constants.expoConfig?.version ?? '' })}
        </Text>
      </Pressable>

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
