import { NextRequest, NextResponse } from 'next/server';
import { init } from '@instantdb/admin';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';
// Tapestry profile sync moved to /api/player/sync-profile (called when nickname is set)

// Lazy init to ensure env vars are available
let db: ReturnType<typeof init> | null = null;
function getDb() {
  if (!db) {
    const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID;
    const adminToken = process.env.INSTANT_ADMIN_KEY;
    if (!appId || !adminToken) {
      throw new Error('Missing InstantDB configuration');
    }
    db = init({ appId, adminToken });
  }
  return db;
}

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Verify a Solana wallet signature
 */
function verifySignature(
  walletAddress: string,
  signature: string,
  message: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(walletAddress);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (e) {
    console.error('[Auth] Signature verification error:', e);
    return false;
  }
}

/**
 * POST /api/auth/wallet
 * 
 * Authenticate a user by verifying their wallet signature.
 * Creates InstantDB token with wallet address as user ID.
 */
function isFreshNonceMessage(message: string, maxAgeMs = 5 * 60 * 1000): boolean {
  const nonceMatch = message.match(/Nonce: (\d+)-/);
  if (!nonceMatch) return false;

  const timestamp = parseInt(nonceMatch[1], 10);
  if (!Number.isFinite(timestamp)) return false;

  const now = Date.now();
  return Math.abs(now - timestamp) <= maxAgeMs;
}

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, signature, message } = await req.json();

    if (!walletAddress || !signature || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, signature, message' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate message format (must include expected challenge text + fresh nonce)
    if (!message.includes('Sign in to Die Forward')) {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!isFreshNonceMessage(message)) {
      return NextResponse.json(
        { error: 'Missing or expired nonce, please try again' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Never allow signature bypass in any environment.
    if (signature === 'SKIP_VERIFICATION') {
      return NextResponse.json(
        { error: 'Unsigned authentication is not allowed' },
        { status: 401, headers: corsHeaders }
      );
    }

    const isValid = verifySignature(walletAddress, signature, message);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Create InstantDB auth token (email-based custom auth)
    // Instant `id` must be UUID; use deterministic wallet email instead.
    const db = getDb();
    const token = await db.auth.createToken({ email: `${walletAddress}@wallet.dieforward.com` });

    // Check if player record exists
    const result = await getDb().query({
      players: { $: { where: { authId: walletAddress }, limit: 1 } },
    });

    const isNewUser = !result.players || result.players.length === 0;

    // NOTE: Tapestry profile is NOT created here.
    // Profile is created/updated via /api/player/sync-profile when user sets their nickname.
    // This ensures Tapestry always has the real nickname, not a wallet fallback.

    return NextResponse.json({
      token,
      walletAddress,
      isNewUser,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('[Auth] Wallet auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
