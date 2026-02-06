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
