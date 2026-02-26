import { Connection, PublicKey } from '@solana/web3.js';
import { startErRun, recordErEvent, commitErRun } from '../src/lib/magicblock';
import { AnchorProvider, Program, setProvider, BorshAccountsCoder } from '@coral-xyz/anchor';
import { Keypair, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import RunRecordIdl from '../src/idl/run_record.json';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';

function getAuthority() {
  const sk = process.env.SOLANA_AUTHORITY_SECRET_KEY;
  if (!sk) throw new Error('SOLANA_AUTHORITY_SECRET_KEY not set');
  return Keypair.fromSecretKey(bs58.decode(sk));
}

function getProgram(connection: Connection): Program<any> {
  const authority = getAuthority();
  const wallet = {
    publicKey: authority.publicKey,
    signTransaction: async <T extends Transaction>(tx: T) => tx,
    signAllTransactions: async <T extends Transaction>(txs: T[]) => txs,
  };
  const provider = new AnchorProvider(connection, wallet as never, { commitment: 'confirmed' });
  setProvider(provider);
  return new Program(RunRecordIdl as never, provider);
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const sessionId = `lib-${Date.now()}`;
  const player = Keypair.generate().publicKey.toBase58();
  console.log('session:', sessionId);
  console.log('player:', player);

  const erRunId = await startErRun({
    playerWallet: player,
    stakeAmount: 0.01,
    sessionId,
  });

  if (!erRunId) throw new Error('startErRun failed');
  console.log('erRunId:', erRunId);

  await recordErEvent({ erRunId, eventType: 'advance_room', room: 1 });
  await recordErEvent({ erRunId, eventType: 'advance_room', room: 2 });
  await recordErEvent({ erRunId, eventType: 'advance_room', room: 3 });
  console.log('recorded events');

  const commit = await commitErRun({ erRunId, outcome: 'dead', finalRoom: 3 });
  console.log('commit result:', commit);

  await sleep(15000);

  const conn = new Connection(RPC_URL, 'confirmed');
  const pda = new PublicKey(erRunId);
  const ai = await conn.getAccountInfo(pda);
  console.log('owner:', ai?.owner?.toBase58());

  if (ai) {
    const coder = new BorshAccountsCoder(RunRecordIdl as never);
    const d: any = coder.decode('RunRecord', ai.data);
    console.log('L1 decoded:', {
      room: Number(d.current_room ?? d.currentRoom),
      events: Number(d.event_count ?? d.eventCount),
      status: d.status,
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
