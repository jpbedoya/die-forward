import { NextRequest, NextResponse } from 'next/server';
import { init, tx, id } from '@instantdb/admin';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID!;
const ADMIN_TOKEN = process.env.INSTANT_APP_ADMIN_TOKEN!;

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

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
        { status: 400 }
      );
    }

    // Verify the guest ID format
    if (!guestAuthId.startsWith('guest-')) {
      return NextResponse.json(
        { error: 'Invalid guest ID' },
        { status: 400 }
      );
    }

    // Verify wallet signature
    if (!message.includes('Link wallet to Die Forward')) {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      );
    }

    const isValid = verifySignature(walletAddress, signature, message);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Find the guest player record
    const guestResult = await db.query({
      players: { $: { where: { authId: guestAuthId }, limit: 1 } },
    });
    const guestPlayer = guestResult.players?.[0];

    if (!guestPlayer) {
      return NextResponse.json(
        { error: 'Guest account not found' },
        { status: 404 }
      );
    }

    // Check if wallet already has an account
    const walletResult = await db.query({
      players: { $: { where: { authId: walletAddress }, limit: 1 } },
    });
    const existingWalletPlayer = walletResult.players?.[0];

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
      await db.transact([
        tx.players[existingWalletPlayer.id].update(mergedStats),
        // Delete guest player record
        tx.players[guestPlayer.id].delete(),
      ]);

      merged = true;
      finalPlayerId = existingWalletPlayer.id;
    } else {
      // No existing wallet account — upgrade guest to wallet
      await db.transact([
        tx.players[guestPlayer.id].update({
          authId: walletAddress,
          authType: 'wallet',
          walletAddress,
          lastPlayedAt: Date.now(),
        }),
      ]);

      finalPlayerId = guestPlayer.id;
    }

    // Create new auth token for wallet
    const token = await db.auth.createToken({ id: walletAddress });

    return NextResponse.json({
      token,
      walletAddress,
      merged,
      playerId: finalPlayerId,
    });
  } catch (error) {
    console.error('[Auth] Link wallet error:', error);
    return NextResponse.json(
      { error: 'Failed to link wallet' },
      { status: 500 }
    );
  }
}
