/**
 * On-device debug logger — stores timestamped entries in AsyncStorage
 * and auto-saves to filesystem. Auto-exports via share sheet on startup
 * so logs are accessible even when the UI is frozen.
 *
 * Usage:
 *   import { dlog } from './debug-log';
 *   dlog('Auth', 'restoreAuth started');
 *   dlog.warn('Auth', 'token expired');
 *   dlog.error('Auth', 'signIn failed', err);
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const STORAGE_KEY = 'die-forward-debug-logs';
const MAX_ENTRIES = 500;
const LOG_FILE = `${FileSystem.documentDirectory}debug.log`;

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

  // Write to AsyncStorage (for in-app access)
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    const lines: string[] = existing ? JSON.parse(existing) : [];
    lines.push(...toWrite);
    const trimmed = lines.length > MAX_ENTRIES ? lines.slice(-MAX_ENTRIES) : lines;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}

  // Also append to filesystem log file (for adb extraction)
  if (Platform.OS !== 'web') {
    try {
      const chunk = toWrite.join('\n') + '\n';
      const exists = await FileSystem.getInfoAsync(LOG_FILE);
      if (exists.exists) {
        const current = await FileSystem.readAsStringAsync(LOG_FILE);
        await FileSystem.writeAsStringAsync(LOG_FILE, current + chunk);
      } else {
        await FileSystem.writeAsStringAsync(LOG_FILE, chunk);
      }
    } catch {}
  }
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

/** Export logs as a text file via share sheet */
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

  const Sharing = await import('expo-sharing');
  const fileUri = `${FileSystem.cacheDirectory}die-forward-debug-${Date.now()}.log`;
  await FileSystem.writeAsStringAsync(fileUri, text, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType: 'text/plain', dialogTitle: 'Export Debug Logs' });
  }
}

/**
 * Schedule auto-export after a delay. The share sheet is system UI
 * that pops over a frozen app — save to Downloads from there.
 * Call this once at app startup.
 */
export function scheduleAutoExport(delayMs = 8000) {
  if (Platform.OS === 'web') return;
  setTimeout(() => {
    exportDebugLogs().catch(() => {});
  }, delayMs);
}

/** Clear all stored logs */
export async function clearDebugLogs(): Promise<void> {
  buffer = [];
  await AsyncStorage.removeItem(STORAGE_KEY);
  if (Platform.OS !== 'web') {
    try { await FileSystem.deleteAsync(LOG_FILE, { idempotent: true }); } catch {}
  }
}

// Main log function + level variants
function dlog(tag: string, ...args: unknown[]) {
  append('INF', tag, args);
}
dlog.warn = (tag: string, ...args: unknown[]) => append('WRN', tag, args);
dlog.error = (tag: string, ...args: unknown[]) => append('ERR', tag, args);

export { dlog };
