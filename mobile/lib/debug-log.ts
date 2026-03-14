/**
 * On-device debug logger — stores timestamped entries in AsyncStorage
 * so they survive app restarts. Exportable via share sheet.
 *
 * Usage:
 *   import { dlog } from './debug-log';
 *   dlog('Auth', 'restoreAuth started');
 *   dlog.warn('Auth', 'token expired');
 *   dlog.error('Auth', 'signIn failed', err);
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = 'die-forward-debug-logs';
const MAX_ENTRIES = 500;

// In-memory buffer — flushed to AsyncStorage periodically
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

  // Debounce flush — write to AsyncStorage at most every 500ms
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
    // Keep only the most recent entries
    const trimmed = lines.length > MAX_ENTRIES ? lines.slice(-MAX_ENTRIES) : lines;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    // Can't log to self — just drop silently
  }
}

/** Read all stored log entries */
export async function getDebugLogs(): Promise<string[]> {
  // Flush any buffered entries first
  await flush();
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/** Export logs as a text file via share sheet */
export async function exportDebugLogs(): Promise<void> {
  const lines = await getDebugLogs();
  const text = lines.join('\n') || '(no logs)';

  if (Platform.OS === 'web') {
    // Web fallback: download as file
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `die-forward-debug-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  // Native: write to cache, then share
  const FileSystem = await import('expo-file-system');
  const Sharing = await import('expo-sharing');

  const fileUri = `${FileSystem.cacheDirectory}die-forward-debug-${Date.now()}.log`;
  await FileSystem.writeAsStringAsync(fileUri, text, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType: 'text/plain', dialogTitle: 'Export Debug Logs' });
  }
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
