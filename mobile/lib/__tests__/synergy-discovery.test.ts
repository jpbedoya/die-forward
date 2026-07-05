import { newlyFormedSynergies } from '../content';

it('detects a synergy formed by the newest pickup', () => {
  const before = [{ name: 'Bone Hook' }];
  const after = [...before, { name: 'Bone Charm' }];
  expect(newlyFormedSynergies(before, after).map(s => s.id)).toEqual(['ossuary-pact']);
  expect(newlyFormedSynergies(after, after)).toEqual([]);
});
