import { NextRequest, NextResponse } from 'next/server';
import { tx, id } from '@instantdb/admin';
import { db } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const identity = await verifyAuthToken(request); // header path; read before body
    if (!identity) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const deathId = body?.deathId;
    if (!deathId || typeof deathId !== 'string') {
      return NextResponse.json({ error: 'deathId required' }, { status: 400 });
    }

    // Look up the AUTHORITATIVE reported text/author server-side — never trust the client.
    // Try the death row first, then the corpse (players report from corpse surfaces).
    const deathRes = await db.query({ deaths: { $: { where: { id: deathId }, limit: 1 } } }).catch(() => null);
    let row = deathRes?.deaths?.[0] as Record<string, unknown> | undefined;
    if (!row) {
      const corpseRes = await db.query({ corpses: { $: { where: { id: deathId }, limit: 1 } } }).catch(() => null);
      row = corpseRes?.corpses?.[0] as Record<string, unknown> | undefined;
    }
    if (!row) return NextResponse.json({ error: 'Target not found' }, { status: 404 });

    const reportedWallet = (row.walletAddress as string) ?? null;
    const reportedText = ((row.finalMessage as string) ?? '').trim();
    if (!reportedText) return NextResponse.json({ success: true, noop: true }); // nothing to suppress

    // Idempotent-ish: one report row per (reporter, death). Best-effort dedupe by querying is
    // unnecessary — buildSuppressedSet counts DISTINCT reporterAuthId, so duplicates don't inflate.
    await db.transact([
      tx.reports[id()].update({
        deathId,
        reporterAuthId: identity.authId,
        reportedWallet,
        reportedText,
        createdAt: Date.now(),
      }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to record report:', error);
    return NextResponse.json({ error: 'Failed to record report' }, { status: 500 });
  }
}
