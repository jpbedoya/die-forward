/**
 * Server-side auth core.
 *
 * Verifies the InstantDB refresh token the client stores as `customToken`
 * (minted via `db.auth.createToken({ email })` on the client, where
 * email = "<walletAddress>@wallet.dieforward.com" for wallet users or
 * "<guestId>@guest.dieforward.com" for guests — see mobile/lib/instant.ts).
 *
 * `deriveAuthIdFromEmail` and `isAdminAuthId` are pure (no admin SDK import
 * at module scope), so they — and `verifyAuthToken` with an injected
 * `verifyToken` dep — are testable without a real INSTANT_ADMIN_KEY. The
 * real InstantDB admin client (`./db`) is only imported lazily, inside the
 * default `verifyToken` dependency, the first time it's actually needed.
 */

// ─── Identity ────────────────────────────────────────────────────────────────

export interface AuthedIdentity {
  authId: string;
  email: string;
  instantUserId: string;
}

const WALLET_SUFFIX = '@wallet.dieforward.com';
const GUEST_SUFFIX = '@guest.dieforward.com';

/**
 * Pure inverse of the client's email construction. Strips the wallet/guest
 * domain suffix to recover the authId that was stored on the player record
 * (see mobile/lib/instant.ts:150-152 for the client-side counterpart).
 * Returns null for null/undefined/empty input, an unknown domain, or an
 * empty authId (e.g. "@wallet.dieforward.com" with nothing before the @).
 */
export function deriveAuthIdFromEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null;

  if (email.endsWith(WALLET_SUFFIX)) {
    const authId = email.slice(0, -WALLET_SUFFIX.length);
    return authId.length > 0 ? authId : null;
  }

  if (email.endsWith(GUEST_SUFFIX)) {
    const authId = email.slice(0, -GUEST_SUFFIX.length);
    return authId.length > 0 ? authId : null;
  }

  return null;
}

// ─── Token verification ─────────────────────────────────────────────────────

interface VerifyTokenResult {
  id?: string;
  email?: string | null;
}

type VerifyTokenFn = (token: string) => Promise<VerifyTokenResult | null | undefined>;

/**
 * Real dependency: delegates to the InstantDB admin SDK. `db.auth.verifyToken`
 * throws (rejects) on an invalid/expired token rather than resolving to null
 * (confirmed against node_modules/@instantdb/admin's jsonFetch-based
 * implementation), so this wraps it and normalizes a throw to null.
 */
async function defaultVerifyToken(token: string): Promise<VerifyTokenResult | null> {
  try {
    const { db } = await import('./db');
    const user = await db.auth.verifyToken(token);
    return user ?? null;
  } catch {
    return null;
  }
}

/**
 * Extracts the bearer token to verify.
 *
 * Primary path: `Authorization: Bearer <token>` header.
 *
 * Fallback: if there is no Authorization header at all, some routes already
 * parse a JSON body containing a `token` field (e.g. legacy clients posting
 * `{ token }` instead of setting the header) — we clone the request and read
 * that field as a fallback. A *malformed* Authorization header (present but
 * not a valid "Bearer <token>") is treated as invalid and does NOT fall
 * back to the body; only a fully absent header does.
 */
async function extractToken(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization');

  if (header !== null) {
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (!match) return null;
    const token = match[1].trim();
    return token.length > 0 ? token : null;
  }

  try {
    const body = await req.clone().json();
    if (body && typeof body === 'object' && typeof (body as { token?: unknown }).token === 'string') {
      const token = (body as { token: string }).token.trim();
      return token.length > 0 ? token : null;
    }
  } catch {
    // No body, not JSON, or already consumed — no fallback available.
  }

  return null;
}

/**
 * Verifies the request's bearer token via InstantDB and maps the result to
 * an AuthedIdentity. Returns null if there's no token, the token is
 * invalid/expired, or the verified user's email doesn't map to a known
 * authId shape.
 */
export async function verifyAuthToken(
  req: Request,
  deps?: { verifyToken: VerifyTokenFn }
): Promise<AuthedIdentity | null> {
  const token = await extractToken(req);
  if (!token) return null;

  const verifyToken = deps?.verifyToken ?? defaultVerifyToken;

  let user: VerifyTokenResult | null | undefined;
  try {
    user = await verifyToken(token);
  } catch {
    return null;
  }

  if (!user || !user.id || !user.email) return null;

  const authId = deriveAuthIdFromEmail(user.email);
  if (!authId) return null;

  return { authId, email: user.email, instantUserId: user.id };
}

// ─── Admin allowlist ─────────────────────────────────────────────────────────

// Hardcoded fallback admin wallet — kept in sync with src/app/admin/page.tsx.
const ADMIN_WALLET_FALLBACK = 'D7NdNbJTL7s6Z7Wu8nGe5SBc64FiFQAH3iPvRZw15qSL';

function readAdminAllowlist(): string[] {
  return (process.env.NEXT_PUBLIC_ADMIN_WALLETS || '')
    .split(',')
    .map((w) => w.trim())
    .filter(Boolean)
    .concat([ADMIN_WALLET_FALLBACK]);
}

/**
 * True iff authId is in NEXT_PUBLIC_ADMIN_WALLETS (server-read, comma-split)
 * or is the hardcoded fallback wallet. The env var is read at call time (not
 * cached at module load) so tests can set it per-case.
 */
export function isAdminAuthId(authId: string | null | undefined): boolean {
  if (!authId) return false;
  return readAdminAllowlist().includes(authId);
}
