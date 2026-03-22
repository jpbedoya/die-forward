/**
 * Die Forward Escrow Program Client
 * 
 * Boundary adapter using @solana/web3-compat for Anchor program interaction.
 * Kit types (Address) at the edges, web3.js internally for instruction building.
 * 
 * Program ID: 34NSi8ShkixLt8Eg8XahXaRnaNuiFV63xdtC3ZfdTAt6
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
export const PROGRAM_ID = '34NSi8ShkixLt8Eg8XahXaRnaNuiFV63xdtC3ZfdTAt6' as Address;
const PROGRAM_ID_PUBKEY = new PublicKey(PROGRAM_ID);

// Game Pool PDA (derived from 'game_pool' seed)
// Derived from PROGRAM_ID — always in sync, no hardcoded address needed
// Use TextEncoder instead of Buffer.from (Buffer not available in React Native)
const [_gamePoolPdaPubkey] = PublicKey.findProgramAddressSync(
  [new TextEncoder().encode('game_pool')],
  new PublicKey(PROGRAM_ID)
);
export const GAME_POOL_PDA = _gamePoolPdaPubkey.toBase58() as Address;
const GAME_POOL_PDA_PUBKEY = _gamePoolPdaPubkey;

// Treasury (receives fees) - from game pool state
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
 * Convert hex string to session ID bytes (32 bytes)
 */
export function hexToSessionId(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32 && i * 2 < clean.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Generate a random session ID (32 bytes)
 */
export function generateSessionId(): { hex: string; bytes: Uint8Array } {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return { hex, bytes };
}

/**
 * Derive session PDA
 * Seeds: ["session", player_pubkey, session_id]
 */
export function deriveSessionPDA(player: Address, sessionId: Uint8Array): Address {
  const [pda] = PublicKey.findProgramAddressSync(
    [SESSION_SEED, new PublicKey(player).toBuffer(), sessionId],
    PROGRAM_ID_PUBKEY
  );
  return pda.toBase58() as Address;
}

/**
 * Build stake instruction
 * 
 * @param player - Player's wallet address (Kit Address type)
 * @param sessionId - 32-byte session ID
 * @param amountLamports - Amount to stake in lamports
 * @returns web3.js TransactionInstruction (for sending via wallet)
 */
export function buildStakeInstruction(
  player: Address,
  sessionId: Uint8Array,
  amountLamports: bigint
): TransactionInstruction {
  const sessionPda = deriveSessionPDA(player, sessionId);
  
  // Instruction data: discriminator (8) + amount (8 bytes LE) + session_id (32 bytes)
  // Note: Anchor serializes in order of function parameters
  // Use Uint8Array + DataView instead of Buffer (not available in React Native)
  const data = new Uint8Array(8 + 8 + 32);
  data.set(STAKE_DISCRIMINATOR, 0);
  new DataView(data.buffer).setBigUint64(8, amountLamports, true); // little-endian
  data.set(sessionId, 16);
  
  // Account order from Anchor: game_pool, session, treasury, player, system_program
  return new TransactionInstruction({
    keys: [
      { pubkey: GAME_POOL_PDA_PUBKEY, isSigner: false, isWritable: true },
      { pubkey: toPublicKey(sessionPda), isSigner: false, isWritable: true },
      { pubkey: TREASURY_PUBKEY, isSigner: false, isWritable: true },
      { pubkey: toPublicKey(player), isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID_PUBKEY,
    data,
  });
}

/**
 * Build record death instruction (authority only)
 * Note: This is called by the server, not the client
 */
export function buildRecordDeathInstruction(
  authority: Address,
  player: Address,
  sessionId: Uint8Array,
  deathHash: Uint8Array // 32 bytes
): TransactionInstruction {
  const sessionPda = deriveSessionPDA(player, sessionId);
  
  // data: discriminator (8) + death_hash (32)
  const data = new Uint8Array(8 + 32);
  data.set(RECORD_DEATH_DISCRIMINATOR, 0);
  data.set(deathHash, 8);
  
  // Account order: game_pool, session, authority
  return new TransactionInstruction({
    keys: [
      { pubkey: GAME_POOL_PDA_PUBKEY, isSigner: false, isWritable: true },
      { pubkey: toPublicKey(sessionPda), isSigner: false, isWritable: true },
      { pubkey: toPublicKey(authority), isSigner: true, isWritable: false },
    ],
    programId: PROGRAM_ID_PUBKEY,
    data,
  });
}

/**
 * Build claim victory instruction
 * Note: This is called by the server, not the client
 */
export function buildClaimVictoryInstruction(
  authority: Address,
  player: Address,
  sessionId: Uint8Array
): TransactionInstruction {
  const sessionPda = deriveSessionPDA(player, sessionId);
  
  // data: discriminator only (no args)
  const data = new Uint8Array(8);
  data.set(CLAIM_VICTORY_DISCRIMINATOR, 0);
  
  // Account order: game_pool, session, player, authority
  return new TransactionInstruction({
    keys: [
      { pubkey: GAME_POOL_PDA_PUBKEY, isSigner: false, isWritable: true },
      { pubkey: toPublicKey(sessionPda), isSigner: false, isWritable: true },
      { pubkey: toPublicKey(player), isSigner: true, isWritable: true },
      { pubkey: toPublicKey(authority), isSigner: true, isWritable: false },
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
