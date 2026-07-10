// Task 6 (Phase 3b): staking posture switch.
//
// The admin-controlled `stakingPosture` setting decides whether the SOL
// staking UI on the stake screen is visible at all:
//   - 'hidden': never shown (Coin-Bound + free-run only).
//   - 'ritual': shown only once a player has died enough to be "noticed"
//     (progressive disclosure) — below the threshold it behaves like 'hidden'.
//   - 'open': always shown (current/legacy behavior).
//
// Kept as a pure function so the visibility decision is unit-testable
// without mounting stake.tsx.

export type StakingPosture = 'hidden' | 'ritual' | 'open';

export const DEFAULT_STAKING_POSTURE: StakingPosture = 'ritual';

// Death count at which the ritual posture starts showing the SOL section.
export const RITUAL_DEATH_THRESHOLD = 3;

export function isStakingPosture(value: unknown): value is StakingPosture {
  return value === 'hidden' || value === 'ritual' || value === 'open';
}

export function resolveStakeUi({
  posture,
  totalDeaths,
  walletConnected,
}: {
  posture: StakingPosture;
  totalDeaths: number;
  // Reserved for future postures/branches (e.g. Task 7 Coin-Bound gating);
  // not currently used to decide SOL visibility — 'hidden' hides the SOL
  // section unconditionally even if a wallet is already connected.
  walletConnected: boolean;
}): { showSol: boolean; showRitualIntro: boolean } {
  void walletConnected;

  if (posture === 'open') {
    return { showSol: true, showRitualIntro: false };
  }

  if (posture === 'ritual') {
    const unlocked = totalDeaths >= RITUAL_DEATH_THRESHOLD;
    return { showSol: unlocked, showRitualIntro: unlocked };
  }

  // 'hidden' (and any unrecognized posture — fail closed)
  return { showSol: false, showRitualIntro: false };
}
