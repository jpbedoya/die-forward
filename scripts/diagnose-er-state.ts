import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { AnchorProvider, BN, Program, BorshAccountsCoder, setProvider } from '@coral-xyz/anchor';
import { ConnectionMagicRouter, createCommitAndUndelegateInstruction } from '@magicblock-labs/ephemeral-rollups-sdk';
import bs58 from 'bs58';
import RunRecordIdl from '../src/idl/run_record.json';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';
const ER_ENDPOINT = process.env.MAGICBLOCK_ER_ENDPOINT || 'https://devnet-us.magicblock.app';
const RUN_RECORD_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_RUN_RECORD_PROGRAM_ID || '9rGjguBZAnittA4Cbm7YNP5qomatY3c4MTV7LSqNomzS'
);
const ER_VALIDATOR = new PublicKey(
  process.env.MAGICBLOCK_ER_VALIDATOR || 'MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd'
);
const RUN_SEED = Buffer.from('run');

function getAuthority(): Keypair {
  const sk = process.env.SOLANA_AUTHORITY_SECRET_KEY;
  if (!sk) throw new Error('SOLANA_AUTHORITY_SECRET_KEY not set');
  return Keypair.fromSecretKey(bs58.decode(sk));
}

function sessionIdToBytes(sessionId: string): Uint8Array {
  const bytes = new Uint8Array(32);
  const enc = new TextEncoder().encode(sessionId.slice(0, 32));
  bytes.set(enc);
  return bytes;
}

function derivePda(sessionBytes: Uint8Array): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([RUN_SEED, sessionBytes], RUN_RECORD_PROGRAM_ID);
  return pda;
}

function getProgram(connection: Connection): Program<any> {
  const authority = getAuthority();
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
  const provider = new AnchorProvider(connection, wallet as never, { commitment: 'confirmed' });
  setProvider(provider);
  return new Program(RunRecordIdl as never, provider);
}

async function erRpc(method: string, params: any[]) {
  const res = await fetch(ER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return res.json() as Promise<any>;
}

async function readRunRecordFromEr(pda: PublicKey) {
  const coder = new BorshAccountsCoder(RunRecordIdl as never);
  const data = await erRpc('getAccountInfo', [pda.toBase58(), { encoding: 'base64' }]);
  const b64 = data?.result?.value?.data?.[0];
  if (!b64) return null;
  const buf = Buffer.from(b64, 'base64');
  try {
    return coder.decode('RunRecord', buf);
  } catch {
    return null;
  }
}

function summarize(acct: any) {
  if (!acct) return 'null';
  const status = acct.status?.active !== undefined ? 'active' : acct.status?.dead !== undefined ? 'dead' : acct.status?.cleared !== undefined ? 'cleared' : JSON.stringify(acct.status);
  return `room=${acct.currentRoom ?? acct.current_room}, events=${acct.eventCount ?? acct.event_count}, status=${status}`;
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const authority = getAuthority();
  const l1 = new Connection(RPC_URL, 'confirmed');
  const er = new ConnectionMagicRouter(ER_ENDPOINT);
  const program = getProgram(l1);

  const sessionId = `diag-${Date.now()}`;
  const sidBytes = sessionIdToBytes(sessionId);
  const pda = derivePda(sidBytes);
  const player = Keypair.generate().publicKey;

  console.log('=== ER Diagnose ===');
  console.log('session:', sessionId);
  console.log('pda:', pda.toBase58());
  console.log('endpoint:', ER_ENDPOINT);
  console.log('validator:', ER_VALIDATOR.toBase58());

  // init
  await (program as any).methods
    .initializeRun(Array.from(sidBytes), player, new BN(10_000_000))
    .accounts({ runRecord: pda, authority: authority.publicKey })
    .signers([authority])
    .rpc();
  console.log('init: ok');

  // delegate with validator
  await (program as any).methods
    .delegateRun()
    .accounts({ runRecord: pda, authority: authority.publicKey })
    .remainingAccounts([{ pubkey: ER_VALIDATOR, isSigner: false, isWritable: false }])
    .signers([authority])
    .rpc();
  console.log('delegate: ok');

  // write events on ER
  for (let room = 1; room <= 3; room++) {
    const ix = await (program as any).methods
      .recordEvent({ advanceRoom: {} }, room, Array.from(new Uint8Array(32)))
      .accounts({ runRecord: pda, authority: authority.publicKey })
      .instruction();

    const bh = await erRpc('getBlockhashForAccounts', [[pda.toBase58()]]);
    const blockhash = bh?.result?.value?.blockhash;
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: authority.publicKey }).add(ix);
    tx.sign(authority);
    await er.sendRawTransaction(tx.serialize(), { skipPreflight: true });
  }
  console.log('record events: ok');

  // finalize on ER
  {
    const ix = await (program as any).methods
      .finalizeRun({ dead: {} }, 3)
      .accounts({ runRecord: pda, authority: authority.publicKey })
      .instruction();
    const bh = await erRpc('getBlockhashForAccounts', [[pda.toBase58()]]);
    const blockhash = bh?.result?.value?.blockhash;
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: authority.publicKey }).add(ix);
    tx.sign(authority);
    await er.sendRawTransaction(tx.serialize(), { skipPreflight: true });
  }
  console.log('finalize: ok');

  await sleep(1500);

  const erStateBefore = await readRunRecordFromEr(pda);
  console.log('ER state before commit:', summarize(erStateBefore));

  // commit sdk direct
  const commitIx = createCommitAndUndelegateInstruction(authority.publicKey, [pda]);
  const bh2 = await erRpc('getBlockhashForAccounts', [[pda.toBase58(), authority.publicKey.toBase58()]]);
  const blockhash2 = bh2?.result?.value?.blockhash;
  const tx2 = new Transaction({ recentBlockhash: blockhash2, feePayer: authority.publicKey }).add(commitIx);
  tx2.sign(authority);
  const sig = await er.sendRawTransaction(tx2.serialize(), { skipPreflight: true });
  console.log('commit sig:', sig);

  await sleep(2500);

  const l1State = await (program as any).account.runRecord.fetch(pda);
  console.log('L1 state after commit:', summarize(l1State));

  const erStateAfter = await readRunRecordFromEr(pda);
  console.log('ER state after commit:', summarize(erStateAfter));

  console.log('explorer PDA:', `https://explorer.solana.com/address/${pda.toBase58()}?cluster=devnet`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
