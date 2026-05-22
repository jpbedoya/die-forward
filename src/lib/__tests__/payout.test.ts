import { computeVictoryReward } from '@/lib/payout';

describe('computeVictoryReward', () => {
  it('adds the default 50% bonus to the stake', () => {
    const { bonus, totalReward } = computeVictoryReward(0.1, 50);
    expect(bonus).toBeCloseTo(0.05);
    expect(totalReward).toBeCloseTo(0.15);
  });

  it('returns just the stake when the bonus is 0%', () => {
    const { bonus, totalReward } = computeVictoryReward(0.1, 0);
    expect(bonus).toBeCloseTo(0);
    expect(totalReward).toBeCloseTo(0.1);
  });

  it('doubles the stake at a 100% bonus', () => {
    const { bonus, totalReward } = computeVictoryReward(0.25, 100);
    expect(bonus).toBeCloseTo(0.25);
    expect(totalReward).toBeCloseTo(0.5);
  });

  it('pays nothing for a zero stake (free / demo runs)', () => {
    expect(computeVictoryReward(0, 50)).toEqual({ bonus: 0, totalReward: 0 });
  });
});
