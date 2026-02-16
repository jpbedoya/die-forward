// Reusable Die Forward ASCII Logo component
// Use throughout the app for consistency

import React from 'react';
import { View, Text, Platform } from 'react-native';

const ASCII_DIE = `██████  ██ ███████
██   ██ ██ ██     
██   ██ ██ █████  
██   ██ ██ ██     
██████  ██ ███████`;

const ASCII_FORWARD = `███████  ██████  ██████  ██     ██  █████  ██████  ██████ 
██      ██    ██ ██   ██ ██     ██ ██   ██ ██   ██ ██   ██
█████   ██    ██ ██████  ██  █  ██ ███████ ██████  ██   ██
██      ██    ██ ██   ██ ██ ███ ██ ██   ██ ██   ██ ██   ██
██       ██████  ██   ██  ███ ███  ██   ██ ██   ██ ██████ `;

type LogoSize = 'tiny' | 'small' | 'medium' | 'large';

interface DieForwardLogoProps {
  size?: LogoSize;
  color?: string;
  glowColor?: string;
  showGlow?: boolean;
}

const sizeConfig: Record<LogoSize, { dieFontSize: number; forwardFontSize: number; dieLineHeight: number; forwardLineHeight: number; gap: number }> = {
  tiny: { dieFontSize: 3, forwardFontSize: 2, dieLineHeight: 4, forwardLineHeight: 3, gap: 1 },
  small: { dieFontSize: 4, forwardFontSize: 3, dieLineHeight: 5, forwardLineHeight: 4, gap: 2 },
  medium: { dieFontSize: 5, forwardFontSize: 4, dieLineHeight: 6, forwardLineHeight: 5, gap: 3 },
  large: { dieFontSize: 6, forwardFontSize: 5, dieLineHeight: 7, forwardLineHeight: 6, gap: 4 },
};

export function DieForwardLogo({ 
  size = 'medium', 
  color = '#f59e0b',
  glowColor = '#f59e0b',
  showGlow = false,
}: DieForwardLogoProps) {
  const config = sizeConfig[size];
  
  const textShadow = showGlow 
    ? { textShadowColor: glowColor, textShadowRadius: 12 }
    : {};

  return (
    <View className="items-center">
      <Text 
        style={[
          { 
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            fontSize: config.dieFontSize,
            lineHeight: config.dieLineHeight,
            color,
            textAlign: 'center',
          },
          textShadow,
        ]}
      >
        {ASCII_DIE}
      </Text>
      <View style={{ height: config.gap }} />
      <Text 
        style={[
          { 
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            fontSize: config.forwardFontSize,
            lineHeight: config.forwardLineHeight,
            color,
            textAlign: 'center',
          },
          textShadow,
        ]}
      >
        {ASCII_FORWARD}
      </Text>
    </View>
  );
}

// For share cards - simpler inline version
export function DieForwardLogoInline({ color = '#f59e0b' }: { color?: string }) {
  return (
    <View className="items-center">
      <Text 
        style={{ 
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          fontSize: 3,
          lineHeight: 4,
          color,
          textAlign: 'center',
        }}
      >
        {ASCII_DIE}
      </Text>
      <Text 
        style={{ 
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          fontSize: 2,
          lineHeight: 3,
          color,
          textAlign: 'center',
          marginTop: 1,
        }}
      >
        {ASCII_FORWARD}
      </Text>
    </View>
  );
}
