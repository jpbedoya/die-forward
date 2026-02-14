/**
 * Die Forward Escrow Program Client for Mobile
 * 
 * Program ID: 3KLgtdRvfJuLK1t9mKCe2soJbx4LgZfP6LQWVW9TQ7yN
 */

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Transaction,
} from '@solana/web3.js';

// Program ID (deployed on devnet)
export const PROGRAM_ID = new PublicKey('3KLgtdRvfJuLK1t9mKCe2soJbx4LgZfP6LQWVW9TQ7yN');

// Game Pool PDA (derived from 'game_pool' seed)
export const GAME_POOL_PDA = new PublicKey('E4LRRyeFXDbFg1WaS1pjKm5DAJzJDWbAs1v5qvqe5xYM');

// Treasury (receives fees)
export const TREASURY = new PublicKey('D7NdNbJTL7s6Z7Wu8nGe5SBc64FiFQAH3iPvRZw15qSL');

// PDA Seeds
const GAME_POOL_SEED = new TextEncoder().encode('game_pool');
const SESSION_SEED = new TextEncoder().encode('session');

// Simple SHA256 for PDA derivation (browser-compatible)
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
  
  const ml = message.length * 8;
  const padded = new Uint8Array(Math.ceil((message.length + 9) / 64) * 64);
  padded.set(message);
  padded[message.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, ml, false);

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

// Helper to convert session ID string to bytes
export function hexToSessionId(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Generate a random session ID
export function generateSessionId(): { hex: string; bytes: Uint8Array } {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return { hex, bytes };
}

// Derive session PDA
export function deriveSessionPDA(sessionId: Uint8Array): PublicKey {
  const seeds = [SESSION_SEED, sessionId];
  const combined = new Uint8Array(SESSION_SEED.length + sessionId.length);
  combined.set(SESSION_SEED);
  combined.set(sessionId, SESSION_SEED.length);
  
  // For simplicity, we'll use the program's findProgramAddressSync
  // This is a simplified version - real implementation uses proper PDA derivation
  const [pda] = PublicKey.findProgramAddressSync(
    [SESSION_SEED, sessionId],
    PROGRAM_ID
  );
  return pda;
}

// Instruction discriminators (Anchor-style)
const STAKE_DISCRIMINATOR = new Uint8Array([206, 176, 202, 18, 200, 209, 179, 108]); // 'global:stake'
const RECORD_DEATH_DISCRIMINATOR = new Uint8Array([28, 153, 127, 210, 251, 58, 214, 174]); // 'global:record_death'
const CLAIM_VICTORY_DISCRIMINATOR = new Uint8Array([243, 68, 139, 83, 146, 93, 82, 212]); // 'global:claim_victory'

// Build stake instruction
export function buildStakeInstruction(
  player: PublicKey,
  sessionId: Uint8Array,
  amountLamports: bigint
): TransactionInstruction {
  const sessionPda = deriveSessionPDA(sessionId);
  
  // Instruction data: discriminator + session_id (16 bytes) + amount (8 bytes LE)
  const data = new Uint8Array(8 + 16 + 8);
  data.set(STAKE_DISCRIMINATOR);
  data.set(sessionId, 8);
  const amountView = new DataView(data.buffer);
  amountView.setBigUint64(24, amountLamports, true); // Little endian
  
  return new TransactionInstruction({
    keys: [
      { pubkey: player, isSigner: true, isWritable: true },
      { pubkey: sessionPda, isSigner: false, isWritable: true },
      { pubkey: GAME_POOL_PDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

// Build record death instruction (authority only)
export function buildRecordDeathInstruction(
  authority: PublicKey,
  sessionId: Uint8Array
): TransactionInstruction {
  const sessionPda = deriveSessionPDA(sessionId);
  
  // Instruction data: discriminator + session_id (16 bytes)
  const data = new Uint8Array(8 + 16);
  data.set(RECORD_DEATH_DISCRIMINATOR);
  data.set(sessionId, 8);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: sessionPda, isSigner: false, isWritable: true },
      { pubkey: GAME_POOL_PDA, isSigner: false, isWritable: true },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

// Build claim victory instruction (authority approves, player receives)
export function buildClaimVictoryInstruction(
  authority: PublicKey,
  player: PublicKey,
  sessionId: Uint8Array
): TransactionInstruction {
  const sessionPda = deriveSessionPDA(sessionId);
  
  // Instruction data: discriminator + session_id (16 bytes)
  const data = new Uint8Array(8 + 16);
  data.set(CLAIM_VICTORY_DISCRIMINATOR);
  data.set(sessionId, 8);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: player, isSigner: false, isWritable: true },
      { pubkey: sessionPda, isSigner: false, isWritable: true },
      { pubkey: GAME_POOL_PDA, isSigner: false, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

// Create tip transaction (send SOL to corpse creator)
export function createTipTransaction(
  tipper: PublicKey,
  recipient: PublicKey,
  amountSOL: number
): Transaction {
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: tipper,
      toPubkey: recipient,
      lamports: amountSOL * LAMPORTS_PER_SOL,
    })
  );
  return transaction;
}
