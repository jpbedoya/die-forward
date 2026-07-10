import { NextRequest, NextResponse } from 'next/server';
import { tx, id } from '@instantdb/admin';
import { db } from '@/lib/db';
import { computeVictoryReward } from '@/lib/payout';
import { buildRunReceipt, classifyStaleCoinCleanup } from '@/lib/coins';

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

    // ── Coin-Bound disposition (pure, unit-tested — classifyStaleCoinCleanup) ──
    // Each stale coin run is either an ABANDONED mid-run (stake burns to pool,
    // streak resets — F6) or a CLEARED-but-unclaimed WIN (stake RETURNED to the
    // player, no bonus, streak untouched). The cleared-unclaimed case is the
    // CRITICAL fix: previously such a run fell into the generic victory-candidate
    // branch, was flagged free_mode, and had its 60 staked coins silently
    // destroyed with the session flipped so /api/session/victory 403s forever.
    const coinDispositions = staleSessions.map((s: any) => ({
      session: s,
      disp: classifyStaleCoinCleanup({
        stakeMode: s.stakeMode,
        coinStake: s.coinStake,
        currentRoom: s.currentRoom,
        maxRooms: s.maxRooms,
      }),
    }));
    const clearedUnclaimed = coinDispositions.filter((c: any) => c.disp.kind === 'cleared_unclaimed');
    const abandonedCoin = coinDispositions.filter((c: any) => c.disp.kind === 'abandoned');
    const clearedUnclaimedIds = new Set(clearedUnclaimed.map((c: any) => c.session.id));

    // Victory candidates: reached the exit AND not a coin run needing a stake
    // return (those are handled by clearedUnclaimed so their stake isn't lost).
    const victoryCandidates = staleSessions.filter((s: any) => {
      const currentRoom = s.currentRoom || 1;
      const maxRooms = s.maxRooms || 13;
      return currentRoom >= maxRooms && !clearedUnclaimedIds.has(s.id);
    });

    const deathCandidates = staleSessions.filter((s: any) => {
      const currentRoom = s.currentRoom || 1;
      const maxRooms = s.maxRooms || 13;
      return currentRoom < maxRooms;
    });

    // Pool burn accumulates only ABANDONED coin stakes (cleared-unclaimed returns
    // its stake to the player, never the pool).
    const totalCoinBurn = abandonedCoin.reduce(
      (sum: number, c: any) => sum + c.disp.poolDelta,
      0,
    );

    // ── Player lookups (same identity resolution as death/victory: authId else
    // walletAddress). Cleanup CAN look the player up — so cleared-unclaimed stakes
    // are actually credited back and abandoned streaks actually reset. If a row
    // can't be found, the receipt is still written and the session still settled;
    // we simply can't credit/reset a row that isn't there.
    async function lookupPlayer(session: any): Promise<Record<string, unknown> | null> {
      const lookupKey = session.authId || session.walletAddress;
      if (!lookupKey) return null;
      const lookupField = session.authId ? 'authId' : 'walletAddress';
      try {
        const { players } = await db.query({
          players: { $: { where: { [lookupField]: lookupKey }, limit: 1 } },
        });
        return players && players.length > 0 ? (players[0] as Record<string, unknown>) : null;
      } catch (e) {
        console.warn('[Cleanup] player lookup failed:', e);
        return null;
      }
    }

    // Resolve each coin session's player once, then aggregate per player so two
    // stale coin runs for the same player don't lost-update each other (InstantDB
    // updates are last-write-wins, not additive).
    const coinSessionPlayers = new Map<string, Record<string, unknown> | null>();
    const byPlayer = new Map<string, { player: Record<string, unknown>; paleCoinsDelta: number; resetStreak: boolean }>();
    for (const { session } of [...clearedUnclaimed, ...abandonedCoin] as any[]) {
      const p = await lookupPlayer(session);
      coinSessionPlayers.set(session.id, p);
      if (p) {
        const pid = p.id as string;
        if (!byPlayer.has(pid)) byPlayer.set(pid, { player: p, paleCoinsDelta: 0, resetStreak: false });
      }
    }
    for (const { session, disp } of clearedUnclaimed as any[]) {
      const p = coinSessionPlayers.get(session.id);
      if (p) byPlayer.get(p.id as string)!.paleCoinsDelta += disp.playerCoinDelta;
    }
    for (const { session, disp } of abandonedCoin as any[]) {
      const p = coinSessionPlayers.get(session.id);
      if (p && disp.resetStreak) byPlayer.get(p.id as string)!.resetStreak = true;
    }

    const buildCoinReceipt = (session: any, outcome: 'abandoned' | 'cleared_unclaimed', coinDelta: number, streakAfter: number) =>
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
          outcome,
          finalDepth: session.currentRoom || 1,
          coinDelta,
          streakAfter,
          createdAt: now,
        }) },
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
      // CLEARED-BUT-UNCLAIMED coin WINs: mark completed and stamp the receipt.
      // The stake itself is returned via the per-player writes below (byPlayer),
      // NOT via free_mode. payoutStatus documents that the stake was returned
      // without the victory bonus (the player never claimed it before it went stale).
      ...clearedUnclaimed.map(({ session }: any) =>
        tx.sessions[session.id].update({
          status: 'completed',
          endedAt: now,
          reward: 0,
          payoutStatus: 'coins_returned_unclaimed',
          finalRoom: session.currentRoom || session.maxRooms || 13,
        })
      ),
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
      // Per-player coin settlement: return cleared-unclaimed stakes to paleCoins
      // and reset abandoned coin streaks to 0 (F6 — force-quitting is not an
      // escape hatch). Aggregated per player so same-player runs don't clobber.
      ...Array.from(byPlayer.values()).flatMap((acc) => {
        const update: Record<string, unknown> = {};
        if (acc.paleCoinsDelta > 0) {
          update.paleCoins = ((acc.player.paleCoins as number) ?? 0) + acc.paleCoinsDelta;
        }
        if (acc.resetStreak) {
          update.bindingStreak = 0;
        }
        return Object.keys(update).length > 0
          ? [tx.players[acc.player.id as string].update(update)]
          : [];
      }),
      // Immutable receipts. Abandoned: stake burned, streak reset → streakAfter 0.
      // Cleared-unclaimed: stake returned (coinDelta = stake when a player row exists),
      // streak untouched (streakAfter = the player's current streak).
      ...abandonedCoin.map(({ session }: any) => buildCoinReceipt(session, 'abandoned', 0, 0)),
      ...clearedUnclaimed.map(({ session, disp }: any) => {
        const p = coinSessionPlayers.get(session.id);
        const coinDelta = p ? disp.playerCoinDelta : 0;
        const streakAfter = (p?.bindingStreak as number) ?? 0;
        return buildCoinReceipt(session, 'cleared_unclaimed', coinDelta, streakAfter);
      }),
    ];

    if (updates.length > 0) {
      await db.transact(updates);
    }

    console.log(`[Cleanup] Marked dead=${deathCandidates.length}, completed=${victoryCandidates.length}, coinReturned=${clearedUnclaimed.length}, coinAbandoned=${abandonedCoin.length}`);

    return NextResponse.json({
      success: true,
      message: `Cleaned stale sessions: dead=${deathCandidates.length}, completed=${victoryCandidates.length}, coinReturned=${clearedUnclaimed.length}`,
      cleaned: staleSessions.length,
      deadMarked: deathCandidates.length,
      victoriesMarked: victoryCandidates.length,
      coinReturnedMarked: clearedUnclaimed.length,
      coinAbandonedMarked: abandonedCoin.length,
      sessionIds: staleSessions.map((s: any) => s.id),
    });

  } catch (error) {
    console.error('Failed to cleanup sessions:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup sessions' }, { status: 500 }
    );
  }
}
