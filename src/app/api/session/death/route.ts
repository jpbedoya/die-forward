import { NextRequest, NextResponse } from 'next/server';
import { init, tx, id } from '@instantdb/admin';

// Initialize InstantDB Admin client
const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken, room, finalMessage, inventory, playerName } = body;

    // Validate inputs
    if (!sessionToken || typeof sessionToken !== 'string') {
      return NextResponse.json({ error: 'Invalid session token' }, { status: 400 });
    }

    if (typeof room !== 'number' || room < 1 || room > 20) {
      return NextResponse.json({ error: 'Invalid room number' }, { status: 400 });
    }

    if (!finalMessage || typeof finalMessage !== 'string' || finalMessage.length > 50) {
      return NextResponse.json({ error: 'Invalid final message' }, { status: 400 });
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

    // Create death and corpse records
    const deathId = id();
    const corpseId = id();

    // Pick a random item from inventory for corpse loot
    const inventoryArray = Array.isArray(inventory) ? inventory : [];
    const lootItem = inventoryArray.length > 0
      ? inventoryArray[Math.floor(Math.random() * inventoryArray.length)]
      : { name: 'Nothing', emoji: '💀' };

    const displayName = playerName || `${session.walletAddress.slice(0, 4)}...${session.walletAddress.slice(-4)}`;

    await db.transact([
      // Record the death
      tx.deaths[deathId].update({
        walletAddress: session.walletAddress,
        playerName: displayName,
        zone: session.zone,
        room,
        stakeAmount: session.stakeAmount,
        finalMessage: finalMessage.trim(),
        inventory: JSON.stringify(inventoryArray),
        createdAt: Date.now(),
      }),
      // Create a corpse for other players to find
      tx.corpses[corpseId].update({
        deathId,
        zone: session.zone,
        room,
        playerName: displayName,
        walletAddress: session.walletAddress, // For tipping
        finalMessage: finalMessage.trim(),
        loot: lootItem.name,
        lootEmoji: lootItem.emoji,
        discovered: false,
        tipped: false,
        tipAmount: 0,
        createdAt: Date.now(),
      }),
      // Mark session as dead
      tx.sessions[session.id].update({
        status: 'dead',
        endedAt: Date.now(),
        finalRoom: room,
      }),
    ]);

    // Update player stats (increment deaths, track lost stake)
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
        await db.transact([
          tx.players[player.id].update({
            totalDeaths: ((player as Record<string, unknown>).totalDeaths as number || 0) + 1,
            totalLost: ((player as Record<string, unknown>).totalLost as number || 0) + session.stakeAmount,
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
      deathId,
      corpseId,
    });

  } catch (error) {
    console.error('Failed to record death:', error);
    return NextResponse.json({ error: 'Failed to record death' }, { status: 500 });
  }
}
