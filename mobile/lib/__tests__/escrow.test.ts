import {
  SOL,
  hexToSessionId,
  deriveSessionPDA,
  buildStakeInstruction,
  buildRecordDeathInstruction,
  buildClaimVictoryInstruction,
  PROGRAM_ID,
  TREASURY,
  GAME_POOL_PDA,
} from '../solana/escrow';

// Two distinct, valid base58 addresses to stand in for player/authority.
const PLAYER = TREASURY;
const OTHER = GAME_POOL_PDA;

describe('SOL conversions', () => {
  it('toLamports converts SOL to lamports', () => {
    expect(SOL.toLamports(1)).toBe(1_000_000_000n);
    expect(SOL.toLamports(0.1)).toBe(100_000_000n);
    expect(SOL.toLamports(0.01)).toBe(10_000_000n);
  });

  it('fromLamports is the inverse', () => {
    expect(SOL.fromLamports(1_000_000_000n)).toBe(1);
    expect(SOL.fromLamports(100_000_000n)).toBe(0.1);
  });

  it('toLamports floors sub-lamport precision', () => {
    // 0.0000000015 SOL = 1.5 lamports -> floored to 1
    expect(SOL.toLamports(0.0000000015)).toBe(1n);
  });
});

describe('hexToSessionId', () => {
  it('produces a 32-byte array', () => {
    const id = hexToSessionId('aa'.repeat(32));
    expect(id).toBeInstanceOf(Uint8Array);
    expect(id.length).toBe(32);
    expect(id.every(b => b === 0xaa)).toBe(true);
  });

  it('strips a 0x prefix', () => {
    const id = hexToSessionId('0x' + 'ff'.repeat(32));
    expect(id.every(b => b === 0xff)).toBe(true);
  });

  it('zero-pads short hex input to 32 bytes', () => {
    const id = hexToSessionId('01');
    expect(id.length).toBe(32);
    expect(id[0]).toBe(1);
    expect(id.slice(1).every(b => b === 0)).toBe(true);
  });
});

describe('deriveSessionPDA', () => {
  const sid1 = hexToSessionId('11'.repeat(32));
  const sid2 = hexToSessionId('22'.repeat(32));

  it('is deterministic for the same player + session id', () => {
    expect(deriveSessionPDA(PLAYER, sid1)).toBe(deriveSessionPDA(PLAYER, sid1));
  });

  it('changes when the session id changes', () => {
    expect(deriveSessionPDA(PLAYER, sid1)).not.toBe(deriveSessionPDA(PLAYER, sid2));
  });

  it('changes when the player changes', () => {
    expect(deriveSessionPDA(PLAYER, sid1)).not.toBe(deriveSessionPDA(OTHER, sid1));
  });
});

describe('buildStakeInstruction', () => {
  const sessionId = hexToSessionId('ab'.repeat(32));
  const inst = buildStakeInstruction(PLAYER, sessionId, 50_000_000n);

  it('encodes discriminator + amount (LE) + session id (48 bytes total)', () => {
    expect(inst.data.length).toBe(48);
    expect(Array.from(inst.data.subarray(0, 8))).toEqual([206, 176, 202, 18, 200, 209, 179, 108]);
    const view = new DataView(inst.data.buffer, inst.data.byteOffset, inst.data.byteLength);
    expect(view.getBigUint64(8, true)).toBe(50_000_000n);
    expect(Array.from(inst.data.subarray(16))).toEqual(Array.from(sessionId));
  });

  it('has 5 accounts with the player as a writable signer', () => {
    expect(inst.keys).toHaveLength(5);
    expect(inst.keys[3].isSigner).toBe(true);
    expect(inst.keys[3].isWritable).toBe(true);
  });

  it('targets the escrow program', () => {
    expect(inst.programId.toBase58()).toBe(PROGRAM_ID);
  });
});

describe('buildRecordDeathInstruction', () => {
  const deathHash = new Uint8Array(32).fill(7);
  const inst = buildRecordDeathInstruction(PLAYER, OTHER, hexToSessionId('ef'.repeat(32)), deathHash);

  it('encodes discriminator + 32-byte death hash (40 bytes total)', () => {
    expect(inst.data.length).toBe(40);
    expect(Array.from(inst.data.subarray(0, 8))).toEqual([28, 153, 127, 210, 251, 58, 214, 174]);
    expect(Array.from(inst.data.subarray(8))).toEqual(Array.from(deathHash));
  });

  it('has 3 accounts', () => {
    expect(inst.keys).toHaveLength(3);
  });
});

describe('buildClaimVictoryInstruction', () => {
  const inst = buildClaimVictoryInstruction(PLAYER, OTHER, hexToSessionId('cd'.repeat(32)));

  it('carries a discriminator-only payload (8 bytes, no args)', () => {
    expect(inst.data.length).toBe(8);
    expect(Array.from(inst.data.subarray(0, 8))).toEqual([243, 68, 139, 83, 146, 93, 82, 212]);
  });

  it('has 4 accounts', () => {
    expect(inst.keys).toHaveLength(4);
  });
});
