import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const walletAddress = request.nextUrl.searchParams.get('walletAddress');

  // No identifier → guest gets only Sunken Crypt
  if (!walletAddress) {
    return NextResponse.json(
      { unlockedZones: ['sunken-crypt'], totalRuns: 0, zonesCleared: [] },
    );
  }

  // Guest identifiers → only Sunken Crypt
  if (walletAddress.startsWith('guest-') || walletAddress.startsWith('anon-')) {
    return NextResponse.json(
      { unlockedZones: ['sunken-crypt'], totalRuns: 0, zonesCleared: [] },
    );
  }

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
      );
    }

    const highestRoom = (player.highestRoom as number) || 0;
    const clearedZones: string[] = Array.isArray(player.clearedZones) ? player.clearedZones as string[] : [];

    // Unlock gates based on player progression
    const unlockedZones: string[] = ['sunken-crypt'];

    // Tier 2 zones: reach room 8+ in any run
    if (highestRoom >= 8) {
      unlockedZones.push('ashen-crypts', 'frozen-gallery', 'living-tomb');
    }

    // Void Beyond: clear 3 different zones
    if (new Set(clearedZones).size >= 3) {
      unlockedZones.push('void-beyond');
    }

    return NextResponse.json(
      { unlockedZones, highestRoom, zonesCleared: clearedZones },
    );
  } catch (error) {
    console.error('Failed to get unlock status:', error);
    // Safe fallback — never crash the zone select screen
    return NextResponse.json(
      { unlockedZones: ['sunken-crypt'], totalRuns: 0, zonesCleared: [] },
    );
  }
}
