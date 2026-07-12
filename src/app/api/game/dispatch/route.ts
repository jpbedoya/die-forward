import { NextRequest, NextResponse } from 'next/server';
import { tx } from '@instantdb/admin';
import { db } from '@/lib/db';
import { Expo } from 'expo-server-sdk';
import { selectFanoutRecipients, renderPushText, type FanoutUser } from '@/lib/dispatch-fanout';

const TARGET_LOCAL_HOUR = 8; // 08:00 local
const HOME_ZONE = 'sunken-crypt'; // push describes the flagship zone's day

let unguardedWarned = false;
function checkCronAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (!unguardedWarned) { console.warn('[Dispatch] CRON_SECRET is not set — endpoint UNGUARDED.'); unguardedWarned = true; }
    return null;
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${secret}` || request.headers.get('x-cron-secret') === secret) return null;
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/** Real timezone→{hour,dayKey}. Uses Intl with the user's IANA tz. */
function localTimeOf(tz: string, utcMs: number): { hour: number; dayKey: string } {
  try {
    const d = new Date(utcMs);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    const hour = parseInt(get('hour'), 10);
    return { hour: Number.isNaN(hour) ? -1 : hour % 24, dayKey: `${get('year')}-${get('month')}-${get('day')}` };
  } catch {
    return { hour: -1, dayKey: '' };
  }
}

export async function POST(request: NextRequest) {
  const denied = checkCronAuth(request);
  if (denied) return denied;
  try {
    const nowUtcMs = Date.now();

    // today's community row for the flagship zone (best-effort; push degrades to mask/quiet text)
    const utcDay = localTimeOf('UTC', nowUtcMs).dayKey;
    const shiftRes = await db.query({ worldShifts: { $: { where: { dayKey: utcDay, zoneId: HOME_ZONE }, limit: 1 } } }).catch(() => null);
    const row = (shiftRes?.worldShifts?.[0] as Record<string, unknown>) ?? {};
    const apex = (row.apexCreatureId as string) ?? null;
    const cursed = Array.isArray(row.curseNodes) ? (row.curseNodes as string[]) : [];

    // STRICT F7 (user decision, July 2026): send ONLY on consequential days — an
    // apex threat or a mass-death curse. Quiet/mask-only days send NO push (the
    // in-app panel still shows the day's dispatch). Seeded map masks are NOT
    // computed web-side, so they do not trigger a push — a deliberately conservative,
    // high-signal reading that matches "most days silent".
    if (!apex && cursed.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: 'quiet day — no push' });
    }
    const pushText = renderPushText({ apexCreatureId: apex, curseNodes: cursed, hasMask: false });

    const playersRes = await db.query({ players: {} }).catch(() => null);
    const players = (playersRes?.players ?? []) as Record<string, unknown>[];
    const users: FanoutUser[] = players.map((p) => ({
      playerId: p.id as string,
      pushToken: (p.pushToken as string) ?? null,
      timezone: (p.timezone as string) ?? null,
      notifOptIn: (p.notifOptIn as boolean) ?? false,
      lastDispatchDayKey: (p.lastDispatchDayKey as string) ?? null,
    }));

    const recipients = selectFanoutRecipients(users, { nowUtcMs, targetLocalHour: TARGET_LOCAL_HOUR, localTimeOf });
    if (recipients.length === 0) return NextResponse.json({ success: true, sent: 0 });

    const expo = new Expo();
    const messages = recipients
      .filter((r) => Expo.isExpoPushToken(r.pushToken))
      .map((r) => ({ to: r.pushToken, sound: 'default' as const, body: pushText }));

    // send in chunks; ignore per-ticket errors (best-effort delivery)
    for (const chunk of expo.chunkPushNotifications(messages)) {
      try { await expo.sendPushNotificationsAsync(chunk); } catch (e) { console.warn('[Dispatch] send chunk failed:', e); }
    }

    // stamp lastDispatchDayKey so each user gets ≤1/day
    await db.transact(recipients.map((r) => tx.players[r.playerId].update({ lastDispatchDayKey: r.localDayKey })));

    return NextResponse.json({ success: true, sent: recipients.length });
  } catch (error) {
    console.error('Failed to fan out dispatch:', error);
    return NextResponse.json({ error: 'Failed to fan out dispatch' }, { status: 500 });
  }
}

// Vercel Cron Jobs invoke the path with a GET request; external schedulers may
// POST. Accept both (each guarded by checkCronAuth) so the fan-out fires
// regardless of how it is triggered. GET delegates to the POST handler.
export async function GET(request: NextRequest) {
  return POST(request);
}
