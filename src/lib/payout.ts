/**
 * Victory payout math.
 *
 * On a win the Memorial Pool returns the player's stake plus a configurable
 * bonus. Kept as a pure function so the money calculation is unit-testable,
 * independent of the API route and InstantDB.
 */

/**
 * Compute a victory reward.
 *
 * @param stakeAmount         Amount the player staked (SOL).
 * @param victoryBonusPercent Bonus percentage from game settings (e.g. 50 = +50%).
 * @returns The bonus and the total reward (stake + bonus).
 */
export function computeVictoryReward(
  stakeAmount: number,
  victoryBonusPercent: number,
): { bonus: number; totalReward: number } {
  const bonus = stakeAmount * (victoryBonusPercent / 100);
  return { bonus, totalReward: stakeAmount + bonus };
}
