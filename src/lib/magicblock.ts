/**
 * MagicBlock Ephemeral Rollups integration for Die Forward
 *
 * Phase 1: Scaffold + admin toggle only.
 * All functions are stubbed and return safe defaults.
 * Real implementation starts in Phase 2.
 *
 * Design doc: integrations/magicblock/README.md
 * Docs: https://docs.magicblock.gg
 *
 * Toggle: admin setting `enableMagicBlock` (InstantDB gameSettings)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ErRunRecord {
  erRunId: string;          // ER account pubkey for this run
  playerWallet: string;
  stakeAmount: number;
  startedAt: number;
  status: 'active' | 'dead' | 'cleared';
}

export interface ErCommitResult {
  success: boolean;
  txSignature?: string;     // L1 commit transaction
  fallback?: boolean;       // true if we fell back to legacy settlement
}

// ── Client ────────────────────────────────────────────────────────────────────

/**
 * Start a new ER run session.
 * Delegates the player's stake account to the Ephemeral Rollup.
 * Called from POST /api/session/start when enableMagicBlock = true.
 *
 * @returns erRunId (ER account pubkey) to store on the session record
 */
export async function startErRun(opts: {
  playerWallet: string;
  stakeAmount: number;
  sessionId: string;
}): Promise<string | null> {
  // TODO Phase 2: delegate stake account to ER, return ER run account pubkey
  console.log('[MagicBlock] startErRun (stub) for', opts.playerWallet);
  return null;
}

/**
 * Record a game event in the ER (fire-and-forget).
 * Called during gameplay for room advances, encounters, items.
 * Never blocks — ER failures are silently ignored mid-run.
 */
export async function recordErEvent(opts: {
  erRunId: string;
  eventType: 'advance_room' | 'encounter' | 'item' | 'death' | 'victory';
  data: Record<string, unknown>;
}): Promise<void> {
  // TODO Phase 2: send ER transaction for this event
  console.log('[MagicBlock] recordErEvent (stub):', opts.eventType, opts.data);
}

/**
 * Commit the ER run to L1.
 * Called at settlement (death/victory) when enableMagicBlock = true.
 * Blocks until committed — this is the settlement gate.
 *
 * On failure, returns { success: false, fallback: true } so caller can
 * fall back to legacy L1 settlement without blocking the player.
 */
export async function commitErRun(opts: {
  erRunId: string;
  outcome: 'dead' | 'cleared';
  finalRoom: number;
}): Promise<ErCommitResult> {
  // TODO Phase 2: commit ER state to Solana L1, undelegate account
  console.log('[MagicBlock] commitErRun (stub):', opts.outcome, 'room', opts.finalRoom);
  return { success: false, fallback: true };
}
