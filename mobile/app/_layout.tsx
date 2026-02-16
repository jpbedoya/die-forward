// Polyfills must be imported FIRST for Solana web3.js compatibility
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;
import 'react-native-url-polyfill/auto';

// NativeWind CSS
import '../global.css';

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ScrollView, Platform } from 'react-native';
import { GameProvider } from '../lib/GameContext';
import { UnifiedWalletProvider } from '../lib/wallet/unified';
import { WebFrame } from '../components/WebFrame';

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

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0d0d0d', padding: 20, paddingTop: 60 }}>
          <Text style={{ color: '#f59e0b', fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
            💀 Die Forward Crashed
          </Text>
          <ScrollView>
            <Text style={{ color: '#ef4444', fontSize: 14, fontFamily: 'monospace' }}>
              {this.state.error?.toString()}
            </Text>
            <Text style={{ color: '#666', fontSize: 12, marginTop: 10, fontFamily: 'monospace' }}>
              {this.state.error?.stack}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  useWebSafeAreaCSS();
  
  return (
    <ErrorBoundary>
      <SafeAreaProvider style={{ backgroundColor: '#0d0d0d' }}>
        <WebFrame>
          <UnifiedWalletProvider>
            <GameProvider>
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: '#0d0d0d' },
                  animation: 'fade',
                }}
              />
            </GameProvider>
          </UnifiedWalletProvider>
        </WebFrame>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
