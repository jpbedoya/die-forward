/**
 * Test MagicBlock ER run — create, update rooms, and commit
 * 
 * Run with: npx tsx scripts/test-er-run.ts
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
import RunRecordIdl from '../src/idl/run_record.json';

// Config
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';
const ER_ENDPOINT = process.env.MAGICBLOCK_ER_ENDPOINT || 'https://devnet-us.magicblock.app';
const RUN_RECORD_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_RUN_RECORD_PROGRAM_ID || '9rGjguBZAnittA4Cbm7YNP5qomatY3c4MTV7LSqNomzS'
);
const ER_VALIDATOR = new PublicKey(
  process.env.MAGICBLOCK_ER_VALIDATOR || 'MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd'
);
const RUN_SEED = Buffer.from('run');

function getAuthorityKeypair(): Keypair {
  const secretKey = process.env.SOLANA_AUTHORITY_SECRET_KEY;
  if (!secretKey) throw new Error('SOLANA_AUTHORITY_SECRET_KEY not set');
  return Keypair.fromSecretKey(bs58.decode(secretKey));
}

function deriveRunRecordPda(sessionIdBytes: Uint8Array): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [RUN_SEED, sessionIdBytes],
    RUN_RECORD_PROGRAM_ID
  );
  return pda;
}

function sessionIdToBytes(sessionId: string): Uint8Array {
  const bytes = new Uint8Array(32);
  const encoded = new TextEncoder().encode(sessionId.slice(0, 32));
  bytes.set(encoded);
  return bytes;
}

function getProgram(connection: Connection): Program<any> {
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
  const provider = new AnchorProvider(connection, wallet as never, { commitment: 'confirmed' });
  setProvider(provider);
  return new Program(RunRecordIdl as never, provider);
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('=== Test MagicBlock ER Run ===\n');
  
  const authority = getAuthorityKeypair();
  const l1Connection = new Connection(RPC_URL, 'confirmed');
  const erConnection = new ConnectionMagicRouter(ER_ENDPOINT);
  const program = getProgram(l1Connection);
  
  // Generate test session ID
  const testSessionId = `test-${Date.now()}`;
  const sessionIdBytes = sessionIdToBytes(testSessionId);
  const runRecordPda = deriveRunRecordPda(sessionIdBytes);
  const testPlayer = Keypair.generate().publicKey;
  const testStake = 0.01 * 1e9; // 0.01 SOL in lamports
  
  console.log('Config:');
  console.log('  Authority:', authority.publicKey.toBase58());
  console.log('  L1 RPC:', RPC_URL);
  console.log('  ER Endpoint:', ER_ENDPOINT);
  console.log('  ER Validator:', ER_VALIDATOR.toBase58());
  console.log('');
  console.log('Test Run:');
  console.log('  Session ID:', testSessionId);
  console.log('  PDA:', runRecordPda.toBase58());
  console.log('  Player:', testPlayer.toBase58());
  console.log('');

  // Step 1: Initialize RunRecord on L1
  console.log('1️⃣  Initializing RunRecord on L1...');
  try {
    await (program as any).methods
      .initializeRun(
        Array.from(sessionIdBytes),
        testPlayer,
        new BN(testStake)
      )
      .accounts({ runRecord: runRecordPda, authority: authority.publicKey })
      .signers([authority])
      .rpc();
    console.log('   ✅ RunRecord initialized on L1');
  } catch (err: any) {
    console.log('   ❌ Failed:', err.message);
    return;
  }

  await sleep(2000);

  // Step 2: Delegate to ER with validator
  console.log('2️⃣  Delegating to ER (validator:', ER_VALIDATOR.toBase58().slice(0, 8) + '...)');
  try {
    await (program as any).methods
      .delegateRun()
      .accounts({ runRecord: runRecordPda, authority: authority.publicKey })
      .remainingAccounts([
        { pubkey: ER_VALIDATOR, isSigner: false, isWritable: false }
      ])
      .signers([authority])
      .rpc();
    console.log('   ✅ Delegated to ER');
  } catch (err: any) {
    console.log('   ❌ Failed:', err.message);
    return;
  }

  await sleep(3000);

  // Step 3: Record events on ER (simulate playing through rooms)
  console.log('3️⃣  Recording room advances on ER...');
  for (let room = 1; room <= 5; room++) {
    try {
      // Build instruction
      const ix = await (program as any).methods
        .recordEvent({ advanceRoom: {} }, room, Array.from(new Uint8Array(32)))
        .accounts({ runRecord: runRecordPda, authority: authority.publicKey })
        .instruction();

      // Get ER blockhash
      const bhRes = await fetch(ER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1,
          method: 'getBlockhashForAccounts',
          params: [[runRecordPda.toBase58()]],
        }),
      });
      const bhData = await bhRes.json() as any;
      const erBlockhash = bhData?.result?.value?.blockhash;
      
      if (!erBlockhash) {
        console.log(`   ⚠️  No ER blockhash for room ${room}, skipping`);
        continue;
      }

      const tx = new Transaction({ recentBlockhash: erBlockhash, feePayer: authority.publicKey }).add(ix);
      tx.sign(authority);
      await erConnection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
      
      console.log(`   Room ${room} ✅`);
      await sleep(500);
    } catch (err: any) {
      console.log(`   Room ${room} ❌:`, err.message);
    }
  }

  await sleep(2000);

  // Step 4: Finalize run on ER (set status to Dead, final room)
  console.log('4️⃣  Finalizing run on ER (status: Dead, room: 5)...');
  try {
    const ix = await (program as any).methods
      .finalizeRun({ dead: {} }, 5)
      .accounts({ runRecord: runRecordPda, authority: authority.publicKey })
      .instruction();

    const bhRes = await fetch(ER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getBlockhashForAccounts',
        params: [[runRecordPda.toBase58()]],
      }),
    });
    const bhData = await bhRes.json() as any;
    const erBlockhash = bhData?.result?.value?.blockhash;

    if (!erBlockhash) {
      console.log('   ⚠️  No ER blockhash for finalize');
    } else {
      const tx = new Transaction({ recentBlockhash: erBlockhash, feePayer: authority.publicKey }).add(ix);
      tx.sign(authority);
      await erConnection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
      console.log('   ✅ Run finalized on ER');
    }
  } catch (err: any) {
    console.log('   ⚠️  Finalize failed (continuing):', err.message);
  }

  await sleep(2000);

  // Step 5: Commit back to L1
  console.log('5️⃣  Committing to L1...');
  try {
    const commitIx = createCommitAndUndelegateInstruction(
      authority.publicKey,
      [runRecordPda],
    );

    const bhRes = await fetch(ER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getBlockhashForAccounts',
        params: [[runRecordPda.toBase58(), authority.publicKey.toBase58()]],
      }),
    });
    const bhData = await bhRes.json() as any;
    const erBlockhash = bhData?.result?.value?.blockhash;

    if (!erBlockhash) {
      console.log('   ❌ No ER blockhash for commit');
      return;
    }

    const tx = new Transaction({
      recentBlockhash: erBlockhash,
      feePayer: authority.publicKey,
    }).add(commitIx);

    tx.sign(authority);
    const txSig = await erConnection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
    console.log('   ✅ Committed! Tx:', txSig);
  } catch (err: any) {
    console.log('   ❌ Commit failed:', err.message);
    return;
  }

  await sleep(3000);

  // Step 6: Verify on L1
  console.log('6️⃣  Verifying on L1...');
  try {
    const account = await (program as any).account.runRecord.fetch(runRecordPda);
    console.log('   ✅ Account found on L1!');
    console.log('   Status:', JSON.stringify(account.status));
    console.log('   Room:', account.currentRoom);
    console.log('   Events:', account.eventCount);
    console.log('   Stake:', account.stakeAmount.toString(), 'lamports');
  } catch (err: any) {
    console.log('   ❌ Failed to fetch:', err.message);
  }

  console.log('\n=== Test Complete ===');
  console.log('Check /onchain-runs for session:', testSessionId);
}

main().catch(console.error);
