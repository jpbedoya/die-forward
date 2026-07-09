import { nextChoices, declinedBranches } from '../traversal';
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
