import { edgeHint } from '../traversal';
import { generateDungeonGraph } from '../content';
import { createRunRng } from '../seeded-random';

it('every node type yields a sense line and a tag', () => {
  const g = generateDungeonGraph('sunken-crypt', createRunRng('h1'));
  for (const n of Object.values(g.nodes)) {
    const h = edgeHint(n, createRunRng('h2'));
    expect(h.sense.length).toBeGreaterThan(0);
    expect(h.tag).toMatch(/^\[.+\]$/);
  }
});

it('hints are deterministic per node+seed', () => {
  const g = generateDungeonGraph('sunken-crypt', createRunRng('h1'));
  const n = g.nodes[g.startId];
  expect(edgeHint(n, createRunRng('x'))).toEqual(edgeHint(n, createRunRng('x')));
});
