// Unit tests for the pure parts of lib/notifications.ts. Permission requests
// and push token retrieval are native-only and are NOT unit-testable here —
// see the NATIVE NOTE in notifications.ts. This suite only covers
// getDeviceTimezone()'s fallback chain: expo-localization -> Intl -> 'UTC'.
import * as Localization from 'expo-localization';
import { getDeviceTimezone } from '../notifications';

describe('getDeviceTimezone', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a non-empty string', () => {
    const tz = getDeviceTimezone();
    expect(typeof tz).toBe('string');
    expect(tz.length).toBeGreaterThan(0);
  });

  it('prefers the timezone reported by expo-localization', () => {
    jest.spyOn(Localization, 'getCalendars').mockReturnValue([{ timeZone: 'America/New_York' } as any]);
    expect(getDeviceTimezone()).toBe('America/New_York');
  });

  it('falls back to Intl when expo-localization throws', () => {
    jest.spyOn(Localization, 'getCalendars').mockImplementation(() => {
      throw new Error('native module unavailable');
    });
    const tz = getDeviceTimezone();
    expect(typeof tz).toBe('string');
    expect(tz.length).toBeGreaterThan(0);
  });

  it('falls back to UTC when both expo-localization and Intl throw', () => {
    jest.spyOn(Localization, 'getCalendars').mockImplementation(() => {
      throw new Error('native module unavailable');
    });
    const originalDateTimeFormat = Intl.DateTimeFormat;
    // @ts-expect-error - intentionally breaking Intl to exercise the final fallback
    Intl.DateTimeFormat = () => {
      throw new Error('Intl unavailable');
    };
    try {
      expect(getDeviceTimezone()).toBe('UTC');
    } finally {
      Intl.DateTimeFormat = originalDateTimeFormat;
    }
  });

  it('falls back to UTC when expo-localization returns no timezone and Intl returns none', () => {
    jest.spyOn(Localization, 'getCalendars').mockReturnValue([{ timeZone: null } as any]);
    const originalDateTimeFormat = Intl.DateTimeFormat;
    // @ts-expect-error - simulate Intl resolving with no timeZone
    Intl.DateTimeFormat = () => ({ resolvedOptions: () => ({}) });
    try {
      expect(getDeviceTimezone()).toBe('UTC');
    } finally {
      Intl.DateTimeFormat = originalDateTimeFormat;
    }
  });
});
