/**
 * Pale coin economy — client-safe subset.
 *
 * Mirrors the constants/pure helpers from `src/lib/coins.ts` (the web/server
 * copy that also does earn/settlement math via InstantDB writes). Mobile is a
 * separate package with no cross-import path to `src/lib`, so this file
 * duplicates only the pieces the client needs to render the Coin-Bound UI —
 * the stake ladder and the seal-tier lookup. All settlement math (earn,
 * stake burn/return+bonus, streak advance) stays server-side; the client
 * never computes coin amounts, only displays what the server already wrote
 * to the player row. Keep this file's exports in sync with `src/lib/coins.ts`
 * if that ladder or tier thresholds ever change.
 */

/** Fixed coin-stake ladder offered to players before a run. */
export const COIN_STAKE_OPTIONS = [60, 120, 240] as const;

/**
 * Clamp a numeric input to a non-negative integer (mirrors the guard in
 * `src/lib/coins.ts`, kept local since this file has no other dependencies).
 */
function clampNonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
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
