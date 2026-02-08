import { NextRequest, NextResponse } from 'next/server';
import { init, tx, id } from '@instantdb/admin';
import { Connection, PublicKey } from '@solana/web3.js';
import { 
  getExploreRoom, 
  getCorpseRoom, 
  getCombatRoom, 
  getCacheRoom,
  getExitRoom,
} from '@/lib/content';

// Initialize InstantDB Admin client
const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_KEY!,
});

// Pool wallet for receiving stakes
const POOL_WALLET = process.env.NEXT_PUBLIC_POOL_WALLET || 'D7NdNbJTL7s6Z7Wu8nGe5SBc64FiFQAH3iPvRZw15qSL';

// Valid stake amounts
const VALID_STAKES = [0.01, 0.05, 0.1, 0.25];

// Verify a prepaid transaction
async function verifyPrepaidTx(txSignature: string, expectedAmount: number): Promise<{ valid: boolean; sender?: string; error?: string }> {
  try {
    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );
    
    const tx = await connection.getTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
    });
    
    if (!tx || !tx.meta) {
      return { valid: false, error: 'Transaction not found' };
    }
    
    // Check if transaction succeeded
    if (tx.meta.err) {
      return { valid: false, error: 'Transaction failed' };
    }
    
    // Find transfer to pool wallet
    const poolPubkey = new PublicKey(POOL_WALLET);
    const accountKeys = tx.transaction.message.getAccountKeys();
    const poolIndex = accountKeys.staticAccountKeys.findIndex(
      key => key.equals(poolPubkey)
    );
    
    if (poolIndex === -1) {
      return { valid: false, error: 'Transaction does not include pool wallet' };
    }
    
    // Check amount received by pool
    const preBalance = tx.meta.preBalances[poolIndex] || 0;
    const postBalance = tx.meta.postBalances[poolIndex] || 0;
    const received = (postBalance - preBalance) / 1e9; // Convert lamports to SOL
    
    if (received < expectedAmount * 0.99) { // Allow 1% slippage
      return { valid: false, error: `Insufficient amount: received ${received}, expected ${expectedAmount}` };
    }
    
    // Get sender address
    const senderIndex = 0; // First account is usually the fee payer/sender
    const sender = accountKeys.staticAccountKeys[senderIndex]?.toBase58();
    
    return { valid: true, sender };
  } catch (error) {
    console.error('TX verification error:', error);
    return { valid: false, error: 'Failed to verify transaction' };
  }
}

// Room type distribution
function generateRoomType(roomNum: number, totalRooms: number): 'explore' | 'combat' | 'corpse' | 'cache' | 'exit' {
  // Last room is always exit
  if (roomNum === totalRooms) return 'exit';
  
  // First room is always explore
  if (roomNum === 1) return 'explore';
  
  // Combat in rooms 3, 5, 7 (roughly every other room after start)
  if (roomNum % 2 === 1 && roomNum > 1) return 'combat';
  
  // Mix of corpse/cache/explore for other rooms
  const rand = Math.random();
  if (rand < 0.4) return 'corpse';
  if (rand < 0.6) return 'cache';
  return 'explore';
}

// Generate dungeon layout
function generateDungeon(totalRooms: number) {
  const dungeon: Array<{
    type: string;
    content: ReturnType<typeof getExploreRoom>;
    enemy?: { name: string; emoji: string };
  }> = [];
  
  for (let i = 1; i <= totalRooms; i++) {
    const type = generateRoomType(i, totalRooms);
    let content;
    let enemy;
    
    switch (type) {
      case 'combat':
        content = getCombatRoom();
        // Pick a random enemy
        const enemies = [
          { name: 'The Drowned', emoji: '🧟' },
          { name: 'Pale Crawler', emoji: '🕷️' },
          { name: 'The Bound', emoji: '⛓️' },
          { name: 'Hollow Clergy', emoji: '👻' },
        ];
        enemy = enemies[Math.floor(Math.random() * enemies.length)];
        break;
      case 'corpse':
        content = getCorpseRoom();
        break;
      case 'cache':
        content = getCacheRoom();
        break;
      case 'exit':
        content = getExitRoom();
        break;
      default:
        content = getExploreRoom();
    }
    
    dungeon.push({ type, content, enemy });
  }
  
  return dungeon;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentName, nickname, walletAddress, stake } = body;

    if (!agentName || typeof agentName !== 'string') {
      return NextResponse.json({ error: 'agentName is required' }, { status: 400 });
    }

    // Parse stake mode (default: free)
    const stakeMode = stake?.mode || 'free';
    let stakeAmount = 0;
    let verifiedWallet = walletAddress || `agent_${agentName}`;
    let txSignature = null;
    
    // Handle different stake modes
    if (stakeMode === 'prepaid') {
      // Validate prepaid staking
      if (!stake?.txSignature) {
        return NextResponse.json({ error: 'txSignature required for prepaid mode' }, { status: 400 });
      }
      if (!stake?.amount || !VALID_STAKES.includes(stake.amount)) {
        return NextResponse.json({ 
          error: `Invalid stake amount. Valid amounts: ${VALID_STAKES.join(', ')} SOL` 
        }, { status: 400 });
      }
      
      // Verify the transaction
      const verification = await verifyPrepaidTx(stake.txSignature, stake.amount);
      if (!verification.valid) {
        return NextResponse.json({ 
          error: `Transaction verification failed: ${verification.error}` 
        }, { status: 400 });
      }
      
      stakeAmount = stake.amount;
      txSignature = stake.txSignature;
      if (verification.sender) {
        verifiedWallet = verification.sender;
      }
      
      // Update pool stats
      const { pool } = await db.query({ pool: {} });
      const currentPool = pool?.[0] as { totalStaked?: number; totalDeaths?: number } | undefined;
      const poolId = 'main-pool';
      
      await db.transact([
        tx.pool[poolId].update({
          totalStaked: (currentPool?.totalStaked || 0) + stakeAmount,
        }),
      ]);
      
    } else if (stakeMode === 'agentwallet') {
      // AgentWallet integration - TODO: implement when AgentWallet API is available
      // For now, treat as free mode with a note
      return NextResponse.json({ 
        error: 'AgentWallet mode coming soon. Use "free" or "prepaid" mode for now.',
        hint: 'For prepaid: send SOL to pool wallet first, then provide txSignature'
      }, { status: 501 });
    }
    // else: free mode (stakeAmount remains 0)

    // Generate session
    const sessionId = id();
    const token = `agent_${sessionId}_${Date.now()}`;
    const totalRooms = 5 + Math.floor(Math.random() * 3); // 5-7 rooms
    const dungeon = generateDungeon(totalRooms);
    
    // Starting inventory
    const inventory = [
      { id: 'torch', name: 'Torch', emoji: '🔦' },
      { id: 'herbs', name: 'Herbs', emoji: '🌿' },
    ];
    
    // Player display name
    const playerName = nickname || `@${agentName}`;

    // Create session in DB
    await db.transact([
      tx.sessions[sessionId].update({
        token,
        walletAddress: verifiedWallet,
        playerName,
        zone: 'THE SUNKEN CRYPT',
        stakeAmount,
        txSignature,
        currentRoom: 1,
        totalRooms,
        health: 100,
        maxHealth: 100,
        stamina: 3,
        inventory: JSON.stringify(inventory),
        dungeon: JSON.stringify(dungeon),
        status: 'active',
        isAgent: true,
        agentName,
        stakeMode,
        createdAt: Date.now(),
      }),
    ]);

    // Build initial state
    const firstRoom = dungeon[0];
    const state = {
      phase: firstRoom.type === 'combat' ? 'combat' : 'explore',
      room: 1,
      totalRooms,
      health: 100,
      maxHealth: 100,
      stamina: 3,
      inventory: inventory.map(i => i.name),
      narrative: firstRoom.content?.narrative || 'You descend into darkness...',
      options: (firstRoom.content?.options || ['Continue']).map((opt, i) => ({
        id: String(i + 1),
        text: opt,
      })),
      enemy: firstRoom.enemy ? {
        name: firstRoom.enemy.name,
        health: 80 + Math.floor(Math.random() * 40),
        maxHealth: 80 + Math.floor(Math.random() * 40),
        intent: 'AGGRESSIVE',
        tier: 2,
      } : null,
    };

    return NextResponse.json({
      sessionId,
      state,
    });

  } catch (error) {
    console.error('Agent start error:', error);
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
  }
}
