import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal, Animated, Platform, TextStyle, Alert } from 'react-native';
import { AsciiLoader } from '../components/AsciiLoader';
import { TypewriterText } from '../components/TypewriterText';
import { CryptBackground } from '../components/CryptBackground';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useGame } from '../lib/GameContext';
import { useAudio } from '../lib/audio';
import { BESTIARY, getDeathMoment, getFinalWordsIntro } from '../lib/content';
import { getZoneDepth, loadZone } from '../lib/zone-loader';
import { DeathCard, ShareCardCapture, useShareCard } from '../lib/shareCard';
import { useAudius } from '../lib/AudiusContext';
import { SettingsModal } from '../components/SettingsModal';
import { AudioToggle } from '../components/AudioToggle';
import { CRTOverlay } from '../components/CRTOverlay';
import { useCurrentPlayer, applyMilestoneCosmetics, useGameSettings, recordCreatureUpdate, saveNotifRegistration, markNotifPrompted } from '../lib/instant';
import { requestPushPermission, getExpoPushToken, getDeviceTimezone, getDeviceLocale } from '../lib/notifications';
import { getNewMilestone, getMilestoneTypeLabel, type Milestone } from '../lib/milestones';
import { trailRows } from '../lib/traversal';
import { t } from '../lib/i18n';

export default function DeathScreen() {
  const insets = useSafeAreaInsets();
  const game = useGame();
  const { playSFX, playAmbient } = useAudio();
  const { viewShotRef, webRef, captureAndShare } = useShareCard();
  const { currentTrack, musicSource } = useAudius();
  const { player } = useCurrentPlayer();
  const { settings } = useGameSettings();
  const params = useLocalSearchParams<{ killedBy?: string }>();

  // Milestone unlock check — computed once when player data arrives
  const [newMilestone, setNewMilestone] = useState<Milestone | null>(null);
  const [milestoneChecked, setMilestoneChecked] = useState(false);

  // First-death diegetic notification opt-in (Phase 4c, Task 6). Additive and
  // dismissible — NOTHING about gameplay/navigation is gated on the outcome.
  // Its own run-once ref guarantees the prompt can't double-fire even though
  // the milestone effect below is already latched.
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const notifPromptFired = useRef(false);

  // Coin economy (Task 7): snapshot the player's pale-coin balance and
  // binding streak the moment they're available on this screen — i.e.
  // BEFORE recordDeathIfNeeded's settlement transact lands. The death route
  // isn't surfaced in DeathResponse (no coinDelta field), so we derive the
  // delta client-side: player.paleCoins is a live InstantDB subscription, so
  // once the server settles, coinsAtRunEnd - coinsAtRunStart is the true
  // combined delta (universal depth earn; the coin-stake burn contributes 0
  // to the player row on death — see computeCoinStakeSettlement). The streak
  // snapshot lets us show a "the pact breaks" line only when there was
  // actually a streak to lose (current value is always 0 post-death for a
  // coins run, so we'd otherwise lose that signal).
  const [runStartCoins, setRunStartCoins] = useState<number | null>(null);
  const [runStartStreak, setRunStartStreak] = useState<number | null>(null);

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deathMoment] = useState(() => getDeathMoment());
  const [finalWordsIntro] = useState(() => getFinalWordsIntro());

  // currentRoom is already the 1-based depth of the current node (Phase 2a).
  const roomNumber = game.currentRoom || 0;
  const depth = getZoneDepth(loadZone(game.zoneId), roomNumber);
  const stakeAmountNum = Number(game.stakeAmount || 0);
  const isEmptyHanded = !Number.isFinite(stakeAmountNum) || stakeAmountNum <= 0;
  const trail = game.graph ? trailRows(game.graph, game.path) : [];

  // Coin economy display (Task 7): see runStartCoins/runStartStreak comment above.
  const isCoinBound = (game.coinStake ?? 0) > 0;
  const coinsAtRunEnd = player?.paleCoins ?? 0;
  const coinsGained = runStartCoins !== null ? Math.max(0, coinsAtRunEnd - runStartCoins) : 0;
  const streakBroken = isCoinBound && runStartStreak !== null && runStartStreak > 0 && (player?.bindingStreak ?? 0) === 0;

  // Check for milestone unlock when player data is ready (run once)
  useEffect(() => {
    if (milestoneChecked || !player) return;

    const prevDeaths = player.totalDeaths ?? 0;
    const nextDeaths = prevDeaths + 1;
    const milestone = getNewMilestone(prevDeaths, nextDeaths);
    setNewMilestone(milestone);
    setMilestoneChecked(true);
    setRunStartCoins(player.paleCoins ?? 0);
    setRunStartStreak(player.bindingStreak ?? 0);

    // First death only, and only if we've never asked. Behind its own ref so
    // it fires exactly once regardless of re-renders.
    if (!notifPromptFired.current && prevDeaths === 0 && !player.notifPrompted) {
      notifPromptFired.current = true;
      setShowNotifPrompt(true);
    }

    // Persist title/border unlocks immediately when crossed.
    if (milestone) {
      applyMilestoneCosmetics(player, milestone).catch((err) => {
        console.warn('[Milestone] Failed to persist cosmetic unlock:', err);
      });
    }
  }, [player, milestoneChecked]);

  // Notification opt-in outcome. All branches merely close the prompt and
  // persist state fire-and-forget; a native failure never blocks the screen.
  const handleNotifAccept = async () => {
    setShowNotifPrompt(false);
    if (!player) return;
    try {
      const granted = await requestPushPermission();
      if (granted) {
        const token = await getExpoPushToken();
        if (token) {
          await saveNotifRegistration(player, {
            pushToken: token,
            timezone: getDeviceTimezone(),
            notifLocale: getDeviceLocale(),
          });
          return;
        }
      }
      await markNotifPrompted(player);
    } catch (e) {
      console.warn('[Notif] opt-in failed:', e);
    }
  };

  const handleNotifDecline = async () => {
    setShowNotifPrompt(false);
    if (!player) return;
    try {
      await markNotifPrompted(player);
    } catch (e) {
      console.warn('[Notif] decline failed:', e);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    playSFX('share-click');
    const shareText = t('death.shareText', { room: roomNumber, depth: depth.name, words: finalWords });
    const success = await captureAndShare(t('death.shareCardTitle'), shareText);
    setSharing(false);
    // Only close modal on success
    if (success) {
      setShowShareModal(false);
    }
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

  // Track if death has been recorded
  const [deathRecorded, setDeathRecorded] = useState(false);
  
  // Helper to record death with current or default message
  const recordDeathIfNeeded = async () => {
    if (deathRecorded || !game.sessionToken) return;
    
    const message = finalWords.trim() || '...';  // Default if no custom message
    
    try {
      console.log('[Death] Recording death:', message.slice(0, 20));
      await game.recordDeath(
        message,
        params.killedBy,
        musicSource === 'audius' && currentTrack
          ? { title: currentTrack.title, artist: currentTrack.user.name }
          : undefined,
      );
      setDeathRecorded(true);

      // Bestiary mastery — `killedByCount` increment. Only when we have a
      // concrete creature name (params.killedBy is unset for some non-combat
      // deaths like burn-tick-on-explore, in which case there's nothing to
      // attribute). Fire-and-forget; failures don't block the death flow.
      if (player && params.killedBy && BESTIARY[params.killedBy]) {
        recordCreatureUpdate(player, params.killedBy, 'killedBy', Object.keys(BESTIARY))
          .catch(err => console.warn('[Death] mastery killedBy write failed:', err));
      }
    } catch (e) {
      console.error('[Death] Record failed:', e);
      // Mark as recorded anyway to prevent repeated failures
      setDeathRecorded(true);
    }
  };

  // Auto-finalize after 30s if player doesn't submit (ensures run is finished)
  useEffect(() => {
    if (deathRecorded) return;
    const timer = setTimeout(() => {
      recordDeathIfNeeded().catch((e) => console.error('[Death] Auto-finalize failed:', e));
    }, 30000);
    return () => clearTimeout(timer);
  }, [deathRecorded, finalWords, game.sessionToken]);

  const handleSubmit = async () => {
    if (!finalWords.trim() || submitting) return;

    setSubmitting(true);
    playSFX('confirm-action');

    try {
      await game.recordDeath(
        finalWords.trim(),
        params.killedBy,
        musicSource === 'audius' && currentTrack
          ? { title: currentTrack.title, artist: currentTrack.user.name }
          : undefined,
      );
      setDeathRecorded(true);
      setSubmitted(true);
    } catch (e) {
      console.error('Failed to record death:', e);
      setSubmitted(true); // Still mark as submitted to allow continuing
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlayAgain = async () => {
    playSFX('ui-click');
    await recordDeathIfNeeded();  // Ensure death is recorded before leaving
    router.replace('/stake');
  };

  const handleHome = async () => {
    playSFX('ui-click');
    await recordDeathIfNeeded();  // Ensure death is recorded before leaving
    router.replace('/');
  };

  // ASCII art skull
  const SKULL_ASCII = `               +*+*+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*=
               ######################################################################*
               ######################################################################*
              .######################################################################+
        +#####*=++====================+===++=======+===+=+============+====++====+=+++######:
        +#####*+==++==+++++++++++==++=+====+++++++=++==+=+==+=+++++++=++==+===+==+===+######:
        +#####*+=====+===++=====+++++=++=+=++=++=++==++=++=++=++=++=++==++=++=+==+++=+######:
  -===--+++++++==+===:.....-=+====:............................................-+===+++++++++=-==--
  ######+=+=+==+++=+=.     :=+++==.                                            :+=+++==++++=+######
  ######+=+==+=+==++=.     :==+===.                                            :+=+==+====++*######
  ######+==+========-.     :======.  .                                         :======++===+*######
  ######++=+++:                   ===+==:                                            .===+=++######
  ######+===++:                   =++==+:                                            .===+=+*######
  ######+=+==+:                   =+=+++:                                            .====+++######
  ######+=====:                   .:::::.                                            .======*######
  ######++++++:                                                                      .=+++++*######
  ######+===++:                                                                      .===+=+*######
  ######+=+==+:                                                                      .=====+*######
  ######+=++=+:                                                                      .==+=++*######
  ######+==++=:                                                                      .====+=+######
  ######+===++:                                                                      .===+=+*######
  ######+=+==+:     .--=-------------=--:     .------:     .-------------=--=--:     .===+=+*######
  ######+=++=+:     .*##################=     .*#####=     .*##################=     .====+++######
  ######+==++=:     .*##################=     .*#####=     .*##################=     .==+==+*######
  ######+===++:     .*##################=     .*#####=     .*##############%###=     .===+=+*######
  ######+++==+:     .*#####=.    .*#####=     .*#####=     .*#####=     .*#####=     .===+=+*######
  ######+==++=:     .*#####=     .*#####=     .*#####=     .*#####=     .*#####=     .====++*######
  ######+=+++=:     .*#####=     .*#####=     .*#####=     .*#####=     .*#####=     .=++=+=*######
  ######+=====:     .*#####+------======:     .*#####=     .*#####+------*#####=     .======*######
  ######++++++:     .*###########*.           .*#####=     .*##################=     .=+++++*######
  ######+===++:     .*###########*.           .*#####=     .*##################=     .=====++######
  ######+=+==+:     .*###########*.           .*#####=     .*##################=     .===+=+*######
  ######+=++=+:     .*#####=.   ..*#####=     .*#####=     .*#####=.        .        .===+=+*######
  ######+==++=:     .*#####=     .*#####=     .*#####=     .*#####=                  .====+++######
  ######+===++:     .*#####=     .*#####=     .*#####=     .*#####=                  .==+==+*######
  ######+=+==+:     .=+++++-     .=+++++-     .=++**+-     .=+++++-                  .===+==*######
  ######+=++=+:                                                                      .===+++*######
  ######+==++=:                                                                      .=====+*######
  ######++==++:                                                                      .==+==+*######
  ######+=+==+:                                            .-============.           .===++=*######
  ######+=++=+:                                            .===+===+++===.           .====+++######
  ######+==++=:                                            .==++=+===+++=.           .==+==+*######
  ######++==++:                                             ---====+=====:...........:===+=+*######
  ######+++==+:                                                   :=++=====+==+==+=+==+==+=++######
  ######+==+==:                                                   :=+=++==+==+==+==++==+==+++######
  ######++=++=:                                                   :=+=++==+++===+====+==+==+*######
  ######+====+======-.                                             ......=+======++==+==+===+######
  ######+=+==+=+=+=+=.                                                  .===++===+=++=++=+++*######
  ######+++=+==+++===.                                                   =++++=+++==+==+=+=+*######
  ######++++++++++++=:...................................................=++++++++++++++++++*######
  #################################################################################################
  #################################################################################################
  #################################################################################################`;

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
              style={[
                {
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  fontSize: 2.5,
                  lineHeight: 2.7,
                  color: '#ef4444',
                  textAlign: 'left',
                  marginBottom: 16,
                },
                (Platform.OS === 'web'
                  ? { textShadow: '0px 0px 16px #ef4444' }
                  : { textShadowColor: '#ef4444', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 }) as TextStyle,
              ]}
            >
              {SKULL_ASCII}
            </Text>
            {params.killedBy && (
              <Text className="text-bone-muted text-base font-mono text-center mb-2">
                {t('death.slainBy', { name: params.killedBy })}
              </Text>
            )}
            <Text className="text-bone-dark text-sm font-mono text-center">
              {t('death.depthRoom', { depth: depth.name, room: roomNumber })}
            </Text>
          </Animated.View>
        </Animated.View>
      </View>
    );
  }

  return (
    <CryptBackground screen="death">
    <SafeAreaView className="flex-1" edges={['left', 'right', 'bottom']}>
      {/* Header with audio toggle */}
      <View className="flex-row items-center justify-end px-3" style={{ paddingTop: insets.top + 10, paddingBottom: 10 }}>
        <AudioToggle ambientTrack="ambient-death" inline onSettingsPress={() => setSettingsOpen(true)} />
      </View>

      <Animated.View style={{ flex: 1, opacity: contentFade }}>
      <ScrollView className="flex-1" contentContainerClassName="p-6">
        {/* Death Header */}
        <View className="items-center mb-8">
          <Text
            style={{
              fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
              fontSize: 2,
              lineHeight: 2.2,
              color: '#ef4444',
              textAlign: 'left',
              marginBottom: 12,
            }}
          >
            {SKULL_ASCII}
          </Text>
          {params.killedBy && (
            <Text className="text-bone-muted text-sm font-mono mt-1">
              {t('death.slainBy', { name: params.killedBy })}
            </Text>
          )}
        </View>

        {/* Death Stats */}
        <View className="bg-crypt-surface border border-crypt-border p-4 mb-4">
          <View className="flex-row justify-between mb-2">
            <Text className="text-bone-dark text-sm font-mono">{t('death.depthReached')}</Text>
            <Text className="text-ethereal text-sm font-mono">{depth.name}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-bone-dark text-sm font-mono">{t('death.room')}</Text>
            <Text className="text-bone text-sm font-mono">{roomNumber}</Text>
          </View>
          {!isEmptyHanded && (
            <View className="flex-row justify-between">
              <Text className="text-bone-dark text-sm font-mono">{t('death.solLeft')}</Text>
              <Text className="text-blood text-sm font-mono">{stakeAmountNum}</Text>
            </View>
          )}
        </View>

        {/* Pale Coin economy (Task 7) — display-only, see runStartCoins comment above */}
        <View className="bg-crypt-surface border border-crypt-border p-4 mb-6">
          <View className="flex-row justify-between mb-2">
            <Text className="text-bone-dark text-sm font-mono">{t('death.coin.balance')}</Text>
            <Text className="text-amber-light text-sm font-mono">🪙 {coinsAtRunEnd}</Text>
          </View>
          {coinsGained > 0 && (
            <Text className="text-bone-dark text-xs font-mono">{t('death.coin.gained', { amount: coinsGained })}</Text>
          )}
          {isCoinBound && (
            <Text className="text-blood-light text-xs font-mono mt-2 italic">{t('death.coin.stakeFeeds')}</Text>
          )}
          {streakBroken && (
            <Text className="text-bone-dark text-xs font-mono mt-1 italic">{t('death.coin.streakBroken')}</Text>
          )}
        </View>

        {/* Death Moment */}
        <View className="mb-6">
          {settings.enableRoomTextStreaming ? (
            <TypewriterText
              text={`"${deathMoment}"`}
              speedMs={settings.roomTextStreamSpeedMs}
              className="text-bone text-base font-mono italic leading-6 text-center"
            />
          ) : (
            <Text className="text-bone text-base font-mono italic leading-6 text-center">
              "{deathMoment}"
            </Text>
          )}
        </View>

        {/* Milestone Unlock Banner */}
        {newMilestone && (
          <View
            style={{
              borderWidth: 1,
              borderColor: '#c8a96e',
              backgroundColor: 'rgba(200, 169, 110, 0.08)',
              padding: 16,
              marginBottom: 20,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                color: '#c8a96e',
                fontSize: 10,
                letterSpacing: 4,
                marginBottom: 6,
              }}
            >
              {t('death.milestoneUnlocked')}
            </Text>
            <Text
              style={{
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                color: '#fef3c7',
                fontSize: 18,
                fontWeight: 'bold',
                marginBottom: 4,
              }}
            >
              {newMilestone.type === 'perk' || newMilestone.type === 'border'
                ? getMilestoneTypeLabel(newMilestone.type)
                : newMilestone.value}
            </Text>
            <Text
              style={{
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                color: '#a8a29e',
                fontSize: 11,
                textAlign: 'center',
              }}
            >
              {newMilestone.description}
            </Text>
            {newMilestone.type === 'perk' && (
              <Text
                style={{
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  color: '#c8a96e',
                  fontSize: 10,
                  marginTop: 6,
                  textAlign: 'center',
                }}
              >
                {newMilestone.value === 'starting_item'
                  ? t('death.perkStartingItem')
                  : t('death.perkStartHp')}
              </Text>
            )}
          </View>
        )}

        {/* Final Words Input */}
        {!submitted ? (
          <View className="mb-6">
            <TextInput
              className="bg-crypt-surface border border-crypt-border p-4 text-bone font-mono text-base mb-4"
              placeholder={t('death.finalWordsPlaceholder')}
              placeholderTextColor="#57534e"
              value={finalWords}
              onChangeText={setFinalWords}
              multiline
              maxLength={140}
            />
            <Pressable
              className={`py-4 items-center ${finalWords.trim() ? 'bg-blood active:bg-blood-dark' : 'bg-crypt-border'}`}
              onPress={handleSubmit}
              disabled={!finalWords.trim() || submitting}
            >
              {submitting ? (
                <AsciiLoader variant="pulse" color="#ffffff" />
              ) : (
                <Text className={`font-mono font-bold ${finalWords.trim() ? 'text-white' : 'text-bone-dark'}`}>
                  {t('death.etchButton')}
                </Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View className="mb-6">
            <View className="bg-ethereal/20 border border-ethereal p-4 mb-4">
              <Text className="text-ethereal text-sm font-mono text-center">
                {t('death.etchedConfirm')}
              </Text>
            </View>
            <View className="bg-crypt-surface border-l-2 border-ethereal p-4">
              <Text className="text-bone font-mono italic">"{finalWords}"</Text>
            </View>
          </View>
        )}

        {/* Path Trail */}
        {trail.length > 0 && (
          <View className="bg-crypt-surface border border-crypt-border p-4 mb-6">
            <Text className="text-bone-dark text-xs font-mono tracking-widest mb-3">{t('trail.header')}</Text>
            <View>
              {trail.map((row, i) => (
                <View key={i} className="mb-1">
                  <Text className="text-amber text-xs font-mono">
                    {'d'}{row.depth}  {'▸ '}{t(`trail.type.${row.taken.type}`)}
                    {row.taken.boss ? ` ${t('trail.boss')}` : ''}
                  </Text>
                  {row.declined.map((d, j) => (
                    <Text key={j} className="text-bone-dark text-xs font-mono">
                      {'      ▹ '}{t(`trail.type.${d.type}`)} {t('trail.declined')}
                    </Text>
                  ))}
                </View>
              ))}
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
              <Text className="text-white font-mono font-bold tracking-widest">{t('death.shareDeathCard')}</Text>
            </Pressable>
          )}

          <Pressable
            className="bg-amber py-4 items-center active:bg-amber-dark"
            onPress={handlePlayAgain}
          >
            <Text className="text-crypt-bg font-mono font-bold tracking-widest">{t('death.descendAgain')}</Text>
          </Pressable>

          <Pressable
            className="border border-crypt-border-light py-4 items-center active:border-amber"
            onPress={handleHome}
          >
            <Text className="text-bone-muted font-mono">{t('death.returnToSurface')}</Text>
          </Pressable>
        </View>

        {/* Footer */}
        <Text className="text-bone-dark text-xs font-mono text-center mt-6">
          {!isEmptyHanded ? t('death.footerOffering') : t('death.footerNothing')}
        </Text>
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
            <Text className="text-amber text-lg font-mono font-bold text-center mb-4">{t('death.shareModalTitle')}</Text>

            {/* Card Preview */}
            <View className="items-center mb-4">
              <ShareCardCapture viewShotRef={viewShotRef} webRef={webRef}>
                <DeathCard
                  data={{
                    playerName: game.nickname || t('death.defaultNickname'),
                    room: roomNumber,
                    totalRooms: game.graph?.maxDepth ?? 13,
                    killedBy: params.killedBy || null,
                    epitaph: finalWords || t('death.defaultEpitaph'),
                    stakeLost: stakeAmountNum,
                    nowPlaying: musicSource === 'audius' && currentTrack
                      ? { title: currentTrack.title, artist: currentTrack.user.name }
                      : undefined,
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
                <AsciiLoader variant="pulse" color="#ffffff" />
              ) : (
                <Text className="text-white font-mono font-bold">{t('death.share')}</Text>
              )}
            </Pressable>

            <Pressable
              className="py-3 items-center"
              onPress={() => setShowShareModal(false)}
            >
              <Text className="text-bone-muted font-mono">{t('death.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {/* First-death notification opt-in — diegetic, dismissible, nothing gated on outcome */}
      <Modal
        visible={showNotifPrompt}
        transparent
        animationType="fade"
        onRequestClose={handleNotifDecline}
      >
        <View className="flex-1 bg-black/80 justify-center items-center p-4">
          <View className="bg-crypt-surface border border-crypt-border p-5 w-full max-w-[340px]">
            <Text className="text-amber text-sm font-mono font-bold tracking-widest text-center mb-4">
              {t('notif.ask.title')}
            </Text>
            <Text className="text-bone text-base font-mono italic leading-6 text-center mb-6">
              {t('notif.ask.body')}
            </Text>
            <Pressable
              className="bg-amber py-4 items-center active:bg-amber-dark mb-3"
              onPress={handleNotifAccept}
            >
              <Text className="text-crypt-bg font-mono font-bold tracking-widest">{t('notif.ask.accept')}</Text>
            </Pressable>
            <Pressable
              className="border border-crypt-border-light py-3 items-center active:border-amber"
              onPress={handleNotifDecline}
            >
              <Text className="text-bone-muted font-mono">{t('notif.ask.decline')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </SafeAreaView>
    <CRTOverlay />
    </CryptBackground>
  );
}
