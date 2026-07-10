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

/**
 * One row per traversed node in `path`, for the post-run trail screen:
 * the node taken at that depth, plus the sibling branches that were
 * available at the PREVIOUS step but not walked ("declined"). Row 0 always
 * has an empty `declined` (no previous step to have declined from). Unknown
 * node ids are skipped defensively rather than throwing — the "previous
 * step" for declined-branch purposes is the nearest preceding *known* node.
 */
export function trailRows(
  graph: DungeonGraph,
  path: string[],
): { depth: number; taken: { type: string; boss?: boolean }; declined: { type: string }[] }[] {
  const known = path.filter((id) => !!graph.nodes[id]);
  const rows: { depth: number; taken: { type: string; boss?: boolean }; declined: { type: string }[] }[] = [];

  for (let i = 0; i < known.length; i++) {
    const node = graph.nodes[known[i]];
    const declined: { type: string }[] = [];
    if (i > 0) {
      const prev = graph.nodes[known[i - 1]];
      for (const siblingId of prev.next) {
        if (siblingId === known[i]) continue;
        const sibling = graph.nodes[siblingId];
        if (sibling) declined.push({ type: sibling.type });
      }
    }
    rows.push({ depth: node.depth, taken: { type: node.type, boss: node.boss }, declined });
  }

  return rows;
}

/**
 * True when a node is a same-depth side annex (`side: true`). Side nodes are
 * traversed locally but are invisible to the server room counter — see
 * `advance` in GameContext.
 */
export function isSideNode(node: DungeonNode): boolean {
  return node.side === true;
}

/**
 * Gate state of a node for a given inventory:
 * - `'ungated'` — no `gate` field (the vast majority of nodes).
 * - `'open'`    — gated and the required item is present by EXACT name.
 * - `'locked'`  — gated and the required item is absent.
 * Pure; matches on exact `name` equality (no case folding / fuzzy match).
 */
export function gateStatus(
  node: DungeonNode,
  inventory: { name: string }[],
): 'open' | 'locked' | 'ungated' {
  if (!node.gate) return 'ungated';
  const has = inventory.some((i) => i.name === node.gate!.item);
  return has ? 'open' : 'locked';
}

/**
 * Display resolution for a single branch-choice button, folding together
 * side/gate status and Bone Dust's `revealPaths` reveal into one precedence
 * order so play.tsx has no branching logic of its own:
 *
 *   1. locked gate always wins — `[SEALED]`, never names the required item
 *      (bible: imply, don't explain).
 *   2. `revealPaths` (open gate or ungated) — the concrete `trail.type.<type>`
 *      tag, since Bone Dust shows the dead's true paths.
 *   3. open gate (no reveal) — `[UNSEALED]`.
 *   4. plain side node — `[ASIDE]`.
 *   5. anything else — `undefined`, caller keeps its existing hint tag.
 *
 * `tagOverride` is `undefined` rather than the normal hint tag so callers
 * that already compute a per-type tag (`edgeHint`) know to keep it.
 */
export interface BranchDisplay {
  locked: boolean;
  tagOverride?: string;
  /** Descriptive line shown alongside a locked button (`t('gate.locked')`). */
  note?: string;
  consumesGateItem: boolean;
  gateItem?: string;
}

// `[SEALED]` is a literal marker, not an i18n key — mirrors the existing
// hardcoded `[RISK]` / `[1⚡]` tags in play.tsx rather than going through
// `hint.tag.*` (not in the task's key list; locked state is legible without
// translation, same as those).
const SEALED_TAG = '[SEALED]';

export function resolveBranchDisplay(
  node: DungeonNode,
  inventory: { name: string }[],
  revealPaths: boolean,
): BranchDisplay {
  const status = gateStatus(node, inventory);

  if (status === 'locked') {
    return { locked: true, tagOverride: SEALED_TAG, note: t('gate.locked'), consumesGateItem: false };
  }

  if (revealPaths) {
    return {
      locked: false,
      tagOverride: t(`trail.type.${node.type}`),
      consumesGateItem: status === 'open' && !!node.gate?.consumes,
      gateItem: status === 'open' ? node.gate!.item : undefined,
    };
  }

  if (status === 'open') {
    return {
      locked: false,
      tagOverride: t('hint.tag.unsealed'),
      consumesGateItem: !!node.gate?.consumes,
      gateItem: node.gate!.item,
    };
  }

  if (isSideNode(node)) {
    return { locked: false, tagOverride: t('hint.tag.side'), consumesGateItem: false };
  }

  return { locked: false, consumesGateItem: false };
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
