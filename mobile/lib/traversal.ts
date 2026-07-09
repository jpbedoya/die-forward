import type { DungeonGraph, DungeonNode } from './content';
import type { SeededRng } from './seeded-random';
import { t } from './i18n';

/**
 * Pure traversal helpers over a DungeonGraph. No React / state — safe to unit
 * test in isolation and to reuse from the trail / map screens.
 */

/**
 * The candidate nodes reachable from `nodeId` (its `next` edges resolved to
 * full DungeonNodes). Returns [] for an unknown node or a terminal node.
 */
export function nextChoices(graph: DungeonGraph, nodeId: string): DungeonNode[] {
  const node = graph.nodes[nodeId];
  if (!node) return [];
  return node.next
    .map((id) => graph.nodes[id])
    .filter((n): n is DungeonNode => !!n);
}

/**
 * Given a walked `path` (ordered node ids from start), list the sibling
 * branches that were available at each step but NOT taken — the "roads not
 * travelled" for the trail screen. Each entry is the declined node's id and
 * its depth.
 */
export function declinedBranches(
  graph: DungeonGraph,
  path: string[],
): { atDepth: number; nodeId: string }[] {
  const declined: { atDepth: number; nodeId: string }[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const node = graph.nodes[path[i]];
    if (!node) continue;
    const taken = path[i + 1];
    for (const siblingId of node.next) {
      if (siblingId === taken) continue;
      const sibling = graph.nodes[siblingId];
      if (sibling) declined.push({ atDepth: sibling.depth, nodeId: siblingId });
    }
  }
  return declined;
}

/** Number of authored sense-line variants per node type, `hint.<type>.1..N`. */
const HINT_VARIANT_COUNT = 3;

/**
 * Dual-signal hint for a node: a bible-voice "sense" line (one of a few
 * i18n variants per node type, picked deterministically from the given rng)
 * plus a legible "tag" marker keyed by type and risk (boss combat reads
 * `[DEATH]` instead of `[DANGER]`). Pure — callers own which rng to pass
 * (e.g. a per-node seeded rng so re-renders / replays stay stable).
 */
export function edgeHint(node: DungeonNode, rng: SeededRng): { sense: string; tag: string } {
  const n = rng.range(1, HINT_VARIANT_COUNT);
  const sense = t(`hint.${node.type}.${n}`);
  const tagType = node.type === 'combat' && node.boss ? 'boss' : node.type;
  const tag = t(`hint.tag.${tagType}`);
  return { sense, tag };
}
