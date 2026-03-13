/**
 * Run Modifiers
 *
 * Each run has one randomly assigned modifier that alters gameplay rules.
 * Rolled deterministically from the run's seeded RNG.
 */

import { SeededRng } from './seeded-random';

export interface RunModifier {
  id: string;
  name: string;
  emoji: string;
  description: string;
  // Combat
  damageBonus?: number;        // Additive bonus to player damage (e.g. 0.25 = +25%)
  healingPenalty?: number;     // Fraction of healing lost (e.g. 0.3 = -30%)
  hideFirstIntent?: boolean;   // Enemy intent hidden on turn 1 of each combat
  // Stamina
  startingStamina?: number;    // Override starting stamina (replaces default)
  staminaRegenBonus?: number;  // Extra stamina recovered per turn
  // Brace
  braceNegatesAll?: boolean;   // Brace negates all damage (instead of partial)
  braceCost?: number;          // Stamina cost for Brace (default 0)
  // Exploration
  corpseChanceBonus?: number;  // Added to base corpse discovery chance
  // Starting stats
  startingHP?: number;         // Override starting HP (replaces default 100)
}

export const RUN_MODIFIERS: RunModifier[] = [
  {
    id: 'blood-pact',
    name: 'Blood Pact',
    emoji: '🩸',
    description: '+25% damage dealt, -30% healing received',
    damageBonus: 0.25,
    healingPenalty: 0.3,
  },
  {
    id: 'blind-descent',
    name: 'Blind Descent',
    emoji: '🌑',
    description: 'Enemy intent hidden on the first turn of each combat',
    hideFirstIntent: true,
  },
  {
    id: 'deaths-echo',
    name: "Death's Echo",
    emoji: '💀',
    description: '+30% chance to discover a corpse in any room',
    corpseChanceBonus: 0.3,
  },
  {
    id: 'numbing-cold',
    name: 'Numbing Cold',
    emoji: '🧊',
    description: 'Start with 2 stamina, but regen 1 extra per turn',
    startingStamina: 2,
    staminaRegenBonus: 1,
  },
  {
    id: 'iron-will',
    name: 'Iron Will',
    emoji: '🛡️',
    description: 'Brace negates all damage, but costs 1 stamina',
    braceNegatesAll: true,
    braceCost: 1,
  },
  {
    id: 'glass-cannon',
    name: 'Glass Cannon',
    emoji: '⚡',
    description: 'Start with 60 HP, deal +50% damage',
    startingHP: 60,
    damageBonus: 0.5,
  },
];

/**
 * Roll a modifier deterministically from the run's seeded RNG.
 * Call this once at the start of a run, before any other rng calls.
 */
export function rollModifier(rng: SeededRng): RunModifier {
  return rng.pick(RUN_MODIFIERS);
}
