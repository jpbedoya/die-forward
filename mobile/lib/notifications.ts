/**
 * Native notification capability, isolated behind a thin wrapper.
 *
 * All native-touching calls (permissions, push token, device/locale info)
 * live here so screens and the daily-shift cron stay testable. Every
 * exported function NEVER throws — native failures degrade to a safe
 * fallback (false / null / 'UTC' / 'en') rather than propagating.
 *
 * NATIVE NOTE: expo-notifications / expo-device are native modules. Push
 * permission + token retrieval only work on a fresh EAS build — they are
 * not verifiable from Jest (see lib/__tests__/notifications.test.ts, which
 * only covers the pure getDeviceTimezone() fallback logic).
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import Constants from 'expo-constants';

/** IANA timezone, best-effort. Falls back to UTC. Pure enough to smoke-test the fallback. */
export function getDeviceTimezone(): string {
  try {
    const tz = Localization.getCalendars()?.[0]?.timeZone;
    if (tz) return tz;
  } catch {
    /* ignore */
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz;
  } catch {
    /* ignore */
  }
  return 'UTC';
}

export function getDeviceLocale(): string {
  try {
    return Localization.getLocales()?.[0]?.languageTag ?? 'en';
  } catch {
    return 'en';
  }
}

/** Requests OS push permission. Returns true only if granted. Never throws. */
export async function requestPushPermission(): Promise<boolean> {
  try {
    if (!Device.isDevice) return false; // no push on simulators
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    return status === 'granted';
  } catch {
    return false;
  }
}

/** Fetches the Expo push token. Returns null if unavailable/denied. Never throws. */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return null;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token?.data ?? null;
  } catch {
    return null;
  }
}
