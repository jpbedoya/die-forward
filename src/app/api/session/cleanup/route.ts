import { NextRequest, NextResponse } from 'next/server';
import { init, tx } from '@instantdb/admin';

// Initialize InstantDB Admin client
const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_KEY!,
});

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Stale session threshold: 1 hour
const STALE_THRESHOLD_MS = 60 * 60 * 1000;

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Cleanup stale active sessions
 * 
 * Sessions that have been 'active' for more than 1 hour are likely abandoned.
 * This endpoint marks them as 'dead' with a default epitaph.
 */
export async function POST(request: NextRequest) {
  try {
    const now = Date.now();
    const threshold = now - STALE_THRESHOLD_MS;

    // Find all active sessions older than threshold
    const result = await db.query({
      sessions: {
        $: {
          where: {
            status: 'active',
          },
        },
      },
    });

    const sessions = result?.sessions || [];
    const staleSessions = sessions.filter((s: any) => s.startedAt < threshold);

    if (staleSessions.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No stale sessions found',
        cleaned: 0,
      }, { headers: corsHeaders });
    }

    // Mark stale sessions as dead
    const updates = staleSessions.map((session: any) => 
      tx.sessions[session.id].update({
        status: 'dead',
        endedAt: now,
        finalMessage: '...',  // Default epitaph for abandoned sessions
        room: session.currentRoom || 1,
      })
    );

    await db.transact(updates);

    console.log(`[Cleanup] Marked ${staleSessions.length} stale sessions as dead`);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${staleSessions.length} stale sessions`,
      cleaned: staleSessions.length,
      sessionIds: staleSessions.map((s: any) => s.id),
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Failed to cleanup sessions:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup sessions' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}
