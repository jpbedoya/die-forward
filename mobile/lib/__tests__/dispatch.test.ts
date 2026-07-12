import { renderDispatch, selectRegister, type Dispatch } from '../dispatch';
import type { WorldShift, DailyShift, CommunityShift } from '../world-shift';

function daily(over: Partial<DailyShift> = {}): DailyShift {
  return { dayKey: '2026-07-11', zoneId: 'sunken-crypt', modifierPool: [], closedEdges: [], sealedSideNodes: [], ...over };
}
function community(over: Partial<CommunityShift> = {}): CommunityShift {
  return { dayKey: '2026-07-11', zoneId: 'sunken-crypt', apexCreatureId: null, apexKills: 0, curseNodes: [], architectNodeId: null, architectDeaths: 0, echoPhrases: [], architectEntries: [], ...over };
}
function world(d = daily(), c: CommunityShift | null = null): WorldShift { return { ...d, community: c }; }

describe('selectRegister', () => {
  it('is deterministic per dayKey and one of the three registers', () => {
    const r = selectRegister('2026-07-11');
    expect(['warning', 'lament', 'invitation']).toContain(r);
    expect(selectRegister('2026-07-11')).toBe(r); // stable
  });
  it('rotates across days (not all the same)', () => {
    const days = ['2026-07-11','2026-07-12','2026-07-13','2026-07-14','2026-07-15','2026-07-16'];
    const set = new Set(days.map(selectRegister));
    expect(set.size).toBeGreaterThan(1);
  });
});

describe('renderDispatch — scarcity level', () => {
  it('banner when an apex is present', () => {
    const d = renderDispatch(world(daily(), community({ apexCreatureId: 'Bog Lurker', apexKills: 5 })));
    expect(d.level).toBe('banner');
    expect(d.lines.some(l => l.key === 'dispatch.apex' && l.params?.creature === 'Bog Lurker')).toBe(true);
  });
  it('banner when the player died in-zone recently (personal)', () => {
    const d = renderDispatch(world(daily(), null), { diedInZoneRecently: true });
    expect(d.level).toBe('banner');
  });
  it('ambient when only doors moved', () => {
    const d = renderDispatch(world(daily({ sealedSideNodes: ['n-2'] }), null));
    expect(d.level).toBe('ambient');
    expect(d.lines.some(l => l.key === 'dispatch.doors')).toBe(true);
  });
  it('ambient when only cursed nodes exist', () => {
    const d = renderDispatch(world(daily(), community({ curseNodes: ['n-3'] })));
    expect(d.level).toBe('ambient');
    expect(d.lines.some(l => l.key === 'dispatch.cursed')).toBe(true);
  });
  it('silent on a quiet day, still yields one panel line', () => {
    const d = renderDispatch(world(daily(), null));
    expect(d.level).toBe('silent');
    expect(d.lines.length).toBeGreaterThanOrEqual(1);
    expect(d.lines[d.lines.length - 1].key).toBe('dispatch.quiet');
  });
  it('caps at 3 lines and always leads with a register intro', () => {
    const d = renderDispatch(world(daily({ sealedSideNodes: ['a','b'], closedEdges: [{from:'x',to:'y'}] }), community({ apexCreatureId: 'Bog Lurker', curseNodes: ['n-3'] })));
    expect(d.lines.length).toBeLessThanOrEqual(3);
    expect(d.lines[0].key).toBe(`dispatch.register.${d.register}`);
  });
});
