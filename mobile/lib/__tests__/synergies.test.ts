import { getActiveSynergies, getItemEffects, SYNERGIES } from '../content';

const inv = (...names: string[]) => names.map((name) => ({ name }));

describe('synergies', () => {
  it('every synergy references two real item ids', () => {
    const { ITEM_DETAILS } = require('../content');
    for (const s of SYNERGIES) for (const item of s.items) {
      expect(ITEM_DETAILS[item]).toBeDefined();
    }
  });
  it('activates only when both items are carried', () => {
    expect(getActiveSynergies(inv('Bone Hook')).map(s => s.id)).toEqual([]);
    expect(getActiveSynergies(inv('Bone Hook', 'Bone Charm')).map(s => s.id)).toEqual(['ossuary-pact']);
  });
  it('ossuary-pact adds +30% vs bone', () => {
    const e = getItemEffects(inv('Bone Hook', 'Bone Charm'));
    expect(e.tagDamageBonuses?.bone).toBeCloseTo(0.30);
  });
  it('ashen-ward grants burn immunity', () => {
    expect(getItemEffects(inv('Ember Flask', 'Ash Veil')).burnImmune).toBe(true);
  });
  it('last-breath-pact upgrades the mantle heal', () => {
    expect(getItemEffects(inv("Death's Mantle", 'Soulstone')).mantleHealTo).toBe(25);
  });
});
