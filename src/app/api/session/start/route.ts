import { NextRequest, NextResponse } from 'next/server';
import { init, tx, id } from '@instantdb/admin';
import { startErRun } from '@/lib/magicblock';

// Initialize InstantDB Admin client
const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_KEY!,
});

// Valid stake amounts (0 = free play)
const MIN_STAKE = 0;
const MAX_STAKE = 1; // 1 SOL max

// CORS headers for unified codebase (web + mobile)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, stakeAmount, txSignature, demoMode, escrowSessionId, useEscrow, authId } = body;

    // Validate inputs
    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    if (typeof stakeAmount !== 'number' || stakeAmount < MIN_STAKE || stakeAmount > MAX_STAKE) {
      return NextResponse.json({ error: 'Invalid stake amount' }, { status: 400 });
    }

    // txSignature is optional for now (devnet testing)
    // In production, we'd verify the transaction on-chain

    // Generate session token
    const sessionToken = id();
    const sessionId = id();

    // ── MagicBlock: initialize + delegate RunRecord to ER ──────────────────
    const settingsResult = await db.query({ gameSettings: {} }).catch(() => null);
    const mbEnabled = (settingsResult?.gameSettings?.[0] as Record<string, unknown>)?.enableMagicBlock === true;
    const isGuestOrDemo = !walletAddress || walletAddress.startsWith('guest-') || walletAddress.startsWith('demo-');

    let erRunId: string | null = null;
    if (mbEnabled && !isGuestOrDemo && stakeAmount > 0) {
      try {
        erRunId = await Promise.race([
          startErRun({ playerWallet: walletAddress, stakeAmount, sessionId }),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ]);
        console.log('[MagicBlock] ER run started:', erRunId);
      } catch (err) {
        console.warn('[MagicBlock] startErRun failed (non-fatal):', err instanceof Error ? err.message : err);
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    // Store session in database with server-tracked room progress
    await db.transact([
      tx.sessions[sessionId].update({
        token: sessionToken,
        walletAddress,
        authId: authId || walletAddress, // Unique player ID for stats tracking
        stakeAmount,
        txSignature: txSignature || null,
        zone: 'THE SUNKEN CRYPT',
        startedAt: Date.now(),
        status: 'active', // active, completed, dead
        currentRoom: 1, // Server-tracked room (1-indexed)
        maxRooms: 7, // Total rooms in dungeon
        demoMode: demoMode || false, // Demo mode flag for testing
        escrowSessionId: escrowSessionId || null, // On-chain session ID (hex string)
        useEscrow: useEscrow || false, // Whether using on-chain escrow
        ...(erRunId ? { erRunId } : {}), // ER run account pubkey (MagicBlock)
      }),
    ]);

    return NextResponse.json({
      success: true,
      sessionToken,
      zone: 'THE SUNKEN CRYPT',
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Failed to start session:', error);
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500, headers: corsHeaders });
  }
}
