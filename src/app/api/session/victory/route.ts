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
    const currentRoom = session.currentRoom || 1;
    const maxRooms = session.maxRooms || 7;
    
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
    const victoryBonusPercent = (gameSettings?.victoryBonusPercent as number) ?? 50;
    const bonus = stakeAmount * (victoryBonusPercent / 100);
    const totalReward = stakeAmount + bonus;

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

    // DEMO MODE or FREE AGENT MODE: Skip actual payout
    const isFreeMode = session.demoMode || (session.isAgent && session.stakeMode === 'free') || stakeAmount === 0;
    if (isFreeMode) {
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

    // Get pool wallet
    const poolKeypair = getPoolKeypair();
    const playerWallet = new PublicKey(session.walletAddress);

    let signature: string;
    
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

    // Update player stats (increment clears, track earned)
    // Use authId for lookup (supports guests + wallet users), fallback to walletAddress for legacy
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

      if (players && players.length > 0) {
        const player = players[0];
        const currentHighest = (player as Record<string, unknown>).highestRoom as number || 0;
        const clearedRoom = session.currentRoom || 12; // Full dungeon clear = actual room reached

        // Read existing clearedZones (stored as array, matching mobile schema)
        const existingCleared = (player as Record<string, unknown>).clearedZones;
        const existingZonesCleared: string[] = Array.isArray(existingCleared) ? existingCleared : [];
        const zoneId = (session as Record<string, unknown>).zoneId as string || 'sunken-crypt';
        const newZonesCleared = existingZonesCleared.includes(zoneId)
          ? existingZonesCleared
          : [...existingZonesCleared, zoneId];

        await db.transact([
          tx.players[player.id].update({
            totalClears: ((player as Record<string, unknown>).totalClears as number || 0) + 1,
            totalEarned: ((player as Record<string, unknown>).totalEarned as number || 0) + totalReward,
            highestRoom: Math.max(currentHighest, clearedRoom), // Track deepest room reached
            lastPlayedAt: Date.now(),
            totalRuns: ((player as Record<string, unknown>).totalRuns as number || 0) + 1,
            clearedZones: newZonesCleared,
          }),
        ]);
      }
    } catch (statsError) {
      console.warn('Failed to update player stats:', statsError);
      // Don't fail the whole request for stats
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
      reward: totalReward,
      payoutStatus: 'paid',
      txSignature: signature,
    });

  } catch (error) {
    console.error('Failed to process victory:', error);
    return NextResponse.json({ error: 'Failed to process victory' }, { status: 500 });
  }
}
