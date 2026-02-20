import { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, Modal } from 'react-native';
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

const STAKE_OPTIONS = [0.01, 0.05, 0.1, 0.25];

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
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');

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
    } catch (err) {
      if (err instanceof Error && err.message === 'MULTIPLE_WALLETS') {
        setWalletStatus('idle');
        setShowWalletPicker(true);
      } else if (err instanceof Error && err.message === 'WALLET_CANCELLED') {
        flashWalletStatus('cancelled');
      } else {
        flashWalletStatus('error');
      }
    }
  };

  const handleSelectWallet = async (connectorId: string) => {
    playSFX('ui-click');
    setShowWalletPicker(false);
    setWalletStatus('connecting');
    try {
      await game.connectTo(connectorId);
      setWalletStatus('idle');
    } catch (err) {
      if (err instanceof Error && err.message === 'WALLET_CANCELLED') {
        flashWalletStatus('cancelled');
      } else {
        flashWalletStatus('error');
      }
    }
  };

  const handleStake = async (emptyHanded = false) => {
    setStaking(true);
    setStakingMode(emptyHanded ? 'free' : 'stake');
    if (!emptyHanded) setSealStatus('signing');
    playSFX('confirm-action');
    
    try {
      // Ensure user is authenticated before starting game
      if (!game.isAuthenticated) {
        if (emptyHanded) {
          await game.signInEmptyHanded();
        } else if (game.walletConnected) {
          await game.signInWithWallet();
        }
      }
      
      await game.startGame(selectedStake, emptyHanded);
      if (!emptyHanded) setSealStatus('idle');
      playSFX('depth-descend');
      router.push('/play');
    } catch (err) {
      if (!emptyHanded) {
        if (err instanceof Error && err.message === 'WALLET_CANCELLED') {
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
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-crypt-border">
        <Pressable onPress={() => router.replace('/')}>
          <Text className="text-bone-muted text-sm font-mono">← BACK</Text>
        </Pressable>
        <Text className="text-amber text-base font-mono font-bold tracking-widest">THE TOLL</Text>
        <AudioToggle ambientTrack="ambient-title" inline onSettingsPress={() => setAudioSettingsOpen(true)} />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-5" style={{ backgroundColor: 'transparent' }}>
        {/* Error display — wallet errors handled inline on button, only show game-level errors */}
        {game.error && !game.error.includes('wallet') && !game.error.includes('Wallet') && (
          <Pressable 
            className="bg-blood/20 border border-blood p-3 mb-4"
            onPress={game.clearError}
          >
            <Text className="text-blood-light text-sm font-mono">⚠️ {game.error}</Text>
            <Text className="text-bone-dark text-xs font-mono mt-1">Tap to dismiss</Text>
          </Pressable>
        )}

        {/* Warning */}
        <View className="bg-blood/10 border border-blood-dark p-4 mb-6">
          <Text className="text-blood-light text-sm font-mono leading-5">
            What you offer, the depths will hold. Die, and it's theirs. Escape, and claim more than you risked.
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
                  <Text className="text-bone-muted font-mono font-bold tracking-wider">CANCELLED</Text>
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
                {sealStatus === 'signing' || stakingMode === 'stake' ? (
                  <ActivityIndicator color="#0d0d0d" />
                ) : sealStatus === 'cancelled' ? (
                  <Text className="text-bone-muted font-mono font-bold tracking-wider">CANCELLED</Text>
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

        {/* Wallet status */}
        {game.walletConnected && game.walletAddress && (
          <View className="items-center gap-2">
            {/* Nickname row */}
            <View className="flex-row items-center justify-center gap-2">
              {editingNickname ? (
                <TextInput
                  className="bg-crypt-surface border border-amber/50 px-3 py-1 text-amber font-mono text-sm w-36 text-center"
                  value={nicknameInput}
                  onChangeText={(text) => setNicknameInput(text.slice(0, 16))}
                  onBlur={() => {
                    if (nicknameInput.trim()) {
                      game.setNickname(nicknameInput.trim());
                    }
                    setEditingNickname(false);
                  }}
                  onSubmitEditing={() => {
                    if (nicknameInput.trim()) {
                      game.setNickname(nicknameInput.trim());
                    }
                    setEditingNickname(false);
                  }}
                  placeholder="Enter name..."
                  placeholderTextColor="#57534e"
                  maxLength={16}
                  autoFocus
                />
              ) : (
                <Pressable 
                  className="flex-row items-center gap-1"
                  onPress={() => {
                    setNicknameInput(game.nickname || '');
                    setEditingNickname(true);
                  }}
                >
                  <Text className="text-amber text-sm font-mono">@{game.nickname || formatAddress(game.walletAddress)}</Text>
                  <Text className="text-bone-dark text-xs">✎</Text>
                </Pressable>
              )}
            </View>
            
            {/* Wallet + balance row */}
            <View className="flex-row items-center justify-center gap-3">
              <Text className="text-bone-dark text-xs font-mono">{formatAddress(game.walletAddress)}</Text>
              {game.balance !== null && (
                <Text className="text-amber-light text-xs font-mono font-bold">{game.balance.toFixed(3)} SOL</Text>
              )}
              <Pressable onPress={() => game.disconnect()}>
                <Text className="text-bone-muted text-xs font-mono">[disconnect]</Text>
              </Pressable>
            </View>
          </View>
        )}
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

      {/* Nickname Modal - shows on first connect */}
      <NicknameModal
        visible={game.showNicknameModal}
        onSubmit={(name) => game.setNickname(name)}
        onSkip={() => game.dismissNicknameModal()}
      />
      <AudioSettingsModal visible={audioSettingsOpen} onClose={() => setAudioSettingsOpen(false)} />
    </SafeAreaView>
    <CRTOverlay />
    </CryptBackground>
  );
}
