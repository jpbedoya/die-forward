import { generateDungeon, getTierForRoom } from '../content';
import { loadZone, listZoneIds, getZoneDepth } from '../zone-loader';
import { createRunRng } from '../seeded-random';

describe('generateDungeon', () => {
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
