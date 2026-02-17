import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudio } from '../lib/audio';
import { useEffect } from 'react';

export default function NotFoundScreen() {
  const { playAmbient } = useAudio();

  useEffect(() => {
    playAmbient('ambient-death');
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-crypt-bg">
      <View className="flex-1 justify-center items-center p-6">
        {/* Lost soul */}
        <Text className="text-6xl mb-6">👻</Text>
        
        {/* Message */}
        <Text className="text-bone text-2xl font-mono font-bold tracking-widest mb-4">
          LOST SOUL
        </Text>
        
        <Text className="text-bone-muted font-mono text-center text-sm mb-2">
          You wandered into the void.
        </Text>
        <Text className="text-bone-dark font-mono text-center text-xs mb-8">
          This path leads nowhere.
        </Text>

        {/* ASCII decoration */}
        <Text className="text-crypt-border font-mono text-xs mb-8">
          ─────── ◇ ───────
        </Text>

        {/* Return button */}
        <Pressable
          className="bg-crypt-surface border border-crypt-border px-8 py-4 active:opacity-80"
          onPress={() => router.replace('/')}
        >
          <Text className="text-amber font-mono font-bold tracking-wider">
            RETURN TO THE SURFACE
          </Text>
        </Pressable>

        {/* 404 code */}
        <Text className="text-crypt-border font-mono text-xs mt-8">
          DEPTH 404 — UNREACHABLE
        </Text>
      </View>
    </SafeAreaView>
  );
}
