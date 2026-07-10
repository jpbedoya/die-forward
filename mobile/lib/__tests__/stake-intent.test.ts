import { resolveStakeIntent } from '../stake-intent';

describe('resolveStakeIntent', () => {
  it('SOL stake: sends the on-chain tx, never offline', () => {
    expect(resolveStakeIntent({ amount: 0.05 })).toEqual({
      stakeMode: 'sol',
      sendSol: true,
      canFallbackOffline: false,
    });
  });

  it('Coin-Bound: no SOL tx, and never allowed offline (trust boundary)', () => {
    expect(resolveStakeIntent({ amount: 0, coinStake: 100 })).toEqual({
      stakeMode: 'coins',
      sendSol: false,
      canFallbackOffline: false,
    });
  });

  it('coinStake wins even when a SOL amount is also present (no double stake)', () => {
    const intent = resolveStakeIntent({ amount: 0.05, coinStake: 100 });
    expect(intent.stakeMode).toBe('coins');
    expect(intent.sendSol).toBe(false);
    expect(intent.canFallbackOffline).toBe(false);
  });

  it('coinStake wins even if emptyHanded flag is set', () => {
    const intent = resolveStakeIntent({ amount: 0, coinStake: 100, emptyHanded: true });
    expect(intent.stakeMode).toBe('coins');
    expect(intent.canFallbackOffline).toBe(false);
  });

  it('empty-handed: free, no tx, offline fallback allowed', () => {
    expect(resolveStakeIntent({ amount: 0, emptyHanded: true })).toEqual({
      stakeMode: 'free',
      sendSol: false,
      canFallbackOffline: true,
    });
  });

  it('zero amount, not flagged empty-handed, no coins: treated as free', () => {
    expect(resolveStakeIntent({ amount: 0 })).toEqual({
      stakeMode: 'free',
      sendSol: false,
      canFallbackOffline: true,
    });
  });

  it('non-positive coinStake does not count as a coin run', () => {
    expect(resolveStakeIntent({ amount: 0.05, coinStake: 0 }).stakeMode).toBe('sol');
  });
});
