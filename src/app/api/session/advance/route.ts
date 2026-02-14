import { NextRequest, NextResponse } from 'next/server';
import { init, tx } from '@instantdb/admin';

// Initialize InstantDB Admin client
const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_KEY!,
});

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
    const { sessionToken, fromRoom } = body;

    console.log('[advance] Request:', { sessionToken: sessionToken?.slice(0, 8) + '...', fromRoom });

    // Validate inputs
    if (!sessionToken || typeof sessionToken !== 'string') {
      console.log('[advance] FAIL: Invalid session token format');
      return NextResponse.json({ error: 'Invalid session token' }, { status: 400 });
    }

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
    return NextResponse.json({
      success: true,
      currentRoom: nextRoom,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('[advance] ERROR:', error);
    return NextResponse.json({ error: 'Failed to advance' }, { status: 500, headers: corsHeaders });
  }
}
