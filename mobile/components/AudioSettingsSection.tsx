import { View, Text, Pressable, ScrollView } from 'react-native';
import { useAudio } from '../lib/audio';
import { useAudius, MusicSource } from '../lib/AudiusContext';
import { CURATED_PLAYLISTS } from '../lib/useAudiusPlayer';
import { usePlaylists } from '../lib/instant';
import { AsciiLoader } from './AsciiLoader';

const MUSIC_SOURCES: { value: MusicSource; label: string }[] = [
  { value: 'game', label: 'GAME' },
  { value: 'audius', label: 'AUDIUS' },
  { value: 'none', label: 'NONE' },
];

export function AudioSettingsSection({ className = '' }: { className?: string }) {
  const {
    sfxEnabled,
    toggleSFX,
    ambientVolume,
    setAmbientVolume,
    unlock: unlockAudio,
  } = useAudio();
  const { musicSource, setMusicSource, activePlaylistId, setActivePlaylist, isLoading } = useAudius();
  const { playlists: dbPlaylists } = usePlaylists();

  // Use DB playlists if available, fall back to hardcoded
  const playlistList = dbPlaylists.length > 0
    ? dbPlaylists.map(p => ({ id: p.audiusId, name: p.name, emoji: p.emoji, vibe: p.vibe, trackCount: p.trackCount }))
    : CURATED_PLAYLISTS.map(p => ({ ...p }));

  // True while Audius is selected and still fetching/buffering the first track
  const audiusLoading = musicSource === 'audius' && isLoading;

  const handleToggleSFX = () => {
    unlockAudio();
    toggleSFX();
  };

  const volumeLevel = Math.max(1, Math.min(10, Math.round(ambientVolume * 10)));
  const volumeBar = `${'■'.repeat(volumeLevel)}${'·'.repeat(10 - volumeLevel)}`;

  const changeVolume = (next: number) => {
    const clamped = Math.max(1, Math.min(10, next));
    setAmbientVolume(clamped / 10);
  };

  return (
    <View className={`bg-crypt-bg border border-crypt-border ${className}`}>
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

      {/* Game ambient volume (ASCII style) */}
      <View className="flex-row items-center justify-between px-3 py-2 border-t border-crypt-border">
        <Text className="text-bone-muted text-sm font-mono">VOL</Text>
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => changeVolume(volumeLevel - 1)} className="px-2 py-1 border border-crypt-border">
            <Text className="text-bone-dark font-mono text-xs">-</Text>
          </Pressable>
          <Text className="text-amber-light text-xs font-mono w-24 text-center">{volumeBar}</Text>
          <Pressable onPress={() => changeVolume(volumeLevel + 1)} className="px-2 py-1 border border-crypt-border">
            <Text className="text-bone-dark font-mono text-xs">+</Text>
          </Pressable>
          <Text className="text-bone-dark text-xs font-mono w-8 text-right">{volumeLevel}/10</Text>
        </View>
      </View>

      {/* Music source picker */}
      <View className="flex-row items-center px-3 py-2 border-t border-crypt-border">
        <Text className="text-bone-muted text-sm font-mono mr-3">MUSIC</Text>
        <View className="flex-row flex-1 gap-1">
          {MUSIC_SOURCES.map(({ value, label }) => {
            const isActive = musicSource === value;
            // Disable GAME and NONE while Audius is loading to prevent overlap
            const isDisabled = audiusLoading && value !== 'audius';
            return (
              <Pressable
                key={value}
                onPress={() => !audiusLoading && setMusicSource(value)}
                disabled={isDisabled}
                className={`flex-1 py-1 items-center border ${
                  isActive
                    ? 'bg-amber-700 border-amber-500'
                    : isDisabled
                    ? 'bg-crypt-bg border-crypt-border opacity-30'
                    : 'bg-crypt-bg border-crypt-border'
                }`}
              >
                {isActive && audiusLoading ? (
                  // Show sweep loader on the active AUDIUS button while it buffers
                  <AsciiLoader variant="pulse" width={6} color="rgba(0,0,0,0.75)" />
                ) : (
                  <Text
                    className={`text-xs font-mono ${
                      isActive ? 'text-black font-bold' : 'text-bone-dark'
                    }`}
                  >
                    {label}
                  </Text>
                )}
              </Pressable>
            );
          })}
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
              {playlistList.map((p) => (
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
                  <Text className={`font-mono text-[10px] ${
                    activePlaylistId === p.id ? 'text-black/70' : 'text-stone-600'
                  }`}>
                    {p.trackCount} tracks
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}
