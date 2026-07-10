// Pure stake-intent resolution for run start.
//
// A run can be staked three ways:
//   - 'sol'   : real SOL escrow (buildStakeInstruction to GAME_POOL_PDA)
//   - 'coins' : Pale Coins (Coin-Bound) — no SOL tx, but a server-validated stake
//   - 'free'  : truly empty-handed — no SOL, no coins
//
// Trust boundary: only a truly empty-handed ('free') run may fall back to an
// offline (client-authoritative) session. SOL and Coin-Bound runs MUST be
// validated server-side — an offline coin stake could not verify the player's
// balance, so it would mint free coins. Those runs throw on server failure.

export type StakeMode = 'sol' | 'coins' | 'free';

export interface StakeIntentInput {
  amount: number;
  coinStake?: number;
  emptyHanded?: boolean;
}

export interface StakeIntent {
  stakeMode: StakeMode;
  /** Whether to build + send the on-chain SOL escrow transaction. */
  sendSol: boolean;
  /** Whether the run may start offline if the backend is unreachable. */
  canFallbackOffline: boolean;
}

export function resolveStakeIntent({
  amount,
  coinStake = 0,
  emptyHanded = false,
}: StakeIntentInput): StakeIntent {
  // Coin-Bound: emptyHanded-like (no SOL tx) but server-validated — never offline.
  if (coinStake > 0) {
    return { stakeMode: 'coins', sendSol: false, canFallbackOffline: false };
  }
  // SOL stake: build the escrow tx. Preserves the prior `!emptyHanded` guard.
  if (!emptyHanded && amount > 0) {
    return { stakeMode: 'sol', sendSol: true, canFallbackOffline: false };
  }
  // Truly empty-handed: the only run allowed to fall back offline.
  return { stakeMode: 'free', sendSol: false, canFallbackOffline: true };
}
