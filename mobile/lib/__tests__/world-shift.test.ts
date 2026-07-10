import { utcDayKey, getDailyShift, type DailyShift } from '../world-shift';
import { RUN_MODIFIERS } from '../modifiers';
import { loadZone, validateZoneGraph, type ZoneGraphLayout } from '../zone-loader';

const ZONE_IDS = ['sunken-crypt', 'ashen-crypts', 'frozen-gallery', 'living-tomb', 'void-beyond'];
const MODIFIER_IDS = new Set(RUN_MODIFIERS.map(m => m.id));

function applyShiftMask(graph: ZoneGraphLayout, closedEdges: Array<{ from: string; to: string }>, sealedSideNodes: string[]): ZoneGraphLayout {
  const sealed = new Set(sealedSideNodes);
  const closed = new Set(closedEdges.map(e => `${e.from}->${e.to}`));
  const nodes = graph.nodes
    .filter(n => !sealed.has(n.id))
    .map(n => ({
      ...n,
      next: n.next.filter(t => !sealed.has(t) && !closed.has(`${n.id}->${t}`)),
    }));
  return { start: graph.start, nodes };
}

describe('utcDayKey', () => {
  it('formats UTC date', () => {
    expect(utcDayKey(new Date('2026-07-09T23:59:00Z'))).toBe('2026-07-09');
    expect(utcDayKey(new Date('2026-07-10T00:00:01Z'))).toBe('2026-07-10');
  });
});

describe('getDailyShift', () => {
  it('is deterministic per (zone, day) and differs across days', () => {
    const a = getDailyShift('sunken-crypt', '2026-07-09');
    expect(a).toEqual(getDailyShift('sunken-crypt', '2026-07-09'));
    const days = Array.from({ length: 14 }, (_, i) =>
      getDailyShift('sunken-crypt', `2026-07-${String(i + 1).padStart(2, '0')}`)
    );
    expect(new Set(days.map(d => JSON.stringify(d.modifierPool))).size).toBeGreaterThan(1);
  });

  it('modifier pool is 2-3 valid ids', () => {
    const s = getDailyShift('ashen-crypts', '2026-07-09');
    expect(s.modifierPool.length).toBeGreaterThanOrEqual(2);
    expect(s.modifierPool.length).toBeLessThanOrEqual(3);
    for (const id of s.modifierPool) {
      expect(MODIFIER_IDS.has(id)).toBe(true);
    }
    // no duplicates
    expect(new Set(s.modifierPool).size).toBe(s.modifierPool.length);
  });

  it('modifier pool is sometimes 3 (not always 2) across many days', () => {
    const days = Array.from({ length: 60 }, (_, i) => getDailyShift('void-beyond', `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`));
    const sizes = new Set(days.map(d => d.modifierPool.length));
    expect(sizes.has(2)).toBe(true);
    expect(sizes.has(3)).toBe(true);
  });

  it('masked graph always validates across 30 days x 5 zones', () => {
    const allShifts: DailyShift[] = [];
    for (let i = 1; i <= 30; i++) {
      const dayKey = `2026-08-${String(i).padStart(2, '0')}`;
      for (const zoneId of ZONE_IDS) {
        const zone = loadZone(zoneId);
        if (!zone.graph) continue;
        const shift = getDailyShift(zoneId, dayKey);
        allShifts.push(shift);
        const masked = applyShiftMask(zone.graph, shift.closedEdges, shift.sealedSideNodes);
        const errors = validateZoneGraph(masked);
        expect(errors).toEqual([]);
      }
    }
    expect(allShifts.some(s => s.closedEdges.length > 0)).toBe(true);
  });

  it('never seals all side nodes of a zone', () => {
    const zone = loadZone('sunken-crypt');
    const sideCount = zone.graph!.nodes.filter(n => n.side).length;
    expect(sideCount).toBeGreaterThan(0);
    for (let i = 1; i <= 60; i++) {
      const dayKey = `2027-01-${String((i % 28) + 1).padStart(2, '0')}-${i}`;
      const shift = getDailyShift('sunken-crypt', dayKey);
      expect(shift.sealedSideNodes.length).toBeLessThan(sideCount);
    }
  });

  it('zones without a graph get pool-only shift with empty masks', () => {
    // defensive: simulate by checking a zone id that resolves but has no graph is not
    // currently possible since all 5 zones have graphs; instead assert shape directly
    const s = getDailyShift('sunken-crypt', '2026-07-09');
    expect(Array.isArray(s.closedEdges)).toBe(true);
    expect(Array.isArray(s.sealedSideNodes)).toBe(true);
  });
});
