import {
  COIN_STAKE_OPTIONS,
  computeCoinEarn,
  computeCoinStakeSettlement,
  nextStreak,
  sealTier,
} from '@/lib/coins';

describe('COIN_STAKE_OPTIONS', () => {
  it('is the fixed [60, 120, 240] ladder', () => {
    expect(COIN_STAKE_OPTIONS).toEqual([60, 120, 240]);
  });
});

describe('computeCoinEarn', () => {
  const base = { cleared: false, firstClearOfZone: false, stakeMode: 'sol' as const };

  it('computes concave depth income: floor(4 * sqrt(min(depth,13)))', () => {
    expect(computeCoinEarn({ ...base, finalDepth: 1 })).toBe(4); // floor(4*1)
    expect(computeCoinEarn({ ...base, finalDepth: 4 })).toBe(8); // floor(4*2)
    expect(computeCoinEarn({ ...base, finalDepth: 9 })).toBe(12); // floor(4*3)
    expect(computeCoinEarn({ ...base, finalDepth: 13 })).toBe(14); // floor(4*3.6055...)=floor(14.422)
  });

  it('is concave: doubling depth from 1->4 does not double the reward, and reward at 13 is well under a naive linear extrapolation from 4', () => {
    const earn1 = computeCoinEarn({ ...base, finalDepth: 1 });
    const earn4 = computeCoinEarn({ ...base, finalDepth: 4 });
    const earn13 = computeCoinEarn({ ...base, finalDepth: 13 });
    expect(earn4).toBeLessThan(earn1 * 4);
    expect(earn13).toBeLessThan(earn4 * 3.25); // 13/4 = 3.25x depth, reward grows far slower
  });

  it('caps depth income at depth 13 — depth beyond 13 earns the same base as depth 13', () => {
    expect(computeCoinEarn({ ...base, finalDepth: 13 })).toBe(14);
    expect(computeCoinEarn({ ...base, finalDepth: 20 })).toBe(14);
    expect(computeCoinEarn({ ...base, finalDepth: 1000 })).toBe(14);
  });

  it('adds +40 for a cleared run', () => {
    expect(computeCoinEarn({ ...base, finalDepth: 4, cleared: true })).toBe(48); // 8 + 40
  });

  it('adds +60 for first clear of zone', () => {
    expect(computeCoinEarn({ ...base, finalDepth: 4, firstClearOfZone: true })).toBe(68); // 8 + 60
  });

  it('stacks cleared and firstClearOfZone bonuses', () => {
    expect(
      computeCoinEarn({ ...base, finalDepth: 4, cleared: true, firstClearOfZone: true }),
    ).toBe(108); // 8 + 40 + 60
  });

  it('earns for every stake mode — earning is universal, staking is separate', () => {
    for (const stakeMode of ['sol', 'coins', 'free'] as const) {
      expect(computeCoinEarn({ ...base, finalDepth: 9, stakeMode })).toBe(12);
    }
  });

  it('never returns negative coins even at depth 0', () => {
    expect(computeCoinEarn({ ...base, finalDepth: 0 })).toBe(0);
  });

  it('guards negative depth by clamping to 0', () => {
    expect(computeCoinEarn({ ...base, finalDepth: -5 })).toBe(0);
  });

  it('guards non-integer depth by flooring before computing', () => {
    // floor(4.7) = 4 -> floor(4*sqrt(4)) = 8
    expect(computeCoinEarn({ ...base, finalDepth: 4.7 })).toBe(8);
  });

  it('guards NaN depth by treating it as 0', () => {
    expect(computeCoinEarn({ ...base, finalDepth: NaN })).toBe(0);
  });

  it('guards non-finite depth (Infinity) by clamping to the depth-13 cap', () => {
    expect(computeCoinEarn({ ...base, finalDepth: Infinity })).toBe(14);
  });
});

describe('computeCoinStakeSettlement', () => {
  it('on death: burns the stake to the pool, player gets nothing back (already deducted at start)', () => {
    const result = computeCoinStakeSettlement({
      coinStake: 60,
      cleared: false,
      bonusPercent: 50,
      poolAvailable: 1000,
    });
    expect(result).toEqual({ playerDelta: 0, poolDelta: 60 });
  });

  it('on death: poolDelta scales with the exact stake burned', () => {
    for (const coinStake of COIN_STAKE_OPTIONS) {
      expect(
        computeCoinStakeSettlement({ coinStake, cleared: false, bonusPercent: 50, poolAvailable: 1000 }),
      ).toEqual({ playerDelta: 0, poolDelta: coinStake });
    }
  });

  it('on victory: returns stake plus bonus, decrements pool only by the bonus', () => {
    const result = computeCoinStakeSettlement({
      coinStake: 60,
      cleared: true,
      bonusPercent: 50,
      poolAvailable: 1000,
    });
    // bonus = floor(60 * 50/100) = 30
    expect(result).toEqual({ playerDelta: 90, poolDelta: -30 });
  });

  it('on victory: floors a fractional bonus', () => {
    const result = computeCoinStakeSettlement({
      coinStake: 60,
      cleared: true,
      bonusPercent: 33,
      poolAvailable: 1000,
    });
    // 60 * 33/100 = 19.8 -> floor 19
    expect(result).toEqual({ playerDelta: 79, poolDelta: -19 });
  });

  it('on victory: caps the bonus at the pool balance', () => {
    const result = computeCoinStakeSettlement({
      coinStake: 240,
      cleared: true,
      bonusPercent: 100,
      poolAvailable: 50,
    });
    // naive bonus = 240, but pool only has 50
    expect(result).toEqual({ playerDelta: 290, poolDelta: -50 });
  });

  it('on victory: an empty pool pays no bonus but still returns the stake', () => {
    const result = computeCoinStakeSettlement({
      coinStake: 120,
      cleared: true,
      bonusPercent: 50,
      poolAvailable: 0,
    });
    expect(result).toEqual({ playerDelta: 120, poolDelta: 0 });
  });

  it('never drives the pool negative: poolDelta magnitude never exceeds poolAvailable', () => {
    const result = computeCoinStakeSettlement({
      coinStake: 240,
      cleared: true,
      bonusPercent: 9999,
      poolAvailable: 5,
    });
    expect(result.poolDelta).toBe(-5);
    expect(result.playerDelta).toBe(245);
  });

  it('guards a negative coinStake by clamping to 0', () => {
    expect(
      computeCoinStakeSettlement({ coinStake: -60, cleared: false, bonusPercent: 50, poolAvailable: 1000 }),
    ).toEqual({ playerDelta: 0, poolDelta: 0 });
    expect(
      computeCoinStakeSettlement({ coinStake: -60, cleared: true, bonusPercent: 50, poolAvailable: 1000 }),
    ).toEqual({ playerDelta: 0, poolDelta: 0 });
  });

  it('guards a negative bonusPercent by clamping to 0 (no negative bonus / player loss)', () => {
    expect(
      computeCoinStakeSettlement({ coinStake: 60, cleared: true, bonusPercent: -50, poolAvailable: 1000 }),
    ).toEqual({ playerDelta: 60, poolDelta: 0 });
  });

  it('guards a negative poolAvailable by clamping to 0', () => {
    expect(
      computeCoinStakeSettlement({ coinStake: 60, cleared: true, bonusPercent: 50, poolAvailable: -10 }),
    ).toEqual({ playerDelta: 60, poolDelta: 0 });
  });

  it('guards non-integer coinStake/poolAvailable by flooring', () => {
    const result = computeCoinStakeSettlement({
      coinStake: 60.9,
      cleared: true,
      bonusPercent: 50,
      poolAvailable: 1000.9,
    });
    // floor(60.9)=60, bonus=floor(60*0.5)=30
    expect(result).toEqual({ playerDelta: 90, poolDelta: -30 });
  });
});

describe('nextStreak', () => {
  it('increments the streak on a coins-mode clear', () => {
    expect(nextStreak({ current: 0, stakeMode: 'coins', cleared: true })).toEqual({
      streak: 1,
      changed: true,
    });
    expect(nextStreak({ current: 5, stakeMode: 'coins', cleared: true })).toEqual({
      streak: 6,
      changed: true,
    });
  });

  it('zeroes the streak on a coins-mode death', () => {
    expect(nextStreak({ current: 5, stakeMode: 'coins', cleared: false })).toEqual({
      streak: 0,
      changed: true,
    });
  });

  it('reports unchanged when a coins-mode death zeroes an already-zero streak', () => {
    expect(nextStreak({ current: 0, stakeMode: 'coins', cleared: false })).toEqual({
      streak: 0,
      changed: false,
    });
  });

  it('leaves non-coin run streaks untouched regardless of outcome', () => {
    expect(nextStreak({ current: 5, stakeMode: 'sol', cleared: true })).toEqual({
      streak: 5,
      changed: false,
    });
    expect(nextStreak({ current: 5, stakeMode: 'sol', cleared: false })).toEqual({
      streak: 5,
      changed: false,
    });
    expect(nextStreak({ current: 5, stakeMode: 'free', cleared: true })).toEqual({
      streak: 5,
      changed: false,
    });
    expect(nextStreak({ current: 5, stakeMode: 'free', cleared: false })).toEqual({
      streak: 5,
      changed: false,
    });
  });

  it('guards a negative current streak by clamping to 0 before applying the transition', () => {
    expect(nextStreak({ current: -3, stakeMode: 'coins', cleared: true })).toEqual({
      streak: 1,
      changed: true,
    });
    expect(nextStreak({ current: -3, stakeMode: 'sol', cleared: true })).toEqual({
      streak: 0,
      changed: true,
    });
  });

  it('guards a non-integer current streak by flooring', () => {
    expect(nextStreak({ current: 5.9, stakeMode: 'coins', cleared: true })).toEqual({
      streak: 6,
      changed: true,
    });
  });
});

describe('sealTier', () => {
  it('tier 0 for streak < 3', () => {
    expect(sealTier(0)).toBe(0);
    expect(sealTier(1)).toBe(0);
    expect(sealTier(2)).toBe(0);
  });

  it('tier 1 for streak 3-6', () => {
    expect(sealTier(3)).toBe(1);
    expect(sealTier(4)).toBe(1);
    expect(sealTier(6)).toBe(1);
  });

  it('tier 2 for streak 7-14', () => {
    expect(sealTier(7)).toBe(2);
    expect(sealTier(10)).toBe(2);
    expect(sealTier(14)).toBe(2);
  });

  it('tier 3 for streak 15+', () => {
    expect(sealTier(15)).toBe(3);
    expect(sealTier(100)).toBe(3);
  });

  it('guards a negative streak by clamping to 0 (tier 0)', () => {
    expect(sealTier(-5)).toBe(0);
  });

  it('guards a non-integer streak by flooring', () => {
    expect(sealTier(6.9)).toBe(1); // floor -> 6, still tier 1
    expect(sealTier(7.0001)).toBe(2);
  });
});
