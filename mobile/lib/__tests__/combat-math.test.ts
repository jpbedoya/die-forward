import {
  calculateCombatDamage,
  maxHpForModifier,
  computeHealAmount,
  computeDamageAmount,
  deathSaveOutcome,
  voidbladeDamage,
  heartstoneWarning,
  applyApexBuff,
  APEX_BUFF_MULTIPLIER,
  type CombatDamageInput,
} from '../combat-math';
import { RUN_MODIFIERS } from '../modifiers';
import { getItemEffects } from '../content';

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
    tagDamageBonus: 0,
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

  it('tagDamageBonus multiplies player damage', () => {
    const base = calculateCombatDamage(input({ isPlayerAttacking: true, tagDamageBonus: 0 }));
    const boosted = calculateCombatDamage(input({ isPlayerAttacking: true, tagDamageBonus: 0.4 }));
    expect(boosted).toBe(Math.round(base * 1.4));
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

// Design ruling (Fix 5): chant is a FLAT post-multiplier addend. combat.tsx
// computes the enemy's hit via calculateCombatDamage() and then does
// `playerDmg += chantBonus` — the bonus is NOT fed into the base, so tier and
// charge multipliers must never scale it. These tests pin that contract at the
// math boundary the screen relies on.
describe('chant flat post-multiplier semantics', () => {
  const CHANT = 5;
  // The applied hit the way combat.tsx builds it: multiplied hit, then + chant.
  const flatApplied = (over: Partial<CombatDamageInput>) =>
    calculateCombatDamage(input(over)) + CHANT;
  // The OLD (incorrect) behavior: chant folded into the base before scaling.
  const baseFolded = (over: Partial<CombatDamageInput>) =>
    calculateCombatDamage(input({ ...over, base: (over.base ?? 20) + CHANT }));

  it('adds exactly the flat bonus regardless of tier', () => {
    expect(flatApplied({ tier: 1 })).toBe(20 + CHANT);
    expect(flatApplied({ tier: 3 })).toBe(40 + CHANT); // 40 from tier, +5 flat — NOT 45*2
  });

  it('adds exactly the flat bonus regardless of charge punishment', () => {
    expect(flatApplied({ wasCharging: true })).toBe(40 + CHANT); // 40 charged, +5 flat
  });

  it('differs from folding the bonus into the base on a scaled hit', () => {
    // tier 3: flat = 40 + 5 = 45; base-folded = (20+5)*2 = 50 → they must differ.
    expect(flatApplied({ tier: 3 })).not.toBe(baseFolded({ tier: 3 }));
    expect(baseFolded({ tier: 3 })).toBe(50);
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

describe('computeDamageAmount', () => {
  it('subtracts damage from current health', () => {
    expect(computeDamageAmount(10, 35)).toEqual({ newHealth: 25 });
  });

  it('floors at 0 instead of going negative', () => {
    expect(computeDamageAmount(50, 30)).toEqual({ newHealth: 0 });
  });

  it('is computed relative to the passed-in current health, not any prior value', () => {
    // Regression for the pounce bug: a prior functional heal (e.g. Herbs,
    // 5 -> 35) must already be reflected in `currentHealth` here — this
    // function has no notion of a stale render-closure value to discard.
    const healedHealth = 35; // simulates the result of a prior applyHealing
    expect(computeDamageAmount(10, healedHealth)).toEqual({ newHealth: 25 });
  });
});

describe('deathSaveOutcome', () => {
  it('does not trigger while the player is alive', () => {
    const inv = [{ name: "Death's Mantle" }];
    expect(deathSaveOutcome(50, inv, getItemEffects(inv))).toEqual({ saved: false, mantleIndex: -1, healTo: 0 });
  });

  it('does not save a lethal blow with no Death’s Mantle', () => {
    const inv = [{ name: 'Torch' }];
    expect(deathSaveOutcome(0, inv, getItemEffects(inv))).toEqual({ saved: false, mantleIndex: -1, healTo: 0 });
  });

  it('saves a lethal blow and points at the Death’s Mantle to consume', () => {
    const inv = [{ name: 'Torch' }, { name: "Death's Mantle" }, { name: 'Dagger' }];
    expect(deathSaveOutcome(-5, inv, getItemEffects(inv))).toEqual({ saved: true, mantleIndex: 1, healTo: 1 });
  });

  it('mantle heals to 25 with last-breath-pact', () => {
    const inv = [{ name: "Death's Mantle" }, { name: 'Soulstone' }];
    const out = deathSaveOutcome(-3, inv, getItemEffects(inv));
    expect(out.saved).toBe(true);
    expect(out.healTo).toBe(25);
  });

  it('mantle heals to 1 without the pact', () => {
    const inv = [{ name: "Death's Mantle" }];
    expect(deathSaveOutcome(-3, inv, getItemEffects(inv)).healTo).toBe(1);
  });
});

describe('voidbladeDamage', () => {
  it('deals 5 self-damage when a Voidblade is carried', () => {
    const inv = [{ name: 'Voidblade' }];
    expect(voidbladeDamage(inv, getItemEffects(inv))).toBe(5);
  });
  it('deals nothing without a Voidblade', () => {
    expect(voidbladeDamage([{ name: 'Dagger' }], getItemEffects([{ name: 'Dagger' }]))).toBe(0);
    expect(voidbladeDamage([], getItemEffects([]))).toBe(0);
  });
  it('voidblade self-damage is 0 with hungering-edge', () => {
    const inv = [{ name: 'Voidblade' }, { name: 'Soulstone' }];
    expect(voidbladeDamage(inv, getItemEffects(inv))).toBe(0);
  });
});

describe('heartstoneWarning', () => {
  it('heartstone warns when a hit would cross below 20% max HP', () => {
    const inv = [{ name: 'Heartstone' }];
    expect(heartstoneWarning(30, 15, 100, inv)).toBe(true);   // 30 -> 15 crosses 20
    expect(heartstoneWarning(80, 15, 100, inv)).toBe(false);
    expect(heartstoneWarning(30, 15, 100, [])).toBe(false);
  });

  it('does not warn when health is already below 20% (no new crossing)', () => {
    const inv = [{ name: 'Heartstone' }];
    expect(heartstoneWarning(15, 5, 100, inv)).toBe(false);
  });

  it('does not warn when the hit does not cross the threshold', () => {
    const inv = [{ name: 'Heartstone' }];
    expect(heartstoneWarning(30, 5, 100, inv)).toBe(false); // 30 -> 25, still above 20
  });

  it('does not warn when the hit lands exactly on the 20% boundary (not below)', () => {
    const inv = [{ name: 'Heartstone' }];
    expect(heartstoneWarning(25, 5, 100, inv)).toBe(false); // 25 -> 20, not below 20
  });
});

describe('applyApexBuff', () => {
  it('has a +15% multiplier constant', () => {
    expect(APEX_BUFF_MULTIPLIER).toBe(1.15);
  });

  it('applies +15% (rounded) when apex', () => {
    expect(applyApexBuff(100, true)).toBe(115);
    expect(applyApexBuff(10, true)).toBe(12); // 10 * 1.15 = 11.5 -> round = 12
  });

  it('is an identity pass-through when not apex', () => {
    expect(applyApexBuff(50, false)).toBe(50);
  });
});
