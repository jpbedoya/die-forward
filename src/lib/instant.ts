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
  createdAt: number;
}

export interface Corpse {
  id: string;
  deathId: string;
  zone: string;
  room: number;
  playerName: string;
  finalMessage: string;
  loot: string; // Single item name
  lootEmoji: string;
  discovered: boolean;
  discoveredBy?: string;
  createdAt: number;
}

export interface PlayerStats {
  id: string;
  walletAddress: string;
  playerName: string;
  totalDeaths: number;
  totalClears: number;
  totalEarned: number;
  totalLost: number;
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
      finalMessage: data.finalMessage,
      loot: lootItem.name,
      lootEmoji: lootItem.emoji,
      discovered: false,
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
  console.log('Clear recorded:', data);
}

export async function discoverCorpse(corpseId: string, discoveredBy: string) {
  await db.transact([
    tx.corpses[corpseId].update({
      discovered: true,
      discoveredBy,
    }),
  ]);
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

  // Debug logging
  if (typeof window !== 'undefined') {
    console.log(`[Corpses] Zone: ${zone}, Room: ${room}, Found: ${nearbyCorpses.length}`, nearbyCorpses);
  }

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

  // Debug logging
  if (error) {
    console.error('Death feed error:', error);
  }
  if (data) {
    console.log('Death feed data:', data?.deaths?.length, 'deaths');
  }

  return {
    deaths: sortedDeaths,
    isLoading,
    error,
  };
}

// Get leaderboard (top players by clears)
export function useLeaderboard(limit = 10) {
  // For MVP, we'll aggregate from deaths
  // In production, you'd have a proper playerStats collection
  const { data, isLoading, error } = db.useQuery({
    deaths: {
      $: {
        order: { createdAt: 'desc' },
        limit: 100, // Get recent deaths to aggregate
      },
    },
  });

  // Aggregate deaths by player (mock leaderboard for now)
  // Real implementation would need server-side aggregation
  const deaths = data?.deaths || [];
  const playerDeaths: Record<string, { deaths: number; totalStaked: number }> = {};
  
  deaths.forEach((death) => {
    const d = death as unknown as Death;
    if (!playerDeaths[d.playerName]) {
      playerDeaths[d.playerName] = { deaths: 0, totalStaked: 0 };
    }
    playerDeaths[d.playerName].deaths++;
    playerDeaths[d.playerName].totalStaked += d.stakeAmount || 0;
  });

  return {
    // Return mock data for now - real leaderboard needs clears tracking
    deaths,
    playerDeaths,
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
