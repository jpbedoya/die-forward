import { useState, useCallback } from 'react';
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
import { getCreatureAsset, getCreatureAssetByName } from '../lib/creatureAssets';
import { CRTOverlay } from '../components/CRTOverlay';
import { CryptBackground } from '../components/CryptBackground';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_CONFIG = {
  1: { label: 'TIER I',   color: '#78716c', border: '#2a2520', bg: 'rgba(42,37,32,0.6)' },
  2: { label: 'TIER II',  color: '#c47a3a', border: '#5a3a1a', bg: 'rgba(90,58,26,0.3)' },
  3: { label: 'TIER III', color: '#c84040', border: '#5a1a1a', bg: 'rgba(90,26,26,0.3)' },
} as const;

const CREATURES = getAllCreatures();

// ─── Creature Card ────────────────────────────────────────────────────────────

function CreatureCard({ creature, onPress, cardWidth }: {
  creature: CreatureInfo;
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
  creature: CreatureInfo | null;
  onClose: () => void;
}) {
  if (!creature) return null;
  const { height: screenHeight } = useWindowDimensions();
  const tier = TIER_CONFIG[creature.tier];
  const asset = creature.artUrl
    ? getCreatureAsset(creature.artUrl)
    : getCreatureAssetByName(creature.name);

  // Cap image at 42% of screen height — looks great, leaves room for content
  const imageHeight = Math.round(screenHeight * 0.42);

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
            {/* Art — height capped at 42% screen height, maintains crop from top */}
            {asset ? (
              <View style={{ width: '100%', height: imageHeight, overflow: 'hidden' }}>
                <Image source={asset} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{
                      borderWidth: 1, borderColor: tier.border,
                      backgroundColor: tier.bg, paddingHorizontal: 7, paddingVertical: 3,
                    }}>
                      <Text style={{ fontFamily: 'monospace', fontSize: 10, color: tier.color, letterSpacing: 1 }}>
                        {tier.label}
                      </Text>
                    </View>
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
  const [selected, setSelected] = useState<CreatureInfo | null>(null);
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
  const [filterTier, setFilterTier] = useState<1 | 2 | 3 | null>(null);

  const COLS = 2;
  const GUTTER = 12;
  const H_PAD = 16;
  // On web, useWindowDimensions returns full browser viewport width, but WebFrame
  // constrains the game to maxWidth 430 — cap so cards don't overflow and stack.
  const effectiveWidth = Math.min(width, 430);
  const cardWidth = Math.floor((effectiveWidth - H_PAD * 2 - GUTTER) / COLS);

  const filteredCreatures = filterTier ? CREATURES.filter(c => c.tier === filterTier) : CREATURES;

  const renderItem = useCallback(({ item, index }: { item: CreatureInfo; index: number }) => (
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
      <Text style={{ fontFamily: 'monospace', fontSize: 10, color: '#57534e', textAlign: 'center', marginTop: 2 }}>
        {filteredCreatures.length} creature{filteredCreatures.length !== 1 ? 's' : ''}{filterTier ? ` · tier ${filterTier}` : ''} · tap to inspect
      </Text>
    </View>
  ), [filterTier, filteredCreatures.length]);

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
          keyExtractor={(item) => item.name}
          renderItem={renderItem}
          numColumns={COLS}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ padding: H_PAD, paddingTop: 12 }}
          key={filterTier ?? 'all'}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={{ justifyContent: 'flex-start' }}
        />

        {/* Detail Modal */}
        <CreatureDetailModal creature={selected} onClose={() => setSelected(null)} />
      </SafeAreaView>
    </CryptBackground>
  );
}
