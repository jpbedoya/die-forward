import { NextRequest, NextResponse } from 'next/server';
import { init, id } from '@instantdb/admin';

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID!;
const ADMIN_TOKEN = process.env.INSTANT_APP_ADMIN_TOKEN!;

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

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
    });
  } catch (error) {
    console.error('[Auth] Guest auth error:', error);
    return NextResponse.json(
      { error: 'Failed to create guest session' },
      { status: 500 }
    );
  }
}
