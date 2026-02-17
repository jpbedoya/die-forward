// CRT Scanline + vignette overlay effect
// Adds retro CRT monitor aesthetic to screens

import React from 'react';
import { View, Platform } from 'react-native';

export function CRTOverlay() {
  return (
    <View 
      pointerEvents="none"
      className="absolute inset-0 z-50"
      style={{
        // Scanlines + vignette (web only - native doesn't support CSS gradients)
        backgroundImage: Platform.OS === 'web' 
          ? `repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 2px),
             radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.4) 100%)`
          : undefined,
      }}
    />
  );
}
