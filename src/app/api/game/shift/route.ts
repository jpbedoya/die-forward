import { NextRequest, NextResponse } from 'next/server';
import { tx, id } from '@instantdb/admin';
import { db } from '@/lib/db';
import { getZoneCreatureNames } from '@/lib/content';
import {
  aggregateZoneDay,
  buildWorldShiftWrites,
  type ReceiptForAgg,
  type ZoneDayAggregate,
  type WorldShiftRow,
} from '@/lib/world-shift-agg';
import { selectModeratedUGC, buildSuppressedSet, type AuthorTrust, type PhraseCandidate } from '@/lib/moderation';

const ZONE_IDS = ['sunken-crypt', 'ashen-crypts', 'frozen-gallery', 'living-tomb', 'void-beyond'];
const WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Server-computed UTC day key, 'YYYY-MM-DD'. Matches session/start's
 * serverDayKey and mobile's utcDayKey (mobile/lib/world-shift.ts).
 */
function utcDayKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// One-time warning latch so an unguarded (no CRON_SECRET) deployment logs the
// warning once per server process, not on every sweep.
let unguardedWarned = false;

/**
 * Cron-only access guard, mirroring session/cleanup/route.ts's checkCronAuth
 * exactly: CRON_SECRET via `Authorization: Bearer <secret>` or
 * `x-cron-secret: <secret>` — 401 otherwise. Open-and-warn if unset (dev
 * convenience), so the unguarded state is still visible in logs.
 */
function checkCronAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (!unguardedWarned) {
      console.warn('[Shift] CRON_SECRET is not set — the aggregation endpoint is UNGUARDED.');
      unguardedWarned = true;
    }
    return null;
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${secret}` || request.headers.get('x-cron-secret') === secret) return null;
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * Nightly community aggregation. Reachable two ways so it fires regardless of
 * scheduler: an external scheduler that POSTs, or a Vercel Cron Job that GETs
 * `/api/game/shift` with no query params (see GET below). Both are guarded by
 * checkCronAuth (CRON_SECRET).
 */
async function runAggregation(request: NextRequest) {
  const denied = checkCronAuth(request);
  if (denied) return denied;

  try {
    const now = new Date();
    const nowMs = now.getTime();
    const dayKey = utcDayKey(now);

    // A5: aggregate over server-receipted DEATHS ONLY. runReceipts are
    // server-only-writable (deny-by-default perms); deaths rows are forgeable.
    // No createdAt-range where-operator exists in this codebase, so read the
    // recent receipts and window-filter in JS (mirrors cleanup route's pattern).
    // Filter keeps only trailing-24h receipts AND rejects future-dated ones
    // (clock-skew / forged-future defense — a receipt timestamped after "now"
    // cannot be legitimate and must not feed the aggregate).
    const result = await db.query({ runReceipts: { $: { where: { outcome: 'dead' } } } });
    const rows = (result?.runReceipts ?? []) as Record<string, unknown>[];
    const receipts: ReceiptForAgg[] = rows
      .filter(
        (r) =>
          typeof r.createdAt === 'number' &&
          (r.createdAt as number) >= nowMs - WINDOW_MS &&
          (r.createdAt as number) <= nowMs,
      )
      .map((r) => ({
        authId: (r.authId as string) ?? null,
        walletAddress: (r.walletAddress as string) ?? null,
        zoneId: (r.zoneId as string) ?? null,
        outcome: (r.outcome as string) ?? '',
        nodeId: (r.nodeId as string) ?? null,
        killedBy: (r.killedBy as string) ?? null,
        createdAt: r.createdAt as number,
      }));

    // Tunables from gameSettings (like victoryBonusPercent).
    const settingsResult = await db.query({ gameSettings: {} }).catch(() => null);
    const settings = (settingsResult?.gameSettings?.[0] as Record<string, unknown>) || {};
    const curseNodeThreshold = (settings.curseNodeThreshold as number) ?? 10;
    const apexMinKills = (settings.apexMinKills as number) ?? 3;

    // ── A2 moderated UGC channel (Phase 4b) ──────────────────────────────────────
    // Rebroadcast text comes ONLY from receipts (trusted) + is moderated server-side.
    const ugcMinAccountAgeDays = (settings.ugcMinAccountAgeDays as number) ?? 3;
    const ugcReportThreshold = (settings.ugcReportThreshold as number) ?? 2;
    const minAccountAgeMs = ugcMinAccountAgeDays * 24 * 60 * 60 * 1000;

    // reports → suppressed set
    const reportsRes = await db.query({ reports: {} }).catch(() => null);
    const reportRows = (reportsRes?.reports ?? []) as Record<string, unknown>[];
    const suppressed = buildSuppressedSet(
      reportRows.map((r) => ({
        reportedWallet: (r.reportedWallet as string) ?? null,
        reportedText: (r.reportedText as string) ?? '',
        reporterAuthId: (r.reporterAuthId as string) ?? '',
      })),
      ugcReportThreshold,
    );

    // players → author trust + nickname, keyed by authId AND walletAddress
    const playersRes = await db.query({ players: {} }).catch(() => null);
    const playerRows = (playersRes?.players ?? []) as Record<string, unknown>[];
    const authorByKey = new Map<string, { trust: AuthorTrust; nickname: string | null }>();
    for (const p of playerRows) {
      const entry = {
        trust: {
          createdAt: (p.createdAt as number) ?? 0,
          authType: (p.authType as string) ?? undefined,
          totalLost: (p.totalLost as number) ?? 0,
          totalEarned: (p.totalEarned as number) ?? 0,
          totalClears: (p.totalClears as number) ?? 0,
        } as AuthorTrust,
        nickname: (p.nickname as string) ?? null,
      };
      if (p.authId) authorByKey.set(`auth:${p.authId as string}`, entry);
      if (p.walletAddress) authorByKey.set(`wallet:${p.walletAddress as string}`, entry);
    }

    // per-zone candidates from RAW receipts (deduped-death text lives on the receipt now)
    function candidatesForZone(zoneId: string): PhraseCandidate[] {
      return rows
        .filter((r) => r.zoneId === zoneId && r.outcome === 'dead' && typeof r.finalMessage === 'string' && (r.finalMessage as string).trim())
        .map((r) => {
          const author =
            authorByKey.get(`auth:${(r.authId as string) ?? ''}`) ??
            authorByKey.get(`wallet:${(r.walletAddress as string) ?? ''}`) ?? null;
          return {
            text: (r.finalMessage as string) ?? null,
            nickname: author?.nickname ?? null,
            walletAddress: (r.walletAddress as string) ?? null,
            author: author?.trust ?? null,
          };
        });
    }

    const aggregatesByZone: Record<string, ZoneDayAggregate> = {};
    const ugcByZone: Record<string, { echoPhrases: string[]; architectEntries: { name: string; words: string }[] }> = {};
    for (const zoneId of ZONE_IDS) {
      // Build the per-zone real-creature allowlist so environmental killers
      // ("The darkness", "Voidblade") can never occupy the apex slot. Degrade
      // to no-filter if the zone fails to load, rather than nulling the apex.
      const validCreatures = new Set(await getZoneCreatureNames(zoneId).catch(() => []));
      aggregatesByZone[zoneId] = aggregateZoneDay(zoneId, receipts, {
        nowMs, windowMs: WINDOW_MS, curseNodeThreshold, apexMinKills,
        validCreatures: validCreatures.size > 0 ? validCreatures : null,
      });
      ugcByZone[zoneId] = selectModeratedUGC(candidatesForZone(zoneId), {
        nowMs, minAccountAgeMs, suppressed,
      });
    }

    const existingResult = await db.query({ worldShifts: { $: { where: { dayKey } } } }).catch(() => null);
    const existingRows = ((existingResult?.worldShifts ?? []) as unknown[]).map((r) => r as WorldShiftRow);

    const plans = buildWorldShiftWrites(dayKey, aggregatesByZone, existingRows, () => id(), nowMs);
    const writes = plans.map((p) => {
      const ugc = ugcByZone[p.fields.zoneId as string] ?? { echoPhrases: [], architectEntries: [] };
      return tx.worldShifts[p.rowId].update({ ...p.fields, echoPhrases: ugc.echoPhrases, architectEntries: ugc.architectEntries });
    });
    if (writes.length > 0) await db.transact(writes);

    return NextResponse.json({ success: true, dayKey, zones: plans.length, receiptedDeaths: receipts.length });
  } catch (error) {
    console.error('Failed to aggregate world shift:', error);
    return NextResponse.json({ error: 'Failed to aggregate world shift' }, { status: 500 });
  }
}

// External schedulers POST to trigger aggregation.
export async function POST(request: NextRequest) {
  return runAggregation(request);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get('zoneId');
    const dayKey = searchParams.get('dayKey');
    if (!dayKey) {
      // A Vercel Cron Job invokes this path with a GET and no query params —
      // that's the aggregation trigger (checkCronAuth-guarded inside). A real
      // client read ALWAYS carries dayKey, so this branch never shadows a read.
      return runAggregation(request);
    }
    if (!zoneId) {
      const result = await db.query({ worldShifts: { $: { where: { dayKey } } } }).catch(() => null);
      const shifts = (result?.worldShifts ?? []) as Record<string, unknown>[];
      return NextResponse.json({ shifts });
    }
    const result = await db
      .query({ worldShifts: { $: { where: { dayKey, zoneId }, limit: 1 } } })
      .catch(() => null);
    const shift = (result?.worldShifts?.[0] as Record<string, unknown>) ?? null;
    return NextResponse.json({ shift });
  } catch (error) {
    console.error('Failed to read world shift:', error);
    return NextResponse.json({ shift: null });
  }
}
