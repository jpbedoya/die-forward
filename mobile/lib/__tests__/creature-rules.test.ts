import {
  initialRuleState,
  onPlayerStrike,
  onEnemyHitLanded,
  onDeathBlow,
  onTurnEnd,
  fleeBlocked,
  itemUseTriggersAttack,
  honorFilteredIntent,
  onBait,
  pickEchoPhrase,
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
      pounceSpent: false,
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
    expect(itemUseTriggersAttack(undefined, s)).toBe(false);
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
    expect(itemUseTriggersAttack({ id: 'pounce' }, initialRuleState())).toBe(true);
  });

  it('does not trigger for other rules', () => {
    expect(itemUseTriggersAttack({ id: 'honor' }, initialRuleState())).toBe(false);
  });

  it('does not trigger once the pounce has been spent (baited)', () => {
    const spent: CombatRuleState = { ...initialRuleState(), pounceSpent: true };
    expect(itemUseTriggersAttack({ id: 'pounce' }, spent)).toBe(false);
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
    expect(itemUseTriggersAttack({ id: 'honor' }, s)).toBe(false);
  });
});

describe('honorFilteredIntent', () => {
  it('rerolls once when honor rolls ERRATIC', () => {
    const reroll = jest.fn(() => ({ type: 'AGGRESSIVE' }));
    const result = honorFilteredIntent({ id: 'honor' }, { type: 'ERRATIC' }, reroll);
    expect(result).toEqual({ type: 'AGGRESSIVE' });
    expect(reroll).toHaveBeenCalledTimes(1);
  });

  it('does not reroll a second time even if the reroll is also ERRATIC', () => {
    const reroll = jest.fn(() => ({ type: 'ERRATIC' }));
    const result = honorFilteredIntent({ id: 'honor' }, { type: 'ERRATIC' }, reroll);
    expect(result).toEqual({ type: 'ERRATIC' });
    expect(reroll).toHaveBeenCalledTimes(1);
  });

  it('leaves non-ERRATIC intents alone', () => {
    const reroll = jest.fn();
    const result = honorFilteredIntent({ id: 'honor' }, { type: 'AGGRESSIVE' }, reroll);
    expect(result).toEqual({ type: 'AGGRESSIVE' });
    expect(reroll).not.toHaveBeenCalled();
  });

  it('does not reroll for other rules or no rule', () => {
    const reroll = jest.fn();
    expect(honorFilteredIntent({ id: 'chant' }, { type: 'ERRATIC' }, reroll)).toEqual({ type: 'ERRATIC' });
    expect(honorFilteredIntent(undefined, { type: 'ERRATIC' }, reroll)).toEqual({ type: 'ERRATIC' });
    expect(reroll).not.toHaveBeenCalled();
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

describe('onBait', () => {
  it('forces AGGRESSIVE + a 0.15 crit counter window for any rule', () => {
    const s = initialRuleState();
    const r = onBait(undefined, s);
    expect(r.forcedIntent).toBe('AGGRESSIVE');
    expect(r.counterBonus).toBe(0.15);
    expect(r.consumedSignature).toBe(false);
  });

  it('does not touch struckLastTurn (chant unaffected by the bait action itself)', () => {
    const s: CombatRuleState = { ...initialRuleState(), struckLastTurn: true };
    expect(onBait(undefined, s).state.struckLastTurn).toBe(true);
    const s2 = initialRuleState();
    expect(onBait(undefined, s2).state.struckLastTurn).toBe(false);
  });

  it('does not mutate its input state (purity)', () => {
    const s = initialRuleState();
    const snapshot = { ...s };
    onBait({ id: 'blink' }, s);
    expect(s).toEqual(snapshot);
  });

  describe('blink', () => {
    it('spends the evade (blinkUsed) and reports a consumed signature', () => {
      const s = initialRuleState();
      const r = onBait({ id: 'blink' }, s);
      expect(r.state.blinkUsed).toBe(true);
      expect(r.consumedSignature).toBe(true);
      expect(r.forcedIntent).toBe('AGGRESSIVE');
    });

    it('does not re-consume an already-spent blink', () => {
      const used: CombatRuleState = { ...initialRuleState(), blinkUsed: true };
      const r = onBait({ id: 'blink' }, used);
      expect(r.state.blinkUsed).toBe(true);
      expect(r.consumedSignature).toBe(false);
    });
  });

  describe('pounce', () => {
    it('spends the pounce (pounceSpent) and gates itemUseTriggersAttack afterward', () => {
      const s = initialRuleState();
      const r = onBait({ id: 'pounce' }, s);
      expect(r.state.pounceSpent).toBe(true);
      expect(r.consumedSignature).toBe(true);
      expect(itemUseTriggersAttack({ id: 'pounce' }, r.state)).toBe(false);
    });

    it('does not re-consume an already-spent pounce', () => {
      const spent: CombatRuleState = { ...initialRuleState(), pounceSpent: true };
      const r = onBait({ id: 'pounce' }, spent);
      expect(r.consumedSignature).toBe(false);
    });
  });

  it('leaves reform untouched (Bait cannot pre-spend death effects)', () => {
    const s = initialRuleState();
    const r = onBait({ id: 'reform' }, s);
    expect(r.state.reformUsed).toBe(false);
    expect(r.consumedSignature).toBe(false);
    expect(r.forcedIntent).toBe('AGGRESSIVE');
  });
});

describe('pickEchoPhrase', () => {
  it('returns null for an empty list', () => {
    expect(pickEchoPhrase([], 5)).toBeNull();
  });
  it('is deterministic for a given seed', () => {
    const p = ['a', 'b', 'c'];
    expect(pickEchoPhrase(p, 7)).toBe(pickEchoPhrase(p, 7));
    expect(p).toContain(pickEchoPhrase(p, 7));
  });
});
