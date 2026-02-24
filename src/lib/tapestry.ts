/**
 * Tapestry integration for Die Forward
 *
 * Handles social graph actions: profile creation, death posts, victory posts.
 * All calls are fire-and-forget (non-blocking) — Tapestry failures never
 * affect core gameplay.
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
 * Called on first wallet connect / auth.
 */
export async function upsertProfile(
  walletAddress: string,
  nickname?: string,
): Promise<void> {
  const client = getClient();
  if (!client) return;

  await client.profiles.findOrCreateCreate(
    { apiKey: API_KEY! },
    {
      walletAddress,
      username: nickname || `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`,
      bio: 'Descending into the crypt.',
      blockchain: 'SOLANA',
    },
  );
}

// ── Posts ─────────────────────────────────────────────────────────────────────

/**
 * Post a death event to Tapestry.
 * Returns the Tapestry contentId (= generated ID) so we can store it for likes.
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
  const stakeStr = stakeAmount > 0 ? ` (staked ${stakeAmount} SOL)` : '';
  const body = `💀 ${playerName} fell at depth ${room}${stakeStr} in Die Forward.\n"${finalMessage}"\n\nhttps://play.dieforward.com`;

  // Generate a stable unique ID for this content node
  const contentId = `${NAMESPACE}-death-${walletAddress.slice(0, 8)}-${Date.now()}`;

  try {
    await client.contents.findOrCreateCreate(
      { apiKey: API_KEY! },
      {
        id: contentId,
        profileId: walletAddress,
        properties: [{ key: 'body', value: body }],
      },
    );
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
  walletAddress: string;  // the liker's profile ID
  contentId: string;      // Tapestry content ID of the death post
}): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    await client.likes.likesCreate(
      { apiKey: API_KEY!, nodeId: opts.contentId },
      { startId: opts.walletAddress },
    );
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
  const rewardStr = reward > 0 ? ` and claimed ${reward.toFixed(3)} SOL` : '';
  const body = `⚔️ ${playerName} escaped the crypt${rewardStr}! Die Forward.\n\nhttps://play.dieforward.com`;

  const contentId = `${NAMESPACE}-victory-${walletAddress.slice(0, 8)}-${Date.now()}`;

  try {
    await client.contents.findOrCreateCreate(
      { apiKey: API_KEY! },
      {
        id: contentId,
        profileId: walletAddress,
        properties: [{ key: 'body', value: body }],
      },
    );
  } catch (err) {
    console.warn('[Tapestry] postVictory failed (non-fatal):', err);
  }
}
