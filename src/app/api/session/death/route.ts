import { NextRequest, NextResponse } from 'next/server';
import { tx, id } from '@instantdb/admin';
import { db } from '@/lib/db';
import { hashDeathData, recordDeathOnChain, recordDeathInEscrow } from '@/lib/onchain';
import { postDeath } from '@/lib/tapestry';
import { commitErRun } from '@/lib/magicblock';
import {
  buildRunReceipt,
  computeCoinEarn,
  computeCoinStakeSettlement,
  nextStreak,
  sealTier,
  type StakeMode,
} from '@/lib/coins';
import { verifyAuthToken, sessionAuthMismatch } from '@/lib/auth-server';

// Demo mode flag - skip on-chain recording
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export async function POST(request: NextRequest) {
  try {
    // Cross-account defense-in-depth: read any bearer token BEFORE the body is
    // consumed (header path never touches the body; the mobile client always
    // sends `Authorization: Bearer`). Identity/money below still come from
    // session.authId, never this — see the sessionAuthMismatch gate after lookup.
    const identity = await verifyAuthToken(request);

    const body = await request.json();
    const { sessionToken, room, finalMessage, inventory, playerName, killedBy, nowPlayingTitle, nowPlayingArtist, nodeId } = body;

    // Validate inputs
    if (!sessionToken || typeof sessionToken !== 'string') {
      return NextResponse.json({ error: 'Invalid session token' }, { status: 400 });
    }

    // 'room' = canonical 1-based node depth (spec §4.1); graph edges always descend one depth, so linear validation holds
    if (typeof room !== 'number' || room < 1) {
      return NextResponse.json({ error: 'Invalid room number' }, { status: 400 });
    }

    if (!finalMessage || typeof finalMessage !== 'string' || finalMessage.length > 50) {
      return NextResponse.json({ error: 'Invalid final message' }, { status: 400 });
    }

    // Find the session by token
    const result = await db.query({
      sessions: {
        $: {
          where: {
            token: sessionToken,
            status: 'active',
          },
        },
      },
    });

    const sessions = result?.sessions || [];
    if (sessions.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 403 });
    }

    const session = sessions[0];

    // Cross-account guard: a VALID token for a different account cannot drive
    // this session (money/stats settle to session.authId). No token → unchanged
    // (the unguessable session token remains the sole gate); legacy sessions
    // without an authId are unaffected. See sessionAuthMismatch.
    if (sessionAuthMismatch(identity, session.authId as string | null | undefined)) {
      return NextResponse.json({ error: 'Session does not belong to this account' }, { status: 403 });
    }

    // Validate room upper bound against session's actual maxRooms
    const maxRooms = (session as Record<string, unknown>).maxRooms as number || 13;
    if (room > maxRooms) {
      return NextResponse.json({ error: 'Invalid room number' }, { status: 400 });
    }

    // Create death and corpse records
    const deathId = id();
    const corpseId = id();

    // Pick a random item from inventory for corpse loot
    const inventoryArray = Array.isArray(inventory) ? inventory : [];
    const lootItem = inventoryArray.length > 0
      ? inventoryArray[Math.floor(Math.random() * inventoryArray.length)]
      : { name: 'Nothing', emoji: '💀' };

    // Look up player's saved nickname from DB — authoritative source
    // Use authId first (works for both guests and wallet users), fallback to walletAddress
    let displayName = playerName;
    const isDemo = session.walletAddress?.startsWith('demo-wallet') || session.walletAddress === 'demo-wallet';
    if (isDemo) {
      displayName = playerName || 'Wanderer';
    } else {
      try {
        const lookupField = session.authId ? 'authId' : 'walletAddress';
        const lookupValue = session.authId || session.walletAddress;
        const playerResult = await db.query({
          players: { $: { where: { [lookupField]: lookupValue } } },
        });
        const playerRecord = playerResult?.players?.[0];
        const DEFAULT_NAMES = ['Wanderer','AshenpilgriM','HollowSeeker','Saltborn','Cairnwalker','Unremembered','PaleVenture','GraveWarden','Tidecaller','TheForsaken','MurkDelver','Bonepath','Driftborn'];
        if (playerRecord?.nickname
          && !DEFAULT_NAMES.includes(playerRecord.nickname)
          && playerRecord.nickname !== playerRecord.walletAddress) {
          displayName = playerRecord.nickname;
        }
      } catch (e) {
        // Non-fatal — fall back to client-provided name
      }
      // Last resort: truncate the wallet address (wallet users only)
      if ((!displayName || displayName === session.walletAddress) && session.walletAddress) {
        displayName = `${session.walletAddress.slice(0, 4)}...${session.walletAddress.slice(-4)}`;
      }
    }
    const timestamp = Date.now();

    // Create verifiable death hash
    const deathHash = hashDeathData({
      walletAddress: session.walletAddress,
      zone: session.zone,
      room,
      finalMessage: finalMessage.trim(),
      stakeAmount: session.stakeAmount,
      timestamp,
    });

    // ── MagicBlock settlement gate ────────────────────────────────────────────
    // If enableMagicBlock is on and session has an erRunId, commit the ER run
    // before settling on L1. Falls back to legacy settlement on failure.
    const settingsResult = await db.query({ gameSettings: {} }).catch(() => null);
    const mbEnabled = (settingsResult?.gameSettings?.[0] as Record<string, unknown>)?.enableMagicBlock === true;
    const erRunId = (session as Record<string, unknown>).erRunId as string | undefined;

    if (mbEnabled && erRunId) {
      console.log('[MagicBlock] Committing ER run', erRunId);
      try {
        const erResult = await commitErRun({ erRunId, outcome: 'dead', finalRoom: room });
        if (erResult.fallback) {
          console.warn('[MagicBlock] ER commit fell back to legacy settlement');
        } else {
          console.log('[MagicBlock] ER committed:', erResult.txSignature ?? 'no sig');
          // Store commit tx signature for verification/display
          if (erResult.txSignature) {
            await db.transact(tx.sessions[session.id].update({ erCommitTx: erResult.txSignature }));
          }
        }
      } catch (err) {
        console.warn('[MagicBlock] ER commit threw, falling back:', err);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Record death hash on-chain (non-blocking, skip in demo mode)
    let onChainSignature: string | null = null;
    if (!DEMO_MODE && !session.demoMode) {
      // Check if using escrow program
      if (session.useEscrow && session.escrowSessionId) {
        // Record death in escrow program (releases stake to pool)
        recordDeathInEscrow(session.walletAddress, session.escrowSessionId, deathHash)
          .then(sig => {
            if (sig) {
              db.transact([
                tx.deaths[deathId].update({ 
                  onChainSignature: sig,
                  escrowRecorded: true,
                }),
              ]).catch(err => console.warn('Failed to update death with escrow signature:', err));
            }
          })
          .catch(err => console.warn('Escrow death recording failed:', err));
      } else {
        // Legacy: Fire and don't wait - record to memo program
        recordDeathOnChain(deathHash).then(sig => {
          if (sig) {
            db.transact([
              tx.deaths[deathId].update({ onChainSignature: sig }),
            ]).catch(err => console.warn('Failed to update death with signature:', err));
          }
        }).catch(err => console.warn('On-chain death recording failed:', err));
      }
    }

    // Corpse discovery queries by zone id (e.g. "sunken-crypt"), so death/corpse
    // rows store the id. Legacy sessions without zoneId fall back to the display
    // name (session.zone) — those rows stay orphaned from discovery.
    const zoneForRecords = session.zoneId || session.zone;
    const validNodeId = typeof nodeId === 'string' && nodeId.length > 0 && nodeId.length <= 64
      ? nodeId
      : undefined;

    // ── Coin economy settlement (grant, burn, streak, seal, receipt) ──────────
    // Everything below lands in ONE transact with the death/corpse/session rows
    // so a run's money settlement is atomic: the seal stamp needs the pre-death
    // streak, and a coin grant must never be recorded without its death. The
    // player is looked up UP-FRONT (moved ahead of the death write) to make that
    // atomicity possible. Grants are skipped entirely for guests with no player
    // row — exactly as the stats increment was skipped before.
    const stakeMode: StakeMode = (session.stakeMode as StakeMode) ?? 'sol';
    const coinStake: number = (session.coinStake as number) ?? 0;

    // A run may only mutate paleCoins/stats when its identity was token-verified at
    // start. Coins-mode runs were provably verified (start 403s coins without a
    // verified identity), so treat stakeMode==='coins' as verified too — this also
    // covers in-flight coins sessions created before authVerified existed.
    const authVerified = (session as Record<string, unknown>).authVerified === true || stakeMode === 'coins';

    const earn = computeCoinEarn({
      finalDepth: room,
      cleared: false,
      firstClearOfZone: false,
      stakeMode,
    });

    // Player lookup (authId first, walletAddress fallback for legacy).
    const lookupKey = session.authId || session.walletAddress;
    const lookupField = session.authId ? 'authId' : 'walletAddress';
    let player: Record<string, unknown> | null = null;
    try {
      const { players } = await db.query({
        players: { $: { where: { [lookupField]: lookupKey }, limit: 1 } },
      });
      player = players && players.length > 0 ? (players[0] as Record<string, unknown>) : null;
    } catch (lookupErr) {
      console.warn('Failed to look up player for settlement:', lookupErr);
    }

    const prevStreak = (player?.bindingStreak as number) ?? 0;
    const { streak } = nextStreak({ current: prevStreak, stakeMode, cleared: false });
    const deathSealTier = sealTier(prevStreak); // the streak they DIED holding

    // Grants only apply when a player row exists; the receipt records what was
    // actually granted (0 / unchanged for guests).
    const grantedCoinDelta = (player && authVerified) ? earn : 0;
    const grantedStreakAfter = (player && authVerified) ? streak : prevStreak;

    // Coin-Bound burn → pool. Gate on stakeMode === 'coins' (belt-and-suspenders;
    // coinStake is already 0 for non-coins runs). On death playerDelta is 0 —
    // the stake was deducted at run start, so we do NOT re-deduct here; only the
    // burned stake feeds the pool.
    const settlementWrites: Parameters<typeof db.transact>[0] = [];
    if (stakeMode === 'coins') {
      const { poolDelta } = computeCoinStakeSettlement({
        coinStake,
        cleared: false,
        bonusPercent: 0,
        poolAvailable: 0,
      });
      const settingsRow = settingsResult?.gameSettings?.[0] as Record<string, unknown> | undefined;
      // pool burn is best-effort: skip rather than orphan the settings row if the read failed
      if (settingsRow?.id) {
        settlementWrites.push(
          tx.gameSettings[settingsRow.id as string].update({
            coinPool: ((settingsRow.coinPool as number) ?? 0) + poolDelta,
          }),
        );
      }
    }

    if (player && authVerified) {
      const currentHighest = (player.highestRoom as number) || 0;
      settlementWrites.push(
        tx.players[player.id as string].update({
          totalDeaths: ((player.totalDeaths as number) || 0) + 1,
          totalLost: ((player.totalLost as number) || 0) + session.stakeAmount,
          highestRoom: Math.max(currentHighest, room), // Track deepest room reached
          lastPlayedAt: Date.now(),
          totalRuns: ((player.totalRuns as number) || 0) + 1,
          paleCoins: ((player.paleCoins as number) ?? 0) + earn,
          bindingStreak: streak, // coins-death resets to 0; non-coins unchanged
        }),
      );
    }

    const runReceiptId = id();

    await db.transact([
      // Record the death with hash for verification
      tx.deaths[deathId].update({
        walletAddress: session.walletAddress,
        playerName: displayName,
        zone: zoneForRecords,
        room,
        ...(validNodeId ? { nodeId: validNodeId } : {}),
        stakeAmount: session.stakeAmount,
        finalMessage: finalMessage.trim(),
        killedBy: killedBy || 'Unknown',
        inventory: JSON.stringify(inventoryArray),
        deathHash,
        sealTier: deathSealTier, // seal of the streak they died holding
        ...(nowPlayingTitle ? { nowPlayingTitle, nowPlayingArtist: nowPlayingArtist || '' } : {}),
        createdAt: timestamp,
      }),
      // Create a corpse for other players to find
      tx.corpses[corpseId].update({
        deathId,
        zone: zoneForRecords,
        room,
        ...(validNodeId ? { nodeId: validNodeId } : {}),
        playerName: displayName,
        walletAddress: session.walletAddress, // For tipping
        finalMessage: finalMessage.trim(),
        killedBy: killedBy || 'Unknown', // What killed the player
        loot: lootItem.name,
        lootEmoji: lootItem.emoji,
        discovered: false,
        tipped: false,
        tipAmount: 0,
        createdAt: Date.now(),
      }),
      // Mark session as dead
      tx.sessions[session.id].update({
        status: 'dead',
        endedAt: Date.now(),
        finalRoom: room,
      }),
      // Immutable run receipt — written even for guests (records the run, not
      // the player grant). coinDelta/streakAfter reflect what was granted.
      tx.runReceipts[runReceiptId].update(
        { ...buildRunReceipt({
          sessionId: session.id,
          sessionToken,
          authId: session.authId ?? null,
          walletAddress: session.walletAddress ?? null,
          zoneId: session.zoneId ?? null,
          runSeed: session.seed ?? null,
          seedSource: session.seedSource ?? null,
          serverDayKey: session.serverDayKey ?? null,
          dailyShiftEnabled: session.dailyShiftEnabled ?? null,
          chosenModifierId: session.chosenModifierId ?? null,
          stakeMode,
          coinStake,
          outcome: 'dead',
          finalDepth: room,
          killedBy: killedBy || null,
          nodeId: validNodeId ?? null,
          coinDelta: grantedCoinDelta,
          streakAfter: grantedStreakAfter,
          createdAt: Date.now(),
        }) },
      ),
      // Coin grant + stat increments (player) and pool burn (coins mode).
      ...settlementWrites,
    ]);

    // Post to Tapestry social graph (wallet users only) and store contentId
    const isGuestWallet = !session.walletAddress || session.walletAddress.startsWith('guest-');
    if (!isGuestWallet) {
      try {
        const contentId = await postDeath({
          walletAddress: session.walletAddress,
          playerName: displayName,
          room,
          finalMessage: finalMessage.trim(),
          stakeAmount: session.stakeAmount || 0,
        });
        if (contentId) {
          await db.transact([
            tx.deaths[deathId].update({ tapestryContentId: contentId, likeCount: 0 }),
          ]);
        }
      } catch (err) {
        console.warn('[Tapestry] postDeath failed (non-fatal):', err);
      }
    }

    return NextResponse.json({
      success: true,
      deathId,
      corpseId,
      deathHash, // For verification
    });

  } catch (error) {
    console.error('Failed to record death:', error);
    return NextResponse.json({ error: 'Failed to record death' }, { status: 500 });
  }
}
