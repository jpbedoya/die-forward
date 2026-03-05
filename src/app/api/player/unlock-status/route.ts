import { NextRequest, NextResponse } from 'next/server';
import { init } from '@instantdb/admin';

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_KEY!,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const walletAddress = request.nextUrl.searchParams.get('walletAddress');

  // No identifier → guest gets only Sunken Crypt
  if (!walletAddress) {
    return NextResponse.json(
      { unlockedZones: ['sunken-crypt'], totalRuns: 0, zonesCleared: [] },
      { headers: corsHeaders },
    );
  }

  // Guest identifiers → only Sunken Crypt
  if (walletAddress.startsWith('guest-') || walletAddress.startsWith('anon-')) {
    return NextResponse.json(
      { unlockedZones: ['sunken-crypt'], totalRuns: 0, zonesCleared: [] },
      { headers: corsHeaders },
    );
  }

  // DEV MODE: all zones unlocked for all authenticated users — remove before launch
  const ALL_ZONES = ['sunken-crypt', 'ashen-crypts', 'frozen-gallery', 'living-tomb', 'void-beyond'];
  return NextResponse.json(
    { unlockedZones: ALL_ZONES, totalRuns: 0, zonesCleared: [] },
    { headers: corsHeaders },
  );

  try {
    // Try authId lookup first (works for both wallet + guest-auth players)
    let player: Record<string, unknown> | null = null;

    const authResult = await db.query({
      players: { $: { where: { authId: walletAddress }, limit: 1 } },
    });
    if (authResult?.players?.length > 0) {
      player = authResult.players[0] as Record<string, unknown>;
    }

    // Fallback: look up by walletAddress
    if (!player) {
      const walletResult = await db.query({
        players: { $: { where: { walletAddress }, limit: 1 } },
      });
      if (walletResult?.players?.length > 0) {
        player = walletResult.players[0] as Record<string, unknown>;
      }
    }

    if (!player) {
      return NextResponse.json(
        { unlockedZones: ['sunken-crypt'], totalRuns: 0, zonesCleared: [] },
        { headers: corsHeaders },
      );
    }

    const totalRuns = (player.totalRuns as number) || 0;

    // zonesCleared stored as JSON string
    const zonesClearedRaw = (player.zonesCleared as string) || '[]';
    let zonesCleared: string[] = [];
    try {
      zonesCleared = JSON.parse(zonesClearedRaw);
      if (!Array.isArray(zonesCleared)) zonesCleared = [];
    } catch {
      zonesCleared = [];
    }

    // DEV MODE: all zones unlocked for testing
    const unlockedZones: string[] = ['sunken-crypt', 'ashen-crypts', 'frozen-gallery', 'living-tomb', 'void-beyond'];

    // TODO: re-enable unlock gates before launch
    // const unlockedZones: string[] = ['sunken-crypt'];
    // if (totalRuns >= 1) {
    //   unlockedZones.push('ashen-crypts', 'frozen-gallery', 'living-tomb');
    // }
    // if (new Set(zonesCleared).size >= 3) {
    //   unlockedZones.push('void-beyond');
    // }

    return NextResponse.json(
      { unlockedZones, totalRuns, zonesCleared },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('Failed to get unlock status:', error);
    // Safe fallback — never crash the zone select screen
    return NextResponse.json(
      { unlockedZones: ['sunken-crypt'], totalRuns: 0, zonesCleared: [] },
      { headers: corsHeaders },
    );
  }
}
