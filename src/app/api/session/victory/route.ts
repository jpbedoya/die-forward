import { NextRequest, NextResponse } from 'next/server';
import { tx, id } from '@instantdb/admin';
import { db } from '@/lib/db';
import { postVictory } from '@/lib/tapestry';
import { commitErRun } from '@/lib/magicblock';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { processVictoryPayout } from '@/lib/onchain';
import { computeVictoryReward } from '@/lib/payout';
import {
  buildRunReceipt,
  classifyVictorySettlement,
  computeCoinEarn,
  computeCoinStakeSettlement,
  nextStreak,
  type StakeMode,
} from '@/lib/coins';

// Pool wallet keypair (loaded from env)
function getPoolKeypair(): Keypair {
  const secretKeyStr = process.env.POOL_WALLET_SECRET;
  if (!secretKeyStr) {
    throw new Error('POOL_WALLET_SECRET not set — cannot process victory payouts');
  }
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secretKeyStr)));
}

// Solana connection
const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com',
  'confirmed'
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken } = body;

    // Validate inputs
    if (!sessionToken || typeof sessionToken !== 'string') {
      return NextResponse.json({ error: 'Invalid session token' }, { status: 400 });
    }

    // Find the session by token
    const result = await db.query({
      sessions: {
        $: {
          where: {
            token: sessionToken,
            status: 'active',
          },
        },
      },
    });

    const sessions = result?.sessions || [];
    if (sessions.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 403 });
    }

    const session = sessions[0];

    // Validate room progress - must have reached final room
    // 'room' = canonical 1-based node depth (spec §4.1); graph edges always descend one depth, so linear validation holds
    const currentRoom = session.currentRoom || 1;
    const maxRooms = session.maxRooms || 13;
    
    if (currentRoom < maxRooms) {
      return NextResponse.json({ 
        error: 'Dungeon not completed',
        currentRoom,
        required: maxRooms,
      }, { status: 403 });
    }

    // ── Load game settings ────────────────────────────────────────────────────
    const settingsResult = await db.query({ gameSettings: {} }).catch(() => null);
    const gameSettings = settingsResult?.gameSettings?.[0] as Record<string, unknown> | undefined;

    // Calculate reward (stake back + bonus from pool)
    const stakeAmount = session.stakeAmount || 0;
    const stakeMode: StakeMode = ((session as Record<string, unknown>).stakeMode as StakeMode) ?? 'sol';
    const coinStake: number = ((session as Record<string, unknown>).coinStake as number) ?? 0;
    const victoryBonusPercent = (gameSettings?.victoryBonusPercent as number) ?? 50;
    const { totalReward } = computeVictoryReward(stakeAmount, victoryBonusPercent);

    // ── MagicBlock settlement gate ────────────────────────────────────────────
    const mbEnabled = gameSettings?.enableMagicBlock === true;
    const erRunId = (session as Record<string, unknown>).erRunId as string | undefined;

    if (mbEnabled && erRunId) {
      console.log('[MagicBlock] Committing ER run', erRunId);
      try {
        const erResult = await commitErRun({ erRunId, outcome: 'cleared', finalRoom: session.currentRoom || 0 });
        if (erResult.fallback) {
          console.warn('[MagicBlock] ER commit fell back to legacy settlement');
        } else {
          console.log('[MagicBlock] ER committed:', erResult.txSignature ?? 'no sig');
          // Store commit tx signature for verification/display
          if (erResult.txSignature) {
            await db.transact(tx.sessions[session.id].update({ erCommitTx: erResult.txSignature }));
          }
        }
      } catch (err) {
        console.warn('[MagicBlock] ER commit threw, falling back:', err);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── Settlement routing (pure, unit-tested — see classifyVictorySettlement) ──
    // ROUTE-LEVEL GUARD: a Coin-Bound run has stakeAmount === 0. It MUST NOT be
    // treated as free mode (the CRITICAL dead-code bug) — a coins victory has no
    // SOL to pay but MUST still reach the coin settlement + player/receipt writes
    // below. 'free_mode' early-returns (demo/agent-free/legacy zero SOL);
    // 'coins_settle' skips the on-chain payout but FALLS THROUGH to settlement;
    // 'sol_payout' does a real on-chain transfer, then settlement. A coins
    // victory must NEVER attempt an on-chain transfer (stakeAmount 0).
    const settlementPath = classifyVictorySettlement({
      stakeAmount,
      stakeMode,
      demoMode: session.demoMode,
      isAgent: session.isAgent,
    });

    // DEMO MODE or FREE AGENT MODE (or legacy zero-SOL non-coins): skip payout AND
    // coin settlement — unchanged behaviour, early return.
    if (settlementPath === 'free_mode') {
      await db.transact([
        tx.sessions[session.id].update({
          status: 'completed',
          endedAt: Date.now(),
          reward: 0,
          payoutStatus: 'free_mode',
        }),
      ]);
      return NextResponse.json({
        success: true,
        reward: 0,
        payoutStatus: 'free_mode',
        message: session.isAgent ? 'Agent free mode - no staking' : 'Demo mode - no real payout',
      });
    }

    // Past here: 'sol_payout' or 'coins_settle' — BOTH reach the coin settlement.
    let signature: string | undefined;
    let payoutStatus: string;
    let responseReward: number;

    if (settlementPath === 'coins_settle') {
      // Coin-Bound victory: no SOL payout (stakeAmount 0 — nothing to transfer,
      // and we must not touch the pool wallet). Unlike the SOL path, there is NO
      // irreversible on-chain commit here, so the session-completion write MUST
      // NOT be committed separately — if it landed first and the coin settlement
      // then threw (swallowed by the non-fatal catch below), the session would be
      // 'completed' while the coin stake is never returned, and the next victory
      // call (which queries status:'active') would 403 → unrecoverable stake loss.
      // Instead we DEFER the session-complete write into the SAME db.transact as
      // the coin settlement writes below (see `writes[]`), so either everything
      // commits (session completed + coins returned) or nothing does (session
      // stays 'active', player can retry).
      payoutStatus = 'coins_settled';
      responseReward = 0;
    } else {
      // ── Real SOL payout (escrow or pool wallet) ──
      payoutStatus = 'paid';
      responseReward = totalReward;

      // Get pool wallet
      const poolKeypair = getPoolKeypair();
      const playerWallet = new PublicKey(session.walletAddress);

      // Use escrow program if session was created with it
      if (session.useEscrow && session.escrowSessionId) {
        console.log('Processing victory via escrow program...');
        const escrowSig = await processVictoryPayout(session.walletAddress, session.escrowSessionId);

        if (!escrowSig) {
          // Escrow payout failed
          await db.transact([
            tx.sessions[session.id].update({
              status: 'completed',
              endedAt: Date.now(),
              reward: totalReward,
              payoutStatus: 'escrow_failed',
            }),
          ]);
          return NextResponse.json({
            success: true,
            reward: totalReward,
            payoutStatus: 'pending',
            message: 'Victory recorded! Escrow payout failed - manual intervention needed.',
          });
        }

        signature = escrowSig;
      } else {
        // Legacy: Direct pool wallet transfer
        console.log('Processing victory via pool wallet...');

        // Check pool balance
        const poolBalance = await connection.getBalance(poolKeypair.publicKey);
        const rewardLamports = Math.floor(totalReward * LAMPORTS_PER_SOL);

        if (poolBalance < rewardLamports + 5000) { // 5000 lamports for fees
          console.error('Pool balance too low:', poolBalance, 'needed:', rewardLamports);
          // Still mark session as completed, but note payout failed
          await db.transact([
            tx.sessions[session.id].update({
              status: 'completed',
              endedAt: Date.now(),
              reward: totalReward,
              payoutStatus: 'insufficient_funds',
            }),
          ]);
          return NextResponse.json({
            success: true,
            reward: totalReward,
            payoutStatus: 'pending', // Will need manual payout
            message: 'Victory recorded! Payout pending (pool needs funding).',
          });
        }

        // Create and send payout transaction
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: poolKeypair.publicKey,
            toPubkey: playerWallet,
            lamports: rewardLamports,
          })
        );

        signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [poolKeypair]
        );
      }

      // Mark session as completed with payout info
      await db.transact([
        tx.sessions[session.id].update({
          status: 'completed',
          endedAt: Date.now(),
          reward: totalReward,
          payoutStatus: 'paid',
          payoutTx: signature,
        }),
      ]);
    }

    // ── Coin economy settlement (grant, stake return + pool bonus, streak, receipt) ──
    // Mirrors the death route: everything below lands in ONE transact so the
    // coin settlement is atomic among itself. It is intentionally SEPARATE from
    // (and after) the SOL payout / session-settle awaits above — the SOL reward
    // is already committed on-chain and must not be re-attempted or rolled back
    // by a coin-write failure. Grants are skipped for guests with no player row;
    // the receipt is written either way (records the run, not the grant).
    // Use authId for lookup (supports guests + wallet users), fallback to walletAddress for legacy.
    try {
      const lookupKey = session.authId || session.walletAddress;
      const lookupField = session.authId ? 'authId' : 'walletAddress';

      const { players } = await db.query({
        players: {
          $: {
            where: { [lookupField]: lookupKey },
            limit: 1,
          },
        },
      });

      const player = players && players.length > 0
        ? (players[0] as Record<string, unknown>)
        : null;

      const clearedRoom = session.currentRoom || (session.maxRooms || 13); // Full dungeon clear = reached max depth
      const zoneId = (session as Record<string, unknown>).zoneId as string || 'sunken-crypt';
      // stakeMode / coinStake are hoisted to the top of the handler (used by the
      // settlement-path routing above); reused here verbatim.

      // Existing clearedZones (stored as array, matching mobile schema).
      const existingCleared = player ? player.clearedZones : undefined;
      const existingZonesCleared: string[] = Array.isArray(existingCleared) ? existingCleared : [];
      const firstClearOfZone = !existingZonesCleared.includes(zoneId);
      const newZonesCleared = existingZonesCleared.includes(zoneId)
        ? existingZonesCleared
        : [...existingZonesCleared, zoneId];

      // Universal coin earn for the run (every stake mode earns).
      const earn = computeCoinEarn({
        finalDepth: clearedRoom,
        cleared: true,
        firstClearOfZone,
        stakeMode,
      });

      // Coin-Bound settlement: stake back + pool-funded bonus (coins mode only).
      // The write reads the SAME pool value the settlement was computed against.
      const settingsRow = gameSettings; // real existing gameSettings row, or undefined
      const poolAvailable = (settingsRow?.coinPool as number) ?? 0;
      let coinPlayerDelta = 0;
      let coinPoolDelta = 0;
      if (stakeMode === 'coins') {
        const settlement = computeCoinStakeSettlement({
          coinStake,
          cleared: true,
          bonusPercent: (settingsRow?.coinBonusPercent as number) ?? 50,
          poolAvailable,
        });
        coinPlayerDelta = settlement.playerDelta; // coinStake + bonus
        coinPoolDelta = settlement.poolDelta;     // -bonus (never positive on victory)
      }

      // Streak: coins clears increment; non-coins pass through unchanged.
      const prevStreak = (player?.bindingStreak as number) ?? 0;
      const { streak } = nextStreak({ current: prevStreak, stakeMode, cleared: true });

      // What was actually granted (0 / unchanged for guests) — the receipt records this.
      const grantedCoinDelta = player ? earn + (stakeMode === 'coins' ? coinPlayerDelta : 0) : 0;
      const grantedStreakAfter = player ? streak : prevStreak;

      const writes: Parameters<typeof db.transact>[0] = [];

      // Coin-Bound session-completion: committed ATOMICALLY with the coin
      // settlement writes (stake return + bonus + earn + streak + pool decrement +
      // player + receipt). This is deliberately NOT done in its own transact
      // above (see the coins_settle branch): coins have no irreversible on-chain
      // commit, so completing the session separately risks marking it 'completed'
      // while the stake is silently lost if the settlement throws. Pushing it into
      // this same batch means the session only flips out of 'active' if the coins
      // are actually returned — otherwise the player can retry. Always in the batch
      // for coins_settle, including the guest (no-player) receipt-only case.
      if (settlementPath === 'coins_settle') {
        writes.push(
          tx.sessions[session.id].update({
            status: 'completed',
            endedAt: Date.now(),
            reward: 0,
            payoutStatus: 'coins_settled',
            finalRoom: clearedRoom,
          }),
        );
      }

      // Pool decrement (bonus payout) — ONLY against a real existing settings row,
      // floored at 0 defensively. Never invent a gameSettings row (would orphan the pool).
      // KNOWN LIMITATION (accepted on devnet): pool decrement is read-then-write, not
      // atomic — concurrent coin victories can lost-update this toward an OVER-reported
      // pool (phantom bonus). Unsafe direction; tracked under the launch-blocking A1
      // auth/atomicity gate in the spec.
      if (stakeMode === 'coins' && coinPoolDelta !== 0 && settingsRow?.id) {
        writes.push(
          tx.gameSettings[settingsRow.id as string].update({
            coinPool: Math.max(0, poolAvailable + coinPoolDelta),
          }),
        );
      }

      if (player) {
        const currentHighest = (player.highestRoom as number) || 0;
        writes.push(
          tx.players[player.id as string].update({
            totalClears: ((player.totalClears as number) || 0) + 1,
            totalEarned: ((player.totalEarned as number) || 0) + totalReward,
            highestRoom: Math.max(currentHighest, clearedRoom), // Track deepest room reached
            lastPlayedAt: Date.now(),
            totalRuns: ((player.totalRuns as number) || 0) + 1,
            clearedZones: newZonesCleared,
            paleCoins: ((player.paleCoins as number) ?? 0) + grantedCoinDelta,
            bindingStreak: streak,
            bestBindingStreak: Math.max((player.bestBindingStreak as number) ?? 0, streak),
          }),
        );
      }

      // Immutable run receipt — written even for guests.
      const runReceiptId = id();
      writes.push(
        tx.runReceipts[runReceiptId].update(
          { ...buildRunReceipt({
            sessionId: session.id,
            sessionToken,
            authId: session.authId ?? null,
            walletAddress: session.walletAddress ?? null,
            zoneId: (session as Record<string, unknown>).zoneId as string ?? null,
            runSeed: (session as Record<string, unknown>).seed as string ?? null,
            seedSource: (session as Record<string, unknown>).seedSource as string ?? null,
            serverDayKey: (session as Record<string, unknown>).serverDayKey as string ?? null,
            dailyShiftEnabled: (session as Record<string, unknown>).dailyShiftEnabled as boolean ?? null,
            chosenModifierId: (session as Record<string, unknown>).chosenModifierId as string ?? null,
            stakeMode,
            coinStake,
            outcome: 'cleared',
            finalDepth: clearedRoom,
            coinDelta: grantedCoinDelta,
            streakAfter: grantedStreakAfter,
            createdAt: Date.now(),
          }) },
        ),
      );

      await db.transact(writes);
    } catch (statsError) {
      console.warn('Failed to settle victory coins/stats:', statsError);
      // Don't fail the whole request — the SOL payout already succeeded.
    }

    // Post to Tapestry social graph (wallet users only, non-blocking)
    const isGuestWallet = !session.walletAddress || session.walletAddress.startsWith('guest-');
    if (!isGuestWallet) {
      // Get player name for the post
      const nameResult = await db.query({
        players: { $: { where: { [session.authId ? 'authId' : 'walletAddress']: session.authId || session.walletAddress }, limit: 1 } },
      }).catch(() => null);
      const playerName = (nameResult?.players?.[0] as Record<string, unknown>)?.nickname as string
        || `${session.walletAddress.slice(0, 4)}...${session.walletAddress.slice(-4)}`;

      try {
        await postVictory({
          walletAddress: session.walletAddress,
          playerName,
          reward: totalReward,
        });
      } catch (err) {
        console.warn('[Tapestry] postVictory failed (non-fatal):', err);
      }
    }

    return NextResponse.json({
      success: true,
      reward: responseReward,
      payoutStatus,
      txSignature: signature,
    });

  } catch (error) {
    console.error('Failed to process victory:', error);
    return NextResponse.json({ error: 'Failed to process victory' }, { status: 500 });
  }
}
