import { nextChoices, declinedBranches, trailRows, isSideNode, gateStatus } from '../traversal';
import { generateDungeonGraph } from '../content';
import type { DungeonNode } from '../content';
import { createRunRng } from '../seeded-random';
import * as zoneLoader from '../zone-loader';

const g = generateDungeonGraph('sunken-crypt', createRunRng('t1'));

it('nextChoices returns the target nodes of the current node', () => {
  const c = nextChoices(g, g.startId);
  expect(c.length).toBeGreaterThanOrEqual(1);
  for (const n of c) expect(n.depth).toBe(g.nodes[g.startId].depth + 1);
});

it('nextChoices returns [] for an unknown node', () => {
  expect(nextChoices(g, 'does-not-exist')).toEqual([]);
});

it('declinedBranches lists siblings not taken', () => {
  const first = g.nodes[g.startId].next;
  if (first.length >= 2) {
    const path = [g.startId, first[0]];
    expect(declinedBranches(g, path).map((d) => d.nodeId)).toContain(first[1]);
  }
});

it('declinedBranches is empty for a single-step path with no siblings', () => {
  // A path that only takes the sole edge at each step declines nothing.
  const startNext = g.nodes[g.startId].next;
  if (startNext.length === 1) {
    expect(declinedBranches(g, [g.startId, startNext[0]])).toEqual([]);
  }
});

describe('trailRows', () => {
  it('returns one row per node in path, in order, with matching depth', () => {
    const first = g.nodes[g.startId].next;
    const path = [g.startId, first[0]];
    const rows = trailRows(g, path);
    expect(rows.length).toBe(path.length);
    expect(rows[0].depth).toBe(g.nodes[g.startId].depth);
    expect(rows[1].depth).toBe(g.nodes[first[0]].depth);
  });

  it('row 0 has empty declined', () => {
    const first = g.nodes[g.startId].next;
    const path = [g.startId, first[0]];
    const rows = trailRows(g, path);
    expect(rows[0].declined).toEqual([]);
  });

  it('taken.type/boss reflects the node walked at each step', () => {
    const first = g.nodes[g.startId].next;
    const path = [g.startId, first[0]];
    const rows = trailRows(g, path);
    expect(rows[0].taken.type).toBe(g.nodes[g.startId].type);
    expect(rows[0].taken.boss).toBe(g.nodes[g.startId].boss);
    expect(rows[1].taken.type).toBe(g.nodes[first[0]].type);
  });

  it('declined at row i lists the sibling types not taken at the previous step', () => {
    const first = g.nodes[g.startId].next;
    if (first.length >= 2) {
      const path = [g.startId, first[0]];
      const rows = trailRows(g, path);
      const expectedDeclinedTypes = first
        .filter((id) => id !== first[0])
        .map((id) => g.nodes[id].type);
      expect(rows[1].declined.map((d) => d.type)).toEqual(expectedDeclinedTypes);
    }
  });

  it('is deterministic across repeated calls', () => {
    const first = g.nodes[g.startId].next;
    const path = [g.startId, first[0]];
    expect(trailRows(g, path)).toEqual(trailRows(g, path));
  });

  it('skips unknown ids defensively instead of throwing', () => {
    const first = g.nodes[g.startId].next;
    const path = [g.startId, 'does-not-exist', first[0]];
    expect(() => trailRows(g, path)).not.toThrow();
    const rows = trailRows(g, path);
    expect(rows.length).toBe(2);
    expect(rows.map((r) => r.depth)).toEqual([g.nodes[g.startId].depth, g.nodes[first[0]].depth]);
  });
});

// Minimal DungeonNode factory — only the fields the traversal helpers read.
function node(partial: Partial<DungeonNode>): DungeonNode {
  return {
    id: 'n',
    type: 'explore',
    template: 'x',
    content: {} as DungeonNode['content'],
    depth: 1,
    next: [],
    ...partial,
  } as DungeonNode;
}

describe('isSideNode', () => {
  it('is true when node.side === true', () => {
    expect(isSideNode(node({ side: true }))).toBe(true);
  });
  it('is false when node.side is absent or false', () => {
    expect(isSideNode(node({}))).toBe(false);
    expect(isSideNode(node({ side: false }))).toBe(false);
  });
});

describe('gateStatus', () => {
  it("is 'ungated' when the node has no gate field", () => {
    expect(gateStatus(node({ side: true }), [])).toBe('ungated');
    expect(gateStatus(node({ side: true }), [{ name: 'Torch' }])).toBe('ungated');
  });
  it("is 'open' when the gate item is present in inventory by exact name", () => {
    const n = node({ side: true, gate: { item: 'Rusted Key', consumes: true } });
    expect(gateStatus(n, [{ name: 'Rusted Key' }])).toBe('open');
  });
  it("is 'locked' when the gate item is absent from inventory", () => {
    const n = node({ side: true, gate: { item: 'Rusted Key', consumes: true } });
    expect(gateStatus(n, [])).toBe('locked');
    expect(gateStatus(n, [{ name: 'rusted key' }])).toBe('locked'); // exact-name only
  });
});

describe('generateDungeonGraph side/gate passthrough', () => {
  // Fixture choice: no shipped zone authors a side node yet, so we spy on
  // loadZone and hand generateDungeonGraph a synthetic zone that reuses the
  // real sunken-crypt content data (so rollNodeContent has real rooms to roll
  // from) but swaps in a tiny graph containing one gated side node. This
  // exercises the exact ZoneNode -> DungeonNode copy path in production code.
  it('copies side and gate from ZoneNode onto the generated DungeonNode', () => {
    const real = zoneLoader.loadZone('sunken-crypt');
    const synthetic = {
      ...real,
      graph: {
        start: 's-start',
        nodes: [
          { id: 's-start', type: 'explore' as const, template: 'x', depth: 1, next: ['s-side', 's-next'] },
          { id: 's-side', type: 'explore' as const, template: 'x', depth: 1, side: true, gate: { item: 'Rusted Key', consumes: true } },
          { id: 's-next', type: 'exit' as const, template: 'x', depth: 2, next: [] },
        ],
      },
    } as unknown as ReturnType<typeof zoneLoader.loadZone>;

    const spy = jest.spyOn(zoneLoader, 'loadZone').mockReturnValue(synthetic);
    try {
      const graph = generateDungeonGraph('sunken-crypt', createRunRng('side-t'));
      const side = graph.nodes['s-side'];
      expect(side.side).toBe(true);
      expect(side.gate).toEqual({ item: 'Rusted Key', consumes: true });
      // Non-side nodes carry no side/gate.
      expect(graph.nodes['s-start'].side).toBeUndefined();
      expect(graph.nodes['s-start'].gate).toBeUndefined();
    } finally {
      spy.mockRestore();
    }
  });
});
