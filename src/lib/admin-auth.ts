'use client';

/**
 * Mints (and caches) an InstantDB customToken for the connected admin
 * wallet, via the same `/api/auth/wallet` signature flow mobile already uses
 * (see `mobile/lib/auth.ts:signInWithWallet`). The web admin page previously
 * never signed in to InstantDB at all — `admin/page.tsx`'s `db` client is
 * anonymous — so there was no server-verifiable token to send as
 * `Authorization: Bearer <token>` to the authenticated admin API routes.
 *
 * This module owns that token's lifecycle for the admin page: sign once per
 * session, cache in memory, reuse for every subsequent admin write.
 */

let cachedToken: string | null = null;
let cachedWallet: string | null = null;
let inFlight: Promise<string> | null = null;

/** Returns the cached admin token, or null if none has been minted yet. */
export function getCachedAdminToken(): string | null {
  return cachedToken;
}

/** Clears the cached token (e.g. on wallet disconnect). */
export function clearAdminToken(): void {
  cachedToken = null;
  cachedWallet = null;
  inFlight = null;
}

/**
 * Signs a fresh challenge with the connected wallet, exchanges it for an
 * InstantDB customToken via `/api/auth/wallet`, and caches it. Concurrent
 * callers share the same in-flight request instead of triggering multiple
 * wallet signature prompts.
 */
export async function ensureAdminToken(
  walletAddress: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<string> {
  if (cachedToken && cachedWallet === walletAddress) return cachedToken;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const message = `Sign in to Die Forward\nNonce: ${nonce}`;
    const messageBytes = new TextEncoder().encode(message);

    const signatureBytes = await signMessage(messageBytes);
    const bs58 = (await import('bs58')).default;
    const signature = bs58.encode(signatureBytes);

    const res = await fetch('/api/auth/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, signature, message }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Admin sign-in failed');
    }

    const data = await res.json();
    cachedToken = data.token;
    cachedWallet = walletAddress;
    return cachedToken as string;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
