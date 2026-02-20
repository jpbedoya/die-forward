import { NextRequest, NextResponse } from 'next/server';
import { init, id } from '@instantdb/admin';

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID!;
const ADMIN_TOKEN = process.env.INSTANT_APP_ADMIN_TOKEN!;

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

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
    // Generate a unique guest ID
    const guestId = `guest-${id()}`;

    // Create InstantDB auth token with guest ID as user ID
    const token = await db.auth.createToken({ id: guestId });

    return NextResponse.json({
      token,
      guestId,
      isNewUser: true, // Guests are always "new" for nickname purposes
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('[Auth] Guest auth error:', error);
    return NextResponse.json(
      { error: 'Failed to create guest session' },
      { status: 500, headers: corsHeaders }
    );
  }
}
