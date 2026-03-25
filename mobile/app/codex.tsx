import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { CryptBackground } from '../components/CryptBackground';
import { CRTOverlay } from '../components/CRTOverlay';
import { AudioToggle } from '../components/AudioToggle';
import { AudioSettingsModal } from '../components/AudioSettingsModal';
import { ItemModal, CreatureModal } from '../components/CryptModal';
import { getItemDetails, getCreatureInfo, ItemDetails, CreatureInfo } from '../lib/content';
import { useAudio } from '../lib/audio';

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'combat', label: 'COMBAT' },
  { id: 'items', label: 'ITEMS' },
  { id: 'zones', label: 'ZONES' },
  { id: 'creatures', label: 'CREATURES' },
  { id: 'milestones', label: 'MILESTONES' },
  { id: 'modifiers', label: 'MODIFIERS' },
  { id: 'staking', label: 'STAKING' },
  { id: 'tips', label: 'WISDOM' },
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
      <SectionTitle>ACTIONS</SectionTitle>
      <Card>
        <Row label="STRIKE (2 stamina)" value="15-25 base dmg" valueColor={C.blood} />
        <Body>Attack the enemy. Take a counter-attack. 15% critical hit chance (1.75x).</Body>
      </Card>
      <Card>
        <Row label="DODGE (1 stamina)" value="65% success" valueColor={C.victory} />
        <Body>Success: negate all damage. Failure: take 5-9 damage. Dodging a CHARGING enemy deals 8-14 counter damage.</Body>
      </Card>
      <Card>
        <Row label="BRACE (0 stamina)" value="-50% damage" valueColor={C.amber} />
        <Body>Reduce incoming damage by half. Still take 6-12 base damage. Free to use when out of stamina.</Body>
      </Card>
      <Card>
        <Row label="FLEE (1 stamina)" value="50% escape" valueColor={C.ethereal} />
        <Body>Success: leave combat. 60% clean escape, 40% take 5-12 damage. Failure: take 8-19 damage.</Body>
      </Card>

      <Divider />

      <SectionTitle>STAMINA</SectionTitle>
      <Card>
        <Row label="Starting" value="3 pips" />
        <Row label="Maximum" value="4 pips" />
        <Row label="Regen" value="+1 per turn" />
      </Card>

      <Divider />

      <SectionTitle>ENEMY INTENTS</SectionTitle>
      <Card>
        <Row label="AGGRESSIVE" value="Normal attack" />
        <Row label="CHARGING" value="Weak now, 2x next turn" valueColor={C.blood} />
        <Row label="DEFENSIVE" value="Half dmg both ways" />
        <Row label="HUNTING" value="+30% dmg, -20% flee" valueColor={C.amber} />
        <Row label="STALKING" value="Normal, -30% flee" />
        <Row label="ERRATIC" value="Random 0.5-2x dmg" valueColor={C.ethereal} />
        <Row label="RETREATING" value="Weak, easy to flee" valueColor={C.victory} />
      </Card>

      <Divider />

      <SectionTitle>COUNTER-PLAY</SectionTitle>
      <Card>
        <Body>Choose the right action against an intent for +50% damage bonus:</Body>
        <View style={{ marginTop: 6 }}>
          <Row label="Strike vs AGGRESSIVE" value="+50% bonus" valueColor={C.victory} />
          <Row label="Strike vs HUNTING" value="+50% bonus" valueColor={C.victory} />
          <Row label="Dodge vs CHARGING" value="+50% bonus + counter" valueColor={C.victory} />
        </View>
      </Card>

      <Card>
        <SectionTitle>THE CHARGE</SectionTitle>
        <Body>When an enemy shows CHARGING, they deal half damage this turn but DOUBLE damage next turn. Dodge to avoid the charge and deal counter damage. Fail to dodge and the punishment is severe.</Body>
      </Card>
    </View>
  );
}

function ItemsSection() {
  const [selectedItem, setSelectedItem] = useState<ItemDetails | null>(null);

  const items = [
    { cat: 'WEAPONS', entries: [
      { name: 'Rusty Blade', emoji: '⚔️', rarity: 'common', effect: '+20% damage' },
      { name: 'Torch', emoji: '🔥', rarity: 'uncommon', effect: '+25% damage' },
      { name: 'Dagger', emoji: '🗡️', rarity: 'uncommon', effect: '+35% damage' },
      { name: 'Bone Hook', emoji: '🪝', rarity: 'uncommon', effect: '+20% flee chance' },
      { name: 'Voidblade', emoji: '⚔️', rarity: 'legendary', effect: '+50% damage, -5 HP/turn' },
    ]},
    { cat: 'ARMOR', entries: [
      { name: 'Tattered Shield', emoji: '🛡️', rarity: 'common', effect: '+25% defense' },
      { name: 'Shield', emoji: '🛡️', rarity: 'uncommon', effect: '+25% defense' },
      { name: 'Cloak', emoji: '🧥', rarity: 'uncommon', effect: '+10% defense, +15% flee' },
      { name: 'Bone Charm', emoji: '💀', rarity: 'uncommon', effect: '+15% defense' },
      { name: 'Ancient Scroll', emoji: '📜', rarity: 'rare', effect: '+20% defense, +10% flee' },
    ]},
    { cat: 'CONSUMABLES', entries: [
      { name: 'Herbs', emoji: '🌿', rarity: 'common', effect: 'Heal 25-40 HP' },
      { name: 'Pale Rations', emoji: '🍖', rarity: 'common', effect: 'Restore full stamina' },
      { name: 'Bone Dust', emoji: '💨', rarity: 'common', effect: 'Reveal hidden paths' },
      { name: 'Poison Vial', emoji: '🧪', rarity: 'rare', effect: '+40% damage (passive)' },
      { name: 'Void Salt', emoji: '🧂', rarity: 'uncommon', effect: '+40% vs aquatic' },
    ]},
    { cat: 'ARTIFACTS', entries: [
      { name: 'Pale Coin', emoji: '🪙', rarity: 'common', effect: '+10% flee chance' },
      { name: 'Eye of the Hollow', emoji: '👁️', rarity: 'rare', effect: '+20% corpse discovery' },
      { name: 'Soulstone', emoji: '💎', rarity: 'rare', effect: '+10% all stats (50+ deaths)' },
      { name: 'Heartstone', emoji: '💎', rarity: 'legendary', effect: 'Near-death warning' },
      { name: "Death's Mantle", emoji: '🌑', rarity: 'legendary', effect: 'Survive lethal hit at 1 HP' },
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

      <SectionTitle>INVENTORY</SectionTitle>
      <Card>
        <Row label="Slots" value="4 maximum" />
        <Body>When you find a 5th item, choose which slot to swap or leave it behind.</Body>
      </Card>

      <SectionTitle>DROP RATES</SectionTitle>
      <Card>
        <Row label="Common" value="55%" valueColor={RARITY_COLOR.common} />
        <Row label="Uncommon" value="30%" valueColor={RARITY_COLOR.uncommon} />
        <Row label="Rare" value="12%" valueColor={RARITY_COLOR.rare} />
        <Row label="Legendary" value="3%" valueColor={RARITY_COLOR.legendary} />
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
                <Text style={{ fontFamily: 'monospace', fontSize: 12, color: RARITY_COLOR[item.rarity] || C.bone, flex: 1 }}>{item.name}</Text>
                <Badge text={item.rarity.toUpperCase()} color={RARITY_COLOR[item.rarity] || C.boneDark} />
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
    { emoji: '🌊', name: 'THE SUNKEN CRYPT', unlock: 'Always available', desc: 'Flooded corridors and drowned dead. The first descent.' },
    { emoji: '🔥', name: 'THE ASHEN CRYPTS', unlock: 'Reach room 8 in any run', desc: 'Scorched halls where embers never die.' },
    { emoji: '❄️', name: 'THE FROZEN GALLERY', unlock: 'Reach room 8 in any run', desc: 'A gallery of ice-preserved horrors.' },
    { emoji: '🩸', name: 'THE LIVING TOMB', unlock: 'Reach room 8 in any run', desc: 'Organic walls that breathe and bleed.' },
    { emoji: '🌑', name: 'THE VOID BEYOND', unlock: 'Clear 3 different zone bosses', desc: 'Where reality frays. Nothing is certain.' },
  ];

  return (
    <View>
      <SectionTitle>THE FIVE DESCENTS</SectionTitle>
      {zones.map((z) => (
        <Card key={z.name}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Text style={{ fontSize: 18 }}>{z.emoji}</Text>
            <Text style={{ fontFamily: 'monospace', fontSize: 12, color: C.amber, letterSpacing: 1 }}>{z.name}</Text>
          </View>
          <Body>{z.desc}</Body>
          <View style={{ marginTop: 6 }}>
            <Row label="Unlock" value={z.unlock} valueColor={C.ethereal} />
          </View>
        </Card>
      ))}

      <Divider />

      <SectionTitle>DUNGEON STRUCTURE</SectionTitle>
      <Card>
        <Row label="Rooms 1-4" value="Tier 1 (upper)" valueColor={C.boneDark} />
        <Row label="Rooms 5-8" value="Tier 2 (middle)" valueColor={C.amber} />
        <Row label="Rooms 9-12" value="Tier 3 (deep)" valueColor={C.blood} />
        <Row label="Room 13" value="Boss" valueColor={C.blood} />
      </Card>

      <SectionTitle>ROOM TYPES</SectionTitle>
      <Card>
        <Row label="Explore" value="Choose a path" />
        <Body>Three options: safe path, risk path (55% loot, 15% damage), or spend 1 stamina to scout ahead.</Body>
      </Card>
      <Card>
        <Row label="Combat" value="Fight or flee" />
        <Body>Turn-based battle against a zone creature. Read the intent. Choose wisely.</Body>
      </Card>
      <Card>
        <Row label="Corpse" value="The fallen" />
        <Body>Discover real player corpses. Search for loot, pay respects, or tip the dead.</Body>
      </Card>
      <Card>
        <Row label="Cache" value="Supplies" />
        <Body>Heal +30 HP. A moment of respite before the darkness deepens.</Body>
      </Card>
    </View>
  );
}

function CreaturesSection() {
  const [selectedCreature, setSelectedCreature] = useState<CreatureInfo | null>(null);

  const tiers = [
    { tier: 1, label: 'TIER 1 — THE UPPER DEPTHS', color: C.boneDark, creatures: [
      { name: 'The Drowned', emoji: '🧟', hp: '45-65', behavior: 'Aggressive, Erratic' },
      { name: 'Pale Crawler', emoji: '🕷️', hp: '35-50', behavior: 'Stalking, Hunting' },
      { name: 'The Hollow', emoji: '👤', hp: '40-55', behavior: 'Stalking, Charging' },
      { name: 'Bloated One', emoji: '🫧', hp: '55-75', behavior: 'Aggressive, Charging' },
      { name: 'Flickering Shade', emoji: '👻', hp: '30-45', behavior: 'Erratic, Retreating' },
      { name: 'The Hunched', emoji: '🐺', hp: '50-70', behavior: 'Hunting, Aggressive' },
      { name: 'Tideborn', emoji: '🌊', hp: '60-80', behavior: 'Charging, Defensive' },
    ]},
    { tier: 2, label: 'TIER 2 — THE FLOODED HALLS', color: C.amber, creatures: [
      { name: 'Hollow Clergy', emoji: '🧙', hp: '70-90', behavior: 'Charging, Defensive' },
      { name: 'The Bound', emoji: '⛓️', hp: '80-100', behavior: 'Hunting, Charging' },
      { name: 'Forgotten Guardian', emoji: '🗿', hp: '90-110', behavior: 'Defensive, Charging' },
      { name: 'The Weeping', emoji: '😢', hp: '60-80', behavior: 'Stalking, Erratic' },
      { name: 'Carrion Knight', emoji: '⚔️', hp: '85-105', behavior: 'Aggressive, Defensive' },
      { name: 'The Congregation', emoji: '👥', hp: '100-130', behavior: 'Aggressive, Charging' },
    ]},
    { tier: 3, label: 'TIER 3 — THE ABYSS', color: C.blood, creatures: [
      { name: 'The Unnamed', emoji: '❓', hp: '120-150', behavior: 'Erratic, Stalking' },
      { name: 'Mother of Tides', emoji: '🌊', hp: '130-160', behavior: 'Charging, Aggressive' },
      { name: 'The Keeper', emoji: '👁️', hp: '180-220', behavior: 'Charging, Aggressive, Defensive' },
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

      <Body>Creatures grow stronger in the deep. Tier 2 deal 1.5x damage. Tier 3 deal 2x.</Body>
      <Divider />
      {tiers.map((t) => (
        <View key={t.tier}>
          <SectionTitle>{t.label}</SectionTitle>
          {t.creatures.map((c) => (
            <Pressable
              key={c.name}
              onPress={() => handleCreaturePress(c.name)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? 'rgba(245,158,11,0.08)' : C.cardBg,
                borderWidth: 1,
                borderColor: pressed ? t.color : C.cardBorder,
                padding: 14,
                marginBottom: 10,
              })}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Text style={{ fontSize: 14 }}>{c.emoji}</Text>
                  <Text style={{ fontFamily: 'monospace', fontSize: 12, color: t.color }}>{c.name}</Text>
                </View>
                <Text style={{ fontFamily: 'monospace', fontSize: 10, color: C.blood }}>{c.hp} HP</Text>
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
    { deaths: '10', reward: 'Title: "The Persistent"', type: 'cosmetic' },
    { deaths: '25', reward: 'Border: Bone Frame', type: 'cosmetic' },
    { deaths: '50', reward: 'Soulstone added to loot pool', type: 'gameplay' },
    { deaths: '100', reward: 'Title: "The Undying"', type: 'cosmetic' },
    { deaths: '250', reward: 'Start each run with a random item', type: 'gameplay' },
    { deaths: '500', reward: 'Start each run with 110 HP', type: 'gameplay' },
  ];

  return (
    <View>
      <Body>Every death moves you forward. Die enough and the dungeon begins to respect you.</Body>
      <Divider />
      <SectionTitle>DEATH MILESTONES</SectionTitle>
      {milestones.map((m) => (
        <Card key={m.deaths}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontFamily: 'monospace', fontSize: 14, color: C.blood }}>💀</Text>
              <Text style={{ fontFamily: 'monospace', fontSize: 13, color: C.amber }}>{m.deaths} deaths</Text>
            </View>
            <Badge text={m.type === 'gameplay' ? 'PERK' : 'COSMETIC'} color={m.type === 'gameplay' ? C.victory : C.ethereal} />
          </View>
          <Body>{m.reward}</Body>
        </Card>
      ))}
    </View>
  );
}

function ModifiersSection() {
  const mods = [
    { emoji: '🩸', name: 'Blood Pact', desc: '+25% damage dealt, -30% healing received. Strike hard, heal little.' },
    { emoji: '🌑', name: 'Blind Descent', desc: 'Enemy intents hidden on the first turn of each combat. Trust your instincts.' },
    { emoji: '💀', name: "Death's Echo", desc: '+30% corpse discovery chance. The dead are restless here.' },
    { emoji: '🧊', name: 'Numbing Cold', desc: 'Start with 2 stamina (not 3), but regen +1 extra per turn.' },
    { emoji: '🛡️', name: 'Iron Will', desc: 'Brace negates ALL damage, but costs 1 stamina instead of free.' },
    { emoji: '⚡', name: 'Glass Cannon', desc: 'Start at 60 HP. Deal +50% damage. Kill fast or be killed.' },
  ];

  return (
    <View>
      <Body>Each descent is shaped by a single modifier, rolled at the start. The dungeon never plays the same way twice.</Body>
      <Divider />
      <SectionTitle>RUN MODIFIERS</SectionTitle>
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
      <SectionTitle>STAKE YOUR DESCENT</SectionTitle>
      <Card>
        <Body>Risk SOL for real stakes. Victory returns your stake plus a 50% bonus from the Memorial Pool. Death claims your stake forever.</Body>
      </Card>

      <SectionTitle>STAKE OPTIONS</SectionTitle>
      <Card>
        <Row label="Empty-handed" value="0 SOL" valueColor={C.boneDark} />
        <Row label="0.01 SOL" value="Win: 0.015 SOL" valueColor={C.victory} />
        <Row label="0.05 SOL" value="Win: 0.075 SOL" valueColor={C.victory} />
        <Row label="0.10 SOL" value="Win: 0.150 SOL" valueColor={C.victory} />
        <Row label="0.25 SOL" value="Win: 0.375 SOL" valueColor={C.victory} />
      </Card>

      <Divider />

      <SectionTitle>EMPTY-HANDED</SectionTitle>
      <Card>
        <Body>No wallet required. No risk. Full gameplay, full progression, full milestones. Connect a wallet later to begin staking.</Body>
      </Card>

      <SectionTitle>THE MEMORIAL POOL</SectionTitle>
      <Card>
        <Body>When you die, your stake flows into the Memorial Pool. When another player escapes, the pool pays their victory bonus. The dead fund the living.</Body>
      </Card>

      <SectionTitle>TIPPING THE FALLEN</SectionTitle>
      <Card>
        <Row label="Tip amount" value="0.01 SOL" />
        <Body>When you discover a corpse, you may tip the fallen player directly. The SOL goes to their wallet. Honor the dead.</Body>
      </Card>
    </View>
  );
}

function WisdomSection() {
  const tips = [
    'Read the intent. CHARGING enemies telegraph double damage. Always dodge them.',
    'Manage stamina. Keep 1 pip in reserve for emergency dodges.',
    'Brace is free. When in doubt and low on stamina, brace. 50% reduction beats full damage.',
    'Risk the secondary path in early rooms when HP is high. Finding items early compounds across the run.',
    'Voidblade is a gamble. +50% damage is powerful, but 5 self-damage per turn means you must end fights fast.',
    "Death's Mantle is insurance. Don't swap it for a damage item unless you're confident.",
    'Flee from Tier 3 enemies if HP is low. Living to fight the boss matters more than killing every creature.',
    "Don't flee from STALKING enemies. Their -30% flee penalty makes escape unlikely.",
    'Counter-play matters. Striking an AGGRESSIVE enemy or dodging a CHARGING one gives +50% damage. Learn the matchups.',
    'Every death counts toward milestones. Even a room-1 death moves you forward.',
  ];

  return (
    <View>
      <Body>Knowledge carved by those who came before. Heed it or join them.</Body>
      <Divider />
      <SectionTitle>LESSONS FROM THE DEAD</SectionTitle>
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
        Die forward. Die often. Die well.
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
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
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
          title="◈ THE CODEX"
          right={<AudioToggle inline onSettingsPress={() => setAudioSettingsOpen(true)} />}
        />

        <AudioSettingsModal visible={audioSettingsOpen} onClose={() => setAudioSettingsOpen(false)} />

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
