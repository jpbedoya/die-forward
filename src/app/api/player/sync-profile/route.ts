import { NextRequest, NextResponse } from 'next/server';
import { upsertProfile, updateProfileUsername } from '@/lib/tapestry';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/player/sync-profile
 *
 * Syncs the player's in-game nickname to their Tapestry profile.
 * Called from saveNickname in game/page.tsx after the InstantDB update succeeds.
 *
 * Body: { walletAddress: string, nickname: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, nickname } = body as { walletAddress?: string; nickname?: string };

    if (!walletAddress || !nickname?.trim()) {
      return NextResponse.json(
        { error: 'walletAddress and nickname are required' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Ensure profile exists (creates if missing), then patch the username.
    // findOrCreate alone doesn't update an existing profile's username.
    await upsertProfile(walletAddress, nickname.trim());
    await updateProfileUsername(walletAddress, nickname.trim());

    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch (err) {
    // Non-fatal — Tapestry sync should never break the game
    console.warn('[Tapestry] sync-profile error (non-fatal):', err);
    return NextResponse.json({ ok: false }, { headers: corsHeaders });
  }
}
