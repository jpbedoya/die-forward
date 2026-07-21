import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { CryptBackground } from '../components/CryptBackground';
import { CRTOverlay } from '../components/CRTOverlay';
import { AudioToggle } from '../components/AudioToggle';
import { SettingsModal } from '../components/SettingsModal';
import { ItemModal, CreatureModal } from '../components/CryptModal';
import { getItemDetails, getCreatureInfo, ItemDetails, CreatureInfo } from '../lib/content';
import { useAudio } from '../lib/audio';
import { t } from '../lib/i18n';

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'combat', label: t('codex.tab.combat') },
  { id: 'items', label: t('codex.tab.items') },
  { id: 'zones', label: t('codex.tab.zones') },
  { id: 'creatures', label: t('codex.tab.creatures') },
  { id: 'milestones', label: t('codex.tab.milestones') },
  { id: 'modifiers', label: t('codex.tab.modifiers') },
  { id: 'staking', label: t('codex.tab.staking') },
  { id: 'tips', label: t('codex.tab.tips') },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
  amber: '#f59e0b',
  bone: '#d4b896',
  boneDark: '#78716c',
  boneMuted: '#a8a29e',
  ethereal: '#a855f7',
  blood: '#ef4444',
  victory: '#22c55e',
  cardBg: '#0d0b09',
  cardBorder: '#2a2520',
  surfaceBg: '#1c1917',
} as const;

const RARITY_COLOR: Record<string, string> = {
  common: C.boneDark,
  uncommon: C.amber,
  rare: C.ethereal,
  legendary: C.blood,
};

// ─── Styled primitives ───────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return (
    <Text style={{ fontFamily: 'monospace', fontSize: 13, color: C.amber, letterSpacing: 2, marginBottom: 10, marginTop: 4 }}>
      {children}
    </Text>
  );
}

function Divider() {
  return (
    <Text style={{ fontFamily: 'monospace', fontSize: 10, color: C.cardBorder, textAlign: 'center', marginVertical: 12 }}>
      {'── ◈ ──'}
    </Text>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder, padding: 14, marginBottom: 10 }}>
      {children}
    </View>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
      <Text style={{ fontFamily: 'monospace', fontSize: 11, color: C.boneDark, flex: 1 }}>{label}</Text>
      <Text style={{ fontFamily: 'monospace', fontSize: 11, color: valueColor || C.bone, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ borderWidth: 1, borderColor: color, paddingHorizontal: 5, paddingVertical: 1, alignSelf: 'flex-start' }}>
      <Text style={{ fontFamily: 'monospace', fontSize: 8, color, letterSpacing: 1 }}>{text}</Text>
    </View>
  );
}

function Body({ children }: { children: string }) {
  return (
    <Text style={{ fontFamily: 'monospace', fontSize: 11, color: C.boneDark, lineHeight: 18 }}>
      {children}
    </Text>
  );
}

// ─── Content sections ─────────────────────────────────────────────────────────

function CombatSection() {
  return (
    <View>
      <SectionTitle>{t('codex.combat.section.actions')}</SectionTitle>
      <Card>
        <Row label={t('codex.combat.action.strike.label')} value={t('codex.combat.action.strike.value')} valueColor={C.blood} />
        <Body>{t('codex.combat.action.strike.body')}</Body>
      </Card>
      <Card>
        <Row label={t('codex.combat.action.dodge.label')} value={t('codex.combat.action.dodge.value')} valueColor={C.victory} />
        <Body>{t('codex.combat.action.dodge.body')}</Body>
      </Card>
      <Card>
        <Row label={t('codex.combat.action.brace.label')} value={t('codex.combat.action.brace.value')} valueColor={C.amber} />
        <Body>{t('codex.combat.action.brace.body')}</Body>
      </Card>
      <Card>
        <Row label={t('codex.combat.action.flee.label')} value={t('codex.combat.action.flee.value')} valueColor={C.ethereal} />
        <Body>{t('codex.combat.action.flee.body')}</Body>
      </Card>

      <Divider />

      <SectionTitle>{t('codex.combat.section.stamina')}</SectionTitle>
      <Card>
        <Row label={t('codex.combat.stamina.starting.label')} value={t('codex.combat.stamina.starting.value')} />
        <Row label={t('codex.combat.stamina.maximum.label')} value={t('codex.combat.stamina.maximum.value')} />
        <Row label={t('codex.combat.stamina.regen.label')} value={t('codex.combat.stamina.regen.value')} />
      </Card>

      <Divider />

      <SectionTitle>{t('codex.combat.section.intents')}</SectionTitle>
      <Card>
        <Row label={t('codex.combat.intent.aggressive.label')} value={t('codex.combat.intent.aggressive.value')} />
        <Row label={t('codex.combat.intent.charging.label')} value={t('codex.combat.intent.charging.value')} valueColor={C.blood} />
        <Row label={t('codex.combat.intent.defensive.label')} value={t('codex.combat.intent.defensive.value')} />
        <Row label={t('codex.combat.intent.hunting.label')} value={t('codex.combat.intent.hunting.value')} valueColor={C.amber} />
        <Row label={t('codex.combat.intent.stalking.label')} value={t('codex.combat.intent.stalking.value')} />
        <Row label={t('codex.combat.intent.erratic.label')} value={t('codex.combat.intent.erratic.value')} valueColor={C.ethereal} />
        <Row label={t('codex.combat.intent.retreating.label')} value={t('codex.combat.intent.retreating.value')} valueColor={C.victory} />
      </Card>

      <Divider />

      <SectionTitle>{t('codex.combat.section.counterplay')}</SectionTitle>
      <Card>
        <Body>{t('codex.combat.counterplay.intro')}</Body>
        <View style={{ marginTop: 6 }}>
          <Row label={t('codex.combat.counterplay.strikeAggressive.label')} value={t('codex.combat.counterplay.strikeAggressive.value')} valueColor={C.victory} />
          <Row label={t('codex.combat.counterplay.strikeHunting.label')} value={t('codex.combat.counterplay.strikeHunting.value')} valueColor={C.victory} />
          <Row label={t('codex.combat.counterplay.dodgeCharging.label')} value={t('codex.combat.counterplay.dodgeCharging.value')} valueColor={C.victory} />
        </View>
      </Card>

      <Card>
        <SectionTitle>{t('codex.combat.charge.title')}</SectionTitle>
        <Body>{t('codex.combat.charge.body')}</Body>
      </Card>
    </View>
  );
}

function ItemsSection() {
  const [selectedItem, setSelectedItem] = useState<ItemDetails | null>(null);

  const items = [
    { cat: t('codex.items.category.weapons'), entries: [
      { name: 'Rusty Blade', label: t('codex.items.weapon.rustyBlade.name'), emoji: '⚔️', rarity: 'common', effect: t('codex.items.weapon.rustyBlade.effect') },
      { name: 'Torch', label: t('codex.items.weapon.torch.name'), emoji: '🔥', rarity: 'uncommon', effect: t('codex.items.weapon.torch.effect') },
      { name: 'Dagger', label: t('codex.items.weapon.dagger.name'), emoji: '🗡️', rarity: 'uncommon', effect: t('codex.items.weapon.dagger.effect') },
      { name: 'Bone Hook', label: t('codex.items.weapon.boneHook.name'), emoji: '🪝', rarity: 'uncommon', effect: t('codex.items.weapon.boneHook.effect') },
      { name: 'Voidblade', label: t('codex.items.weapon.voidblade.name'), emoji: '⚔️', rarity: 'legendary', effect: t('codex.items.weapon.voidblade.effect') },
    ]},
    { cat: t('codex.items.category.armor'), entries: [
      { name: 'Tattered Shield', label: t('codex.items.armor.tatteredShield.name'), emoji: '🛡️', rarity: 'common', effect: t('codex.items.armor.tatteredShield.effect') },
      { name: 'Shield', label: t('codex.items.armor.shield.name'), emoji: '🛡️', rarity: 'uncommon', effect: t('codex.items.armor.shield.effect') },
      { name: 'Cloak', label: t('codex.items.armor.cloak.name'), emoji: '🧥', rarity: 'uncommon', effect: t('codex.items.armor.cloak.effect') },
      { name: 'Bone Charm', label: t('codex.items.armor.boneCharm.name'), emoji: '💀', rarity: 'uncommon', effect: t('codex.items.armor.boneCharm.effect') },
      { name: 'Ancient Scroll', label: t('codex.items.armor.ancientScroll.name'), emoji: '📜', rarity: 'rare', effect: t('codex.items.armor.ancientScroll.effect') },
    ]},
    { cat: t('codex.items.category.consumables'), entries: [
      { name: 'Herbs', label: t('codex.items.consumable.herbs.name'), emoji: '🌿', rarity: 'common', effect: t('codex.items.consumable.herbs.effect') },
      { name: 'Pale Rations', label: t('codex.items.consumable.paleRations.name'), emoji: '🍖', rarity: 'common', effect: t('codex.items.consumable.paleRations.effect') },
      { name: 'Bone Dust', label: t('codex.items.consumable.boneDust.name'), emoji: '💨', rarity: 'common', effect: t('codex.items.consumable.boneDust.effect') },
      { name: 'Poison Vial', label: t('codex.items.consumable.poisonVial.name'), emoji: '🧪', rarity: 'rare', effect: t('codex.items.consumable.poisonVial.effect') },
      { name: 'Void Salt', label: t('codex.items.consumable.voidSalt.name'), emoji: '🧂', rarity: 'uncommon', effect: t('codex.items.consumable.voidSalt.effect') },
    ]},
    { cat: t('codex.items.category.artifacts'), entries: [
      { name: 'Pale Coin', label: t('codex.items.artifact.paleCoin.name'), emoji: '🪙', rarity: 'common', effect: t('codex.items.artifact.paleCoin.effect') },
      { name: 'Eye of the Hollow', label: t('codex.items.artifact.eyeOfTheHollow.name'), emoji: '👁️', rarity: 'rare', effect: t('codex.items.artifact.eyeOfTheHollow.effect') },
      { name: 'Soulstone', label: t('codex.items.artifact.soulstone.name'), emoji: '💎', rarity: 'rare', effect: t('codex.items.artifact.soulstone.effect') },
      { name: 'Heartstone', label: t('codex.items.artifact.heartstone.name'), emoji: '💎', rarity: 'legendary', effect: t('codex.items.artifact.heartstone.effect') },
      { name: "Death's Mantle", label: t('codex.items.artifact.deathsMantle.name'), emoji: '🌑', rarity: 'legendary', effect: t('codex.items.artifact.deathsMantle.effect') },
    ]},
  ];

  const handleItemPress = useCallback((name: string) => {
    const details = getItemDetails(name);
    if (details) setSelectedItem(details);
  }, []);

  return (
    <View>
      <ItemModal
        visible={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
      />

      <SectionTitle>{t('codex.items.section.inventory')}</SectionTitle>
      <Card>
        <Row label={t('codex.items.inventory.slots.label')} value={t('codex.items.inventory.slots.value')} />
        <Body>{t('codex.items.inventory.body')}</Body>
      </Card>

      <SectionTitle>{t('codex.items.section.dropRates')}</SectionTitle>
      <Card>
        <Row label={t('codex.items.dropRate.common.label')} value={t('codex.items.dropRate.common.value')} valueColor={RARITY_COLOR.common} />
        <Row label={t('codex.items.dropRate.uncommon.label')} value={t('codex.items.dropRate.uncommon.value')} valueColor={RARITY_COLOR.uncommon} />
        <Row label={t('codex.items.dropRate.rare.label')} value={t('codex.items.dropRate.rare.value')} valueColor={RARITY_COLOR.rare} />
        <Row label={t('codex.items.dropRate.legendary.label')} value={t('codex.items.dropRate.legendary.value')} valueColor={RARITY_COLOR.legendary} />
      </Card>

      <Divider />

      {items.map((group) => (
        <View key={group.cat}>
          <SectionTitle>{group.cat}</SectionTitle>
          {group.entries.map((item) => (
            <Pressable
              key={item.name}
              onPress={() => handleItemPress(item.name)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? 'rgba(245,158,11,0.08)' : C.cardBg,
                borderWidth: 1,
                borderColor: pressed ? C.amber : C.cardBorder,
                padding: 14,
                marginBottom: 10,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
                <Text style={{ fontFamily: 'monospace', fontSize: 12, color: RARITY_COLOR[item.rarity] || C.bone, flex: 1 }}>{item.label}</Text>
                <Badge text={t(`codex.rarity.${item.rarity}`)} color={RARITY_COLOR[item.rarity] || C.boneDark} />
              </View>
              <Body>{item.effect}</Body>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

function ZonesSection() {
  const zones = [
    { emoji: '🌊', name: t('codex.zones.sunkenCrypt.name'), unlock: t('codex.zones.sunkenCrypt.unlock'), desc: t('codex.zones.sunkenCrypt.desc') },
    { emoji: '🔥', name: t('codex.zones.ashenCrypts.name'), unlock: t('codex.zones.ashenCrypts.unlock'), desc: t('codex.zones.ashenCrypts.desc') },
    { emoji: '❄️', name: t('codex.zones.frozenGallery.name'), unlock: t('codex.zones.frozenGallery.unlock'), desc: t('codex.zones.frozenGallery.desc') },
    { emoji: '🩸', name: t('codex.zones.livingTomb.name'), unlock: t('codex.zones.livingTomb.unlock'), desc: t('codex.zones.livingTomb.desc') },
    { emoji: '🌑', name: t('codex.zones.voidBeyond.name'), unlock: t('codex.zones.voidBeyond.unlock'), desc: t('codex.zones.voidBeyond.desc') },
  ];

  return (
    <View>
      <SectionTitle>{t('codex.zones.section.title')}</SectionTitle>
      {zones.map((z) => (
        <Card key={z.name}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Text style={{ fontSize: 18 }}>{z.emoji}</Text>
            <Text style={{ fontFamily: 'monospace', fontSize: 12, color: C.amber, letterSpacing: 1 }}>{z.name}</Text>
          </View>
          <Body>{z.desc}</Body>
          <View style={{ marginTop: 6 }}>
            <Row label={t('codex.zones.row.unlock.label')} value={z.unlock} valueColor={C.ethereal} />
          </View>
        </Card>
      ))}

      <Divider />

      <SectionTitle>{t('codex.zones.section.structure')}</SectionTitle>
      <Card>
        <Row label={t('codex.zones.structure.rooms1to4.label')} value={t('codex.zones.structure.rooms1to4.value')} valueColor={C.boneDark} />
        <Row label={t('codex.zones.structure.rooms5to8.label')} value={t('codex.zones.structure.rooms5to8.value')} valueColor={C.amber} />
        <Row label={t('codex.zones.structure.rooms9to12.label')} value={t('codex.zones.structure.rooms9to12.value')} valueColor={C.blood} />
        <Row label={t('codex.zones.structure.room13.label')} value={t('codex.zones.structure.room13.value')} valueColor={C.blood} />
      </Card>

      <SectionTitle>{t('codex.zones.section.roomTypes')}</SectionTitle>
      <Card>
        <Row label={t('codex.zones.roomType.explore.label')} value={t('codex.zones.roomType.explore.value')} />
        <Body>{t('codex.zones.roomType.explore.body')}</Body>
      </Card>
      <Card>
        <Row label={t('codex.zones.roomType.combat.label')} value={t('codex.zones.roomType.combat.value')} />
        <Body>{t('codex.zones.roomType.combat.body')}</Body>
      </Card>
      <Card>
        <Row label={t('codex.zones.roomType.corpse.label')} value={t('codex.zones.roomType.corpse.value')} />
        <Body>{t('codex.zones.roomType.corpse.body')}</Body>
      </Card>
      <Card>
        <Row label={t('codex.zones.roomType.cache.label')} value={t('codex.zones.roomType.cache.value')} />
        <Body>{t('codex.zones.roomType.cache.body')}</Body>
      </Card>
    </View>
  );
}

function CreaturesSection() {
  const [selectedCreature, setSelectedCreature] = useState<CreatureInfo | null>(null);

  const tiers = [
    { tier: 1, label: t('codex.creatures.tier1.label'), color: C.boneDark, creatures: [
      { name: 'The Drowned', label: t('codex.creatures.theDrowned.label'), emoji: '🧟', hp: '45-65', behavior: t('codex.creatures.theDrowned.behavior') },
      { name: 'Pale Crawler', label: t('codex.creatures.paleCrawler.label'), emoji: '🕷️', hp: '35-50', behavior: t('codex.creatures.paleCrawler.behavior') },
      { name: 'The Hollow', label: t('codex.creatures.theHollow.label'), emoji: '👤', hp: '40-55', behavior: t('codex.creatures.theHollow.behavior') },
      { name: 'Bloated One', label: t('codex.creatures.bloatedOne.label'), emoji: '🫧', hp: '55-75', behavior: t('codex.creatures.bloatedOne.behavior') },
      { name: 'Flickering Shade', label: t('codex.creatures.flickeringShade.label'), emoji: '👻', hp: '30-45', behavior: t('codex.creatures.flickeringShade.behavior') },
      { name: 'The Hunched', label: t('codex.creatures.theHunched.label'), emoji: '🐺', hp: '50-70', behavior: t('codex.creatures.theHunched.behavior') },
      { name: 'Tideborn', label: t('codex.creatures.tideborn.label'), emoji: '🌊', hp: '60-80', behavior: t('codex.creatures.tideborn.behavior') },
    ]},
    { tier: 2, label: t('codex.creatures.tier2.label'), color: C.amber, creatures: [
      { name: 'Hollow Clergy', label: t('codex.creatures.hollowClergy.label'), emoji: '🧙', hp: '70-90', behavior: t('codex.creatures.hollowClergy.behavior') },
      { name: 'The Bound', label: t('codex.creatures.theBound.label'), emoji: '⛓️', hp: '80-100', behavior: t('codex.creatures.theBound.behavior') },
      { name: 'Forgotten Guardian', label: t('codex.creatures.forgottenGuardian.label'), emoji: '🗿', hp: '90-110', behavior: t('codex.creatures.forgottenGuardian.behavior') },
      { name: 'The Weeping', label: t('codex.creatures.theWeeping.label'), emoji: '😢', hp: '60-80', behavior: t('codex.creatures.theWeeping.behavior') },
      { name: 'Carrion Knight', label: t('codex.creatures.carrionKnight.label'), emoji: '⚔️', hp: '85-105', behavior: t('codex.creatures.carrionKnight.behavior') },
      { name: 'The Congregation', label: t('codex.creatures.theCongregation.label'), emoji: '👥', hp: '100-130', behavior: t('codex.creatures.theCongregation.behavior') },
    ]},
    { tier: 3, label: t('codex.creatures.tier3.label'), color: C.blood, creatures: [
      { name: 'The Unnamed', label: t('codex.creatures.theUnnamed.label'), emoji: '❓', hp: '120-150', behavior: t('codex.creatures.theUnnamed.behavior') },
      { name: 'Mother of Tides', label: t('codex.creatures.motherOfTides.label'), emoji: '🌊', hp: '130-160', behavior: t('codex.creatures.motherOfTides.behavior') },
      { name: 'The Keeper', label: t('codex.creatures.theKeeper.label'), emoji: '👁️', hp: '180-220', behavior: t('codex.creatures.theKeeper.behavior') },
    ]},
  ];

  const handleCreaturePress = useCallback((name: string) => {
    const info = getCreatureInfo(name);
    if (info) setSelectedCreature(info);
  }, []);

  return (
    <View>
      <CreatureModal
        visible={!!selectedCreature}
        onClose={() => setSelectedCreature(null)}
        creature={selectedCreature}
      />

      <Body>{t('codex.creatures.intro')}</Body>
      <Divider />
      {tiers.map((tier) => (
        <View key={tier.tier}>
          <SectionTitle>{tier.label}</SectionTitle>
          {tier.creatures.map((c) => (
            <Pressable
              key={c.name}
              onPress={() => handleCreaturePress(c.name)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? 'rgba(245,158,11,0.08)' : C.cardBg,
                borderWidth: 1,
                borderColor: pressed ? tier.color : C.cardBorder,
                padding: 14,
                marginBottom: 10,
              })}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Text style={{ fontSize: 14 }}>{c.emoji}</Text>
                  <Text style={{ fontFamily: 'monospace', fontSize: 12, color: tier.color }}>{c.label}</Text>
                </View>
                <Text style={{ fontFamily: 'monospace', fontSize: 10, color: C.blood }}>{t('codex.creatures.hpLabel', { hp: c.hp })}</Text>
              </View>
              <Body>{c.behavior}</Body>
            </Pressable>
          ))}
          <Divider />
        </View>
      ))}
    </View>
  );
}

function MilestonesSection() {
  const milestones = [
    { deaths: '10', reward: t('codex.milestones.10.reward'), type: 'cosmetic' },
    { deaths: '25', reward: t('codex.milestones.25.reward'), type: 'cosmetic' },
    { deaths: '50', reward: t('codex.milestones.50.reward'), type: 'gameplay' },
    { deaths: '100', reward: t('codex.milestones.100.reward'), type: 'cosmetic' },
    { deaths: '250', reward: t('codex.milestones.250.reward'), type: 'gameplay' },
    { deaths: '500', reward: t('codex.milestones.500.reward'), type: 'gameplay' },
  ];

  return (
    <View>
      <Body>{t('codex.milestones.intro')}</Body>
      <Divider />
      <SectionTitle>{t('codex.milestones.section.title')}</SectionTitle>
      {milestones.map((m) => (
        <Card key={m.deaths}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontFamily: 'monospace', fontSize: 14, color: C.blood }}>💀</Text>
              <Text style={{ fontFamily: 'monospace', fontSize: 13, color: C.amber }}>{t('codex.milestones.deathsLabel', { deaths: m.deaths })}</Text>
            </View>
            <Badge text={m.type === 'gameplay' ? t('codex.milestones.badge.perk') : t('codex.milestones.badge.cosmetic')} color={m.type === 'gameplay' ? C.victory : C.ethereal} />
          </View>
          <Body>{m.reward}</Body>
        </Card>
      ))}
    </View>
  );
}

function ModifiersSection() {
  const mods = [
    { emoji: '🩸', name: t('codex.modifiers.bloodPact.name'), desc: t('codex.modifiers.bloodPact.desc') },
    { emoji: '🌑', name: t('codex.modifiers.blindDescent.name'), desc: t('codex.modifiers.blindDescent.desc') },
    { emoji: '💀', name: t('codex.modifiers.deathsEcho.name'), desc: t('codex.modifiers.deathsEcho.desc') },
    { emoji: '🧊', name: t('codex.modifiers.numbingCold.name'), desc: t('codex.modifiers.numbingCold.desc') },
    { emoji: '🛡️', name: t('codex.modifiers.ironWill.name'), desc: t('codex.modifiers.ironWill.desc') },
    { emoji: '⚡', name: t('codex.modifiers.glassCannon.name'), desc: t('codex.modifiers.glassCannon.desc') },
  ];

  return (
    <View>
      <Body>{t('codex.modifiers.intro')}</Body>
      <Divider />
      <SectionTitle>{t('codex.modifiers.section.title')}</SectionTitle>
      {mods.map((m) => (
        <Card key={m.name}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={{ fontSize: 16 }}>{m.emoji}</Text>
            <Text style={{ fontFamily: 'monospace', fontSize: 12, color: C.amber, letterSpacing: 1 }}>{m.name.toUpperCase()}</Text>
          </View>
          <Body>{m.desc}</Body>
        </Card>
      ))}
    </View>
  );
}

function StakingSection() {
  return (
    <View>
      <SectionTitle>{t('codex.staking.section.title')}</SectionTitle>
      <Card>
        <Body>{t('codex.staking.intro')}</Body>
      </Card>

      <SectionTitle>{t('codex.staking.section.options')}</SectionTitle>
      <Card>
        <Row label={t('codex.staking.option.emptyHanded.label')} value={t('codex.staking.option.emptyHanded.value')} valueColor={C.boneDark} />
        <Row label={t('codex.staking.option.tier1.label')} value={t('codex.staking.option.tier1.value')} valueColor={C.victory} />
        <Row label={t('codex.staking.option.tier2.label')} value={t('codex.staking.option.tier2.value')} valueColor={C.victory} />
        <Row label={t('codex.staking.option.tier3.label')} value={t('codex.staking.option.tier3.value')} valueColor={C.victory} />
        <Row label={t('codex.staking.option.tier4.label')} value={t('codex.staking.option.tier4.value')} valueColor={C.victory} />
      </Card>

      <Divider />

      <SectionTitle>{t('codex.staking.section.emptyHanded')}</SectionTitle>
      <Card>
        <Body>{t('codex.staking.emptyHanded.body')}</Body>
      </Card>

      <SectionTitle>{t('codex.staking.section.memorialPool')}</SectionTitle>
      <Card>
        <Body>{t('codex.staking.memorialPool.body')}</Body>
      </Card>

      <SectionTitle>{t('codex.staking.section.tipping')}</SectionTitle>
      <Card>
        <Row label={t('codex.staking.tipping.label')} value={t('codex.staking.tipping.value')} />
        <Body>{t('codex.staking.tipping.body')}</Body>
      </Card>
    </View>
  );
}

function WisdomSection() {
  const tips = [
    t('codex.tips.0'),
    t('codex.tips.1'),
    t('codex.tips.2'),
    t('codex.tips.3'),
    t('codex.tips.4'),
    t('codex.tips.5'),
    t('codex.tips.6'),
    t('codex.tips.7'),
    t('codex.tips.8'),
    t('codex.tips.9'),
  ];

  return (
    <View>
      <Body>{t('codex.wisdom.intro')}</Body>
      <Divider />
      <SectionTitle>{t('codex.wisdom.section.title')}</SectionTitle>
      {tips.map((tip, i) => (
        <Card key={i}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Text style={{ fontFamily: 'monospace', fontSize: 11, color: C.amber }}>◈</Text>
            <Text style={{ fontFamily: 'monospace', fontSize: 11, color: C.bone, lineHeight: 18, flex: 1 }}>{tip}</Text>
          </View>
        </Card>
      ))}

      <Divider />
      <Text style={{ fontFamily: 'monospace', fontSize: 12, color: C.boneDark, textAlign: 'center', fontStyle: 'italic', marginVertical: 16 }}>
        {t('codex.wisdom.footer')}
      </Text>
    </View>
  );
}

// ─── Tab content map ──────────────────────────────────────────────────────────

const SECTION_MAP: Record<TabId, () => React.ReactElement> = {
  combat: CombatSection,
  items: ItemsSection,
  zones: ZonesSection,
  creatures: CreaturesSection,
  milestones: MilestonesSection,
  modifiers: ModifiersSection,
  staking: StakingSection,
  tips: WisdomSection,
};

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CodexScreen() {
  const [activeTab, setActiveTab] = useState<TabId>('combat');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { playSFX } = useAudio();

  const handleTabPress = useCallback((tabId: TabId) => {
    if (tabId !== activeTab) {
      playSFX('ui-click');
      setActiveTab(tabId);
    }
  }, [activeTab, playSFX]);

  const SectionContent = SECTION_MAP[activeTab];

  return (
    <CryptBackground screen="home">
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
        <CRTOverlay />

        <ScreenHeader
          showHome
          title={t('codex.title')}
          right={<AudioToggle inline onSettingsPress={() => setSettingsOpen(true)} />}
        />

        <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />

        {/* Tab bar */}
        <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 8, gap: 6 }}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => handleTabPress(tab.id)}
                style={{
                  borderWidth: 1,
                  borderColor: active ? C.amber : C.cardBorder,
                  backgroundColor: active ? 'rgba(245,158,11,0.15)' : 'transparent',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Text style={{
                  fontFamily: 'monospace',
                  fontSize: 10,
                  letterSpacing: 1,
                  color: active ? C.amber : C.boneDark,
                }}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 40 }}
            key={activeTab}
          >
            <SectionContent />
          </ScrollView>
        </View>
      </SafeAreaView>
    </CryptBackground>
  );
}
