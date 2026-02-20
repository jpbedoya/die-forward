import { NextRequest, NextResponse } from 'next/server';
import { init, tx, id } from '@instantdb/admin';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

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

interface Player {
  id: string;
  authId?: string;
  authType?: string;
  walletAddress?: string;
  nickname?: string;
  totalDeaths?: number;
  totalClears?: number;
  totalEarned?: number;
  totalLost?: number;
  totalTipsReceived?: number;
  totalTipsSent?: number;
  highestRoom?: number;
}

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
 * POST /api/auth/link-wallet
 * 
 * Link a wallet to an existing guest account.
 * If wallet already has an account, merge the accounts.
 */
export async function POST(req: NextRequest) {
  try {
    const { guestAuthId, walletAddress, signature, message } = await req.json();

    if (!guestAuthId || !walletAddress || !signature || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify the guest ID format
    if (!guestAuthId.startsWith('guest-')) {
      return NextResponse.json(
        { error: 'Invalid guest ID' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify wallet signature
    if (!message.includes('Link wallet to Die Forward')) {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400, headers: corsHeaders }
      );
    }

    const isValid = verifySignature(walletAddress, signature, message);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Find the guest player record
    const guestResult = await getDb().query({
      players: { $: { where: { authId: guestAuthId }, limit: 1 } },
    });
    const guestPlayer = guestResult.players?.[0] as Player | undefined;

    if (!guestPlayer) {
      return NextResponse.json(
        { error: 'Guest account not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if wallet already has an account
    const walletResult = await getDb().query({
      players: { $: { where: { authId: walletAddress }, limit: 1 } },
    });
    const existingWalletPlayer = walletResult.players?.[0] as Player | undefined;

    let merged = false;
    let finalPlayerId: string;

    if (existingWalletPlayer) {
      // Merge accounts — combine stats
      const mergedStats = {
        totalDeaths: (guestPlayer.totalDeaths || 0) + (existingWalletPlayer.totalDeaths || 0),
        totalClears: (guestPlayer.totalClears || 0) + (existingWalletPlayer.totalClears || 0),
        totalEarned: (guestPlayer.totalEarned || 0) + (existingWalletPlayer.totalEarned || 0),
        totalLost: (guestPlayer.totalLost || 0) + (existingWalletPlayer.totalLost || 0),
        totalTipsReceived: (guestPlayer.totalTipsReceived || 0) + (existingWalletPlayer.totalTipsReceived || 0),
        totalTipsSent: (guestPlayer.totalTipsSent || 0) + (existingWalletPlayer.totalTipsSent || 0),
        highestRoom: Math.max(guestPlayer.highestRoom || 0, existingWalletPlayer.highestRoom || 0),
        // Prefer wallet's nickname, fall back to guest's
        nickname: existingWalletPlayer.nickname || guestPlayer.nickname || 'Wanderer',
        lastPlayedAt: Date.now(),
      };

      // Update wallet player with merged stats
      await getDb().transact([
        tx.players[existingWalletPlayer.id].update(mergedStats),
        // Delete guest player record
        tx.players[guestPlayer.id].delete(),
      ]);

      merged = true;
      finalPlayerId = existingWalletPlayer.id;
    } else {
      // No existing wallet account — upgrade guest to wallet
      await getDb().transact([
        tx.players[guestPlayer.id].update({
          authId: walletAddress,
          authType: 'wallet',
          walletAddress,
          lastPlayedAt: Date.now(),
        }),
      ]);

      finalPlayerId = guestPlayer.id;
    }

    // Create new auth token for wallet (email-based)
    const token = await getDb().auth.createToken({ email: `${walletAddress}@wallet.dieforward.com` });

    return NextResponse.json({
      token,
      walletAddress,
      merged,
      playerId: finalPlayerId,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('[Auth] Link wallet error:', error);
    return NextResponse.json(
      { error: 'Failed to link wallet' },
      { status: 500, headers: corsHeaders }
    );
  }
}
