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

/** The three stake modes a run can be started in. */
export type StakeMode = 'sol' | 'coins' | 'free';

const STAKE_MODES: readonly string[] = ['sol', 'coins', 'free'];

/**
 * Resolve the effective stake mode for a run-start request.
 *
 * An explicit `stakeMode` is honoured only if it is one of the three known
 * strings; any other non-nullish value is rejected (caller returns 400). When
 * omitted (undefined/null), the mode is inferred from the SOL amount:
 * `stakeAmount > 0 -> 'sol'`, otherwise `'free'`. Pure so the route's mode
 * decision is unit-testable in isolation from InstantDB.
 */
export function resolveStakeMode(
  explicit: unknown,
  stakeAmount: number,
): { ok: true; mode: StakeMode } | { ok: false; error: string } {
  if (explicit === undefined || explicit === null) {
    const inferred: StakeMode = stakeAmount > 0 ? 'sol' : 'free';
    return { ok: true, mode: inferred };
  }
  if (typeof explicit === 'string' && STAKE_MODES.includes(explicit)) {
    return { ok: true, mode: explicit as StakeMode };
  }
  return { ok: false, error: 'Invalid stakeMode' };
}

export interface CoinStakeRequest {
  stakeMode: StakeMode;
  stakeAmount: number;
  coinStake: number;
  /** Player's current pale-coin balance (player.paleCoins ?? 0). */
  balance: number;
}

/**
 * Validate the numeric/enum portion of a coins-mode run-start request.
 *
 * Non-coins modes are a pass-through (nothing to validate here — SOL/free
 * flows are unchanged). For coins mode the chain rejects, with a distinct
 * message per failure, when: SOL was also staked (`stakeAmount !== 0`), the
 * `coinStake` is not one of {@link COIN_STAKE_OPTIONS}, or the player's
 * `balance` is below the stake. Identity/Player-row existence are I/O concerns
 * and stay in the route; this function is pure so the money-gating logic is
 * unit-testable in isolation.
 */
export function validateCoinStakeRequest(
  req: CoinStakeRequest,
): { ok: true } | { ok: false; error: string } {
  if (req.stakeMode !== 'coins') return { ok: true };

  if (req.stakeAmount !== 0) {
    return { ok: false, error: 'Coin-stake runs cannot also stake SOL' };
  }
  if (!(COIN_STAKE_OPTIONS as readonly number[]).includes(req.coinStake)) {
    return { ok: false, error: 'Invalid coin stake amount' };
  }
  if ((req.balance ?? 0) < req.coinStake) {
    return { ok: false, error: 'Insufficient pale coins' };
  }
  return { ok: true };
}

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
