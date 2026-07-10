import { generateDungeon, generateDungeonGraph, getTierForRoom } from '../content';
import { loadZone, listZoneIds, getZoneDepth } from '../zone-loader';
import * as zoneLoader from '../zone-loader';
import { createRunRng } from '../seeded-random';

describe('generateDungeon (legacy flat API)', () => {
  it('is deterministic — the same zone + seed produces an identical dungeon', () => {
    const a = generateDungeon('sunken-crypt', createRunRng('run-1'));
    const b = generateDungeon('sunken-crypt', createRunRng('run-1'));
    expect(a).toEqual(b);
  });

  it('different seeds produce different dungeons', () => {
    const a = generateDungeon('sunken-crypt', createRunRng('run-1'));
    const b = generateDungeon('sunken-crypt', createRunRng('run-2'));
    expect(a).not.toEqual(b);
  });

  it('appends an exit room as the final room', () => {
    const d = generateDungeon('sunken-crypt', createRunRng('exit'));
    expect(d[d.length - 1].type).toBe('exit');
  });

  it('has the zone structure length plus the appended exit room', () => {
    const zone = loadZone('sunken-crypt');
    const d = generateDungeon('sunken-crypt', createRunRng('len'));
    expect(d).toHaveLength(zone.dungeonLayout.structure.length + 1);
  });

  it('flags exactly one boss room and gives it an enemy', () => {
    const d = generateDungeon('sunken-crypt', createRunRng('boss'));
    const bossRooms = d.filter(r => r.boss);
    expect(bossRooms).toHaveLength(1);
    expect(bossRooms[0].content.enemy).toBeTruthy();
  });

  it('gives every combat room an enemy and emoji', () => {
    const d = generateDungeon('sunken-crypt', createRunRng('combat'));
    for (const room of d.filter(r => r.type === 'combat')) {
      expect(room.content.enemy).toBeTruthy();
      expect(room.content.enemyEmoji).toBeTruthy();
    }
  });

  it('generates a valid dungeon for every registered zone', () => {
    for (const zoneId of listZoneIds()) {
      const d = generateDungeon(zoneId, createRunRng('zone-' + zoneId));
      expect(d.length).toBeGreaterThan(0);
      expect(d[d.length - 1].type).toBe('exit');
    }
  });
});

describe('generateDungeonGraph', () => {
  it('is deterministic — same zone + seed → identical graph', () => {
    expect(generateDungeonGraph('sunken-crypt', createRunRng('s1')))
      .toEqual(generateDungeonGraph('sunken-crypt', createRunRng('s1')));
  });

  it('different seeds produce different graphs', () => {
    const a = generateDungeonGraph('sunken-crypt', createRunRng('s1'));
    const b = generateDungeonGraph('sunken-crypt', createRunRng('s2'));
    expect(a).not.toEqual(b);
  });

  // Fixture choice: every shipped zone now ships a `graph`, so there is no
  // real legacy (dungeonLayout-only) zone left to exercise this path against.
  // We spy on loadZone and hand generateDungeonGraph a synthetic zone that
  // reuses real sunken-crypt content (so rollNodeContent has real rooms to
  // roll from) but strips the graph field, forcing the legacy linearization
  // branch in generateDungeonGraph. See traversal.test.ts for the same
  // spy/mockRestore pattern.
  it('legacy zones synthesize a linear graph', () => {
    const real = loadZone('sunken-crypt');
    const synthetic = { ...real, graph: undefined } as unknown as ReturnType<typeof loadZone>;
    const spy = jest.spyOn(zoneLoader, 'loadZone').mockReturnValue(synthetic);
    try {
      const g = generateDungeonGraph('sunken-crypt', createRunRng('s1'));
      const n = Object.values(g.nodes);
      expect(n.every(x => x.next.length <= 1)).toBe(true);
      expect(n.filter(x => x.type === 'exit')).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('graph zones: every combat node has an enemy; exactly one boss; maxDepth 13', () => {
    const g = generateDungeonGraph('sunken-crypt', createRunRng('s2'));
    const n = Object.values(g.nodes);
    for (const c of n.filter(x => x.type === 'combat')) expect(c.content.enemy).toBeTruthy();
    expect(n.filter(x => x.boss)).toHaveLength(1);
    expect(g.maxDepth).toBe(13);
  });

  it('graph zones: ashen-crypts (fragment zone) has an enemy on every combat node; exactly one boss; maxDepth 13', () => {
    const g = generateDungeonGraph('ashen-crypts', createRunRng('s2'));
    const n = Object.values(g.nodes);
    for (const c of n.filter(x => x.type === 'combat')) expect(c.content.enemy).toBeTruthy();
    expect(n.filter(x => x.boss)).toHaveLength(1);
    expect(g.maxDepth).toBe(13);
  });

  it('generates a valid graph for every registered zone', () => {
    for (const zoneId of listZoneIds()) {
      const g = generateDungeonGraph(zoneId, createRunRng('graph-' + zoneId));
      const nodes = Object.values(g.nodes);
      expect(nodes.length).toBeGreaterThan(0);
      expect(g.nodes[g.startId]).toBeTruthy();
      const exitNodes = nodes.filter(n => n.type === 'exit');
      expect(exitNodes).toHaveLength(1);
      expect(exitNodes[0].next).toHaveLength(0);
      for (const node of nodes) {
        for (const nextId of node.next) {
          expect(g.nodes[nextId]).toBeTruthy();
        }
      }
    }
  });
});

describe('loadZone', () => {
  it('loads every registered zone', () => {
    for (const id of listZoneIds()) {
      expect(loadZone(id).id).toBeTruthy();
    }
  });

  it('throws on an unknown zone', () => {
    expect(() => loadZone('no-such-zone')).toThrow();
  });

  it('registers 5 zones', () => {
    expect(listZoneIds()).toHaveLength(5);
  });
});

describe('depth lookup', () => {
  it('maps room numbers to the three depth tiers', () => {
    expect(getTierForRoom(1)).toBe(1);
    expect(getTierForRoom(4)).toBe(1);
    expect(getTierForRoom(5)).toBe(2);
    expect(getTierForRoom(8)).toBe(2);
    expect(getTierForRoom(9)).toBe(3);
    expect(getTierForRoom(12)).toBe(3);
  });

  it('getZoneDepth returns a depth whose range covers the room', () => {
    const zone = loadZone('sunken-crypt');
    const depth = getZoneDepth(zone, 1);
    expect(depth.roomRange[0]).toBeLessThanOrEqual(1);
    expect(depth.roomRange[1]).toBeGreaterThanOrEqual(1);
  });
});
