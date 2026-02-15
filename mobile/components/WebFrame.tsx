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

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    minHeight: '100vh' as any,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  container: {
    width: '100%',
    maxWidth: 430,
    minHeight: '100vh' as any,
    backgroundColor: '#0d0d0d',
    position: 'relative',
    // Shadow/glow effect (web only)
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 50,
    // @ts-ignore - web-only property
    boxShadow: '0 0 80px rgba(245, 158, 11, 0.12)',
  },
  glowBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
    pointerEvents: 'none' as any,
  },
  content: {
    flex: 1,
    minHeight: '100vh' as any,
  },
});
