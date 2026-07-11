/**
 * Daily World Shift
 *
 * Each UTC day, every zone gets a deterministic "shift": a smaller pool of
 * run modifiers in play, some side doors sealed off, and (rarely) one
 * descent edge masked closed. All of it is derived from a single seeded RNG
 * keyed by (dayKey, zoneId), so every player sees the same shift for the
 * same zone on the same day, and it's fully reproducible offline.
 */

import { createRunRng } from './seeded-random';
import { RUN_MODIFIERS } from './modifiers';
import { loadZone, validateZoneGraph, type ZoneGraphLayout, type ZoneNode } from './zone-loader';

export interface DailyShift {
  dayKey: string;
  zoneId: string;
  /** 2-3 RunModifier ids from RUN_MODIFIERS, in play for this zone today. */
  modifierPool: string[];
  /** Descent edges masked closed today ([] if none survived validation). */
  closedEdges: Array<{ from: string; to: string }>;
  /** Side-node ids absent today ([] possible). */
  sealedSideNodes: string[];
}

export interface CommunityShift {
  dayKey: string;
  zoneId: string;
  apexCreatureId: string | null;
  apexKills: number;
  curseNodes: string[];
  architectNodeId: string | null;
  architectDeaths: number;
}

export type WorldShift = DailyShift & { community: CommunityShift | null };

/** Exact display-name match — apexCreatureId holds a creature DISPLAY NAME. */
export function isApexCreature(creatureName: string, community: CommunityShift | null): boolean {
  return !!community && community.apexCreatureId !== null && community.apexCreatureId === creatureName;
}

/** Additive merge — never mutates `daily`; degrades to seeded layer when community is null. */
export function mergeShift(daily: DailyShift, community: CommunityShift | null): WorldShift {
  return { ...daily, community };
}

/**
 * Fetch today's community layer for a zone. Returns null on ANY failure
 * (offline, non-200, parse error, zone/day mismatch) so callers degrade to the
 * seeded layer with no disruption. Never throws.
 */
export async function fetchCommunityShift(
  zoneId: string,
  dayKey: string,
  apiBase: string = process.env.EXPO_PUBLIC_API_URL || '',
): Promise<CommunityShift | null> {
  try {
    const url = `${apiBase}/api/game/shift?zoneId=${encodeURIComponent(zoneId)}&dayKey=${encodeURIComponent(dayKey)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const s = json?.shift;
    if (!s || s.zoneId !== zoneId || s.dayKey !== dayKey) return null;
    return {
      dayKey: s.dayKey,
      zoneId: s.zoneId,
      apexCreatureId: s.apexCreatureId ?? null,
      apexKills: s.apexKills ?? 0,
      curseNodes: Array.isArray(s.curseNodes) ? s.curseNodes : [],
      architectNodeId: s.architectNodeId ?? null,
      architectDeaths: s.architectDeaths ?? 0,
    };
  } catch {
    return null;
  }
}

/** Formats a Date as 'YYYY-MM-DD' using its UTC calendar date. */
export function utcDayKey(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Deep-copies a graph and applies a tentative edge/side-node mask to it. */
function applyMask(
  graph: ZoneGraphLayout,
  closedEdges: Array<{ from: string; to: string }>,
  sealedSideNodes: string[]
): ZoneGraphLayout {
  const sealed = new Set(sealedSideNodes);
  const closed = new Set(closedEdges.map(e => `${e.from}->${e.to}`));
  const nodes: ZoneNode[] = graph.nodes
    .filter(n => !sealed.has(n.id))
    .map(n => ({
      ...n,
      next: n.next.filter(t => !sealed.has(t) && !closed.has(`${n.id}->${t}`)),
    }));
  return { start: graph.start, nodes };
}

/**
 * Computes the deterministic daily shift for a zone.
 *
 * All draws come from ONE `createRunRng(`shift-${dayKey}-${zoneId}`)`, in
 * this FIXED order (changing the order changes every shift ever computed,
 * so don't reorder without a migration plan):
 *   1. shuffle the 6 modifier ids (pool composition)
 *   2. one chance(0.6) draw deciding pool size 3 vs 2
 *   3. per side-node (in graph node order) one chance(0.25) draw deciding
 *      whether that side node is sealed today
 *   4. one chance(0.7) draw deciding whether any edge is closed today at all
 *   5. if an edge is drawn: pick(candidateEdges) to choose which one
 *
 * The mask-validity invariant: the tentative sealedSideNodes + closedEdges
 * are applied to a deep copy of the zone graph and run through
 * validateZoneGraph. If that still reports errors, closedEdges is dropped
 * (set to []) and revalidated with sealed side nodes alone; if THAT still
 * fails, sealedSideNodes is also dropped. A shift may never break a zone's
 * graph — worst case it degrades to a pool-only shift with empty masks.
 */
export function getDailyShift(zoneId: string, dayKey: string): DailyShift {
  const rng = createRunRng(`shift-${dayKey}-${zoneId}`);

  // 1 & 2: modifier pool.
  const shuffled = rng.shuffle(RUN_MODIFIERS.map(m => m.id));
  const poolSize = rng.chance(0.6) ? 3 : 2;
  const modifierPool = shuffled.slice(0, poolSize);

  const zone = loadZone(zoneId);
  const graph = zone.graph;

  if (!graph) {
    return { dayKey, zoneId, modifierPool, closedEdges: [], sealedSideNodes: [] };
  }

  // 3: side-node seal draws, in graph node order.
  const sideNodes = graph.nodes.filter(n => n.side === true);
  let sealedSideNodes: string[] = [];
  for (const node of sideNodes) {
    if (rng.chance(0.25)) {
      sealedSideNodes.push(node.id);
    }
  }
  // Never seal every side node of a zone: keep the first unsealed.
  if (sideNodes.length > 0 && sealedSideNodes.length === sideNodes.length) {
    sealedSideNodes = sealedSideNodes.filter(id => id !== sideNodes[0].id);
  }

  // 4 & 5: at most one candidate edge closed today.
  let closedEdges: Array<{ from: string; to: string }> = [];
  if (rng.chance(0.7)) {
    const nodesById = new Map(graph.nodes.map(n => [n.id, n]));
    const candidates: Array<{ from: string; to: string }> = [];
    for (const node of graph.nodes) {
      if (node.next.length < 2) continue;
      for (const targetId of node.next) {
        const target = nodesById.get(targetId);
        if (!target) continue;
        if (target.side || target.boss || target.type === 'exit') continue;
        candidates.push({ from: node.id, to: targetId });
      }
    }
    if (candidates.length > 0) {
      closedEdges = [rng.pick(candidates)];
    }
  }

  // Degradation ladder: never let the shift break the zone graph.
  const maskedWithBoth = applyMask(graph, closedEdges, sealedSideNodes);
  if (validateZoneGraph(maskedWithBoth).length > 0) {
    closedEdges = [];
    const maskedSealsOnly = applyMask(graph, closedEdges, sealedSideNodes);
    if (validateZoneGraph(maskedSealsOnly).length > 0) {
      sealedSideNodes = [];
    }
  }

  return { dayKey, zoneId, modifierPool, closedEdges, sealedSideNodes };
}
