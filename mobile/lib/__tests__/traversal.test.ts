import { nextChoices, declinedBranches, trailRows } from '../traversal';
import { generateDungeonGraph } from '../content';
import { createRunRng } from '../seeded-random';

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
