import 'react-native-get-random-values';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameProvider } from '../lib/GameContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}
