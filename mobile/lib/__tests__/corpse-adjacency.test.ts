import { filterNearbyCorpses, Corpse } from '../instant';

function makeCorpse(overrides: Partial<Corpse> & { id: string; room: number }): Corpse {
  return {
    deathId: `death-${overrides.id}`,
    zone: 'sunken-crypt',
    playerName: 'Wanderer',
    walletAddress: 'wallet-abc',
    finalMessage: 'it ends here',
    loot: 'Rusted Key',
    lootEmoji: '🗝️',
    discovered: false,
    createdAt: 1000,
    ...overrides,
  };
}

describe('filterNearbyCorpses', () => {
  it('sorts an exact-node corpse to the front', () => {
    const corpses = [
      makeCorpse({ id: 'band-match', room: 5 }),
      makeCorpse({ id: 'node-match', room: 6, nodeId: 'node-42' }),
    ];
    const result = filterNearbyCorpses(corpses, 5, 'node-42');
    expect(result.map((c) => c.id)).toEqual(['node-match', 'band-match']);
  });

  it('includes corpses within depth ± 1', () => {
    const corpses = [
      makeCorpse({ id: 'above', room: 4 }),
      makeCorpse({ id: 'same', room: 5 }),
      makeCorpse({ id: 'below', room: 6 }),
    ];
    const result = filterNearbyCorpses(corpses, 5);
    expect(result.map((c) => c.id).sort()).toEqual(['above', 'below', 'same']);
  });

  it('excludes corpses at depth ± 2', () => {
    const corpses = [
      makeCorpse({ id: 'far-above', room: 3 }),
      makeCorpse({ id: 'far-below', room: 7 }),
    ];
    expect(filterNearbyCorpses(corpses, 5)).toEqual([]);
  });

  it('matches legacy rows (no nodeId) by depth band', () => {
    const corpses = [makeCorpse({ id: 'legacy', room: 5 })];
    const result = filterNearbyCorpses(corpses, 5, 'node-42');
    expect(result.map((c) => c.id)).toEqual(['legacy']);
  });

  it('does not duplicate a corpse matching both nodeId and depth band', () => {
    const corpses = [makeCorpse({ id: 'both', room: 5, nodeId: 'node-42' })];
    const result = filterNearbyCorpses(corpses, 5, 'node-42');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('both');
  });

  it('does not treat nodeId matches outside the band as duplicates of band rows', () => {
    const corpses = [
      makeCorpse({ id: 'node-far', room: 9, nodeId: 'node-42' }),
      makeCorpse({ id: 'band-near', room: 5 }),
    ];
    const result = filterNearbyCorpses(corpses, 5, 'node-42');
    expect(result.map((c) => c.id)).toEqual(['node-far', 'band-near']);
  });
});
