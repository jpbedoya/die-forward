// GameMenu - In-game menu overlay with audio section and abandon run
import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAudio } from '../lib/audio';
import { useAudius, MusicSource } from '../lib/AudiusContext';
import { CURATED_PLAYLISTS } from '../lib/useAudiusPlayer';
import { useGame } from '../lib/GameContext';
import { DieForwardLogo } from './DieForwardLogo';
import { CryptModal } from './CryptModal';

interface GameMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MUSIC_SOURCES: { value: MusicSource; label: string }[] = [
  { value: 'game',   label: 'GAME' },
  { value: 'audius', label: 'AUDIUS' },
  { value: 'none',   label: 'NONE' },
];

export function GameMenu({ isOpen, onClose }: GameMenuProps) {
  const [confirmingAbandon, setConfirmingAbandon] = useState(false);
  const { enabled: sfxEnabled, toggle: toggleSFX, unlock: unlockAudio } = useAudio();
  const { musicSource, setMusicSource, activePlaylistId, setActivePlaylist } = useAudius();
  const game = useGame();

  const handleAbandon = () => {
    onClose();
    setConfirmingAbandon(false);
    router.replace({
      pathname: '/death',
      params: { killedBy: 'Abandonment', abandoned: 'true' },
    });
  };

  const handleToggleSFX = () => {
    unlockAudio();
    toggleSFX();
  };

  const handleClose = () => {
    setConfirmingAbandon(false);
    onClose();
  };

  const formatAddress = (addr: string) => {
    if (!addr) return 'Not connected';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <CryptModal visible={isOpen} onClose={handleClose} showCloseButton={false}>
      {/* Logo */}
      <View className="items-center mb-4">
        <DieForwardLogo size="tiny" />
      </View>

      {/* Close button */}
      <Pressable className="absolute top-0 right-0 p-2" onPress={handleClose}>
        <Text className="text-bone-muted font-mono">[×]</Text>
      </Pressable>

      {/* Wallet info */}
      {game.walletConnected && (
        <View className="mb-4">
          <Text className="text-bone-dark text-[10px] font-mono tracking-wider mb-1">CONNECTED</Text>
          <Text className="text-bone-muted text-xs font-mono">
            {formatAddress(game.walletAddress || '')}
          </Text>
        </View>
      )}

      {/* ── Audio section ──────────────────────────────────────────────────── */}
      <View className="bg-crypt-bg border border-crypt-border mb-2">
        <Text className="text-bone-dark text-[10px] font-mono tracking-wider px-3 pt-3 pb-2">
          AUDIO
        </Text>

        {/* SFX toggle */}
        <Pressable
          className="flex-row items-center justify-between px-3 py-2 border-t border-crypt-border"
          onPress={handleToggleSFX}
        >
          <Text className="text-bone-muted text-sm font-mono">SFX</Text>
          <Text className={`text-sm font-mono ${sfxEnabled ? 'text-victory' : 'text-blood'}`}>
            {sfxEnabled ? '♪ ON' : '× OFF'}
          </Text>
        </Pressable>

        {/* Music source picker */}
        <View className="flex-row items-center px-3 py-2 border-t border-crypt-border">
          <Text className="text-bone-muted text-sm font-mono mr-3">MUSIC</Text>
          <View className="flex-row flex-1 gap-1">
            {MUSIC_SOURCES.map(({ value, label }) => (
              <Pressable
                key={value}
                onPress={() => setMusicSource(value)}
                className={`flex-1 py-1 items-center border ${
                  musicSource === value
                    ? 'bg-amber-700 border-amber-500'
                    : 'bg-crypt-bg border-crypt-border'
                }`}
              >
                <Text
                  className={`text-xs font-mono ${
                    musicSource === value ? 'text-black font-bold' : 'text-bone-dark'
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Playlist picker — only when Audius selected */}
        {musicSource === 'audius' && (
          <View className="border-t border-crypt-border px-3 py-2">
            <Text className="text-bone-dark text-[10px] font-mono tracking-wider mb-2">
              PLAYLIST
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {CURATED_PLAYLISTS.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => setActivePlaylist(p.id)}
                    className={`px-3 py-2 border ${
                      activePlaylistId === p.id
                        ? 'bg-amber-700 border-amber-500'
                        : 'bg-crypt-bg border-crypt-border'
                    }`}
                  >
                    <Text
                      className={`font-mono text-xs ${
                        activePlaylistId === p.id ? 'text-black font-bold' : 'text-bone-muted'
                      }`}
                    >
                      {p.emoji} {p.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* ── Abandon Run ────────────────────────────────────────────────────── */}
      {!confirmingAbandon ? (
        <Pressable
          className="bg-crypt-bg border border-blood/50 px-3 py-3 mb-4"
          onPress={() => setConfirmingAbandon(true)}
        >
          <Text className="text-blood-light text-sm font-mono">☠ Abandon Run</Text>
        </Pressable>
      ) : (
        <View className="border border-blood/50 bg-blood/10 p-3 mb-4">
          <Text className="text-bone-muted text-xs font-mono mb-3">
            Abandon run?{' '}
            {game.stakeAmount > 0
              ? `Your ${game.stakeAmount} SOL stake will be lost.`
              : 'Your progress will be lost.'}
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              className="flex-1 border border-crypt-border py-2 items-center"
              onPress={() => setConfirmingAbandon(false)}
            >
              <Text className="text-bone-muted text-xs font-mono">Nevermind</Text>
            </Pressable>
            <Pressable
              className="flex-1 bg-blood/30 border border-blood py-2 items-center"
              onPress={handleAbandon}
            >
              <Text className="text-blood-light text-xs font-mono font-bold">Abandon</Text>
            </Pressable>
          </View>
        </View>
      )}

    </CryptModal>
  );
}

// Menu button component for headers
export function MenuButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="p-1">
      <Text className="text-bone-muted font-mono text-base">[≡]</Text>
    </Pressable>
  );
}
