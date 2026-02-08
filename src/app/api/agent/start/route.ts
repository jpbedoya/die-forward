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
      // Expects: stake.wallet (AgentWallet address) and stake.amount
      if (!stake?.wallet) {
        return NextResponse.json({ 
          error: 'AgentWallet address required. Get one at https://agentwallet.mcpay.tech',
        }, { status: 400 });
      }
      
      // TODO: Integrate with AgentWallet API to handle staking
      // For now, accept the wallet but don't process real stakes
      agentWallet = stake.wallet;
      stakeAmount = stake?.amount || 0;
      
      // Note: Full AgentWallet integration would:
      // 1. Call AgentWallet API to initiate stake transfer
      // 2. AgentWallet handles the signing
      // 3. We verify and start the game
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
