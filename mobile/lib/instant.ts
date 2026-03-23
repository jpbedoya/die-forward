import { init, tx, id } from '@instantdb/react-native';
import { useMemo } from 'react';

// Default names pool for new guest players
const DEFAULT_GUEST_NAMES = [
  'Wanderer', 'AshenpilgriM', 'HollowSeeker', 'Saltborn', 'Cairnwalker',
  'TheForsaken', 'MurkDelver', 'Bonepath', 'Driftborn',
];
function getRandomGuestName(): string {
  return DEFAULT_GUEST_NAMES[Math.floor(Math.random() * DEFAULT_GUEST_NAMES.length)];
}

// App ID - same as web version
const APP_ID = process.env.EXPO_PUBLIC_INSTANT_APP_ID;
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
  nowPlayingTitle?: string;
  nowPlayingArtist?: string;
  tapestryContentId?: string;
  likeCount?: number;
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
  authId: string;              // InstantDB auth.id (wallet address OR guest UUID)
  authType: 'wallet' | 'guest' | 'email';
  walletAddress?: string;      // Only for wallet users
  email?: string;              // Future: for email-claimed accounts
  nickname: string;
  totalDeaths: number;
  totalClears: number;
  totalEarned: number;
  totalLost: number;
  totalTipsReceived: number;
  totalTipsSent: number;
  totalLikesReceived: number;
  highestRoom: number;
  createdAt: number;
  lastPlayedAt: number;
  // Milestone cosmetics
  activeTitle?: string;
  activeBorder?: string;
  unlockedTitles?: string[];
  unlockedBorders?: string[];
  // Zone progression — IDs of zones where the boss was defeated
  clearedZones?: string[];
}

// Persist title/border milestone unlocks in player profile (idempotent).
export async function applyMilestoneCosmetics(
  player: Pick<Player, 'id' | 'activeTitle' | 'activeBorder' | 'unlockedTitles' | 'unlockedBorders'>,
  milestone: { type: 'title' | 'border' | 'item_pool' | 'perk'; value: string },
): Promise<void> {
  if (milestone.type !== 'title' && milestone.type !== 'border') return;

  const updates: Partial<Player> = {};

  if (milestone.type === 'title') {
    const unlocked = Array.from(new Set([...(player.unlockedTitles || []), milestone.value]));
    updates.unlockedTitles = unlocked;
    if (!player.activeTitle) {
      updates.activeTitle = milestone.value;
    }
  }

  if (milestone.type === 'border') {
    const unlocked = Array.from(new Set([...(player.unlockedBorders || []), milestone.value]));
    updates.unlockedBorders = unlocked;
    if (!player.activeBorder) {
      updates.activeBorder = milestone.value;
    }
  }

  if (Object.keys(updates).length === 0) return;

  await db.transact([
    tx.players[player.id].update(updates),
  ]);
}

// Initialize the database
export const db = init({ appId: APP_ID });

// Auth hook - get current InstantDB auth state
export function useAuth() {
  return db.useAuth();
}

// Get player by current auth
export function useCurrentPlayer() {
  const { user, isLoading: authLoading } = db.useAuth();

  // Derive the authId that was stored in the player record.
  // Tokens are created with email = "<authId>@wallet.dieforward.com" or
  // "<guestId>@guest.dieforward.com", so strip the domain suffix to get
  // the original authId that getOrCreatePlayerByAuth stored.
  const authId = user?.email
    ? user.email.replace(/@(wallet|guest)\.dieforward\.com$/, '')
    : null;
  
  const { data, isLoading: playerLoading, error } = db.useQuery(
    authId
      ? {
          players: {
            $: {
              where: { authId },
              limit: 1,
            },
          },
        }
      : null
  );

  const player = data?.players?.[0] as unknown as Player | undefined;

  return {
    user,
    player,
    isLoading: authLoading || playerLoading,
    error,
  };
}

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

// Get or create player by authId (new auth system)
//
// Identity rules (source of truth):
//   wallet users → authId = walletAddress (never a guest ID)
//   guest  users → authId = guestId UUID (persisted in AsyncStorage)
//
// Safeguards:
//   1. For wallet users, ALSO check by walletAddress so we never create a
//      duplicate when the authId lookup misses (e.g. after a data migration).
//   2. Never let a guest ID overwrite a wallet user's authId.
export async function getOrCreatePlayerByAuth(
  authId: string,
  authType: 'wallet' | 'guest',
  walletAddress?: string,
  nickname?: string
): Promise<{ player: Player; isNew: boolean } | null> {
  try {
    // ── 1. Try lookup by authId first ────────────────────────────────────────
    const byAuthId = await db.queryOnce({
      players: { $: { where: { authId }, limit: 1 } },
    });
    let existing = (byAuthId.data?.players?.[0] ?? null) as unknown as Player | null;

    // ── 2. Wallet fallback: also check by walletAddress ──────────────────────
    //    Prevents duplicate records when authId was somehow stored differently.
    if (!existing && authType === 'wallet' && walletAddress) {
      const byWallet = await db.queryOnce({
        players: { $: { where: { walletAddress }, limit: 1 } },
      });
      const found = (byWallet.data?.players?.[0] ?? null) as unknown as Player | null;

      if (found) {
        // Safeguard: correct the authId to walletAddress if it drifted
        if (found.authId !== walletAddress) {
          console.warn(`[Auth] Correcting authId drift for ${walletAddress}: ${found.authId} → ${walletAddress}`);
          await db.transact([tx.players[found.id].update({ authId: walletAddress, authType: 'wallet' })]);
        }
        existing = { ...found, authId: walletAddress };
      }
    }

    // ── 3. Update existing record ────────────────────────────────────────────
    if (existing) {
      // Safeguard: never overwrite a wallet authId with a guest ID
      const safeAuthId = existing.authType === 'wallet'
        ? (existing.walletAddress || existing.authId)
        : existing.authId;

      // Update lastPlayedAt (and nickname if provided) — but don't let a
      // failed transact prevent us from returning the player data. The read
      // already succeeded (view: "true"); the write may fail if the auth
      // session is missing or expired.
      try {
        await db.transact([
          tx.players[existing.id].update({
            authId: safeAuthId,
            lastPlayedAt: Date.now(),
            ...(nickname && nickname !== existing.nickname ? { nickname } : {}),
          }),
        ]);
      } catch (updateErr) {
        console.warn('[Player] Could not update lastPlayedAt (will retry next session):', updateErr);
      }

      return {
        player: { ...existing, authId: safeAuthId, nickname: nickname || existing.nickname },
        isNew: false,
      };
    }

    // ── 4. Create new player ─────────────────────────────────────────────────
    const playerId = id();
    const defaultNickname = walletAddress
      ? walletAddress.slice(0, 4) + '...' + walletAddress.slice(-4)
      : getRandomGuestName();

    const newPlayer: Omit<Player, 'id'> = {
      authId,
      authType,
      walletAddress,
      nickname: nickname || defaultNickname,
      totalDeaths: 0,
      totalClears: 0,
      totalEarned: 0,
      totalLost: 0,
      totalTipsReceived: 0,
      totalTipsSent: 0,
      totalLikesReceived: 0,
      highestRoom: 0,
      createdAt: Date.now(),
      lastPlayedAt: Date.now(),
    };

    await db.transact([tx.players[playerId].update(newPlayer)]);

    return {
      player: { id: playerId, ...newPlayer } as Player,
      isNew: true,
    };
  } catch (error) {
    console.error('Failed to get/create player:', error);
    return null;
  }
}

// Legacy: Get or create player by wallet address (for backwards compatibility)
export async function getOrCreatePlayer(walletAddress: string, nickname?: string): Promise<Player | null> {
  const result = await getOrCreatePlayerByAuth(walletAddress, 'wallet', walletAddress, nickname);
  return result?.player || null;
}

// Update player nickname by authId
export async function updatePlayerNicknameByAuth(authId: string, nickname: string): Promise<boolean> {
  try {
    const result = await db.queryOnce({
      players: {
        $: {
          where: { authId },
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

// Legacy: Update player nickname by wallet address
export async function updatePlayerNickname(walletAddress: string, nickname: string): Promise<boolean> {
  return updatePlayerNicknameByAuth(walletAddress, nickname);
}

// Update highest room reached
export async function updateHighestRoom(authId: string, room: number): Promise<void> {
  try {
    const result = await db.queryOnce({
      players: {
        $: {
          where: { authId },
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

// Add a zone to the player's clearedZones list (idempotent — won't add duplicates)
export async function updatePlayerClearedZone(authId: string, zoneId: string): Promise<void> {
  try {
    const result = await db.queryOnce({
      players: { $: { where: { authId }, limit: 1 } },
    });
    const player = result.data?.players?.[0] as unknown as Player | undefined;
    if (!player) return;
    const current = player.clearedZones ?? [];
    if (current.includes(zoneId)) return; // already recorded
    await db.transact([
      tx.players[player.id].update({ clearedZones: [...current, zoneId] }),
    ]);
  } catch (error) {
    console.error('Failed to update cleared zones:', error);
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
    .filter((p) => {
      if ((p.highestRoom || 0) === 0) return false;
      // Exclude default/unnamed players
      const nick = (p.nickname || '').trim();
      if (!nick || DEFAULT_GUEST_NAMES.includes(nick)) return false;
      // Exclude wallet-address-style nicknames like "AB12...XY78"
      if (/^[A-Za-z0-9]{4}\.\.\./.test(nick)) return false;
      return true;
    })
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
  // Phase 1: deaths only — renders quickly so echoes appear without delay
  const { data: deathData, isLoading: deathsLoading, error: deathsError } = db.useQuery({
    deaths: { $: { limit: 50, order: { serverCreatedAt: 'desc' } } },
  });

  // Phase 2: player names — arrives later, upgrades names progressively
  // Limit to recent players to avoid fetching the entire table
  const { data: playerData } = db.useQuery({
    players: { $: { limit: 200, order: { serverCreatedAt: 'desc' } } },
  });

  // Build lookup maps: walletAddress → nickname, authId → nickname
  const players = (playerData?.players || []) as unknown as Player[];
  const nameByWallet: Record<string, string> = {};
  const nameByAuthId: Record<string, string> = {};
  for (const p of players) {
    const name = p.nickname && !DEFAULT_GUEST_NAMES.includes(p.nickname) ? p.nickname : null;
    if (name && p.walletAddress) nameByWallet[p.walletAddress] = name;
    if (name && p.authId) nameByAuthId[p.authId] = name;
  }

  const deaths = [...(deathData?.deaths || [])]
    .map((d) => {
      const raw = d as unknown as Death;
      // Resolve current name: wallet lookup → authId lookup → stored playerName
      const currentName =
        nameByWallet[raw.walletAddress] ||
        nameByAuthId[raw.walletAddress] || // guests: death.walletAddress = their authId
        raw.playerName;
      return { ...raw, playerName: currentName };
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, limit);

  // isLoading only depends on deaths — players upgrade names progressively
  return { deaths, isLoading: deathsLoading, error: deathsError };
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
  staminaPool: number;         // Max stamina (pip count)
  staminaRegen: number;        // Stamina recovered per turn
  strikeCost: number;          // Stamina cost for Strike action
  // Enemy settings
  enemyCounterMultiplier: number; // Enemy counter-attack as fraction of base damage
  chargePunishment: number;    // Damage multiplier when enemy is CHARGING and player doesn't dodge
  // Intent counter system
  intentCounterBonus: number;  // Damage bonus for correct counter (dodge vs CHARGING etc)
  // Brace settings
  braceBaseDamageMin: number;  // Min damage taken when bracing (before reductions)
  braceBaseDamageMax: number;  // Max damage taken when bracing (before reductions)
  // Erratic cap
  erraticDamageMax: number;    // Cap on ERRATIC intent damage multiplier
  // Victory settings
  victoryBonusPercent: number;
  // UI settings
  showLeaderboardLink: boolean;    // Show leaderboard link on title screen
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
  dodgeSuccessRate: 0.65,
  braceReduction: 0.5,
  criticalChance: 0.15,
  criticalMultiplier: 1.75,
  fleeChanceBase: 0.5,
  fleeCleanRatio: 0.6,
  staminaPool: 4,
  staminaRegen: 1,
  strikeCost: 2,
  enemyCounterMultiplier: 0.85,
  chargePunishment: 2.0,
  intentCounterBonus: 1.5,
  braceBaseDamageMin: 6,
  braceBaseDamageMax: 12,
  erraticDamageMax: 1.3,
  victoryBonusPercent: 50,
  showLeaderboardLink: true,
};

// Hook to get game settings (from admin panel)
export function useGameSettings() {
  const { data, isLoading, error } = db.useQuery({
    gameSettings: {
      $: { limit: 1 },
    },
  });

  const dbSettings = data?.gameSettings?.[0] as unknown as GameSettings | undefined;

  // Memoize merged settings — prevents re-render cascade when InstantDB
  // re-evaluates queries after signInWithToken (the object reference stays
  // stable unless actual DB values change)
  const settings = useMemo<Omit<GameSettings, 'id'>>(() => ({
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
    staminaPool: dbSettings?.staminaPool ?? DEFAULT_GAME_SETTINGS.staminaPool,
    staminaRegen: dbSettings?.staminaRegen ?? DEFAULT_GAME_SETTINGS.staminaRegen,
    strikeCost: dbSettings?.strikeCost ?? DEFAULT_GAME_SETTINGS.strikeCost,
    enemyCounterMultiplier: dbSettings?.enemyCounterMultiplier ?? DEFAULT_GAME_SETTINGS.enemyCounterMultiplier,
    chargePunishment: dbSettings?.chargePunishment ?? DEFAULT_GAME_SETTINGS.chargePunishment,
    intentCounterBonus: dbSettings?.intentCounterBonus ?? DEFAULT_GAME_SETTINGS.intentCounterBonus,
    braceBaseDamageMin: dbSettings?.braceBaseDamageMin ?? DEFAULT_GAME_SETTINGS.braceBaseDamageMin,
    braceBaseDamageMax: dbSettings?.braceBaseDamageMax ?? DEFAULT_GAME_SETTINGS.braceBaseDamageMax,
    erraticDamageMax: dbSettings?.erraticDamageMax ?? DEFAULT_GAME_SETTINGS.erraticDamageMax,
    victoryBonusPercent: dbSettings?.victoryBonusPercent ?? DEFAULT_GAME_SETTINGS.victoryBonusPercent,
    showLeaderboardLink: dbSettings?.showLeaderboardLink ?? DEFAULT_GAME_SETTINGS.showLeaderboardLink,
  }), [dbSettings]);

  return { settings, isLoading, error };
}

// ============ DEATH SOUNDTRACK ============

export interface SoundtrackEntry {
  title: string;
  artist: string;
  deathCount: number;
}

// Hook to get the most-died-to tracks (Death Soundtrack leaderboard)
export function useDeathSoundtrack(limit = 10) {
  const { data, isLoading, error } = db.useQuery({
    deaths: {
      $: { limit: 500 },
    },
  });

  const deaths = (data?.deaths || []) as unknown as Death[];

  const trackMap = new Map<string, SoundtrackEntry>();
  for (const d of deaths) {
    if (!d.nowPlayingTitle) continue;
    const key = d.nowPlayingTitle;
    if (trackMap.has(key)) {
      trackMap.get(key)!.deathCount++;
    } else {
      trackMap.set(key, {
        title: d.nowPlayingTitle,
        artist: d.nowPlayingArtist || 'Unknown',
        deathCount: 1,
      });
    }
  }

  const soundtrack = [...trackMap.values()]
    .sort((a, b) => b.deathCount - a.deathCount)
    .slice(0, limit);

  return { soundtrack, isLoading, error };
}

// ============ PLAYLISTS (from admin) ============

export interface AdminPlaylist {
  id: string;
  audiusId: string;
  name: string;
  emoji: string;
  vibe: string;
  trackCount: number;
  enabled: boolean;
  order: number;
}

// Hook to get enabled playlists from admin settings
export function usePlaylists() {
  const { data, isLoading, error } = db.useQuery({
    playlists: {},
  });

  const playlists = ((data?.playlists || []) as unknown as AdminPlaylist[])
    .filter(p => p.enabled)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  return { playlists, isLoading, error };
}
