/**
 * Die Forward Escrow Program Client
 * 
 * Program ID: 3KLgtdRvfJuLK1t9mKCe2soJbx4LgZfP6LQWVW9TQ7yN
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

// Simple SHA256 implementation (pure JS, works in browser and Node)
function sha256Sync(message: Uint8Array): Uint8Array {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  
  // Pre-processing: adding padding bits
  const ml = message.length * 8;
  const padded = new Uint8Array(Math.ceil((message.length + 9) / 64) * 64);
  padded.set(message);
  padded[message.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, ml, false);

  // Process each 512-bit chunk
  for (let i = 0; i < padded.length; i += 64) {
    const w = new Uint32Array(64);
    for (let j = 0; j < 16; j++) {
      w[j] = view.getUint32(i + j * 4, false);
    }
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(w[j-15], 7) ^ rotr(w[j-15], 18) ^ (w[j-15] >>> 3);
      const s1 = rotr(w[j-2], 17) ^ rotr(w[j-2], 19) ^ (w[j-2] >>> 10);
      w[j] = (w[j-16] + s0 + w[j-7] + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let j = 0; j < 64; j++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[j] + w[j]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  const result = new Uint8Array(32);
  const resultView = new DataView(result.buffer);
  resultView.setUint32(0, h0, false);
  resultView.setUint32(4, h1, false);
  resultView.setUint32(8, h2, false);
  resultView.setUint32(12, h3, false);
  resultView.setUint32(16, h4, false);
  resultView.setUint32(20, h5, false);
  resultView.setUint32(24, h6, false);
  resultView.setUint32(28, h7, false);
  return result;
}

// Program ID (deployed on devnet)
export const PROGRAM_ID = new PublicKey('3KLgtdRvfJuLK1t9mKCe2soJbx4LgZfP6LQWVW9TQ7yN');

// Game Pool PDA (derived from 'game_pool' seed)
export const GAME_POOL_PDA = new PublicKey('E4LRRyeFXDbFg1WaS1pjKm5DAJzJDWbAs1v5qvqe5xYM');

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
    data: Buffer.from(data),
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
    data: Buffer.from(data),
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
    data: Buffer.from(discriminator),
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
    data: Buffer.from(discriminator),
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
