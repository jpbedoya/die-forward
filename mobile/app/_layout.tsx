// Polyfills must be imported FIRST for Solana web3.js compatibility
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;
import 'react-native-url-polyfill/auto';

// NativeWind CSS
import '../global.css';

import React, { useEffect, useState, useCallback } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { GameProvider } from '../lib/GameContext';
import { UnifiedWalletProvider } from '../lib/wallet/unified';
import { WebFrame } from '../components/WebFrame';
import { AudiusProvider } from '../lib/AudiusContext';
import { SplashScreen } from '../components/SplashScreen';
import { getAudioManager } from '../lib/audio';
import { db } from '../lib/instant';
import { dlog, scheduleAutoExport } from '../lib/debug-log';

const APP_VERSION_KEY = 'APP_BUILD_VERSION';
// Use only BASE_VERSION (without commit hash) for migration gating
// so routine builds don't trigger a state wipe
const fullVersion = Constants.expoConfig?.version || '1.0.0';
const CURRENT_VERSION = fullVersion.split('.').slice(0, 3).join('.'); // "1.4.0" not "1.4.0.abc1234"

const PROTECTED_KEYS = [
  'die-forward-nickname',
  'die-forward-auth',
  'die-forward-nickname-prompted',
  'die-forward-guest-id',
  'die-forward-guest-progress',
  'audius-prefs-v1',
  'audio-master-enabled',
  'audio-sfx-enabled',
  'audio-ambient-volume',
  APP_VERSION_KEY,
  'die-forward-debug-logs',
];

async function clearNonIdentityStorage() {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const keysToRemove = allKeys.filter(k => !PROTECTED_KEYS.includes(k));
    dlog('Migration', `clearing ${keysToRemove.length} keys, keeping ${allKeys.length - keysToRemove.length}`, { keysToRemove });
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
    dlog('Migration', 'storage clear complete');
  } catch (e) {
    dlog.error('Migration', 'clearNonIdentityStorage failed', e);
  }
}

// On startup: if version changed, wipe stale AsyncStorage state (preserving identity keys)
// Returns whether this startup cleared storage (used by GameProvider auth restore logic).
async function checkVersionAndMigrate(): Promise<boolean> {
  dlog('Migration', `start — stored version check, current=${CURRENT_VERSION}`);
  let clearedStorage = false;
  try {
    const stored = await AsyncStorage.getItem(APP_VERSION_KEY);
    dlog('Migration', `stored=${stored}, current=${CURRENT_VERSION}, match=${stored === CURRENT_VERSION}`);
    if (!stored || stored !== CURRENT_VERSION) {
      dlog('Migration', `version changed ${stored} → ${CURRENT_VERSION} — clearing stale state`);
      await clearNonIdentityStorage();
      clearedStorage = true;
    }
    await AsyncStorage.setItem(APP_VERSION_KEY, CURRENT_VERSION);
    dlog('Migration', `complete, clearedStorage=${clearedStorage}`);
  } catch (e) {
    dlog.error('Migration', 'checkVersionAndMigrate failed', e);
  }
  return clearedStorage;
}

// Inject critical CSS for web safe areas
function useWebSafeAreaCSS() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    const style = document.createElement('style');
    style.id = 'safe-area-fix';
    style.textContent = `
      html, body {
        background-color: #0d0d0d !important;
        margin: 0;
        padding: 0;
        min-height: 100%;
        min-height: 100dvh;
      }
      body {
        padding-bottom: env(safe-area-inset-bottom, 0px);
        box-sizing: border-box;
      }
      #root {
        background-color: #0d0d0d !important;
        min-height: 100%;
      }
      * {
        -webkit-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
      }
    `;
    document.head.appendChild(style);
    
    // Also set meta viewport for safe area
    let viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
    }
    
    return () => {
      const existing = document.getElementById('safe-area-fix');
      if (existing) existing.remove();
    };
  }, []);
}

// Error boundary to catch and display crashes
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    dlog.error('ErrorBoundary', 'CAUGHT ERROR:', error.message, errorInfo?.componentStack?.slice(0, 500));
  }

  handleReset = async () => {
    // Sign out from InstantDB to clear in-memory session
    try {
      await db.auth.signOut();
    } catch (e) {
      console.warn('[ErrorBoundary] InstantDB signOut failed:', e);
    }
    // Clear stale state after a crash, but preserve identity/settings keys
    try {
      await clearNonIdentityStorage();
    } catch (e) {
      console.warn('[ErrorBoundary] Failed to clear storage:', e);
    }
    this.setState({ hasError: false, error: null });
    // Force reload to reset app state
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0d0d0d', padding: 20, paddingTop: 80, alignItems: 'center' }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>💀</Text>
          <Text style={{ color: '#d4b896', fontSize: 20, fontWeight: 'bold', marginBottom: 8, fontFamily: 'monospace', letterSpacing: 2 }}>
            SOMETHING BROKE
          </Text>
          <Text style={{ color: '#666', fontSize: 12, marginBottom: 24, fontFamily: 'monospace', textAlign: 'center' }}>
            The depths claim all eventually.
          </Text>
          
          <View 
            style={{ 
              backgroundColor: '#1a1a1a', 
              borderWidth: 1, 
              borderColor: '#333', 
              padding: 16, 
              marginBottom: 24,
              maxHeight: 150,
              width: '100%',
            }}
          >
            <ScrollView>
              <Text style={{ color: '#ef4444', fontSize: 11, fontFamily: 'monospace' }}>
                {this.state.error?.message || 'Unknown error'}
              </Text>
            </ScrollView>
          </View>

          <Text 
            onPress={this.handleReset}
            style={{ 
              color: '#f59e0b', 
              fontSize: 14, 
              fontWeight: 'bold', 
              fontFamily: 'monospace',
              padding: 16,
              borderWidth: 1,
              borderColor: '#f59e0b',
            }}
          >
            RETURN TO SURFACE
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Track splash shown across remounts (module-level so survives navigation)
let splashShownThisSession = false;

export default function RootLayout() {
  useWebSafeAreaCSS();
  const [showSplash, setShowSplash] = useState(!splashShownThisSession);
  const [migrationDone, setMigrationDone] = useState(false);
  const [startupClearedStorage, setStartupClearedStorage] = useState(false);

  // Clear stale state on version change — must complete before providers mount
  // to avoid racing with GameProvider.restoreAuth and InstantDB queries.
  useEffect(() => {
    dlog('Layout', 'RootLayout mounted');
    checkVersionAndMigrate().then((clearedStorage) => {
      dlog('Layout', `migration done, mounting providers (clearedStorage=${clearedStorage})`);
      setStartupClearedStorage(clearedStorage);
      setMigrationDone(true);
    });
    // Auto-export logs 8s after launch — share sheet pops over frozen UI
    scheduleAutoExport(8000);
  }, []);

  // Unlock audio on splash tap
  const handleSplashTap = useCallback(() => {
    getAudioManager().unlock();
  }, []);

  // Splash complete — transition to main app
  const handleSplashComplete = useCallback(() => {
    dlog('Layout', 'splash complete, showing main app');
    splashShownThisSession = true;
    setShowSplash(false);
  }, []);

  dlog('Layout', `render: migrationDone=${migrationDone}, showSplash=${showSplash}`);

  // GestureHandlerRootView + SafeAreaProvider are ALWAYS mounted (never torn down).
  // Previously they were split across the splash/main branches, which meant SafeAreaProvider
  // remounted on the splash→home transition and briefly reported zero insets — causing the
  // vertically-centered home screen content to jump on first render.
  // UnifiedWalletProvider stays inside the main branch (splash must stay outside it for MWA stability).
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider style={{ backgroundColor: '#0d0d0d' }}>
        <WebFrame>
          <StatusBar style="light" />
          {!migrationDone || showSplash ? (
            // Keep splash visible until migration completes and user dismisses it.
            // Never render `null` here — blank frame causes visible black flicker.
            <SplashScreen onComplete={handleSplashComplete} onTap={handleSplashTap} />
          ) : (
            <ErrorBoundary>
              <UnifiedWalletProvider>
                <GameProvider migrationClearedStorage={startupClearedStorage}>
                  <AudiusProvider>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: '#0d0d0d' },
                        animation: 'fade',
                      }}
                    />
                  </AudiusProvider>
                </GameProvider>
              </UnifiedWalletProvider>
            </ErrorBoundary>
          )}
        </WebFrame>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
