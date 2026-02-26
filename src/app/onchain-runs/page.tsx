/**
 * /onchain-runs — Live view of every Die Forward run stored on-chain via MagicBlock
 *
 * Server component — fetches directly from Solana devnet on each request.
 * No auth required: all data is public on-chain.
 */

import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { AnchorProvider, Program, BorshAccountsCoder } from '@coral-xyz/anchor';
import { init } from '@instantdb/admin';
import RunRecordIdl from '@/idl/run_record.json';

// InstantDB for enriching on-chain data with session details
const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_KEY!,
});

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';
const RUN_RECORD_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_RUN_RECORD_PROGRAM_ID || '9rGjguBZAnittA4Cbm7YNP5qomatY3c4MTV7LSqNomzS'
);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getStatusKey(status: any): number {
  if (typeof status === 'number') return status;
  if (status?.active !== undefined) return 0;
  if (status?.dead !== undefined)   return 1;
  if (status?.cleared !== undefined) return 2;
  return 0;
}

async function fetchRuns() {
  try {
    const connection = new Connection(RPC_URL, 'confirmed');

    // Read-only provider — no signing needed for fetching accounts
    const dummyKeypair = Keypair.generate();
    const wallet = {
      publicKey: dummyKeypair.publicKey,
      signTransaction: async <T extends Transaction>(tx: T) => tx,
      signAllTransactions: async <T extends Transaction>(txs: T[]) => txs,
    };
    const provider = new AnchorProvider(connection, wallet as never, { commitment: 'confirmed' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const program = new Program(RunRecordIdl as never, provider) as any;

    // 1. Fetch settled accounts (owned by our program)
    const settledAccounts = await program.account.runRecord.all();

    // 2. Fetch delegated accounts (owned by delegation program, with RunRecord discriminator)
    //    These are active or recently committed accounts that haven't settled to L1 yet.
    const delegatedRaw = await connection.getProgramAccounts(DELEGATION_PROGRAM_ID, {
      filters: [
        { dataSize: 125 }, // RunRecord size: 8 (disc) + 32 + 32 + 32 + 8 + 1 + 1 + 2 + 8 + 1
        { memcmp: { offset: 0, bytes: RUN_RECORD_DISCRIMINATOR.toString('base64'), encoding: 'base64' } },
      ],
    });

    // Decode delegated accounts using Anchor's coder
    const coder = new BorshAccountsCoder(RunRecordIdl as never);
    const delegatedAccounts = delegatedRaw.map((raw) => {
      try {
        const decoded = coder.decode('RunRecord', raw.account.data);
        return { publicKey: raw.pubkey, account: decoded };
      } catch {
        return null;
      }
    }).filter(Boolean) as { publicKey: PublicKey; account: Record<string, unknown> }[];

    // Merge, deduplicating by PDA (settled takes priority)
    const settledPdas = new Set(settledAccounts.map((a: { publicKey: PublicKey }) => a.publicKey.toBase58()));
    const allAccounts = [
      ...settledAccounts,
      ...delegatedAccounts.filter(a => !settledPdas.has(a.publicKey.toBase58())),
    ];

    // Field accessor — BorshAccountsCoder.decode() returns snake_case,
    // program.account.runRecord.all() returns camelCase. Handle both.
    const f = (acct: Record<string, unknown>, ...keys: string[]) => {
      for (const k of keys) if (acct[k] !== undefined) return acct[k];
      return undefined;
    };

    // Extract session IDs to fetch InstantDB data
    const runs = allAccounts.map((a: { publicKey: PublicKey; account: Record<string, unknown> }) => {
      const sessionId = Buffer.from(f(a.account, 'sessionId', 'session_id') as Uint8Array).toString('utf8').replace(/\0/g, '');
      return {
        pda:          a.publicKey.toBase58(),
        player:       (f(a.account, 'player') as PublicKey).toBase58(),
        authority:    (f(a.account, 'authority') as PublicKey).toBase58(),
        sessionId,
        startedAt:    Number(f(a.account, 'startedAt', 'started_at')),
        currentRoom:  Number(f(a.account, 'currentRoom', 'current_room')),
        status:       getStatusKey(f(a.account, 'status')),
        eventCount:   Number(f(a.account, 'eventCount', 'event_count')),
        stakeAmount:  Number(f(a.account, 'stakeAmount', 'stake_amount')),
        bump:         Number(f(a.account, 'bump')),
        delegated:    !settledPdas.has(a.publicKey.toBase58()),
        // Will be enriched below
        dbRoom:       undefined as number | undefined,
        dbStatus:     undefined as string | undefined,
        nickname:     undefined as string | undefined,
        erCommitTx:   undefined as string | undefined,
      };
    });

    // Enrich with InstantDB session data (room, status, nickname)
    // ER write issue means on-chain data is stale — InstantDB has the real values
    try {
      const sessionIds = runs.map(r => r.sessionId).filter(Boolean);
      if (sessionIds.length > 0) {
        const dbResult = await db.query({ sessions: {} });
        const sessions = (dbResult?.sessions || []) as Record<string, unknown>[];
        const sessionMap = new Map<string, Record<string, unknown>>();
        for (const s of sessions) {
          if (s.id && typeof s.id === 'string') sessionMap.set(s.id, s);
        }
        for (const run of runs) {
          const session = sessionMap.get(run.sessionId);
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
          <h1 className="text-amber text-2xl tracking-widest mb-1">◈ ON-CHAIN RUNS</h1>
          <p className="text-bone-muted text-xs">
            Every run recorded via MagicBlock Ephemeral Rollups →{' '}
            <a
              href={`https://explorer.solana.com/address/${RUN_RECORD_PROGRAM_ID.toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber underline hover:text-amber/80"
            >
              {truncate(RUN_RECORD_PROGRAM_ID.toBase58())}
            </a>
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
                      const dbStatusKey = run.dbStatus === 'dead' ? 1 : run.dbStatus === 'cleared' ? 2 : undefined;
                      const statusKey = dbStatusKey ?? run.status;
                      const { label, color } = STATUS_LABEL[statusKey] ?? STATUS_LABEL[0];
                      return (
                        <tr key={run.pda} className="border-b border-amber/10 hover:bg-amber/5 transition-colors">
                          <td className={`p-3 font-bold ${color}`}>
                            {label}
                            {run.delegated && <span className="text-amber/50 text-[10px] ml-1" title="Pending L1 settlement">⚡ER</span>}
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
                          <td className="p-3 text-right">Room {displayRoom}</td>
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
