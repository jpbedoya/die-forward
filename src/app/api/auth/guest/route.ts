import { NextRequest, NextResponse } from 'next/server';
import { init, id } from '@instantdb/admin';

// Lazy init to ensure env vars are available
let db: ReturnType<typeof init> | null = null;
function getDb() {
  if (!db) {
    const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID;
    const adminToken = process.env.INSTANT_ADMIN_KEY;
    if (!appId || !adminToken) {
      throw new Error('Missing InstantDB configuration');
    }
    db = init({ appId, adminToken });
  }
  return db;
}

// guestId is always "guest-" + the UUID shape returned by @instantdb/admin's
// id() (see the "create a new guest session" branch below) — anything else
// is untrusted client input. This value round-trips into an InstantDB auth
// token's email and is later used in a $ilike query (mobile's
// useCurrentPlayer()), so accepting an unvalidated string here would let a
// caller mint a token containing SQL-LIKE wildcards ('%', '_') and use it to
// match other players' rows instead of just their own — validate strictly
// before ever using this in an email/token.
const GUEST_ID_PATTERN = /^guest-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Handle preflight requests
/**
 * POST /api/auth/guest
 *
 * Create a guest (empty handed) session with a unique ID.
 * Returns InstantDB token for anonymous play.
 */
export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json().catch(() => ({}));
    const { existingGuestId } = body;

    // Re-authenticate an existing guest session
    if (existingGuestId && typeof existingGuestId === 'string' && GUEST_ID_PATTERN.test(existingGuestId)) {
      console.log('[Auth] Re-authenticating existing guest:', existingGuestId);
      const token = await db.auth.createToken({ email: `${existingGuestId}@guest.dieforward.com` });
      return NextResponse.json({
        token,
        guestId: existingGuestId,
        isNewUser: false,
      });
    }

    // Create a new guest session
    const guestId = `guest-${id()}`;
    console.log('[Auth] Creating new guest session:', guestId);
    const token = await db.auth.createToken({ email: `${guestId}@guest.dieforward.com` });
    console.log('[Auth] Guest token created');

    return NextResponse.json({
      token,
      guestId,
      isNewUser: true,
    });
  } catch (error) {
    console.error('[Auth] Guest auth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create guest session: ${errorMessage}` }, { status: 500 }
    );
  }
}
