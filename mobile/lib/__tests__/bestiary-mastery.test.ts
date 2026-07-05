import {
  recordEncounter,
  recordDefeat,
  recordKilledBy,
  computeAggregate,
  getNewMasteryUnlocks,
  emptyMastery,
  type CreatureMastery,
} from '../bestiary-mastery';

describe('recordEncounter', () => {
  it('creates a new entry with encounters=1 and timestamps set', () => {
    const out = recordEncounter(undefined, 'Ember Husks', 1000);
    expect(out['Ember Husks']).toEqual({
      encounters: 1,
      defeats: 0,
      killedByCount: 0,
      firstSeenAt: 1000,
      lastSeenAt: 1000,
    });
  });

  it('increments encounters and updates lastSeenAt but keeps firstSeenAt', () => {
    const first = recordEncounter(undefined, 'Ember Husks', 1000);
    const second = recordEncounter(first, 'Ember Husks', 2000);
    expect(second['Ember Husks'].encounters).toBe(2);
    expect(second['Ember Husks'].firstSeenAt).toBe(1000);
    expect(second['Ember Husks'].lastSeenAt).toBe(2000);
  });

  it('does not touch other creatures', () => {
    const m = recordEncounter(undefined, 'Ember Husks', 1000);
    const m2 = recordEncounter(m, 'Ash Children', 2000);
    expect(m2['Ember Husks'].encounters).toBe(1);
    expect(m2['Ash Children'].encounters).toBe(1);
  });
});

describe('recordDefeat / recordKilledBy', () => {
  it('increments their own counter without affecting siblings', () => {
    let m: CreatureMastery | undefined;
    m = recordEncounter(m, 'The Drowned', 1);
    m = recordDefeat(m, 'The Drowned', 2);
    m = recordKilledBy(m, 'The Drowned', 3);
    expect(m['The Drowned']).toEqual({
      encounters: 1,
      defeats: 1,
      killedByCount: 1,
      firstSeenAt: 1,
      lastSeenAt: 3,
    });
  });

  it('can defeat without a prior encounter (no implicit increment)', () => {
    const m = recordDefeat(undefined, 'Pale Crawler', 100);
    expect(m['Pale Crawler'].encounters).toBe(0);
    expect(m['Pale Crawler'].defeats).toBe(1);
  });
});

describe('computeAggregate', () => {
  const all = ['A', 'B', 'C', 'D'];

  it('returns zeros for an empty mastery + non-empty universe', () => {
    expect(computeAggregate(undefined, all)).toEqual({
      discoveredCount: 0,
      masteredCount: 0,
      totalCount: 4,
      discoveredPercent: 0,
      masteredPercent: 0,
    });
  });

  it('returns zeros for a non-empty mastery + empty universe', () => {
    const m = recordEncounter(undefined, 'X');
    expect(computeAggregate(m, [])).toEqual({
      discoveredCount: 0,
      masteredCount: 0,
      totalCount: 0,
      discoveredPercent: 0,
      masteredPercent: 0,
    });
  });

  it('counts encounters as discovered and defeats as mastered', () => {
    let m = recordEncounter(undefined, 'A');
    m = recordEncounter(m, 'B');
    m = recordDefeat(m, 'A');
    const agg = computeAggregate(m, all);
    expect(agg.discoveredCount).toBe(2);
    expect(agg.masteredCount).toBe(1);
    expect(agg.discoveredPercent).toBe(0.5);
    expect(agg.masteredPercent).toBe(0.25);
  });

  it('ignores creatures outside the universe', () => {
    const m = recordEncounter(undefined, 'Z'); // not in `all`
    expect(computeAggregate(m, all).discoveredCount).toBe(0);
  });
});

describe('getNewMasteryUnlocks — per-creature', () => {
  it('unlocks the "<Name> Slayer" title on the 5th defeat', () => {
    let prev: CreatureMastery = emptyMastery();
    for (let i = 0; i < 4; i++) prev = recordDefeat(prev, 'Ember Husks', i);
    const next = recordDefeat(prev, 'Ember Husks', 100);
    const unlocks = getNewMasteryUnlocks(prev, next, ['Ember Husks']);
    const titles = unlocks.filter(u => u.type === 'title').map(u => u.value);
    expect(titles).toContain('Ember Husks Slayer');
  });

  it('does not re-unlock the same milestone on a subsequent defeat', () => {
    let m: CreatureMastery = emptyMastery();
    for (let i = 0; i < 5; i++) m = recordDefeat(m, 'Ember Husks', i);
    // crossing already done — next defeat shouldn't add the title again
    const next = recordDefeat(m, 'Ember Husks', 100);
    const unlocks = getNewMasteryUnlocks(m, next, ['Ember Husks']);
    expect(unlocks.filter(u => u.value === 'Ember Husks Slayer')).toHaveLength(0);
  });

  it('unlocks the border at 25 defeats', () => {
    let prev: CreatureMastery = emptyMastery();
    for (let i = 0; i < 24; i++) prev = recordDefeat(prev, 'The Drowned', i);
    const next = recordDefeat(prev, 'The Drowned', 100);
    const unlocks = getNewMasteryUnlocks(prev, next, ['The Drowned']);
    const borders = unlocks.filter(u => u.type === 'border').map(u => u.value);
    expect(borders).toContain('the-drowned-themed');
  });

  it('a +2 defeat increment (honor signature bonus) crosses the 5-defeat threshold in one call', () => {
    // Regression for the honor mastery pre-bump bug: prev=4 -> next=6 via a
    // single recordDefeat(..., increment=2) call must still report the
    // 5-defeat unlock, exactly like two separate +1 calls would — the fix
    // must not skip thresholds landed on mid-increment.
    let prev: CreatureMastery = emptyMastery();
    for (let i = 0; i < 4; i++) prev = recordDefeat(prev, 'Carrion Knight', i);
    expect(prev['Carrion Knight'].defeats).toBe(4);
    const next = recordDefeat(prev, 'Carrion Knight', 100, 2);
    expect(next['Carrion Knight'].defeats).toBe(6);
    const unlocks = getNewMasteryUnlocks(prev, next, ['Carrion Knight']);
    const titles = unlocks.filter(u => u.type === 'title').map(u => u.value);
    expect(titles).toContain('Carrion Knight Slayer');
  });

  it('per-creature unlock is scoped to that creature only', () => {
    let prev: CreatureMastery = emptyMastery();
    for (let i = 0; i < 4; i++) prev = recordDefeat(prev, 'Ember Husks', i);
    // Defeat a different creature — no per-creature title should fire
    const next = recordDefeat(prev, 'Ash Children', 100);
    const titles = getNewMasteryUnlocks(prev, next, ['Ember Husks', 'Ash Children'])
      .map(u => u.value);
    expect(titles).not.toContain('Ember Husks Slayer');
    expect(titles).not.toContain('Ash Children Slayer'); // only 1 defeat, not 5
  });
});

describe('getNewMasteryUnlocks — aggregate', () => {
  const universe = ['A', 'B', 'C', 'D'];

  it('unlocks "Apprentice Lorekeeper" at 25% discovered', () => {
    const prev = emptyMastery();
    const next = recordEncounter(prev, 'A');
    const titles = getNewMasteryUnlocks(prev, next, universe).map(u => u.value);
    expect(titles).toContain('Apprentice Lorekeeper');
  });

  it('unlocks "Lorekeeper" at 50% discovered', () => {
    const prev = recordEncounter(undefined, 'A');
    const next = recordEncounter(prev, 'B');
    const titles = getNewMasteryUnlocks(prev, next, universe).map(u => u.value);
    expect(titles).toContain('Lorekeeper');
  });

  it('unlocks "Master Lorekeeper" + "bestiary-master" border at 100% discovered/mastered', () => {
    let prev: CreatureMastery = emptyMastery();
    for (const n of ['A', 'B', 'C']) {
      prev = recordEncounter(prev, n);
      prev = recordDefeat(prev, n);
    }
    // Add the last one to cross 100%
    let next = recordEncounter(prev, 'D');
    next = recordDefeat(next, 'D');
    const unlocks = getNewMasteryUnlocks(prev, next, universe);
    const values = unlocks.map(u => u.value);
    expect(values).toContain('Master Lorekeeper');
    expect(values).toContain('bestiary-master');
  });

  it('does not re-unlock an aggregate tier on subsequent progress', () => {
    let prev: CreatureMastery = emptyMastery();
    for (const n of ['A', 'B']) prev = recordEncounter(prev, n);  // already at 50%
    const next = recordEncounter(prev, 'C'); // moves to 75% — between Lorekeeper (50) and Master (100)
    const unlocks = getNewMasteryUnlocks(prev, next, universe);
    expect(unlocks.filter(u => u.value === 'Lorekeeper')).toHaveLength(0);
    expect(unlocks.filter(u => u.value === 'Master Lorekeeper')).toHaveLength(0);
  });
});
