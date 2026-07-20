/**
 * On-device debug logger — stores timestamped entries in AsyncStorage
 * (capped, rolling window) and cleared at the start of every app launch
 * (see clearDebugLogs() call in app/_layout.tsx) so an export is always
 * scoped to "since I opened the app," not a mixed multi-day history.
 * Exports via the system share sheet, which also works on a frozen UI.
 *
 * Usage:
 *   import { dlog } from './debug-log';
 *   dlog('Auth', 'restoreAuth started');
 *   dlog.warn('Auth', 'token expired');
 *   dlog.error('Auth', 'signIn failed', err);
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Share, Alert } from 'react-native';

const STORAGE_KEY = 'die-forward-debug-logs';
const MAX_ENTRIES = 500;

// In-memory buffer — flushed periodically
let buffer: string[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function timestamp(): string {
  const d = new Date();
  return `${d.toISOString().slice(11, 23)}`; // HH:mm:ss.SSS
}

function formatArgs(args: unknown[]): string {
  return args
    .map(a => {
      if (a instanceof Error) return `${a.message}\n${a.stack ?? ''}`;
      if (typeof a === 'object') {
        try { return JSON.stringify(a); } catch { return String(a); }
      }
      return String(a);
    })
    .join(' ');
}

function append(level: string, tag: string, args: unknown[]) {
  const entry = `${timestamp()} [${level}][${tag}] ${formatArgs(args)}`;
  buffer.push(entry);

  // Also log to console for dev builds
  if (__DEV__) {
    const fn = level === 'ERR' ? console.error : level === 'WRN' ? console.warn : console.log;
    fn(`[dlog][${tag}]`, ...args);
  }

  // Debounce flush — write at most every 500ms
  if (!flushTimer) {
    flushTimer = setTimeout(flush, 500);
  }
}

async function flush() {
  flushTimer = null;
  if (buffer.length === 0) return;

  const toWrite = [...buffer];
  buffer = [];

  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    const lines: string[] = existing ? JSON.parse(existing) : [];
    lines.push(...toWrite);
    const trimmed = lines.length > MAX_ENTRIES ? lines.slice(-MAX_ENTRIES) : lines;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
}

/** Read all stored log entries */
export async function getDebugLogs(): Promise<string[]> {
  await flush();
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/** Export logs via RN Share API (system dialog, works on frozen UI) */
export async function exportDebugLogs(): Promise<void> {
  const lines = await getDebugLogs();
  const text = lines.join('\n') || '(no logs)';

  if (Platform.OS === 'web') {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `die-forward-debug-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  // Use RN's built-in Share API — guaranteed to work, no extra deps
  try {
    await Share.share({
      message: text,
      title: 'Die Forward Debug Logs',
    });
  } catch {
    // If Share fails, show in an Alert (system UI, always works)
    Alert.alert('Debug Logs', text.slice(-2000), [{ text: 'OK' }]);
  }
}

/**
 * Schedule auto-export after a delay. Uses Alert to show logs
 * as system UI that pops over a frozen app.
 * Call this once at app startup.
 */
export function scheduleAutoExport(delayMs = 8000) {
  if (Platform.OS === 'web') return;
  setTimeout(async () => {
    try {
      await flush();
      const lines = await getDebugLogs();
      const text = lines.join('\n') || '(no logs)';
      // Alert is system UI — guaranteed to show over frozen app
      Alert.alert(
        'Debug Logs',
        text.slice(-3000),
        [
          { text: 'Share', onPress: () => Share.share({ message: text, title: 'Debug Logs' }).catch(() => {}) },
          { text: 'Dismiss' },
        ],
      );
    } catch {}
  }, delayMs);
}

/** Clear all stored logs */
export async function clearDebugLogs(): Promise<void> {
  buffer = [];
  await AsyncStorage.removeItem(STORAGE_KEY);
}

// Main log function + level variants
function dlog(tag: string, ...args: unknown[]) {
  append('INF', tag, args);
}
dlog.warn = (tag: string, ...args: unknown[]) => append('WRN', tag, args);
dlog.error = (tag: string, ...args: unknown[]) => append('ERR', tag, args);

export { dlog };
