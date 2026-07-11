import { applyCommunityMarks, type MarkableNode } from '../content';
import type { CommunityShift } from '../world-shift';

// NOTE: apexCreatureId is a creature DISPLAY NAME (see Global Constraints —
// same space as content.enemy / killedBy / BESTIARY keys), NOT a slug.
const community: CommunityShift = {
  dayKey: '2026-07-10', zoneId: 'sunken-crypt',
  apexCreatureId: 'Bog Lurker', apexKills: 5,
  curseNodes: ['n-3'], architectNodeId: 'n-3', architectDeaths: 12,
};

function node(id: string, enemyName?: string): MarkableNode {
  return { id, content: enemyName ? { enemy: enemyName, enemyHp: 100, enemyDamage: 10 } : {} } as MarkableNode;
}

describe('applyCommunityMarks', () => {
  it('marks the cursed and architect node', () => {
    const out = applyCommunityMarks([node('n-3', 'Ghoul'), node('n-1')], community);
    const n3 = out.find((n) => n.id === 'n-3')!;
    expect(n3.content.isCursed).toBe(true);
    expect(n3.content.isArchitect).toBe(true);
  });
  it('marks the apex creature node and buffs its stats by 15%', () => {
    const out = applyCommunityMarks([node('n-5', 'Bog Lurker')], community);
    const n5 = out.find((n) => n.id === 'n-5')!;
    expect(n5.content.isApex).toBe(true);
    expect(n5.content.enemyHp).toBe(115);
    expect(n5.content.enemyDamage).toBe(12); // round(11.5)
  });
  it('is a no-op when community is null', () => {
    const nodes = [node('n-3', 'ghoul')];
    const out = applyCommunityMarks(nodes, null);
    expect(out[0].content.isCursed).toBeUndefined();
  });
});
