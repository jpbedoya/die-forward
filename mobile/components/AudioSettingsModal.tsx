// AudioSettingsModal — lightweight music settings overlay for non-game screens
// Shows only the audio section (SFX + music source + playlist picker)
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useAudio } from '../lib/audio';
import { useAudius, MusicSource } from '../lib/AudiusContext';
import { CURATED_PLAYLISTS } from '../lib/useAudiusPlayer';
import { CryptModal } from './CryptModal';

interface AudioSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const MUSIC_SOURCES: { value: MusicSource; label: string }[] = [
  { value: 'game',   label: 'GAME' },
  { value: 'audius', label: 'AUDIUS' },
  { value: 'none',   label: 'NONE' },
];

export function AudioSettingsModal({ visible, onClose }: AudioSettingsModalProps) {
  const { enabled: sfxEnabled, toggle: toggleSFX, unlock: unlockAudio } = useAudio();
  const { musicSource, setMusicSource, activePlaylistId, setActivePlaylist } = useAudius();

  const handleToggleSFX = () => {
    unlockAudio();
    toggleSFX();
  };

  return (
    <CryptModal visible={visible} onClose={onClose} showCloseButton={false}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-bone-muted font-mono text-sm tracking-widest">AUDIO</Text>
        <Pressable onPress={onClose} className="p-1">
          <Text className="text-bone-muted font-mono">[×]</Text>
        </Pressable>
      </View>

      <View className="bg-crypt-bg border border-crypt-border">
        {/* SFX toggle */}
        <Pressable
          className="flex-row items-center justify-between px-3 py-3"
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
                <Text className={`text-xs font-mono ${
                  musicSource === value ? 'text-black font-bold' : 'text-bone-dark'
                }`}>
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
                    <Text className={`font-mono text-xs ${
                      activePlaylistId === p.id ? 'text-black font-bold' : 'text-bone-muted'
                    }`}>
                      {p.emoji} {p.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* Close */}
      <Pressable className="mt-3 py-3 border border-crypt-border items-center" onPress={onClose}>
        <Text className="text-bone-muted font-mono text-sm">Close</Text>
      </Pressable>
    </CryptModal>
  );
}
