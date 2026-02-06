// Content loader - pulls from pre-generated JSON content

import exploreRooms from '../../content/explore-rooms.json';
import combatRooms from '../../content/combat-rooms.json';
import corpseRooms from '../../content/corpse-rooms.json';
import cacheRooms from '../../content/cache-rooms.json';
import exitRooms from '../../content/exit-rooms.json';
import combatActions from '../../content/combat-actions.json';
import deathEpitaphs from '../../content/death-epitaphs.json';

// Types
export interface RoomVariation {
  id: string;
  narrative: string;
  options?: string[];
  enemy?: string;
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
  // Random template if not specified
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
}

export function generateDungeon(): DungeonRoom[] {
  // 9-room structure for "Threshold of the Unnamed"
  return [
    { type: 'explore', template: 'descent', content: getExploreRoom('descent') },
    { type: 'explore', template: 'flooded', content: getExploreRoom('flooded') },
    { type: 'combat', template: 'ambush', content: getCombatRoom('ambush') },
    { type: 'corpse', template: 'fresh', content: getCorpseRoom('fresh') },
    { type: 'cache', template: 'alcove', content: getCacheRoom('alcove') },
    { type: 'combat', template: 'guardian', content: getCombatRoom('guardian') },
    { type: 'explore', template: 'threshold', content: getExploreRoom('threshold') },
    { type: 'combat', template: 'arena', content: getCombatRoom('arena') },
    { type: 'exit', template: 'earned', content: getExitRoom('earned') },
  ];
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
    description: 'Waterlogged husks animated by the underworld\'s hunger. They move wrong.',
    emoji: '🧟',
  },
  'Pale Crawler': {
    name: 'Pale Crawler',
    tier: 1,
    health: { min: 35, max: 50 },
    behaviors: ['STALKING', 'AGGRESSIVE', 'HUNTING'],
    description: 'Too many limbs. They cling to walls and ceilings, dropping when you pass.',
    emoji: '🕷️',
  },
  'The Hollow': {
    name: 'The Hollow',
    tier: 1,
    health: { min: 40, max: 55 },
    behaviors: ['STALKING', 'ERRATIC', 'CHARGING'],
    description: 'No face, no features. Just the outline of a person carved from shadow.',
    emoji: '👤',
  },
  'Bloated One': {
    name: 'Bloated One',
    tier: 1,
    health: { min: 55, max: 75 },
    behaviors: ['AGGRESSIVE', 'CHARGING', 'ERRATIC'],
    description: 'Corpses swollen with dark water. They burst when struck.',
    emoji: '🫧',
  },
  'Flickering Shade': {
    name: 'Flickering Shade',
    tier: 1,
    health: { min: 30, max: 45 },
    behaviors: ['ERRATIC', 'STALKING', 'RETREATING'],
    description: 'Afterimages of the dead. Here, then there, then gone.',
    emoji: '👻',
  },
  'The Hunched': {
    name: 'The Hunched',
    tier: 1,
    health: { min: 50, max: 70 },
    behaviors: ['HUNTING', 'AGGRESSIVE', 'STALKING'],
    description: 'Bent figures that move on all fours, sniffing the air. They seek warmth.',
    emoji: '🐺',
  },
  'Tideborn': {
    name: 'Tideborn',
    tier: 1,
    health: { min: 60, max: 80 },
    behaviors: ['CHARGING', 'AGGRESSIVE', 'DEFENSIVE'],
    description: 'Creatures of living water. They rise from puddles, take form, then collapse.',
    emoji: '🌊',
  },
  'Echo Husks': {
    name: 'Echo Husks',
    tier: 1,
    health: { min: 35, max: 50 },
    behaviors: ['STALKING', 'ERRATIC', 'AGGRESSIVE'],
    description: 'They repeat the last words of the dead. Over and over.',
    emoji: '🗣️',
  },
  'Bone Weavers': {
    name: 'Bone Weavers',
    tier: 1,
    health: { min: 40, max: 55 },
    behaviors: ['AGGRESSIVE', 'CHARGING', 'STALKING'],
    description: 'Skeletal hands that emerge from walls and floors. Just hands.',
    emoji: '🦴',
  },
  'Ash Children': {
    name: 'Ash Children',
    tier: 1,
    health: { min: 25, max: 40 },
    behaviors: ['STALKING', 'DEFENSIVE', 'CHARGING'],
    description: 'Small. Gray. They don\'t attack — they suffocate.',
    emoji: '👶',
  },
  
  // Tier 2 - Uncommon Threats
  'Hollow Clergy': {
    name: 'Hollow Clergy',
    tier: 2,
    health: { min: 70, max: 90 },
    behaviors: ['CHARGING', 'DEFENSIVE', 'AGGRESSIVE'],
    description: 'Priests of a nameless god. Their prayers are curses.',
    emoji: '🧙',
  },
  'The Bound': {
    name: 'The Bound',
    tier: 2,
    health: { min: 80, max: 100 },
    behaviors: ['HUNTING', 'AGGRESSIVE', 'CHARGING'],
    description: 'Souls wrapped in chains of their own regret. They want company.',
    emoji: '⛓️',
  },
  'Forgotten Guardian': {
    name: 'Forgotten Guardian',
    tier: 2,
    health: { min: 90, max: 110 },
    behaviors: ['DEFENSIVE', 'AGGRESSIVE', 'CHARGING'],
    description: 'Stone sentinels animated by old magic. They remember how to kill.',
    emoji: '🗿',
  },
  'The Weeping': {
    name: 'The Weeping',
    tier: 2,
    health: { min: 60, max: 80 },
    behaviors: ['STALKING', 'ERRATIC', 'CHARGING'],
    description: 'Spirits of grief. Their touch brings sorrow so deep it wounds.',
    emoji: '😢',
  },
  'Carrion Knight': {
    name: 'Carrion Knight',
    tier: 2,
    health: { min: 85, max: 105 },
    behaviors: ['AGGRESSIVE', 'DEFENSIVE', 'CHARGING'],
    description: 'Warriors who refused to stop fighting. They salute before they kill.',
    emoji: '⚔️',
  },
  'Pale Oracle': {
    name: 'Pale Oracle',
    tier: 2,
    health: { min: 55, max: 70 },
    behaviors: ['CHARGING', 'RETREATING', 'STALKING'],
    description: 'Eyeless seers who speak truths you don\'t want to hear.',
    emoji: '🔮',
  },
  'The Congregation': {
    name: 'The Congregation',
    tier: 2,
    health: { min: 100, max: 130 },
    behaviors: ['AGGRESSIVE', 'CHARGING', 'STALKING'],
    description: 'Pilgrims fused at the edges, moving as one. Join them, they whisper.',
    emoji: '👥',
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
  'Mother of Tides': {
    name: 'Mother of Tides',
    tier: 3,
    health: { min: 130, max: 160 },
    behaviors: ['CHARGING', 'AGGRESSIVE', 'DEFENSIVE'],
    description: 'The water itself, given will. Everything that drowns belongs to her.',
    emoji: '🌊',
  },
  'Pale Crawler Swarm': {
    name: 'Pale Crawler Swarm',
    tier: 2,
    health: { min: 75, max: 95 },
    behaviors: ['AGGRESSIVE', 'HUNTING', 'CHARGING'],
    description: 'One wouldn\'t be a threat. But there isn\'t one. Dozens. More coming.',
    emoji: '🕷️',
  },
};

// Get creature info by name
export function getCreatureInfo(name: string): CreatureInfo | null {
  return BESTIARY[name] || null;
}

// Get random creature health based on their tier
export function getCreatureHealth(name: string): number {
  const info = BESTIARY[name];
  if (!info) return 65; // Default fallback
  return info.health.min + Math.floor(Math.random() * (info.health.max - info.health.min));
}

// Get creature's preferred intent types
export function getCreatureIntent(name: string): { type: IntentType; description: string } {
  const info = BESTIARY[name];
  if (!info) return getEnemyIntent();
  
  // Pick from creature's preferred behaviors
  const preferredType = pick(info.behaviors);
  return getEnemyIntent(preferredType);
}

// Generate randomized dungeon (more variety)
export function generateRandomDungeon(): DungeonRoom[] {
  const exploreTemplates = ['descent', 'corridor', 'flooded', 'chamber', 'shrine', 'crossroads'];
  const combatTemplates = ['ambush', 'confrontation', 'territorial', 'pursuit', 'guardian'];
  const corpseTemplates = ['fresh', 'old', 'heroic', 'disturbing', 'peaceful'];
  const cacheTemplates = ['alcove', 'survivor_stash', 'spring', 'offering_site'];
  const exitTemplates = ['threshold', 'earned', 'release', 'changed'];
  
  return [
    { type: 'explore', template: pick(exploreTemplates), content: getExploreRoom(pick(exploreTemplates)) },
    { type: 'explore', template: 'flooded', content: getExploreRoom('flooded') },
    { type: 'combat', template: pick(combatTemplates), content: getCombatRoom(pick(combatTemplates)) },
    { type: 'corpse', template: pick(corpseTemplates), content: getCorpseRoom(pick(corpseTemplates)) },
    { type: 'cache', template: pick(cacheTemplates), content: getCacheRoom(pick(cacheTemplates)) },
    { type: 'combat', template: pick(combatTemplates), content: getCombatRoom(pick(combatTemplates)) },
    { type: 'explore', template: pick(exploreTemplates), content: getExploreRoom(pick(exploreTemplates)) },
    { type: 'combat', template: 'arena', content: getCombatRoom('arena') }, // Boss always arena
    { type: 'exit', template: pick(exitTemplates), content: getExitRoom(pick(exitTemplates)) },
  ];
}
