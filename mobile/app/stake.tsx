import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, Modal, Animated } from 'react-native';
import { CryptBackground } from '../components/CryptBackground';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../lib/GameContext';
import { useAudio } from '../lib/audio';
import { useGameSettings } from '../lib/instant';
import { AudioToggle } from '../components/AudioToggle';
import { AudioSettingsModal } from '../components/AudioSettingsModal';
import { CRTOverlay } from '../components/CRTOverlay';
import { NicknameModal } from '../components/NicknameModal';
import { LinkWalletModal } from '../components/LinkWalletModal';

const STAKE_OPTIONS = [0.01, 0.05, 0.1, 0.25];

// Sweeping ░▒▓ placeholder while nickname loads from DB
function NicknameSkeleton() {
  const [tick, setTick] = useState(0);
  const WIDTH = 8;

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 90);
    return () => clearInterval(id);
  }, []);

  // Single ▓ peak sweeps left→right over a ░ field, fading via ▒
  const pos = tick % (WIDTH + 2); // +2 so peak enters and exits cleanly
  const chars = Array.from({ length: WIDTH }, (_, i) => {
    const dist = Math.abs(i - pos);
    if (dist === 0) return '▓';
    if (dist === 1) return '▒';
    return '░';
  }).join('');

  return (
    <Text style={{ fontFamily: 'monospace', fontSize: 14, color: '#3a3530', letterSpacing: 1 }}>
      {chars}
    </Text>
  );
}

export default function StakeScreen() {
  const game = useGame();
  const { playSFX, playAmbient } = useAudio();
  const { settings } = useGameSettings();
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
  const [selectedStake, setSelectedStake] = useState(0.05);
  const [customStake, setCustomStake] = useState('');
  const [staking, setStaking] = useState(false);
  const [stakingMode, setStakingMode] = useState<'stake' | 'free' | null>(null);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [walletStatus, setWalletStatus] = useState<'idle' | 'connecting' | 'cancelled' | 'error'>('idle');
  const [sealStatus, setSealStatus] = useState<'idle' | 'signing' | 'cancelled' | 'error'>('idle');
  const [showNicknameEdit, setShowNicknameEdit] = useState(false);
  const [showLinkWallet, setShowLinkWallet] = useState(false);

  useEffect(() => {
    playAmbient('ambient-title');
  }, []);

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

    // If multiple wallets available, show picker
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
      const isCancellation =
        errMsg === 'WALLET_CANCELLED' ||
        errMsg.includes('User rejected') ||
        errMsg.includes('cancelled') ||
        errMsg.includes('Cancelled') ||
        errMsg.includes('ACTION_CANCELLED');

      if (errMsg === 'MULTIPLE_WALLETS') {
        setWalletStatus('idle');
        setShowWalletPicker(true);
      } else if (isCancellation) {
        flashWalletStatus('cancelled');
      } else {
        flashWalletStatus('error');
      }
    } finally {
      // Safety: never leave spinner stuck
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
      const errMsg = err instanceof Error ? err.message : String(err);
      const isCancellation =
        errMsg === 'WALLET_CANCELLED' ||
        errMsg.includes('User rejected') ||
        errMsg.includes('cancelled') ||
        errMsg.includes('Cancelled') ||
        errMsg.includes('ACTION_CANCELLED');
      if (isCancellation) {
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
      // Ensure correct auth mode before starting game
      if (emptyHanded) {
        if (!game.isAuthenticated || game.authType !== 'guest') {
          await game.signInEmptyHanded();
        }
      } else {
        // Staked play must use wallet auth (not guest auth)
        if (!game.walletConnected) {
          throw new Error('Connect wallet first');
        }
        if (!game.isAuthenticated || game.authType !== 'wallet') {
          await game.signInWithWallet();
        }
      }

      await game.startGame(selectedStake, emptyHanded);
      if (!emptyHanded) setSealStatus('idle');
      playSFX('depth-descend');
      router.push('/play');
    } catch (err) {
      if (!emptyHanded) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const isCancellation =
          errMsg === 'WALLET_CANCELLED' ||
          errMsg.includes('User rejected') ||
          errMsg.includes('cancelled') ||
          errMsg.includes('Cancelled') ||
          errMsg.includes('ACTION_CANCELLED');

        if (isCancellation) {
          flashSealStatus('cancelled');
        } else {
          console.error('Failed to start game:', err);
          flashSealStatus('error');
          playSFX('error-buzz');
        }
      } else {
        console.error('Failed to start game:', err);
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
        <Pressable onPress={() => router.replace('/')}>
          <Text className="text-bone-muted text-sm font-mono">← BACK</Text>
        </Pressable>

        {/* True center title across full header width */}
        <View className="absolute inset-x-0 items-center" style={{ pointerEvents: 'none' }}>
          <Text className="text-amber text-base font-mono font-bold tracking-widest">THE TOLL</Text>
        </View>

        <AudioToggle ambientTrack="ambient-title" inline onSettingsPress={() => setAudioSettingsOpen(true)} />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-5" style={{ backgroundColor: 'transparent' }}>
        {/* Top error banner removed — action errors are shown inline on buttons */}

        {/* Warning */}
        <View className="bg-blood/10 border border-blood-dark p-4 mb-6">
          <Text className="text-blood-light text-sm font-mono leading-5">
Offer it. Lose it on death. Escape and claim more.
          </Text>
        </View>

        {/* Stake options */}
        <View className="mb-6">
          <Text className="text-bone-dark text-xs font-mono tracking-widest mb-3">CHOOSE YOUR OFFERING</Text>
          <View className="flex-row flex-wrap gap-2">
            {STAKE_OPTIONS.map((amount) => (
              <Pressable
                key={amount}
                className={`py-3 px-5 border ${
                  selectedStake === amount 
                    ? 'border-amber bg-amber/10' 
                    : 'border-crypt-border-light bg-crypt-surface'
                }`}
                onPress={() => {
                  playSFX('ui-click');
                  setSelectedStake(amount);
                  setCustomStake('');
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

          {/* Custom input */}
          <View className="mt-4">
            <Text className="text-stone-600 text-xs font-mono mb-2 italic">...or name your price</Text>
            <View className="flex-row items-center border border-crypt-border-light bg-crypt-surface px-3">
              <TextInput
                className="flex-1 text-bone text-lg font-mono py-3"
                value={customStake}
                onChangeText={(text) => {
                  setCustomStake(text);
                  const num = parseFloat(text);
                  if (!isNaN(num) && num > 0) {
                    setSelectedStake(num);
                  }
                }}
                placeholder="0.00"
                placeholderTextColor="#57534e"
                keyboardType="decimal-pad"
              />
            </View>
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

        {/* Identity row — always above action buttons */}
        <View className="items-center mb-5">
          <Pressable
            className="flex-row items-center gap-2"
            onPress={() => setShowNicknameEdit(true)}
          >
            <Text className="text-bone text-base">🪦</Text>
            {game.isAuthenticated && game.authType === 'wallet' && game.nickname === null
              ? <NicknameSkeleton />
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
                className={`py-5 items-center ${
                  walletStatus === 'cancelled' ? 'bg-stone-700' :
                  walletStatus === 'error' ? 'bg-blood/60' :
                  walletStatus === 'connecting' ? 'bg-purple-900' :
                  'bg-purple-700 active:bg-purple-800'
                }`}
                onPress={handleConnect}
                disabled={game.loading || staking || walletStatus === 'connecting'}
              >
                {walletStatus === 'connecting' ? (
                  <ActivityIndicator color="#ffffff" />
                ) : walletStatus === 'cancelled' ? (
                  <Text className="text-bone-muted font-mono font-bold tracking-wider">REJECTED</Text>
                ) : walletStatus === 'error' ? (
                  <Text className="text-blood-light font-mono font-bold tracking-wider">FAILED — TAP TO RETRY</Text>
                ) : (
                  <Text className="text-white font-mono font-bold tracking-wider">BIND WALLET</Text>
                )}
              </Pressable>

              <Pressable
                className="border border-crypt-border-light py-4 items-center active:border-amber"
                onPress={() => handleStake(true)}
                disabled={staking}
              >
                {staking ? (
                  <ActivityIndicator color="#a8a29e" />
                ) : (
                  <Text className="text-bone-muted font-mono">EMPTY-HANDED</Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                className={`py-5 items-center ${
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
                  <ActivityIndicator color="#0d0d0d" />
                ) : sealStatus === 'cancelled' ? (
                  <Text className="text-bone-muted font-mono font-bold tracking-wider">REJECTED</Text>
                ) : sealStatus === 'error' ? (
                  <Text className="text-blood-light font-mono font-bold tracking-wider">FAILED — TAP TO RETRY</Text>
                ) : (
                  <Text className="text-crypt-bg font-mono font-bold tracking-wider">SEAL YOUR FATE</Text>
                )}
              </Pressable>

              {game.balance !== null && game.balance < selectedStake && (
                <Text className="text-blood text-xs font-mono text-center">
                  Insufficient balance ({game.balance.toFixed(3)} SOL)
                </Text>
              )}

              <Pressable
                className="border border-crypt-border-light py-4 items-center active:border-amber"
                onPress={() => handleStake(true)}
                disabled={staking}
              >
                {stakingMode === 'free' ? (
                  <ActivityIndicator color="#a8a29e" />
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
        onSubmit={(name) => game.setNickname(name)}
        onSkip={() => game.dismissNicknameModal()}
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
