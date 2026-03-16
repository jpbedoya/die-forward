import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, Pressable, FlatList, Image, Modal, ScrollView,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AudioToggle } from '../components/AudioToggle';
import { AudioSettingsModal } from '../components/AudioSettingsModal';
import { ScreenHeader } from '../components/ScreenHeader';
import { getAllCreatures, CreatureInfo } from '../lib/content';
import { listZoneIds, loadZone } from '../lib/zone-loader';
import { getCreatureAsset, getCreatureAssetByName } from '../lib/creatureAssets';
import { CRTOverlay } from '../components/CRTOverlay';
import { CryptBackground } from '../components/CryptBackground';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_CONFIG = {
  1: { label: 'TIER I',   color: '#78716c', border: '#2a2520', bg: 'rgba(42,37,32,0.6)' },
  2: { label: 'TIER II',  color: '#c47a3a', border: '#5a3a1a', bg: 'rgba(90,58,26,0.3)' },
  3: { label: 'TIER III', color: '#c84040', border: '#5a1a1a', bg: 'rgba(90,26,26,0.3)' },
} as const;

type BestiaryCreature = CreatureInfo & {
  key: string;
  zones: string[];
  zoneNames: string[];
  isZoneLocal: boolean;
};

const ZONES = listZoneIds().map((id) => {
  const zone = loadZone(id);
  return { id, name: zone.meta.name, zone };
});

function addZoneTag(entry: BestiaryCreature, zoneId: string, zoneName: string) {
  if (!entry.zones.includes(zoneId)) entry.zones.push(zoneId);
  if (!entry.zoneNames.includes(zoneName)) entry.zoneNames.push(zoneName);
}

function buildBestiary(): BestiaryCreature[] {
  const byName = new Map<string, BestiaryCreature>();

  // Start from global/shared bestiary
  for (const c of getAllCreatures()) {
    byName.set(c.name, {
      ...c,
      key: c.name,
      zones: [],
      zoneNames: [],
      isZoneLocal: false,
    });
  }

  // Attach zone tags for shared + inject/override with local zone creatures
  for (const { id: zoneId, name: zoneName, zone } of ZONES) {
    for (const sharedName of zone.bestiary.shared ?? []) {
      const shared = byName.get(sharedName);
      if (shared) {
        addZoneTag(shared, zoneId, zoneName);
      }
    }

    for (const local of zone.bestiary.local ?? []) {
      const existing = byName.get(local.name);
      const localEntry: BestiaryCreature = {
        ...(existing ?? {
          name: local.name,
          tier: local.tier,
          health: { min: local.health.min, max: local.health.max },
          behaviors: local.behaviors as CreatureInfo['behaviors'],
          description: local.description,
          emoji: local.emoji,
          artUrl: local.artUrl,
        }),
        // Local zone definitions are source-of-truth when present
        name: local.name,
        tier: local.tier,
        health: { min: local.health.min, max: local.health.max },
        behaviors: local.behaviors as CreatureInfo['behaviors'],
        description: local.description,
        emoji: local.emoji,
        artUrl: local.artUrl ?? existing?.artUrl,
        key: local.name,
        zones: existing?.zones ?? [],
        zoneNames: existing?.zoneNames ?? [],
        isZoneLocal: true,
      };
      addZoneTag(localEntry, zoneId, zoneName);
      byName.set(local.name, localEntry);
    }
  }

  return Array.from(byName.values()).sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
}

// Lazy: built once inside the component so it doesn't block module load during navigation
// const CREATURES: BestiaryCreature[] = buildBestiary(); -- removed, now a useMemo below

// ─── Creature Card ────────────────────────────────────────────────────────────

function CreatureCard({ creature, onPress, cardWidth }: {
  creature: BestiaryCreature;
  onPress: () => void;
  cardWidth: number;
}) {
  const tier = TIER_CONFIG[creature.tier];
  const asset = creature.artUrl
    ? getCreatureAsset(creature.artUrl)
    : getCreatureAssetByName(creature.name);

  const artHeight = Math.round(cardWidth * (512 / 341));

  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-75"
      style={{
        width: cardWidth,
        backgroundColor: '#0d0b09',
        borderWidth: 1,
        borderColor: '#2a2520',
        marginBottom: 12,
      }}
    >
      {/* Art */}
      <View style={{ width: cardWidth, height: Math.min(artHeight, 240), overflow: 'hidden' }}>
        {asset ? (
          <Image
            source={asset}
            style={{ width: cardWidth, height: Math.min(artHeight, 240) }}
            resizeMode="cover"
          />
        ) : (
          <View style={{
            width: cardWidth, height: Math.min(artHeight, 240),
            backgroundColor: '#130f0c',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 52 }}>{creature.emoji}</Text>
          </View>
        )}
        {/* Tier badge overlay */}
        <View style={{
          position: 'absolute', top: 6, left: 6,
          backgroundColor: tier.bg,
          borderWidth: 1, borderColor: tier.border,
          paddingHorizontal: 5, paddingVertical: 2,
        }}>
          <Text style={{ fontFamily: 'monospace', fontSize: 9, color: tier.color, letterSpacing: 1 }}>
            {tier.label}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={{ padding: 10 }}>
        <Text
          style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: '700', color: '#f59e0b', marginBottom: 3 }}
          numberOfLines={1}
        >
          {creature.name}
        </Text>
        {creature.zoneNames.length > 0 && (
          <Text style={{ fontFamily: 'monospace', fontSize: 9, color: '#a78bfa', marginBottom: 4 }} numberOfLines={1}>
            {creature.zoneNames[0]}{creature.zoneNames.length > 1 ? ` +${creature.zoneNames.length - 1}` : ''}
          </Text>
        )}
        <Text style={{ fontFamily: 'monospace', fontSize: 10, color: '#c84040', marginBottom: 6 }}>
          ♥ {creature.health.min}–{creature.health.max}
        </Text>
        <Text
          style={{ fontFamily: 'monospace', fontSize: 10, color: '#78716c', fontStyle: 'italic', lineHeight: 14, marginBottom: 8 }}
          numberOfLines={2}
        >
          {creature.description}
        </Text>
        {/* Top 2 behavior tags */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {[...new Set(creature.behaviors)].slice(0, 2).map((b) => (
            <View key={b} style={{ borderWidth: 1, borderColor: '#2a2520', paddingHorizontal: 5, paddingVertical: 2 }}>
              <Text style={{ fontFamily: 'monospace', fontSize: 8, color: '#a78bfa', letterSpacing: 0.5 }}>{b}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function CreatureDetailModal({ creature, onClose }: {
  creature: BestiaryCreature | null;
  onClose: () => void;
}) {
  if (!creature) return null;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const tier = TIER_CONFIG[creature.tier];
  const asset = creature.artUrl
    ? getCreatureAsset(creature.artUrl)
    : getCreatureAssetByName(creature.name);

  // Show as much of the portrait as fits, leaving room for content below.
  // On large phones/tablets the full image is visible; on small phones it clips from bottom.
  const modalWidth = Math.min(screenWidth - 40, 400);
  const naturalImageHeight = Math.round(modalWidth * (512 / 341));
  const contentHeight = 220; // name + tier + description + behaviors
  const availableForImage = Math.round(screenHeight * 0.90) - contentHeight;
  const imageHeight = Math.min(naturalImageHeight, availableForImage);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.88)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#0d0b09',
            borderWidth: 1,
            borderColor: '#2a2520',
            width: '100%',
            maxWidth: 400,
            maxHeight: screenHeight * 0.90,
          }}
        >
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            {/* Art — anchored to top, clips at bottom — head always visible */}
            {asset ? (
              <View style={{ width: '100%', height: imageHeight, overflow: 'hidden' }}>
                <Image
                  source={asset}
                  style={{ width: '100%', height: undefined, aspectRatio: 341 / 512 }}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View style={{ width: '100%', paddingVertical: 40, alignItems: 'center', backgroundColor: '#130f0c' }}>
                <Text style={{ fontSize: 72 }}>{creature.emoji}</Text>
              </View>
            )}

            <View style={{ padding: 18 }}>
              {/* Header row */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: '700', color: '#f59e0b', marginBottom: 6 }}>
                    {creature.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <View style={{
                      borderWidth: 1, borderColor: tier.border,
                      backgroundColor: tier.bg, paddingHorizontal: 7, paddingVertical: 3,
                    }}>
                      <Text style={{ fontFamily: 'monospace', fontSize: 10, color: tier.color, letterSpacing: 1 }}>
                        {tier.label}
                      </Text>
                    </View>
                    {creature.zoneNames.length > 0 && (
                      <Text style={{ fontFamily: 'monospace', fontSize: 10, color: '#a78bfa' }}>
                        {creature.zoneNames.join(' · ')}
                      </Text>
                    )}
                    <Text style={{ fontFamily: 'monospace', fontSize: 11, color: '#c84040' }}>
                      ♥ {creature.health.min}–{creature.health.max} HP
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={onClose}
                  hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                  style={{ padding: 8, marginTop: -4, marginRight: -4 }}
                >
                  <Text style={{ fontFamily: 'monospace', fontSize: 16, color: '#57534e' }}>[×]</Text>
                </Pressable>
              </View>

              {/* Description */}
              <Text style={{
                fontFamily: 'monospace', fontSize: 13, color: '#d4b896',
                fontStyle: 'italic', lineHeight: 20, marginBottom: 18,
              }}>
                "{creature.description}"
              </Text>

              {/* Behaviors */}
              <Text style={{
                fontFamily: 'monospace', fontSize: 10, color: '#57534e',
                letterSpacing: 2, marginBottom: 8,
              }}>
                BEHAVIORS
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[...new Set(creature.behaviors)].map((b) => (
                  <View key={b} style={{ borderWidth: 1, borderColor: '#2a2520', paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ fontFamily: 'monospace', fontSize: 11, color: '#a78bfa' }}>{b}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BestiaryScreen() {
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<BestiaryCreature | null>(null);
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
  const [filterTier, setFilterTier] = useState<1 | 2 | 3 | null>(null);
  const [filterZone, setFilterZone] = useState<string | null>(null);

  // Build once after the screen mounts — avoids blocking JS thread during navigation
  const CREATURES = useMemo(() => buildBestiary(), []);

  const COLS = 2;
  const GUTTER = 12;
  const H_PAD = 16;
  // On web, useWindowDimensions returns full browser viewport width, but WebFrame
  // constrains the game to maxWidth 430 — cap so cards don't overflow and stack.
  const effectiveWidth = Math.min(width, 430);
  const cardWidth = Math.floor((effectiveWidth - H_PAD * 2 - GUTTER) / COLS);

  const filteredCreatures = CREATURES.filter((c) => {
    const tierMatch = filterTier ? c.tier === filterTier : true;
    const zoneMatch = filterZone ? c.zones.includes(filterZone) : true;
    return tierMatch && zoneMatch;
  });

  const renderItem = useCallback(({ item, index }: { item: BestiaryCreature; index: number }) => (
    <View style={{ marginLeft: index % COLS === 0 ? 0 : GUTTER }}>
      <CreatureCard
        creature={item}
        onPress={() => setSelected(item)}
        cardWidth={cardWidth}
      />
    </View>
  ), [cardWidth]);

  const renderHeader = useCallback(() => (
    <View style={{ marginBottom: 16 }}>
      {/* Tier filter buttons */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 8 }}>
        {([1, 2, 3] as const).map((t) => {
          const cfg = TIER_CONFIG[t];
          const active = filterTier === t;
          return (
            <Pressable
              key={t}
              onPress={() => setFilterTier(prev => prev === t ? null : t)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                borderWidth: 1,
                borderColor: active ? cfg.color : cfg.border,
                backgroundColor: active ? cfg.bg : 'transparent',
                paddingHorizontal: 10, paddingVertical: 5,
              }}
            >
              <View style={{ width: 6, height: 6, backgroundColor: cfg.color }} />
              <Text style={{ fontFamily: 'monospace', fontSize: 10, color: cfg.color, letterSpacing: 1 }}>{cfg.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {/* Zone filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, gap: 8, paddingHorizontal: 4 }}>
        <Pressable
          onPress={() => setFilterZone(null)}
          style={{
            borderWidth: 1,
            borderColor: filterZone ? '#2a2520' : '#a78bfa',
            backgroundColor: filterZone ? 'transparent' : 'rgba(167,139,250,0.2)',
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Text style={{ fontFamily: 'monospace', fontSize: 10, color: filterZone ? '#78716c' : '#a78bfa' }}>ALL ZONES</Text>
        </Pressable>
        {ZONES.map((z) => {
          const active = filterZone === z.id;
          return (
            <Pressable
              key={z.id}
              onPress={() => setFilterZone(active ? null : z.id)}
              style={{
                borderWidth: 1,
                borderColor: active ? '#a78bfa' : '#2a2520',
                backgroundColor: active ? 'rgba(167,139,250,0.2)' : 'transparent',
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <Text style={{ fontFamily: 'monospace', fontSize: 10, color: active ? '#a78bfa' : '#78716c' }}>{z.name.toUpperCase()}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  ), [filterTier, filterZone]);

  return (
    <CryptBackground screen="home">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
        <CRTOverlay />

        <ScreenHeader
          showHome
          title="◈ BESTIARY"
          right={<AudioToggle inline onSettingsPress={() => setAudioSettingsOpen(true)} />}
        />

        <AudioSettingsModal visible={audioSettingsOpen} onClose={() => setAudioSettingsOpen(false)} />

        {/* Grid */}
        <FlatList
          data={filteredCreatures}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          numColumns={COLS}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ padding: H_PAD, paddingTop: 12 }}
          key={`${filterTier ?? 'all'}-${filterZone ?? 'all'}`}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={{ justifyContent: 'flex-start' }}
        />

        {/* Detail Modal */}
        <CreatureDetailModal creature={selected} onClose={() => setSelected(null)} />
      </SafeAreaView>
    </CryptBackground>
  );
}
