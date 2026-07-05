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

describe('creature signatures', () => {
  it('at least 8 BESTIARY creatures carry a signature', () => {
    const creaturesWithSignatures = Object.values(BESTIARY).filter(c => c.signature);
    expect(creaturesWithSignatures.length).toBeGreaterThanOrEqual(8);
  });
  it('Bloated One has rupture signature', () => {
    expect(BESTIARY['Bloated One'].signature?.id).toBe('rupture');
  });
  it('Flickering Shade has blink signature', () => {
    expect(BESTIARY['Flickering Shade'].signature?.id).toBe('blink');
  });
});
