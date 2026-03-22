import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { CryptBackground } from '../components/CryptBackground';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../lib/GameContext';
import { useAudio } from '../lib/audio';
import { useGameSettings, useCurrentPlayer } from '../lib/instant';
import { AudioToggle } from '../components/AudioToggle';
import { AudioSettingsModal } from '../components/AudioSettingsModal';
import { CRTOverlay } from '../components/CRTOverlay';
import { NicknameModal } from '../components/NicknameModal';
import { LinkWalletModal } from '../components/LinkWalletModal';
import { AsciiLoader } from '../components/AsciiLoader';
import { isWalletCancellation } from '../lib/wallet-utils';

const STAKE_OPTIONS = [0.01, 0.05, 0.1, 0.25];

// Zone data for display purposes only (name + emoji lookup)
const ZONE_META: Record<string, { name: string; emoji: string; accentColor: string; bgColor: string; element: string; tagline: string }> = {
  'sunken-crypt':   { name: 'THE SUNKEN CRYPT',   emoji: '🌊', accentColor: '#4a9eff', bgColor: '#0a1628', element: 'WATER', tagline: 'The dead float here. They always rise.' },
  'ashen-crypts':   { name: 'THE ASHEN CRYPTS',   emoji: '🔥', accentColor: '#ff6b2b', bgColor: '#1a0800', element: 'FIRE',  tagline: 'Everything here has already burned.' },
  'frozen-gallery': { name: 'THE FROZEN GALLERY',  emoji: '❄️', accentColor: '#7eceff', bgColor: '#040d14', element: 'ICE',   tagline: 'Time stopped here. The dead are preserved perfectly.' },
  'living-tomb':    { name: 'THE LIVING TOMB',     emoji: '🩸', accentColor: '#c0392b', bgColor: '#0f0000', element: 'ORGANIC', tagline: 'The walls breathe. Something grows in the dark.' },
  'void-beyond':    { name: 'THE VOID BEYOND',     emoji: '🌑', accentColor: '#9b59b6', bgColor: '#06000f', element: 'VOID',  tagline: 'You are not sure this place exists.' },
};

export default function StakeScreen() {
  const game = useGame();
  const { playSFX, playAmbient } = useAudio();
  const { settings } = useGameSettings();
  const { player } = useCurrentPlayer();
  const { zoneId: rawZoneId } = useLocalSearchParams<{ zoneId: string }>();
  const zoneId = rawZoneId ?? 'sunken-crypt';
  const zoneMeta = ZONE_META[zoneId] ?? ZONE_META['sunken-crypt'];

  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
  const [selectedStake, setSelectedStake] = useState(0.05);
  const [staking, setStaking] = useState(false);
  const [stakingMode, setStakingMode] = useState<'stake' | 'free' | null>(null);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [walletStatus, setWalletStatus] = useState<'idle' | 'connecting' | 'cancelled' | 'error'>('idle');
  const [sealStatus, setSealStatus] = useState<'idle' | 'signing' | 'cancelled' | 'error'>('idle');
  const [showNicknameEdit, setShowNicknameEdit] = useState(false);
  const [showLinkWallet, setShowLinkWallet] = useState(false);
  const [pendingRun, setPendingRun] = useState<{ stake: number; emptyHanded: boolean; zoneId: string } | null>(null);
  const [freeRunStatus, setFreeRunStatus] = useState<'idle' | 'error'>('idle');

  useEffect(() => {
    playAmbient('ambient-title');
  }, []);

  // Resume pendingRun after nickname is set (either via modal submission
  // or async sync for returning users who already have one).
  useEffect(() => {
    if (!pendingRun || game.showNicknameModal) return;
    if (!game.isAuthenticated) return;
    if (!game.nickname) return; // still waiting for syncNickname

    const run = pendingRun;
    setPendingRun(null);
    game.startGame(run.stake, run.emptyHanded, run.zoneId, player?.totalDeaths)
      .then(() => {
        playSFX('depth-descend');
        router.push('/play');
      })
      .catch((err) => {
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

  const handleStake = async (emptyHanded = false) => {
    setStaking(true);
    setStakingMode(emptyHanded ? 'free' : 'stake');
    if (!emptyHanded) setSealStatus('signing');
    playSFX('confirm-action');

    try {
      if (emptyHanded) {
        // Empty-handed should NEVER force wallet users back into guest mode.
        // Only establish guest auth if the player is not authenticated yet.
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
        setPendingRun({ stake: selectedStake, emptyHanded, zoneId });
        setStaking(false);
        return;
      }

      await game.startGame(selectedStake, emptyHanded, zoneId, player?.totalDeaths);
      if (!emptyHanded) setSealStatus('idle');
      playSFX('depth-descend');
      router.push('/play');
    } catch (err) {
      if (!emptyHanded) {
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
    <SafeAreaView className="flex-1">
      {/* Header */}
      <View className="relative flex-row items-center justify-between px-4 py-3 border-b border-crypt-border">
        {/* Back to zone selector */}
        <Pressable
          onPress={() => router.replace('/zone-select')}
          className="py-2 px-3 -ml-3"
        >
          <Text className="text-bone-muted text-xs font-mono">[ ZONES ]</Text>
        </Pressable>

        {/* True center title across full header width */}
        <View className="absolute inset-x-0 items-center" style={{ pointerEvents: 'none' }}>
          <Text className="text-amber text-base font-mono font-bold tracking-widest">THE TOLL</Text>
        </View>

        <AudioToggle ambientTrack="ambient-title" inline onSettingsPress={() => setAudioSettingsOpen(true)} />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-5" style={{ backgroundColor: 'transparent' }}>

        {/* Zone identity */}
        <View className="mb-5 pb-4 border-b border-crypt-border">
          <Text style={{ color: zoneMeta.accentColor ?? '#c8a96e' }} className="text-[10px] font-mono tracking-widest mb-1">
            [ {zoneMeta.element} ]
          </Text>
          <Text style={{ color: zoneMeta.accentColor ?? '#c8a96e' }} className="text-lg font-mono font-bold tracking-widest">
            {zoneMeta.name}
          </Text>
          {zoneMeta.tagline ? (
            <Text className="text-bone-muted text-xs font-mono mt-1 leading-4">{zoneMeta.tagline}</Text>
          ) : null}
        </View>

        {/* Warning */}
        <View className="bg-blood/10 border border-blood-dark p-4 mb-6">
          <Text className="text-blood-light text-sm font-mono leading-5">
Offer it. Lose it on death. Escape and claim more.
          </Text>
        </View>

        {/* Stake options */}
        <View className="mb-6">
          <Text className="text-bone-dark text-xs font-mono tracking-widest mb-3">CHOOSE YOUR OFFERING</Text>
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
                  {game.nickname || 'Wanderer'}
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
                  <Text className="text-amber-light text-xs font-mono font-bold">{game.balance.toFixed(3)} SOL</Text>
                </>
              )}
              <Text className="text-bone-dark text-xs">·</Text>
              <Pressable onPress={() => game.disconnect()}>
                <Text className="text-bone-muted text-xs font-mono">[logout]</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View className="gap-3 mb-4">
          {!game.walletConnected ? (
            <>
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
                  <Text className="text-bone-muted font-mono font-bold tracking-wider">REJECTED</Text>
                ) : walletStatus === 'error' ? (
                  <Text className="text-blood-light font-mono font-bold tracking-wider">FAILED — TAP TO RETRY</Text>
                ) : (
                  <View className="items-center">
                    <Text className="text-white font-mono font-bold tracking-wider leading-tight">BIND WALLET</Text>
                    <Text className="text-white/80 text-[9px] font-mono mt-0.5 leading-none">[DEVNET]</Text>
                  </View>
                )}
              </Pressable>

              <Pressable
                className={`border py-4 items-center ${freeRunStatus === 'error' ? 'border-blood' : 'border-crypt-border-light active:border-amber'}`}
                onPress={() => handleStake(true)}
                disabled={staking}
              >
                {staking ? (
                  <AsciiLoader variant="pulse" color="#a8a29e" />
                ) : freeRunStatus === 'error' ? (
                  <Text className="text-blood font-mono">FAILED — TAP TO RETRY</Text>
                ) : (
                  <Text className="text-bone-muted font-mono">EMPTY-HANDED</Text>
                )}
              </Pressable>
            </>
          ) : (
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
                  <Text className="text-bone-muted font-mono font-bold tracking-wider">REJECTED</Text>
                ) : sealStatus === 'error' ? (
                  <Text className="text-blood-light font-mono font-bold tracking-wider">FAILED — TAP TO RETRY</Text>
                ) : (
                  <View className="items-center">
                    <Text className="text-crypt-bg font-mono font-bold tracking-wider leading-tight">SEAL YOUR FATE</Text>
                    <Text className="text-crypt-bg/70 text-[9px] font-mono mt-0.5 leading-none">[DEVNET]</Text>
                  </View>
                )}
              </Pressable>

              {game.balance !== null && game.balance < selectedStake && (
                <Text className="text-blood text-xs font-mono text-center">
                  Insufficient balance ({game.balance.toFixed(3)} SOL)
                </Text>
              )}

              <Pressable
                className={`border py-4 items-center ${freeRunStatus === 'error' ? 'border-blood' : 'border-crypt-border-light active:border-amber'}`}
                onPress={() => handleStake(true)}
                disabled={staking}
              >
                {stakingMode === 'free' ? (
                  <AsciiLoader variant="pulse" color="#a8a29e" />
                ) : freeRunStatus === 'error' ? (
                  <Text className="text-blood font-mono">FAILED — TAP TO RETRY</Text>
                ) : (
                  <Text className="text-bone-muted font-mono">EMPTY-HANDED</Text>
                )}
              </Pressable>
            </>
          )}
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
              SELECT WALLET
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
              <Text className="text-bone-muted text-sm font-mono text-center">Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Nickname Modal - first-time setup */}
      <NicknameModal
        visible={game.showNicknameModal}
        onSubmit={async (name) => {
          await game.setNickname(name);
          if (pendingRun) {
            const { stake, emptyHanded, zoneId: pZoneId } = pendingRun;
            setPendingRun(null);
            await game.startGame(stake, emptyHanded, pZoneId, player?.totalDeaths);
            playSFX('depth-descend');
            router.push('/play');
          }
        }}
        onSkip={async () => {
          game.dismissNicknameModal();
          if (pendingRun) {
            const { stake, emptyHanded, zoneId: pZoneId } = pendingRun;
            setPendingRun(null);
            await game.startGame(stake, emptyHanded, pZoneId, player?.totalDeaths);
            playSFX('depth-descend');
            router.push('/play');
          }
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

      <AudioSettingsModal visible={audioSettingsOpen} onClose={() => setAudioSettingsOpen(false)} />
    </SafeAreaView>
    <CRTOverlay />
    </CryptBackground>
  );
}
