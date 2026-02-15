/**
 * Die Forward Escrow Program Client
 * 
 * Boundary adapter using @solana/web3-compat for Anchor program interaction.
 * Kit types (Address) at the edges, web3.js internally for instruction building.
 * 
 * Program ID: 3KLgtdRvfJuLK1t9mKCe2soJbx4LgZfP6LQWVW9TQ7yN
 */

import type { Address } from '@solana/kit';
import { lamports } from '@solana/kit';
import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Transaction,
} from '@solana/web3.js';

// Program ID (deployed on devnet)
export const PROGRAM_ID = '3KLgtdRvfJuLK1t9mKCe2soJbx4LgZfP6LQWVW9TQ7yN' as Address;
const PROGRAM_ID_PUBKEY = new PublicKey(PROGRAM_ID);

// Game Pool PDA (derived from 'game_pool' seed)
export const GAME_POOL_PDA = 'E4LRRyeFXDbFg1WaS1pjKm5DAJzJDWbAs1v5qvqe5xYM' as Address;
const GAME_POOL_PDA_PUBKEY = new PublicKey(GAME_POOL_PDA);

// Treasury (receives fees)
export const TREASURY = 'D7NdNbJTL7s6Z7Wu8nGe5SBc64FiFQAH3iPvRZw15qSL' as Address;
const TREASURY_PUBKEY = new PublicKey(TREASURY);

// PDA Seeds
const SESSION_SEED = new TextEncoder().encode('session');

// Instruction discriminators (Anchor-style)
const STAKE_DISCRIMINATOR = new Uint8Array([206, 176, 202, 18, 200, 209, 179, 108]);
const RECORD_DEATH_DISCRIMINATOR = new Uint8Array([28, 153, 127, 210, 251, 58, 214, 174]);
const CLAIM_VICTORY_DISCRIMINATOR = new Uint8Array([243, 68, 139, 83, 146, 93, 82, 212]);

/**
 * Convert Kit Address to web3.js PublicKey (internal helper)
 */
function toPublicKey(address: Address): PublicKey {
  return new PublicKey(address);
}

/**
 * Convert hex string to session ID bytes
 */
export function hexToSessionId(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Generate a random session ID
 */
export function generateSessionId(): { hex: string; bytes: Uint8Array } {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return { hex, bytes };
}

/**
 * Derive session PDA
 */
export function deriveSessionPDA(sessionId: Uint8Array): Address {
  const [pda] = PublicKey.findProgramAddressSync(
    [SESSION_SEED, sessionId],
    PROGRAM_ID_PUBKEY
  );
  return pda.toBase58() as Address;
}

/**
 * Build stake instruction
 * 
 * @param player - Player's wallet address (Kit Address type)
 * @param sessionId - 16-byte session ID
 * @param amountLamports - Amount to stake in lamports
 * @returns web3.js TransactionInstruction (for sending via wallet)
 */
export function buildStakeInstruction(
  player: Address,
  sessionId: Uint8Array,
  amountLamports: bigint
): TransactionInstruction {
  const sessionPda = deriveSessionPDA(sessionId);
  
  // Instruction data: discriminator + session_id (16 bytes) + amount (8 bytes LE)
  const data = Buffer.alloc(8 + 16 + 8);
  data.set(STAKE_DISCRIMINATOR);
  data.set(sessionId, 8);
  data.writeBigUInt64LE(amountLamports, 24);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: toPublicKey(player), isSigner: true, isWritable: true },
      { pubkey: toPublicKey(sessionPda), isSigner: false, isWritable: true },
      { pubkey: GAME_POOL_PDA_PUBKEY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID_PUBKEY,
    data,
  });
}

/**
 * Build record death instruction (authority only)
 */
export function buildRecordDeathInstruction(
  authority: Address,
  sessionId: Uint8Array
): TransactionInstruction {
  const sessionPda = deriveSessionPDA(sessionId);
  
  const data = Buffer.alloc(8 + 16);
  data.set(RECORD_DEATH_DISCRIMINATOR);
  data.set(sessionId, 8);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: toPublicKey(authority), isSigner: true, isWritable: false },
      { pubkey: toPublicKey(sessionPda), isSigner: false, isWritable: true },
      { pubkey: GAME_POOL_PDA_PUBKEY, isSigner: false, isWritable: true },
    ],
    programId: PROGRAM_ID_PUBKEY,
    data,
  });
}

/**
 * Build claim victory instruction
 */
export function buildClaimVictoryInstruction(
  authority: Address,
  player: Address,
  sessionId: Uint8Array
): TransactionInstruction {
  const sessionPda = deriveSessionPDA(sessionId);
  
  const data = Buffer.alloc(8 + 16);
  data.set(CLAIM_VICTORY_DISCRIMINATOR);
  data.set(sessionId, 8);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: toPublicKey(authority), isSigner: true, isWritable: true },
      { pubkey: toPublicKey(player), isSigner: false, isWritable: true },
      { pubkey: toPublicKey(sessionPda), isSigner: false, isWritable: true },
      { pubkey: GAME_POOL_PDA_PUBKEY, isSigner: false, isWritable: true },
      { pubkey: TREASURY_PUBKEY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID_PUBKEY,
    data,
  });
}

/**
 * Create tip transaction (send SOL to corpse creator)
 * 
 * @param tipper - Tipper's address
 * @param recipient - Recipient's address
 * @param amountSOL - Amount in SOL
 * @returns web3.js Transaction
 */
export function createTipTransaction(
  tipper: Address,
  recipient: Address,
  amountSOL: number
): Transaction {
  return new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: toPublicKey(tipper),
      toPubkey: toPublicKey(recipient),
      lamports: amountSOL * LAMPORTS_PER_SOL,
    })
  );
}

/**
 * SOL conversion helpers using Kit's lamports type
 */
export const SOL = {
  toLamports: (sol: number) => lamports(BigInt(Math.floor(sol * LAMPORTS_PER_SOL))),
  fromLamports: (l: bigint) => Number(l) / LAMPORTS_PER_SOL,
  LAMPORTS_PER_SOL,
};
