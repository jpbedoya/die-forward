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
import { getLocale } from './i18n';

// ── Static zone JSON imports ──────────────────────────────────────────────────
import sunkenCryptData from './zones/sunken-crypt.json';
import ashenCryptsData from './zones/ashen-crypts.json';
import frozenGalleryData from './zones/frozen-gallery.json';
import livingTombData from './zones/living-tomb.json';
import voidBeyondData from './zones/void-beyond.json';

// TODO: asset-based lazy loading — this adds ~1.4MB JSON to the bundle
// ── Static per-locale zone JSON imports ─────────────────────────────────────
// es
import sunkenCryptEs from './zones/sunken-crypt.es.json';
import ashenCryptsEs from './zones/ashen-crypts.es.json';
import frozenGalleryEs from './zones/frozen-gallery.es.json';
import livingTombEs from './zones/living-tomb.es.json';
import voidBeyondEs from './zones/void-beyond.es.json';
// ja
import sunkenCryptJa from './zones/sunken-crypt.ja.json';
import ashenCryptsJa from './zones/ashen-crypts.ja.json';
import frozenGalleryJa from './zones/frozen-gallery.ja.json';
import livingTombJa from './zones/living-tomb.ja.json';
import voidBeyondJa from './zones/void-beyond.ja.json';
// ko
import sunkenCryptKo from './zones/sunken-crypt.ko.json';
import ashenCryptsKo from './zones/ashen-crypts.ko.json';
import frozenGalleryKo from './zones/frozen-gallery.ko.json';
import livingTombKo from './zones/living-tomb.ko.json';
import voidBeyondKo from './zones/void-beyond.ko.json';
// pt-BR
import sunkenCryptPtBR from './zones/sunken-crypt.pt-BR.json';
import ashenCryptsPtBR from './zones/ashen-crypts.pt-BR.json';
import frozenGalleryPtBR from './zones/frozen-gallery.pt-BR.json';
import livingTombPtBR from './zones/living-tomb.pt-BR.json';
import voidBeyondPtBR from './zones/void-beyond.pt-BR.json';
// zh-TW
import sunkenCryptZhTW from './zones/sunken-crypt.zh-TW.json';
import ashenCryptsZhTW from './zones/ashen-crypts.zh-TW.json';
import frozenGalleryZhTW from './zones/frozen-gallery.zh-TW.json';
import livingTombZhTW from './zones/living-tomb.zh-TW.json';
import voidBeyondZhTW from './zones/void-beyond.zh-TW.json';
// vi — void-beyond.vi.json does not exist yet; omitted (falls back to English per-zone)
import sunkenCryptVi from './zones/sunken-crypt.vi.json';
import ashenCryptsVi from './zones/ashen-crypts.vi.json';
import frozenGalleryVi from './zones/frozen-gallery.vi.json';
import livingTombVi from './zones/living-tomb.vi.json';

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

export interface ZoneGate {
  item: string;      // exact ITEM_DETAILS key
  consumes: boolean;
}

export interface ZoneNode {
  id: string;                       // unique within zone, e.g. "n01-descent"
  type: 'explore' | 'combat' | 'corpse' | 'cache' | 'exit';
  template: string;
  depth: number;                    // 1-based canonical depth
  next: string[];                   // node ids; empty ONLY on the exit node
  boss?: boolean;
  side?: boolean;                   // same-depth annex; entered from a sibling-depth node
  gate?: ZoneGate;                  // only valid on side nodes
}

export interface ZoneGraphLayout {
  start: string;
  nodes: ZoneNode[];
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
  /** Graph-based layout (new zones). Legacy zones keep using dungeonLayout. */
  graph?: ZoneGraphLayout;
  boss: string;
  audio?: unknown;
}

/**
 * Validates a ZoneGraphLayout. Returns an array of human-readable error
 * strings; an empty array means the graph is valid.
 */
export function validateZoneGraph(g: ZoneGraphLayout): string[] {
  const errors: string[] = [];
  const nodesById = new Map<string, ZoneNode>();

  // Rule: unique ids
  const seenIds = new Set<string>();
  for (const node of g.nodes) {
    if (seenIds.has(node.id)) {
      errors.push(`duplicate node id: "${node.id}"`);
    } else {
      seenIds.add(node.id);
      nodesById.set(node.id, node);
    }
  }

  // Once the duplicate-id error(s) above are recorded, every later rule
  // works off a deduped node list (first occurrence of each id wins, via
  // nodesById which is only populated on first sight). Without this, a
  // shadowed duplicate node still gets walked by every subsequent rule as
  // its own object — producing confusing secondary errors (dead-end, depth
  // skip, unreachable, etc.) for a node that's already flagged as a dup and
  // otherwise invisible to the graph (nothing can resolve to it by id).
  const dedupedNodes = Array.from(nodesById.values());
  g = { ...g, nodes: dedupedNodes };

  // Rule: start exists at depth 1
  const startNode = nodesById.get(g.start);
  if (!startNode) {
    errors.push(`start node "${g.start}" does not exist`);
  } else if (startNode.depth !== 1) {
    errors.push(`start node "${g.start}" must be at depth 1, found depth ${startNode.depth}`);
  }

  // Rule: exactly one exit-type node and it has next: []
  const exitNodes = g.nodes.filter(n => n.type === 'exit');
  if (exitNodes.length !== 1) {
    errors.push(`expected exactly one exit node, found ${exitNodes.length}`);
  } else if (exitNodes[0].next.length !== 0) {
    errors.push(`exit node "${exitNodes[0].id}" must have next: []`);
  }

  // Rule: every non-exit node has >=1 edge
  for (const node of g.nodes) {
    if (node.type !== 'exit' && node.next.length === 0) {
      errors.push(`non-exit node "${node.id}" has no outgoing edges (dead end)`);
    }
  }

  // Rule: all edge targets exist; every edge target.depth === source.depth + 1,
  // OR the target is a same-depth side node (target.side && target.depth === source.depth).
  // A side node's OWN outgoing edges must all be depth+1 (no side->side chaining).
  for (const node of g.nodes) {
    for (const targetId of node.next) {
      const target = nodesById.get(targetId);
      if (!target) {
        errors.push(`node "${node.id}" has edge to nonexistent node "${targetId}"`);
        continue;
      }
      const isDescentEdge = target.depth === node.depth + 1;
      const isSideEdge = target.side === true && target.depth === node.depth;
      if (node.side === true && isSideEdge) {
        errors.push(
          `edge "${node.id}" -> "${targetId}": side node chains into another side node`
        );
      } else if (!isDescentEdge && !isSideEdge) {
        errors.push(
          `edge "${node.id}" -> "${targetId}" skips a depth (source depth ${node.depth}, target depth ${target.depth})`
        );
      }
    }
  }

  // Rule: side nodes are never exit/boss/start
  for (const node of g.nodes) {
    if (node.side === true) {
      if (node.type === 'exit') {
        errors.push(`side node "${node.id}" must not be an exit node`);
      }
      if (node.boss === true) {
        errors.push(`side node "${node.id}" must not be a boss node`);
      }
      if (node.id === g.start) {
        errors.push(`side node "${node.id}" must not be the start node`);
      }
    }
  }

  // Rule: gate only allowed on side nodes
  for (const node of g.nodes) {
    if (node.gate && node.side !== true) {
      errors.push(`node "${node.id}" has a gate but is not a side node`);
    }
  }

  // Rule: every node reachable from start (BFS)
  if (startNode) {
    const reachable = new Set<string>();
    const queue: string[] = [startNode.id];
    reachable.add(startNode.id);
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentNode = nodesById.get(current);
      if (!currentNode) continue;
      for (const nextId of currentNode.next) {
        if (!reachable.has(nextId) && nodesById.has(nextId)) {
          reachable.add(nextId);
          queue.push(nextId);
        }
      }
    }
    for (const node of g.nodes) {
      if (!reachable.has(node.id)) {
        errors.push(`node "${node.id}" is unreachable from start`);
      }
    }
  }

  // Rule: exit reachable from every node (reverse BFS from exit)
  if (exitNodes.length === 1) {
    const exitId = exitNodes[0].id;
    const reverseEdges = new Map<string, string[]>();
    for (const node of g.nodes) {
      for (const targetId of node.next) {
        if (!reverseEdges.has(targetId)) reverseEdges.set(targetId, []);
        reverseEdges.get(targetId)!.push(node.id);
      }
    }
    const canReachExit = new Set<string>();
    const queue: string[] = [exitId];
    canReachExit.add(exitId);
    while (queue.length > 0) {
      const current = queue.shift()!;
      const predecessors = reverseEdges.get(current) ?? [];
      for (const predId of predecessors) {
        if (!canReachExit.has(predId)) {
          canReachExit.add(predId);
          queue.push(predId);
        }
      }
    }
    for (const node of g.nodes) {
      if (!canReachExit.has(node.id)) {
        errors.push(`exit is not reachable from node "${node.id}"`);
      }
    }
  }

  // Rule: exactly one boss: true
  const bossNodes = g.nodes.filter(n => n.boss === true);
  if (bossNodes.length !== 1) {
    errors.push(`expected exactly one boss node, found ${bossNodes.length}`);
  }

  // Rule: a side node must not be the only route to the exit. Re-run the
  // reachability BFS pair (rules 6/7) on the descent-only subgraph (all side
  // nodes removed). Errors are prefixed "descent-only: " to distinguish them.
  const descentNodes = g.nodes.filter(n => n.side !== true);
  const descentNodesById = new Map<string, ZoneNode>();
  for (const node of descentNodes) descentNodesById.set(node.id, node);
  const descentStart = descentNodesById.get(g.start);
  const descentExitNodes = descentNodes.filter(n => n.type === 'exit');

  if (descentStart) {
    const reachable = new Set<string>();
    const queue: string[] = [descentStart.id];
    reachable.add(descentStart.id);
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentNode = descentNodesById.get(current);
      if (!currentNode) continue;
      for (const nextId of currentNode.next) {
        if (!reachable.has(nextId) && descentNodesById.has(nextId)) {
          reachable.add(nextId);
          queue.push(nextId);
        }
      }
    }
    for (const node of descentNodes) {
      if (!reachable.has(node.id)) {
        errors.push(`descent-only: node "${node.id}" is unreachable from start`);
      }
    }
  }

  if (descentExitNodes.length === 1) {
    const exitId = descentExitNodes[0].id;
    const reverseEdges = new Map<string, string[]>();
    for (const node of descentNodes) {
      for (const targetId of node.next) {
        if (!descentNodesById.has(targetId)) continue;
        if (!reverseEdges.has(targetId)) reverseEdges.set(targetId, []);
        reverseEdges.get(targetId)!.push(node.id);
      }
    }
    const canReachExit = new Set<string>();
    const queue: string[] = [exitId];
    canReachExit.add(exitId);
    while (queue.length > 0) {
      const current = queue.shift()!;
      const predecessors = reverseEdges.get(current) ?? [];
      for (const predId of predecessors) {
        if (!canReachExit.has(predId)) {
          canReachExit.add(predId);
          queue.push(predId);
        }
      }
    }
    for (const node of descentNodes) {
      if (!canReachExit.has(node.id)) {
        errors.push(`descent-only: exit is not reachable from node "${node.id}"`);
      }
    }
  }

  return errors;
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

/**
 * Localized zone packs, keyed by locale then zone id. Only zone×locale
 * combinations that exist on disk are present here; missing entries fall
 * back to the English pack in ZONE_MAP (per-zone fallback), e.g. `vi` has
 * no `void-beyond` pack yet.
 */
const ZONE_LOCALE_MAP: Record<string, Record<string, ZoneData>> = {
  es: {
    'sunken-crypt': sunkenCryptEs as unknown as ZoneData,
    'ashen-crypts': ashenCryptsEs as unknown as ZoneData,
    'frozen-gallery': frozenGalleryEs as unknown as ZoneData,
    'living-tomb': livingTombEs as unknown as ZoneData,
    'void-beyond': voidBeyondEs as unknown as ZoneData,
  },
  ja: {
    'sunken-crypt': sunkenCryptJa as unknown as ZoneData,
    'ashen-crypts': ashenCryptsJa as unknown as ZoneData,
    'frozen-gallery': frozenGalleryJa as unknown as ZoneData,
    'living-tomb': livingTombJa as unknown as ZoneData,
    'void-beyond': voidBeyondJa as unknown as ZoneData,
  },
  ko: {
    'sunken-crypt': sunkenCryptKo as unknown as ZoneData,
    'ashen-crypts': ashenCryptsKo as unknown as ZoneData,
    'frozen-gallery': frozenGalleryKo as unknown as ZoneData,
    'living-tomb': livingTombKo as unknown as ZoneData,
    'void-beyond': voidBeyondKo as unknown as ZoneData,
  },
  'pt-BR': {
    'sunken-crypt': sunkenCryptPtBR as unknown as ZoneData,
    'ashen-crypts': ashenCryptsPtBR as unknown as ZoneData,
    'frozen-gallery': frozenGalleryPtBR as unknown as ZoneData,
    'living-tomb': livingTombPtBR as unknown as ZoneData,
    'void-beyond': voidBeyondPtBR as unknown as ZoneData,
  },
  'zh-TW': {
    'sunken-crypt': sunkenCryptZhTW as unknown as ZoneData,
    'ashen-crypts': ashenCryptsZhTW as unknown as ZoneData,
    'frozen-gallery': frozenGalleryZhTW as unknown as ZoneData,
    'living-tomb': livingTombZhTW as unknown as ZoneData,
    'void-beyond': voidBeyondZhTW as unknown as ZoneData,
  },
  vi: {
    'sunken-crypt': sunkenCryptVi as unknown as ZoneData,
    'ashen-crypts': ashenCryptsVi as unknown as ZoneData,
    'frozen-gallery': frozenGalleryVi as unknown as ZoneData,
    'living-tomb': livingTombVi as unknown as ZoneData,
    // 'void-beyond' intentionally omitted — no vi pack on disk yet.
  },
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Load a zone by ID. Returns the localized pack for the current locale
 * (falling back to English per-zone if no localized pack exists), or
 * throws for an unknown zone id.
 */
export function loadZone(zoneId: string): ZoneData {
  const zone = ZONE_LOCALE_MAP[getLocale()]?.[zoneId] ?? ZONE_MAP[zoneId];
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
