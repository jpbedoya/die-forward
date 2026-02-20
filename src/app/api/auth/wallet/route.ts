import { NextRequest, NextResponse } from 'next/server';
import { init } from '@instantdb/admin';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID!;
const ADMIN_TOKEN = process.env.INSTANT_APP_ADMIN_TOKEN!;

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

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
export async function POST(req: NextRequest) {
  try {
    const { walletAddress, signature, message } = await req.json();

    if (!walletAddress || !signature || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, signature, message' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate message format (should include nonce for replay protection)
    if (!message.includes('Sign in to Die Forward')) {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Extract and validate nonce timestamp (within 5 minutes)
    const nonceMatch = message.match(/Nonce: (\d+)-/);
    if (nonceMatch) {
      const timestamp = parseInt(nonceMatch[1], 10);
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      if (Math.abs(now - timestamp) > fiveMinutes) {
        return NextResponse.json(
          { error: 'Signature expired, please try again' },
          { status: 401, headers: corsHeaders }
        );
      }
    }

    // Verify the signature (or skip for development)
    const skipVerification = signature === 'SKIP_VERIFICATION';
    if (!skipVerification) {
      const isValid = verifySignature(walletAddress, signature, message);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401, headers: corsHeaders }
        );
      }
    }
    // TODO: In production, remove SKIP_VERIFICATION option

    // Create InstantDB auth token with wallet address as user ID
    const token = await db.auth.createToken({ id: walletAddress });

    // Check if player record exists, create if not
    const result = await db.query({
      players: { $: { where: { authId: walletAddress }, limit: 1 } },
    });

    const isNewUser = !result.players || result.players.length === 0;

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
