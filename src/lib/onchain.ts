/**
 * On-chain death verification utilities
 * 
 * Writes death hashes to Solana's memo program for verifiable permadeath.
 * Also supports the Die Forward escrow program for on-chain stake management.
 * Anyone can verify a death by checking the on-chain record.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { createHash } from 'crypto';
import { 
  buildRecordDeathInstruction, 
  buildClaimVictoryInstruction,
  hexToSessionId,
  PROGRAM_ID as ESCROW_PROGRAM_ID,
} from './escrow-program';

// Solana Memo Program ID
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

// RPC endpoint
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';

/**
 * Create a deterministic hash of death data
 */
export function hashDeathData(data: {
  walletAddress: string;
  zone: string;
  room: number;
  finalMessage: string;
  stakeAmount: number;
  timestamp: number;
}): string {
  const payload = JSON.stringify({
    w: data.walletAddress,
    z: data.zone,
    r: data.room,
    m: data.finalMessage,
    s: data.stakeAmount,
    t: data.timestamp,
  });
  
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Write a death hash to Solana's memo program
 * 
 * Returns the transaction signature for verification
 */
export async function recordDeathOnChain(deathHash: string): Promise<string | null> {
  try {
    // Get pool wallet keypair from env
    const secretKeyString = process.env.POOL_WALLET_SECRET;
    if (!secretKeyString) {
      console.warn('POOL_WALLET_SECRET not set, skipping on-chain death record');
      return null;
    }

    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const payer = Keypair.fromSecretKey(secretKey);
    
    const connection = new Connection(RPC_URL, 'confirmed');
    
    // Create memo instruction with death hash
    // Format: "DIE_FORWARD:v1:<hash>"
    const memoData = `DIE_FORWARD:v1:${deathHash}`;
    
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoData, 'utf-8'),
    });
    
    const transaction = new Transaction().add(memoInstruction);
    
    // Send transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer],
      { commitment: 'confirmed' }
    );
    
    console.log(`Death recorded on-chain: ${signature}`);
    return signature;
    
  } catch (error) {
    console.error('Failed to record death on-chain:', error);
    return null;
  }
}

/**
 * Verify a death hash exists on-chain
 * 
 * Returns true if the memo transaction exists and contains the expected hash
 */
export async function verifyDeathOnChain(
  signature: string,
  expectedHash: string
): Promise<boolean> {
  try {
    const connection = new Connection(RPC_URL, 'confirmed');
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    
    if (!tx || !tx.meta) return false;
    
    // Check for memo in log messages
    const expectedMemo = `DIE_FORWARD:v1:${expectedHash}`;
    const logs = tx.meta.logMessages || [];
    
    return logs.some(log => log.includes(expectedMemo));
    
  } catch (error) {
    console.error('Failed to verify death on-chain:', error);
    return false;
  }
}

/**
 * Record death in the escrow program
 * 
 * Marks the player's session as dead, their stake stays in the pool
 */
export async function recordDeathInEscrow(
  playerWallet: string,
  escrowSessionId: string,
  deathHash: string
): Promise<string | null> {
  try {
    const secretKeyString = process.env.POOL_WALLET_SECRET;
    if (!secretKeyString) {
      console.warn('POOL_WALLET_SECRET not set, skipping escrow death record');
      return null;
    }

    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const authority = Keypair.fromSecretKey(secretKey);
    
    const connection = new Connection(RPC_URL, 'confirmed');
    
    const player = new PublicKey(playerWallet);
    const sessionId = hexToSessionId(escrowSessionId);
    const deathHashBytes = Buffer.from(deathHash, 'hex');
    
    const instruction = buildRecordDeathInstruction(
      authority.publicKey,
      player,
      sessionId,
      deathHashBytes
    );
    
    const transaction = new Transaction().add(instruction);
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [authority],
      { commitment: 'confirmed' }
    );
    
    console.log(`Death recorded in escrow program: ${signature}`);
    return signature;
    
  } catch (error) {
    console.error('Failed to record death in escrow:', error);
    return null;
  }
}

/**
 * Process victory payout from escrow program
 * 
 * Returns stake + bonus to the player
 */
export async function processVictoryPayout(
  playerWallet: string,
  escrowSessionId: string
): Promise<string | null> {
  try {
    const secretKeyString = process.env.POOL_WALLET_SECRET;
    if (!secretKeyString) {
      console.warn('POOL_WALLET_SECRET not set, skipping escrow victory');
      return null;
    }

    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const authority = Keypair.fromSecretKey(secretKey);
    
    const connection = new Connection(RPC_URL, 'confirmed');
    
    const player = new PublicKey(playerWallet);
    const sessionId = hexToSessionId(escrowSessionId);
    
    const instruction = buildClaimVictoryInstruction(
      authority.publicKey,
      player,
      sessionId
    );
    
    const transaction = new Transaction().add(instruction);
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [authority],
      { commitment: 'confirmed' }
    );
    
    console.log(`Victory payout processed: ${signature}`);
    return signature;
    
  } catch (error) {
    console.error('Failed to process victory payout:', error);
    return null;
  }
}
