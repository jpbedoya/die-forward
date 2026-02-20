import React from 'react';
import { ImageBackground, View, StyleSheet, ViewStyle } from 'react-native';
import { BG_CONFIG } from '../lib/bgConfig';

interface CryptBackgroundProps {
  screen: keyof typeof BG_CONFIG;
  children: React.ReactNode;
  style?: ViewStyle;
  /** Skip the dark overlay (e.g. splash — raw image looks better) */
  noOverlay?: boolean;
}

export function CryptBackground({ screen, children, style, noOverlay }: CryptBackgroundProps) {
  const config = BG_CONFIG[screen] ?? { enabled: false, overlay: 0.6 };

  if (config.enabled) {
    return (
      <ImageBackground
        source={require('../assets/bg-crypt.webp')}
        style={[styles.fill, { backgroundColor: '#0d0d0d' }, style]}
        resizeMode="cover"
      >
        {!noOverlay && config.overlay > 0 && (
          <View 
            style={[styles.overlay, { backgroundColor: `rgba(0,0,0,${config.overlay})` }]} 
            pointerEvents="none" 
          />
        )}
        {children}
      </ImageBackground>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: '#0d0d0d' }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
