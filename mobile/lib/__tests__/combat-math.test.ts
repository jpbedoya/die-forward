import {
  calculateCombatDamage,
  maxHpForModifier,
  computeHealAmount,
  deathSaveOutcome,
  voidbladeDamage,
  type CombatDamageInput,
} from '../combat-math';
import { RUN_MODIFIERS } from '../modifiers';

const bloodPact = RUN_MODIFIERS.find(m => m.id === 'blood-pact')!;
const glassCannon = RUN_MODIFIERS.find(m => m.id === 'glass-cannon')!;

const SETTINGS = { tier2Multiplier: 1.5, tier3Multiplier: 2.0, erraticDamageMax: 1.3, chargePunishment: 2.0 };

// Baseline neutral input — individual tests override what they exercise.
function input(overrides: Partial<CombatDamageInput> = {}): CombatDamageInput {
  return {
    base: 20,
    isPlayerAttacking: false,
    tier: 1,
    enemyIsErratic: false,
    intentDamageDealtMod: 1,
    intentDamageTakenMod: 1,
    itemDamageBonus: 0,
    itemDefenseBonus: 0,
    modifierDamageBonus: 0,
    wasCharging: false,
    settings: SETTINGS,
    ...overrides,
  };
}

describe('calculateCombatDamage — player attacking', () => {
  it('returns the base damage with no bonuses', () => {
    expect(calculateCombatDamage(input({ isPlayerAttacking: true }))).toBe(20);
  });

  it('adds item and run-modifier damage bonuses', () => {
    // 20 * (1 + 0.25 + 0.5) = 35
    expect(
      calculateCombatDamage(input({ isPlayerAttacking: true, itemDamageBonus: 0.25, modifierDamageBonus: 0.5 })),
    ).toBe(35);
  });

  it('scales by the enemy damage-taken modifier (e.g. DEFENSIVE)', () => {
    // 20 * 1 * 0.5 = 10
    expect(calculateCombatDamage(input({ isPlayerAttacking: true, intentDamageTakenMod: 0.5 }))).toBe(10);
  });

  it('ignores tier, defense, and charge when the player attacks', () => {
    expect(
      calculateCombatDamage(input({ isPlayerAttacking: true, tier: 3, itemDefenseBonus: 0.5, wasCharging: true })),
    ).toBe(20);
  });
});

describe('calculateCombatDamage — enemy attacking', () => {
  it('returns the base damage at tier 1 with no modifiers', () => {
    expect(calculateCombatDamage(input())).toBe(20);
  });

  it('applies the tier 2 and tier 3 multipliers', () => {
    expect(calculateCombatDamage(input({ tier: 2 }))).toBe(30); // 20 * 1.5
    expect(calculateCombatDamage(input({ tier: 3 }))).toBe(40); // 20 * 2.0
  });

  it('reduces damage by the player defense bonus', () => {
    expect(calculateCombatDamage(input({ itemDefenseBonus: 0.25 }))).toBe(15); // 20 * 0.75
  });

  it('applies charge punishment when the enemy was charging', () => {
    expect(calculateCombatDamage(input({ wasCharging: true }))).toBe(40); // 20 * 2.0
  });

  it('caps an ERRATIC damage modifier at erraticDamageMax', () => {
    // erratic mod 5.0 capped to 1.3 -> 20 * 1.3 = 26
    expect(calculateCombatDamage(input({ enemyIsErratic: true, intentDamageDealtMod: 5.0 }))).toBe(26);
  });

  it('leaves an ERRATIC modifier below the cap untouched', () => {
    expect(calculateCombatDamage(input({ enemyIsErratic: true, intentDamageDealtMod: 0.8 }))).toBe(16); // 20 * 0.8
  });

  it('does not cap a non-ERRATIC damage modifier', () => {
    expect(calculateCombatDamage(input({ enemyIsErratic: false, intentDamageDealtMod: 1.3 }))).toBe(26);
  });
});

describe('maxHpForModifier', () => {
  it('is 60 for Glass Cannon', () => {
    expect(maxHpForModifier(glassCannon)).toBe(60);
  });
  it('is 100 for other modifiers and for no modifier', () => {
    expect(maxHpForModifier(bloodPact)).toBe(100);
    expect(maxHpForModifier(null)).toBe(100);
    expect(maxHpForModifier(undefined)).toBe(100);
  });
});

describe('computeHealAmount', () => {
  it('heals the full amount with no modifier', () => {
    expect(computeHealAmount(30, null, 50)).toEqual({ newHealth: 80, healed: 30 });
  });

  it('caps healing at max HP', () => {
    expect(computeHealAmount(30, null, 90)).toEqual({ newHealth: 100, healed: 10 });
  });

  it('applies the Blood Pact healing penalty', () => {
    // 30 * (1 - 0.3) = 21
    expect(computeHealAmount(30, bloodPact, 50)).toEqual({ newHealth: 71, healed: 21 });
  });

  it('respects the Glass Cannon 60 HP cap', () => {
    expect(computeHealAmount(30, glassCannon, 50)).toEqual({ newHealth: 60, healed: 10 });
  });

  it('heals nothing when already at full health', () => {
    expect(computeHealAmount(30, null, 100)).toEqual({ newHealth: 100, healed: 0 });
  });
});

describe('deathSaveOutcome', () => {
  it('does not trigger while the player is alive', () => {
    expect(deathSaveOutcome(50, [{ name: "Death's Mantle" }])).toEqual({ saved: false, mantleIndex: -1 });
  });

  it('does not save a lethal blow with no Death’s Mantle', () => {
    expect(deathSaveOutcome(0, [{ name: 'Torch' }])).toEqual({ saved: false, mantleIndex: -1 });
  });

  it('saves a lethal blow and points at the Death’s Mantle to consume', () => {
    const inv = [{ name: 'Torch' }, { name: "Death's Mantle" }, { name: 'Dagger' }];
    expect(deathSaveOutcome(-5, inv)).toEqual({ saved: true, mantleIndex: 1 });
  });
});

describe('voidbladeDamage', () => {
  it('deals 5 self-damage when a Voidblade is carried', () => {
    expect(voidbladeDamage([{ name: 'Voidblade' }])).toBe(5);
  });
  it('deals nothing without a Voidblade', () => {
    expect(voidbladeDamage([{ name: 'Dagger' }])).toBe(0);
    expect(voidbladeDamage([])).toBe(0);
  });
});
