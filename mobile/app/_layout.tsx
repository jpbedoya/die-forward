// Polyfills must be imported FIRST for Solana web3.js compatibility
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;
import 'react-native-url-polyfill/auto';

// NativeWind CSS
import '../global.css';

import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ScrollView } from 'react-native';
import { GameProvider } from '../lib/GameContext';
import { UnifiedWalletProvider } from '../lib/WalletProvider';

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
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
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
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
