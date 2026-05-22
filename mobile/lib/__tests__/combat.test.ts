import {
  getIntentEffects,
  getItemEffects,
  getTierDamageMultiplier,
  getCreatureHealthSeeded,
  getAllCreatures,
  getItemDetails,
  rollRandomItem,
} from '../content';
import { createRunRng } from '../seeded-random';

describe('getIntentEffects', () => {
  it('AGGRESSIVE is a neutral profile', () => {
    const e = getIntentEffects('AGGRESSIVE');
    expect(e.damageDealtMod).toBe(1.0);
    expect(e.damageTakenMod).toBe(1.0);
    expect(e.isCharging).toBe(false);
  });

  it('CHARGING telegraphs a charge at reduced current damage', () => {
    const e = getIntentEffects('CHARGING');
    expect(e.isCharging).toBe(true);
    expect(e.damageDealtMod).toBe(0.5);
  });

  it('DEFENSIVE halves damage both ways and eases fleeing', () => {
    const e = getIntentEffects('DEFENSIVE');
    expect(e.damageDealtMod).toBe(0.5);
    expect(e.damageTakenMod).toBe(0.5);
    expect(e.fleeMod).toBeGreaterThan(0);
  });

  it('STALKING makes fleeing harder', () => {
    expect(getIntentEffects('STALKING').fleeMod).toBeLessThan(0);
  });

  it('HUNTING deals bonus damage', () => {
    expect(getIntentEffects('HUNTING').damageDealtMod).toBeGreaterThan(1);
  });

  it('ERRATIC damage always stays within 0.5x–2.0x', () => {
    for (let i = 0; i < 200; i++) {
      const mod = getIntentEffects('ERRATIC').damageDealtMod;
      expect(mod).toBeGreaterThanOrEqual(0.5);
      expect(mod).toBeLessThanOrEqual(2.0);
    }
  });

  it('ERRATIC is reproducible with a seeded RNG', () => {
    const a = getIntentEffects('ERRATIC', createRunRng('erratic'));
    const b = getIntentEffects('ERRATIC', createRunRng('erratic'));
    expect(a.damageDealtMod).toBe(b.damageDealtMod);
  });
});

describe('getItemEffects', () => {
  it('an empty inventory yields zero bonuses', () => {
    expect(getItemEffects([])).toEqual({ damageBonus: 0, defenseBonus: 0, fleeBonus: 0 });
  });

  it('sums damage bonuses across multiple items', () => {
    const e = getItemEffects([{ name: 'Torch' }, { name: 'Dagger' }]);
    expect(e.damageBonus).toBeCloseTo(0.25 + 0.35);
  });

  it('Soulstone boosts all three stats', () => {
    const e = getItemEffects([{ name: 'Soulstone' }]);
    expect(e.damageBonus).toBeCloseTo(0.1);
    expect(e.defenseBonus).toBeCloseTo(0.1);
    expect(e.fleeBonus).toBeCloseTo(0.1);
  });

  it('Cloak adds both flee and defense', () => {
    const e = getItemEffects([{ name: 'Cloak' }]);
    expect(e.fleeBonus).toBeCloseTo(0.15);
    expect(e.defenseBonus).toBeCloseTo(0.1);
  });

  it('Eye of the Hollow grants a corpse bonus', () => {
    expect(getItemEffects([{ name: 'Eye of the Hollow' }]).corpseBonus).toBeCloseTo(0.2);
  });

  it('Void Salt sets the aquatic-damage flag', () => {
    expect(getItemEffects([{ name: 'Void Salt' }]).voidSaltBonus).toBe(true);
  });

  it('ignores unknown items', () => {
    expect(getItemEffects([{ name: 'Not A Real Item' }])).toEqual({
      damageBonus: 0,
      defenseBonus: 0,
      fleeBonus: 0,
    });
  });
});

describe('getTierDamageMultiplier', () => {
  it('maps every creature tier to its multiplier', () => {
    const mult: Record<number, number> = { 1: 1.0, 2: 1.5, 3: 2.0 };
    for (const c of getAllCreatures()) {
      expect(getTierDamageMultiplier(c.name)).toBe(mult[c.tier]);
    }
  });

  it('defaults to 1.0 for an unknown creature', () => {
    expect(getTierDamageMultiplier('Nonexistent Creature')).toBe(1.0);
  });
});

describe('getCreatureHealthSeeded', () => {
  it('rolls health within the bestiary range and is reproducible', () => {
    for (const c of getAllCreatures()) {
      const h1 = getCreatureHealthSeeded(c.name, createRunRng('hp-' + c.name));
      const h2 = getCreatureHealthSeeded(c.name, createRunRng('hp-' + c.name));
      expect(h1).toBe(h2); // deterministic
      expect(h1).toBeGreaterThanOrEqual(c.health.min);
      expect(h1).toBeLessThanOrEqual(c.health.max);
    }
  });

  it('falls back to 65 HP for an unknown creature', () => {
    expect(getCreatureHealthSeeded('Nonexistent Creature', createRunRng('x'))).toBe(65);
  });
});

describe('rollRandomItem', () => {
  it('returns a valid, non-empty item name', () => {
    const rng = createRunRng('loot');
    const name = rollRandomItem(() => rng.random());
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });

  it('respects minRarity — legendary only returns legendary items', () => {
    const rng = createRunRng('legendary');
    for (let i = 0; i < 50; i++) {
      const name = rollRandomItem(() => rng.random(), 'legendary');
      expect(getItemDetails(name)?.rarity).toBe('legendary');
    }
  });

  it('never returns an excluded item', () => {
    const rng = createRunRng('exclude');
    for (let i = 0; i < 200; i++) {
      expect(rollRandomItem(() => rng.random(), undefined, ['Soulstone'])).not.toBe('Soulstone');
    }
  });

  it('weights common items most heavily (~55%)', () => {
    const rng = createRunRng('distribution');
    const N = 5000;
    let common = 0;
    for (let i = 0; i < N; i++) {
      const rarity = getItemDetails(rollRandomItem(() => rng.random()))?.rarity ?? 'common';
      if (rarity === 'common') common++;
    }
    expect(common / N).toBeGreaterThan(0.45);
    expect(common / N).toBeLessThan(0.65);
  });
});
