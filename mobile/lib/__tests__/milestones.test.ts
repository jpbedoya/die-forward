import {
  DEATH_MILESTONES,
  getUnlockedMilestones,
  getNewMilestone,
  getMilestonePerks,
} from '../milestones';

describe('getUnlockedMilestones', () => {
  it('unlocks nothing below the first threshold', () => {
    expect(getUnlockedMilestones(9)).toHaveLength(0);
  });

  it('unlocks a milestone exactly at its threshold', () => {
    expect(getUnlockedMilestones(10).some(m => m.deaths === 10)).toBe(true);
  });

  it('unlocks all milestones at or below the death count', () => {
    expect(getUnlockedMilestones(100)).toHaveLength(
      DEATH_MILESTONES.filter(m => m.deaths <= 100).length,
    );
  });

  it('unlocks everything once past the highest threshold', () => {
    expect(getUnlockedMilestones(9999)).toHaveLength(DEATH_MILESTONES.length);
  });
});

describe('getNewMilestone', () => {
  it('returns the milestone when its threshold is crossed', () => {
    expect(getNewMilestone(9, 10)?.deaths).toBe(10);
  });

  it('returns null when no threshold is crossed', () => {
    expect(getNewMilestone(10, 11)).toBeNull();
  });

  it('returns only the first milestone when several are crossed at once', () => {
    expect(getNewMilestone(0, 100)?.deaths).toBe(10);
  });

  it('does not re-trigger an already-unlocked milestone', () => {
    expect(getNewMilestone(10, 24)).toBeNull();
  });
});

describe('getMilestonePerks', () => {
  it('unlocks the Soulstone loot pool at 50 deaths', () => {
    expect(getMilestonePerks(49).soulstoneUnlocked).toBe(false);
    expect(getMilestonePerks(50).soulstoneUnlocked).toBe(true);
  });

  it('unlocks the starting item at 250 deaths', () => {
    expect(getMilestonePerks(249).startingItem).toBe(false);
    expect(getMilestonePerks(250).startingItem).toBe(true);
  });

  it('unlocks bonus HP at 500 deaths', () => {
    expect(getMilestonePerks(499).bonusHp).toBe(false);
    expect(getMilestonePerks(500).bonusHp).toBe(true);
  });
});
