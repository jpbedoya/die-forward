// WebFrame - Centers game in mobile-width container on desktop
// Adds ambient glow effect on larger screens

import { ReactNode } from 'react';
import { View, Platform, StyleSheet } from 'react-native';

interface WebFrameProps {
  children: ReactNode;
}

export function WebFrame({ children }: WebFrameProps) {
  // Only apply frame on web
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.outer}>
      <View style={styles.container}>
        {/* Glow border - CSS only works on web */}
        <View style={styles.glowBorder} />
        
        {/* Game content */}
        <View style={styles.content}>
          {children}
        </View>
      </View>
    </View>
  );
}

// Detect mobile browser
const isMobileWeb = typeof navigator !== 'undefined' && 
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Use dvh for mobile (accounts for browser chrome), vh for desktop
const viewportHeight = isMobileWeb ? '100dvh' : '100vh';

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    minHeight: viewportHeight as any,
    height: viewportHeight as any,
    maxHeight: viewportHeight as any,
    backgroundColor: '#0d0d0d',
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden' as any,
  },
  container: {
    width: '100%',
    maxWidth: 430,
    height: '100%',
    backgroundColor: '#0d0d0d',
    position: 'relative',
    overflow: 'hidden' as any,
    // Shadow/glow effect (desktop only)
    // @ts-ignore - web property
    boxShadow: isMobileWeb ? 'none' : '0 0 80px rgba(245, 158, 11, 0.12)',
  },
  glowBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: isMobileWeb ? 0 : 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
    pointerEvents: 'none' as any,
  },
  content: {
    flex: 1,
    height: '100%',
    overflow: 'hidden' as any,
  },
});
