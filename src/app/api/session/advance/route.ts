import { NextRequest, NextResponse } from 'next/server';
import { tx } from '@instantdb/admin';
import { db } from '@/lib/db';
import { recordErEvent } from '@/lib/magicblock';
import { verifyAuthToken, sessionAuthMismatch } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Cross-account defense-in-depth: read any bearer token BEFORE the body is
    // consumed. Room progression below is keyed off session.authId's session,
    // never this token.
    const identity = await verifyAuthToken(request);

    const body = await request.json();
    const { sessionToken, fromRoom } = body;

    console.log('[advance] Request:', { sessionToken: sessionToken?.slice(0, 8) + '...', fromRoom });

    // Validate inputs
    if (!sessionToken || typeof sessionToken !== 'string') {
      console.log('[advance] FAIL: Invalid session token format');
      return NextResponse.json({ error: 'Invalid session token' }, { status: 400 });
    }

    // 'room' = canonical 1-based node depth (spec §4.1); graph edges always descend one depth, so linear validation holds
    if (typeof fromRoom !== 'number' || fromRoom < 1 || fromRoom > 20) {
      console.log('[advance] FAIL: Invalid room number', fromRoom);
      return NextResponse.json({ error: 'Invalid room number' }, { status: 400 });
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
      // Check if session exists but with different status
      const anySession = await db.query({
        sessions: { $: { where: { token: sessionToken } } },
      });
      const found = anySession?.sessions?.[0];
      console.log('[advance] FAIL: No active session found. Exists?', !!found, 'Status:', found?.status);
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 403 });
    }

    const session = sessions[0];

    // Cross-account guard: a VALID token for a different account cannot advance
    // this session. No token → unchanged; legacy sessions without an authId are
    // unaffected.
    if (sessionAuthMismatch(identity, session.authId as string | null | undefined)) {
      console.log('[advance] FAIL: cross-account token');
      return NextResponse.json({ error: 'Session does not belong to this account' }, { status: 403 });
    }

    const serverRoom = session.currentRoom || 1;

    console.log('[advance] Session found:', { id: session.id, serverRoom, clientRoom: fromRoom });

    // Validate: client's room must match server's room (prevent skipping)
    if (fromRoom !== serverRoom) {
      console.log('[advance] FAIL: Room mismatch. Server:', serverRoom, 'Client:', fromRoom);
      return NextResponse.json({ 
        error: 'Room mismatch - possible tampering detected',
        expected: serverRoom,
        received: fromRoom,
      }, { status: 403 });
    }

    // Advance to next room
    const nextRoom = serverRoom + 1;

    await db.transact([
      tx.sessions[session.id].update({
        currentRoom: nextRoom,
        lastAdvancedAt: Date.now(),
      }),
    ]);

    console.log('[advance] SUCCESS: Advanced to room', nextRoom);

    // ── MagicBlock: record room advance on the ER ──
    // Fire-and-forget — ER events are non-critical observability data.
    // Do NOT await: the 3s timeout was blocking the advance response,
    // causing room mismatch when the client timed out.
    // Vercel may kill this promise after the response is sent, which is fine.
    const erRunId = (session as Record<string, unknown>).erRunId as string | undefined;
    if (erRunId) {
      recordErEvent({ erRunId, eventType: 'advance_room', room: nextRoom }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      currentRoom: nextRoom,
    });

  } catch (error) {
    console.error('[advance] ERROR:', error);
    return NextResponse.json({ error: 'Failed to advance' }, { status: 500 });
  }
}
