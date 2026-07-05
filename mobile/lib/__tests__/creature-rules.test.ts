import {
  initialRuleState,
  onPlayerStrike,
  onEnemyHitLanded,
  onDeathBlow,
  onTurnEnd,
  fleeBlocked,
  itemUseTriggersAttack,
  CombatRuleState,
} from '../creature-rules';

const deathOpts = (overrides?: Partial<{ lastActionWasDodgeCounter: boolean; playerHasVoidOrAsh: boolean; enemyMaxHp: number }>) => ({
  lastActionWasDodgeCounter: false,
  playerHasVoidOrAsh: false,
  enemyMaxHp: 60,
  ...overrides,
});

describe('initialRuleState', () => {
  it('returns the neutral starting state', () => {
    expect(initialRuleState()).toEqual({
      turn: 1,
      struckLastTurn: false,
      blinkUsed: false,
      reformUsed: false,
      chantStacks: 0,
    });
  });
});

describe('undefined rule (neutral behavior)', () => {
  const s = initialRuleState();

  it('onPlayerStrike never evades', () => {
    expect(onPlayerStrike(undefined, s).evaded).toBe(false);
  });

  it('onEnemyHitLanded heals/drains nothing', () => {
    expect(onEnemyHitLanded(undefined, s, 60)).toEqual({ healEnemy: 0, staminaDrain: 0 });
  });

  it('onDeathBlow deals no rupture damage and no reform', () => {
    expect(onDeathBlow(undefined, s, deathOpts())).toEqual({ ruptureDamage: 0, reformToHp: 0 });
  });

  it('onTurnEnd adds no attacker and no chant bonus', () => {
    const result = onTurnEnd(undefined, s);
    expect(result.addAttacker).toBe(false);
    expect(result.chantBonusDamage).toBe(0);
  });

  it('fleeBlocked is false', () => {
    expect(fleeBlocked(undefined, s)).toBe(false);
  });

  it('itemUseTriggersAttack is false', () => {
    expect(itemUseTriggersAttack(undefined)).toBe(false);
  });
});

describe('blink', () => {
  it('evades only the first strike', () => {
    let s = initialRuleState();
    const first = onPlayerStrike({ id: 'blink' }, s);
    expect(first.evaded).toBe(true);
    expect(first.state.blinkUsed).toBe(true);
    expect(onPlayerStrike({ id: 'blink' }, first.state).evaded).toBe(false);
  });

  it('does not evade for other rules', () => {
    const s = initialRuleState();
    expect(onPlayerStrike({ id: 'rupture' }, s).evaded).toBe(false);
  });
});

describe('rupture', () => {
  const s = initialRuleState();

  it('damages unless finished on a dodge-counter', () => {
    expect(onDeathBlow({ id: 'rupture' }, s, deathOpts({ lastActionWasDodgeCounter: false })).ruptureDamage).toBeGreaterThan(0);
    expect(onDeathBlow({ id: 'rupture' }, s, deathOpts({ lastActionWasDodgeCounter: true })).ruptureDamage).toBe(0);
  });

  it('rounds damage to 20% of enemy max HP', () => {
    expect(onDeathBlow({ id: 'rupture' }, s, deathOpts({ enemyMaxHp: 61 })).ruptureDamage).toBe(Math.round(61 * 0.2));
  });
});

describe('reform', () => {
  const s = initialRuleState();

  it('revives once at half HP unless VOID/ASH', () => {
    expect(onDeathBlow({ id: 'reform' }, s, deathOpts({ playerHasVoidOrAsh: false })).reformToHp).toBe(30);
    expect(onDeathBlow({ id: 'reform' }, s, deathOpts({ playerHasVoidOrAsh: true })).reformToHp).toBe(0);
  });

  it('does not revive again once reformUsed is true', () => {
    const used: CombatRuleState = { ...initialRuleState(), reformUsed: true };
    expect(onDeathBlow({ id: 'reform' }, used, deathOpts()).reformToHp).toBe(0);
  });
});

describe('multiply', () => {
  it('signals an added attacker after its turn threshold', () => {
    const s = { ...initialRuleState(), turn: 4 };
    expect(onTurnEnd({ id: 'multiply', param: { turn: 4 } }, s).addAttacker).toBe(true);
  });

  it('does not signal before its turn threshold', () => {
    const s = { ...initialRuleState(), turn: 2 };
    expect(onTurnEnd({ id: 'multiply', param: { turn: 4 } }, s).addAttacker).toBe(false);
  });
});

describe('absorb', () => {
  it('heals param.heal when its attack lands', () => {
    expect(onEnemyHitLanded({ id: 'absorb', param: { heal: 7 } }, initialRuleState(), 60)).toEqual({
      healEnemy: 7,
      staminaDrain: 0,
    });
  });

  it('heals nothing without a heal param', () => {
    expect(onEnemyHitLanded({ id: 'absorb' }, initialRuleState(), 60).healEnemy).toBe(0);
  });
});

describe('drain', () => {
  it('drains 1 stamina on hit', () => {
    expect(onEnemyHitLanded({ id: 'drain' }, initialRuleState(), 60)).toEqual({
      healEnemy: 0,
      staminaDrain: 1,
    });
  });
});

describe('chant', () => {
  it('stacks +1 per turn not struck and deals stacks * ramp bonus damage', () => {
    let s = initialRuleState();
    const rule = { id: 'chant' as const, param: { ramp: 3 } };

    const turn1 = onTurnEnd(rule, s);
    expect(turn1.state.chantStacks).toBe(1);
    expect(turn1.chantBonusDamage).toBe(3);

    const turn2 = onTurnEnd(rule, turn1.state);
    expect(turn2.state.chantStacks).toBe(2);
    expect(turn2.chantBonusDamage).toBe(6);
  });

  it('resets stacks on a turn it was struck', () => {
    const rule = { id: 'chant' as const, param: { ramp: 3 } };
    let s = onTurnEnd(rule, initialRuleState()).state; // stacks=1
    const struck = onPlayerStrike(rule, s).state; // struckLastTurn=true
    const after = onTurnEnd(rule, struck);
    expect(after.state.chantStacks).toBe(0);
    expect(after.chantBonusDamage).toBe(0);
  });
});

describe('pounce', () => {
  it('triggers a free attack on item use', () => {
    expect(itemUseTriggersAttack({ id: 'pounce' })).toBe(true);
  });

  it('does not trigger for other rules', () => {
    expect(itemUseTriggersAttack({ id: 'honor' })).toBe(false);
  });
});

describe('honor', () => {
  it('has no direct effect on any combat-rule-engine hook (mood/mastery handled outside this module)', () => {
    const s = initialRuleState();
    expect(onPlayerStrike({ id: 'honor' }, s).evaded).toBe(false);
    expect(onEnemyHitLanded({ id: 'honor' }, s, 60)).toEqual({ healEnemy: 0, staminaDrain: 0 });
    expect(onDeathBlow({ id: 'honor' }, s, deathOpts())).toEqual({ ruptureDamage: 0, reformToHp: 0 });
    expect(onTurnEnd({ id: 'honor' }, s).addAttacker).toBe(false);
    expect(fleeBlocked({ id: 'honor' }, s)).toBe(false);
    expect(itemUseTriggersAttack({ id: 'honor' })).toBe(false);
  });
});

describe('dormant', () => {
  it('blocks flee from turn 2', () => {
    expect(fleeBlocked({ id: 'dormant' }, { ...initialRuleState(), turn: 1 })).toBe(false);
    expect(fleeBlocked({ id: 'dormant' }, { ...initialRuleState(), turn: 2 })).toBe(true);
  });

  it('does not block flee for other rules', () => {
    expect(fleeBlocked({ id: 'chant' }, { ...initialRuleState(), turn: 5 })).toBe(false);
  });
});
