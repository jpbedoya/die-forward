/**
 * Tapestry integration for Die Forward
 *
 * Handles social graph actions: profile creation, death posts, victory posts.
 * All calls are fire-and-forget (non-blocking) — Tapestry failures never
 * affect core gameplay.
 *
 * Docs: https://docs.usetapestry.dev
 */

import { SocialFi } from 'socialfi';

const API_KEY   = process.env.TAPESTRY_API_KEY;
const NAMESPACE = process.env.TAPESTRY_NAMESPACE || 'dieforward';
const API_URL   = 'https://api.usetapestry.dev/v1/';

function getClient(): SocialFi | null {
  if (!API_KEY) {
    console.warn('[Tapestry] TAPESTRY_API_KEY not set — skipping');
    return null;
  }
  return new SocialFi({ baseURL: API_URL, apiKey: API_KEY });
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

  try {
    await client.profiles.findOrCreateCreate(
      { apiKey: API_KEY! },
      {
        walletAddress,
        username: nickname || `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`,
        bio: 'Descending into the crypt.',
        blockchain: 'SOLANA',
        namespace: NAMESPACE,
        execution: 'FAST_UNCONFIRMED',
      },
    );
  } catch (err) {
    console.warn('[Tapestry] upsertProfile failed (non-fatal):', err);
  }
}

// ── Posts ─────────────────────────────────────────────────────────────────────

/**
 * Post a death event to Tapestry.
 * Other apps in the Tapestry ecosystem can see this.
 */
export async function postDeath(opts: {
  walletAddress: string;
  playerName: string;
  room: number;
  finalMessage: string;
  stakeAmount: number;
}): Promise<void> {
  const client = getClient();
  if (!client) return;

  const { walletAddress, playerName, room, finalMessage, stakeAmount } = opts;
  const stakeStr = stakeAmount > 0 ? ` (staked ${stakeAmount} SOL)` : '';
  const body = `💀 ${playerName} fell at depth ${room}${stakeStr} in Die Forward.\n"${finalMessage}"\n\nhttps://play.dieforward.com`;

  try {
    await client.content.createCreate(
      { apiKey: API_KEY! },
      {
        walletAddress,
        contentType: 'POST',
        namespace: NAMESPACE,
        properties: { body },
      },
    );
  } catch (err) {
    console.warn('[Tapestry] postDeath failed (non-fatal):', err);
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

  try {
    await client.content.createCreate(
      { apiKey: API_KEY! },
      {
        walletAddress,
        contentType: 'POST',
        namespace: NAMESPACE,
        properties: { body },
      },
    );
  } catch (err) {
    console.warn('[Tapestry] postVictory failed (non-fatal):', err);
  }
}
