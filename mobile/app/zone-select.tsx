import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { CryptBackground } from '../components/CryptBackground';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudio } from '../lib/audio';
import { AudioToggle } from '../components/AudioToggle';
import { AudioSettingsModal } from '../components/AudioSettingsModal';
import { CRTOverlay } from '../components/CRTOverlay';
import { useGame } from '../lib/GameContext';
import { API_BASE } from '../lib/api';

const ZONES = [
  {
    id: 'sunken-crypt',
    name: 'THE SUNKEN CRYPT',
    tagline: 'The first descent. Nothing here is alive.',
    difficulty: 1,
    mechanic: null,
    element: 'WATER',
    accentColor: '#4a9eff',
    bgColor: '#0a1628',
    ambientTrack: 'ambient-explore',
    enabled: true,
  },
  {
    id: 'ashen-crypts',
    name: 'THE ASHEN CRYPTS',
    tagline: 'A civilization that chose fire over surrender.',
    difficulty: 2,
    mechanic: 'BURN — hesitation kills you.',
    element: 'FIRE',
    accentColor: '#ff6b2b',
    bgColor: '#1a0800',
    ambientTrack: 'ambient-explore',
    enabled: false,
  },
  {
    id: 'frozen-gallery',
    name: 'THE FROZEN GALLERY',
    tagline: 'Time stopped here. The dead are preserved perfectly.',
    difficulty: 2,
    mechanic: 'CHILL — stamina slows. FREEZE — skip enemy turns.',
    element: 'ICE',
    accentColor: '#7eceff',
    bgColor: '#040d14',
    ambientTrack: 'ambient-explore',
    enabled: false,
  },
  {
    id: 'living-tomb',
    name: 'THE LIVING TOMB',
    tagline: 'Something grew in the dark. Now everything is part of it.',
    difficulty: 2,
    mechanic: 'INFECTION — kill fast or be consumed.',
    element: 'ORGANIC',
    accentColor: '#c0392b',
    bgColor: '#0f0000',
    ambientTrack: 'ambient-explore',
    enabled: false,
  },
  {
    id: 'void-beyond',
    name: 'THE VOID BEYOND',
    tagline: 'Where the underworld forgot to finish building.',
    difficulty: 3,
    mechanic: 'FLUX — nothing is reliable. CLARITY — protect your mind.',
    element: 'VOID',
    accentColor: '#9b59b6',
    bgColor: '#06000f',
    ambientTrack: 'ambient-explore',
    enabled: false,
  },
] as const;

type Zone = (typeof ZONES)[number];

const GRID_PADDING = 16;

function DifficultyDots({ difficulty, accentColor }: { difficulty: number; accentColor: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <Text key={i} style={{ fontSize: 10, color: i < difficulty ? accentColor : '#555' }}>
          {i < difficulty ? '●' : '○'}
        </Text>
      ))}
    </View>
  );
}

function GridZoneCard({
  zone,
  isSelected,
  onPress,
  enabled: enabledProp,
}: {
  zone: Zone;
  isSelected: boolean;
  onPress: () => void;
  enabled?: boolean;
}) {
  const enabled = enabledProp ?? zone.enabled;
  const borderColor = isSelected ? zone.accentColor : '#2a2a2a';
  const bgColor = isSelected ? zone.bgColor + '40' : zone.bgColor + '1a';

  if (!enabled) {
    return (
      <View
        style={{
          flex: 1,
          opacity: 0.45,
        }}
      >
        <View
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#2a2a2a',
            borderLeftWidth: 3,
            borderLeftColor: zone.accentColor,
            backgroundColor: zone.bgColor + '1a',
            padding: 12,
          }}
        >
          <Text
            style={{
              fontFamily: 'monospace',
              fontSize: 10,
              color: zone.accentColor,
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            [ {zone.element} ]
          </Text>
          <Text
            style={{
              fontFamily: 'monospace',
              fontWeight: 'bold',
              fontSize: 13,
              color: '#a8a29e',
              lineHeight: 18,
              marginBottom: 4,
            }}
          >
            {zone.name}
          </Text>
          <Text
            style={{
              fontFamily: 'monospace',
              fontSize: 9,
              color: '#6b6b6b',
              marginBottom: 6,
              lineHeight: 13,
            }}
          >
            {zone.tagline}
          </Text>
          <DifficultyDots difficulty={zone.difficulty} accentColor={zone.accentColor} />
          <Text
            style={{
              fontFamily: 'monospace',
              fontSize: 9,
              color: '#555',
              marginTop: 8,
              letterSpacing: 0.5,
            }}
          >
            // COMING SOON
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      style={{ flex: 1 }}
      onPress={onPress}
    >
      <View
        style={{
          flex: 1,
          borderWidth: isSelected ? 2 : 1,
          borderColor,
          borderLeftWidth: isSelected ? 2 : 3,
          borderLeftColor: zone.accentColor,
          backgroundColor: bgColor,
          padding: 12,
        }}
      >
        <Text
          style={{
            fontFamily: 'monospace',
            fontSize: 10,
            color: zone.accentColor,
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          [ {zone.element} ]
        </Text>
        <Text
          style={{
            fontFamily: 'monospace',
            fontWeight: 'bold',
            fontSize: 13,
            color: isSelected ? zone.accentColor : '#a8a29e',
            lineHeight: 18,
            marginBottom: 4,
          }}
        >
          {zone.name}
        </Text>
        <Text
          style={{
            fontFamily: 'monospace',
            fontSize: 9,
            color: '#6b6b6b',
            marginTop: 6,
            lineHeight: 13,
          }}
        >
          {zone.tagline}
        </Text>
        <DifficultyDots difficulty={zone.difficulty} accentColor={zone.accentColor} />
      </View>
    </Pressable>
  );
}

function VoidBeyondCard({
  zone,
  isSelected,
  onPress,
  enabled: enabledProp,
}: {
  zone: Zone;
  isSelected: boolean;
  onPress: () => void;
  enabled?: boolean;
}) {
  const enabled = enabledProp ?? zone.enabled;
  const borderColor = isSelected ? zone.accentColor : '#2a2a2a';
  const bgColor = isSelected ? zone.bgColor + '40' : zone.bgColor + '1a';

  const inner = (
    <View
      style={{
        borderWidth: isSelected ? 2 : 1,
        borderColor,
        borderLeftWidth: isSelected ? 2 : 3,
        borderLeftColor: zone.accentColor,
        backgroundColor: bgColor,
        padding: 16,
        opacity: enabled ? 1 : 0.45,
      }}
    >
      <Text
        style={{
          fontFamily: 'monospace',
          fontSize: 10,
          color: zone.accentColor,
          letterSpacing: 1,
          marginBottom: 6,
        }}
      >
        [ {zone.element} ]
      </Text>
      <Text
        style={{
          fontFamily: 'monospace',
          fontWeight: 'bold',
          fontSize: 15,
          color: isSelected ? zone.accentColor : '#a8a29e',
          letterSpacing: 1,
          marginBottom: 4,
        }}
      >
        {zone.name}
      </Text>
      <Text
        style={{
          fontFamily: 'monospace',
          fontSize: 11,
          color: '#6b6b6b',
          fontStyle: 'italic',
          marginBottom: 8,
        }}
      >
        "{zone.tagline}"
      </Text>
      <DifficultyDots difficulty={zone.difficulty} accentColor={zone.accentColor} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <Text
          style={{
            fontFamily: 'monospace',
            fontSize: 9,
            color: '#555',
            letterSpacing: 0.5,
          }}
        >
          // COMING SOON
        </Text>
        <Text
          style={{
            fontFamily: 'monospace',
            fontSize: 9,
            color: '#3a2a4a',
            letterSpacing: 1,
          }}
        >
          // UNLOCKS AFTER 3 CLEARED ZONES
        </Text>
      </View>
    </View>
  );

  if (!enabled) {
    return <View style={{ marginBottom: 12 }}>{inner}</View>;
  }

  return (
    <Pressable style={{ marginBottom: 12 }} onPress={onPress}>
      {inner}
    </Pressable>
  );
}

export default function ZoneSelectScreen() {
  const { playSFX, playAmbient } = useAudio();
  const game = useGame();
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState('sunken-crypt');
  const { width: screenWidth } = useWindowDimensions();
  // enabledZones = admin-controlled zone availability (from gameSettings)
  // unlockedZones = player progression unlock (post-auth, future)
  // DEV: default all zones enabled until admin sets otherwise
  const ALL_ZONE_IDS = ZONES.map(z => z.id);
  const [enabledZones, setEnabledZones] = useState<string[]>(ALL_ZONE_IDS);

  // Cap at 480 so the 2x2 grid works on Expo web (wide browser windows)
  const effectiveWidth = Math.min(screenWidth, 480);
  const cardWidth = (effectiveWidth - GRID_PADDING * 3) / 2;

  useEffect(() => {
    playAmbient('ambient-title');
  }, []);

  // Fetch admin-controlled zone availability on load
  useEffect(() => {
    fetch(`${API_BASE}/api/game/settings`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.enabledZones) && data.enabledZones.length > 0) {
          setEnabledZones(data.enabledZones);
        }
      })
      .catch(() => {
        // fallback: only sunken-crypt (already the default state)
      });
  }, []);

  // TODO: fetch player progression unlock status post-auth (wallet bound after zone select)
  // useEffect(() => { ... fetch /api/player/unlock-status ... }, [game.walletAddress]);

  const selectedZone = ZONES.find((z) => z.id === selectedZoneId) ?? ZONES[0];

  const handleConfirm = () => {
    playSFX('confirm-action');
    router.push({ pathname: '/stake', params: { zoneId: selectedZoneId } });
  };

  const handleSelect = (zoneId: string) => {
    playSFX('ui-click');
    setSelectedZoneId(zoneId);
  };

  const gridZones = ZONES.slice(0, 4);
  const voidZone = ZONES[4];

  // A zone is selectable if admin has enabled it
  const isZoneEnabled = (zoneId: string) => enabledZones.includes(zoneId);

  return (
    <CryptBackground screen="stake">
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="relative flex-row items-center justify-between px-4 py-3 border-b border-crypt-border">
          <Pressable onPress={() => router.replace('/')} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }} className="py-3 px-4 -ml-3">
            <Text className="text-bone-muted text-sm font-mono">[HOME]</Text>
          </Pressable>
          <View className="absolute inset-x-0 items-center" style={{ pointerEvents: 'none' }}>
            <Text className="text-amber text-base font-mono font-bold tracking-widest">CHOOSE YOUR DESCENT</Text>
          </View>
          <AudioToggle ambientTrack="ambient-title" inline onSettingsPress={() => setAudioSettingsOpen(true)} />
        </View>

        {/* Subheader */}
        <View className="items-center py-2 border-b border-crypt-border">
          <Text className="text-bone-dark text-xs font-mono">"Where will you die today?"</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: GRID_PADDING, paddingBottom: 24, maxWidth: 480, alignSelf: 'center', width: '100%' }}
          style={{ backgroundColor: 'transparent' }}
        >
          {/* 2x2 Grid — explicit rows for Expo web compatibility */}
          <View style={{ marginBottom: 0 }}>
            {[gridZones.slice(0, 2), gridZones.slice(2, 4)].map((row, rowIdx) => (
              <View key={rowIdx} style={{ flexDirection: 'row', gap: GRID_PADDING, marginBottom: GRID_PADDING }}>
                {row.map((zone) => (
                  <GridZoneCard
                    key={zone.id}
                    zone={zone}
                    isSelected={selectedZoneId === zone.id}
                    onPress={() => handleSelect(zone.id)}
                    enabled={isZoneEnabled(zone.id)}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* Full-width Void Beyond */}
          <VoidBeyondCard
            zone={voidZone}
            isSelected={selectedZoneId === voidZone.id}
            onPress={() => handleSelect(voidZone.id)}
            enabled={isZoneEnabled(voidZone.id)}
          />

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Fixed confirm button at bottom */}
        <View className="px-4 pb-4 pt-2 border-t border-crypt-border">
          <Text
            style={{
              fontFamily: 'monospace',
              fontSize: 10,
              color: '#555',
              textAlign: 'center',
              marginBottom: 8,
              letterSpacing: 0.5,
            }}
          >
            {selectedZone.mechanic ? `// ${selectedZone.mechanic}` : '// No special mechanics'}
          </Text>
          <Pressable
            className="py-4 items-center"
            style={{ backgroundColor: selectedZone.accentColor }}
            onPress={handleConfirm}
          >
            <Text
              style={{
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color: '#0a0a0a',
                letterSpacing: 2,
                fontSize: 13,
              }}
            >
              ENTER [ {selectedZone.name} ] -&gt;
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
      <CRTOverlay />
      <AudioSettingsModal visible={audioSettingsOpen} onClose={() => setAudioSettingsOpen(false)} />
    </CryptBackground>
  );
}
