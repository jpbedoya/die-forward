/**
 * Death Milestones
 *
 * Players unlock rewards as their total death count grows.
 * Milestones are permanent — once unlocked, they persist across runs.
 */

export interface Milestone {
  deaths: number;
  type: 'title' | 'border' | 'item_pool' | 'perk';
  value: string;
  description: string;
}

export const DEATH_MILESTONES: Milestone[] = [
  { deaths: 10,  type: 'title',     value: 'The Persistent', description: 'Die 10 times' },
  { deaths: 25,  type: 'border',    value: 'bone-frame',     description: 'Die 25 times' },
  { deaths: 50,  type: 'item_pool', value: 'Soulstone',      description: 'Die 50 times' },
  { deaths: 100, type: 'title',     value: 'The Undying',    description: 'Die 100 times' },
  { deaths: 250, type: 'perk',      value: 'starting_item',  description: 'Start with a random item' },
  { deaths: 500, type: 'perk',      value: 'bonus_hp',       description: 'Start with 110 HP' },
];

/**
 * Returns all milestones the player has unlocked so far.
 */
export function getUnlockedMilestones(totalDeaths: number): Milestone[] {
  return DEATH_MILESTONES.filter(m => totalDeaths >= m.deaths);
}

/**
 * Returns the first milestone crossed between prevDeaths and newDeaths,
 * or null if no milestone was crossed.
 * Only one milestone can unlock per death (the lowest threshold crossed).
 */
export function getNewMilestone(prevDeaths: number, newDeaths: number): Milestone | null {
  for (const milestone of DEATH_MILESTONES) {
    if (prevDeaths < milestone.deaths && newDeaths >= milestone.deaths) {
      return milestone;
    }
  }
  return null;
}

/**
 * Returns the perk flags derived from total deaths.
 */
export function getMilestonePerks(totalDeaths: number): { startingItem: boolean; bonusHp: boolean } {
  return {
    startingItem: totalDeaths >= 250,
    bonusHp: totalDeaths >= 500,
  };
}

/**
 * Human-readable label for a milestone type.
 */
export function getMilestoneTypeLabel(type: Milestone['type']): string {
  switch (type) {
    case 'title':     return 'Title Unlocked';
    case 'border':    return 'Border Unlocked';
    case 'item_pool': return 'Item Added to Pool';
    case 'perk':      return 'Perk Unlocked';
    default:          return 'Milestone Reached';
  }
}
