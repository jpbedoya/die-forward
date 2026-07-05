import { BESTIARY, getItemEffects, getTagDamageBonus } from '../content';

describe('creature tags', () => {
  it('every BESTIARY entry has at least one tag', () => {
    for (const [name, info] of Object.entries(BESTIARY)) {
      expect(info.tags?.length ?? 0).toBeGreaterThan(0);
    }
  });
  it('The Drowned is aquatic', () => {
    expect(BESTIARY['The Drowned'].tags).toContain('aquatic');
  });
  it('Void Salt grants +40% vs aquatic creatures', () => {
    const effects = getItemEffects([{ name: 'Void Salt' }]);
    expect(getTagDamageBonus(effects, ['aquatic'])).toBeCloseTo(0.4);
    expect(getTagDamageBonus(effects, ['bone'])).toBe(0);
  });
});
