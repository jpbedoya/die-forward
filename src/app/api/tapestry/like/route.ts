import { NextRequest, NextResponse } from 'next/server';
import { init, tx } from '@instantdb/admin';
import { likeDeath } from '@/lib/tapestry';

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { deathId, walletAddress } = await request.json();

    if (!deathId || !walletAddress) {
      return NextResponse.json({ error: 'deathId and walletAddress required' }, { status: 400 });
    }

    // Get the death record
    const { deaths } = await db.query({
      deaths: { $: { where: { id: deathId }, limit: 1 } },
    });

    if (!deaths || deaths.length === 0) {
      return NextResponse.json({ error: 'Death not found' }, { status: 404 });
    }

    const death = deaths[0] as Record<string, unknown>;
    const currentCount = (death.likeCount as number) || 0;

    // Update like count in InstantDB
    await db.transact([
      tx.deaths[deathId].update({ likeCount: currentCount + 1 }),
    ]);

    // Also increment totalLikesReceived on the player who died
    if (death.walletAddress) {
      const { players } = await db.query({
        players: { $: { where: { walletAddress: death.walletAddress as string }, limit: 1 } },
      });
      if (players && players.length > 0) {
        const player = players[0] as Record<string, unknown>;
        await db.transact([
          tx.players[players[0].id].update({
            totalLikesReceived: ((player.totalLikesReceived as number) || 0) + 1,
          }),
        ]);
      }
    }

    // Sync to Tapestry (non-blocking) if we have a contentId
    if (death.tapestryContentId) {
      likeDeath({
        walletAddress,
        contentId: death.tapestryContentId as string,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      likeCount: currentCount + 1,
    });

  } catch (error) {
    console.error('Failed to like death:', error);
    return NextResponse.json({ error: 'Failed to like' }, { status: 500 });
  }
}
