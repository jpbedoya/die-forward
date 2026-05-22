import { createRunRng } from '../seeded-random';

describe('createRunRng', () => {
  it('is deterministic — the same seed yields the same sequence', () => {
    const a = createRunRng('seed-1');
    const b = createRunRng('seed-1');
    const seqA = Array.from({ length: 20 }, () => a.random());
    const seqB = Array.from({ length: 20 }, () => b.random());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds yield different sequences', () => {
    const a = Array.from({ length: 20 }, () => createRunRng('seed-1').random());
    const b = Array.from({ length: 20 }, () => createRunRng('seed-2').random());
    expect(a).not.toEqual(b);
  });

  it('random() returns floats in [0, 1)', () => {
    const rng = createRunRng('range-check');
    for (let i = 0; i < 200; i++) {
      const v = rng.random();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('range() returns integers within [min, max] inclusive', () => {
    const rng = createRunRng('range-test');
    for (let i = 0; i < 500; i++) {
      const v = rng.range(5, 10);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it('range() can hit both endpoints', () => {
    const rng = createRunRng('endpoints');
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(rng.range(1, 3));
    expect(seen.has(1)).toBe(true);
    expect(seen.has(3)).toBe(true);
  });

  it('chance(0) is always false; chance(1) is always true', () => {
    const rng = createRunRng('chance');
    for (let i = 0; i < 50; i++) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
    }
  });

  it('pick() always returns an element of the array', () => {
    const rng = createRunRng('pick');
    const arr = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 100; i++) {
      expect(arr).toContain(rng.pick(arr));
    }
  });

  it('pick() throws on an empty array', () => {
    expect(() => createRunRng('pick-empty').pick([])).toThrow();
  });

  it('shuffle() returns a permutation without mutating the input', () => {
    const rng = createRunRng('shuffle');
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    const out = rng.shuffle(input);
    expect(input).toEqual(copy); // input untouched
    expect([...out].sort((x, y) => x - y)).toEqual(copy); // same elements
  });

  it('exposes the seed it was created with', () => {
    expect(createRunRng('my-seed').seed).toBe('my-seed');
  });
});
