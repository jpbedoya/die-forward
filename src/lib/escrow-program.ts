/**
 * Die Forward Escrow Program Client
 * 
 * Program ID: NEXT_PUBLIC_ESCROW_PROGRAM_ID (devnet: 34NSi8ShkixLt8Eg8XahXaRnaNuiFV63xdtC3ZfdTAt6)
 * 
 * Instructions:
 * - initialize: Set up the game pool (admin only)
 * - stake: Player locks SOL to start a game
 * - record_death: Authority marks player as dead
 * - claim_victory: Authority approves victory, player gets payout
 * - close_session: Reclaim rent after game ends
 */

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { createHash } from 'crypto';

function sha256Sync(message: Uint8Array): Uint8Array {
  return new Uint8Array(createHash('sha256').update(message).digest());
}

// Program ID (deployed on devnet)
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID ||
  '34NSi8ShkixLt8Eg8XahXaRnaNuiFV63xdtC3ZfdTAt6'
);

// Game Pool PDA (derived from 'game_pool' seed)
// Derived from PROGRAM_ID — no separate env var needed, always in sync
// Use TextEncoder instead of Buffer.from (Buffer not always available client-side)
export const [GAME_POOL_PDA] = PublicKey.findProgramAddressSync(
  [new TextEncoder().encode('game_pool')],
  PROGRAM_ID
);

// Treasury (receives fees)
export const TREASURY = new PublicKey('D7NdNbJTL7s6Z7Wu8nGe5SBc64FiFQAH3iPvRZw15qSL');

// PDA Seeds
const GAME_POOL_SEED = new TextEncoder().encode('game_pool');
const SESSION_SEED = new TextEncoder().encode('session');

/**
 * Derive the game pool PDA
 */
export function getGamePoolPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [GAME_POOL_SEED],
    PROGRAM_ID
  );
}

/**
 * Derive a player session PDA
 */
export function getSessionPDA(player: PublicKey, sessionId: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SESSION_SEED, player.toBytes(), sessionId],
    PROGRAM_ID
  );
}

/**
 * Generate a unique session ID (32 bytes)
 */
export function generateSessionId(): Uint8Array {
  const timestamp = Date.now().toString();
  const random = Math.random().toString();
  const combined = new TextEncoder().encode(timestamp + random);
  return sha256Sync(combined);
}

/**
 * Create instruction data with discriminator
 * Anchor uses first 8 bytes as instruction discriminator (sha256 hash of "global:<instruction_name>")
 */
function getDiscriminator(instructionName: string): Uint8Array {
  const preimage = new TextEncoder().encode(`global:${instructionName}`);
  return sha256Sync(preimage).slice(0, 8);
}

/**
 * Convert session ID to hex string for storage
 */
export function sessionIdToHex(sessionId: Uint8Array): string {
  return Array.from(sessionId)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string back to session ID
 */
export function hexToSessionId(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Build stake instruction
 * 
 * Player stakes SOL to start a game session
 */
export function buildStakeInstruction(
  player: PublicKey,
  amount: number, // in SOL
  sessionId: Uint8Array,
): TransactionInstruction {
  const [session] = getSessionPDA(player, sessionId);
  
  // Instruction data: discriminator + amount (u64) + session_id ([u8; 32])
  const discriminator = getDiscriminator('stake');
  const amountBuffer = new ArrayBuffer(8);
  const amountView = new DataView(amountBuffer);
  amountView.setBigUint64(0, BigInt(Math.floor(amount * LAMPORTS_PER_SOL)), true); // little-endian
  
  const data = new Uint8Array(8 + 8 + 32);
  data.set(discriminator, 0);
  data.set(new Uint8Array(amountBuffer), 8);
  data.set(sessionId, 16);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: GAME_POOL_PDA, isSigner: false, isWritable: true },
      { pubkey: session, isSigner: false, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: player, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: data as Buffer,
  });
}

/**
 * Build record_death instruction (authority-signed, for server use)
 */
export function buildRecordDeathInstruction(
  authority: PublicKey,
  player: PublicKey,
  sessionId: Uint8Array,
  deathHash: Uint8Array,
): TransactionInstruction {
  const [session] = getSessionPDA(player, sessionId);
  
  const discriminator = getDiscriminator('record_death');
  const data = new Uint8Array(8 + 32);
  data.set(discriminator, 0);
  data.set(deathHash, 8);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: GAME_POOL_PDA, isSigner: false, isWritable: true },
      { pubkey: session, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    data: data as Buffer,
  });
}

/**
 * Build claim_victory instruction (authority-signed, for server use)
 */
export function buildClaimVictoryInstruction(
  authority: PublicKey,
  player: PublicKey,
  sessionId: Uint8Array,
): TransactionInstruction {
  const [session] = getSessionPDA(player, sessionId);
  
  const discriminator = getDiscriminator('claim_victory');

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: GAME_POOL_PDA, isSigner: false, isWritable: true },
      { pubkey: session, isSigner: false, isWritable: true },
      { pubkey: player, isSigner: false, isWritable: true }, // player receives SOL (mut)
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    data: discriminator as Buffer,
  });
}

/**
 * Build close_session instruction (reclaim rent)
 */
export function buildCloseSessionInstruction(
  player: PublicKey,
  sessionId: Uint8Array,
): TransactionInstruction {
  const [session] = getSessionPDA(player, sessionId);
  
  const discriminator = getDiscriminator('close_session');

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: session, isSigner: false, isWritable: true },
      { pubkey: player, isSigner: true, isWritable: true },
    ],
    data: discriminator as Buffer,
  });
}

/**
 * Hash death data for on-chain verification
 */
export function hashDeathData(data: {
  walletAddress: string;
  zone: string;
  room: number;
  finalMessage: string;
  stakeAmount: number;
  timestamp: number;
}): Uint8Array {
  const payload = JSON.stringify({
    w: data.walletAddress,
    z: data.zone,
    r: data.room,
    m: data.finalMessage,
    s: data.stakeAmount,
    t: data.timestamp,
  });
  
  return sha256Sync(new TextEncoder().encode(payload));
}

/**
 * Program configuration
 */
export const ESCROW_CONFIG = {
  programId: PROGRAM_ID.toBase58(),
  gamePoolPDA: GAME_POOL_PDA.toBase58(),
  treasury: TREASURY.toBase58(),
  feeBps: 500, // 5%
  victoryBonusBps: 5000, // 50%
  minStake: 0.01, // SOL
  maxStake: 1, // SOL
};
