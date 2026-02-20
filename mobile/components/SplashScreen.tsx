import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { CryptBackground } from './CryptBackground';
import { CRTOverlay } from './CRTOverlay';
import { DieForwardLogo } from './DieForwardLogo';

interface SplashScreenProps {
  onComplete: () => void;
  onTap?: () => void;
}

export function SplashScreen({ onComplete, onTap }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Phase 1: Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      // Phase 2: Scale pulse
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Phase 3: Zoom out and fade
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 2.5,
              duration: 350,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 350,
              useNativeDriver: true,
            }),
          ]).start(() => onComplete());
        }, 300);
      });
    });
  }, []);

  return (
    <CryptBackground screen="splash" noOverlay>
      <Pressable 
        style={{ flex: 1 }}
        onPress={onTap}
      >
        <CRTOverlay />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Animated.View 
            style={{ 
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            }}
          >
            <DieForwardLogo size="large" showGlow glowColor="#f59e0b" />
          </Animated.View>
          <Text style={{ 
            color: '#57534e', 
            fontSize: 12, 
            fontFamily: 'monospace', 
            marginTop: 32 
          }}>
            tap to enable sound
          </Text>
        </View>
      </Pressable>
    </CryptBackground>
  );
}
