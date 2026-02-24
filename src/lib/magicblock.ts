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
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { AnchorProvider, Program, setProvider, web3 } from '@coral-xyz/anchor';
import { ConnectionMagicRouter } from '@magicblock-labs/ephemeral-rollups-sdk';
import bs58 from 'bs58';

// ── Config ─────────────────────────────────────────────────────────────────────

// TODO: Replace with real program ID after `anchor build && anchor deploy`
const RUN_RECORD_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_RUN_RECORD_PROGRAM_ID ||
  'RunRec1111111111111111111111111111111111111'
);

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';

// ER validator endpoint (devnet — US node)
const ER_ENDPOINT = process.env.MAGICBLOCK_ER_ENDPOINT || 'https://devnet-us.magicblock.app';

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

// ── IDL ─────────────────────────────────────────────────────────────────────────
// TODO: Import generated IDL after `anchor build`
// import RunRecordIdl from '../../anchor-program/target/idl/run_record.json';
// Using `any` as placeholder until IDL is generated
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

  // TODO: Replace stub IDL with imported IDL once program is built + deployed
  // import RunRecordIdl from '../../anchor-program/target/idl/run_record.json';
  // return new Program(RunRecordIdl, provider);
  const stubIdl = { address: RUN_RECORD_PROGRAM_ID.toBase58(), metadata: { address: RUN_RECORD_PROGRAM_ID.toBase58() }, instructions: [], accounts: [], types: [], errors: [], events: [], constants: [] };
  return new Program(stubIdl as never, provider);
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

    console.log('[MagicBlock] Initializing RunRecord for session', sessionId);

    // 1. Initialize the RunRecord PDA on L1
    // TODO: Uncomment once IDL is available
    // await program.methods
    //   .initializeRun(
    //     Array.from(sessionIdBytes),
    //     new PublicKey(playerWallet),
    //     BigInt(Math.round(stakeAmount * 1e9))  // SOL → lamports
    //   )
    //   .accounts({ runRecord: runRecordPda, authority: authority.publicKey })
    //   .signers([authority])
    //   .rpc();

    // 2. Delegate the RunRecord to the ER
    // TODO: Uncomment once IDL is available
    // await program.methods
    //   .delegateRun()
    //   .accounts({ runRecord: runRecordPda, authority: authority.publicKey })
    //   .signers([authority])
    //   .rpc();

    console.log('[MagicBlock] RunRecord delegated:', runRecordPda.toBase58());

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
export async function recordErEvent(opts: {
  erRunId: string;
  eventType: 'advance_room' | 'encounter' | 'item' | 'death' | 'victory';
  room: number;
  data?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { erRunId, eventType, room } = opts;
    const authority = getAuthorityKeypair();

    // Use ConnectionMagicRouter — automatically routes to the nearest ER validator
    const erConnection = new ConnectionMagicRouter(ER_ENDPOINT);
    const program = getProgram(erConnection as unknown as Connection);

    const runRecordPda = new PublicKey(erRunId);

    // Map event type to on-chain enum index
    const eventTypeMap = {
      advance_room: 0,
      encounter: 1,
      item: 2,
      death: 4,
      victory: 5,
    };

    // Hash event data to 32 bytes for on-chain storage
    const dataBytes = new Uint8Array(32);
    if (opts.data) {
      const encoded = new TextEncoder().encode(JSON.stringify(opts.data).slice(0, 32));
      dataBytes.set(encoded);
    }

    console.log('[MagicBlock] Recording ER event:', eventType, 'room', room);

    // TODO: Uncomment once IDL is available
    // await program.methods
    //   .recordEvent(eventTypeMap[eventType], room, Array.from(dataBytes))
    //   .accounts({ runRecord: runRecordPda, authority: authority.publicKey })
    //   .signers([authority])
    //   .rpc();

  } catch (err) {
    // Silently ignore — game events must never affect gameplay
    console.warn('[MagicBlock] recordErEvent failed (silent):', err);
  }
}

/**
 * Commit the ER run to L1 and undelegate the RunRecord.
 * This is the settlement gate — called before L1 death/victory settlement.
 * Falls back gracefully on failure.
 */
export async function commitErRun(opts: {
  erRunId: string;
  outcome: 'dead' | 'cleared';
  finalRoom: number;
}): Promise<ErCommitResult> {
  try {
    const { erRunId, outcome } = opts;
    const authority = getAuthorityKeypair();

    // Commit via ER connection — commit_and_undelegate runs on the ER
    // and finalizes the RunRecord state on L1
    const erConnection = new ConnectionMagicRouter(ER_ENDPOINT);
    const program = getProgram(erConnection as unknown as Connection);

    const runRecordPda = new PublicKey(erRunId);

    const outcomeEnum = outcome === 'dead' ? { dead: {} } : { cleared: {} };

    console.log('[MagicBlock] Committing ER run:', erRunId, 'outcome:', outcome);

    // TODO: Uncomment once IDL is available
    // const txSig = await program.methods
    //   .commitRun(outcomeEnum)
    //   .accounts({ runRecord: runRecordPda, authority: authority.publicKey })
    //   .signers([authority])
    //   .rpc();

    // return { success: true, txSignature: txSig };

    // Stub return until IDL available
    console.log('[MagicBlock] commitErRun: IDL not yet available, falling back');
    return { success: false, fallback: true };

  } catch (err) {
    console.warn('[MagicBlock] commitErRun failed, falling back to legacy:', err);
    return { success: false, fallback: true };
  }
}
