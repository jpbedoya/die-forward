/**
 * Fix stuck ER runs — force commit all delegated RunRecord accounts back to L1
 * 
 * Run with: npx ts-node scripts/fix-stuck-er-runs.ts
 * 
 * Requires: SOLANA_AUTHORITY_SECRET_KEY in .env.local
 */

// Env vars should be set before running or via .env.local
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {
  ConnectionMagicRouter,
  createCommitAndUndelegateInstruction,
} from '@magicblock-labs/ephemeral-rollups-sdk';
import { BorshAccountsCoder } from '@coral-xyz/anchor';
import bs58 from 'bs58';
import RunRecordIdl from '../src/idl/run_record.json';

// Config
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';
const ER_ENDPOINT = process.env.MAGICBLOCK_ER_ENDPOINT || 'https://devnet-us.magicblock.app';
const DELEGATION_PROGRAM_ID = new PublicKey('DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh');
const RUN_RECORD_DISCRIMINATOR = Buffer.from([150, 11, 254, 208, 250, 147, 105, 152]);

function getAuthorityKeypair(): Keypair {
  const secretKey = process.env.SOLANA_AUTHORITY_SECRET_KEY;
  if (!secretKey) throw new Error('SOLANA_AUTHORITY_SECRET_KEY not set');
  return Keypair.fromSecretKey(bs58.decode(secretKey));
}

async function main() {
  console.log('=== Fix Stuck ER Runs ===\n');
  
  const authority = getAuthorityKeypair();
  const l1Connection = new Connection(RPC_URL, 'confirmed');
  const erConnection = new ConnectionMagicRouter(ER_ENDPOINT);
  
  console.log('Authority:', authority.publicKey.toBase58());
  console.log('L1 RPC:', RPC_URL);
  console.log('ER Endpoint:', ER_ENDPOINT);
  console.log('');

  // 1. Fetch all delegated RunRecord accounts
  console.log('Fetching delegated RunRecord accounts...');
  const delegatedRaw = await l1Connection.getProgramAccounts(DELEGATION_PROGRAM_ID, {
    filters: [
      { dataSize: 125 }, // RunRecord size
      { memcmp: { offset: 0, bytes: RUN_RECORD_DISCRIMINATOR.toString('base64'), encoding: 'base64' } },
    ],
  });

  console.log(`Found ${delegatedRaw.length} delegated RunRecord accounts\n`);

  if (delegatedRaw.length === 0) {
    console.log('No stuck runs to fix!');
    return;
  }

  // Decode accounts
  const coder = new BorshAccountsCoder(RunRecordIdl as never);
  const delegatedAccounts = delegatedRaw.map((raw) => {
    try {
      const decoded = coder.decode('RunRecord', raw.account.data);
      return { pubkey: raw.pubkey, data: decoded };
    } catch {
      return null;
    }
  }).filter(Boolean) as { pubkey: PublicKey; data: Record<string, unknown> }[];

  // 2. Try to commit each one
  for (const account of delegatedAccounts) {
    const pda = account.pubkey;
    const sessionId = Buffer.from(account.data.session_id as Uint8Array || account.data.sessionId as Uint8Array)
      .toString('utf8')
      .replace(/\0/g, '');
    const status = account.data.status || account.data.status;
    const room = account.data.current_room || account.data.currentRoom;
    
    console.log(`--- Processing: ${pda.toBase58()} ---`);
    console.log(`    Session: ${sessionId}`);
    console.log(`    Status: ${JSON.stringify(status)}, Room: ${room}`);

    try {
      // Build commit instruction
      const commitIx = createCommitAndUndelegateInstruction(
        authority.publicKey,
        [pda],
      );

      // Fetch ER-specific blockhash
      console.log('    Fetching ER blockhash...');
      const blockhashRes = await fetch(ER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBlockhashForAccounts',
          params: [[pda.toBase58(), authority.publicKey.toBase58()]],
        }),
      });
      const blockhashData = await blockhashRes.json() as {
        result?: { value?: { blockhash?: string } },
        error?: { message?: string }
      };
      
      const erBlockhash = blockhashData?.result?.value?.blockhash;
      
      if (!erBlockhash) {
        console.log(`    ⚠️  No ER blockhash — account may not be on this ER. Skipping.`);
        console.log(`    Response: ${JSON.stringify(blockhashData)}`);
        continue;
      }

      console.log(`    ER Blockhash: ${erBlockhash}`);

      // Build, sign, and send
      const tx = new Transaction({
        recentBlockhash: erBlockhash,
        feePayer: authority.publicKey,
      }).add(commitIx);

      tx.sign(authority);
      const rawTx = tx.serialize();

      console.log('    Sending commit transaction...');
      const txSig = await erConnection.sendRawTransaction(rawTx, { skipPreflight: true });
      
      console.log(`    ✅ Committed! Tx: ${txSig}`);
      
      // Wait a bit between transactions
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (err) {
      console.log(`    ❌ Failed: ${err instanceof Error ? err.message : err}`);
    }
    
    console.log('');
  }

  console.log('=== Done ===');
}

main().catch(console.error);
