import { NextRequest, NextResponse } from 'next/server';
import { init, tx } from '@instantdb/admin';

// Initialize InstantDB Admin client
const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken, fromRoom } = body;

    // Validate inputs
    if (!sessionToken || typeof sessionToken !== 'string') {
      return NextResponse.json({ error: 'Invalid session token' }, { status: 400 });
    }

    if (typeof fromRoom !== 'number' || fromRoom < 1 || fromRoom > 20) {
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
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 403 });
    }

    const session = sessions[0];
    const serverRoom = session.currentRoom || 1;

    // Validate: client's room must match server's room (prevent skipping)
    if (fromRoom !== serverRoom) {
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

    return NextResponse.json({
      success: true,
      currentRoom: nextRoom,
    });

  } catch (error) {
    console.error('Failed to advance room:', error);
    return NextResponse.json({ error: 'Failed to advance' }, { status: 500 });
  }
}
