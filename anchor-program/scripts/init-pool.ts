/**
 * Initialize the Die Forward game pool
 * 
 * Run with: npx ts-node scripts/init-pool.ts
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { createHash } from 'crypto';
import * as fs from 'fs';

const PROGRAM_ID = new PublicKey('3KLgtdRvfJuLK1t9mKCe2soJbx4LgZfP6LQWVW9TQ7yN');

// Pool wallet as treasury (receives fees)
const TREASURY = new PublicKey('D7NdNbJTL7s6Z7Wu8nGe5SBc64FiFQAH3iPvRZw15qSL');

// Fee: 5% (500 basis points)
const FEE_BPS = 500;

// Victory bonus: 50% (5000 basis points)
const VICTORY_BONUS_BPS = 5000;

function getGamePoolPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('game_pool')],
    PROGRAM_ID
  );
}

function getDiscriminator(instructionName: string): Buffer {
  const hash = createHash('sha256')
    .update(`global:${instructionName}`)
    .digest();
  return hash.slice(0, 8);
}

async function main() {
  // Load keypair
  const keypairPath = process.env.HOME + '/.config/solana/id.json';
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const authority = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  
  console.log('Authority:', authority.publicKey.toBase58());
  console.log('Treasury:', TREASURY.toBase58());
  
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  const [gamePool, bump] = getGamePoolPDA();
  console.log('Game Pool PDA:', gamePool.toBase58());
  
  // Check if already initialized
  const poolInfo = await connection.getAccountInfo(gamePool);
  if (poolInfo) {
    console.log('Game pool already initialized!');
    console.log('Balance:', poolInfo.lamports / 1e9, 'SOL');
    return;
  }
  
  // Build initialize instruction
  const discriminator = getDiscriminator('initialize');
  const feeBpsBuffer = Buffer.alloc(2);
  feeBpsBuffer.writeUInt16LE(FEE_BPS);
  const bonusBpsBuffer = Buffer.alloc(2);
  bonusBpsBuffer.writeUInt16LE(VICTORY_BONUS_BPS);
  
  const data = Buffer.concat([discriminator, feeBpsBuffer, bonusBpsBuffer]);
  
  // Calculate space for GamePool account
  // pubkey (32) + pubkey (32) + u16 (2) + u16 (2) + u64 (8) + u64 (8) + u64 (8) + u8 (1) = 93 bytes
  // + 8 bytes discriminator = 101 bytes
  const SPACE = 8 + 32 + 32 + 2 + 2 + 8 + 8 + 8 + 1;
  const rentExempt = await connection.getMinimumBalanceForRentExemption(SPACE);
  
  console.log('Space needed:', SPACE, 'bytes');
  console.log('Rent exempt:', rentExempt / 1e9, 'SOL');
  
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: gamePool, isSigner: false, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: false },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
  
  const tx = new Transaction().add(instruction);
  
  console.log('Sending initialize transaction...');
  const sig = await sendAndConfirmTransaction(connection, tx, [authority]);
  console.log('Initialized! Signature:', sig);
}

main().catch(console.error);
