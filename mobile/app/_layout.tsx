// Polyfills must be imported FIRST for Solana web3.js compatibility
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;
import 'react-native-url-polyfill/auto';

// NativeWind CSS
import '../global.css';

import React, { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { GameProvider } from '../lib/GameContext';
import { UnifiedWalletProvider } from '../lib/wallet/unified';
import { WebFrame } from '../components/WebFrame';
import { AudiusProvider } from '../lib/AudiusContext';
import { SplashScreen } from '../components/SplashScreen';
import { getAudioManager } from '../lib/audio';

const APP_VERSION_KEY = 'APP_BUILD_VERSION';
const CURRENT_VERSION = Constants.expoConfig?.version || '1.0.0';

// On startup: if version changed, wipe stale AsyncStorage state
async function checkVersionAndMigrate() {
  try {
    const stored = await AsyncStorage.getItem(APP_VERSION_KEY);
    if (stored && stored !== CURRENT_VERSION) {
      console.log(`[Version] ${stored} → ${CURRENT_VERSION} — clearing stale state`);
      await AsyncStorage.clear();
    }
    await AsyncStorage.setItem(APP_VERSION_KEY, CURRENT_VERSION);
  } catch (e) {
    console.warn('[Version] Migration check failed:', e);
  }
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
    console.error('App crashed:', error, errorInfo);
  }

  handleReset = async () => {
    // Nuke stale state — this is the nuclear option after a crash
    try {
      await AsyncStorage.clear();
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

export default function RootLayout() {
  useWebSafeAreaCSS();
  const [showSplash, setShowSplash] = useState(true);

  // Clear stale state on version change (handles APK updates without uninstall)
  useEffect(() => {
    checkVersionAndMigrate();
  }, []);

  // Unlock audio on splash tap
  const handleSplashTap = useCallback(() => {
    getAudioManager().unlock();
  }, []);

  // Splash complete — transition to main app
  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  // Splash renders OUTSIDE wallet provider — immune to MWA init issues
  if (showSplash) {
    return (
      <SafeAreaProvider style={{ backgroundColor: '#0d0d0d' }}>
        <WebFrame>
          <StatusBar style="light" />
          <SplashScreen onComplete={handleSplashComplete} onTap={handleSplashTap} />
        </WebFrame>
      </SafeAreaProvider>
    );
  }
  
  return (
    <ErrorBoundary>
      <SafeAreaProvider style={{ backgroundColor: '#0d0d0d' }}>
        <WebFrame>
          <UnifiedWalletProvider>
            <GameProvider>
              <AudiusProvider>
                <StatusBar style="light" />
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
        </WebFrame>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
