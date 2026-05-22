import { RUN_MODIFIERS, rollModifier } from '../modifiers';
import { createRunRng } from '../seeded-random';

describe('RUN_MODIFIERS', () => {
  it('defines exactly 6 modifiers with unique ids', () => {
    expect(RUN_MODIFIERS).toHaveLength(6);
    expect(new Set(RUN_MODIFIERS.map(m => m.id)).size).toBe(6);
  });

  it('every modifier has the required display fields', () => {
    for (const m of RUN_MODIFIERS) {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
      expect(m.emoji).toBeTruthy();
      expect(m.description).toBeTruthy();
    }
  });

  it('Blood Pact trades damage for healing', () => {
    const m = RUN_MODIFIERS.find(x => x.id === 'blood-pact')!;
    expect(m.damageBonus).toBe(0.25);
    expect(m.healingPenalty).toBe(0.3);
  });

  it('Glass Cannon lowers starting HP and raises damage', () => {
    const m = RUN_MODIFIERS.find(x => x.id === 'glass-cannon')!;
    expect(m.startingHP).toBe(60);
    expect(m.damageBonus).toBe(0.5);
  });

  it('Iron Will makes Brace negate all damage at a stamina cost', () => {
    const m = RUN_MODIFIERS.find(x => x.id === 'iron-will')!;
    expect(m.braceNegatesAll).toBe(true);
    expect(m.braceCost).toBe(1);
  });
});

describe('rollModifier', () => {
  it('returns one of the defined modifiers', () => {
    expect(RUN_MODIFIERS).toContain(rollModifier(createRunRng('roll')));
  });

  it('is deterministic for the same seed', () => {
    expect(rollModifier(createRunRng('same')).id).toBe(rollModifier(createRunRng('same')).id);
  });

  it('can roll every modifier across many seeds', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      seen.add(rollModifier(createRunRng('seed-' + i)).id);
    }
    expect(seen.size).toBe(6);
  });
});
