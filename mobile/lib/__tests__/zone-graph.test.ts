import { validateZoneGraph, ZoneGraphLayout, loadZone } from '../zone-loader';
import fs from 'fs';
import path from 'path';

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

describe('sunken-crypt graph', () => {
  it('ships a valid graph using only existing templates', () => {
    const zone = loadZone('sunken-crypt');
    expect(zone.graph).toBeDefined();
    expect(validateZoneGraph(zone.graph!)).toEqual([]);
    const known = new Set(Object.values(zone.rooms!).flat().map(t => t.template).concat('zone-exit'));
    for (const n of zone.graph!.nodes) expect(known.has(n.template)).toBe(true);
    expect(zone.graph!.nodes.length).toBeGreaterThanOrEqual(18);
    expect(Math.max(...zone.graph!.nodes.map(n => n.depth))).toBe(13);
  });

  it('has an identical graph across all locale packs', () => {
    const zonesDir = path.join(__dirname, '../zones');
    const base = JSON.parse(fs.readFileSync(path.join(zonesDir, 'sunken-crypt.json'), 'utf8'));
    const locales = ['ja', 'ko', 'zh-TW', 'vi', 'pt-BR', 'es'];
    for (const locale of locales) {
      const localized = JSON.parse(fs.readFileSync(path.join(zonesDir, `sunken-crypt.${locale}.json`), 'utf8'));
      expect(localized.graph).toEqual(base.graph);
    }
  });
});
