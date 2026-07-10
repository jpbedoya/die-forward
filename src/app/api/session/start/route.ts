import { NextRequest, NextResponse } from 'next/server';
import { tx, id } from '@instantdb/admin';
import { db } from '@/lib/db';
import { startErRun, requestErVrfSeed, getErVrfSeed } from '@/lib/magicblock';
import { loadZone } from '@/lib/content';
import { resolveStakeMode, validateCoinStakeRequest, type StakeMode } from '@/lib/coins';
import { verifyAuthToken, resolveStartIdentity } from '@/lib/auth-server';
import crypto from 'crypto';

// Valid stake amounts (0 = free play)
const MIN_STAKE = 0;
const MAX_STAKE = 1; // 1 SOL max

/**
 * Server-computed UTC day key, 'YYYY-MM-DD'. Matches mobile's `utcDayKey`
 * (mobile/lib/world-shift.ts) so the daily-shift bucket is identical whether
 * stamped by the client or the server.
 */
function serverDayKey(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function POST(request: NextRequest) {
  try {
    // Verify identity from the request's bearer token BEFORE consuming the body.
    // The header path works regardless, and verifyAuthToken's body-token fallback
    // uses req.clone() — which only works while the body is still unread. Calling
    // it first is the safe ordering (see Task 1 HAZARD).
    const identity = await verifyAuthToken(request);

    const body = await request.json();
    const {
      walletAddress,
      stakeAmount,
      txSignature,
      demoMode,
      escrowSessionId,
      useEscrow,
      authId,
      zoneId: rawZoneId,
      stakeMode: rawStakeMode,
      coinStake: rawCoinStake,
      chosenModifierId,
      dailyShiftEnabled,
    } = body;

    // Validate zoneId — whitelist of known zones
    const VALID_ZONE_IDS = ['sunken-crypt', 'ashen-crypts', 'frozen-gallery', 'living-tomb', 'void-beyond'];
    const zoneId: string = VALID_ZONE_IDS.includes(rawZoneId) ? rawZoneId : 'sunken-crypt';
    const zonePkg = await loadZone(zoneId).catch(() => null);
    const zoneName = zonePkg?.meta?.name ?? zoneId.toUpperCase();

    // Validate inputs
    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    if (typeof stakeAmount !== 'number' || stakeAmount < MIN_STAKE || stakeAmount > MAX_STAKE) {
      return NextResponse.json({ error: 'Invalid stake amount' }, { status: 400 });
    }

    // ── Resolve stake mode ────────────────────────────────────────────────
    // Explicit mode honoured if valid; otherwise inferred (stake>0 -> sol).
    const modeResult = resolveStakeMode(rawStakeMode, stakeAmount);
    if (!modeResult.ok) {
      return NextResponse.json({ error: modeResult.error }, { status: 400 });
    }
    const stakeMode: StakeMode = modeResult.mode;
    const coinStake: number = typeof rawCoinStake === 'number' ? rawCoinStake : 0;

    // ── Resolve authoritative identity (closes the coin-staking IDOR) ──────
    // Coin runs REQUIRE a verified token; the resolved authId is then the
    // VERIFIED authId only — body authId/walletAddress can never locate or
    // debit a balance. SOL/free runs prefer the verified authId, falling back
    // to the untrusted body values (they can't touch coins).
    const isCoinMode = stakeMode === 'coins' || coinStake > 0;
    const idResult = resolveStartIdentity({
      identity,
      bodyAuthId: authId,
      bodyWallet: walletAddress,
      isCoinMode,
    });
    if ('reject' in idResult) {
      return NextResponse.json({ error: idResult.reject }, { status: idResult.status });
    }
    const resolvedAuthId = idResult.authId;

    // ── Coin-stake path: validate + prepare atomic deduction ──────────────
    // The deduction is not written here — it is batched into the SAME
    // db.transact() call as the session create below, so no failure path can
    // leave a player's coins debited without a live session (see ordering note).
    let coinDeductTx: ReturnType<typeof tx.players[string]['update']> | null = null;
    if (stakeMode === 'coins') {
      // resolveStartIdentity has already guaranteed a verified identity here and
      // that resolvedAuthId === identity.authId. Look up the Player row by the
      // VERIFIED authId ONLY — the body's authId/walletAddress never reach a
      // balance read or debit.
      const { players } = await db.query({
        players: { $: { where: { authId: resolvedAuthId }, limit: 1 } },
      });
      const player = players?.[0] as (Record<string, unknown> & { id: string }) | undefined;
      if (!player) {
        return NextResponse.json({ error: 'Player not found for coin stake' }, { status: 400 });
      }

      const balance = (player.paleCoins as number) ?? 0;
      const check = validateCoinStakeRequest({ stakeMode, stakeAmount, coinStake, balance });
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }

      // KNOWN LIMITATION (accepted on devnet): balance is read-then-written, not an atomic decrement — concurrent coins-mode starts by the same player could double-spend within the read window. Fix requires atomic decrement / request auth (tracked as the launch-blocking A1 auth gate in the spec).
      coinDeductTx = tx.players[player.id].update({ paleCoins: balance - coinStake });
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
            for (let i = 0; i < 4; i++) {
              await new Promise((resolve) => setTimeout(resolve, 500));
              const vrf = await getErVrfSeed(erRunId);
              if (vrf.ready && vrf.seedHex) {
                seed = vrf.seedHex;
                seedSource = 'vrf';
                console.log('[MagicBlock] VRF seed ready for session:', sessionId);
                break;
              }
            }
            if (seedSource !== 'vrf') {
              console.warn('[MagicBlock] VRF seed not ready after 2s, using legacy seed');
            }
          }
        }
      } catch (err) {
        console.warn('[MagicBlock] startErRun failed (non-fatal):', err instanceof Error ? err.message : err);
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    // Store session in database with server-tracked room progress.
    // The coin deduction (if any) is batched into this SAME transact call so
    // deduct + session-create commit atomically — coins are never debited
    // without a live session.
    await db.transact([
      ...(coinDeductTx ? [coinDeductTx] : []),
      tx.sessions[sessionId].update({
        token: sessionToken,
        walletAddress,
        authId: resolvedAuthId, // Resolved identity: verified authId when available (body fallback for non-coin runs only)
        stakeAmount,
        stakeMode,
        coinStake: stakeMode === 'coins' ? coinStake : 0,
        serverDayKey: serverDayKey(),
        chosenModifierId: chosenModifierId ?? null,
        dailyShiftEnabled: dailyShiftEnabled ?? true,
        txSignature: txSignature || null,
        zone: zoneName,
        zoneId,
        startedAt: Date.now(),
        status: 'active', // active, completed, dead
        currentRoom: 1, // Server-tracked room (1-indexed)
        maxRooms: 13, // Total rooms in dungeon
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
      zone: zoneName,
      zoneId,
      stakeMode,
      coinStake: coinStake ?? 0,
      seed, // Client uses this for deterministic randomness
      seedSource,
      enableVrf: vrfEnabled && !!erRunId,
    });

  } catch (error) {
    console.error('Failed to start session:', error);
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 });
  }
}
