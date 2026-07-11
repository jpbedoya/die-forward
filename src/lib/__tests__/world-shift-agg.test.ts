import {
  aggregateZoneDay,
  buildWorldShiftWrites,
  type ReceiptForAgg,
  type ZoneDayAggregate,
} from '@/lib/world-shift-agg';

const NOW = 1_000_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function death(over: Partial<ReceiptForAgg> = {}): ReceiptForAgg {
  return {
    authId: 'acct-1', walletAddress: 'acct-1', zoneId: 'sunken-crypt',
    outcome: 'dead', nodeId: 'n-1', killedBy: 'bog-lurker', createdAt: NOW - 1000,
    ...over,
  };
}

describe('aggregateZoneDay — A5 integrity', () => {
  const opts = { nowMs: NOW };

  it('ignores non-dead outcomes', () => {
    const r = aggregateZoneDay('sunken-crypt', [death({ outcome: 'cleared' })], opts);
    expect(r.totalReceiptedDeaths).toBe(0);
    expect(r.apexCreatureId).toBeNull();
  });

  it('ignores receipts outside the 24h window', () => {
    const r = aggregateZoneDay('sunken-crypt', [death({ createdAt: NOW - 2 * DAY })], opts);
    expect(r.totalReceiptedDeaths).toBe(0);
  });

  it('ignores other zones', () => {
    const r = aggregateZoneDay('sunken-crypt', [death({ zoneId: 'ashen-crypts' })], opts);
    expect(r.totalReceiptedDeaths).toBe(0);
  });

  it('counts distinct accounts, not raw rows, and caps per account', () => {
    // one account dies 10 times on n-1; per-account cap 3 => counts as 3
    const rows = Array.from({ length: 10 }, () => death({ authId: 'a', walletAddress: 'a' }));
    const r = aggregateZoneDay('sunken-crypt', rows, { nowMs: NOW, perAccountCap: 3, curseNodeThreshold: 10 });
    expect(r.curseNodes).toEqual([]); // capped to 3 distinct-account weight, below 10
  });

  it('marks a curse node when distinct accounts reach the threshold', () => {
    const rows = Array.from({ length: 10 }, (_, i) => death({ authId: `a${i}`, walletAddress: `a${i}` }));
    const r = aggregateZoneDay('sunken-crypt', rows, { nowMs: NOW, curseNodeThreshold: 10 });
    expect(r.curseNodes).toContain('n-1');
  });

  it('picks the architect as the deadliest curse node (tie -> lowest id)', () => {
    const many = (node: string, n: number) =>
      Array.from({ length: n }, (_, i) => death({ nodeId: node, authId: `x${node}${i}`, walletAddress: `x${node}${i}` }));
    const rows = [...many('n-9', 12), ...many('n-2', 12)]; // tie at 12
    const r = aggregateZoneDay('sunken-crypt', rows, { nowMs: NOW, curseNodeThreshold: 10 });
    expect(r.curseNodes.sort()).toEqual(['n-2', 'n-9']);
    expect(r.architectNodeId).toBe('n-2'); // tie broken by lowest id
    expect(r.architectDeaths).toBe(12);
  });

  it('marks an apex creature above apexMinKills, ties -> lowest id', () => {
    const kills = (creature: string, n: number) =>
      Array.from({ length: n }, (_, i) => death({ killedBy: creature, authId: `k${creature}${i}`, walletAddress: `k${creature}${i}` }));
    const rows = [...kills('wraith', 3), ...kills('ghoul', 3)]; // tie
    const r = aggregateZoneDay('sunken-crypt', rows, { nowMs: NOW, apexMinKills: 3 });
    expect(r.apexCreatureId).toBe('ghoul'); // 'ghoul' < 'wraith'
    expect(r.apexKills).toBe(3);
  });

  it('returns null apex below apexMinKills', () => {
    const r = aggregateZoneDay('sunken-crypt', [death(), death({ authId: 'b', walletAddress: 'b' })], { nowMs: NOW, apexMinKills: 3 });
    expect(r.apexCreatureId).toBeNull();
  });

  it('anonymous (null-id) receipts share one bucket and cannot inflate counts', () => {
    const rows = Array.from({ length: 20 }, () => death({ authId: null, walletAddress: null }));
    const r = aggregateZoneDay('sunken-crypt', rows, { nowMs: NOW, perAccountCap: 3, curseNodeThreshold: 10 });
    expect(r.curseNodes).toEqual([]); // all collapse to one capped bucket
  });
});

describe('buildWorldShiftWrites — idempotent upsert', () => {
  const agg: ZoneDayAggregate = {
    apexCreatureId: 'bog-lurker', apexKills: 4, curseNodes: ['n-1'],
    architectNodeId: 'n-1', architectDeaths: 11, totalReceiptedDeaths: 15,
  };
  let counter = 0;
  const newId = () => `id-${counter++}`;

  it('creates a new row when none exists for (dayKey, zoneId)', () => {
    const plans = buildWorldShiftWrites('2026-07-10', { 'sunken-crypt': agg }, [], newId, 123);
    expect(plans).toHaveLength(1);
    expect(plans[0].isNew).toBe(true);
    expect(plans[0].fields.zoneId).toBe('sunken-crypt');
    expect(plans[0].fields.apexCreatureId).toBe('bog-lurker');
    expect(plans[0].fields.dayKey).toBe('2026-07-10');
  });

  it('reuses the existing row id for the same (dayKey, zoneId) — idempotent re-run', () => {
    const existing = [{ id: 'row-x', dayKey: '2026-07-10', zoneId: 'sunken-crypt' }];
    const plans = buildWorldShiftWrites('2026-07-10', { 'sunken-crypt': agg }, existing, () => 'should-not-be-used', 123);
    expect(plans[0].rowId).toBe('row-x');
    expect(plans[0].isNew).toBe(false);
  });
});
