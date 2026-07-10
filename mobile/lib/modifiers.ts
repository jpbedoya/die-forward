/**
 * Run Modifiers
 *
 * Each run has one randomly assigned modifier that alters gameplay rules.
 * Rolled deterministically from the run's seeded RNG.
 */

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
export function rollModifier(rng: { pick<T>(arr: T[]): T }): RunModifier {
  return rng.pick(RUN_MODIFIERS);
}

/**
 * Resolve the effective run modifier given an optional player choice.
 *
 * `rolled` MUST already have been produced by `rollModifier(rng)` so the rng
 * stream advances identically whether or not a choice is supplied — downstream
 * consumers (e.g. the perk starting-item roll) then see a stable sequence.
 *
 * A valid `chosenId` selects that modifier; an unknown id or `undefined`
 * falls back to the rolled modifier. When `pool` is provided (today's daily
 * shift modifier pool), a `chosenId` not present in that pool is also treated
 * as invalid and falls back to the rolled modifier — this stops a stale
 * client-side choice from a previous day's pool (or a tampered request) from
 * being honored. When `pool` is omitted (no active daily shift), any valid
 * `chosenId` is honored as-is.
 */
export function resolveModifier(
  chosenId: string | undefined,
  rolled: RunModifier,
  pool?: string[]
): RunModifier {
  if (!chosenId) return rolled;
  if (pool && !pool.includes(chosenId)) return rolled;
  return RUN_MODIFIERS.find((m) => m.id === chosenId) ?? rolled;
}
