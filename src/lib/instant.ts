import { init, tx, id } from '@instantdb/react';

// Initialize InstantDB
// App ID should be set in environment variables
const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID!;

// Schema types
export interface Death {
  id: string;
  walletAddress: string;
  playerName: string;
  zone: string;
  room: number;
  stakeAmount: number;
  finalMessage: string;
  inventory: string[]; // JSON serialized
  deathHash?: string; // SHA256 hash for verification
  onChainSignature?: string; // Solana tx signature
  createdAt: number;
}

export interface Corpse {
  id: string;
  deathId: string;
  zone: string;
  room: number;
  playerName: string;
  walletAddress: string; // For tipping the dead
  finalMessage: string;
  loot: string; // Single item name
  lootEmoji: string;
  discovered: boolean;
  discoveredBy?: string;
  tipped?: boolean; // Whether someone tipped this corpse
  tipAmount?: number; // Total tips received
  createdAt: number;
}

export interface Player {
  id: string;
  walletAddress: string;
  nickname: string;
  totalDeaths: number;
  totalClears: number;
  totalEarned: number;
  totalLost: number;
  totalTipsReceived: number;
  totalTipsSent: number;
  createdAt: number;
  lastPlayedAt: number;
}

// Initialize the database
export const db = init({ appId: APP_ID });

// Helper functions
export async function recordDeath(data: {
  walletAddress: string;
  playerName: string;
  zone: string;
  room: number;
  stakeAmount: number;
  finalMessage: string;
  inventory: { name: string; emoji: string }[];
}) {
  const deathId = id();
  const corpseId = id();
  
  // Pick a random item from inventory for the corpse loot (if any)
  const lootItem = data.inventory.length > 0 
    ? data.inventory[Math.floor(Math.random() * data.inventory.length)]
    : { name: 'Nothing', emoji: '💀' };

  await db.transact([
    // Record the death
    tx.deaths[deathId].update({
      walletAddress: data.walletAddress,
      playerName: data.playerName,
      zone: data.zone,
      room: data.room,
      stakeAmount: data.stakeAmount,
      finalMessage: data.finalMessage,
      inventory: JSON.stringify(data.inventory),
      createdAt: Date.now(),
    }),
    // Create a corpse for other players to find
    tx.corpses[corpseId].update({
      deathId,
      zone: data.zone,
      room: data.room,
      playerName: data.playerName,
      walletAddress: data.walletAddress, // For tipping
      finalMessage: data.finalMessage,
      loot: lootItem.name,
      lootEmoji: lootItem.emoji,
      discovered: false,
      tipped: false,
      tipAmount: 0,
      createdAt: Date.now(),
    }),
  ]);

  return { deathId, corpseId };
}

export async function recordClear(data: {
  walletAddress: string;
  playerName: string;
  zone: string;
  stakeAmount: number;
  reward: number;
}) {
  // Update player stats on clear
  // This would need to be done with a proper upsert pattern
  // For MVP, we'll just track it
  // TODO: Implement clears table for leaderboard
}

export async function discoverCorpse(corpseId: string, discoveredBy: string) {
  await db.transact([
    tx.corpses[corpseId].update({
      discovered: true,
      discoveredBy,
    }),
  ]);
}

// Record a tip sent to a corpse
export async function recordTip(corpseId: string, amount: number, tipperWallet: string) {
  // Just mark as tipped - we don't track cumulative amount for simplicity
  await db.transact([
    tx.corpses[corpseId].update({
      tipped: true,
      tipAmount: amount, // Most recent tip amount
      lastTippedBy: tipperWallet,
    }),
  ]);
}

// ============ PLAYER MANAGEMENT ============

// Get or create a player record by wallet address
export async function getOrCreatePlayer(walletAddress: string, nickname?: string): Promise<Player | null> {
  try {
    // Try to find existing player
    const result = await db.queryOnce({
      players: {
        $: {
          where: { walletAddress },
          limit: 1,
        },
      },
    });

    const players = result.data?.players || [];

    if (players && players.length > 0) {
      // Update last played time
      const player = players[0] as unknown as Player;
      await db.transact([
        tx.players[player.id].update({
          lastPlayedAt: Date.now(),
          // Update nickname if provided and different
          ...(nickname && nickname !== player.nickname ? { nickname } : {}),
        }),
      ]);
      return { ...player, nickname: nickname || player.nickname };
    }

    // Create new player
    const playerId = id();
    const newPlayer: Omit<Player, 'id'> = {
      walletAddress,
      nickname: nickname || walletAddress.slice(0, 4) + '...' + walletAddress.slice(-4),
      totalDeaths: 0,
      totalClears: 0,
      totalEarned: 0,
      totalLost: 0,
      totalTipsReceived: 0,
      totalTipsSent: 0,
      createdAt: Date.now(),
      lastPlayedAt: Date.now(),
    };

    await db.transact([
      tx.players[playerId].update(newPlayer),
    ]);

    return { id: playerId, ...newPlayer };
  } catch (error) {
    console.error('Failed to get/create player:', error);
    return null;
  }
}

// Update player nickname
export async function updatePlayerNickname(walletAddress: string, nickname: string): Promise<boolean> {
  try {
    const result = await db.queryOnce({
      players: {
        $: {
          where: { walletAddress },
          limit: 1,
        },
      },
    });

    const players = result.data?.players || [];

    if (players && players.length > 0) {
      const player = players[0] as unknown as Player;
      await db.transact([
        tx.players[player.id].update({ nickname }),
      ]);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to update nickname:', error);
    return false;
  }
}

// Increment player death stats
export async function incrementPlayerDeaths(walletAddress: string, stakeLost: number): Promise<void> {
  try {
    const result = await db.queryOnce({
      players: {
        $: {
          where: { walletAddress },
          limit: 1,
        },
      },
    });

    const players = result.data?.players || [];

    if (players && players.length > 0) {
      const player = players[0] as unknown as Player;
      await db.transact([
        tx.players[player.id].update({
          totalDeaths: (player.totalDeaths || 0) + 1,
          totalLost: (player.totalLost || 0) + stakeLost,
          lastPlayedAt: Date.now(),
        }),
      ]);
    }
  } catch (error) {
    console.error('Failed to increment deaths:', error);
  }
}

// Increment player clear stats
export async function incrementPlayerClears(walletAddress: string, earned: number): Promise<void> {
  try {
    const result = await db.queryOnce({
      players: {
        $: {
          where: { walletAddress },
          limit: 1,
        },
      },
    });

    const players = result.data?.players || [];

    if (players && players.length > 0) {
      const player = players[0] as unknown as Player;
      await db.transact([
        tx.players[player.id].update({
          totalClears: (player.totalClears || 0) + 1,
          totalEarned: (player.totalEarned || 0) + earned,
          lastPlayedAt: Date.now(),
        }),
      ]);
    }
  } catch (error) {
    console.error('Failed to increment clears:', error);
  }
}

// Hook to get player data
export function usePlayer(walletAddress: string | null) {
  const { data, isLoading, error } = db.useQuery(
    walletAddress
      ? {
          players: {
            $: {
              where: { walletAddress },
              limit: 1,
            },
          },
        }
      : null
  );

  const player = data?.players?.[0] as unknown as Player | undefined;

  return {
    player,
    isLoading,
    error,
  };
}

// Hook to get leaderboard (top players by clears)
export function useLeaderboard(limit = 10) {
  const { data, isLoading, error } = db.useQuery({
    players: {
      $: {
        limit,
        // Note: InstantDB may need server-side sorting
        // For now we'll sort client-side
      },
    },
  });

  // Sort by clears descending, then by deaths ascending
  const leaderboard = (data?.players || [])
    .map((p) => p as unknown as Player)
    .sort((a, b) => {
      if (b.totalClears !== a.totalClears) return b.totalClears - a.totalClears;
      return a.totalDeaths - b.totalDeaths;
    })
    .slice(0, limit);

  return {
    leaderboard,
    isLoading,
    error,
  };
}

// Get undiscovered corpses for a zone (checks current room and nearby)
export function useCorpseForRoom(zone: string, room: number) {
  // Fetch all undiscovered corpses in the zone
  const { data, isLoading, error } = db.useQuery({
    corpses: {
      $: {
        where: {
          zone,
          discovered: false,
        },
        limit: 20,
      },
    },
  });

  // Filter client-side for nearby rooms (room-1, room, room+1)
  const nearbyCorpses = (data?.corpses || []).filter((c) => {
    const corpseRoom = (c as unknown as Corpse).room;
    return corpseRoom >= room - 1 && corpseRoom <= room + 1;
  });

  return {
    corpses: nearbyCorpses,
    isLoading,
    error,
  };
}

// Get recent deaths for the feed
export function useDeathFeed(limit = 10) {
  const { data, isLoading, error } = db.useQuery({
    deaths: {
      $: {
        limit,
      },
    },
  });

  // Sort client-side by createdAt desc
  const sortedDeaths = [...(data?.deaths || [])].sort((a, b) => 
    (b.createdAt || 0) - (a.createdAt || 0)
  );

  return {
    deaths: sortedDeaths,
    isLoading,
    error,
  };
}

// Get pool stats
export function usePoolStats() {
  const { data, isLoading, error } = db.useQuery({
    deaths: {},
  });

  const deaths = data?.deaths || [];
  const totalDeaths = deaths.length;
  const totalStaked = deaths.reduce((sum: number, d) => sum + ((d as unknown as Death).stakeAmount || 0), 0);

  return {
    totalDeaths,
    totalStaked,
    isLoading,
    error,
  };
}
