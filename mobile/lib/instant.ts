import { init, tx, id } from '@instantdb/react-native';

// App ID - same as web version
// Fallback to production ID if env var missing (for Vercel builds before env is set)
const APP_ID = process.env.EXPO_PUBLIC_INSTANT_APP_ID || '0700b913-585c-4de8-abdf-0bc81a0f5920';
if (!APP_ID) {
  throw new Error('EXPO_PUBLIC_INSTANT_APP_ID is required - check .env file');
}

// Schema types
export interface Death {
  id: string;
  walletAddress: string;
  playerName: string;
  zone: string;
  room: number;
  stakeAmount: number;
  finalMessage: string;
  inventory: string[];
  deathHash?: string;
  onChainSignature?: string;
  createdAt: number;
}

export interface Corpse {
  id: string;
  deathId: string;
  zone: string;
  room: number;
  playerName: string;
  walletAddress: string;
  finalMessage: string;
  loot: string;
  lootEmoji: string;
  discovered: boolean;
  discoveredBy?: string;
  tipped?: boolean;
  tipAmount?: number;
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
  highestRoom: number;
  createdAt: number;
  lastPlayedAt: number;
}

// Initialize the database
export const db = init({ appId: APP_ID });

// Record a death and create corpse
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
  
  const lootItem = data.inventory.length > 0 
    ? data.inventory[Math.floor(Math.random() * data.inventory.length)]
    : { name: 'Nothing', emoji: '💀' };

  await db.transact([
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
    tx.corpses[corpseId].update({
      deathId,
      zone: data.zone,
      room: data.room,
      playerName: data.playerName,
      walletAddress: data.walletAddress,
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

// Mark corpse as discovered
export async function discoverCorpse(corpseId: string, discoveredBy: string) {
  await db.transact([
    tx.corpses[corpseId].update({
      discovered: true,
      discoveredBy,
    }),
  ]);
}

// Record a tip
export async function recordTip(corpseId: string, amount: number, tipperWallet: string) {
  await db.transact([
    tx.corpses[corpseId].update({
      tipped: true,
      tipAmount: amount,
      lastTippedBy: tipperWallet,
    }),
  ]);
}

// Get or create player
export async function getOrCreatePlayer(walletAddress: string, nickname?: string): Promise<Player | null> {
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

    if (players.length > 0) {
      const player = players[0] as unknown as Player;
      await db.transact([
        tx.players[player.id].update({
          lastPlayedAt: Date.now(),
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
      highestRoom: 0,
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

// Update highest room reached
export async function updateHighestRoom(walletAddress: string, room: number): Promise<void> {
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
    if (players.length > 0) {
      const player = players[0] as unknown as Player;
      if (room > (player.highestRoom || 0)) {
        await db.transact([
          tx.players[player.id].update({ highestRoom: room }),
        ]);
      }
    }
  } catch (error) {
    console.error('Failed to update highest room:', error);
  }
}

// ============ HOOKS ============

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

  return { player, isLoading, error };
}

// Hook to get leaderboard
export function useLeaderboard(limit = 10) {
  const { data, isLoading, error } = db.useQuery({
    players: {
      $: {
        limit: 100,
      },
    },
  });

  const leaderboard = (data?.players || [])
    .map((p) => p as unknown as Player)
    .filter((p) => (p.highestRoom || 0) > 0)
    .sort((a, b) => {
      const aRoom = a.highestRoom || 0;
      const bRoom = b.highestRoom || 0;
      if (bRoom !== aRoom) return bRoom - aRoom;
      if (b.totalClears !== a.totalClears) return b.totalClears - a.totalClears;
      return a.totalDeaths - b.totalDeaths;
    })
    .slice(0, limit);

  return { leaderboard, isLoading, error };
}

// Hook to get corpses for a room
export function useCorpsesForRoom(zone: string, room: number) {
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

  // Filter for nearby rooms
  const nearbyCorpses = (data?.corpses || [])
    .map((c) => c as unknown as Corpse)
    .filter((c) => c.room >= room - 1 && c.room <= room + 1);

  return { corpses: nearbyCorpses, isLoading, error };
}

// Hook to get recent deaths feed
export function useDeathFeed(limit = 10) {
  const { data, isLoading, error } = db.useQuery({
    deaths: {
      $: {
        limit: 50,
      },
    },
  });

  const deaths = [...(data?.deaths || [])]
    .map((d) => d as unknown as Death)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, limit);

  return { deaths, isLoading, error };
}

// Hook to get pool stats
export function usePoolStats() {
  const { data, isLoading, error } = db.useQuery({
    deaths: {},
  });

  const deaths = (data?.deaths || []) as unknown as Death[];
  const totalDeaths = deaths.length;
  const totalStaked = deaths.reduce((sum, d) => sum + (d.stakeAmount || 0), 0);

  return { totalDeaths, totalStaked, isLoading, error };
}

// ============ GAME SETTINGS ============

export interface GameSettings {
  id: string;
  // Loot settings
  lootChanceBase: number;
  lootChanceDepth5: number;
  lootChanceDepth9: number;
  // Combat settings
  baseDamageMin: number;
  baseDamageMax: number;
  tier2Multiplier: number;
  tier3Multiplier: number;
  // Action settings
  dodgeSuccessRate: number;    // Base dodge success (0-1)
  braceReduction: number;      // Damage reduction when bracing (0-1)
  criticalChance: number;      // Crit chance (0-1)
  criticalMultiplier: number;  // Crit damage multiplier
  // Flee settings
  fleeChanceBase: number;      // Base chance to flee (0-1)
  fleeCleanRatio: number;      // Ratio of clean escapes vs hurt escapes (0-1)
  // Player settings
  staminaRegen: number;        // Stamina recovered per turn
  // Victory settings
  victoryBonusPercent: number;
  // UI settings
  showVictorsFeed: boolean;    // Show victors tab on title screen
}

// Default settings (fallback if not set in DB)
export const DEFAULT_GAME_SETTINGS: Omit<GameSettings, 'id'> = {
  lootChanceBase: 0.5,
  lootChanceDepth5: 0.65,
  lootChanceDepth9: 0.8,
  baseDamageMin: 15,
  baseDamageMax: 25,
  tier2Multiplier: 1.5,
  tier3Multiplier: 2.0,
  dodgeSuccessRate: 0.7,
  braceReduction: 0.5,
  criticalChance: 0.15,
  criticalMultiplier: 1.5,
  fleeChanceBase: 0.5,
  fleeCleanRatio: 0.6,
  staminaRegen: 1,
  victoryBonusPercent: 50,
  showVictorsFeed: false,
};

// Hook to get game settings (from admin panel)
export function useGameSettings() {
  const { data, isLoading, error } = db.useQuery({
    gameSettings: {
      $: { limit: 1 },
    },
  });

  const dbSettings = data?.gameSettings?.[0] as unknown as GameSettings | undefined;
  
  // Merge with defaults
  const settings: Omit<GameSettings, 'id'> = {
    lootChanceBase: dbSettings?.lootChanceBase ?? DEFAULT_GAME_SETTINGS.lootChanceBase,
    lootChanceDepth5: dbSettings?.lootChanceDepth5 ?? DEFAULT_GAME_SETTINGS.lootChanceDepth5,
    lootChanceDepth9: dbSettings?.lootChanceDepth9 ?? DEFAULT_GAME_SETTINGS.lootChanceDepth9,
    baseDamageMin: dbSettings?.baseDamageMin ?? DEFAULT_GAME_SETTINGS.baseDamageMin,
    baseDamageMax: dbSettings?.baseDamageMax ?? DEFAULT_GAME_SETTINGS.baseDamageMax,
    tier2Multiplier: dbSettings?.tier2Multiplier ?? DEFAULT_GAME_SETTINGS.tier2Multiplier,
    tier3Multiplier: dbSettings?.tier3Multiplier ?? DEFAULT_GAME_SETTINGS.tier3Multiplier,
    dodgeSuccessRate: dbSettings?.dodgeSuccessRate ?? DEFAULT_GAME_SETTINGS.dodgeSuccessRate,
    braceReduction: dbSettings?.braceReduction ?? DEFAULT_GAME_SETTINGS.braceReduction,
    criticalChance: dbSettings?.criticalChance ?? DEFAULT_GAME_SETTINGS.criticalChance,
    criticalMultiplier: dbSettings?.criticalMultiplier ?? DEFAULT_GAME_SETTINGS.criticalMultiplier,
    fleeChanceBase: dbSettings?.fleeChanceBase ?? DEFAULT_GAME_SETTINGS.fleeChanceBase,
    fleeCleanRatio: dbSettings?.fleeCleanRatio ?? DEFAULT_GAME_SETTINGS.fleeCleanRatio,
    staminaRegen: dbSettings?.staminaRegen ?? DEFAULT_GAME_SETTINGS.staminaRegen,
    victoryBonusPercent: dbSettings?.victoryBonusPercent ?? DEFAULT_GAME_SETTINGS.victoryBonusPercent,
    showVictorsFeed: dbSettings?.showVictorsFeed ?? DEFAULT_GAME_SETTINGS.showVictorsFeed,
  };

  return { settings, isLoading, error };
}
