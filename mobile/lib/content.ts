// Content loader - pulls from pre-generated JSON content

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

export function getDodgeNarration(outcome: 'success' | 'close' | 'fail'): string {
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
}

const BESTIARY: Record<string, CreatureInfo> = {
  // Tier 1 - Common Horrors
  'The Drowned': {
    name: 'The Drowned',
    tier: 1,
    health: { min: 45, max: 65 },
    behaviors: ['AGGRESSIVE', 'ERRATIC', 'DEFENSIVE'],
    description: 'Waterlogged husks animated by the underworld\'s hunger.',
    emoji: '🧟',
  },
  'Pale Crawler': {
    name: 'Pale Crawler',
    tier: 1,
    health: { min: 35, max: 50 },
    behaviors: ['STALKING', 'AGGRESSIVE', 'HUNTING'],
    description: 'Too many limbs. They cling to walls and ceilings.',
    emoji: '🕷️',
  },
  'The Hollow': {
    name: 'The Hollow',
    tier: 1,
    health: { min: 40, max: 55 },
    behaviors: ['STALKING', 'ERRATIC', 'CHARGING'],
    description: 'No face, no features. Just shadow.',
    emoji: '👤',
  },
  'Bloated One': {
    name: 'Bloated One',
    tier: 1,
    health: { min: 55, max: 75 },
    behaviors: ['AGGRESSIVE', 'CHARGING', 'ERRATIC'],
    description: 'Corpses swollen with dark water.',
    emoji: '🫧',
  },
  'Flickering Shade': {
    name: 'Flickering Shade',
    tier: 1,
    health: { min: 30, max: 45 },
    behaviors: ['ERRATIC', 'STALKING', 'RETREATING'],
    description: 'Afterimages of the dead.',
    emoji: '👻',
  },
  'The Hunched': {
    name: 'The Hunched',
    tier: 1,
    health: { min: 50, max: 70 },
    behaviors: ['HUNTING', 'AGGRESSIVE', 'STALKING'],
    description: 'Bent figures that move on all fours.',
    emoji: '🐺',
  },

  // Tier 2 - Uncommon Threats
  'Hollow Clergy': {
    name: 'Hollow Clergy',
    tier: 2,
    health: { min: 70, max: 90 },
    behaviors: ['CHARGING', 'DEFENSIVE', 'AGGRESSIVE'],
    description: 'Priests of a nameless god.',
    emoji: '🧙',
  },
  'The Bound': {
    name: 'The Bound',
    tier: 2,
    health: { min: 80, max: 100 },
    behaviors: ['HUNTING', 'AGGRESSIVE', 'CHARGING'],
    description: 'Souls wrapped in chains of regret.',
    emoji: '⛓️',
  },
  'Forgotten Guardian': {
    name: 'Forgotten Guardian',
    tier: 2,
    health: { min: 90, max: 110 },
    behaviors: ['DEFENSIVE', 'AGGRESSIVE', 'CHARGING'],
    description: 'Stone sentinels animated by old magic.',
    emoji: '🗿',
  },
  'Carrion Knight': {
    name: 'Carrion Knight',
    tier: 2,
    health: { min: 85, max: 105 },
    behaviors: ['AGGRESSIVE', 'DEFENSIVE', 'CHARGING'],
    description: 'Warriors who refused to stop fighting.',
    emoji: '⚔️',
  },

  // Tier 3 - Rare Terrors / Bosses
  'The Unnamed': {
    name: 'The Unnamed',
    tier: 3,
    health: { min: 120, max: 150 },
    behaviors: ['ERRATIC', 'CHARGING', 'STALKING'],
    description: 'You cannot see it clearly. Your mind refuses.',
    emoji: '❓',
  },
  'The Keeper': {
    name: 'The Keeper',
    tier: 3,
    health: { min: 180, max: 220 },
    behaviors: ['CHARGING', 'AGGRESSIVE', 'DEFENSIVE', 'CHARGING'],
    description: 'Guardian of the exit. None have passed.',
    emoji: '👁️',
  },
};

// Get creature info by name
export function getCreatureInfo(name: string): CreatureInfo | null {
  return BESTIARY[name] || null;
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

// Get creature's preferred intent types
export function getCreatureIntent(name: string): { type: IntentType; description: string } {
  const info = BESTIARY[name];
  if (!info) return getEnemyIntent();
  const preferredType = pick(info.behaviors);
  return getEnemyIntent(preferredType);
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
    }
  }
  return effects;
}

// Generate a combat room with a specific creature assigned
function getCombatRoomWithCreature(roomNumber: number, template?: string): RoomVariation & { enemy: string; enemyEmoji: string } {
  const baseContent = getCombatRoom(template);
  const creature = getCreatureForRoom(roomNumber);
  return {
    ...baseContent,
    enemy: creature.name,
    enemyEmoji: creature.emoji,
  };
}

// Generate randomized dungeon (12 rooms with boss at the end)
export function generateRandomDungeon(): DungeonRoom[] {
  const exploreTemplates = ['descent', 'corridor', 'flooded', 'chamber', 'shrine', 'crossroads'];
  const combatTemplates = ['ambush', 'confrontation', 'territorial', 'pursuit', 'guardian'];
  const corpseTemplates = ['fresh', 'old', 'heroic', 'disturbing', 'peaceful'];
  const cacheTemplates = ['alcove', 'survivor_stash', 'spring', 'offering_site'];
  const exitTemplates = ['threshold', 'earned', 'release', 'changed'];
  
  return [
    // Depth 1: Upper Crypt (Rooms 1-4)
    { type: 'explore', template: pick(exploreTemplates), content: getExploreRoom() },
    { type: 'combat', template: pick(combatTemplates), content: getCombatRoomWithCreature(2) },
    { type: 'corpse', template: pick(corpseTemplates), content: getCorpseRoom() },
    { type: 'combat', template: pick(combatTemplates), content: getCombatRoomWithCreature(4) },
    
    // Depth 2: Flooded Halls (Rooms 5-8)
    { type: 'explore', template: 'flooded', content: getExploreRoom('flooded') },
    { type: 'combat', template: pick(combatTemplates), content: getCombatRoomWithCreature(6) },
    { type: 'cache', template: pick(cacheTemplates), content: getCacheRoom() },
    { type: 'combat', template: pick(combatTemplates), content: getCombatRoomWithCreature(8) },
    
    // Depth 3: The Abyss (Rooms 9-12)
    { type: 'explore', template: pick(exploreTemplates), content: getExploreRoom() },
    { type: 'corpse', template: pick(corpseTemplates), content: getCorpseRoom() },
    { type: 'combat', template: pick(combatTemplates), content: getCombatRoomWithCreature(11) },
    { type: 'combat', template: 'arena', content: { ...getCombatRoom('arena'), enemy: 'The Keeper', enemyEmoji: '👁️' }, boss: true },
    { type: 'exit', template: pick(exitTemplates), content: getExitRoom() },
  ];
}

export function getBossCreature(): CreatureInfo {
  return BESTIARY['The Keeper'];
}
