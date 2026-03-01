// Die Forward Logo using PNG images
// Horizontal version: for share cards, menu modal
// Vertical version: for splash/title screens

import React from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';

// Import the logo images
const logoHorizontal = require('../assets/images/logo-horizontal.png');
const logoVertical = require('../assets/images/logo-vertical.png');

type LogoVariant = 'horizontal' | 'vertical';
type LogoSize = 'tiny' | 'small' | 'medium' | 'large';

interface DieForwardLogoImageProps {
  variant?: LogoVariant;
  size?: LogoSize;
  showGlow?: boolean;
  glowColor?: string;
}

// Horizontal logo: 2880 x 520 (ratio ~5.5:1)
// Vertical logo: 2132 x 936 (ratio ~2.28:1)
const sizeConfig: Record<LogoVariant, Record<LogoSize, { width: number; height: number }>> = {
  horizontal: {
    tiny:   { width: 140, height: 25 },
    small:  { width: 180, height: 33 },
    medium: { width: 240, height: 44 },
    large:  { width: 300, height: 54 },
  },
  vertical: {
    tiny:   { width: 100, height: 44 },
    small:  { width: 150, height: 66 },
    medium: { width: 200, height: 88 },
    large:  { width: 280, height: 123 },
  },
};

export function DieForwardLogoImage({
  variant = 'vertical',
  size = 'medium',
  showGlow = false,
  glowColor = '#f59e0b',
}: DieForwardLogoImageProps) {
  const { width, height } = sizeConfig[variant][size];
  const source = variant === 'horizontal' ? logoHorizontal : logoVertical;

  const glowStyle = showGlow
    ? Platform.OS === 'web'
      ? { filter: `drop-shadow(0px 0px 20px ${glowColor})` }
      : {
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 20,
        }
    : {};

  return (
    <View style={[styles.container, glowStyle as any]}>
      <Image
        source={source}
        style={{ width, height }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
