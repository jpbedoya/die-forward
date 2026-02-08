import { NextRequest, NextResponse } from 'next/server';
import { init, tx, id } from '@instantdb/admin';
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
    let agentWallet = walletAddress || `agent_${agentName}`;
    
    // Handle stake modes
    if (stakeMode === 'agentwallet') {
      // AgentWallet integration
      // Expects: stake.username, stake.apiToken, stake.amount
      if (!stake?.username || !stake?.apiToken) {
        return NextResponse.json({ 
          error: 'AgentWallet username and apiToken required. Get one at https://agentwallet.mcpay.tech',
          hint: 'stake: { mode: "agentwallet", username: "...", apiToken: "mf_...", amount: 0.05 }'
        }, { status: 400 });
      }
      
      const validAmounts = [0.01, 0.05, 0.1, 0.25];
      if (!stake?.amount || !validAmounts.includes(stake.amount)) {
        return NextResponse.json({ 
          error: `Invalid stake amount. Valid: ${validAmounts.join(', ')} SOL`,
        }, { status: 400 });
      }
      
      // Get agent's Solana address from AgentWallet
      const walletInfoRes = await fetch(
        `https://agentwallet.mcpay.tech/api/wallets/${stake.username}`,
        { headers: { 'Authorization': `Bearer ${stake.apiToken}` } }
      );
      
      if (!walletInfoRes.ok) {
        return NextResponse.json({ 
          error: 'Failed to fetch AgentWallet info. Check username/token.',
        }, { status: 400 });
      }
      
      const walletInfo = await walletInfoRes.json();
      if (!walletInfo.solanaAddress) {
        return NextResponse.json({ 
          error: 'AgentWallet has no Solana address.',
        }, { status: 400 });
      }
      
      agentWallet = walletInfo.solanaAddress;
      
      // Transfer SOL from AgentWallet to pool
      const POOL_WALLET = process.env.NEXT_PUBLIC_POOL_WALLET || 'D7NdNbJTL7s6Z7Wu8nGe5SBc64FiFQAH3iPvRZw15qSL';
      const lamports = Math.floor(stake.amount * 1_000_000_000); // SOL has 9 decimals
      const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
      
      const transferRes = await fetch(
        `https://agentwallet.mcpay.tech/api/wallets/${stake.username}/actions/transfer-solana`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stake.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: POOL_WALLET,
            amount: lamports.toString(),
            asset: 'sol',
            network,
          }),
        }
      );
      
      if (!transferRes.ok) {
        const err = await transferRes.json().catch(() => ({}));
        return NextResponse.json({ 
          error: `AgentWallet transfer failed: ${err.error || 'Unknown error'}`,
          hint: err.hint || 'Ensure wallet has sufficient SOL balance',
        }, { status: 400 });
      }
      
      const transferResult = await transferRes.json();
      if (transferResult.status !== 'confirmed') {
        return NextResponse.json({ 
          error: `Transfer not confirmed: ${transferResult.status}`,
        }, { status: 400 });
      }
      
      stakeAmount = stake.amount;
      
      // Update pool stats
      try {
        const { pool } = await db.query({ pool: {} });
        const currentPool = pool?.[0] as { totalStaked?: number } | undefined;
        const poolId = 'main-pool';
        await db.transact([
          tx.pool[poolId].update({
            totalStaked: (currentPool?.totalStaked || 0) + stakeAmount,
          }),
        ]);
      } catch (e) {
        console.warn('Failed to update pool stats:', e);
      }
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
        walletAddress: agentWallet,
        playerName,
        zone: 'THE SUNKEN CRYPT',
        stakeAmount,
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
