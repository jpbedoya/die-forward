/**
 * Zone-Aware Content Loader
 *
 * Loads zone JSON data and provides typed accessors for rooms, creatures,
 * depths, bosses, and explore options. Supports both full-room zones
 * (sunken-crypt) and fragment-based zones (ashen-crypts, etc.).
 *
 * Fragment assembly: opening + " " + middle + " " + closing via seeded RNG
 * for full reproducibility.
 *
 * Task 1.1 + Task 1.3 — Zone Bestiary Integration
 */

import type { SeededRng } from './seeded-random';
import type { CreatureInfo, DepthInfo, IntentType } from './content';

// ── Static zone JSON imports ──────────────────────────────────────────────────
import sunkenCryptData from './zones/sunken-crypt.json';
import ashenCryptsData from './zones/ashen-crypts.json';
import frozenGalleryData from './zones/frozen-gallery.json';
import livingTombData from './zones/living-tomb.json';
import voidBeyondData from './zones/void-beyond.json';

// ── Zone data types ───────────────────────────────────────────────────────────

export interface ZoneMeta {
  name: string;
  tagline: string;
  element: string;
  difficulty: number;
  colors: { primary: string; accent: string; text: string };
  mechanic: string | null;
  mechanicDescription?: string;
  unlockRequirement: string | null;
  emoji: string;
}

/** A single room variation as stored in full-room zone JSONs */
export interface ZoneRoomVariation {
  id: string;
  narrative: string;
  options?: string[];
  enemy?: string;
  enemyEmoji?: string;
  player_name?: string;
  final_message?: string;
}

/** A template entry in a full-room zone's rooms section */
export interface ZoneRoomTemplate {
  template: string;
  variations: ZoneRoomVariation[];
}

/** Fragment group for explore/combat/exit rooms */
export interface FragmentGroup {
  opening: string[];
  middle: string[];
  closing: string[];
}

/** Fragment group for corpse rooms */
export interface CorpseFragmentGroup {
  framing: string[];
  discoveryBeats: string[];
}

/** Fragment group for cache rooms */
export interface CacheFragmentGroup {
  locationLines: string[];
  toneClosers: string[];
}

/** All fragment data for a zone */
export interface ZoneFragments {
  explore: FragmentGroup;
  combat: FragmentGroup;
  corpse: CorpseFragmentGroup;
  cache: CacheFragmentGroup;
  exit: FragmentGroup;
  options: {
    cautious: string[];
    aggressive: string[];
    investigative: string[];
    retreat: string[];
  };
}

export interface ZoneRooms {
  explore: ZoneRoomTemplate[];
  combat: ZoneRoomTemplate[];
  corpse: ZoneRoomTemplate[];
  cache: ZoneRoomTemplate[];
  exit: ZoneRoomTemplate[];
}

export interface ZoneCreatureDef {
  name: string;
  tier: 1 | 2 | 3;
  health: { min: number; max: number };
  behaviors: string[];
  description: string;
  emoji: string;
  artUrl?: string;
}

export interface ZoneBestiary {
  /** Names from the global BESTIARY to include as fallback pool */
  shared: string[];
  /** Full creature definitions local to this zone */
  local: ZoneCreatureDef[];
}

export interface ZoneDepth {
  name: string;
  tier: 1 | 2 | 3;
  roomRange: [number, number];
  description: string;
}

export interface ZoneStructureRoom {
  type: 'explore' | 'combat' | 'corpse' | 'cache' | 'exit';
  template: string;
  boss?: boolean;
}

export interface ZoneData {
  id: string;
  version: string;
  meta: ZoneMeta;
  lore: string;
  /** Present in full-room zones (sunken-crypt) */
  rooms?: ZoneRooms;
  /** Present in fragment zones */
  fragments?: ZoneFragments;
  bestiary: ZoneBestiary;
  depths: ZoneDepth[];
  dungeonLayout: {
    totalRooms: number;
    structure: ZoneStructureRoom[];
  };
  boss: string;
  audio?: unknown;
}

/** The output type from getZoneRoom — matches RoomVariation shape */
export interface RoomContent {
  id: string;
  narrative: string;
  options: string[];
  enemy?: string;
  enemyEmoji?: string;
}

// ── Zone registry ─────────────────────────────────────────────────────────────

const ZONE_MAP: Record<string, ZoneData> = {
  'sunken-crypt': sunkenCryptData as unknown as ZoneData,
  'ashen-crypts': ashenCryptsData as unknown as ZoneData,
  'frozen-gallery': frozenGalleryData as unknown as ZoneData,
  'living-tomb': livingTombData as unknown as ZoneData,
  'void-beyond': voidBeyondData as unknown as ZoneData,
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Load a zone by ID. Returns ZoneData or throws for unknown zone.
 */
export function loadZone(zoneId: string): ZoneData {
  const zone = ZONE_MAP[zoneId];
  if (!zone) {
    throw new Error(`Unknown zone: "${zoneId}". Available zones: ${Object.keys(ZONE_MAP).join(', ')}`);
  }
  return zone;
}

/**
 * List all available zone IDs.
 */
export function listZoneIds(): string[] {
  return Object.keys(ZONE_MAP);
}

/**
 * Generate room content for a given room type.
 *
 * - Full-room zones (sunken-crypt): picks a random variation from the matching
 *   template, falling back to any template if the requested one isn't found.
 * - Fragment zones: assembles opening + middle + closing via seeded RNG.
 *
 * @param roomIndex - 0-based room index used to generate deterministic IDs for fragment zones.
 */
export function getZoneRoom(
  zone: ZoneData,
  roomType: 'explore' | 'combat' | 'corpse' | 'cache' | 'exit',
  rng: SeededRng,
  template?: string,
  roomIndex?: number,
): RoomContent {
  if (zone.rooms) {
    return _getFullRoomContent(zone, roomType, rng, template);
  }
  if (zone.fragments) {
    return _getFragmentRoomContent(zone, roomType, rng, roomIndex ?? 0);
  }
  throw new Error(`Zone "${zone.id}" has neither rooms nor fragments data.`);
}

/**
 * Get a creature appropriate for a given tier from this zone.
 *
 * Priority:
 *   80% — zone-local creatures of matching tier
 *   20% — shared creature names (global BESTIARY lookup) of any tier
 *         falling back to zone-local if no shared creatures exist
 *
 * @deprecated Use getZoneCreatureSeeded() for deterministic staked runs
 */
export function getZoneCreature(
  zone: ZoneData,
  tier: 1 | 2 | 3,
  globalBestiary: Record<string, CreatureInfo>,
): CreatureInfo {
  const localOfTier = zone.bestiary.local.filter(c => c.tier === tier);
  const sharedCreatures = zone.bestiary.shared
    .map(name => globalBestiary[name])
    .filter((c): c is CreatureInfo => c !== undefined && c.tier === tier);

  const useLocal = localOfTier.length > 0 && (sharedCreatures.length === 0 || rng_chance(0.8));

  if (useLocal && localOfTier.length > 0) {
    const picked = localOfTier[Math.floor(Math.random() * localOfTier.length)];
    return _zoneCreatureToCreatureInfo(picked);
  }

  if (sharedCreatures.length > 0) {
    return sharedCreatures[Math.floor(Math.random() * sharedCreatures.length)];
  }

  // Fallback: any local creature regardless of tier
  if (zone.bestiary.local.length > 0) {
    const fallback = zone.bestiary.local[Math.floor(Math.random() * zone.bestiary.local.length)];
    return _zoneCreatureToCreatureInfo(fallback);
  }

  // Last resort: return a placeholder
  return {
    name: 'Unknown',
    tier,
    health: { min: 40, max: 60 },
    behaviors: ['AGGRESSIVE'] as IntentType[],
    description: 'Something lurks here.',
    emoji: '👤',
  };
}

/**
 * Seeded variant of getZoneCreature — uses seeded RNG for reproducibility.
 */
export function getZoneCreatureSeeded(
  zone: ZoneData,
  tier: 1 | 2 | 3,
  rng: SeededRng,
  globalBestiary: Record<string, CreatureInfo>,
): CreatureInfo {
  const localOfTier = zone.bestiary.local.filter(c => c.tier === tier);
  const sharedCreatures = zone.bestiary.shared
    .map(name => globalBestiary[name])
    .filter((c): c is CreatureInfo => c !== undefined && c.tier === tier);

  const useLocal = localOfTier.length > 0 && (sharedCreatures.length === 0 || rng.chance(0.8));

  if (useLocal && localOfTier.length > 0) {
    const picked = rng.pick(localOfTier);
    return _zoneCreatureToCreatureInfo(picked);
  }

  if (sharedCreatures.length > 0) {
    return rng.pick(sharedCreatures);
  }

  // Fallback: any local creature regardless of tier
  if (zone.bestiary.local.length > 0) {
    const fallback = rng.pick(zone.bestiary.local);
    return _zoneCreatureToCreatureInfo(fallback);
  }

  return {
    name: 'Unknown',
    tier,
    health: { min: 40, max: 60 },
    behaviors: ['AGGRESSIVE'] as IntentType[],
    description: 'Something lurks here.',
    emoji: '👤',
  };
}

/**
 * Get depth info for a room number (1-indexed) from zone data.
 */
export function getZoneDepth(zone: ZoneData, roomNumber: number): DepthInfo {
  for (const depth of zone.depths) {
    if (roomNumber >= depth.roomRange[0] && roomNumber <= depth.roomRange[1]) {
      return {
        name: depth.name,
        tier: depth.tier,
        roomRange: depth.roomRange,
        description: depth.description,
      };
    }
  }
  // Fallback: last depth
  const last = zone.depths[zone.depths.length - 1];
  return {
    name: last.name,
    tier: last.tier,
    roomRange: last.roomRange,
    description: last.description,
  };
}

/**
 * Get the boss creature for a zone.
 * Looks up zone.boss in local bestiary first, then global.
 */
export function getZoneBoss(
  zone: ZoneData,
  globalBestiary: Record<string, CreatureInfo>,
): CreatureInfo {
  // Check zone-local bestiary
  const localBoss = zone.bestiary.local.find(c => c.name === zone.boss);
  if (localBoss) {
    return _zoneCreatureToCreatureInfo(localBoss);
  }
  // Fallback to global bestiary
  const globalBoss = globalBestiary[zone.boss];
  if (globalBoss) {
    return globalBoss;
  }
  // Last resort placeholder
  return {
    name: zone.boss,
    tier: 3,
    health: { min: 180, max: 220 },
    behaviors: ['CHARGING', 'AGGRESSIVE', 'DEFENSIVE'] as IntentType[],
    description: 'The guardian of this zone.',
    emoji: '👁️',
  };
}

/**
 * Get explore options for a room.
 *
 * - Full-room zones: returns options from the matched room variation (or empty
 *   array if none).
 * - Fragment zones: returns options from the categorized pools
 *   (cautious / aggressive / investigative / retreat). If a category is
 *   provided, returns only that pool; otherwise returns all options merged.
 */
export function getZoneOptions(
  zone: ZoneData,
  roomType?: 'explore' | 'combat' | 'corpse' | 'cache' | 'exit',
  category?: 'cautious' | 'aggressive' | 'investigative' | 'retreat',
): string[] {
  if (zone.fragments?.options) {
    const opts = zone.fragments.options;
    if (category) {
      return opts[category] ?? [];
    }
    // Merge all categories
    return [
      ...opts.cautious,
      ...opts.aggressive,
      ...opts.investigative,
      ...opts.retreat,
    ];
  }

  // Full-room zone: return empty (options come from the RoomContent)
  return [];
}

// ── Private helpers ───────────────────────────────────────────────────────────

function _getFullRoomContent(
  zone: ZoneData,
  roomType: 'explore' | 'combat' | 'corpse' | 'cache' | 'exit',
  rng: SeededRng,
  template?: string,
): RoomContent {
  const rooms = zone.rooms!;
  const templates = rooms[roomType];
  if (!templates || templates.length === 0) {
    throw new Error(`Zone "${zone.id}" has no "${roomType}" rooms.`);
  }

  let selectedTemplate: ZoneRoomTemplate;
  if (template) {
    const found = templates.find(t => t.template === template);
    selectedTemplate = found ?? rng.pick(templates);
  } else {
    selectedTemplate = rng.pick(templates);
  }

  const variation = rng.pick(selectedTemplate.variations);
  return {
    id: variation.id,
    narrative: variation.narrative,
    options: variation.options ?? [],
    enemy: variation.enemy,
    enemyEmoji: variation.enemyEmoji,
  };
}

function _getFragmentRoomContent(
  zone: ZoneData,
  roomType: 'explore' | 'combat' | 'corpse' | 'cache' | 'exit',
  rng: SeededRng,
  roomIndex: number,
): RoomContent {
  const frags = zone.fragments!;
  // Fix 10: use roomIndex instead of Date.now() for deterministic IDs
  const id = `${zone.id}-${roomType}-${roomIndex}`;

  if (roomType === 'corpse') {
    const corpse = frags.corpse;
    const framing = rng.pick(corpse.framing);
    const beat = rng.pick(corpse.discoveryBeats);
    return {
      id,
      narrative: `${framing} ${beat}`,
      options: _getFragmentOptions(frags, 2, rng),
    };
  }

  if (roomType === 'cache') {
    const cache = frags.cache;
    const location = rng.pick(cache.locationLines);
    const tone = rng.pick(cache.toneClosers);
    return {
      id,
      narrative: `${location} ${tone}`,
      options: _getFragmentOptions(frags, 2, rng),
    };
  }

  // explore / combat / exit all have opening/middle/closing
  const group = frags[roomType] as FragmentGroup;
  const opening = rng.pick(group.opening);
  const middle = rng.pick(group.middle);
  const closing = rng.pick(group.closing);
  return {
    id,
    narrative: `${opening} ${middle} ${closing}`,
    options: _getFragmentOptions(frags, roomType === 'combat' ? 2 : 3, rng),
  };
}

/**
 * Returns a small mixed set of options from fragment option pools.
 * Picks `count` options spread across pools for variety.
 * Uses seeded RNG for full reproducibility (BUG 3 fix).
 */
function _getFragmentOptions(frags: ZoneFragments, count: number, rng: SeededRng): string[] {
  const opts = frags.options;
  if (!opts) return [];
  // Pick one from cautious, one from aggressive, rest from investigative/retreat
  const result: string[] = [];
  if (opts.cautious.length > 0) result.push(rng.pick(opts.cautious));
  if (opts.aggressive.length > 0) result.push(rng.pick(opts.aggressive));
  if (count > 2 && opts.investigative.length > 0) result.push(rng.pick(opts.investigative));
  if (count > 3 && opts.retreat.length > 0) result.push(rng.pick(opts.retreat));
  return result.slice(0, count);
}

/**
 * Seeded variant of _getFragmentOptions for reproducible option selection.
 */
export function getZoneOptionsSeeded(
  zone: ZoneData,
  rng: SeededRng,
  roomType?: 'explore' | 'combat' | 'corpse' | 'cache' | 'exit',
  category?: 'cautious' | 'aggressive' | 'investigative' | 'retreat',
): string[] {
  if (!zone.fragments?.options) return [];
  const opts = zone.fragments.options;
  if (category) {
    return opts[category] ?? [];
  }
  // Return a seeded sample of 2-3 options spread across categories
  const result: string[] = [];
  if (opts.cautious.length > 0) result.push(rng.pick(opts.cautious));
  if (opts.aggressive.length > 0) result.push(rng.pick(opts.aggressive));
  if (opts.investigative.length > 0) result.push(rng.pick(opts.investigative));
  return result;
}

/** Convert a ZoneCreatureDef to CreatureInfo */
function _zoneCreatureToCreatureInfo(def: ZoneCreatureDef): CreatureInfo {
  return {
    name: def.name,
    tier: def.tier,
    health: { min: def.health.min, max: def.health.max },
    behaviors: def.behaviors as IntentType[],
    description: def.description,
    emoji: def.emoji,
    artUrl: def.artUrl,
  };
}

/** Non-seeded chance helper (used for getZoneCreature non-seeded variant) */
function rng_chance(probability: number): boolean {
  return Math.random() < probability;
}
