import type { DungeonGraph, DungeonNode } from './content';

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
