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

const withSide = (): ZoneGraphLayout => ({
  start: 'a',
  nodes: [
    { id: 'a', type: 'explore', template: 'descent', depth: 1, next: ['b', 's'] },
    { id: 's', type: 'cache', template: 'alcove', depth: 1, next: ['b'], side: true, gate: { item: 'Pale Coin', consumes: true } },
    { id: 'b', type: 'combat', template: 'ambush', depth: 2, next: ['c'], boss: true },
    { id: 'c', type: 'exit', template: 'zone-exit', depth: 3, next: [] },
  ],
});

describe('validateZoneGraph: side nodes and gates', () => {
  it('accepts a gated same-depth side node', () => {
    expect(validateZoneGraph(withSide())).toEqual([]);
  });

  it('rejects a same-depth edge into a non-side node', () => {
    const g = withSide();
    delete g.nodes[1].side;
    expect(validateZoneGraph(g).length).toBeGreaterThan(0);
  });

  it('rejects side node chaining into another side node', () => {
    const g = withSide();
    g.nodes.push({ id: 's2', type: 'cache', template: 'alcove', depth: 1, next: ['b'], side: true });
    g.nodes[1].next = ['s2'];
    expect(validateZoneGraph(g).some(e => e.includes('side node chains'))).toBe(true);
  });

  it('rejects gate on a non-side node', () => {
    const g = withSide();
    g.nodes[0].gate = { item: 'Pale Coin', consumes: true };
    expect(validateZoneGraph(g).length).toBeGreaterThan(0);
  });

  it('rejects a graph whose only path to exit runs through a side node', () => {
    const g = withSide();
    g.nodes[0].next = ['s'];
    expect(validateZoneGraph(g).length).toBeGreaterThan(0);
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

  it('has exactly 23 nodes: 21 descent nodes plus 2 gated side chambers', () => {
    const zone = loadZone('sunken-crypt');
    expect(zone.graph!.nodes.length).toBe(23);
    const sideNodes = zone.graph!.nodes.filter(n => n.side === true);
    expect(sideNodes.length).toBe(2);
    const byId = new Map(sideNodes.map(n => [n.id, n]));

    const ferry = byId.get('s01-ferry');
    expect(ferry).toBeDefined();
    expect(ferry!.type).toBe('cache');
    expect(ferry!.template).toBe('alcove');
    expect(ferry!.depth).toBe(4);
    expect(ferry!.gate).toEqual({ item: 'Pale Coin', consumes: true });

    const inscription = byId.get('s02-inscription');
    expect(inscription).toBeDefined();
    expect(inscription!.type).toBe('explore');
    expect(inscription!.template).toBe('chamber');
    expect(inscription!.depth).toBe(8);
    expect(inscription!.gate).toEqual({ item: 'Ancient Scroll', consumes: false });

    // Full graph (including validateZoneGraph's internal descent-only pass,
    // exercised above in "ships a valid graph") confirms both lanes remain
    // fully traversable without the side chambers.
    expect(validateZoneGraph(zone.graph!)).toEqual([]);
  });

  // Documents why combat.tsx's resolved-flow (markNodeResolved) exists: a
  // combat node that forks (>1 next edge) must NOT auto-advance to next[0] on
  // win/flee, or half the map's branch choices would never reach the player.
  it('has at least one forking combat node (drives the resolved-branch flow)', () => {
    const zone = loadZone('sunken-crypt');
    const forkingCombat = zone.graph!.nodes.filter(n => n.type === 'combat' && n.next.length > 1);
    expect(forkingCombat.length).toBeGreaterThanOrEqual(1);
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

describe('ashen-crypts graph', () => {
  it('ships a valid graph using only existing structure templates', () => {
    const zone = loadZone('ashen-crypts');
    expect(zone.graph).toBeDefined();
    expect(validateZoneGraph(zone.graph!)).toEqual([]);
    const known = new Set(zone.dungeonLayout.structure.map(t => t.template).concat('zone-exit'));
    for (const n of zone.graph!.nodes) expect(known.has(n.template)).toBe(true);
    expect(zone.graph!.nodes.length).toBeGreaterThanOrEqual(17);
    expect(Math.max(...zone.graph!.nodes.map(n => n.depth))).toBe(13);
  });

  it('has exactly one gated side chamber (Pale Coin, sealed-alcove)', () => {
    const zone = loadZone('ashen-crypts');
    const sideNodes = zone.graph!.nodes.filter(n => n.side === true);
    expect(sideNodes.length).toBe(1);
    const side = sideNodes[0];
    expect(side.type).toBe('cache');
    expect(side.template).toBe('sealed-alcove');
    expect(side.gate).toEqual({ item: 'Pale Coin', consumes: true });
  });

  it('has exactly one boss (pyre-chamber, depth 12) and one exit (zone-exit, depth 13)', () => {
    const zone = loadZone('ashen-crypts');
    const boss = zone.graph!.nodes.filter(n => n.boss === true);
    expect(boss.length).toBe(1);
    expect(boss[0].template).toBe('pyre-chamber');
    expect(boss[0].depth).toBe(12);
    const exit = zone.graph!.nodes.filter(n => n.type === 'exit');
    expect(exit.length).toBe(1);
    expect(exit[0].template).toBe('zone-exit');
    expect(exit[0].depth).toBe(13);
  });

  it('has an identical graph across all locale packs', () => {
    const zonesDir = path.join(__dirname, '../zones');
    const base = JSON.parse(fs.readFileSync(path.join(zonesDir, 'ashen-crypts.json'), 'utf8'));
    const locales = ['ja', 'ko', 'zh-TW', 'vi', 'pt-BR', 'es'];
    for (const locale of locales) {
      const localized = JSON.parse(fs.readFileSync(path.join(zonesDir, `ashen-crypts.${locale}.json`), 'utf8'));
      expect(localized.graph).toEqual(base.graph);
    }
  });
});

describe('frozen-gallery graph', () => {
  it('ships a valid graph using only existing structure templates', () => {
    const zone = loadZone('frozen-gallery');
    expect(zone.graph).toBeDefined();
    expect(validateZoneGraph(zone.graph!)).toEqual([]);
    const known = new Set(zone.dungeonLayout.structure.map(t => t.template).concat('zone-exit'));
    for (const n of zone.graph!.nodes) expect(known.has(n.template)).toBe(true);
    expect(zone.graph!.nodes.length).toBeGreaterThanOrEqual(17);
    expect(Math.max(...zone.graph!.nodes.map(n => n.depth))).toBe(13);
  });

  it('has exactly one gated side chamber (Ancient Scroll, preserved)', () => {
    const zone = loadZone('frozen-gallery');
    const sideNodes = zone.graph!.nodes.filter(n => n.side === true);
    expect(sideNodes.length).toBe(1);
    const side = sideNodes[0];
    expect(side.type).toBe('corpse');
    expect(side.template).toBe('preserved');
    expect(side.gate).toEqual({ item: 'Ancient Scroll', consumes: false });
  });

  it('has exactly one boss (sovereign, depth 12) and one exit (zone-exit, depth 13)', () => {
    const zone = loadZone('frozen-gallery');
    const boss = zone.graph!.nodes.filter(n => n.boss === true);
    expect(boss.length).toBe(1);
    expect(boss[0].template).toBe('sovereign');
    expect(boss[0].depth).toBe(12);
    const exit = zone.graph!.nodes.filter(n => n.type === 'exit');
    expect(exit.length).toBe(1);
    expect(exit[0].template).toBe('zone-exit');
    expect(exit[0].depth).toBe(13);
  });

  it('has an identical graph across all locale packs', () => {
    const zonesDir = path.join(__dirname, '../zones');
    const base = JSON.parse(fs.readFileSync(path.join(zonesDir, 'frozen-gallery.json'), 'utf8'));
    const locales = ['ja', 'ko', 'zh-TW', 'vi', 'pt-BR', 'es'];
    for (const locale of locales) {
      const localized = JSON.parse(fs.readFileSync(path.join(zonesDir, `frozen-gallery.${locale}.json`), 'utf8'));
      expect(localized.graph).toEqual(base.graph);
    }
  });
});

describe('living-tomb graph', () => {
  it('ships a valid graph using only existing structure templates', () => {
    const zone = loadZone('living-tomb');
    expect(zone.graph).toBeDefined();
    expect(validateZoneGraph(zone.graph!)).toEqual([]);
    const known = new Set(zone.dungeonLayout.structure.map(t => t.template).concat('zone-exit'));
    for (const n of zone.graph!.nodes) expect(known.has(n.template)).toBe(true);
    expect(zone.graph!.nodes.length).toBeGreaterThanOrEqual(17);
    expect(Math.max(...zone.graph!.nodes.map(n => n.depth))).toBe(13);
  });

  it('has exactly one ungated cache side chamber', () => {
    const zone = loadZone('living-tomb');
    const sideNodes = zone.graph!.nodes.filter(n => n.side === true);
    expect(sideNodes.length).toBe(1);
    const side = sideNodes[0];
    expect(side.type).toBe('cache');
    expect(side.template).toBe('cache');
    expect(side.gate).toBeUndefined();
  });

  it('has exactly one boss (combat, depth 12) and one exit (zone-exit, depth 13)', () => {
    const zone = loadZone('living-tomb');
    const boss = zone.graph!.nodes.filter(n => n.boss === true);
    expect(boss.length).toBe(1);
    expect(boss[0].type).toBe('combat');
    expect(boss[0].depth).toBe(12);
    const exit = zone.graph!.nodes.filter(n => n.type === 'exit');
    expect(exit.length).toBe(1);
    expect(exit[0].template).toBe('zone-exit');
    expect(exit[0].depth).toBe(13);
  });

  it('has an identical graph across all locale packs', () => {
    const zonesDir = path.join(__dirname, '../zones');
    const base = JSON.parse(fs.readFileSync(path.join(zonesDir, 'living-tomb.json'), 'utf8'));
    const locales = ['ja', 'ko', 'zh-TW', 'vi', 'pt-BR', 'es'];
    for (const locale of locales) {
      const localized = JSON.parse(fs.readFileSync(path.join(zonesDir, `living-tomb.${locale}.json`), 'utf8'));
      expect(localized.graph).toEqual(base.graph);
    }
  });
});
