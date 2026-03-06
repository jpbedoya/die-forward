// Content loader - zone-aware. Pulls from zone packages in /zones/.
// Falls back to sunken-crypt if no zone is set.
// InstantDB overrides (set via admin panel) take priority over bundled JSON when present.

import exploreRooms from '../../content/explore-rooms.json';
import combatRooms from '../../content/combat-rooms.json';
import corpseRooms from '../../content/corpse-rooms.json';
import cacheRooms from '../../content/cache-rooms.json';
import exitRooms from '../../content/exit-rooms.json';
import combatActions from '../../content/combat-actions.json';
import deathEpitaphs from '../../content/death-epitaphs.json';

// ====== ZONE PACKAGE TYPES ======

export interface ZoneColors {
  primary: string;
  accent: string;
  text: string;
}

export interface ZoneMeta {
  name: string;
  tagline: string;
  element: string;
  difficulty: number;
  colors: ZoneColors;
  mechanic: string | null;
  unlockRequirement: string | null;
  emoji: string;
}

export interface ZoneCreature {
  name: string;
  tier: 1 | 2 | 3;
  health: { min: number; max: number };
  behaviors: IntentType[];
  description: string;
  emoji: string;
}

export interface ZoneBestiary {
  shared: string[];
  local: ZoneCreature[];
}

export interface ZoneDepth {
  name: string;
  tier: 1 | 2 | 3;
  roomRange: [number, number];
  description: string;
}

export interface ZoneDungeonSlot {
  type: 'explore' | 'combat' | 'corpse' | 'cache' | 'exit';
  template: string;
  boss?: boolean;
}

export interface ZoneDungeonLayout {
  totalRooms: number;
  structure: ZoneDungeonSlot[];
}

export interface ZoneAudioConfig {
  ambient: {
    explore: string;
    combat: string;
  };
  sfx: {
    footstep: string;
    descend: string;
    environment: string[];
    atmosphere: string[];
    boss: { intro: string; roar: string };
  };
}

// ====== FRAGMENT SYSTEM TYPES ======

export interface RoomFragments {
  opening: string[];   // Scene-setting, sensory first line
  middle: string[];    // The event, discovery, or tension beat
  closing: string[];   // Final line — tension, choice implication, dread
}

export interface OptionPool {
  cautious: string[];
  aggressive: string[];
  investigative: string[];
  retreat: string[];
}

export interface ZoneFragments {
  explore?: RoomFragments;
  combat?: RoomFragments;
  corpse?: {
    framing: string[];        // Zone-flavored wrapper around the corpse discovery
    discoveryBeats: string[]; // What you notice before you see the body
  };
  cache?: {
    locationLines: string[];  // Where the cache is / what the space looks like
    toneClosers: string[];    // How safety feels here (uneasy, almost warm, etc.)
  };
  exit?: RoomFragments;
  options?: OptionPool;
}

export interface ZonePackage {
  id: string;
  version: string;
  meta: ZoneMeta;
  lore: string;
  rooms?: {
    explore: RoomTemplate[];
    combat: RoomTemplate[];
    corpse: RoomTemplate[];
    cache: RoomTemplate[];
    exit: RoomTemplate[];
  };
  fragments?: ZoneFragments;
  bestiary: ZoneBestiary;
  depths: ZoneDepth[];
  dungeonLayout: ZoneDungeonLayout;
  boss: string;
  audio: ZoneAudioConfig;
}

// ====== ZONE REGISTRY ======

// Dynamically load zone packages at runtime.
// We use a static map so Next.js can bundle the JSON files at build time.
const ZONE_LOADERS: Record<string, () => Promise<ZonePackage>> = {
  'sunken-crypt': () =>
    import('../../zones/sunken-crypt.json').then(m => m.default as unknown as ZonePackage),
  'ashen-crypts': () =>
    import('../../zones/ashen-crypts.json').then(m => m.default as unknown as ZonePackage),
  'frozen-gallery': () =>
    import('../../zones/frozen-gallery.json').then(m => m.default as unknown as ZonePackage),
  'living-tomb': () =>
    import('../../zones/living-tomb.json').then(m => m.default as unknown as ZonePackage),
  'void-beyond': () =>
    import('../../zones/void-beyond.json').then(m => m.default as unknown as ZonePackage),
};

// Cache of loaded zones (in-memory for the process lifetime)
const ZONE_CACHE: Record<string, ZonePackage> = {};

/**
 * Load a zone package by id. Merges InstantDB overrides on top of the bundled JSON.
 * Results are cached in-memory for the process lifetime.
 */
export async function loadZone(zoneId: string): Promise<ZonePackage> {
  if (ZONE_CACHE[zoneId]) return ZONE_CACHE[zoneId];
  const loader = ZONE_LOADERS[zoneId];
  if (!loader) throw new Error(`Unknown zone: ${zoneId}`);
  const zone = await loader();

  // Apply InstantDB overrides (admin edits) on top of the bundled JSON.
  // We do this lazily at load time so it works on Vercel without file writes.
  try {
    const { getZoneOverride } = await import('./zone-overrides');

    // Bestiary override — replaces bestiary.local
    const bestiaryOverride = await getZoneOverride(zoneId, 'bestiary');
    if (bestiaryOverride !== null && Array.isArray(bestiaryOverride)) {
      zone.bestiary = { ...zone.bestiary, local: bestiaryOverride as ZoneCreature[] };
    }

    // Fragment overrides — replace per category
    const fragmentCategories = ['explore', 'combat', 'corpse', 'cache', 'exit', 'options'] as const;
    for (const cat of fragmentCategories) {
      const override = await getZoneOverride(zoneId, `fragments_${cat}`);
      if (override !== null) {
        zone.fragments = zone.fragments ?? {};
        (zone.fragments as Record<string, unknown>)[cat] = override;
      }
    }
  } catch (err) {
    // Never crash the game if InstantDB is unavailable — fall back to bundled JSON
    console.warn(`[content] loadZone: failed to fetch InstantDB overrides for "${zoneId}":`, err);
  }

  ZONE_CACHE[zoneId] = zone;
  return zone;
}

/**
 * Get the zone for the given zoneId. Falls back to sunken-crypt data if not cached.
 */
export function getActiveZone(zoneId: string = 'sunken-crypt'): ZonePackage {
  if (ZONE_CACHE[zoneId]) return ZONE_CACHE[zoneId];
  if (zoneId !== 'sunken-crypt' && ZONE_CACHE['sunken-crypt']) return ZONE_CACHE['sunken-crypt'];
  // Return a fallback built from the legacy flat JSON files (backward compat)
  return buildFallbackZone();
}

// ====== LEGACY FALLBACK ======
// Builds a ZonePackage-compatible object from the flat JSON content files
// for backward compatibility when no zone is explicitly set.
function buildFallbackZone(): ZonePackage {
  return {
    id: 'sunken-crypt',
    version: '1.0.0',
    meta: {
      name: 'THE SUNKEN CRYPT',
      tagline: 'The first descent. Nothing here is alive.',
      element: 'water',
      difficulty: 1,
      colors: { primary: '#1e3a5f', accent: '#4a9eff', text: '#a8d4ff' },
      mechanic: null,
      unlockRequirement: null,
      emoji: '🌊',
    },
    lore: 'Ancient stairs carved by forgotten hands lead down into flooded halls where the boundary between life and death grows thin.',
    rooms: {
      explore: exploreRooms.rooms as RoomTemplate[],
      combat: combatRooms.rooms as RoomTemplate[],
      corpse: corpseRooms.rooms as RoomTemplate[],
      cache: cacheRooms.rooms as RoomTemplate[],
      exit: exitRooms.rooms as RoomTemplate[],
    },
    bestiary: {
      shared: [],
      local: Object.values(BESTIARY).map(c => ({
        name: c.name,
        tier: c.tier,
        health: c.health,
        behaviors: c.behaviors,
        description: c.description,
        emoji: c.emoji,
      })),
    },
    depths: DEPTHS,
    dungeonLayout: {
      totalRooms: 12,
      structure: [
        { type: 'explore', template: 'descent' },
        { type: 'combat', template: 'ambush' },
        { type: 'corpse', template: 'fresh' },
        { type: 'combat', template: 'confrontation' },
        { type: 'explore', template: 'flooded' },
        { type: 'combat', template: 'guardian' },
        { type: 'cache', template: 'alcove' },
        { type: 'combat', template: 'territorial' },
        { type: 'explore', template: 'chamber' },
        { type: 'corpse', template: 'heroic' },
        { type: 'combat', template: 'pursuit' },
        { type: 'combat', template: 'arena', boss: true },
      ],
    },
    boss: 'The Keeper',
    audio: {
      ambient: {
        explore: '/audio/ambient-explore.mp3',
        combat: '/audio/ambient-combat.mp3',
      },
      sfx: {
        footstep: '/audio/footstep.mp3',
        descend: '/audio/depth-descend.mp3',
        environment: ['/audio/water-drip.mp3', '/audio/drip-echo.mp3', '/audio/water-splash.mp3'],
        atmosphere: ['/audio/eerie-whispers.mp3', '/audio/stone-grinding.mp3', '/audio/door-creak.mp3'],
        boss: { intro: '/audio/boss-intro.mp3', roar: '/audio/boss-roar.mp3' },
      },
    },
  };
}

// ====== ROOM TYPES ======

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

// Helper to pick room variation from zone room pool
function pickRoom(rooms: RoomTemplate[], template?: string): RoomVariation {
  if (template) {
    const found = rooms.find(r => r.template === template);
    if (found) return pick(found.variations);
  }
  const randomTemplate = pick(rooms);
  return pick(randomTemplate.variations);
}

// Get random explore room by template type
export function getExploreRoom(template?: string, zoneId: string = 'sunken-crypt'): RoomVariation {
  const rooms = getActiveZone(zoneId).rooms;
  if (!rooms) throw new Error('Active zone has no rooms (use fragment assembly)');
  return pickRoom(rooms.explore, template);
}

// Get random combat room by template type
export function getCombatRoom(template?: string, zoneId: string = 'sunken-crypt'): RoomVariation {
  const rooms = getActiveZone(zoneId).rooms;
  if (!rooms) throw new Error('Active zone has no rooms (use fragment assembly)');
  return pickRoom(rooms.combat, template);
}

// Get random corpse discovery by template type
export function getCorpseRoom(template?: string, zoneId: string = 'sunken-crypt'): RoomVariation {
  const rooms = getActiveZone(zoneId).rooms;
  if (!rooms) throw new Error('Active zone has no rooms (use fragment assembly)');
  return pickRoom(rooms.corpse, template);
}

// Get random cache room by template type
export function getCacheRoom(template?: string, zoneId: string = 'sunken-crypt'): RoomVariation {
  const rooms = getActiveZone(zoneId).rooms;
  if (!rooms) throw new Error('Active zone has no rooms (use fragment assembly)');
  return pickRoom(rooms.cache, template);
}

// Get random exit room by template type
export function getExitRoom(template?: string, zoneId: string = 'sunken-crypt'): RoomVariation {
  const rooms = getActiveZone(zoneId).rooms;
  if (!rooms) throw new Error('Active zone has no rooms (use fragment assembly)');
  return pickRoom(rooms.exit, template);
}

// ====== FRAGMENT ASSEMBLY FUNCTIONS ======

export function assembleExploreRoom(fragments: ZoneFragments, templateHint?: string): RoomVariation {
  const f = fragments.explore;
  if (!f) throw new Error('Zone has no explore fragments');

  const opening = pick(f.opening);
  const middle = pick(f.middle);
  const closing = pick(f.closing);
  const narrative = `${opening} ${middle} ${closing}`;

  // Pick 2 options from different pools
  const pools = fragments.options;
  const options = pools
    ? [pick(pools.cautious), pick(pools.investigative)]
    : ['Continue', 'Examine the area'];

  // templateHint is accepted for future use (e.g. zone-specific filtering)
  void templateHint;

  return {
    id: `explore_assembled_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    narrative,
    options,
  };
}

export function assembleCombatRoom(fragments: ZoneFragments): RoomVariation {
  const f = fragments.combat;
  if (!f) throw new Error('Zone has no combat fragments');

  const opening = pick(f.opening);
  const middle = pick(f.middle);
  const closing = pick(f.closing);

  return {
    id: `combat_assembled_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    narrative: `${opening} ${middle} ${closing}`,
  };
}

export function assembleCorpseRoom(fragments: ZoneFragments): RoomVariation {
  const f = fragments.corpse;
  if (!f) throw new Error('Zone has no corpse fragments');

  const beat = pick(f.discoveryBeats);
  const framing = pick(f.framing);

  return {
    id: `corpse_assembled_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    narrative: `${beat} ${framing}`,
  };
}

export function assembleCacheRoom(fragments: ZoneFragments): RoomVariation {
  const f = fragments.cache;
  if (!f) throw new Error('Zone has no cache fragments');

  return {
    id: `cache_assembled_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    narrative: `${pick(f.locationLines)} ${pick(f.toneClosers)}`,
  };
}

export function assembleExitRoom(fragments: ZoneFragments): RoomVariation {
  const f = fragments.exit;
  if (!f) throw new Error('Zone has no exit fragments');

  const opening = pick(f.opening);
  const middle = pick(f.middle);
  const closing = pick(f.closing);

  return {
    id: `exit_assembled_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    narrative: `${opening} ${middle} ${closing}`,
  };
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
  boss?: boolean; // True for boss room (room 12)
}

export function generateDungeon(zoneId?: string): DungeonRoom[] {
  // If a different zoneId is specified and cached, use it; otherwise use active zone
  const zone = getActiveZone(zoneId || 'sunken-crypt');
  const rooms = zone.rooms;
  const frags = zone.fragments;

  // Helper: pick content for a slot, preferring rooms over fragments when both exist
  function resolveSlot(slot: ZoneDungeonSlot): RoomVariation {
    switch (slot.type) {
      case 'explore':
        if (rooms?.explore?.length) return pickRoom(rooms.explore, slot.template);
        if (frags) return assembleExploreRoom(frags, slot.template);
        throw new Error(`Zone "${zone.id}" has no explore rooms or fragments`);

      case 'combat':
        if (rooms?.combat?.length) return pickRoom(rooms.combat, slot.template);
        if (frags) return assembleCombatRoom(frags);
        throw new Error(`Zone "${zone.id}" has no combat rooms or fragments`);

      case 'corpse':
        if (rooms?.corpse?.length) return pickRoom(rooms.corpse, slot.template);
        if (frags) return assembleCorpseRoom(frags);
        throw new Error(`Zone "${zone.id}" has no corpse rooms or fragments`);

      case 'cache':
        if (rooms?.cache?.length) return pickRoom(rooms.cache, slot.template);
        if (frags) return assembleCacheRoom(frags);
        throw new Error(`Zone "${zone.id}" has no cache rooms or fragments`);

      case 'exit':
        if (rooms?.exit?.length) return pickRoom(rooms.exit, slot.template);
        if (frags) return assembleExitRoom(frags);
        throw new Error(`Zone "${zone.id}" has no exit rooms or fragments`);

      default:
        if (rooms?.explore?.length) return pickRoom(rooms.explore, slot.template);
        if (frags) return assembleExploreRoom(frags, slot.template);
        throw new Error(`Zone "${zone.id}" has no explore rooms or fragments`);
    }
  }

  return zone.dungeonLayout.structure.map(slot => ({
    type: slot.type,
    template: slot.template,
    content: resolveSlot(slot),
    boss: slot.boss || false,
  }));
}

// Legacy alias for backward compat
export const generateRandomDungeon = generateDungeon;

// ====== BESTIARY ======
// Shared fallback bestiary (used when zone bestiary.shared references these by name)

export interface CreatureInfo {
  name: string;
  tier: 1 | 2 | 3;
  health: { min: number; max: number };
  behaviors: IntentType[];
  description: string;
  emoji: string;
}

export const BESTIARY: Record<string, CreatureInfo> = {
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
  
  // BOSS - The Keeper (Room 12 only)
  'The Keeper': {
    name: 'The Keeper',
    tier: 3,
    health: { min: 180, max: 220 },
    behaviors: ['CHARGING', 'AGGRESSIVE', 'DEFENSIVE', 'CHARGING'],
    description: 'Guardian of the exit. None have passed. None will pass. It has waited millennia for you.',
    emoji: '👁️',
  },
};

// Build a merged bestiary record from the given zone (local + shared fallback)
function getZoneBestiaryRecord(zoneId: string = 'sunken-crypt'): Record<string, CreatureInfo> {
  const zone = getActiveZone(zoneId);
  const result: Record<string, CreatureInfo> = {};

  // Start with shared (fallback BESTIARY) entries referenced by name
  for (const name of zone.bestiary.shared) {
    if (BESTIARY[name]) result[name] = BESTIARY[name];
  }

  // Add local zone creatures (override any shared with same name)
  for (const creature of zone.bestiary.local) {
    result[creature.name] = {
      name: creature.name,
      tier: creature.tier,
      health: creature.health,
      behaviors: creature.behaviors,
      description: creature.description,
      emoji: creature.emoji,
    };
  }

  return result;
}

// Get creature info by name (zone-aware)
export function getCreatureInfo(name: string, zoneId: string = 'sunken-crypt'): CreatureInfo | null {
  const zoneBestiary = getZoneBestiaryRecord(zoneId);
  return zoneBestiary[name] || BESTIARY[name] || null;
}

// Get creature tier (1, 2, or 3)
export function getCreatureTier(name: string, zoneId: string = 'sunken-crypt'): number {
  const info = getCreatureInfo(name, zoneId);
  return info?.tier || 1;
}

// Get damage multiplier based on tier
export function getTierDamageMultiplier(name: string, zoneId: string = 'sunken-crypt'): number {
  const tier = getCreatureTier(name, zoneId);
  switch (tier) {
    case 1: return 1.0;
    case 2: return 1.5;
    case 3: return 2.0;
    default: return 1.0;
  }
}

// ====== DEPTHS SYSTEM ======
// Pulled from the active zone (falls back to static constants for backward compat)

export interface DepthInfo {
  name: string;
  tier: 1 | 2 | 3;
  roomRange: [number, number];
  description: string;
}

export const DEPTHS: DepthInfo[] = [
  {
    name: 'THE UPPER CRYPT',
    tier: 1,
    roomRange: [1, 4],
    description: 'The entrance. Cold stone and shallow water.',
  },
  {
    name: 'THE FLOODED HALLS',
    tier: 2,
    roomRange: [5, 8],
    description: 'Deeper now. The water rises to your chest.',
  },
  {
    name: 'THE ABYSS',
    tier: 3,
    roomRange: [9, 12],
    description: 'The true depths. Few return from here.',
  },
];

// Get depths from the given zone (falls back to static DEPTHS)
export function getActiveDepths(zoneId: string = 'sunken-crypt'): DepthInfo[] {
  const zone = ZONE_CACHE[zoneId];
  if (!zone) return DEPTHS;
  return zone.depths as DepthInfo[];
}

// Get depth info for a room number
export function getDepthForRoom(roomNumber: number): DepthInfo {
  const depths = getActiveDepths();
  for (const depth of depths) {
    if (roomNumber >= depth.roomRange[0] && roomNumber <= depth.roomRange[1]) {
      return depth;
    }
  }
  // Beyond defined depths = last depth tier
  return depths[depths.length - 1];
}

// Get tier based on room number
export function getTierForRoom(roomNumber: number): 1 | 2 | 3 {
  return getDepthForRoom(roomNumber).tier;
}

// Get damage multiplier based on room number (depth-based)
export function getRoomDamageMultiplier(roomNumber: number): number {
  const tier = getTierForRoom(roomNumber);
  switch (tier) {
    case 1: return 1.0;
    case 2: return 1.5;
    case 3: return 2.0;
    default: return 1.0;
  }
}

// Get random creature appropriate for a depth/tier
export function getCreatureForRoom(roomNumber: number, zoneId: string = 'sunken-crypt'): CreatureInfo {
  const tier = getTierForRoom(roomNumber);
  const zoneBestiary = getZoneBestiaryRecord(zoneId);
  const creaturesOfTier = Object.values(zoneBestiary).filter(c => c.tier === tier);
  if (creaturesOfTier.length > 0) return pick(creaturesOfTier);
  // Fallback to shared BESTIARY
  const fallback = Object.values(BESTIARY).filter(c => c.tier === tier);
  return pick(fallback);
}

// Get all creatures of a specific tier
export function getCreaturesByTier(tier: 1 | 2 | 3, zoneId: string = 'sunken-crypt'): CreatureInfo[] {
  const zoneBestiary = getZoneBestiaryRecord(zoneId);
  return Object.values(zoneBestiary).filter(c => c.tier === tier);
}

// Get random creature health based on their tier
export function getCreatureHealth(name: string, zoneId: string = 'sunken-crypt'): number {
  const info = getCreatureInfo(name, zoneId);
  if (!info) return 65; // Default fallback
  return info.health.min + Math.floor(Math.random() * (info.health.max - info.health.min));
}

// Get creature's preferred intent types
export function getCreatureIntent(name: string, zoneId: string = 'sunken-crypt'): { type: IntentType; description: string } {
  const info = getCreatureInfo(name, zoneId);
  if (!info) return getEnemyIntent();
  
  // Pick from creature's preferred behaviors
  const preferredType = pick(info.behaviors);
  return getEnemyIntent(preferredType);
}

// Intent combat effects
export interface IntentEffects {
  damageDealtMod: number;    // Multiplier on enemy's damage to you
  damageTakenMod: number;    // Multiplier on damage enemy takes
  fleeMod: number;           // Modifier to flee chance (-0.3 = 30% harder)
  isCharging: boolean;       // Will deal double damage next turn
  description: string;       // Combat tooltip
}

export function getIntentEffects(intentType: IntentType): IntentEffects {
  switch (intentType) {
    case 'AGGRESSIVE':
      return {
        damageDealtMod: 1.0,
        damageTakenMod: 1.0,
        fleeMod: 0,
        isCharging: false,
        description: 'Attacking normally',
      };
    case 'CHARGING':
      return {
        damageDealtMod: 0.5,  // Low damage this turn
        damageTakenMod: 1.0,
        fleeMod: 0,
        isCharging: true,     // WILL HIT HARD NEXT TURN
        description: '⚠️ CHARGING — will deal DOUBLE damage next turn!',
      };
    case 'DEFENSIVE':
      return {
        damageDealtMod: 0.5,
        damageTakenMod: 0.5,  // Harder to hurt
        fleeMod: 0.2,         // Easier to flee
        isCharging: false,
        description: 'Guarding — takes less damage',
      };
    case 'STALKING':
      return {
        damageDealtMod: 1.0,
        damageTakenMod: 1.0,
        fleeMod: -0.3,        // Harder to flee
        isCharging: false,
        description: 'Watching you — harder to escape',
      };
    case 'HUNTING':
      return {
        damageDealtMod: 1.3,  // Bonus damage (hunting you down)
        damageTakenMod: 1.0,
        fleeMod: -0.2,
        isCharging: false,
        description: 'Hunting — deals bonus damage',
      };
    case 'ERRATIC': {
      const erraticMod = 0.5 + Math.random() * 1.5; // 0.5x to 2x
      return {
        damageDealtMod: erraticMod,
        damageTakenMod: 1.0,
        fleeMod: 0.1,
        isCharging: false,
        description: 'Unpredictable — damage varies wildly',
      };
    }
    case 'RETREATING':
      return {
        damageDealtMod: 0.5,
        damageTakenMod: 1.2,  // More vulnerable
        fleeMod: 0.3,         // Much easier to flee
        isCharging: false,
        description: 'Retreating — easier to escape or damage',
      };
    default:
      return {
        damageDealtMod: 1.0,
        damageTakenMod: 1.0,
        fleeMod: 0,
        isCharging: false,
        description: 'Unknown intent',
      };
  }
}

// Item combat effects
export interface ItemEffects {
  damageBonus: number;       // Flat % bonus to damage dealt
  defenseBonus: number;      // Flat % reduction to damage taken
  fleeBonus: number;         // Bonus to flee chance
}

export function getItemEffects(inventory: {name: string}[]): ItemEffects {
  let effects: ItemEffects = { damageBonus: 0, defenseBonus: 0, fleeBonus: 0 };
  
  for (const item of inventory) {
    switch (item.name) {
      case 'Torch':
        effects.damageBonus += 0.25;  // +25% damage (see better)
        break;
      case 'Dagger':
        effects.damageBonus += 0.35;  // +35% damage
        break;
      case 'Rusty Blade':
        effects.damageBonus += 0.20;  // +20% damage
        break;
      case 'Shield':
      case 'Tattered Shield':
        effects.defenseBonus += 0.25; // -25% damage taken
        break;
      case 'Cloak':
        effects.fleeBonus += 0.15;    // +15% flee chance
        effects.defenseBonus += 0.10; // +10% defense
        break;
      case 'Poison Vial':
        effects.damageBonus += 0.40;  // +40% damage (poison coats your weapon)
        break;
      case 'Ancient Scroll':
        effects.defenseBonus += 0.20; // +20% defense (protective ward)
        effects.fleeBonus += 0.10;    // +10% flee (swiftness blessing)
        break;
      case 'Bone Charm':
        effects.defenseBonus += 0.15; // +15% defense (warding)
        break;
    }
  }
  
  return effects;
}

// Get boss creature for the given zone's boss room
export function getBossCreature(zoneId: string = 'sunken-crypt'): CreatureInfo {
  const zone = getActiveZone(zoneId);
  const boss = getCreatureInfo(zone.boss, zoneId);
  return boss || BESTIARY['The Keeper'];
}
