import { NextRequest, NextResponse } from 'next/server';
import { tx, id } from '@instantdb/admin';
import { db } from '@/lib/db';
import { computeVictoryReward } from '@/lib/payout';
import { buildRunReceipt } from '@/lib/coins';

// Stale session threshold: 1 hour
const STALE_THRESHOLD_MS = 60 * 60 * 1000;

/**
 * Cleanup stale active sessions
 *
 * Sessions active > 1h are likely abandoned.
 * - Victory candidates (currentRoom >= maxRooms): mark completed, pending payout claim
 * - Others: mark dead with default epitaph
 */
export async function POST(_request: NextRequest) {
  try {
    const now = Date.now();
    const threshold = now - STALE_THRESHOLD_MS;

    // Find all active sessions older than threshold
    const result = await db.query({
      sessions: {
        $: {
          where: {
            status: 'active',
          },
        },
      },
    });

    const sessions = result?.sessions || [];
    const toMs = (v: unknown): number => {
      const n = Number(v || 0);
      if (!Number.isFinite(n) || n <= 0) return 0;
      // Some records may store seconds, others milliseconds.
      return n < 1_000_000_000_000 ? n * 1000 : n;
    };
    const staleSessions = sessions.filter((s: any) => {
      const startedAtMs = toMs(s.startedAt);
      return startedAtMs > 0 && startedAtMs < threshold;
    });

    if (staleSessions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stale sessions found',
        cleaned: 0,
        deadMarked: 0,
        victoriesMarked: 0,
      });
    }

    // ── Load game settings (money-integrity: never blocks the sweep) ──────────
    const settingsResult = await db.query({ gameSettings: {} }).catch(() => null);
    const settingsRow = settingsResult?.gameSettings?.[0] as Record<string, unknown> | undefined;
    const victoryBonusPercent = (settingsRow?.victoryBonusPercent as number) ?? 50;

    const victoryCandidates = staleSessions.filter((s: any) => {
      const currentRoom = s.currentRoom || 1;
      const maxRooms = s.maxRooms || 13;
      return currentRoom >= maxRooms;
    });

    const deathCandidates = staleSessions.filter((s: any) => {
      const currentRoom = s.currentRoom || 1;
      const maxRooms = s.maxRooms || 13;
      return currentRoom < maxRooms;
    });

    // Abandoned COIN-BOUND runs: the stake was deducted at start, so burn it into
    // the pool (like a death) and stamp an immutable 'abandoned' receipt. Streak is
    // left untouched — abandonment is treated generously, not as a loss.
    //
    // GUARD (mirrors victoryCandidates/deathCandidates): only burn runs that did NOT
    // reach the exit (currentRoom < maxRooms). A stale coin run AT maxRooms is a
    // cleared-but-unclaimed WIN, not an abandonment — it belongs to the victory-
    // candidate side and must not have its stake burned.
    const coinBoundSessions = staleSessions.filter((s: any) => {
      const currentRoom = s.currentRoom || 1;
      const maxRooms = s.maxRooms || 13;
      return (
        s.stakeMode === 'coins' &&
        (Number(s.coinStake) || 0) > 0 &&
        currentRoom < maxRooms
      );
    });
    const totalCoinBurn = coinBoundSessions.reduce(
      (sum: number, s: any) => sum + (Number(s.coinStake) || 0),
      0,
    );

    const updates = [
      ...deathCandidates.map((session: any) =>
        tx.sessions[session.id].update({
          status: 'dead',
          endedAt: now,
          finalMessage: '...', // Default epitaph for abandoned sessions
          finalRoom: session.currentRoom || 1,
        })
      ),
      ...victoryCandidates.map((session: any) => {
        const stakeAmount = session.stakeAmount || 0;
        const freeMode = session.demoMode || stakeAmount === 0;
        const { totalReward } = computeVictoryReward(stakeAmount, victoryBonusPercent);

        return tx.sessions[session.id].update({
          status: 'completed',
          endedAt: now,
          reward: freeMode ? 0 : totalReward,
          payoutStatus: freeMode ? 'free_mode' : 'abandoned_pending_claim',
          finalRoom: session.currentRoom || session.maxRooms || 13,
        });
      }),
      // Single accumulated pool burn — ONLY against a real existing settings row
      // (never invent one; that would orphan the pool). Multiple .update calls on
      // the same row are last-write-wins, so we sum first and write once.
      ...(totalCoinBurn > 0 && settingsRow?.id
        ? [
            tx.gameSettings[settingsRow.id as string].update({
              coinPool: ((settingsRow.coinPool as number) ?? 0) + totalCoinBurn,
            }),
          ]
        : []),
      // One immutable 'abandoned' receipt per coin-bound run (no streak change).
      ...coinBoundSessions.map((session: any) =>
        tx.runReceipts[id()].update(
          { ...buildRunReceipt({
            sessionId: session.id,
            sessionToken: session.token ?? '',
            authId: session.authId ?? null,
            walletAddress: session.walletAddress ?? null,
            zoneId: session.zoneId ?? null,
            runSeed: session.seed ?? null,
            seedSource: session.seedSource ?? null,
            serverDayKey: session.serverDayKey ?? null,
            dailyShiftEnabled: session.dailyShiftEnabled ?? null,
            chosenModifierId: session.chosenModifierId ?? null,
            stakeMode: 'coins',
            coinStake: Number(session.coinStake) || 0,
            outcome: 'abandoned',
            finalDepth: session.currentRoom || 1,
            coinDelta: 0, // stake burned, nothing granted
            streakAfter: (session.bindingStreak as number) ?? 0, // unchanged
            createdAt: now,
          }) },
        )
      ),
    ];

    if (updates.length > 0) {
      await db.transact(updates);
    }

    console.log(`[Cleanup] Marked dead=${deathCandidates.length}, completed=${victoryCandidates.length}`);

    return NextResponse.json({
      success: true,
      message: `Cleaned stale sessions: dead=${deathCandidates.length}, completed=${victoryCandidates.length}`,
      cleaned: staleSessions.length,
      deadMarked: deathCandidates.length,
      victoriesMarked: victoryCandidates.length,
      sessionIds: staleSessions.map((s: any) => s.id),
    });

  } catch (error) {
    console.error('Failed to cleanup sessions:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup sessions' }, { status: 500 }
    );
  }
}
