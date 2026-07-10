/**
 * Pale coin economy math.
 *
 * Pure functions covering the free-to-play coin loop: depth-based earning,
 * coin-stake settlement (burn on death / stake+bonus on victory), streak
 * tracking, and seal tier lookup. Kept independent of the API routes and
 * InstantDB so the money math is unit-testable in isolation (mirrors
 * `payout.ts`).
 *
 * Every exported function is a pure guard-then-compute: inputs from server
 * routes are never trusted to be well-formed (negative, fractional, NaN, or
 * Infinity), so each function clamps/floors its numeric inputs to a sane
 * domain instead of throwing. Callers get a deterministic, always-safe
 * result rather than a crashed request.
 */

/** Fixed coin-stake ladder offered to players before a run. */
export const COIN_STAKE_OPTIONS = [60, 120, 240] as const;

export interface CoinEarnInput {
  finalDepth: number;
  cleared: boolean;
  firstClearOfZone: boolean;
  stakeMode: 'sol' | 'coins' | 'free';
}

/**
 * Clamp a numeric input to a non-negative integer.
 * Guards against negative, fractional, NaN, and non-finite (Infinity) values
 * coming from untrusted callers (server routes, client payloads).
 */
function clampNonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) {
    // NaN and -Infinity have no sane non-negative interpretation -> 0.
    // +Infinity is handled by callers that need a cap (see computeCoinEarn).
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

/**
 * Coin earn is universal: every stake mode (sol/coins/free) earns coins for
 * the run. Staking coins is a separate, optional mechanic on top of this.
 *
 * Depth income is concave: floor(4 * sqrt(min(finalDepth, 13))), so each
 * additional depth level is worth progressively less. Cleared runs add a
 * flat +40; first clear of a zone adds a further flat +60. Never negative.
 */
export function computeCoinEarn(input: CoinEarnInput): number {
  // +Infinity depth should hit the depth-13 cap rather than collapse to 0,
  // so handle it explicitly before the generic NaN/negative clamp.
  const rawDepth = input.finalDepth;
  const depth = rawDepth === Infinity ? 13 : clampNonNegativeInt(rawDepth);
  const cappedDepth = Math.min(depth, 13);

  let earn = Math.floor(4 * Math.sqrt(cappedDepth));
  if (input.cleared) earn += 40;
  if (input.firstClearOfZone) earn += 60;

  return Math.max(0, earn);
}

export interface CoinStakeSettlementInput {
  coinStake: number;
  cleared: boolean;
  bonusPercent: number;
  poolAvailable: number;
}

export interface CoinStakeSettlementResult {
  playerDelta: number;
  poolDelta: number;
}

/**
 * Settle a coin stake at the end of a run.
 *
 * Death: the stake was already deducted from the player at run start, so
 * playerDelta is 0; the burned stake feeds the pool (poolDelta = +coinStake).
 *
 * Victory: the player gets their stake back plus a bonus, where
 * bonus = min(floor(coinStake * bonusPercent / 100), poolAvailable) — the
 * bonus is floored and capped by what the pool actually holds, so the pool
 * can never go negative. The pool is only decremented by the bonus paid out
 * (poolDelta = -bonus), never by the returned stake itself.
 */
export function computeCoinStakeSettlement(
  input: CoinStakeSettlementInput,
): CoinStakeSettlementResult {
  const coinStake = clampNonNegativeInt(input.coinStake);
  const bonusPercent = clampNonNegativeInt(input.bonusPercent);
  const poolAvailable = clampNonNegativeInt(input.poolAvailable);

  if (!input.cleared) {
    // Death: stake already deducted; burn it into the pool.
    return { playerDelta: 0, poolDelta: coinStake };
  }

  const naiveBonus = Math.floor((coinStake * bonusPercent) / 100);
  const bonus = Math.min(naiveBonus, poolAvailable);
  // Avoid returning -0 when bonus is 0 (e.g. clamped bonusPercent/poolAvailable).
  const poolDelta = bonus > 0 ? -bonus : 0;

  return { playerDelta: coinStake + bonus, poolDelta };
}

export interface NextStreakInput {
  current: number;
  stakeMode: string;
  cleared: boolean;
}

export interface NextStreakResult {
  streak: number;
  changed: boolean;
}

/**
 * Advance a player's coin-stake win streak.
 *
 * Only coins-mode runs affect the streak: a clear increments it, a death
 * zeroes it. Non-coin runs (sol/free/anything else) pass the streak through
 * unchanged. `changed` reports whether the streak value actually moved
 * (e.g. a death on an already-zero streak is a no-op, changed: false).
 */
export function nextStreak(input: NextStreakInput): NextStreakResult {
  const current = clampNonNegativeInt(input.current);
  const streak = input.stakeMode === 'coins' ? (input.cleared ? current + 1 : 0) : current;

  // `changed` compares the result against the raw (unclamped) input, so a
  // guard correcting a malformed current value (negative/fractional) also
  // reports as a change — the caller's stored value needs updating either way.
  return { streak, changed: streak !== input.current };
}

/**
 * Seal tier for a given win streak: 0 (<3), 1 (3-6), 2 (7-14), 3 (15+).
 * Guards a negative/fractional streak by clamping to a non-negative integer.
 */
export function sealTier(streak: number): 0 | 1 | 2 | 3 {
  const s = clampNonNegativeInt(streak);
  if (s < 3) return 0;
  if (s < 7) return 1;
  if (s < 15) return 2;
  return 3;
}
