/**
 * MagicBlock Ephemeral Rollups integration for Die Forward
 *
 * Phase 2: Real ER delegation, event recording, and settlement commit.
 *
 * Architecture:
 *  - Server authority keypair initializes + delegates RunRecord on session start
 *  - Game events are recorded as zero-fee ER transactions (fire-and-forget)
 *  - Death/victory commits the ER run back to L1 before L1 settlement
 *
 * Toggle: admin setting `enableMagicBlock` (InstantDB gameSettings)
 * Design doc: integrations/magicblock/README.md
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { AnchorProvider, BN, Program, setProvider } from '@coral-xyz/anchor';
import {
  ConnectionMagicRouter,
  createCommitAndUndelegateInstruction,
} from '@magicblock-labs/ephemeral-rollups-sdk';
import bs58 from 'bs58';
import RunRecordIdl from '../idl/run_record.json';

// ── Config ─────────────────────────────────────────────────────────────────────

const RUN_RECORD_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_RUN_RECORD_PROGRAM_ID ||
  '9rGjguBZAnittA4Cbm7YNP5qomatY3c4MTV7LSqNomzS'
);

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';

// ER endpoint (devnet US by default). Override via MAGICBLOCK_ER_ENDPOINT.
const ER_ENDPOINT = process.env.MAGICBLOCK_ER_ENDPOINT || 'https://devnet-us.magicblock.app';

// ER validator pubkey — MUST match the endpoint region
// See: https://docs.magicblock.gg/pages/private-ephemeral-rollups-pers/how-to-guide/quickstart
// US devnet: MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd
const ER_VALIDATOR = new PublicKey(
  process.env.MAGICBLOCK_ER_VALIDATOR || 'MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd'
);

// PDA seed — must match Rust program: b"run"
const RUN_SEED = Buffer.from('run');

// ── Keypair ────────────────────────────────────────────────────────────────────

function getAuthorityKeypair(): Keypair {
  const secretKey = process.env.SOLANA_AUTHORITY_SECRET_KEY;
  if (!secretKey) throw new Error('SOLANA_AUTHORITY_SECRET_KEY not set');
  return Keypair.fromSecretKey(bs58.decode(secretKey));
}

// ── PDA ─────────────────────────────────────────────────────────────────────────

/**
 * Derive the RunRecord PDA for a session.
 * Seeds match the Rust program: ["run", session_id_bytes]
 */
function deriveRunRecordPda(sessionIdBytes: Uint8Array): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [RUN_SEED, sessionIdBytes],
    RUN_RECORD_PROGRAM_ID
  );
  return pda;
}

/**
 * Convert a string session ID to 32 bytes for on-chain use.
 */
function sessionIdToBytes(sessionId: string): Uint8Array {
  const bytes = new Uint8Array(32);
  const encoded = new TextEncoder().encode(sessionId.slice(0, 32));
  bytes.set(encoded);
  return bytes;
}

// ── Program ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RunRecordProgram = Program<any>;

function getProgram(connection: Connection): RunRecordProgram {
  const authority = getAuthorityKeypair();
  const wallet = {
    publicKey: authority.publicKey,
    signTransaction: async <T extends Transaction>(tx: T) => {
      tx.partialSign(authority);
      return tx;
    },
    signAllTransactions: async <T extends Transaction>(txs: T[]) => {
      txs.forEach(tx => tx.partialSign(authority));
      return txs;
    },
  };

  const provider = new AnchorProvider(connection, wallet as never, {
    commitment: 'confirmed',
  });
  setProvider(provider);

  return new Program(RunRecordIdl as never, provider);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ErRunRecord {
  erRunId: string;
  playerWallet: string;
  stakeAmount: number;
  startedAt: number;
  status: 'active' | 'dead' | 'cleared';
}

export interface ErCommitResult {
  success: boolean;
  txSignature?: string;
  fallback?: boolean;
}

export interface ErVrfResult {
  ready: boolean;
  seedHex?: string;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Initialize a RunRecord on L1 and delegate it to the Ephemeral Rollup.
 * Called from POST /api/session/start when enableMagicBlock = true.
 *
 * @returns erRunId — the RunRecord PDA pubkey (store on session record)
 */
export async function startErRun(opts: {
  playerWallet: string;
  stakeAmount: number;
  sessionId: string;
}): Promise<string | null> {
  try {
    const { playerWallet, stakeAmount, sessionId } = opts;
    const authority = getAuthorityKeypair();
    const l1Connection = new Connection(RPC_URL, 'confirmed');
    const program = getProgram(l1Connection);

    const sessionIdBytes = sessionIdToBytes(sessionId);
    const runRecordPda = deriveRunRecordPda(sessionIdBytes);

    console.log('[MagicBlock] === Starting ER Run ===');
    console.log('[MagicBlock] Session:', sessionId);
    console.log('[MagicBlock] PDA:', runRecordPda.toBase58());
    console.log('[MagicBlock] ER Endpoint:', ER_ENDPOINT);
    console.log('[MagicBlock] ER Validator:', ER_VALIDATOR.toBase58());
    console.log('[MagicBlock] Initializing RunRecord...');

    // 1. Initialize the RunRecord PDA on L1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program as any).methods
      .initializeRun(
        Array.from(sessionIdBytes),
        new PublicKey(playerWallet),
        new BN(Math.round(stakeAmount * 1e9))  // SOL → lamports
      )
      .accounts({ runRecord: runRecordPda, authority: authority.publicKey })
      .signers([authority])
      .rpc();

    console.log('[MagicBlock] RunRecord initialized:', runRecordPda.toBase58());

    // 2. Delegate the RunRecord to the ER
    // Must pass the validator pubkey via remainingAccounts — Rust program reads it from there
    // Anchor auto-resolves delegation PDAs + programs from IDL
    console.log('[MagicBlock] Delegating to validator:', ER_VALIDATOR.toBase58());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program as any).methods
      .delegateRun()
      .accounts({ runRecord: runRecordPda, authority: authority.publicKey })
      .remainingAccounts([
        { pubkey: ER_VALIDATOR, isSigner: false, isWritable: false }
      ])
      .signers([authority])
      .rpc();

    console.log('[MagicBlock] RunRecord delegated to ER:', runRecordPda.toBase58(), 'validator:', ER_VALIDATOR.toBase58());

    // Return PDA pubkey as erRunId — store on session record
    return runRecordPda.toBase58();
  } catch (err) {
    console.warn('[MagicBlock] startErRun failed (non-fatal):', err);
    return null;
  }
}

/**
 * Record a game event in the Ephemeral Rollup (fire-and-forget, zero-fee).
 * The ER connection routes this transaction to the ER validator instead of L1.
 */
export async function requestErVrfSeed(opts: {
  erRunId: string;
  clientSeed?: string;
}): Promise<boolean> {
  try {
    const authority = getAuthorityKeypair();
    const l1Connection = new Connection(RPC_URL, 'confirmed');
    const program = getProgram(l1Connection);
    const runRecordPda = new PublicKey(opts.erRunId);

    const seedBytes = new Uint8Array(32);
    const fallback = new TextEncoder().encode((opts.clientSeed || Date.now().toString()).slice(0, 32));
    seedBytes.set(fallback);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program as any).methods
      .requestVrfSeed(Array.from(seedBytes))
      .accounts({ runRecord: runRecordPda, authority: authority.publicKey })
      .signers([authority])
      .rpc();

    console.log('[MagicBlock] VRF requested for run:', opts.erRunId);
    return true;
  } catch (err) {
    console.warn('[MagicBlock] requestErVrfSeed failed:', err);
    return false;
  }
}

export async function getErVrfSeed(erRunId: string): Promise<ErVrfResult> {
  try {
    const l1Connection = new Connection(RPC_URL, 'confirmed');
    const program = getProgram(l1Connection);
    const runRecordPda = new PublicKey(erRunId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const run = await (program as any).account.runRecord.fetch(runRecordPda);
    const ready = !!run?.vrfReady;
    if (!ready || !run?.vrfSeed) return { ready: false };

    const seedHex = Buffer.from(run.vrfSeed as number[]).toString('hex');
    return { ready: true, seedHex };
  } catch (err) {
    console.warn('[MagicBlock] getErVrfSeed failed:', err);
    return { ready: false };
  }
}

export async function recordErEvent(opts: {
  erRunId: string;
  eventType: 'advance_room' | 'encounter' | 'item' | 'death' | 'victory';
  room: number;
  data?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { erRunId, eventType, room } = opts;
    const authority = getAuthorityKeypair();
    const erConnection = new ConnectionMagicRouter(ER_ENDPOINT);
    const runRecordPda = new PublicKey(erRunId);

    // Use router-backed Anchor provider for delegated writes
    const program = getProgram(erConnection as unknown as Connection);

    // Anchor expects enum variants as objects, not raw indices
    const eventTypeMap: Record<string, Record<string, Record<string, never>>> = {
      advance_room: { advanceRoom: {} },
      encounter:    { encounter: {} },
      item:         { itemPickup: {} },
      death:        { death: {} },
      victory:      { victory: {} },
    };

    const dataBytes = new Uint8Array(32);
    if (opts.data) {
      const encoded = new TextEncoder().encode(JSON.stringify(opts.data).slice(0, 32));
      dataBytes.set(encoded);
    }

    console.log('[MagicBlock] Recording ER event:', eventType, 'room', room, 'via router');

    // Router path first (preferred)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program as any).methods
      .recordEvent(eventTypeMap[eventType], room, Array.from(dataBytes))
      .accounts({ runRecord: runRecordPda, authority: authority.publicKey })
      .signers([authority])
      .rpc({ skipPreflight: true });

  } catch (err) {
    // Silently ignore — game events must never affect gameplay
    console.warn('[MagicBlock] recordErEvent failed (silent):', err);
  }
}

/**
 * Commit the ER run to L1 and undelegate the RunRecord.
 * Preferred path is atomic finalize+commit in one instruction.
 */
export async function commitErRun(opts: {
  erRunId: string;
  outcome: 'dead' | 'cleared';
  finalRoom: number;
}): Promise<ErCommitResult> {
  const { erRunId, outcome, finalRoom } = opts;
  const authority = getAuthorityKeypair();
  const erConnection = new ConnectionMagicRouter(ER_ENDPOINT);
  const runRecordPda = new PublicKey(erRunId);
  const outcomeEnum = outcome === 'dead' ? { dead: {} } : { cleared: {} };

  console.log('[MagicBlock] Committing ER run:', erRunId, 'outcome:', outcome, 'finalRoom:', finalRoom);
  console.log('[MagicBlock] Commit endpoint:', ER_ENDPOINT);

  // ── Attempt 1 (preferred): atomic finalize+commit in one instruction ───────
  // Requires updated on-chain program with finalize_and_commit instruction.
  try {
    const program = getProgram(erConnection as unknown as Connection);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txSig = await (program as any).methods
      .finalizeAndCommit(outcomeEnum, finalRoom)
      .accounts({ runRecord: runRecordPda, authority: authority.publicKey })
      .signers([authority])
      .rpc({ skipPreflight: true });

    console.log('[MagicBlock] ER run committed (finalizeAndCommit):', txSig);
    return { success: true, txSignature: txSig };
  } catch (atomicErr) {
    console.warn('[MagicBlock] finalizeAndCommit unavailable/failed, falling back:', atomicErr);
  }

  // ── Attempt 2 (legacy fallback): finalize_run then commit_run ───────────────
  // Kept for backward compatibility until program upgrade is deployed.
  try {
    const program = getProgram(erConnection as unknown as Connection);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program as any).methods
      .finalizeRun(outcomeEnum, finalRoom)
      .accounts({ runRecord: runRecordPda, authority: authority.publicKey })
      .signers([authority])
      .rpc({ skipPreflight: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txSig = await (program as any).methods
      .commitRun(outcomeEnum)
      .accounts({ runRecord: runRecordPda, authority: authority.publicKey })
      .signers([authority])
      .rpc({ skipPreflight: true });

    console.log('[MagicBlock] ER run committed (legacy finalize+commit):', txSig);
    return { success: true, txSignature: txSig, fallback: true };
  } catch (legacyErr) {
    console.warn('[MagicBlock] Legacy finalize+commit failed:', legacyErr);
  }

  // ── Attempt 3 (last resort): schedule commit+undelegate via SDK ────────────
  try {
    const commitIx = createCommitAndUndelegateInstruction(authority.publicKey, [runRecordPda]);

    const blockhashRes = await fetch(ER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBlockhashForAccounts',
        params: [[runRecordPda.toBase58(), authority.publicKey.toBase58()]],
      }),
    });
    const blockhashData = await blockhashRes.json() as {
      result?: { value?: { blockhash?: string } }
    };
    const erBlockhash = blockhashData?.result?.value?.blockhash;
    if (!erBlockhash) throw new Error('No ER blockhash for SDK commit');

    const tx = new Transaction({ recentBlockhash: erBlockhash, feePayer: authority.publicKey }).add(commitIx);
    tx.sign(authority);
    const txSig = await erConnection.sendRawTransaction(tx.serialize(), { skipPreflight: true });

    console.log('[MagicBlock] ER run committed (SDK direct fallback):', txSig);
    return { success: true, txSignature: txSig, fallback: true };
  } catch (sdkErr) {
    console.warn('[MagicBlock] SDK commit fallback failed:', sdkErr);
    return { success: false, fallback: true };
  }
}
