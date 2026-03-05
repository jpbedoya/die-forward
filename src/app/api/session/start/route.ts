import { NextRequest, NextResponse } from 'next/server';
import { init, tx, id } from '@instantdb/admin';
import { startErRun, requestErVrfSeed, getErVrfSeed } from '@/lib/magicblock';
import crypto from 'crypto';

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
    const { walletAddress, stakeAmount, txSignature, demoMode, escrowSessionId, useEscrow, authId, zoneId: rawZoneId } = body;

    // Validate zoneId — whitelist of known zones
    const VALID_ZONE_IDS = ['sunken-crypt', 'living-tomb', 'void-beyond'];
    const zoneId: string = VALID_ZONE_IDS.includes(rawZoneId) ? rawZoneId : 'sunken-crypt';

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
    
    // Generate legacy/fallback seed (may be replaced by VRF)
    let seed = crypto.randomBytes(32).toString('hex');
    let seedSource: 'legacy' | 'vrf' | 'vrf-pending' = 'legacy';

    // ── MagicBlock: initialize + delegate RunRecord to ER ──────────────────
    const settingsResult = await db.query({ gameSettings: {} }).catch(() => null);
    const settings = (settingsResult?.gameSettings?.[0] as Record<string, unknown>) || {};
    const mbEnabled = settings.enableMagicBlock === true;
    const vrfEnabled = mbEnabled && settings.enableVRF === true;
    const isGuestOrDemo = !walletAddress || walletAddress.startsWith('guest-') || walletAddress.startsWith('demo-');

    let erRunId: string | null = null;
    if (mbEnabled && !isGuestOrDemo && stakeAmount > 0) {
      try {
        erRunId = await Promise.race([
          startErRun({ playerWallet: walletAddress, stakeAmount, sessionId }),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ]);
        console.log('[MagicBlock] ER run started:', erRunId);

        // Optional VRF path (only when nested toggle is on)
        if (erRunId && vrfEnabled) {
          const requested = await requestErVrfSeed({ erRunId, clientSeed: seed });
          if (requested) {
            // Poll briefly for callback completion. If it doesn't arrive in time,
            // keep legacy seed so gameplay never blocks.
            for (let i = 0; i < 8; i++) {
              await new Promise((resolve) => setTimeout(resolve, 800));
              const vrf = await getErVrfSeed(erRunId);
              if (vrf.ready && vrf.seedHex) {
                seed = vrf.seedHex;
                seedSource = 'vrf';
                console.log('[MagicBlock] VRF seed ready for session:', sessionId);
                break;
              }
            }
          }
        }
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
        zone: zoneId === 'sunken-crypt' ? 'THE SUNKEN CRYPT' : zoneId === 'living-tomb' ? 'THE LIVING TOMB' : zoneId,
        zoneId,
        startedAt: Date.now(),
        status: 'active', // active, completed, dead
        currentRoom: 1, // Server-tracked room (1-indexed)
        maxRooms: 7, // Total rooms in dungeon
        demoMode: demoMode || false, // Demo mode flag for testing
        escrowSessionId: escrowSessionId || null, // On-chain session ID (hex string)
        useEscrow: useEscrow || false, // Whether using on-chain escrow
        seed, // RNG seed (legacy or VRF)
        seedSource,
        enableVrf: vrfEnabled && !!erRunId,
        ...(erRunId ? { erRunId } : {}), // ER run account pubkey (MagicBlock)
        burnStacks: 0,
        chillStacks: 0,
        enemyFrozen: false,
        infectionStacks: 0,
        infectionDebuff: false,
        clarity: 3,
        visitedRooms: '[]',
        fluxActive: false,
      }),
    ]);

    return NextResponse.json({
      success: true,
      sessionToken,
      zone: zoneId === 'sunken-crypt' ? 'THE SUNKEN CRYPT' : zoneId,
      zoneId,
      seed, // Client uses this for deterministic randomness
      seedSource,
      enableVrf: vrfEnabled && !!erRunId,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Failed to start session:', error);
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500, headers: corsHeaders });
  }
}
