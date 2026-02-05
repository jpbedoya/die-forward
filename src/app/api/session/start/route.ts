import { NextRequest, NextResponse } from 'next/server';
import { init, tx, id } from '@instantdb/admin';

// Initialize InstantDB Admin client
const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_KEY!,
});

// Valid stake amounts
const VALID_STAKES = [0.01, 0.05, 0.1, 0.25];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, stakeAmount } = body;

    // Validate inputs
    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    if (!VALID_STAKES.includes(stakeAmount)) {
      return NextResponse.json({ error: 'Invalid stake amount' }, { status: 400 });
    }

    // Generate session token
    const sessionToken = id();
    const sessionId = id();

    // Store session in database
    await db.transact([
      tx.sessions[sessionId].update({
        token: sessionToken,
        walletAddress,
        stakeAmount,
        zone: 'THE SUNKEN CRYPT',
        startedAt: Date.now(),
        status: 'active', // active, completed, dead
      }),
    ]);

    return NextResponse.json({
      success: true,
      sessionToken,
      zone: 'THE SUNKEN CRYPT',
    });

  } catch (error) {
    console.error('Failed to start session:', error);
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 });
  }
}
