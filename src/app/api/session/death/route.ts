import { NextRequest, NextResponse } from 'next/server';
import { tx, id } from '@instantdb/admin';
import { db } from '@/lib/db';
import { hashDeathData, recordDeathOnChain, recordDeathInEscrow } from '@/lib/onchain';
import { postDeath } from '@/lib/tapestry';
import { commitErRun } from '@/lib/magicblock';

// Demo mode flag - skip on-chain recording
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// CORS headers for unified codebase
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
    const { sessionToken, room, finalMessage, inventory, playerName, killedBy, nowPlayingTitle, nowPlayingArtist } = body;

    // Validate inputs
    if (!sessionToken || typeof sessionToken !== 'string') {
      return NextResponse.json({ error: 'Invalid session token' }, { status: 400, headers: corsHeaders });
    }

    if (typeof room !== 'number' || room < 1) {
      return NextResponse.json({ error: 'Invalid room number' }, { status: 400, headers: corsHeaders });
    }

    if (!finalMessage || typeof finalMessage !== 'string' || finalMessage.length > 50) {
      return NextResponse.json({ error: 'Invalid final message' }, { status: 400, headers: corsHeaders });
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
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 403, headers: corsHeaders });
    }

    const session = sessions[0];

    // Validate room upper bound against session's actual maxRooms
    const maxRooms = (session as Record<string, unknown>).maxRooms as number || 13;
    if (room > maxRooms) {
      return NextResponse.json({ error: 'Invalid room number' }, { status: 400, headers: corsHeaders });
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

    await db.transact([
      // Record the death with hash for verification
      tx.deaths[deathId].update({
        walletAddress: session.walletAddress,
        playerName: displayName,
        zone: session.zone,
        room,
        stakeAmount: session.stakeAmount,
        finalMessage: finalMessage.trim(),
        killedBy: killedBy || 'Unknown',
        inventory: JSON.stringify(inventoryArray),
        deathHash,
        ...(nowPlayingTitle ? { nowPlayingTitle, nowPlayingArtist: nowPlayingArtist || '' } : {}),
        createdAt: timestamp,
      }),
      // Create a corpse for other players to find
      tx.corpses[corpseId].update({
        deathId,
        zone: session.zone,
        room,
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
    ]);

    // Update player stats (increment deaths, track lost stake)
    // Use authId for lookup (supports guests + wallet users), fallback to walletAddress for legacy
    try {
      const lookupKey = session.authId || session.walletAddress;
      const lookupField = session.authId ? 'authId' : 'walletAddress';
      
      const { players } = await db.query({
        players: {
          $: {
            where: { [lookupField]: lookupKey },
            limit: 1,
          },
        },
      });

      if (players && players.length > 0) {
        const player = players[0];
        const currentHighest = (player as Record<string, unknown>).highestRoom as number || 0;
        await db.transact([
          tx.players[player.id].update({
            totalDeaths: ((player as Record<string, unknown>).totalDeaths as number || 0) + 1,
            totalLost: ((player as Record<string, unknown>).totalLost as number || 0) + session.stakeAmount,
            highestRoom: Math.max(currentHighest, room), // Track deepest room reached
            lastPlayedAt: Date.now(),
            totalRuns: ((player as Record<string, unknown>).totalRuns as number || 0) + 1,
          }),
        ]);
      }
    } catch (statsError) {
      console.warn('Failed to update player stats:', statsError);
      // Don't fail the whole request for stats
    }

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
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Failed to record death:', error);
    return NextResponse.json({ error: 'Failed to record death' }, { status: 500, headers: corsHeaders });
  }
}
