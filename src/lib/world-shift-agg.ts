/**
 * Pure community-aggregation core for the daily world shift (Phase 4a).
 *
 * A5 integrity: input is server-receipted deaths ONLY (runReceipts, which are
 * server-only-writable — deaths rows are client-forgeable and must never feed
 * this). Counts are DISTINCT ACCOUNTS, per-account-capped, over a trailing
 * window — never raw row sums. No UGC (names/final words) is read or emitted.
 */

export interface ReceiptForAgg {
  authId: string | null;
  walletAddress: string | null;
  zoneId: string | null;
  outcome: string;
  nodeId: string | null;
  killedBy: string | null;
  createdAt: number;
}

export interface AggOptions {
  nowMs: number;
  windowMs?: number;
  perAccountCap?: number;
  curseNodeThreshold?: number;
  apexMinKills?: number;
  /**
   * Allowlist of REAL creature display names for this zone. When provided,
   * apex candidates whose killedBy is not in the set (environmental killers
   * like "The darkness") are skipped. Omitted/null => no filter (unchanged).
   */
  validCreatures?: Set<string> | null;
}

export interface ZoneDayAggregate {
  apexCreatureId: string | null;
  apexKills: number;
  curseNodes: string[];
  architectNodeId: string | null;
  architectDeaths: number;
  totalReceiptedDeaths: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const NULL_ACCOUNT = '<null>';

function accountKey(r: ReceiptForAgg): string {
  return r.authId ?? r.walletAddress ?? NULL_ACCOUNT;
}

/**
 * Distinct-account count with a per-account cap, over a keyed tally.
 * keyFn returns the bucket (nodeId or creatureId) or null to skip.
 * Returns Map<bucket, distinct-capped-count>.
 */
function cappedDistinctCounts(
  receipts: ReceiptForAgg[],
  keyFn: (r: ReceiptForAgg) => string | null,
  perAccountCap: number,
): Map<string, number> {
  // bucket -> account -> raw count (then min(cap) summed as distinct-capped weight)
  const perBucket = new Map<string, Map<string, number>>();
  for (const r of receipts) {
    const bucket = keyFn(r);
    if (bucket === null) continue;
    let accounts = perBucket.get(bucket);
    if (!accounts) { accounts = new Map(); perBucket.set(bucket, accounts); }
    const acct = accountKey(r);
    accounts.set(acct, (accounts.get(acct) ?? 0) + 1);
  }
  const out = new Map<string, number>();
  for (const [bucket, accounts] of perBucket) {
    let total = 0;
    for (const raw of accounts.values()) total += Math.min(raw, perAccountCap);
    out.set(bucket, total);
  }
  return out;
}

export function aggregateZoneDay(
  zoneId: string,
  receipts: ReceiptForAgg[],
  opts: AggOptions,
): ZoneDayAggregate {
  const windowMs = opts.windowMs ?? DAY_MS;
  const perAccountCap = opts.perAccountCap ?? 3;
  const curseNodeThreshold = opts.curseNodeThreshold ?? 10;
  const apexMinKills = opts.apexMinKills ?? 3;
  const minCreatedAt = opts.nowMs - windowMs;

  const eligible = receipts.filter(
    (r) => r.outcome === 'dead' && r.zoneId === zoneId && r.createdAt >= minCreatedAt,
  );

  // Node death tallies (distinct-account, capped).
  const nodeCounts = cappedDistinctCounts(eligible, (r) => r.nodeId, perAccountCap);
  const curseNodes = [...nodeCounts.entries()]
    .filter(([, n]) => n >= curseNodeThreshold)
    .map(([node]) => node)
    .sort();

  let architectNodeId: string | null = null;
  let architectDeaths = 0;
  for (const node of curseNodes) {
    const n = nodeCounts.get(node) ?? 0;
    if (n > architectDeaths || (n === architectDeaths && (architectNodeId === null || node < architectNodeId))) {
      architectNodeId = node;
      architectDeaths = n;
    }
  }

  // Apex creature (distinct-account, capped).
  const creatureCounts = cappedDistinctCounts(
    eligible,
    (r) => (r.killedBy && (!opts.validCreatures || opts.validCreatures.has(r.killedBy)) ? r.killedBy : null),
    perAccountCap,
  );
  let apexCreatureId: string | null = null;
  let apexKills = 0;
  for (const [creature, n] of creatureCounts) {
    if (n > apexKills || (n === apexKills && apexCreatureId !== null && creature < apexCreatureId)) {
      apexCreatureId = creature;
      apexKills = n;
    }
  }
  if (apexKills < apexMinKills) { apexCreatureId = null; apexKills = 0; }

  // Total distinct-capped deaths in window (across all nodes' accounts).
  const totalCounts = cappedDistinctCounts(eligible, () => 'ALL', perAccountCap);
  const totalReceiptedDeaths = totalCounts.get('ALL') ?? 0;

  return { apexCreatureId, apexKills, curseNodes, architectNodeId, architectDeaths, totalReceiptedDeaths };
}

export interface WorldShiftRow { id: string; dayKey: string; zoneId: string; [k: string]: unknown; }
export interface WorldShiftWritePlan { rowId: string; isNew: boolean; fields: Record<string, unknown>; }

/**
 * Plan idempotent upserts: one row per (dayKey, zoneId). Re-running the cron for
 * the same day reuses the existing row id (overwrite), never duplicates.
 */
export function buildWorldShiftWrites(
  dayKey: string,
  aggregatesByZone: Record<string, ZoneDayAggregate>,
  existingRows: WorldShiftRow[],
  newId: () => string,
  createdAt: number,
): WorldShiftWritePlan[] {
  const byKey = new Map<string, WorldShiftRow>();
  for (const row of existingRows) byKey.set(`${row.dayKey}::${row.zoneId}`, row);

  const plans: WorldShiftWritePlan[] = [];
  for (const [zoneId, agg] of Object.entries(aggregatesByZone)) {
    const existing = byKey.get(`${dayKey}::${zoneId}`);
    const rowId = existing ? existing.id : newId();
    plans.push({
      rowId,
      isNew: !existing,
      fields: {
        dayKey,
        zoneId,
        apexCreatureId: agg.apexCreatureId,
        apexKills: agg.apexKills,
        curseNodes: agg.curseNodes,
        architectNodeId: agg.architectNodeId,
        architectDeaths: agg.architectDeaths,
        totalReceiptedDeaths: agg.totalReceiptedDeaths,
        createdAt,
      },
    });
  }
  return plans;
}
