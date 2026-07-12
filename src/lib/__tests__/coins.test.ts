import {
  COIN_STAKE_OPTIONS,
  buildRunReceipt,
  classifyStaleCoinCleanup,
  classifyVictorySettlement,
  computeCoinEarn,
  computeCoinStakeSettlement,
  nextStreak,
  resolveStakeMode,
  sealTier,
  validateCoinStakeRequest,
} from '@/lib/coins';

describe('classifyVictorySettlement', () => {
  it('routes a Coin-Bound victory (stakeAmount 0) to coins_settle, NOT free_mode — the dead-code regression', () => {
    // The exact bug: a coins run has stakeAmount === 0, so a naive free-mode
    // check swallows it. Coins MUST reach its settlement.
    expect(
      classifyVictorySettlement({ stakeAmount: 0, stakeMode: 'coins' }),
    ).toBe('coins_settle');
  });

  it('routes coins to coins_settle even if demo/agent flags are set', () => {
    expect(
      classifyVictorySettlement({ stakeAmount: 0, stakeMode: 'coins', demoMode: true }),
    ).toBe('coins_settle');
    expect(
      classifyVictorySettlement({ stakeAmount: 0, stakeMode: 'coins', isAgent: true }),
    ).toBe('coins_settle');
  });

  it('routes a genuine SOL-staked run to sol_payout', () => {
    expect(
      classifyVictorySettlement({ stakeAmount: 0.5, stakeMode: 'sol' }),
    ).toBe('sol_payout');
  });

  it('routes demo, agent-free, and legacy zero-SOL non-coins runs to free_mode', () => {
    expect(
      classifyVictorySettlement({ stakeAmount: 0.5, stakeMode: 'sol', demoMode: true }),
    ).toBe('free_mode');
    expect(
      classifyVictorySettlement({ stakeAmount: 0, stakeMode: 'free', isAgent: true }),
    ).toBe('free_mode');
    expect(
      classifyVictorySettlement({ stakeAmount: 0, stakeMode: 'sol' }),
    ).toBe('free_mode');
  });
});

describe('classifyStaleCoinCleanup', () => {
  it('RETURNS the stake (no bonus) for a cleared-but-unclaimed coin win — the CRITICAL destruction bug', () => {
    // Reached the exit (currentRoom >= maxRooms) but never claimed → this is a
    // WIN. The stake must come BACK to the player, never be burned/destroyed.
    expect(
      classifyStaleCoinCleanup({ stakeMode: 'coins', coinStake: 60, currentRoom: 13, maxRooms: 13 }),
    ).toEqual({ kind: 'cleared_unclaimed', playerCoinDelta: 60, poolDelta: 0, resetStreak: false });
  });

  it('burns the stake to the pool AND resets the streak for an abandoned mid-run (F6)', () => {
    expect(
      classifyStaleCoinCleanup({ stakeMode: 'coins', coinStake: 120, currentRoom: 5, maxRooms: 13 }),
    ).toEqual({ kind: 'abandoned', playerCoinDelta: 0, poolDelta: 120, resetStreak: true });
  });

  it('is a no-op for non-coin runs', () => {
    expect(
      classifyStaleCoinCleanup({ stakeMode: 'sol', coinStake: 0, currentRoom: 3, maxRooms: 13 }),
    ).toEqual({ kind: 'none', playerCoinDelta: 0, poolDelta: 0, resetStreak: false });
    expect(
      classifyStaleCoinCleanup({ stakeMode: 'free', coinStake: 0, currentRoom: 13, maxRooms: 13 }),
    ).toEqual({ kind: 'none', playerCoinDelta: 0, poolDelta: 0, resetStreak: false });
  });

  it('is a no-op when stakeMode is coins but no coins were actually staked', () => {
    expect(
      classifyStaleCoinCleanup({ stakeMode: 'coins', coinStake: 0, currentRoom: 5, maxRooms: 13 }),
    ).toEqual({ kind: 'none', playerCoinDelta: 0, poolDelta: 0, resetStreak: false });
  });

  it('applies default room bounds (1 / 13) when currentRoom/maxRooms are missing', () => {
    // No room info → defaults to currentRoom 1 < maxRooms 13 → abandoned.
    expect(
      classifyStaleCoinCleanup({ stakeMode: 'coins', coinStake: 60 }),
    ).toEqual({ kind: 'abandoned', playerCoinDelta: 0, poolDelta: 60, resetStreak: true });
  });

  it('guards malformed numeric inputs (negative/NaN/fractional coinStake)', () => {
    expect(classifyStaleCoinCleanup({ stakeMode: 'coins', coinStake: -60, currentRoom: 5, maxRooms: 13 }).kind).toBe('none');
    expect(classifyStaleCoinCleanup({ stakeMode: 'coins', coinStake: NaN, currentRoom: 5, maxRooms: 13 }).kind).toBe('none');
    // Fractional stake floors to an integer before deciding.
    expect(
      classifyStaleCoinCleanup({ stakeMode: 'coins', coinStake: 60.9, currentRoom: 13, maxRooms: 13 }),
    ).toEqual({ kind: 'cleared_unclaimed', playerCoinDelta: 60, poolDelta: 0, resetStreak: false });
  });
});

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

describe('buildRunReceipt', () => {
  const full = {
    sessionId: 'sess-1',
    sessionToken: 'tok-abc',
    authId: 'auth-1',
    walletAddress: 'wallet-1',
    zoneId: 'sunken-crypt',
    runSeed: 'deadbeef',
    seedSource: 'vrf',
    serverDayKey: '2026-07-10',
    dailyShiftEnabled: true,
    chosenModifierId: 'mod-1',
    stakeMode: 'coins' as const,
    coinStake: 120,
    outcome: 'dead' as const,
    finalDepth: 7,
    killedBy: 'bog-lurker',
    nodeId: 'n-4',
    finalMessage: 'i should not have come here',
    coinDelta: 34,
    streakAfter: 0,
    createdAt: 1_700_000_000_000,
  };

  it('maps every field through unchanged when all are provided', () => {
    expect(buildRunReceipt(full)).toEqual(full);
  });

  it('defaults optional identity/context fields to null when omitted', () => {
    const receipt = buildRunReceipt({
      sessionId: 'sess-2',
      sessionToken: 'tok-2',
      outcome: 'dead',
      finalDepth: 3,
      coinDelta: 0,
      streakAfter: 0,
      createdAt: 123,
    });
    expect(receipt.authId).toBeNull();
    expect(receipt.walletAddress).toBeNull();
    expect(receipt.zoneId).toBeNull();
    expect(receipt.runSeed).toBeNull();
    expect(receipt.seedSource).toBeNull();
    expect(receipt.serverDayKey).toBeNull();
    expect(receipt.dailyShiftEnabled).toBeNull();
    expect(receipt.chosenModifierId).toBeNull();
  });

  it('defaults stakeMode to "sol" and coinStake to 0 when omitted', () => {
    const receipt = buildRunReceipt({
      sessionId: 'sess-3',
      sessionToken: 'tok-3',
      outcome: 'cleared',
      finalDepth: 13,
      coinDelta: 54,
      streakAfter: 2,
      createdAt: 456,
    });
    expect(receipt.stakeMode).toBe('sol');
    expect(receipt.coinStake).toBe(0);
  });

  it('preserves falsy-but-meaningful values (coinStake 0, dailyShiftEnabled false, streakAfter 0)', () => {
    const receipt = buildRunReceipt({
      ...full,
      coinStake: 0,
      dailyShiftEnabled: false,
      streakAfter: 0,
      coinDelta: 0,
    });
    expect(receipt.coinStake).toBe(0);
    expect(receipt.dailyShiftEnabled).toBe(false);
    expect(receipt.streakAfter).toBe(0);
    expect(receipt.coinDelta).toBe(0);
  });

  it('carries the outcome verbatim for all terminal states', () => {
    expect(buildRunReceipt({ ...full, outcome: 'dead' }).outcome).toBe('dead');
    expect(buildRunReceipt({ ...full, outcome: 'cleared' }).outcome).toBe('cleared');
    expect(buildRunReceipt({ ...full, outcome: 'abandoned' }).outcome).toBe('abandoned');
  });

  it('builds a victory-shape receipt: cleared outcome with a positive coinDelta and advanced streak', () => {
    const receipt = buildRunReceipt({
      ...full,
      outcome: 'cleared',
      finalDepth: 13,
      coinDelta: 108 + 90, // earn (48+60 first clear) + stake-return+bonus (60+30)
      streakAfter: 3,
    });
    expect(receipt.outcome).toBe('cleared');
    expect(receipt.finalDepth).toBe(13);
    expect(receipt.coinDelta).toBe(198);
    expect(receipt.streakAfter).toBe(3);
  });

  it('builds an abandoned-shape receipt: burned coin stake, no coins granted, streak unchanged', () => {
    const receipt = buildRunReceipt({
      ...full,
      outcome: 'abandoned',
      stakeMode: 'coins',
      coinStake: 120,
      coinDelta: 0,
      streakAfter: 0,
    });
    expect(receipt.outcome).toBe('abandoned');
    expect(receipt.coinStake).toBe(120);
    expect(receipt.coinDelta).toBe(0);
  });
});

describe('buildRunReceipt killedBy/nodeId', () => {
  const base = {
    sessionId: 's1', sessionToken: 't1', authId: 'wallet-abc', walletAddress: 'wallet-abc',
    zoneId: 'sunken-crypt', runSeed: 'seed', seedSource: 'legacy', serverDayKey: '2026-07-10',
    dailyShiftEnabled: true, chosenModifierId: null, stakeMode: 'free' as const, coinStake: 0,
    outcome: 'dead' as const, finalDepth: 7, coinDelta: 0, streakAfter: 0, createdAt: 1,
  };
  it('records killedBy and nodeId when provided', () => {
    const r = buildRunReceipt({ ...base, killedBy: 'bog-lurker', nodeId: 'n-4' });
    expect(r.killedBy).toBe('bog-lurker');
    expect(r.nodeId).toBe('n-4');
  });
  it('defaults killedBy and nodeId to null when omitted', () => {
    const r = buildRunReceipt(base);
    expect(r.killedBy).toBeNull();
    expect(r.nodeId).toBeNull();
  });
});

describe('buildRunReceipt finalMessage', () => {
  const base = {
    sessionId: 's1', sessionToken: 't1', authId: 'wallet-abc', walletAddress: 'wallet-abc',
    zoneId: 'sunken-crypt', runSeed: 'seed', seedSource: 'legacy', serverDayKey: '2026-07-11',
    dailyShiftEnabled: true, chosenModifierId: null, stakeMode: 'free' as const, coinStake: 0,
    outcome: 'dead' as const, finalDepth: 7, coinDelta: 0, streakAfter: 0, createdAt: 1,
  };
  it('records finalMessage when provided', () => {
    expect(buildRunReceipt({ ...base, finalMessage: 'i should not have come here' }).finalMessage)
      .toBe('i should not have come here');
  });
  it('defaults finalMessage to null when omitted', () => {
    expect(buildRunReceipt(base).finalMessage).toBeNull();
  });
});

describe('resolveStakeMode', () => {
  it('honours an explicit valid mode regardless of stakeAmount', () => {
    expect(resolveStakeMode('sol', 0)).toEqual({ ok: true, mode: 'sol' });
    expect(resolveStakeMode('coins', 0)).toEqual({ ok: true, mode: 'coins' });
    expect(resolveStakeMode('free', 0.5)).toEqual({ ok: true, mode: 'free' });
  });

  it('infers sol when omitted and stakeAmount > 0', () => {
    expect(resolveStakeMode(undefined, 0.25)).toEqual({ ok: true, mode: 'sol' });
    expect(resolveStakeMode(null, 0.01)).toEqual({ ok: true, mode: 'sol' });
  });

  it('infers free when omitted and stakeAmount is 0', () => {
    expect(resolveStakeMode(undefined, 0)).toEqual({ ok: true, mode: 'free' });
    expect(resolveStakeMode(null, 0)).toEqual({ ok: true, mode: 'free' });
  });

  it('rejects an unknown mode string', () => {
    expect(resolveStakeMode('gold', 0)).toEqual({ ok: false, error: 'Invalid stakeMode' });
    expect(resolveStakeMode('', 0)).toEqual({ ok: false, error: 'Invalid stakeMode' });
  });

  it('rejects a non-string non-nullish mode', () => {
    const r = resolveStakeMode(42, 0);
    expect(r.ok).toBe(false);
  });
});

describe('validateCoinStakeRequest', () => {
  it('passes through non-coins modes without validation', () => {
    expect(
      validateCoinStakeRequest({ stakeMode: 'sol', stakeAmount: 0.5, coinStake: 0, balance: 0 }),
    ).toEqual({ ok: true });
    expect(
      validateCoinStakeRequest({ stakeMode: 'free', stakeAmount: 0, coinStake: 999, balance: 0 }),
    ).toEqual({ ok: true });
  });

  it('accepts a well-formed coins request', () => {
    expect(
      validateCoinStakeRequest({ stakeMode: 'coins', stakeAmount: 0, coinStake: 120, balance: 120 }),
    ).toEqual({ ok: true });
    expect(
      validateCoinStakeRequest({ stakeMode: 'coins', stakeAmount: 0, coinStake: 60, balance: 500 }),
    ).toEqual({ ok: true });
  });

  it('rejects a coins run that also stakes SOL', () => {
    expect(
      validateCoinStakeRequest({ stakeMode: 'coins', stakeAmount: 0.1, coinStake: 60, balance: 999 }),
    ).toEqual({ ok: false, error: 'Coin-stake runs cannot also stake SOL' });
  });

  it('rejects a coinStake not on the ladder', () => {
    expect(
      validateCoinStakeRequest({ stakeMode: 'coins', stakeAmount: 0, coinStake: 100, balance: 999 }),
    ).toEqual({ ok: false, error: 'Invalid coin stake amount' });
    expect(
      validateCoinStakeRequest({ stakeMode: 'coins', stakeAmount: 0, coinStake: 0, balance: 999 }),
    ).toEqual({ ok: false, error: 'Invalid coin stake amount' });
  });

  it('rejects when the balance is below the stake', () => {
    expect(
      validateCoinStakeRequest({ stakeMode: 'coins', stakeAmount: 0, coinStake: 240, balance: 239 }),
    ).toEqual({ ok: false, error: 'Insufficient pale coins' });
  });

  it('checks stakeAmount before coinStake before balance (distinct messages, ordered)', () => {
    // SOL staked AND bad coinStake AND low balance -> SOL error wins.
    expect(
      validateCoinStakeRequest({ stakeMode: 'coins', stakeAmount: 1, coinStake: 7, balance: 0 }).ok,
    ).toBe(false);
    expect(
      (validateCoinStakeRequest({ stakeMode: 'coins', stakeAmount: 1, coinStake: 7, balance: 0 }) as { error: string }).error,
    ).toBe('Coin-stake runs cannot also stake SOL');
  });

  it('accepts exact-balance stakes (>= boundary)', () => {
    expect(
      validateCoinStakeRequest({ stakeMode: 'coins', stakeAmount: 0, coinStake: 240, balance: 240 }),
    ).toEqual({ ok: true });
  });
});
