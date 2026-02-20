import { NextRequest, NextResponse } from 'next/server';
import { init, id } from '@instantdb/admin';

// Lazy init to ensure env vars are available
let db: ReturnType<typeof init> | null = null;
function getDb() {
  if (!db) {
    const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID;
    const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;
    if (!appId || !adminToken) {
      throw new Error('Missing InstantDB configuration');
    }
    db = init({ appId, adminToken });
  }
  return db;
}

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/auth/guest
 * 
 * Create a guest (empty handed) session with a unique ID.
 * Returns InstantDB token for anonymous play.
 */
export async function POST(req: NextRequest) {
  try {
    const db = getDb();

    // Generate a unique guest ID
    const guestId = `guest-${id()}`;
    console.log('[Auth] Creating guest token for:', guestId);

    // Create InstantDB auth token with guest ID as user ID
    const token = await db.auth.createToken({ id: guestId });
    console.log('[Auth] Token created successfully');

    return NextResponse.json({
      token,
      guestId,
      isNewUser: true, // Guests are always "new" for nickname purposes
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('[Auth] Guest auth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create guest session: ${errorMessage}` },
      { status: 500, headers: corsHeaders }
    );
  }
}
