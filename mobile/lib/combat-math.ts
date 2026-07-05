/**
 * combat-math.ts — pure combat & survival rule functions.
 *
 * Extracted from combat.tsx and GameContext.tsx so the core math is
 * deterministic and unit-testable, with no React or I/O dependency.
 * The screens and context remain the only callers; this module is math only.
 */

import type { RunModifier } from './modifiers';
import type { ItemEffects } from './content';

/** Damage-related game settings consumed by calculateCombatDamage. */
export interface CombatDamageSettings {
  tier2Multiplier: number;
  tier3Multiplier: number;
  erraticDamageMax: number;
  chargePunishment: number;
}

export interface CombatDamageInput {
  /** Base (pre-modifier) damage roll. */
  base: number;
  /** true = player hitting enemy; false = enemy hitting player. */
  isPlayerAttacking: boolean;
  /** Depth tier of the room (1-3). */
  tier: number;
  /** Whether the enemy's current intent is ERRATIC (its damage mod is capped). */
  enemyIsErratic: boolean;
  /** Enemy intent's damage-dealt modifier. */
  intentDamageDealtMod: number;
  /** Enemy intent's damage-taken modifier. */
  intentDamageTakenMod: number;
  /** Summed item damage bonus (fraction, e.g. 0.25). */
  itemDamageBonus: number;
  /** Summed item defense bonus (fraction). */
  itemDefenseBonus: number;
  /** Run-modifier damage bonus (fraction). */
  modifierDamageBonus: number;
  /** Bonus damage (fraction) from tag-keyed item effects, e.g. Void Salt vs aquatic. */
  tagDamageBonus: number;
  /** Whether the enemy was CHARGING last turn (charge punishment applies). */
  wasCharging: boolean;
  settings: CombatDamageSettings;
}

/**
 * Resolve a single damage number. Mirrors combat.tsx's calculateDamage():
 *  - Player attacking: base scaled by item + run-modifier damage bonuses and
 *    the enemy's damage-taken modifier.
 *  - Enemy attacking: base scaled by depth tier, the enemy's (ERRATIC-capped)
 *    damage-dealt modifier, the player's defense, and charge punishment.
 */
export function calculateCombatDamage(input: CombatDamageInput): number {
  const {
    base, isPlayerAttacking, tier, enemyIsErratic,
    intentDamageDealtMod, intentDamageTakenMod,
    itemDamageBonus, itemDefenseBonus, modifierDamageBonus, tagDamageBonus = 0, wasCharging, settings,
  } = input;

  if (isPlayerAttacking) {
    return Math.round(base * (1 + itemDamageBonus + modifierDamageBonus + tagDamageBonus) * intentDamageTakenMod);
  }

  const tierMult = tier === 3 ? settings.tier3Multiplier : tier === 2 ? settings.tier2Multiplier : 1.0;
  const cappedDealtMod = enemyIsErratic
    ? Math.min(intentDamageDealtMod, settings.erraticDamageMax)
    : intentDamageDealtMod;
  const chargeMult = wasCharging ? settings.chargePunishment : 1.0;
  return Math.round(base * tierMult * cappedDealtMod * (1 - itemDefenseBonus) * chargeMult);
}

/** Max HP for a run — Glass Cannon lowers it to 60, otherwise 100. */
export function maxHpForModifier(modifier: RunModifier | null | undefined): number {
  return modifier?.id === 'glass-cannon' ? 60 : 100;
}

/**
 * Compute the result of healing. Applies the run modifier's healing penalty
 * and caps at the run's max HP. Mirrors GameContext.applyHealing().
 */
export function computeHealAmount(
  baseAmount: number,
  modifier: RunModifier | null | undefined,
  currentHealth: number,
): { newHealth: number; healed: number } {
  const multiplier = 1 - (modifier?.healingPenalty ?? 0);
  const modified = Math.round(baseAmount * multiplier);
  const maxHp = maxHpForModifier(modifier);
  const newHealth = Math.min(maxHp, currentHealth + modified);
  return { newHealth, healed: newHealth - currentHealth };
}

/**
 * Decide whether a lethal blow is cancelled by a Death's Mantle.
 * Mirrors GameContext.checkDeathSave(): only triggers at health <= 0, and
 * identifies the first Death's Mantle in the inventory to consume.
 */
export function deathSaveOutcome(
  health: number,
  inventory: { name: string }[],
  effects: ItemEffects,
): { saved: boolean; mantleIndex: number; healTo: number } {
  if (health > 0) return { saved: false, mantleIndex: -1, healTo: 0 };
  const mantleIndex = inventory.findIndex(item => item.name === "Death's Mantle");
  return mantleIndex === -1
    ? { saved: false, mantleIndex: -1, healTo: 0 }
    : { saved: true, mantleIndex, healTo: effects.mantleHealTo ?? 1 };
}

/** Per-turn self-damage from carrying a Voidblade (5 HP), else 0 (hungering-edge zeroes it). */
export function voidbladeDamage(inventory: { name: string }[], effects: ItemEffects): number {
  if (effects.voidbladeSelfDamageZero) return 0;
  return inventory.some(item => item.name === 'Voidblade') ? 5 : 0;
}
