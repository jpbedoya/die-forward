import React from 'react';
import { ImageBackground, View, StyleSheet, ViewStyle } from 'react-native';
import { BG_ENABLED } from '../lib/bgConfig';

const OVERLAY_OPACITY = 0.6; // Darkness of the dim overlay on non-splash screens

interface CryptBackgroundProps {
  screen: keyof typeof BG_ENABLED;
  children: React.ReactNode;
  style?: ViewStyle;
  /** Skip the dark overlay (e.g. splash — raw image looks better) */
  noOverlay?: boolean;
}

export function CryptBackground({ screen, children, style, noOverlay }: CryptBackgroundProps) {
  const enabled = BG_ENABLED[screen] ?? false;

  if (enabled) {
    return (
      <ImageBackground
        source={require('../assets/bg-crypt.webp')}
        style={[styles.fill, { backgroundColor: '#0d0d0d' }, style]}
        resizeMode="cover"
      >
        {!noOverlay && (
          <View style={styles.overlay} pointerEvents="none" />
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
    backgroundColor: `rgba(0,0,0,${OVERLAY_OPACITY})`,
  },
});
