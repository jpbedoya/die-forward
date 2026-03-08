/**
 * /onchain-runs — Live view of every Die Forward run stored on-chain via MagicBlock
 *
 * Server component — fetches directly from Solana devnet on each request.
 * No auth required: all data is public on-chain.
 */

// Disable caching — always fetch fresh data
export const dynamic = 'force-dynamic';

import { Connection, PublicKey } from '@solana/web3.js';

const ASCII_LOGO = `
 ██████╗ ██╗███████╗    ███████╗ ██████╗ ██████╗ ██╗    ██╗ █████╗ ██████╗ ██████╗ 
 ██╔══██╗██║██╔════╝    ██╔════╝██╔═══██╗██╔══██╗██║    ██║██╔══██╗██╔══██╗██╔══██╗
 ██║  ██║██║█████╗      █████╗  ██║   ██║██████╔╝██║ █╗ ██║███████║██████╔╝██║  ██║
 ██║  ██║██║██╔══╝      ██╔══╝  ██║   ██║██╔══██╗██║███╗██║██╔══██║██╔══██╗██║  ██║
 ██████╔╝██║███████╗    ██║     ╚██████╔╝██║  ██║╚███╔███╔╝██║  ██║██║  ██║██████╔╝
 ╚═════╝ ╚═╝╚══════╝    ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ `;
import { init } from '@instantdb/admin';

// InstantDB for enriching on-chain data with session details
const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_KEY!,
});

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';

// Support fetching historic runs across multiple run_record program deployments.
// - NEXT_PUBLIC_RUN_RECORD_PROGRAM_IDS: comma-separated list (preferred)
// - NEXT_PUBLIC_RUN_RECORD_PROGRAM_ID: current program (legacy single-value env)
// Defaults include the current deployment + previous deployment for backfill visibility.
const RUN_RECORD_PROGRAM_IDS = Array.from(new Set(
  (
    process.env.NEXT_PUBLIC_RUN_RECORD_PROGRAM_IDS
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? []
  ).concat([
    process.env.NEXT_PUBLIC_RUN_RECORD_PROGRAM_ID || '9rGjguBZAnittA4Cbm7YNP5qomatY3c4MTV7LSqNomzS',
    '3KLgtdRvfJuLK1t9mKCe2soJbx4LgZfP6LQWVW9TQ7yN', // previous run_record deployment
  ])
)).map((id) => new PublicKey(id));
// Delegation program — accounts delegated to the ER are owned by this program
const DELEGATION_PROGRAM_ID = new PublicKey('DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh');
// RunRecord discriminator (first 8 bytes) — used to filter delegated accounts
const RUN_RECORD_DISCRIMINATOR = Buffer.from([150, 11, 254, 208, 250, 147, 105, 152]);

// Status enum mapping (matches Rust: Active=0, Dead=1, Cleared=2)
const STATUS_LABEL: Record<number, { label: string; color: string }> = {
  0: { label: 'ACTIVE',   color: 'text-amber' },
  1: { label: 'DEAD',     color: 'text-red-400' },
  2: { label: 'CLEARED',  color: 'text-green-400' },
};

/**
 * Manual decode for RunRecord accounts.
 * Supports both legacy (125-byte, no VRF) and current (158-byte, with VRF) layouts.
 * 
 * Legacy:  8 disc + 32 player + 32 authority + 32 session_id + 8 started_at + 1 room + 1 status + 2 events + 8 stake + 1 bump = 125
 * Current: + 32 vrf_seed + 1 vrf_ready = 158
 */
function decodeRunRecord(data: Buffer): {
  player: PublicKey;
  authority: PublicKey;
  sessionId: string;
  startedAt: number;
  currentRoom: number;
  status: number;
  eventCount: number;
  stakeAmount: number;
  vrfSeed: string | null;
  vrfReady: boolean;
  bump: number;
} {
  let offset = 8; // skip discriminator
  const player = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const authority = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const sessionId = Buffer.from(data.slice(offset, offset + 32)).toString('utf8').replace(/\0/g, ''); offset += 32;
  const startedAt = Number(data.readBigInt64LE(offset)); offset += 8;
  const currentRoom = data[offset++];
  const status = data[offset++];
  const eventCount = data.readUInt16LE(offset); offset += 2;
  const stakeAmount = Number(data.readBigUInt64LE(offset)); offset += 8;

  // VRF fields only present in 158-byte accounts
  let vrfSeed: string | null = null;
  let vrfReady = false;
  if (data.length >= 158) {
    vrfSeed = Buffer.from(data.slice(offset, offset + 32)).toString('hex'); offset += 32;
    vrfReady = data[offset++] === 1;
  }

  const bump = data[offset++];

  return { player, authority, sessionId, startedAt, currentRoom, status, eventCount, stakeAmount, vrfSeed, vrfReady, bump };
}

function truncate(str: string, head = 4, tail = 4) {
  if (str.length <= head + tail + 3) return str;
  return `${str.slice(0, head)}…${str.slice(-tail)}`;
}

function formatSol(lamports: number) {
  return `${(lamports / 1e9).toFixed(3)} SOL`;
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

async function fetchRuns() {
  try {
    const connection = new Connection(RPC_URL, 'confirmed');

    // Helper to fetch RunRecord accounts of a specific size from a program
    async function fetchRunRecords(programId: PublicKey, dataSize: number) {
      try {
        const rawAccounts = await connection.getProgramAccounts(programId, {
          filters: [
            { dataSize },
            { memcmp: { offset: 0, bytes: RUN_RECORD_DISCRIMINATOR.toString('base64'), encoding: 'base64' } },
          ],
        });
        return rawAccounts.map((raw) => {
          try {
            const decoded = decodeRunRecord(Buffer.from(raw.account.data));
            return { publicKey: raw.pubkey, account: decoded };
          } catch {
            return null;
          }
        }).filter(Boolean) as { publicKey: PublicKey; account: ReturnType<typeof decodeRunRecord> }[];
      } catch {
        return [];
      }
    }

    // 1. Fetch settled accounts across current + legacy run_record programs
    //    Fetch both 125-byte (legacy) and 158-byte (with VRF) accounts
    const settledAccountsNested = await Promise.all(
      RUN_RECORD_PROGRAM_IDS.flatMap((programId) => [
        fetchRunRecords(programId, 125), // Legacy (no VRF)
        fetchRunRecords(programId, 158), // Current (with VRF)
      ])
    );
    const settledAccounts = settledAccountsNested.flat();

    // 2. Fetch delegated accounts (owned by delegation program, with RunRecord discriminator)
    //    These are active or recently committed accounts that haven't settled to L1 yet.
    const [delegatedLegacy, delegatedVrf] = await Promise.all([
      fetchRunRecords(DELEGATION_PROGRAM_ID, 125),
      fetchRunRecords(DELEGATION_PROGRAM_ID, 158),
    ]);
    const delegatedAccounts = [...delegatedLegacy, ...delegatedVrf];

    // Merge, deduplicating by PDA (settled takes priority)
    const settledPdas = new Set(settledAccounts.map((a) => a.publicKey.toBase58()));
    const allAccounts = [
      ...settledAccounts,
      ...delegatedAccounts.filter(a => !settledPdas.has(a.publicKey.toBase58())),
    ];

    // Map to display format
    const runs = allAccounts.map((a) => ({
      pda:          a.publicKey.toBase58(),
      player:       a.account.player.toBase58(),
      authority:    a.account.authority.toBase58(),
      sessionId:    a.account.sessionId,
      startedAt:    a.account.startedAt,
      currentRoom:  a.account.currentRoom,
      status:       a.account.status,
      eventCount:   a.account.eventCount,
      stakeAmount:  a.account.stakeAmount,
      vrfReady:     a.account.vrfReady,
      bump:         a.account.bump,
      delegated:    !settledPdas.has(a.publicKey.toBase58()),
      // Will be enriched below
      dbRoom:       undefined as number | undefined,
      dbStatus:     undefined as string | undefined,
      nickname:     undefined as string | undefined,
      erCommitTx:   undefined as string | undefined,
    }));

    // Enrich with InstantDB session data (room, status, nickname)
    // ER write issue means on-chain data is stale — InstantDB has the real values
    try {
      const sessionIds = runs.map(r => r.sessionId).filter(Boolean);
      if (sessionIds.length > 0) {
        const dbResult = await db.query({ sessions: {} });
        const sessions = (dbResult?.sessions || []) as Record<string, unknown>[];
        const sessionById = new Map<string, Record<string, unknown>>();
        const sessionByErRunId = new Map<string, Record<string, unknown>>();
        for (const s of sessions) {
          if (s.id && typeof s.id === 'string') sessionById.set(s.id, s);
          if (s.erRunId && typeof s.erRunId === 'string') sessionByErRunId.set(s.erRunId, s);
        }
        for (const run of runs) {
          // Prefer exact match by ER run PDA (most reliable).
          // Fallback to sessionId from RunRecord for backwards compatibility.
          const session = sessionByErRunId.get(run.pda) ?? sessionById.get(run.sessionId);
          if (session) {
            run.dbRoom = session.currentRoom as number | undefined;
            run.dbStatus = session.status as string | undefined;
            run.erCommitTx = session.erCommitTx as string | undefined;
          }
        }
      }
    } catch {
      // Non-fatal — on-chain data still shows
    }

    return runs;
  } catch (err) {
    console.error('[onchain-runs] Failed to fetch:', err);
    return [];
  }
}

export default async function OnchainRunsPage() {
  const runs = await fetchRuns();

  return (
    <div className="min-h-screen bg-crypt-bg text-bone font-mono p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <pre className="text-amber text-[4px] sm:text-[5px] md:text-[6px] leading-none mb-4 text-center overflow-x-auto">
{ASCII_LOGO}
          </pre>
          <h1 className="text-amber text-2xl tracking-widest mb-1 text-center">◈ ON-CHAIN RUNS</h1>
          <p className="text-bone-muted text-xs text-center">
            Every run recorded via MagicBlock Ephemeral Rollups →{' '}
            <a
              href={`https://explorer.solana.com/address/${RUN_RECORD_PROGRAM_IDS[0].toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber underline hover:text-amber/80"
            >
              {truncate(RUN_RECORD_PROGRAM_IDS[0].toBase58())}
            </a>
            {RUN_RECORD_PROGRAM_IDS.length > 1 ? ` +${RUN_RECORD_PROGRAM_IDS.length - 1} legacy` : ''}
            {' '}· devnet
          </p>
        </div>

        {runs.length === 0 ? (
          <div className="border border-amber/20 rounded p-8 text-center text-bone-muted text-sm">
            No runs recorded on-chain yet.
            <br />
            <span className="text-xs mt-2 block">
              Enable <span className="text-amber">enableMagicBlock</span> in the admin panel and complete a staked run.
            </span>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Total Runs',  value: runs.length },
                { label: 'Active',      value: runs.filter((r: { dbStatus?: string; status: number }) => r.dbStatus ? r.dbStatus === 'active' : r.status === 0).length },
                { label: 'Completed',   value: runs.filter((r: { dbStatus?: string; status: number }) => r.dbStatus ? r.dbStatus !== 'active' : r.status > 0).length },
              ].map(({ label, value }) => (
                <div key={label} className="border border-amber/20 rounded p-4 text-center">
                  <div className="text-amber text-2xl">{value}</div>
                  <div className="text-bone-muted text-xs mt-1 tracking-widest">{label.toUpperCase()}</div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="border border-amber/20 rounded overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-amber/20 text-amber tracking-widest">
                    <th className="text-left p-3">STATUS</th>
                    <th className="text-left p-3">PLAYER</th>
                    <th className="text-left p-3">SESSION</th>
                    <th className="text-right p-3">STAKE</th>
                    <th className="text-right p-3">ROOM</th>
                    <th className="text-right p-3">EVENTS</th>
                    <th className="text-left p-3">STARTED</th>
                    <th className="text-left p-3">PDA</th>
                  </tr>
                </thead>
                <tbody>
                  {runs
                    .sort((a: { startedAt: number }, b: { startedAt: number }) => b.startedAt - a.startedAt)
                    .map((run: {
                      pda: string; player: string; sessionId: string;
                      status: number; stakeAmount: number; currentRoom: number;
                      eventCount: number; startedAt: number; delegated: boolean;
                      dbRoom?: number; dbStatus?: string; nickname?: string; erCommitTx?: string;
                    }) => {
                      // Prefer InstantDB status/room (accurate) over on-chain (stale due to ER write issue)
                      const displayRoom = run.dbRoom ?? run.currentRoom;
                      const dbStatusKey =
                        run.dbStatus === 'dead' ? 1 :
                        (run.dbStatus === 'cleared' || run.dbStatus === 'completed') ? 2 :
                        undefined;
                      const statusKey = dbStatusKey ?? run.status;
                      const { label, color } = STATUS_LABEL[statusKey] ?? STATUS_LABEL[0];
                      return (
                        <tr key={run.pda} className="border-b border-amber/10 hover:bg-amber/5 transition-colors">
                          <td className={`p-3 font-bold ${color}`}>
                            {label}
                            {(run.delegated || run.erCommitTx) && (
                              <span
                                className="text-amber/50 text-[10px] ml-1"
                                title={run.delegated ? 'Active on Ephemeral Rollup (pending L1 settlement)' : 'Ran on Ephemeral Rollup (committed to L1)'}
                              >⚡ER</span>
                            )}
                          </td>
                          <td className="p-3">
                            <a
                              href={`https://explorer.solana.com/address/${run.player}?cluster=devnet`}
                              target="_blank" rel="noopener noreferrer"
                              className="hover:text-amber transition-colors"
                            >
                              {truncate(run.player)}
                            </a>
                          </td>
                          <td className="p-3 text-bone-muted">{truncate(run.sessionId, 8, 4)}</td>
                          <td className="p-3 text-right">{formatSol(run.stakeAmount)}</td>
                          <td className="p-3 text-right">{displayRoom}</td>
                          <td className="p-3 text-right">{run.eventCount}</td>
                          <td className="p-3 text-bone-muted">{formatDate(run.startedAt)}</td>
                          <td className="p-3">
                            <a
                              href={`https://explorer.solana.com/address/${run.pda}?cluster=devnet`}
                              target="_blank" rel="noopener noreferrer"
                              className="hover:text-amber transition-colors"
                            >
                              {truncate(run.pda)}
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <p className="text-bone-muted text-xs mt-4 text-center">
              {runs.length} run{runs.length !== 1 ? 's' : ''} · refreshes on each page load
            </p>
          </>
        )}
      </div>
    </div>
  );
}
