import {
  getZoneMechanic,
  initZoneStatus,
  applyStatusOnHit,
  resolveTurnStart,
  isStaminaRegenBlocked,
  infectionDamageMultiplier,
  infectionShouldDropItem,
  isFreezeImmune,
  rollFlux,
  clarityDepleted,
  clearStatus,
  restoreClarity,
  BURN_CAP,
  CHILL_CAP,
  CLARITY_MAX,
  type ZoneStatusState,
} from '../zone-mechanics';
import { createRunRng } from '../seeded-random';

const fresh = (over: Partial<ZoneStatusState> = {}): ZoneStatusState => ({
  ...initZoneStatus(),
  ...over,
});

describe('getZoneMechanic', () => {
  it('reads each zone mechanic from its JSON meta', () => {
    expect(getZoneMechanic('ashen-crypts')).toBe('BURN');
    expect(getZoneMechanic('frozen-gallery')).toBe('CHILL');
    expect(getZoneMechanic('living-tomb')).toBe('INFECTION');
    expect(getZoneMechanic('void-beyond')).toBe('FLUX');
  });

  it('is NONE for the mechanic-less Sunken Crypt and unknown zones', () => {
    expect(getZoneMechanic('sunken-crypt')).toBe('NONE');
    expect(getZoneMechanic('no-such-zone')).toBe('NONE');
  });
});

describe('initZoneStatus', () => {
  it('starts a run with full clarity and no other statuses', () => {
    expect(initZoneStatus()).toEqual({
      burn: 0,
      chill: 0,
      infection: 0,
      clarity: CLARITY_MAX,
      infectionItemDropped: false,
    });
  });
});

describe('applyStatusOnHit', () => {
  it('adds 1 burn stack on a regular hit, 2 on a boss hit', () => {
    expect(applyStatusOnHit('BURN', fresh(), false, false).burn).toBe(1);
    expect(applyStatusOnHit('BURN', fresh(), true, false).burn).toBe(2);
  });

  it('caps burn at BURN_CAP', () => {
    expect(applyStatusOnHit('BURN', fresh({ burn: BURN_CAP }), true, false).burn).toBe(BURN_CAP);
  });

  it('applies no status when the hit was fully Braced', () => {
    expect(applyStatusOnHit('BURN', fresh(), true, true)).toEqual(fresh());
  });

  it('caps incoming burn to 1 with an Ash Veil (dampenBurn)', () => {
    expect(applyStatusOnHit('BURN', fresh(), true, false, true).burn).toBe(1);
  });

  it('adds chill stacks capped at CHILL_CAP', () => {
    expect(applyStatusOnHit('CHILL', fresh(), false, false).chill).toBe(1);
    expect(applyStatusOnHit('CHILL', fresh({ chill: CHILL_CAP }), true, false).chill).toBe(CHILL_CAP);
  });

  it('accumulates infection stacks', () => {
    expect(applyStatusOnHit('INFECTION', fresh({ infection: 2 }), false, false).infection).toBe(3);
  });

  it('drains clarity on a FLUX-zone hit, floored at 0', () => {
    expect(applyStatusOnHit('FLUX', fresh({ clarity: 3 }), false, false).clarity).toBe(2);
    expect(applyStatusOnHit('FLUX', fresh({ clarity: 1 }), true, false).clarity).toBe(0);
  });

  it('does nothing in a NONE zone', () => {
    expect(applyStatusOnHit('NONE', fresh(), true, false)).toEqual(fresh());
  });
});

describe('resolveTurnStart', () => {
  it('BURN deals stacks x 3 damage and decays one stack', () => {
    const r = resolveTurnStart('BURN', fresh({ burn: 3 }));
    expect(r.damage).toBe(9);
    expect(r.state.burn).toBe(2);
    expect(r.narrative).toContain('9');
  });

  it('BURN with no stacks does nothing', () => {
    const r = resolveTurnStart('BURN', fresh({ burn: 0 }));
    expect(r.damage).toBe(0);
    expect(r.state.burn).toBe(0);
  });

  it('CHILL decays a stack and deals no damage', () => {
    const r = resolveTurnStart('CHILL', fresh({ chill: 2 }));
    expect(r.damage).toBe(0);
    expect(r.state.chill).toBe(1);
  });

  it('INFECTION does not tick — stacks persist', () => {
    const r = resolveTurnStart('INFECTION', fresh({ infection: 4 }));
    expect(r.damage).toBe(0);
    expect(r.state.infection).toBe(4);
  });
});

describe('isStaminaRegenBlocked', () => {
  it('blocks stamina regen while chilled', () => {
    expect(isStaminaRegenBlocked('CHILL', fresh({ chill: 1 }))).toBe(true);
    expect(isStaminaRegenBlocked('CHILL', fresh({ chill: 0 }))).toBe(false);
  });
  it('never blocks regen in non-CHILL zones', () => {
    expect(isStaminaRegenBlocked('BURN', fresh({ chill: 3 }))).toBe(false);
  });
});

describe('infection thresholds', () => {
  it('saps 30% player damage at 5+ infection stacks', () => {
    expect(infectionDamageMultiplier(fresh({ infection: 4 }))).toBe(1);
    expect(infectionDamageMultiplier(fresh({ infection: 5 }))).toBeCloseTo(0.7);
  });

  it('flags an item drop at 3+ stacks, once', () => {
    expect(infectionShouldDropItem(fresh({ infection: 2 }))).toBe(false);
    expect(infectionShouldDropItem(fresh({ infection: 3 }))).toBe(true);
    expect(infectionShouldDropItem(fresh({ infection: 5, infectionItemDropped: true }))).toBe(false);
  });
});

describe('isFreezeImmune', () => {
  it('marks ice-native creatures immune', () => {
    expect(isFreezeImmune('Ice Wraiths')).toBe(true);
    expect(isFreezeImmune('The Glacial Sovereign')).toBe(true);
  });
  it('leaves other creatures freezable', () => {
    expect(isFreezeImmune('The Preserved')).toBe(false);
  });
});

describe('rollFlux', () => {
  it('is deterministic for a given seed', () => {
    expect(rollFlux(createRunRng('flux-1'))).toBe(rollFlux(createRunRng('flux-1')));
  });
  it('triggers roughly 30% of the time across many seeds', () => {
    let hits = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) if (rollFlux(createRunRng('seed-' + i))) hits++;
    expect(hits / N).toBeGreaterThan(0.2);
    expect(hits / N).toBeLessThan(0.4);
  });
});

describe('clarityDepleted', () => {
  it('is true only in a FLUX zone at 0 clarity', () => {
    expect(clarityDepleted('FLUX', fresh({ clarity: 0 }))).toBe(true);
    expect(clarityDepleted('FLUX', fresh({ clarity: 1 }))).toBe(false);
    expect(clarityDepleted('BURN', fresh({ clarity: 0 }))).toBe(false);
  });
});

describe('cure helpers', () => {
  it('clearStatus zeroes the named status', () => {
    expect(clearStatus(fresh({ burn: 4 }), 'burn').burn).toBe(0);
    expect(clearStatus(fresh({ infection: 6 }), 'infection').infection).toBe(0);
  });
  it('restoreClarity adds one, capped at CLARITY_MAX', () => {
    expect(restoreClarity(fresh({ clarity: 1 })).clarity).toBe(2);
    expect(restoreClarity(fresh({ clarity: CLARITY_MAX })).clarity).toBe(CLARITY_MAX);
  });
});
