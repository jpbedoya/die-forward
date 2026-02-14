import { NextRequest, NextResponse } from 'next/server';
import { init, tx, id } from '@instantdb/admin';
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

// Initialize InstantDB Admin client
const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_KEY!,
});

// CORS headers for unified codebase
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Pool wallet keypair (loaded from env)
function getPoolKeypair(): Keypair {
  const secretKey = JSON.parse(process.env.POOL_WALLET_SECRET || '[]');
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
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

    // Calculate reward (stake back + bonus from pool)
    // For now: return stake + 50% bonus (simple formula)
    const stakeAmount = session.stakeAmount || 0;
    const bonus = stakeAmount * 0.5; // 50% bonus for clearing
    const totalReward = stakeAmount + bonus;

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
    try {
      const { players } = await db.query({
        players: {
          $: {
            where: { walletAddress: session.walletAddress },
            limit: 1,
          },
        },
      });

      if (players && players.length > 0) {
        const player = players[0];
        const currentHighest = (player as Record<string, unknown>).highestRoom as number || 0;
        const clearedRoom = 12; // Full dungeon clear = room 12
        await db.transact([
          tx.players[player.id].update({
            totalClears: ((player as Record<string, unknown>).totalClears as number || 0) + 1,
            totalEarned: ((player as Record<string, unknown>).totalEarned as number || 0) + totalReward,
            highestRoom: Math.max(currentHighest, clearedRoom), // Track deepest room reached
            lastPlayedAt: Date.now(),
          }),
        ]);
      }
    } catch (statsError) {
      console.warn('Failed to update player stats:', statsError);
      // Don't fail the whole request for stats
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
