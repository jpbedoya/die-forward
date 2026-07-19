import { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { CryptBackground } from '../components/CryptBackground';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../lib/GameContext';
import { useAudio } from '../lib/audio';
import { useGameSettings, useCurrentPlayer } from '../lib/instant';
import { AudioToggle } from '../components/AudioToggle';
import { SettingsModal } from '../components/SettingsModal';
import { CRTOverlay } from '../components/CRTOverlay';
import { NicknameModal } from '../components/NicknameModal';
import { LinkWalletModal } from '../components/LinkWalletModal';
import { AsciiLoader } from '../components/AsciiLoader';
import { isWalletCancellation } from '../lib/wallet-utils';
import { t } from '../lib/i18n';
import { getDailyShift, utcDayKey } from '../lib/world-shift';
import { RUN_MODIFIERS } from '../lib/modifiers';
import { API_BASE } from '../lib/api';
import { resolveStakeUi, isStakingPosture, DEFAULT_STAKING_POSTURE, type StakingPosture } from '../lib/stake-posture';
import { COIN_STAKE_OPTIONS, sealTier } from '../lib/coins';

const STAKE_OPTIONS = [0.01, 0.05, 0.1, 0.25];

// Zone data for display purposes only (emoji + color lookup; name/element/tagline come from i18n)
const ZONE_META: Record<string, { emoji: string; accentColor: string; bgColor: string }> = {
  'sunken-crypt':   { emoji: '🌊', accentColor: '#4a9eff', bgColor: '#0a1628' },
  'ashen-crypts':   { emoji: '🔥', accentColor: '#ff6b2b', bgColor: '#1a0800' },
  'frozen-gallery': { emoji: '❄️', accentColor: '#7eceff', bgColor: '#040d14' },
  'living-tomb':    { emoji: '🩸', accentColor: '#c0392b', bgColor: '#0f0000' },
  'void-beyond':    { emoji: '🌑', accentColor: '#9b59b6', bgColor: '#06000f' },
};

export default function StakeScreen() {
  const insets = useSafeAreaInsets();
  const game = useGame();
  const { playSFX, playAmbient } = useAudio();
  const { settings } = useGameSettings();
  const { player } = useCurrentPlayer();
  const { zoneId: rawZoneId } = useLocalSearchParams<{ zoneId: string }>();
  const zoneId = rawZoneId ?? 'sunken-crypt';
  const zoneMeta = ZONE_META[zoneId] ?? ZONE_META['sunken-crypt'];
  const zoneMetaId = ZONE_META[zoneId] ? zoneId : 'sunken-crypt';
  const zoneName = t(`stake.zone.${zoneMetaId}.name`);
  const zoneElement = t(`stake.zone.${zoneMetaId}.element`);
  const zoneTagline = t(`stake.zone.${zoneMetaId}.tagline`);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedStake, setSelectedStake] = useState(0.05);
  const [staking, setStaking] = useState(false);
  const [stakingMode, setStakingMode] = useState<'stake' | 'free' | 'coin' | null>(null);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [walletStatus, setWalletStatus] = useState<'idle' | 'connecting' | 'cancelled' | 'error'>('idle');
  const [sealStatus, setSealStatus] = useState<'idle' | 'signing' | 'cancelled' | 'error'>('idle');
  const [showNicknameEdit, setShowNicknameEdit] = useState(false);
  const [showLinkWallet, setShowLinkWallet] = useState(false);
  const [pendingRun, setPendingRun] = useState<{ stake: number; emptyHanded: boolean; zoneId: string; chosenModifierId?: string; coinStake?: number } | null>(null);
  const [freeRunStatus, setFreeRunStatus] = useState<'idle' | 'error'>('idle');
  const [coinRunStatus, setCoinRunStatus] = useState<'idle' | 'error'>('idle');

  // Coin-Bound (Task 7): the Toll's Pale Coin stake ladder. Selection defaults
  // to the smallest option; the balance check that disables an option happens
  // at render time against the live player row.
  const [selectedCoinStake, setSelectedCoinStake] = useState<number>(COIN_STAKE_OPTIONS[0]);
  const paleCoinsBalance = player?.paleCoins ?? 0;
  const showCoinBound = paleCoinsBalance >= COIN_STAKE_OPTIONS[0];

  // The Shift (Task 6): admin-controlled staking posture — gates whether the
  // SOL section renders at all. Defaults to 'ritual' while the fetch is in
  // flight or fails, matching the API route's own fallback.
  const [stakingPosture, setStakingPosture] = useState<StakingPosture>(DEFAULT_STAKING_POSTURE);
  useEffect(() => {
    fetch(`${API_BASE}/api/game/settings`)
      .then((r) => r.json())
      .then((data) => {
        if (isStakingPosture(data?.stakingPosture)) {
          setStakingPosture(data.stakingPosture);
        }
      })
      .catch(() => {
        // fallback: DEFAULT_STAKING_POSTURE (already the default state)
      });
  }, []);
  const { showSol, showRitualIntro } = resolveStakeUi({
    posture: stakingPosture,
    totalDeaths: player?.totalDeaths ?? 0,
    walletConnected: game.walletConnected,
  });

  // Today's modifier pool for this zone (The Toll's offer). Empty when the
  // daily shift is disabled — in that case no chooser renders and startGame
  // gets no chosenModifierId (falls back to its own random roll).
  const dayKey = utcDayKey();
  const modifierPool = useMemo(
    () => (settings.dailyShiftEnabled ? getDailyShift(zoneId, dayKey).modifierPool : []),
    [zoneId, dayKey, settings.dailyShiftEnabled]
  );
  const [selectedModifier, setSelectedModifier] = useState<string | undefined>(undefined);

  // Preselect the first offered modifier whenever the pool (re)loads.
  useEffect(() => {
    setSelectedModifier(modifierPool[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modifierPool.join(',')]);

  useEffect(() => {
    playAmbient('ambient-title');
  }, []);

  const resumePendingRun = async (run: { stake: number; emptyHanded: boolean; zoneId: string; chosenModifierId?: string; coinStake?: number }) => {
    setPendingRun(null);
    await game.startGame(run.stake, run.emptyHanded, run.zoneId, player?.totalDeaths, run.chosenModifierId, run.coinStake);
    playSFX('depth-descend');
    router.push('/play');
  };

  // Resume pendingRun after nickname is set (either via modal submission
  // or async sync for returning users who already have one).
  useEffect(() => {
    if (!pendingRun || game.showNicknameModal) return;
    if (!game.isAuthenticated) return;
    if (!game.nickname) return; // still waiting for syncNickname

    resumePendingRun(pendingRun).catch((err) => {
      console.error('Failed to start pending game:', err);
      setFreeRunStatus('error');
      playSFX('error-buzz');
      setTimeout(() => setFreeRunStatus('idle'), 2000);
    });
  }, [pendingRun, game.isAuthenticated, game.nickname, game.showNicknameModal]);

  const flashWalletStatus = (status: 'cancelled' | 'error') => {
    setWalletStatus(status);
    setTimeout(() => setWalletStatus('idle'), 2000);
  };

  const flashSealStatus = (status: 'cancelled' | 'error') => {
    setSealStatus(status);
    setTimeout(() => setSealStatus('idle'), 2000);
  };

  const handleConnect = async () => {
    playSFX('ui-click');
    game.clearError();

    if (game.connectors.length > 1) {
      setShowWalletPicker(true);
      return;
    }

    setWalletStatus('connecting');
    try {
      await game.connect();
      setWalletStatus('idle');
      if (game.guestProgressExists) {
        setShowLinkWallet(true);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg === 'MULTIPLE_WALLETS') {
        setWalletStatus('idle');
        setShowWalletPicker(true);
      } else if (isWalletCancellation(err)) {
        flashWalletStatus('cancelled');
      } else {
        flashWalletStatus('error');
      }
    } finally {
      setTimeout(() => {
        setWalletStatus((prev) => (prev === 'connecting' ? 'idle' : prev));
      }, 50);
    }
  };

  const handleSelectWallet = async (connectorId: string) => {
    playSFX('ui-click');
    setShowWalletPicker(false);
    setWalletStatus('connecting');
    try {
      await game.connectTo(connectorId);
      setWalletStatus('idle');
      if (game.guestProgressExists) {
        setShowLinkWallet(true);
      }
    } catch (err) {
      if (isWalletCancellation(err)) {
        flashWalletStatus('cancelled');
      } else {
        flashWalletStatus('error');
      }
    } finally {
      setTimeout(() => {
        setWalletStatus((prev) => (prev === 'connecting' ? 'idle' : prev));
      }, 50);
    }
  };

  const handleStake = async (emptyHanded = false, coinAmount?: number) => {
    const isCoinRun = (coinAmount ?? 0) > 0;
    setStaking(true);
    setStakingMode(isCoinRun ? 'coin' : emptyHanded ? 'free' : 'stake');
    if (!emptyHanded && !isCoinRun) setSealStatus('signing');
    playSFX('confirm-action');

    try {
      if (emptyHanded || isCoinRun) {
        // Empty-handed and Coin-Bound runs never carry a SOL tx — neither
        // should force wallet users back into guest mode. Only establish
        // guest auth if the player is not authenticated yet.
        if (!game.isAuthenticated) {
          await game.signInEmptyHanded();
        }
      } else {
        if (!game.walletConnected) {
          throw new Error('Connect wallet first');
        }
        // Auto-auth effect may not have completed yet — trigger explicitly as fallback
        if (!game.isAuthenticated || game.authType !== 'wallet') {
          await game.signInWithWallet();
        }
      }

      // Pause for nickname if the user doesn't have one yet.
      // syncNickname in GameContext will show the modal from local state
      // (no DB round-trip required), and pendingRun resumes after submission.
      if (!game.nickname) {
        setPendingRun({ stake: selectedStake, emptyHanded: emptyHanded || isCoinRun, zoneId, chosenModifierId: selectedModifier, coinStake: coinAmount });
        setStaking(false);
        return;
      }

      // A Coin-Bound run mirrors the empty-handed shape (no SOL tx, amount 0)
      // and threads coinAmount as startGame's 6th arg so GameContext resolves
      // stakeMode: 'coins' via resolveStakeIntent.
      await game.startGame(
        isCoinRun ? 0 : selectedStake,
        emptyHanded || isCoinRun,
        zoneId,
        player?.totalDeaths,
        selectedModifier,
        coinAmount,
      );
      if (!emptyHanded && !isCoinRun) setSealStatus('idle');
      playSFX('depth-descend');
      router.push('/play');
    } catch (err) {
      if (isCoinRun) {
        console.error('Failed to start coin-bound game:', err);
        setCoinRunStatus('error');
        playSFX('error-buzz');
        setTimeout(() => setCoinRunStatus('idle'), 2000);
      } else if (!emptyHanded) {
        if (isWalletCancellation(err)) {
          flashSealStatus('cancelled');
        } else {
          console.error('Failed to start game:', err);
          flashSealStatus('error');
          playSFX('error-buzz');
        }
      } else {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('Failed to start game:', err);
        setFreeRunStatus('error');
        playSFX('error-buzz');
      }
    } finally {
      setStaking(false);
      setStakingMode(null);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <CryptBackground screen="stake">
    <SafeAreaView className="flex-1" edges={['left', 'right', 'bottom']}>
      {/* Header */}
      <View className="relative flex-row items-center justify-between px-4 border-b border-crypt-border" style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}>
        {/* Back to zone selector */}
        <Pressable
          onPress={() => router.replace('/zone-select')}
          className="py-2 px-3 -ml-3"
        >
          <Text className="text-bone-muted text-xs font-mono">{t('stake.nav.zones')}</Text>
        </Pressable>

        {/* True center title across full header width */}
        <View className="absolute inset-x-0 items-center" style={{ pointerEvents: 'none' }}>
          <Text className="text-amber text-base font-mono font-bold tracking-widest">{t('stake.title')}</Text>
        </View>

        <AudioToggle ambientTrack="ambient-title" inline onSettingsPress={() => setSettingsOpen(true)} />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-5" style={{ backgroundColor: 'transparent' }}>

        {/* Zone identity */}
        <View className="mb-5 pb-4 border-b border-crypt-border">
          <Text style={{ color: zoneMeta.accentColor ?? '#c8a96e' }} className="text-[10px] font-mono tracking-widest mb-1">
            [ {zoneElement} ]
          </Text>
          <Text style={{ color: zoneMeta.accentColor ?? '#c8a96e' }} className="text-lg font-mono font-bold tracking-widest">
            {zoneName}
          </Text>
          {zoneTagline ? (
            <Text className="text-bone-muted text-xs font-mono mt-1 leading-4">{zoneTagline}</Text>
          ) : null}
        </View>

        {/* SOL staking section — gated by admin staking posture (Task 6). Hidden
            entirely in 'hidden' posture, and in 'ritual' posture below the
            death threshold; the ritual intro line renders once unlocked. */}
        {showSol && (
          <>
            {showRitualIntro && (
              <Text className="text-bone-muted text-xs font-mono italic mb-4 leading-4">
                {t('stake.ritual.intro')}
              </Text>
            )}

            {/* Warning */}
            <View className="bg-blood/10 border border-blood-dark p-4 mb-6">
              <Text className="text-blood-light text-sm font-mono leading-5">
{t('stake.warning')}
              </Text>
            </View>

            {/* Stake options */}
            <View className="mb-6">
              <Text className="text-bone-dark text-xs font-mono tracking-widest mb-3">{t('stake.choose_offering')}</Text>
              <View className="flex-row gap-2">
                {STAKE_OPTIONS.map((amount) => (
                  <Pressable
                    key={amount}
                    className={`flex-1 py-3 items-center border ${
                      selectedStake === amount
                        ? 'border-amber bg-amber/10'
                        : 'border-crypt-border-light bg-crypt-surface'
                    }`}
                    onPress={() => {
                      playSFX('ui-click');
                      setSelectedStake(amount);
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
            </View>

            {/* Summary */}
            <View className="bg-crypt-surface border border-crypt-border p-4 mb-6">
              <View className="flex-row justify-between mb-2">
                <Text className="text-bone-dark text-sm font-mono">{t('stake.summary.offering_label')}</Text>
                <Text className="text-bone-muted text-sm font-mono">{selectedStake}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-bone-dark text-sm font-mono">{t('stake.summary.escape_bonus_label', { percent: settings.victoryBonusPercent })}</Text>
                <Text className="text-victory text-sm font-mono">+{(selectedStake * settings.victoryBonusPercent / 100).toFixed(3)}</Text>
              </View>
              <View className="flex-row justify-between border-t border-crypt-border pt-3 mt-1">
                <Text className="text-bone-muted text-sm font-mono font-bold">{t('stake.summary.survive_label')}</Text>
                <Text className="text-amber-light text-base font-mono font-bold">{t('stake.sol_amount', { amount: (selectedStake * (1 + settings.victoryBonusPercent / 100)).toFixed(3) })}</Text>
              </View>
            </View>
          </>
        )}

        {/* The Toll's offer: today's modifier pool for this zone */}
        {settings.dailyShiftEnabled && modifierPool.length > 0 && (
          <View className="mb-6">
            <Text className="text-bone-dark text-xs font-mono tracking-widest mb-3">{t('stake.offer.title')}</Text>
            <View className="gap-2">
              {modifierPool.map((modId) => {
                const mod = RUN_MODIFIERS.find((m) => m.id === modId);
                if (!mod) return null;
                const selected = selectedModifier === modId;
                return (
                  <Pressable
                    key={modId}
                    className={`flex-row items-center gap-3 p-3 border ${
                      selected
                        ? 'border-amber bg-amber/10'
                        : 'border-crypt-border-light bg-crypt-surface'
                    }`}
                    onPress={() => {
                      playSFX('ui-click');
                      setSelectedModifier(modId);
                    }}
                  >
                    <Text className="text-xl">{mod.emoji}</Text>
                    <View className="flex-1">
                      <Text className={`font-mono text-sm font-bold ${
                        selected ? 'text-amber-light' : 'text-bone-muted'
                      }`}>
                        {t(`modifier.${modId}.name`)}
                      </Text>
                      <Text className="text-bone-dark text-xs font-mono mt-0.5 leading-4">
                        {t(`modifier.${modId}.desc`)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Coin-Bound: Pale Coin staking (Task 7). Renders in every staking
            posture — independent of showSol — as long as the player holds at
            least the cheapest rung of the ladder. */}
        {showCoinBound && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-bone-dark text-xs font-mono tracking-widest">{t('stake.coin.title')}</Text>
              <Text className="text-amber-light text-sm font-mono font-bold">
                {t('stake.coin.balance', { amount: paleCoinsBalance })}
              </Text>
            </View>

            <View className="flex-row gap-2 mb-3">
              {COIN_STAKE_OPTIONS.map((amount) => {
                const disabled = amount > paleCoinsBalance;
                const selected = selectedCoinStake === amount;
                return (
                  <Pressable
                    key={amount}
                    className={`flex-1 py-3 items-center border ${
                      disabled
                        ? 'border-crypt-border bg-crypt-surface opacity-40'
                        : selected
                          ? 'border-amber bg-amber/10'
                          : 'border-crypt-border-light bg-crypt-surface'
                    }`}
                    onPress={() => {
                      if (disabled) return;
                      playSFX('ui-click');
                      setSelectedCoinStake(amount);
                    }}
                    disabled={disabled}
                  >
                    <Text className={`font-mono text-base ${
                      disabled ? 'text-bone-dark' : selected ? 'text-amber-light' : 'text-bone-muted'
                    }`}>
                      🪙 {amount}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {(player?.bindingStreak ?? 0) > 0 && (
              <Text className="text-amber-light text-xs font-mono mb-3">
                {'⟐'.repeat(sealTier(player?.bindingStreak ?? 0))} {t('coin.streak', { n: player?.bindingStreak ?? 0 })}
              </Text>
            )}

            <Pressable
              className={`py-2.5 items-center ${
                coinRunStatus === 'error'
                  ? 'bg-blood/60'
                  : staking || selectedCoinStake > paleCoinsBalance
                    ? 'bg-amber/50'
                    : 'bg-amber active:bg-amber-dark'
              }`}
              onPress={() => handleStake(true, selectedCoinStake)}
              disabled={staking || selectedCoinStake > paleCoinsBalance}
            >
              {staking && stakingMode === 'coin' ? (
                <AsciiLoader variant="pulse" color="#0d0d0d" />
              ) : coinRunStatus === 'error' ? (
                <Text className="text-blood-light font-mono font-bold tracking-wider">{t('stake.failed_retry')}</Text>
              ) : (
                <Text className="text-crypt-bg font-mono font-bold tracking-wider">{t('stake.coin.bind_action')}</Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Identity row */}
        <View className="items-center mb-5">
          <Pressable
            className="flex-row items-center gap-2"
            onPress={() => setShowNicknameEdit(true)}
          >
            <Text className="text-bone text-base">🪦</Text>
            {game.isAuthenticated && game.authType === 'wallet' && game.nickname === null
              ? <AsciiLoader />
              : <Text className="text-amber text-sm font-mono font-bold">
                  {game.nickname || t('stake.wanderer')}
                </Text>
            }
            <Text className="text-bone-dark text-xs">✎</Text>
          </Pressable>
          {game.walletConnected && game.walletAddress && (
            <View className="flex-row items-center gap-2 mt-1">
              <Text className="text-bone-dark text-xs font-mono">{formatAddress(game.walletAddress)}</Text>
              {game.balance !== null && (
                <>
                  <Text className="text-bone-dark text-xs">·</Text>
                  <Text className="text-amber-light text-xs font-mono font-bold">{t('stake.sol_amount', { amount: game.balance.toFixed(3) })}</Text>
                </>
              )}
              <Text className="text-bone-dark text-xs">·</Text>
              <Pressable onPress={() => game.disconnect()}>
                <Text className="text-bone-muted text-xs font-mono">{t('stake.logout')}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Action buttons. SOL binding (BIND WALLET / SEAL FATE) only renders
            when showSol is true (Task 6) — the empty-handed/free-run path
            stays available in every posture. */}
        <View className="gap-3 mb-4">
          {showSol && !game.walletConnected && (
            <Pressable
              className={`py-2.5 items-center ${
                walletStatus === 'cancelled' ? 'bg-stone-700' :
                walletStatus === 'error' ? 'bg-blood/60' :
                walletStatus === 'connecting' ? 'bg-purple-900' :
                'bg-purple-700 active:bg-purple-800'
              }`}
              onPress={handleConnect}
              disabled={game.loading || staking || walletStatus === 'connecting'}
            >
              {walletStatus === 'connecting' ? (
                <AsciiLoader variant="pulse" color="#ffffff" />
              ) : walletStatus === 'cancelled' ? (
                <Text className="text-bone-muted font-mono font-bold tracking-wider">{t('stake.rejected')}</Text>
              ) : walletStatus === 'error' ? (
                <Text className="text-blood-light font-mono font-bold tracking-wider">{t('stake.failed_retry')}</Text>
              ) : (
                <View className="items-center">
                  <Text className="text-white font-mono font-bold tracking-wider leading-tight">{t('stake.bind_wallet')}</Text>
                  <Text className="text-white/80 text-[9px] font-mono mt-0.5 leading-none">[DEVNET]</Text>
                </View>
              )}
            </Pressable>
          )}

          {showSol && game.walletConnected && (
            <>
              <Pressable
                className={`py-2.5 items-center ${
                  sealStatus === 'cancelled' ? 'bg-stone-700' :
                  sealStatus === 'error' ? 'bg-blood/60' :
                  sealStatus === 'signing' ? 'bg-amber/70' :
                  staking || (game.balance !== null && game.balance < selectedStake)
                    ? 'bg-amber/50'
                    : 'bg-amber active:bg-amber-dark'
                }`}
                onPress={() => handleStake(false)}
                disabled={staking || sealStatus !== 'idle' || (game.balance !== null && game.balance < selectedStake)}
              >
                {staking && stakingMode === 'stake' ? (
                  <AsciiLoader variant="pulse" color="#0d0d0d" />
                ) : sealStatus === 'cancelled' ? (
                  <Text className="text-bone-muted font-mono font-bold tracking-wider">{t('stake.rejected')}</Text>
                ) : sealStatus === 'error' ? (
                  <Text className="text-blood-light font-mono font-bold tracking-wider">{t('stake.failed_retry')}</Text>
                ) : (
                  <View className="items-center">
                    <Text className="text-crypt-bg font-mono font-bold tracking-wider leading-tight">{t('stake.seal_fate')}</Text>
                    <Text className="text-crypt-bg/70 text-[9px] font-mono mt-0.5 leading-none">[DEVNET]</Text>
                  </View>
                )}
              </Pressable>

              {game.balance !== null && game.balance < selectedStake && (
                <Text className="text-blood text-xs font-mono text-center">
                  {t('stake.insufficient_balance', { amount: game.balance.toFixed(3) })}
                </Text>
              )}
            </>
          )}

          <Pressable
            className={`border py-4 items-center ${freeRunStatus === 'error' ? 'border-blood' : 'border-crypt-border-light active:border-amber'}`}
            onPress={() => handleStake(true)}
            disabled={staking}
          >
            {stakingMode === 'free' ? (
              <AsciiLoader variant="pulse" color="#a8a29e" />
            ) : freeRunStatus === 'error' ? (
              <Text className="text-blood font-mono">{t('stake.failed_retry')}</Text>
            ) : (
              <Text className="text-bone-muted font-mono">{t('stake.empty_handed')}</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* Wallet Picker Modal */}
      <Modal
        visible={showWalletPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWalletPicker(false)}
      >
        <Pressable
          className="flex-1 bg-black/80 justify-center items-center p-6"
          onPress={() => setShowWalletPicker(false)}
        >
          <View className="bg-crypt-bg border border-crypt-border w-full max-w-sm p-4">
            <Text className="text-amber text-lg font-mono font-bold text-center mb-4">
              {t('stake.select_wallet')}
            </Text>

            {game.connectors.map((connector) => (
              <Pressable
                key={connector.id}
                className="bg-crypt-surface border border-crypt-border p-4 mb-2 flex-row items-center active:opacity-80"
                onPress={() => handleSelectWallet(connector.id)}
              >
                <Text className="text-bone text-base font-mono flex-1">
                  {connector.name}
                </Text>
                <Text className="text-bone-muted text-xl">→</Text>
              </Pressable>
            ))}

            <Pressable
              className="mt-4 p-3"
              onPress={() => setShowWalletPicker(false)}
            >
              <Text className="text-bone-muted text-sm font-mono text-center">{t('stake.cancel')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Nickname Modal - first-time setup */}
      <NicknameModal
        visible={game.showNicknameModal}
        onSubmit={async (name) => {
          await game.setNickname(name);
          if (pendingRun) await resumePendingRun(pendingRun);
        }}
        onSkip={async () => {
          game.dismissNicknameModal();
          if (pendingRun) await resumePendingRun(pendingRun);
        }}
      />

      {/* Nickname Edit Modal - tap 🪦 to open */}
      <NicknameModal
        visible={showNicknameEdit}
        initialValue={game.nickname || ''}
        onSubmit={(name) => {
          game.setNickname(name);
          setShowNicknameEdit(false);
        }}
        onSkip={() => setShowNicknameEdit(false)}
      />

      {/* Link Wallet Modal - for guests to upgrade their account */}
      <LinkWalletModal
        visible={showLinkWallet}
        onClose={() => setShowLinkWallet(false)}
      />

      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </SafeAreaView>
    <CRTOverlay />
    </CryptBackground>
  );
}
