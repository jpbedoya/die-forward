import { ITEM_DETAILS } from '../content';

describe('item element tags', () => {
  it('every non-consumable item has 1-2 element tags', () => {
    for (const [id, d] of Object.entries(ITEM_DETAILS)) {
      if (d.type === 'consumable') continue;
      const n = d.elementTags?.length ?? 0;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(2);
    }
  });
  it('spot checks', () => {
    expect(ITEM_DETAILS['Bone Hook'].elementTags).toContain('BONE');
    expect(ITEM_DETAILS['Voidblade'].elementTags).toContain('VOID');
    expect(ITEM_DETAILS['Ash Veil'].elementTags).toContain('ASH');
  });
});
