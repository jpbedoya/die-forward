// Content loader - pulls from pre-generated JSON content

import { loadZone, getZoneRoom, getZoneCreatureSeeded, getZoneBoss, getZoneDepth } from './zone-loader';
import { createRunRng, generateRandomSeed, type SeededRng } from './seeded-random';

import exploreRooms from '../content/explore-rooms.json';
import combatRooms from '../content/combat-rooms.json';
import corpseRooms from '../content/corpse-rooms.json';
import cacheRooms from '../content/cache-rooms.json';
import exitRooms from '../content/exit-rooms.json';
import combatActions from '../content/combat-actions.json';
import deathEpitaphs from '../content/death-epitaphs.json';

// Types
export interface RoomVariation {
  id: string;
  narrative: string;
  options?: string[];
  enemy?: string;
  enemyEmoji?: string;
  player_name?: string;
  final_message?: string;
}

export interface RoomTemplate {
  template: string;
  variations: RoomVariation[];
}

// Helper to pick random item from array
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Seeded variant of pick — uses provided RNG for deterministic results
export function pickSeeded<T>(arr: T[], rng: SeededRng): T {
  return arr[Math.floor(rng.random() * arr.length)];
}

// Get random explore room by template type
export function getExploreRoom(template?: string): RoomVariation {
  const rooms = exploreRooms.rooms as RoomTemplate[];
  if (template) {
    const found = rooms.find(r => r.template === template);
    if (found) return pick(found.variations);
  }
  const randomTemplate = pick(rooms);
  return pick(randomTemplate.variations);
}

// Get random combat room by template type
export function getCombatRoom(template?: string): RoomVariation {
  const rooms = combatRooms.rooms as RoomTemplate[];
  if (template) {
    const found = rooms.find(r => r.template === template);
    if (found) return pick(found.variations);
  }
  const randomTemplate = pick(rooms);
  return pick(randomTemplate.variations);
}

// Get random corpse discovery by template type
export function getCorpseRoom(template?: string): RoomVariation {
  const rooms = corpseRooms.rooms as RoomTemplate[];
  if (template) {
    const found = rooms.find(r => r.template === template);
    if (found) return pick(found.variations);
  }
  const randomTemplate = pick(rooms);
  return pick(randomTemplate.variations);
}

// Get random cache room by template type
export function getCacheRoom(template?: string): RoomVariation {
  const rooms = cacheRooms.rooms as RoomTemplate[];
  if (template) {
    const found = rooms.find(r => r.template === template);
    if (found) return pick(found.variations);
  }
  const randomTemplate = pick(rooms);
  return pick(randomTemplate.variations);
}

// Get random exit room by template type
export function getExitRoom(template?: string): RoomVariation {
  const rooms = exitRooms.rooms as RoomTemplate[];
  if (template) {
    const found = rooms.find(r => r.template === template);
    if (found) return pick(found.variations);
  }
  const randomTemplate = pick(rooms);
  return pick(randomTemplate.variations);
}

// Combat actions
export function getStrikeNarration(outcome: 'success' | 'mutual' | 'weak'): string {
  const actions = combatActions.actions.strike as Record<string, string[]>;
  return pick(actions[outcome]);
}

export function getDodgeNarration(outcome: 'success' | 'close' | 'fail' | 'counter'): string {
  const actions = combatActions.actions.dodge as Record<string, string[]>;
  return pick(actions[outcome]);
}

export function getBraceNarration(outcome: 'success' | 'broken' | 'fail'): string {
  const actions = combatActions.actions.brace as Record<string, string[]>;
  return pick(actions[outcome]);
}

export function getHerbsNarration(outcome: 'heal' | 'interrupted'): string {
  const actions = combatActions.actions.herbs as Record<string, string[]>;
  return pick(actions[outcome]);
}

export function getFleeNarration(outcome: 'success' | 'hurt' | 'fail'): string {
  const actions = combatActions.actions.flee as Record<string, string[]>;
  return pick(actions[outcome]);
}

// Enemy intents
export type IntentType = 'AGGRESSIVE' | 'DEFENSIVE' | 'CHARGING' | 'ERRATIC' | 'HUNTING' | 'STALKING' | 'RETREATING';

export function getEnemyIntent(type?: IntentType): { type: IntentType; description: string } {
  const intents = combatActions.enemy_intents as Record<IntentType, string[]>;
  const intentType = type || pick(Object.keys(intents) as IntentType[]);
  return {
    type: intentType,
    description: pick(intents[intentType])
  };
}

// Death content
export function getDeathMoment(): string {
  return pick(deathEpitaphs.death_moments);
}

export function getFinalWordsIntro(): string {
  return pick(deathEpitaphs.final_words_intros);
}

export function getCorpseOutro(): string {
  return pick(deathEpitaphs.corpse_discovery_outros);
}

// Format corpse text with player data
export function formatCorpseText(
  narrative: string, 
  playerName: string, 
  finalMessage: string
): string {
  return narrative
    .replace('{PLAYER}', `@${playerName}`)
    .replace('{MESSAGE}', `"${finalMessage}"`);
}

// Generate a full dungeon layout
export interface DungeonRoom {
  type: 'explore' | 'combat' | 'corpse' | 'cache' | 'exit';
  template: string;
  content: RoomVariation;
  boss?: boolean;
}

// Creature bestiary with stats and info
export interface CreatureInfo {
  name: string;
  tier: 1 | 2 | 3;
  health: { min: number; max: number };
  behaviors: IntentType[];
  description: string;
  emoji: string;
  artUrl?: string;
}

export const BESTIARY: Record<string, CreatureInfo> = {
  // Tier 1 - Common Horrors
  'The Drowned': {
    name: 'The Drowned',
    tier: 1,
    health: { min: 45, max: 65 },
    behaviors: ['AGGRESSIVE', 'ERRATIC', 'DEFENSIVE'],
    description: 'Waterlogged husks animated by the underworld\'s hunger.',
    emoji: '🧟',
    artUrl: '/creatures/the-drowned.webp',
  },
  'Pale Crawler': {
    name: 'Pale Crawler',
    tier: 1,
    health: { min: 35, max: 50 },
    behaviors: ['STALKING', 'AGGRESSIVE', 'HUNTING'],
    description: 'Too many limbs. They cling to walls and ceilings.',
    emoji: '🕷️',
    artUrl: '/creatures/pale-crawler.webp',
  },
  'The Hollow': {
    name: 'The Hollow',
    tier: 1,
    health: { min: 40, max: 55 },
    behaviors: ['STALKING', 'ERRATIC', 'CHARGING'],
    description: 'No face, no features. Just shadow.',
    emoji: '👤',
    artUrl: '/creatures/the-hollow.webp',
  },
  'Bloated One': {
    name: 'Bloated One',
    tier: 1,
    health: { min: 55, max: 75 },
    behaviors: ['AGGRESSIVE', 'CHARGING', 'ERRATIC'],
    description: 'Corpses swollen with dark water.',
    emoji: '🫧',
    artUrl: '/creatures/the-bloated.webp',
  },
  'Flickering Shade': {
    name: 'Flickering Shade',
    tier: 1,
    health: { min: 30, max: 45 },
    behaviors: ['ERRATIC', 'STALKING', 'RETREATING'],
    description: 'Afterimages of the dead.',
    emoji: '👻',
    artUrl: '/creatures/flickering-shade.webp',
  },
  'The Hunched': {
    name: 'The Hunched',
    tier: 1,
    health: { min: 50, max: 70 },
    behaviors: ['HUNTING', 'AGGRESSIVE', 'STALKING'],
    description: 'Bent figures that move on all fours.',
    emoji: '🐺',
    artUrl: '/creatures/the-hunched.webp',
  },
  'Tideborn': {
    name: 'Tideborn',
    tier: 1,
    health: { min: 60, max: 80 },
    behaviors: ['CHARGING', 'AGGRESSIVE', 'DEFENSIVE'],
    description: 'Creatures of living water. They rise from puddles, take form, then collapse.',
    emoji: '🌊',
    artUrl: '/creatures/tideborn.webp',
  },
  'Bone Weavers': {
    name: 'Bone Weavers',
    tier: 1,
    health: { min: 40, max: 55 },
    behaviors: ['AGGRESSIVE', 'CHARGING', 'STALKING'],
    description: 'Skeletal hands that emerge from walls and floors. Just hands.',
    emoji: '🦴',
    artUrl: '/creatures/bone-weavers.webp',
  },
  'Ash Children': {
    name: 'Ash Children',
    tier: 1,
    health: { min: 25, max: 40 },
    behaviors: ['STALKING', 'DEFENSIVE', 'CHARGING'],
    description: 'Small. Gray. They don\'t attack — they suffocate.',
    emoji: '👶',
    artUrl: '/creatures/ash-children.webp',
  },
  'Echo Husks': {
    name: 'Echo Husks',
    tier: 1,
    health: { min: 35, max: 50 },
    behaviors: ['STALKING', 'ERRATIC', 'AGGRESSIVE'],
    description: 'They repeat the last words of the dead. Over and over.',
    emoji: '🗣️',
    artUrl: '/creatures/echo-husks.webp',
  },

  // Tier 2 - Uncommon Threats
  'Hollow Clergy': {
    name: 'Hollow Clergy',
    tier: 2,
    health: { min: 70, max: 90 },
    behaviors: ['CHARGING', 'DEFENSIVE', 'AGGRESSIVE'],
    description: 'Priests of a nameless god.',
    emoji: '🧙',
    artUrl: '/creatures/hollow-clergy.webp',
  },
  'The Bound': {
    name: 'The Bound',
    tier: 2,
    health: { min: 80, max: 100 },
    behaviors: ['HUNTING', 'AGGRESSIVE', 'CHARGING'],
    description: 'Souls wrapped in chains of regret.',
    emoji: '⛓️',
    artUrl: '/creatures/the-bound.webp',
  },
  'Forgotten Guardian': {
    name: 'Forgotten Guardian',
    tier: 2,
    health: { min: 90, max: 110 },
    behaviors: ['DEFENSIVE', 'AGGRESSIVE', 'CHARGING'],
    description: 'Stone sentinels animated by old magic.',
    emoji: '🗿',
    artUrl: '/creatures/forgotten-guardian.webp',
  },
  'The Weeping': {
    name: 'The Weeping',
    tier: 2,
    health: { min: 60, max: 80 },
    behaviors: ['STALKING', 'ERRATIC', 'CHARGING'],
    description: 'Spirits of grief. Their touch brings sorrow so deep it wounds.',
    emoji: '😢',
    artUrl: '/creatures/the-weeping.webp',
  },
  'Carrion Knight': {
    name: 'Carrion Knight',
    tier: 2,
    health: { min: 85, max: 105 },
    behaviors: ['AGGRESSIVE', 'DEFENSIVE', 'CHARGING'],
    description: 'Warriors who refused to stop fighting.',
    emoji: '⚔️',
    artUrl: '/creatures/carrion-knight.webp',
  },
  'Pale Oracle': {
    name: 'Pale Oracle',
    tier: 2,
    health: { min: 55, max: 70 },
    behaviors: ['CHARGING', 'RETREATING', 'STALKING'],
    description: 'Eyeless seers who speak truths you don\'t want to hear.',
    emoji: '🔮',
    artUrl: '/creatures/pale-oracle.webp',
  },
  'The Congregation': {
    name: 'The Congregation',
    tier: 2,
    health: { min: 100, max: 130 },
    behaviors: ['AGGRESSIVE', 'CHARGING', 'STALKING'],
    description: 'Pilgrims fused at the edges, moving as one.',
    emoji: '👥',
    artUrl: '/creatures/the-congregation.webp',
  },
  'Pale Crawler Swarm': {
    name: 'Pale Crawler Swarm',
    tier: 2,
    health: { min: 75, max: 95 },
    behaviors: ['AGGRESSIVE', 'HUNTING', 'CHARGING'],
    description: 'One wouldn\'t be a threat. But there isn\'t one.',
    emoji: '🕷️',
    artUrl: '/creatures/pale-crawler-swarm.webp',
  },

  // Tier 3 - Rare Terrors / Bosses
  'The Unnamed': {
    name: 'The Unnamed',
    tier: 3,
    health: { min: 120, max: 150 },
    behaviors: ['ERRATIC', 'CHARGING', 'STALKING'],
    description: 'You cannot see it clearly. Your mind refuses.',
    emoji: '❓',
    artUrl: '/creatures/the-unnamed.webp',
  },
  'Mother of Tides': {
    name: 'Mother of Tides',
    tier: 3,
    health: { min: 130, max: 160 },
    behaviors: ['CHARGING', 'AGGRESSIVE', 'DEFENSIVE'],
    description: 'The water itself, given will. Everything that drowns belongs to her.',
    emoji: '🌊',
    artUrl: '/creatures/mother-of-tides.webp',
  },
  'The Keeper': {
    name: 'The Keeper',
    tier: 3,
    health: { min: 180, max: 220 },
    behaviors: ['CHARGING', 'AGGRESSIVE', 'DEFENSIVE', 'CHARGING'],
    description: 'Guardian of the exit. None have passed.',
    emoji: '👁️',
    artUrl: '/creatures/the-keeper.webp',
  },
};

// Get creature info by name
export function getCreatureInfo(name: string): CreatureInfo | null {
  return BESTIARY[name] || null;
}

// Get all creatures sorted by tier then name
export function getAllCreatures(): CreatureInfo[] {
  return Object.values(BESTIARY).sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
}

// Get creature tier (1, 2, or 3)
export function getCreatureTier(name: string): number {
  const info = BESTIARY[name];
  return info?.tier || 1;
}

// Get damage multiplier based on tier
export function getTierDamageMultiplier(name: string): number {
  const tier = getCreatureTier(name);
  switch (tier) {
    case 1: return 1.0;
    case 2: return 1.5;
    case 3: return 2.0;
    default: return 1.0;
  }
}

// ====== DEPTHS SYSTEM ======
export interface DepthInfo {
  name: string;
  tier: 1 | 2 | 3;
  roomRange: [number, number];
  description: string;
}

export const DEPTHS: DepthInfo[] = [
  { name: 'THE UPPER CRYPT', tier: 1, roomRange: [1, 4], description: 'The entrance. Cold stone and shallow water.' },
  { name: 'THE FLOODED HALLS', tier: 2, roomRange: [5, 8], description: 'Deeper now. The water rises.' },
  { name: 'THE ABYSS', tier: 3, roomRange: [9, 12], description: 'The true depths. Few return.' },
];

export function getDepthForRoom(roomNumber: number): DepthInfo {
  for (const depth of DEPTHS) {
    if (roomNumber >= depth.roomRange[0] && roomNumber <= depth.roomRange[1]) {
      return depth;
    }
  }
  return DEPTHS[DEPTHS.length - 1];
}

export function getTierForRoom(roomNumber: number): 1 | 2 | 3 {
  return getDepthForRoom(roomNumber).tier;
}

// Get random creature appropriate for a depth/tier
export function getCreatureForRoom(roomNumber: number): CreatureInfo {
  const tier = getTierForRoom(roomNumber);
  const creaturesOfTier = Object.values(BESTIARY).filter(c => c.tier === tier);
  return pick(creaturesOfTier);
}

// Get creature health
export function getCreatureHealth(name: string): number {
  const info = BESTIARY[name];
  if (!info) return 65;
  return info.health.min + Math.floor(Math.random() * (info.health.max - info.health.min));
}

// Seeded variant — uses provided RNG so HP is reproducible from the same seed
export function getCreatureHealthSeeded(name: string, rng: SeededRng): number {
  const info = BESTIARY[name];
  if (!info) return 65;
  return info.health.min + Math.floor(rng.random() * (info.health.max - info.health.min));
}

// Get creature's preferred intent types
export function getCreatureIntent(name: string): { type: IntentType; description: string } {
  const info = BESTIARY[name];
  if (!info) return getEnemyIntent();
  const preferredType = pick(info.behaviors);
  return getEnemyIntent(preferredType);
}

// Seeded variant — uses provided RNG so intent sequence is reproducible from the same seed
export function getCreatureIntentSeeded(name: string, rng: SeededRng): { type: IntentType; description: string } {
  const intents = combatActions.enemy_intents as Record<IntentType, string[]>;
  const info = BESTIARY[name];
  const preferredType = info ? pickSeeded(info.behaviors, rng) : pickSeeded(Object.keys(intents) as IntentType[], rng);
  return {
    type: preferredType,
    description: pickSeeded(intents[preferredType], rng),
  };
}

// Intent combat effects
export interface IntentEffects {
  damageDealtMod: number;
  damageTakenMod: number;
  fleeMod: number;
  isCharging: boolean;
  description: string;
}

export function getIntentEffects(intentType: IntentType): IntentEffects {
  switch (intentType) {
    case 'AGGRESSIVE':
      return { damageDealtMod: 1.0, damageTakenMod: 1.0, fleeMod: 0, isCharging: false, description: 'Attacking normally' };
    case 'CHARGING':
      return { damageDealtMod: 0.5, damageTakenMod: 1.0, fleeMod: 0, isCharging: true, description: '⚠️ CHARGING — DOUBLE damage next turn!' };
    case 'DEFENSIVE':
      return { damageDealtMod: 0.5, damageTakenMod: 0.5, fleeMod: 0.2, isCharging: false, description: 'Guarding — takes less damage' };
    case 'STALKING':
      return { damageDealtMod: 1.0, damageTakenMod: 1.0, fleeMod: -0.3, isCharging: false, description: 'Watching you — harder to escape' };
    case 'HUNTING':
      return { damageDealtMod: 1.3, damageTakenMod: 1.0, fleeMod: -0.2, isCharging: false, description: 'Hunting — deals bonus damage' };
    case 'ERRATIC':
      const erraticMod = 0.5 + Math.random() * 1.5;
      return { damageDealtMod: erraticMod, damageTakenMod: 1.0, fleeMod: 0.1, isCharging: false, description: 'Unpredictable — damage varies' };
    case 'RETREATING':
      return { damageDealtMod: 0.5, damageTakenMod: 1.2, fleeMod: 0.3, isCharging: false, description: 'Retreating — easier to escape' };
    default:
      return { damageDealtMod: 1.0, damageTakenMod: 1.0, fleeMod: 0, isCharging: false, description: 'Unknown intent' };
  }
}

// Item combat effects
export interface ItemEffects {
  damageBonus: number;
  defenseBonus: number;
  fleeBonus: number;
  corpseBonus?: number;   // Extra chance to find loot in corpse/cache rooms
  voidSaltBonus?: boolean; // +40% damage vs aquatic enemies when true
}

export function getItemEffects(inventory: {name: string}[]): ItemEffects {
  let effects: ItemEffects = { damageBonus: 0, defenseBonus: 0, fleeBonus: 0 };
  
  for (const item of inventory) {
    switch (item.name) {
      case 'Torch': effects.damageBonus += 0.25; break;
      case 'Dagger': effects.damageBonus += 0.35; break;
      case 'Rusty Blade': effects.damageBonus += 0.20; break;
      case 'Shield':
      case 'Tattered Shield': effects.defenseBonus += 0.25; break;
      case 'Cloak': effects.fleeBonus += 0.15; effects.defenseBonus += 0.10; break;
      case 'Poison Vial': effects.damageBonus += 0.40; break;
      case 'Ancient Scroll': effects.defenseBonus += 0.20; effects.fleeBonus += 0.10; break;
      case 'Bone Charm': effects.defenseBonus += 0.15; break;
      case 'Voidblade': effects.damageBonus += 0.50; break;
      case 'Soulstone':
        effects.damageBonus += 0.10;
        effects.defenseBonus += 0.10;
        effects.fleeBonus += 0.10;
        break;
      case 'Eye of the Hollow':
        effects.corpseBonus = (effects.corpseBonus ?? 0) + 0.20;
        break;
      case 'Bone Hook':
        effects.fleeBonus += 0.20;
        break;
      case 'Void Salt':
        effects.voidSaltBonus = true;
        break;
      case 'Pale Coin':
        effects.fleeBonus += 0.10;
        break;
    }
  }
  return effects;
}

// Item descriptions from the Content Bible
export interface ItemDetails {
  name: string;
  emoji: string;
  description: string;
  effect: string;
  type: 'consumable' | 'weapon' | 'artifact';
  artUrl?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export const ITEM_DETAILS: Record<string, ItemDetails> = {
  // Consumables
  'Herbs': {
    name: 'Herbs',
    emoji: '🌿',
    description: 'Bitter leaves that numb pain and slow bleeding. They taste like regret.',
    effect: 'Restores health when used',
    type: 'consumable',
    rarity: 'common',
    artUrl: '/items/herbs.webp',
  },
  'Pale Rations': {
    name: 'Pale Rations',
    emoji: '🍖',
    description: 'Food from below. It sustains, but you try not to think about what it was.',
    effect: 'Restores stamina',
    type: 'consumable',
    rarity: 'common',
    artUrl: '/items/pale-rations.webp',
  },
  'Bone Dust': {
    name: 'Bone Dust',
    emoji: '💨',
    description: 'Ground remains of something old. Inhale it to see what it saw.',
    effect: 'Reveals hidden paths',
    type: 'consumable',
    rarity: 'common',
    artUrl: '/items/bone-dust.webp',
  },
  'Void Salt': {
    name: 'Void Salt',
    emoji: '🧂',
    description: 'Black crystals that burn on contact. Creatures of water fear it.',
    effect: '+40% damage vs aquatic enemies',
    type: 'consumable',
    rarity: 'uncommon',
    artUrl: '/items/void-salt.webp',
  },
  'Poison Vial': {
    name: 'Poison Vial',
    emoji: '🧪',
    description: 'Something extracted from something else. The smell alone is a weapon.',
    effect: '+40% damage bonus',
    type: 'consumable',
    rarity: 'rare',
    artUrl: '/items/poison-vial.webp',
  },
  
  // Weapons
  'Rusty Blade': {
    name: 'Rusty Blade',
    emoji: '⚔️',
    description: 'Pitted with age and old blood. Still sharp enough.',
    effect: '+20% damage bonus',
    type: 'weapon',
    rarity: 'common',
    artUrl: '/items/rusty-blade.webp',
  },
  'Dagger': {
    name: 'Dagger',
    emoji: '🗡️',
    description: 'Small, ceremonial. It was meant for offerings, not combat. It works anyway.',
    effect: '+35% damage bonus',
    type: 'weapon',
    rarity: 'uncommon',
    artUrl: '/items/dagger.webp',
  },
  'Bone Hook': {
    name: 'Bone Hook',
    emoji: '🪝',
    description: 'Carved from a rib. Meant for pulling things closer. Or keeping them away.',
    effect: 'Creates distance in combat',
    type: 'weapon',
    rarity: 'uncommon',
    artUrl: '/items/bone-hook.webp',
  },
  'Shield': {
    name: 'Shield',
    emoji: '🛡️',
    description: 'Dented, scarred, still standing. Like whoever carried it.',
    effect: '+25% defense bonus',
    type: 'weapon',
    rarity: 'uncommon',
    artUrl: '/items/shield.webp',
  },
  'Tattered Shield': {
    name: 'Tattered Shield',
    emoji: '🛡️',
    description: 'More holes than metal. But it still catches blows that would kill you.',
    effect: '+25% defense bonus',
    type: 'weapon',
    rarity: 'common',
    artUrl: '/items/tattered-shield.webp',
  },
  'Cloak': {
    name: 'Cloak',
    emoji: '🧥',
    description: 'Wrapped around your shoulders, things have trouble finding you.',
    effect: '+15% flee, +10% defense',
    type: 'weapon',
    rarity: 'uncommon',
    artUrl: '/items/cloak.webp',
  },
  
  // Artifacts
  'Torch': {
    name: 'Torch',
    emoji: '🔥',
    description: 'A flickering flame. It pushes back the dark, but the dark pushes back.',
    effect: '+25% damage, light source',
    type: 'artifact',
    rarity: 'uncommon',
    artUrl: '/items/torch.webp',
  },
  'Bone Charm': {
    name: 'Bone Charm',
    emoji: '💀',
    description: 'Carved from something\'s finger. It hums when danger is near. It never stops humming.',
    effect: '+15% defense bonus',
    type: 'artifact',
    rarity: 'uncommon',
    artUrl: '/items/bone-charm.webp',
  },
  'Ancient Scroll': {
    name: 'Ancient Scroll',
    emoji: '📜',
    description: 'Waterlogged pages in a language you almost understand. Reading it feels like remembering something you never knew.',
    effect: '+20% defense, +10% flee',
    type: 'artifact',
    rarity: 'rare',
    artUrl: '/items/ancient-scroll.webp',
  },
  'Eye of the Hollow': {
    name: 'Eye of the Hollow',
    emoji: '👁️',
    description: 'It blinks when you\'re not looking. But it shows you things you\'d otherwise miss.',
    effect: 'Reveals hidden corpses and caches',
    type: 'artifact',
    rarity: 'rare',
    artUrl: '/items/eye-of-the-hollow.webp',
  },
  'Heartstone': {
    name: 'Heartstone',
    emoji: '💎',
    description: 'Cold to the touch. Warm when death is near. Yours or someone else\'s.',
    effect: 'Shows when you\'re near death',
    type: 'artifact',
    rarity: 'legendary',
    artUrl: '/items/heartstone.webp',
  },
  'Pale Coin': {
    name: 'Pale Coin',
    emoji: '🪙',
    description: 'Currency of the dead. Worth nothing above. Worth everything below.',
    effect: 'Can be offered for passage',
    type: 'artifact',
    rarity: 'common',
    artUrl: '/items/pale-coin.webp',
  },
  'Soulstone': {
    name: 'Soulstone',
    emoji: '💎',
    description: 'Crystallized from the residue of a hundred deaths. It pulses faintly — something is still inside.',
    effect: '+10% to all stats',
    rarity: 'rare',
    type: 'artifact',
  },
  "Death's Mantle": {
    name: "Death's Mantle",
    emoji: '🌑',
    description: 'Woven from shadow and last breaths. It remembers what it means to die.',
    effect: 'Survive one lethal hit with 1 HP (consumed)',
    rarity: 'legendary',
    type: 'artifact',
  },
  'Voidblade': {
    name: 'Voidblade',
    emoji: '⚔️',
    description: 'A blade that hungers. It cuts through anything — including you.',
    effect: '+50% damage, take 5 damage per turn',
    rarity: 'legendary',
    type: 'weapon',
  },
};

// Get item details by name
export function getItemDetails(name: string): ItemDetails | undefined {
  return ITEM_DETAILS[name];
}

// Rarity tier order for comparison
const RARITY_ORDER: Record<string, number> = { common: 0, uncommon: 1, rare: 2, legendary: 3 };

/**
 * Pick a random item name using weighted rarity distribution.
 * Weights: common 55%, uncommon 30%, rare 12%, legendary 3%
 * minRarity optionally filters out lower rarities (e.g. for special loot).
 * excludeItems optionally filters specific items (e.g. Soulstone before 50-death milestone).
 */
export function rollRandomItem(
  rng: () => number,
  minRarity?: 'common' | 'uncommon' | 'rare' | 'legendary',
  excludeItems?: string[],
): string {
  const minTier = minRarity ? (RARITY_ORDER[minRarity] ?? 0) : 0;
  const weights: Record<string, number> = { common: 55, uncommon: 30, rare: 12, legendary: 3 };

  // Group eligible items by rarity, excluding specified items
  const byRarity: Record<string, string[]> = { common: [], uncommon: [], rare: [], legendary: [] };
  for (const item of Object.values(ITEM_DETAILS)) {
    const tier = RARITY_ORDER[item.rarity ?? 'common'] ?? 0;
    if (tier >= minTier && !excludeItems?.includes(item.name)) {
      const bucket = item.rarity ?? 'common';
      byRarity[bucket].push(item.name);
    }
  }

  // Build weighted rarity pool (only rarities that have items)
  const pool: Array<{ rarity: string; weight: number; items: string[] }> = [];
  let totalWeight = 0;
  for (const [rarity, items] of Object.entries(byRarity)) {
    if (items.length > 0) {
      const w = weights[rarity] ?? 0;
      pool.push({ rarity, weight: w, items });
      totalWeight += w;
    }
  }

  if (pool.length === 0 || totalWeight === 0) {
    // Fallback: just pick any eligible item uniformly
    const all = Object.values(ITEM_DETAILS)
      .filter(i => (RARITY_ORDER[i.rarity ?? 'common'] ?? 0) >= minTier && !excludeItems?.includes(i.name))
      .map(i => i.name);
    return all.length > 0 ? all[Math.floor(rng() * all.length)] : 'Herbs';
  }

  // Roll rarity bucket, then pick item within it
  const roll = rng() * totalWeight;
  let cumulative = 0;
  for (const { weight, items } of pool) {
    cumulative += weight;
    if (roll < cumulative) {
      return items[Math.floor(rng() * items.length)];
    }
  }

  // Fallback
  return pool[pool.length - 1].items[0];
}

// Generate a combat room with a specific creature assigned (legacy, non-seeded)
function getCombatRoomWithCreature(roomNumber: number, template?: string): RoomVariation & { enemy: string; enemyEmoji: string } {
  const baseContent = getCombatRoom(template);
  const creature = getCreatureForRoom(roomNumber);
  return {
    ...baseContent,
    enemy: creature.name,
    enemyEmoji: creature.emoji,
  };
}

/**
 * Zone-aware dungeon generator. Reads zone's dungeonLayout.structure to build
 * rooms, assigns creatures from zone bestiary (80% local / 20% shared), and
 * uses zone's boss for the final encounter.
 *
 * All random choices go through the seeded RNG for full reproducibility.
 */
export function generateDungeon(zoneId: string, rng: SeededRng): DungeonRoom[] {
  const zone = loadZone(zoneId);
  const structure = zone.dungeonLayout.structure;

  const rooms: DungeonRoom[] = structure.map((slot, index) => {
    const roomNumber = index + 1;
    const depth = getZoneDepth(zone, roomNumber);

    if (slot.boss) {
      // Boss room — creature comes from zone's boss definition
      const boss = getZoneBoss(zone, BESTIARY);
      const content = getZoneRoom(zone, slot.type, rng, slot.template, index);
      return {
        type: slot.type,
        template: slot.template,
        content: {
          ...content,
          enemy: boss.name,
          enemyEmoji: boss.emoji,
        } as RoomVariation,
        boss: true,
      };
    }

    const content = getZoneRoom(zone, slot.type, rng, slot.template, index);

    if (slot.type === 'combat') {
      // Combat rooms get a zone-appropriate creature at the right tier
      const creature = getZoneCreatureSeeded(zone, depth.tier, rng, BESTIARY);
      return {
        type: slot.type,
        template: slot.template,
        content: {
          ...content,
          enemy: creature.name,
          enemyEmoji: creature.emoji,
        } as RoomVariation,
      };
    }

    return {
      type: slot.type,
      template: slot.template,
      content: content as RoomVariation,
    };
  });

  // Append exit room (always appended after the boss; zone structure ends at boss)
  const exitContent = getZoneRoom(zone, 'exit', rng, undefined, structure.length);
  rooms.push({
    type: 'exit',
    template: 'zone-exit',
    content: exitContent as RoomVariation,
  });

  return rooms;
}

/**
 * Generate a randomized dungeon using the Sunken Crypt zone.
 * Backward-compatible wrapper around generateDungeon — uses a fresh random
 * seed each call so behavior is indistinguishable from the old implementation.
 */
export function generateRandomDungeon(): DungeonRoom[] {
  const seed = generateRandomSeed();
  const rng = createRunRng(seed);
  return generateDungeon('sunken-crypt', rng);
}

/**
 * Get the boss creature for a zone (defaults to sunken-crypt / The Keeper).
 */
export function getBossCreature(zoneId = 'sunken-crypt'): CreatureInfo {
  try {
    const zone = loadZone(zoneId);
    return getZoneBoss(zone, BESTIARY);
  } catch {
    return BESTIARY['The Keeper'];
  }
}
