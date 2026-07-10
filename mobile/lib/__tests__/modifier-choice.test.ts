import { RUN_MODIFIERS, rollModifier, resolveModifier } from '../modifiers';
import { createRunRng } from '../seeded-random';

describe('resolveModifier override semantics', () => {
  const rolled = RUN_MODIFIERS[0];

  it('returns the chosen modifier when a valid id is given', () => {
    const target = RUN_MODIFIERS[3];
    expect(resolveModifier(target.id, rolled)).toBe(target);
  });

  it('falls back to the rolled modifier when the id is unknown', () => {
    expect(resolveModifier('does-not-exist', rolled)).toBe(rolled);
  });

  it('falls back to the rolled modifier when the id is undefined', () => {
    expect(resolveModifier(undefined, rolled)).toBe(rolled);
  });
});

describe('modifierRng draw stability', () => {
  // The perk starting-item roll consumes modifierRng AFTER the modifier pick.
  // rollModifier must consume exactly one pick whether or not a choice overrides
  // the result, so the downstream stream is identical with or without a choice.
  it('leaves an identical next draw whether a choice overrides the roll or not', () => {
    const seed = 'stability-seed-123';

    // Path A: choice path — roll (consumes one pick) then override.
    const rngChoice = createRunRng(seed);
    const rolledA = rollModifier(rngChoice);
    resolveModifier(RUN_MODIFIERS[2].id, rolledA);
    const nextChoice = rngChoice.random();

    // Path B: no choice — roll then resolve(undefined).
    const rngNoChoice = createRunRng(seed);
    const rolledB = rollModifier(rngNoChoice);
    resolveModifier(undefined, rolledB);
    const nextNoChoice = rngNoChoice.random();

    expect(nextChoice).toBe(nextNoChoice);
  });

  it('rollModifier consumes exactly one pick from the stream', () => {
    const seed = 'consume-seed-abc';
    // A twin rng that skips the modifier pick but takes one pick of its own
    // should then align with the real stream's next draw.
    const a = createRunRng(seed);
    rollModifier(a);
    const afterRoll = a.random();

    const b = createRunRng(seed);
    b.pick(RUN_MODIFIERS); // equivalent single consumption
    const afterManual = b.random();

    expect(afterRoll).toBe(afterManual);
  });
});
