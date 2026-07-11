import { validateSettingsPatch, KNOWN_SETTINGS_KEYS } from '@/lib/settings-validation';

describe('validateSettingsPatch', () => {
  it('accepts a patch with only known keys', () => {
    expect(validateSettingsPatch({ lootChanceBase: 0.6, criticalChance: 0.2 })).toEqual({ ok: true });
  });

  it('accepts every individual known key', () => {
    for (const key of KNOWN_SETTINGS_KEYS) {
      expect(validateSettingsPatch({ [key]: 1 })).toEqual({ ok: true });
    }
  });

  it('accepts the aggregation-threshold keys (curseNodeThreshold, apexMinKills)', () => {
    expect(validateSettingsPatch({ curseNodeThreshold: 12, apexMinKills: 4 })).toEqual({ ok: true });
  });

  it('rejects a patch containing an unknown key', () => {
    const result = validateSettingsPatch({ lootChanceBase: 0.6, coinPool: 999999 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('coinPool');
  });

  it('rejects a patch containing only unknown keys', () => {
    const result = validateSettingsPatch({ notARealField: true });
    expect(result.ok).toBe(false);
  });

  it('rejects an empty patch', () => {
    expect(validateSettingsPatch({})).toEqual({ ok: false, error: expect.any(String) });
  });

  it('rejects null', () => {
    expect(validateSettingsPatch(null).ok).toBe(false);
  });

  it('rejects a non-object (string)', () => {
    expect(validateSettingsPatch('lootChanceBase').ok).toBe(false);
  });

  it('rejects a non-object (number)', () => {
    expect(validateSettingsPatch(42).ok).toBe(false);
  });

  it('rejects an array', () => {
    expect(validateSettingsPatch(['lootChanceBase']).ok).toBe(false);
  });

  it('rejects undefined', () => {
    expect(validateSettingsPatch(undefined).ok).toBe(false);
  });

  it('never whitelists coinPool (server-managed, read-only)', () => {
    expect(KNOWN_SETTINGS_KEYS).not.toContain('coinPool');
  });
});
