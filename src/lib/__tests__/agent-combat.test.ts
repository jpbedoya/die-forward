import {
  DEFAULT_COMBAT_SETTINGS,
  pickCombatSettings,
  readSessionSettings,
  readSessionModifier,
  readSessionZoneStatus,
  statusSummary,
  actionStaminaCost,
  buildCombatOptions,
  COMBAT_ACTIONS,
} from '../agent-combat';
import { initZoneStatus } from '../zone-mechanics';
import { RUN_MODIFIERS } from '../modifiers';

describe('pickCombatSettings', () => {
  it('returns the defaults when given nothing', () => {
    expect(pickCombatSettings(null)).toEqual(DEFAULT_COMBAT_SETTINGS);
    expect(pickCombatSettings(undefined)).toEqual(DEFAULT_COMBAT_SETTINGS);
    expect(pickCombatSettings({})).toEqual(DEFAULT_COMBAT_SETTINGS);
  });

  it('overrides only valid numeric combat keys', () => {
    const merged = pickCombatSettings({
      strikeCost: 3,
      criticalChance: 0.5,
      lootChanceBase: 0.9, // non-combat key — ignored
      baseDamageMin: 'nope', // wrong type — ignored
    });
    expect(merged.strikeCost).toBe(3);
    expect(merged.criticalChance).toBe(0.5);
    expect(merged.baseDamageMin).toBe(DEFAULT_COMBAT_SETTINGS.baseDamageMin);
    expect('lootChanceBase' in merged).toBe(false);
  });

  it('does not mutate the shared defaults', () => {
    pickCombatSettings({ strikeCost: 99 });
    expect(DEFAULT_COMBAT_SETTINGS.strikeCost).toBe(2);
  });
});

describe('readSessionSettings', () => {
  it('parses a snapshotted JSON string', () => {
    const session = { gameSettings: JSON.stringify({ strikeCost: 1 }) };
    expect(readSessionSettings(session).strikeCost).toBe(1);
  });

  it('falls back to defaults on missing or malformed JSON', () => {
    expect(readSessionSettings({})).toEqual(DEFAULT_COMBAT_SETTINGS);
    expect(readSessionSettings({ gameSettings: '{not json' })).toEqual(DEFAULT_COMBAT_SETTINGS);
  });
});

describe('readSessionModifier', () => {
  it('parses a snapshotted modifier', () => {
    const session = { runModifier: JSON.stringify(RUN_MODIFIERS[0]) };
    expect(readSessionModifier(session)?.id).toBe(RUN_MODIFIERS[0].id);
  });

  it('returns null when absent or malformed', () => {
    expect(readSessionModifier({})).toBeNull();
    expect(readSessionModifier({ runModifier: 'bad' })).toBeNull();
  });
});

describe('readSessionZoneStatus', () => {
  it('prefers the zoneStatus JSON field', () => {
    const status = { burn: 2, chill: 1, infection: 4, clarity: 1, infectionItemDropped: true };
    expect(readSessionZoneStatus({ zoneStatus: JSON.stringify(status) })).toEqual(status);
  });

  it('falls back to legacy flat fields', () => {
    const parsed = readSessionZoneStatus({ burnStacks: 3, chillStacks: 2, clarity: 1 });
    expect(parsed.burn).toBe(3);
    expect(parsed.chill).toBe(2);
    expect(parsed.clarity).toBe(1);
    expect(parsed.infection).toBe(0);
    expect(parsed.infectionItemDropped).toBe(false);
  });

  it('returns a fresh status for a brand-new session', () => {
    expect(readSessionZoneStatus({})).toEqual(initZoneStatus());
  });

  it('survives malformed zoneStatus JSON', () => {
    const parsed = readSessionZoneStatus({ zoneStatus: '{bad', burnStacks: 1 });
    expect(parsed.burn).toBe(1);
  });
});

describe('statusSummary', () => {
  it('projects the four status numbers', () => {
    const status = { burn: 1, chill: 2, infection: 3, clarity: 0, infectionItemDropped: true };
    expect(statusSummary(status)).toEqual({ burn: 1, chill: 2, infection: 3, clarity: 0 });
  });
});

describe('actionStaminaCost', () => {
  const settings = DEFAULT_COMBAT_SETTINGS;

  it('charges the settings-driven strike cost', () => {
    expect(actionStaminaCost('strike', settings, null)).toBe(settings.strikeCost);
  });

  it('charges 1 for dodge and flee', () => {
    expect(actionStaminaCost('dodge', settings, null)).toBe(1);
    expect(actionStaminaCost('flee', settings, null)).toBe(1);
  });

  it('brace is free unless a modifier sets a cost', () => {
    expect(actionStaminaCost('brace', settings, null)).toBe(0);
    const ironWill = RUN_MODIFIERS.find(m => m.id === 'iron-will')!;
    expect(actionStaminaCost('brace', settings, ironWill)).toBe(1);
  });

  it('item actions are free', () => {
    expect(actionStaminaCost('herbs', settings, null)).toBe(0);
    expect(actionStaminaCost('frost_shard', settings, null)).toBe(0);
  });
});

describe('buildCombatOptions', () => {
  const settings = DEFAULT_COMBAT_SETTINGS;
  const fresh = initZoneStatus();

  it('always offers strike, dodge, brace, flee', () => {
    const ids = buildCombatOptions([], settings, null, 'NONE', fresh).map(o => o.id);
    expect(ids).toEqual(['strike', 'dodge', 'brace', 'flee']);
  });

  it('adds item actions only for held items', () => {
    const inv = [{ name: 'Herbs' }, { name: 'Frost Shard' }];
    const ids = buildCombatOptions(inv, settings, null, 'NONE', fresh).map(o => o.id);
    expect(ids).toContain('herbs');
    expect(ids).toContain('frost_shard');
    expect(ids).not.toContain('ember_flask');
  });

  it('reflects the strike and brace costs', () => {
    const ironWill = RUN_MODIFIERS.find(m => m.id === 'iron-will')!;
    const opts = buildCombatOptions([], settings, ironWill, 'NONE', fresh);
    expect(opts.find(o => o.id === 'strike')!.cost).toBe(settings.strikeCost);
    expect(opts.find(o => o.id === 'brace')!.cost).toBe(1);
  });

  it('injects a fake option only when clarity is depleted in a FLUX zone', () => {
    const noFake = buildCombatOptions([], settings, null, 'FLUX', { ...fresh, clarity: 1 });
    expect(noFake.some(o => o.id.startsWith('void_fake'))).toBe(false);

    const withFake = buildCombatOptions([], settings, null, 'FLUX', { ...fresh, clarity: 0 });
    expect(withFake.some(o => o.id.startsWith('void_fake'))).toBe(true);

    const notVoid = buildCombatOptions([], settings, null, 'BURN', { ...fresh, clarity: 0 });
    expect(notVoid.some(o => o.id.startsWith('void_fake'))).toBe(false);
  });
});

describe('COMBAT_ACTIONS', () => {
  it('every buildable option id is an accepted combat action', () => {
    const inv = [
      { name: 'Herbs' }, { name: 'Ember Flask' }, { name: 'Frost Shard' },
      { name: 'Thermal Flask' }, { name: 'Cleansing Salts' }, { name: 'Clarity Shard' },
    ];
    const opts = buildCombatOptions(inv, DEFAULT_COMBAT_SETTINGS, null, 'NONE', initZoneStatus());
    for (const opt of opts) {
      expect(COMBAT_ACTIONS.has(opt.id)).toBe(true);
    }
  });
});
