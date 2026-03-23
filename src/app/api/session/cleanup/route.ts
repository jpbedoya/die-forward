import { NextRequest, NextResponse } from 'next/server';
import { tx } from '@instantdb/admin';
import { db } from '@/lib/db';

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

    const victoryCandidates = staleSessions.filter((s: any) => {
      const currentRoom = s.currentRoom || 1;
      const maxRooms = s.maxRooms || 7;
      return currentRoom >= maxRooms;
    });

    const deathCandidates = staleSessions.filter((s: any) => {
      const currentRoom = s.currentRoom || 1;
      const maxRooms = s.maxRooms || 7;
      return currentRoom < maxRooms;
    });

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
        const bonus = stakeAmount * 0.5;
        const reward = stakeAmount + bonus;
        const freeMode = session.demoMode || stakeAmount === 0;

        return tx.sessions[session.id].update({
          status: 'completed',
          endedAt: now,
          reward: freeMode ? 0 : reward,
          payoutStatus: freeMode ? 'free_mode' : 'abandoned_pending_claim',
          finalRoom: session.currentRoom || session.maxRooms || 7,
        });
      }),
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
