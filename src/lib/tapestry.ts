/**
 * Tapestry integration for Die Forward
 *
 * Handles social graph actions: profile creation, death posts, victory posts.
 * All calls are non-fatal — Tapestry failures never affect core gameplay.
 *
 * Docs: https://docs.usetapestry.dev
 * SDK base URL: https://api.usetapestry.dev/api/v1 (baked into socialfi package)
 */

import { SocialFi } from 'socialfi';

const API_KEY   = process.env.TAPESTRY_API_KEY?.trim();
const NAMESPACE = process.env.TAPESTRY_NAMESPACE || 'dieforward';

function getClient(): SocialFi<unknown> | null {
  if (!API_KEY) {
    console.warn('[Tapestry] TAPESTRY_API_KEY not set — skipping');
    return null;
  }
  return new SocialFi();
}

// ── Profile ──────────────────────────────────────────────────────────────────

/**
 * Find or create a Tapestry profile for a wallet user.
 *
 * Profile shape:
 *   id          = walletAddress  (stable unique key used as profileId everywhere)
 *   username    = player's chosen nickname (fallback: first4...last4 of wallet)
 *   walletAddress, bio, blockchain, execution
 *
 * NOTE: findOrCreate does NOT update an existing profile's username.
 * Use updateProfileUsername() to patch the username after the player sets their name.
 */
export async function upsertProfile(
  walletAddress: string,
  nickname?: string,
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const username = nickname?.trim() || `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;

  try {
    await client.profiles.findOrCreateCreate(
      { apiKey: API_KEY! },
      {
        id: walletAddress,
        walletAddress,
        username,
        bio: 'Descending into the crypt.',
        blockchain: 'SOLANA',
        execution: 'FAST_UNCONFIRMED',
      } as Parameters<typeof client.profiles.findOrCreateCreate>[1],
    );
    console.log('[Tapestry] upsertProfile ok: id=%s username=%s', walletAddress, username);
    return walletAddress;
  } catch (err) {
    console.warn('[Tapestry] upsertProfile failed (non-fatal):', err);
    return null;
  }
}

/**
 * Update the username on an existing Tapestry profile.
 *
 * Call this whenever the player sets or changes their in-game name:
 *  - After saveNickname in game UI (via /api/player/sync-profile)
 *  - Before postDeath / postVictory (fresh name from InstantDB is available there)
 *
 * Safe to call even if profile doesn't exist yet — fails silently.
 */
export async function updateProfileUsername(
  walletAddress: string,
  username: string,
): Promise<void> {
  const client = getClient();
  if (!client || !username?.trim()) return;

  try {
    await client.profiles.profilesUpdate(
      { id: walletAddress, apiKey: API_KEY! },
      { username: username.trim() } as Parameters<typeof client.profiles.profilesUpdate>[1],
    );
    console.log('[Tapestry] updateProfileUsername ok: %s → "%s"', walletAddress, username);
  } catch (err) {
    console.warn('[Tapestry] updateProfileUsername failed (non-fatal):', err);
  }
}

// ── Internal: ensure profile exists before posting content ───────────────────

/**
 * Ensure a profile exists and return its profileId (walletAddress).
 * Only creates — does NOT update username. Profile sync is handled separately
 * via upsertProfile() at auth time and /api/player/sync-profile on nickname save.
 */
async function ensureProfile(walletAddress: string): Promise<string | null> {
  return upsertProfile(walletAddress);
}

// ── Posts ─────────────────────────────────────────────────────────────────────

/**
 * Post a death event to Tapestry.
 * Returns the Tapestry contentId so it can be stored for likes.
 */
export async function postDeath(opts: {
  walletAddress: string;
  playerName: string;
  room: number;
  finalMessage: string;
  stakeAmount: number;
}): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const { walletAddress, playerName, room, finalMessage, stakeAmount } = opts;

  // Ensure profile exists — username sync is handled separately (auth / saveNickname)
  const profileId = await ensureProfile(walletAddress);
  if (!profileId) return null;

  const stakeStr = stakeAmount > 0 ? ` (staked ${stakeAmount} SOL)` : '';
  const body = `💀 ${playerName} fell at depth ${room}${stakeStr} in Die Forward.\n"${finalMessage}"\n\nhttps://play.dieforward.com`;

  const contentId = `${NAMESPACE}-death-${walletAddress.slice(0, 8)}-${Date.now()}`;

  try {
    await client.contents.findOrCreateCreate(
      { apiKey: API_KEY! },
      {
        id: contentId,
        profileId,
        properties: [{ key: 'body', value: body }],
      },
    );
    console.log('[Tapestry] postDeath ok:', contentId);
    return contentId;
  } catch (err) {
    console.warn('[Tapestry] postDeath failed (non-fatal):', err);
    return null;
  }
}

/**
 * Like a death post on Tapestry.
 */
export async function likeDeath(opts: {
  walletAddress: string;
  contentId: string;
}): Promise<void> {
  const client = getClient();
  if (!client) return;

  const profileId = await ensureProfile(opts.walletAddress);
  if (!profileId) return;

  try {
    await client.likes.likesCreate(
      { apiKey: API_KEY!, nodeId: opts.contentId },
      { startId: profileId },
    );
    console.log('[Tapestry] likeDeath ok:', opts.contentId);
  } catch (err) {
    console.warn('[Tapestry] likeDeath failed (non-fatal):', err);
  }
}

/**
 * Post a victory event to Tapestry.
 */
export async function postVictory(opts: {
  walletAddress: string;
  playerName: string;
  reward: number;
}): Promise<void> {
  const client = getClient();
  if (!client) return;

  const { walletAddress, playerName, reward } = opts;

  // Ensure profile exists — username sync is handled separately (auth / saveNickname)
  const profileId = await ensureProfile(walletAddress);
  if (!profileId) return;

  const rewardStr = reward > 0 ? ` and claimed ${reward.toFixed(3)} SOL` : '';
  const body = `⚔️ ${playerName} escaped the crypt${rewardStr}! Die Forward.\n\nhttps://play.dieforward.com`;

  const contentId = `${NAMESPACE}-victory-${walletAddress.slice(0, 8)}-${Date.now()}`;

  try {
    await client.contents.findOrCreateCreate(
      { apiKey: API_KEY! },
      {
        id: contentId,
        profileId,
        properties: [{ key: 'body', value: body }],
      },
    );
    console.log('[Tapestry] postVictory ok:', contentId);
  } catch (err) {
    console.warn('[Tapestry] postVictory failed (non-fatal):', err);
  }
}
