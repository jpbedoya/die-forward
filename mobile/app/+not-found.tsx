import { View, Text, Pressable, Animated } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudio } from '../lib/audio';
import { useEffect, useRef } from 'react';
import { DieForwardLogo } from '../components/DieForwardLogo';

export default function NotFoundScreen() {
  const { playAmbient } = useAudio();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    playAmbient('ambient-combat');
    
    // Pulsating scale animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glowing opacity animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-crypt-bg">
      <View className="flex-1 justify-center items-center p-6">
        {/* Pulsating logo with glow */}
        <Animated.View 
          style={{ 
            transform: [{ scale: pulseAnim }],
            opacity: glowAnim,
            marginBottom: 24,
          }}
        >
          <DieForwardLogo size="large" showGlow glowColor="#ef4444" />
        </Animated.View>
        
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
