import { validateZoneGraph, ZoneGraphLayout } from '../zone-loader';

const tiny = (over: Partial<ZoneGraphLayout> = {}): ZoneGraphLayout => ({
  start: 'a',
  nodes: [
    { id: 'a', type: 'explore', template: 'descent', depth: 1, next: ['b1', 'b2'] },
    { id: 'b1', type: 'combat', template: 'ambush', depth: 2, next: ['c'], boss: true },
    { id: 'b2', type: 'cache', template: 'alcove', depth: 2, next: ['c'] },
    { id: 'c', type: 'exit', template: 'zone-exit', depth: 3, next: [] },
  ],
  ...over,
});

describe('validateZoneGraph', () => {
  it('accepts a well-formed graph', () => expect(validateZoneGraph(tiny())).toEqual([]));
  it('rejects an edge that skips a depth', () => {
    const g = tiny(); g.nodes[0].next = ['c'];
    expect(validateZoneGraph(g).some(e => e.includes('depth'))).toBe(true);
  });
  it('rejects unreachable nodes', () => {
    const g = tiny(); g.nodes[0].next = ['b1'];
    expect(validateZoneGraph(g).some(e => e.includes('unreachable'))).toBe(true);
  });
  it('rejects a dead-end non-exit node', () => {
    const g = tiny(); g.nodes[1].next = [];
    expect(validateZoneGraph(g).length).toBeGreaterThan(0);
  });
  it('requires exactly one boss', () => {
    const g = tiny(); delete g.nodes[1].boss;
    expect(validateZoneGraph(g).some(e => e.includes('boss'))).toBe(true);
  });
});
